"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { FONTANA_PROPIEDADES_PLANO } from "@/lib/fontanaPlanos";
import {
  formatGs,
  fetchFontanaMovimientos,
  rangoPeriodo,
  resumenPorPropiedad,
  type FontanaMovimiento,
  type FontanaPeriodoPreset,
} from "@/lib/fontanaFinanzas";
import { calcOcupacionPorPropiedad, calcPorCobrar } from "@/lib/fontanaReportes";
import type { Habitacion, Reserva } from "@/types/hostel";

type Props = {
  empresaId: number;
  habitaciones: Habitacion[];
  reservas: Reserva[];
  refreshKey?: number;
};

export function FontanaReportesPage({
  empresaId,
  habitaciones,
  reservas,
  refreshKey = 0,
}: Props) {
  const [periodo, setPeriodo] = useState<FontanaPeriodoPreset>("mes");
  const [movimientos, setMovimientos] = useState<FontanaMovimiento[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchFontanaMovimientos(empresaId);
        if (!cancelled) setMovimientos(data);
      } catch {
        if (!cancelled) setMovimientos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId, refreshKey]);

  const { from, to } = useMemo(() => rangoPeriodo(periodo), [periodo]);

  const porProp = useMemo(
    () => resumenPorPropiedad(movimientos, from, to),
    [movimientos, from, to]
  );

  const ocupacion = useMemo(
    () => calcOcupacionPorPropiedad(habitaciones, reservas),
    [habitaciones, reservas]
  );

  const porCobrar = useMemo(
    () => calcPorCobrar(habitaciones, reservas),
    [habitaciones, reservas]
  );

  const totales = useMemo(() => {
    let ingresos = 0;
    let gastos = 0;
    for (const p of FONTANA_PROPIEDADES_PLANO) {
      ingresos += porProp[p].ingresos;
      gastos += porProp[p].gastos;
    }
    return { ingresos, gastos, resultado: ingresos - gastos };
  }, [porProp]);

  const maxBar = Math.max(
    1,
    ...FONTANA_PROPIEDADES_PLANO.map((p) =>
      Math.max(porProp[p].ingresos, porProp[p].gastos)
    )
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-400">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" /> Reportes
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Cinco indicadores · compará Fontana 1 vs 2 vs 3 de un vistazo.
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-[#0C1327] border border-white/5">
          {(
            [
              ["hoy", "Hoy"],
              ["semana", "Semana"],
              ["mes", "Mes"],
              ["anio", "Año"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setPeriodo(k)}
              className={`min-h-9 px-3 rounded-lg text-[10px] font-black uppercase ${
                periodo === k ? "bg-amber-500 text-slate-950" : "text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 5 indicadores globales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: "Ingresos", value: formatGs(totales.ingresos), accent: "text-emerald-300" },
          { label: "Gastos", value: formatGs(totales.gastos), accent: "text-rose-300" },
          {
            label: "Resultado",
            value: formatGs(totales.resultado),
            accent: totales.resultado >= 0 ? "text-amber-300" : "text-rose-400",
          },
          {
            label: "Ocupación",
            value: `${Math.round(
              FONTANA_PROPIEDADES_PLANO.reduce((a, p) => a + ocupacion[p].pct, 0) / 3
            )}%`,
            accent: "text-sky-300",
          },
          { label: "Por cobrar", value: formatGs(porCobrar.total), accent: "text-violet-300" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-[#0C1327] p-3 sm:p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{k.label}</p>
            <p className={`text-base sm:text-lg font-black tabular-nums mt-1 ${k.accent}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Comparativo por Fontana */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {FONTANA_PROPIEDADES_PLANO.map((p) => {
          const fin = porProp[p];
          const oc = ocupacion[p];
          return (
            <div
              key={p}
              className="rounded-2xl border border-white/10 bg-[#0C1327] p-4 sm:p-5 space-y-4"
            >
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-white">{p}</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {from} → {to}
                </p>
              </div>

              <div className="space-y-2">
                <Bar label="Ingresos" value={fin.ingresos} max={maxBar} color="bg-emerald-500" />
                <Bar label="Gastos" value={fin.gastos} max={maxBar} color="bg-rose-500" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Metric label="Resultado" value={formatGs(fin.resultado)} />
                <Metric label="Ocupación" value={`${oc.pct}% (${oc.ocupadas}/${oc.capacidad})`} />
              </div>
            </div>
          );
        })}
      </section>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Los ingresos/gastos salen de Finanzas (y salarios pagados en Personal). La ocupación sale del
        croquis. Por cobrar se calcula desde fichas y reservas activas.
      </p>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-slate-300">{formatGs(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 px-2.5 py-2">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-[11px] font-bold text-white mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
