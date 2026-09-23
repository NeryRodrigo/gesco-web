"use client";

import { ArrowRight } from "lucide-react";
import type { VordiaProductoPublico } from "@/lib/vordiaProductos";
import { BtnDemo, Kicker, Title, VordiaSitioChrome, useVordiaSitio } from "./VordiaSitioChrome";

export function VordiaProductoPage({ producto }: { producto: VordiaProductoPublico }) {
  return (
    <VordiaSitioChrome sectorInicial={producto.codigo}>
      <ProductoContenido producto={producto} />
    </VordiaSitioChrome>
  );
}

function ProductoContenido({ producto }: { producto: VordiaProductoPublico }) {
  const { abrirDemo } = useVordiaSitio();

  return (
    <>
      <section className="relative overflow-hidden pt-[100px] pb-16 sm:pb-20">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Kicker>VORDIA {producto.codigo}</Kicker>
            <h1 className="mt-3 font-sans text-[clamp(1.8rem,3.4vw,2.85rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-white">
              {producto.h1}
            </h1>
            <p className="mt-3 text-[14px] text-[#5eb0ff]">{producto.nombre}</p>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#AAB3C0]">{producto.texto}</p>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-white/55">{producto.paraQuien}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <BtnDemo onClick={() => abrirDemo(producto.codigo)} className="px-6 py-3 text-[14px]">
                {producto.ctaPrincipal} <ArrowRight size={16} />
              </BtnDemo>
              <a href="/#como-trabajamos" className="text-[14px] font-medium text-[#5eb0ff] hover:text-white">
                {producto.ctaSecundario}
              </a>
            </div>
          </div>
          <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-[#006CFF]/20">
            <img
              src={producto.imagen}
              alt={producto.imagenAlt}
              width={900}
              height={600}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.08] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
          <Kicker>Qué ordena</Kicker>
          <Title className="mt-3 max-w-xl">
            No es sumar módulos.
            <br />
            <span className="text-[#3d8fff]">Es una sola operación.</span>
          </Title>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {producto.pills.map((pill) => (
              <div key={pill}>
                <h2 className="text-[17px] font-semibold text-white">{pill}</h2>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.08] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
          <Kicker>Dentro de VORDIA</Kicker>
          <Title className="mt-3 max-w-xl">
            Una solución especializada.
            <br />
            La misma lógica del <span className="text-[#3d8fff]">ecosistema.</span>
          </Title>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#AAB3C0]/80">
            {producto.codigo} responde a su industria y comparte la forma en que VORDIA conecta
            personas, procesos, información y decisiones.
          </p>
          <a
            href="/#soluciones"
            className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#5eb0ff] hover:text-white"
          >
            Ver el ecosistema VORDIA <ArrowRight size={14} />
          </a>
        </div>
      </section>

      <section id="contacto" className="border-t border-white/[0.08] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1180px]">
          <p className="text-[14px] text-[#AAB3C0]">El siguiente paso es una demostración.</p>
          <Title className="mt-2 max-w-xl">
            ¿Querés conocer {producto.codigo}?
          </Title>
          <p className="mt-4 max-w-md text-[14px] text-[#AAB3C0]/80">
            Un responsable de VORDIA revisa la solicitud y coordina la primera conversación.
          </p>
          <BtnDemo onClick={() => abrirDemo(producto.codigo)} className="mt-8 px-6 py-3 text-[14px]">
            {producto.ctaPrincipal} <ArrowRight size={16} />
          </BtnDemo>
        </div>
      </section>
    </>
  );
}
