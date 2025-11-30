// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Backend local - IMPORTANTE para desarrollo
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      // Backend en producción (ajusta según tu dominio cuando despliegues)
      {
        protocol: 'https',
        hostname: 'api.tudominio.com',
        pathname: '/media/**',
      },
      // Placeholders externos (para imágenes de prueba)
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      // CDNs comunes (si usas Cloudinary o AWS S3)
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;