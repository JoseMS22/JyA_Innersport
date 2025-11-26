# app/api/v1/home_hero.py
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
)
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.home_hero import (
    HomeHeroAdmin,
    HomeHeroPublic,
    HomeHeroUpdate,
)
from app.services import home_hero
from app.core.security import get_current_admin_user
from app.core.storage import save_local_file

from app.models.home_hero import HomeHeroConfig  # solo para type hints

router = APIRouter(prefix="/home-hero", tags=["home-hero"])


# =========================
# Helpers
# =========================

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/webm",
    "video/ogg",
}


def _ensure_config(db: Session) -> HomeHeroConfig:
    """
    Asegura que exista un único registro de configuración.
    Si no existe, crea uno vacío.
    """
    config = home_hero.get_singleton_config(db)
    if config is None:
        config = home_hero.upsert_config(
            db,
            HomeHeroUpdate(video_url=None, banner1_url=None, banner2_url=None),
        )
    return config


# 🔓 Público: lo usa la página principal
@router.get("/public", response_model=HomeHeroPublic)
def get_home_hero_public(
    db: Session = Depends(get_db),
):
    config = home_hero.get_singleton_config(db)
    if config is None:
        # si no hay nada, devolvemos todo null
        return HomeHeroPublic(video_url=None, banner1_url=None, banner2_url=None)
    return config


# 🔒 Admin: ver config con metadata
@router.get("", response_model=HomeHeroAdmin)
def get_home_hero_admin(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    config = home_hero.get_singleton_config(db)
    if config is None:
        # si no existe, creamos una vacía para no romper el front admin
        empty = home_hero.upsert_config(
            db, HomeHeroUpdate(video_url=None, banner1_url=None, banner2_url=None)
        )
        return empty
    return config


# 🔒 Admin: crear/actualizar (upsert) vía JSON (por si quieres usar URLs manuales)
@router.put("", response_model=HomeHeroAdmin, status_code=status.HTTP_200_OK)
def update_home_hero(
    payload: HomeHeroUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    config = home_hero.upsert_config(db, payload)
    return config


# 🔒 Admin: eliminar (opcional)
@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_home_hero(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    home_hero.delete_config(db)
    return


# =========================
#  Upload de VIDEO
# =========================

@router.post(
    "/upload-video",
    response_model=HomeHeroAdmin,
    status_code=status.HTTP_200_OK,
)
async def upload_home_hero_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Tipo de archivo no permitido: {file.content_type}. "
                "Solo se permiten videos MP4, WEBM u OGG."
            ),
        )

    config = _ensure_config(db)

    # Guardar archivo en /app/media y obtener URL pública
    url_publica = save_local_file(file)

    config.video_url = url_publica
    db.add(config)
    db.commit()
    db.refresh(config)

    return config


# =========================
#  Upload de BANNER 1
# =========================

@router.post(
    "/upload-banner1",
    response_model=HomeHeroAdmin,
    status_code=status.HTTP_200_OK,
)
async def upload_home_hero_banner1(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Tipo de archivo no permitido: {file.content_type}. "
                "Solo se permiten imágenes JPEG, PNG, WEBP o GIF."
            ),
        )

    config = _ensure_config(db)

    url_publica = save_local_file(file)

    config.banner1_url = url_publica
    db.add(config)
    db.commit()
    db.refresh(config)

    return config


# =========================
#  Upload de BANNER 2
# =========================

@router.post(
    "/upload-banner2",
    response_model=HomeHeroAdmin,
    status_code=status.HTTP_200_OK,
)
async def upload_home_hero_banner2(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Tipo de archivo no permitido: {file.content_type}. "
                "Solo se permiten imágenes JPEG, PNG, WEBP o GIF."
            ),
        )

    config = _ensure_config(db)

    url_publica = save_local_file(file)

    config.banner2_url = url_publica
    db.add(config)
    db.commit()
    db.refresh(config)

    return config
