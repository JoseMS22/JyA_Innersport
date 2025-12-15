# backend/app/schemas/programa_puntos.py
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class ProgramaPuntosConfigBase(BaseModel):
    activo: bool = True
    puntos_por_colon: Decimal
    valor_colon_por_punto: Decimal
    monto_minimo_para_redimir: Optional[Decimal] = None
    porcentaje_max_descuento: Optional[Decimal] = None
    max_descuento_por_compra_colones: Optional[Decimal] = None


class ProgramaPuntosConfigUpdate(ProgramaPuntosConfigBase):
    pass


class ProgramaPuntosConfigOut(ProgramaPuntosConfigBase):
    id: int

    class Config:
        orm_mode = True


class SaldoPuntosOut(BaseModel):
    saldo: int
    valor_aproximado: Decimal

    class Config:
        orm_mode = True


class MovimientoPuntosOut(BaseModel):
    id: int
    tipo: str
    puntos: int
    descripcion: Optional[str] = None
    order_id: Optional[int] = None
    created_at: str

    class Config:
        orm_mode = True


class LimiteRedencionOut(BaseModel):
    puede_usar_puntos: bool
    motivo: Optional[str]
    descuento_maximo_colones: Decimal
    puntos_necesarios_para_maximo: int
    saldo_puntos: int
    valor_colon_por_punto: Decimal


# ============================
# DTOs para confirmar compra
# ============================

class ConfirmarCompraIn(BaseModel):
    subtotal: Optional[Decimal] = None        # monto sólo de productos (recomendado)
    costo_envio: Optional[Decimal] = Decimal("0")  # costo del envío
    total_compra: Optional[Decimal] = None    # por compatibilidad con clientes antiguos
    puntos_a_usar: int = 0
    order_id: Optional[int] = None


class ConfirmarCompraOut(BaseModel):
    total_bruto: Decimal
    descuento_aplicado: Decimal
    total_final: Decimal
    puntos_ganados: int
    puntos_redimidos: int
    saldo_puntos_final: int