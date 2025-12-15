// frontend/app/admin/home-hero/page.tsx
"use client";

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/app/context/NotificationContext";

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

type HomeHeroConfig = {
  id: number;
  video_url: string | null;
  banner1_url: string | null;
  banner2_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type HomeHeroFormState = {
  video_url: string;
  banner1_url: string;
  banner2_url: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const EMPTY_FORM: HomeHeroFormState = {
  video_url: "",
  banner1_url: "",
  banner2_url: "",
};

// ======================
// Restricciones banners
// ======================
const BANNER_RATIO = 4 / 5; // 0.8
const RATIO_TOLERANCE = 0.03; // 3%
const MIN_WIDTH = 800;
const MIN_HEIGHT = 1000;


function buildMediaUrl(url: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

function validateBannerImage(
  file: File
): Promise<{ ok: true } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const ratio = width / height;

      URL.revokeObjectURL(url);

      const ratioDiff = Math.abs(ratio - BANNER_RATIO);

      if (ratioDiff > RATIO_TOLERANCE) {
        resolve({
          ok: false,
          message: `La imagen tiene ${width}×${height}px.
Debe ser vertical con proporción 4:5 (ej: 800×1000, 1200×1500).`,
        });
        return;
      }

      if (width < MIN_WIDTH || height < MIN_HEIGHT) {
        resolve({
          ok: false,
          message: `La imagen es muy pequeña (${width}×${height}px).
Mínimo recomendado: ${MIN_WIDTH}×${MIN_HEIGHT}px.`,
        });
        return;
      }

      resolve({ ok: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        ok: false,
        message: "No se pudo leer la imagen seleccionada.",
      });
    };

    img.src = url;
  });
}


