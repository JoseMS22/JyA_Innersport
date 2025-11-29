// app/categorias/[...slugs]/page.tsx
import { CatalogoPage } from "@/components/CatalogoPage";

type Props = {
  params: Promise<{ slugs: string[] }>;
};

export default async function CategoriaPage({ params }: Props) {
  const { slugs } = await params; // ["ropa-deportiva"] o ["ropa-deportiva", "mujer"]
  const decoded = slugs.map((s) => decodeURIComponent(s));

  let titulo = "";
  let categoriaSlug = "";
  let principalSlug = "";
  let secundariaSlug = "";

  if (decoded.length === 1) {
    // /categorias/ropa-deportiva
    categoriaSlug = decoded[0];
    titulo = decoded[0]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  } else if (decoded.length === 2) {
    // /categorias/ropa-deportiva/mujer
    principalSlug = decoded[0];
    secundariaSlug = decoded[1];

    const prettyPrincipal = decoded[0]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    const prettySecundaria = decoded[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    titulo = `${prettyPrincipal} · ${prettySecundaria}`;
  }

  return (
    <CatalogoPage
      titulo={titulo}
      // 👇 nuevos props para que el catálogo sepa qué slugs mandar al backend
      initialCategoriaSlug={categoriaSlug}
      initialPrincipalSlug={principalSlug}
      initialSecundariaSlug={secundariaSlug}
    />
  );
}
