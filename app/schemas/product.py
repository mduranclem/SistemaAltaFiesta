from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    category: Optional[str] = None
    unit_type: str = "unidad"
    stock: float = Field(0, ge=0)
    min_stock: float = Field(0, ge=0)
    cost_price: float = Field(..., gt=0)
    margin_percent: float = Field(30.0, ge=0, le=1000)
    is_active: bool = True
    package_size: int = Field(1, ge=1)
    retail_price: Optional[float] = Field(None, gt=0)
    sale_price_override: Optional[float] = Field(None, gt=0)
    price_mid_surcharge: float = Field(0, ge=0, le=1000)
    price_small_surcharge: float = Field(0, ge=0, le=1000)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    unit_type: Optional[str] = None
    stock: Optional[float] = Field(None, ge=0)
    min_stock: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, gt=0)
    margin_percent: Optional[float] = Field(None, ge=0, le=1000)
    is_active: Optional[bool] = None
    package_size: Optional[int] = Field(None, ge=1)
    retail_price: Optional[float] = Field(None, gt=0)
    sale_price_override: Optional[float] = Field(None, gt=0)
    price_mid_surcharge: Optional[float] = Field(None, ge=0, le=1000)
    price_small_surcharge: Optional[float] = Field(None, ge=0, le=1000)


class ProductPriceUpdate(BaseModel):
    cost_price: Optional[float] = Field(None, gt=0)
    margin_percent: Optional[float] = Field(None, ge=0, le=1000)


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    description: Optional[str]
    category: Optional[str]
    unit_type: str
    stock: float
    min_stock: float
    cost_price: float
    margin_percent: float
    sale_price: float
    package_size: int
    retail_price: Optional[float]
    is_active: bool
    is_combo: bool
    is_low_stock: bool
    combo_available: bool = True
    combo_missing: Optional[str] = None  # nombre del ingrediente sin stock suficiente
    price_mid_surcharge: float = 0
    price_small_surcharge: float = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StockAdjustment(BaseModel):
    quantity: float = Field(..., description="Cantidad a sumar (positivo) o restar (negativo)")
    reason: Optional[str] = Field(None, max_length=300)
