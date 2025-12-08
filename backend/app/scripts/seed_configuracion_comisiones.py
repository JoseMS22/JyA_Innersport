# scripts/seed_configuracion_comisiones.py
"""
Script para insertar configuración inicial de comisiones
"""
from datetime import datetime
from decimal import Decimal
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import SessionLocal
from app.models.configuracion_comision import ConfiguracionComision


def seed_configuracion():
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("🔧 CONFIGURACIÓN DE COMISIONES")
        print("=" * 70)
        
        # Verificar si ya existen configuraciones
        existing = db.query(ConfiguracionComision).count()
        if existing > 0:
            print(f"⚠️  Ya existen {existing} configuraciones. Limpiando...")
            db.query(ConfiguracionComision).delete()
            db.commit()
        
        configuraciones = [
            {
                "tipo_venta": "POS",
                "porcentaje": Decimal("3.00"),
                "monto_minimo": Decimal("0.00"),
                "activo": True,
            },
            {
                "tipo_venta": "ONLINE",
                "porcentaje": Decimal("5.00"),
                "monto_minimo": Decimal("100.00"),
                "activo": True,
            },
        ]
        
        for config_data in configuraciones:
            config = ConfiguracionComision(**config_data)
            db.add(config)
            print(f"✅ Configuración {config_data['tipo_venta']}: {config_data['porcentaje']}%")
        
        db.commit()
        
        print("\n" + "=" * 70)
        print("✅ Configuración de comisiones insertada correctamente")
        print("=" * 70)
        
        # Mostrar resumen
        configs = db.query(ConfiguracionComision).all()
        print("\n📋 RESUMEN DE CONFIGURACIONES:")
        for c in configs:
            print(f"   • {c.tipo_venta}: {c.porcentaje}% (Mínimo: ${c.monto_minimo})")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_configuracion()