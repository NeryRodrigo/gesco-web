/**
 * Finanzas Fontana — API/BD (no localStorage).
 */

import { API_BASE } from "@/lib/api";
import { FONTANA_PROPIEDADES_PLANO, type FontanaPropiedadPlano } from "@/lib/fontanaPlanos";

export type FontanaFinanzaPropiedad = FontanaPropiedadPlano | "Todas";

export type FontanaIngresoCategoria =
  | "Hospedaje diario"
  | "Mensualidades"
  | "Otros ingresos";

export type FontanaGastoCategoria =
  | "Personal"
  | "Electricidad"
  | "Agua"
  | "Internet"
  | "Limpieza"
  | "Mantenimiento"
  | "Insumos"
  | "Comisiones"
  | "Otros";

export type FontanaMovimientoTipo = "ingreso" | "gasto";

export type FontanaMovimiento = {
  id: string;
  movimientoId?: number;
  tipo: FontanaMovimientoTipo;
  propiedad: FontanaPropiedadPlano;
  categoria: string;
  concepto: string;
  monto: number;
  fecha: string;
  metodoPago?: string;
  origen?: string;
  createdAt?: string;
};

export const INGRESO_CATEGORIAS: FontanaIngresoCategoria[] = [
  "Hospedaje diario",
  "Mensualidades",
  "Otros ingresos",
];

export const GASTO_CATEGORIAS: FontanaGastoCategoria[] = [
  "Personal",
  "Electricidad",
  "Agua",
  "Internet",
  "Limpieza",
  "Mantenimiento",
  "Insumos",
  "Comisiones",
  "Otros",
];

export const METODOS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Tarjeta débito",
  "Tarjeta crédito",
  "Pago online",
] as const;

export type FontanaPeriodoPreset = "hoy" | "semana" | "mes" | "anio" | "custom";

export function rangoPeriodo(
  preset: FontanaPeriodoPreset,
  customFrom?: string,
  customTo?: string
): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "custom" && customFrom && customTo) {
    return { from: customFrom.slice(0, 10), to: customTo.slice(0, 10) };
  }
  if (preset === "hoy") {
    const t = iso(today);
    return { from: t, to: t };
  }
  if (preset === "semana") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: iso(from), to: iso(today) };
  }
  if (preset === "anio") {
    return { from: `${today.getFullYear()}-01-01`, to: iso(today) };
  }
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: iso(from), to: iso(today) };
}

export function filtrarMovimientos(
  items: FontanaMovimiento[],
  opts: {
    propiedad: FontanaFinanzaPropiedad;
    from: string;
    to: string;
    tipo?: FontanaMovimientoTipo | "todos";
  }
) {
  return items.filter((m) => {
    const f = m.fecha.slice(0, 10);
    if (f < opts.from.slice(0, 10) || f > opts.to.slice(0, 10)) return false;
    if (opts.propiedad !== "Todas" && m.propiedad !== opts.propiedad) return false;
    if (opts.tipo && opts.tipo !== "todos" && m.tipo !== opts.tipo) return false;
    return true;
  });
}

export function resumenFinanciero(items: FontanaMovimiento[]) {
  let ingresos = 0;
  let gastos = 0;
  for (const m of items) {
    if (m.tipo === "ingreso") ingresos += Number(m.monto) || 0;
    else gastos += Number(m.monto) || 0;
  }
  return { ingresos, gastos, resultado: ingresos - gastos };
}

export function resumenPorPropiedad(
  items: FontanaMovimiento[],
  from: string,
  to: string
): Record<FontanaPropiedadPlano, { ingresos: number; gastos: number; resultado: number }> {
  const out = {} as Record<
    FontanaPropiedadPlano,
    { ingresos: number; gastos: number; resultado: number }
  >;
  for (const p of FONTANA_PROPIEDADES_PLANO) {
    out[p] = resumenFinanciero(
      filtrarMovimientos(items, { propiedad: p, from, to })
    );
  }
  return out;
}

export function formatGs(n: number) {
  const v = Math.round(Number(n) || 0);
  return `Gs. ${v.toLocaleString("es-PY")}`;
}

export async function fetchFontanaMovimientos(
  empresaId: number,
  opts?: { propiedad?: string; from?: string; to?: string; tipo?: string }
): Promise<FontanaMovimiento[]> {
  const qs = new URLSearchParams({ empresaId: String(empresaId) });
  if (opts?.propiedad) qs.set("propiedad", opts.propiedad);
  if (opts?.from) qs.set("from", opts.from);
  if (opts?.to) qs.set("to", opts.to);
  if (opts?.tipo) qs.set("tipo", opts.tipo);
  const res = await fetch(`${API_BASE}/api/Fontana/movimientos?${qs}`);
  if (!res.ok) throw new Error(`Error ${res.status} al cargar movimientos`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function addFontanaMovimiento(
  empresaId: number,
  input: Omit<FontanaMovimiento, "id" | "createdAt" | "movimientoId">
): Promise<FontanaMovimiento> {
  const res = await fetch(`${API_BASE}/api/Fontana/movimientos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      empresaId,
      tipo: input.tipo,
      propiedad: input.propiedad,
      categoria: input.categoria,
      concepto: input.concepto,
      monto: input.monto,
      fecha: input.fecha,
      metodoPago: input.metodoPago,
      origen: input.origen,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Error ${res.status}`);
  }
  return res.json();
}

export async function removeFontanaMovimiento(empresaId: number, id: string) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return;
  const res = await fetch(
    `${API_BASE}/api/Fontana/movimientos/${n}?empresaId=${empresaId}`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`Error ${res.status} al eliminar`);
  }
}
