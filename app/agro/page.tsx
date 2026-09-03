"use client";

import { API_BASE, installAuthFetch } from "@/lib/api";
import { loadVordiaSession } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Sprout, RefreshCw, AlertTriangle, Scale, Beef, Radio, MapPin, CheckCircle2, Plus,
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

function estadoAnimal(e: string) {
  if (e === "FueraZona") return "text-rose-300";
  if (e === "Tratamiento") return "text-amber-300";
  if (e === "Activo") return "text-emerald-300";
  return "text-slate-400";
}

type Tab = "dashboard" | "animales" | "alimentacion" | "dispositivos" | "zonas";

export default function AgroPage() {
  const [empresaId, setEmpresaId] = useState(0);
  const [contextoListo, setContextoListo] = useState(false);
  const [contextoLabel, setContextoLabel] = useState("Agrofield");
  const [loginHint, setLoginHint] = useState("Resolviendo empresa Agrofield…");

  useEffect(() => {
    installAuthFetch();
    const s = loadVordiaSession();
    const sessionEmp = Number(s?.user?.empresaId || s?.user?.EmpresaId || 0) || 0;
    const rubro = String(s?.user?.rubro || s?.user?.Rubro || "").toUpperCase();
    setLoginHint(
      rubro === "VORDIA"
        ? `Sesión HQ · ${s?.user?.email || "usuario Vordia"} → datos de empresa Agrofield`
        : rubro === "AGRO"
          ? "Sesión Agrofield"
          : "Resolviendo empresa Agrofield…"
    );

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
        if (rubro === "AGRO" && sessionEmp) {
          setEmpresaId(sessionEmp);
        } else if (sessionEmp) {
          // último recurso: empresa de la sesión
          setEmpresaId(sessionEmp);
        } else {
          toast.error("No está la empresa Agrofield", {
            description: "En GESCO_DB debe existir Empresas.RazonSocial = Agrofield (Seed_Agrofield_Empresa.sql)",
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

  const cargar = async (empId = empresaId) => {
    if (!empId) {
      // Todavía resolviendo contexto; no molestar con toast falso
      if (contextoListo) {
        toast.error("Sin empresa Agrofield. Revisá el seed en GESCO_DB.");
        setLoading(false);
      }
      return;
    }
    try {
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
      if (d) toast.success(`Agrofield sincronizado · ${d.nombre}`);
    } catch (e: any) {
      toast.error("No se pudo cargar Agro", {
        description: e?.message || `¿API en ${API_BASE}? ¿SQL Create_Vordia_Agro ejecutado?`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!empresaId) return;
    void cargar(empresaId);
  }, [empresaId]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "animales", label: "Ganado" },
    { id: "alimentacion", label: "Alimentación" },
    { id: "dispositivos", label: "Dispositivos" },
    { id: "zonas", label: "Zonas / cerca" },
  ];

  return (
    <div className="min-h-screen bg-[#07110a] text-white">
      <div className="border-b border-emerald-900/40 bg-[#0a1810]">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Vordia Agro · prototipo</p>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 mt-1">
              <Sprout className="text-emerald-400" size={22} />
              {dash?.clienteNombre || contextoLabel}
            </h1>
            <p className="text-sm text-emerald-100/60 mt-1">
              {dash?.nombre || "sin establecimiento"}
              {dash?.ubicacion ? ` · ${dash.ubicacion}` : ""}
            </p>
            {loginHint && (
              <p className="text-[11px] text-emerald-300/70 mt-1.5">{loginHint}</p>
            )}
          </div>
          <Button onClick={() => void cargar()} className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold gap-2 shrink-0">
            <RefreshCw size={14} /> Sincronizar
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {!ping && !loading && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Sin respuesta de <code>/api/Agro/ping</code>. Ejecutá <code>Create_Vordia_Agro.sql</code> y reiniciá la API.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wide border transition ${
                tab === t.id
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-[#0d1a12] border-emerald-900/40 text-emerald-100/70 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-emerald-100/50 text-sm py-8">Cargando confinamiento Agrofield…</p>
        ) : (
          <>
            {tab === "dashboard" && dash && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { l: "Animales activos", v: String(dash.animalesActivos), icon: <Beef size={16} /> },
                    { l: "Fuera de zona", v: String(dash.animalesFueraZona), icon: <MapPin size={16} /> },
                    { l: "Alertas abiertas", v: String(dash.alertasAbiertas), icon: <AlertTriangle size={16} /> },
                    { l: "Alimento 7d", v: fmtKg(dash.alimentoKg7d), icon: <Scale size={16} /> },
                    { l: "GPD promedio", v: dash.gpdPromedioKg != null ? `${dash.gpdPromedioKg} kg/d` : "—", icon: <Beef size={16} /> },
                    { l: "Conversión est.", v: dash.conversionEstimada != null ? `${dash.conversionEstimada} : 1` : "—", icon: <Scale size={16} /> },
                    { l: "Disp. online", v: String(dash.dispositivosOnline), icon: <Radio size={16} /> },
                    { l: "Lotes / corrales", v: String(dash.lotes), icon: <MapPin size={16} /> },
                  ].map((k) => (
                    <div key={k.l} className="rounded-2xl border border-emerald-900/40 bg-[#0d1a12] p-4">
                      <div className="flex justify-between text-emerald-400/80 mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/50">{k.l}</p>
                        {k.icon}
                      </div>
                      <p className="text-xl font-semibold">{k.v}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-emerald-900/40 bg-[#0d1a12] p-4 space-y-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400" /> Alertas operativas
                  </h2>
                  {(dash.ultimasAlertas || []).length === 0 && (
                    <p className="text-sm text-emerald-100/40 py-4 text-center">Sin alertas abiertas</p>
                  )}
                  {(dash.ultimasAlertas || []).map((a) => (
                    <div key={a.alertaId} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-xl border border-emerald-900/30 bg-[#07110a] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase ${a.severidad === "Alta" ? "text-rose-300" : "text-amber-300"}`}>
                          {a.severidad} · {a.tipo}{a.animalCodigo ? ` · #${a.animalCodigo}` : ""}
                        </p>
                        <p className="text-sm font-medium">{a.titulo}</p>
                        {a.detalle && <p className="text-[11px] text-emerald-100/50 mt-0.5">{a.detalle}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-emerald-800 text-emerald-200 shrink-0 gap-1"
                        onClick={async () => {
                          await agroResolverAlerta(empresaId, a.alertaId);
                          toast.success("Alerta resuelta");
                          cargar();
                        }}
                      >
                        <CheckCircle2 size={12} /> Resolver
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-emerald-900/40 bg-[#0d1a12] p-4 text-xs text-emerald-100/55 space-y-1">
                  <p className="font-bold uppercase tracking-wide text-emerald-300/80">Arquitectura (próximo hardware)</p>
                  <p>Collar GPS/LoRa → Gateway campo → Servidor local → esta plataforma.</p>
                  <p>Módulos: Ganado · Alimentación · Maquinaria · Personal · Seguridad/cámaras · Gerencial.</p>
                  <p>Hoy: datos + operación. Después: pings reales de collares, balanzas RFID y cámaras IA.</p>
                </div>
              </div>
            )}

            {tab === "animales" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-900/40 bg-[#0d1a12] p-4 space-y-3">
                  <p className="text-sm font-semibold">Alta animal</p>
                  <div className="grid sm:grid-cols-5 gap-2">
                    <Input value={nuevoAnimal.codigoInterno} onChange={(e) => setNuevoAnimal({ ...nuevoAnimal, codigoInterno: e.target.value })} placeholder="Código *" className="bg-[#07110a] border-emerald-900/50 rounded-xl" />
                    <Input value={nuevoAnimal.categoria} onChange={(e) => setNuevoAnimal({ ...nuevoAnimal, categoria: e.target.value })} placeholder="Categoría" className="bg-[#07110a] border-emerald-900/50 rounded-xl" />
                    <select value={nuevoAnimal.loteId} onChange={(e) => setNuevoAnimal({ ...nuevoAnimal, loteId: e.target.value })} className="bg-[#07110a] border border-emerald-900/50 rounded-xl px-3 text-sm">
                      <option value="">Sin lote</option>
                      {lotes.map((l) => <option key={l.loteId} value={l.loteId}>{l.codigo}</option>)}
                    </select>
                    <Input type="number" value={nuevoAnimal.pesoIngresoKg} onChange={(e) => setNuevoAnimal({ ...nuevoAnimal, pesoIngresoKg: e.target.value })} placeholder="Peso ingreso kg" className="bg-[#07110a] border-emerald-900/50 rounded-xl" />
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold gap-1"
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
                        cargar();
                      }}
                    >
                      <Plus size={14} /> Alta
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-900/40 bg-[#0d1a12] p-4 space-y-3">
                  <p className="text-sm font-semibold">Registrar pesaje</p>
                  <div className="grid sm:grid-cols-4 gap-2">
                    <select value={pesaje.animalId} onChange={(e) => setPesaje({ ...pesaje, animalId: e.target.value })} className="bg-[#07110a] border border-emerald-900/50 rounded-xl px-3 text-sm">
                      <option value="">Animal</option>
                      {animales.map((a) => <option key={a.animalId} value={a.animalId}>#{a.codigoInterno}</option>)}
                    </select>
                    <Input type="number" value={pesaje.pesoKg} onChange={(e) => setPesaje({ ...pesaje, pesoKg: e.target.value })} placeholder="Peso kg" className="bg-[#07110a] border-emerald-900/50 rounded-xl" />
                    <Input value={pesaje.operario} onChange={(e) => setPesaje({ ...pesaje, operario: e.target.value })} placeholder="Operario" className="bg-[#07110a] border-emerald-900/50 rounded-xl" />
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold"
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
                        cargar();
                      }}
                    >
                      Guardar peso
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {animales.map((a) => (
                    <div key={a.animalId} className="rounded-xl border border-emerald-900/40 bg-[#0d1a12] p-3.5 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">#{a.codigoInterno}</p>
                          <span className="text-[10px] uppercase text-emerald-100/50">{a.categoria}</span>
                          <span className="text-[10px] font-bold text-emerald-400">{a.loteCodigo || "sin lote"}</span>
                          <span className={`text-[10px] font-bold ${estadoAnimal(a.estado)}`}>{a.estado}</span>
                        </div>
                        <p className="text-[11px] text-emerald-100/50 mt-1">
                          Ingreso {fmtKg(a.pesoIngresoKg)} → actual {fmtKg(a.pesoActualKg)}
                          {a.gananciaKg != null ? ` · +${fmtKg(a.gananciaKg)}` : ""}
                          {a.gpdKg != null ? ` · GPD ${a.gpdKg} kg/d` : ""}
                          {a.bateriaCollarPct != null ? ` · batería ${a.bateriaCollarPct}%` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-rose-800/50 text-rose-200 shrink-0"
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
                          cargar();
                        }}
                      >
                        Simular fuera zona
                      </Button>
                    </div>
                  ))}
                  {!animales.length && <p className="text-center text-emerald-100/40 py-8 text-sm">Sin animales. Ejecutá el seed o cargá el primero.</p>}
                </div>
              </div>
            )}

            {tab === "alimentacion" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-900/40 bg-[#0d1a12] p-4 space-y-3">
                  <p className="text-sm font-semibold">Registrar ración entregada</p>
                  <div className="grid sm:grid-cols-5 gap-2">
                    <select value={racion.loteId} onChange={(e) => setRacion({ ...racion, loteId: e.target.value })} className="bg-[#07110a] border border-emerald-900/50 rounded-xl px-3 text-sm">
                      <option value="">Lote</option>
                      {lotes.map((l) => <option key={l.loteId} value={l.loteId}>{l.codigo}</option>)}
                    </select>
                    <Input value={racion.tipoAlimento} onChange={(e) => setRacion({ ...racion, tipoAlimento: e.target.value })} placeholder="Tipo alimento" className="bg-[#07110a] border-emerald-900/50 rounded-xl" />
                    <Input type="number" value={racion.cantidadKg} onChange={(e) => setRacion({ ...racion, cantidadKg: e.target.value })} placeholder="Kg" className="bg-[#07110a] border-emerald-900/50 rounded-xl" />
                    <Input value={racion.operario} onChange={(e) => setRacion({ ...racion, operario: e.target.value })} placeholder="Operario" className="bg-[#07110a] border-emerald-900/50 rounded-xl" />
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold"
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
                        cargar();
                      }}
                    >
                      Entregar
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {lotes.map((l) => (
                    <div key={l.loteId} className="rounded-2xl border border-emerald-900/40 bg-[#0d1a12] p-4">
                      <p className="text-[10px] font-black uppercase text-emerald-400">{l.codigo} · {l.tipo}</p>
                      <p className="text-sm font-semibold mt-1">{l.nombre}</p>
                      <p className="text-[11px] text-emerald-100/50 mt-2">
                        {l.animales}/{l.capacidad} animales
                        {l.camaraCodigo ? ` · ${l.camaraCodigo}` : ""}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {raciones.map((r) => (
                    <div key={r.racionId} className="rounded-xl border border-emerald-900/40 bg-[#0d1a12] px-3 py-2.5 flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{r.tipoAlimento} · {r.loteCodigo}</p>
                        <p className="text-[11px] text-emerald-100/50">
                          {fmtKg(r.cantidadKg)} · {r.operario || "—"} · {r.vehiculo || "—"}
                        </p>
                      </div>
                      <p className="text-xs text-emerald-100/40 shrink-0">{new Date(r.fechaEntrega).toLocaleString("es-PY")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "dispositivos" && (
              <div className="space-y-3">
                <p className="text-sm text-emerald-100/55">
                  Inventario IoT del confinamiento. Los collares/cámaras/balanzas se cablearán después; hoy simulamos estado y batería.
                </p>
                {dispositivos.map((d) => (
                  <div key={d.dispositivoId} className="rounded-xl border border-emerald-900/40 bg-[#0d1a12] px-3 py-3 flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{d.codigo}</p>
                      <p className="text-[11px] text-emerald-100/50">
                        {d.tipo}
                        {d.animalCodigo ? ` · animal #${d.animalCodigo}` : ""}
                        {d.bateriaPct != null ? ` · ${d.bateriaPct}%` : ""}
                      </p>
                    </div>
                    <span className={`text-[11px] font-bold ${d.estado === "Online" ? "text-emerald-300" : "text-amber-300"}`}>
                      {d.estado}
                    </span>
                  </div>
                ))}
                {!dispositivos.length && <p className="text-center text-emerald-100/40 py-8 text-sm">Sin dispositivos en seed.</p>}
              </div>
            )}

            {tab === "zonas" && (
              <div className="space-y-3">
                <p className="text-sm text-emerald-100/55">
                  Cerca virtual (prototipo): zonas permitidas/prohibidas con centro + radio. El collar GPS validará límites en la etapa hardware.
                </p>
                {zonas.map((z) => (
                  <div key={z.zonaId} className="rounded-xl border border-emerald-900/40 bg-[#0d1a12] px-3 py-3">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-semibold">{z.nombre}</p>
                      <span className={`text-[10px] font-bold uppercase ${z.tipo === "Prohibida" ? "text-rose-300" : "text-emerald-300"}`}>
                        {z.tipo}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100/50 mt-1">
                      Radio {fmtNum(z.radioMetros)} m
                      {z.latCentro != null ? ` · ${z.latCentro}, ${z.lngCentro}` : ""}
                    </p>
                  </div>
                ))}
                {alertas.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 mt-4">
                    <p className="text-xs font-bold uppercase text-amber-300">Alertas abiertas vinculadas</p>
                    {alertas.map((a) => (
                      <p key={a.alertaId} className="text-sm text-amber-50/90">{a.titulo}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <p className="text-[10px] text-emerald-900 pt-4 pb-8 text-center">
          Ruta <code className="text-emerald-700">/agro</code> · no está en menú HQ/Habitat a propósito · producto hermano de Stay · cliente demo Agrofield
        </p>
      </div>
    </div>
  );
}
