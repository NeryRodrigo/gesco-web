import type { MetadataRoute } from "next";

/** Solo afecta "Agregar a inicio" / PWA en celulares. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vordia",
    short_name: "Vordia",
    description: "Sistema operativo de gestión inteligente",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#050B18",
    theme_color: "#050B18",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
