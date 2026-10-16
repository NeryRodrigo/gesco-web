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

/* ───────────── Rediseño por módulos ───────────── */

export type AgroModulo = "CRIA" | "RECRIA" | "FEED" | "HEALTH" | "TRACE" | "FINANCE" | "CONNECT";
export type AgroEtapa = "Reproductor" | "Cria" | "Recria" | "Engorde" | "Terminado" | "Vendido" | "Baja";

export type AgroConfiguracion = {
  configurada: boolean;
  sistemaProductivo: string;
  paquete: string;
  modulosActivos: AgroModulo[];
  pesoObjetivoKg: number;
  pesoObjetivoRecriaKg: number;
  gpdMinimoKg: number;
  precioKgGs: number;
  costoRacionKgGs: number;
  gpdObjetivoKg: number;
  conversionObjetivo: number;
};

export type AgroAtencion = {
  prioridad: "Critica" | "Alta" | "Media" | "Baja";
  modulo: string;
  titulo: string;
  detalle?: string | null;
  alertaId?: number | null;
  sanidadId?: number | null;
  loteId?: number | null;
  animalId?: number | null;
};

export type AgroEtapaResumen = {
  etapa: AgroEtapa;
  animales: number;
  pesoPromedioKg?: number | null;
  gpdPromedioKg?: number | null;
  valorEstimadoGs: number;
};

export type AgroEjecutivo = {
  establecimientoId: number;
  nombre: string;
  clienteNombre?: string | null;
  ubicacion?: string | null;
  hectareas?: number | null;
  totalAnimales: number;
  listosParaVenta: number;
  alertasAbiertas: number;
  sanidadPendiente: number;
  sanidadVencida: number;
  animalesEnRetiro: number;
  kgEnPie: number;
  valorRodeoGs: number;
  precioKgGs: number;
  lotes: number;
  etapas: AgroEtapaResumen[];
  atencion: AgroAtencion[];
};

export type AgroFeedLote = {
  loteId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  animales: number;
  pesoPromedioKg?: number | null;
  gpdPromedioKg?: number | null;
  pesoObjetivoKg: number;
  diasPromedio?: number | null;
  alimentoKg7d: number;
  kgCabDia?: number | null;
  conversion?: number | null;
  kgProducidos30d: number;
  costoAlimento30dGs: number;
  costoKgProducidoGs?: number | null;
  listosParaVenta: number;
  ultimaRacion?: string | null;
  rendimiento: "Optimo" | "Atencion" | "Bajo";
};

export type AgroSanidad = {
  sanidadId: number;
  animalId?: number | null;
  animalCodigo?: string | null;
  loteId?: number | null;
  loteCodigo?: string | null;
  tipo: string;
  producto: string;
  dosis?: string | null;
  fechaProgramada?: string | null;
  fechaAplicacion?: string | null;
  diasRetiro: number;
  retiroHasta?: string | null;
  estado: "Programada" | "Aplicada" | "Cancelada";
  vencida: boolean;
  responsable?: string | null;
  notas?: string | null;
  animalesAlcanzados: number;
};

export type AgroActividad = { fecha: string; tipo: string; titulo: string; detalle?: string | null };

export type AgroFeed = {
  establecimientoId: number;
  nombre: string;
  clienteNombre?: string | null;
  ubicacion?: string | null;
  cabezasActivas: number;
  capacidadTotal: number;
  pesoPromedioKg?: number | null;
  pesoIngresoPromedioKg?: number | null;
  gpdPromedioKg?: number | null;
  conversionEstimada?: number | null;
  listosParaVenta: number;
  alertasAbiertas: number;
  diasPromedioEnCorral?: number | null;
  pesoObjetivoKg: number;
  gpdMinimoKg: number;
  alimentoKg7d: number;
  kgCabDia?: number | null;
  atencion: AgroAtencion[];
  evolucionPeso: { fecha: string; pesoPromedioKg?: number | null; pesoObjetivoKg?: number | null; animales: number }[];
  gpdObjetivoKg: number;
  conversionObjetivo: number;
  listos15d: number;
  listos30d: number;
  diasEstimadosTerminacion?: number | null;
  lotes: AgroFeedLote[];
  alimentacionDiaria: { fecha: string; kg: number; costoGs: number }[];
  sanidad: {
    programadas: number;
    vencidas: number;
    aplicadasMes: number;
    animalesEnRetiro: number;
    animalesEnTratamiento: number;
    proximas: AgroSanidad[];
  };
  economia: {
    kgProducidos30d: number;
    costoAlimento30dGs: number;
    costoKgProducidoGs?: number | null;
    costoDiarioGs: number;
    costoCabDiaGs?: number | null;
    precioKgGs: number;
    margenKgGs?: number | null;
    valorStockGs: number;
    valorListosGs: number;
    kgListos: number;
  };
  dispositivos: { total: number; online: number; alerta: number; bateriaBaja: number };
  actividad: AgroActividad[];
};

