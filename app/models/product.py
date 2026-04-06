from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, Numeric, Boolean, DateTime, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class UnitType(str, PyEnum):
    UNIT = "unidad"      # latas, paquetes, etc.
    WEIGHT = "peso"      # gramos, kilos, etc.


class WeightUnit(str, PyEnum):
    GRAM = "g"
    KILOGRAM = "kg"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Tipo de stock ──────────────────────────────────────────
    unit_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unidad"
    )
    weight_unit: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )

    # ── Stock ──────────────────────────────────────────────────
    stock: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    min_stock: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)

    # ── Precios ────────────────────────────────────────────────
    cost_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    margin_percent: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=30.0
    )
    sale_price: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )  # PVP calculado automáticamente (precio por paquete)

    # ── Venta fraccionada ──────────────────────────────────────
    package_size: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Cuántas unidades base trae un paquete (ej: 10 panes = package_size 10)
    retail_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    # Precio por unidad suelta (None = no se vende suelto)

    # ── Estado ────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_combo: Mapped[bool] = mapped_column(Boolean, default=False, server_default='0')
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def calculate_sale_price(self) -> float:
        """Calcula el PVP: costo * (1 + margen/100). Redondea a 2 decimales."""
        return round(float(self.cost_price) * (1 + float(self.margin_percent) / 100), 2)

    def apply_price_update(self, new_cost: float | None = None, new_margin: float | None = None) -> None:
        """Actualiza costo y/o margen y recalcula el PVP automáticamente."""
        if new_cost is not None:
            self.cost_price = new_cost
        if new_margin is not None:
            self.margin_percent = new_margin
        self.sale_price = self.calculate_sale_price()
        self.updated_at = datetime.utcnow()

    @property
    def is_low_stock(self) -> bool:
        return float(self.stock) <= float(self.min_stock)

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, sku={self.sku}, name={self.name!r})>"
