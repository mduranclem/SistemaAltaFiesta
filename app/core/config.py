from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Sistema Alta Fiesta"
    app_version: str = "1.0.0"
    debug: bool = True
    database_url: str = "sqlite:///./altafiesta.db"

    class Config:
        env_file = ".env"


settings = Settings()
