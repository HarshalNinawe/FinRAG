import os
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Optional
from enum import Enum
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from database import get_db, init_db
import models
from embeddings import embedder, chroma_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the SQLite database on startup (creates tables if they don't exist)
    init_db()
    yield

app = FastAPI(
    title="FinRag API",
    description="Financial RAG (Retrieval-Augmented Generation) Backend Service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware to allow connection from standard frontend developments (React, Vue, Svelte, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production environments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schema Definitions ---
class MessageCreate(BaseModel):
    content: str = Field(..., description="Content of the message")

class ChatSessionCreate(BaseModel):
    title: Optional[str] = Field("New Chat", description="Title of the session")

class ChatResponse(BaseModel):
    answer: str
    session_id: str

class TransactionCreate(BaseModel):
    transaction_id: str = Field(..., description="Unique transaction identifier")
    amount: float = Field(..., description="Amount of the transaction")
    status: Optional[str] = Field("pending", description="Status of the transaction")

class TransactionResponse(BaseModel):
    id: int
    transaction_id: str
    amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class SupportedEvents(str, Enum):
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_CAPTURED = "payment.captured"
    REFUND_CREATED = "refund.created"
    DISPUTE_OPENED = "dispute.opened"

class WebhookPayload(BaseModel):
    event_type: SupportedEvents = Field(..., description="The type of the webhook event")
    transaction_id: Optional[str] = Field(None, description="Unique transaction identifier. Auto-generated if missing.")
    customer_id: str = Field(..., description="Unique customer identifier")
    merchant: str = Field(..., description="Name of the merchant")
    amount: float = Field(..., description="Transaction amount")
    status: Optional[str] = Field(None, description="Current status of the transaction")

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return v

class EventResponse(BaseModel):
    id: int
    event_type: Optional[str] = None
    transaction_id: str
    customer_id: Optional[str] = None
    merchant: Optional[str] = None
    amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class WebhookProcessedResponse(BaseModel):
    success: bool
    message: str
    data: EventResponse

class SearchRequest(BaseModel):
    query: str = Field(..., description="The query string to search semantically")
    limit: Optional[int] = Field(5, description="Maximum number of results to return")

class SearchResult(BaseModel):
    transaction_id: str
    summary: str
    metadata: dict
    distance: float

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]

# --- Vector Search Ingestion Helper ---
def index_transaction_in_chroma(transaction: models.Transaction):
    """
    Generates a natural language summary and vector embedding for a transaction
    and saves it to ChromaDB with metadata.
    """
    try:
        summary_text = embedder.generate_summary(transaction)
        embedding = embedder.get_embedding(summary_text)
        metadata = {
            "transaction_id": transaction.transaction_id,
            "event_type": transaction.event_type or "",
            "customer_id": transaction.customer_id or "",
            "merchant": transaction.merchant or "",
            "amount": float(transaction.amount) if transaction.amount is not None else 0.0,
            "status": transaction.status or "",
            "created_at": transaction.created_at.isoformat() if transaction.created_at else ""
        }
        chroma_client.upsert_transaction_embedding(
            transaction_id=transaction.transaction_id,
            embedding=embedding,
            document_text=summary_text,
            metadata=metadata
        )
    except Exception as e:
        print(f"Warning: Failed to index transaction in ChromaDB: {e}")

# --- Endpoints ---

@app.get("/", tags=["System"])
def read_root():
    """
    Root endpoint returning basic API details.
    """
    return {
        "message": "Welcome to the FinRag API Service!",
        "version": "1.0.0",
        "documentation": "/docs"
    }

@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """
    Verify server health and database connectivity.
    """
    try:
        # Quick db verification query
        db.execute(models.Base.metadata.tables["documents"].select().limit(1))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"status": "unhealthy", "error": str(e)}
        )

