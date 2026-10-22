"use client";

import { useState } from "react";
import { CampoNumero, Cifra, HerramientaPagina, PedirInforme, gs, num } from "../HerramientaUI";

/** RETAIL / DINE: horas y plata que se van en facturar a mano cada mes. */
export function CalculadoraFacturacion() {
  const [tickets, setTickets] = useState(60);
  const [minutos, setMinutos] = useState(3);
  const [dias, setDias] = useState(26);
  const [costoHora, setCostoHora] = useState(16_000);

  const listo = tickets > 0 && minutos > 0 && dias > 0;
  const horasMes = (tickets * minutos * dias) / 60;
  const costoMes = horasMes * costoHora;
  const jornadas = horasMes / 8;

  const resumen = [
    `Facturas por día: ${num(tickets)}`,
    `Minutos por factura a mano: ${num(minutos)}`,
    `Días de atención por mes: ${num(dias)}`,
    `Costo hora del personal: ${gs(costoHora)}`,
    `Horas por mes facturando: ${num(horasMes, 1)}`,
    `Costo mensual: ${gs(costoMes)}`,
  ].join(" · ");

  return (
    <HerramientaPagina
      sector="RETAIL"
      titulo="¿Cuántas horas por mes se van en facturar a mano?"
      bajada="Si en tu comercio o restaurante las facturas se hacen a mano o en dos sistemas, calculá cuánto tiempo y cuánta plata se va cada mes en eso."
      calculadora={
        <>
          <CampoNumero id="tickets" label="Facturas o tickets por día" valor={tickets} onChange={setTickets} sufijo="por día" />
          <CampoNumero id="minutos" label="Minutos que lleva cada factura" ayuda="Cargar datos del cliente, calcular, escribir y archivar." valor={minutos} onChange={setMinutos} sufijo="minutos" />
          <CampoNumero id="dias" label="Días de atención por mes" valor={dias} onChange={setDias} sufijo="días" />
          <CampoNumero id="costoHora" label="Costo por hora del personal" ayuda="Sueldo mensual dividido las horas trabajadas." valor={costoHora} onChange={setCostoHora} prefijo="Gs" />
        </>
      }
      resultado={
        listo ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Cifra label="Horas por mes facturando" valor={`${num(horasMes, 1)} h`} nota={`Equivale a ${num(jornadas, 1)} jornadas de 8 horas`} tono="alerta" />
              <Cifra label="Costo por mes" valor={gs(costoMes)} nota="Solo en tiempo de personal" tono="alerta" />
              <Cifra label="Costo por año" valor={gs(costoMes * 12)} />
              <Cifra label="Con factura electrónica desde la caja" valor="Segundos" nota="La factura sale al cobrar, sin volver a cargar datos" tono="bien" />
            </div>
            <PedirInforme herramienta="Calculadora de facturación" sector="RETAIL" resumen={resumen} />
          </>
        ) : (
          <p className="text-[14px] text-white/50">Completá los datos para ver el resultado.</p>
        )
      }
    />
  );
}