export type AgroAnimalFull = AgroAnimal & {
  etapa: AgroEtapa;
  fechaEtapa?: string | null;
  raza?: string | null;
  fechaNacimiento?: string | null;
  pesoNacimientoKg?: number | null;
  madreCodigo?: string | null;
  padreCodigo?: string | null;
  pesoObjetivoKg?: number | null;
  diasParaObjetivo?: number | null;
  listoParaVenta: boolean;
  retiroSanitarioHasta?: string | null;
};

export type AgroLoteFull = AgroLote & { establecimientoId: number; etapa?: AgroEtapa | null; pesoObjetivoKg?: number | null };

export type AgroPesaje = { pesajeId: number; animalId: number; pesoKg: number; fechaPesaje: string; origen: string; operario?: string | null };

export type AgroFicha = {
  animal: AgroAnimalFull;
  loteNombre?: string | null;
  pesajes: AgroPesaje[];
  sanidad: AgroSanidad[];
  alertas: AgroAlerta[];
  eventos: AgroActividad[];
  crias: string[];
};

export const agroConfiguracion = (empresaId: number) =>
  agroFetch(`/api/Agro/configuracion?empresaId=${empresaId}`) as Promise<AgroConfiguracion>;
export const agroGuardarConfiguracion = (body: {
  empresaId: number;
  sistemaProductivo: string;
  modulosActivos: AgroModulo[];
  paquete?: string;
  pesoObjetivoKg?: number;
  pesoObjetivoRecriaKg?: number;
  gpdMinimoKg?: number;
  precioKgGs?: number;
  costoRacionKgGs?: number;
  gpdObjetivoKg?: number;
  conversionObjetivo?: number;
}) => agroFetch("/api/Agro/configuracion", { method: "PUT", body: JSON.stringify(body) }) as Promise<AgroConfiguracion>;
export const agroEjecutivo = (empresaId: number) =>
  agroFetch(`/api/Agro/ejecutivo?empresaId=${empresaId}`) as Promise<AgroEjecutivo>;
export const agroFeed = (empresaId: number, dias?: number) =>
  agroFetch(`/api/Agro/feed?empresaId=${empresaId}${dias ? `&dias=${dias}` : ""}`) as Promise<AgroFeed>;
export const agroAnimalesFull = (empresaId: number, etapa?: string) => {
  const qs = new URLSearchParams({ empresaId: String(empresaId) });
  if (etapa) qs.set("etapa", etapa);
  return agroFetch(`/api/Agro/animales?${qs}`) as Promise<AgroAnimalFull[]>;
};
export const agroLotesFull = (empresaId: number) =>
  agroFetch(`/api/Agro/lotes?empresaId=${empresaId}`) as Promise<AgroLoteFull[]>;
export const agroSanidad = (empresaId: number, estado?: string) => {
  const qs = new URLSearchParams({ empresaId: String(empresaId) });
  if (estado) qs.set("estado", estado);
  return agroFetch(`/api/Agro/sanidad?${qs}`) as Promise<AgroSanidad[]>;
};
export const agroRegistrarSanidad = (body: {
  empresaId: number;
  animalId?: number | null;
  loteId?: number | null;
  tipo: string;
  producto: string;
  dosis?: string;
  fechaProgramada?: string;
  aplicada: boolean;
  diasRetiro: number;
  responsable?: string;
  notas?: string;
}) => agroFetch("/api/Agro/sanidad", { method: "POST", body: JSON.stringify(body) }) as Promise<AgroSanidad>;
export const agroAplicarSanidad = (empresaId: number, sanidadId: number) =>
  agroFetch(`/api/Agro/sanidad/${sanidadId}/aplicar?empresaId=${empresaId}`, { method: "POST" });
export const agroCambiarEtapa = (animalId: number, body: { empresaId: number; etapa: AgroEtapa; loteId?: number | null; pesoKg?: number | null; motivo?: string }) =>
  agroFetch(`/api/Agro/animales/${animalId}/etapa`, { method: "POST", body: JSON.stringify(body) }) as Promise<AgroAnimalFull>;
