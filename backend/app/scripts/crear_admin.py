# app/scripts/crear_admin.py

from app.db import SessionLocal
from app.models.usuario import Usuario
from app.core.security import get_password_hash


def run():
    db = SessionLocal()

    try:
        correo_admin = "admin@innersport.com"
        password_admin = "Admin#12345"   # cámbialo si quieres

        # ¿Existe ya?
        existing = (
            db.query(Usuario)
            .filter(Usuario.correo == correo_admin)
            .first()
        )

        if existing:
            print(f"ℹ️ El usuario ADMIN ya existe: {correo_admin}")
            return

        # Crear admin
        admin = Usuario(
            nombre="Administrador",
            correo=correo_admin,
            contrasena_hash=get_password_hash(password_admin),
            telefono=None,
            rol="ADMIN",
            activo=True,
            email_verificado=True,  # para que pueda iniciar sesión sin pasar por proceso de verificación
        )

        db.add(admin)
        db.commit()

        print("============================================")
        print("  ✅ ADMIN CREADO EXITOSAMENTE")
        print(f"  Correo: {correo_admin}")
        print(f"  Contraseña: {password_admin}")
        print("============================================")

    finally:
        db.close()


if __name__ == "__main__":
    run()
