import type { Metadata, Viewport } from "next";
import { fraunces } from "@/lib/fuentesBoutique";
import { FONDO } from "@/components/boutique/estilos";
import { ClosetFooter, ClosetHeader } from "./_components/ClosetUI";

export const metadata: Metadata = {
  title: "VORDIA Closet · Moda de las boutiques de Asunción y Gran Asunción",
  description:
    "Comprá o alquilá vestidos de fiesta, ropa y accesorios de las boutiques de Asunción y Gran Asunción. Stock real por talle y color, disponible para la fecha de tu evento. Reservá tu prueba en un toque.",
  alternates: { canonical: "/closet" },
  openGraph: {
    title: "VORDIA Closet",
    description: "El vestidor de todas las boutiques de Gran Asunción: stock real, por talle y para la fecha de tu evento.",
    type: "website",
    locale: "es_PY",
  },
};

export const viewport: Viewport = { themeColor: "#FCEAF4" };

export default function ClosetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${FONDO} min-h-dvh`}>
      <ClosetHeader />
      {children}
      <ClosetFooter />
    </div>
  );
}
