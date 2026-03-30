from fastapi import APIRouter

from app.api.v1.endpoints import products, sales, finances

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(products.router)
api_router.include_router(sales.router)
api_router.include_router(finances.router)
