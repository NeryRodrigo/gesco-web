"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Beef, Scale, Gauge, Repeat, BadgeDollarSign, AlertTriangle, LineChart as LineIcon, Fence, Wheat, Syringe,
  Wallet, Radio, Activity, CheckCircle2, Plus, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  agroAnimalesFull,
  agroAplicarSanidad,
  agroFeed,
  agroRegistrarPesaje,
  agroRegistrarRacion,
  agroResolverAlerta,
  type AgroAnimalFull,
  type AgroAtencion,
  type AgroFeed,
} from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import {
  AtencionList, BarChart, BTN_GHOST, BTN_PRIMARY, CARD, FIELD, Kpi, LineChart, Occupancy, Pill, SELECT, Section,
  fmtFecha, fmtGs, fmtKg, fmtNum, hace,
} from "./ui";

export default function FeedView({ ctx, onNombre }: { ctx: AgroCtx; onNombre: (s: string) => void }) {
  const [d, setD] = useState<AgroFeed | null>(null);
  const [animales, setAnimales] = useState<AgroAnimalFull[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([agroFeed(ctx.empresaId), agroAnimalesFull(ctx.empresaId, "Engorde").catch(() => [])])
      .then(([f, a]) => {
        if (!vivo) return;
        setD(f);
        setAnimales(a);
        onNombre([f.clienteNombre, f.nombre, f.ubicacion].filter(Boolean).join(" · "));
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version, onNombre]);

  if (error) return <p className="text-sm text-white/45">No se pudo cargar el dashboard de confinamiento.</p>;
  if (!d) return <div className="h-96 rounded-2xl bg-white/[0.04] animate-pulse" />;

  const ocupacion = d.capacidadTotal ? Math.round((d.cabezasActivas / d.capacidadTotal) * 100) : null;
  const convTone = d.conversionEstimada == null ? "neutral" : d.conversionEstimada <= 8 ? "ok" : d.conversionEstimada <= 9.5 ? "neutral" : "warn";

  const accion = (a: AgroAtencion) => {
    if (a.alertaId)
      return (
        <Button
          size="sm"
          className={BTN_GHOST}
          onClick={async () => {
            await agroResolverAlerta(ctx.empresaId, a.alertaId!);
            toast.success("Alerta resuelta");
            ctx.refrescar();
          }}
        >
          <CheckCircle2 size={13} /> Resolver
        </Button>
      );
    if (a.sanidadId)
      return (
        <Button
          size="sm"
          className={BTN_GHOST}
          onClick={async () => {
            await agroAplicarSanidad(ctx.empresaId, a.sanidadId!);
            toast.success("Registrado como aplicado");
            ctx.refrescar();
          }}
        >
          <Syringe size={13} /> Marcar aplicada
        </Button>
      );
    if (a.animalId && ctx.tiene("TRACE"))
      return (
        <Button size="sm" className={BTN_GHOST} onClick={() => ctx.irA("trazabilidad", { animalId: a.animalId! })}>
          Ficha <ArrowRight size={13} />
        </Button>
      );
    return null;
  };

  return (
    <div className="space-y-5">
      {/* 1. Línea de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi
          label="Cabezas activas"
          value={fmtNum(d.cabezasActivas)}
          hint={ocupacion != null ? `${ocupacion}% de ${fmtNum(d.capacidadTotal)} lugares` : undefined}
          icon={<Beef size={15} />}
          tone="ok"
        />
        <Kpi
          label="Peso promedio"
          value={fmtKg(d.pesoPromedioKg, 0)}
          hint={d.pesoIngresoPromedioKg ? `Ingresaron con ${fmtKg(d.pesoIngresoPromedioKg, 0)}` : undefined}
          icon={<Scale size={15} />}
        />
        <Kpi
          label="GPD promedio"
          value={d.gpdPromedioKg != null ? `${fmtNum(d.gpdPromedioKg, 2)} kg` : "—"}
          hint={`Ganancia diaria · mínimo ${fmtNum(d.gpdMinimoKg, 2)}`}
          icon={<Gauge size={15} />}
          tone={d.gpdPromedioKg != null && d.gpdPromedioKg < d.gpdMinimoKg ? "warn" : "ok"}
        />
        <Kpi
          label="Conversión"
          value={d.conversionEstimada != null ? `${fmtNum(d.conversionEstimada, 1)} : 1` : "—"}
          hint="Kg de alimento por kg ganado (30 d)"
          icon={<Repeat size={15} />}
          tone={convTone}
        />
        <Kpi
          label="Listos para venta"
          value={fmtNum(d.listosParaVenta)}
          hint={d.listosParaVenta ? `${fmtKg(d.economia.kgListos, 0)} · ${fmtGs(d.economia.valorListosGs, true)}` : `Objetivo ${fmtKg(d.pesoObjetivoKg, 0)}`}
          icon={<BadgeDollarSign size={15} />}
          tone={d.listosParaVenta ? "ok" : "neutral"}
        />
        <Kpi
          label="Alertas"
          value={fmtNum(d.atencion.length)}
          hint={`${d.atencion.filter((a) => a.prioridad === "Alta").length} de prioridad alta`}
          icon={<AlertTriangle size={15} />}
          tone={d.atencion.some((a) => a.prioridad === "Alta") ? "danger" : d.atencion.length ? "warn" : "neutral"}
        />
      </div>

      {/* 2. Qué requiere atención hoy + carga rápida en campo */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Section
          title="Qué requiere atención hoy"
          icon={<AlertTriangle size={15} />}
          className="lg:col-span-3"
          right={<span className="text-[11px] text-white/35">{d.atencion.length} ítems</span>}
        >
          <AtencionList items={d.atencion} onAccion={accion} vacio="Sin pendientes. El confinamiento está en orden." />
        </Section>
        <CargaRapida ctx={ctx} animales={animales} d={d} className="lg:col-span-2" />
      </div>

      {/* 3. Producción y evolución de peso */}
      <Section
        title="Producción y evolución de peso"
        icon={<LineIcon size={15} />}
        right={<span className="text-[11px] text-white/35">Promedio semanal · últimas 10 semanas</span>}
      >
        <div className="grid lg:grid-cols-4 gap-4 items-start">
          <div className="lg:col-span-3">
            <LineChart
              points={d.evolucionPeso.map((p) => ({ x: p.fecha, y: p.pesoPromedioKg, extra: `${p.animales} cab.` }))}
              referencia={d.pesoObjetivoKg}
              referenciaLabel={`Objetivo de faena ${fmtNum(d.pesoObjetivoKg)} kg`}
            />
          </div>
          <dl className="grid grid-cols-2 lg:grid-cols-1 gap-3 text-sm">
            <Dato label="Peso de ingreso" value={fmtKg(d.pesoIngresoPromedioKg, 0)} />
            <Dato label="Peso actual" value={fmtKg(d.pesoPromedioKg, 0)} />
            <Dato
              label="Falta al objetivo"
              value={d.pesoPromedioKg != null ? fmtKg(Math.max(0, d.pesoObjetivoKg - d.pesoPromedioKg), 0) : "—"}
              hint={
                d.pesoPromedioKg != null && d.gpdPromedioKg
                  ? `≈ ${fmtNum(Math.max(0, (d.pesoObjetivoKg - d.pesoPromedioKg) / d.gpdPromedioKg))} días al ritmo actual`
                  : undefined
              }
            />
            <Dato label="Días promedio en corral" value={d.diasPromedioEnCorral != null ? `${d.diasPromedioEnCorral} d` : "—"} />
          </dl>
        </div>
      </Section>

      {/* 4. Rendimiento por lote / corral */}
      <Section title="Rendimiento por lote / corral" icon={<Fence size={15} />}>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {d.lotes.map((l) => (
            <div key={l.loteId} className="rounded-xl border border-white/[0.06] bg-[#07110d] p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">{l.codigo} · {l.tipo}</p>
                  <p className="text-sm font-medium">{l.nombre}</p>
                </div>
                <Pill tone={l.rendimiento === "Bajo" ? "danger" : l.rendimiento === "Atencion" ? "warn" : "ok"}>
                  {l.rendimiento === "Optimo" ? "Óptimo" : l.rendimiento === "Atencion" ? "Atención" : "Bajo"}
                </Pill>
              </div>
              <Occupancy current={l.animales} max={l.capacidad} />
              <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <Mini label="Peso prom." value={fmtKg(l.pesoPromedioKg, 0)} />
                <Mini label="GPD" value={l.gpdPromedioKg != null ? `${fmtNum(l.gpdPromedioKg, 2)}` : "—"} warn={l.gpdPromedioKg != null && l.gpdPromedioKg < d.gpdMinimoKg} />
                <Mini label="Conversión" value={l.conversion != null ? `${fmtNum(l.conversion, 1)}:1` : "—"} warn={l.conversion != null && l.conversion > 9.5} />
                <Mini label="Kg/cab/día" value={fmtNum(l.kgCabDia, 1)} />
                <Mini label="Días prom." value={l.diasPromedio != null ? `${l.diasPromedio}` : "—"} />
                <Mini label="Listos" value={fmtNum(l.listosParaVenta)} />
              </dl>
              <p className="mt-3 text-[11px] text-white/35">
                Última ración {l.ultimaRacion ? hace(l.ultimaRacion) : "sin registro"}
                {l.costoKgProducidoGs ? ` · costo ${fmtGs(l.costoKgProducidoGs)}/kg producido` : ""}
              </p>
            </div>
          ))}
          {!d.lotes.length && <p className="text-sm text-white/40">Sin corrales de engorde. Asigná la etapa “Engorde” a tus lotes.</p>}
        </div>
      </Section>

      {/* 5. Alimentación y conversión */}
      <Section title="Alimentación y conversión" icon={<Wheat size={15} />} right={<span className="text-[11px] text-white/35">Kg entregados por día · 14 días</span>}>
        <div className="grid lg:grid-cols-4 gap-4 items-start">
          <div className="lg:col-span-3">
            <BarChart points={d.alimentacionDiaria.map((p) => ({ x: p.fecha, y: p.kg, extra: fmtGs(p.costoGs) }))} />
          </div>
          <dl className="grid grid-cols-2 lg:grid-cols-1 gap-3 text-sm">
            <Dato label="Alimento 7 días" value={fmtKg(d.alimentoKg7d, 0)} />
            <Dato label="Consumo por cabeza" value={d.kgCabDia != null ? `${fmtNum(d.kgCabDia, 1)} kg/día` : "—"} />
            <Dato label="Conversión 30 d" value={d.conversionEstimada != null ? `${fmtNum(d.conversionEstimada, 2)} : 1` : "—"} />
            <Dato label="Costo diario" value={fmtGs(d.economia.costoDiarioGs)} hint={d.economia.costoCabDiaGs ? `${fmtGs(d.economia.costoCabDiaGs)} por cabeza` : undefined} />
          </dl>
        </div>
      </Section>

      {/* 6. Sanidad */}
      <Section
        title="Sanidad del confinamiento"
        icon={<Syringe size={15} />}
        right={
          ctx.tiene("HEALTH") ? (
            <Button size="sm" className={BTN_GHOST} onClick={() => ctx.irA("sanidad")}>
              Ver sanidad <ArrowRight size={13} />
            </Button>
          ) : null
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Mini2 label="Programadas" value={d.sanidad.programadas} />
          <Mini2 label="Vencidas" value={d.sanidad.vencidas} tone={d.sanidad.vencidas ? "danger" : undefined} />
          <Mini2 label="Aplicadas 30 d" value={d.sanidad.aplicadasMes} />
          <Mini2 label="En tratamiento" value={d.sanidad.animalesEnTratamiento} tone={d.sanidad.animalesEnTratamiento ? "warn" : undefined} />
          <Mini2 label="En retiro (no faenar)" value={d.sanidad.animalesEnRetiro} tone={d.sanidad.animalesEnRetiro ? "warn" : undefined} />
        </div>
        {d.sanidad.proximas.length ? (
          <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.05]">
            {d.sanidad.proximas.map((s) => (
              <div key={s.sanidadId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{s.producto}</p>
                  <p className="text-[11px] text-white/40">
                    {s.tipo} · {s.loteCodigo ? `lote ${s.loteCodigo} (${s.animalesAlcanzados} cab.)` : `#${s.animalCodigo}`}
                  </p>
                </div>
                <Pill tone={s.vencida ? "danger" : "info"}>{s.vencida ? "Vencida" : fmtFecha(s.fechaProgramada)}</Pill>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40">Sin aplicaciones programadas.</p>
        )}
      </Section>

      {/* 7. Proyección económica + Dispositivos + Actividad reciente */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Section title="Proyección económica" icon={<Wallet size={15} />}>
          <dl className="space-y-2.5 text-sm">
            <Fila label="Kg producidos (30 d)" value={fmtKg(d.economia.kgProducidos30d, 0)} />
            <Fila label="Costo de alimento (30 d)" value={fmtGs(d.economia.costoAlimento30dGs)} />
            <Fila label="Costo por kg producido" value={fmtGs(d.economia.costoKgProducidoGs)} />
            <Fila label="Precio kg vivo" value={fmtGs(d.economia.precioKgGs)} />
            <Fila
              label="Margen por kg"
              value={fmtGs(d.economia.margenKgGs)}
              tone={d.economia.margenKgGs == null ? undefined : d.economia.margenKgGs >= 0 ? "ok" : "danger"}
            />
            <div className="border-t border-white/[0.06] pt-2.5" />
            <Fila label="Valor del stock en pie" value={fmtGs(d.economia.valorStockGs, true)} />
            <Fila label="Valor de los listos para venta" value={fmtGs(d.economia.valorListosGs, true)} tone="ok" />
          </dl>
          {d.economia.margenKgGs != null && d.economia.margenKgGs < 0 ? (
            <p className="mt-3 text-[11px] text-rose-300/90">Estás produciendo cada kg más caro de lo que lo vendés: revisá dieta y conversión.</p>
          ) : null}
        </Section>

        <Section
          title="Dispositivos"
          icon={<Radio size={15} />}
          right={
            ctx.tiene("CONNECT") ? (
              <Button size="sm" className={BTN_GHOST} onClick={() => ctx.irA("dispositivos")}>
                Ver <ArrowRight size={13} />
              </Button>
            ) : null
          }
        >
          {d.dispositivos.total ? (
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <p className="text-3xl font-semibold tabular-nums">{d.dispositivos.online}</p>
                <p className="text-sm text-white/45 pb-1">de {d.dispositivos.total} online</p>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${(d.dispositivos.online / d.dispositivos.total) * 100}%` }} />
              </div>
              <dl className="space-y-2 text-sm">
                <Fila label="Con alerta / sin señal" value={fmtNum(d.dispositivos.alerta)} tone={d.dispositivos.alerta ? "warn" : undefined} />
                <Fila label="Batería baja" value={fmtNum(d.dispositivos.bateriaBaja)} tone={d.dispositivos.bateriaBaja ? "warn" : undefined} />
              </dl>
            </div>
          ) : (
            <p className="text-sm text-white/40">Sin hardware conectado. Collares, RFID y balanzas se suman con VORDIA Connect.</p>
          )}
        </Section>

        <Section title="Actividad reciente" icon={<Activity size={15} />}>
          <ol className="space-y-3">
            {d.actividad.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${a.tipo === "Alerta" ? "bg-amber-400" : a.tipo === "Sanidad" ? "bg-sky-400" : "bg-emerald-400"}`} />
                <div className="min-w-0">
                  <p className="text-[13px] text-white/90 leading-snug">{a.titulo}</p>
                  <p className="text-[11px] text-white/35">
                    {hace(a.fecha)}
                    {a.detalle ? ` · ${a.detalle}` : ""}
                  </p>
                </div>
              </li>
            ))}
            {!d.actividad.length && <p className="text-sm text-white/40">Sin movimientos recientes.</p>}
          </ol>
        </Section>
      </div>
    </div>
  );
}

/* Carga rápida en campo: pesaje y entrega de ración desde el celular */
function CargaRapida({ ctx, animales, d, className = "" }: { ctx: AgroCtx; animales: AgroAnimalFull[]; d: AgroFeed; className?: string }) {
  const [modo, setModo] = useState<"pesaje" | "racion">("pesaje");
  const [codigo, setCodigo] = useState("");
  const [peso, setPeso] = useState("");
  const [operario, setOperario] = useState("");
  const [loteId, setLoteId] = useState("");
  const [tipo, setTipo] = useState("TMR engorde");
  const [kg, setKg] = useState("");
  const [guardando, setGuardando] = useState(false);

  const animal = useMemo(() => {
    const c = codigo.trim().replace(/^#/, "").toLowerCase();
    if (!c) return null;
    return animales.find((a) => a.codigoInterno.toLowerCase() === c || (a.rfidTag || "").toLowerCase() === c) ?? null;
  }, [codigo, animales]);

  const loteSel = d.lotes.find((l) => String(l.loteId) === loteId);
  const sugerido = loteSel?.animales && d.kgCabDia ? Math.round(loteSel.animales * d.kgCabDia) : null;

  const guardar = async () => {
    try {
      setGuardando(true);
      if (modo === "pesaje") {
        if (!animal || !peso) return void toast.error("Ingresá un animal válido (código o RFID) y el peso");
        await agroRegistrarPesaje({ empresaId: ctx.empresaId, animalId: animal.animalId, pesoKg: Number(peso), origen: "Manual", operario: operario || undefined });
        const dif = animal.pesoActualKg ? Number(peso) - animal.pesoActualKg : null;
        toast.success(`Pesaje #${animal.codigoInterno}: ${peso} kg`, { description: dif != null ? `${dif >= 0 ? "+" : ""}${fmtNum(dif, 1)} kg vs. último pesaje` : undefined });
        setCodigo("");
        setPeso("");
      } else {
        if (!loteId || !kg) return void toast.error("Elegí el corral y los kg entregados");
        await agroRegistrarRacion({
          empresaId: ctx.empresaId,
          loteId: Number(loteId),
          tipoAlimento: tipo,
          cantidadKg: Number(kg),
          operario: operario || undefined,
          costoGs: Math.round(Number(kg) * ctx.config.costoRacionKgGs),
        });
        toast.success(`Ración registrada · ${loteSel?.codigo}`, { description: `${fmtNum(Number(kg))} kg de ${tipo}` });
        setKg("");
      }
      ctx.refrescar();
    } catch (e: unknown) {
      toast.error("No se pudo guardar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className={`${CARD} p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold">Carga en campo</h2>
        <div className="inline-flex p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
          {(["pesaje", "racion"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${modo === m ? "bg-emerald-600 text-white" : "text-white/50"}`}
            >
              {m === "pesaje" ? "Pesaje" : "Ración"}
            </button>
          ))}
        </div>
      </div>

      {modo === "pesaje" ? (
        <div className="space-y-2.5">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Caravana / código o RFID" className={FIELD} list="agro-feed-animales" inputMode="search" />
          <datalist id="agro-feed-animales">
            {animales.slice(0, 300).map((a) => (
              <option key={a.animalId} value={a.codigoInterno}>{`${a.loteCodigo ?? ""} · ${fmtKg(a.pesoActualKg, 0)}`}</option>
            ))}
          </datalist>
          {animal ? (
            <p className="text-[12px] text-white/50">
              #{animal.codigoInterno} · {animal.loteCodigo} · último {fmtKg(animal.pesoActualKg)} · GPD {fmtNum(animal.gpdKg, 2)} · objetivo {fmtKg(animal.pesoObjetivoKg, 0)}
            </p>
          ) : codigo ? (
            <p className="text-[12px] text-amber-300/80">No se encontró en engorde.</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2.5">
            <Input type="number" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Peso kg" className={FIELD} />
            <Input value={operario} onChange={(e) => setOperario(e.target.value)} placeholder="Operario" className={FIELD} />
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <select value={loteId} onChange={(e) => setLoteId(e.target.value)} className={SELECT}>
            <option value="">Corral</option>
            {d.lotes.map((l) => (
              <option key={l.loteId} value={l.loteId}>
                {l.codigo} · {l.animales} cab.
              </option>
            ))}
          </select>
          <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Tipo de alimento" className={FIELD} />
          <div className="grid grid-cols-2 gap-2.5">
            <Input type="number" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder={sugerido ? `Sugerido ${fmtNum(sugerido)}` : "Kg"} className={FIELD} />
            <Input value={operario} onChange={(e) => setOperario(e.target.value)} placeholder="Operario" className={FIELD} />
          </div>
          {sugerido ? <p className="text-[11px] text-white/40">Sugerido según consumo actual: {fmtNum(d.kgCabDia, 1)} kg/cab/día.</p> : null}
        </div>
      )}

      <Button className={`${BTN_PRIMARY} w-full mt-3`} disabled={guardando} onClick={() => void guardar()}>
        <Plus size={14} /> {modo === "pesaje" ? "Guardar pesaje" : "Registrar entrega"}
      </Button>
    </section>
  );
}

function Dato({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-3">
      <dt className="text-[11px] text-white/45">{label}</dt>
      <dd className="text-base font-semibold tabular-nums mt-0.5">{value}</dd>
      {hint ? <p className="text-[11px] text-white/35 mt-0.5">{hint}</p> : null}
    </div>
  );
}

function Mini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-white/40">{label}</dt>
      <dd className={`font-semibold tabular-nums ${warn ? "text-amber-300" : "text-white/85"}`}>{value}</dd>
    </div>
  );
}

function Mini2({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) {
  const c = tone === "danger" ? "text-rose-300" : tone === "warn" ? "text-amber-300" : "text-white";
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-3">
      <p className="text-[11px] text-white/45">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${c}`}>{fmtNum(value)}</p>
    </div>
  );
}

export function Fila({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "danger" }) {
  const c = tone === "ok" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : tone === "danger" ? "text-rose-300" : "text-white/90";
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white/50">{label}</dt>
      <dd className={`font-semibold tabular-nums text-right ${c}`}>{value}</dd>
    </div>
  );
}
