# backend/app/services/programa_puntos_service.py
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.programa_puntos import (
    ProgramaPuntosConfig,
    SaldoPuntosUsuario,
    MovimientoPuntosUsuario,
)


# =========================
# CONFIGURACIÓN (ADMIN)
# =========================

def obtener_config_activa(db: Session) -> ProgramaPuntosConfig:
    """
    Devuelve la configuración activa del programa de puntos.
    Si no existe, crea una por defecto (inactiva).
    """
    config = (
        db.query(ProgramaPuntosConfig)
        .order_by(ProgramaPuntosConfig.id.desc())
        .first()
    )

    if config is None:
        config = ProgramaPuntosConfig(
            activo=False,
            puntos_por_colon=Decimal("0"),
            valor_colon_por_punto=Decimal("0"),
            monto_minimo_para_redimir=None,
            porcentaje_max_descuento=None,
            max_descuento_por_compra_colones=None,
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return config


def actualizar_config(
    db: Session,
    *,
    activo: Optional[bool] = None,
    puntos_por_colon: Optional[Decimal] = None,
    valor_colon_por_punto: Optional[Decimal] = None,
    monto_minimo_para_redimir: Optional[Decimal] = None,
    porcentaje_max_descuento: Optional[Decimal] = None,
    max_descuento_por_compra_colones: Optional[Decimal] = None,
) -> ProgramaPuntosConfig:
    """
    Actualiza la configuración del programa de puntos.
    Se puede usar desde un endpoint de admin.
    """
    config = obtener_config_activa(db)

    if activo is not None:
        config.activo = activo
    if puntos_por_colon is not None:
        config.puntos_por_colon = puntos_por_colon
    if valor_colon_por_punto is not None:
        config.valor_colon_por_punto = valor_colon_por_punto
    if monto_minimo_para_redimir is not None:
        config.monto_minimo_para_redimir = monto_minimo_para_redimir
    if porcentaje_max_descuento is not None:
        config.porcentaje_max_descuento = porcentaje_max_descuento
    if max_descuento_por_compra_colones is not None:
        config.max_descuento_por_compra_colones = max_descuento_por_compra_colones

    db.add(config)
    db.commit()
    db.refresh(config)
    return config


# =========================
# SALDO Y MOVIMIENTOS
# =========================

def obtener_o_crear_saldo(
    db: Session,
    usuario_id: int,
) -> SaldoPuntosUsuario:
    """
    Obtiene el saldo de puntos de un usuario o lo crea en cero si no existe.
    """
    saldo = (
        db.query(SaldoPuntosUsuario)
        .filter(SaldoPuntosUsuario.usuario_id == usuario_id)
        .first()
    )
    if saldo:
        return saldo

    saldo = SaldoPuntosUsuario(usuario_id=usuario_id, saldo=0)
    db.add(saldo)
    db.commit()
    db.refresh(saldo)
    return saldo


def registrar_movimiento_puntos(
    db: Session,
    *,
    usuario_id: int,
    tipo: str,
    puntos: int,
    descripcion: Optional[str] = None,
    order_id: Optional[int] = None,
) -> SaldoPuntosUsuario:
    """
    Registra un movimiento de puntos (earn / redeem / adjust)
    y actualiza el saldo del usuario.
    """
    tipo = tipo.lower()
    if tipo not in ("earn", "redeem", "adjust"):
        raise ValueError("Tipo de movimiento inválido. Use 'earn', 'redeem' o 'adjust'.")

    saldo = obtener_o_crear_saldo(db, usuario_id)

    # Para 'earn' se espera puntos positivos,
    # para 'redeem' normalmente se envía ya en negativo,
    # pero aquí podemos normalizar:
    if tipo == "earn" and puntos < 0:
        puntos = abs(puntos)
    if tipo in ("redeem", "adjust") and puntos == 0:
        raise ValueError("Los puntos no pueden ser cero en un movimiento.")

    nuevo_saldo = saldo.saldo + puntos

    if nuevo_saldo < 0:
        raise ValueError("El movimiento dejaría el saldo de puntos en negativo.")

    movimiento = MovimientoPuntosUsuario(
        usuario_id=usuario_id,
        tipo=tipo,
        puntos=puntos,
        descripcion=descripcion,
        order_id=order_id,
    )
    db.add(movimiento)

    saldo.saldo = nuevo_saldo
    db.add(saldo)

    db.commit()
    db.refresh(saldo)
    return saldo


# =========================
# LÓGICA DE REDENCIÓN
# =========================

def calcular_limite_redencion(
    db: Session,
    *,
    usuario_id: int,
    total_compra_colones: Decimal,
) -> dict:
    """
    Calcula cuánto puede usar el usuario en esta compra,
    respetando:
      - saldo de puntos
      - porcentaje máximo (si aplica)
      - monto mínimo para redimir (si aplica)
      - 💥 máximo de descuento por compra (configurable por admin)
    Devuelve un dict con:
      - 'puede_usar_puntos': bool
      - 'descuento_maximo_colones': Decimal
      - 'puntos_necesarios_para_maximo': int
      - 'saldo_puntos': int
    """

    config = obtener_config_activa(db)

    if not config.activo:
        return {
            "puede_usar_puntos": False,
            "motivo": "El programa de puntos está inactivo.",
            "descuento_maximo_colones": Decimal("0"),
            "puntos_necesarios_para_maximo": 0,
            "saldo_puntos": 0,
        }

    # Si no hay valor del punto definido, no se puede usar
    if not config.valor_colon_por_punto or config.valor_colon_por_punto <= 0:
        return {
            "puede_usar_puntos": False,
            "motivo": "Configuración de valor del punto inválida.",
            "descuento_maximo_colones": Decimal("0"),
            "puntos_necesarios_para_maximo": 0,
            "saldo_puntos": 0,
        }

    saldo = obtener_o_crear_saldo(db, usuario_id)

    if saldo.saldo <= 0:
        return {
            "puede_usar_puntos": False,
            "motivo": "El usuario no tiene puntos disponibles.",
            "descuento_maximo_colones": Decimal("0"),
            "puntos_necesarios_para_maximo": 0,
            "saldo_puntos": saldo.saldo,
        }

    total = Decimal(total_compra_colones)

    # 1) monto mínimo para redimir
    if config.monto_minimo_para_redimir and total < config.monto_minimo_para_redimir:
        return {
            "puede_usar_puntos": False,
            "motivo": "El monto de la compra no alcanza el mínimo para usar puntos.",
            "descuento_maximo_colones": Decimal("0"),
            "puntos_necesarios_para_maximo": 0,
            "saldo_puntos": saldo.saldo,
        }

    # 2) límite por porcentaje de la compra
    if config.porcentaje_max_descuento:
        max_porcentaje = total * (config.porcentaje_max_descuento / Decimal("100"))
    else:
        max_porcentaje = total  # sin límite por porcentaje

    # 3) límite por saldo de puntos
    valor_por_punto = Decimal(config.valor_colon_por_punto)
    max_por_saldo = Decimal(saldo.saldo) * valor_por_punto

    # 4) 💥 límite absoluto por compra
    if config.max_descuento_por_compra_colones:
        max_por_compra = Decimal(config.max_descuento_por_compra_colones)
    else:
        max_por_compra = total  # sin límite extra

    # 5) descuento máximo permitido = mínimo de los 3
    descuento_maximo = min(max_porcentaje, max_por_saldo, max_por_compra)

    if descuento_maximo <= 0:
        return {
            "puede_usar_puntos": False,
            "motivo": "No se puede aplicar descuento con puntos en esta compra.",
            "descuento_maximo_colones": Decimal("0"),
            "puntos_necesarios_para_maximo": 0,
            "saldo_puntos": saldo.saldo,
        }

    # Puntos necesarios para usar ese máximo
    puntos_necesarios = int((descuento_maximo / valor_por_punto).to_integral_value(rounding="ROUND_CEILING"))

    return {
        "puede_usar_puntos": True,
        "motivo": None,
        "descuento_maximo_colones": descuento_maximo,
        "puntos_necesarios_para_maximo": puntos_necesarios,
        "saldo_puntos": saldo.saldo,
    }