"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarClock, CheckCircle2,
  CircleDollarSign, Clock, FileWarning, TrendingUp, Wallet,
} from "lucide-react";
import { formatFecha, formatGs } from "./VordiaClientesPage";

type Props = {
  empresaId: number;
  nombreUsuario?: string;
  onNavigate?: (vista: string) => void;
};

type PipelineCol = { estado: string; cantidad: number; clientes: any[] };
type Flujo = {
  cobradoMesActual: number;
  cobradoTotal: number;
  mrrActivo: number;
  arrProyectado: number;
  pendienteCobro: number;
  ultimosMeses: { periodo: string; ingresos: number; cantidadPagos: number }[];
  reparto: { nombre: string; porcentaje: number; montoMes: number }[];
};
type Tarea = {
  tareaId: number;
  titulo: string;
  estado: string;
  prioridad: string;
  fechaVencimiento?: string | null;
  asignadoNombre?: string | null;
  vencida?: boolean;
  clienteNombre?: string | null;
};
type Contrato = {
  contratoId: number;
  clienteNombre: string;
  feeMensual: number;
  estadoPago: string;
  estadoContrato: string;
  proximoVencimiento?: string | null;
  esRecurrente: boolean;
};

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function VordiaHqInicio({ empresaId, nombreUsuario, onNavigate }: Props) {
  const [pipeline, setPipeline] = useState<PipelineCol[]>([]);
  const [flujo, setFlujo] = useState<Flujo | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientesCount, setClientesCount] = useState(0);
  const [capitalSaldo, setCapitalSaldo] = useState(0);
  const [nomina, setNomina] = useState(0);
  const [empleadosActivos, setEmpleadosActivos] = useState(0);
  const [objetivosAbiertos, setObjetivosAbiertos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [p, f, t, c, cl, cap, emp, obj] = await Promise.all([
          fetch(`${API_BASE}/api/Crm/pipeline?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/flujo-caja?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/tareas?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/contratos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/capital?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/empleados-hq?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/objetivos?empresaId=${empresaId}`),
        ]);
        if (cancelled) return;
        if (p.ok) setPipeline(await p.json());
        if (f.ok) setFlujo(await f.json());
        if (t.ok) setTareas(await t.json());
        if (c.ok) setContratos(await c.json());
        if (cl.ok) {
          const list = await cl.json();
          setClientesCount(Array.isArray(list) ? list.length : 0);
        }
        if (cap.ok) {
          const capJson = await cap.json();
          setCapitalSaldo(Number(capJson.saldoCapitalGs) || 0);
        }
        if (emp.ok) {
          const empJson = await emp.json();
          setNomina(Number(empJson.nominaMensualGs) || 0);
          setEmpleadosActivos(Number(empJson.cantidadActivos) || 0);
        }
        if (obj.ok) {
          const list = await obj.json();
          setObjetivosAbiertos(
            (list || []).filter((o: { estado?: string }) => o.estado === "Pendiente" || o.estado === "En curso").length
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [empresaId]);

  const stats = useMemo(() => {
    const totalOpp = pipeline.reduce((a, c) => a + c.cantidad, 0);
    const activos = pipeline.find((c) => c.estado === "Cliente activo")?.cantidad || 0;
    const cerrados = pipeline.find((c) => c.estado === "Cerrado")?.cantidad || 0;
    const conversion = totalOpp > 0 ? Math.round(((activos + cerrados) / totalOpp) * 100) : 0;
    const valorPipeline = pipeline
      .flatMap((c) => c.clientes || [])
      .reduce((a, c) => a + (Number(c.feeEstimadoMensual) || 0), 0);
    const propuestas = pipeline.find((c) => c.estado === "Propuesta enviada")?.cantidad || 0;
    const negociacion = pipeline.find((c) => c.estado === "En negociacion")?.cantidad || 0;

    const pend = tareas.filter((t) => t.estado === "Pendiente").length;
    const curso = tareas.filter((t) => t.estado === "En curso").length;
    const hechas = tareas.filter((t) => t.estado === "Hecha").length;
    const vencidas = tareas.filter((t) => {
      if (t.vencida) return true;
      if (t.estado === "Hecha" || t.estado === "Cancelada" || !t.fechaVencimiento) return false;
      return new Date(t.fechaVencimiento) < new Date();
    }).length;
    const cumplimiento = tareas.length ? Math.round((hechas / tareas.length) * 100) : 0;

    const contratosActivos = contratos.filter((c) => c.estadoContrato === "Activo");
    const porVencer = contratosActivos
      .filter((c) => c.proximoVencimiento)
      .sort((a, b) => String(a.proximoVencimiento).localeCompare(String(b.proximoVencimiento)))
      .slice(0, 5);
    const pendientesPago = contratosActivos.filter((c) => c.estadoPago === "Pendiente" || c.estadoPago === "Vencido").length;

    const health = Math.min(100, Math.max(40,
      70
      + (flujo?.mrrActivo ? 10 : 0)
      + (conversion > 20 ? 8 : 0)
      - Math.min(20, vencidas * 4)
      - Math.min(15, pendientesPago * 3)
    ));

    return {
      totalOpp, activos, conversion, valorPipeline, propuestas, negociacion,
      pend, curso, hechas, vencidas, cumplimiento, porVencer, pendientesPago, health,
    };
  }, [pipeline, flujo, tareas, contratos]);

  const maxMes = Math.max(1, ...(flujo?.ultimosMeses?.map((m) => m.ingresos) || [1]));
  const firstName = (nombreUsuario || "equipo").split(" ")[0];

  const alertas = [
    stats.pendientesPago > 0 && { nivel: "CRITICO", texto: `${stats.pendientesPago} contrato(s) con pago pendiente/vencido`, vista: "vordia_contratos" },
    stats.vencidas > 0 && { nivel: "CRITICO", texto: `${stats.vencidas} tarea(s) vencida(s)`, vista: "vordia_tareas" },
    stats.propuestas > 0 && { nivel: "ALERTA", texto: `${stats.propuestas} propuesta(s) enviada(s) en seguimiento`, vista: "vordia_pipeline" },
    (flujo?.pendienteCobro || 0) > 0 && { nivel: "ALERTA", texto: `Pendiente de cobro: ${formatGs(flujo?.pendienteCobro)}`, vista: "vordia_ingresos" },
    stats.negociacion > 0 && { nivel: "ATENCION", texto: `${stats.negociacion} negociación(es) abiertas`, vista: "vordia_pipeline" },
    capitalSaldo <= 0 && { nivel: "ATENCION", texto: "Capital empresa sin registrar — documentá aportes", vista: "vordia_capital" },
    objetivosAbiertos > 0 && { nivel: "ATENCION", texto: `${objetivosAbiertos} objetivo(s) abierto(s) para reunión con socia`, vista: "vordia_objetivos" },
  ].filter(Boolean) as { nivel: string; texto: string; vista: string }[];

  if (loading && !flujo) {
    return <p className="text-slate-500 text-sm p-6">Cargando centro ejecutivo…</p>;
  }

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4 lg:space-y-5 pb-4">
      {/* Saludo */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight">
            ¡{saludo()}, {firstName}!
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Centro ejecutivo Vordia HQ · {clientesCount} clientes · fuente única de verdad operativa y financiera.
          </p>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 shrink-0">
          Periodo: {new Date().toLocaleDateString("es-PY", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { l: "CRM", v: "vordia_pipeline" },
          { l: "Productos", v: "vordia_productos" },
          { l: "Proyectos", v: "vordia_proyectos" },
          { l: "Objetivos", v: "vordia_objetivos" },
          { l: "Capital", v: "vordia_capital" },
          { l: "Proveedores", v: "vordia_proveedores" },
        ].map((a) => (
          <button
            key={a.v}
            type="button"
            onClick={() => onNavigate?.(a.v)}
            className="rounded-xl border border-white/10 bg-[#0C1327] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-300 hover:border-[#007bff]/50 hover:text-white transition"
          >
            {a.l}
          </button>
        ))}
      </div>

      {/* KPIs MTD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 lg:gap-3">
        {[
          { l: "Ingresos cobrados (mes)", v: formatGs(flujo?.cobradoMesActual), c: "text-[#5eb0ff]", icon: <CircleDollarSign size={16} />, go: "vordia_ingresos" },
          { l: "MRR activo", v: formatGs(flujo?.mrrActivo), c: "text-emerald-400", icon: <TrendingUp size={16} />, go: "vordia_caja" },
          { l: "Pendiente cobro", v: formatGs(flujo?.pendienteCobro), c: "text-amber-300", icon: <Wallet size={16} />, go: "vordia_cxc" },
          { l: "Capital empresa", v: formatGs(capitalSaldo), c: "text-sky-300", icon: <CircleDollarSign size={16} />, go: "vordia_capital" },
          { l: "Nómina / mes", v: formatGs(nomina), c: "text-violet-300", icon: <Wallet size={16} />, go: "vordia_gastos" },
          { l: "Empleados", v: String(empleadosActivos), c: "text-white", icon: <CheckCircle2 size={16} />, go: "vordia_gastos" },
          { l: "Objetivos abiertos", v: String(objetivosAbiertos), c: "text-amber-200", icon: <AlertTriangle size={16} />, go: "vordia_objetivos" },
        ].map((k) => (
          <button
            key={k.l}
            type="button"
            onClick={() => onNavigate?.(k.go)}
            className="text-left rounded-2xl border border-white/5 bg-[#0C1327] p-3.5 lg:p-4 min-w-0 overflow-hidden hover:border-[#007bff]/40 transition"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] truncate">{k.l}</p>
              <span className={`${k.c} shrink-0 opacity-80`}>{k.icon}</span>
            </div>
            <p className={`metric-amount text-base lg:text-lg font-semibold ${k.c}`}>{k.v}</p>
          </button>
        ))}
      </div>

      {/* Fila media: financiero + pipeline + health */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 lg:gap-4">
        <div className="xl:col-span-5 rounded-2xl border border-white/5 bg-[#0C1327] p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Resumen financiero</h3>
            <button type="button" onClick={() => onNavigate?.("vordia_caja")} className="text-[10px] font-bold uppercase text-[#5eb0ff]">
              Ver flujo →
            </button>
          </div>
          {(flujo?.ultimosMeses || []).length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">Sin pagos registrados aún.</p>
          ) : (
            <div className="space-y-2.5">
              {flujo!.ultimosMeses.map((m) => (
                <div key={m.periodo}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">{m.periodo}</span>
                    <span className="text-white font-medium">{formatGs(m.ingresos)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#050B18] overflow-hidden">
                    <div className="h-full rounded-full bg-[#007bff]" style={{ width: `${Math.max(8, (m.ingresos / maxMes) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-[#050B18]/80 border border-white/5 p-3">
              <p className="text-[9px] uppercase text-slate-500 font-bold">Cobrado total</p>
              <p className="metric-amount text-sm text-emerald-300 mt-1">{formatGs(flujo?.cobradoTotal)}</p>
            </div>
            <div className="rounded-xl bg-[#050B18]/80 border border-white/5 p-3">
              <p className="text-[9px] uppercase text-slate-500 font-bold">Health score</p>
              <p className="text-sm text-white mt-1 font-semibold">{stats.health}/100</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl border border-white/5 bg-[#0C1327] p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Pipeline comercial</h3>
            <button type="button" onClick={() => onNavigate?.("vordia_pipeline")} className="text-[10px] font-bold uppercase text-[#5eb0ff]">
              Abrir →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <MiniStat label="Abiertas" value={String(stats.totalOpp - stats.activos)} />
            <MiniStat label="Valor fee/mes" value={formatGs(stats.valorPipeline)} />
            <MiniStat label="Propuestas" value={String(stats.propuestas)} />
            <MiniStat label="Conversión" value={`${stats.conversion}%`} />
          </div>
          <div className="space-y-1.5">
            {pipeline.map((col) => {
              const pct = stats.totalOpp ? Math.round((col.cantidad / stats.totalOpp) * 100) : 0;
              return (
                <div key={col.estado} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-[10px] text-slate-400 truncate">{col.estado}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#050B18] overflow-hidden">
                    <div className="h-full rounded-full bg-[#007bff]/80" style={{ width: `${Math.max(col.cantidad ? 6 : 0, pct)}%` }} />
                  </div>
                  <span className="w-6 text-right text-[10px] text-white font-bold">{col.cantidad}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-3 rounded-2xl border border-white/5 bg-[#0C1327] p-4 lg:p-5 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-3">Vordia Health Score</p>
          <div className="relative h-28 w-28 rounded-full border-[10px] border-[#1e3a5f] flex items-center justify-center mb-3">
            <div
              className="absolute inset-[-10px] rounded-full border-[10px] border-transparent border-t-emerald-400 border-r-emerald-400 rotate-45"
              aria-hidden
            />
            <span className="text-2xl font-semibold text-white">{stats.health}</span>
          </div>
          <p className="text-xs font-semibold text-emerald-300">
            {stats.health >= 80 ? "Muy saludable" : stats.health >= 60 ? "Estable" : "Requiere atención"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">/100 · operativo</p>
        </div>
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Tareas</h3>
            <button type="button" onClick={() => onNavigate?.("vordia_tareas")} className="text-[10px] font-bold uppercase text-[#5eb0ff]">Ver →</button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative h-20 w-20 rounded-full border-8 border-[#1e3a5f] flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">{stats.cumplimiento}%</span>
            </div>
            <div className="space-y-1 text-xs flex-1">
              <RowStat label="Pendientes" n={stats.pend} />
              <RowStat label="En curso" n={stats.curso} />
              <RowStat label="Vencidas" n={stats.vencidas} danger />
              <RowStat label="Completadas" n={stats.hechas} ok />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">Cumplimiento del tablero actual</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Próximos cobros</h3>
            <CalendarClock size={14} className="text-[#007bff]" />
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stats.porVencer.length === 0 && (
              <p className="text-xs text-slate-500 py-6 text-center">Sin vencimientos próximos.</p>
            )}
            {stats.porVencer.map((c) => (
              <div key={c.contratoId} className="flex justify-between gap-2 rounded-xl border border-white/5 bg-[#050B18]/70 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{c.clienteNombre}</p>
                  <p className="text-[10px] text-slate-500">{formatFecha(c.proximoVencimiento)} · {c.estadoPago}</p>
                </div>
                <p className="text-xs font-semibold text-[#5eb0ff] shrink-0">{formatGs(c.feeMensual)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4 lg:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Requiere atención</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alertas.length === 0 && (
              <p className="text-xs text-emerald-400/80 py-6 text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={14} /> Sin excepciones críticas
              </p>
            )}
            {alertas.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigate?.(a.vista)}
                className="w-full text-left flex items-start gap-2 rounded-xl border border-white/5 bg-[#050B18]/70 px-3 py-2.5 hover:bg-white/[0.03]"
              >
                <FileWarning size={14} className={
                  a.nivel === "CRITICO" ? "text-red-400 mt-0.5 shrink-0" :
                  a.nivel === "ALERTA" ? "text-amber-400 mt-0.5 shrink-0" : "text-sky-400 mt-0.5 shrink-0"
                } />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{a.nivel}</p>
                  <p className="text-xs text-slate-200 mt-0.5">{a.texto}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hoy / próximas acciones + reparto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4 lg:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-[#007bff]" />
            <h3 className="text-sm font-semibold text-white">Hoy · próximas acciones</h3>
          </div>
          <div className="space-y-2">
            {tareas
              .filter((t) => t.estado === "Pendiente" || t.estado === "En curso")
              .slice(0, 6)
              .map((t) => (
                <button
                  key={t.tareaId}
                  type="button"
                  onClick={() => onNavigate?.("vordia_tareas")}
                  className="w-full text-left flex gap-3 rounded-xl border border-white/5 bg-[#050B18]/60 px-3 py-2.5 hover:border-[#007bff]/40"
                >
                  <div className="w-16 shrink-0 text-[10px] font-bold text-slate-500 pt-0.5">
                    {formatFecha(t.fechaVencimiento)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{t.titulo}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {t.asignadoNombre || "Sin asignar"}
                      {t.clienteNombre ? ` · ${t.clienteNombre}` : ""}
                      {t.vencida ? " · VENCIDA" : ""}
                    </p>
                  </div>
                </button>
              ))}
            {tareas.filter((t) => t.estado === "Pendiente" || t.estado === "En curso").length === 0 && (
              <p className="text-xs text-slate-500 py-6 text-center">Sin tareas abiertas.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Reparto de socios (mes)</h3>
            <button type="button" onClick={() => onNavigate?.("vordia_caja")} className="text-[10px] font-bold uppercase text-[#5eb0ff]">Detalle →</button>
          </div>
          <div className="space-y-2">
            {(flujo?.reparto || []).map((r) => (
              <div key={r.nombre} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#050B18]/60 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{r.nombre}</p>
                  <p className="text-[10px] text-slate-500">{r.porcentaje}%</p>
                </div>
                <p className="text-sm font-semibold text-emerald-300">{formatGs(r.montoMes)}</p>
              </div>
            ))}
            {!(flujo?.reparto || []).length && (
              <p className="text-xs text-slate-500 py-6 text-center">Configurá socios en Flujo de caja.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#050B18]/80 border border-white/5 p-2.5">
      <p className="text-[9px] uppercase text-slate-500 font-bold">{label}</p>
      <p className="metric-amount text-xs text-white mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function RowStat({ label, n, danger, ok }: { label: string; n: number; danger?: boolean; ok?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${danger ? "text-red-400" : ok ? "text-emerald-400" : "text-white"}`}>{n}</span>
    </div>
  );
}
