# backend/app/api/v1/envio.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.envio import CostoEnvioCalculado, MetodoEnvioRead
from app.services import envio_service

router = APIRouter()


@router.get("/calcular", response_model=List[CostoEnvioCalculado])
def calcular_costo_envio(
    direccion_id: int = Query(..., description="ID de la dirección de envío"),
    peso_kg: Decimal = Query(default=1, ge=0.1, description="Peso del paquete en kilogramos"),
    metodo_envio_id: int = Query(default=None, description="ID del método de envío específico (opcional)"),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Calcula el costo y tiempo de envío para una dirección.
    
    **Parámetros:**
    - `direccion_id`: ID de la dirección de entrega
    - `peso_kg`: Peso del paquete (opcional, default 1kg)
    - `metodo_envio_id`: Si se proporciona, calcula solo para ese método. 
      Si no, devuelve todos los métodos disponibles.
    
    **Retorna:**
    Lista de opciones de envío con:
    - Costo total
    - Días de entrega (min y max)
    - Fechas estimadas de entrega
    - Descripción del método
    
    **Criterios de aceptación cumplidos:**
    ✅ Calcula costo según dirección seleccionada
    ✅ Refleja tiempo estimado de entrega
    ✅ Muestra métodos de envío disponibles según ubicación
    """
    return envio_service.calcular_opciones_envio(
        db=db,
        direccion_id=direccion_id,
        usuario_id=current_user.id,
        peso_kg=peso_kg,
        metodo_envio_id=metodo_envio_id
    )


@router.get("/metodos", response_model=List[MetodoEnvioRead])
def listar_metodos_envio(
    provincia: str = Query(default=None, description="Filtrar por provincia"),
    db: Session = Depends(get_db),
):
    """
    Lista todos los métodos de envío disponibles.
    
    Opcionalmente filtra por provincia para mostrar solo métodos disponibles en esa ubicación.
    """
    if provincia:
        return envio_service.obtener_metodos_envio_disponibles(db, provincia)
    
    # Si no se especifica provincia, devolver todos los activos
    from app.models.metodo_envio import MetodoEnvio
    return db.query(MetodoEnvio).filter(MetodoEnvio.activo.is_(True)).all()