"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Circle,
  Clock,
  Coins,
  DollarSign,
  FileText,
  Link2,
  Package,
  Play,
  Plus,
  Rocket,
  Settings,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
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
  reparto: { nombre: string; porcentaje: number; montoMes: number; montoTotal?: number }[];
};
type CapitalMov = { capitalId: number; tipo: string; montoGs: number; fecha: string; concepto?: string };
type CapitalResumen = {
  saldoCapitalGs: number;
  totalAportes: number;
  totalRetiros: number;
  movimientos: CapitalMov[];
};
type EmpleadosResumen = { cantidadActivos: number; nominaMensualGs: number };
type Pago = {
  pagoId: number;
  monto: number;
  fechaPago: string;
  clienteNombre?: string | null;
  concepto?: string | null;
  estado: string;
};
type IngresosResumen = {
  contratosActivos: number;
  contratosPendientesPago: number;
  contratosVencidos: number;
};
type Gasto = {
  gastoId: number;
  concepto: string;
  categoria: string;
  montoGs: number;
  fechaVencimiento?: string | null;
  fechaPago?: string | null;
  estado: string;
  proveedorNombre?: string | null;
  vencido: boolean;
  diasParaVencer?: number | null;
};
type GastosResumen = {
  pagadoMesActual: number;
  pagadoTotal: number;
  pendienteTotal: number;
  cantidadPendientes: number;
  venceProximos7Dias: number;
  cantidadVenceProximos7Dias: number;
  vencidoTotal: number;
  cantidadVencidos: number;
  gastos: Gasto[];
};
type Tarea = {
  tareaId: number;
  titulo: string;
  estado: string;
  prioridad: string;
  fechaVencimiento?: string | null;
  asignadoNombre?: string | null;
  vencida?: boolean;
};
type Producto = {
  productoId: number;
  codigo: string;
  nombre: string;
  estado: string;
  notas?: string | null;
  ideaCentral?: string | null;
};
type Proyecto = {
  proyectoId: number;
  titulo: string;
  estado: string;
  responsableNombre?: string | null;
  fechaFin?: string | null;
  avancePct?: number;
};
type RoadmapItem = {
  roadmapId: number;
  titulo: string;
  tipo?: string;
  estado: string;
  proximoPaso?: string | null;
  responsableNombre?: string | null;
};
type Objetivo = {
  objetivoId: number;
  titulo: string;
  estado: string;
  /** El backend lo expone como fechaObjetivo, no fechaMeta. */
  fechaObjetivo?: string | null;
  avancePct?: number | null;
  creadoPor?: string | null;
  metaValor?: number | null;
  valorActual?: number | null;
};
type Cliente = {
  clienteId: number;
  razonSocial: string;
  estadoPipeline: string;
  proximosPasos?: string | null;
  fechaEstimadaCierre?: string | null;
};

const LOGO: Record<string, string> = {
  HQ: "/images/vordia-products/hq.png",
  HABITAT: "/images/vordia-products/habitat.png",
  STAY: "/images/vordia-products/stay.png",
  AGRO: "/images/vordia-products/agro.png",
  DINE: "/images/vordia-products/dine.png",
  RETAIL: "/images/vordia-products/retail.png",
};

function goProductoExterno(codigo: string, onNavigate?: (v: string) => void) {
  const c = codigo.toUpperCase();
  if (c === "STAY") {
    window.location.href = "/stay";
    return;
  }
  if (c === "AGRO") {
    window.location.href = "/agro";
    return;
  }
  onNavigate?.("vordia_productos");
}

function Pill({
  children,
  tone,
  dot = false,
}: {
  children: ReactNode;
  tone: "green" | "yellow" | "blue" | "gray" | "red" | "redOutline";
  dot?: boolean;
}) {
  const map = {
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    yellow: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    blue: "bg-[#007bff]/15 text-[#5eb0ff] border-[#007bff]/35",
    gray: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    red: "bg-red-500/15 text-red-300 border-red-500/35",
    redOutline: "bg-transparent text-red-300 border-red-500/50",
  };
  const dotMap = {
    green: "bg-emerald-400",
    yellow: "bg-amber-400",
    blue: "bg-[#5eb0ff]",
    gray: "bg-slate-400",
    red: "bg-red-400",
    redOutline: "bg-red-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotMap[tone]}`} />}
      {children}
    </span>
  );
}

function productoTone(estado: string): "green" | "yellow" | "blue" | "gray" {
  const e = (estado || "").toLowerCase();
  if (e.includes("operativ") || e.includes("activo")) return "green";
  if (e.includes("desarrollo") || e.includes("curso")) return "yellow";
  if (e.includes("prueba")) return "blue";
  return "gray";
}

function proyectoTone(estado: string, fechaFin?: string | null): "green" | "red" | "redOutline" | "yellow" | "blue" {
  const e = (estado || "").toLowerCase();
  if (e.includes("atras")) return "red";
  if (e.includes("bloque")) return "redOutline";
  if (e.includes("hecho") || e.includes("tiempo") || e.includes("curso")) {
    if (fechaFin && new Date(fechaFin) < new Date() && !e.includes("hecho")) return "red";
    return "green";
  }
  if (e.includes("paus")) return "yellow";
  return "blue";
}

