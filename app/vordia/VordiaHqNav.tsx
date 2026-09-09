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
  Wallet,
  ShieldCheck,
  Package,
  FolderKanban,
  Truck,
  FolderOpen,
  Zap,
  Map,
  BarChart3,
  ChevronDown,
  Handshake,
  TrendingUp,
  Receipt,
  CreditCard,
  PiggyBank,
  LineChart,
  Target,
  UserCog,
} from "lucide-react";

export type VordiaHqVista =
  | "inicio"
  | "vordia_pipeline"
  | "vordia_clientes"
  | "vordia_propuestas"
  | "vordia_vendedores"
  | "vordia_alianzas"
  | "vordia_productos"
  | "vordia_proyectos"
  | "vordia_tareas"
  | "vordia_finanzas_resumen"
  | "vordia_ingresos"
  | "vordia_cxc"
  | "vordia_gastos"
  | "vordia_cxp"
  | "vordia_caja"
  | "vordia_capital"
  | "vordia_proyecciones"
  | "vordia_objetivos"
  | "vordia_contratos"
  | "vordia_proveedores"
  | "vordia_documentos"
  | "vordia_automatizaciones"
  | "vordia_roadmap"
  | "vordia_reportes"
  | "configuracion"
  | "usuarios";

export const VORDIA_HQ_TITULOS: Record<string, string> = {
  inicio: "Dashboard ejecutivo",
  vordia_pipeline: "CRM Comercial",
  vordia_clientes: "Clientes",
  vordia_propuestas: "Clientes · Propuestas comerciales",
  vordia_vendedores: "Vendedores",
  vordia_alianzas: "Alianzas estratégicas",
  vordia_productos: "Productos",
  vordia_proyectos: "Proyectos",
  vordia_tareas: "Tareas",
  vordia_objetivos: "CRM · Objetivos & reuniones",
  vordia_finanzas_resumen: "Finanzas · Resumen",
  vordia_ingresos: "Finanzas · Ingresos",
  vordia_cxc: "Finanzas · Cuentas por cobrar",
  vordia_gastos: "Finanzas · Empleados / nómina",
  vordia_cxp: "Finanzas · Cuentas por pagar",
  vordia_caja: "Finanzas · Flujo de caja",
  vordia_capital: "Finanzas · Capital empresa",
  vordia_proyecciones: "Finanzas · Proyecciones",
  vordia_contratos: "Contratos",
  vordia_proveedores: "Proveedores",
  vordia_documentos: "Documentos",
  vordia_automatizaciones: "Automatizaciones",
  vordia_roadmap: "Roadmap · Ideas & Alianzas",
  vordia_reportes: "Reportes",
  configuracion: "Configuración",
  usuarios: "Usuarios / Roles",
};

type NavClick = (vista: string) => void;

type ItemProps = {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  nested?: boolean;
};

