from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.database.session import Base, engine
from app.api.v1.router import api_router

# Importar todos los modelos para que SQLAlchemy los registre antes de crear tablas
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas al iniciar (equivale a un migrate simple)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Sistema de gestión comercial: inventario, POS, finanzas y cierre de caja.",
    lifespan=lifespan,
)

app.include_router(api_router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}
