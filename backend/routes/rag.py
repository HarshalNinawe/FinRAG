from fastapi import APIRouter
from pydantic import BaseModel
from services.rag_service import ask_rag

router = APIRouter(
    prefix="/rag",
    tags=["RAG"]
)


class RAGRequest(BaseModel):
    query: str

@router.post("/search")
def rag_search(request: RAGRequest):

   return ask_rag(request.query)
   