import { VORDIA_PRECIOS, type VordiaPlan } from "./vordiaPlanes";
import type { VordiaProductoSlug } from "./vordiaEntornos";

/** Pregunta de tamaño por producto: lo que el prospecto entiende como "tamaño" de su negocio. */
export const ESTUDIO_TAMANO: Record<VordiaProductoSlug, string> = {
  habitat: "¿Cuántas unidades (departamentos o casas) administrás?",
  stay: "¿Cuántas habitaciones tiene tu alojamiento?",
  dine: "¿Cuántas cajas o puntos de cobro usás?",
  retail: "¿Cuántas cajas o puntos de venta tenés?",
  boutique: "¿Cuántas cajas o puntos de venta tenés?",
  ops: "¿Cuántos vehículos o equipos tenés en la calle?",
  agro: "¿Cuántas cabezas de ganado manejás?",
};

/** Multiplicadores del precio recomendado que se muestran al azar (Gabor-Granger). */
export const ESTUDIO_VARIANTES = [0.8, 1, 1.25];

export function planRecomendado(slug: string): VordiaPlan | null {
  const p = VORDIA_PRECIOS.find((x) => x.slug === slug);
  return p?.planes.find((pl) => pl.recomendado) ?? p?.planes[1] ?? null;
}

/** Precios a probar para el plan recomendado, redondeados a miles de guaraníes. */
export function preciosAProbar(slug: string): number[] {
  const plan = planRecomendado(slug);
  if (!plan) return [];
  return ESTUDIO_VARIANTES.map((m) => Math.round((plan.precioMensualGs * m) / 1000) * 1000);
}

export type RespuestaEstudio = {
  respuestaId: number;
  producto: string;
  origen?: string | null;
  tamano?: number | null;
  ciudad?: string | null;
  herramientaActual?: string | null;
  gastoActualGs?: number | null;
  problemaPrincipal?: string | null;
  decisor?: string | null;
  muyBaratoGs: number;
  baratoGs: number;
  caroGs: number;
  muyCaroGs: number;
  precioMostradoGs: number;
  intencionCompra: number;
  comentario?: string | null;
  contactoNombre?: string | null;
  contactoEmpresa?: string | null;
  contactoDato?: string | null;
  aceptaContacto: boolean;
  fecha: string;
};

export type PuntoCurva = { p: number; muyBarato: number; barato: number; caro: number; muyCaro: number };

export type ResultadoVW = {
  n: number;
  curva: PuntoCurva[];
  /** Punto marginal de baratura: por debajo, demasiados dudan de la calidad. */
  pmc: number | null;
  /** Punto de precio óptimo: menos resistencia al precio. */
  opp: number | null;
  /** Punto de indiferencia: tantos lo ven barato como caro. */
  ipp: number | null;
  /** Punto marginal de carestía: por encima, demasiados lo descartan. */
  pme: number | null;
};

/** Primer cruce de dos curvas (interpolación lineal entre puntos). */
function cruce(curva: PuntoCurva[], a: (x: PuntoCurva) => number, b: (x: PuntoCurva) => number): number | null {
  for (let i = 0; i < curva.length - 1; i++) {
    const d1 = a(curva[i]) - b(curva[i]);
    const d2 = a(curva[i + 1]) - b(curva[i + 1]);
    if (d1 === 0) return curva[i].p;
    if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
      const t = d1 / (d1 - d2);
      return Math.round(curva[i].p + t * (curva[i + 1].p - curva[i].p));
    }
  }
  return null;
}

/** Análisis de sensibilidad de precio de Van Westendorp. */
export function vanWestendorp(rs: RespuestaEstudio[]): ResultadoVW {
  const n = rs.length;
  if (n === 0) return { n, curva: [], pmc: null, opp: null, ipp: null, pme: null };
  const precios = [...new Set(rs.flatMap((r) => [r.muyBaratoGs, r.baratoGs, r.caroGs, r.muyCaroGs]))].sort((x, y) => x - y);
  const curva = precios.map((p) => ({
    p,
    muyBarato: rs.filter((r) => r.muyBaratoGs >= p).length / n,
    barato: rs.filter((r) => r.baratoGs >= p).length / n,
    caro: rs.filter((r) => r.caroGs <= p).length / n,
    muyCaro: rs.filter((r) => r.muyCaroGs <= p).length / n,
  }));
  return {
    n,
    curva,
    pmc: cruce(curva, (x) => x.muyBarato, (x) => 1 - x.barato),
    opp: cruce(curva, (x) => x.muyBarato, (x) => x.muyCaro),
    ipp: cruce(curva, (x) => x.barato, (x) => x.caro),
    pme: cruce(curva, (x) => x.muyCaro, (x) => 1 - x.caro),
  };
}

export type FilaGabor = { precio: number; n: number; compraria: number; indiceIngreso: number };

/** Intención de compra por precio mostrado: % que respondió "probable" o "seguro" (4 o 5). */
export function gaborGranger(rs: RespuestaEstudio[]): FilaGabor[] {
  const grupos = new Map<number, RespuestaEstudio[]>();
  rs.forEach((r) => grupos.set(r.precioMostradoGs, [...(grupos.get(r.precioMostradoGs) ?? []), r]));
  return [...grupos.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([precio, g]) => {
      const compraria = g.filter((r) => r.intencionCompra >= 4).length / g.length;
      return { precio, n: g.length, compraria, indiceIngreso: Math.round(precio * compraria) };
    });
}

export function mediana(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

/** Muestra mínima por producto para decidir con algo de confianza. */
export const ESTUDIO_MUESTRA_MINIMA = 30;

export const fmtGs = (n: number | null | undefined) => (n == null ? "—" : `Gs ${Math.round(n).toLocaleString("es-PY")}`);
