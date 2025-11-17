# backend/test_audit.py
"""
Script de prueba del sistema de auditoría.
Ejecutar con: python test_audit.py
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

def print_section(title):
    """Imprime un separador visual."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_register():
    """Prueba registro de usuario (genera auditoría)."""
    print_section("TEST 1: Registro de Usuario")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    payload = {
        "nombre": f"Usuario Test {timestamp}",
        "correo": f"test_{timestamp}@example.com",
        "telefono": "88888888",
        "password": "Test1234!",
        "confirm_password": "Test1234!",
        "provincia": "San José",
        "canton": "Central",
        "distrito": "Carmen",
        "detalle": "Calle 1, Casa 2",
        "telefono_direccion": "88888888"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=payload)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        user_data = response.json()
        print(f"\n✅ Usuario creado: {user_data['correo']}")
        return user_data
    else:
        print(f"\n❌ Error en registro")
        return None


def test_login(correo, password):
    """Prueba login de usuario (genera auditoría)."""
    print_section("TEST 2: Login de Usuario")
    
    payload = {
        "correo": correo,
        "password": password
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=payload)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Token recibido: {data['access_token'][:50]}...")
        print(f"\n✅ Login exitoso")
        
        # Extraer cookie
        cookies = response.cookies
        return cookies
    else:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print(f"\n❌ Error en login")
        return None


def test_get_me(cookies):
    """Prueba obtener datos del usuario autenticado."""
    print_section("TEST 3: Obtener Mi Perfil")
    
    response = requests.get(f"{BASE_URL}/auth/me", cookies=cookies)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print(f"\n✅ Perfil obtenido")
        return response.json()
    else:
        print(f"\n❌ Error obteniendo perfil")
        return None


def test_update_profile(cookies):
    """Prueba actualizar perfil (genera auditoría)."""
    print_section("TEST 4: Actualizar Perfil")
    
    payload = {
        "nombre": "Usuario Test Actualizado",
        "telefono": "99999999"
    }
    
    response = requests.put(f"{BASE_URL}/auth/me", json=payload, cookies=cookies)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print(f"\n✅ Perfil actualizado")
    else:
        print(f"\n❌ Error actualizando perfil")


def test_get_my_audit(cookies):
    """Prueba obtener historial de auditoría del usuario."""
    print_section("TEST 5: Obtener Mi Auditoría")
    
    response = requests.get(f"{BASE_URL}/audit/me?limit=20", cookies=cookies)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        audits = response.json()
        print(f"Total de registros: {len(audits)}")
        print("\nÚltimos registros de auditoría:")
        
        for audit in audits[:5]:  # Mostrar solo los primeros 5
            print(f"\n  - Acción: {audit['accion']}")
            print(f"    Entidad: {audit['entidad']}")
            print(f"    Fecha: {audit['fecha']}")
            print(f"    IP: {audit['ip_address']}")
            print(f"    Detalles: {audit['detalles']}")
        
        print(f"\n✅ Auditoría obtenida")
        return audits
    else:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print(f"\n❌ Error obteniendo auditoría")
        return None


def test_change_password(cookies):
    """Prueba cambio de contraseña (genera auditoría)."""
    print_section("TEST 6: Cambiar Contraseña")
    
    payload = {
        "current_password": "Test1234!",
        "new_password": "NewTest1234!",
        "confirm_password": "NewTest1234!"
    }
    
    response = requests.put(
        f"{BASE_URL}/auth/change-password",
        json=payload,
        cookies=cookies
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print(f"\n✅ Contraseña cambiada")
    else:
        print(f"\n❌ Error cambiando contraseña")


def test_logout(cookies):
    """Prueba logout (genera auditoría)."""
    print_section("TEST 7: Logout")
    
    response = requests.post(f"{BASE_URL}/auth/logout", cookies=cookies)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print(f"\n✅ Logout exitoso")
    else:
        print(f"\n❌ Error en logout")


def main():
    """Ejecuta todos los tests."""
    print("\n" + "🧪" * 30)
    print("  PRUEBAS DEL SISTEMA DE AUDITORÍA")
    print("🧪" * 30)
    
    try:
        # 1. Registrar usuario
        user = test_register()
        if not user:
            print("\n❌ No se pudo completar el registro. Abortando tests.")
            return
        
        correo = user['correo']
        
        # Nota: En un caso real, aquí necesitarías verificar el email
        # pero como es una prueba, asumimos que el usuario puede hacer login
        print("\n⚠️  NOTA: En producción necesitarías verificar el email primero")
        
        # 2. Login
        cookies = test_login(correo, "Test1234!")
        if not cookies:
            print("\n❌ No se pudo hacer login. Abortando tests.")
            return
        
        # 3. Obtener perfil
        test_get_me(cookies)
        
        # 4. Actualizar perfil
        test_update_profile(cookies)
        
        # 5. Ver auditoría
        test_get_my_audit(cookies)
        
        # 6. Cambiar contraseña
        test_change_password(cookies)
        
        # 7. Logout
        test_logout(cookies)
        
        print_section("✅ TODAS LAS PRUEBAS COMPLETADAS")
        print("\n📋 Revisa los logs en:")
        print("   - backend/logs/app.log")
        print("   - backend/logs/audit.log")
        print("\n💾 Revisa la base de datos:")
        print("   - Tabla: auditoria_usuario")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error de conexión. Asegúrate de que el servidor está corriendo.")
        print("   Ejecuta: docker-compose up -d")
    except Exception as e:
        print(f"\n❌ Error inesperado: {str(e)}")


if __name__ == "__main__":
    main()