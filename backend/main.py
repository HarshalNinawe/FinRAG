import os
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db, init_db
import models

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
    return db_transaction

@app.get("/api/transactions", response_model=List[TransactionResponse], tags=["Transactions"])
def list_transactions(db: Session = Depends(get_db)):
    """
    List all transactions stored in the database.
    """
    return db.query(models.Transaction).all()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
