import os
import secrets
import logging
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "StarMonitor"
    API_V1_STR: str = "/api"
    
    # DB configuration
    DB_HOST: str = os.getenv("DB_HOST", "192.168.100.5")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "starlink_db")
    DB_USER: str = os.getenv("DB_USER", "star_user")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "v1su@ls0ft")
    
    @property
    def DATABASE_URL(self) -> str:
        from urllib.parse import quote_plus
        escaped_password = quote_plus(self.DB_PASSWORD)
        return f"postgresql://{self.DB_USER}:{escaped_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # JWT security configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    def __init__(self, **values):
        super().__init__(**values)
        if not self.JWT_SECRET_KEY:
            logging.warning("Generating ephemeral JWT secret. Session-isolated!")
            # Use ephemeral secret if environment value is empty
            self.JWT_SECRET_KEY = secrets.token_hex(32)

settings = Settings()
