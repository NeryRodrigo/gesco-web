import type { MetadataRoute } from "next";
import { VORDIA_ENTORNO_CANONICOS, VORDIA_SITIO } from "@/lib/vordiaEntornos";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: VORDIA_SITIO,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...VORDIA_ENTORNO_CANONICOS.map((slug) => ({
      url: `${VORDIA_SITIO}/${slug}`,
      changeFrequency: "weekly" as const,
      priority: slug === "habitat" ? 0.9 : 0.8,
    })),
  ];
}
