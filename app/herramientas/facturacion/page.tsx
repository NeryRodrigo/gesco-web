import type { Metadata } from "next";
import { CalculadoraFacturacion } from "./CalculadoraFacturacion";

export const metadata: Metadata = {
  title: "Calculadora de tiempo de facturación | VORDIA",
  description: "Calculá gratis cuántas horas y cuánta plata se van cada mes en facturar a mano en tu comercio o restaurante.",
  alternates: { canonical: "/herramientas/facturacion" },
};

export default function Page() {
  return <CalculadoraFacturacion />;
}
