"""
Comprehensive RAG Pipeline Debug Script
Tests every layer from retrieval to generation to HTTP endpoint
"""
import requests
import json
import sys
import os
import traceback

BASE_URL = "http://127.0.0.1:8000"

def separator(title):
    print("\n" + "="*60)
    print("  " + title)
    print("="*60)

def ok(msg=""):
    print(">>> PASS" + (" - " + msg if msg else ""))

def fail(msg=""):
    print(">>> FAIL" + (" - " + msg if msg else ""))

# TEST 1: HTTP Health
separator("TEST 1: HTTP Health Check")
try:
    r = requests.get(BASE_URL + "/health", timeout=5)
    print("Status:", r.status_code)
    print("Body:", r.json())
    assert r.status_code == 200
    ok()
except Exception as e:
    fail(str(e))
    print("Backend may not be running!")
    sys.exit(1)

# TEST 2: POST /chat
separator("TEST 2: POST /chat  (Frontend ChatPanel uses this)")
try:
    payload = {"query": "What are the latest failed payments?"}
    print("Sending:", json.dumps(payload))
    r = requests.post(BASE_URL + "/chat", json=payload, timeout=40)
    print("HTTP Status:", r.status_code)
    try:
        body = r.json()
    except Exception:
        print("RAW RESPONSE TEXT:", r.text[:500])
        fail("Could not parse JSON")
        body = {}
    print("Response keys:", list(body.keys()))
    answer = body.get("answer", "")
    print("Answer (first 400 chars):", answer[:400])
    if r.status_code == 200 and len(answer) > 10:
        ok("Chat working")
    else:
        fail("status=%d, answer_len=%d" % (r.status_code, len(answer)))
except Exception as e:
    fail(str(e))
    traceback.print_exc()

# TEST 3: POST /rag/search
separator("TEST 3: POST /rag/search")
try:
    payload = {"query": "disputed transactions"}
    r = requests.post(BASE_URL + "/rag/search", json=payload, timeout=40)
    print("HTTP Status:", r.status_code)
    try:
        body = r.json()
    except Exception:
        print("RAW TEXT:", r.text[:500])
        body = {}
    print("Response keys:", list(body.keys()))
    print("transactions_found:", body.get("transactions_found", "MISSING"))
    print("compliance_rules_found:", body.get("compliance_rules_found", "MISSING"))
    answer = body.get("answer", "")
    print("Answer (first 400 chars):", answer[:400])
    if r.status_code == 200:
        ok()
    else:
        fail("HTTP " + str(r.status_code))
except Exception as e:
    fail(str(e))
    traceback.print_exc()

# TEST 4: Direct Python ask_rag
separator("TEST 4: Direct Python ask_rag (no HTTP)")
try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from services.rag_service import ask_rag
    print("Calling ask_rag('failed payment fraud alert')...")
    result = ask_rag("failed payment fraud alert")
    print("Keys in result:", list(result.keys()))
    print("transactions_found:", result.get("transactions_found", "?"))
    print("compliance_rules_found:", result.get("compliance_rules_found", "?"))
    answer = result.get("answer", "")
    print("Answer length:", len(answer))
    print("Answer (first 500 chars):\n", answer[:500])
    if len(answer) > 10:
        ok()
    else:
        fail("empty or very short answer: '%s'" % answer)
except Exception as e:
    fail(str(e))
    traceback.print_exc()

# TEST 5: Retriever isolation
separator("TEST 5: Retriever Isolation")
try:
    from rag.retriever import retrieve_context
    print("Calling retrieve_context('high risk fraud')...")
    result = retrieve_context("high risk fraud")
    print("transactions:", len(result.get("transactions", [])), "found")
    print("compliance_rules:", len(result.get("compliance_rules", [])), "found")
    print("fraud_alerts:", len(result.get("fraud_alerts", [])), "found")
    if result.get("error"):
        fail("RETRIEVER ERROR: " + str(result["error"]))
    else:
        ok("Retriever working")
    if result["transactions"]:
        print("Sample transaction:", str(result["transactions"][0])[:200])
except Exception as e:
    fail(str(e))
    traceback.print_exc()

# TEST 6: LLM isolation
separator("TEST 6: LLM Service Isolation")
try:
    from services.llm_service import generate_answer
    test_prompt = "Reply with exactly: LLM_IS_WORKING"
    print("Sending minimal prompt to Gemini...")
    answer = generate_answer(test_prompt)
    print("LLM answer:", answer[:200])
    if answer and len(answer) > 2 and "LLM Error" not in answer and "quota" not in answer.lower():
        ok("LLM generating")
    else:
        fail("LLM returned error or quota message")
except Exception as e:
    fail(str(e))
    traceback.print_exc()

# TEST 7: /events
separator("TEST 7: GET /events (StatsCards)")
try:
    r = requests.get(BASE_URL + "/events", timeout=5)
    print("Status:", r.status_code)
    data = r.json()
    print("Events returned:", len(data))
    if data:
        print("Sample:", json.dumps(data[0], default=str)[:200])
    ok()
except Exception as e:
    fail(str(e))
    traceback.print_exc()

# TEST 8: /fraud-alerts
separator("TEST 8: GET /fraud-alerts")
try:
    r = requests.get(BASE_URL + "/fraud-alerts", timeout=5)
    print("Status:", r.status_code)
    data = r.json()
    print("Alerts returned:", len(data))
    ok()
except Exception as e:
    fail(str(e))
    traceback.print_exc()

separator("ALL TESTS COMPLETE")