export const agroFicha = (empresaId: number, animalId: number) =>
  agroFetch(`/api/Agro/animales/${animalId}/ficha?empresaId=${empresaId}`) as Promise<AgroFicha>;

/* ───────────── Dashboard principal, inventario y lotes ───────────── */

export type AgroInsumo = {
  insumoId: number;
  nombre: string;
  tipo: "Alimento" | "Medicamento" | "Otro";
  unidad: string;
  stock: number;
  consumoDiario: number;
  diasRestantes?: number | null;
  stockMinimo: number;
  bajoMinimo: boolean;
  costoPromedioGs?: number | null;
  ultimoIngreso?: string | null;
};

export type AgroMovimiento = {
  movimientoId: number;
  tipo: "Ingreso" | "Consumo" | "Ajuste";
  cantidad: number;
  costoUnitarioGs?: number | null;
  fecha: string;
  referencia?: string | null;
  operario?: string | null;
};

export type AgroPrincipal = {
  ejecutivo: AgroEjecutivo;
  feed?: AgroFeed | null;
  sistemaProductivo: string;
  paquete: string;
  ultimaSincronizacion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  ingresosMes: number;
  salidasMes: number;
  variacionMesPct?: number | null;
  alertasTotal: number;
  alertasSanitarias: number;
  alertasOperativas: number;
  alertasDispositivos: number;
  sanitario: {
    total: number;
    sinIncidencias: number;
    enObservacion: number;
    enTratamiento: number;
    enRetiro: number;
    vacunasProximas: number;
    vacunasVencidas: number;
    muertes30d: number;
    mortalidadPct30d: number;
  };
  trazabilidad: {
    pctIdentificacionCompleta: number;
    infoIncompleta: number;
    sinRfid: number;
    sinLote: number;
    sinRazaOFecha: number;
    ultimoPesaje?: string | null;
    pesajes7d: number;
  };
  alimento: {
    consumoHoyKg: number;
    consumoAyerKg: number;
    variacionPct?: number | null;
    consumoCabezaKg?: number | null;
    consumoObjetivoCabKg?: number | null;
    stockKg: number;
    stockDias?: number | null;
    conversion?: number | null;
    conversionObjetivo: number;
    consumoDiario: { fecha: string; kg: number; costoGs: number }[];
  };
  rentabilidad: {
    costoCabezaGs: number;
    costoKgGanadoGs?: number | null;
    valorCabezaGs: number;
    costoIngresoCabezaGs: number;
    margenCabezaGs: number;
    margenPct?: number | null;
  };
  dispositivosOnline: number;
  dispositivosTotal: number;
  dispositivosPorTipo: { tipo: string; online: number; total: number }[];
  inventario: AgroInsumo[];
  actividad: AgroActividad[];
};

export const agroPrincipal = (empresaId: number, dias = 30) =>
  agroFetch(`/api/Agro/principal?empresaId=${empresaId}&dias=${dias}`) as Promise<AgroPrincipal>;
export const agroInventario = (empresaId: number) =>
  agroFetch(`/api/Agro/inventario?empresaId=${empresaId}`) as Promise<AgroInsumo[]>;
export const agroCrearInsumo = (body: {
  empresaId: number;
  nombre: string;
  tipo: string;
  unidad: string;
  stockMinimo: number;
  stockInicial?: number;
  costoUnitarioGs?: number;
}) => agroFetch("/api/Agro/inventario", { method: "POST", body: JSON.stringify(body) }) as Promise<AgroInsumo>;
export const agroMovimientos = (empresaId: number, insumoId: number) =>
  agroFetch(`/api/Agro/inventario/${insumoId}/movimientos?empresaId=${empresaId}`) as Promise<AgroMovimiento[]>;
export const agroRegistrarMovimiento = (insumoId: number, body: {
  empresaId: number;
  tipo: string;
  cantidad: number;
  costoUnitarioGs?: number;
  referencia?: string;
  operario?: string;
}) => agroFetch(`/api/Agro/inventario/${insumoId}/movimientos`, { method: "POST", body: JSON.stringify(body) }) as Promise<AgroInsumo>;
export const agroGuardarLote = (body: {
  empresaId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  etapa?: string | null;
  pesoObjetivoKg?: number | null;
}, loteId?: number) =>
  agroFetch(`/api/Agro/lotes${loteId ? `/${loteId}` : ""}`, { method: loteId ? "PUT" : "POST", body: JSON.stringify(body) }) as Promise<AgroLoteFull>;
