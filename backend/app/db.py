from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# Engine: conexión a la BD
engine = create_engine(
    settings.DATABASE_URL,
    future=True,
    echo=False,  # pon True si quieres ver las queries en consola
)

# SessionLocal: cada request usará una de estas sesiones
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base: clase base para todos los modelos (tablas)
Base = declarative_base()


# Dependencia de FastAPI para usar la sesión en endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
