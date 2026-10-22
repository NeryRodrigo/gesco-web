"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VordiaSitioChrome } from "../web-institucional/VordiaSitioChrome";

const HERRAMIENTAS = [
  { href: "/herramientas/morosidad", rubro: "Condominios y edificios", titulo: "Calculadora de morosidad", texto: "Cuánta plata está atrasada en expensas y cuánto podés recuperar." },
  { href: "/herramientas/costo-por-kilo", rubro: "Ganadería", titulo: "Costo por kilo en engorde", texto: "Cuánto cuesta cada kilo producido, el margen por animal y los días a venta." },
  { href: "/herramientas/facturacion", rubro: "Comercios y restaurantes", titulo: "Tiempo de facturación", texto: "Cuántas horas y cuánta plata se van por mes en facturar a mano." },
];

export function HerramientasIndice() {
  return (
    <VordiaSitioChrome>
      <main className="mx-auto max-w-[1080px] px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5eb0ff]">Gratis</p>
        <h1 className="mt-3 text-[32px] font-bold leading-tight text-white sm:text-[42px]">Herramientas para medir tu negocio</h1>
        <p className="mt-3 max-w-2xl text-[15px] text-white/60">Calculadoras simples con tus propios números. El resultado lo ves al instante, sin registrarte.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {HERRAMIENTAS.map((h) => (
            <Link key={h.href} href={h.href} className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-[#006CFF]/50">
              <span className="text-[12px] uppercase tracking-[0.12em] text-white/45">{h.rubro}</span>
              <span className="text-[18px] font-semibold text-white">{h.titulo}</span>
              <span className="text-[14px] leading-relaxed text-white/60">{h.texto}</span>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[13px] font-semibold text-[#5eb0ff]">Calcular <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </main>
    </VordiaSitioChrome>
  );
}
