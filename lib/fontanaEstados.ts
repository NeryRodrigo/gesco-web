import type { Habitacion, Reserva } from "@/types/hostel";
import { parseFontanaDetalles } from "@/types/hostel";
import type { FontanaModalidad, FontanaPlanta } from "@/lib/fontanaPlanos";
import { extractNumeroHabitacion } from "@/lib/fontanaLugares";

export type FontanaEstadoVisual =
  | "disponible"
  | "parcial"
  | "completa"
  | "mensual"
  | "reservada"
  | "limpieza"
  | "mantenimiento";

export type FontanaHabRuntime = {
  habitacion: Habitacion | null;
  planta: FontanaPlanta;
  numero: number;
  modalidad: FontanaModalidad;
  capacidad: number;
  ocupadas: number;
  libres: number;
  estado: FontanaEstadoVisual;
  estadoLabel: string;
  etiquetaCorta: string;
};

export const FONTANA_ESTADO_META: Record<
  FontanaEstadoVisual,
  { label: string; className: string; chip: string }
> = {
  disponible: {
    label: "Disponible (hay camas/lugares libres)",
    className: "bg-[#22c55e] border-white/20 text-white",
    chip: "bg-[#22c55e]",
  },
  parcial: {
    label: "Parcialmente ocupada (hay libres)",
    className: "bg-[#3b82f6] border-white/20 text-white",
    chip: "bg-[#3b82f6]",
  },
  completa: {
    label: "Completa (sin libres)",
    className: "bg-[#ef4444] border-white/20 text-white",
    chip: "bg-[#ef4444]",
  },
  mensual: {
    label: "Mensualero — ocupado mensual",
    className: "bg-[#a855f7] border-white/20 text-white",
    chip: "bg-[#a855f7]",
  },
  reservada: {
    label: "Mensualero — ocupado",
    className: "bg-[#f59e0b] border-white/20 text-white",
    chip: "bg-[#f59e0b]",
  },
  limpieza: {
    label: "Limpieza",
    className: "bg-[#78716c] border-white/15 text-white",
    chip: "bg-[#78716c]",
  },
  mantenimiento: {
    label: "Fuera de servicio / Mantenimiento",
    className: "bg-[#6b7280] border-white/15 text-white",
    chip: "bg-[#6b7280]",
  },
};

function dayStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDay(raw?: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw.includes("T") ? raw : `${raw.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : dayStart(d);
}

export function reservaCubreFecha(r: Reserva, fecha: Date): boolean {
  if (r.estado === "Cancelada" || r.estado === "CheckOut") return false;
  const cin = parseDay(r.fechaCheckIn);
  const cout = parseDay(r.fechaCheckOut);
  if (!cin || !cout) return false;
  const f = dayStart(fecha);
  return f >= cin && f < cout;
}

export function resolveModalidad(
  h: Habitacion | null,
  fallback: FontanaModalidad
): FontanaModalidad {
  if (!h) return fallback;
  const d = parseFontanaDetalles(h.detallesJson);
  if (d.modalidad === "DIARIA" || d.modalidad === "MENSUAL") return d.modalidad;
  const t = String(d.tipoAlquiler || h.tipo || "").toLowerCase();
  if (t.includes("mensual")) return "MENSUAL";
  if (t.includes("diario") || t.includes("semanal") || t.includes("hostel") || t.includes("dúplex") || t.includes("duplex"))
    return "DIARIA";
  return fallback;
}

export function resolveCapacidad(h: Habitacion | null, fallback: number): number {
  if (!h) return Math.max(1, fallback);
  const d = parseFontanaDetalles(h.detallesJson);
  const n = Number(h.capacidadCamas || d.cantidadHabitaciones || fallback || 1);
  return Math.max(1, Math.floor(n));
}

export function resolvePlantaHab(h: Habitacion): FontanaPlanta | null {
  const d = parseFontanaDetalles(h.detallesJson);
  if (d.planta === "PB" || d.planta === "PA") return d.planta;
  return null;
}

export function resolveNumeroHab(h: Habitacion): number | null {
  const d = parseFontanaDetalles(h.detallesJson);
  if (d.numeroHabitacion && d.numeroHabitacion > 0) return Math.floor(d.numeroHabitacion);
  return extractNumeroHabitacion(h.nombre);
}

/**
 * Plazas ocupadas en la fecha consultada.
 * - Mantenimiento/Limpieza: bloquea toda la capacidad (libres=0 vía estado)
 * - Si hay plazasOcupadas explícitas, se usan
 * - Si está ocupada sin detalle: asume capacidad completa
 * - Reserva activa en fecha: usa notas/cantidad o capacidad
 */
export function resolveOcupadas(
  h: Habitacion | null,
  capacidad: number,
  reservas: Reserva[],
  fecha: Date
): { ocupadas: number; reservada: boolean } {
  if (!h) return { ocupadas: 0, reservada: false };
  const d = parseFontanaDetalles(h.detallesJson);

  if (h.estado === "Mantenimiento" || h.estado === "Limpieza") {
    return { ocupadas: capacidad, reservada: false };
  }

  const resActivas = reservas.filter(
    (r) => r.habitacionId === h.habitacionId && reservaCubreFecha(r, fecha)
  );
  const tieneReserva = resActivas.length > 0;

  const ingreso = parseDay(d.fechaIngreso);
  const salida = parseDay(d.fechaSalida);
  const f = dayStart(fecha);
  const enRangoFicha =
    !!ingreso &&
    (d.estadoInquilino === "Activo" ||
      d.estadoInquilino === "Moroso" ||
      d.estadoInquilino === "Pendiente") &&
    f >= ingreso &&
    (!salida || f < salida);

  const ocupadaFlag =
    h.estado === "Ocupada" ||
    d.estadoInquilino === "Activo" ||
    d.estadoInquilino === "Moroso" ||
    enRangoFicha ||
    tieneReserva;

  if (!ocupadaFlag) {
    // Pendiente con ingreso futuro cercano → reservada
    if (d.estadoInquilino === "Pendiente" && ingreso && ingreso > f) {
      return { ocupadas: 0, reservada: true };
    }
    if (tieneReserva) return { ocupadas: 0, reservada: true };
    return { ocupadas: 0, reservada: false };
  }

  const explicit = Number(d.plazasOcupadas);
  if (Number.isFinite(explicit) && explicit >= 0) {
    return { ocupadas: Math.min(capacidad, Math.floor(explicit)), reservada: false };
  }

  // Mensual / ocupada sin detalle de plazas → completa
  return { ocupadas: capacidad, reservada: d.estadoInquilino === "Pendiente" && !enRangoFicha };
}

export function resolveEstadoVisual(args: {
  habitacion: Habitacion | null;
  modalidad: FontanaModalidad;
  capacidad: number;
  ocupadas: number;
  reservada: boolean;
}): { estado: FontanaEstadoVisual; label: string } {
  const { habitacion: h, modalidad, capacidad, ocupadas, reservada } = args;
  if (h?.estado === "Mantenimiento") {
    return { estado: "mantenimiento", label: FONTANA_ESTADO_META.mantenimiento.label };
  }
  if (h?.estado === "Limpieza") {
    return { estado: "limpieza", label: FONTANA_ESTADO_META.limpieza.label };
  }
  if (reservada && ocupadas <= 0) {
    return { estado: "reservada", label: FONTANA_ESTADO_META.reservada.label };
  }
  if (ocupadas <= 0) {
    return { estado: "disponible", label: FONTANA_ESTADO_META.disponible.label };
  }
  if (ocupadas >= capacidad) {
    if (modalidad === "MENSUAL") {
      // Fontana 2 (100% mensual) → violeta; mixta mensualero → naranja
      return { estado: "mensual", label: FONTANA_ESTADO_META.mensual.label };
    }
    return { estado: "completa", label: FONTANA_ESTADO_META.completa.label };
  }
  // Parcial en habitación mensual → naranja “mensualero ocupado”
  if (modalidad === "MENSUAL") {
    return { estado: "reservada", label: FONTANA_ESTADO_META.reservada.label };
  }
  return {
    estado: "parcial",
    label: FONTANA_ESTADO_META.parcial.label,
  };
}

export function buildHabRuntime(args: {
  habitacion: Habitacion | null;
  planta: FontanaPlanta;
  numero: number;
  modalidadDefault: FontanaModalidad;
  capacidadDefault: number;
  reservas: Reserva[];
  fecha: Date;
}): FontanaHabRuntime {
  const modalidad = resolveModalidad(args.habitacion, args.modalidadDefault);
  const capacidad = resolveCapacidad(args.habitacion, args.capacidadDefault);
  const { ocupadas, reservada } = resolveOcupadas(
    args.habitacion,
    capacidad,
    args.reservas,
    args.fecha
  );
  const libres = Math.max(0, capacidad - ocupadas);
  const { estado, label } = resolveEstadoVisual({
    habitacion: args.habitacion,
    modalidad,
    capacidad,
    ocupadas,
    reservada,
  });
  const n = String(args.numero).padStart(2, "0");
  return {
    habitacion: args.habitacion,
    planta: args.planta,
    numero: args.numero,
    modalidad,
    capacidad,
    ocupadas,
    libres,
    estado,
    estadoLabel: label,
    etiquetaCorta: `HAB. ${n}`,
  };
}
