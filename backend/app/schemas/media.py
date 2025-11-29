# app/schemas/media.py
from pydantic import BaseModel
from typing import Optional, List

class MediaBase(BaseModel):
    url: str
    tipo: Optional[str] = "IMAGEN"
    orden: Optional[int] = 0

class MediaCreate(MediaBase):
    pass

class MediaRead(MediaBase):
    id: int
    producto_id: int

    class Config:
        from_attributes = True

class MediaReorderItem(BaseModel):
    id: int
    orden: int

class MediaReorderRequest(BaseModel):
    items: List[MediaReorderItem]