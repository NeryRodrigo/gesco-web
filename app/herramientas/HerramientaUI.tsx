"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { VordiaSitioChrome } from "../web-institucional/VordiaSitioChrome";

export const gs = (n: number) => `Gs ${Math.round(n).toLocaleString("es-PY")}`;
export const num = (n: number, dec = 0) => n.toLocaleString("es-PY", { maximumFractionDigits: dec, minimumFractionDigits: dec });

const CAMPO =
  "w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:border-[#006CFF] focus:outline-none focus:ring-2 focus:ring-[#006CFF]/30";

/** Marco de una herramienta gratuita: título, calculadora a la izquierda y resultado a la derecha. */
export function HerramientaPagina({
  sector, titulo, bajada, calculadora, resultado,
}: { sector: string; titulo: string; bajada: string; calculadora: ReactNode; resultado: ReactNode }) {
  return (
    <VordiaSitioChrome sectorInicial={sector}>
      <main className="mx-auto max-w-[1080px] px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <Link href="/herramientas" className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white">
          <ArrowLeft size={14} /> Herramientas gratis
        </Link>
        <h1 className="mt-4 max-w-3xl text-[30px] font-bold leading-tight text-white sm:text-[40px]">{titulo}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">{bajada}</p>
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">{calculadora}</section>
          <section className="space-y-5">{resultado}</section>
        </div>
      </main>
    </VordiaSitioChrome>
  );
}

/** Campo numérico con separador de miles y unidad opcional. */
export function CampoNumero({
  id, label, ayuda, valor, onChange, prefijo, sufijo, decimales = false,
}: {
  id: string; label: string; ayuda?: string; valor: number; onChange: (n: number) => void;
  prefijo?: string; sufijo?: string; decimales?: boolean;
}) {
  const [texto, setTexto] = useState(valor ? num(valor, decimales ? 2 : 0) : "");
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="text-[14px] font-medium text-white/85">{label}</span>
      <div className="relative">
        {prefijo && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-white/40">{prefijo}</span>}
        <input
          id={id}
          inputMode={decimales ? "decimal" : "numeric"}
          className={`${CAMPO} ${prefijo ? "pl-10" : ""} ${sufijo ? "pr-24" : ""}`}
          value={texto}
          onChange={(e) => {
            const limpio = decimales ? e.target.value.replace(/[^\d,]/g, "") : e.target.value.replace(/\D/g, "");
            const n = Number(limpio.replace(/\./g, "").replace(",", ".")) || 0;
            setTexto(decimales ? limpio : n ? num(n) : "");
            onChange(n);
          }}
        />
        {sufijo && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-white/40">{sufijo}</span>}
      </div>
      {ayuda && <span className="block text-[12px] text-white/40">{ayuda}</span>}
    </label>
  );
}

/** Cifra destacada del resultado. */
export function Cifra({ label, valor, nota, tono = "normal" }: { label: string; valor: string; nota?: string; tono?: "normal" | "alerta" | "bien" }) {
  const color = tono === "alerta" ? "text-amber-300" : tono === "bien" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[12px] uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className={`mt-1.5 text-[26px] font-bold tabular-nums ${color}`}>{valor}</p>
      {nota && <p className="mt-1 text-[13px] leading-snug text-white/50">{nota}</p>}
    </div>
  );
}

/**
 * Pedido del informe completo: crea el lead en el CRM de VORDIA con la herramienta, los datos
 * cargados y el resultado, para que el equipo comercial lo contacte.
 */
export function PedirInforme({ herramienta, sector, resumen }: { herramienta: string; sector: string; resumen: string }) {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/leads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: fd.get("nombre"),
          empresa: fd.get("empresa"),
          email: fd.get("email"),
          telefono: fd.get("telefono") || "",
          sector,
          necesidad: resumen,
          herramienta,
          sitio: fd.get("sitio"),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setEnviado(true);
    } catch {
      setError("No pudimos enviar el pedido. Intentá de nuevo en unos minutos.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-emerald-200"><CheckCircle2 size={18} /> Pedido recibido</p>
        <p className="mt-1.5 text-[14px] text-white/65">
          Un asesor de VORDIA te envía el informe completo con tus números en menos de 24 horas hábiles, por correo o WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-2xl border border-[#006CFF]/35 bg-[#006CFF]/[0.06] p-5">
      <div>
        <p className="text-[15px] font-semibold text-white">Recibí el informe completo gratis</p>
        <p className="mt-1 text-[13px] text-white/55">Con tus números, qué mejorar primero y cuánto podés ahorrar. Sin compromiso.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="nombre" required placeholder="Tu nombre" className={CAMPO} aria-label="Tu nombre" />
        <input name="empresa" required placeholder="Empresa o establecimiento" className={CAMPO} aria-label="Empresa o establecimiento" />
        <input name="email" type="email" required placeholder="Correo" className={CAMPO} aria-label="Correo" />
        <input name="telefono" placeholder="WhatsApp (opcional)" className={CAMPO} aria-label="WhatsApp" />
      </div>
      <input name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-white/55">
        <input type="checkbox" required className="mt-0.5 accent-[#006CFF]" />
        <span>
          Acepto que VORDIA use estos datos para enviarme el informe y contactarme, según la{" "}
          <a href="/privacidad" target="_blank" className="text-[#5eb0ff] hover:underline">Política de Privacidad</a>.
        </span>
      </label>
      {error && <p className="text-[13px] text-red-300">{error}</p>}
      <button disabled={enviando} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#006CFF] px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-60">
        {enviando && <Loader2 size={15} className="animate-spin" />} Quiero el informe
      </button>
    </form>
  );
}
