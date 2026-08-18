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
    // Solo "any": Android achica los maskable (safe zone) y el isotipo queda chico.
    icons: [
      {
        src: "/icons/vordia-192.png?v=20260818f",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/vordia-512.png?v=20260818f",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
