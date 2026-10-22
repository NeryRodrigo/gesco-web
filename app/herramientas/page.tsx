import type { Metadata } from "next";
import { HerramientasIndice } from "./HerramientasIndice";

export const metadata: Metadata = {
  title: "Herramientas gratis para tu negocio | VORDIA",
  description: "Calculadoras gratuitas para condominios, ganadería, comercios y restaurantes en Paraguay: morosidad, costo por kilo y tiempo de facturación.",
  alternates: { canonical: "/herramientas" },
};

export default function Page() {
  return <HerramientasIndice />;
}
