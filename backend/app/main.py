# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.auth import router as auth_router

app = FastAPI(
    title="API Tienda Virtual",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,   # 👈 necesario para cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])


@app.get("/")
def read_root():
    return {"message": "API Tienda Virtual OK"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
