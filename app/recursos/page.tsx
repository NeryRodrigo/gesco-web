import type { Metadata } from "next";
import { VordiaSitioChrome } from "@/app/web-institucional/VordiaSitioChrome";

export const metadata: Metadata = {
  title: "Recursos | VORDIA",
  description: "Contenidos de VORDIA sobre gestión empresarial y operación por sector.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://www.vordia.com.py/recursos" },
};

export default function RecursosPage() {
  return (
    <VordiaSitioChrome>
      <section className="mx-auto max-w-[760px] px-5 pt-[120px] pb-24 sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5eb0ff]">Recursos</p>
        <h1 className="mt-3 font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold tracking-[-0.04em] text-white">
          Contenidos cuando respondan a una pregunta real.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#AAB3C0]">
          Esta sección está preparada para artículos sobre operación, administración y software
          por industria. Todavía no publicamos piezas: cada contenido va a tener una intención de
          búsqueda, un problema y un enlace claro a la solución VORDIA que corresponda.
        </p>
        <a href="/" className="mt-8 inline-block text-[14px] font-semibold text-[#5eb0ff] hover:text-white">
          Volver a VORDIA
        </a>
      </section>
    </VordiaSitioChrome>
  );
}
