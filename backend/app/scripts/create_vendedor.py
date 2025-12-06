# app/scripts/crear_vendedor.py

from app.db import SessionLocal
from app.models.usuario import Usuario
from app.models.usuario_sucursal import UsuarioSucursal
from app.models.sucursal import Sucursal
from app.core.security import get_password_hash


def run():
  db = SessionLocal()

  # ✅ Ajusta estos datos a lo que quieras
  correo_vendedor = "vendedor1@innersport.com"
  password_vendedor = "Vendedor#12345"   # cámbialo luego en producción
  nombre_vendedor = "Vendedor San José"
  sucursales_destino = [1]  # IDs de sucursales a las que lo vas a asignar

  try:
    # 1) ¿Ya existe un usuario con ese correo?
    existing = (
      db.query(Usuario)
      .filter(Usuario.correo == correo_vendedor)
      .first()
    )

    if existing:
      print("============================================")
      print(" ℹ️  Ya existe un usuario con ese correo")
      print(f"  ID: {existing.id}")
      print(f"  Correo: {existing.correo}")
      print(f"  Rol actual: {existing.rol}")
      print("============================================")

      vendedor = existing

      # Si no es VENDEDOR, puedes decidir si lo actualizas o no
      if vendedor.rol != "VENDEDOR":
        print(f" 🔄 Actualizando rol de {vendedor.rol} a VENDEDOR")
        vendedor.rol = "VENDEDOR"
        vendedor.activo = True

    else:
      # 2) Crear el usuario con rol VENDEDOR
      vendedor = Usuario(
        nombre=nombre_vendedor,
        correo=correo_vendedor,
        contrasena_hash=get_password_hash(password_vendedor),
        telefono=None,
        rol="VENDEDOR",
        activo=True,
        email_verificado=True,  # que pueda entrar sin verificar email
      )
      db.add(vendedor)
      db.flush()  # para tener vendedor.id

      print("============================================")
      print("  ✅ VENDEDOR CREADO")
      print(f"  ID: {vendedor.id}")
      print(f"  Correo: {correo_vendedor}")
      print(f"  Contraseña: {password_vendedor}")
      print("============================================")

    # 3) Asignar sucursales (si existen)
    for sid in sucursales_destino:
      suc = db.query(Sucursal).filter(Sucursal.id == sid).one_or_none()
      if not suc:
        print(f" ⚠️  La sucursal con id={sid} no existe. Se omite.")
        continue

      # Verificar si ya existe esa asignación
      ya_asignado = (
        db.query(UsuarioSucursal)
        .filter(
          UsuarioSucursal.usuario_id == vendedor.id,
          UsuarioSucursal.sucursal_id == sid,
        )
        .one_or_none()
      )

      if ya_asignado:
        print(
          f" ℹ️  El vendedor ya está asignado a sucursal {sid} ({suc.nombre})."
        )
        continue

      asignacion = UsuarioSucursal(
        usuario_id=vendedor.id,
        sucursal_id=sid,
        puede_vender=True,
      )
      db.add(asignacion)
      print(
        f"  ✅ Asignado a sucursal {sid} ({suc.nombre}) con puede_vender=True"
      )

    db.commit()
    print("============================================")
    print("  ✅ Cambios guardados en la base de datos.")
    print("============================================")

  except Exception as e:
    db.rollback()
    print("============================================")
    print("  ❌ ERROR creando el vendedor")
    print("============================================")
    print(e)
  finally:
    db.close()


if __name__ == "__main__":
  run()
