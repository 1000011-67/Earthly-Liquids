from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import razorpay
from datetime import datetime
import uuid

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.earthly_liquids

# Razorpay setup (test credentials)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_1234567890')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'test_secret_key')
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Pydantic models
class Product(BaseModel):
    id: str
    name: str
    description: str
    price: float
    image_url: str
    features: List[str]
    stock: int

class CartItem(BaseModel):
    product_id: str
    quantity: int

class Order(BaseModel):
    id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    items: List[CartItem]
    total_amount: float
    payment_id: Optional[str] = None
    order_status: str = "pending"
    created_at: datetime

class PaymentOrder(BaseModel):
    amount: int  # in paise
    currency: str = "INR"
    customer_details: dict

# Sample product data
SAMPLE_PRODUCT = {
    "id": "ecoshield-1l",
    "name": "EcoShield Natural Floor Cleanser",
    "description": "Experience the power of nature with EcoShield - our premium natural floor cleanser that's 77.6% plant-based and crafted with pure neem extract and refreshing eucalyptus oil. This eco-friendly formula not only deep cleans your floors but also acts as a natural fly and mosquito repellent, creating a pest-free environment for your family. Safe for even the most sensitive skin, EcoShield contains zero harmful chemicals while delivering powerful disinfectant properties that eliminate bacteria and fungi. The unique moisture-retaining formula prevents floor cracking while leaving behind the invigorating scent of eucalyptus.",
    "price": 159.0,
    "image_url": "https://images.unsplash.com/photo-1658238613327-4330ee3f029a",
    "features": [
        "77.6% natural or plant-based ingredients",
        "Made with neem extract and eucalyptus oil",
        "Natural fly and mosquito repellent",
        "No harmful chemicals - safe for sensitive skin",
        "Retains floor moisture and prevents cracking",
        "Acts as disinfectant - kills bacteria and fungi",
        "Minimum water pollution",
        "Fresh eucalyptus fragrance"
    ],
    "stock": 100
}

# Initialize database with sample product
async def init_db():
    await db.products.delete_many({})
    await db.products.insert_one(SAMPLE_PRODUCT)

@app.on_event("startup")
async def startup_event():
    await init_db()

# API Routes
@app.get("/api/products")
async def get_products():
    products = await db.products.find().to_list(1000)
    # Remove MongoDB ObjectId to make it JSON serializable
    for product in products:
        if "_id" in product:
            del product["_id"]
    return products

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Remove MongoDB ObjectId to make it JSON serializable
    if "_id" in product:
        del product["_id"]
    return product

@app.post("/api/create-order")
async def create_payment_order(order: PaymentOrder):
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": order.amount,
            "currency": order.currency,
            "payment_capture": 1
        })
        
        # Store order in database
        order_data = {
            "id": str(uuid.uuid4()),
            "razorpay_order_id": razorpay_order["id"],
            "amount": order.amount,
            "currency": order.currency,
            "customer_details": order.customer_details,
            "status": "created",
            "created_at": datetime.now()
        }
        
        await db.orders.insert_one(order_data)
        
        return {
            "order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verify-payment")
async def verify_payment(payment_data: dict):
    try:
        # In a real implementation, verify the payment signature
        # For now, just update the order status
        razorpay_order_id = payment_data.get("razorpay_order_id")
        payment_id = payment_data.get("razorpay_payment_id")
        
        await db.orders.update_one(
            {"razorpay_order_id": razorpay_order_id},
            {
                "$set": {
                    "payment_id": payment_id,
                    "status": "paid",
                    "updated_at": datetime.now()
                }
            }
        )
        
        return {"status": "success", "message": "Payment verified successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders")
async def get_orders():
    orders = await db.orders.find().to_list(1000)
    return orders

@app.get("/")
async def root():
    return {"message": "Earthly Liquids API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)