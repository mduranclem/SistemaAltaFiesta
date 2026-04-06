from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.sale import SaleCreate, SaleResponse
from app.services.sale_service import SaleService

router = APIRouter(prefix="/sales", tags=["Punto de Venta"])


@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(data: SaleCreate, db: Session = Depends(get_db)):
    """Registra una venta y descuenta el stock automáticamente."""
    try:
        return SaleService.create_sale(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/profit")
def profit_report(
    date_from: str = Query(..., description="Fecha inicio YYYY-MM-DD"),
    date_to:   str = Query(..., description="Fecha fin YYYY-MM-DD"),
    db: Session = Depends(get_db),
) -> dict:
    """Reporte de ganancia bruta en un rango de fechas."""
    try:
        return SaleService.profit_report(db, date_from, date_to)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")


@router.get("/top-products")
def top_products(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Productos más vendidos con cantidad, ingresos y ganancia estimada."""
    return SaleService.top_products(db, days, limit)


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = SaleService.get_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return sale


@router.get("/", response_model=list[SaleResponse])
def list_sales_by_date(
    date: str = Query(..., description="Fecha en formato YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    try:
        return SaleService.list_by_date(db, date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    """Elimina una venta y restaura el stock de sus productos."""
    sale = SaleService.get_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    SaleService.delete_sale(db, sale)
