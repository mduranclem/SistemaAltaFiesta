from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.models.product import UnitType, WeightUnit


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    category: Optional[str] = None
    unit_type: UnitType = UnitType.UNIT
    weight_unit: Optional[WeightUnit] = None
    stock: float = Field(0, ge=0)
    min_stock: float = Field(0, ge=0)
    cost_price: float = Field(..., gt=0)
    margin_percent: float = Field(30.0, ge=0, le=1000)

    @model_validator(mode="after")
    def weight_unit_required_for_weight_type(self) -> "ProductCreate":
        if self.unit_type == UnitType.WEIGHT and self.weight_unit is None:
            raise ValueError("weight_unit es obligatorio cuando unit_type es 'peso'")
        return self


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[float] = Field(None, ge=0)
    min_stock: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, gt=0)
    margin_percent: Optional[float] = Field(None, ge=0, le=1000)
    is_active: Optional[bool] = None


class ProductPriceUpdate(BaseModel):
    """Payload para actualización masiva o individual de precios."""
    cost_price: Optional[float] = Field(None, gt=0)
    margin_percent: Optional[float] = Field(None, ge=0, le=1000)


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    description: Optional[str]
    category: Optional[str]
    unit_type: UnitType
    weight_unit: Optional[WeightUnit]
    stock: float
    min_stock: float
    cost_price: float
    margin_percent: float
    sale_price: float
    is_active: bool
    is_low_stock: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StockAdjustment(BaseModel):
    quantity: float = Field(..., description="Cantidad a sumar (positivo) o restar (negativo)")
    reason: Optional[str] = Field(None, max_length=300)
