from fastapi import APIRouter, Depends

from app.api.v1.endpoints import products, sales, finances, settings, combos
from app.api.v1.endpoints.auth import router as auth_router, get_current_user

# Router principal
api_router = APIRouter(prefix="/api/v1")

# Autenticación (público — no requiere token)
api_router.include_router(auth_router)

# Rutas protegidas (requieren token Bearer)
protected = APIRouter(dependencies=[Depends(get_current_user)])
protected.include_router(products.router)
protected.include_router(sales.router)
protected.include_router(finances.router)
protected.include_router(settings.router)
protected.include_router(combos.router)

api_router.include_router(protected)
