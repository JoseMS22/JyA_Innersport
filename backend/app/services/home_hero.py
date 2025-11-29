# backend/app/services/home_hero.py
from sqlalchemy.orm import Session
from typing import Optional

from app.models.home_hero import HomeHeroConfig
from app.schemas.home_hero import HomeHeroUpdate


def get_singleton_config(db: Session) -> Optional[HomeHeroConfig]:
    return db.query(HomeHeroConfig).order_by(HomeHeroConfig.id.asc()).first()


def upsert_config(db: Session, data: HomeHeroUpdate) -> HomeHeroConfig:
    config = get_singleton_config(db)

    if config is None:
        config = HomeHeroConfig(
            video_url=data.video_url,
            banner1_url=data.banner1_url,
            banner2_url=data.banner2_url,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    # actualizar existente
    config.video_url = data.video_url
    config.banner1_url = data.banner1_url
    config.banner2_url = data.banner2_url
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def delete_config(db: Session) -> None:
    config = get_singleton_config(db)
    if config is None:
        return
    db.delete(config)
    db.commit()
