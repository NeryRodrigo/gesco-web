import type { VordiaProductoSlug } from "./vordiaEntornos";

/**
 * Planes y precios de VORDIA: fuente única para la página de precios y para la carga de planes
 * del sistema de suscripciones. Precios mensuales en guaraníes, IVA incluido.
 * Propuesta de octubre 2026 (referencia: USD ≈ Gs 6.000); validar con clientes antes de publicar.
 */
export type VordiaPlan = {
  codigo: string;
  nombre: string;
  /** Precio mensual en Gs (IVA incluido). Si `porUnidad` está, es el precio por unidad. */
  precioMensualGs: number;
  porUnidad?: string;
  minimoMensualGs?: number;
  limite: string;
  incluye: string[];
  recomendado?: boolean;
};

export type VordiaPrecioProducto = {
  slug: VordiaProductoSlug;
  /** Qué mide el precio: lo que el cliente entiende como "tamaño" de su negocio. */
  metrica: string;
  planes: VordiaPlan[];
  extras?: { nombre: string; precioGs: number; unidad: string }[];
};

export const VORDIA_CONDICIONES = {
  pruebaDias: 14,
  /** Pago anual: se pagan 10 meses y se usan 12. */
  mesesPagadosPorAnio: 10,
  /** Precio fundador congelado para los primeros clientes. */
  fundadorCupos: 50,
  fundadorMesesCongelado: 24,
  garantiaDias: 30,
  ivaIncluido: true,
};

