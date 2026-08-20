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

/** Campos extendidos guardados en Habitacion.detallesJson */
export interface FontanaDetalles {
  nombreLugar?: string;
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

export const MAX_HABITACIONES_FONTANA = 3;

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
