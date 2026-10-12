import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VordiaProductoPage } from "@/app/web-institucional/VordiaProductoPage";
import { VORDIA_SITIO } from "@/lib/vordiaEntornos";
import { productoPorSlug, VORDIA_PRODUCTO_SLUGS } from "@/lib/vordiaProductos";

type Props = { params: Promise<{ producto: string }> };

export function generateStaticParams() {
  return VORDIA_PRODUCTO_SLUGS.map((producto) => ({ producto }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { producto } = await params;
  const p = productoPorSlug(producto);
  if (!p) return {};
  const url = `${VORDIA_SITIO}/${p.slug}`;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: p.title,
      description: p.description,
      url,
      siteName: "VORDIA",
      locale: "es_PY",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description: p.description,
    },
  };
}

function jsonLd(producto: NonNullable<ReturnType<typeof productoPorSlug>>) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "VORDIA", item: VORDIA_SITIO },
          {
            "@type": "ListItem",
            position: 2,
            name: `VORDIA ${producto.codigo}`,
            item: `${VORDIA_SITIO}/${producto.slug}`,
          },
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: `VORDIA ${producto.codigo}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: producto.description,
        url: `${VORDIA_SITIO}/${producto.slug}`,
      },
    ],
  };
}

export default async function SitioProductoPage({ params }: Props) {
  const { producto } = await params;
  const p = productoPorSlug(producto);
  if (!p) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(p)) }} />
      <VordiaProductoPage producto={p} />
    </>
  );
}
