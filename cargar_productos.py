"""
Script para cargar los productos de hamburguesas en la base de datos.
Ejecutar desde la raíz del proyecto: python cargar_productos.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.session import engine, SessionLocal
from app.models.product import Product
from sqlalchemy.orm import Session

productos = [
    # (nombre, sku, package_size, sale_price_caja, precio_x1, precio_x2)
    # sale_price = precio por unidad (x1)
    # Los precios de promo se manejan con descuento en el POS
    {
        "name": "Hamburguesas Riccisimas",
        "sku": "HAM-RICC",
        "category": "Hamburguesas",
        "unit_type": "unidad",
        "package_size": 60,
        "cost_price": 0,
        "sale_price": 650,        # precio x1
        "retail_price": 650,      # precio suelto = mismo x1
        "stock": 0,
        "min_stock": 0,
        "is_active": True,
        "is_combo": False,
        "margin_percent": 0,
    },
    {
        "name": "Hamburguesas Burmit",
        "sku": "HAM-BURM",
        "category": "Hamburguesas",
        "unit_type": "unidad",
        "package_size": 60,
        "cost_price": 0,
        "sale_price": 800,
        "retail_price": 800,
        "stock": 0,
        "min_stock": 0,
        "is_active": True,
        "is_combo": False,
        "margin_percent": 0,
    },
    {
        "name": "Hamburguesas Black Label",
        "sku": "HAM-BLCK",
        "category": "Hamburguesas",
        "unit_type": "unidad",
        "package_size": 60,
        "cost_price": 0,
        "sale_price": 1050,
        "retail_price": 1050,
        "stock": 0,
        "min_stock": 0,
        "is_active": True,
        "is_combo": False,
        "margin_percent": 0,
    },
    {
        "name": "Hamburguesas Swiff",
        "sku": "HAM-SWFF",
        "category": "Hamburguesas",
        "unit_type": "unidad",
        "package_size": 60,
        "cost_price": 0,
        "sale_price": 1450,
        "retail_price": 1450,
        "stock": 0,
        "min_stock": 0,
        "is_active": True,
        "is_combo": False,
        "margin_percent": 0,
    },
    {
        "name": "Hamburguesas Paty Clasica",
        "sku": "HAM-PATC",
        "category": "Hamburguesas",
        "unit_type": "unidad",
        "package_size": 60,
        "cost_price": 0,
        "sale_price": 1375,
        "retail_price": 1375,
        "stock": 0,
        "min_stock": 0,
        "is_active": True,
        "is_combo": False,
        "margin_percent": 0,
    },
    {
        "name": "Hamburguesas Paty Express",
        "sku": "HAM-PATX",
        "category": "Hamburguesas",
        "unit_type": "unidad",
        "package_size": 72,
        "cost_price": 0,
        "sale_price": 1150,
        "retail_price": 1150,
        "stock": 0,
        "min_stock": 0,
        "is_active": True,
        "is_combo": False,
        "margin_percent": 0,
    },
    {
        "name": "Hamburguesas Paladini",
        "sku": "HAM-PALD",
        "category": "Hamburguesas",
        "unit_type": "unidad",
        "package_size": 60,
        "cost_price": 0,
        "sale_price": 1450,
        "retail_price": 1450,
        "stock": 0,
        "min_stock": 0,
        "is_active": True,
        "is_combo": False,
        "margin_percent": 0,
    },
]

db: Session = SessionLocal()
try:
    for p in productos:
        # Verificar si ya existe
        existing = db.query(Product).filter(Product.sku == p["sku"]).first()
        if existing:
            print(f"Ya existe: {p['name']} — omitido")
            continue
        product = Product(
            name=p["name"],
            sku=p["sku"],
            category=p["category"],
            unit_type=p["unit_type"],
            package_size=p["package_size"],
            cost_price=p["cost_price"],
            sale_price=p["sale_price"],
            retail_price=p["retail_price"],
            stock=p["stock"],
            min_stock=p["min_stock"],
            is_active=p["is_active"],
            is_combo=p["is_combo"],
            margin_percent=p["margin_percent"],
        )
        db.add(product)
        print(f"Agregado: {p['name']}")
    db.commit()
    print("\nListo! Todos los productos cargados.")
finally:
    db.close()
