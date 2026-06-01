from services.rag_service import ask_rag

response = ask_rag(
    "Why was the payment flagged?"
)

print("\n===== RAG RESPONSE =====\n")
print(response["answer"])
