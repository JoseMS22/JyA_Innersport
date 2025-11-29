# app/models/home_hero.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db import Base


class HomeHeroConfig(Base):
    __tablename__ = "home_hero_config"

    id = Column(Integer, primary_key=True, index=True)

    # Rutas/URLs al video e imágenes (pueden ser relativas tipo /media/... o absolutas)
    video_url = Column(String(500), nullable=True)
    banner1_url = Column(String(500), nullable=True)
    banner2_url = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
