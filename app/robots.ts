import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/api/", "/acceso", "/acceso/", "/sitio/", "/web-institucional"],
    },
    sitemap: "https://www.vordia.com.py/sitemap.xml",
    host: "https://www.vordia.com.py",
  };
}
