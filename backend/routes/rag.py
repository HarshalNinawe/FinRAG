from fastapi import APIRouter
from pydantic import BaseModel
from services.rag_service import process_rag_query

router = APIRouter(
    prefix="/rag",
    tags=["RAG"]
)


class RAGRequest(BaseModel):
    query: str


@router.post("/search")
def rag_search(request: RAGRequest):

   return process_rag_query(request.query)