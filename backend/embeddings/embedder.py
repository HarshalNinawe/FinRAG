import os
from typing import List, Any, Union
from dotenv import load_dotenv

load_dotenv()

# Lazy loaded provider singleton
_provider = None

def get_provider():
    """
    Returns the active embedding provider singleton based on EMBEDDING_PROVIDER.
    """
    global _provider
    if _provider is None:
        provider_type = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
        if provider_type == "gemini":
            from embeddings.gemini_provider import GeminiEmbeddingProvider
            print("Initializing Gemini Embedding Provider...")
            _provider = GeminiEmbeddingProvider()
        else:
            from embeddings.sentence_provider import SentenceTransformerProvider
            print("Initializing SentenceTransformer Embedding Provider...")
            _provider = SentenceTransformerProvider()
    return _provider

def get_embedding(text: Union[str, List[str]]) -> Union[List[float], List[List[float]]]:
    """
    Generates dense vector embedding(s) for the input text(s).
    """
    return get_provider().get_embedding(text)

def get_dimension() -> int:
    """
    Returns the vector dimension of the active embedding provider.
    """
    return get_provider().get_dimension()

def provider_name() -> str:
    """
    Returns the name of the active embedding provider.
    """
    return get_provider().provider_name()

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
