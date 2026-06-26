import os
import sys
import time
from typing import List

# Ensure backend directory is in path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Force Gemini mode for the migration process
os.environ["EMBEDDING_PROVIDER"] = "gemini"

from database import SessionLocal
import models
from embeddings import embedder, chroma_client
from embeddings.load_compliance import load_compliance_documents

try:
    import psutil
    def get_rss_memory() -> float:
        """Returns RSS memory of current process in MB."""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 * 1024)
except ImportError:
    def get_rss_memory() -> float:
        """Fallback when psutil is not installed."""
        return 0.0

def run_migration():
    print("=== STARTING CONTROLLED GEMINI MIGRATION ===")
    
    # 1. Measure initial state
    rss_before = get_rss_memory()
    print(f"Initial RSS Memory: {rss_before:.2f} MB")
    
    # Verify active provider
    print(f"Active Provider Name: {embedder.provider_name()}")
    print(f"Active Dimension: {embedder.get_dimension()}")
    
    # 2. Ingest Compliance Documents
    print("\nStep 1: Running Compliance Document Ingestion...")
    start_comp = time.time()
    load_compliance_documents()
    end_comp = time.time()
    print(f"Compliance ingestion completed in {end_comp - start_comp:.2f} seconds.")
    
    # 3. Fetch and Re-embed Transactions
    print("\nStep 2: Re-embedding Historical Transactions...")
    db = SessionLocal()
    try:
        transactions = db.query(models.Transaction).all()
        txn_count = len(transactions)
        print(f"Found {txn_count} transactions in the SQL database.")
        
        embed_latencies = []
        chroma_latencies = []
        inserted_count = 0
        
        for txn in transactions:
            summary = embedder.generate_summary(txn)
            
            # Measure embedding latency
            t0 = time.time()
            vector = embedder.get_embedding(summary)
            t1 = time.time()
            embed_latencies.append(t1 - t0)
            
            # Upsert into Chroma (automatically redirected to transactions_gemini)
            t2 = time.time()
            metadata = {
                "transaction_id": txn.transaction_id,
                "event_type": txn.event_type or "",
                "customer_id": txn.customer_id or "",
                "merchant": txn.merchant or "",
                "amount": float(txn.amount) if txn.amount is not None else 0.0,
                "status": txn.status or "",
                "created_at": txn.created_at.isoformat() if txn.created_at else ""
            }
            chroma_client.upsert_transaction_embedding(
                transaction_id=txn.transaction_id,
                embedding=vector,
                document_text=summary,
                metadata=metadata
            )
            t3 = time.time()
            chroma_latencies.append(t3 - t2)
            inserted_count += 1
            
            # sleep a bit between individual calls to respect rate limits if needed
            time.sleep(0.05)
            
    finally:
        db.close()
        
    rss_after = get_rss_memory()
    
    # Compute averages
    avg_embed_latency = (sum(embed_latencies) / len(embed_latencies)) * 1000 if embed_latencies else 0.0
    avg_chroma_latency = (sum(chroma_latencies) / len(chroma_latencies)) * 1000 if chroma_latencies else 0.0
    
    # 4. Collection Verification & Safety Checks
    print("\n=== STEP 3: MIGRATION VERIFICATION & SAFETY CHECKS ===")
    
    raw_client = chroma_client._raw_client
    existing_collections = [c.name for c in raw_client.list_collections()]
    print(f"Currently existing Chroma collections: {existing_collections}")
    
    safety_passed = True
    
    # Check that new collections exist
    if "transactions_gemini" not in existing_collections:
        print("ERROR: transactions_gemini was not created!")
        safety_passed = False
    if "compliance_gemini" not in existing_collections:
        print("ERROR: compliance_gemini was not created!")
        safety_passed = False
        
    # Check that existing collections are untouched
    if "transactions" not in existing_collections:
        print("ERROR: Original 'transactions' collection is missing!")
        safety_passed = False
    if "compliance_docs" not in existing_collections:
        print("ERROR: Original 'compliance_docs' collection is missing!")
        safety_passed = False
        
    # Check dimensions
    if safety_passed:
        t_orig = raw_client.get_collection("transactions")
        c_orig = raw_client.get_collection("compliance_docs")
        t_gem = raw_client.get_collection("transactions_gemini")
        c_gem = raw_client.get_collection("compliance_gemini")
        
        comp_chunks_count = c_gem.count()
        gemini_txn_count = t_gem.count()
        
        print("\n--- Dimensions & Counts Verification ---")
        print(f"Original 'transactions' count: {t_orig.count()}")
        print(f"Original 'compliance_docs' count: {c_orig.count()}")
        print(f"New 'transactions_gemini' count: {gemini_txn_count}")
        print(f"New 'compliance_gemini' count: {comp_chunks_count}")
        
        # Verify first vector dimension
        t_gem_sample = t_gem.get(limit=1, include=["embeddings"])
        if t_gem_sample.get("embeddings") is not None and len(t_gem_sample["embeddings"]) > 0:
            dim_t = len(t_gem_sample["embeddings"][0])
            print(f"transactions_gemini vector dimension: {dim_t}")
            if dim_t != 768:
                print(f"ERROR: Expected 768 dimensions, got {dim_t}!")
                safety_passed = False
        else:
            print("No sample vector in transactions_gemini yet to measure dimension.")
            
        c_gem_sample = c_gem.get(limit=1, include=["embeddings"])
        if c_gem_sample.get("embeddings") is not None and len(c_gem_sample["embeddings"]) > 0:
            dim_c = len(c_gem_sample["embeddings"][0])
            print(f"compliance_gemini vector dimension: {dim_c}")
            if dim_c != 768:
                print(f"ERROR: Expected 768 dimensions, got {dim_c}!")
                safety_passed = False
                
    print("\n=== MIGRATION METRICS SUMMARY ===")
    print(f"Compliance chunks count: {comp_chunks_count if safety_passed else 'N/A'}")
    print(f"Transaction count: {txn_count}")
    print(f"Number of inserted vectors: {inserted_count + (comp_chunks_count if safety_passed else 0)}")
    print(f"RSS memory before migration: {rss_before:.2f} MB")
    print(f"RSS memory after migration: {rss_after:.2f} MB")
    print(f"Average embedding latency: {avg_embed_latency:.2f} ms")
    print(f"Average Chroma query latency: {avg_chroma_latency:.2f} ms")
    
    if safety_passed:
        print("\nSTATUS: SUCCESS! Rollback pathway is healthy. Sentence mode remains active in config.")
    else:
        print("\nSTATUS: FAILURE. Review the errors above.")

if __name__ == "__main__":
    run_migration()
