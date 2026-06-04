
from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    answer: str

class SimulatedPaymentRequest(BaseModel):
    amount: float
    customer_id: str
    merchant: str = "FinRAG Demo"
    status: str = "captured"


class CreateOrderRequest(BaseModel):
    amount: float