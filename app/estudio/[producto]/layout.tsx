import type { Metadata } from "next";

// Encuesta que se envía por link a prospectos: no debe indexarse
export const metadata: Metadata = {
  title: "Estudio de precios · VORDIA",
  robots: { index: false, follow: false },
};

export default function EstudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
