/**
 * VORDIA STAY — cliente API del vertical de alojamiento.
 * Additive: no modifica Habitat / HQ / Fontana.
 */

import { API_BASE } from "@/lib/api";

async function stayFetch(path: string, init?: RequestInit) {
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

export type StayTarifa = {
  stayTarifaId?: number;
  empresaId: number;
  nombre: string;
  tipoHabitacion: string;
  habitacionId?: number | null;
  precioPorNocheGs: number;
  precioPorSemanaGs?: number | null;
  precioPorMesGs?: number | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  activo?: boolean;
  notas?: string | null;
};

export type StayPago = {
  stayPagoId?: number;
  empresaId: number;
  reservaId: number;
  montoGs: number;
  metodoPago: string;
  fechaPago?: string;
  concepto?: string;
  nroComprobante?: string | null;
  notas?: string | null;
};

export type StayBloqueo = {
  stayBloqueoId?: number;
  empresaId: number;
  habitacionId: number;
  fechaDesde: string;
  fechaHasta: string;
  motivo: string;
  notas?: string | null;
};

export type StayHuesped = {
  stayHuespedId?: number;
  empresaId: number;
  personaId: number;
  nacionalidad?: string | null;
  fechaNacimiento?: string | null;
  tipoDocumento?: string | null;
  paisResidencia?: string | null;
  telefonoEmergencia?: string | null;
  preferencias?: string | null;
  notas?: string | null;
  activo?: boolean;
};

export async function stayPing() {
  return stayFetch("/api/Stay/ping");
}

export async function stayDisponibilidad(empresaId: number, desde: string, hasta: string) {
  const q = new URLSearchParams({ empresaId: String(empresaId), desde, hasta });
  return stayFetch(`/api/Stay/disponibilidad?${q}`);
}

export async function stayListTarifas(empresaId: number, soloActivas = true) {
  return stayFetch(`/api/Stay/tarifas?empresaId=${empresaId}&soloActivas=${soloActivas}`);
}

export async function stayUpsertTarifa(body: StayTarifa) {
  return stayFetch("/api/Stay/tarifas", { method: "POST", body: JSON.stringify(body) });
}

export async function stayDesactivarTarifa(empresaId: number, id: number) {
  return stayFetch(`/api/Stay/tarifas/${id}?empresaId=${empresaId}`, { method: "DELETE" });
}

export async function stayListPagos(empresaId: number, reservaId: number) {
  return stayFetch(`/api/Stay/pagos?empresaId=${empresaId}&reservaId=${reservaId}`);
}

export async function stayRegistrarPago(body: StayPago) {
  return stayFetch("/api/Stay/pagos", { method: "POST", body: JSON.stringify(body) });
}

export async function stayListBloqueos(
  empresaId: number,
  opts?: { desde?: string; hasta?: string; habitacionId?: number }
) {
  const q = new URLSearchParams({ empresaId: String(empresaId) });
  if (opts?.desde) q.set("desde", opts.desde);
  if (opts?.hasta) q.set("hasta", opts.hasta);
  if (opts?.habitacionId) q.set("habitacionId", String(opts.habitacionId));
  return stayFetch(`/api/Stay/bloqueos?${q}`);
}

export async function stayCrearBloqueo(body: StayBloqueo) {
  return stayFetch("/api/Stay/bloqueos", { method: "POST", body: JSON.stringify(body) });
}

export async function stayDesactivarBloqueo(empresaId: number, id: number) {
  return stayFetch(`/api/Stay/bloqueos/${id}?empresaId=${empresaId}`, { method: "DELETE" });
}

export async function stayListHuespedes(empresaId: number) {
  return stayFetch(`/api/Stay/huespedes?empresaId=${empresaId}`);
}

export async function stayUpsertHuesped(body: StayHuesped) {
  return stayFetch("/api/Stay/huespedes", { method: "POST", body: JSON.stringify(body) });
}

export async function stayCheckIn(empresaId: number, reservaId: number) {
  return stayFetch(`/api/Stay/reservas/${reservaId}/check-in?empresaId=${empresaId}`, {
    method: "POST",
  });
}

export async function stayCheckOut(empresaId: number, reservaId: number) {
  return stayFetch(`/api/Stay/reservas/${reservaId}/check-out?empresaId=${empresaId}`, {
    method: "POST",
  });
}

/** APIs Core ya existentes (no Stay) */
export async function stayListHabitaciones(empresaId: number) {
  return stayFetch(`/api/Habitaciones/empresa/${empresaId}`);
}

export async function stayListReservas(empresaId: number) {
  return stayFetch(`/api/Reservas/empresa/${empresaId}`);
}
