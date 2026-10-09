"use client";

import { API_BASE, installAuthFetch } from "@/lib/api";
import { loadVordiaSession } from "@/lib/utils";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertTriangle, Scale, Beef, Radio, MapPin, CheckCircle2, Plus,
  LayoutDashboard, Wheat, Wifi, Battery, Gauge, Fence, RefreshCw,
} from "lucide-react";
import {
  agroAlertas,
  agroAnimales,
  agroContextoAgrofield,
  agroCrearAnimal,
  agroDashboard,
  agroDispositivos,
  agroLotes,
  agroPing,
  agroRaciones,
  agroRegistrarPesaje,
  agroRegistrarRacion,
  agroResolverAlerta,
  agroSimularUbicacion,
  agroZonas,
  type AgroAlerta,
  type AgroAnimal,
  type AgroDashboard,
  type AgroDispositivo,
  type AgroLote,
  type AgroRacion,
  type AgroZona,
} from "@/lib/agroApi";

function fmtKg(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Number(n).toLocaleString("es-PY", { maximumFractionDigits: 1 })} kg`;
}

function fmtNum(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("es-PY");
}

function hace(iso?: string | null) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(min)) return "";
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-PY", { day: "numeric", month: "short" });
}

const FIELD =
  "h-11 bg-[#08140f] border-white/10 text-white placeholder:text-white/30 rounded-xl focus-visible:border-emerald-400/50 focus-visible:ring-emerald-400/20";
const SELECT =
  "h-11 w-full bg-[#08140f] border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-emerald-400/50";
const CARD = "rounded-2xl border border-white/[0.06] bg-[#0b1511]/90 shadow-[0_0_0_1px_rgba(16,185,129,0.04)]";

function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  const wrap = {
    neutral: "border-white/[0.06] bg-[#0c1612]",
    ok: "border-emerald-400/20 bg-emerald-500/[0.07]",
    warn: "border-amber-400/25 bg-amber-500/[0.08]",
    danger: "border-rose-400/25 bg-rose-500/[0.08]",
  }[tone];
  const ico = {
    neutral: "text-emerald-300 bg-emerald-500/10",
    ok: "text-emerald-300 bg-emerald-500/15",
    warn: "text-amber-300 bg-amber-500/15",
    danger: "text-rose-300 bg-rose-500/15",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${wrap}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">{label}</p>
        <span className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${ico}`}>{icon}</span>
      </div>
      <p className="mt-3 text-[1.65rem] leading-none font-semibold tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-2 text-[11px] text-white/40">{hint}</p> : null}
    </div>
  );
}

