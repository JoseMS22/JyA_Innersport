# backend/app/services/rma_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.rma import RMA, RMAItem, RMAEstado
from app.models.pedido import Pedido
from app.models.pedido_item import PedidoItem
from app.schemas.rma import RMACreate, RMAUpdate
from app.models.usuario import Usuario
from app.services.inventario import ajustar_inventario # 🆕 Importar servicio inventario
from app.core.email import send_rma_update_email     # 🆕 Importar servicio email

def crear_solicitud_rma(db: Session, rma_in: RMACreate, usuario_actual: Usuario):
    # 1. Validar Pedido
    pedido = db.query(Pedido).filter(Pedido.id == rma_in.pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    es_dueno = pedido.cliente_id == usuario_actual.id
    es_staff = usuario_actual.rol in ["ADMIN", "VENDEDOR"]

    # 2. Validar Permisos
    if not (es_dueno or es_staff):
        raise HTTPException(status_code=403, detail="No tienes permiso sobre este pedido")

    
    # 3. Validar Estado del Pedido (Opcional: Solo permitir si fue entregado)
    if pedido.estado != "ENTREGADO":
        raise HTTPException(
            status_code=400, 
            detail="Solo se pueden solicitar devoluciones de pedidos entregados."
        )

    # 4. Crear RMA Cabecera
    db_rma = RMA(
        pedido_id=rma_in.pedido_id,
        usuario_id=usuario_actual.id, 
        tipo=rma_in.tipo,
        motivo=rma_in.motivo,
        estado=RMAEstado.SOLICITADO,
        evidencia_url=rma_in.evidencia_url
    )
    db.add(db_rma)
    db.flush() # Obtener ID antes de commit

    # 5. Crear Items y Validar Cantidades
    for item in rma_in.items:
        # Verificar que el item pertenece al pedido
        db_pedido_item = db.query(PedidoItem).filter(
            PedidoItem.id == item.pedido_item_id,
            PedidoItem.pedido_id == pedido.id
        ).first()
        
        if not db_pedido_item:
            raise HTTPException(status_code=400, detail=f"El item {item.pedido_item_id} no pertenece al pedido")
        
        if item.cantidad > db_pedido_item.cantidad:
            raise HTTPException(status_code=400, detail=f"Cantidad inválida para el item {db_pedido_item.producto_id}")

        db_item = RMAItem(
            rma_id=db_rma.id,
            pedido_item_id=item.pedido_item_id,
            cantidad=item.cantidad
        )
        db.add(db_item)
    
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
    # Si la devolución se completa exitosamente, devolvemos el stock al inventario
    if rma.estado == "completado" and estado_anterior != "completado":
        # Iteramos sobre los items devueltos
        for item in rma.items:
            # Obtenemos la variante y sucursal original del pedido
            # Nota: Asumimos que el pedido tiene sucursal_id, si no, se debe definir una lógica default
            sucursal_id = rma.pedido.sucursal_id 
            
            if sucursal_id:
                try:
                    ajustar_inventario(
                        db,
                        variante_id=item.pedido_item.variante_id,
                        sucursal_id=sucursal_id,
                        tipo="ENTRADA", # Reingreso de mercadería
                        cantidad=item.cantidad,
                        motivo=f"RMA #{rma.id} Completado - {rma.tipo}",
                        source_type="RMA"
                    )
                except Exception as e:
                    print(f"Error ajustando inventario para RMA {rma.id}: {e}")
                    # No detenemos el proceso, pero logueamos el error

    db.commit()
    db.refresh(rma)
    
    # 3. Notificar al Cliente (RF42)
    # Solo si el estado cambió
    if rma.estado != estado_anterior:
        if rma.usuario and rma.usuario.correo:
            send_rma_update_email(
                to_email=rma.usuario.correo,
                rma_id=rma.id,
                estado=rma.estado,
                respuesta_admin=rma.respuesta_admin
            )
            
    return rma