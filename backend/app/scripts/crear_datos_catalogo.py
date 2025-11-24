# backend/scripts/crear_datos_catalogo.py
"""
Script para crear datos de prueba del catálogo.
Ejecutar con: docker exec -it tienda_backend python -m scripts.crear_datos_catalogo
O desde dentro del contenedor: python -m scripts.crear_datos_catalogo
"""

import sys
import os

# Añadir el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decimal import Decimal
from app.db import SessionLocal
from app.models.categoria import Categoria
from app.models.producto import Producto
from app.models.variante import Variante
from app.models.media import Media
from app.models.sucursal import Sucursal
from app.models.inventario import Inventario


def crear_datos_prueba():
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("🚀 CREANDO DATOS DE PRUEBA PARA EL CATÁLOGO")
        print("=" * 60)
        
        # ===========================
        # 1️⃣ CREAR CATEGORÍAS
        # ===========================
        print("\n📁 Creando categorías...")
        
        categorias_data = [
            {"nombre": "Running", "descripcion": "Ropa y calzado para correr"},
            {"nombre": "Training", "descripcion": "Equipamiento para entrenamiento"},
            {"nombre": "Casual", "descripcion": "Ropa deportiva casual"},
            {"nombre": "Yoga", "descripcion": "Ropa para yoga y pilates"},
        ]
        
        categorias = {}
        for cat_data in categorias_data:
            cat_existente = db.query(Categoria).filter(
                Categoria.nombre == cat_data["nombre"]
            ).first()
            
            if cat_existente:
                categorias[cat_data["nombre"]] = cat_existente
                print(f"  ✓ Categoría '{cat_data['nombre']}' ya existe")
            else:
                cat = Categoria(**cat_data, activo=True)
                db.add(cat)
                db.flush()
                categorias[cat_data["nombre"]] = cat
                print(f"  ✓ Categoría '{cat_data['nombre']}' creada")
        
        db.commit()
        
        # ===========================
        # 2️⃣ CREAR SUCURSAL
        # ===========================
        print("\n🏪 Creando sucursal...")
        
        sucursal = db.query(Sucursal).first()
        
        if not sucursal:
            sucursal = Sucursal(
                nombre="Tienda Principal",
                direccion="San José, Costa Rica",
                telefono="2222-3333",
                activo=True
            )
            db.add(sucursal)
            db.commit()
            db.refresh(sucursal)
            print("  ✓ Sucursal 'Tienda Principal' creada")
        else:
            print(f"  ✓ Usando sucursal existente: '{sucursal.nombre}'")
        
        # ===========================
        # 3️⃣ CREAR PRODUCTOS CON VARIANTES
        # ===========================
        print("\n👕 Creando productos y variantes...")
        
        productos_data = [
            {
                "nombre": "Tenis Nike Air Zoom Pegasus",
                "descripcion": "Calzado de running con amortiguación reactiva",
                "categorias": ["Running"],
                "variantes": [
                    {"sku": "NIKE-PEG-001-BLK-42", "marca": "Nike", "color": "Negro", "talla": "42", "precio": 85000, "stock": 5},
                    {"sku": "NIKE-PEG-002-BLK-40", "marca": "Nike", "color": "Negro", "talla": "40", "precio": 85000, "stock": 8},
                    {"sku": "NIKE-PEG-003-WHT-42", "marca": "Nike", "color": "Blanco", "talla": "42", "precio": 85000, "stock": 3},
                ],
                "imagen": "https://via.placeholder.com/400x400/000000/FFFFFF?text=Nike+Pegasus"
            },
            {
                "nombre": "Sudadera Adidas Essentials",
                "descripcion": "Sudadera con capucha ideal para entrenamiento",
                "categorias": ["Training", "Casual"],
                "variantes": [
                    {"sku": "ADI-ESS-001-GRY-M", "marca": "Adidas", "color": "Gris", "talla": "M", "precio": 45000, "stock": 10},
                    {"sku": "ADI-ESS-002-GRY-L", "marca": "Adidas", "color": "Gris", "talla": "L", "precio": 45000, "stock": 7},
                    {"sku": "ADI-ESS-003-BLK-M", "marca": "Adidas", "color": "Negro", "talla": "M", "precio": 45000, "stock": 12},
                ],
                "imagen": "https://via.placeholder.com/400x400/333333/FFFFFF?text=Adidas+Essentials"
            },
            {
                "nombre": "Leggings Under Armour HeatGear",
                "descripcion": "Mallas de compresión para alto rendimiento",
                "categorias": ["Training", "Running"],
                "variantes": [
                    {"sku": "UA-HG-001-BLK-S", "marca": "Under Armour", "color": "Negro", "talla": "S", "precio": 38000, "stock": 15},
                    {"sku": "UA-HG-002-BLK-M", "marca": "Under Armour", "color": "Negro", "talla": "M", "precio": 38000, "stock": 20},
                    {"sku": "UA-HG-003-BLU-M", "marca": "Under Armour", "color": "Azul", "talla": "M", "precio": 38000, "stock": 8},
                ],
                "imagen": "https://via.placeholder.com/400x400/0066CC/FFFFFF?text=UA+HeatGear"
            },
            {
                "nombre": "Camiseta Puma Dri-FIT",
                "descripcion": "Camiseta técnica de secado rápido",
                "categorias": ["Running", "Training"],
                "variantes": [
                    {"sku": "PUM-DF-001-WHT-S", "marca": "Puma", "color": "Blanco", "talla": "S", "precio": 25000, "stock": 25},
                    {"sku": "PUM-DF-002-WHT-M", "marca": "Puma", "color": "Blanco", "talla": "M", "precio": 25000, "stock": 30},
                    {"sku": "PUM-DF-003-RED-M", "marca": "Puma", "color": "Rojo", "talla": "M", "precio": 25000, "stock": 18},
                ],
                "imagen": "https://via.placeholder.com/400x400/FF0000/FFFFFF?text=Puma+Dri-FIT"
            },
            {
                "nombre": "Short Reebok CrossFit",
                "descripcion": "Short ligero para entrenamiento funcional",
                "categorias": ["Training"],
                "variantes": [
                    {"sku": "RBK-CF-001-BLK-M", "marca": "Reebok", "color": "Negro", "talla": "M", "precio": 32000, "stock": 12},
                    {"sku": "RBK-CF-002-BLK-L", "marca": "Reebok", "color": "Negro", "talla": "L", "precio": 32000, "stock": 10},
                    {"sku": "RBK-CF-003-GRY-M", "marca": "Reebok", "color": "Gris", "talla": "M", "precio": 32000, "stock": 8},
                ],
                "imagen": "https://via.placeholder.com/400x400/666666/FFFFFF?text=Reebok+CrossFit"
            },
            {
                "nombre": "Top Deportivo Nike Pro",
                "descripcion": "Top de compresión para mujer",
                "categorias": ["Training", "Yoga"],
                "variantes": [
                    {"sku": "NIKE-PRO-001-BLK-S", "marca": "Nike", "color": "Negro", "talla": "S", "precio": 35000, "stock": 15},
                    {"sku": "NIKE-PRO-002-BLK-M", "marca": "Nike", "color": "Negro", "talla": "M", "precio": 35000, "stock": 18},
                    {"sku": "NIKE-PRO-003-PNK-M", "marca": "Nike", "color": "Rosa", "talla": "M", "precio": 35000, "stock": 10},
                ],
                "imagen": "https://via.placeholder.com/400x400/FF69B4/FFFFFF?text=Nike+Pro"
            },
            {
                "nombre": "Pants Adidas Tiro",
                "descripcion": "Pantalón de fútbol clásico",
                "categorias": ["Training", "Casual"],
                "variantes": [
                    {"sku": "ADI-TIR-001-BLK-M", "marca": "Adidas", "color": "Negro", "talla": "M", "precio": 48000, "stock": 14},
                    {"sku": "ADI-TIR-002-BLK-L", "marca": "Adidas", "color": "Negro", "talla": "L", "precio": 48000, "stock": 11},
                    {"sku": "ADI-TIR-003-BLU-L", "marca": "Adidas", "color": "Azul", "talla": "L", "precio": 48000, "stock": 9},
                ],
                "imagen": "https://via.placeholder.com/400x400/0033CC/FFFFFF?text=Adidas+Tiro"
            },
            {
                "nombre": "Chaqueta Puma Windbreaker",
                "descripcion": "Chaqueta cortaviento ligera",
                "categorias": ["Running", "Casual"],
                "variantes": [
                    {"sku": "PUM-WB-001-BLK-M", "marca": "Puma", "color": "Negro", "talla": "M", "precio": 55000, "stock": 7},
                    {"sku": "PUM-WB-002-BLK-L", "marca": "Puma", "color": "Negro", "talla": "L", "precio": 55000, "stock": 5},
                    {"sku": "PUM-WB-003-YLW-M", "marca": "Puma", "color": "Amarillo", "talla": "M", "precio": 55000, "stock": 6},
                ],
                "imagen": "https://via.placeholder.com/400x400/FFFF00/000000?text=Puma+Windbreaker"
            },
            {
                "nombre": "Calcetas Under Armour Performance",
                "descripcion": "Pack de 3 pares de calcetas deportivas",
                "categorias": ["Running", "Training"],
                "variantes": [
                    {"sku": "UA-SOC-001-WHT-UNI", "marca": "Under Armour", "color": "Blanco", "talla": "Única", "precio": 15000, "stock": 40},
                    {"sku": "UA-SOC-002-BLK-UNI", "marca": "Under Armour", "color": "Negro", "talla": "Única", "precio": 15000, "stock": 35},
                ],
                "imagen": "https://via.placeholder.com/400x400/CCCCCC/000000?text=UA+Socks"
            },
            {
                "nombre": "Mat Yoga Reebok Premium",
                "descripcion": "Tapete de yoga antideslizante 6mm",
                "categorias": ["Yoga"],
                "variantes": [
                    {"sku": "RBK-MAT-001-PUR-UNI", "marca": "Reebok", "color": "Morado", "talla": "Única", "precio": 28000, "stock": 10},
                    {"sku": "RBK-MAT-002-BLU-UNI", "marca": "Reebok", "color": "Azul", "talla": "Única", "precio": 28000, "stock": 8},
                ],
                "imagen": "https://via.placeholder.com/400x400/9933FF/FFFFFF?text=Reebok+Mat"
            },
            {
                "nombre": "Gorra Nike Dri-FIT",
                "descripcion": "Gorra deportiva ajustable",
                "categorias": ["Running", "Casual"],
                "variantes": [
                    {"sku": "NIKE-CAP-001-BLK-UNI", "marca": "Nike", "color": "Negro", "talla": "Única", "precio": 18000, "stock": 22},
                    {"sku": "NIKE-CAP-002-WHT-UNI", "marca": "Nike", "color": "Blanco", "talla": "Única", "precio": 18000, "stock": 20},
                    {"sku": "NIKE-CAP-003-RED-UNI", "marca": "Nike", "color": "Rojo", "talla": "Única", "precio": 18000, "stock": 15},
                ],
                "imagen": "https://via.placeholder.com/400x400/FF0000/FFFFFF?text=Nike+Cap"
            },
            {
                "nombre": "Mochila Adidas Classic",
                "descripcion": "Mochila deportiva 25L",
                "categorias": ["Casual"],
                "variantes": [
                    {"sku": "ADI-BAG-001-BLK-UNI", "marca": "Adidas", "color": "Negro", "talla": "Única", "precio": 42000, "stock": 8},
                    {"sku": "ADI-BAG-002-BLU-UNI", "marca": "Adidas", "color": "Azul", "talla": "Única", "precio": 42000, "stock": 6},
                ],
                "imagen": "https://via.placeholder.com/400x400/000066/FFFFFF?text=Adidas+Bag"
            },
        ]
        
        productos_creados = 0
        variantes_creadas = 0
        
        for prod_data in productos_data:
            # Verificar si el producto ya existe
            prod_existente = db.query(Producto).filter(
                Producto.nombre == prod_data["nombre"]
            ).first()
            
            if prod_existente:
                print(f"  ⚠️  Producto '{prod_data['nombre']}' ya existe, saltando...")
                continue
            
            # Crear producto
            producto = Producto(
                nombre=prod_data["nombre"],
                descripcion=prod_data["descripcion"],
                activo=True
            )
            
            # Asociar categorías
            for cat_nombre in prod_data["categorias"]:
                producto.categorias.append(categorias[cat_nombre])
            
            db.add(producto)
            db.flush()
            
            # Crear imagen
            media = Media(
                producto_id=producto.id,
                url=prod_data["imagen"],
                tipo="IMAGEN",
                orden=0
            )
            db.add(media)
            
            # Crear variantes con inventario
            for var_data in prod_data["variantes"]:
                variante = Variante(
                    producto_id=producto.id,
                    sku=var_data["sku"],
                    marca=var_data["marca"],
                    color=var_data["color"],
                    talla=var_data["talla"],
                    precio_actual=Decimal(str(var_data["precio"])),
                    activo=True
                )
                db.add(variante)
                db.flush()
                
                # Crear inventario
                inventario = Inventario(
                    variante_id=variante.id,
                    sucursal_id=sucursal.id,
                    cantidad=var_data["stock"],
                    min_stock=2,
                    max_stock=50
                )
                db.add(inventario)
                variantes_creadas += 1
            
            productos_creados += 1
            print(f"  ✓ Producto '{prod_data['nombre']}' creado con {len(prod_data['variantes'])} variantes")
        
        db.commit()
        
        # ===========================
        # 4️⃣ RESUMEN
        # ===========================
        print("\n" + "=" * 60)
        print("✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE")
        print("=" * 60)
        print(f"📁 Categorías: {len(categorias)}")
        print(f"🏪 Sucursales: 1")
        print(f"👕 Productos nuevos: {productos_creados}")
        print(f"🏷️  Variantes nuevas: {variantes_creadas}")
        print("=" * 60)
        print("\n🎉 ¡Listo! Ahora puedes probar el catálogo en:")
        print("   👉 http://localhost:3000/catalogo")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    crear_datos_prueba()