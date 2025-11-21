# backend/app/core/request_utils.py

from fastapi import Request
from typing import Optional


def get_client_ip(request: Request) -> Optional[str]:
    """
    Obtiene la dirección IP del cliente que realiza la petición.
    
    Prioriza headers de proxy (X-Forwarded-For, X-Real-IP) para
    casos donde la app está detrás de un proxy reverso o load balancer.
    
    Args:
        request: Objeto Request de FastAPI
    
    Returns:
        Dirección IP del cliente o None si no se puede determinar
    """
    # Intentar obtener IP desde headers de proxy
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For puede contener múltiples IPs separadas por coma
        # La primera es la IP original del cliente
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fallback: obtener IP directamente del cliente
    if request.client:
        return request.client.host
    
    return None