import { API_BASE } from "@/lib/api";

/** VORDIA BOUTIQUE (gestión) y VORDIA CLOSET (marketplace) · cliente de la API. */

export type Modalidad = "Venta" | "Alquiler" | "Ambos";

export type BtqVariante = {
  varianteId: number; prendaId: number; talle: string; color: string; colorHex?: string | null; stock: number;
  bustoCm?: number | null; cinturaCm?: number | null; caderaCm?: number | null; largoCm?: number | null; activo: boolean;
};

export type BtqPrenda = {
  prendaId: number; nombre: string; categoria: string; ocasiones?: string | null; descripcion?: string | null; material?: string | null;
  modalidad: Modalidad; precioVenta: number; precioAlquiler: number; diasAlquiler: number; garantia: number; precioAnterior?: number | null;
  colorHex?: string | null; publicada: boolean; vistas: number; fechaAlta: string;
};

export type BtqPrendaFila = { prenda: BtqPrenda; variantes: BtqVariante[]; fotos: number[]; stock: number };

export type BtqPerfil = {
  perfilId: number; nombreComercial: string; slug: string; descripcion?: string | null; ciudad?: string | null; barrio?: string | null;
  direccion?: string | null; whatsapp?: string | null; instagram?: string | null; horario?: string | null; estilo?: string | null;
  verificada: boolean; publicada: boolean; demo: boolean;
};

export type BtqClienta = {
  clientaId: number; nombre: string; whatsapp?: string | null; email?: string | null; talle?: string | null; cumpleanos?: string | null;
  notas?: string | null; origen: string; fechaAlta: string;
};

export type BtqVenta = {
  venta: { ventaId: number; clientaId?: number | null; estado: "Pagada" | "Apartada" | "Anulada"; total: number; pagado: number; medioPago?: string | null; canal: string; venceApartado?: string | null; vendedora?: string | null; fecha: string };
  clienta?: string | null;
  items: { itemId: number; varianteId: number; cantidad: number; precioUnitario: number; descripcion: string }[];
};

export type BtqAlquiler = {
  alquiler: { alquilerId: number; varianteId: number; clientaNombre: string; clientaWhatsapp?: string | null; desde: string; hasta: string; estado: "Reservado" | "Retirado" | "Devuelto" | "Cancelado"; precio: number; sena: number; garantia: number; notas?: string | null };
  prenda: string; prendaId: number; talle: string; color: string; colorHex?: string | null;
};

export type BtqPrueba = {
  prueba: { pruebaId: number; prendaId: number; varianteId?: number | null; nombre: string; whatsapp: string; fechaHora: string; fechaEvento?: string | null; estado: "Pedida" | "Confirmada" | "Vino" | "NoVino" | "Cancelada"; mensaje?: string | null; fecha: string };
  prenda?: string | null; variante?: string | null;
};

export type BtqPanel = {
  ventasHoy: number; cantidadHoy: number; ventasMes: number; cantidadMes: number; porCanal: { canal: string; total: number }[];
  apartados: number; saldoApartados: number; apartadosVencidos: number; alquileresSemana: number; pruebasPendientes: number; pruebasProximas: number;
  sinStock: { prendaId: number; nombre: string; talle: string; color: string; stock: number }[];
  vistasMarketplace: number; masVistas: { prendaId: number; nombre: string; vistas: number; colorHex?: string | null }[];
};

// ───────── Marketplace ─────────

export type ClosetBoutiqueMini = { nombre: string; slug: string; ciudad?: string | null; barrio?: string | null; verificada: boolean; demo: boolean };

export type ClosetTarjeta = {
  prendaId: number; nombre: string; categoria: string; ocasiones?: string | null; modalidad: Modalidad;
  precioVenta: number; precioAlquiler: number; diasAlquiler: number; precioAnterior?: number | null; colorHex?: string | null;
  fotos: number[]; talles: string[]; colores: { nombre: string; hex?: string | null }[]; unidades: number; nuevo: boolean; boutique: ClosetBoutiqueMini;
};

export type ClosetCatalogo = {
  total: number; boutiques: number; prendas: ClosetTarjeta[];
  facetas: { categorias: string[]; ocasiones: string[]; talles: string[]; colores: { nombre: string; hex?: string | null }[]; ciudades: string[] };
};

export type ClosetBoutique = ClosetBoutiqueMini & {
  descripcion?: string | null; direccion?: string | null; whatsapp?: string | null; instagram?: string | null; horario?: string | null; estilo?: string | null;
};

