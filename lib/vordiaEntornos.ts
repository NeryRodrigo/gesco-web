/** Origen canónico del sitio público. Sin barra final (coincide con el <link rel="canonical"> de Next). */
export const VORDIA_SITIO = "https://www.vordia.com.py";

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

export type VordiaProductoSlug = (typeof VORDIA_ENTORNO_CANONICOS)[number];

export const VORDIA_SLUGS_PRODUCTO = new Set<string>(VORDIA_ENTORNO_CANONICOS);

/** Alias de marketing → slug canónico. Solo se redirigen en el dominio público. */
export const VORDIA_ALIAS_CANONICO: Record<string, VordiaProductoSlug> = {
  condominios: "habitat",
  condominio: "habitat",
  edificios: "habitat",
  hotel: "stay",
  hoteles: "stay",
  hostel: "stay",
  alojamiento: "stay",
  gastronomia: "dine",
  restaurante: "dine",
  restaurantes: "dine",
  comercio: "retail",
  moda: "boutique",
  logistica: "ops",
  agricola: "agro",
};

/** Rutas del HQ que no deben convertirse en login ni en landing. */
export const VORDIA_MODULOS_HQ = new Set([
  "condominio",
  "stay",
  "agro",
  "hostel",
  "captacion",
  "configuracion",
  "factura",
  "nueva-factura",
  "web",
  "web-institucional",
  "login",
  "sitio",
  "acceso",
  "recursos",
]);

export const VORDIA_RESERVADOS = new Set([
  "web",
  "api",
  "login",
  "acceso",
  "images",
  "icons",
  "favicon.ico",
  "_next",
  "sitio",
  "recursos",
  "robots.txt",
  "sitemap.xml",
  "privacidad",
  "terminos",
  "baja",
]);

export function esRecursoEstatico(pathname: string) {
  const ultimo = pathname.split("/").filter(Boolean).pop() || "";
  return ultimo.includes(".");
}

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
