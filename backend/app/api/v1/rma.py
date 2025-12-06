# backend/app/api/v1/rma.py
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from app.core.config import settings
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import uuid

from app.db import get_db
from app.core.security import get_current_user, get_current_admin
from app.schemas.rma import RMACreate, RMAUpdate, RMAResponse
from app.services import rma_service

router = APIRouter()

# --- Rutas Cliente (RF41) ---

@router.post("/", response_model=RMAResponse, status_code=status.HTTP_201_CREATED)
def solicitar_rma(
    rma_in: RMACreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Cliente crea una solicitud de devolución/cambio."""
    return rma_service.crear_solicitud_rma(db, rma_in, current_user.id)

@router.get("/mis-solicitudes", response_model=List[RMAResponse])
def ver_mis_rmas(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Cliente ve su historial de RMAs."""
    return rma_service.listar_rmas(db, user_id=current_user.id, admin_mode=False)

# --- Rutas Admin (RF42, RF43) ---

@router.get("/admin", response_model=List[RMAResponse])
def listar_todos_rmas(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Admin ve todas las solicitudes."""
    return rma_service.listar_rmas(db, admin_mode=True)

@router.put("/admin/{rma_id}", response_model=RMAResponse)
def gestionar_rma(
    rma_id: int,
    rma_update: RMAUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Admin aprueba, rechaza o completa un RMA."""
    return rma_service.gestionar_rma_admin(db, rma_id, rma_update)

# 🆕 NUEVA RUTA PARA SUBIR IMAGEN
@router.post("/upload-evidence", response_model=dict)
def upload_rma_evidence(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="El archivo debe ser una imagen")

    # USAR LA MISMA RUTA ABSOLUTA QUE MAIN.PY
    upload_dir = os.path.join(settings.MEDIA_ROOT, "rma_evidence")
    os.makedirs(upload_dir, exist_ok=True)

    extension = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"{settings.BACKEND_URL or ''}/media/rma_evidence/{filename}"
    
    return {"url": url}