export type ClosetBoutiqueLista = ClosetBoutiqueMini & { descripcion?: string | null; estilo?: string | null; prendas: number; paleta: string[] };

export type ClosetDetalle = {
  prenda: ClosetTarjeta; descripcion?: string | null; material?: string | null; garantia: number; fotos: number[];
  bloque?: { desde: string; hasta: string } | null;
  variantes: { varianteId: number; talle: string; color: string; colorHex?: string | null; busto?: number | null; cintura?: number | null; cadera?: number | null; largo?: number | null; disponible: boolean; ultima: boolean }[];
  boutique: ClosetBoutique; masDeLaBoutique: ClosetTarjeta[];
};

export const CATEGORIAS = ["Vestidos", "Blusas", "Pantalones", "Faldas", "Conjuntos", "Abrigos", "Calzados", "Carteras", "Accesorios"];
export const OCASIONES = ["Fiesta", "Casamiento", "Madrina", "15 años", "Gala", "Noche", "Cóctel", "Civil", "Graduación", "Novia", "Oficina", "Casual", "Salida"];
export const CIUDADES = ["Asunción", "San Lorenzo", "Luque", "Fernando de la Mora", "Lambaré", "Capiatá", "Mariano Roque Alonso", "Limpio", "Villa Elisa", "Ñemby", "San Antonio", "Itauguá", "Areguá"];
export const TALLES_COMUNES = ["XS", "S", "M", "L", "XL", "XXL", "Único"];
export const MEDIOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "QR"];
export const COLORES_SUGERIDOS: { nombre: string; hex: string }[] = [
  { nombre: "Negro", hex: "#1F1A24" }, { nombre: "Blanco", hex: "#F7F3EE" }, { nombre: "Rosa empolvado", hex: "#E8A7BD" }, { nombre: "Fucsia", hex: "#D63384" },
  { nombre: "Lila", hex: "#B79CE0" }, { nombre: "Lavanda", hex: "#CDB8F0" }, { nombre: "Rojo", hex: "#C0283A" }, { nombre: "Bordó", hex: "#6E1E33" },
  { nombre: "Azul noche", hex: "#1E2A55" }, { nombre: "Celeste", hex: "#9CC8E8" }, { nombre: "Verde esmeralda", hex: "#1F8A70" }, { nombre: "Verde salvia", hex: "#9CB59A" },
  { nombre: "Champagne", hex: "#E9D3B0" }, { nombre: "Beige", hex: "#D9C3A5" }, { nombre: "Dorado", hex: "#C9A24A" }, { nombre: "Plateado", hex: "#BFC3CC" },
  { nombre: "Terracota", hex: "#C46A4A" }, { nombre: "Jean", hex: "#4A6A99" },
];

export async function btqApi<T>(path: string, init?: RequestInit): Promise<T> {
  const esForm = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: esForm ? init?.headers : { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.mensaje || (res.status === 429 ? "Demasiados pedidos seguidos: esperá un minuto" : `Error ${res.status}`));
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export const urlFotoPublica = (fotoId: number) => `${API_BASE}/api/public/closet/fotos/${fotoId}`;

/** Guaraníes con separador de miles: Gs. 1.150.000 */
export function gs(n: number | null | undefined) {
  return `Gs. ${Math.round(n ?? 0).toLocaleString("es-PY")}`;
}

/** Guaraníes abreviados para tarjetas: 1,15 M / 320 mil */
export function gsCorto(n: number) {
  if (n >= 1_000_000) return `Gs. ${(n / 1_000_000).toLocaleString("es-PY", { maximumFractionDigits: 2 })} M`;
  if (n >= 1_000) return `Gs. ${Math.round(n / 1_000)} mil`;
  return gs(n);
}

export function fechaCorta(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso) : iso;
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "short" });
}

export function fechaHora(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-PY", { weekday: "short", day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}`;
}

/** yyyy-mm-dd en hora local (para inputs de fecha). */
export function isoDia(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Link de WhatsApp con el número en formato internacional de Paraguay. */
export function linkWhatsapp(numero: string | null | undefined, mensaje: string) {
  let d = (numero ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = `595${d.slice(1)}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensaje)}`;
}

export function origenWeb() {
  return typeof window === "undefined" ? "https://www.vordia.com.py" : window.location.origin;
}
