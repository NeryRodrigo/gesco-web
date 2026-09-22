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
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
