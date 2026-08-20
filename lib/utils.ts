import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuplex(text?: string | null): string {
  if (!text) return "";
  return text.replace(/\b(?:Dúplex|Duplex|D)\s*-?\s*(\d+)\b/gi, (_, num) => {
    const n = parseInt(num, 10);
    return `Dúplex ${n < 10 ? "0" + n : n}`;
  });
}

/** Etiqueta de unidad para facturas/recibos multi-mes (ej. "Duplex 02"). */
export function formatUnidadComprobante(codigo?: string | null): string {
  const raw = String(codigo || "").trim();
  if (!raw) return "";
  const m = raw.match(/(?:dúplex|duplex|d)\s*-?\s*(\d+)/i);
  if (m) {
    const n = parseInt(m[1], 10);
    return `Duplex ${n < 10 ? "0" + n : n}`;
  }
  return formatDuplex(raw) || raw;
}

/** Muestra Agus en UI; en BD puede seguir como Aguz. */
export function displayCondoName(text?: string | null): string {
  if (!text) return "";
  return String(text).replace(/Aguz/gi, "Agus");
}

const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

export function nombreMes(mes: number): string {
  const i = Math.max(1, Math.min(12, Number(mes) || 1)) - 1;
  return MESES_ES[i];
}

export type PeriodoCobro = { tipoPago?: string; mes: number; anio: number };

/** Descripción profesional singular/plural para conceptos de cobro (factura/recibo). */
export function formatConceptoCobro(
  periodos: PeriodoCobro[],
  extras: string[] = []
): string {
  const parts: string[] = [];
  const alquileres = periodos.filter(
    (p) => !p.tipoPago || /^alquiler$/i.test(String(p.tipoPago))
  );
  const otros = periodos.filter(
    (p) => p.tipoPago && !/^alquiler$/i.test(String(p.tipoPago))
  );

  if (alquileres.length === 1) {
    const a = alquileres[0];
    parts.push(`Alquiler del mes de ${nombreMes(a.mes)} ${a.anio}`);
  } else if (alquileres.length > 1) {
    const byYear = new Map<number, number[]>();
    for (const a of alquileres) {
      const list = byYear.get(a.anio) || [];
      list.push(a.mes);
      byYear.set(a.anio, list);
    }
    const chunks: string[] = [];
    for (const [anio, meses] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
      const unique = [...new Set(meses)].sort((a, b) => a - b);
      const labels = unique.map((m) => nombreMes(m));
      let lista: string;
      if (labels.length === 1) lista = labels[0];
      else if (labels.length === 2) lista = `${labels[0]} y ${labels[1]}`;
      else lista = `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
      chunks.push(`${lista} de ${anio}`);
    }
    parts.push(
      `Alquileres correspondientes a los meses de ${chunks.join("; ")}`
    );
  }

  for (const o of otros) {
    parts.push(`${o.tipoPago} del mes de ${nombreMes(o.mes)} ${o.anio}`);
  }

  for (const e of extras) {
    if (e?.trim()) parts.push(e.trim());
  }

  return parts.join(" + ") || "Cobro";
}

/** Descripción de un solo período (al reabrir una factura/recibo puntual). */
export function formatConceptoPeriodo(
  tipoPago: string | undefined,
  mes: number,
  anio: number
): string {
  return formatConceptoCobro([{ tipoPago: tipoPago || "Alquiler", mes, anio }]);
}

export function isAdminFontana(user?: { nombre?: string; email?: string } | null): boolean {
  if (!user) return false;
  const n = String(user.nombre || "").toLowerCase().trim();
  const e = String(user.email || "").toLowerCase().trim();
  return n === "adminfontana" || e.includes("adminfontana");
}

const VORDIA_SESSION_KEY = "VORDIA_auth_session";

export function saveVordiaSession(payload: { user: unknown; vista?: string }) {
  try {
    localStorage.setItem(VORDIA_SESSION_KEY, JSON.stringify({
      user: payload.user,
      vista: payload.vista || "inicio",
      savedAt: Date.now(),
    }));
  } catch { /* ignore */ }
}

export function loadVordiaSession(): { user: any; vista?: string } | null {
  try {
    const raw = localStorage.getItem(VORDIA_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user) return null;
    return { user: parsed.user, vista: parsed.vista };
  } catch {
    return null;
  }
}

export function clearVordiaSession() {
  try {
    localStorage.removeItem(VORDIA_SESSION_KEY);
  } catch { /* ignore */ }
}

/** Parsea fechas ISO (YYYY-MM-DD), DD/MM/YYYY o Date sin desfase UTC. */
export function parseFechaLocal(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ej: "10 de agosto de 2025" (sin duplicar el día). */
export function formatFechaLarga(value?: string | Date | null): string {
  const d = parseFechaLocal(value);
  if (!d) return "";
  const day = d.getDate();
  const month = d.toLocaleDateString("es-PY", { month: "long" });
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
}

/** Ej: "10/08/2025" */
export function formatFechaCorta(value?: string | Date | null): string {
  const d = parseFechaLocal(value);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
