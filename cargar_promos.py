"""
Script para cargar las promos de hamburguesas como combos.
Ejecutar desde la raíz del proyecto: python cargar_promos.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.product import Product
from app.models.combo import ComboItem
from sqlalchemy.orm import Session

db: Session = SessionLocal()

try:
    # Obtener los productos base por SKU
    def get_id(sku):
        p = db.query(Product).filter(Product.sku == sku).first()
        if not p:
            raise Exception(f"Producto no encontrado: {sku}")
        return p.id

    ricc = get_id("HAM-RICC")
    burm = get_id("HAM-BURM")
    blck = get_id("HAM-BLCK")
    swff = get_id("HAM-SWFF")
    patc = get_id("HAM-PATC")
    patx = get_id("HAM-PATX")
    pald = get_id("HAM-PALD")

    # (nombre, sku, precio_venta, ingrediente_id, cantidad)
    promos = [
        # Riccisimas
        ("Promo x60 Riccisimas",    "PRO-RICC-60",  34800, ricc, 60),
        ("Promo x12 Riccisimas",    "PRO-RICC-12",   9400, ricc, 12),
        ("Promo x10 Riccisimas",    "PRO-RICC-10",   7800, ricc, 10),
        # Burmit
        ("Promo x60 Burmit",        "PRO-BURM-60",  55300, burm, 60),
        ("Promo x30 Burmit",        "PRO-BURM-30",  28700, burm, 30),
        ("Promo x12 Burmit",        "PRO-BURM-12",  11500, burm, 12),
        ("Promo x10 Burmit",        "PRO-BURM-10",   9600, burm, 10),
        # Black Label
        ("Promo x60 Black Label",   "PRO-BLCK-60",  68200, blck, 60),
        ("Promo x30 Black Label",   "PRO-BLCK-30",  35500, blck, 30),
        ("Promo x12 Black Label",   "PRO-BLCK-12",  14200, blck, 12),
        ("Promo x10 Black Label",   "PRO-BLCK-10",  11900, blck, 10),
        # Swiff
        ("Promo x60 Swiff",         "PRO-SWFF-60",  99800, swff, 60),
        ("Promo x30 Swiff",         "PRO-SWFF-30",  51500, swff, 30),
        ("Promo x12 Swiff",         "PRO-SWFF-12",  20600, swff, 12),
        ("Promo x10 Swiff",         "PRO-SWFF-10",  17200, swff, 10),
        # Paty Clasica
        ("Promo x60 Paty Clasica",  "PRO-PATC-60",  95800, patc, 60),
        ("Promo x30 Paty Clasica",  "PRO-PATC-30",  49000, patc, 30),
        ("Promo x12 Paty Clasica",  "PRO-PATC-12",  19600, patc, 12),
        ("Promo x10 Paty Clasica",  "PRO-PATC-10",  16400, patc, 10),
        # Paty Express
        ("Promo x60 Paty Express",  "PRO-PATX-60",  78000, patx, 60),
        ("Promo x30 Paty Express",  "PRO-PATX-30",  39000, patx, 30),
        ("Promo x24 Paty Express",  "PRO-PATX-24",  30800, patx, 24),
        ("Promo x12 Paty Express",  "PRO-PATX-12",  15500, patx, 12),
        # Paladini
        ("Promo x60 Paladini",      "PRO-PALD-60",  99800, pald, 60),
        ("Promo x30 Paladini",      "PRO-PALD-30",  51500, pald, 30),
        ("Promo x12 Paladini",      "PRO-PALD-12",  20600, pald, 12),
        ("Promo x10 Paladini",      "PRO-PALD-10",  17200, pald, 10),
    ]

    for nombre, sku, precio, ing_id, cantidad in promos:
        existing = db.query(Product).filter(Product.sku == sku).first()
        if existing:
            print(f"Ya existe: {nombre} — omitido")
            continue

        combo = Product(
            name=nombre,
            sku=sku,
            category="Promos",
            unit_type="unidad",
            package_size=1,
            cost_price=0,
            sale_price=precio,
            retail_price=None,
            stock=0,
            min_stock=0,
            is_active=True,
            is_combo=True,
            margin_percent=0,
        )
        db.add(combo)
        db.flush()  # para obtener el ID

        ci = ComboItem(
            combo_product_id=combo.id,
            ingredient_product_id=ing_id,
            quantity=cantidad,
        )
        db.add(ci)
        print(f"Agregado: {nombre} (x{cantidad} unidades)")

    db.commit()
    print("\nListo! Todas las promos cargadas.")

finally:
    db.close()
