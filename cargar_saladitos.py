"""
Script para cargar saladitos. Ejecutar en terminal del backend:
  python cargar_saladitos.py
"""
import sys, os
sys.path.insert(0, '/app')
os.environ.setdefault('DATABASE_URL', 'sqlite:////data/altafiesta.db')

from app.database.session import SessionLocal, Base, engine
Base.metadata.create_all(bind=engine)
from app.models.product import Product
from app.models.combo import ComboItem

db = SessionLocal()

# ── Eliminar saladitos existentes ─────────────────────────────────────────────
skus = ["SAL-PAPAS","SAL-PALITOS","SAL-CHIZITOS","SAL-MANI","SAL-TUTCAS","SAL-PUFLITOS","SAL-CHALITAS","PROMO-SAL-500"]
for sku in skus:
    p = db.query(Product).filter(Product.sku == sku).first()
    if p:
        db.query(ComboItem).filter(
            (ComboItem.combo_product_id == p.id) | (ComboItem.ingredient_product_id == p.id)
        ).delete()
        db.delete(p)
        print(f"Eliminado: {p.name}")
db.flush()

# ── Saladitos por peso ────────────────────────────────────────────────────────
# price_mid_surcharge  = precio/kg efectivo para 500-999g
# price_small_surcharge = precio/kg efectivo para <500g
# Verificación: papas 500g → 11600/1000 * 500 = $5,800 ✓

saladitos = [
    # (nombre, sku, precio_1kg, precio_efectivo_kg_500g, precio_efectivo_kg_100g)
    ("Papas",    "SAL-PAPAS",   10800, 11600, 14000),
    ("Palitos",  "SAL-PALITOS",  5000,  5400,  7000),
    ("Chizitos", "SAL-CHIZITOS", 5300,  5600,  7000),
    ("Maní",     "SAL-MANI",     5500,  5800,  8000),
    ("Tutcas",   "SAL-TUTCAS",   5500,  5800,  8000),
    ("Puflitos", "SAL-PUFLITOS", 5500,  5800,  8000),
]

for nombre, sku, precio_kg, mid_kg, small_kg in saladitos:
    p = Product(
        name=nombre, sku=sku, category="Saladitos",
        unit_type="peso",
        stock=0, min_stock=0, cost_price=0, margin_percent=0,
        sale_price=precio_kg, package_size=1,
        price_mid_surcharge=mid_kg,
        price_small_surcharge=small_kg,
    )
    db.add(p)
    print(f"Cargado: {nombre} | 1kg=${precio_kg} | 500g=${mid_kg//2} | 100g=${small_kg//10}")

# ── Chalitas (paquete cerrado 400g) ───────────────────────────────────────────
db.add(Product(
    name="Chalitas 400g", sku="SAL-CHALITAS", category="Saladitos",
    unit_type="unidad",
    stock=0, min_stock=0, cost_price=0, margin_percent=0,
    sale_price=5900, package_size=1,
    price_mid_surcharge=0, price_small_surcharge=0,
))
print("Cargado: Chalitas 400g $5,900")

db.flush()

# ── Promo saladito ────────────────────────────────────────────────────────────
papas    = db.query(Product).filter(Product.sku == "SAL-PAPAS").first()
palitos  = db.query(Product).filter(Product.sku == "SAL-PALITOS").first()
chizitos = db.query(Product).filter(Product.sku == "SAL-CHIZITOS").first()
mani     = db.query(Product).filter(Product.sku == "SAL-MANI").first()

promo = Product(
    name="Promo Saladito ½kg c/u (papas, palitos, chizitos, maní)",
    sku="PROMO-SAL-500", category="Promos",
    unit_type="unidad",
    stock=0, min_stock=0, cost_price=0, margin_percent=0,
    sale_price=13500, package_size=1, is_combo=True,
    price_mid_surcharge=0, price_small_surcharge=0,
)
db.add(promo)
db.flush()
for ing in [papas, palitos, chizitos, mani]:
    db.add(ComboItem(combo_product_id=promo.id, ingredient_product_id=ing.id, quantity=500))
print("Cargado: Promo Saladito $13,500")

db.commit()
print("\nListo!")
db.close()
