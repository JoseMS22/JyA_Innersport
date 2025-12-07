# scripts/seed_ventas_comisiones.py
"""
Script para generar ventas POS y calcular comisiones automáticamente
"""
from datetime import datetime, timedelta
from decimal import Decimal
import random
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import SessionLocal
from app.models.venta_pos import VentaPOS
from app.models.pago_pos import PagoPOS
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.configuracion_comision import ConfiguracionComision
from app.models.comision_vendedor import ComisionVendedor


def seed_ventas_y_comisiones():
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("💰 GENERANDO VENTAS POS Y COMISIONES")
        print("=" * 70)
        
        # Obtener vendedores
        vendedores = db.query(Usuario).filter(Usuario.rol == "VENDEDOR").all()
        if not vendedores:
            print("❌ No hay vendedores. Ejecuta primero el script de usuarios.")
            return
        
        print(f"👥 Vendedores encontrados: {len(vendedores)}")
        for v in vendedores:
            print(f"   • {v.nombre}")
        
        # Obtener sucursales
        sucursales = db.query(Sucursal).all()
        if not sucursales:
            print("❌ No hay sucursales.")
            return
        
        print(f"🏪 Sucursales encontradas: {len(sucursales)}")
        
        # Obtener configuración POS
        config_pos = db.query(ConfiguracionComision).filter(
            ConfiguracionComision.tipo_venta == "POS",
            ConfiguracionComision.activo == True
        ).first()
        
        if not config_pos:
            print("❌ No existe configuración para ventas POS.")
            return
        
        print(f"⚙️  Comisión POS: {config_pos.porcentaje}%")
        
        # Limpiar ventas y comisiones anteriores
        print("\n🧹 Limpiando datos anteriores...")
        db.query(ComisionVendedor).delete()
        db.query(PagoPOS).delete()
        db.query(VentaPOS).delete()
        db.commit()
        
        # Generar ventas de los últimos 30 días
        ventas_creadas = 0
        comisiones_creadas = 0
        pagos_creados = 0
        
        print("\n💳 Generando ventas...")
        
        for dia in range(30):
            fecha = datetime.now() - timedelta(days=dia)
            
            # 2-5 ventas por día
            num_ventas = random.randint(2, 5)
            
            for _ in range(num_ventas):
                vendedor = random.choice(vendedores)
                sucursal = random.choice(sucursales)
                
                # Monto aleatorio entre 50 y 500
                monto = Decimal(str(random.randint(50, 500)))
                subtotal = monto / Decimal("1.13")
                impuesto = monto - subtotal
                metodo = random.choice(["EFECTIVO", "TARJETA", "TRANSFERENCIA"])
                
                # Crear la venta (fecha_creacion se asigna automáticamente)
                venta = VentaPOS(
                    sucursal_id=sucursal.id,
                    vendedor_id=vendedor.id,
                    total=monto,
                    subtotal=subtotal,
                    impuesto=impuesto,
                    descuento_puntos=Decimal("0"),
                    puntos_ganados=0,
                    estado="PAGADO",
                    cancelado=False,
                )
                db.add(venta)
                db.flush()
                
                # Actualizar fecha_creacion manualmente para backdate
                venta.fecha_creacion = fecha
                venta.fecha_actualizacion = fecha
                
                # Crear el pago asociado
                pago = PagoPOS(
                    venta_pos_id=venta.id,
                    metodo=metodo,
                    monto=monto,
                    referencia=f"REF-{venta.id}-{random.randint(1000, 9999)}",
                    estado="APROBADO",
                )
                db.add(pago)
                db.flush()
                
                # Actualizar fecha del pago también
                pago.fecha = fecha
                
                # Calcular comisión
                monto_comision = (monto * config_pos.porcentaje) / Decimal("100")
                
                comision = ComisionVendedor(
                    vendedor_id=vendedor.id,
                    venta_pos_id=venta.id,
                    monto_venta=monto,
                    porcentaje_aplicado=config_pos.porcentaje,
                    monto_comision=monto_comision,
                    tipo_venta="POS",
                    estado="PENDIENTE",
                    fecha_venta=fecha
                )
                db.add(comision)
                
                ventas_creadas += 1
                comisiones_creadas += 1
                pagos_creados += 1
        
        db.commit()
        
        print(f"\n✅ {ventas_creadas} ventas creadas")
        print(f"✅ {pagos_creados} pagos registrados")
        print(f"✅ {comisiones_creadas} comisiones calculadas")
        
        # Resumen por vendedor
        print("\n" + "=" * 70)
        print("📊 RESUMEN POR VENDEDOR")
        print("=" * 70)
        
        from sqlalchemy import func
        
        for vendedor in vendedores:
            total_ventas = db.query(VentaPOS).filter(
                VentaPOS.vendedor_id == vendedor.id
            ).count()
            
            total_comisiones = db.query(ComisionVendedor).filter(
                ComisionVendedor.vendedor_id == vendedor.id
            ).count()
            
            monto_total = db.query(func.sum(ComisionVendedor.monto_comision)).filter(
                ComisionVendedor.vendedor_id == vendedor.id
            ).scalar() or Decimal("0")
            
            print(f"\n👤 {vendedor.nombre}")
            print(f"   Ventas: {total_ventas}")
            print(f"   Comisiones: {total_comisiones}")
            print(f"   Total comisiones: ${monto_total:.2f}")
        
        print("\n" + "=" * 70)
        print("✅ DATOS GENERADOS CORRECTAMENTE")
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
    seed_ventas_y_comisiones()