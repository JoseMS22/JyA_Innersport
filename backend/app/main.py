# backend/app/main.py

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
import time

from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.api.v1.auth import router as auth_router
from app.api.v1.audit import router as audit_router
# Routers de catálogo y productos
from app.api.v1.categorias import router as categorias_router
from app.api.v1.productos import router as productos_router
from app.api.v1.variantes import router as variantes_router
# Routers de sucursales e inventario
from app.api.v1.sucursales import router as sucursales_router
from app.api.v1.inventario import router as inventario_router
from fastapi.staticfiles import StaticFiles
import os


# Inicializar sistema de logging ANTES de crear la app
setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="API Tienda Virtual JyA Innersport",
    version="0.1.0",
    description="API REST para tienda virtual con sistema POS integrado",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# MIDDLEWARE DE LOGGING
# =========================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware que registra todas las peticiones HTTP.
    Útil para debugging y monitoreo.
    """
    start_time = time.time()
    
    # Obtener IP del cliente
    from app.core.request_utils import get_client_ip
    client_ip = get_client_ip(request)
    
    # Log de entrada
    logger.info(
        f"→ {request.method} {request.url.path} | IP: {client_ip}"
    )
    
    # Procesar request
    response = await call_next(request)
    
    # Calcular tiempo de procesamiento
    process_time = time.time() - start_time
    
    # Determinar nivel de log según código de respuesta
    if response.status_code >= 500:
        log_level = logger.error
    elif response.status_code >= 400:
        log_level = logger.warning
    else:
        log_level = logger.info
    
    # Log de salida
    log_level(
        f"← {request.method} {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Tiempo: {process_time:.3f}s | "
        f"IP: {client_ip}"
    )
    
    # Agregar header con tiempo de procesamiento
    response.headers["X-Process-Time"] = str(process_time)
    
    return response


# =========================
# HANDLER GLOBAL DE EXCEPCIONES
# =========================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Maneja excepciones no capturadas y las registra en el log.
    Cumple con RNF17 (Registro y Monitoreo de Errores).
    """
    from app.core.request_utils import get_client_ip
    client_ip = get_client_ip(request)
    
    logger.error(
        f"❌ ERROR NO MANEJADO | "
        f"{request.method} {request.url.path} | "
        f"IP: {client_ip} | "
        f"Error: {str(exc)}",
        exc_info=True  # Incluye stack trace completo
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Error interno del servidor. El incidente ha sido registrado.",
        },
    )


MEDIA_DIR = os.path.join(os.path.dirname(__file__), "media")

app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


# =========================
# RUTAS
# =========================

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(audit_router, prefix="/api/v1/audit", tags=["Auditoría"])
# Catálogo y productos
app.include_router(categorias_router, prefix="/api/v1/categorias", tags=["Categorías"])
app.include_router(productos_router, prefix="/api/v1/productos", tags=["Productos"])
app.include_router(variantes_router, prefix="/api/v1/variantes", tags=["Variantes"])
# Sucursales e inventario
app.include_router(sucursales_router, prefix="/api/v1/sucursales", tags=["Sucursales"])
app.include_router(inventario_router, prefix="/api/v1/inventario", tags=["Inventario"])



@app.get("/")
def read_root():
    """Endpoint raíz de bienvenida."""
    return {
        "message": "API Tienda Virtual JyA Innersport",
        "version": "0.1.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint para monitoreo.
    Cumple con RNF05 (Disponibilidad y Conectividad).
    
    Verifica:
    - Estado general de la API
    - Conexión a base de datos
    - Timestamp actual
    """
    from app.db import engine
    
    health_data = {
        "status": "ok",
        "timestamp": time.time(),
        "checks": {}
    }
    
    # Verificar conexión a base de datos
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        
        health_data["checks"]["database"] = "ok"
        logger.debug("Health check: Database OK")
        
    except Exception as e:
        health_data["checks"]["database"] = "error"
        health_data["status"] = "degraded"
        logger.error(f"Health check: Database ERROR - {str(e)}")
    
    # Determinar código de estado HTTP
    if health_data["status"] == "ok":
        status_code = status.HTTP_200_OK
    else:
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content=health_data,
    )


@app.get("/health/database")
def health_check_database():
    """
    Health check específico para base de datos.
    Útil para monitoreo granular.
    """
    from app.db import engine
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            conn.commit()
        
        return {
            "status": "ok",
            "database": "PostgreSQL",
            "version": version,
            "timestamp": time.time(),
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "error": str(e),
                "timestamp": time.time(),
            },
        )


# =========================
# EVENTOS DE CICLO DE VIDA
# =========================

@app.on_event("startup")
async def startup_event():
    """Evento ejecutado al iniciar la aplicación."""
    logger.info("=" * 70)
    logger.info("🚀 Iniciando API Tienda Virtual JyA Innersport")
    logger.info(f"📦 Versión: {app.version}")
    logger.info(f"🌐 CORS habilitado para: {settings.BACKEND_CORS_ORIGINS}")
    logger.info(f"🔐 JWT expira en: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutos")
    logger.info(f"📧 Email desde: {settings.EMAIL_FROM_ADDRESS}")
    logger.info("=" * 70)
    
    # Verificar conexión a BD al iniciar
    from app.db import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        logger.info("✅ Conexión a base de datos: OK")
    except Exception as e:
        logger.error(f"❌ Error conectando a base de datos: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Evento ejecutado al cerrar la aplicación."""
    logger.info("=" * 70)
    logger.info("🛑 Cerrando API Tienda Virtual JyA Innersport")
    logger.info("=" * 70)