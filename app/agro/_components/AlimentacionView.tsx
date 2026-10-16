"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Wheat, Repeat, Coins, Package, Scale, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroFeed, agroInventario, agroRaciones, agroRegistrarRacion, type AgroFeed, type AgroInsumo, type AgroRacion } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BarChart, BTN_PRIMARY, CARD, Empty, FIELD, Kpi, Occupancy, SELECT, Section, fmtFecha, fmtGs, fmtKg, fmtNum, hace } from "./ui";

/** Alimentación: entregas por corral, consumo diario, conversión y stock de alimento. */
export default function AlimentacionView({ ctx }: { ctx: AgroCtx }) {
  const [feed, setFeed] = useState<AgroFeed | null>(null);
  const [raciones, setRaciones] = useState<AgroRacion[]>([]);
  const [inv, setInv] = useState<AgroInsumo[]>([]);
  const [f, setF] = useState({ loteId: "", tipo: "", kg: "", operario: "" });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      agroFeed(ctx.empresaId, 30).catch(() => null),
      agroRaciones(ctx.empresaId).catch(() => [] as AgroRacion[]),
      agroInventario(ctx.empresaId).catch(() => [] as AgroInsumo[]),
    ]).then(([fd, r, i]) => {
      if (!vivo) return;
      setFeed(fd);
      setRaciones(r);
      setInv(i);
    });
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  const alimentos = useMemo(() => inv.filter((i) => i.tipo === "Alimento"), [inv]);
  const lotesConAnimales = ctx.lotes.filter((l) => l.etapa !== "Reproductor" && l.etapa !== "Cria");
  const lote = ctx.lotes.find((l) => String(l.loteId) === f.loteId);
  const ultimaDelLote = raciones.find((r) => String(r.loteId) === f.loteId);
  const sugerido = lote && feed?.kgCabDia && lote.etapa === "Engorde" ? Math.round(lote.animales * feed.kgCabDia) : null;

  const entregar = async () => {
    if (!f.loteId || !f.kg) return void toast.error("Elegí el lote y los kg entregados");
    const tipo = f.tipo || ultimaDelLote?.tipoAlimento || alimentos[0]?.nombre;
    if (!tipo) return void toast.error("Indicá el alimento");
    try {
      setGuardando(true);
      await agroRegistrarRacion({
        empresaId: ctx.empresaId,
        loteId: Number(f.loteId),
        tipoAlimento: tipo,
        cantidadKg: Number(f.kg),
        operario: f.operario || undefined,
        costoGs: Math.round(Number(f.kg) * (alimentos.find((a) => a.nombre === tipo)?.costoPromedioGs ?? ctx.config.costoRacionKgGs)),
      });
      const stock = alimentos.find((a) => a.nombre === tipo);
      toast.success(`Entrega registrada · ${lote?.codigo}`, {
        description: stock ? `Quedan ≈ ${fmtNum(stock.stock - Number(f.kg))} ${stock.unidad} de ${tipo}` : `${fmtNum(Number(f.kg))} kg de ${tipo}`,
      });
      setF({ ...f, kg: "" });
      ctx.refrescar();
    } catch (e) {
      toast.error("No se pudo registrar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  const hoyKg = feed?.alimentacionDiaria.at(-1)?.kg ?? 0;
  const stockTmr = alimentos.reduce((s, a) => s + Math.max(0, a.stock), 0);
  const consumoStock = alimentos.reduce((s, a) => s + a.consumoDiario, 0);
  const diasStock = consumoStock > 0 ? stockTmr / consumoStock : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Entregado hoy" value={fmtKg(hoyKg, 0)} hint={`7 días: ${fmtKg(feed?.alimentoKg7d ?? 0, 0)}`} icon={<Wheat size={15} />} tone="ok" />
        <Kpi label="Consumo por cabeza" value={feed?.kgCabDia != null ? `${fmtNum(feed.kgCabDia, 1)} kg/d` : "—"} hint="Confinamiento, promedio 7 días" icon={<Scale size={15} />} />
        <Kpi
          label="Conversión"
          value={feed?.conversionEstimada != null ? `${fmtNum(feed.conversionEstimada, 1)} : 1` : "—"}
          hint={`Objetivo ≤ ${fmtNum(ctx.config.conversionObjetivo, 1)}`}
          icon={<Repeat size={15} />}
          tone={feed?.conversionEstimada != null && feed.conversionEstimada > ctx.config.conversionObjetivo ? "warn" : "neutral"}
        />
        <Kpi label="Costo diario" value={fmtGs(feed?.economia.costoDiarioGs, true)} hint={feed?.economia.costoCabDiaGs ? `${fmtGs(feed.economia.costoCabDiaGs)} por cabeza` : undefined} icon={<Coins size={15} />} />
        <Kpi
          label="Stock de alimento"
          value={fmtKg(stockTmr, 0)}
          hint={diasStock != null ? `≈ ${fmtNum(diasStock, 1)} días de consumo` : "Cargá compras en Inventario"}
          icon={<Package size={15} />}
          tone={diasStock != null && diasStock < 5 ? "danger" : "neutral"}
          onClick={() => ctx.irA("inventario")}
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-4 items-start">
        <Section title="Consumo diario (kg) · 14 días" icon={<Wheat size={15} />} className="xl:col-span-2">
          <BarChart points={(feed?.alimentacionDiaria ?? []).map((p) => ({ x: p.fecha, y: p.kg, extra: fmtGs(p.costoGs) }))} />
        </Section>

        <section className={`${CARD} p-4 sm:p-5`}>
          <h2 className="text-sm font-semibold mb-3">Registrar entrega</h2>
          <div className="space-y-2.5">
            <select value={f.loteId} onChange={(e) => setF({ ...f, loteId: e.target.value })} className={SELECT}>
              <option value="">Lote / corral</option>
              {lotesConAnimales.map((l) => (
                <option key={l.loteId} value={l.loteId}>
                  {l.codigo} · {l.animales} cab.
                </option>
              ))}
            </select>
            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={SELECT}>
              <option value="">{ultimaDelLote ? `Igual que la última (${ultimaDelLote.tipoAlimento})` : "Alimento"}</option>
              {alimentos.map((a) => (
                <option key={a.insumoId} value={a.nombre}>
                  {a.nombre} · stock {fmtNum(a.stock)} {a.unidad}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2.5">
              <Input type="number" inputMode="decimal" value={f.kg} onChange={(e) => setF({ ...f, kg: e.target.value })} placeholder={sugerido ? `Sugerido ${fmtNum(sugerido)}` : "Kg"} className={FIELD} />
              <Input value={f.operario} onChange={(e) => setF({ ...f, operario: e.target.value })} placeholder="Operario" className={FIELD} />
            </div>
            {lote ? <Occupancy current={lote.animales} max={lote.capacidad} /> : null}
            <Button className={`${BTN_PRIMARY} w-full`} disabled={guardando} onClick={() => void entregar()}>
              <Plus size={14} /> Registrar entrega
            </Button>
            <p className="text-[11px] text-white/35">El stock del alimento se descuenta solo con cada entrega.</p>
          </div>
        </section>
      </div>

      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <Section title="Consumo por corral (7 días)" icon={<Scale size={15} />}>
          {feed?.lotes.length ? (
            <div className="space-y-2">
              {feed.lotes.map((l) => (
                <div key={l.loteId} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#07110d] px-4 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{l.codigo} <span className="text-white/45 text-[12px]">· {l.animales} cab.</span></p>
                    <p className="text-[11px] text-white/40">Última entrega {l.ultimaRacion ? hace(l.ultimaRacion) : "sin registro"}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold">{fmtKg(l.alimentoKg7d, 0)}</p>
                    <p className="text-[11px] text-white/45">{fmtNum(l.kgCabDia, 1)} kg/cab/día · conv. {l.conversion != null ? `${fmtNum(l.conversion, 1)}:1` : "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Sin corrales de engorde.</Empty>
          )}
        </Section>

        <Section title="Últimas entregas" icon={<Wheat size={15} />}>
          {raciones.length ? (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.05]">
              {raciones.slice(0, 40).map((r) => (
                <div key={r.racionId} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <div className="min-w-0">
                    <p className="text-white/90 truncate">{r.tipoAlimento} · <span className="text-emerald-300/90">{r.loteCodigo}</span></p>
                    <p className="text-[11px] text-white/40">{r.operario ?? "sin operario"}{r.vehiculo ? ` · ${r.vehiculo}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <p className="font-semibold">{fmtKg(r.cantidadKg, 0)}</p>
                    <p className="text-[11px] text-white/40">{fmtFecha(r.fechaEntrega, true)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Sin entregas registradas.</Empty>
          )}
        </Section>
      </div>
    </div>
  );
}
