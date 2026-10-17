"use client";

import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import {
  Beef, MapPin, RefreshCw, AlertTriangle, ChevronRight, Sprout, Syringe, LineChart as LineIcon, TrendingUp, CalendarClock,
  Fence, Wheat, ShieldPlus, Wallet, ScanLine, Wifi, Activity, Package, Radio, ArrowUpRight, ArrowDownRight, Sun, Cloud,
  CloudRain, CloudLightning, CloudFog, CloudSun, Gauge, Scale,
} from "lucide-react";
import { agroPrincipal, type AgroAtencion, type AgroEtapa, type AgroPrincipal } from "@/lib/agroApi";
import type { AgroCtx, VistaAgro } from "./context";
import { BarChart, LineChart, fmtGs, fmtNum } from "./ui";

/* ───────────── Estilo del dashboard ───────────── */

const PANEL = "rounded-2xl border border-white/[0.07] bg-[#0b1713]/90";
const TILE = "rounded-xl border border-white/[0.07] bg-[#0e1c17] px-3.5 py-3";

export function sistemaLabel(s: string) {
  return { Cria: "Cría", Recria: "Recría", Engorde: "Engorde a pasto", Confinamiento: "Confinamiento / Feedlot", CicloCompleto: "Ciclo completo" }[s] ?? s;
}

