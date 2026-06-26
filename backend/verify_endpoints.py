import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("=== STARTING LIVE END-TO-END VALIDATION ===")
    
    # 1. Health check
    print("\n1. Testing /health...")
    res = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200, "Health check failed!"
    
    # 2. Ingest payment failed webhook
    print("\n2. Simulating payment.failed webhook event...")
    payload_failed = {
        "event_type": "payment.failed",
        "transaction_id": f"txn_fail_live_{int(time.time())}",
        "customer_id": "cust_live_test",
        "merchant": "Uber Inc",
        "amount": 25.50,
        "status": "failed"
    }
    res = requests.post(f"{BASE_URL}/webhook", json=payload_failed)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 201, "Webhook failed!"
    
    # 3. Ingest dispute webhook
    print("\n3. Simulating dispute.opened webhook event...")
    payload_disputed = {
        "event_type": "dispute.opened",
        "transaction_id": f"txn_disp_live_{int(time.time())}",
        "customer_id": "cust_live_test",
        "merchant": "Airbnb Store",
        "amount": 450.00,
        "status": "disputed"
    }
    res = requests.post(f"{BASE_URL}/webhook", json=payload_disputed)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 201, "Dispute webhook failed!"
    
    # 4. Search endpoint
    print("\n4. Testing /search endpoint...")
    search_payload = {
        "query": "Airbnb dispute Airbnb Store",
        "limit": 3
    }
    res = requests.post(f"{BASE_URL}/search", json=search_payload)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200, "Search failed!"
    
    # 5. Chat endpoint
    print("\n5. Testing /chat session and prompts...")
    # Create session
    session_res = requests.post(f"{BASE_URL}/api/chat/session", json={"title": "E2E Test Chat"})
    session_id = session_res.json()["session_id"]
    print(f"Created Session ID: {session_id}")
    
    # Chat prompt
    chat_payload = {
        "content": "Why was the payment flagged?"
    }
    res = requests.post(f"{BASE_URL}/chat", json={"query": "Why was the payment flagged?"})
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200, "Chat prompt failed!"
    
    print("\n=== ALL E2E VERIFICATIONS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    test_endpoints()
