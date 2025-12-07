# backend/app/schemas/rma.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.rma import RMAEstado, RMATipo

# --- Schemas para Items ---
class RMAItemBase(BaseModel):
    pedido_item_id: Optional[int] = None
    venta_pos_item_id: Optional[int] = None
    cantidad: int

class RMAItemCreate(RMAItemBase):
    pass

class RMAItemResponse(RMAItemBase):
    id: int
    rma_id: int
    
    class Config:
        from_attributes = True

# --- Schemas para RMA ---
class RMACreate(BaseModel):
    pedido_id: Optional[int] = None
    venta_pos_id: Optional[int] = None
    tipo: RMATipo
    motivo: str
    evidencia_url: Optional[str] = None
    items: List[RMAItemCreate]

class RMAUpdate(BaseModel):
    estado: Optional[RMAEstado] = None
    respuesta_admin: Optional[str] = None

class RMAResponse(BaseModel):
    id: int
    pedido_id: Optional[int]
    venta_pos_id: Optional[int]
    usuario_id: int
    estado: RMAEstado
    tipo: RMATipo
    motivo: str
    evidencia_url: Optional[str]
    respuesta_admin: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[RMAItemResponse]
    
    class Config:
        from_attributes = True