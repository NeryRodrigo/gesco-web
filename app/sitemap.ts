import type { MetadataRoute } from "next";
import { VORDIA_ENTORNO_CANONICOS } from "@/lib/vordiaEntornos";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: "https://www.vordia.com.py/",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...VORDIA_ENTORNO_CANONICOS.map((slug) => ({
      url: `https://www.vordia.com.py/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: slug === "habitat" ? 0.9 : 0.8,
    })),
  ];
}
