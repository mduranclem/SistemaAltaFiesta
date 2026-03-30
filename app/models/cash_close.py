from datetime import date, datetime

from sqlalchemy import Date, Numeric, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class CashClose(Base):
    """Registro del cierre de caja diario."""

    __tablename__ = "cash_closes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    close_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)

    # Ingresos por medio de pago
    total_cash: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_debit: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_credit: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_transfer: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    # Totales
    gross_income: Mapped[float] = mapped_column(Numeric(12, 2), default=0)  # suma de ventas
    total_expenses: Mapped[float] = mapped_column(Numeric(12, 2), default=0)  # suma de gastos
    net_balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0)   # ingreso - gastos

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<CashClose(date={self.close_date}, net={self.net_balance})>"
