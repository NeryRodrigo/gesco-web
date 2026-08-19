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

/** Muestra Agus en UI; en BD puede seguir como Aguz. */
export function displayCondoName(text?: string | null): string {
  if (!text) return "";
  return String(text).replace(/Aguz/gi, "Agus");
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
