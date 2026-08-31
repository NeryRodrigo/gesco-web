export interface Habitacion {
  habitacionId: number;
  empresaId: number;
  nombre: string;
  tipo: string;
  capacidadCamas: number;
  precioBasePorNocheGs: number;
  estado: "Disponible" | "Ocupada" | "Limpieza" | "Mantenimiento";
  detallesJson?: string;
}

export type TipoAlquilerFontana =
  | "Dúplex"
  | "Habitación"
  | "Hostel"
  | "Mensualero"
  | "Diario"
  | "Semanal";

export type EstadoInquilinoFontana = "Activo" | "Pendiente" | "Retirado" | "Moroso";

export interface FontanaPago {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  estado: "Pagado" | "Atrasado" | "Pendiente";
}

export interface FontanaReclamo {
  id: string;
  fecha: string;
  texto: string;
}

export interface FontanaDocumento {
  id: string;
  nombre: string;
  url?: string;
  fecha: string;
}

/** Servicios extras cargados durante la estadía (se facturan al desocupar) */
export interface FontanaServicioExtra {
  id: string;
  nombre: string;
  monto: number;
  fecha: string;
}

/** Planta física en croquis Fontana 1/2/3 */
export type FontanaPlantaCodigo = "PB" | "PA";
/** Modalidad operativa del croquis (diaria vs mensual) */
export type FontanaModalidadCodigo = "DIARIA" | "MENSUAL";

/** Campos extendidos guardados en Habitacion.detallesJson */
export interface FontanaDetalles {
  nombreLugar?: string;
  /** Número fijo en croquis (1..11 por planta) */
  numeroHabitacion?: number;
  /** Planta Baja / Planta Alta */
  planta?: FontanaPlantaCodigo;
  /** Modalidad del mapa: DIARIA | MENSUAL */
  modalidad?: FontanaModalidadCodigo;
  /** Plazas/camas ocupadas (permite parcial 2/4) */
  plazasOcupadas?: number;
  cantidadHabitaciones?: number;
  precioAcordado?: number;
  nombreApellido?: string;
  cedula?: string;
  telefono?: string;
  contactoEmergencia?: string;
  tipoAlquiler?: TipoAlquilerFontana;
  fechaIngreso?: string;
  fechaSalida?: string;
  /** Hora check-in HH:mm (calendario cronometrado) */
  horaIngreso?: string;
  /** Hora check-out HH:mm */
  horaSalida?: string;
  monto?: number;
  garantia?: number;
  estadoInquilino?: EstadoInquilinoFontana;
  observaciones?: string;
  unidadDuplexId?: number | null;
  unidadCodigo?: string | null;
  /** Nombre del condominio / lugar al que pertenece la habitación (aunque el dúplex esté ocupado) */
  nombreCondominio?: string | null;
  huespedId?: number | null;
  /** Reserva activa vinculada (calendario / cobros) */
  reservaId?: number | null;
  /**
   * Habitación interna de un dúplex Agus (solo si el dúplex está libre):
   * "1" suite · "2" frente suite · "3" frente baño
   */
  habitacionDuplexInterna?: "1" | "2" | "3" | null;
  /** Servicios extras (lavandería, minibar, etc.) a facturar al desocupar */
  serviciosExtras?: FontanaServicioExtra[];
  /** Comprobante de garantía (recibo sin IVA habitual) */
  garantiaComprobante?: {
    facturaEmitida: boolean;
    numeroFactura?: string;
    descripcion?: string;
    fecha?: string;
    metadata?: Record<string, unknown>;
  } | null;
  /** Factura de servicio de alojamiento (con IVA) al desocupar */
  alojamientoComprobante?: {
    facturaEmitida: boolean;
    numeroFactura?: string;
    descripcion?: string;
    fecha?: string;
    monto?: number;
    metadata?: Record<string, unknown>;
  } | null;
  pagos?: FontanaPago[];
  reclamos?: FontanaReclamo[];
  documentos?: FontanaDocumento[];
}

export interface Reserva {
  reservaId: number;
  empresaId: number;
  habitacionId: number;
  habitacion?: Habitacion;
  huespedId: number;
  huesped?: {
    personaId: number;
    razonSocial: string;
    documento: string;
    telefono?: string;
  };
  usuarioId?: number;
  fechaCheckIn: string;
  fechaCheckOut: string;
  estado: "Pendiente" | "Confirmada" | "CheckIn" | "CheckOut" | "Cancelada";
  montoTotalGs: number;
  montoPagadoGs: number;
  origenReserva?: string;
  notasAdicionales?: string;
}

export const MAX_HABITACIONES_FONTANA = 999;

export function parseFontanaDetalles(raw?: string | null): FontanaDetalles {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as FontanaDetalles;
  } catch {
    return {};
  }
}

export function stringifyFontanaDetalles(d: FontanaDetalles): string {
  return JSON.stringify(d);
}
