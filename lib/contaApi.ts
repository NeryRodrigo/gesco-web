import { API_BASE } from "@/lib/api";

/** VORDIA CONTA · cliente de la API del estudio contable. */

export type ContaCliente = {
  clienteId: number; razonSocial: string; ruc: string; dv: string; regimen?: string | null;
  obligacionIva: boolean; obligacionIre: boolean; obligacionIrp: boolean;
  contactoNombre?: string | null; contactoWhatsapp?: string | null; contactoEmail?: string | null; tokenPortal: string;
};

export type ContaComprobante = {
  comprobanteId: number; clienteId: number; tipo: "Compra" | "Venta"; origen: string; electronico: boolean; cdc?: string | null;
  tipoComprobante: number; timbrado: string; numero: string; fecha: string; credito: boolean;
  contraparteTipoId: number; contraparteDoc: string; contraparteDv?: string | null; contraparteNombre?: string | null;
  gravado10: number; gravado5: number; exento: number; total: number; iva10: number; iva5: number;
  numeroAsociado?: string | null; timbradoAsociado?: string | null;
  imputaIva: boolean; imputaIre: boolean; imputaIrp: boolean;
  estado: "Aprobado" | "Observado" | "Pendiente"; observaciones?: string | null; periodo: number; cargadoPor?: string | null; fechaCarga: string;
};

export type ContaPanelCliente = {
  clienteId: number; razonSocial: string; ruc: string; ventas: number; compras: number; observados: number;
  ivaDebito: number; ivaCredito: number; ivaSaldo: number; vencimiento: string; diasParaVencer: number;
  semaforo: "verde" | "amarillo" | "rojo"; accion?: string | null; tokenPortal: string; contactoWhatsapp?: string | null;
};

export type ContaResultadoCarga = { cargados: number; aprobados: number; observados: number; duplicados: number; mensajes: string[] };

export type ContaComprobanteRequest = {
  clienteId: number; tipo: "Compra" | "Venta"; tipoComprobante: number; timbrado: string; numero: string; fecha: string; credito: boolean;
  contraparteTipoId: number; contraparte: string; contraparteNombre?: string; gravado10: number; gravado5: number; exento: number;
  numeroAsociado?: string; timbradoAsociado?: string;
};

export async function contaApi<T>(path: string, init?: RequestInit): Promise<T> {
  const esForm = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: esForm ? init?.headers : { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.mensaje || `Error ${res.status}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

/** Descarga un archivo de la API (RG90, libros) respetando el nombre que manda el servidor. */
export async function contaDescargar(path: string): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.mensaje || `Error ${res.status}`);
  }
  const cd = res.headers.get("Content-Disposition") ?? "";
  const nombre = /filename\*=UTF-8''([^;]+)/.exec(cd)?.[1] ?? /filename=([^;]+)/.exec(cd)?.[1]?.replace(/"/g, "") ?? "archivo";
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = decodeURIComponent(nombre);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  const extra: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (k.toLowerCase().startsWith("x-conta-")) extra[k.toLowerCase().replace("x-conta-", "")] = v;
  });
  return extra;
}

export const gsConta = (n: number) => `Gs ${Math.round(n).toLocaleString("es-PY")}`;
export const periodoTexto = (p: number) =>
  new Date(Math.floor(p / 100), (p % 100) - 1, 1).toLocaleDateString("es-PY", { month: "long", year: "numeric" });
export const periodoDe = (d: Date) => d.getFullYear() * 100 + d.getMonth() + 1;
export const fechaCorta = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
export const TIPOS_COMPROBANTE: Record<number, string> = {
  109: "Factura", 110: "Nota de crédito", 111: "Nota de débito", 101: "Autofactura", 112: "Ticket máquina registradora",
  103: "Boleta de venta", 104: "Boleta Resimple", 107: "Despacho de importación",
};
