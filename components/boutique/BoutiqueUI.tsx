"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { BOTON, BOTON_PRIMARIO, CAMPO, DEGRADE, FONDO, SELECT_CORTO, SERIF, TEXTO_SUAVE } from "./estilos";

export { BOTON, BOTON_PRIMARIO, CAMPO, DEGRADE, FONDO, SELECT_CORTO, SERIF, TEXTO_SUAVE };

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-[color:var(--btq-borde)] bg-[color:var(--btq-card)] p-4 shadow-[var(--btq-sombra)] backdrop-blur sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Kpi({ label, valor, nota, icono, tono = "normal" }: { label: string; valor: string; nota?: string; icono?: ReactNode; tono?: "normal" | "alerta" | "bien" }) {
  const color = tono === "alerta" ? "text-[color:var(--btq-rosa)]" : tono === "bien" ? "text-[color:var(--btq-lila)]" : "text-[color:var(--btq-ink)]";
  return (
    <div className="rounded-3xl border border-[color:var(--btq-borde)] bg-[color:var(--btq-card)] p-4 shadow-[var(--btq-sombra)]">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${TEXTO_SUAVE}`}>{label}</p>
        {icono && <span className="text-[color:var(--btq-acento)]">{icono}</span>}
      </div>
      <p className={`mt-1.5 text-[24px] font-bold tabular-nums ${color}`}>{valor}</p>
      {nota && <p className={`mt-0.5 text-[12px] ${TEXTO_SUAVE}`}>{nota}</p>}
    </div>
  );
}

export function Chip({ children, activo = false, onClick, color }: { children: ReactNode; activo?: boolean; onClick?: () => void; color?: string | null }) {
  const clase = `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition ${
    activo ? "border-transparent bg-[color:var(--btq-activo-bg)] text-white" : "border-[color:var(--btq-borde)] bg-[color:var(--btq-card)] text-[color:var(--btq-ink2)] hover:border-[color:var(--btq-foco)]"
  }`;
  const punto = color ? <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: color }} /> : null;
  return onClick ? (
    <button type="button" onClick={onClick} className={clase} aria-pressed={activo}>{punto}{children}</button>
  ) : (
    <span className={clase}>{punto}{children}</span>
  );
}

export function Estado({ estado }: { estado: string }) {
  const c: Record<string, string> = {
    Pagada: "bg-[color:var(--btq-lila-bg)] text-[color:var(--btq-lila)]", Apartada: "bg-[color:var(--btq-rosa-bg)] text-[color:var(--btq-rosa)]", Anulada: "bg-slate-500/15 text-[color:var(--btq-suave)]",
    Reservado: "bg-[color:var(--btq-rosa-bg)] text-[color:var(--btq-rosa)]", Retirado: "bg-[color:var(--btq-lila-bg)] text-[color:var(--btq-lila)]", Devuelto: "bg-emerald-500/15 text-emerald-500", Cancelado: "bg-slate-500/15 text-[color:var(--btq-suave)]",
    Pedida: "bg-[color:var(--btq-rosa-bg)] text-[color:var(--btq-rosa)]", Confirmada: "bg-[color:var(--btq-lila-bg)] text-[color:var(--btq-lila)]", Vino: "bg-emerald-500/15 text-emerald-500", NoVino: "bg-amber-500/15 text-amber-500", Cancelada: "bg-slate-500/15 text-[color:var(--btq-suave)]",
  };
  const texto = estado === "NoVino" ? "No vino" : estado;
  return <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${c[estado] ?? "bg-slate-500/15 text-[color:var(--btq-suave)]"}`}>{texto}</span>;
}

export function Modal({ titulo, onClose, children, ancho = "sm:max-w-2xl" }: { titulo: string; onClose: () => void; children: ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-[color:var(--btq-borde)] bg-[color:var(--btq-modal)] p-5 text-[color:var(--btq-ink)] shadow-2xl sm:rounded-[28px] ${ancho}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className={`${SERIF} text-[20px] font-semibold`}>{titulo}</p>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[color:var(--btq-suave)] hover:bg-[color:var(--btq-hover)]" aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[color:var(--btq-ink2)]">{label}</span>
      {children}
      {ayuda && <span className={`mt-1 block text-[11.5px] ${TEXTO_SUAVE}`}>{ayuda}</span>}
    </label>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-[color:var(--btq-borde)] bg-[color:var(--btq-card)] px-5 py-10 text-center">
      <p className={`${SERIF} text-[18px] font-semibold`}>{titulo}</p>
      <p className={`mx-auto mt-1 max-w-md text-[13px] ${TEXTO_SUAVE}`}>{texto}</p>
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}
