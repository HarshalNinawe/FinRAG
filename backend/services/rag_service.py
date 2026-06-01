from rag.retriever import retrieve_context
from rag.context_builder import build_context


def process_rag_query(query: str):

    retrieval = retrieve_context(query)

    context = build_context(query)

    return {
        "query": query,
        "transactions_found": len(
            retrieval["transactions"]
        ),
        "compliance_rules_found": len(
            retrieval["compliance_rules"]
        ),
        "context": context
    }