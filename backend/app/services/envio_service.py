# backend/app/services/envio_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta, date

from app.models.metodo_envio import MetodoEnvio
from app.models.direccion import Direccion
from app.schemas.envio import CostoEnvioCalculado


# Distancias aproximadas desde San José (km) - simplificado
DISTANCIAS_PROVINCIAS = {
    "San José": 0,
    "Alajuela": 20,
    "Cartago": 22,
    "Heredia": 11,
    "Guanacaste": 215,
    "Puntarenas": 117,
    "Limón": 161,
}


def obtener_metodos_envio_disponibles(
    db: Session,
    provincia: str
) -> List[MetodoEnvio]:
    """
    Obtiene los métodos de envío disponibles para una provincia.
    """
    metodos = db.query(MetodoEnvio).filter(
        MetodoEnvio.activo.is_(True)
    ).all()
    
    disponibles = []
    
    for metodo in metodos:
        # Si no tiene restricciones de provincia, está disponible
        if not metodo.provincias_disponibles:
            disponibles.append(metodo)
            continue
        
        # Si la provincia está en la lista, está disponible
        if provincia in metodo.provincias_disponibles:
            disponibles.append(metodo)
    
    return disponibles


def calcular_costo_envio(
    db: Session,
    direccion: Direccion,
    metodo_envio: MetodoEnvio,
    peso_kg: Decimal = Decimal("1")
) -> CostoEnvioCalculado:
    """
    Calcula el costo de envío basado en:
    - Costo base del método
    - Distancia a la provincia
    - Peso del paquete (opcional, para futuro)
    """
    costo_base = Decimal(str(metodo_envio.costo_base))
    
    # Si tiene costo por km, calcular
    if metodo_envio.costo_por_km:
        distancia = DISTANCIAS_PROVINCIAS.get(direccion.provincia, 50)
        costo_distancia = Decimal(str(metodo_envio.costo_por_km)) * Decimal(str(distancia))
        costo_total = costo_base + costo_distancia
    else:
        costo_total = costo_base
    
    # Calcular fechas estimadas
    hoy = date.today()
    fecha_min = hoy + timedelta(days=metodo_envio.dias_entrega_min)
    fecha_max = hoy + timedelta(days=metodo_envio.dias_entrega_max)
    
    return CostoEnvioCalculado(
        metodo_envio_id=metodo_envio.id,
        metodo_nombre=metodo_envio.nombre,
        costo=costo_total,
        dias_entrega_min=metodo_envio.dias_entrega_min,
        dias_entrega_max=metodo_envio.dias_entrega_max,
        fecha_estimada_min=fecha_min,
        fecha_estimada_max=fecha_max,
        descripcion=metodo_envio.descripcion
    )


def calcular_opciones_envio(
    db: Session,
    direccion_id: int,
    usuario_id: int,
    peso_kg: Decimal = Decimal("1"),
    metodo_envio_id: Optional[int] = None
) -> List[CostoEnvioCalculado]:
    """
    Calcula las opciones de envío disponibles para una dirección.
    
    Si se proporciona metodo_envio_id, devuelve solo ese método.
    Si no, devuelve todos los métodos disponibles para la provincia.
    """
    # Verificar que la dirección pertenezca al usuario
    direccion = db.query(Direccion).filter(
        Direccion.id == direccion_id,
        Direccion.usuario_id == usuario_id,
        Direccion.activa.is_(True)
    ).first()
    
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada"
        )
    
    # Si se especifica un método, usar solo ese
    if metodo_envio_id:
        metodo = db.query(MetodoEnvio).filter(
            MetodoEnvio.id == metodo_envio_id,
            MetodoEnvio.activo.is_(True)
        ).first()
        
        if not metodo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Método de envío no encontrado"
            )
        
        # Verificar disponibilidad
        if metodo.provincias_disponibles and direccion.provincia not in metodo.provincias_disponibles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Este método de envío no está disponible para {direccion.provincia}"
            )
        
        return [calcular_costo_envio(db, direccion, metodo, peso_kg)]
    
    # Obtener todos los métodos disponibles
    metodos = obtener_metodos_envio_disponibles(db, direccion.provincia)
    
    if not metodos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay métodos de envío disponibles para {direccion.provincia}"
        )
    
    # Calcular costo para cada método
    opciones = []
    for metodo in metodos:
        opcion = calcular_costo_envio(db, direccion, metodo, peso_kg)
        opciones.append(opcion)
    
    # Ordenar por costo
    opciones.sort(key=lambda x: x.costo)
    
    return opciones