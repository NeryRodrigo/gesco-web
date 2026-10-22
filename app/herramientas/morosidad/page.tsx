import type { Metadata } from "next";
import { CalculadoraMorosidad } from "./CalculadoraMorosidad";

export const metadata: Metadata = {
  title: "Calculadora de morosidad de expensas | VORDIA",
  description: "Calculá gratis cuánta plata tiene atrasada tu edificio o condominio y cuánto podés recuperar con recordatorios y cobro online.",
  alternates: { canonical: "/herramientas/morosidad" },
};

export default function Page() {
  return <CalculadoraMorosidad />;
}
