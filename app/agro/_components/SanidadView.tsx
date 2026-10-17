"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, AlertOctagon, CheckCircle2, ShieldAlert, Syringe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroAnimalesFull, agroAplicarSanidad, agroRegistrarSanidad, agroSanidad, type AgroAnimalFull, type AgroSanidad } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BTN_GHOST, BTN_PRIMARY, CARD, Empty, FIELD, Kpi, Pill, SELECT, Section, diasHasta, fmtFecha, fmtNum } from "./ui";

type Filtro = "pendientes" | "vencidas" | "aplicadas" | "todas";

/** Productos frecuentes en Paraguay (plan sanitario SENACSA + rutina de campo). */
const PRESETS: { tipo: string; producto: string; dosis: string; retiro: number }[] = [
  { tipo: "Vacuna", producto: "Aftosa (campaña oficial SENACSA)", dosis: "2 ml", retiro: 0 },
  { tipo: "Vacuna", producto: "Brucelosis (terneras 3-8 meses)", dosis: "2 ml", retiro: 0 },
  { tipo: "Vacuna", producto: "Carbunclo bacteridiano", dosis: "1 ml", retiro: 0 },
  { tipo: "Vacuna", producto: "Clostridiales polivalente", dosis: "5 ml", retiro: 0 },
  { tipo: "Desparasitacion", producto: "Ivermectina 1%", dosis: "1 ml / 50 kg", retiro: 28 },
  { tipo: "Desparasitacion", producto: "Doramectina 1%", dosis: "1 ml / 50 kg", retiro: 35 },
  { tipo: "Tratamiento", producto: "Oxitetraciclina LA", dosis: "1 ml / 10 kg", retiro: 28 },
  { tipo: "Diagnostico", producto: "Tacto / diagnóstico de preñez", dosis: "", retiro: 0 },
];

function haceDias(n: number) {
  return Date.now() - n * 86400000;
}

