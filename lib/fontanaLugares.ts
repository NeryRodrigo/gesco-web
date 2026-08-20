/** Catálogo de lugares Fontana (hospedaje diario/mensual). */

export const LUGARES_FONTANA_DEFAULT = [
  "Fontana 1",
  "Fontana 2",
  "Fontana 3",
  "Quinta",
  "Quincho 2",
  "Ña Carmen",
] as const;

function storageKey(empresaId: number) {
  return `VORDIA_fontana_lugares_${empresaId}`;
}

export function loadFontanaLugares(empresaId: number): string[] {
  const base = [...LUGARES_FONTANA_DEFAULT];
  if (typeof window === "undefined" || !empresaId) return base;
  try {
    const raw = localStorage.getItem(storageKey(empresaId));
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return base;
    const extra = parsed
      .map((x) => String(x || "").trim())
      .filter(Boolean);
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
  return next;
}
