import os
import sys
from typing import Dict, List

_transactions_collection = None
_compliance_collection = None


def get_transactions_collection():
    global _transactions_collection

    if _transactions_collection is None:
        from embeddings import chroma_client

        _transactions_collection = (
            chroma_client.client.get_or_create_collection(
                name="transactions"
            )
        )

    return _transactions_collection


def get_compliance_collection():
    global _compliance_collection

    if _compliance_collection is None:
        from embeddings import chroma_client

        _compliance_collection = (
            chroma_client.client.get_or_create_collection(
                name="compliance_docs"
            )
        )

    return _compliance_collection

# Ensure backend root is available
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# from embeddings import embedder, chroma_client


def retrieve_context(query: str, top_k: int = 5) -> Dict:
    """
    Search both transaction and compliance collections
    and return combined retrieval results.
    """
    from embeddings import embedder, chroma_client

    try:
        # Generate query embedding
        query_embedding = embedder.get_embedding(query)

        # Get collections
        transactions_collection = get_transactions_collection()
        compliance_collection = get_compliance_collection()

        # Search transaction collection
        transaction_results = transactions_collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )

        # Search compliance collection
        compliance_results = compliance_collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )

        # Format transaction results
        transactions = []

        if transaction_results.get("documents"):
            docs = transaction_results["documents"][0]

            metadatas = (
                transaction_results.get("metadatas", [[]])[0]
            )

            distances = (
                transaction_results.get("distances", [[]])[0]
            )

            for i in range(len(docs)):
                transactions.append({
                    "document": docs[i],
                    "metadata": metadatas[i] if i < len(metadatas) else {},
                    "score": distances[i] if i < len(distances) else None
                })

        # Format compliance results
        compliance_rules = []

        if compliance_results.get("documents"):
            docs = compliance_results["documents"][0]

            metadatas = (
                compliance_results.get("metadatas", [[]])[0]
            )

            distances = (
                compliance_results.get("distances", [[]])[0]
            )

            for i in range(len(docs)):
                compliance_rules.append({
                    "document": docs[i],
                    "metadata": metadatas[i] if i < len(metadatas) else {},
                    "score": distances[i] if i < len(distances) else None
                })
        
        from database import SessionLocal
        import models

        db = SessionLocal()
        try:
            fraud_alerts = (
                db.query(models.FraudAlert)
                .order_by(models.FraudAlert.created_at.desc())
                .limit(20)
                .all()
            )
            
            fraud_alerts_list = [
                {
                    "id": alert.id,
                    "transaction_id": alert.transaction_id,
                    "risk_score": alert.risk_score,
                    "reason": alert.reason,
                    "created_at": alert.created_at.isoformat() if alert.created_at else None
                }
                for alert in fraud_alerts
            ]
        finally:
            db.close()

        return {
            "query": query,
            "transactions": transactions,
            "compliance_rules": compliance_rules,
            "fraud_alerts": fraud_alerts_list
        }

    except Exception as e:
        print(f"Retriever error: {e}")

        return {
            "query": query,
            "transactions": [],
            "compliance_rules": [],
            "fraud_alerts": [],
            "error": str(e)
        }


if __name__ == "__main__":

    result = retrieve_context(
        "cardholder security"
    )

    print("\n=== RETRIEVAL RESULTS ===\n")

    print("Transactions:")
    for item in result["transactions"]:
        print(item)

    print("\nCompliance Rules:")
    for item in result["compliance_rules"]:
        print(item)