from sqlalchemy import Integer, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class ComboItem(Base):
    """Ingrediente de un combo/promo: qué producto se descuenta y en qué cantidad."""

    __tablename__ = "combo_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    combo_product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    ingredient_product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
