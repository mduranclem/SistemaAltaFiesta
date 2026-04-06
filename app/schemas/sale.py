from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.sale import PaymentMethod


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)
    is_retail: bool = False  # True = venta suelta (usa retail_price, descuenta quantity unidades)
    unit_price_override: Optional[float] = None  # Precio mayorista manual (si se indica, reemplaza el precio calculado)


class SaleCreate(BaseModel):
    payment_method: PaymentMethod = PaymentMethod.CASH
    items: list[SaleItemCreate] = Field(..., min_length=1)
    discount: float = Field(0, ge=0)
    surcharge: float = Field(0, ge=0)
    notes: Optional[str] = None


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: float
    unit_price: float
    subtotal: float

    model_config = {"from_attributes": True}


class SaleResponse(BaseModel):
    id: int
    payment_method: PaymentMethod
    total: float
    discount: float
    surcharge: float
    notes: Optional[str]
    items: list[SaleItemResponse]
    created_at: datetime

    model_config = {"from_attributes": True}
