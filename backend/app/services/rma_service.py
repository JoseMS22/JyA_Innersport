# backend/app/services/rma_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.rma import RMA, RMAItem, RMAEstado
from app.models.pedido import Pedido
from app.models.pedido_item import PedidoItem
from app.models.venta_pos import VentaPOS
# 🔧 CORRECCIÓN: Usar VentaPOSItem (POS en mayúsculas)
from app.models.venta_pos_item import VentaPOSItem 
from app.models.usuario import Usuario
from app.schemas.rma import RMACreate, RMAUpdate
from app.services.inventario import ajustar_inventario
from app.core.email import send_rma_update_email

def crear_solicitud_rma(db: Session, rma_in: RMACreate, usuario_actual: Usuario):
    
    # === CASO 1: PEDIDO WEB ===
    if rma_in.pedido_id:
        pedido = db.query(Pedido).filter(Pedido.id == rma_in.pedido_id).first()
        if not pedido: raise HTTPException(404, detail="Pedido no encontrado")
        
        if pedido.cliente_id != usuario_actual.id and usuario_actual.rol not in ["ADMIN", "VENDEDOR"]:
            raise HTTPException(403, detail="No tienes permiso")
            
        if pedido.estado != "ENTREGADO":
             raise HTTPException(400, detail="El pedido no está entregado")

        db_rma = RMA(
            pedido_id=rma_in.pedido_id,
            usuario_id=usuario_actual.id,
            tipo=rma_in.tipo,
            motivo=rma_in.motivo,
            estado=RMAEstado.SOLICITADO,
            evidencia_url=rma_in.evidencia_url
        )
        db.add(db_rma)
        db.flush()

        for item in rma_in.items:
            p_item = db.query(PedidoItem).get(item.pedido_item_id)
            if not p_item or p_item.pedido_id != pedido.id:
                raise HTTPException(400, detail="Item inválido")
            db.add(RMAItem(rma_id=db_rma.id, pedido_item_id=item.pedido_item_id, cantidad=item.cantidad))

    # === CASO 2: VENTA POS ===
    elif rma_in.venta_pos_id:
        venta = db.query(VentaPOS).filter(VentaPOS.id == rma_in.venta_pos_id).first()
        if not venta: raise HTTPException(404, detail="Venta POS no encontrada")
        
        if usuario_actual.rol not in ["ADMIN", "VENDEDOR"]:
             raise HTTPException(403, detail="Solo personal autorizado puede gestionar POS")

        db_rma = RMA(
            venta_pos_id=rma_in.venta_pos_id,
            usuario_id=usuario_actual.id,
            tipo=rma_in.tipo,
            motivo=rma_in.motivo,
            estado=RMAEstado.SOLICITADO,
            evidencia_url=rma_in.evidencia_url
        )
        db.add(db_rma)
        db.flush()

        for item in rma_in.items:
            if not item.venta_pos_item_id:
                raise HTTPException(400, detail="Falta ID del item POS")
            
            # 🔧 CORRECCIÓN: Usar VentaPOSItem aquí también
            v_item = db.query(VentaPOSItem).get(item.venta_pos_item_id)
            
            if not v_item or v_item.venta_pos_id != venta.id:
                raise HTTPException(400, detail="Item POS inválido")
            db.add(RMAItem(rma_id=db_rma.id, venta_pos_item_id=item.venta_pos_item_id, cantidad=item.cantidad))

    else:
        raise HTTPException(400, detail="Debe especificar pedido_id o venta_pos_id")
    
    db.commit()
    db.refresh(db_rma)
    return db_rma

def listar_rmas(db: Session, user_id: int = None, admin_mode: bool = False):
    query = db.query(RMA)
    if not admin_mode and user_id:
        query = query.filter(RMA.usuario_id == user_id)
    return query.order_by(RMA.created_at.desc()).all()

def obtener_rma(db: Session, rma_id: int):
    return db.query(RMA).filter(RMA.id == rma_id).first()

def gestionar_rma_admin(db: Session, rma_id: int, rma_update: RMAUpdate):
    rma = obtener_rma(db, rma_id)
    if not rma:
        raise HTTPException(status_code=404, detail="Solicitud RMA no encontrada")
    
    estado_anterior = rma.estado
    
    # 1. Actualizar Datos
    if rma_update.estado:
        rma.estado = rma_update.estado
    
    if rma_update.respuesta_admin is not None:
        rma.respuesta_admin = rma_update.respuesta_admin

    # 2. Lógica de Inventario (RF43)
    if rma.estado == "completado" and estado_anterior != "completado":
        for item in rma.items:
            sucursal_id = None
            if rma.pedido:
                 sucursal_id = rma.pedido.sucursal_id
            elif rma.venta_pos:
                 sucursal_id = rma.venta_pos.sucursal_id

            variante_id = None
            if item.pedido_item:
                variante_id = item.pedido_item.variante_id
            elif item.venta_pos_item:
                variante_id = item.venta_pos_item.variante_id
            
            if sucursal_id and variante_id:
                try:
                    ajustar_inventario(
                        db,
                        variante_id=variante_id,
                        sucursal_id=sucursal_id,
                        tipo="ENTRADA",
                        cantidad=item.cantidad,
                        motivo=f"RMA #{rma.id} Completado - {rma.tipo}",
                        source_type="RMA"
                    )
                except Exception as e:
                    print(f"Error ajustando inventario para RMA {rma.id}: {e}")

    db.commit()
    db.refresh(rma)
    
    # 3. Notificar al Cliente (RF42)
    if rma.estado != estado_anterior:
        if rma.usuario and rma.usuario.correo:
            send_rma_update_email(
                to_email=rma.usuario.correo,
                rma_id=rma.id,
                estado=rma.estado,
                respuesta_admin=rma.respuesta_admin
            )
            
    return rma