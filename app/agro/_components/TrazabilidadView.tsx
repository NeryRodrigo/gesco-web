"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, ScanLine, Syringe, GitBranch, History, Scale, Gauge, Target, Timer, ShieldAlert, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroAnimalesFull, agroFicha, agroRegistrarPesaje, type AgroAnimalFull, type AgroFicha } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import CambioEtapaDialog, { destinosPara, type DestinoEtapa } from "./CambioEtapaDialog";
import { BTN_GHOST, BTN_PRIMARY, CARD, CicloStepper, ETAPA_LABEL, Empty, FIELD, Kpi, LineChart, Pill, Section, fmtFecha, fmtKg, fmtNum } from "./ui";

export default function TrazabilidadView({ ctx, animalInicial }: { ctx: AgroCtx; animalInicial?: number }) {
  const [animales, setAnimales] = useState<AgroAnimalFull[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number | undefined>(animalInicial);
  const [ficha, setFicha] = useState<AgroFicha | null>(null);

  useEffect(() => {
    agroAnimalesFull(ctx.empresaId).then(setAnimales).catch(() => setAnimales([]));
  }, [ctx.empresaId, ctx.version]);

  useEffect(() => {
    if (!sel) return;
    let vivo = true;
    agroFicha(ctx.empresaId, sel)
      .then((f) => vivo && setFicha(f))
      .catch(() => vivo && setFicha(null));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, sel, ctx.version]);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^#/, "");
    if (!t) return animales.slice(0, 12);
    return animales.filter((a) => [a.codigoInterno, a.rfidTag, a.collarId, a.madreCodigo].some((v) => (v ?? "").toLowerCase().includes(t))).slice(0, 30);
  }, [q, animales]);

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
      <section className={`${CARD} p-4 lg:sticky lg:top-4`}>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caravana, RFID o collar" className={`${FIELD} pl-9`} autoFocus inputMode="search" />
        </div>
        <p className="text-[11px] text-white/35 mb-2">{q ? `${resultados.length} resultado(s)` : `${animales.length} animales registrados`}</p>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {resultados.map((a) => (
            <button
              key={a.animalId}
              type="button"
              onClick={() => setSel(a.animalId)}
              className={`w-full text-left rounded-xl px-3 py-2.5 border transition ${
                sel === a.animalId ? "border-emerald-400/40 bg-emerald-500/10" : "border-transparent hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">#{a.codigoInterno}</span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400/80">{ETAPA_LABEL[a.etapa] ?? a.etapa}</span>
              </div>
              <p className="text-[11px] text-white/40">
                {a.categoria} · {a.loteCodigo ?? "sin lote"} · {fmtKg(a.pesoActualKg, 0)}
              </p>
            </button>
          ))}
        </div>
      </section>

      <div>
        {!sel ? (
          <Empty>
            <ScanLine className="mx-auto mb-2 text-emerald-400/70" size={22} />
            Escaneá o buscá una caravana para ver la trazabilidad completa del animal.
          </Empty>
        ) : ficha?.animal.animalId !== sel ? (
          <div className="h-96 rounded-2xl bg-white/[0.04] animate-pulse" />
        ) : ficha ? (
          <Ficha ctx={ctx} f={ficha} onIr={setSel} animales={animales} />
        ) : (
          <Empty>No se pudo cargar la ficha.</Empty>
        )}
      </div>
    </div>
  );
}

function Ficha({ ctx, f, onIr, animales }: { ctx: AgroCtx; f: AgroFicha; onIr: (id: number) => void; animales: AgroAnimalFull[] }) {
  const a = f.animal;
  const [dialogo, setDialogo] = useState<DestinoEtapa | null>(null);
  const [peso, setPeso] = useState("");
  const destinos = destinosPara(a);
  const edad = edadDias(a.fechaNacimiento);
  const vacunas = f.sanidad.filter((s) => s.tipo === "Vacuna");
  const idDe = (codigo?: string | null) => animales.find((x) => x.codigoInterno === codigo)?.animalId;

  const guardarPeso = async () => {
    if (!peso) return;
    await agroRegistrarPesaje({ empresaId: ctx.empresaId, animalId: a.animalId, pesoKg: Number(peso), origen: "Manual" });
    toast.success(`Pesaje #${a.codigoInterno}: ${peso} kg`);
    setPeso("");
    ctx.refrescar();
  };

  return (
    <div className="space-y-4">
      <section className={`${CARD} p-4 sm:p-5`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">#{a.codigoInterno}</h2>
              <Pill tone="ok">{ETAPA_LABEL[a.etapa] ?? a.etapa}</Pill>
              {a.estado !== "Activo" ? <Pill tone={a.estado === "Tratamiento" ? "warn" : "danger"}>{a.estado === "FueraZona" ? "Fuera de zona" : a.estado}</Pill> : null}
              {a.listoParaVenta ? <Pill tone="ok">Listo para venta</Pill> : null}
              {a.retiroSanitarioHasta ? <Pill tone="warn">Retiro hasta {fmtFecha(a.retiroSanitarioHasta)}</Pill> : null}
            </div>
            <p className="text-sm text-white/50 mt-1">
              {[a.categoria, a.sexo === "H" ? "Hembra" : a.sexo === "M" ? "Macho" : null, a.raza, a.loteCodigo ? `${a.loteCodigo}${f.loteNombre ? ` · ${f.loteNombre}` : ""}` : "sin lote"]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-[11px] text-white/35 mt-1">
              {[a.rfidTag ? `RFID ${a.rfidTag}` : null, a.collarId ? `Collar ${a.collarId}` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {destinos.map((d) => (
              <Button key={d.etapa} size="sm" className={BTN_GHOST} onClick={() => setDialogo(d)}>
                {d.titulo.split(" (")[0]}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <CicloStepper etapa={a.etapa} />
        </div>
      </section>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <Kpi label="Peso actual" value={fmtKg(a.pesoActualKg, 0)} hint={a.pesoIngresoKg ? `Ingreso a la etapa ${fmtKg(a.pesoIngresoKg, 0)}` : undefined} icon={<Scale size={15} />} tone="ok" />
        <Kpi label="GPD" value={a.gpdKg != null ? `${fmtNum(a.gpdKg, 2)} kg` : "—"} hint={a.diasEnEstablecimiento ? `${a.diasEnEstablecimiento} días en la etapa` : undefined} icon={<Gauge size={15} />} tone={a.gpdKg != null && a.gpdKg < ctx.config.gpdMinimoKg && a.etapa === "Engorde" ? "warn" : "neutral"} />
        <Kpi label="Peso objetivo" value={fmtKg(a.pesoObjetivoKg, 0)} hint={a.diasParaObjetivo ? `≈ ${a.diasParaObjetivo} días` : a.listoParaVenta ? "Alcanzado" : undefined} icon={<Target size={15} />} />
        <Kpi label="Edad" value={edad != null ? (edad > 730 ? `${(edad / 365).toFixed(1)} años` : `${edad} días`) : "—"} hint={a.fechaNacimiento ? `Nació ${fmtFecha(a.fechaNacimiento)}` : "Sin fecha de nacimiento"} icon={<Timer size={15} />} />
        <Kpi
          label="Vacunas registradas"
          value={fmtNum(vacunas.filter((v) => v.estado === "Aplicada").length)}
          hint={vacunas.some((v) => v.estado === "Programada") ? `${vacunas.filter((v) => v.estado === "Programada").length} pendiente(s)` : "Sin pendientes"}
          icon={<Syringe size={15} />}
          tone={vacunas.some((v) => v.vencida) ? "danger" : "neutral"}
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        <Section title="Evolución de peso" icon={<Scale size={15} />} className="xl:col-span-2">
          <LineChart
            points={f.pesajes.map((p) => ({ x: p.fechaPesaje, y: p.pesoKg, extra: p.origen }))}
            referencia={a.pesoObjetivoKg ?? undefined}
          />
          <div className="mt-3 flex gap-2">
            <Input type="number" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Nuevo pesaje kg" className={`${FIELD} h-10`} />
            <Button className={`${BTN_PRIMARY} h-10`} onClick={() => void guardarPeso()}>
              <Plus size={14} /> Pesar
            </Button>
          </div>
        </Section>

        <Section title="Genealogía" icon={<GitBranch size={15} />}>
          <dl className="space-y-2.5 text-sm">
            <Link label="Madre" codigo={a.madreCodigo} id={idDe(a.madreCodigo)} onIr={onIr} />
            <Link label="Padre / semen" codigo={a.padreCodigo} id={idDe(a.padreCodigo)} onIr={onIr} />
            <Fila label="Peso al nacer" value={fmtKg(a.pesoNacimientoKg, 0)} />
          </dl>
          {f.crias.length ? (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Crías ({f.crias.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {f.crias.map((c) => (
                  <button key={c} type="button" onClick={() => idDe(c) && onIr(idDe(c)!)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[12px] hover:border-emerald-400/40">
                    #{c}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Section>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <Section title="Historial sanitario" icon={<Syringe size={15} />}>
          {f.sanidad.length ? (
            <div className="space-y-2">
              {f.sanidad.map((s) => (
                <div key={s.sanidadId} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.producto}</p>
                    <p className="text-[11px] text-white/40">
                      {s.tipo} · {s.loteCodigo ? `campaña lote ${s.loteCodigo}` : "individual"}
                      {s.responsable ? ` · ${s.responsable}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <Pill tone={s.estado === "Aplicada" ? "ok" : s.vencida ? "danger" : "info"}>
                      {s.estado === "Aplicada" ? `Aplicada ${fmtFecha(s.fechaAplicacion)}` : s.vencida ? "Vencida" : `Prog. ${fmtFecha(s.fechaProgramada)}`}
                    </Pill>
                    {s.retiroHasta ? <p className="text-[10px] text-amber-300/80 flex items-center gap-1 justify-end"><ShieldAlert size={10} /> retiro {fmtFecha(s.retiroHasta)}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">Sin registros sanitarios. Cargá vacunas y tratamientos desde Sanidad.</p>
          )}
        </Section>

        <Section title="Línea de vida" icon={<History size={15} />}>
          <ol className="relative border-l border-white/10 ml-1.5 space-y-3">
            {f.eventos.map((e, i) => (
              <li key={i} className="ml-4">
                <span
                  className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b1511] ${
                    e.tipo === "Alerta" ? "bg-amber-400" : e.tipo === "Sanidad" ? "bg-sky-400" : e.tipo === "Etapa" ? "bg-emerald-300" : "bg-emerald-500"
                  }`}
                />
                <p className="text-[13px] text-white/90">{e.titulo}</p>
                <p className="text-[11px] text-white/35">
                  {fmtFecha(e.fecha)}
                  {e.detalle ? ` · ${e.detalle}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {a.notas ? (
        <section className={`${CARD} p-4`}>
          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Notas</p>
          <p className="text-[12px] text-white/60 whitespace-pre-line">{a.notas}</p>
        </section>
      ) : null}

      {dialogo ? <CambioEtapaDialog ctx={ctx} animal={a} destino={dialogo} onClose={() => setDialogo(null)} /> : null}
    </div>
  );
}

function edadDias(iso?: string | null) {
  return iso ? Math.round((Date.now() - new Date(iso).getTime()) / 86400000) : null;
}

function Link({ label, codigo, id, onIr }: { label: string; codigo?: string | null; id?: number; onIr: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white/50">{label}</dt>
      <dd>
        {codigo ? (
          id ? (
            <button type="button" onClick={() => onIr(id)} className="font-semibold text-emerald-300 hover:underline">
              #{codigo}
            </button>
          ) : (
            <span className="font-semibold">{codigo}</span>
          )
        ) : (
          <span className="text-white/35">—</span>
        )}
      </dd>
    </div>
  );
}

function Fila({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white/50">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
