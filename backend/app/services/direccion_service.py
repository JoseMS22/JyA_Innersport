# backend/app/services/direccion_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional

from app.models.direccion import Direccion
from app.models.usuario import Usuario
from app.schemas.direccion import DireccionCreate, DireccionUpdate


def obtener_direcciones_usuario(
    db: Session,
    usuario_id: int,
    solo_activas: bool = True
) -> List[Direccion]:
    """
    Obtiene todas las direcciones de un usuario.
    
    Args:
        db: Sesión de base de datos
        usuario_id: ID del usuario
        solo_activas: Si True, solo devuelve direcciones activas
    
    Returns:
        Lista de direcciones ordenadas por predeterminada y fecha de creación
    """
    query = db.query(Direccion).filter(Direccion.usuario_id == usuario_id)
    
    if solo_activas:
        query = query.filter(Direccion.activa.is_(True))
    
    return query.order_by(
        Direccion.predeterminada.desc(),
        Direccion.created_at.desc()
    ).all()


def obtener_direccion_por_id(
    db: Session,
    direccion_id: int,
    usuario_id: int
) -> Optional[Direccion]:
    """
    Obtiene una dirección específica, verificando que pertenezca al usuario.
    
    Args:
        db: Sesión de base de datos
        direccion_id: ID de la dirección
        usuario_id: ID del usuario (para verificar propiedad)
    
    Returns:
        Dirección si existe y pertenece al usuario, None en caso contrario
    """
    return db.query(Direccion).filter(
        Direccion.id == direccion_id,
        Direccion.usuario_id == usuario_id,
        Direccion.activa.is_(True)
    ).first()


def crear_direccion(
    db: Session,
    usuario_id: int,
    data: DireccionCreate
) -> Direccion:
    """
    Crea una nueva dirección para el usuario.
    
    Lógica:
    - Si es la primera dirección del usuario, se marca automáticamente como predeterminada
    - Si se marca como predeterminada, quita el flag de las demás direcciones
    
    Args:
        db: Sesión de base de datos
        usuario_id: ID del usuario
        data: Datos de la nueva dirección
    
    Returns:
        Dirección creada
    """
    # Si es predeterminada, quitar flag de las demás direcciones
    if data.predeterminada:
        db.query(Direccion).filter(
            Direccion.usuario_id == usuario_id
        ).update({"predeterminada": False})
    
    # Contar direcciones activas del usuario
    count = db.query(Direccion).filter(
        Direccion.usuario_id == usuario_id,
        Direccion.activa.is_(True)
    ).count()
    
    # Crear nueva dirección
    nueva_direccion = Direccion(
        usuario_id=usuario_id,
        nombre=data.nombre,
        pais=data.pais,
        provincia=data.provincia,
        canton=data.canton,
        distrito=data.distrito,
        detalle=data.detalle,
        codigo_postal=data.codigo_postal,
        telefono=data.telefono,
        referencia=data.referencia,
        # Si es la primera dirección, hacerla predeterminada automáticamente
        predeterminada=data.predeterminada if count > 0 else True,
        activa=True
    )
    
    db.add(nueva_direccion)
    db.commit()
    db.refresh(nueva_direccion)
    
    return nueva_direccion


def actualizar_direccion(
    db: Session,
    direccion_id: int,
    usuario_id: int,
    data: DireccionUpdate
) -> Direccion:
    """
    Actualiza una dirección existente.
    
    Args:
        db: Sesión de base de datos
        direccion_id: ID de la dirección a actualizar
        usuario_id: ID del usuario (para verificar propiedad)
        data: Datos a actualizar
    
    Returns:
        Dirección actualizada
    
    Raises:
        HTTPException: Si la dirección no existe o no pertenece al usuario
    """
    direccion = obtener_direccion_por_id(db, direccion_id, usuario_id)
    
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada"
        )
    
    # Si se marca como predeterminada, quitar flag de las demás
    if data.predeterminada:
        db.query(Direccion).filter(
            Direccion.usuario_id == usuario_id,
            Direccion.id != direccion_id
        ).update({"predeterminada": False})
    
    # Actualizar campos proporcionados
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(direccion, key, value)
    
    db.commit()
    db.refresh(direccion)
    
    return direccion


