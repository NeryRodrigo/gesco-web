import type { MetadataRoute } from "next";
import { VORDIA_SITIO } from "@/lib/vordiaEntornos";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/api/", "/acceso", "/acceso/", "/sitio/", "/web-institucional"],
    },
    sitemap: `${VORDIA_SITIO}/sitemap.xml`,
    host: VORDIA_SITIO,
  };
}
