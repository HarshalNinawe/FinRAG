from rag.retriever import retrieve_context


def build_context(query: str, top_k: int = 5) -> str:
    """
    Build structured RAG context from retrieval results.
    """

    results = retrieve_context(query, top_k)

    context_parts = []

    context_parts.append(f"User Query:\n{query}\n")

    context_parts.append("=== Relevant Transactions ===")

    if results["transactions"]:
        for idx, txn in enumerate(results["transactions"], start=1):
            context_parts.append(
                f"{idx}. {txn['document']}"
            )
    else:
        context_parts.append("No relevant transactions found.")

    context_parts.append("\n=== Relevant Compliance Rules ===")

    if results["compliance_rules"]:
        for idx, rule in enumerate(results["compliance_rules"], start=1):
            context_parts.append(
                f"{idx}. {rule['document']}"
            )
    else:
        context_parts.append("No relevant compliance rules found.")

    return "\n".join(context_parts)


if __name__ == "__main__":

    query = "failed payment fraud"

    context = build_context(query)

    print("\n===== GENERATED CONTEXT =====\n")
    print(context)