def marcar_como_predeterminada(
    db: Session,
    direccion_id: int,
    usuario_id: int
) -> Direccion:
    """
    Marca una dirección como predeterminada.
    
    Las demás direcciones del usuario dejan de ser predeterminadas automáticamente.
    
    Args:
        db: Sesión de base de datos
        direccion_id: ID de la dirección a marcar
        usuario_id: ID del usuario (para verificar propiedad)
    
    Returns:
        Dirección actualizada
    
    Raises:
        HTTPException: Si la dirección no existe o no pertenece al usuario
    """
    direccion = obtener_direccion_por_id(db, direccion_id, usuario_id)
    
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada"
        )
    
    # Quitar flag de las demás
    db.query(Direccion).filter(
        Direccion.usuario_id == usuario_id,
        Direccion.id != direccion_id
    ).update({"predeterminada": False})
    
    # Marcar esta como predeterminada
    direccion.predeterminada = True
    
    db.commit()
    db.refresh(direccion)
    
    return direccion


def eliminar_direccion(
    db: Session,
    direccion_id: int,
    usuario_id: int
) -> None:
    """
    Elimina (desactiva) una dirección.
    
    Usa soft delete: la dirección se marca como inactiva pero no se elimina físicamente.
    Si era la predeterminada, marca otra dirección como predeterminada automáticamente.
    
    Args:
        db: Sesión de base de datos
        direccion_id: ID de la dirección a eliminar
        usuario_id: ID del usuario (para verificar propiedad)
    
    Raises:
        HTTPException: Si la dirección no existe o no pertenece al usuario
    """
    direccion = obtener_direccion_por_id(db, direccion_id, usuario_id)
    
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada"
        )
    
    era_predeterminada = direccion.predeterminada
    
    # Soft delete
    direccion.activa = False
    direccion.predeterminada = False
    
    db.commit()
    
    # Si era predeterminada, marcar otra como predeterminada
    if era_predeterminada:
        otra_direccion = db.query(Direccion).filter(
            Direccion.usuario_id == usuario_id,
            Direccion.activa.is_(True)
        ).first()
        
        if otra_direccion:
            otra_direccion.predeterminada = True
            db.commit()


def obtener_direccion_predeterminada(
    db: Session,
    usuario_id: int
) -> Optional[Direccion]:
    """
    Obtiene la dirección predeterminada del usuario.
    
    Args:
        db: Sesión de base de datos
        usuario_id: ID del usuario
    
    Returns:
        Dirección predeterminada si existe, None en caso contrario
    """
    return db.query(Direccion).filter(
        Direccion.usuario_id == usuario_id,
        Direccion.predeterminada.is_(True),
        Direccion.activa.is_(True)
    ).first()


def validar_direccion_completa(direccion: Direccion) -> bool:
    """
    Valida que una dirección tenga todos los campos obligatorios completos.
    
    Args:
        direccion: Dirección a validar
    
    Returns:
        True si la dirección está completa, False en caso contrario
    """
    campos_obligatorios = [
        direccion.provincia,
        direccion.canton,
        direccion.distrito,
        direccion.detalle
    ]
    
    return all(campo and campo.strip() for campo in campos_obligatorios)


def contar_direcciones_usuario(
    db: Session,
    usuario_id: int,
    solo_activas: bool = True
) -> int:
    """
    Cuenta el número de direcciones de un usuario.
    
    Args:
        db: Sesión de base de datos
        usuario_id: ID del usuario
        solo_activas: Si True, solo cuenta direcciones activas
    
    Returns:
        Número de direcciones
    """
    query = db.query(Direccion).filter(Direccion.usuario_id == usuario_id)
    
    if solo_activas:
        query = query.filter(Direccion.activa.is_(True))
    
    return query.count()