from sqlalchemy.orm import Session

from app.models.settings import Setting
from app.schemas.settings import SettingsResponse, SettingsUpdate

DEFAULTS = {
    "business_name": "Alta Fiesta",
    "business_subtitle": "Sistema de Gestión",
    "currency": "ARS",
    "debit_surcharge_percent": "4.0",
}


class SettingsService:

    @staticmethod
    def seed_defaults(db: Session) -> None:
        """Inserta los valores por defecto si no existen."""
        for key, value in DEFAULTS.items():
            if not db.get(Setting, key):
                db.add(Setting(key=key, value=value))
        db.commit()

    @staticmethod
    def get_all(db: Session) -> SettingsResponse:
        rows = {s.key: s.value for s in db.query(Setting).all()}
        return SettingsResponse(
            business_name=rows.get("business_name", DEFAULTS["business_name"]),
            business_subtitle=rows.get("business_subtitle", DEFAULTS["business_subtitle"]),
            currency=rows.get("currency", DEFAULTS["currency"]),
            debit_surcharge_percent=float(rows.get("debit_surcharge_percent", DEFAULTS["debit_surcharge_percent"])),
        )

    @staticmethod
    def update(db: Session, data: SettingsUpdate) -> SettingsResponse:
        for key, value in data.model_dump(exclude_none=True).items():
            row = db.get(Setting, key)
            if row:
                row.value = value
            else:
                db.add(Setting(key=key, value=value))
        db.commit()
        return SettingsService.get_all(db)
