"""
Servicio de Finanzas.

Gastos diarios y cierre de caja.
"""
from datetime import date, datetime

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.sale import Sale, PaymentMethod
from app.models.cash_close import CashClose
from app.schemas.expense import ExpenseCreate
from app.schemas.cash_close import DailySummary


class FinanceService:

    # ── Gastos ────────────────────────────────────────────────────────────

    @staticmethod
    def create_expense(db: Session, data: ExpenseCreate) -> Expense:
        expense = Expense(**data.model_dump())
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return expense

    @staticmethod
    def list_expenses_by_date(db: Session, target_date: date) -> list[Expense]:
        stmt = select(Expense).where(
            func.date(Expense.created_at) == target_date
        ).order_by(Expense.created_at)
        return list(db.scalars(stmt).all())

    # ── Resumen diario (preview) ──────────────────────────────────────────

    @staticmethod
    def get_daily_summary(db: Session, target_date: date) -> DailySummary:
        """Calcula el resumen del día sin guardarlo."""

        # Totales de ventas por método de pago
        def sales_total(method: PaymentMethod) -> float:
            result = db.scalar(
                select(func.coalesce(func.sum(Sale.total), 0)).where(
                    func.date(Sale.created_at) == target_date,
                    Sale.payment_method == method,
                )
            )
            return float(result or 0)

        total_cash = sales_total(PaymentMethod.CASH)
        total_debit = sales_total(PaymentMethod.DEBIT)
        total_credit = sales_total(PaymentMethod.CREDIT)
        total_transfer = sales_total(PaymentMethod.TRANSFER)

        # Conteo de ventas
        sales_count = db.scalar(
            select(func.count(Sale.id)).where(
                func.date(Sale.created_at) == target_date
            )
        ) or 0

        gross_income = total_cash + total_debit + total_credit + total_transfer

        # Total de gastos del día
        total_expenses = float(
            db.scalar(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(
                    func.date(Expense.created_at) == target_date
                )
            ) or 0
        )

        return DailySummary(
            date=target_date,
            sales_count=sales_count,
            total_cash=total_cash,
            total_debit=total_debit,
            total_credit=total_credit,
            total_transfer=total_transfer,
            gross_income=gross_income,
            total_expenses=total_expenses,
            net_balance=round(gross_income - total_expenses, 2),
        )

    # ── Cierre de Caja ───────────────────────────────────────────────────

    @staticmethod
    def close_cash(db: Session, target_date: date, notes: str | None = None) -> CashClose:
        """Genera y persiste el cierre de caja. Falla si ya existe para esa fecha."""
        existing = db.scalar(
            select(CashClose).where(CashClose.close_date == target_date)
        )
        if existing:
            raise ValueError(f"Ya existe un cierre de caja para la fecha {target_date}")

        summary = FinanceService.get_daily_summary(db, target_date)

        cash_close = CashClose(
            close_date=target_date,
            total_cash=summary.total_cash,
            total_debit=summary.total_debit,
            total_credit=summary.total_credit,
            total_transfer=summary.total_transfer,
            gross_income=summary.gross_income,
            total_expenses=summary.total_expenses,
            net_balance=summary.net_balance,
            notes=notes,
        )
        db.add(cash_close)
        db.commit()
        db.refresh(cash_close)
        return cash_close

    @staticmethod
    def list_closes(db: Session, skip: int = 0, limit: int = 30) -> list[CashClose]:
        stmt = select(CashClose).order_by(CashClose.close_date.desc()).offset(skip).limit(limit)
        return list(db.scalars(stmt).all())
