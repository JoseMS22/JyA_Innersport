from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class DireccionBase(BaseModel):
    """
    Modelo base que se usa principalmente para RESPUESTA.
    Aquí NO validamos 'no vacío' para permitir leer datos viejos de la BD.
    """
    nombre: Optional[str] = Field(
        None,
        max_length=100,
        description="Nombre descriptivo (ej: Casa, Trabajo)",
    )
    # Permitimos que venga None, pero por defecto usamos Costa Rica
    pais: Optional[str] = Field(
        "Costa Rica",
        max_length=80,
    )
    provincia: Optional[str] = Field(
        None,
        max_length=80,
    )
    canton: Optional[str] = Field(
        None,
        max_length=80,
    )
    distrito: Optional[str] = Field(
        None,
        max_length=80,
    )
    detalle: Optional[str] = Field(
        None,
        max_length=200,
        description="Dirección exacta",
    )
    codigo_postal: Optional[str] = Field(
        None,
        max_length=20,
    )
    telefono: Optional[str] = Field(
        None,
        max_length=30,
    )
    referencia: Optional[str] = Field(
        None,
        max_length=200,
        description="Referencias adicionales",
    )


class DireccionCreate(DireccionBase):
    """
    Modelo para CREAR direcciones.
    Aquí sí exigimos que los campos clave vengan llenos y no vacíos.
    """
    # Sobrescribimos los campos para que sean obligatorios al crear
    pais: str = Field(
        default="Costa Rica",
        max_length=80,
    )
    provincia: str = Field(
        ...,
        max_length=80,
    )
    canton: str = Field(
        ...,
        max_length=80,
    )
    distrito: str = Field(
        ...,
        max_length=80,
    )
    detalle: str = Field(
        ...,
        max_length=200,
        description="Dirección exacta",
    )

    predeterminada: bool = False

    # ✅ Aquí SÍ validamos que no haya strings vacíos
    @field_validator("provincia", "canton", "distrito", "detalle")
    @classmethod
    def no_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Este campo no puede estar vacío")
        return v.strip()


class DireccionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    pais: Optional[str] = Field(None, max_length=80)
    provincia: Optional[str] = Field(None, max_length=80)
    canton: Optional[str] = Field(None, max_length=80)
    distrito: Optional[str] = Field(None, max_length=80)
    detalle: Optional[str] = Field(None, max_length=200)
    codigo_postal: Optional[str] = Field(None, max_length=20)
    telefono: Optional[str] = Field(None, max_length=30)
    referencia: Optional[str] = Field(None, max_length=200)
    predeterminada: Optional[bool] = None


class DireccionRead(DireccionBase):
    """
    Modelo de RESPUESTA. Hereda DireccionBase (campos opcionales)
    para que no falle si hay strings vacíos/NULL en la BD.
    """
    id: int
    usuario_id: int
    predeterminada: bool
    activa: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    # ✅ PYDANTIC V2: ConfigDict en lugar de class Config
    model_config = ConfigDict(from_attributes=True)