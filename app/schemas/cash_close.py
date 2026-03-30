from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class CashCloseResponse(BaseModel):
    id: int
    close_date: date
    total_cash: float
    total_debit: float
    total_credit: float
    total_transfer: float
    gross_income: float
    total_expenses: float
    net_balance: float
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DailySummary(BaseModel):
    """Resumen del día sin persistir, útil para preview antes del cierre."""
    date: date
    sales_count: int
    total_cash: float
    total_debit: float
    total_credit: float
    total_transfer: float
    gross_income: float
    total_expenses: float
    net_balance: float
