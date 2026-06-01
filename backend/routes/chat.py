from fastapi import APIRouter

from schemas import (
    ChatRequest,
    ChatResponse
)

from services.rag_service import ask_rag

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


@router.post(
    "",
    response_model=ChatResponse
)
def chat(
    request: ChatRequest
):

    result = ask_rag(
        request.query
    )

    return ChatResponse(
        answer=result["answer"]
    )