from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import razorpay
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import get_db
from services.transaction_service import process_transaction_event

load_dotenv()

router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Razorpay Client
client = razorpay.Client(
    auth=(
        os.getenv("RAZORPAY_KEY_ID"),
        os.getenv("RAZORPAY_KEY_SECRET")
    )
)


# ==========================
# Request Schemas
# ==========================

class SimulatedPaymentRequest(BaseModel):
    amount: float
    customer_id: str
    status: str = "captured"


class CreateOrderRequest(BaseModel):
    amount: float


# ==========================
# Simulated Payment
# ==========================

@router.post("/simulate")
async def simulate_payment(payload: SimulatedPaymentRequest, db: Session = Depends(get_db)):

    event_type = f"payment.{payload.status}"
    
    db_transaction = process_transaction_event(
        db=db,
        event_type=event_type,
        transaction_id=None,
        customer_id=payload.customer_id,
        merchant="Simulated Merchant",
        amount=payload.amount,
        status_str=payload.status
    )
    
    # Set source to simulation and commit
    db_transaction.source = "simulation"
    db.commit()
    db.refresh(db_transaction)

    return {
        "success": True,
        "message": "Simulated payment generated",
        "transaction": {
            "transaction_id": db_transaction.transaction_id,
            "event": db_transaction.event_type,
            "amount": db_transaction.amount,
            "customer_id": db_transaction.customer_id,
            "source": db_transaction.source,
            "status": db_transaction.status,
            "created_at": db_transaction.created_at.isoformat()
        }
    }


# ==========================
# Razorpay Order Creation
# ==========================

@router.post("/create-order")
async def create_order(payload: CreateOrderRequest):

    try:

        order = client.order.create({
            "amount": int(payload.amount * 100),
            "currency": "INR",
            "payment_capture": 1
        })

        return {
            "success": True,
            "order_id": order["id"],
            "amount": payload.amount
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================
# Payment Verification
# ==========================

@router.post("/verify")
async def verify_payment(data: dict, db: Session = Depends(get_db)):

    try:

        client.utility.verify_payment_signature({
            "razorpay_order_id": data["razorpay_order_id"],
            "razorpay_payment_id": data["razorpay_payment_id"],
            "razorpay_signature": data["razorpay_signature"]
        })

        # Save the captured payment to database and run pipelines
        amount = float(data.get("amount", 0.0))
        customer_id = data.get("customer_id", "cust_razorpay")
        merchant = data.get("merchant", "Razorpay Merchant")
        
        db_transaction = process_transaction_event(
            db=db,
            event_type="payment.captured",
            transaction_id=data["razorpay_payment_id"],
            customer_id=customer_id,
            merchant=merchant,
            amount=amount,
            status_str="captured"
        )
        
        db_transaction.source = "razorpay"
        db.commit()
        db.refresh(db_transaction)

        return {
            "success": True,
            "message": "Payment verified successfully",
            "transaction_id": db_transaction.transaction_id
        }

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=f"Verification failed: {str(e)}"
        )