function alianzaTone(estado: string): "green" | "yellow" | "blue" | "gray" {
  const e = (estado || "").toLowerCase();
  if (e.includes("activ")) return "green";
  if (e.includes("negoci")) return "yellow";
  if (e.includes("convers") || e.includes("evalu") || e.includes("curso")) return "blue";
  return "gray";
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  meta,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  meta?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-9 w-9 shrink-0 rounded-lg border border-[#1e3a5f]/70 bg-[#0d2547]/60 flex items-center justify-center">
          <Icon size={18} className="text-[#4da3ff]" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-white leading-tight truncate">{title}</h3>
          {subtitle && <p className="text-[12px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {meta && (
        <p className="text-[11px] text-slate-500 shrink-0 capitalize pt-1.5 hidden sm:block">{meta}</p>
      )}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
  footer,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-[#1e3a5f]/80 bg-[#0B1528] flex flex-col min-h-0 ${className}`}>
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
        <span className="h-7 w-7 shrink-0 rounded-md border border-[#1e3a5f]/60 bg-[#0d2547]/60 flex items-center justify-center">
          <Icon size={14} className="text-[#4da3ff]" />
        </span>
        <h3 className="text-[14px] font-semibold text-white truncate">{title}</h3>
      </div>
      <div className="px-4 flex-1 min-h-0">{children}</div>
      {footer && <div className="px-4 pt-3 pb-4 mt-auto">{footer}</div>}
    </div>
  );
}

function LinkFooter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#1e3a5f]/80 bg-[#060D1C]/40 py-2 text-[12px] font-semibold text-slate-300 hover:text-white hover:border-[#007bff]/45 transition"
    >
      {label}
      <ArrowRight size={13} className="shrink-0" />
    </button>
  );
}

