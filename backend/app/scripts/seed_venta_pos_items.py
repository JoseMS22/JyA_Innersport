"""
Script para agregar items (productos) a las ventas POS existentes
"""
import random
import sys
import os
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import SessionLocal
from app.models.venta_pos import VentaPOS
from app.models.venta_pos_item import VentaPOSItem
from app.models.variante import Variante
from app.models.producto import Producto
from app.models.inventario import Inventario


def generar_items_ventas():
    """
    Genera items de productos para las ventas POS existentes que no tienen items.
    """
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("🛍️  GENERANDO ITEMS DE PRODUCTOS PARA VENTAS POS")
        print("=" * 70)
        
        # Obtener ventas sin items
        ventas_sin_items = db.query(VentaPOS).filter(
            ~VentaPOS.id.in_(
                db.query(VentaPOSItem.venta_pos_id).distinct()
            )
        ).all()
        
        print(f"\n📦 Ventas sin items encontradas: {len(ventas_sin_items)}")
        
        if not ventas_sin_items:
            print("✅ Todas las ventas ya tienen items.")
            return
        
        # Obtener variantes con stock disponible
        variantes_disponibles = db.query(
            Variante.id,
            Variante.producto_id,
            Variante.precio_actual,  # ✅ CORREGIDO
            Producto.nombre
        ).join(
            Producto, Variante.producto_id == Producto.id
        ).join(
            Inventario, Variante.id == Inventario.variante_id
        ).filter(
            Inventario.cantidad > 0,
            Producto.activo == True
        ).all()
        
        print(f"🏷️  Variantes disponibles: {len(variantes_disponibles)}")
        
        if not variantes_disponibles:
            print("❌ No hay variantes con stock para asignar a las ventas.")
            return
        
        items_creados = 0
        ventas_procesadas = 0
        
        print("\n🔄 Procesando ventas...")
        
        for venta in ventas_sin_items:
            # Número aleatorio de items por venta (1-5)
            num_items = random.randint(1, 5)
            
            # Seleccionar variantes aleatorias
            variantes_venta = random.sample(
                variantes_disponibles,
                min(num_items, len(variantes_disponibles))
            )
            
            subtotal_calculado = Decimal("0")
            
            for variante in variantes_venta:
                # Cantidad aleatoria (1-3 unidades por producto)
                cantidad = random.randint(1, 3)
                precio_unitario = Decimal(str(variante.precio_actual))  # ✅ CORREGIDO
                subtotal_item = precio_unitario * cantidad
                
                # Crear item
                item = VentaPOSItem(
                    venta_pos_id=venta.id,
                    variante_id=variante.id,
                    producto_id=variante.producto_id,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal_item
                )
                
                db.add(item)
                subtotal_calculado += subtotal_item
                items_creados += 1
            
            # Actualizar totales de la venta para que coincidan con los items
            impuesto = subtotal_calculado * Decimal("0.13")
            total = subtotal_calculado + impuesto
            
            venta.subtotal = subtotal_calculado
            venta.impuesto = impuesto
            venta.total = total
            
            ventas_procesadas += 1
            
            if ventas_procesadas % 10 == 0:
                print(f"   Procesadas: {ventas_procesadas}/{len(ventas_sin_items)}")
        
        db.commit()
        
        print(f"\n✅ {items_creados} items creados para {ventas_procesadas} ventas")
        
        # Verificar resultado
        print("\n" + "=" * 70)
        print("📊 VERIFICACIÓN FINAL")
        print("=" * 70)
        
        from sqlalchemy import func
        
        resultado = db.query(
            func.count(VentaPOS.id).label("total_ventas"),
            func.count(VentaPOSItem.id).label("total_items")
        ).outerjoin(
            VentaPOSItem, VentaPOS.id == VentaPOSItem.venta_pos_id
        ).first()
        
        print(f"🛒 Total ventas: {resultado.total_ventas}")
        print(f"📦 Total items: {resultado.total_items}")
        
        # Productos más vendidos
        print("\n🏆 TOP 5 PRODUCTOS MÁS VENDIDOS:")
        
        top_productos = db.query(
            Producto.nombre,
            func.sum(VentaPOSItem.cantidad).label("cantidad_vendida"),
            func.sum(VentaPOSItem.subtotal).label("monto_total")
        ).join(
            VentaPOSItem, Producto.id == VentaPOSItem.producto_id
        ).group_by(
            Producto.nombre
        ).order_by(
            func.sum(VentaPOSItem.cantidad).desc()
        ).limit(5).all()
        
        for i, producto in enumerate(top_productos, 1):
            print(f"   {i}. {producto.nombre}")
            print(f"      Cantidad: {producto.cantidad_vendida} unidades")
            print(f"      Monto: ₡{producto.monto_total:,.2f}")
        
        print("\n" + "=" * 70)
        print("✅ ITEMS GENERADOS CORRECTAMENTE")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    generar_items_ventas()