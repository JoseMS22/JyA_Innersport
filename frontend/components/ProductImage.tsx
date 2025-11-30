// frontend/components/ProductImage.tsx
import Image from "next/image";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function ProductImage({
  src,
  alt,
  fill,
  width,
  height,
  className = "object-cover",
  priority = false,
}: ProductImageProps) {
  const [error, setError] = useState(false);

  // Construir URL completa
  function buildImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    
    // Si ya es una URL completa, usarla directamente
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    
    // Si es una ruta relativa del backend, construir URL completa
    if (url.startsWith("/media/")) {
      return `${API_BASE}${url}`;
    }
    
    return url;
  }

  const imageUrl = buildImageUrl(src);

  // Si no hay imagen o hubo error, mostrar placeholder
  if (!imageUrl || error) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 ${className}`}
        style={!fill ? { width, height } : undefined}
      >
        <div className="text-center text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs">Sin imagen</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      priority={priority}
      onError={() => setError(true)}
      unoptimized // Deshabilita optimización de Next.js para evitar problemas con proxy
    />
  );
}