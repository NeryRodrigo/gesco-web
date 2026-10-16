"use client";

import { useEffect, useState } from "react";
import { Wallet, Scale, Coins, TrendingUp, Wheat, BadgeDollarSign, Layers, Fence, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agroEjecutivo, agroFeed, type AgroEjecutivo, type AgroFeed } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { Fila } from "./FeedView";
import { BTN_GHOST, ETAPA_LABEL, Kpi, Section, fmtGs, fmtKg, fmtNum } from "./ui";

export default function FinanzasView({ ctx }: { ctx: AgroCtx }) {
  const [ej, setEj] = useState<AgroEjecutivo | null>(null);
  const [feed, setFeed] = useState<AgroFeed | null>(null);

  const conFeed = ctx.tiene("FEED");

  useEffect(() => {
    let vivo = true;
    Promise.all([agroEjecutivo(ctx.empresaId), conFeed ? agroFeed(ctx.empresaId).catch(() => null) : Promise.resolve(null)]).then(([e, f]) => {
      if (!vivo) return;
      setEj(e);
      setFeed(f);
    });
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version, conFeed]);

  if (!ej) return <div className="h-96 rounded-2xl bg-white/[0.04] animate-pulse" />;

  const eco = feed?.economia;
  const etapas = ej.etapas.filter((e) => e.animales > 0);
  const total = etapas.reduce((s, e) => s + e.valorEstimadoGs, 0) || 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Inventario valorizado" value={fmtGs(ej.valorRodeoGs, true)} hint={`${fmtNum(ej.totalAnimales)} cabezas`} icon={<Wallet size={15} />} tone="ok" />
        <Kpi label="Kg en pie" value={fmtNum(ej.kgEnPie)} hint={`a ${fmtGs(ej.precioKgGs)} / kg`} icon={<Scale size={15} />} />
        <Kpi label="Costo kg producido" value={fmtGs(eco?.costoKgProducidoGs)} hint="Alimento · últimos 30 días" icon={<Coins size={15} />} />
        <Kpi
          label="Margen por kg"
          value={fmtGs(eco?.margenKgGs)}
          hint="Precio kg vivo − costo kg producido"
          icon={<TrendingUp size={15} />}
          tone={eco?.margenKgGs == null ? "neutral" : eco.margenKgGs >= 0 ? "ok" : "danger"}
        />
        <Kpi label="Alimento 30 días" value={fmtGs(eco?.costoAlimento30dGs, true)} hint={eco ? `${fmtGs(eco.costoDiarioGs)} por día` : undefined} icon={<Wheat size={15} />} />
        <Kpi label="Listos para vender" value={fmtGs(eco?.valorListosGs, true)} hint={eco ? `${fmtKg(eco.kgListos, 0)} en pie` : undefined} icon={<BadgeDollarSign size={15} />} tone="ok" />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <Section title="Inventario valorizado por etapa" icon={<Layers size={15} />} className="lg:col-span-3">
          <div className="space-y-3">
            {etapas.map((e) => (
              <div key={e.etapa}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{ETAPA_LABEL[e.etapa]}</span>
                  <span className="tabular-nums font-semibold">{fmtGs(e.valorEstimadoGs, true)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500/80" style={{ width: `${(e.valorEstimadoGs / total) * 100}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-white/40 tabular-nums">
                  {fmtNum(e.animales)} cab. · {fmtKg(e.pesoPromedioKg, 0)} prom. · {Math.round((e.valorEstimadoGs / total) * 100)}% del total
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-white/35">Valorización a precio de kg vivo. Ajustá el precio de referencia en Mi operación.</p>
        </Section>

        <Section
          title="Resultado del confinamiento (30 d)"
          icon={<Fence size={15} />}
          className="lg:col-span-2"
          right={
            <Button size="sm" className={BTN_GHOST} onClick={() => ctx.irA("operacion")}>
              Parámetros <ArrowRight size={13} />
            </Button>
          }
        >
          {eco ? (
            <dl className="space-y-2.5 text-sm">
              <Fila label="Kg producidos" value={fmtKg(eco.kgProducidos30d, 0)} />
              <Fila label="Valor de los kg producidos" value={fmtGs(eco.kgProducidos30d * eco.precioKgGs)} />
              <Fila label="Costo de alimento" value={fmtGs(eco.costoAlimento30dGs)} />
              <div className="border-t border-white/[0.06] pt-2.5" />
              <Fila
                label="Margen bruto de alimentación"
                value={fmtGs(eco.kgProducidos30d * eco.precioKgGs - eco.costoAlimento30dGs)}
                tone={eco.kgProducidos30d * eco.precioKgGs - eco.costoAlimento30dGs >= 0 ? "ok" : "danger"}
              />
              <Fila label="Costo por cabeza / día" value={fmtGs(eco.costoCabDiaGs)} />
            </dl>
          ) : (
            <p className="text-sm text-white/40">Activá VORDIA Feed para ver costos de alimentación y conversión.</p>
          )}
        </Section>
      </div>

      {feed?.lotes.length ? (
        <Section title="Costos por lote / corral" icon={<Coins size={15} />}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                  <th className="px-2 py-2 font-medium">Lote</th>
                  <th className="px-2 py-2 font-medium text-right">Cabezas</th>
                  <th className="px-2 py-2 font-medium text-right">Kg prod. 30 d</th>
                  <th className="px-2 py-2 font-medium text-right">Alimento 30 d</th>
                  <th className="px-2 py-2 font-medium text-right">Costo / kg</th>
                  <th className="px-2 py-2 font-medium text-right">Margen / kg</th>
                  <th className="px-2 py-2 font-medium text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {feed.lotes.map((l) => {
                  const margen = l.costoKgProducidoGs != null ? feed.economia.precioKgGs - l.costoKgProducidoGs : null;
                  const resultado = l.kgProducidos30d * feed.economia.precioKgGs - l.costoAlimento30dGs;
                  return (
                    <tr key={l.loteId} className="tabular-nums">
                      <td className="px-2 py-2.5">
                        <span className="font-semibold">{l.codigo}</span> <span className="text-white/40 text-[12px]">{l.nombre}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right">{fmtNum(l.animales)}</td>
                      <td className="px-2 py-2.5 text-right">{fmtNum(l.kgProducidos30d)}</td>
                      <td className="px-2 py-2.5 text-right">{fmtGs(l.costoAlimento30dGs, true)}</td>
                      <td className="px-2 py-2.5 text-right">{fmtGs(l.costoKgProducidoGs)}</td>
                      <td className={`px-2 py-2.5 text-right ${margen == null ? "" : margen >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtGs(margen)}</td>
                      <td className={`px-2 py-2.5 text-right font-semibold ${resultado >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtGs(resultado, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
