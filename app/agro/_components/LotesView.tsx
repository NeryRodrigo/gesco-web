"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Fence, MapPin, Plus, Pencil, X, Beef, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroGuardarLote, agroZonas, type AgroLoteFull, type AgroZona } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BTN_GHOST, BTN_PRIMARY, CARD, ETAPA_LABEL, Empty, FIELD, Kpi, Occupancy, Pill, SELECT, Section, fmtKg, fmtNum } from "./ui";

/** Lotes, corrales y potreros con su ocupación; zonas de la cerca virtual. */
export default function LotesView({ ctx }: { ctx: AgroCtx }) {
  const [zonas, setZonas] = useState<AgroZona[]>([]);
  const [editar, setEditar] = useState<AgroLoteFull | "nuevo" | null>(null);

  useEffect(() => {
    let vivo = true;
    agroZonas(ctx.empresaId)
      .then((z) => vivo && setZonas(z))
      .catch(() => vivo && setZonas([]));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  const capacidad = ctx.lotes.reduce((s, l) => s + l.capacidad, 0);
  const ocupados = ctx.lotes.reduce((s, l) => s + l.animales, 0);
  const llenos = ctx.lotes.filter((l) => l.capacidad > 0 && l.animales >= l.capacidad * 0.95).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Lotes / corrales" value={fmtNum(ctx.lotes.length)} hint={`${ctx.lotes.filter((l) => l.tipo === "Corral").length} corrales · ${ctx.lotes.filter((l) => l.tipo === "Potrero").length} potreros`} icon={<LayoutGrid size={15} />} />
        <Kpi label="Animales ubicados" value={fmtNum(ocupados)} hint={`de ${fmtNum(capacidad)} lugares`} icon={<Beef size={15} />} tone="ok" />
        <Kpi label="Ocupación total" value={capacidad ? `${Math.round((ocupados * 100) / capacidad)} %` : "—"} icon={<Fence size={15} />} />
        <Kpi label="Al límite" value={fmtNum(llenos)} hint="≥ 95 % de capacidad" icon={<Fence size={15} />} tone={llenos ? "warn" : "neutral"} />
      </div>

      <section className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold">Lotes, corrales y potreros</h2>
          <Button onClick={() => setEditar("nuevo")} className={`${BTN_PRIMARY} h-10 px-4`}>
            <Plus size={14} /> Lote
          </Button>
        </div>
        {ctx.lotes.length ? (
          <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {ctx.lotes.map((l) => (
              <div key={l.loteId} className="rounded-xl border border-white/[0.06] bg-[#07110d] p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
                      {l.codigo} · {l.tipo}
                    </p>
                    <p className="text-sm font-medium">{l.nombre}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.etapa ? <Pill tone="info">{ETAPA_LABEL[l.etapa] ?? l.etapa}</Pill> : <Pill>Sin etapa</Pill>}
                    <button type="button" onClick={() => setEditar(l)} className="text-white/40 hover:text-white" aria-label={`Editar ${l.codigo}`}>
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <Occupancy current={l.animales} max={l.capacidad} />
                <p className="mt-2 text-[11px] text-white/40">
                  {l.pesoObjetivoKg ? `Objetivo ${fmtKg(l.pesoObjetivoKg, 0)}` : "Objetivo según la etapa"}
                  {l.camaraCodigo ? ` · cámara ${l.camaraCodigo}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Todavía no hay lotes. Creá el primero.</Empty>
        )}
      </section>

      <Section title="Cerca virtual (zonas GPS)" icon={<MapPin size={15} />}>
        {zonas.length ? (
          <div className="grid md:grid-cols-2 gap-2.5">
            {zonas.map((z) => (
              <div key={z.zonaId} className="rounded-xl border border-white/[0.06] bg-[#07110d] px-4 py-3 flex justify-between gap-2 items-start">
                <div>
                  <p className="text-sm font-semibold">{z.nombre}</p>
                  <p className="text-[12px] text-white/40 mt-0.5">
                    Radio {fmtNum(z.radioMetros)} m{z.latCentro != null ? ` · ${z.latCentro}, ${z.lngCentro}` : ""}
                  </p>
                </div>
                <Pill tone={z.tipo === "Prohibida" ? "danger" : "ok"}>{z.tipo}</Pill>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Sin zonas definidas. Se usan con los collares GPS de VORDIA Connect.</Empty>
        )}
      </Section>

      {editar ? <LoteDialog ctx={ctx} lote={editar === "nuevo" ? null : editar} onClose={() => setEditar(null)} /> : null}
    </div>
  );
}

function LoteDialog({ ctx, lote, onClose }: { ctx: AgroCtx; lote: AgroLoteFull | null; onClose: () => void }) {
  const [f, setF] = useState({
    codigo: lote?.codigo ?? "",
    nombre: lote?.nombre ?? "",
    tipo: lote?.tipo ?? "Corral",
    capacidad: String(lote?.capacidad ?? ""),
    etapa: lote?.etapa ?? "",
    objetivo: lote?.pesoObjetivoKg ? String(lote.pesoObjetivoKg) : "",
  });
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    try {
      setGuardando(true);
      await agroGuardarLote(
        {
          empresaId: ctx.empresaId,
          codigo: f.codigo,
          nombre: f.nombre,
          tipo: f.tipo,
          capacidad: Number(f.capacidad) || 0,
          etapa: f.etapa || null,
          pesoObjetivoKg: f.objetivo ? Number(f.objetivo) : null,
        },
        lote?.loteId,
      );
      toast.success(lote ? "Lote actualizado" : "Lote creado");
      ctx.refrescar();
      onClose();
    } catch (e) {
      toast.error("No se pudo guardar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div className={`${CARD} bg-[#0b1511] w-full sm:max-w-md p-5 rounded-b-none sm:rounded-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{lote ? `Editar ${lote.codigo}` : "Nuevo lote"}</h3>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2.5">
          <div className="grid grid-cols-[110px_1fr] gap-2.5">
            <Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="Código *" className={FIELD} />
            <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre *" className={FIELD} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={SELECT}>
              <option>Corral</option>
              <option>Potrero</option>
              <option>Manga</option>
            </select>
            <Input type="number" value={f.capacidad} onChange={(e) => setF({ ...f, capacidad: e.target.value })} placeholder="Capacidad (cabezas)" className={FIELD} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <select value={f.etapa} onChange={(e) => setF({ ...f, etapa: e.target.value })} className={SELECT}>
              <option value="">Sin etapa</option>
              <option value="Reproductor">Reproductores</option>
              <option value="Cria">Cría</option>
              <option value="Recria">Recría</option>
              <option value="Engorde">Engorde</option>
            </select>
            <Input type="number" value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} placeholder="Peso objetivo kg" className={FIELD} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button className={`${BTN_GHOST} h-11 flex-1`} onClick={onClose}>
              Cancelar
            </Button>
            <Button className={`${BTN_PRIMARY} flex-1`} disabled={guardando} onClick={() => void guardar()}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
