"""
Script para cargar salchichas y sus promos. Ejecutar en terminal del backend:
  python cargar_salchichas.py
"""
import sys, os
sys.path.insert(0, '/app')
os.environ.setdefault('DATABASE_URL', 'sqlite:////data/altafiesta.db')

from app.database.session import SessionLocal, Base, engine
Base.metadata.create_all(bind=engine)
from app.models.product import Product
from app.models.combo import ComboItem

db = SessionLocal()

# ── Eliminar existentes ────────────────────────────────────────────────────────
skus_borrar = [
    "SAL-PATY","SAL-FELA","SAL-PALADINI","SAL-SFRIAR-PKT","SAL-SFRIAR-CAJA",
    "PROMO-PATY-12","PROMO-PATY-24","PROMO-PATY-30","PROMO-PATY-60",
    "PROMO-FELA-12","PROMO-FELA-24","PROMO-FELA-30","PROMO-FELA-60",
    "PROMO-PAL-12","PROMO-PAL-24","PROMO-PAL-30","PROMO-PAL-60",
    "PROMO-SFRIAR-CAJA","PROMO-SFRIAR-12",
]
for sku in skus_borrar:
    p = db.query(Product).filter(Product.sku == sku).first()
    if p:
        db.query(ComboItem).filter(
            (ComboItem.combo_product_id == p.id) | (ComboItem.ingredient_product_id == p.id)
        ).delete()
        db.delete(p)
        print(f"Eliminado: {p.name}")
db.flush()

# ── Productos base (unidad individual) ────────────────────────────────────────
bases = [
    ("Salchicha Paty",     "SAL-PATY",    "Salchichas", 1800),
    ("Salchicha Fela",     "SAL-FELA",    "Salchichas", 1500),
    ("Salchicha Paladini", "SAL-PALADINI","Salchichas", 2150),
]
for nombre, sku, cat, pvp in bases:
    db.add(Product(
        name=nombre, sku=sku, category=cat,
        unit_type="unidad", stock=0, min_stock=0,
        cost_price=1, margin_percent=0, sale_price=pvp,
        package_size=1, price_mid_surcharge=0, price_small_surcharge=0,
    ))
    print(f"Cargado: {nombre} ${pvp}")

# ── Super Friar: paquete (x12 salchichas) ─────────────────────────────────────
sfriar = Product(
    name="Salchicha Super Friar (paquete x12)", sku="SAL-SFRIAR-PKT",
    category="Salchichas", unit_type="unidad",
    stock=0, min_stock=0, cost_price=1, margin_percent=0,
    sale_price=5900, package_size=1,
    price_mid_surcharge=0, price_small_surcharge=0,
)
db.add(sfriar)
db.flush()
print("Cargado: Salchicha Super Friar paquete $5,900")

# ── Combos de salchichas por marca ────────────────────────────────────────────
paty     = db.query(Product).filter(Product.sku == "SAL-PATY").first()
fela     = db.query(Product).filter(Product.sku == "SAL-FELA").first()
paladini = db.query(Product).filter(Product.sku == "SAL-PALADINI").first()

promos = [
    # (nombre, sku, ingrediente, cantidad, precio)
    ("Promo Paty x12",      "PROMO-PATY-12",  paty,     12,  6400),
    ("Promo Paty x24",      "PROMO-PATY-24",  paty,     24, 12800),
    ("Promo Paty x30",      "PROMO-PATY-30",  paty,     30, 15800),
    ("Promo Paty x60",      "PROMO-PATY-60",  paty,     60, 31600),
    ("Promo Fela x12",      "PROMO-FELA-12",  fela,     12,  6100),
    ("Promo Fela x24",      "PROMO-FELA-24",  fela,     24, 12400),
    ("Promo Fela x30",      "PROMO-FELA-30",  fela,     30, 15200),
    ("Promo Fela x60",      "PROMO-FELA-60",  fela,     60, 30400),
    ("Promo Paladini x12",  "PROMO-PAL-12",   paladini, 12,  7600),
    ("Promo Paladini x24",  "PROMO-PAL-24",   paladini, 24, 15200),
    ("Promo Paladini x30",  "PROMO-PAL-30",   paladini, 30, 18900),
    ("Promo Paladini x60",  "PROMO-PAL-60",   paladini, 60, 37800),
]

for nombre, sku, ing, qty, pvp in promos:
    p = Product(
        name=nombre, sku=sku, category="Promos",
        unit_type="unidad", stock=0, min_stock=0,
        cost_price=1, margin_percent=0, sale_price=pvp,
        package_size=1, is_combo=True,
        price_mid_surcharge=0, price_small_surcharge=0,
    )
    db.add(p)
    db.flush()
    db.add(ComboItem(combo_product_id=p.id, ingredient_product_id=ing.id, quantity=qty))
    print(f"Cargado: {nombre} ${pvp}")

# ── Super Friar: caja (8 paquetes x12) ────────────────────────────────────────
caja = Product(
    name="Super Friar Caja (8 paquetes x12)", sku="PROMO-SFRIAR-CAJA",
    category="Promos", unit_type="unidad",
    stock=0, min_stock=0, cost_price=1, margin_percent=0,
    sale_price=45900, package_size=1, is_combo=True,
    price_mid_surcharge=0, price_small_surcharge=0,
)
db.add(caja)
db.flush()
db.add(ComboItem(combo_product_id=caja.id, ingredient_product_id=sfriar.id, quantity=8))
print("Cargado: Super Friar Caja (8 paquetes) $45,900")

# ── Super Friar Promo x12: $9,400 ─────────────────────────────────────────────
# PENDIENTE: confirmar qué son las 12 unidades de esta promo
# Por ahora se crea como combo de 2 paquetes ($9,400 por 2 paquetes)
promo12 = Product(
    name="Super Friar Promo x12", sku="PROMO-SFRIAR-12",
    category="Promos", unit_type="unidad",
    stock=0, min_stock=0, cost_price=1, margin_percent=0,
    sale_price=9400, package_size=1, is_combo=True,
    price_mid_surcharge=0, price_small_surcharge=0,
)
db.add(promo12)
db.flush()
db.add(ComboItem(combo_product_id=promo12.id, ingredient_product_id=sfriar.id, quantity=2))
print("Cargado: Super Friar Promo x12 $9,400 (combo 2 paquetes — CONFIRMAR)")

db.commit()
print("\nListo!")
db.close()
