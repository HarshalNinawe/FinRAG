from rag.retriever import retrieve_context
from rag.context_builder import build_context
from rag.prompt_builder import build_prompt
from services.llm_service import generate_answer


def ask_rag(query: str):

    retrieval = retrieve_context(query)

    context = build_context(
        query,
        retrieval
    )

    prompt = build_prompt(
        query,
        context
    )

    answer = generate_answer(
        prompt
    )

    return {
        "query": query,
        "transactions_found": len(
            retrieval["transactions"]
        ),
        "compliance_rules_found": len(
            retrieval["compliance_rules"]
        ),
        "answer": answer,
        "context": context
    }