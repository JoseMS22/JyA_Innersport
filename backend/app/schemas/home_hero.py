from datetime import datetime
from typing import Optional

from pydantic import BaseModel, AnyHttpUrl


class HomeHeroBase(BaseModel):
    video_url: Optional[str] = None
    banner1_url: Optional[str] = None
    banner2_url: Optional[str] = None


class HomeHeroUpdate(HomeHeroBase):
    """Body que recibimos desde admin (PUT)."""
    pass


class HomeHeroAdmin(HomeHeroBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class HomeHeroPublic(HomeHeroBase):
    """Lo que ve la página pública (sin metadata)."""

    class Config:
        orm_mode = True