@app.post("/api/documents", status_code=status.HTTP_201_CREATED, tags=["Documents"])
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a document (PDF, TXT, etc.) for processing and ingestion.
    """
    # Create uploads directory if not existing
    os.makedirs("uploads", exist_ok=True)
    
    file_path = os.path.join("uploads", f"{uuid.uuid4()}_{file.filename}")
    
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Save to database
        db_doc = models.Document(
            filename=file.filename,
            file_path=file_path,
            status="uploaded"
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        return {
            "id": db_doc.id,
            "filename": db_doc.filename,
            "status": db_doc.status,
            "message": "File successfully uploaded. Ingestion processing queued."
        }
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save document: {str(e)}"
        )

@app.get("/api/documents", tags=["Documents"])
def list_documents(db: Session = Depends(get_db)):
    """
    Get all uploaded documents.
    """
    docs = db.query(models.Document).all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "status": doc.status,
            "upload_date": doc.upload_date,
            "chunks_count": len(doc.chunks)
        }
        for doc in docs
    ]

@app.post("/api/chat/session", status_code=status.HTTP_201_CREATED, tags=["Chat"])
def create_chat_session(payload: Optional[ChatSessionCreate] = None, db: Session = Depends(get_db)):
    """
    Create a new chat session (thread).
    """
    session_id = str(uuid.uuid4())
    title = payload.title if payload else "New Chat"
    
    db_session = models.ChatSession(id=session_id, title=title)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return {"session_id": db_session.id, "title": db_session.title}

@app.post("/api/chat/{session_id}", response_model=ChatResponse, tags=["Chat"])
def chat(session_id: str, payload: MessageCreate, db: Session = Depends(get_db)):
    """
    Send a message to a session and get a response based on document context.
    """
    # Verify session exists
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Save user message
    user_message = models.ChatMessage(
        session_id=session_id,
        sender="user",
        content=payload.content
    )
    db.add(user_message)
    
    # RAG pipeline placeholder - returns response using documents if available
    # For now, it behaves as a simple echoing assistant with instructions
    docs = db.query(models.Document).filter(models.Document.status == "completed").all()
    
    if docs:
        assistant_answer = f"I am searching your {len(docs)} ingested document(s) to answer: '{payload.content}'. [RAG Pipeline Placeholder]"
    else:
        assistant_answer = f"I received: '{payload.content}'. Please upload documents to /api/documents to leverage full RAG search capabilities!"
        
    # Save assistant message
    assistant_message = models.ChatMessage(
        session_id=session_id,
        sender="assistant",
        content=assistant_answer
    )
    db.add(assistant_message)
    db.commit()
    
    return ChatResponse(answer=assistant_answer, session_id=session_id)

@app.get("/api/chat/{session_id}/history", tags=["Chat"])
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    """
    Get chat history for a session.
    """
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session_id
    ).order_by(models.ChatMessage.created_at.asc()).all()
    
    return [
        {
            "id": msg.id,
            "sender": msg.sender,
            "content": msg.content,
            "created_at": msg.created_at
        }
        for msg in messages
    ]

@app.post("/api/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED, tags=["Transactions"])
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    """
    Create a new financial transaction in the database.
    """
    # Check if transaction_id is unique
    existing = db.query(models.Transaction).filter(models.Transaction.transaction_id == payload.transaction_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction with this ID already exists"
        )
    
    db_transaction = models.Transaction(
        transaction_id=payload.transaction_id,
        amount=payload.amount,
        status=payload.status
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    # Automatically index transaction in ChromaDB
    index_transaction_in_chroma(db_transaction)
    
    return db_transaction

@app.get("/api/transactions", response_model=List[TransactionResponse], tags=["Transactions"])
def list_transactions(db: Session = Depends(get_db)):
    """
    List all transactions stored in the database.
    """
    return db.query(models.Transaction).all()


@app.post("/webhook", response_model=WebhookProcessedResponse, status_code=status.HTTP_201_CREATED, tags=["Webhook"])
def handle_webhook(payload: WebhookPayload, db: Session = Depends(get_db)):
    """
    Ingest a real-time financial webhook event and store the transaction record.
    """
    try:
        # Determine transaction_id
        txn_id = payload.transaction_id
        if not txn_id:
            txn_id = f"txn_{uuid.uuid4().hex[:12]}"
        else:
            # Check for uniqueness if provided
            existing = db.query(models.Transaction).filter(models.Transaction.transaction_id == txn_id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Transaction with ID '{txn_id}' already exists."
                )

        # Fallback logic for status based on event type if not provided
        status_mapping = {
            SupportedEvents.PAYMENT_CAPTURED: "captured",
            SupportedEvents.PAYMENT_FAILED: "failed",
            SupportedEvents.REFUND_CREATED: "refunded",
            SupportedEvents.DISPUTE_OPENED: "disputed"
        }
        final_status = payload.status or status_mapping.get(payload.event_type, "pending")

        # Create new transaction record
        db_transaction = models.Transaction(
            event_type=payload.event_type.value,
            transaction_id=txn_id,
            customer_id=payload.customer_id,
            merchant=payload.merchant,
            amount=payload.amount,
            status=final_status
        )

        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)

        # Automatically index transaction in ChromaDB
        index_transaction_in_chroma(db_transaction)

        return WebhookProcessedResponse(
            success=True,
            message=f"Webhook event '{payload.event_type.value}' ingested successfully.",
            data=EventResponse.model_validate(db_transaction)
        )
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing webhook: {str(e)}"
        )


@app.get("/events", response_model=List[EventResponse], tags=["Webhook"])
def list_webhook_events(db: Session = Depends(get_db)):
    """
    Retrieve all stored webhook events and transactions, sorted by latest first.
    """
    try:
        events = db.query(models.Transaction).order_by(models.Transaction.created_at.desc()).all()
        return events
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving events: {str(e)}"
        )


@app.post("/search", response_model=SearchResponse, tags=["Search"])
def semantic_search(payload: SearchRequest):
    """
    Perform a semantic search over financial transactions.
    """
    try:
        # Compute embedding of the query string
        query_vector = embedder.get_embedding(payload.query)
        
        # Query ChromaDB
        chroma_results = chroma_client.search_similar_events(
            query_embedding=query_vector,
            limit=payload.limit
        )
        
        search_results = []
        
        ids = chroma_results.get("ids", [[]])[0]
        documents = chroma_results.get("documents", [[]])[0]
        metadatas = chroma_results.get("metadatas", [[]])[0]
        distances = chroma_results.get("distances", [[]])[0]
        
        for idx in range(len(ids)):
            search_results.append(
                SearchResult(
                    transaction_id=ids[idx],
                    summary=documents[idx],
                    metadata=metadatas[idx] if metadatas[idx] is not None else {},
                    distance=distances[idx]
                )
            )
            
        return SearchResponse(
            query=payload.query,
            results=search_results
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
