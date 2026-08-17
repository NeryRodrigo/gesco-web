import type { MetadataRoute } from "next";

/** Solo afecta "Agregar a inicio" / PWA en celulares. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vordia",
    short_name: "Vordia",
    description: "Sistema operativo de gestión inteligente",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050B18",
    theme_color: "#050B18",
    icons: [
      {
        src: "/images/ISOTIPO.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/ISOTIPO.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
