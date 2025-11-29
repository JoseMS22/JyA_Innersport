# backend/app/core/storage.py
import os
import uuid
from fastapi import UploadFile

# Carpeta media absoluta basada en la ubicación del archivo
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # .../app
MEDIA_PATH = os.path.join(BASE_DIR, "media")


def save_local_file(file: UploadFile) -> str:
    """
    Guarda un archivo en modo local dentro de /app/media.
    Devuelve la URL pública (/media/archivo.ext).
    """
    # Asegurar que exista la carpeta
    os.makedirs(MEDIA_PATH, exist_ok=True)

    # Extensión "segura"
    _, ext = os.path.splitext(file.filename or "")
    filename = f"{uuid.uuid4().hex}{ext}"

    file_path = os.path.join(MEDIA_PATH, filename)

    # Guardar archivo físico
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    # URL accesible públicamente (la sirve main.py)
    return f"/media/{filename}"
