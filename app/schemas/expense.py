from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=300)
    category: ExpenseCategory = ExpenseCategory.OTHER
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    description: str
    category: ExpenseCategory
    amount: float
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
