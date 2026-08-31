/**
 * Métricas derivadas para Reportes Fontana (ocupación + por cobrar desde fichas).
 */

import type { Habitacion, Reserva } from "@/types/hostel";
import { parseFontanaDetalles } from "@/types/hostel";
import {
  FONTANA_PLANOS,
  FONTANA_PROPIEDADES_PLANO,
  listHabSlotsConPlanta,
  resolveFontanaPropiedadPlano,
  type FontanaPropiedadPlano,
} from "@/lib/fontanaPlanos";
import { buildHabRuntime, resolveNumeroHab, resolvePlantaHab } from "@/lib/fontanaEstados";
import { sameLugar } from "@/lib/fontanaLugares";
import { slotKey } from "@/lib/fontanaPlanos";

export type FontanaPorCobrarItem = {
  habitacionId: number;
  propiedad: string;
  etiqueta: string;
  huesped: string;
  saldo: number;
  estado: string;
};

export function calcOcupacionPorPropiedad(
  habitaciones: Habitacion[],
  reservas: Reserva[],
  fecha = new Date()
): Record<FontanaPropiedadPlano, { capacidad: number; ocupadas: number; pct: number }> {
  const out = {} as Record<
    FontanaPropiedadPlano,
    { capacidad: number; ocupadas: number; pct: number }
  >;

  for (const propiedad of FONTANA_PROPIEDADES_PLANO) {
    const layout = FONTANA_PLANOS[propiedad];
    const delLugar = habitaciones.filter((h) =>
      sameLugar(parseFontanaDetalles(h.detallesJson).nombreLugar, propiedad)
    );
    const map = new Map<string, Habitacion>();
    const used = new Set<number>();
    for (const h of delLugar) {
      const planta = resolvePlantaHab(h);
      const numero = resolveNumeroHab(h);
      if (!planta || !numero) continue;
      const key = slotKey(propiedad, planta, numero);
      if (map.has(key)) continue;
      map.set(key, h);
      used.add(h.habitacionId);
    }
    for (const h of delLugar) {
      if (used.has(h.habitacionId)) continue;
      const numero = resolveNumeroHab(h);
      if (!numero) continue;
      for (const planta of ["PB", "PA"] as const) {
        const key = slotKey(propiedad, planta, numero);
        if (map.has(key)) continue;
        if (!listHabSlotsConPlanta(layout).some((s) => s.planta === planta && s.slot.numero === numero))
          continue;
        map.set(key, h);
        used.add(h.habitacionId);
        break;
      }
    }

    let capacidad = 0;
    let ocupadas = 0;
    for (const { planta, slot } of listHabSlotsConPlanta(layout)) {
      if (!slot.numero) continue;
      const key = slotKey(propiedad, planta, slot.numero);
      const runtime = buildHabRuntime({
        habitacion: map.get(key) || null,
        planta,
        numero: slot.numero,
        modalidadDefault: slot.modalidadDefault || "DIARIA",
        capacidadDefault: slot.capacidadDefault || 2,
        reservas,
        fecha,
      });
      capacidad += runtime.capacidad;
      ocupadas += runtime.ocupadas;
    }
    out[propiedad] = {
      capacidad,
      ocupadas,
      pct: capacidad > 0 ? Math.round((ocupadas / capacidad) * 100) : 0,
    };
  }
  return out;
}

/** Cuenta corriente simple desde pagos de ficha + saldo de reservas */
export function calcPorCobrar(
  habitaciones: Habitacion[],
  reservas: Reserva[]
): { total: number; items: FontanaPorCobrarItem[] } {
  const items: FontanaPorCobrarItem[] = [];

  for (const h of habitaciones) {
    const d = parseFontanaDetalles(h.detallesJson);
    const lugar = d.nombreLugar || "Fontana";
    const etiqueta = h.nombre;
    let saldo = 0;

    for (const p of d.pagos || []) {
      if (p.estado === "Pendiente" || p.estado === "Atrasado") {
        saldo += Number(p.monto) || 0;
      }
    }

    const totalAcordado = Number(d.monto) || Number(d.precioAcordado) || 0;
    const pagadoFicha = (d.pagos || [])
      .filter((p) => p.estado === "Pagado")
      .reduce((a, p) => a + (Number(p.monto) || 0), 0);
    if (
      (d.estadoInquilino === "Activo" || d.estadoInquilino === "Moroso") &&
      totalAcordado > pagadoFicha
    ) {
      saldo = Math.max(saldo, totalAcordado - pagadoFicha);
    }

    const res = reservas.filter(
      (r) =>
        r.habitacionId === h.habitacionId &&
        r.estado !== "Cancelada" &&
        r.estado !== "CheckOut"
    );
    for (const r of res) {
      const s = Math.max(0, (Number(r.montoTotalGs) || 0) - (Number(r.montoPagadoGs) || 0));
      if (s > 0) saldo = Math.max(saldo, s);
    }

    if (saldo > 0) {
      items.push({
        habitacionId: h.habitacionId,
        propiedad: resolveFontanaPropiedadPlano(lugar) || lugar,
        etiqueta,
        huesped: d.nombreApellido || "—",
        saldo,
        estado: d.estadoInquilino || h.estado,
      });
    }
  }

  items.sort((a, b) => b.saldo - a.saldo);
  const total = items.reduce((a, i) => a + i.saldo, 0);
  return { total, items };
}
