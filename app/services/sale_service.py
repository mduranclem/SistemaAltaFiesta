"""
Servicio de Punto de Venta (POS).

Registra ventas, descuenta stock y calcula totales.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.sale import SaleCreate
from app.services.product_service import ProductService


class SaleService:

    @staticmethod
    def create_sale(db: Session, data: SaleCreate) -> Sale:
        total = 0.0
        items_to_insert: list[SaleItem] = []

        for item_data in data.items:
            product = db.get(Product, item_data.product_id)
            if not product:
                raise ValueError(f"Producto ID {item_data.product_id} no encontrado")
            if not product.is_active:
                raise ValueError(f"Producto '{product.name}' no está activo")

            # Verificar y descontar stock
            ProductService.adjust_stock(db, product, -item_data.quantity)

            unit_price = float(product.sale_price)
            subtotal = round(unit_price * item_data.quantity, 2)
            total += subtotal

            items_to_insert.append(
                SaleItem(
                    product_id=item_data.product_id,
                    quantity=item_data.quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                )
            )

        sale = Sale(
            payment_method=data.payment_method,
            total=round(total, 2),
            notes=data.notes,
            items=items_to_insert,
        )
        db.add(sale)
        db.commit()
        db.refresh(sale)
        return sale

    @staticmethod
    def get_by_id(db: Session, sale_id: int) -> Sale | None:
        return db.get(Sale, sale_id)

    @staticmethod
    def list_by_date(db: Session, date_str: str) -> list[Sale]:
        """Lista ventas de una fecha dada (formato YYYY-MM-DD)."""
        from datetime import datetime
        from sqlalchemy import func

        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        stmt = select(Sale).where(
            func.date(Sale.created_at) == target_date
        ).order_by(Sale.created_at.desc())
        return list(db.scalars(stmt).all())
