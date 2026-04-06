from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.combo import ComboItem
from app.models.product import Product
from app.schemas.combo import ComboItemCreate, ComboItemResponse

router = APIRouter(prefix="/products", tags=["Combos"])


@router.get("/{product_id}/combo-items", response_model=list[ComboItemResponse])
def get_combo_items(product_id: int, db: Session = Depends(get_db)):
    rows = db.scalars(select(ComboItem).where(ComboItem.combo_product_id == product_id)).all()
    result = []
    for row in rows:
        ingredient = db.get(Product, row.ingredient_product_id)
        result.append(ComboItemResponse(
            id=row.id,
            combo_product_id=row.combo_product_id,
            ingredient_product_id=row.ingredient_product_id,
            quantity=float(row.quantity),
            ingredient_name=ingredient.name if ingredient else "Desconocido",
        ))
    return result


@router.post("/{product_id}/combo-items", response_model=ComboItemResponse, status_code=status.HTTP_201_CREATED)
def add_combo_item(product_id: int, data: ComboItemCreate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    ingredient = db.get(Product, data.ingredient_product_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

    item = ComboItem(
        combo_product_id=product_id,
        ingredient_product_id=data.ingredient_product_id,
        quantity=data.quantity,
    )
    db.add(item)
    product.is_combo = True
    db.commit()
    db.refresh(item)
    return ComboItemResponse(
        id=item.id,
        combo_product_id=item.combo_product_id,
        ingredient_product_id=item.ingredient_product_id,
        quantity=float(item.quantity),
        ingredient_name=ingredient.name,
    )


@router.delete("/{product_id}/combo-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_combo_item(product_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.get(ComboItem, item_id)
    if not item or item.combo_product_id != product_id:
        raise HTTPException(status_code=404, detail="Ingrediente de combo no encontrado")
    db.delete(item)
    db.flush()
    # Si no quedan ingredientes, quitar flag is_combo
    remaining = db.scalars(select(ComboItem).where(ComboItem.combo_product_id == product_id)).all()
    if not remaining:
        product = db.get(Product, product_id)
        if product:
            product.is_combo = False
    db.commit()
