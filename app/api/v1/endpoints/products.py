from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductPriceUpdate, StockAdjustment,
)
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Inventario"])


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    if ProductService.get_by_sku(db, data.sku):
        raise HTTPException(status_code=400, detail=f"SKU '{data.sku}' ya existe")
    return ProductService.create(db, data)


@router.get("/", response_model=list[ProductResponse])
def list_products(
    skip: int = 0,
    limit: int = Query(100, le=500),
    active_only: bool = True,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    return ProductService.list_all(db, skip, limit, active_only, category)


@router.get("/low-stock", response_model=list[ProductResponse])
def low_stock_alert(db: Session = Depends(get_db)):
    """Devuelve productos con stock igual o menor al mínimo configurado."""
    return ProductService.list_low_stock(db)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = ProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = ProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductService.update(db, product, data)


@router.patch("/{product_id}/price", response_model=ProductResponse)
def update_price(product_id: int, data: ProductPriceUpdate, db: Session = Depends(get_db)):
    """Actualiza costo/margen de un producto y recalcula el PVP."""
    product = ProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductService.update_price(db, product, data)


@router.post("/prices/bulk-margin", status_code=status.HTTP_200_OK)
def bulk_update_margin(
    new_margin: float = Query(..., ge=0, le=1000, description="Nuevo % de margen"),
    category: str | None = Query(None, description="Filtrar por categoría (opcional)"),
    db: Session = Depends(get_db),
):
    """Actualiza el margen de ganancia de forma masiva y recalcula todos los PVP."""
    updated = ProductService.bulk_update_margin(db, new_margin, category)
    return {"message": f"{updated} productos actualizados", "new_margin": new_margin}


@router.post("/{product_id}/stock", response_model=ProductResponse)
def adjust_stock(product_id: int, data: StockAdjustment, db: Session = Depends(get_db)):
    """Ajusta el stock de un producto (positivo=entrada, negativo=salida)."""
    product = ProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    try:
        return ProductService.adjust_stock(db, product, data.quantity)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_product(product_id: int, db: Session = Depends(get_db)):
    product = ProductService.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    ProductService.deactivate(db, product)
