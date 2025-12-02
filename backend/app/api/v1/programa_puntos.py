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
    ConfirmarCompraIn,
    ConfirmarCompraOut,
)
from app.services.programa_puntos_service import (
    obtener_config_activa,
    actualizar_config,
    obtener_o_crear_saldo,
    calcular_limite_redencion,
    registrar_puntos_por_compra,
    registrar_movimiento_puntos,
)
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


# ============================
# CONFIRMAR COMPRA (CLIENTE)
# ============================

@router.post("/me/confirmar-compra", response_model=ConfirmarCompraOut)
def confirmar_compra_con_puntos(
    data: ConfirmarCompraIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    Endpoint pensado para usarse desde el checkout:

    - Recibe el total bruto de la compra (antes de puntos).
    - Opcionalmente recibe cuántos puntos quiere usar el cliente.
    - Valida contra las reglas del programa (mínimo, % máximo, tope por compra).
    - Registra movimiento de redención (redeem) si aplica.
    - Registra los puntos GANADOS por el monto efectivamente pagado.
    - Devuelve totales y saldo final de puntos.

    La pasarela de pago real no se implementa aquí: se asume pago APROBADO.
    """
    config = obtener_config_activa(db)

    if not config.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El programa de puntos está inactivo.",
        )

    if data.total_compra <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El total de la compra debe ser mayor que cero.",
        )

    total_bruto = Decimal(data.total_compra)

    # -----------------------------
    # 1) Aplicar puntos (redención)
    # -----------------------------
    descuento_aplicado = Decimal("0")
    puntos_redimidos = 0

    valor_por_punto = Decimal(config.valor_colon_por_punto or 0)

    if data.puntos_a_usar > 0 and valor_por_punto > 0:
        # Calculamos el límite permitido según configuración
        limite = calcular_limite_redencion(
            db,
            usuario_id=usuario.id,
            total_compra_colones=total_bruto,
        )

        if limite["puede_usar_puntos"]:
            # Descuento máximo que se puede aplicar según reglas
            max_descuento = limite["descuento_maximo_colones"]

            # Descuento que el usuario está pidiendo con esos puntos
            descuento_solicitado = (
                Decimal(data.puntos_a_usar) * valor_por_punto
            )

            # Tomamos el mínimo entre lo solicitado y el máximo permitido
            descuento_aplicado = min(descuento_solicitado, max_descuento)

            if descuento_aplicado > 0:
                # Puntos que realmente vamos a descontar
                puntos_redimidos = int(
                    (descuento_aplicado / valor_por_punto).to_integral_value(
                        rounding="ROUND_FLOOR"
                    )
                )

                if puntos_redimidos > 0:
                    # Registrar movimiento NEGATIVO (redeem)
                    registrar_movimiento_puntos(
                        db,
                        usuario_id=usuario.id,
                        tipo="redeem",
                        puntos=puntos_redimidos,
                        descripcion=f"Redención de puntos en compra de ₡{int(total_bruto)}",
                        order_id=data.order_id,
                    )

    # Total después de aplicar puntos (no dejar que sea negativo)
    total_despues_puntos = total_bruto - descuento_aplicado
    if total_despues_puntos < 0:
        total_despues_puntos = Decimal("0")

    # --------------------------------
    # 2) Otorgar puntos por la compra
    # --------------------------------
    # Normalmente se otorgan puntos solo sobre lo efectivamente pagado
    puntos_ganados = registrar_puntos_por_compra(
        db,
        usuario_id=usuario.id,
        total_compra_colones=total_despues_puntos,
        order_id=data.order_id,
    )

    # Saldo final de puntos
    saldo_final = obtener_o_crear_saldo(db, usuario.id)

    return ConfirmarCompraOut(
        total_bruto=total_bruto,
        descuento_aplicado=descuento_aplicado,
        total_final=total_despues_puntos,
        puntos_ganados=puntos_ganados,
        puntos_redimidos=puntos_redimidos,
        saldo_puntos_final=saldo_final.saldo,
    )