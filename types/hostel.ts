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
