import type { Metadata } from "next";
import { CalculadoraCostoKilo } from "./CalculadoraCostoKilo";

export const metadata: Metadata = {
  title: "Calculadora de costo por kilo en engorde | VORDIA",
  description: "Calculá gratis cuánto te cuesta cada kilo producido, el margen por animal y los días al peso de venta de tu engorde o feedlot.",
  alternates: { canonical: "/herramientas/costo-por-kilo" },
};

export default function Page() {
  return <CalculadoraCostoKilo />;
}
