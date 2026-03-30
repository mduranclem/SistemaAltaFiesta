from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.schemas.cash_close import CashCloseResponse, DailySummary
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/finances", tags=["Finanzas"])


# ── Gastos ────────────────────────────────────────────────────────────────

@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db)):
    return FinanceService.create_expense(db, data)


@router.get("/expenses", response_model=list[ExpenseResponse])
def list_expenses(
    date: date = Query(default_factory=date.today, description="Fecha YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    return FinanceService.list_expenses_by_date(db, date)


# ── Resumen y Cierre ──────────────────────────────────────────────────────

@router.get("/summary", response_model=DailySummary)
def daily_summary(
    date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
):
    """Preview del balance del día (no persiste)."""
    return FinanceService.get_daily_summary(db, date)


@router.post("/close", response_model=CashCloseResponse, status_code=status.HTTP_201_CREATED)
def close_cash(
    date: date = Query(default_factory=date.today),
    notes: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Genera el cierre de caja para la fecha indicada."""
    try:
        return FinanceService.close_cash(db, date, notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/closes", response_model=list[CashCloseResponse])
def list_closes(
    skip: int = 0,
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db),
):
    return FinanceService.list_closes(db, skip, limit)
