import sys
import os
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import SessionLocal
import models

client = TestClient(app)

def run_verifications():
    print("=" * 60)
    print("               STARTING CORE FLOW VERIFICATION")
    print("=" * 60)

    db = SessionLocal()
    
    try:
        # Clear any test transactions we might create to avoid duplicate constraint errors
        db.query(models.Transaction).filter(models.Transaction.transaction_id.like("test_verify_%")).delete(synchronize_session=False)
        db.query(models.FraudAlert).filter(models.FraudAlert.transaction_id.like("test_verify_%")).delete(synchronize_session=False)
        db.commit()

        # ----------------------------------------------------
        # 1. Verify process_transaction_event Directly
        # ----------------------------------------------------
        print("\n[1] Testing process_transaction_event (Direct Ingestion)...")
        from services.transaction_service import process_transaction_event
        
        # Test a standard captured transaction (should NOT trigger fraud)
        txn1 = process_transaction_event(
            db=db,
            event_type="payment.captured",
            transaction_id="test_verify_txn_1",
            customer_id="cust_test_1",
            merchant="Test Merchant A",
            amount=150.00,
            status_str="captured"
        )
        print(f" -> Ingested Transaction 1 ID: {txn1.transaction_id}, Status: {txn1.status}, Source: {txn1.source}")
        
        # Test a disputed transaction (should trigger fraud alert)
        txn2 = process_transaction_event(
            db=db,
            event_type="dispute.opened",
            transaction_id="test_verify_txn_2",
            customer_id="cust_test_2",
            merchant="Test Merchant B",
            amount=850.00,
            status_str="disputed"
        )
        print(f" -> Ingested Transaction 2 ID: {txn2.transaction_id}, Status: {txn2.status}, Source: {txn2.source}")

        # Check if FraudAlert was generated for Transaction 2
        alert = db.query(models.FraudAlert).filter(models.FraudAlert.transaction_id == "test_verify_txn_2").first()
        assert alert is not None, "Fraud alert was NOT generated for disputed transaction!"
        print(f" -> Verified Fraud Alert: ID={alert.id}, Score={alert.risk_score}, Reason={alert.reason}")

        # ----------------------------------------------------
        # 2. Verify POST /api/payments/simulate Works
        # ----------------------------------------------------
        print("\n[2] Testing POST /api/payments/simulate...")
        sim_payload = {
            "amount": 250.00,
            "customer_id": "cust_test_sim",
            "status": "captured"
        }
        res_sim = client.post("/api/payments/simulate", json=sim_payload)
        assert res_sim.status_code == 200, f"Simulation failed: {res_sim.text}"
        res_sim_data = res_sim.json()
        sim_txn_id = res_sim_data["transaction"]["transaction_id"]
        print(f" -> Simulation Response: {res_sim_data}")
        
        # Check if it is in DB
        db_sim_txn = db.query(models.Transaction).filter(models.Transaction.transaction_id == sim_txn_id).first()
        assert db_sim_txn is not None, "Simulated transaction was not saved to DB!"
        assert db_sim_txn.source == "simulation", f"Expected source 'simulation', got '{db_sim_txn.source}'"
        print(f" -> Verified simulation saved to DB. ID: {db_sim_txn.transaction_id}, Source: {db_sim_txn.source}")

        # ----------------------------------------------------
        # 3. Verify POST /api/payments/verify Works
        # ----------------------------------------------------
        print("\n[3] Testing POST /api/payments/verify...")
        # Since we don't want to mock Razorpay client signature verification, we can mock/override the signature validation
        # or temporarily patch it. Let's see if we can patch client.utility.verify_payment_signature.
        import razorpay
        original_verify = razorpay.utility.Utility.verify_payment_signature
        # Patching to succeed always for test
        razorpay.utility.Utility.verify_payment_signature = lambda self, params: True

        verify_payload = {
            "razorpay_order_id": "order_test_123",
            "razorpay_payment_id": "test_verify_razorpay_pay_999",
            "razorpay_signature": "mock_sig_123",
            "amount": 99.00,
            "customer_id": "cust_razorpay_test",
            "merchant": "Razorpay Sandbox"
        }
        res_verify = client.post("/api/payments/verify", json=verify_payload)
        # Restore utility
        razorpay.utility.Utility.verify_payment_signature = original_verify

        assert res_verify.status_code == 200, f"Verification failed: {res_verify.text}"
        print(f" -> Verification Response: {res_verify.json()}")
        
        # Check if it was saved to DB
        db_verify_txn = db.query(models.Transaction).filter(models.Transaction.transaction_id == "test_verify_razorpay_pay_999").first()
        assert db_verify_txn is not None, "Verified transaction was not saved to DB!"
        assert db_verify_txn.source == "razorpay", f"Expected source 'razorpay', got '{db_verify_txn.source}'"
        print(f" -> Verified transaction saved to DB. ID: {db_verify_txn.transaction_id}, Source: {db_verify_txn.source}")

        # ----------------------------------------------------
        # 4. Verify Existing Endpoints (POST /webhook, POST /api/transactions, GET /events)
        # ----------------------------------------------------
        print("\n[4] Testing /api/transactions endpoint...")
        api_payload = {
            "transaction_id": "test_verify_api_txn_1",
            "amount": 10.50,
            "status": "pending"
        }
        res_api = client.post("/api/transactions", json=api_payload)
        assert res_api.status_code == 201, f"API transaction post failed: {res_api.text}"
        print(f" -> API Txn creation response: {res_api.json()}")
        
        # Check if saved to DB and has default source
        db_api_txn = db.query(models.Transaction).filter(models.Transaction.transaction_id == "test_verify_api_txn_1").first()
        assert db_api_txn is not None, "API transaction was not saved to DB!"
        assert db_api_txn.source == "system", f"Expected source 'system', got '{db_api_txn.source}'"
        print(f" -> Verified API transaction saved to DB. Source: {db_api_txn.source}")

        print("\n[5] Testing /webhook endpoint...")
        webhook_payload = {
            "event_type": "dispute.opened",
            "transaction_id": "test_verify_webhook_txn_1",
            "customer_id": "cust_webhook_1",
            "merchant": "Swiggy Delivery",
            "amount": 450.00,
            "status": "disputed"
        }
        res_webhook = client.post("/webhook", json=webhook_payload)
        assert res_webhook.status_code == 201, f"Webhook post failed: {res_webhook.text}"
        print(f" -> Webhook processing response: {res_webhook.json()}")

        # Check if webhook generated fraud alert
        db_webhook_alert = db.query(models.FraudAlert).filter(models.FraudAlert.transaction_id == "test_verify_webhook_txn_1").first()
        assert db_webhook_alert is not None, "Webhook ingestion did not generate fraud alert!"
        print(f" -> Verified Webhook Fraud Alert: ID={db_webhook_alert.id}, Score={db_webhook_alert.risk_score}")

        print("\n[6] Testing /events (dashboard feed) endpoint...")
        res_events = client.get("/events")
        assert res_events.status_code == 200, f"Events fetch failed: {res_events.text}"
        events_list = res_events.json()
        print(f" -> Retrieved {len(events_list)} events from dashboard feed.")
        
        # Confirm our recently inserted transaction ID exists in list
        matching_events = [e for e in events_list if e["transaction_id"] == "test_verify_webhook_txn_1"]
        assert len(matching_events) > 0, "Webhook transaction did not appear in /events feed!"
        print(" -> Verified webhook transaction is visible in dashboard feed.")

        # ----------------------------------------------------
        # 5. Verify ChromaDB Indexing and Semantic Search
        # ----------------------------------------------------
        print("\n[7] Testing ChromaDB semantic search indexing...")
        search_payload = {
            "query": "Swiggy Delivery disputed transaction",
            "limit": 2
        }
        res_search = client.post("/search", json=search_payload)
        assert res_search.status_code == 200, f"Search endpoint failed: {res_search.text}"
        search_results = res_search.json()["results"]
        print(f" -> Semantic Search matches for 'Swiggy Delivery disputed transaction':")
        for match in search_results:
            print(f"    - Txn ID: {match['transaction_id']}, Summary: {match['summary']}")
        
        # Check if our webhook txn is one of the results
        matching_search = [r for r in search_results if r["transaction_id"] == "test_verify_webhook_txn_1"]
        assert len(matching_search) > 0, "Webhook transaction was not indexed or retrieved from ChromaDB!"
        print(" -> Verified ChromaDB indexing and semantic search matches successfully.")

        # ----------------------------------------------------
        # 6. Verify RAG retrieval compatibility
        # ----------------------------------------------------
        print("\n[8] Testing RAG retrieval compatibility...")
        # Querying /chat endpoint
        chat_payload = {
            "query": "Which transaction is associated with Swiggy Delivery and what is its status?"
        }
        res_chat = client.post("/chat", json=chat_payload)
        assert res_chat.status_code == 200, f"RAG chat endpoint failed: {res_chat.text}"
        chat_data = res_chat.json()
        print(f" -> RAG Chat Answer: {chat_data['answer']}")
        print(" -> Verified RAG retrieval successfully returned response.")

        print("\n" + "=" * 60)
        print("             ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
        print("=" * 60)

    except AssertionError as ae:
        print(f"\n[FAIL] Assertion failed: {ae}")
        raise ae
    except Exception as e:
        print(f"\n[FAIL] Exception during verification: {e}")
        raise e
    finally:
        # Cleanup
        db.query(models.Transaction).filter(models.Transaction.transaction_id.like("test_verify_%")).delete(synchronize_session=False)
        db.query(models.FraudAlert).filter(models.FraudAlert.transaction_id.like("test_verify_%")).delete(synchronize_session=False)
        db.commit()
        db.close()

if __name__ == "__main__":
    run_verifications()
