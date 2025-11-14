# backend/app/core/password_policy.py

import re
from fastapi import HTTPException, status


def validate_password_policy(password: str) -> None:
    """
    Valida la contraseña según la política definida (US-05).

    Reglas sugeridas:
    - Mínimo 8 caracteres
    - Al menos una mayúscula
    - Al menos una minúscula
    - Al menos un dígito
    - Al menos un carácter especial
    - Sin espacios
    """

    errors: list[str] = []

    if len(password) < 8:
        errors.append("La contraseña debe tener al menos 8 caracteres.")

    if not re.search(r"[A-Z]", password):
        errors.append("La contraseña debe incluir al menos una letra mayúscula.")

    if not re.search(r"[a-z]", password):
        errors.append("La contraseña debe incluir al menos una letra minúscula.")

    if not re.search(r"\d", password):
        errors.append("La contraseña debe incluir al menos un número.")

    if not re.search(r"[^\w\s]", password):
        errors.append("La contraseña debe incluir al menos un carácter especial.")

    if re.search(r"\s", password):
        errors.append("La contraseña no puede contener espacios.")

    # Opcional: bloquear contraseñas muy comunes
    comunes = {"123456", "password", "qwerty", "111111", "12345678"}
    if password.lower() in comunes:
        errors.append("La contraseña es demasiado común, elige otra más segura.")

    if errors:
        # Lanzamos un HTTPException para que el endpoint pueda responder 400
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=errors,
        )
