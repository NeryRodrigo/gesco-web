/** Slug de URL → código de solución (entorno) en la landing. */
export const VORDIA_ENTORNOS: Record<string, string> = {
  habitat: "HABITAT",
  condominios: "HABITAT",
  condominio: "HABITAT",
  edificios: "HABITAT",
  stay: "STAY",
  hotel: "STAY",
  hoteles: "STAY",
  hostel: "STAY",
  alojamiento: "STAY",
  dine: "DINE",
  gastronomia: "DINE",
  restaurante: "DINE",
  restaurantes: "DINE",
  retail: "RETAIL",
  comercio: "RETAIL",
  boutique: "BOUTIQUE",
  moda: "BOUTIQUE",
  ops: "OPS",
  logistica: "OPS",
  agro: "AGRO",
  agricola: "AGRO",
};

export const VORDIA_ENTORNO_CANONICOS = [
  "habitat",
  "stay",
  "dine",
  "retail",
  "boutique",
  "ops",
  "agro",
] as const;

export function entornoDesdeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase().replace(/\/+$/, "");
  return VORDIA_ENTORNOS[key] ?? null;
}

export function slugEmpresa(nombre: string) {
  return String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type EmpresaLogin = {
  empresaId: number;
  razonSocial: string;
  rubro: string;
};

export function normalizarEmpresa(raw: Record<string, unknown>): EmpresaLogin | null {
  const empresaId = Number(raw.empresaId ?? raw.EmpresaId);
  const razonSocial = String(raw.razonSocial ?? raw.RazonSocial ?? "").trim();
  const rubro = String(raw.rubro ?? raw.Rubro ?? "").trim();
  if (!Number.isFinite(empresaId) || empresaId <= 0 || !razonSocial) return null;
  return { empresaId, razonSocial, rubro };
}

const RUBRO_POR_SLUG: Record<string, string> = {
  vordia: "VORDIA",
  agrofield: "AGRO",
  agro: "AGRO",
};

export function empresaPorSlug(empresas: EmpresaLogin[], slug: string | null | undefined) {
  const s = slugEmpresa(slug || "");
  if (!s || empresas.length === 0) return null;

  const exacta = empresas.find((e) => slugEmpresa(e.razonSocial) === s);
  if (exacta) return exacta;

  const rubro = RUBRO_POR_SLUG[s];
  if (rubro) {
    const porRubro = empresas.find((e) => e.rubro.toUpperCase() === rubro);
    if (porRubro) return porRubro;
  }

  const parciales = empresas.filter((e) => {
    const rs = slugEmpresa(e.razonSocial);
    return rs.includes(s) || s.includes(rs);
  });
  return parciales.length === 1 ? parciales[0] : null;
}