export default function AdminHomeHeroPage() {
  const router = useRouter();
  const { error, success, info } = useNotifications();

  const [user, setUser] = useState<UserMe | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [form, setForm] = useState<HomeHeroFormState>(EMPTY_FORM);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);

  // Archivos seleccionados en el admin
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [banner1File, setBanner1File] = useState<File | null>(null);
  const [banner2File, setBanner2File] = useState<File | null>(null);

  // Previews locales para archivos nuevos
  const [videoPreviewLocal, setVideoPreviewLocal] = useState<string | null>(null);
  const [banner1PreviewLocal, setBanner1PreviewLocal] = useState<string | null>(null);
  const [banner2PreviewLocal, setBanner2PreviewLocal] = useState<string | null>(null);

  // Limpiar object URLs al desmontar
  useEffect(() => {
    return () => {
      if (videoPreviewLocal) URL.revokeObjectURL(videoPreviewLocal);
      if (banner1PreviewLocal) URL.revokeObjectURL(banner1PreviewLocal);
      if (banner2PreviewLocal) URL.revokeObjectURL(banner2PreviewLocal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar usuario admin
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.push("/login");
          return;
        }

        const data = (await res.json()) as UserMe;
        setUser(data);
      } catch {
        router.push("/login");
      } finally {
        setCheckingUser(false);
      }
    }

    fetchMe();
  }, [router]);

  // Cargar configuración actual
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoadingConfig(true);

        const res = await fetch(`${API_BASE_URL}/api/v1/home-hero`, {
          credentials: "include",
        });

        if (res.status === 404) {
          setForm(EMPTY_FORM);
          return;
        }

        if (!res.ok) {
          throw new Error("No se pudo obtener la configuración actual");
        }

        const data = (await res.json()) as HomeHeroConfig;

        setForm({
          video_url: data.video_url || "",
          banner1_url: data.banner1_url || "",
          banner2_url: data.banner2_url || "",
        });
      } catch (err: any) {
        console.error(err);
        error("Error al cargar", err?.message ?? "No se pudo cargar la configuración");
      } finally {
        setLoadingConfig(false);
      }
    }

    loadConfig();
  }, []);

  // Handlers de archivos
  function handleVideoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (videoPreviewLocal) URL.revokeObjectURL(videoPreviewLocal);

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreviewLocal(url);
  }

  async function handleBanner1Change(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateBannerImage(file);

    if (!validation.ok) {
      error("Imagen no válida", validation.message);
      e.target.value = ""; // limpia el input
      return;
    }

    if (banner1PreviewLocal) URL.revokeObjectURL(banner1PreviewLocal);

    const url = URL.createObjectURL(file);
    setBanner1File(file);
    setBanner1PreviewLocal(url);
  }


  async function handleBanner2Change(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateBannerImage(file);

    if (!validation.ok) {
      error("Imagen no válida", validation.message);
      e.target.value = "";
      return;
    }

    if (banner2PreviewLocal) URL.revokeObjectURL(banner2PreviewLocal);

    const url = URL.createObjectURL(file);
    setBanner2File(file);
    setBanner2PreviewLocal(url);
  }


  // Guardar configuración
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let lastConfig: HomeHeroConfig | null = null;

      if (videoFile) {
        const fd = new FormData();
        fd.append("file", videoFile);

        const res = await fetch(
          `${API_BASE_URL}/api/v1/home-hero/upload-video`,
          {
            method: "POST",
            credentials: "include",
            body: fd,
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.detail ?? "No se pudo subir el video de portada"
          );
        }

        lastConfig = (await res.json()) as HomeHeroConfig;
      }

      if (banner1File) {
        const fd = new FormData();
        fd.append("file", banner1File);

        const res = await fetch(
          `${API_BASE_URL}/api/v1/home-hero/upload-banner1`,
          {
            method: "POST",
            credentials: "include",
            body: fd,
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.detail ?? "No se pudo subir el banner 1"
          );
        }

        lastConfig = (await res.json()) as HomeHeroConfig;
      }

      if (banner2File) {
        const fd = new FormData();
        fd.append("file", banner2File);

        const res = await fetch(
          `${API_BASE_URL}/api/v1/home-hero/upload-banner2`,
          {
            method: "POST",
            credentials: "include",
            body: fd,
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.detail ?? "No se pudo subir el banner 2"
          );
        }

        lastConfig = (await res.json()) as HomeHeroConfig;
      }

      if (!videoFile && !banner1File && !banner2File) {
        info("Sin cambios", "No hay cambios nuevos que guardar");
        return;
      }

      if (lastConfig) {
        setForm({
          video_url: lastConfig.video_url || "",
          banner1_url: lastConfig.banner1_url || "",
          banner2_url: lastConfig.banner2_url || "",
        });

        setVideoFile(null);
        setBanner1File(null);
        setBanner2File(null);

        if (videoPreviewLocal) {
          URL.revokeObjectURL(videoPreviewLocal);
          setVideoPreviewLocal(null);
        }
        if (banner1PreviewLocal) {
          URL.revokeObjectURL(banner1PreviewLocal);
          setBanner1PreviewLocal(null);
        }
        if (banner2PreviewLocal) {
          URL.revokeObjectURL(banner2PreviewLocal);
          setBanner2PreviewLocal(null);
        }
      }

      success("¡Actualizada!", "Portada actualizada correctamente");
    } catch (err: any) {
      console.error(err);
      error("Error al guardar", err?.message ?? "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  // Eliminar configuración
  async function handleDelete() {
    if (!confirm("¿Seguro que deseas limpiar la portada?")) return;
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/home-hero`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "No se pudo eliminar la configuración");
      }

      setForm(EMPTY_FORM);

      setVideoFile(null);
      setBanner1File(null);
      setBanner2File(null);

      if (videoPreviewLocal) {
        URL.revokeObjectURL(videoPreviewLocal);
        setVideoPreviewLocal(null);
      }
      if (banner1PreviewLocal) {
        URL.revokeObjectURL(banner1PreviewLocal);
        setBanner1PreviewLocal(null);
      }
      if (banner2PreviewLocal) {
        URL.revokeObjectURL(banner2PreviewLocal);
        setBanner2PreviewLocal(null);
      }

      success("Limpiada", "Portada limpiada. La página mostrará los placeholders");
    } catch (err: any) {
      console.error(err);
      error("Error al eliminar", err?.message ?? "No se pudo eliminar la configuración");
    } finally {
      setSaving(false);
    }
  }

  if (checkingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf6e3] text-sm text-gray-600">
        Verificando sesión...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const videoPreview =
    videoPreviewLocal || buildMediaUrl(form.video_url || null);
  const banner1Preview =
    banner1PreviewLocal || buildMediaUrl(form.banner1_url || null);
  const banner2Preview =
    banner2PreviewLocal || buildMediaUrl(form.banner2_url || null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#6b21a8] mb-1">
        Portada de la tienda
      </h1>
      <p className="text-xs text-gray-500 mb-4">
        Sube el video y las imágenes que se muestran en la parte superior
        de la página principal.
      </p>

      {loadingConfig && (
        <div className="text-xs text-gray-500 mb-4">
          Cargando configuración...
        </div>
      )}

      <section className="grid md:grid-cols-[1.3fr,1fr] gap-6 items-start">
        {/* Formulario de carga */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 rounded-2xl border p-4 space-y-4 text-xs"
        >
          {/* Video */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-700 mb-1">
              Video principal de portada
            </label>
            <label className="block w-full border border-dashed border-gray-300 rounded-2xl bg-gray-50/70 px-4 py-4 text-center cursor-pointer hover:border-[#a855f7] hover:bg-gray-50 transition-colors">
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                onChange={handleVideoChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">🎥</span>
                <span className="text-[11px] font-medium text-gray-700">
                  Haz clic para seleccionar un video
                </span>
                <span className="text-[10px] text-gray-400">
                  MP4, WEBM u OGG. Se guardará en el servidor.
                </span>
                {form.video_url && !videoFile && (
                  <span className="text-[10px] text-gray-500 mt-1">
                    Ya hay un video configurado.
                  </span>
                )}
                {videoFile && (
                  <span className="text-[10px] text-gray-600 mt-1">
                    Video seleccionado: {videoFile.name}
                  </span>
                )}
              </div>
            </label>
          </div>

          {/* Banners */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Banner 1 */}
            <div className="space-y-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Banner vertical 1
              </label>
              <label className="block w-full border border-dashed border-gray-300 rounded-2xl bg-gray-50/70 px-3 py-4 text-center cursor-pointer hover:border-[#a855f7] hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBanner1Change}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl">🖼️</span>
                  <span className="text-[11px] font-medium text-gray-700">
                    Seleccionar imagen
                  </span>
                  <span className="text-[10px] text-gray-400">
                    JPG, PNG, WEBP o GIF.
                  </span>
                  {form.banner1_url && !banner1File && (
                    <span className="text-[10px] text-gray-500 mt-1">
                      Ya hay un banner configurado.
                    </span>
                  )}
                  {banner1File && (
                    <span className="text-[10px] text-gray-600 mt-1">
                      Imagen seleccionada: {banner1File.name}
                    </span>
                  )}
                </div>
              </label>
            </div>

            {/* Banner 2 */}
            <div className="space-y-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Banner vertical 2
              </label>
              <label className="block w-full border border-dashed border-gray-300 rounded-2xl bg-gray-50/70 px-3 py-4 text-center cursor-pointer hover:border-[#a855f7] hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBanner2Change}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl">🖼️</span>
                  <span className="text-[11px] font-medium text-gray-700">
                    Seleccionar imagen
                  </span>
                  <span className="text-[10px] text-gray-400">
                    JPG, PNG, WEBP o GIF.
                  </span>
                  {form.banner2_url && !banner2File && (
                    <span className="text-[10px] text-gray-500 mt-1">
                      Ya hay un banner configurado.
                    </span>
                  )}
                  {banner2File && (
                    <span className="text-[10px] text-gray-600 mt-1">
                      Imagen seleccionada: {banner2File.name}
                    </span>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-[11px] text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Limpiar portada
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 rounded-full 
             bg-[#f5f3ff] text-[#6b21a8] 
             border border-[#a855f7]/40 
             shadow-sm text-xs font-semibold
             hover:bg-[#ede9fe]
             disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        {/* Preview */}
        <section className="space-y-3 text-xs">
          <h2 className="font-semibold text-gray-700">
            Vista previa aproximada
          </h2>

          <div className="border rounded-2xl overflow-hidden bg-gray-900">
            {/* Video preview */}
            <div className="w-full bg-black flex items-center justify-center">
              {videoPreview ? (
                <div className="w-full h-[40vh] sm:h-[50vh] md:h-[60vh] max-h-[400px]">
                  <video
                    src={videoPreview}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="
                      w-full h-full
                      object-contain
                      md:object-cover
                    "
                  />
                </div>
              ) : (
                <div className="w-full h-32 flex items-center justify-center">
                  <span className="text-[10px] text-gray-400">
                    Sin video configurado
                  </span>
                </div>
              )}
            </div>

            {/* Banners preview */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100">
              <div className="h-32 sm:h-40 bg-gray-200 overflow-hidden flex items-center justify-center">
                {banner1Preview ? (
                  <img
                    src={banner1Preview}
                    alt="Banner 1"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                    Sin banner 1
                  </div>
                )}
              </div>
              <div className="h-32 sm:h-40 bg-gray-200 overflow-hidden flex items-center justify-center">
                {banner2Preview ? (
                  <img
                    src={banner2Preview}
                    alt="Banner 2"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                    Sin banner 2
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            La distribución real puede variar un poco, pero esta vista previa
            se acerca a cómo se verá en la tienda (video a ancho completo y
            banners ajustados).
          </p>
        </section>
      </section>
    </div>
  );
}