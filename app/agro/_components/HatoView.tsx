"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Baby, Beef, Gauge, Scale, Target, Timer, Plus, Search, Heart, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroAnimalesFull, agroCrearAnimal, type AgroAnimalFull } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import CambioEtapaDialog, { destinosPara, type DestinoEtapa } from "./CambioEtapaDialog";
import { BTN_GHOST, BTN_PRIMARY, CARD, Empty, FIELD, Kpi, Pill, Progreso, SELECT, Section, fmtKg, fmtNum } from "./ui";

const EDAD_DESTETE = 180;
const PESO_DESTETE = 180;

function edadDias(iso?: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
}

export default function HatoView({ ctx, modo: modoVista }: { ctx: AgroCtx; modo: "cria" | "recria" | "reproduccion" }) {
  // Reproducción usa los mismos datos que cría, pero arranca en el rodeo de madres y toros
  const modo = modoVista === "reproduccion" ? "cria" : modoVista;
  const [animales, setAnimales] = useState<AgroAnimalFull[] | null>(null);
  const [tab, setTab] = useState<"principal" | "reproductores">(modoVista === "reproduccion" ? "reproductores" : "principal");
  const [q, setQ] = useState("");
  const [dialogo, setDialogo] = useState<{ a: AgroAnimalFull; d: DestinoEtapa } | null>(null);

  useEffect(() => {
    let vivo = true;
    const etapas = modo === "cria" ? ["Cria", "Reproductor"] : ["Recria"];
    Promise.all(etapas.map((e) => agroAnimalesFull(ctx.empresaId, e)))
      .then((r) => vivo && setAnimales(r.flat()))
      .catch(() => vivo && setAnimales([]));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version, modo]);

  const principal = useMemo(() => (animales ?? []).filter((a) => a.etapa === (modo === "cria" ? "Cria" : "Recria")), [animales, modo]);
  const reproductores = useMemo(() => (animales ?? []).filter((a) => a.etapa === "Reproductor"), [animales]);

  const lista = useMemo(() => {
    const base = tab === "reproductores" ? reproductores : principal;
    const t = q.trim().toLowerCase().replace(/^#/, "");
    const f = t
      ? base.filter((a) =>
          [a.codigoInterno, a.rfidTag, a.loteCodigo, a.madreCodigo, a.categoria].some((v) => (v ?? "").toLowerCase().includes(t)),
        )
      : base;
    if (modo === "recria" && tab === "principal")
      return [...f].sort((a, b) => (b.pesoActualKg ?? 0) / (b.pesoObjetivoKg || 1) - (a.pesoActualKg ?? 0) / (a.pesoObjetivoKg || 1));
    if (modo === "cria" && tab === "principal") return [...f].sort((a, b) => (edadDias(b.fechaNacimiento) ?? 0) - (edadDias(a.fechaNacimiento) ?? 0));
    return f;
  }, [tab, principal, reproductores, q, modo]);

  if (!animales) return <div className="h-96 rounded-2xl bg-white/[0.04] animate-pulse" />;

  const prom = (xs: (number | null | undefined)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };

  return (
    <div className="space-y-5">
      {modo === "cria" ? <KpisCria terneros={principal} reproductores={reproductores} prom={prom} /> : <KpisRecria ctx={ctx} animales={principal} prom={prom} />}

      <div className="grid xl:grid-cols-3 gap-4 items-start">
        <section className={`${CARD} p-4 sm:p-5 xl:col-span-2`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            {modo === "cria" ? (
              <div className="inline-flex p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                {(
                  [
                    ["principal", `Terneros (${principal.length})`],
                    ["reproductores", `Rodeo reproductor (${reproductores.length})`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${tab === id ? "bg-emerald-600 text-white" : "text-white/50"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <h2 className="text-sm font-semibold">Animales en recría · ordenados por avance al objetivo</h2>
            )}
            <div className="relative sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar código, madre, lote" className={`${FIELD} h-10 pl-9`} />
            </div>
          </div>

          {lista.length === 0 ? (
            <Empty>{q ? "Sin resultados." : "No hay animales en esta etapa todavía."}</Empty>
          ) : (
            <div className="space-y-2">
              {lista.slice(0, 120).map((a) => (
                <FilaAnimal key={a.animalId} a={a} modo={tab === "reproductores" ? "reproductor" : modo} ctx={ctx} onAccion={(d) => setDialogo({ a, d })} />
              ))}
              {lista.length > 120 ? <p className="text-[11px] text-white/35 pt-1">Mostrando 120 de {lista.length}. Usá el buscador.</p> : null}
            </div>
          )}
        </section>

        <div className="space-y-4">
          {modo === "cria" ? <AltaNacimiento ctx={ctx} reproductores={reproductores} /> : <AltaRecria ctx={ctx} />}
          {modo === "cria" ? (
            <Section title="Próximo en reproducción" icon={<Heart size={15} />}>
              <p className="text-[12px] text-white/50 leading-relaxed">
                Servicio / monta, inseminación, tacto y diagnóstico de preñez, fecha probable de parto e indicadores reproductivos
                (% preñez, % parición, % destete) se suman en la próxima entrega del módulo Cría.
              </p>
            </Section>
          ) : null}
        </div>
      </div>

      {dialogo ? <CambioEtapaDialog ctx={ctx} animal={dialogo.a} destino={dialogo.d} onClose={() => setDialogo(null)} /> : null}
    </div>
  );
}

function KpisCria({
  terneros,
  reproductores,
  prom,
}: {
  terneros: AgroAnimalFull[];
  reproductores: AgroAnimalFull[];
  prom: (xs: (number | null | undefined)[]) => number | null;
}) {
  const vacas = reproductores.filter((a) => a.sexo === "H").length;
  const toros = reproductores.length - vacas;
  const destete = terneros.filter((t) => (edadDias(t.fechaNacimiento) ?? 0) >= EDAD_DESTETE || (t.pesoActualKg ?? 0) >= PESO_DESTETE).length;
  const relacion = vacas ? Math.round((terneros.length / vacas) * 100) : null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <Kpi label="Vientres" value={fmtNum(vacas)} hint={`${toros} toro(s) en servicio`} icon={<Heart size={15} />} tone="ok" />
      <Kpi label="Terneros al pie" value={fmtNum(terneros.length)} hint={relacion != null ? `${relacion}% ternero / vaca` : undefined} icon={<Baby size={15} />} />
      <Kpi label="Peso prom. terneros" value={fmtKg(prom(terneros.map((t) => t.pesoActualKg)), 0)} hint={`Nacieron con ${fmtKg(prom(terneros.map((t) => t.pesoNacimientoKg)), 0)}`} icon={<Scale size={15} />} />
      <Kpi label="GPD en cría" value={`${fmtNum(prom(terneros.map((t) => t.gpdKg)), 2)} kg`} hint="Desde el nacimiento" icon={<Gauge size={15} />} />
      <Kpi label="Edad promedio" value={`${fmtNum(prom(terneros.map((t) => edadDias(t.fechaNacimiento))))} d`} hint={`Destete a los ${EDAD_DESTETE} d`} icon={<Timer size={15} />} />
      <Kpi label="Listos para destete" value={fmtNum(destete)} hint={`≥ ${EDAD_DESTETE} días o ≥ ${PESO_DESTETE} kg`} icon={<Target size={15} />} tone={destete ? "warn" : "neutral"} />
    </div>
  );
}

function KpisRecria({ ctx, animales, prom }: { ctx: AgroCtx; animales: AgroAnimalFull[]; prom: (xs: (number | null | undefined)[]) => number | null }) {
  const listos = animales.filter((a) => a.pesoObjetivoKg && (a.pesoActualKg ?? 0) >= a.pesoObjetivoKg).length;
  const gpd = prom(animales.map((a) => a.gpdKg));
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <Kpi label="En recría" value={fmtNum(animales.length)} hint="Post destete" icon={<Beef size={15} />} tone="ok" />
      <Kpi label="Peso de entrada" value={fmtKg(prom(animales.map((a) => a.pesoIngresoKg)), 0)} icon={<Scale size={15} />} />
      <Kpi label="Peso actual" value={fmtKg(prom(animales.map((a) => a.pesoActualKg)), 0)} icon={<Scale size={15} />} />
      <Kpi label="GPD promedio" value={`${fmtNum(gpd, 2)} kg`} hint="Recría a pasto + suplemento" icon={<Gauge size={15} />} tone={gpd != null && gpd < 0.5 ? "warn" : "neutral"} />
      <Kpi label="Peso objetivo" value={fmtKg(ctx.config.pesoObjetivoRecriaKg, 0)} hint={`≈ ${fmtNum(prom(animales.map((a) => a.diasParaObjetivo)))} días promedio`} icon={<Target size={15} />} />
      <Kpi label="Listos para engorde" value={fmtNum(listos)} hint="Alcanzaron el objetivo" icon={<Timer size={15} />} tone={listos ? "ok" : "neutral"} />
    </div>
  );
}

function FilaAnimal({ a, modo, ctx, onAccion }: { a: AgroAnimalFull; modo: "cria" | "recria" | "reproductor"; ctx: AgroCtx; onAccion: (d: DestinoEtapa) => void }) {
  const destinos = destinosPara(a);
  const principal = destinos[0];
  const edad = edadDias(a.fechaNacimiento);
  const alcanzo = !!a.pesoObjetivoKg && (a.pesoActualKg ?? 0) >= a.pesoObjetivoKg;
  const destete = modo === "cria" && ((edad ?? 0) >= EDAD_DESTETE || (a.pesoActualKg ?? 0) >= PESO_DESTETE);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#07110d] px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold tracking-tight">#{a.codigoInterno}</p>
          <span className="text-[11px] text-white/45">
            {a.categoria}
            {a.raza ? ` · ${a.raza}` : ""}
          </span>
          <span className="text-[11px] font-semibold text-emerald-400/90">{a.loteCodigo || "sin lote"}</span>
          {a.estado === "Tratamiento" ? <Pill tone="warn">Tratamiento</Pill> : null}
          {a.estado === "FueraZona" ? <Pill tone="danger">Fuera de zona</Pill> : null}
          {a.retiroSanitarioHasta ? <Pill tone="warn">Retiro</Pill> : null}
          {destete ? <Pill tone="info">Destete</Pill> : null}
          {modo === "recria" && alcanzo ? <Pill tone="ok">Objetivo</Pill> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[12px] text-white/45">
          {modo === "cria" ? (
            <>
              <span>{edad != null ? `${edad} días` : "—"}</span>
              <span>Madre #{a.madreCodigo ?? "—"}</span>
              {a.padreCodigo ? <span>Padre {a.padreCodigo}</span> : null}
              <span>Nac. {fmtKg(a.pesoNacimientoKg, 0)}</span>
            </>
          ) : modo === "reproductor" ? (
            <>
              <span>{edad != null ? `${(edad / 365).toFixed(1)} años` : "—"}</span>
            </>
          ) : (
            <>
              <span>Entrada {fmtKg(a.pesoIngresoKg, 0)}</span>
              <span>Objetivo {fmtKg(a.pesoObjetivoKg, 0)}</span>
              {a.diasParaObjetivo ? <span>≈ {a.diasParaObjetivo} días</span> : null}
            </>
          )}
          <span className="text-white/85">Actual {fmtKg(a.pesoActualKg, 0)}</span>
          {modo !== "reproductor" && a.gpdKg != null ? <span>GPD {fmtNum(a.gpdKg, 2)}</span> : null}
        </div>
        {modo === "recria" ? (
          <div className="mt-2 max-w-sm">
            <Progreso actual={a.pesoActualKg} objetivo={a.pesoObjetivoKg} inicio={a.pesoIngresoKg} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {ctx.tiene("TRACE") ? (
          <Button size="sm" className={BTN_GHOST} onClick={() => ctx.irA("trazabilidad", { animalId: a.animalId })}>
            <ScanLine size={13} /> Ficha
          </Button>
        ) : null}
        {principal ? (
          <Button size="sm" className={`${BTN_GHOST} ${destete || alcanzo ? "bg-emerald-600/80 border-emerald-500/40" : ""}`} onClick={() => onAccion(principal)}>
            {modo === "cria" ? "Destetar" : modo === "recria" ? "A engorde" : "Salida"}
          </Button>
        ) : null}
        {destinos.length > 1 ? (
          <select
            className="h-9 rounded-xl bg-white/[0.06] border border-white/10 text-[12px] text-white/70 px-2"
            value=""
            onChange={(e) => {
              const d = destinos.find((x) => x.etapa === e.target.value);
              if (d) onAccion(d);
            }}
            aria-label="Otras acciones"
          >
            <option value="">Más…</option>
            {destinos.slice(1).map((d) => (
              <option key={d.etapa} value={d.etapa}>
                {d.titulo}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}

function AltaNacimiento({ ctx, reproductores }: { ctx: AgroCtx; reproductores: AgroAnimalFull[] }) {
  const lotesCria = ctx.lotes.filter((l) => l.etapa === "Cria");
  const [f, setF] = useState({ codigo: "", sexo: "M", madre: "", padre: "", peso: "", loteId: String(lotesCria[0]?.loteId ?? "") });
  const vacas = reproductores.filter((r) => r.sexo === "H");
  const toros = reproductores.filter((r) => r.sexo !== "H");

  const guardar = async () => {
    if (!f.codigo.trim()) return void toast.error("Caravana / código obligatorio");
    const hoy = new Date().toISOString().slice(0, 10);
    const peso = f.peso ? Number(f.peso) : null;
    try {
      await agroCrearAnimal({
        empresaId: ctx.empresaId,
        establecimientoId: ctx.lotes[0]?.establecimientoId ?? reproductores[0]?.establecimientoId,
        codigoInterno: f.codigo.trim(),
        categoria: f.sexo === "H" ? "Ternera" : "Ternero",
        sexo: f.sexo,
        loteId: f.loteId ? Number(f.loteId) : null,
        fechaIngreso: hoy,
        fechaNacimiento: hoy,
        pesoNacimientoKg: peso,
        pesoIngresoKg: peso,
        pesoActualKg: peso,
        madreCodigo: f.madre || null,
        padreCodigo: f.padre || null,
        rfidTag: `RFID-${f.codigo.trim()}`,
        estado: "Activo",
        etapa: "Cria",
      });
      toast.success(`Nacimiento registrado · #${f.codigo}`, { description: "Se generó su ficha individual de trazabilidad." });
      setF({ ...f, codigo: "", peso: "" });
      ctx.refrescar();
    } catch (e: unknown) {
      toast.error("No se pudo registrar", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Section title="Registrar nacimiento" icon={<Baby size={15} />}>
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="Caravana *" className={FIELD} />
          <select value={f.sexo} onChange={(e) => setF({ ...f, sexo: e.target.value })} className={SELECT}>
            <option value="M">Macho</option>
            <option value="H">Hembra</option>
          </select>
        </div>
        <select value={f.madre} onChange={(e) => setF({ ...f, madre: e.target.value })} className={SELECT}>
          <option value="">Madre</option>
          {vacas.map((v) => (
            <option key={v.animalId} value={v.codigoInterno}>
              #{v.codigoInterno} {v.raza ? `· ${v.raza}` : ""}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2.5">
          <select value={f.padre} onChange={(e) => setF({ ...f, padre: e.target.value })} className={SELECT}>
            <option value="">Padre / semen</option>
            {toros.map((t) => (
              <option key={t.animalId} value={t.codigoInterno}>
                {t.codigoInterno}
              </option>
            ))}
          </select>
          <Input type="number" inputMode="decimal" value={f.peso} onChange={(e) => setF({ ...f, peso: e.target.value })} placeholder="Peso al nacer" className={FIELD} />
        </div>
        <select value={f.loteId} onChange={(e) => setF({ ...f, loteId: e.target.value })} className={SELECT}>
          <option value="">Sin lote</option>
          {ctx.lotes.map((l) => (
            <option key={l.loteId} value={l.loteId}>
              {l.codigo} · {l.nombre}
            </option>
          ))}
        </select>
        <Button className={`${BTN_PRIMARY} w-full`} onClick={() => void guardar()}>
          <Plus size={14} /> Registrar nacimiento
        </Button>
      </div>
    </Section>
  );
}

function AltaRecria({ ctx }: { ctx: AgroCtx }) {
  const lotesRecria = ctx.lotes.filter((l) => l.etapa === "Recria");
  const [f, setF] = useState({ codigo: "", categoria: "Novillito", sexo: "M", peso: "", loteId: String(lotesRecria[0]?.loteId ?? "") });

  const guardar = async () => {
    if (!f.codigo.trim() || !f.peso) return void toast.error("Código y peso de entrada obligatorios");
    try {
      await agroCrearAnimal({
        empresaId: ctx.empresaId,
        establecimientoId: ctx.lotes[0]?.establecimientoId,
        codigoInterno: f.codigo.trim(),
        categoria: f.categoria,
        sexo: f.sexo,
        loteId: f.loteId ? Number(f.loteId) : null,
        fechaIngreso: new Date().toISOString().slice(0, 10),
        pesoIngresoKg: Number(f.peso),
        pesoActualKg: Number(f.peso),
        rfidTag: `RFID-${f.codigo.trim()}`,
        estado: "Activo",
        etapa: "Recria",
      });
      toast.success(`Ingreso a recría · #${f.codigo}`);
      setF({ ...f, codigo: "", peso: "" });
      ctx.refrescar();
    } catch (e: unknown) {
      toast.error("No se pudo registrar", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Section title="Ingreso a recría (compra)" icon={<Plus size={15} />}>
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="Caravana *" className={FIELD} />
          <Input type="number" inputMode="decimal" value={f.peso} onChange={(e) => setF({ ...f, peso: e.target.value })} placeholder="Peso entrada *" className={FIELD} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <select
            value={f.categoria}
            onChange={(e) => setF({ ...f, categoria: e.target.value, sexo: e.target.value === "Vaquilla" ? "H" : "M" })}
            className={SELECT}
          >
            <option>Novillito</option>
            <option>Vaquilla</option>
            <option>Torito</option>
          </select>
          <select value={f.loteId} onChange={(e) => setF({ ...f, loteId: e.target.value })} className={SELECT}>
            <option value="">Sin lote</option>
            {ctx.lotes.map((l) => (
              <option key={l.loteId} value={l.loteId}>
                {l.codigo}
              </option>
            ))}
          </select>
        </div>
        <Button className={`${BTN_PRIMARY} w-full`} onClick={() => void guardar()}>
          <Plus size={14} /> Registrar ingreso
        </Button>
        <p className="text-[11px] text-white/35">Objetivo de recría: {fmtKg(ctx.config.pesoObjetivoRecriaKg, 0)} (configurable en Mi operación).</p>
      </div>
    </Section>
  );
}
