/**
 * Clases compartidas de VORDIA BOUTIQUE y VORDIA CLOSET (módulo sin "use client": sirve también en componentes de servidor).
 * Los colores salen de variables de tema (app/globals.css): `.btq-claro` para el marketplace y `.btq-neon` para la app.
 */
export const FONDO = "[background:var(--btq-fondo)] text-[color:var(--btq-ink)]";
export const SERIF = "font-[family-name:var(--btq-titulo)]";
export const DEGRADE = "bg-[image:linear-gradient(120deg,var(--btq-g1)_0%,var(--btq-g2)_50%,var(--btq-g3)_100%)]";
export const TEXTO_SUAVE = "text-[color:var(--btq-suave)]";
export const CAMPO =
  "w-full rounded-2xl border border-[color:var(--btq-campo-borde)] bg-[color:var(--btq-campo)] px-3.5 py-2.5 text-[14px] text-[color:var(--btq-ink)] placeholder:text-[color:var(--btq-tenue)] focus:border-[color:var(--btq-foco)] focus:outline-none focus:ring-4 focus:ring-[color:var(--btq-anillo)]";
export const SELECT_CORTO =
  "w-auto max-w-full rounded-2xl border border-[color:var(--btq-campo-borde)] bg-[color:var(--btq-campo)] px-3 py-2 text-[13px] text-[color:var(--btq-ink)] focus:border-[color:var(--btq-foco)] focus:outline-none";
export const BOTON =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-[color:var(--btq-campo-borde)] bg-[color:var(--btq-card)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--btq-ink2)] hover:border-[color:var(--btq-foco)] hover:bg-[color:var(--btq-hover)] disabled:opacity-50";
export const BOTON_PRIMARIO =
  `inline-flex items-center justify-center gap-1.5 rounded-full ${DEGRADE} px-4 py-2.5 text-[13px] font-semibold text-white shadow-[var(--btq-brillo)] hover:brightness-110 disabled:opacity-50`;
