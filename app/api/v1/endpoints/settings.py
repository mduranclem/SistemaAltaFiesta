from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["Configuración"])


@router.get("/", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return SettingsService.get_all(db)


@router.put("/", response_model=SettingsResponse)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    return SettingsService.update(db, data)
