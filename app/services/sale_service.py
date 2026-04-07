"""
Servicio de Punto de Venta (POS).

Registra ventas, descuenta stock y calcula totales.
"""
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.combo import ComboItem
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

            # Verificar si es combo: descontar ingredientes en vez del producto directamente
            combo_items = db.scalars(
                select(ComboItem).where(ComboItem.combo_product_id == product.id)
            ).all()

            is_retail = getattr(item_data, 'is_retail', False)

            if combo_items:
                # Validar PRIMERO que hay stock suficiente de todos los ingredientes
                for ci in combo_items:
                    ingredient = db.get(Product, ci.ingredient_product_id)
                    if not ingredient:
                        raise ValueError(f"Ingrediente ID {ci.ingredient_product_id} no encontrado")
                    qty_needed = float(ci.quantity) * item_data.quantity
                    if float(ingredient.stock) < qty_needed:
                        raise ValueError(
                            f"Stock insuficiente de '{ingredient.name}': "
                            f"necesitás {qty_needed}, hay {float(ingredient.stock)}"
                        )
                # Recién ahora descontar
                for ci in combo_items:
                    ingredient = db.get(Product, ci.ingredient_product_id)
                    if ingredient:
                        qty_to_deduct = float(ci.quantity) * item_data.quantity
                        ProductService.adjust_stock(db, ingredient, -qty_to_deduct)
                # El combo en sí no descuenta su propio stock (es virtual)
            elif is_retail:
                # Venta suelta: descontar 1 unidad base por cada unidad vendida suelta
                ProductService.adjust_stock(db, product, -item_data.quantity)
            else:
                # Producto normal o paquete: descontar package_size * quantity del stock
                pkg = int(product.package_size) if product.package_size else 1
                ProductService.adjust_stock(db, product, -(item_data.quantity * pkg))

            # Determinar precio según modalidad
            if item_data.unit_price_override is not None:
                unit_price = round(float(item_data.unit_price_override), 4)
            elif product.unit_type == "peso":
                # price_mid_surcharge y price_small_surcharge almacenan el precio
                # efectivo POR KG para cada tramo (no son porcentajes):
                #   >=1000g → sale_price/1000 por gramo
                #   500-999g → price_mid_surcharge/1000 por gramo
                #   <500g   → price_small_surcharge/1000 por gramo
                qty_g = float(item_data.quantity)
                mid_kg = float(product.price_mid_surcharge or 0)
                small_kg = float(product.price_small_surcharge or 0)
                if small_kg > 0 and qty_g < 500:
                    unit_price = round(small_kg / 1000, 4)
                elif mid_kg > 0 and qty_g < 1000:
                    unit_price = round(mid_kg / 1000, 4)
                else:
                    unit_price = round(float(product.sale_price) / 1000, 4)
            elif is_retail and product.retail_price:
                unit_price = float(product.retail_price)
            else:
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

        discount = round(float(data.discount), 2) if data.discount else 0.0
        surcharge = round(float(data.surcharge), 2) if data.surcharge else 0.0
        final_total = round(max(total - discount + surcharge, 0), 2)

        sale = Sale(
            payment_method=data.payment_method,
            total=final_total,
            discount=discount,
            surcharge=surcharge,
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

    @staticmethod
    def profit_report(db: Session, date_from: str, date_to: str) -> dict:
        """Reporte de ganancia bruta en un rango de fechas."""
        from datetime import datetime, timedelta

        dt_from = datetime.strptime(date_from, "%Y-%m-%d").replace(hour=0, minute=0, second=0)
        dt_to   = datetime.strptime(date_to,   "%Y-%m-%d").replace(hour=23, minute=59, second=59)

        # Todos los items de venta en el rango
        rows = db.execute(
            select(SaleItem)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(Sale.created_at >= dt_from, Sale.created_at <= dt_to)
        ).scalars().all()

        total_revenue = 0.0
        total_cogs    = 0.0

        for item in rows:
            product = db.get(Product, item.product_id)
            cost = float(product.cost_price) if product else 0.0
            qty = float(item.quantity)
            total_revenue += float(item.subtotal)
            if product and product.unit_type == "peso":
                total_cogs += (cost / 1000) * qty
            else:
                total_cogs += cost * qty

        # Desglose por día
        by_day: dict[str, dict] = {}
        current = dt_from.date()
        end     = dt_to.date()
        while current <= end:
            by_day[current.strftime("%Y-%m-%d")] = {"date": current.strftime("%d/%m"), "revenue": 0.0, "cogs": 0.0, "profit": 0.0}
            current += timedelta(days=1)

        for item in rows:
            sale = db.get(Sale, item.sale_id)
            if not sale:
                continue
            day_key = sale.created_at.strftime("%Y-%m-%d")
            if day_key not in by_day:
                continue
            product = db.get(Product, item.product_id)
            cost = float(product.cost_price) if product else 0.0
            qty = float(item.quantity)
            by_day[day_key]["revenue"] += float(item.subtotal)
            if product and product.unit_type == "peso":
                by_day[day_key]["cogs"] += (cost / 1000) * qty
            else:
                by_day[day_key]["cogs"] += cost * qty

        for v in by_day.values():
            v["profit"] = round(v["revenue"] - v["cogs"], 2)
            v["revenue"] = round(v["revenue"], 2)
            v["cogs"]    = round(v["cogs"], 2)

        return {
            "from": date_from,
            "to":   date_to,
            "total_revenue":  round(total_revenue, 2),
            "total_cogs":     round(total_cogs, 2),
            "gross_profit":   round(total_revenue - total_cogs, 2),
            "profit_margin":  round((total_revenue - total_cogs) / total_revenue * 100, 1) if total_revenue > 0 else 0,
            "by_day": list(by_day.values()),
        }

    @staticmethod
    def top_products(db: Session, days: int = 30, limit: int = 8) -> list[dict]:
        """Productos más vendidos con cantidad, ingresos y ganancia estimada."""
        from datetime import datetime, timedelta
        since = datetime.utcnow() - timedelta(days=days)

        rows = db.execute(
            select(
                SaleItem.product_id,
                func.sum(SaleItem.quantity).label("total_qty"),
                func.sum(SaleItem.subtotal).label("total_revenue"),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(Sale.created_at >= since)
            .group_by(SaleItem.product_id)
            .order_by(func.sum(SaleItem.quantity).desc())
            .limit(limit)
        ).all()

        result = []
        for row in rows:
            product = db.get(Product, row.product_id)
            if not product:
                continue
            total_qty = float(row.total_qty)
            total_revenue = float(row.total_revenue)
            # Ganancia estimada usando costo actual del producto
            if product.unit_type == "peso":
                cost_total = (float(product.cost_price) / 1000) * total_qty
            else:
                cost_total = float(product.cost_price) * total_qty
            profit = round(total_revenue - cost_total, 2)
            result.append({
                "product_id": row.product_id,
                "name": product.name,
                "category": product.category,
                "unit_type": product.unit_type,
                "total_qty": round(total_qty, 2),
                "total_revenue": round(total_revenue, 2),
                "profit": profit,
                "margin_percent": float(product.margin_percent),
            })
        return result

    @staticmethod
    def delete_sale(db: Session, sale: Sale) -> None:
        """Elimina una venta y restaura el stock de cada ítem."""
        for item in sale.items:
            product = db.get(Product, item.product_id)
            if product:
                product.stock = float(product.stock) + float(item.quantity)
                product.sale_price = product.calculate_sale_price()
                db.add(product)
        db.delete(sale)
        db.commit()
