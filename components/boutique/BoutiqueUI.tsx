"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { BOTON, BOTON_PRIMARIO, CAMPO, DEGRADE, FONDO, SELECT_CORTO, SERIF, TEXTO_SUAVE } from "./estilos";

export { BOTON, BOTON_PRIMARIO, CAMPO, DEGRADE, FONDO, SELECT_CORTO, SERIF, TEXTO_SUAVE };

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-[#EBDDF5] bg-white/80 p-4 shadow-[0_14px_40px_-26px_rgba(142,108,207,0.55)] backdrop-blur sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Kpi({ label, valor, nota, icono, tono = "normal" }: { label: string; valor: string; nota?: string; icono?: ReactNode; tono?: "normal" | "alerta" | "bien" }) {
  const color = tono === "alerta" ? "text-[#C2185B]" : tono === "bien" ? "text-[#6A4BC4]" : "text-[#2B1B3D]";
  return (
    <div className="rounded-3xl border border-[#EBDDF5] bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(142,108,207,0.6)]">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${TEXTO_SUAVE}`}>{label}</p>
        {icono && <span className="text-[#C77DD8]">{icono}</span>}
      </div>
      <p className={`mt-1.5 text-[24px] font-bold tabular-nums ${color}`}>{valor}</p>
      {nota && <p className={`mt-0.5 text-[12px] ${TEXTO_SUAVE}`}>{nota}</p>}
    </div>
  );
}

export function Chip({ children, activo = false, onClick, color }: { children: ReactNode; activo?: boolean; onClick?: () => void; color?: string | null }) {
  const clase = `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition ${
    activo ? "border-transparent bg-[#2B1B3D] text-white" : "border-[#E6D6F2] bg-white/80 text-[#4A3466] hover:border-[#C9A7EB]"
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
    Pagada: "bg-[#EDE4FF] text-[#5B3DB0]", Apartada: "bg-[#FFE3F0] text-[#B0135E]", Anulada: "bg-slate-100 text-slate-500",
    Reservado: "bg-[#FFE3F0] text-[#B0135E]", Retirado: "bg-[#EDE4FF] text-[#5B3DB0]", Devuelto: "bg-emerald-50 text-emerald-700", Cancelado: "bg-slate-100 text-slate-500",
    Pedida: "bg-[#FFE3F0] text-[#B0135E]", Confirmada: "bg-[#EDE4FF] text-[#5B3DB0]", Vino: "bg-emerald-50 text-emerald-700", NoVino: "bg-amber-50 text-amber-700", Cancelada: "bg-slate-100 text-slate-500",
  };
  const texto = estado === "NoVino" ? "No vino" : estado;
  return <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${c[estado] ?? "bg-slate-100 text-slate-600"}`}>{texto}</span>;
}

export function Modal({ titulo, onClose, children, ancho = "sm:max-w-2xl" }: { titulo: string; onClose: () => void; children: ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B1B3D]/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-[#EBDDF5] bg-[#FFFBFE] p-5 text-[#2B1B3D] shadow-2xl sm:rounded-[28px] ${ancho}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className={`${SERIF} text-[20px] font-semibold`}>{titulo}</p>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#7A6690] hover:bg-[#F3E9FF]" aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[#4A3466]">{label}</span>
      {children}
      {ayuda && <span className={`mt-1 block text-[11.5px] ${TEXTO_SUAVE}`}>{ayuda}</span>}
    </label>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#DCC8F0] bg-white/60 px-5 py-10 text-center">
      <p className={`${SERIF} text-[18px] font-semibold`}>{titulo}</p>
      <p className={`mx-auto mt-1 max-w-md text-[13px] ${TEXTO_SUAVE}`}>{texto}</p>
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}
