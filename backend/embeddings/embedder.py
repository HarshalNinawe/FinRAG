import os
from typing import List, Any
from sentence_transformers import SentenceTransformer

# Singleton placeholder for the model
_model = None

def get_model() -> SentenceTransformer:
    """
    Lazy loads the sentence-transformers model all-MiniLM-L6-v2.
    """
    global _model
    if _model is None:
        model_name = "all-MiniLM-L6-v2"
        print(f"Loading SentenceTransformer model '{model_name}'...")
        _model = SentenceTransformer(model_name)
        print("SentenceTransformer model loaded successfully.")
    return _model

def get_embedding(text: str) -> List[float]:
    """
    Generates a 384-dimensional list representing the dense vector of the input text.
    """
    model = get_model()
    # model.encode returns a numpy array, we convert to a python list
    embedding_vector = model.encode(text)
    return embedding_vector.tolist()

def generate_summary(transaction: Any) -> str:
    """
    Generates a rich, descriptive summary text from a Transaction instance.
    This summary is formatted specifically to optimize embedding search accuracy.
    """
    txn_id = getattr(transaction, "transaction_id", "unknown")
    event_type = getattr(transaction, "event_type", "unknown") or "unknown"
    customer_id = getattr(transaction, "customer_id", "unknown") or "unknown"
    merchant = getattr(transaction, "merchant", "unknown") or "unknown"
    amount = getattr(transaction, "amount", 0.0)
    status = getattr(transaction, "status", "unknown") or "unknown"
    
    created_at = getattr(transaction, "created_at", None)
    created_iso = created_at.isoformat() if created_at else "unknown"

    # Descriptive natural language summary
    summary_text = (
        f"A transaction with ID '{txn_id}' representing a '{event_type}' event was logged on {created_iso}. "
        f"The transaction is associated with Customer ID '{customer_id}' and Merchant '{merchant}'. "
        f"The transaction amount is ${amount:.2f} and the current processing status is '{status}'."
    )
    return summary_text
