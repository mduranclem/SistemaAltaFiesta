from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, Numeric, DateTime, Enum, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class ExpenseCategory(str, PyEnum):
    SUPPLIER = "proveedor"
    SERVICE = "servicio"
    SALARY = "salario"
    MAINTENANCE = "mantenimiento"
    OTHER = "otro"


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[str] = mapped_column(
        Enum(ExpenseCategory), nullable=False, default=ExpenseCategory.OTHER
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Expense(id={self.id}, desc={self.description!r}, amount={self.amount})>"
