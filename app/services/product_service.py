"""
Servicio de Inventario y Precios.

Centraliza toda la lógica de negocio relacionada con productos:
- CRUD con validaciones
- Cálculo y actualización de PVP
- Ajuste de stock
- Actualización masiva de precios
"""
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductPriceUpdate


class ProductService:

    @staticmethod
    def create(db: Session, data: ProductCreate) -> Product:
        dump = data.model_dump()
        manual_price = dump.pop('sale_price_override', None)
        product = Product(**dump)
        # Si hay precio manual lo usa, sino calcula por margen
        product.sale_price = float(manual_price) if manual_price else product.calculate_sale_price()
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Product | None:
        return db.get(Product, product_id)

    @staticmethod
    def get_by_sku(db: Session, sku: str) -> Product | None:
        return db.scalar(select(Product).where(Product.sku == sku))

    @staticmethod
    def list_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        category: str | None = None,
    ) -> list[Product]:
        stmt = select(Product)
        if active_only:
            stmt = stmt.where(Product.is_active == True)  # noqa: E712
        if category:
            stmt = stmt.where(Product.category == category)
        stmt = stmt.offset(skip).limit(limit).order_by(Product.name)
        return list(db.scalars(stmt).all())

    @staticmethod
    def list_low_stock(db: Session) -> list[Product]:
        stmt = select(Product).where(
            Product.is_active == True,  # noqa: E712
            Product.stock <= Product.min_stock,
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def update(db: Session, product: Product, data: ProductUpdate) -> Product:
        patch = data.model_dump(exclude_unset=True)
        manual_price = patch.pop('sale_price_override', None)
        for field, value in patch.items():
            setattr(product, field, value)

        if manual_price:
            product.sale_price = float(manual_price)
        elif "cost_price" in patch or "margin_percent" in patch:
            product.sale_price = product.calculate_sale_price()

        product.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update_price(db: Session, product: Product, data: ProductPriceUpdate) -> Product:
        """Actualiza costo y/o margen de un producto y recalcula el PVP."""
        product.apply_price_update(
            new_cost=data.cost_price,
            new_margin=data.margin_percent,
        )
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def bulk_update_margin(db: Session, new_margin: float, category: str | None = None) -> int:
        """
        Actualización masiva del margen de ganancia.
        Retorna el número de productos actualizados.
        """
        stmt = (
            update(Product)
            .where(Product.is_active == True)  # noqa: E712
        )
        if category:
            stmt = stmt.where(Product.category == category)

        # Actualizar margen y recalcular PVP en una sola pasada
        # sale_price = cost_price * (1 + new_margin/100)
        from sqlalchemy import text
        result = db.execute(
            stmt.values(
                margin_percent=new_margin,
                updated_at=datetime.utcnow(),
            )
        )
        db.flush()

        # Recalcular sale_price para los productos afectados
        recalc_stmt = select(Product).where(Product.is_active == True)  # noqa: E712
        if category:
            recalc_stmt = recalc_stmt.where(Product.category == category)

        products = list(db.scalars(recalc_stmt).all())
        for p in products:
            p.sale_price = p.calculate_sale_price()

        db.commit()
        return len(products)

    @staticmethod
    def adjust_stock(db: Session, product: Product, quantity: float) -> Product:
        """
        Ajusta el stock sumando o restando.
        quantity positivo = entrada, negativo = salida.
        Lanza ValueError si el resultado es negativo.
        """
        new_stock = float(product.stock) + quantity
        if new_stock < 0:
            raise ValueError(
                f"Stock insuficiente. Disponible: {product.stock}, solicitado: {abs(quantity)}"
            )
        product.stock = round(new_stock, 3)
        product.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def deactivate(db: Session, product: Product) -> Product:
        product.is_active = False
        product.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(product)
        return product
