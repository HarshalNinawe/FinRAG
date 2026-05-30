import os
import chromadb
from typing import List, Dict, Any

# Determine persistent directory relative to backend folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", os.path.join(BASE_DIR, "chroma_db"))
CHROMA_DB_DIR = os.path.abspath(CHROMA_DB_DIR)

print(f"Initializing ChromaDB client at: {CHROMA_DB_DIR}")

# Initialize ChromaDB persistent client
client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# Get or create the collection named "transactions"
collection = client.get_or_create_collection(
    name="transactions",
    metadata={"hnsw:space": "cosine"}
)

def upsert_transaction_embedding(transaction_id: str, embedding: List[float], document_text: str, metadata: Dict[str, Any]):
    """
    Upserts a transaction's embedding, summary text, and metadata to ChromaDB.
    """
    # Clean up metadata values to comply with ChromaDB's requirement (str, int, float, bool)
    cleaned_metadata = {}
    for k, v in metadata.items():
        if v is None:
            cleaned_metadata[k] = ""
        elif isinstance(v, (str, int, float, bool)):
            cleaned_metadata[k] = v
        else:
            cleaned_metadata[k] = str(v)
            
    collection.upsert(
        ids=[transaction_id],
        embeddings=[embedding],
        documents=[document_text],
        metadatas=[cleaned_metadata]
    )
    print(f"Successfully upserted vector embedding for transaction ID: {transaction_id}")

def search_similar_events(query_embedding: List[float], limit: int = 5) -> Dict[str, Any]:
    """
    Queries ChromaDB for the closest transactions given a query embedding.
    """
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=limit
    )
    return results
