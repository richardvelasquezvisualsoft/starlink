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
    
    # Storage configuration
    @property
    def UPLOAD_DIR(self) -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        upload_path = os.getenv("AVATAR_STORAGE_PATH", os.path.join(base_dir, "uploads"))
        os.makedirs(upload_path, exist_ok=True)
        return upload_path

    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_IMAGE_MIME_TYPES: set = {"image/jpeg", "image/png", "image/webp"}
    MAX_AVATAR_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB

    def __init__(self, **values):
        super().__init__(**values)
        if not self.JWT_SECRET_KEY:
            logging.warning("Generating ephemeral JWT secret. Session-isolated!")
            # Use ephemeral secret if environment value is empty
            self.JWT_SECRET_KEY = secrets.token_hex(32)

settings = Settings()

