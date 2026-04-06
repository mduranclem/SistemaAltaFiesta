from pydantic import BaseModel


class SettingsResponse(BaseModel):
    business_name: str
    business_subtitle: str
    currency: str
    debit_surcharge_percent: float


class SettingsUpdate(BaseModel):
    business_name: str | None = None
    business_subtitle: str | None = None
    currency: str | None = None
    debit_surcharge_percent: float | None = None
