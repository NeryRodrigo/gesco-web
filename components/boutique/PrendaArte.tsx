"use client";

import { useState } from "react";
import { urlFotoPublica } from "@/lib/boutiqueApi";

/** Aclara u oscurece un color hex (para luces y sombras de la ilustración). */
function tono(hex: string, cantidad: number) {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#C9A7EB";
  const n = parseInt(h.slice(1), 16);
  const mezcla = (c: number) => Math.round(cantidad >= 0 ? c + (255 - c) * cantidad : c * (1 + cantidad));
  const r = mezcla((n >> 16) & 255), g = mezcla((n >> 8) & 255), b = mezcla(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Silueta por categoría. Coordenadas en un lienzo de 200 × 260. */
function silueta(categoria: string): { cuerpo: string; detalle?: string } {
  switch (categoria) {
    case "Blusas":
      return { cuerpo: "M70 52 Q100 66 130 52 L168 76 L156 112 L138 104 L140 196 Q100 206 60 196 L62 104 L44 112 L32 76 Z", detalle: "M88 56 Q100 80 112 56" };
    case "Pantalones":
      return { cuerpo: "M62 40 L138 40 L146 230 L110 230 L100 104 L90 230 L54 230 Z", detalle: "M62 54 L138 54" };
    case "Faldas":
      return { cuerpo: "M74 54 L126 54 L162 214 Q100 230 38 214 Z", detalle: "M74 66 L126 66 M88 70 L74 210 M112 70 L126 210" };
    case "Conjuntos":
      return { cuerpo: "M72 34 Q100 46 128 34 L150 52 L140 96 L60 96 L50 52 Z M66 108 L134 108 L144 232 L108 232 L100 150 L92 232 L56 232 Z" };
    case "Abrigos":
      return { cuerpo: "M70 34 L100 60 L130 34 L170 60 L160 214 L136 214 L134 120 L134 228 L66 228 L66 120 L64 214 L40 214 L30 60 Z", detalle: "M100 60 L100 228 M84 46 L100 92 L116 46" };
    case "Calzados":
      return { cuerpo: "M40 176 Q44 150 70 150 L96 152 Q120 120 132 92 L146 92 Q144 132 150 156 Q168 168 166 186 L58 188 Q42 188 40 176 Z", detalle: "M146 156 L150 214 L142 214" };
    case "Carteras":
      return { cuerpo: "M46 104 L154 104 Q164 104 162 116 L152 202 Q150 212 140 212 L60 212 Q50 212 48 202 L38 116 Q36 104 46 104 Z", detalle: "M72 104 Q72 52 100 52 Q128 52 128 104 M38 130 L162 130" };
    case "Accesorios":
      return { cuerpo: "M100 66 A54 54 0 1 1 99.9 66 Z M100 86 A34 34 0 1 0 100.1 86 Z", detalle: "M100 54 L108 66 L100 78 L92 66 Z" };
    default: // Vestidos
      return { cuerpo: "M80 30 Q100 42 120 30 L126 48 Q118 70 124 92 L132 98 Q150 170 176 236 Q100 254 24 236 Q50 170 68 98 L76 92 Q82 70 74 48 Z", detalle: "M76 92 Q100 102 124 92" };
  }
}

/**
 * Ilustración honesta de la prenda (silueta en su color) cuando todavía no tiene foto.
 * Nunca se muestran fotos de stock: o la foto real de la boutique, o este dibujo.
 */
export function PrendaArte({ categoria, color, className = "" }: { categoria: string; color?: string | null; className?: string }) {
  const base = color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#C9A7EB";
  const { cuerpo, detalle } = silueta(categoria);
  const id = `g${base.slice(1)}${categoria.length}`;
  return (
    <svg viewBox="0 0 200 260" className={className} role="img" aria-label={`Ilustración de ${categoria.toLowerCase()}`}>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF4FA" />
          <stop offset="1" stopColor="#F1E8FF" />
        </linearGradient>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tono(base, 0.28)} />
          <stop offset="0.55" stopColor={base} />
          <stop offset="1" stopColor={tono(base, -0.28)} />
        </linearGradient>
      </defs>
      <rect width="200" height="260" fill={`url(#${id}f)`} />
      <ellipse cx="100" cy="244" rx="70" ry="7" fill="#2B1B3D" opacity="0.07" />
      <path d={cuerpo} fill={`url(#${id}p)`} fillRule="evenodd" stroke={tono(base, -0.35)} strokeWidth="1.2" strokeLinejoin="round" />
      {detalle && <path d={detalle} fill="none" stroke={tono(base, 0.45)} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />}
      <path d={cuerpo} fill="none" stroke="#fff" strokeWidth="5" opacity="0.12" transform="translate(-3 -2)" />
    </svg>
  );
}

/** Foto real de la prenda (pública) o su ilustración si no tiene o si falla la carga. */
export function FotoPrenda({
  fotoId, categoria, color, alt, className = "", src,
}: { fotoId?: number | null; categoria: string; color?: string | null; alt: string; className?: string; src?: string | null }) {
  const [fallo, setFallo] = useState(false);
  const url = src ?? (fotoId ? urlFotoPublica(fotoId) : null);
  if (!url || fallo) return <PrendaArte categoria={categoria} color={color} className={`h-full w-full ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} loading="lazy" onError={() => setFallo(true)} className={`h-full w-full object-cover ${className}`} />;
}