export default function SanidadView({ ctx }: { ctx: AgroCtx }) {
  const [items, setItems] = useState<AgroSanidad[] | null>(null);
  const [animales, setAnimales] = useState<AgroAnimalFull[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("pendientes");

  useEffect(() => {
    let vivo = true;
    Promise.all([agroSanidad(ctx.empresaId), agroAnimalesFull(ctx.empresaId).catch(() => [])])
      .then(([s, a]) => {
        if (!vivo) return;
        setItems(s);
        setAnimales(a.filter((x) => x.etapa !== "Vendido" && x.etapa !== "Baja"));
      })
      .catch(() => vivo && setItems([]));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  const enRetiro = useMemo(() => animales.filter((a) => a.retiroSanitarioHasta), [animales]);
  const tratamiento = useMemo(() => animales.filter((a) => a.estado === "Tratamiento"), [animales]);

  if (!items) return <div className="h-96 rounded-2xl bg-white/[0.04] animate-pulse" />;

  const pendientes = items.filter((s) => s.estado === "Programada");
  const vencidas = pendientes.filter((s) => s.vencida);
  const hace30 = haceDias(30);
  const aplicadas = items.filter((s) => s.estado === "Aplicada");
  const aplicadas30 = aplicadas.filter((s) => s.fechaAplicacion && new Date(s.fechaAplicacion).getTime() >= hace30);

  const lista = { pendientes, vencidas, aplicadas, todas: items }[filtro];

  const aplicar = async (s: AgroSanidad) => {
    await agroAplicarSanidad(ctx.empresaId, s.sanidadId);
    toast.success("Aplicación registrada", { description: `${s.producto} · ${s.loteCodigo ? `lote ${s.loteCodigo}` : `#${s.animalCodigo}`}` });
    ctx.refrescar();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Programadas" value={fmtNum(pendientes.length - vencidas.length)} hint="Calendario sanitario" icon={<CalendarClock size={15} />} />
        <Kpi label="Vencidas" value={fmtNum(vencidas.length)} hint="Aplicar cuanto antes" icon={<AlertOctagon size={15} />} tone={vencidas.length ? "danger" : "neutral"} onClick={() => setFiltro("vencidas")} />
        <Kpi label="Aplicadas 30 días" value={fmtNum(aplicadas30.length)} icon={<CheckCircle2 size={15} />} tone="ok" />
        <Kpi label="En tratamiento" value={fmtNum(tratamiento.length)} hint={tratamiento.slice(0, 3).map((a) => `#${a.codigoInterno}`).join(", ") || undefined} icon={<Syringe size={15} />} tone={tratamiento.length ? "warn" : "neutral"} />
        <Kpi label="En período de retiro" value={fmtNum(enRetiro.length)} hint="No aptos para faena" icon={<ShieldAlert size={15} />} tone={enRetiro.length ? "warn" : "neutral"} />
      </div>

      <div className="grid xl:grid-cols-3 gap-4 items-start">
        <section className={`${CARD} p-4 sm:p-5 xl:col-span-2`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold">Calendario sanitario</h2>
            <div className="inline-flex p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.06] overflow-x-auto">
              {(
                [
                  ["pendientes", `Pendientes (${pendientes.length})`],
                  ["vencidas", `Vencidas (${vencidas.length})`],
                  ["aplicadas", `Aplicadas (${aplicadas.length})`],
                  ["todas", "Todas"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFiltro(id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold ${filtro === id ? "bg-emerald-600 text-white" : "text-white/50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {lista.length === 0 ? (
            <Empty>Nada en esta lista.</Empty>
          ) : (
            <div className="space-y-2">
              {lista.map((s) => {
                const dias = diasHasta(s.fechaProgramada);
                return (
                  <div key={s.sanidadId} className="rounded-xl border border-white/[0.06] bg-[#07110d] px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={s.tipo === "Tratamiento" ? "warn" : s.tipo === "Diagnostico" ? "neutral" : "info"}>{s.tipo === "Desparasitacion" ? "Desparasitación" : s.tipo === "Diagnostico" ? "Diagnóstico" : s.tipo}</Pill>
                        <p className="font-medium text-sm">{s.producto}</p>
                      </div>
                      <p className="text-[12px] text-white/45 mt-1">
                        {s.loteCodigo ? `Lote ${s.loteCodigo} · ${s.animalesAlcanzados} cab.` : `Animal #${s.animalCodigo}`}
                        {s.dosis ? ` · ${s.dosis}` : ""}
                        {s.responsable ? ` · ${s.responsable}` : ""}
                      </p>
                      {s.notas ? <p className="text-[11px] text-white/35 mt-0.5">{s.notas}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {s.estado === "Programada" ? (
                        <>
                          <Pill tone={s.vencida ? "danger" : dias === 0 ? "warn" : "neutral"}>
                            {s.vencida ? `Vencida hace ${-(dias ?? 0)} d` : dias === 0 ? "Hoy" : `${fmtFecha(s.fechaProgramada)} · en ${dias} d`}
                          </Pill>
                          <Button size="sm" className={BTN_GHOST} onClick={() => void aplicar(s)}>
                            <CheckCircle2 size={13} /> Aplicada
                          </Button>
                        </>
                      ) : (
                        <>
                          <Pill tone="ok">Aplicada {fmtFecha(s.fechaAplicacion)}</Pill>
                          {s.retiroHasta && (diasHasta(s.retiroHasta) ?? 0) > 0 ? <Pill tone="warn">Retiro hasta {fmtFecha(s.retiroHasta)}</Pill> : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <RegistrarSanidad ctx={ctx} animales={animales} />
          {enRetiro.length ? (
            <Section title="No enviar a faena" icon={<ShieldAlert size={15} />}>
              <p className="text-[12px] text-white/45 mb-3">Animales con residuos de medicamento dentro del período de retiro.</p>
              <div className="flex flex-wrap gap-1.5">
                {enRetiro.slice(0, 40).map((a) => (
                  <button
                    key={a.animalId}
                    type="button"
                    onClick={() => ctx.tiene("TRACE") && ctx.irA("trazabilidad", { animalId: a.animalId })}
                    className="rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-2 py-1 text-[11px] text-amber-100/90"
                    title={`Hasta ${fmtFecha(a.retiroSanitarioHasta)}`}
                  >
                    #{a.codigoInterno} · {fmtFecha(a.retiroSanitarioHasta)}
                  </button>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RegistrarSanidad({ ctx, animales }: { ctx: AgroCtx; animales: AgroAnimalFull[] }) {
  const [destino, setDestino] = useState<"lote" | "animal">("lote");
  const [loteId, setLoteId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [f, setF] = useState({ tipo: "Vacuna", producto: "", dosis: "", fecha: new Date().toISOString().slice(0, 10), retiro: "0", responsable: "", aplicada: true });

  const animal = animales.find((a) => a.codigoInterno.toLowerCase() === codigo.trim().replace(/^#/, "").toLowerCase());
  const lote = ctx.lotes.find((l) => String(l.loteId) === loteId);

  const guardar = async () => {
    if (destino === "lote" && !lote) return void toast.error("Elegí el lote");
    if (destino === "animal" && !animal) return void toast.error("Animal no encontrado");
    if (!f.producto.trim()) return void toast.error("Indicá el producto");
    try {
      await agroRegistrarSanidad({
        empresaId: ctx.empresaId,
        loteId: destino === "lote" ? lote!.loteId : null,
        animalId: destino === "animal" ? animal!.animalId : null,
        tipo: f.tipo,
        producto: f.producto,
        dosis: f.dosis || undefined,
        fechaProgramada: f.fecha,
        aplicada: f.aplicada,
        diasRetiro: Number(f.retiro) || 0,
        responsable: f.responsable || undefined,
      });
      toast.success(f.aplicada ? "Aplicación registrada" : "Aplicación programada", {
        description: destino === "lote" ? `Lote ${lote!.codigo} · ${lote!.animales} cabezas` : `#${animal!.codigoInterno}`,
      });
      setF({ ...f, producto: "", dosis: "", retiro: "0" });
      setCodigo("");
      ctx.refrescar();
    } catch (e: unknown) {
      toast.error("No se pudo guardar", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Section title="Registrar / programar" icon={<Plus size={15} />}>
      <div className="space-y-2.5">
        <div className="inline-flex w-full p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
          {(["lote", "animal"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setDestino(m)} className={`flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold ${destino === m ? "bg-emerald-600 text-white" : "text-white/50"}`}>
              {m === "lote" ? "Por lote (campaña)" : "Individual"}
            </button>
          ))}
        </div>
        {destino === "lote" ? (
          <select value={loteId} onChange={(e) => setLoteId(e.target.value)} className={SELECT}>
            <option value="">Lote</option>
            {ctx.lotes.map((l) => (
              <option key={l.loteId} value={l.loteId}>
                {l.codigo} · {l.nombre} ({l.animales} cab.)
              </option>
            ))}
          </select>
        ) : (
          <>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Caravana / código" className={FIELD} list="agro-san-animales" />
            <datalist id="agro-san-animales">
              {animales.slice(0, 300).map((a) => (
                <option key={a.animalId} value={a.codigoInterno} />
              ))}
            </datalist>
          </>
        )}
        <select
          value=""
          onChange={(e) => {
            const p = PRESETS[Number(e.target.value)];
            if (p) setF({ ...f, tipo: p.tipo, producto: p.producto, dosis: p.dosis, retiro: String(p.retiro) });
          }}
          className={SELECT}
        >
          <option value="">Producto frecuente…</option>
          {PRESETS.map((p, i) => (
            <option key={p.producto} value={i}>
              {p.producto}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2.5">
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={SELECT}>
            <option value="Vacuna">Vacuna</option>
            <option value="Desparasitacion">Desparasitación</option>
            <option value="Tratamiento">Tratamiento</option>
            <option value="Diagnostico">Diagnóstico</option>
          </select>
          <Input value={f.dosis} onChange={(e) => setF({ ...f, dosis: e.target.value })} placeholder="Dosis" className={FIELD} />
        </div>
        <Input value={f.producto} onChange={(e) => setF({ ...f, producto: e.target.value })} placeholder="Producto *" className={FIELD} />
        <div className="grid grid-cols-2 gap-2.5">
          <Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={FIELD} />
          <Input type="number" value={f.retiro} onChange={(e) => setF({ ...f, retiro: e.target.value })} placeholder="Días de retiro" className={FIELD} title="Días de retiro (carencia)" />
        </div>
        <Input value={f.responsable} onChange={(e) => setF({ ...f, responsable: e.target.value })} placeholder="Veterinario / responsable" className={FIELD} />
        <label className="flex items-center gap-2 text-[13px] text-white/70">
          <input type="checkbox" checked={f.aplicada} onChange={(e) => setF({ ...f, aplicada: e.target.checked })} className="accent-emerald-500 h-4 w-4" />
          Ya fue aplicada (si no, queda programada)
        </label>
        <Button className={`${BTN_PRIMARY} w-full`} onClick={() => void guardar()}>
          <Syringe size={14} /> {f.aplicada ? "Registrar aplicación" : "Programar"}
        </Button>
      </div>
    </Section>
  );
}
