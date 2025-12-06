// app/categorias/[slug]/page.tsx
import { CatalogoPage } from "@/components/CatalogoPage";

type Props = {
  // 👇 ahora params es una Promesa
  params: Promise<{ slug: string }>;
};

export default async function CategoriaPage({ params }: Props) {
  // 👇 desestructuramos esperando la promesa
  const { slug } = await params; // "ropa-deportiva", "mujer", etc.

  const decodedSlug = decodeURIComponent(slug);

  // Solo para el título bonito: "Ropa Deportiva"
  const titulo = decodedSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <CatalogoPage
      titulo={titulo}
      initialCategoria={titulo} // aquí va el slug
    />
  );
}
