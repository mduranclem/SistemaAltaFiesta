from datetime import date

from datetime import date as DateType
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.schemas.cash_close import CashCloseCreate, CashCloseResponse, DailySummary
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/finances", tags=["Finanzas"])


# ── Gastos ────────────────────────────────────────────────────────────────

@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db)):
    return FinanceService.create_expense(db, data)


@router.patch("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: int, body: dict, db: Session = Depends(get_db)):
    """Edita descripción, categoría o monto de un gasto."""
    expense = FinanceService.update_expense(db, expense_id, body)
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return expense


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """Elimina un gasto registrado."""
    if not FinanceService.delete_expense(db, expense_id):
        raise HTTPException(status_code=404, detail="Gasto no encontrado")


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
    body: CashCloseCreate,
    date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
):
    """Genera el cierre de caja para la fecha indicada."""
    try:
        return FinanceService.close_cash(db, date, body.notes, body.opening_cash)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/chart")
def chart_data(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Devuelve datos diarios para gráfico (últimos N días)."""
    return FinanceService.get_chart_data(db, days)


@router.get("/closes", response_model=list[CashCloseResponse])
def list_closes(
    skip: int = 0,
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db),
):
    return FinanceService.list_closes(db, skip, limit)


@router.post("/closes/{close_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_close(close_id: int, db: Session = Depends(get_db)):
    """Cancela (elimina) un cierre de caja."""
    if not FinanceService.delete_close(db, close_id):
        raise HTTPException(status_code=404, detail="Cierre no encontrado")
