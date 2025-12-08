# backend/scripts/seed_alertas_inventario.py
"""
Script para generar datos de inventario con alertas.
Crea inventarios con diferentes niveles de stock para probar el sistema de alertas.
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.inventario import Inventario
from app.models.variante import Variante
from app.models.producto import Producto
from app.models.sucursal import Sucursal
import random


def crear_alertas_inventario(db: Session):
    """
    Crea registros de inventario con diferentes niveles de stock
    para probar el sistema de alertas.
    """
    print("🚀 Iniciando generación de alertas de inventario...")
    
    # Obtener todas las sucursales
    sucursales = db.query(Sucursal).all()
    if not sucursales:
        print("❌ No hay sucursales en la base de datos")
        return
    
    print(f"✅ Encontradas {len(sucursales)} sucursales")
    
    # Obtener todas las variantes con sus productos
    variantes = db.query(Variante).join(Producto).filter(
        Producto.activo == True
    ).all()
    
    if not variantes:
        print("❌ No hay variantes en la base de datos")
        return
    
    print(f"✅ Encontradas {len(variantes)} variantes")
    
    # Limpiar inventarios existentes (opcional)
    print("🗑️  Limpiando inventarios anteriores...")
    db.query(Inventario).delete()
    db.commit()
    
    # Contadores
    criticos = 0
    bajos = 0
    medios = 0
    normales = 0
    
    # Generar inventarios con diferentes niveles
    print("\n📦 Generando inventarios con alertas...")
    
    for sucursal in sucursales:
        # Seleccionar subset aleatorio de variantes (70% de todas)
        variantes_sucursal = random.sample(
            variantes, 
            k=int(len(variantes) * 0.7)
        )
        
        for variante in variantes_sucursal:
            # Verificar si ya existe inventario
            existe = db.query(Inventario).filter(
                Inventario.variante_id == variante.id,
                Inventario.sucursal_id == sucursal.id
            ).first()
            
            if existe:
                continue
            
            # Determinar tipo de alerta (distribución realista)
            rand = random.random()
            
            if rand < 0.15:  # 15% CRÍTICO (sin stock)
                min_stock = random.randint(5, 20)
                cantidad = 0
                nivel = "CRÍTICO"
                criticos += 1
                
            elif rand < 0.35:  # 20% BAJO (< 50% del mínimo)
                min_stock = random.randint(10, 30)
                cantidad = random.randint(1, int(min_stock * 0.5))
                nivel = "BAJO"
                bajos += 1
                
            elif rand < 0.50:  # 15% MEDIO (50%-100% del mínimo)
                min_stock = random.randint(10, 30)
                cantidad = random.randint(
                    int(min_stock * 0.5), 
                    min_stock
                )
                nivel = "MEDIO"
                medios += 1
                
            else:  # 50% NORMAL (stock suficiente)
                min_stock = random.randint(10, 30)
                cantidad = random.randint(min_stock + 1, min_stock * 3)
                nivel = "NORMAL"
                normales += 1
            
            # Crear inventario
            max_stock = min_stock * 4 if random.random() > 0.3 else None
            
            inventario = Inventario(
                variante_id=variante.id,
                sucursal_id=sucursal.id,
                cantidad=cantidad,
                min_stock=min_stock,
                max_stock=max_stock
            )
            
            db.add(inventario)
            
            # Log cada 50 registros
            total = criticos + bajos + medios + normales
            if total % 50 == 0:
                print(f"  → {total} inventarios creados...")
    
    # Commit final
    db.commit()
    
    # Resumen
    total = criticos + bajos + medios + normales
    print(f"\n✅ Generación completada!")
    print(f"\n📊 RESUMEN DE ALERTAS:")
    print(f"{'='*50}")
    print(f"  🔴 CRÍTICO (sin stock):        {criticos:4d} ({criticos/total*100:5.1f}%)")
    print(f"  🟠 BAJO (< 50% mínimo):        {bajos:4d} ({bajos/total*100:5.1f}%)")
    print(f"  🟡 MEDIO (50-100% mínimo):     {medios:4d} ({medios/total*100:5.1f}%)")
    print(f"  🟢 NORMAL (stock suficiente):  {normales:4d} ({normales/total*100:5.1f}%)")
    print(f"{'='*50}")
    print(f"  TOTAL:                         {total:4d}")
    print(f"\n💡 Productos con alertas: {criticos + bajos + medios}")
    
    # Mostrar ejemplos de cada nivel
    print(f"\n🔍 EJEMPLOS DE ALERTAS:")
    print(f"{'='*50}")
    
    # CRÍTICO
    ejemplo_critico = db.query(Inventario).join(
        Variante
    ).join(
        Producto
    ).join(
        Sucursal
    ).filter(
        Inventario.cantidad == 0
    ).first()
    
    if ejemplo_critico:
        print(f"\n🔴 CRÍTICO:")
        print(f"  Producto: {ejemplo_critico.variante.producto.nombre}")
        print(f"  Variante: Talla {ejemplo_critico.variante.talla} - {ejemplo_critico.variante.color}")
        print(f"  Sucursal: {ejemplo_critico.sucursal.nombre}")
        print(f"  Stock: {ejemplo_critico.cantidad} / Mínimo: {ejemplo_critico.min_stock}")
    
    # BAJO
    ejemplo_bajo = db.query(Inventario).join(
        Variante
    ).join(
        Producto
    ).join(
        Sucursal
    ).filter(
        Inventario.cantidad > 0,
        Inventario.cantidad < Inventario.min_stock * 0.5
    ).first()
    
    if ejemplo_bajo:
        print(f"\n🟠 BAJO:")
        print(f"  Producto: {ejemplo_bajo.variante.producto.nombre}")
        print(f"  Variante: Talla {ejemplo_bajo.variante.talla} - {ejemplo_bajo.variante.color}")
        print(f"  Sucursal: {ejemplo_bajo.sucursal.nombre}")
        print(f"  Stock: {ejemplo_bajo.cantidad} / Mínimo: {ejemplo_bajo.min_stock}")
    
    # MEDIO
    ejemplo_medio = db.query(Inventario).join(
        Variante
    ).join(
        Producto
    ).join(
        Sucursal
    ).filter(
        Inventario.cantidad >= Inventario.min_stock * 0.5,
        Inventario.cantidad <= Inventario.min_stock
    ).first()
    
    if ejemplo_medio:
        print(f"\n🟡 MEDIO:")
        print(f"  Producto: {ejemplo_medio.variante.producto.nombre}")
        print(f"  Variante: Talla {ejemplo_medio.variante.talla} - {ejemplo_medio.variante.color}")
        print(f"  Sucursal: {ejemplo_medio.sucursal.nombre}")
        print(f"  Stock: {ejemplo_medio.cantidad} / Mínimo: {ejemplo_medio.min_stock}")
    
    print(f"\n{'='*50}")
    print("\n🎯 Ahora puedes probar las alertas en:")
    print("   http://localhost:3000/admin/dashboard")
    print("\n📋 Endpoints disponibles:")
    print("   GET /api/v1/dashboard/alertas-inventario")
    print("   GET /api/v1/dashboard/alertas-inventario?sucursal_id=1")
    print("   GET /api/v1/inventario?sucursal_id=1")


def verificar_alertas(db: Session):
    """
    Verifica las alertas generadas usando la misma lógica que el endpoint.
    """
    print("\n\n🔍 VERIFICANDO ALERTAS (simulando endpoint)...")
    print(f"{'='*50}")
    
    # Query similar al endpoint
    from sqlalchemy import case, and_
    
    alertas = db.query(
        Inventario.variante_id,
        Producto.nombre.label("producto_nombre"),
        Variante.talla,
        Variante.color,
        Sucursal.nombre.label("sucursal_nombre"),
        Inventario.cantidad.label("stock_actual"),
        Inventario.min_stock.label("stock_minimo"),
        case(
            (Inventario.cantidad == 0, "CRITICO"),
            (Inventario.cantidad < Inventario.min_stock * 0.5, "BAJO"),
            else_="MEDIO"
        ).label("nivel_alerta")
    ).join(
        Variante, Inventario.variante_id == Variante.id
    ).join(
        Producto, Variante.producto_id == Producto.id
    ).join(
        Sucursal, Inventario.sucursal_id == Sucursal.id
    ).filter(
        Inventario.cantidad <= Inventario.min_stock,
        Producto.activo == True
    ).order_by(
        Inventario.cantidad.asc()
    ).limit(10).all()
    
    print(f"\n📋 TOP 10 ALERTAS MÁS URGENTES:")
    print(f"{'='*50}\n")
    
    for i, alerta in enumerate(alertas, 1):
        emoji = "🔴" if alerta.nivel_alerta == "CRITICO" else "🟠" if alerta.nivel_alerta == "BAJO" else "🟡"
        print(f"{emoji} {i}. {alerta.producto_nombre}")
        print(f"   Variante: Talla {alerta.talla} - {alerta.color}")
        print(f"   Sucursal: {alerta.sucursal_nombre}")
        print(f"   Stock: {alerta.stock_actual} / Mínimo: {alerta.stock_minimo}")
        print(f"   Nivel: {alerta.nivel_alerta}\n")
    
    # Contar totales por nivel
    from sqlalchemy import func as sql_func
    
    totales = db.query(
        case(
            (Inventario.cantidad == 0, "CRITICO"),
            (Inventario.cantidad < Inventario.min_stock * 0.5, "BAJO"),
            else_="MEDIO"
        ).label("nivel"),
        sql_func.count().label("cantidad")
    ).join(
        Variante
    ).join(
        Producto
    ).filter(
        Inventario.cantidad <= Inventario.min_stock,
        Producto.activo == True
    ).group_by("nivel").all()
    
    print(f"{'='*50}")
    print(f"TOTALES POR NIVEL:")
    for nivel, cantidad in totales:
        emoji = "🔴" if nivel == "CRITICO" else "🟠" if nivel == "BAJO" else "🟡"
        print(f"  {emoji} {nivel}: {cantidad}")


if __name__ == "__main__":
    print("="*60)
    print("  GENERADOR DE ALERTAS DE INVENTARIO")
    print("="*60)
    
    db = SessionLocal()
    
    try:
        crear_alertas_inventario(db)
        verificar_alertas(db)
        
        print("\n" + "="*60)
        print("  ✅ PROCESO COMPLETADO EXITOSAMENTE")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()