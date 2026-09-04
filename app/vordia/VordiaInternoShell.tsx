"use client";

import { ReactNode, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  List,
  FileText,
  DollarSign,
  CheckSquare,
  Settings,
  TrendingUp,
} from "lucide-react";

/** Placeholder vacío con estética Vordia Interno (dark + azul eléctrico). */
export function VordiaModuloVacio({
  titulo,
  descripcion,
  icon,
}: {
  titulo: string;
  descripcion: string;
  icon?: ReactNode;
}) {
  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-6">
      <div className="rounded-[1.75rem] border border-white/5 bg-[#0C1327] p-6 sm:p-8 lg:p-12 shadow-2xl">
        <div className="flex flex-col items-start gap-4 max-w-2xl min-w-0">
          <div className="h-12 w-12 rounded-2xl bg-[#007bff]/15 border border-[#007bff]/30 flex items-center justify-center text-[#007bff]">
            {icon ?? <LayoutDashboard size={22} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-white">
              {titulo}
            </h3>
            <p className="mt-2 text-sm lg:text-base text-[#94a3b8] leading-relaxed">
              {descripcion}
            </p>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
            Módulo vacío · listo para armar
          </div>
        </div>
      </div>
    </div>
  );
}

/** Resumen operativo — KPIs reales del CRM Vordia. */
export function VordiaResumenOperativo({
  nombreUsuario,
  empresaId,
}: {
  nombreUsuario?: string;
  empresaId?: number;
}) {
  const [stats, setStats] = useState({
    enCurso: 0,
    clientesActivos: 0,
    conversion: 0,
  });

  useEffect(() => {
    if (!empresaId) return;
    fetch(`${API_BASE}/api/Crm/pipeline?empresaId=${empresaId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((cols: { estado: string; cantidad: number }[]) => {
        const total = cols.reduce((a, c) => a + c.cantidad, 0);
        const activos = cols.find((c) => c.estado === "Cliente activo")?.cantidad || 0;
        const cerrados = cols.find((c) => c.estado === "Cerrado")?.cantidad || 0;
        const enCurso = total - activos;
        const conversion = total > 0 ? Math.round(((activos + cerrados) / total) * 100) : 0;
        setStats({ enCurso, clientesActivos: activos, conversion });
      })
      .catch(() => {});
  }, [empresaId]);

  const kpis = [
    { label: "Oportunidades en curso", value: String(stats.enCurso), delta: null as string | null },
    { label: "Clientes activos", value: String(stats.clientesActivos), delta: null },
    { label: "Conversión pipeline", value: `${stats.conversion}%`, delta: null },
  ];

  return (
    <div className="animate-in fade-in duration-300 space-y-5 lg:space-y-6">
      <div className="rounded-[1.75rem] border border-white/5 bg-[#0C1327] px-5 py-7 lg:px-8 lg:py-9 shadow-2xl">
        <p className="text-[#94a3b8] text-sm lg:text-base font-medium leading-relaxed">
          Hola{" "}
          <span className="text-[#007bff] font-bold uppercase tracking-widest">
            {nombreUsuario || "equipo"}
          </span>
          , el CRM ya tiene clientes de ejemplo. Entrá a{" "}
          <span className="text-white font-medium">Clientes</span> o{" "}
          <span className="text-white font-medium">Pipeline</span> para avanzar negociaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5 lg:p-6 shadow-xl"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
              {k.label}
            </p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-3xl lg:text-4xl font-semibold text-white tracking-tight">
                {k.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
        <div className="lg:col-span-3 rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5 lg:p-6 min-h-[240px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white tracking-tight">
              Flujo de procesos
            </h4>
            <TrendingUp size={16} className="text-[#007bff]" />
          </div>
          <div className="flex-1 rounded-2xl border border-dashed border-white/10 bg-[#050B18]/60 flex items-center justify-center">
            <p className="text-xs text-slate-500 font-medium px-6 text-center">
              El detalle del flujo está en Pipeline (tablero por etapas).
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5 lg:p-6 min-h-[240px] flex flex-col">
          <h4 className="text-sm font-semibold text-white tracking-tight mb-4">
            Distribución
          </h4>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative h-36 w-36 rounded-full border-[10px] border-[#1e3a5f]">
              <div
                className="absolute inset-[-10px] rounded-full border-[10px] border-transparent border-t-[#007bff] border-r-[#007bff] rotate-45 opacity-80"
                aria-hidden
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-white">{stats.conversion}%</span>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
            Cerrado + activo / total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { t: "Clientes", d: "Alta, edición, historial y próximos pasos", i: <Users size={18} /> },
          { t: "Pipeline", d: "Prospecto → Cliente activo", i: <List size={18} /> },
          { t: "Fees", d: "Contratos e ingresos (próximo)", i: <DollarSign size={18} /> },
          { t: "Tareas", d: "Hoja de ruta Eli + Nery (próximo)", i: <CheckSquare size={18} /> },
        ].map((c) => (
          <div
            key={c.t}
            className="rounded-2xl border border-white/5 bg-[#080E1E] px-4 py-4 flex gap-3 items-start"
          >
            <div className="h-9 w-9 rounded-xl bg-[#007bff]/10 text-[#007bff] flex items-center justify-center shrink-0">
              {c.i}
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">{c.t}</p>
              <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-snug">{c.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const VORDIA_MODULO_META: Record<
  string,
  { titulo: string; descripcion: string; icon: ReactNode }
> = {
  vordia_clientes: {
    titulo: "Gestión de clientes",
    descripcion:
      "Centralizá clientes actuales y potenciales: datos, rubro, contacto, estado de negociación, servicio ofrecido, historial, próximos pasos y fecha estimada de cierre.",
    icon: <Users size={22} />,
  },
  vordia_pipeline: {
    titulo: "Pipeline comercial",
    descripcion:
      "Organizá oportunidades por etapas: Prospecto → Contactado → En negociación → Propuesta enviada → Cerrado → Cliente activo.",
    icon: <List size={22} />,
  },
  vordia_contratos: {
    titulo: "Contratos y fees",
    descripcion:
      "Registrá monto acordado, cuota mensual, anual, fecha de inicio, próximo vencimiento y estado del pago por cliente.",
    icon: <FileText size={22} />,
  },
  vordia_ingresos: {
    titulo: "Ingresos y pagos",
    descripcion:
      "Ingresos recurrentes de Vordia, historial de pagos y renovaciones. Base para flujo de caja y contable.",
    icon: <DollarSign size={22} />,
  },
  vordia_tareas: {
    titulo: "Tareas y hoja de ruta",
    descripcion:
      "Tablero cronológico de tareas con tiempos y estados para trabajar más rápido entre Eli y Nery.",
    icon: <CheckSquare size={22} />,
  },
  configuracion: {
    titulo: "Configuración",
    descripcion: "Ajustes del entorno interno Vordia. Por ahora vacío; se irá completando.",
    icon: <Settings size={22} />,
  },
};
