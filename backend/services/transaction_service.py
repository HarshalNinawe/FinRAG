import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import models
from fraud_detection.detector import calculate_risk_score

def index_transaction_in_chroma(transaction: models.Transaction):
    """
    Generates a natural language summary and vector embedding for a transaction
    and saves it to ChromaDB with metadata.
    """
    # Lazy import to avoid loading SentenceTransformer during app startup
    from embeddings import embedder, chroma_client

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

def process_transaction_event(
    db: Session,
    event_type: Optional[str],
    transaction_id: Optional[str],
    customer_id: Optional[str],
    merchant: Optional[str],
    amount: float,
    status_str: Optional[str]
) -> models.Transaction:
    """
    Core business logic to ingest a transaction:
    - Generates and verifies transaction ID uniqueness.
    - Saves the transaction to the database.
    - Evaluates the transaction for fraud and logs an alert if risk_score >= 50.
    - Indexes the transaction in ChromaDB.
    - Commits the session.
    """
    txn_id = transaction_id
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

    db_transaction = models.Transaction(
        event_type=event_type,
        transaction_id=txn_id,
        customer_id=customer_id,
        merchant=merchant,
        amount=amount,
        status=status_str or "pending"
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    # Evaluate for fraud
    fraud_result = calculate_risk_score(db_transaction)
    if fraud_result["risk_score"] >= 50:
        alert = models.FraudAlert(
            transaction_id=db_transaction.transaction_id,
            risk_score=fraud_result["risk_score"],
            reason=", ".join(fraud_result["reasons"])
        )
        db.add(alert)
        db.commit()

    # Automatically index transaction in ChromaDB
    index_transaction_in_chroma(db_transaction)

    return db_transaction
