"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

/** Piezas visuales compartidas de VORDIA CONTA (misma estética oscura de VORDIA, acento verde azulado). */
export const ACENTO = "#14B8A6";
export const CAMPO =
  "w-full rounded-xl border border-white/10 bg-[#050B18] px-3 py-2 text-[13px] text-white placeholder:text-slate-500 focus:border-teal-400 focus:outline-none";
/** Select que ocupa solo su contenido (filtros y período). */
export const SELECT_CORTO =
  "w-auto max-w-full rounded-xl border border-white/10 bg-[#050B18] px-3 py-2 text-[13px] text-white focus:border-teal-400 focus:outline-none";
export const BOTON = "inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[12.5px] text-slate-200 hover:bg-white/5 disabled:opacity-50";
export const BOTON_PRIMARIO =
  "inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2 text-[12.5px] font-semibold text-[#03121a] hover:bg-teal-400 disabled:opacity-50";

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-[#0C1327] p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function Kpi({ label, valor, nota, tono = "normal" }: { label: string; valor: string; nota?: string; tono?: "normal" | "alerta" | "bien" }) {
  const color = tono === "alerta" ? "text-amber-300" : tono === "bien" ? "text-teal-300" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0C1327] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1.5 text-[24px] font-bold tabular-nums ${color}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-[12px] text-slate-500">{nota}</p>}
    </div>
  );
}

export function Semaforo({ valor }: { valor: "verde" | "amarillo" | "rojo" }) {
  const c = valor === "rojo" ? "bg-rose-500 shadow-rose-500/40" : valor === "amarillo" ? "bg-amber-400 shadow-amber-400/40" : "bg-teal-400 shadow-teal-400/40";
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px] ${c}`} aria-label={`Estado ${valor}`} />;
}

export function EstadoChip({ estado }: { estado: string }) {
  const c = estado === "Observado" ? "bg-amber-500/15 text-amber-200" : estado === "Aprobado" ? "bg-teal-500/15 text-teal-200" : "bg-slate-500/20 text-slate-300";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${c}`}>{estado}</span>;
}

export function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0C1327] p-5 sm:max-w-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-white">{titulo}</p>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Link de WhatsApp con el número en formato internacional de Paraguay. */
export function linkWhatsapp(numero: string | null | undefined, mensaje: string) {
  let d = (numero ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = `595${d.slice(1)}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensaje)}`;
}

export function linkPortal(token: string) {
  const origen = typeof window === "undefined" ? "https://www.vordia.com.py" : window.location.origin;
  return `${origen}/subir/${token}`;
}
