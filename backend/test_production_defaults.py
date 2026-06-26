import os
import sys
import time
import subprocess

# Ensure backend directory is in path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Clear any provider env variable if set in local session
if "EMBEDDING_PROVIDER" in os.environ:
    del os.environ["EMBEDDING_PROVIDER"]

# Load backend/.env to load API key but NOT setting EMBEDDING_PROVIDER
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

def get_windows_rss() -> float:
    try:
        pid = os.getpid()
        cmd = f"wmic process where processid={pid} get WorkingSetSize"
        output = subprocess.check_output(cmd, shell=True).decode()
        lines = [line.strip() for line in output.split("\n") if line.strip()]
        if len(lines) > 1:
            return int(lines[1]) / (1024 * 1024)
    except Exception:
        pass
    return 0.0

if __name__ == "__main__":
    print("=== TESTING PRODUCTION DEFAULTS (UNSET ENV) ===")
    
    from embeddings import embedder, chroma_client
    from rag.retriever import retrieve_context
    from services.rag_service import ask_rag
    from services.transaction_service import process_transaction_event
    from database import SessionLocal
    import models
    
    # 1. Verify default provider is gemini
    p_name = embedder.provider_name()
    p_dim = embedder.get_dimension()
    print(f"Default Provider Name: {p_name} (Expected: gemini)")
    print(f"Default Vector Dimension: {p_dim} (Expected: 768)")
    
    assert p_name == "gemini", f"Default provider should be gemini, got {p_name}"
    assert p_dim == 768, f"Default dimension should be 768, got {p_dim}"
    
    # 2. Test Retrieval
    print("\nRunning RAG Retrieval under defaults...")
    t0 = time.time()
    results = retrieve_context("dispute airbnb")
    t1 = time.time()
    print(f"Retrieval completed in {(t1 - t0)*1000:.2f} ms")
    print(f"Found {len(results['transactions'])} transactions and {len(results['compliance_rules'])} compliance rules.")
    
    # 3. Test Chat
    print("\nRunning Chat Generation under defaults...")
    t0_chat = time.time()
    response = ask_rag("Detail the Airbnb dispute on May 24 2026")
    t1_chat = time.time()
    print(f"Chat generation completed in {(t1_chat - t0_chat)*1000:.2f} ms")
    print(f"Answer: {response['answer']}")
    
    # 4. Test Webhook/Transaction Ingestion
    print("\nSimulating Webhook/Transaction Ingestion...")
    db = SessionLocal()
    try:
        # Create a unique mock transaction
        mock_txn_id = f"txn_prod_test_{int(time.time())}"
        t0_ingest = time.time()
        txn = process_transaction_event(
            db=db,
            event_type="payment.failed",
            transaction_id=mock_txn_id,
            customer_id="cust_prod_test",
            merchant="Stripe Test Merchant",
            amount=99.99,
            status_str="failed"
        )
        db.commit()
        t1_ingest = time.time()
        print(f"Transaction processed and ingested in {(t1_ingest - t0_ingest)*1000:.2f} ms")
        
        # Verify it went to the correct transactions_gemini collection
        raw_client = chroma_client._raw_client
        gemini_coll = raw_client.get_collection("transactions_gemini")
        found = gemini_coll.get(ids=[mock_txn_id])
        
        assert len(found["ids"]) > 0, "Transaction should be found in transactions_gemini!"
        print(f"SUCCESS: Transaction {mock_txn_id} verified inside 'transactions_gemini' collection!")
        
        # Clean up database test record
        db.delete(txn)
        db.commit()
        
    finally:
        db.close()
        
    rss = get_windows_rss()
    print(f"\nFinal Fresh Process RSS Memory: {rss:.2f} MB")
    print("STATUS: ALL PRODUCTION DEFAULTS TESTS PASSED!")
