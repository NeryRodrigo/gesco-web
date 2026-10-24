import {
  VORDIA_ENTORNO_CANONICOS,
  type VordiaProductoSlug,
} from "@/lib/vordiaEntornos";

export type VordiaProductoPublico = {
  slug: VordiaProductoSlug;
  codigo: string;
  nombre: string;
  texto: string;
  pills: string[];
  imagen: string;
  imagenAlt: string;
  title: string;
  h1: string;
  description: string;
  ctaPrincipal: string;
  ctaSecundario: string;
  paraQuien: string;
};

export const VORDIA_PRODUCTOS: VordiaProductoPublico[] = [
  {
    slug: "habitat",
    codigo: "HABITAT",
    nombre: "Condominios y edificios",
    texto: "Administración integral, finanzas, comunicación y operación en un solo lugar.",
    pills: ["Administración centralizada", "Finanzas transparentes", "Comunicación eficiente"],
    imagen: "/images/web/habitat-edificio.png",
    imagenAlt: "Edificio residencial que representa VORDIA HABITAT",
    title: "Software para administración de condominios en Paraguay | VORDIA HABITAT",
    h1: "Software para administrar condominios y edificios",
    description:
      "HABITAT centraliza administración, finanzas, comunicación y operación de condominios y edificios en una sola plataforma.",
    ctaPrincipal: "Solicitar una demostración de HABITAT",
    ctaSecundario: "Ver cómo funciona",
    paraQuien: "Para administraciones de condominios y edificios que necesitan una sola operación.",
  },
  {
    slug: "stay",
    codigo: "STAY",
    nombre: "Hoteles y alojamientos",
    texto: "Reservas, huéspedes y operación diaria con una sola visión de ocupación.",
    pills: ["Reservas", "Huéspedes", "Ocupación"],
    imagen: "/images/web/stay-hotel.png",
    imagenAlt: "Hotel que representa VORDIA STAY",
    title: "Software para hoteles y alojamientos | VORDIA STAY",
    h1: "Reservas, huéspedes y ocupación en una sola visión",
    description:
      "STAY organiza la operación diaria de hoteles y alojamientos: reservas, huéspedes y ocupación conectadas.",
    ctaPrincipal: "Quiero conocer STAY",
    ctaSecundario: "Ver el ecosistema VORDIA",
    paraQuien: "Para hoteles y alojamientos que necesitan ver la operación diaria en un solo lugar.",
  },
  {
    slug: "dine",
    codigo: "DINE",
    nombre: "Gastronomía",
    texto: "Salón, cocina y caja dentro de una misma gestión, sin perder el ritmo.",
    pills: ["Salón", "Cocina", "Caja"],
    imagen: "/images/web/dine-restaurante.png",
    imagenAlt: "Restaurante que representa VORDIA DINE",
    title: "Software para gastronomía | VORDIA DINE",
    h1: "Salón, cocina y caja en la misma gestión",
    description:
      "DINE conecta salón, cocina y caja para que la operación gastronómica no se fragmente.",
    ctaPrincipal: "Quiero conocer DINE",
    ctaSecundario: "Ver el ecosistema VORDIA",
    paraQuien: "Para operaciones gastronómicas que necesitan salón, cocina y caja conectados.",
  },
  {
    slug: "retail",
    codigo: "RETAIL",
    nombre: "Comercio y librerías",
    texto: "Del inventario a la venta, cada movimiento queda relacionado.",
    pills: ["Inventario", "Ventas", "Caja"],
    imagen: "/images/web/retail-comercio.png",
    imagenAlt: "Comercio que representa VORDIA RETAIL",
    title: "Software para comercios | VORDIA RETAIL",
    h1: "Del inventario a la venta, cada movimiento relacionado",
    description:
      "RETAIL relaciona inventario, ventas y caja para comercios que necesitan trazabilidad real.",
    ctaPrincipal: "Quiero conocer RETAIL",
    ctaSecundario: "Ver el ecosistema VORDIA",
    paraQuien: "Para comercios que necesitan relacionar inventario, ventas y caja.",
  },
  {
    slug: "boutique",
    codigo: "BOUTIQUE",
    nombre: "Moda",
    texto: "Gestión especializada para el mundo de la moda, venta y alquiler.",
    pills: ["Variantes", "Venta", "Alquiler"],
    imagen: "/images/web/boutique-moda.png",
    imagenAlt: "Local de moda que representa VORDIA BOUTIQUE",
    title: "Software para moda | VORDIA BOUTIQUE",
    h1: "Gestión de moda: variantes, venta y alquiler",
    description:
      "BOUTIQUE está pensado para operaciones de moda que combinan variantes, venta y alquiler.",
    ctaPrincipal: "Quiero conocer BOUTIQUE",
    ctaSecundario: "Ver el ecosistema VORDIA",
    paraQuien: "Para operaciones de moda que combinan variantes, venta y alquiler.",
  },
  {
    slug: "ops",
    codigo: "OPS",
    nombre: "Operaciones y logística",
    texto: "Más trazabilidad para operaciones que no pueden detenerse.",
    pills: ["Depósito", "Traslados", "Trazas"],
    imagen: "/images/web/ops-logistica.png",
    imagenAlt: "Operación logística que representa VORDIA OPS",
    title: "Software para operaciones y depósitos | VORDIA OPS",
    h1: "Trazabilidad para operaciones que no pueden detenerse",
    description:
      "OPS da visibilidad a depósito, traslados y trazas cuando la operación no puede parar.",
    ctaPrincipal: "Quiero conocer OPS",
    ctaSecundario: "Ver el ecosistema VORDIA",
    paraQuien: "Para operaciones y depósitos que necesitan continuidad y traza.",
  },
  {
    slug: "agro",
    codigo: "AGRO",
    nombre: "Producción agrícola",
    texto: "Información organizada para cada etapa productiva.",
    pills: ["Lotes", "Etapas", "Campañas"],
    imagen: "/images/web/agro-produccion.png",
    imagenAlt: "Producción agrícola que representa VORDIA AGRO",
    title: "Software para producción agrícola | VORDIA AGRO",
    h1: "Información organizada para cada etapa productiva",
    description:
      "AGRO ordena lotes, etapas y campañas para que la producción agrícola se pueda seguir y decidir.",
    ctaPrincipal: "Quiero conocer AGRO",
    ctaSecundario: "Ver el ecosistema VORDIA",
    paraQuien: "Para producciones agrícolas que necesitan seguir lotes, etapas y campañas.",
  },
  {
    slug: "conta",
    codigo: "CONTA",
    nombre: "Estudios contables",
    texto: "Tu cliente le saca foto al QR de la factura y el RG90 sale solo.",
    pills: ["XML y QR del SIFEN", "Libros e IVA", "Archivo RG90"],
    imagen: "/images/web/conta-estudio.svg",
    imagenAlt: "Factura electrónica con código QR que representa VORDIA CONTA",
    title: "Software para estudios contables en Paraguay | VORDIA CONTA",
    h1: "Tu cliente manda la foto del QR. El RG90 sale solo.",
    description:
      "CONTA lee las facturas electrónicas del SIFEN por XML o QR, valida RUC e IVA, arma los libros de compras y ventas y genera el archivo RG90 para Marangatu.",
    ctaPrincipal: "Quiero una demo de CONTA",
    ctaSecundario: "Ver cómo funciona",
    paraQuien: "Para estudios contables que llevan muchos RUC y quieren dejar de cargar facturas a mano.",
  },
];

export function productoPorSlug(slug: string | null | undefined) {
  const key = String(slug || "").trim().toLowerCase().replace(/\/+$/, "");
  return VORDIA_PRODUCTOS.find((p) => p.slug === key) ?? null;
}

export function productoPorCodigo(codigo: string | null | undefined) {
  const key = String(codigo || "").trim().toUpperCase();
  return VORDIA_PRODUCTOS.find((p) => p.codigo === key) ?? null;
}

export const VORDIA_PRODUCTO_SLUGS = VORDIA_ENTORNO_CANONICOS;
