"""Tests básicos del módulo de inventario y precios."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database.session import Base, get_db

# ── Base de datos en memoria para tests ────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine_test)

client = TestClient(app)

PRODUCT_PAYLOAD = {
    "name": "Coca Cola 500ml",
    "sku": "CC-500",
    "category": "Bebidas",
    "unit_type": "unidad",
    "stock": 100,
    "min_stock": 10,
    "cost_price": 500.0,
    "margin_percent": 40.0,
}


def test_create_product():
    resp = client.post("/api/v1/products/", json=PRODUCT_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["sku"] == "CC-500"
    # PVP = 500 * 1.40 = 700
    assert data["sale_price"] == 700.0


def test_duplicate_sku():
    resp = client.post("/api/v1/products/", json=PRODUCT_PAYLOAD)
    assert resp.status_code == 400


def test_update_price_recalculates_pvp():
    resp = client.patch("/api/v1/products/1/price", json={"cost_price": 600.0})
    assert resp.status_code == 200
    data = resp.json()
    # PVP = 600 * 1.40 = 840
    assert data["sale_price"] == 840.0


def test_adjust_stock():
    resp = client.post("/api/v1/products/1/stock", json={"quantity": -20})
    assert resp.status_code == 200
    assert resp.json()["stock"] == 80.0


def test_stock_insufficient():
    resp = client.post("/api/v1/products/1/stock", json={"quantity": -9999})
    assert resp.status_code == 400


def test_low_stock_alert():
    # Bajar stock hasta el mínimo
    client.post("/api/v1/products/1/stock", json={"quantity": -71})
    resp = client.get("/api/v1/products/low-stock")
    assert resp.status_code == 200
    skus = [p["sku"] for p in resp.json()]
    assert "CC-500" in skus
