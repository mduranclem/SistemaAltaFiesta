"""
Script para cargar fiambres. Ejecutar en terminal del backend:
  python cargar_fiambres.py
"""
import sys, os
sys.path.insert(0, '/app')
os.environ.setdefault('DATABASE_URL', 'sqlite:////data/altafiesta.db')

from app.database.session import SessionLocal, Base, engine
Base.metadata.create_all(bind=engine)
from app.models.product import Product

db = SessionLocal()

fiambres = [
    # (nombre, sku, precio_por_kg)
    ("Queso Barra Paulina",  "FIAM-QPAULINA",  12000),
    ("Queso Barra Tybo",     "FIAM-QTYBO",     12000),
    ("Paleta Fela",          "FIAM-PFELA",      8900),
    ("Paleta Paladini",      "FIAM-PPALADINI", 10000),
    ("Salame",               "FIAM-SALAME",    19000),
    ("Cremoso Recrem",       "FIAM-CRECREM",    8900),
    ("Cremoso Paulina",      "FIAM-CPAULINA",   8900),
]

for nombre, sku, precio_kg in fiambres:
    p = db.query(Product).filter(Product.sku == sku).first()
    if p:
        p.sale_price = precio_kg
        print(f"Actualizado: {nombre} ${precio_kg}/kg")
    else:
        db.add(Product(
            name=nombre, sku=sku, category="Fiambres",
            unit_type="peso",
            stock=0, min_stock=0,
            cost_price=1, margin_percent=0,
            sale_price=precio_kg,
            package_size=1,
            price_mid_surcharge=0,
            price_small_surcharge=0,
        ))
        print(f"Cargado: {nombre} ${precio_kg}/kg")

db.commit()
print("\nListo!")
db.close()
