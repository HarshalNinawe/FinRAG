import os
import time
import random
import sys
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Determine backend base URL from environment or fallback to local port
PORT = os.getenv("PORT", "8000")
HOST = os.getenv("HOST", "127.0.0.1")
# Allow overriding the base URL directly via BACKEND_URL or default to constructed URL
BASE_URL = os.getenv("BACKEND_URL", f"http://{HOST}:{PORT}")

# Clean up local address representation
if "0.0.0.0" in BASE_URL:
    BASE_URL = BASE_URL.replace("0.0.0.0", "127.0.0.1")

SUPPORTED_EVENTS = [
    "payment.failed",
    "payment.captured",
    "refund.created",
    "dispute.opened"
]

MERCHANTS = [
    "Amazon",
    "Flipkart",
    "Swiggy",
    "Zomato",
    "Uber",
    "Myntra"
]

STATUS_OPTIONS = {
    "payment.failed": ["failed", "declined"],
    "payment.captured": ["captured", "settled", "successful"],
    "refund.created": ["refunded", "processing_refund"],
    "dispute.opened": ["disputed", "under_review"]
}

def generate_random_event():
    event_type = random.choice(SUPPORTED_EVENTS)
    merchant = random.choice(MERCHANTS)
    customer_id = f"cust_{random.randint(1000, 9999)}"
    
    # Generate realistic financial amount
    amount = round(random.uniform(5.0, 1200.0), 2)
    
    # Randomly decide whether to supply a custom status or let backend default it
    supply_custom_status = random.choice([True, False])
    status = None
    if supply_custom_status:
        status = random.choice(STATUS_OPTIONS[event_type])
        
    # We also randomly decide whether to supply an explicit transaction_id or let the backend generate it
    supply_transaction_id = random.choice([True, False])
    transaction_id = None
    if supply_transaction_id:
        transaction_id = f"txn_{random.randint(100000, 999999)}"

    payload = {
        "event_type": event_type,
        "customer_id": customer_id,
        "merchant": merchant,
        "amount": amount
    }
    
    if status:
        payload["status"] = status
    if transaction_id:
        payload["transaction_id"] = transaction_id
        
    return payload

def run_simulator():
    print("=" * 60)
    print("                FinRAG Webhook Event Simulator")
    print("=" * 60)
    print(f"Target API Endpoint: {BASE_URL}/webhook")
    print("Generating and sending real-time financial events...")
    print("Press CTRL+C to stop the simulator.")
    print("-" * 60)

    try:
        while True:
            payload = generate_random_event()
            
            print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Sending Event: {payload['event_type']}")
            print(f"Payload: {payload}")
            
            try:
                response = requests.post(
                    f"{BASE_URL}/webhook",
                    json=payload,
                    timeout=5
                )
                print(f"API Response Status Code: {response.status_code}")
                
                try:
                    res_json = response.json()
                    # Pretty print the API response
                    print(f"API Response Body: {res_json}")
                except Exception:
                    print(f"API Response Raw: {response.text}")
                    
            except requests.exceptions.Timeout:
                print("Error: Request timed out. Is the FinRAG server running?")
            except requests.exceptions.ConnectionError:
                print(f"Error: Connection failed. Could not connect to {BASE_URL}. Is the server online?")
            except requests.exceptions.RequestException as e:
                print(f"Error occurred: {e}")

            # Sleep for 3-5 seconds randomly
            sleep_time = random.randint(3, 5)
            time.sleep(sleep_time)

    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("Simulator stopped by user. Gracefully exiting.")
        print("=" * 60)

if __name__ == "__main__":
    run_simulator()
