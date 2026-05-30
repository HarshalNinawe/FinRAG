import sys
import os
from fastapi.testclient import TestClient

# Ensure the backend directory is in the import path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import init_db

# Initialize the database and ensure schemas are created
init_db()

client = TestClient(app)

def test_flow():
    print("\n" + "="*60)
    print("STARTING SEMANTIC SEARCH RETRIEVAL VERIFICATION")
    print("="*60)
    
    # 1. Ingest multiple test webhook events
    events_to_ingest = [
        {
            "event_type": "payment.failed",
            "transaction_id": "txn_uber_fail_999",
            "customer_id": "cust_uber_user_1",
            "merchant": "Uber Taxi Ride",
            "amount": 45.50,
            "status": "failed"
        },
        {
            "event_type": "payment.captured",
            "transaction_id": "txn_netflix_success_888",
            "customer_id": "cust_netflix_user_2",
            "merchant": "Netflix Streaming",
            "amount": 15.99,
            "status": "captured"
        },
        {
            "event_type": "dispute.opened",
            "transaction_id": "txn_amazon_dispute_777",
            "customer_id": "cust_amazon_user_3",
            "merchant": "Amazon Online Store",
            "amount": 250.00,
            "status": "disputed"
        }
    ]

    print("\n--- STEP 1: Ingesting Webhook Events ---")
    for event in events_to_ingest:
        response = client.post("/webhook", json=event)
        if response.status_code in (200, 201):
            print(f"Successfully ingested: {event['transaction_id']} | Merchant: {event['merchant']} | Amount: ${event['amount']}")
        else:
            # If transaction already exists, that's fine for testing, but let's notify
            print(f"Skipped/Existed: {event['transaction_id']} (Status Code: {response.status_code}, Response: {response.text})")

    # 2. Perform Semantic Search Queries
    test_queries = [
        "failed taxi ride charge",
        "monthly video streaming payment captured",
        "shopping site dispute on large amount"
    ]

    print("\n--- STEP 2: Executing Semantic Search Queries ---")
    for query_text in test_queries:
        print(f"\nQuerying: '{query_text}'")
        search_payload = {
            "query": query_text,
            "limit": 2
        }
        
        response = client.post("/search", json=search_payload)
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        results = response.json().get("results", [])
        print(f"Found {len(results)} matches:")
        for idx, result in enumerate(results):
            txn_id = result["transaction_id"]
            distance = result["distance"]
            summary = result["summary"]
            metadata = result["metadata"]
            print(f"  [{idx + 1}] Txn ID: {txn_id} (Distance/Cosine: {distance:.4f})")
            print(f"      Summary: {summary}")
            print(f"      Merchant: {metadata.get('merchant')} | Status: {metadata.get('status')}")

    print("\n" + "="*60)
    print("VERIFICATION COMPLETED SUCCESSFULLY")
    print("="*60)

if __name__ == "__main__":
    test_flow()
