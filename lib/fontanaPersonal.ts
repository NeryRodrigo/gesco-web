/**
 * Personal Fontana — API/BD (no localStorage).
 */

import { API_BASE } from "@/lib/api";
import type { FontanaPropiedadPlano } from "@/lib/fontanaPlanos";

export type FontanaEmpleadoEstadoPago = "PAGADO" | "PENDIENTE";

export type FontanaEmpleado = {
  id: string;
  personalId?: number;
  nombre: string;
  funcion: string;
  telefono?: string;
  propiedades: FontanaPropiedadPlano[];
  salario: number;
  fechaPago: string;
  estadoPago: FontanaEmpleadoEstadoPago;
  createdAt?: string;
  updatedAt?: string;
};

export async function loadFontanaPersonal(empresaId: number): Promise<FontanaEmpleado[]> {
  const res = await fetch(`${API_BASE}/api/Fontana/personal?empresaId=${empresaId}`);
  if (!res.ok) throw new Error(`Error ${res.status} al cargar personal`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function upsertFontanaEmpleado(
  empresaId: number,
  input: Omit<FontanaEmpleado, "id" | "createdAt" | "updatedAt" | "personalId"> & {
    id?: string;
  }
): Promise<FontanaEmpleado> {
  const personalId = input.id ? Number(input.id) : undefined;
  const res = await fetch(`${API_BASE}/api/Fontana/personal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      empresaId,
      personalId: Number.isFinite(personalId) && (personalId as number) > 0 ? personalId : null,
      nombre: input.nombre,
      funcion: input.funcion,
      telefono: input.telefono,
      propiedades: input.propiedades,
      salario: input.salario,
      fechaPago: input.fechaPago,
      estadoPago: input.estadoPago || "PENDIENTE",
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Error ${res.status}`);
  }
  return res.json();
}

export async function removeFontanaEmpleado(empresaId: number, id: string) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return;
  const res = await fetch(
    `${API_BASE}/api/Fontana/personal/${n}?empresaId=${empresaId}`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`Error ${res.status}`);
  }
}

export async function marcarSalarioPagado(
  empresaId: number,
  empleadoId: string,
  fechaPago = new Date().toISOString().slice(0, 10)
): Promise<{ ok: boolean; mensaje: string }> {
  const n = Number(empleadoId);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, mensaje: "ID inválido" };
  const res = await fetch(
    `${API_BASE}/api/Fontana/personal/${n}/pagar?empresaId=${empresaId}&fecha=${encodeURIComponent(fechaPago)}`,
    { method: "POST" }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, mensaje: body?.mensaje || `Error ${res.status}` };
  }
  return { ok: true, mensaje: body?.mensaje || "Salario pagado" };
}

export async function reiniciarEstadoPagoMes(empresaId: number) {
  const res = await fetch(
    `${API_BASE}/api/Fontana/personal/reiniciar-mes?empresaId=${empresaId}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
