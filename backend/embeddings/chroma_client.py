import os
import chromadb
from typing import List, Dict, Any

# Determine persistent directory relative to backend folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", os.path.join(BASE_DIR, "chroma_db"))
CHROMA_DB_DIR = os.path.abspath(CHROMA_DB_DIR)

print(f"Initializing ChromaDB client at: {CHROMA_DB_DIR}")

class ChromaClientWrapper:
    def __init__(self, client):
        self._client = client

    def get_or_create_collection(self, name, *args, **kwargs):
        provider = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
        target_name = name
        if provider == "gemini":
            if name == "transactions":
                target_name = "transactions_gemini"
            elif name == "compliance_docs":
                target_name = "compliance_gemini"
        
        print(f"Chroma Wrapper: get_or_create_collection('{name}') -> redirected to '{target_name}'")
        return self._client.get_or_create_collection(target_name, *args, **kwargs)

    def get_collection(self, name, *args, **kwargs):
        provider = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
        target_name = name
        if provider == "gemini":
            if name == "transactions":
                target_name = "transactions_gemini"
            elif name == "compliance_docs":
                target_name = "compliance_gemini"
        
        print(f"Chroma Wrapper: get_collection('{name}') -> redirected to '{target_name}'")
        return self._client.get_collection(target_name, *args, **kwargs)

    def delete_collection(self, name, *args, **kwargs):
        provider = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
        target_name = name
        if provider == "gemini":
            if name == "transactions":
                target_name = "transactions_gemini"
            elif name == "compliance_docs":
                target_name = "compliance_gemini"
        return self._client.delete_collection(target_name, *args, **kwargs)

    def __getattr__(self, name):
        return getattr(self._client, name)

_raw_client = None
_client = None
_collection = None

def get_client():
    global _raw_client, _client
    if _raw_client is None:
        _raw_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        _client = ChromaClientWrapper(_raw_client)
    return _client

# Expose 'client' as a module property for backward compatibility with load_compliance.py
client = get_client()

def get_collection():
    global _collection
    if _collection is None:
        provider = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
        name = "transactions"
        if provider == "gemini":
            name = "transactions_gemini"
        _collection = get_client().get_collection(name=name)
    return _collection

def upsert_transaction_embedding(transaction_id: str, embedding: List[float], document_text: str, metadata: Dict[str, Any]):
    """
    Upserts a transaction's embedding, summary text, and metadata to ChromaDB.
    """
    cleaned_metadata = {}
    for k, v in metadata.items():
        if v is None:
            cleaned_metadata[k] = ""
        elif isinstance(v, (str, int, float, bool)):
            cleaned_metadata[k] = v
        else:
            cleaned_metadata[k] = str(v)
            
    # Always fetch collection dynamically to respect current provider
    provider = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
    name = "transactions"
    if provider == "gemini":
        name = "transactions_gemini"
        
    coll = get_client().get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"}
    )
    coll.upsert(
        ids=[transaction_id],
        embeddings=[embedding],
        documents=[document_text],
        metadatas=[cleaned_metadata]
    )
    print(f"Successfully upserted vector embedding for transaction ID: {transaction_id} into '{name}'")

def search_similar_events(query_embedding: List[float], limit: int = 5) -> Dict[str, Any]:
    """
    Queries ChromaDB for the closest transactions given a query embedding.
    """
    provider = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
    name = "transactions"
    if provider == "gemini":
        name = "transactions_gemini"
        
    coll = get_client().get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"}
    )
    results = coll.query(
        query_embeddings=[query_embedding],
        n_results=limit
    )
    return results
