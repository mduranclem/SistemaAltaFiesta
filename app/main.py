from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import Base, engine, SessionLocal
from app.api.v1.router import api_router

# Importar todos los modelos para que SQLAlchemy los registre antes de crear tablas
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas al iniciar
    Base.metadata.create_all(bind=engine)

    # Migraciones manuales para columnas nuevas (SQLite no soporta ALTER automático)
    from sqlalchemy import text
    with engine.connect() as conn:
        for col_sql in [
            "ALTER TABLE products ADD COLUMN is_combo BOOLEAN NOT NULL DEFAULT 0",
        ]:
            try:
                conn.execute(text(col_sql))
                conn.commit()
            except Exception:
                pass  # columna ya existe

    # Seed: usuario admin por defecto + configuración inicial
    db = SessionLocal()
    try:
        from app.services.auth_service import AuthService
        from app.services.settings_service import SettingsService
        AuthService.create_default_user(db)
        SettingsService.seed_defaults(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Sistema de gestión comercial: inventario, POS, finanzas y cierre de caja.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}