function HqItem({ icon, label, active, onClick, nested }: ItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl text-left transition-all duration-200
        ${nested ? "pl-9 pr-3 py-2" : "px-3 py-2.5"}
        ${active
          ? "bg-[#007bff]/15 text-white border border-[#007bff]/35 shadow-[0_0_20px_rgba(0,123,255,0.12)]"
          : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
        }`}
    >
      <span className={`shrink-0 ${active ? "text-[#5eb0ff]" : "text-slate-500"}`}>{icon}</span>
      <span className={`${nested ? "text-[11px]" : "text-xs"} font-semibold tracking-wide`}>{label}</span>
    </button>
  );
}

export function VordiaHqSidebarNav({
  vistaActual,
  onNavigate,
  showUsuariosRoles = true,
}: {
  vistaActual: string;
  onNavigate: NavClick;
  showUsuariosRoles?: boolean;
}) {
  const finanzasOpen =
    vistaActual.startsWith("vordia_ingresos") ||
    vistaActual.startsWith("vordia_caja") ||
    vistaActual.startsWith("vordia_capital") ||
    vistaActual.startsWith("vordia_cxc") ||
    vistaActual.startsWith("vordia_cxp") ||
    vistaActual.startsWith("vordia_gastos") ||
    vistaActual.startsWith("vordia_finanzas") ||
    vistaActual.startsWith("vordia_proyecciones");

  const [finanzasExpanded, setFinanzasExpanded] = useState(finanzasOpen);

  const clientesOpen = vistaActual === "vordia_clientes" || vistaActual === "vordia_propuestas";
  const [clientesExpanded, setClientesExpanded] = useState(clientesOpen);

  const go = (v: string) => onNavigate(v);

  return (
    <div className="space-y-0.5">
      <HqItem
        icon={<LayoutDashboard size={16} />}
        label="Inicio"
        active={vistaActual === "inicio"}
        onClick={() => go("inicio")}
      />
      <HqItem
        icon={<List size={16} />}
        label="CRM Comercial"
        active={vistaActual === "vordia_pipeline"}
        onClick={() => go("vordia_pipeline")}
      />
      <button
        type="button"
        onClick={() => {
          setClientesExpanded(true);
          go("vordia_clientes");
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
          ${vistaActual === "vordia_clientes"
            ? "bg-[#007bff]/15 text-white border border-[#007bff]/35 shadow-[0_0_20px_rgba(0,123,255,0.12)]"
            : clientesOpen
              ? "text-white bg-white/[0.03] border border-transparent"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
          }`}
      >
        <Users size={16} className={clientesOpen ? "text-[#5eb0ff]" : "text-slate-500"} />
        <span className="text-xs font-semibold tracking-wide flex-1">Clientes</span>
        <ChevronDown
          size={14}
          role="button"
          aria-label="Mostrar u ocultar submenú de clientes"
          onClick={(e) => {
            e.stopPropagation();
            setClientesExpanded((v) => !v);
          }}
          className={`text-slate-500 transition-transform hover:text-white ${clientesExpanded ? "rotate-180" : ""}`}
        />
      </button>
      {clientesExpanded && (
        <div className="space-y-0.5 pb-1">
          <HqItem
            nested
            icon={<FileText size={14} />}
            label="Propuestas comerciales"
            active={vistaActual === "vordia_propuestas"}
            onClick={() => go("vordia_propuestas")}
          />
        </div>
      )}
      <HqItem
        icon={<TrendingUp size={16} />}
        label="Vendedores"
        active={vistaActual === "vordia_vendedores"}
        onClick={() => go("vordia_vendedores")}
      />
      <HqItem
        icon={<Handshake size={16} />}
        label="Alianzas estratégicas"
        active={vistaActual === "vordia_alianzas"}
        onClick={() => go("vordia_alianzas")}
      />
      <HqItem
        icon={<Package size={16} />}
        label="Productos"
        active={vistaActual === "vordia_productos"}
        onClick={() => go("vordia_productos")}
      />
      <HqItem
        icon={<FolderKanban size={16} />}
        label="Proyectos"
        active={vistaActual === "vordia_proyectos"}
        onClick={() => go("vordia_proyectos")}
      />
      <HqItem
        icon={<CheckSquare size={16} />}
        label="Tareas"
        active={vistaActual === "vordia_tareas"}
        onClick={() => go("vordia_tareas")}
      />
      <HqItem
        icon={<Target size={16} />}
        label="Objetivos & reuniones"
        active={vistaActual === "vordia_objetivos"}
        onClick={() => go("vordia_objetivos")}
      />

      <button
        type="button"
        onClick={() => setFinanzasExpanded((v) => !v)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all
          ${finanzasOpen
            ? "text-white bg-white/[0.03]"
            : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
      >
        <DollarSign size={16} className={finanzasOpen ? "text-[#5eb0ff]" : "text-slate-500"} />
        <span className="text-xs font-semibold tracking-wide flex-1">Finanzas</span>
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform ${finanzasExpanded ? "rotate-180" : ""}`}
        />
      </button>
      {finanzasExpanded && (
        <div className="space-y-0.5 pb-1">
          <HqItem nested icon={<TrendingUp size={14} />} label="Resumen" active={vistaActual === "vordia_finanzas_resumen"} onClick={() => go("vordia_finanzas_resumen")} />
          <HqItem nested icon={<Receipt size={14} />} label="Ingresos" active={vistaActual === "vordia_ingresos"} onClick={() => go("vordia_ingresos")} />
          <HqItem nested icon={<CreditCard size={14} />} label="Cuentas por cobrar" active={vistaActual === "vordia_cxc"} onClick={() => go("vordia_cxc")} />
          <HqItem nested icon={<Wallet size={14} />} label="Flujo de caja" active={vistaActual === "vordia_caja"} onClick={() => go("vordia_caja")} />
          <HqItem nested icon={<PiggyBank size={14} />} label="Capital empresa" active={vistaActual === "vordia_capital"} onClick={() => go("vordia_capital")} />
          <HqItem nested icon={<UserCog size={14} />} label="Empleados / nómina" active={vistaActual === "vordia_gastos"} onClick={() => go("vordia_gastos")} />
          <HqItem nested icon={<CreditCard size={14} />} label="Cuentas por pagar" active={vistaActual === "vordia_cxp"} onClick={() => go("vordia_cxp")} />
          <HqItem nested icon={<LineChart size={14} />} label="Proyecciones" active={vistaActual === "vordia_proyecciones"} onClick={() => go("vordia_proyecciones")} />
        </div>
      )}

      <HqItem
        icon={<FileText size={16} />}
        label="Contratos"
        active={vistaActual === "vordia_contratos"}
        onClick={() => go("vordia_contratos")}
      />
      <HqItem
        icon={<Truck size={16} />}
        label="Proveedores"
        active={vistaActual === "vordia_proveedores"}
        onClick={() => go("vordia_proveedores")}
      />
      <HqItem
        icon={<FolderOpen size={16} />}
        label="Documentos"
        active={vistaActual === "vordia_documentos"}
        onClick={() => go("vordia_documentos")}
      />
      <HqItem
        icon={<Zap size={16} />}
        label="Automatizaciones"
        active={vistaActual === "vordia_automatizaciones"}
        onClick={() => go("vordia_automatizaciones")}
      />
      <HqItem
        icon={<BarChart3 size={16} />}
        label="Reportes"
        active={vistaActual === "vordia_reportes"}
        onClick={() => go("vordia_reportes")}
      />
      <HqItem
        icon={<Map size={16} />}
        label="Roadmap · Ideas"
        active={vistaActual === "vordia_roadmap"}
        onClick={() => go("vordia_roadmap")}
      />
      <HqItem
        icon={<Settings size={16} />}
        label="Configuración"
        active={vistaActual === "configuracion"}
        onClick={() => go("configuracion")}
      />
      {showUsuariosRoles && (
      <HqItem
        icon={<ShieldCheck size={16} />}
        label="Usuarios / Roles"
        active={vistaActual === "usuarios"}
        onClick={() => go("usuarios")}
      />
      )}
    </div>
  );
}

export function VordiaHqHealthWidget({
  score = 70,
  empresaId,
}: {
  score?: number;
  empresaId?: number;
}) {
  const [live, setLive] = useState(score);

  useEffect(() => {
    if (!empresaId) {
      setLive(score);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [t, f, c] = await Promise.all([
          fetch(`${API_BASE}/api/Crm/tareas?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/flujo-caja?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/contratos?empresaId=${empresaId}`),
        ]);
        const tareas = t.ok ? await t.json() : [];
        const flujo = f.ok ? await f.json() : null;
        const contratos = c.ok ? await c.json() : [];
        const vencidas = (tareas as { vencida?: boolean }[]).filter((x) => x.vencida).length;
        const pendPago = (
          contratos as { estadoContrato?: string; estadoPago?: string }[]
        ).filter(
          (x) =>
            x.estadoContrato === "Activo" &&
            (x.estadoPago === "Pendiente" || x.estadoPago === "Vencido")
        ).length;
        const health = Math.min(
          100,
          Math.max(
            40,
            70 + (flujo?.mrrActivo ? 10 : 0) - Math.min(20, vencidas * 4) - Math.min(15, pendPago * 3)
          )
        );
        if (!cancelled) setLive(health);
      } catch {
        if (!cancelled) setLive(score);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId, score]);

  const label = live >= 80 ? "Muy saludable" : live >= 60 ? "Estable" : "Requiere atención";
  return (
    <div className="rounded-2xl border border-white/5 bg-[#050B18]/80 p-3.5">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#94a3b8] mb-2">
        Vordia Health Score
      </p>
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 rounded-full border-[5px] border-[#1e3a5f] flex items-center justify-center shrink-0">
          <div className="absolute inset-[-5px] rounded-full border-[5px] border-transparent border-t-emerald-400 border-r-emerald-400/70 rotate-45" aria-hidden />
          <span className="text-sm font-bold text-white">{live}</span>
        </div>
        <div>
          <p
            className={`text-xs font-semibold ${
              live >= 80 ? "text-emerald-300" : live >= 60 ? "text-amber-300" : "text-rose-300"
            }`}
          >
            {label}
          </p>
          <p className="text-[10px] text-slate-500">/100 · vivo</p>
        </div>
      </div>
    </div>
  );
}
