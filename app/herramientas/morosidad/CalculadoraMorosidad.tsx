"use client";

import { useState } from "react";
import { CampoNumero, Cifra, HerramientaPagina, PedirInforme, gs, num } from "../HerramientaUI";

/** HABITAT: cuánta plata queda trabada por expensas atrasadas y cuánto se recupera bajando la morosidad. */
export function CalculadoraMorosidad() {
  const [unidades, setUnidades] = useState(40);
  const [expensa, setExpensa] = useState(450_000);
  const [morosos, setMorosos] = useState(8);
  const [meses, setMeses] = useState(2);

  const m = Math.min(morosos, unidades);
  const tasa = unidades > 0 ? m / unidades : 0;
  const trabado = m * expensa * meses;
  const porMes = m * expensa;
  const recupero = trabado * 0.3;
  const listo = unidades > 0 && expensa > 0;

  const resumen = [
    `Unidades: ${num(unidades)}`,
    `Expensa promedio: ${gs(expensa)}`,
    `Unidades con atraso: ${num(m)} (${num(tasa * 100, 1)} %)`,
    `Meses de atraso promedio: ${num(meses)}`,
    `Plata atrasada hoy: ${gs(trabado)}`,
    `Recupero estimado bajando 30 % la morosidad: ${gs(recupero)}`,
  ].join(" · ");

  return (
    <HerramientaPagina
      sector="HABITAT"
      titulo="¿Cuánta plata tenés trabada en expensas atrasadas?"
      bajada="Cargá los datos de tu edificio o condominio y mirá cuánto dinero está atrasado hoy y cuánto podrías recuperar con recordatorios automáticos y cobro online."
      calculadora={
        <>
          <CampoNumero id="unidades" label="Cantidad de unidades" valor={unidades} onChange={setUnidades} sufijo="unidades" />
          <CampoNumero id="expensa" label="Expensa promedio por unidad" valor={expensa} onChange={setExpensa} prefijo="Gs" />
          <CampoNumero id="morosos" label="Unidades con expensas atrasadas" valor={morosos} onChange={setMorosos} sufijo="unidades" />
          <CampoNumero id="meses" label="Meses de atraso promedio" ayuda="Si algunos deben 1 mes y otros 3, poné un promedio." valor={meses} onChange={setMeses} sufijo="meses" />
        </>
      }
      resultado={
        listo ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Cifra label="Morosidad" valor={`${num(tasa * 100, 1)} %`} nota={`${num(m)} de ${num(unidades)} unidades`} tono={tasa > 0.15 ? "alerta" : "normal"} />
              <Cifra label="Plata atrasada hoy" valor={gs(trabado)} nota="Expensas vencidas sin cobrar" tono="alerta" />
              <Cifra label="Lo que deja de entrar cada mes" valor={gs(porMes)} nota="Mientras sigan atrasadas" />
              <Cifra label="Recuperás bajando 30 % la morosidad" valor={gs(recupero)} tono="bien" nota="Con recordatorios por WhatsApp y cobro online" />
            </div>
            <PedirInforme herramienta="Calculadora de morosidad" sector="HABITAT" resumen={resumen} />
          </>
        ) : (
          <p className="text-[14px] text-white/50">Cargá unidades y expensa para ver el resultado.</p>
        )
      }
    />
  );
}