export const VORDIA_PRECIOS: VordiaPrecioProducto[] = [
  {
    slug: "habitat",
    metrica: "unidades del edificio",
    planes: [
      {
        codigo: "HABITAT_INICIO", nombre: "Inicio", precioMensualGs: 149_000, limite: "Hasta 24 unidades",
        incluye: ["Expensas y liquidaciones", "Cobros y morosidad", "Comprobantes por correo", "Gastos y proveedores"],
      },
      {
        codigo: "HABITAT_PRO", nombre: "Pro", precioMensualGs: 289_000, limite: "Hasta 60 unidades", recomendado: true,
        incluye: ["Todo lo de Inicio", "Recordatorios de expensas por WhatsApp", "Portal del residente", "Reservas de amenities", "Contratos y facturación ANDE"],
      },
      {
        codigo: "HABITAT_ADMIN", nombre: "Administradora", precioMensualGs: 3_900, porUnidad: "por unidad", minimoMensualGs: 590_000,
        limite: "Edificios ilimitados",
        incluye: ["Todo lo de Pro", "Varios edificios en una cuenta", "Reportes consolidados", "Usuarios por edificio"],
      },
    ],
  },
  {
    slug: "stay",
    metrica: "habitaciones",
    planes: [
      { codigo: "STAY_INICIO", nombre: "Inicio", precioMensualGs: 179_000, limite: "Hasta 8 habitaciones", incluye: ["Reservas y calendario", "Huéspedes", "Pagos y caja"] },
      {
        codigo: "STAY_PRO", nombre: "Pro", precioMensualGs: 349_000, limite: "Hasta 25 habitaciones", recomendado: true,
        incluye: ["Todo lo de Inicio", "Tarifas por temporada", "Bloqueos y mantenimiento", "Check-in con datos del huésped", "Reportes de ocupación"],
      },
      { codigo: "STAY_HOTEL", nombre: "Hotel", precioMensualGs: 690_000, limite: "Hasta 80 habitaciones", incluye: ["Todo lo de Pro", "Varios usuarios por turno", "Reportes por canal y temporada"] },
    ],
  },
  {
    slug: "dine",
    metrica: "cajas y locales",
    planes: [
      { codigo: "DINE_INICIO", nombre: "Inicio", precioMensualGs: 159_000, limite: "1 caja", incluye: ["Punto de venta", "Factura electrónica SIFEN", "Cierre de caja"] },
      {
        codigo: "DINE_PRO", nombre: "Pro", precioMensualGs: 269_000, limite: "Hasta 3 cajas", recomendado: true,
        incluye: ["Todo lo de Inicio", "Comandas a cocina", "Menú por QR", "Stock de insumos y recetas"],
      },
      { codigo: "DINE_MULTI", nombre: "Multilocal", precioMensualGs: 219_000, porUnidad: "por local", minimoMensualGs: 438_000, limite: "Desde 2 locales", incluye: ["Todo lo de Pro", "Reportes consolidados por local"] },
    ],
  },
  {
    slug: "retail",
    metrica: "cajas y sucursales",
    planes: [
      { codigo: "RETAIL_INICIO", nombre: "Inicio", precioMensualGs: 129_000, limite: "1 caja · 300 facturas/mes", incluye: ["Punto de venta", "Factura electrónica SIFEN", "Inventario"] },
      {
        codigo: "RETAIL_PRO", nombre: "Pro", precioMensualGs: 259_000, limite: "Hasta 3 cajas · facturas sin límite práctico", recomendado: true,
        incluye: ["Todo lo de Inicio", "Compras y proveedores", "Varios depósitos", "Cuentas corrientes de clientes"],
      },
      { codigo: "RETAIL_CADENA", nombre: "Cadena", precioMensualGs: 199_000, porUnidad: "por sucursal", minimoMensualGs: 398_000, limite: "Desde 2 sucursales", incluye: ["Todo lo de Pro", "Transferencias entre sucursales", "Reportes consolidados"] },
    ],
  },
  {
    slug: "boutique",
    metrica: "cajas y sucursales",
    planes: [
      { codigo: "BOUTIQUE_INICIO", nombre: "Inicio", precioMensualGs: 149_000, limite: "1 caja", incluye: ["Punto de venta", "Talles y colores", "Factura electrónica SIFEN"] },
      {
        codigo: "BOUTIQUE_PRO", nombre: "Pro", precioMensualGs: 279_000, limite: "Hasta 3 cajas", recomendado: true,
        incluye: ["Todo lo de Inicio", "Temporadas y liquidaciones", "Clientes frecuentes", "Compras a proveedores"],
      },
      { codigo: "BOUTIQUE_CADENA", nombre: "Cadena", precioMensualGs: 219_000, porUnidad: "por sucursal", minimoMensualGs: 438_000, limite: "Desde 2 sucursales", incluye: ["Todo lo de Pro", "Stock entre sucursales"] },
    ],
  },
  {
    slug: "ops",
    metrica: "vehículos o equipos en campo",
    planes: [
      { codigo: "OPS_INICIO", nombre: "Inicio", precioMensualGs: 229_000, limite: "Hasta 5 vehículos", incluye: ["Órdenes de trabajo", "Rutas y entregas", "Seguimiento del día"] },
      {
        codigo: "OPS_PRO", nombre: "Pro", precioMensualGs: 459_000, limite: "Hasta 20 vehículos", recomendado: true,
        incluye: ["Todo lo de Inicio", "Mantenimiento de flota", "Costos por viaje", "Indicadores de cumplimiento"],
      },
      { codigo: "OPS_FLOTA", nombre: "Flota", precioMensualGs: 19_000, porUnidad: "por vehículo", minimoMensualGs: 590_000, limite: "Más de 20 vehículos", incluye: ["Todo lo de Pro", "Varias bases operativas"] },
    ],
  },
  {
    slug: "agro",
    metrica: "cabezas de ganado",
    planes: [
      { codigo: "AGRO_INICIO", nombre: "Inicio", precioMensualGs: 179_000, limite: "Hasta 500 cabezas", incluye: ["Inventario de hacienda", "Pesajes", "Sanidad y vacunas (HEALTH)"] },
      {
        codigo: "AGRO_PRO", nombre: "Ciclo completo", precioMensualGs: 449_000, limite: "Hasta 2.000 cabezas", recomendado: true,
        incluye: ["Todo lo de Inicio", "Cría y recría (CRIA, RECRIA)", "Lotes y potreros", "Costos y márgenes (FINANCE)"],
      },
      {
        codigo: "AGRO_FEEDLOT", nombre: "Feedlot", precioMensualGs: 890_000, limite: "Hasta 10.000 cabezas",
        incluye: ["Todo lo de Ciclo completo", "Engorde y raciones (FEED)", "Trazabilidad (TRACE)", "Tablero de producción 30/60/90"],
      },
    ],
    extras: [
      { nombre: "Módulo adicional", precioGs: 79_000, unidad: "por módulo/mes" },
      { nombre: "CONNECT (collares, balanzas, sensores)", precioGs: 9_000, unidad: "por dispositivo/mes" },
    ],
  },
  {
    slug: "conta",
    metrica: "RUC (empresas) que lleva el estudio",
    planes: [
      {
        codigo: "CONTA_INICIO", nombre: "Inicio", precioMensualGs: 249_000, limite: "Hasta 10 RUC",
        incluye: ["Carga por XML y QR del SIFEN", "Validación de RUC e IVA", "Libros de compras y ventas", "Archivo RG90"],
      },
      {
        codigo: "CONTA_ESTUDIO", nombre: "Estudio", precioMensualGs: 590_000, limite: "Hasta 40 RUC", recomendado: true,
        incluye: ["Todo lo de Inicio", "Link para que cada cliente mande fotos de sus facturas", "Panel con semáforo y vencimientos por RUC", "Pedido de facturas por WhatsApp"],
      },
      {
        codigo: "CONTA_PRO", nombre: "Estudio Pro", precioMensualGs: 12_900, porUnidad: "por RUC", minimoMensualGs: 690_000, limite: "Más de 40 RUC",
        incluye: ["Todo lo de Estudio", "Varios usuarios del estudio", "Soporte prioritario"],
      },
    ],
  },
];

/** Precio anual con el descuento de VORDIA_CONDICIONES (se pagan 10 meses). */
export function precioAnualGs(precioMensualGs: number) {
  return precioMensualGs * VORDIA_CONDICIONES.mesesPagadosPorAnio;
}
