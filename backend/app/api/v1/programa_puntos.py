# backend/app/api/v1/programa_puntos.py
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.usuario import Usuario
from app.models.programa_puntos import MovimientoPuntosUsuario
from app.schemas.programa_puntos import (
    ProgramaPuntosConfigOut,
    ProgramaPuntosConfigUpdate,
    SaldoPuntosOut,
    MovimientoPuntosOut,
    LimiteRedencionOut,
)
from app.services.programa_puntos_service import (
    obtener_config_activa,
    actualizar_config,
    obtener_o_crear_saldo,
    calcular_limite_redencion,
)
# ajusta este import según dónde tengas la función:
from app.core.security import get_current_user  


router = APIRouter(prefix="/puntos", tags=["Programa de puntos"])


# ================
# Helpers de admin
# ================

def require_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    # Ajusta según tu modelo (yo asumo rol = "ADMIN")
    if usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder a este recurso.",
        )
    return usuario


# ====================
# ENDPOINTS DE ADMIN
# ====================

@router.get("/config", response_model=ProgramaPuntosConfigOut)
def get_config(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    """
    Devuelve la configuración actual del programa de puntos.
    """
    config = obtener_config_activa(db)
    return config


@router.put("/config", response_model=ProgramaPuntosConfigOut)
def update_config(
    data: ProgramaPuntosConfigUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    """
    Actualiza la configuración del programa de puntos.
    Incluye el tope 'max_descuento_por_compra_colones'.
    """
    config = actualizar_config(
        db,
        activo=data.activo,
        puntos_por_colon=data.puntos_por_colon,
        valor_colon_por_punto=data.valor_colon_por_punto,
        monto_minimo_para_redimir=data.monto_minimo_para_redimir,
        porcentaje_max_descuento=data.porcentaje_max_descuento,
        max_descuento_por_compra_colones=data.max_descuento_por_compra_colones,
    )
    return config


# ====================
# ENDPOINTS DE CLIENTE
# ====================

@router.get("/me/saldo", response_model=SaldoPuntosOut)
def get_my_points(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    Devuelve el saldo de puntos del usuario actual
    y el valor aproximado en colones.
    """
    config = obtener_config_activa(db)
    saldo = obtener_o_crear_saldo(db, usuario.id)

    if not config.valor_colon_por_punto or config.valor_colon_por_punto <= 0:
        valor_aprox = Decimal("0")
    else:
        valor_aprox = Decimal(saldo.saldo) * Decimal(config.valor_colon_por_punto)

    return SaldoPuntosOut(saldo=saldo.saldo, valor_aproximado=valor_aprox)


@router.get("/me/movimientos", response_model=List[MovimientoPuntosOut])
def get_my_movements(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Devuelve los movimientos recientes de puntos del usuario actual.
    """
    movimientos = (
        db.query(MovimientoPuntosUsuario)
        .filter(MovimientoPuntosUsuario.usuario_id == usuario.id)
        .order_by(MovimientoPuntosUsuario.created_at.desc())
        .limit(limit)
        .all()
    )
    return movimientos


@router.get("/me/limite-redencion", response_model=LimiteRedencionOut)
def get_limite_redencion(
    total_compra: Decimal = Query(..., gt=0),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    Devuelve cuánto puede usar el usuario en puntos para una compra
    con un total bruto 'total_compra'.
    Respeta:
      - saldo de puntos
      - porcentaje máximo configurado
      - monto mínimo para redimir
      - tope max_descuento_por_compra_colones
    """
    data = calcular_limite_redencion(
        db,
        usuario_id=usuario.id,
        total_compra_colones=total_compra,
    )

    return LimiteRedencionOut(
        puede_usar_puntos=data["puede_usar_puntos"],
        motivo=data["motivo"],
        descuento_maximo_colones=data["descuento_maximo_colones"],
        puntos_necesarios_para_maximo=data["puntos_necesarios_para_maximo"],
        saldo_puntos=data["saldo_puntos"],
    )