function Occupancy({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const bar = pct >= 95 ? "bg-rose-400" : pct >= 80 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
        <span>{current} / {max}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BatteryBar({ pct }: { pct: number }) {
  const bar = pct < 25 ? "bg-rose-400" : pct < 50 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/50">
      <Battery size={12} />
      <span className="w-10 h-1 rounded-full bg-white/10 overflow-hidden">
        <span className={`block h-full ${bar}`} style={{ width: `${Math.max(4, pct)}%` }} />
      </span>
      {pct}%
    </span>
  );
}

function estadoAnimal(e: string) {
  if (e === "FueraZona") return "bg-rose-500/15 text-rose-300 border-rose-500/20";
  if (e === "Tratamiento") return "bg-amber-500/15 text-amber-300 border-amber-500/20";
  if (e === "Activo") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
  return "bg-white/5 text-white/50 border-white/10";
}

type Tab = "dashboard" | "animales" | "alimentacion" | "dispositivos" | "zonas";

export default function AgroPage() {
  const [empresaId, setEmpresaId] = useState(0);
  const [contextoListo, setContextoListo] = useState(false);
  const [contextoLabel, setContextoLabel] = useState("Agrofield");

  useEffect(() => {
    installAuthFetch();
    const s = loadVordiaSession();
    const sessionEmp = Number(s?.user?.empresaId || s?.user?.EmpresaId || 0) || 0;
    const rubro = String(s?.user?.rubro || s?.user?.Rubro || "").toUpperCase();

    (async () => {
      try {
        const ctx = await agroContextoAgrofield();
        setEmpresaId(ctx.empresaId);
        setContextoLabel(ctx.razonSocial || "Agrofield");
        if (!ctx.tieneDatos) {
          toast.error("Agrofield sin datos", {
            description: "Ejecutá Seed_Agrofield_Empresa.sql en GESCO_DB",
          });
        }
      } catch {
        if (sessionEmp) setEmpresaId(sessionEmp);
        else if (rubro !== "AGRO") {
          toast.error("No está la empresa Agrofield", {
            description: "En GESCO_DB debe existir Empresas.RazonSocial = Agrofield",
          });
        }
      } finally {
        setContextoListo(true);
      }
    })();
  }, []);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [ping, setPing] = useState<any>(null);
  const [dash, setDash] = useState<AgroDashboard | null>(null);
  const [animales, setAnimales] = useState<AgroAnimal[]>([]);
  const [lotes, setLotes] = useState<AgroLote[]>([]);
  const [raciones, setRaciones] = useState<AgroRacion[]>([]);
  const [dispositivos, setDispositivos] = useState<AgroDispositivo[]>([]);
  const [alertas, setAlertas] = useState<AgroAlerta[]>([]);
  const [zonas, setZonas] = useState<AgroZona[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const [pesaje, setPesaje] = useState({ animalId: "", pesoKg: "", operario: "" });
  const [racion, setRacion] = useState({ loteId: "", tipoAlimento: "TMR engorde", cantidadKg: "", operario: "" });
  const [nuevoAnimal, setNuevoAnimal] = useState({
    codigoInterno: "",
    categoria: "Novillo",
    loteId: "",
    pesoIngresoKg: "",
    rfidTag: "",
  });

  const estId = dash?.establecimientoId;
  const onlinePct = useMemo(() => {
    if (!dispositivos.length) return 0;
    const on = dispositivos.filter((d) => d.estado === "Online").length;
    return Math.round((on / dispositivos.length) * 100);
  }, [dispositivos]);

  const cargar = async (empId = empresaId, opts?: { silent?: boolean }) => {
    if (!empId) {
      if (contextoListo) {
        toast.error("Sin empresa Agrofield. Revisá el seed en GESCO_DB.");
        setLoading(false);
      }
      return;
    }
    try {
      if (!opts?.silent) setSyncing(true);
      setLoading(true);
      const [p, d, a, l, r, di, al, z] = await Promise.all([
        agroPing().catch(() => null),
        agroDashboard(empId).catch(() => null),
        agroAnimales(empId).catch(() => []),
        agroLotes(empId).catch(() => []),
        agroRaciones(empId).catch(() => []),
        agroDispositivos(empId).catch(() => []),
        agroAlertas(empId).catch(() => []),
        agroZonas(empId).catch(() => []),
      ]);
      setPing(p);
      setDash(d);
      setAnimales(a);
      setLotes(l);
      setRaciones(r);
      setDispositivos(di);
      setAlertas(al);
      setZonas(z);
      setActualizado(new Date());
      if (d && !opts?.silent) toast.success(`Campo actualizado · ${d.nombre}`);
    } catch (e: any) {
      toast.error("No se pudo cargar Agro", {
        description: e?.message || `¿API en ${API_BASE}?`,
      });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!empresaId) return;
    void cargar(empresaId, { silent: true });
  }, [empresaId]);

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "dashboard", label: "Resumen", icon: <LayoutDashboard size={14} /> },
    { id: "animales", label: "Ganado", icon: <Beef size={14} /> },
    { id: "alimentacion", label: "Alimentación", icon: <Wheat size={14} /> },
    { id: "dispositivos", label: "Dispositivos", icon: <Radio size={14} /> },
    { id: "zonas", label: "Zonas", icon: <Fence size={14} /> },
  ];

  return (
    <div className="relative text-white pb-8 animate-in fade-in duration-300">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 right-0 h-56 w-[28rem] rounded-full bg-emerald-500/[0.07] blur-3xl"
      />

      <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/90">
              Campo en operación
            </p>
          </div>
          <h1 className="mt-1.5 text-[1.55rem] sm:text-[1.75rem] font-semibold tracking-tight text-white">
            {(dash?.nombre || "Confinamiento Central").replace(/\s*Agrofield\s*/gi, " ").replace(/\s+/g, " ").trim()}
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {dash?.clienteNombre || contextoLabel}
            {dash?.ubicacion ? ` · ${dash.ubicacion}` : ""}
            {dash?.hectareas ? ` · ${fmtNum(dash.hectareas)} ha` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {actualizado && (
            <p className="hidden sm:block text-[11px] text-white/35">
              Actualizado {actualizado.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          <Button
            onClick={() => void cargar()}
            disabled={syncing}
            className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 px-4 shadow-lg shadow-emerald-600/20"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            Actualizar
          </Button>
        </div>
      </div>

      {!ping && !loading && (
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No hay conexión con el módulo Agro. Revisá que la API esté en marcha.
        </div>
      )}

      <div className="mb-6 inline-flex w-full sm:w-auto flex-wrap p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-semibold tracking-wide transition ${
              tab === t.id
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "text-white/50 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[108px] rounded-2xl bg-white/[0.04] border border-white/[0.05] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {tab === "dashboard" && dash && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <Kpi
                  label="Hacienda activa"
                  value={String(dash.animalesActivos)}
                  hint="Animales en el confinamiento"
                  icon={<Beef size={16} />}
                  tone="ok"
                />
                <Kpi
                  label="Fuera de zona"
                  value={String(dash.animalesFueraZona)}
                  hint={dash.animalesFueraZona > 0 ? "Requieren atención ahora" : "Todos dentro del perímetro"}
                  icon={<MapPin size={16} />}
                  tone={dash.animalesFueraZona > 0 ? "danger" : "neutral"}
                />
                <Kpi
                  label="Alertas abiertas"
                  value={String(dash.alertasAbiertas)}
                  hint={dash.animalesTratamiento ? `${dash.animalesTratamiento} en tratamiento` : "Cola operativa"}
                  icon={<AlertTriangle size={16} />}
                  tone={dash.alertasAbiertas > 0 ? "warn" : "neutral"}
                />
                <Kpi
                  label="GPD promedio"
                  value={dash.gpdPromedioKg != null ? `${dash.gpdPromedioKg}` : "—"}
                  hint="kg por día · ganancia de peso"
                  icon={<Gauge size={16} />}
                  tone="ok"
                />
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <Kpi
                  label="Conversión est."
                  value={dash.conversionEstimada != null ? `${dash.conversionEstimada} : 1` : "—"}
                  hint="Alimento por kg de carne"
                  icon={<Scale size={16} />}
                />
                <Kpi
                  label="Alimento 7 días"
                  value={fmtKg(dash.alimentoKg7d)}
                  hint="Raciones entregadas"
                  icon={<Wheat size={16} />}
                />
                <Kpi
                  label="Dispositivos online"
                  value={String(dash.dispositivosOnline)}
                  hint={dispositivos.length ? `${onlinePct}% del inventario` : "Collares, cámaras y balanzas"}
                  icon={<Wifi size={16} />}
                  tone={dash.dispositivosOnline > 0 ? "ok" : "warn"}
                />
                <Kpi
                  label="Lotes / corrales"
                  value={String(dash.lotes)}
                  hint="Ocupación del confinamiento"
                  icon={<Fence size={16} />}
                />
              </div>

              <div className="grid lg:grid-cols-5 gap-4">
                <section className={`${CARD} lg:col-span-3 p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <span className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center">
                        <AlertTriangle size={15} />
                      </span>
                      Alertas del campo
                    </h2>
                    <span className="text-[11px] text-white/35">{(dash.ultimasAlertas || []).length} abiertas</span>
                  </div>
                  {(dash.ultimasAlertas || []).length === 0 ? (
                    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-8 text-center">
                      <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={22} />
                      <p className="text-sm text-emerald-100/80">Sin alertas. El confinamiento está en calma.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(dash.ultimasAlertas || []).map((a) => {
                        const alta = a.severidad === "Alta";
                        return (
                          <div
                            key={a.alertaId}
                            className={`relative overflow-hidden rounded-xl border bg-[#07110d] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                              alta ? "border-rose-500/20" : "border-white/[0.06]"
                            }`}
                          >
                            <span className={`absolute left-0 top-0 bottom-0 w-0.5 ${alta ? "bg-rose-400" : "bg-amber-400"}`} />
                            <div className="min-w-0 pl-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${alta ? "text-rose-300" : "text-amber-300"}`}>
                                  {a.severidad}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-white/35">{a.tipo}</span>
                                {a.animalCodigo ? (
                                  <span className="text-[10px] font-semibold text-emerald-300/80">#{a.animalCodigo}</span>
                                ) : null}
                                {a.fechaAlerta ? (
                                  <span className="text-[10px] text-white/30">{hace(a.fechaAlerta)}</span>
                                ) : null}
                              </div>
                              <p className="text-sm font-medium text-white/95">{a.titulo}</p>
                              {a.detalle && <p className="text-[12px] text-white/40 mt-0.5">{a.detalle}</p>}
                            </div>
                            <Button
                              size="sm"
                              className="rounded-xl bg-white/[0.06] hover:bg-emerald-600 text-white border border-white/10 shrink-0 gap-1.5 h-9"
                              onClick={async () => {
                                await agroResolverAlerta(empresaId, a.alertaId);
                                toast.success("Alerta resuelta");
                                cargar(empresaId, { silent: true });
                              }}
                            >
                              <CheckCircle2 size={13} /> Resolver
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className={`${CARD} lg:col-span-2 p-5 space-y-4`}>
                  <h2 className="text-sm font-semibold">Corrales y ocupación</h2>
                  {lotes.length === 0 ? (
                    <p className="text-sm text-white/35 py-6 text-center">Sin lotes cargados</p>
                  ) : (
                    lotes.map((l) => (
                      <div key={l.loteId} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">{l.codigo}</p>
                            <p className="text-sm font-medium">{l.nombre}</p>
                          </div>
                          <span className="text-[10px] uppercase text-white/35">{l.tipo}</span>
                        </div>
                        <Occupancy current={l.animales} max={l.capacidad} />
                        {l.camaraCodigo ? (
                          <p className="text-[11px] text-white/35 mt-2">{l.camaraCodigo}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </section>
              </div>
            </div>
          )}

          {tab === "animales" && (
            <div className="space-y-4">
              <div className={`${CARD} p-5 space-y-4`}>
                <div>
                  <p className="text-sm font-semibold">Alta de animal</p>
                  <p className="text-[12px] text-white/40 mt-0.5">Ingreso al confinamiento con peso y lote.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <Input value={nuevoAnimal.codigoInterno} onChange={(e) => setNuevoAnimal({ ...nuevoAnimal, codigoInterno: e.target.value })} placeholder="Código *" className={FIELD} />
                  <Input value={nuevoAnimal.categoria} onChange={(e) => setNuevoAnimal({ ...nuevoAnimal, categoria: e.target.value })} placeholder="Categoría" className={FIELD} />
                  <select value={nuevoAnimal.loteId} onChange={(e) => setNuevoAnimal({ ...nuevoAnimal, loteId: e.target.value })} className={SELECT}>
                    <option value="">Sin lote</option>
                    {lotes.map((l) => <option key={l.loteId} value={l.loteId}>{l.codigo}</option>)}
                  </select>
                  <Input type="number" value={nuevoAnimal.pesoIngresoKg} onChange={(e) => setNuevoAnimal({ ...nuevoAnimal, pesoIngresoKg: e.target.value })} placeholder="Peso ingreso kg" className={FIELD} />
                  <Button
                    className="h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold gap-1.5"
                    onClick={async () => {
                      if (!estId || !nuevoAnimal.codigoInterno.trim()) {
                        toast.error("Código y establecimiento requeridos");
                        return;
                      }
                      await agroCrearAnimal({
                        empresaId,
                        establecimientoId: estId,
                        codigoInterno: nuevoAnimal.codigoInterno,
                        categoria: nuevoAnimal.categoria,
                        loteId: nuevoAnimal.loteId ? Number(nuevoAnimal.loteId) : null,
                        pesoIngresoKg: nuevoAnimal.pesoIngresoKg ? Number(nuevoAnimal.pesoIngresoKg) : null,
                        pesoActualKg: nuevoAnimal.pesoIngresoKg ? Number(nuevoAnimal.pesoIngresoKg) : null,
                        fechaIngreso: new Date().toISOString().slice(0, 10),
                        rfidTag: nuevoAnimal.rfidTag || `RFID-${nuevoAnimal.codigoInterno}`,
                        estado: "Activo",
                      });
                      toast.success("Animal registrado");
                      setNuevoAnimal({ codigoInterno: "", categoria: "Novillo", loteId: "", pesoIngresoKg: "", rfidTag: "" });
                      cargar(empresaId, { silent: true });
                    }}
                  >
                    <Plus size={14} /> Registrar
                  </Button>
                </div>
              </div>

              <div className={`${CARD} p-5 space-y-4`}>
                <div>
                  <p className="text-sm font-semibold">Registrar pesaje</p>
                  <p className="text-[12px] text-white/40 mt-0.5">Actualiza peso, GPD y conversión del lote.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <select value={pesaje.animalId} onChange={(e) => setPesaje({ ...pesaje, animalId: e.target.value })} className={SELECT}>
                    <option value="">Animal</option>
                    {animales.map((a) => <option key={a.animalId} value={a.animalId}>#{a.codigoInterno}</option>)}
                  </select>
                  <Input type="number" value={pesaje.pesoKg} onChange={(e) => setPesaje({ ...pesaje, pesoKg: e.target.value })} placeholder="Peso kg" className={FIELD} />
                  <Input value={pesaje.operario} onChange={(e) => setPesaje({ ...pesaje, operario: e.target.value })} placeholder="Operario" className={FIELD} />
                  <Button
                    className="h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold"
                    onClick={async () => {
                      if (!pesaje.animalId || !pesaje.pesoKg) {
                        toast.error("Animal y peso requeridos");
                        return;
                      }
                      await agroRegistrarPesaje({
                        empresaId,
                        animalId: Number(pesaje.animalId),
                        pesoKg: Number(pesaje.pesoKg),
                        origen: "Manual",
                        operario: pesaje.operario || undefined,
                      });
                      toast.success("Pesaje registrado");
                      setPesaje({ animalId: "", pesoKg: "", operario: "" });
                      cargar(empresaId, { silent: true });
                    }}
                  >
                    Guardar peso
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {animales.map((a) => (
                  <div key={a.animalId} className={`${CARD} p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-tight">#{a.codigoInterno}</p>
                        <span className="text-[11px] text-white/40">{a.categoria}</span>
                        <span className="text-[11px] font-semibold text-emerald-400/90">{a.loteCodigo || "sin lote"}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${estadoAnimal(a.estado)}`}>
                          {a.estado === "FueraZona" ? "Fuera de zona" : a.estado}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-white/45">
                        <span>Ingreso {fmtKg(a.pesoIngresoKg)}</span>
                        <span className="text-white/80">Actual {fmtKg(a.pesoActualKg)}</span>
                        {a.gananciaKg != null ? <span className="text-emerald-300">+{fmtKg(a.gananciaKg)}</span> : null}
                        {a.gpdKg != null ? <span>GPD {a.gpdKg} kg/d</span> : null}
                        {a.bateriaCollarPct != null ? <BatteryBar pct={a.bateriaCollarPct} /> : null}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-rose-400/25 bg-rose-500/5 text-rose-200 hover:bg-rose-500/15 hover:text-white shrink-0 h-9"
                      onClick={async () => {
                        await agroSimularUbicacion({
                          empresaId,
                          animalId: a.animalId,
                          lat: -23.4411,
                          lng: -58.4452,
                          bateriaPct: 18,
                          generarAlertaFueraZona: true,
                        });
                        toast.success(`Simulado: #${a.codigoInterno} fuera de zona`);
                        cargar(empresaId, { silent: true });
                      }}
                    >
                      Simular fuera de zona
                    </Button>
                  </div>
                ))}
                {!animales.length && (
                  <div className={`${CARD} py-14 text-center text-sm text-white/40`}>
                    Todavía no hay hacienda. Registrá el primer animal arriba.
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "alimentacion" && (
            <div className="space-y-4">
              <div className={`${CARD} p-5 space-y-4`}>
                <div>
                  <p className="text-sm font-semibold">Entregar ración</p>
                  <p className="text-[12px] text-white/40 mt-0.5">Cargá lo que salió al corral para seguir conversión y stock.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <select value={racion.loteId} onChange={(e) => setRacion({ ...racion, loteId: e.target.value })} className={SELECT}>
                    <option value="">Lote</option>
                    {lotes.map((l) => <option key={l.loteId} value={l.loteId}>{l.codigo}</option>)}
                  </select>
                  <Input value={racion.tipoAlimento} onChange={(e) => setRacion({ ...racion, tipoAlimento: e.target.value })} placeholder="Tipo alimento" className={FIELD} />
                  <Input type="number" value={racion.cantidadKg} onChange={(e) => setRacion({ ...racion, cantidadKg: e.target.value })} placeholder="Kg" className={FIELD} />
                  <Input value={racion.operario} onChange={(e) => setRacion({ ...racion, operario: e.target.value })} placeholder="Operario" className={FIELD} />
                  <Button
                    className="h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold"
                    onClick={async () => {
                      if (!racion.loteId || !racion.cantidadKg) {
                        toast.error("Lote y kg requeridos");
                        return;
                      }
                      await agroRegistrarRacion({
                        empresaId,
                        loteId: Number(racion.loteId),
                        tipoAlimento: racion.tipoAlimento,
                        cantidadKg: Number(racion.cantidadKg),
                        operario: racion.operario || undefined,
                      });
                      toast.success("Ración registrada");
                      setRacion({ loteId: "", tipoAlimento: "TMR engorde", cantidadKg: "", operario: "" });
                      cargar(empresaId, { silent: true });
                    }}
                  >
                    Entregar
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {lotes.map((l) => (
                  <div key={l.loteId} className={`${CARD} p-4`}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400/90">{l.codigo} · {l.tipo}</p>
                    <p className="text-sm font-semibold mt-1">{l.nombre}</p>
                    <div className="mt-3">
                      <Occupancy current={l.animales} max={l.capacidad} />
                    </div>
                    {l.camaraCodigo ? <p className="text-[11px] text-white/35 mt-2">{l.camaraCodigo}</p> : null}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {raciones.map((r) => (
                  <div key={r.racionId} className={`${CARD} px-4 py-3 flex justify-between gap-3 items-center`}>
                    <div>
                      <p className="text-sm font-medium">{r.tipoAlimento}</p>
                      <p className="text-[12px] text-white/40 mt-0.5">
                        {r.loteCodigo} · {fmtKg(r.cantidadKg)} · {r.operario || "sin operario"}
                      </p>
                    </div>
                    <p className="text-[11px] text-white/35 shrink-0">
                      {new Date(r.fechaEntrega).toLocaleString("es-PY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "dispositivos" && (
            <div className="space-y-3">
              <p className="text-sm text-white/45 px-1">
                Inventario IoT del confinamiento: collares, cámaras y balanzas. El estado en vivo llega cuando el hardware está conectado.
              </p>
              {dispositivos.map((d) => (
                <div key={d.dispositivoId} className={`${CARD} px-4 py-3.5 flex items-center justify-between gap-3`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{d.codigo}</p>
                    <p className="text-[12px] text-white/40 mt-0.5">
                      {d.tipo}
                      {d.animalCodigo ? ` · animal #${d.animalCodigo}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {d.bateriaPct != null ? <BatteryBar pct={d.bateriaPct} /> : null}
                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                      d.estado === "Online"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}>
                      {d.estado}
                    </span>
                  </div>
                </div>
              ))}
              {!dispositivos.length && (
                <div className={`${CARD} py-14 text-center text-sm text-white/40`}>Sin dispositivos cargados.</div>
              )}
            </div>
          )}

          {tab === "zonas" && (
            <div className="space-y-3">
              <p className="text-sm text-white/45 px-1">
                Cerca virtual del establecimiento. El collar GPS valida si un animal sale del perímetro permitido.
              </p>
              {zonas.map((z) => (
                <div key={z.zonaId} className={`${CARD} px-4 py-4`}>
                  <div className="flex justify-between gap-2 items-start">
                    <div>
                      <p className="text-sm font-semibold">{z.nombre}</p>
                      <p className="text-[12px] text-white/40 mt-1">
                        Radio {fmtNum(z.radioMetros)} m
                        {z.latCentro != null ? ` · ${z.latCentro}, ${z.lngCentro}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      z.tipo === "Prohibida" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
                    }`}>
                      {z.tipo}
                    </span>
                  </div>
                </div>
              ))}
              {alertas.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 space-y-2 mt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Alertas abiertas en zona</p>
                  {alertas.map((a) => (
                    <p key={a.alertaId} className="text-sm text-amber-50/90">{a.titulo}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
