// frontend/lib/api.ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";


  export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  // Detectar si la respuesta es JSON
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data: any = null;

  if (isJson) {
    // Intentar parsear JSON, pero sin romper si viene vacío o mal formado
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    let msg = "Error en la solicitud";

    if (data && typeof data === "object") {
      // FastAPI suele devolver { detail: "..."} o { detail: [ ... ] }
      if (typeof data.detail === "string") {
        msg = data.detail;
      } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        msg = data.detail[0].msg || msg;
      }
    }

    throw new Error(msg);
  }

  // Si no hay JSON, devolvemos null y listo
  return data;
}