function Panel({ titulo, icon, accion, children, className = "" }: { titulo: ReactNode; icon: ReactNode; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${PANEL} p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
          <span className="text-emerald-400">{icon}</span>
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

function VerTodo({ label = "Ver todo", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:text-white hover:border-emerald-400/40">
      {label} <ChevronRight size={12} />
    </button>
  );
}

/* ───────────── Clima (Open-Meteo, sin clave) ───────────── */

type Clima = { temp: number; codigo: number };

function iconoClima(codigo: number) {
  if (codigo === 0) return <Sun size={30} className="text-amber-300" />;
  if (codigo <= 2) return <CloudSun size={30} className="text-amber-200" />;
  if (codigo === 3) return <Cloud size={30} className="text-slate-300" />;
  if (codigo === 45 || codigo === 48) return <CloudFog size={30} className="text-slate-300" />;
  if (codigo >= 95) return <CloudLightning size={30} className="text-amber-200" />;
  return <CloudRain size={30} className="text-sky-300" />;
}

function useClima(lat?: number | null, lng?: number | null) {
  const [clima, setClima] = useState<Clima | null>(null);
  useEffect(() => {
    if (lat == null || lng == null) return;
    let vivo = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d?.current) setClima({ temp: Math.round(d.current.temperature_2m), codigo: d.current.weather_code });
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [lat, lng]);
  return clima;
}

/* ───────────── Dashboard ───────────── */

export default function DashboardView({ ctx, onActualizar, syncing }: { ctx: AgroCtx; onActualizar: () => void; syncing: boolean }) {
  const [d, setD] = useState<AgroPrincipal | null>(null);
  const [dias, setDias] = useState(30);
  const [error, setError] = useState(false);
  const clima = useClima(d?.latitud, d?.longitud);

  useEffect(() => {
    let vivo = true;
    agroPrincipal(ctx.empresaId, dias)
      .then((r) => vivo && setD(r))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version, dias]);

  if (error && !d) return <p className="text-sm text-white/45">No se pudo cargar el dashboard. Revisá la conexión con la API.</p>;
  if (!d) return <Esqueleto />;

  const ej = d.ejecutivo;
  const feed = d.feed;
  const etapa = (e: AgroEtapa) => ej.etapas.find((x) => x.etapa === e)?.animales ?? 0;
  const pct = (n: number) => (ej.totalAnimales ? (n * 100) / ej.totalAnimales : 0);
  const engorde = etapa("Engorde") + etapa("Terminado");
  const criticas = ej.atencion.filter((a) => a.prioridad === "Critica" || a.prioridad === "Alta").length;

  return (
    <div className="space-y-4">
      <Hero d={d} clima={clima} criticas={criticas} onActualizar={onActualizar} syncing={syncing} />

      {/* Rodeo por etapa */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        <KpiRodeo
          destacado="total"
          label="Total de animales"
          valor={ej.totalAnimales}
          pie={
            d.variacionMesPct != null ? (
              <span className={`inline-flex items-center gap-1 ${d.variacionMesPct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {d.variacionMesPct >= 0 ? "+" : ""}
                {fmtNum(d.variacionMesPct, 1)} % este mes {d.variacionMesPct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              </span>
            ) : null
          }
        />
        <KpiRodeo label="En cría" valor={etapa("Cria")} porcentaje={pct(etapa("Cria"))} onClick={ctx.nav("cria") ? () => ctx.irA("cria") : undefined} />
        <KpiRodeo label="En recría" valor={etapa("Recria")} porcentaje={pct(etapa("Recria"))} onClick={ctx.nav("recria") ? () => ctx.irA("recria") : undefined} />
        <KpiRodeo destacado="engorde" label="En engorde / confinamiento" valor={engorde} porcentaje={pct(engorde)} onClick={ctx.nav("feed") ? () => ctx.irA("feed") : undefined} />
        <KpiRodeo label="Reproductores" valor={etapa("Reproductor")} porcentaje={pct(etapa("Reproductor"))} onClick={ctx.nav("reproduccion") ? () => ctx.irA("reproduccion") : undefined} />
        <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/[0.10] to-transparent p-4 flex gap-3">
          <AlertTriangle size={30} className="text-rose-400 shrink-0 mt-1" />
          <div className="min-w-0">
            <p className="text-[12px] text-white/70">Alertas activas</p>
            <p className="text-[1.7rem] font-bold text-rose-400 leading-tight tabular-nums">{d.alertasTotal}</p>
            <p className="text-[11px] text-white/45 leading-snug">
              {d.alertasSanitarias} sanitarias · {d.alertasOperativas} operativas
              <br />
              {d.alertasDispositivos} dispositivos
            </p>
          </div>
        </div>
      </div>

      {/* Atención · Producción · Proyección */}
      <div className="grid xl:grid-cols-[1.2fr_1fr_0.85fr] gap-4">
        <Atencion ctx={ctx} items={ej.atencion} criticas={criticas} />

        <Panel
          titulo="Producción (confinamiento)"
          icon={<LineIcon size={18} />}
          accion={
            <div className="inline-flex rounded-lg border border-white/10 p-0.5">
              {[30, 60, 90].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDias(n)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${dias === n ? "bg-emerald-600/30 text-emerald-200" : "text-white/50 hover:text-white"}`}
                >
                  {n} días
                </button>
              ))}
            </div>
          }
        >
          {feed && feed.cabezasActivas > 0 ? (
            <>
              <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
                <span>Peso promedio (kg)</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-emerald-400 rounded" /> Peso real</span>
                  <span className="flex items-center gap-1.5"><span className="w-5 border-t border-dashed border-white/70" /> Peso objetivo</span>
                </span>
              </div>
              <LineChart
                area
                height={190}
                points={feed.evolucionPeso.map((p) => ({ x: p.fecha, y: p.pesoPromedioKg, objetivo: p.pesoObjetivoKg, extra: `${p.animales} cab.` }))}
              />
              <div className="grid grid-cols-2 min-[1800px]:grid-cols-4 gap-2 mt-3">
                <Tile
                  label="GPD promedio"
                  valor={feed.gpdPromedioKg != null ? `${fmtNum(feed.gpdPromedioKg, 2)} kg/d` : "—"}
                  pie={feed.gpdPromedioKg != null && feed.gpdObjetivoKg ? <DiffObjetivo real={feed.gpdPromedioKg} objetivo={feed.gpdObjetivoKg} /> : null}
                />
                <Tile label="Peso entrada" valor={feed.pesoIngresoPromedioKg != null ? `${fmtNum(feed.pesoIngresoPromedioKg)} kg` : "—"} />
                <Tile label="Peso actual" valor={feed.pesoPromedioKg != null ? `${fmtNum(feed.pesoPromedioKg)} kg` : "—"} />
                <Tile
                  label="Ganancia acumulada"
                  valor={feed.pesoPromedioKg != null && feed.pesoIngresoPromedioKg != null ? `+${fmtNum(feed.pesoPromedioKg - feed.pesoIngresoPromedioKg)} kg` : "—"}
                  verde
                />
              </div>
            </>
          ) : (
            <Vacio>Sin animales en engorde todavía.</Vacio>
          )}
        </Panel>

        <Panel titulo="Proyección de terminación" icon={<Sprout size={18} />}>
          {feed && feed.cabezasActivas > 0 ? (
            <div className="space-y-2.5">
              <FilaProyeccion valor={feed.listosParaVenta} titulo="Animales listos ahora" pct={(feed.listosParaVenta * 100) / feed.cabezasActivas} color="bg-emerald-400" onClick={() => ctx.irA("feed")} />
              <FilaProyeccion valor={feed.listos15d} titulo="Listos en ≤ 15 días" pct={(feed.listos15d * 100) / feed.cabezasActivas} color="bg-sky-400" onClick={() => ctx.irA("feed")} />
              <FilaProyeccion valor={feed.listos30d} titulo="Listos en ≤ 30 días" pct={(feed.listos30d * 100) / feed.cabezasActivas} color="bg-sky-500" onClick={() => ctx.irA("feed")} />
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-3.5">
                <CalendarClock size={30} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[13px] text-emerald-200">Días estimados a terminación</p>
                  <p className="text-xl font-semibold text-white">{feed.diasEstimadosTerminacion != null ? `${feed.diasEstimadosTerminacion} días` : "—"}</p>
                </div>
              </div>
            </div>
          ) : (
            <Vacio>Sin animales en engorde.</Vacio>
          )}
        </Panel>
      </div>

      {/* Lotes · Alimentación · Sanidad */}
      <div className="grid xl:grid-cols-[1.1fr_1fr_1fr] gap-4">
        <Panel titulo="Rendimiento por lote / corral (confinamiento)" icon={<Fence size={18} />} accion={<VerTodo label="Ver todos" onClick={() => ctx.irA(ctx.nav("feed") ? "feed" : "lotes")} />}>
          {feed?.lotes.length ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <thead>
                  <tr className="text-left text-[11px] text-white/45 border-b border-white/[0.06]">
                    <th className="px-1.5 pb-2 font-medium">Lote</th>
                    <th className="px-1.5 pb-2 font-medium">Cabezas</th>
                    <th className="px-1.5 pb-2 font-medium">Peso prom.</th>
                    <th className="px-1.5 pb-2 font-medium">GPD</th>
                    <th className="px-1.5 pb-2 font-medium">Conversión</th>
                    <th className="px-1.5 pb-2 font-medium">Días</th>
                    <th className="px-1.5 pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {feed.lotes.map((l) => {
                    const gpdBajo = l.gpdPromedioKg != null && l.gpdPromedioKg < feed.gpdMinimoKg;
                    const convAlta = l.conversion != null && l.conversion > feed.conversionObjetivo * 1.15;
                    const est =
                      l.rendimiento === "Bajo"
                        ? { t: "Crítico", c: "bg-rose-500" }
                        : l.rendimiento === "Atencion"
                          ? { t: "Atención", c: "bg-amber-400" }
                          : l.gpdPromedioKg != null && l.gpdPromedioKg >= feed.gpdObjetivoKg
                            ? { t: "Excelente", c: "bg-emerald-400" }
                            : { t: "Normal", c: "bg-emerald-500" };
                    return (
                      <tr key={l.loteId} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-1.5 py-2.5 text-white font-medium">{l.codigo}</td>
                        <td className="px-1.5 py-2.5 text-white/80">{l.animales}</td>
                        <td className="px-1.5 py-2.5 text-white/80">{l.pesoPromedioKg != null ? `${fmtNum(l.pesoPromedioKg)} kg` : "—"}</td>
                        <td className={`px-1.5 py-2.5 ${gpdBajo ? "text-rose-400" : "text-white/80"}`}>{fmtNum(l.gpdPromedioKg, 2)}</td>
                        <td className={`px-1.5 py-2.5 ${convAlta ? "text-rose-400" : "text-white/80"}`}>{l.conversion != null ? `${fmtNum(l.conversion, 1)} : 1` : "—"}</td>
                        <td className="px-1.5 py-2.5 text-white/80">{l.diasPromedio ?? "—"}</td>
                        <td className="px-1.5 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-white/85">
                            <span className={`h-2.5 w-2.5 rounded-full ${est.c}`} /> {est.t}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Vacio>Sin corrales de engorde.</Vacio>
          )}
        </Panel>

        <Panel titulo="Alimentación (confinamiento)" icon={<Wheat size={18} />} accion={<VerTodo label="Ver inventario" onClick={() => ctx.irA("inventario")} />}>
          <div className="grid grid-cols-2 min-[1800px]:grid-cols-4 gap-2">
            <Tile
              label="Consumo hoy"
              valor={d.alimento.consumoHoyKg > 0 ? `${fmtNum(d.alimento.consumoHoyKg)} kg` : "—"}
              pie={
                d.alimento.consumoHoyKg > 0 && d.alimento.variacionPct != null ? (
                  <span className={d.alimento.variacionPct >= 0 ? "text-emerald-300" : "text-white/55"}>
                    {d.alimento.variacionPct >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(d.alimento.variacionPct), 1)} % vs ayer
                  </span>
                ) : (
                  <span className="text-white/45">Sin entregas aún · ayer {fmtNum(d.alimento.consumoAyerKg)} kg</span>
                )
              }
            />
            <Tile
              label="Consumo/cabeza"
              valor={d.alimento.consumoCabezaKg != null ? `${fmtNum(d.alimento.consumoCabezaKg, 1)} kg/d` : "—"}
              pie={d.alimento.consumoObjetivoCabKg != null ? <span className="text-white/45">Objetivo {fmtNum(d.alimento.consumoObjetivoCabKg, 1)} kg</span> : null}
            />
            <Tile
              label="Stock disponible"
              valor={`${fmtNum(d.alimento.stockKg)} kg`}
              pie={
                d.alimento.stockDias != null ? (
                  <span className={d.alimento.stockDias < 5 ? "text-amber-300" : "text-white/45"}>
                    {d.alimento.stockDias < 5 ? "⚠ " : ""}
                    {fmtNum(d.alimento.stockDias, 1)} días
                  </span>
                ) : (
                  <span className="text-white/45">Cargá el inventario</span>
                )
              }
            />
            <Tile
              label="Conversión"
              valor={d.alimento.conversion != null ? `${fmtNum(d.alimento.conversion, 1)} : 1` : "—"}
              pie={<span className="text-white/45">Objetivo ≤ {fmtNum(d.alimento.conversionObjetivo, 1)}</span>}
            />
          </div>
          <p className="text-[11px] text-white/50 mt-3 mb-1">Consumo diario (kg)</p>
          <BarChart height={150} points={d.alimento.consumoDiario.map((p) => ({ x: p.fecha, y: p.kg, extra: fmtGs(p.costoGs) }))} />
        </Panel>

        <Panel
          titulo={
            <span>
              Estado sanitario <span className="text-[12px] font-normal text-white/50">(todos los animales)</span>
            </span>
          }
          icon={<ShieldPlus size={18} />}
          accion={ctx.nav("sanidad") ? <VerTodo label="Ver sanidad" onClick={() => ctx.irA("sanidad")} /> : undefined}
        >
          <div className="space-y-2">
            <FilaSanitaria color="bg-emerald-400" label="Sin incidencias" n={d.sanitario.sinIncidencias} total={d.sanitario.total} barra="bg-emerald-400" />
            <FilaSanitaria color="bg-amber-300" label="En observación" n={d.sanitario.enObservacion} total={d.sanitario.total} barra="bg-amber-300" />
            <FilaSanitaria color="bg-orange-400" label="En tratamiento" n={d.sanitario.enTratamiento} total={d.sanitario.total} barra="bg-orange-400" />
            <FilaSanitaria color="bg-orange-500" label="Período de retiro" n={d.sanitario.enRetiro} total={d.sanitario.total} barra="bg-orange-500" />
            <FilaSanitaria color="bg-sky-400" label="Vacunas próximas (7 días)" n={d.sanitario.vacunasProximas} total={d.sanitario.total} barra="bg-sky-400" />
            <FilaSanitaria color="bg-rose-500" label="Vacunas vencidas" n={d.sanitario.vacunasVencidas} total={d.sanitario.total} barra="bg-rose-500" />
            <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-[13px]">
              <span className="flex items-center gap-2.5 text-white/75">
                <span className="h-2.5 w-2.5 rotate-45 bg-slate-300/70" /> Mortalidad (30 días)
              </span>
              <span className="text-white font-semibold tabular-nums">{fmtNum(d.sanitario.mortalidadPct30d, 2)} %</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Rentabilidad · Trazabilidad · Dispositivos · Actividad */}
      <div className="grid md:grid-cols-2 2xl:grid-cols-[1.35fr_1fr_1fr_1fr] gap-4">
        <Panel titulo="Rentabilidad estimada (confinamiento)" icon={<Wallet size={18} />}>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Alimento por cabeza" valor={fmtGs(d.rentabilidad.costoCabezaGs, true)} pie={<span className="text-white/45">acumulado desde el ingreso</span>} />
            <Tile label="Costo/kg ganado" valor={fmtGs(d.rentabilidad.costoKgGanadoGs)} />
            <Tile label="Valor estimado/cabeza" valor={fmtGs(d.rentabilidad.valorCabezaGs, true)} />
            <Tile
              label="Margen proyectado"
              valor={fmtGs(d.rentabilidad.margenCabezaGs, true)}
              verde={d.rentabilidad.margenCabezaGs >= 0}
              rojo={d.rentabilidad.margenCabezaGs < 0}
              pie={d.rentabilidad.margenPct != null ? <span className={d.rentabilidad.margenPct >= 0 ? "text-emerald-300" : "text-rose-300"}>{d.rentabilidad.margenPct >= 0 ? "+" : ""}{fmtNum(d.rentabilidad.margenPct, 1)} %</span> : null}
            />
          </div>
          <ComposicionValor r={d.rentabilidad} />
        </Panel>

        <Panel titulo="Trazabilidad y documentación" icon={<ScanLine size={18} />} accion={ctx.nav("trazabilidad") ? <VerTodo label="Ver trazabilidad" onClick={() => ctx.irA("trazabilidad")} /> : undefined}>
          <div className="flex items-center gap-4">
            <Dona pct={d.trazabilidad.pctIdentificacionCompleta} />
            <dl className="flex-1 space-y-2 text-[12px]">
              <FilaDato label="Animales con info incompleta" valor={d.trazabilidad.infoIncompleta} />
              <FilaDato label="Sin RFID" valor={d.trazabilidad.sinRfid} />
              <FilaDato label="Sin lote asignado" valor={d.trazabilidad.sinLote} />
              <FilaDato label="Pesajes (7 días)" valor={d.trazabilidad.pesajes7d} />
              <FilaDato
                label="Último pesaje"
                valor={d.trazabilidad.ultimoPesaje ? new Date(d.trazabilidad.ultimoPesaje).toLocaleDateString("es-PY", { day: "numeric", month: "short" }) : "—"}
              />
            </dl>
          </div>
        </Panel>

        <Panel titulo="Dispositivos (IoT)" icon={<Wifi size={18} />} accion={ctx.nav("dispositivos") ? <VerTodo label="Ver dispositivos" onClick={() => ctx.irA("dispositivos")} /> : undefined}>
          {d.dispositivosTotal ? (
            <>
              <p className="flex items-center gap-2 mb-3">
                <Radio size={16} className="text-emerald-400" />
                <span className="text-xl font-semibold text-white tabular-nums">
                  {d.dispositivosOnline} / {d.dispositivosTotal}
                </span>
                <span className="text-[12px] text-emerald-300">Online</span>
              </p>
              <dl className="space-y-2 text-[12px]">
                {d.dispositivosPorTipo.map((t) => (
                  <div key={t.tipo} className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-white/75">
                      <span className={`h-2 w-2 rounded-full ${t.online === t.total ? "bg-emerald-400" : "bg-amber-400"}`} />
                      {nombreDispositivo(t.tipo)}
                    </dt>
                    <dd className="text-white tabular-nums">
                      {t.online} / {t.total}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <Vacio>Sin hardware conectado.</Vacio>
          )}
        </Panel>

        <Panel titulo="Actividad reciente" icon={<Activity size={18} />}>
          <ol className="space-y-2.5">
            {d.actividad.map((a, i) => (
              <li key={i} className="flex gap-2.5 text-[12px]">
                <span className="mt-1 h-2.5 w-2.5 rounded-full border-2 border-emerald-400/80 shrink-0" />
                <span className="text-white/45 tabular-nums shrink-0 w-11">{horaCorta(a.fecha)}</span>
                <span className="text-white/80 leading-snug">{a.titulo}</span>
              </li>
            ))}
            {!d.actividad.length && <Vacio>Sin movimientos recientes.</Vacio>}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

/* ───────────── Encabezado con foto / ilustración ───────────── */

function Hero({ d, clima, criticas, onActualizar, syncing }: { d: AgroPrincipal; clima: Clima | null; criticas: number; onActualizar: () => void; syncing: boolean }) {
  const ej = d.ejecutivo;
  const ahora = new Date();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] min-h-[190px] bg-[#07120e]">
      {/* Foto del corral (la misma del diseño), fundida hacia la izquierda donde va el título */}
      <div aria-hidden className="absolute inset-y-0 right-0 w-full lg:w-[70%]">
        <Image src="/images/agro/hero-ganadero.jpg" alt="" fill priority sizes="(min-width: 1024px) 74vw, 100vw" className="object-cover object-center" />
      </div>
      {/* Oscurece solo la zona del título; la foto queda clara a la derecha como en el diseño */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#07120e] from-20% via-[#07120e]/55 via-40% to-transparent to-60%" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#07120e]/45 to-transparent" />
      <div className="relative flex flex-col lg:flex-row gap-4 justify-between p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Sprout size={44} className="text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[1.9rem] sm:text-[2.2rem] font-bold tracking-tight text-white leading-none truncate">{ej.nombre}</h1>
              <p className="text-[15px] text-white/60 mt-1.5">
                Establecimiento ganadero{ej.ubicacion ? ` • ${ej.ubicacion}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 mt-5">
            <Chip icon={<Beef size={18} />} label="Sistema productivo" valor={sistemaLabel(d.sistemaProductivo)} />
            {ej.hectareas ? <Chip icon={<MapPin size={18} />} label="Superficie" valor={`${fmtNum(ej.hectareas)} ha`} /> : null}
            <Chip
              icon={<RefreshCw size={18} className={syncing ? "animate-spin" : ""} />}
              label="Última sincronización"
              valor={d.ultimaSincronizacion ? fechaHora(d.ultimaSincronizacion) : "—"}
              onClick={onActualizar}
            />
          </div>
        </div>
        <div className="self-start rounded-xl border border-white/10 bg-black/45 backdrop-blur px-4 py-3 min-w-[190px]">
          <div className="flex items-center gap-3">
            {clima ? iconoClima(clima.codigo) : <Sun size={30} className="text-amber-300/60" />}
            <div>
              <p className="text-xl font-semibold text-white">{clima ? `${clima.temp}°C` : "—"}</p>
              <p className="text-[11px] text-white/55">{ej.ubicacion ?? "Establecimiento"}</p>
            </div>
          </div>
          <p className="text-[11px] text-white/55 mt-2.5">
            Hoy, {ahora.toLocaleDateString("es-PY", { day: "numeric", month: "short", year: "numeric" })} • {ahora.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="flex items-center gap-2 text-[12px] text-white/85 mt-1.5">
            <span className={`h-2 w-2 rounded-full ${criticas ? "bg-amber-400" : "bg-emerald-400"}`} />
            {criticas ? "Operación con alertas" : "Operación normal"}
          </p>
        </div>
      </div>
    </section>
  );
}

function Chip({ icon, label, valor, onClick }: { icon: ReactNode; label: string; valor: string; onClick?: () => void }) {
  const C = onClick ? "button" : "div";
  return (
    <C
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 backdrop-blur px-4 py-2.5 text-left hover:border-emerald-400/30"
    >
      <span className="text-emerald-400">{icon}</span>
      <span>
        <span className="block text-[11px] text-white/55">{label}</span>
        <span className="block text-[14px] font-semibold text-white">{valor}</span>
      </span>
    </C>
  );
}

/* ───────────── Piezas ───────────── */

function KpiRodeo({
  label, valor, porcentaje, pie, destacado, onClick,
}: {
  label: string;
  valor: number;
  porcentaje?: number;
  pie?: ReactNode;
  destacado?: "total" | "engorde";
  onClick?: () => void;
}) {
  const borde =
    destacado === "total"
      ? "border-emerald-500/30 bg-gradient-to-br from-emerald-600/25 to-emerald-900/10"
      : destacado === "engorde"
        ? "border-amber-400/60 bg-gradient-to-br from-amber-500/10 to-transparent"
        : "border-white/[0.07] bg-[#0b1713]/90";
  const icono = destacado === "engorde" ? "text-amber-400" : destacado === "total" ? "text-white" : "text-emerald-400";
  const barra = destacado === "engorde" ? "bg-amber-400" : "bg-emerald-400";
  const C = onClick ? "button" : "div";
  return (
    <C type={onClick ? "button" : undefined} onClick={onClick} className={`rounded-2xl border p-4 flex gap-3 text-left transition ${borde} ${onClick ? "hover:border-emerald-400/40" : ""}`}>
      <Beef size={34} className={`${icono} shrink-0 mt-1`} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-white/70 leading-tight">{label}</p>
        <p className="text-[1.7rem] font-bold text-white leading-tight tabular-nums">{fmtNum(valor)}</p>
        {porcentaje != null ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-white/60 tabular-nums">{fmtNum(porcentaje, 1)} %</span>
            <span className="h-1 flex-1 max-w-[70px] rounded-full bg-white/10 overflow-hidden">
              <span className={`block h-full ${barra}`} style={{ width: `${Math.min(100, porcentaje)}%` }} />
            </span>
          </div>
        ) : (
          <p className="text-[11px] mt-0.5">{pie}</p>
        )}
      </div>
    </C>
  );
}

const SEVERIDAD: Record<string, { label: string; cls: string }> = {
  Critica: { label: "CRÍTICA", cls: "bg-rose-600/90 text-white border-rose-500" },
  Alta: { label: "ALTA", cls: "bg-orange-600/80 text-white border-orange-500" },
  Media: { label: "MEDIA", cls: "bg-amber-500/80 text-[#1c1300] border-amber-400" },
  Baja: { label: "BAJA", cls: "bg-sky-600/70 text-white border-sky-500" },
};

function iconoAtencion(a: AgroAtencion) {
  if (a.modulo === "HEALTH") return <Syringe size={20} />;
  if (a.modulo === "CONNECT") return <Wifi size={20} />;
  if (a.titulo.toLowerCase().startsWith("stock")) return <Package size={20} />;
  if (a.titulo.toLowerCase().includes("gpd")) return <TrendingUp size={20} />;
  if (a.titulo.toLowerCase().includes("listos")) return <Scale size={20} />;
  if (a.modulo === "CRIA" || a.modulo === "RECRIA") return <Gauge size={20} />;
  return <Beef size={20} />;
}

function accionAtencion(a: AgroAtencion): { label: string; vista: VistaAgro } {
  const t = a.titulo.toLowerCase();
  if (t.startsWith("stock")) return { label: "Ver inventario", vista: "inventario" };
  if (a.modulo === "CONNECT") return a.animalId ? { label: "Ver animal", vista: "trazabilidad" } : { label: "Diagnosticar", vista: "dispositivos" };
  if (a.modulo === "HEALTH") return { label: a.sanidadId ? "Ver animales" : "Ver sanidad", vista: "sanidad" };
  if (a.modulo === "CRIA") return { label: "Ver cría", vista: "cria" };
  if (a.modulo === "RECRIA") return { label: "Ver recría", vista: "recria" };
  if (a.loteId) return { label: "Analizar lote", vista: "feed" };
  if (a.animalId) return { label: "Ver animal", vista: "trazabilidad" };
  return { label: "Ver detalle", vista: "feed" };
}

function Atencion({ ctx, items, criticas }: { ctx: AgroCtx; items: AgroAtencion[]; criticas: number }) {
  const [todas, setTodas] = useState(false);
  const lista = todas ? items : items.slice(0, 5);
  return (
    <Panel
      titulo={
        <span className="flex items-center gap-2.5">
          Qué requiere atención hoy
          {criticas ? <span className="rounded-md bg-rose-600/90 px-2 py-0.5 text-[11px] font-semibold text-white">{criticas} tareas críticas</span> : null}
        </span>
      }
      icon={<AlertTriangle size={18} />}
      accion={items.length > 5 ? <VerTodo label={todas ? "Ver menos" : "Ver todas"} onClick={() => setTodas((v) => !v)} /> : undefined}
    >
      {!items.length ? (
        <Vacio>Nada urgente hoy. La operación está en orden.</Vacio>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {lista.map((a, i) => {
            const sev = SEVERIDAD[a.prioridad] ?? SEVERIDAD.Media;
            const acc = accionAtencion(a);
            const habilitada = ctx.nav(acc.vista);
            return (
              <div key={`${a.titulo}-${i}`} className="flex items-center gap-3 py-2.5">
                <span className={`w-[74px] shrink-0 rounded-md border px-2 py-1 text-center text-[10px] font-bold tracking-wide ${sev.cls}`}>{sev.label}</span>
                <span className="text-white/70 shrink-0">{iconoAtencion(a)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white leading-snug">{a.titulo}</p>
                  {a.detalle ? <p className="text-[11px] text-white/45 truncate">{a.detalle}</p> : null}
                </div>
                {habilitada ? (
                  <button
                    type="button"
                    onClick={() => ctx.irA(acc.vista, a.animalId ? { animalId: a.animalId } : undefined)}
                    className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/85 hover:border-emerald-400/40 hover:text-white"
                  >
                    {acc.label}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function Tile({ label, valor, pie, verde, rojo }: { label: string; valor: string; pie?: ReactNode; verde?: boolean; rojo?: boolean }) {
  return (
    <div className={TILE}>
      <p className="text-[11px] text-white/55 leading-tight">{label}</p>
      <p className={`text-[17px] font-semibold tabular-nums mt-1 ${verde ? "text-emerald-300" : rojo ? "text-rose-300" : "text-white"}`}>{valor}</p>
      {pie ? <p className="text-[11px] mt-0.5 leading-snug">{pie}</p> : null}
    </div>
  );
}

function DiffObjetivo({ real, objetivo }: { real: number; objetivo: number }) {
  const diff = ((real - objetivo) / objetivo) * 100;
  return (
    <span className={diff >= 0 ? "text-emerald-300" : "text-rose-400"}>
      {diff >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(diff), 1)} % vs objetivo
    </span>
  );
}

function FilaProyeccion({ valor, titulo, pct, color, onClick }: { valor: number; titulo: string; pct: number; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0e1c17] px-3 py-2.5 text-left hover:border-emerald-400/30">
      <span className={`h-9 w-1.5 rounded-full ${color}`} />
      <span className="text-[1.6rem] font-bold text-white w-14 tabular-nums">{fmtNum(valor)}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] text-white">{titulo}</span>
        <span className="block text-[11px] text-white/50">{fmtNum(pct, 1)} % del confinamiento</span>
      </span>
      <ChevronRight size={16} className="text-white/40" />
    </button>
  );
}

function FilaSanitaria({ color, label, n, total, barra }: { color: string; label: string; n: number; total: number; barra: string }) {
  const p = total ? (n * 100) / total : 0;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_52px_52px_90px] items-center gap-2 text-[13px]">
      <span className="flex items-center gap-2.5 text-white/80 min-w-0">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-right text-white font-semibold tabular-nums">{fmtNum(n)}</span>
      <span className="text-right text-white/55 text-[11px] tabular-nums">{fmtNum(p, 1)} %</span>
      <span className="hidden sm:block h-1.5 rounded-full bg-white/10 overflow-hidden">
        <span className={`block h-full ${barra}`} style={{ width: `${Math.max(p > 0 ? 3 : 0, Math.min(100, p))}%` }} />
      </span>
    </div>
  );
}

function ComposicionValor({ r }: { r: AgroPrincipal["rentabilidad"] }) {
  const total = r.costoIngresoCabezaGs + r.costoCabezaGs + Math.max(0, r.margenCabezaGs);
  if (!total) return null;
  const partes = [
    { label: "Valor de ingreso", v: r.costoIngresoCabezaGs, c: "bg-slate-400" },
    { label: "Alimento", v: r.costoCabezaGs, c: "bg-amber-400" },
    { label: "Margen", v: Math.max(0, r.margenCabezaGs), c: "bg-emerald-400" },
  ];
  return (
    <div className="mt-3">
      <p className="text-[11px] text-white/55 mb-1.5">Composición del valor por cabeza</p>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {partes.map((p) => (
          <span key={p.label} className={p.c} style={{ width: `${(p.v * 100) / total}%` }} title={`${p.label}: ${fmtGs(p.v)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-white/70">
        {partes.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${p.c}`} /> {p.label} {fmtNum((p.v * 100) / total)} %
          </span>
        ))}
      </div>
    </div>
  );
}

function Dona({ pct }: { pct: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[17px] font-bold text-white tabular-nums">{fmtNum(pct, 1)} %</span>
        <span className="text-[9px] leading-tight text-white/55">Identificación
          <br />completa</span>
      </div>
    </div>
  );
}

function FilaDato({ label, valor }: { label: string; valor: number | string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-white/65">{label}</dt>
      <dd className="text-white tabular-nums">{typeof valor === "number" ? fmtNum(valor) : valor}</dd>
    </div>
  );
}

function Vacio({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-[13px] text-white/40">{children}</p>;
}

function nombreDispositivo(t: string) {
  return { Collar: "Collares GPS", Camara: "Cámaras IA", Balanza: "Balanzas", Gateway: "Gateways", RFID: "Lectores RFID" }[t] ?? t;
}

function horaCorta(iso: string) {
  const f = new Date(iso);
  const hoy = new Date();
  return f.toDateString() === hoy.toDateString()
    ? f.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })
    : f.toLocaleDateString("es-PY", { day: "numeric", month: "short" });
}

function fechaHora(iso: string) {
  const f = new Date(iso);
  const hoy = new Date();
  const hora = f.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
  if (f.toDateString() === hoy.toDateString()) return `Hoy ${hora}`;
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (f.toDateString() === ayer.toDateString()) return `Ayer ${hora}`;
  return `${f.toLocaleDateString("es-PY", { day: "numeric", month: "short" })} ${hora}`;
}

function Esqueleto() {
  return (
    <div className="space-y-4">
      <div className="h-[190px] rounded-2xl bg-white/[0.04] animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[96px] rounded-2xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
      <div className="grid xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[340px] rounded-2xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
