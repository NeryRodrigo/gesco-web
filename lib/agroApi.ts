/**
 * VORDIA AGRO — cliente API del vertical agropecuario (prototipo Agrofield).
 * Additive: no modifica Habitat / HQ / Stay / Fontana.
 */

import { API_BASE } from "@/lib/api";

async function agroFetch(path: string, init?: RequestInit) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(t || `Error ${r.status}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

export type AgroDashboard = {
  establecimientoId: number;
  nombre: string;
  clienteNombre?: string | null;
  ubicacion?: string | null;
  hectareas?: number | null;
  animalesActivos: number;
  animalesFueraZona: number;
  animalesTratamiento: number;
  lotes: number;
  alertasAbiertas: number;
  dispositivosOnline: number;
  dispositivosAlerta: number;
  alimentoKg7d: number;
  gpdPromedioKg?: number | null;
  conversionEstimada?: number | null;
  ultimasAlertas: AgroAlerta[];
};

export type AgroAnimal = {
  animalId: number;
  establecimientoId: number;
  loteId?: number | null;
  loteCodigo?: string | null;
  codigoInterno: string;
  rfidTag?: string | null;
  collarId?: string | null;
  categoria: string;
  sexo?: string | null;
  fechaIngreso?: string | null;
  pesoIngresoKg?: number | null;
  pesoActualKg?: number | null;
  gananciaKg?: number | null;
  gpdKg?: number | null;
  diasEnEstablecimiento?: number | null;
  estado: string;
  ultimaLat?: number | null;
  ultimaLng?: number | null;
  bateriaCollarPct?: number | null;
  notas?: string | null;
};

export type AgroAlerta = {
  alertaId: number;
  animalId?: number | null;
  animalCodigo?: string | null;
  tipo: string;
  severidad: string;
  titulo: string;
  detalle?: string | null;
  resuelta: boolean;
  fechaAlerta: string;
};

export type AgroLote = {
  loteId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  camaraCodigo?: string | null;
  animales: number;
};

export type AgroRacion = {
  racionId: number;
  loteId: number;
  loteCodigo?: string | null;
  tipoAlimento: string;
  cantidadKg: number;
  fechaEntrega: string;
  operario?: string | null;
  vehiculo?: string | null;
  costoGs?: number | null;
};

export type AgroDispositivo = {
  dispositivoId: number;
  codigo: string;
  tipo: string;
  animalCodigo?: string | null;
  estado: string;
  bateriaPct?: number | null;
  ultimoPingAt?: string | null;
};

export type AgroZona = {
  zonaId: number;
  nombre: string;
  tipo: string;
  latCentro?: number | null;
  lngCentro?: number | null;
  radioMetros: number;
};

export const agroPing = () => agroFetch("/api/Agro/ping");

/** Resuelve EmpresaId de Agrofield (para login Vordia HQ → probar Agro). */
export const agroContextoAgrofield = () =>
  agroFetch("/api/Agro/contexto-agrofield") as Promise<{
    empresaId: number;
    razonSocial: string;
    rubro: string;
    cliente: string;
    tieneDatos: boolean;
    accesoDesde?: string;
  }>;

export const agroDashboard = (empresaId: number, establecimientoId?: number) => {
  const qs = new URLSearchParams({ empresaId: String(empresaId) });
  if (establecimientoId) qs.set("establecimientoId", String(establecimientoId));
  return agroFetch(`/api/Agro/dashboard?${qs}`) as Promise<AgroDashboard>;
};
export const agroAnimales = (empresaId: number, establecimientoId?: number) => {
  const qs = new URLSearchParams({ empresaId: String(empresaId) });
  if (establecimientoId) qs.set("establecimientoId", String(establecimientoId));
  return agroFetch(`/api/Agro/animales?${qs}`) as Promise<AgroAnimal[]>;
};
export const agroLotes = (empresaId: number, establecimientoId?: number) => {
  const qs = new URLSearchParams({ empresaId: String(empresaId) });
  if (establecimientoId) qs.set("establecimientoId", String(establecimientoId));
  return agroFetch(`/api/Agro/lotes?${qs}`) as Promise<AgroLote[]>;
};
export const agroRaciones = (empresaId: number) =>
  agroFetch(`/api/Agro/raciones?empresaId=${empresaId}`) as Promise<AgroRacion[]>;
export const agroDispositivos = (empresaId: number, establecimientoId?: number) => {
  const qs = new URLSearchParams({ empresaId: String(empresaId) });
  if (establecimientoId) qs.set("establecimientoId", String(establecimientoId));
  return agroFetch(`/api/Agro/dispositivos?${qs}`) as Promise<AgroDispositivo[]>;
};
export const agroAlertas = (empresaId: number, establecimientoId?: number) => {
  const qs = new URLSearchParams({ empresaId: String(empresaId), soloAbiertas: "true" });
  if (establecimientoId) qs.set("establecimientoId", String(establecimientoId));
  return agroFetch(`/api/Agro/alertas?${qs}`) as Promise<AgroAlerta[]>;
};
export const agroZonas = (empresaId: number, establecimientoId?: number) => {
  const qs = new URLSearchParams({ empresaId: String(empresaId) });
  if (establecimientoId) qs.set("establecimientoId", String(establecimientoId));
  return agroFetch(`/api/Agro/zonas?${qs}`) as Promise<AgroZona[]>;
};
export const agroResolverAlerta = (empresaId: number, alertaId: number) =>
  agroFetch(`/api/Agro/alertas/${alertaId}/resolver?empresaId=${empresaId}`, { method: "POST" });
export const agroRegistrarPesaje = (body: {
  empresaId: number;
  animalId: number;
  pesoKg: number;
  origen?: string;
  operario?: string;
}) => agroFetch("/api/Agro/pesajes", { method: "POST", body: JSON.stringify(body) });
export const agroRegistrarRacion = (body: {
  empresaId: number;
  loteId: number;
  tipoAlimento: string;
  cantidadKg: number;
  operario?: string;
  vehiculo?: string;
  costoGs?: number;
}) => agroFetch("/api/Agro/raciones", { method: "POST", body: JSON.stringify(body) });
export const agroSimularUbicacion = (body: {
  empresaId: number;
  animalId: number;
  lat: number;
  lng: number;
  bateriaPct?: number;
  generarAlertaFueraZona?: boolean;
}) => agroFetch("/api/Agro/simular-ubicacion", { method: "POST", body: JSON.stringify(body) });
export const agroCrearAnimal = (body: Record<string, unknown>) =>
  agroFetch("/api/Agro/animales", { method: "POST", body: JSON.stringify(body) });
