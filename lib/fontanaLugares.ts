/** Catálogo de lugares Fontana (hospedaje diario/mensual) + cupos por lugar. */

export const LUGARES_FONTANA_DEFAULT = [
  "Fontana 1",
  "Fontana 2",
  "Fontana 3",
  "Quinta",
  "Quincho 2",
  "Ña Carmen",
] as const;

/** Cupo máximo por defecto (habitaciones físicas habilitadas por lugar) */
export const CUPOS_LUGAR_DEFAULT: Record<string, number> = {
  "Fontana 1": 16, // 8 PB + 8 PA
  "Fontana 2": 22, // 11 PB + 11 PA (mensual)
  "Fontana 3": 16, // 8 PB + 8 PA
  Quinta: 1,
  "Quincho 2": 1,
  "Ña Carmen": 1,
};

export type FontanaCupoLugar = {
  /** Plazas habilitadas (puede subir; no puede bajar bajo ocupadas) */
  cupo: number;
  /** Si false, el lugar no aparece para nuevas cargas */
  habilitado: boolean;
};

function storageKey(empresaId: number) {
  return `VORDIA_fontana_lugares_${empresaId}`;
}

function cuposStorageKey(empresaId: number) {
  return `VORDIA_fontana_cupos_${empresaId}`;
}

export function loadFontanaLugares(empresaId: number): string[] {
  const base = [...LUGARES_FONTANA_DEFAULT];
  if (typeof window === "undefined" || !empresaId) return base;
  try {
    const raw = localStorage.getItem(storageKey(empresaId));
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return base;
    const extra = parsed.map((x) => String(x || "").trim()).filter(Boolean);
    return mergeLugares(base, extra);
  } catch {
    return base;
  }
}

export function saveFontanaLugares(empresaId: number, lugares: string[]) {
  if (typeof window === "undefined" || !empresaId) return;
  try {
    const cleaned = mergeLugares([], lugares);
    localStorage.setItem(storageKey(empresaId), JSON.stringify(cleaned));
  } catch {
    /* ignore */
  }
}

export function mergeLugares(...lists: (readonly string[] | string[])[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      const t = String(item || "").trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, "es"));
}

export function addFontanaLugar(empresaId: number, nombre: string): string[] {
  const next = mergeLugares(loadFontanaLugares(empresaId), [nombre]);
  saveFontanaLugares(empresaId, next);
  // Cupo default 1 para lugares nuevos custom
  const cupos = loadFontanaCupos(empresaId);
  if (!cupos[nombre]) {
    cupos[nombre] = { cupo: 1, habilitado: true };
    saveFontanaCupos(empresaId, cupos);
  }
  return next;
}

export function cupoDefaultParaLugar(nombre: string): number {
  const key = Object.keys(CUPOS_LUGAR_DEFAULT).find(
    (k) => k.toLowerCase() === nombre.trim().toLowerCase()
  );
  return key ? CUPOS_LUGAR_DEFAULT[key] : 1;
}

export function loadFontanaCupos(empresaId: number): Record<string, FontanaCupoLugar> {
  const lugares = loadFontanaLugares(empresaId);
  const base: Record<string, FontanaCupoLugar> = {};
  for (const l of lugares) {
    base[l] = { cupo: cupoDefaultParaLugar(l), habilitado: true };
  }
  if (typeof window === "undefined" || !empresaId) return base;
  try {
    const raw = localStorage.getItem(cuposStorageKey(empresaId));
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, Partial<FontanaCupoLugar>>;
    if (!parsed || typeof parsed !== "object") return base;
    for (const [nombre, cfg] of Object.entries(parsed)) {
      if (!nombre) continue;
      const def = cupoDefaultParaLugar(nombre);
      const stored = Math.max(0, Number(cfg?.cupo) || def);
      // Migración croquis: no quedarse con cupos viejos (3) debajo del inventario físico
      base[nombre] = {
        cupo: Math.max(stored, def),
        habilitado: cfg?.habilitado !== false,
      };
    }
    // Asegurar que todos los lugares del catálogo existan
    for (const l of lugares) {
      if (!base[l]) base[l] = { cupo: cupoDefaultParaLugar(l), habilitado: true };
    }
    return base;
  } catch {
    return base;
  }
}

export function saveFontanaCupos(empresaId: number, cupos: Record<string, FontanaCupoLugar>) {
  if (typeof window === "undefined" || !empresaId) return;
  try {
    localStorage.setItem(cuposStorageKey(empresaId), JSON.stringify(cupos));
  } catch {
    /* ignore */
  }
}

/** Normaliza nombre de lugar para comparar */
export function sameLugar(a?: string | null, b?: string | null) {
  return String(a || "")
    .trim()
    .toLowerCase() === String(b || "").trim().toLowerCase();
}

/** "Fontana 1 - Habitación 2" (lugar primero, número por lugar) */
export function formatNombreHabitacionLugar(numero: number, lugar: string) {
  const n = Math.max(1, Math.floor(Number(numero) || 1));
  const l = String(lugar || "").trim() || "Fontana";
  return `${l} - Habitación ${n}`;
}

/** Extrae número de nombres tipo Hab 1 / Habitación 3 / "Fontana 1 - Habitación 2" */
export function extractNumeroHabitacion(nombre?: string | null): number | null {
  const raw = String(nombre || "").trim();
  if (!raw) return null;
  const m =
    raw.match(/-\s*Habitaci[oó]n\s+(\d+)\s*$/i) ||
    raw.match(/Habitaci[oó]n\s+(\d+)/i) ||
    raw.match(/\bHab\.?\s*(\d+)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Siguiente número de habitación para un lugar (reinicia en 1 por cada lugar).
 */
export function nextNumeroHabitacionEnLugar(
  items: { nombre?: string | null; nombreLugar?: string | null }[],
  lugar: string
): number {
  const count = items.filter((it) => sameLugar(it.nombreLugar, lugar)).length;
  return count + 1;
}

export const HABITACIONES_DUPLEX_AGUS = [
  { id: "1", label: "Habitación 1 — Suite" },
  { id: "2", label: "Habitación 2 — Frente al suite" },
  { id: "3", label: "Habitación 3 — Frente al baño" },
] as const;