function StatRow({
  icon: Icon,
  value,
  label,
  tone = "blue",
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  tone?: "blue" | "green" | "amber";
}) {
  const map = {
    blue: "text-[#4da3ff]",
    green: "text-emerald-300",
    amber: "text-amber-300",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#1e3a5f]/70 bg-[#060D1C]/50 px-3 py-2.5">
      <span className="h-9 w-9 shrink-0 rounded-lg bg-[#0d2547]/80 flex items-center justify-center">
        <Icon size={16} className={map[tone]} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-white leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function CounterBox({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[#1e3a5f]/70 bg-[#060D1C]/50 px-3 py-2.5">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-white leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

const KPI_TONOS = {
  green: { icono: "text-emerald-300", fondo: "bg-emerald-500/10", valor: "text-emerald-300" },
  blue: { icono: "text-[#4da3ff]", fondo: "bg-[#007bff]/10", valor: "text-white" },
  red: { icono: "text-rose-300", fondo: "bg-rose-500/10", valor: "text-white" },
  teal: { icono: "text-teal-300", fondo: "bg-teal-500/10", valor: "text-white" },
} as const;

function KpiCard({
  icon: Icon,
  label,
  valor,
  hint,
  pie,
  tono = "blue",
  destacada = false,
  disponible = true,
}: {
  icon: LucideIcon;
  label: string;
  valor: string;
  hint: string;
  pie: string;
  tono?: keyof typeof KPI_TONOS;
  destacada?: boolean;
  disponible?: boolean;
}) {
  const t = KPI_TONOS[tono];
  return (
    <div
      className={`rounded-2xl border bg-[#0B1528] px-4 py-3.5 flex flex-col ${
        destacada ? "border-[#007bff]/45" : "border-[#1e3a5f]/80"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${t.fondo}`}>
          <Icon size={15} className={t.icono} />
        </span>
        <p className="text-[12px] text-slate-400 truncate">{label}</p>
      </div>
      {disponible ? (
        <p className={`text-[19px] font-semibold mt-2.5 leading-tight ${t.valor}`}>{valor}</p>
      ) : (
        <p className="text-[19px] font-semibold mt-2.5 leading-tight text-slate-600">Sin datos</p>
      )}
      <p className="text-[10.5px] text-slate-500 mt-1.5 leading-snug flex-1">{hint}</p>
      <p className="text-[10px] text-slate-600 mt-2 capitalize">{pie}</p>
    </div>
  );
}

function MoneyChart({ serie, min, max }: { serie: number[]; min: number; max: number }) {
  const W = 600;
  const H = 190;
  const rango = max - min || 1;
  const yDe = (v: number) => H - ((v - min) / rango) * H;
  const pts = serie.map((v, i) => {
    const x = serie.length > 1 ? (i / (serie.length - 1)) * W : 0;
    return [x, yDe(v)] as const;
  });
  const linea = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const base = yDe(Math.max(min, 0)).toFixed(1);
  const area = `${linea} L${W},${base} L0,${base} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full h-[190px] overflow-visible"
      role="img"
      aria-label="Evolución del dinero cobrado acumulado en el mes"
    >
      <defs>
        <linearGradient id="areaDinero" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={0}
          x2={W}
          y1={H * f}
          y2={H * f}
          stroke="#1e3a5f"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} fill="url(#areaDinero)" />
      <path
        d={linea}
        fill="none"
        stroke="#4da3ff"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function objetivoIcon(titulo: string): LucideIcon {
  const t = (titulo || "").toLowerCase();
  if (t.includes("client")) return Users;
  if (t.includes("alianza") || t.includes("aliad")) return Link2;
  if (t.includes("lanza") || t.includes("launch")) return Rocket;
  return Target;
}

function formatCompact(n: number) {
  if (Math.abs(n) >= 1_000_000) {
    const m = n / 1_000_000;
    return `Gs. ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} M`;
  }
  return formatGs(n);
}

function vencimientoLabel(fecha?: string | null, vencida?: boolean) {
  if (vencida) return { text: "Atrasada", cls: "text-red-300" };
  if (!fecha) return { text: "—", cls: "text-slate-500" };
  const d = new Date(fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
  if (diff < 0) return { text: "Atrasada", cls: "text-red-300" };
  if (diff === 0) return { text: "Hoy", cls: "text-[#4da3ff]" };
  if (diff === 1) return { text: "Mañana", cls: "text-sky-300" };
  return { text: formatFecha(fecha), cls: "text-slate-400" };
}

export function VordiaHqInicio({ empresaId, nombreUsuario, onNavigate }: Props) {
  const [pipeline, setPipeline] = useState<PipelineCol[]>([]);
  const [flujo, setFlujo] = useState<Flujo | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [capital, setCapital] = useState<CapitalResumen | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadosResumen | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ingresos, setIngresos] = useState<IngresosResumen | null>(null);
  const [gastos, setGastos] = useState<GastosResumen | null>(null);
  const [loading, setLoading] = useState(true);

  const go = (vista: string) => onNavigate?.(vista);
  const mesLargo = new Date().toLocaleDateString("es-PY", { month: "long", year: "numeric" });
  const mesCorto = new Date().toLocaleDateString("es-PY", { month: "short" });

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [p, f, t, cl, prod, proy, road, obj, cap, emp, pag, ing, gas] = await Promise.all([
          fetch(`${API_BASE}/api/Crm/pipeline?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/flujo-caja?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/tareas?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/productos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/proyectos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/roadmap?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/objetivos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/capital?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/empleados-hq?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/pagos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/ingresos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/gastos?empresaId=${empresaId}`),
        ]);
        if (cancelled) return;
        if (p.ok) setPipeline(await p.json());
        if (f.ok) setFlujo(await f.json());
        if (t.ok) setTareas(await t.json());
        if (cl.ok) setClientes(await cl.json());
        if (prod.ok) setProductos(await prod.json());
        if (proy.ok) setProyectos(await proy.json());
        if (road.ok) setRoadmap(await road.json());
        if (obj.ok) setObjetivos(await obj.json());
        if (cap.ok) setCapital(await cap.json());
        if (emp.ok) setEmpleados(await emp.json());
        if (pag.ok) setPagos(await pag.json());
        if (ing.ok) setIngresos(await ing.json());
        if (gas.ok) setGastos(await gas.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  const data = useMemo(() => {
    const stages = [
      { key: "Prospecto", label: "Contacto inicial" },
      { key: "Contactado", label: "En conversación" },
      { key: "Propuesta enviada", label: "Propuesta enviada" },
      { key: "En negociacion", label: "Negociación" },
    ].map((s) => {
      const col = pipeline.find((c) => c.estado === s.key);
      return {
        label: s.label,
        cantidad: col?.cantidad || 0,
        clientes: col?.clientes || [],
      };
    });

    const valorOpp = pipeline
      .flatMap((c) => c.clientes || [])
      .reduce((a, c) => a + (Number(c.feeEstimadoMensual) || 0), 0);
    const abiertas = stages.reduce((a, s) => a + s.cantidad, 0);
    const maxStage = Math.max(1, ...stages.map((s) => s.cantidad));

    const activos = clientes.filter((c) => c.estadoPipeline === "Cliente activo").length;
    const nuevos = clientes.filter((c) =>
      ["Prospecto", "Contactado", "En negociacion", "Propuesta enviada"].includes(c.estadoPipeline)
    ).length;

    const pend = tareas.filter((t) => t.estado === "Pendiente").length;
    const curso = tareas.filter((t) => t.estado === "En curso").length;
    const vencidas = tareas.filter((t) => {
      if (t.vencida) return true;
      if (t.estado === "Hecha" || t.estado === "Cancelada" || !t.fechaVencimiento) return false;
      return new Date(t.fechaVencimiento) < new Date();
    }).length;

    const seguimientos = clientes
      .filter((c) => c.proximosPasos || c.estadoPipeline !== "Cerrado")
      .slice(0, 3);

    const tareasLista = [...tareas]
      .filter((t) => t.estado === "Pendiente" || t.estado === "En curso" || t.vencida)
      .sort((a, b) => String(a.fechaVencimiento || "9999").localeCompare(String(b.fechaVencimiento || "9999")))
      .slice(0, 4);

    const alianzas = roadmap.filter((r) => /alianza/i.test(r.tipo || ""));
    const alianzasShow = (alianzas.length ? alianzas : roadmap).slice(0, 4);

    const objs = objetivos
      .filter((o) => o.estado === "Pendiente" || o.estado === "En curso" || o.estado === "Logrado")
      .slice(0, 3);

    const vendedores = (flujo?.reparto || []).map((r) => ({
      nombre: r.nombre,
      ventas: r.montoTotal ?? r.montoMes,
      meta: Math.round(r.porcentaje),
    }));

    return {
      stages,
      valorOpp,
      abiertas,
      maxStage,
      activos,
      nuevos,
      pend,
      curso,
      vencidas,
      seguimientos,
      tareasLista,
      alianzasShow,
      objs,
      vendedores,
    };
  }, [pipeline, clientes, tareas, roadmap, objetivos, flujo]);

  // Bloque financiero del encabezado. Todo sale de la API; lo que no tiene
  // origen de datos se marca como no disponible en vez de mostrar un cero.
  const fin = useMemo(() => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth();
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const enMesActual = (iso?: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d.getFullYear() === anio && d.getMonth() === mes;
    };

    const nomina = Number(empleados?.nominaMensualGs) || 0;
    const pagadoMes = Number(gastos?.pagadoMesActual) || 0;
    const facturado = Number(flujo?.mrrActivo) || 0;
    const cobrado = Number(flujo?.cobradoMesActual) || 0;
    const resultado = facturado - pagadoMes;
    // Posición de caja: capital neto aportado + todo lo cobrado − todo lo pagado.
    const disponible =
      (Number(capital?.saldoCapitalGs) || 0) +
      (Number(flujo?.cobradoTotal) || 0) -
      (Number(gastos?.pagadoTotal) || 0);

    // Movimiento neto día a día del mes: lo que entró menos lo que salió.
    const netoDia = new Array<number>(diasMes).fill(0);
    for (const pg of pagos) {
      if (!enMesActual(pg.fechaPago)) continue;
      netoDia[new Date(pg.fechaPago).getDate() - 1] += Number(pg.monto) || 0;
    }
    for (const g of gastos?.gastos || []) {
      if (g.estado !== "Pagado" || !enMesActual(g.fechaPago)) continue;
      netoDia[new Date(g.fechaPago!).getDate() - 1] -= Number(g.montoGs) || 0;
    }
    let acum = 0;
    const serie = netoDia.map((v) => (acum += v));
    const hayCurva = serie.some((v) => v !== 0);
    const serieMax = Math.max(1, ...serie);
    const serieMin = Math.min(0, ...serie);

    return {
      facturado,
      cobrado,
      pagadoMes,
      nomina,
      resultado,
      disponible,
      nosDeben: Number(flujo?.pendienteCobro) || 0,
      contratosVencidos: ingresos?.contratosVencidos ?? 0,
      debemos: Number(gastos?.pendienteTotal) || 0,
      vence7: Number(gastos?.venceProximos7Dias) || 0,
      cantidadVence7: gastos?.cantidadVenceProximos7Dias ?? 0,
      gastosVencidos: Number(gastos?.vencidoTotal) || 0,
      cantidadGastosVencidos: gastos?.cantidadVencidos ?? 0,
      serie,
      serieMax,
      serieMin,
      hayCurva,
      diasMes,
      ultimoValor: serie[serie.length - 1] || 0,
    };
  }, [capital, empleados, flujo, pagos, ingresos, gastos]);

  // Prioridades: lo que ya se venció o vence hoy, en un solo lugar.
  const agenda = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const esVencida = (t: Tarea) => {
      if (t.vencida) return true;
      if (t.estado === "Hecha" || t.estado === "Cancelada" || !t.fechaVencimiento) return false;
      return new Date(t.fechaVencimiento) < hoy;
    };

    const prioridades = [
      ...(gastos?.gastos || [])
        .filter((g) => g.vencido)
        .map((g) => ({
          id: `g-${g.gastoId}`,
          nivel: "Alta" as const,
          titulo: "Gasto vencido",
          detalle: `${g.concepto} · ${formatGs(g.montoGs)}`,
          accion: "Ver pago",
          vista: "vordia_cxp",
        })),
      ...tareas.filter(esVencida).map((t) => ({
        id: `t-${t.tareaId}`,
        nivel: "Alta" as const,
        titulo: t.titulo,
        detalle: t.asignadoNombre || "Sin responsable",
        accion: "Ver tarea",
        vista: "vordia_tareas",
      })),
      ...proyectos
        .filter((p) => /atras|bloque/i.test(p.estado) || (p.fechaFin && new Date(p.fechaFin) < hoy))
        .map((p) => ({
          id: `p-${p.proyectoId}`,
          nivel: "Alta" as const,
          titulo: `Proyecto atrasado`,
          detalle: p.titulo,
          accion: "Ver proyecto",
          vista: "vordia_proyectos",
        })),
      ...clientes
        .filter((c) => c.estadoPipeline === "Propuesta enviada")
        .map((c) => ({
          id: `c-${c.clienteId}`,
          nivel: "Media" as const,
          titulo: "Propuesta por aprobar",
          detalle: c.razonSocial,
          accion: "Revisar",
          vista: "vordia_propuestas",
        })),
    ].slice(0, 4);

    const proximas = [...tareas]
      .filter((t) => t.estado !== "Hecha" && t.estado !== "Cancelada" && !esVencida(t) && t.fechaVencimiento)
      .sort((a, b) => String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)))
      .slice(0, 4);

    return { prioridades, proximas };
  }, [tareas, proyectos, clientes, gastos]);

  if (loading && pipeline.length === 0 && !flujo) {
    return <p className="text-slate-500 text-sm p-6">Cargando dashboard ejecutivo…</p>;
  }

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-6 lg:space-y-7 pb-12">
      {/* Header estilo mockup */}
      <div>
        <h2 className="text-2xl lg:text-[28px] font-semibold text-white tracking-tight">
          Dashboard ejecutivo
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Visión general de VORDIA HQ
          {nombreUsuario ? ` · ${nombreUsuario.split(" ")[0]}` : ""}
        </p>
      </div>

      {/* ——— Accesos rápidos ——— */}
      <div className="flex flex-wrap gap-2.5">
        {[
          { label: "CRM", icon: Users, vista: "vordia_pipeline" },
          { label: "Productos", icon: Package, vista: "vordia_productos" },
          { label: "Proyectos", icon: FileText, vista: "vordia_proyectos" },
          { label: "Objetivos", icon: Target, vista: "vordia_objetivos" },
          { label: "Capital", icon: BarChart3, vista: "vordia_capital" },
          { label: "Vendedores", icon: Users, vista: "vordia_clientes" },
          { label: "Alianzas estratégicas", icon: Link2, vista: "vordia_roadmap" },
        ].map(({ label, icon: Icon, vista }) => (
          <button
            key={label}
            type="button"
            onClick={() => go(vista)}
            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-xl border border-[#1e3a5f]/80 bg-[#0B1528] px-3 py-2.5 text-[12.5px] font-medium text-slate-300 hover:text-white hover:border-[#007bff]/45 transition"
          >
            <Icon size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* ——— KPIs financieros del mes ——— */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
        <KpiCard
          icon={BarChart3}
          tono="green"
          label="Ventas facturadas"
          valor={formatGs(fin.facturado)}
          hint="Incluye ventas aún no cobradas"
          pie={mesLargo}
        />
        <KpiCard
          icon={DollarSign}
          tono="blue"
          label="Dinero cobrado"
          valor={formatGs(fin.cobrado)}
          hint="Recibido de clientes este mes"
          pie={mesLargo}
        />
        <KpiCard
          icon={Briefcase}
          tono="red"
          label="Gastos pagados"
          valor={formatGs(fin.pagadoMes)}
          hint="Pagos de gastos este mes"
          pie={mesLargo}
        />
        <KpiCard
          icon={TrendingUp}
          tono="green"
          destacada
          label="Ganancia o pérdida"
          valor={formatGs(fin.resultado)}
          hint="Ventas menos gastos del mes. Incluye lo pendiente de cobrar"
          pie={mesLargo}
        />
        <KpiCard
          icon={Coins}
          tono="teal"
          label="Dinero disponible"
          valor={formatGs(fin.disponible)}
          hint="Capital más cobros, menos gastos pagados"
          pie={mesLargo}
        />
      </div>

      {/* ——— Evolución del dinero + cobros y pagos ——— */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 lg:gap-4">
        <div className="rounded-2xl border border-[#1e3a5f]/80 bg-[#0B1528] p-4 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 shrink-0 rounded-lg bg-[#007bff]/10 flex items-center justify-center">
                <TrendingUp size={15} className="text-[#4da3ff]" />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-white leading-tight">
                  Cómo cambia nuestro dinero
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cobros menos gastos, acumulado del mes
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 rounded-lg border border-[#1e3a5f]/80 px-2.5 py-1.5 capitalize shrink-0 hidden sm:block">
              {mesLargo}
            </span>
          </div>

          {fin.hayCurva ? (
            <>
              <p className="text-[11px] text-slate-300 font-semibold mt-3 text-right">
                {formatGs(fin.ultimoValor)}
                <span className="text-slate-500 font-normal"> · al {fin.diasMes} de {mesCorto}</span>
              </p>
              <div className="flex gap-2 mt-1 flex-1">
                <div className="flex flex-col justify-between text-[10px] text-slate-500 shrink-0 py-0.5">
                  {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                    <span key={f}>{formatCompact(fin.serieMin + (fin.serieMax - fin.serieMin) * f)}</span>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <MoneyChart serie={fin.serie} min={fin.serieMin} max={fin.serieMax} />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>1 {mesCorto}</span>
                    <span>15 {mesCorto}</span>
                    <span>
                      {fin.diasMes} {mesCorto}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <p className="text-[13px] text-slate-500">Sin cobros registrados este mes</p>
              <p className="text-[11px] text-slate-600 mt-1">
                La curva se dibuja con los pagos que vayas cargando en Finanzas
              </p>
            </div>
          )}
        </div>

        {/* Nos deben */}
        <div className="rounded-2xl border border-[#1e3a5f]/80 bg-[#0B1528] p-4 flex flex-col">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 shrink-0 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock size={15} className="text-amber-300" />
            </span>
            <h3 className="text-[15px] font-semibold text-white">Nos deben</h3>
          </div>
          <p className="text-[19px] font-semibold text-white mt-3 leading-tight">
            {formatGs(fin.nosDeben)}
          </p>
          <p className="text-[10.5px] text-slate-500 mt-1">Pendiente de cobrar hoy</p>
          <p className="text-[10px] text-slate-600 mt-1 capitalize">{mesLargo}</p>

          <button
            type="button"
            onClick={() => go("vordia_cxc")}
            className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#1e3a5f]/70 bg-[#060D1C]/50 px-3 py-2.5 text-left hover:border-amber-400/40 transition"
          >
            <Clock size={14} className="shrink-0 text-amber-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10.5px] text-slate-400">Contratos vencidos</span>
              <span className="block text-[13px] font-semibold text-white">
                {fin.contratosVencidos} {fin.contratosVencidos === 1 ? "contrato" : "contratos"}
              </span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-slate-500" />
          </button>

          <div className="mt-auto pt-3">
            <LinkFooter label="Ver cobros" onClick={() => go("vordia_cxc")} />
          </div>
        </div>

        {/* Debemos pagar */}
        <div className="rounded-2xl border border-[#1e3a5f]/80 bg-[#0B1528] p-4 flex flex-col">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 shrink-0 rounded-lg bg-[#007bff]/10 flex items-center justify-center">
              <CalendarDays size={15} className="text-[#4da3ff]" />
            </span>
            <h3 className="text-[15px] font-semibold text-white">Debemos pagar</h3>
          </div>
          <p className="text-[19px] font-semibold text-white mt-3 leading-tight">
            {formatGs(fin.debemos)}
          </p>
          <p className="text-[10.5px] text-slate-500 mt-1">Pagos pendientes hoy</p>
          <p className="text-[10px] text-slate-600 mt-1 capitalize">{mesLargo}</p>

          {fin.cantidadGastosVencidos > 0 ? (
            <button
              type="button"
              onClick={() => go("vordia_cxp")}
              className="mt-3 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-[#060D1C]/50 px-3 py-2.5 text-left hover:border-rose-400/50 transition"
            >
              <AlertTriangle size={14} className="shrink-0 text-rose-300" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] text-slate-400">Ya vencidos</span>
                <span className="block text-[13px] font-semibold text-white">
                  {formatGs(fin.gastosVencidos)}
                </span>
                <span className="block text-[10px] text-slate-500">
                  {fin.cantidadGastosVencidos} {fin.cantidadGastosVencidos === 1 ? "pago" : "pagos"}
                </span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-slate-500" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go("vordia_cxp")}
              className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#1e3a5f]/70 bg-[#060D1C]/50 px-3 py-2.5 text-left hover:border-[#007bff]/45 transition"
            >
              <Clock size={14} className="shrink-0 text-[#4da3ff]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] text-slate-400">Vence en los próximos 7 días</span>
                <span className="block text-[13px] font-semibold text-white">
                  {formatGs(fin.vence7)}
                </span>
                <span className="block text-[10px] text-slate-500">
                  {fin.cantidadVence7} {fin.cantidadVence7 === 1 ? "pago" : "pagos"}
                </span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-slate-500" />
            </button>
          )}

          <div className="mt-auto pt-3">
            <LinkFooter label="Ver pagos" onClick={() => go("vordia_cxp")} />
          </div>
        </div>
      </div>

      {/* ——— Prioridades y próximas acciones ——— */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <div className="rounded-2xl border border-[#1e3a5f]/80 bg-[#0B1528] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 shrink-0 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle size={15} className="text-rose-300" />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-white leading-tight">Prioridades de hoy</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Pendientes actuales</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => go("vordia_tareas")}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 shrink-0"
            >
              Ver todas
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {agenda.prioridades.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="shrink-0 w-14">
                  <Pill tone={p.nivel === "Alta" ? "red" : "yellow"}>{p.nivel}</Pill>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white font-medium truncate">{p.titulo}</p>
                  <p className="text-[11px] text-slate-500 truncate">{p.detalle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => go(p.vista)}
                  className="shrink-0 rounded-lg border border-[#1e3a5f]/80 bg-[#060D1C]/40 px-3 py-1.5 text-[11.5px] font-semibold text-slate-300 hover:text-white hover:border-[#007bff]/45 transition"
                >
                  {p.accion}
                </button>
              </div>
            ))}
            {!agenda.prioridades.length && (
              <p className="text-center text-slate-600 text-[12px] py-8">
                Nada atrasado. Todo al día.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e3a5f]/80 bg-[#0B1528] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 shrink-0 rounded-lg bg-[#007bff]/10 flex items-center justify-center">
                <CalendarDays size={15} className="text-[#4da3ff]" />
              </span>
              <h3 className="text-[15px] font-semibold text-white">Próximas acciones</h3>
            </div>
            <button
              type="button"
              onClick={() => go("vordia_tareas")}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 shrink-0"
            >
              Ver calendario
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="mt-3 space-y-1">
            {agenda.proximas.map((t) => {
              const v = vencimientoLabel(t.fechaVencimiento, t.vencida);
              return (
                <button
                  key={t.tareaId}
                  type="button"
                  onClick={() => go("vordia_tareas")}
                  className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-white/[0.02] rounded-lg px-1"
                >
                  <Circle size={15} className="shrink-0 text-slate-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-white truncate">{t.titulo}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {t.asignadoNombre || "Sin responsable"}
                    </span>
                  </span>
                  <span className={`shrink-0 text-[12px] font-semibold ${v.cls}`}>{v.text}</span>
                </button>
              );
            })}
            {!agenda.proximas.length && (
              <p className="text-center text-slate-600 text-[12px] py-8">
                Sin tareas programadas con fecha.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ——— 1. Comercial y clientes ——— */}
      <section className="space-y-3">
        <SectionHeader
          icon={BarChart3}
          title="Comercial y clientes"
          subtitle="Ventas, equipo y relaciones comerciales"
          meta={new Date().toLocaleDateString("es-PY", { month: "long", year: "numeric" })}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Oportunidades */}
          <Card
            icon={BarChart3}
            title="Oportunidades de venta"
            footer={<LinkFooter label="Ver oportunidades" onClick={() => go("vordia_pipeline")} />}
          >
            <p className="text-3xl font-semibold text-white mt-1">{formatCompact(data.valorOpp)}</p>
            <p className="text-[11px] text-slate-400 mt-1 mb-4">Ventas posibles, aún no confirmadas</p>
            <div className="space-y-2.5 mb-3">
              {data.stages.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-[7.5rem] shrink-0 text-[11px] text-slate-400 truncate">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#060D1C] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#3b82f6]"
                      style={{ width: `${Math.max(s.cantidad ? 8 : 0, (s.cantidad / data.maxStage) * 100)}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-[11px] text-slate-300 font-semibold">{s.cantidad}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-slate-400 pt-3 border-t border-white/5">
              {data.abiertas} oportunidades abiertas
            </p>
          </Card>

          {/* Vendedores / socios */}
          <Card
            icon={Users}
            title="Vendedores"
            footer={<LinkFooter label="Ver vendedores" onClick={() => go("vordia_caja")} />}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-semibold">Vendedor</th>
                    <th className="pb-2 font-semibold text-right">Ventas</th>
                    <th className="pb-2 font-semibold text-right">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vendedores.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-slate-500">
                        Sin socios / reparto aún
                      </td>
                    </tr>
                  )}
                  {data.vendedores.map((v) => (
                    <tr key={v.nombre} className="border-t border-white/5">
                      <td className="py-2.5 text-[13px] text-white font-medium">{v.nombre}</td>
                      <td className="py-2.5 text-[13px] text-slate-300 text-right">{formatCompact(v.ventas)}</td>
                      <td className="py-2.5 text-[13px] text-right font-semibold text-amber-300">
                        {v.meta}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.vencidas > 0 && (
              <p className="mt-3 text-[12px] text-red-300 flex items-center gap-1.5">
                <AlertTriangle size={13} className="shrink-0" />
                {data.vencidas} seguimiento{data.vencidas === 1 ? "" : "s"} atrasado{data.vencidas === 1 ? "" : "s"}
              </p>
            )}
          </Card>

          {/* Clientes */}
          <Card
            icon={Users}
            title="Clientes"
            footer={<LinkFooter label="Ver clientes" onClick={() => go("vordia_clientes")} />}
          >
            <div className="space-y-2 mb-4">
              <StatRow icon={Users} value={data.activos} label="Clientes activos" tone="blue" />
              <StatRow icon={Plus} value={data.nuevos} label="En pipeline" tone="green" />
              <StatRow icon={Clock} value={data.vencidas} label="Seguimientos atrasados" tone="amber" />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mb-2">Próximos seguimientos</p>
            <div className="space-y-1">
              {data.seguimientos.length === 0 && (
                <p className="text-xs text-slate-500 py-2">Sin seguimientos pendientes.</p>
              )}
              {data.seguimientos.map((c, i) => (
                <button
                  key={c.clienteId}
                  type="button"
                  onClick={() => go("vordia_clientes")}
                  className="w-full flex items-center justify-between gap-2 py-1 text-left group"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText size={13} className="text-slate-500 shrink-0" />
                    <span className="text-[13px] text-white truncate">{c.razonSocial}</span>
                  </span>
                  <span
                    className={`text-[11px] font-semibold shrink-0 group-hover:text-[#7bb8ff] ${
                      i === 0 ? "text-[#4da3ff]" : "text-sky-300"
                    }`}
                  >
                    {c.proximosPasos ? "Contactar" : c.estadoPipeline}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ——— 2. Productos y proyectos ——— */}
      <section className="space-y-3">
        <SectionHeader icon={Package} title="Productos y trabajo en marcha" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <Card
            icon={Package}
            title="Productos VORDIA"
            footer={<LinkFooter label="Ver productos" onClick={() => go("vordia_productos")} />}
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left min-w-[320px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-semibold">Producto</th>
                    <th className="pb-2 font-semibold">Estado</th>
                    <th className="pb-2 font-semibold">Próximo hito</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-slate-500">
                        Sin productos cargados
                      </td>
                    </tr>
                  )}
                  {productos.slice(0, 6).map((p) => (
                    <tr
                      key={p.productoId}
                      className="border-t border-white/5 cursor-pointer hover:bg-white/[0.02]"
                      onClick={() => goProductoExterno(p.codigo, onNavigate)}
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          {LOGO[p.codigo.toUpperCase()] && (
                            <span className="relative h-7 w-7 shrink-0">
                              <Image
                                src={LOGO[p.codigo.toUpperCase()]}
                                alt={p.codigo}
                                fill
                                sizes="28px"
                                className="object-contain"
                              />
                            </span>
                          )}
                          <span className="text-[13px] text-white font-medium">
                            VORDIA {p.codigo}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Pill tone={productoTone(p.estado)} dot>
                          {p.estado}
                        </Pill>
                      </td>
                      <td className="py-2.5 text-[12px] text-slate-400 truncate max-w-[140px]">
                        {p.ideaCentral || p.notas || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            icon={FileText}
            title="Proyectos en marcha"
            footer={<LinkFooter label="Ver proyectos" onClick={() => go("vordia_proyectos")} />}
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left min-w-[360px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-semibold">Proyecto</th>
                    <th className="pb-2 font-semibold">Responsable</th>
                    <th className="pb-2 font-semibold">Próximo hito</th>
                    <th className="pb-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                        Sin proyectos
                      </td>
                    </tr>
                  )}
                  {proyectos.slice(0, 5).map((p) => {
                    const tone = proyectoTone(p.estado, p.fechaFin);
                    const label =
                      tone === "red"
                        ? p.estado.toLowerCase().includes("atras")
                          ? p.estado
                          : "Atrasado"
                        : tone === "redOutline"
                          ? "Bloqueado"
                          : p.estado === "En curso"
                            ? "En tiempo"
                            : p.estado;
                    return (
                      <tr
                        key={p.proyectoId}
                        className="border-t border-white/5 cursor-pointer hover:bg-white/[0.02]"
                        onClick={() => go("vordia_proyectos")}
                      >
                        <td className="py-2.5 text-[13px] text-white font-medium max-w-[140px] truncate">
                          {p.titulo}
                        </td>
                        <td className="py-2.5 text-[12px] text-slate-400">
                          {p.responsableNombre || "—"}
                        </td>
                        <td className="py-2.5 text-[12px] text-slate-400">
                          {p.fechaFin ? formatFecha(p.fechaFin) : "—"}
                        </td>
                        <td className="py-2.5">
                          <Pill tone={tone}>{label}</Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* ——— 3. Tareas y alianzas ——— */}
      <section className="space-y-3">
        <SectionHeader icon={Settings} title="Tareas del equipo y alianzas" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <Card
            icon={CheckSquare}
            title="Tareas del equipo"
            footer={<LinkFooter label="Ver tareas" onClick={() => go("vordia_tareas")} />}
          >
            <div className="grid grid-cols-3 gap-2">
              <CounterBox
                icon={<Circle size={16} className="text-slate-400" />}
                value={data.pend}
                label="por hacer"
              />
              <CounterBox
                icon={<Play size={16} className="text-[#4da3ff] fill-[#4da3ff]/30" />}
                value={data.curso}
                label="en curso"
              />
              <CounterBox
                icon={<AlertTriangle size={16} className="text-red-400" />}
                value={data.vencidas}
                label="atrasadas"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 mb-3">
              Atrasadas incluidas en las tareas abiertas
            </p>
            <div className="space-y-0">
              {data.tareasLista.length === 0 && (
                <p className="text-xs text-slate-500 py-4">Sin tareas pendientes.</p>
              )}
              {data.tareasLista.map((t) => {
                const v = vencimientoLabel(t.fechaVencimiento, t.vencida);
                return (
                  <button
                    key={t.tareaId}
                    type="button"
                    onClick={() => go("vordia_tareas")}
                    className="w-full flex items-center gap-3 py-2.5 border-t border-white/5 text-left hover:bg-white/[0.02]"
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full border border-slate-600" />
                    <span className="flex-1 text-[13px] text-white truncate">{t.titulo}</span>
                    <span className="text-[12px] text-slate-500 w-24 truncate hidden sm:block">
                      {t.asignadoNombre || "—"}
                    </span>
                    <span className={`text-[12px] font-semibold w-16 text-right ${v.cls}`}>{v.text}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card
            icon={Link2}
            title="Alianzas estratégicas"
            footer={<LinkFooter label="Ver alianzas" onClick={() => go("vordia_roadmap")} />}
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left min-w-[300px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-semibold">Organización</th>
                    <th className="pb-2 font-semibold">Estado</th>
                    <th className="pb-2 font-semibold">Próximo paso</th>
                  </tr>
                </thead>
                <tbody>
                  {data.alianzasShow.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-xs text-slate-500">
                        Sin alianzas en roadmap
                      </td>
                    </tr>
                  )}
                  {data.alianzasShow.map((r) => (
                    <tr
                      key={r.roadmapId}
                      className="border-t border-white/5 cursor-pointer hover:bg-white/[0.02]"
                      onClick={() => go("vordia_roadmap")}
                    >
                      <td className="py-2.5 text-[13px] text-white font-medium truncate max-w-[120px]">
                        {r.titulo}
                      </td>
                      <td className="py-2.5">
                        <Pill tone={alianzaTone(r.estado)} dot>
                          {r.estado}
                        </Pill>
                      </td>
                      <td className="py-2.5 text-[12px] text-slate-400 truncate max-w-[140px]">
                        {r.proximoPaso || r.responsableNombre || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* ——— 4. Objetivos ——— */}
      <section className="space-y-3">
        <SectionHeader icon={Target} title="Objetivos de VORDIA" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
          {data.objs.length === 0 && (
            <button
              type="button"
              onClick={() => go("vordia_objetivos")}
              className="md:col-span-3 rounded-2xl border border-dashed border-[#1e3a5f] bg-[#0B1528]/60 py-10 text-sm text-slate-500 hover:border-[#007bff]/40"
            >
              Sin objetivos abiertos · Crear en Objetivos & reuniones →
            </button>
          )}
          {data.objs.map((o) => {
            const actual = Number(o.valorActual) || 0;
            const meta = Number(o.metaValor) || 0;
            const logrado = o.estado === "Logrado";
            const pct =
              meta > 0
                ? Math.min(100, Math.round((actual / meta) * 100))
                : o.avancePct != null
                  ? Math.min(100, Math.max(0, Number(o.avancePct)))
                  : logrado
                    ? 100
                    : 0;
            const ratioLabel = meta > 0 ? `${actual} de ${meta}` : logrado ? "Completado" : `${pct}%`;
            const ObjIcon = objetivoIcon(o.titulo);
            return (
              <button
                key={o.objetivoId}
                type="button"
                onClick={() => go("vordia_objetivos")}
                className="text-left rounded-2xl border border-[#1e3a5f]/80 bg-[#0B1528] p-4 hover:border-[#007bff]/45 transition"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="h-8 w-8 shrink-0 rounded-lg border border-[#1e3a5f]/60 bg-[#0d2547]/60 flex items-center justify-center">
                    <ObjIcon size={15} className="text-[#4da3ff]" />
                  </span>
                  <p className="text-[13px] font-semibold text-white truncate">{o.titulo}</p>
                </div>
                <div className="flex items-end justify-between gap-2 mb-2">
                  <p className="text-xl font-semibold text-white leading-none">{ratioLabel}</p>
                  {!ratioLabel.endsWith("%") && (
                    <p className="text-[12px] text-slate-400 leading-none">{pct}%</p>
                  )}
                </div>
                <div className="h-2 rounded-full bg-[#060D1C] overflow-hidden">
                  <div className="h-full rounded-full bg-[#3b82f6]" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-slate-500 mt-3">
                  Meta: {o.fechaObjetivo ? formatFecha(o.fechaObjetivo) : "—"}
                  {o.creadoPor ? ` · ${o.creadoPor}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
