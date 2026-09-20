"""Application configuration loaded from environment variables."""
import os
import json
from pathlib import Path
from functools import lru_cache
from typing import Any, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", str(BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "CustomerIQ API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./customeriq.db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Clerk Auth
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_JWT_ISSUER: str = ""  # e.g. https://deep-newt-8798.clerk.accounts.dev
    CLERK_ISSUER: str = ""
    CLERK_JWKS_URL: str = ""

    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://customeriq.vercel.app",
    ]

    # Upload
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_DIR: str = "uploads"

    # ML
    ML_MIN_CUSTOMERS_FOR_CLUSTERING: int = 10

    # Pagination
    DEFAULT_PAGE_SIZE: int = 25
    MAX_PAGE_SIZE: int = 100

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, (list, tuple, set)):
            return [str(item).strip() for item in v if str(item).strip()]
        return [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://customeriq.vercel.app",
        ]

    @field_validator("CLERK_JWT_ISSUER", mode="before")
    @classmethod
    def parse_clerk_jwt_issuer(cls, v: Any) -> str:
        if v:
            return str(v).strip()
        return os.environ.get("CLERK_ISSUER", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

