"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import {
  LayoutDashboard, Beef, Heart, Baby, TrendingUp, Warehouse, ShieldPlus, Wheat, Fence, ScanLine, Radio, Package,
  Wallet, FileBarChart, SlidersHorizontal,
} from "lucide-react";
import type { AgroConfiguracion, AgroModulo } from "@/lib/agroApi";
import type { VistaAgro } from "./context";

export type NavItem = { id: VistaAgro; label: string; titulo: string; icon: ReactNode; modulos?: AgroModulo[] };

/** Menú de VORDIA Agro (mismo orden que el diseño). Sin `modulos` = incluido en la licencia Base. */
export const NAV_AGRO: NavItem[] = [
  { id: "ejecutivo", label: "Dashboard", titulo: "Dashboard", icon: <LayoutDashboard size={17} /> },
  { id: "ganado", label: "Ganado", titulo: "Ganado", icon: <Beef size={17} /> },
  { id: "reproduccion", label: "Reproducción", titulo: "Reproducción", icon: <Heart size={17} />, modulos: ["CRIA"] },
  { id: "cria", label: "Cría", titulo: "Cría", icon: <Baby size={17} />, modulos: ["CRIA"] },
  { id: "recria", label: "Recría", titulo: "Recría", icon: <TrendingUp size={17} />, modulos: ["RECRIA"] },
  { id: "feed", label: "Engorde / Confinamiento", titulo: "Engorde / Confinamiento", icon: <Warehouse size={17} />, modulos: ["FEED"] },
  { id: "sanidad", label: "Sanidad", titulo: "Sanidad", icon: <ShieldPlus size={17} />, modulos: ["HEALTH"] },
  { id: "alimentacion", label: "Alimentación", titulo: "Alimentación", icon: <Wheat size={17} />, modulos: ["FEED", "RECRIA"] },
  { id: "lotes", label: "Lotes / Zonas", titulo: "Lotes / Zonas", icon: <Fence size={17} /> },
  { id: "trazabilidad", label: "Trazabilidad", titulo: "Trazabilidad", icon: <ScanLine size={17} />, modulos: ["TRACE"] },
  { id: "dispositivos", label: "Dispositivos", titulo: "Dispositivos", icon: <Radio size={17} />, modulos: ["CONNECT"] },
  { id: "inventario", label: "Inventario", titulo: "Inventario", icon: <Package size={17} /> },
  { id: "finanzas", label: "Finanzas", titulo: "Finanzas", icon: <Wallet size={17} />, modulos: ["FINANCE"] },
  { id: "reportes", label: "Reportes", titulo: "Reportes", icon: <FileBarChart size={17} /> },
  { id: "operacion", label: "Mi operación", titulo: "Mi operación", icon: <SlidersHorizontal size={17} /> },
];

export function navDisponible(config: AgroConfiguracion | null): NavItem[] {
  if (!config) return [];
  return NAV_AGRO.filter((n) => !n.modulos || n.modulos.some((m) => config.modulosActivos.includes(m)));
}

/* ── Estado compartido entre el menú lateral del shell y el contenido de VORDIA Agro ── */

type Estado = { vista: VistaAgro | null; animalFoco?: number; items: NavItem[]; establecimiento?: string };

const VISTA_KEY = "VORDIA_agro_vista";
let estado: Estado = { vista: null, items: [] };
const subs = new Set<() => void>();

function emitir(nuevo: Partial<Estado>) {
  estado = { ...estado, ...nuevo };
  subs.forEach((f) => f());
}

export const agroNav = {
  get: () => estado,
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
  irA(vista: VistaAgro, animalFoco?: number) {
    emitir({ vista, animalFoco });
    try {
      localStorage.setItem(VISTA_KEY, vista);
    } catch {
      /* sin storage */
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  /** El contenido publica qué vistas habilita la licencia; si la vista actual no está, elige una válida. */
  publicar(items: NavItem[], establecimiento?: string) {
    let vista = estado.vista;
    if (!vista || !items.some((i) => i.id === vista)) {
      let guardada: string | null = null;
      try {
        guardada = localStorage.getItem(VISTA_KEY);
      } catch {
        /* sin storage */
      }
      vista = (items.find((i) => i.id === guardada) ?? items[0])?.id ?? null;
    }
    emitir({ items, vista, establecimiento: establecimiento ?? estado.establecimiento });
  },
};

const servidor: Estado = { vista: null, items: [] };

export function useAgroNav() {
  return useSyncExternalStore(agroNav.subscribe, agroNav.get, () => servidor);
}

/** Menú lateral de VORDIA Agro para el shell principal (reemplaza las pestañas internas). */
export function AgroSidebarNav({ onNavigate, resaltar = true }: { onNavigate?: () => void; resaltar?: boolean }) {
  const { vista, items } = useAgroNav();
  if (!items.length) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {items.map((n) => {
        const activo = resaltar && vista === n.id;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => {
              agroNav.irA(n.id);
              onNavigate?.();
            }}
            className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${
              activo
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                : "text-slate-300/80 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className={activo ? "text-white" : "text-emerald-300/70"}>{n.icon}</span>
            <span className="text-[13px] font-medium leading-tight">{n.label}</span>
          </button>
        );
      })}
    </div>
  );
}
