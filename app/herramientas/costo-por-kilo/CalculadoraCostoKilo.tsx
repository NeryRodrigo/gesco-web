"use client";

import { useState } from "react";
import { CampoNumero, Cifra, HerramientaPagina, PedirInforme, gs, num } from "../HerramientaUI";

/** AGRO: costo de cada kilo que agrega el engorde, margen por animal y días al peso de venta. */
export function CalculadoraCostoKilo() {
  const [cabezas, setCabezas] = useState(200);
  const [racion, setRacion] = useState(9_500);
  const [otros, setOtros] = useState(1_500);
  const [gdp, setGdp] = useState(1.2);
  const [pesoActual, setPesoActual] = useState(320);
  const [pesoVenta, setPesoVenta] = useState(480);
  const [precioKg, setPrecioKg] = useState(14_000);

  const costoDia = racion + otros;
  const listo = gdp > 0 && pesoVenta > pesoActual && precioKg > 0 && costoDia > 0;
  const costoKg = listo ? costoDia / gdp : 0;
  const margenKg = precioKg - costoKg;
  const kilos = pesoVenta - pesoActual;
  const dias = listo ? kilos / gdp : 0;
  const margenAnimal = kilos * margenKg;
  const margenLote = margenAnimal * cabezas;

  const resumen = [
    `Cabezas: ${num(cabezas)}`,
    `Costo diario por cabeza: ${gs(costoDia)} (ración ${gs(racion)} + otros ${gs(otros)})`,
    `Ganancia diaria: ${num(gdp, 2)} kg`,
    `Peso ${num(pesoActual)} → ${num(pesoVenta)} kg`,
    `Precio venta: ${gs(precioKg)}/kg`,
    `Costo por kg producido: ${gs(costoKg)}`,
    `Margen del lote sobre kilos agregados: ${gs(margenLote)}`,
  ].join(" · ");

  return (
    <HerramientaPagina
      sector="AGRO"
      titulo="¿Cuánto te cuesta cada kilo que produce tu engorde?"
      bajada="Con el costo de la ración, la ganancia diaria y el precio de venta, mirá cuánto te cuesta cada kilo, cuánto margen deja cada animal y en cuántos días llega al peso de venta."
      calculadora={
        <>
          <CampoNumero id="cabezas" label="Cabezas en engorde" valor={cabezas} onChange={setCabezas} sufijo="cabezas" />
          <CampoNumero id="racion" label="Costo de ración por cabeza por día" valor={racion} onChange={setRacion} prefijo="Gs" />
          <CampoNumero id="otros" label="Otros costos por cabeza por día" ayuda="Sanidad, mano de obra, fletes internos." valor={otros} onChange={setOtros} prefijo="Gs" />
          <CampoNumero id="gdp" label="Ganancia diaria de peso" ayuda="Ejemplo: 1,2 kg por día." valor={gdp} onChange={setGdp} sufijo="kg/día" decimales />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoNumero id="pesoActual" label="Peso actual promedio" valor={pesoActual} onChange={setPesoActual} sufijo="kg" />
            <CampoNumero id="pesoVenta" label="Peso de venta" valor={pesoVenta} onChange={setPesoVenta} sufijo="kg" />
          </div>
          <CampoNumero id="precioKg" label="Precio de venta por kilo vivo" valor={precioKg} onChange={setPrecioKg} prefijo="Gs" />
        </>
      }
      resultado={
        listo ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Cifra label="Costo por kilo producido" valor={gs(costoKg)} nota={`Con ${num(gdp, 2)} kg/día de ganancia`} tono={margenKg < 0 ? "alerta" : "normal"} />
              <Cifra label="Margen por kilo" valor={gs(margenKg)} nota="Precio de venta menos costo del kilo" tono={margenKg < 0 ? "alerta" : "bien"} />
              <Cifra label="Días al peso de venta" valor={`${num(dias)} días`} nota={`${num(kilos)} kg por agregar`} />
              <Cifra label="Margen del lote" valor={gs(margenLote)} nota={`${gs(margenAnimal)} por animal, sobre los kilos que agrega el engorde`} tono={margenLote < 0 ? "alerta" : "bien"} />
            </div>
            {margenKg < 0 && (
              <p className="rounded-xl bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
                Cada kilo te cuesta más de lo que lo vendés. Revisá la ración o la ganancia diaria: medir pesajes cada 15 días ayuda a detectarlo a tiempo.
              </p>
            )}
            <PedirInforme herramienta="Calculadora de costo por kilo" sector="AGRO" resumen={resumen} />
          </>
        ) : (
          <p className="text-[14px] text-white/50">Completá ganancia diaria, pesos y precio para ver el resultado. El peso de venta tiene que ser mayor al actual.</p>
        )
      }
    />
  );
}
