"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { VordiaSitioChrome } from "./VordiaSitioChrome";
import { VORDIA_LEGAL } from "@/lib/vordiaLegal";

/** Marco común de las páginas legales (privacidad, términos) con la misma estética del sitio. */
export function DocumentoLegal({ titulo, intro, children }: { titulo: string; intro: string; children: ReactNode }) {
  return (
    <VordiaSitioChrome>
      <main className="mx-auto max-w-[820px] px-5 pb-20 pt-32 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5eb0ff]">Legal</p>
        <h1 className="mt-3 text-[34px] font-bold leading-tight text-white sm:text-[42px]">{titulo}</h1>
        <p className="mt-3 text-[13px] text-white/40">Última actualización: {VORDIA_LEGAL.actualizado}</p>
        <p className="mt-6 text-[15px] leading-relaxed text-white/70">{intro}</p>
        <div className="legal mt-10 space-y-8 text-[14.5px] leading-relaxed text-white/70 [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-white/90 [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
    </VordiaSitioChrome>
  );
}

/** Canal para ejercer derechos o hacer consultas: correo si está configurado, si no el formulario del sitio. */
export function CanalContacto() {
  return VORDIA_LEGAL.email ? (
    <a href={`mailto:${VORDIA_LEGAL.email}`} className="text-[#5eb0ff] hover:underline">
      {VORDIA_LEGAL.email}
    </a>
  ) : (
    <Link href="/#contacto" className="text-[#5eb0ff] hover:underline">
      el formulario de contacto del sitio
    </Link>
  );
}
