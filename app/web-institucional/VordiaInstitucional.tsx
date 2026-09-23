"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  GitMerge,
  Layers,
  LayoutGrid,
  Search,
  TrendingUp,
  Users,
  Waypoints,
} from "lucide-react";
import { VORDIA_PRODUCTOS } from "@/lib/vordiaProductos";
import {
  AZUL,
  BtnDemo,
  Kicker,
  Title,
  VordiaSitioChrome,
  useVordiaSitio,
} from "./VordiaSitioChrome";

export function VordiaInstitucional({ entornoInicial }: { entornoInicial?: string }) {
  const entorno = VORDIA_PRODUCTOS.some((p) => p.codigo === entornoInicial)
    ? entornoInicial!
    : "HABITAT";

  return (
    <VordiaSitioChrome sectorInicial={entorno}>
      <HomeContenido entornoInicial={entornoInicial} entorno={entorno} />
    </VordiaSitioChrome>
  );
}

function HomeContenido({
  entornoInicial,
  entorno,
}: {
  entornoInicial?: string;
  entorno: string;
}) {
  const { abrirDemo } = useVordiaSitio();
  const [activo, setActivo] = useState(entorno);
  const producto = useMemo(
    () => VORDIA_PRODUCTOS.find((p) => p.codigo === activo) ?? VORDIA_PRODUCTOS[0],
    [activo]
  );

  useEffect(() => {
    if (!entornoInicial) return;
    const seccion = document.getElementById("soluciones");
    seccion?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [entornoInicial]);

  return (
    <>
      <section id="inicio" className="relative overflow-hidden">
        <div className="relative w-full lg:aspect-[2170/725]">
          <img
            src="/images/web/vordia-4k.png?v=3"
            alt="Composición visual del ecosistema VORDIA"
            width={2170}
            height={725}
            fetchPriority="high"
            decoding="async"
            className="pointer-events-none hidden object-contain object-center lg:absolute lg:left-1/2 lg:top-[54%] lg:block lg:h-[86%] lg:w-[86%] lg:-translate-x-1/2 lg:-translate-y-1/2"
          />
          <div className="relative z-10 mx-auto flex h-full max-w-[1180px] flex-col justify-center px-5 pt-[100px] pb-8 sm:px-8 lg:pt-[64px] lg:pb-6">
            <div className="vordia-fade-up max-w-[36rem]">
              <Kicker>Software de gestión empresarial · Paraguay</Kicker>
              <h1 className="mt-3 font-sans text-[clamp(1.7rem,3.2vw,2.7rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-white">
                Software de gestión para empresas que operan en muchas partes.
              </h1>
              <p className="mt-4 font-sans text-[clamp(1.35rem,2.4vw,1.85rem)] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#3d8fff]">
                Muchas partes. Una sola operación.
              </p>
              <p className="mt-4 max-w-[28rem] text-[13px] leading-[1.65] text-[#AAB3C0] sm:text-[14px]">
                VORDIA conecta personas, procesos, información y decisiones mediante plataformas
                especializadas para cada sector.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <BtnDemo onClick={() => abrirDemo()} className="px-6 py-3 text-[14px]">
                  Solicitar una demostración <ArrowRight size={16} />
                </BtnDemo>
                <a href="#soluciones" className="text-[14px] font-medium text-[#5eb0ff] hover:text-white">
                  Ver las soluciones
                </a>
              </div>
            </div>
            <img
              src="/images/web/vordia-4k.png?v=3"
              alt="Composición visual del ecosistema VORDIA"
              width={2170}
              height={725}
              decoding="async"
              className="mx-auto mt-8 w-[86%] object-contain object-center lg:hidden"
              style={{ aspectRatio: "2170 / 725" }}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.08]">
        <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16">
          <Kicker>El problema</Kicker>
          <Title className="mt-3 max-w-2xl">
            Cuando la operación vive en partes sueltas,{" "}
            <span className="text-[#3d8fff]">decidir se vuelve lento.</span>
          </Title>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#AAB3C0]/85">
            Los equipos, los datos y las tareas quedan en lugares distintos. VORDIA no suma
            herramientas aisladas: ordena y conecta la operación.
          </p>
        </div>
      </section>

      <section className="border-b border-white/[0.08]">
        <div className="mx-auto grid max-w-[1180px] items-start gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
          <div>
            <Kicker>Lo que VORDIA conecta</Kicker>
            <Title className="mt-3">
              Personas, procesos,
              <br />
              información y <span className="text-[#3d8fff]">decisiones.</span>
            </Title>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", Icon: Users, t: "Personas", d: "Equipos que saben qué hacer, cuándo hacerlo y qué necesita atención." },
              { n: "02", Icon: Layers, t: "Procesos", d: "Actividades conectadas, responsabilidades claras y continuidad operativa." },
              { n: "03", Icon: BarChart3, t: "Información", d: "Datos ordenados que se convierten en visibilidad y mejores decisiones." },
              { n: "04", Icon: Waypoints, t: "Decisiones", d: "Una misma visión para actuar con contexto, no con partes sueltas." },
            ].map((x, i) => (
              <div
                key={x.n}
                className={`px-0 py-4 sm:px-5 sm:py-0 ${i > 0 ? "sm:border-l sm:border-white/[0.08]" : ""}`}
              >
                <div className="flex items-center gap-3 text-[#5eb0ff]">
                  <span className="text-[12px] font-semibold tabular-nums">{x.n}</span>
                  <x.Icon size={18} strokeWidth={1.6} />
                </div>
                <h3 className="mt-3 text-[16px] font-semibold text-white">{x.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#AAB3C0]/80">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 80% at 78% 58%, rgba(0,108,255,0.18) 0%, transparent 62%)" }}
        />
        <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
          <Kicker>Lo que cambia</Kicker>
          <Title className="mt-3 max-w-xl">
            Lo que cambia cuando
            <br />
            la operación está <span className="text-[#3d8fff]">conectada.</span>
          </Title>
          <div className="mt-12">
            <svg className="mx-auto hidden h-[150px] w-full max-w-[920px] sm:block" viewBox="0 0 920 150" fill="none" aria-hidden>
              <defs>
                <linearGradient id="flowLine" x1="40" y1="70" x2="880" y2="70">
                  <stop stopColor={AZUL} stopOpacity="0.12" />
                  <stop offset="0.5" stopColor="#4d9fff" stopOpacity="0.9" />
                  <stop offset="1" stopColor={AZUL} stopOpacity="0.2" />
                </linearGradient>
                <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
                  <stop stopColor="#6eb6ff" />
                  <stop offset="1" stopColor={AZUL} stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d="M70 78 C 220 78 280 28 460 78 C 640 128 700 78 850 78" stroke="url(#flowLine)" strokeWidth="1.15" />
              {[
                [88, 42], [108, 58], [72, 70], [118, 86], [96, 102], [132, 48], [64, 94],
              ].map(([x, y], i) => (
                <rect key={i} x={x} y={y} width="8" height="8" rx="1.5" fill="#006CFF" opacity={0.35 + (i % 3) * 0.18} />
              ))}
              <g transform="translate(430 52)">
                <rect x="0" y="18" width="22" height="22" rx="3" fill="#0a1a33" stroke="#4d9fff" strokeWidth="1" />
                <rect x="16" y="8" width="22" height="22" rx="3" fill="#0c2244" stroke="#7eb8ff" strokeWidth="1" />
                <rect x="8" y="0" width="22" height="22" rx="3" fill="#12305c" stroke="#9cc9ff" strokeWidth="1" />
              </g>
              <circle cx="848" cy="78" r="28" fill="url(#orbGlow)" />
              <circle cx="848" cy="78" r="11" fill="#7ec2ff" />
              <circle cx="848" cy="78" r="11" fill="none" stroke="#cfe8ff" strokeWidth="1.2" opacity="0.7" />
            </svg>
            <div className="grid gap-10 sm:grid-cols-3">
              {[
                { t: "De datos dispersos", d: "a información útil y centralizada." },
                { t: "De tareas aisladas", d: "a procesos conectados, con menos trabajo manual." },
                { t: "De reaccionar tarde", d: "a decidir con trazabilidad y continuidad." },
              ].map((x) => (
                <div key={x.t} className="sm:pt-2">
                  <p className="text-[15px] font-semibold text-white">{x.t}</p>
                  <p className="mt-1 text-[13px] text-[#AAB3C0]/80">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="soluciones" className="border-t border-white/[0.08] py-16 sm:py-24">
        <div className="mx-auto grid max-w-[1180px] items-stretch gap-10 px-5 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-12">
          <div className="flex flex-col justify-center">
            <Kicker>Ecosistema VORDIA</Kicker>
            <Title className="mt-3">
              Siete soluciones.
              <br />
              Una misma lógica
              <br />
              <span className="text-[#3d8fff]">operativa.</span>
            </Title>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-[#AAB3C0]/85">
              Distintos sectores. Una misma lógica. Cada solución entiende la realidad de su
              industria y comparte la precisión, la claridad y la visión de VORDIA.
            </p>
            <a
              href={`/${producto.slug}`}
              className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#5eb0ff] hover:text-white"
            >
              Conocer {producto.codigo} <ArrowRight size={14} />
            </a>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#006CFF]/25 bg-[#050B13] shadow-[0_0_48px_rgba(0,108,255,0.1)]">
            <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] px-3 py-3 lg:hidden">
              {VORDIA_PRODUCTOS.map((p, i) => (
                <button
                  key={p.codigo}
                  type="button"
                  onClick={() => setActivo(p.codigo)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.12em] ${
                    activo === p.codigo ? "bg-[#006CFF] text-white" : "bg-white/[0.06] text-white/50"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")} {p.codigo}
                </button>
              ))}
            </div>
            <div className="grid min-h-[420px] lg:grid-cols-[148px_1fr]">
              <ol className="hidden border-r border-white/[0.06] py-4 lg:block">
                {VORDIA_PRODUCTOS.map((p, i) => (
                  <li key={p.codigo}>
                    <button
                      type="button"
                      onClick={() => setActivo(p.codigo)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                        activo === p.codigo
                          ? "bg-[#006CFF]/18 text-white shadow-[inset_2px_0_0_#006CFF]"
                          : "text-white/38 hover:text-white/80"
                      }`}
                    >
                      <span className="w-6 text-[11px] font-semibold tabular-nums text-[#5eb0ff]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[11px] font-bold tracking-[0.16em]">{p.codigo}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="relative min-h-[380px] overflow-hidden">
                <img
                  key={producto.codigo}
                  src={producto.imagen}
                  alt={producto.imagenAlt}
                  width={900}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050B13] via-[#050B13]/78 to-[#050B13]/15" />
                <div className="relative z-10 flex h-full min-h-[380px] max-w-[340px] flex-col justify-center p-6 sm:p-8">
                  <p className="text-[11px] font-bold tracking-[0.28em] text-[#5eb0ff]">VORDIA</p>
                  <h3 className="mt-2 text-[28px] font-extrabold tracking-[-0.03em] text-white sm:text-[34px]">
                    {producto.codigo}
                  </h3>
                  <p className="mt-1 text-[13px] text-white/55">{producto.nombre}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/78">{producto.texto}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <a
                      href={`/${producto.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-[#006CFF] px-5 py-2.5 text-[13px] font-semibold text-white"
                    >
                      Conocer {producto.codigo} <ArrowRight size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => abrirDemo(producto.codigo)}
                      className="text-[13px] font-medium text-[#5eb0ff] hover:text-white"
                    >
                      Solicitar una demo
                    </button>
                  </div>
                  <div className="mt-6 space-y-1.5">
                    {producto.pills.map((pill) => (
                      <p key={pill} className="text-[12px] text-white/62">
                        {pill}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-trabajamos" className="border-t border-white/[0.08] py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1180px] items-start gap-10 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div>
            <Kicker>Cómo trabajamos</Kicker>
            <Title className="mt-3">
              Entender.
              <br />
              Conectar.
              <br />
              <span className="text-[#3d8fff]">Hacer visible.</span>
            </Title>
            <p className="mt-4 text-[14px] leading-relaxed text-[#AAB3C0]/80">
              Tecnología que parte de la operación real, no de un catálogo genérico.
            </p>
          </div>
          <div className="grid sm:grid-cols-3">
            {[
              { n: "01", Icon: Search, t: "Entender", d: "Analizamos tu realidad, tus objetivos y lo que necesita tu operación." },
              { n: "02", Icon: GitMerge, t: "Conectar", d: "Implementamos la solución adecuada, integrando personas, procesos y datos." },
              { n: "03", Icon: BarChart3, t: "Hacer visible", d: "Transformamos la información en control, claridad y mejores decisiones." },
            ].map((x, i) => (
              <div key={x.n} className="relative px-0 py-5 sm:px-6 sm:py-0">
                {i < 2 && (
                  <span className="pointer-events-none absolute top-5 right-[-6%] hidden h-px w-[28%] bg-gradient-to-r from-[#006CFF]/70 to-transparent sm:block" />
                )}
                <div className="flex items-center gap-3 text-[#5eb0ff]">
                  <span className="text-[12px] font-semibold tabular-nums">{x.n}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#006CFF]/35 bg-[#006CFF]/10">
                    <x.Icon size={16} strokeWidth={1.6} />
                  </span>
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-white">{x.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#AAB3C0]/80">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.08] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
          <Kicker>La diferencia VORDIA</Kicker>
          <Title className="mt-3 max-w-xl">
            No es sumar software.
            <br />
            <span className="text-[#3d8fff]">Es ordenar la operación.</span>
          </Title>
          <div className="mt-12 grid md:grid-cols-3">
            {[
              {
                Icon: LayoutGrid,
                t: "Especialización sin fragmentación.",
                d: "Cada producto responde a su sector y conserva una misma lógica tecnológica.",
              },
              {
                Icon: BarChart3,
                t: "Información que conduce a decisiones.",
                d: "La plataforma prioriza lo que el equipo realmente necesita comprender y ejecutar.",
              },
              {
                Icon: TrendingUp,
                t: "Diseño preparado para crecer.",
                d: "La operación puede evolucionar sin perder orden, trazabilidad ni continuidad.",
              },
            ].map((x, i) => (
              <div key={x.t} className={`py-6 md:px-8 md:py-0 ${i > 0 ? "md:border-l md:border-white/[0.08]" : "md:pl-0"}`}>
                <x.Icon size={22} strokeWidth={1.6} className="text-[#5eb0ff]" />
                <h3 className="mt-4 text-[16px] font-semibold leading-snug text-white">{x.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#AAB3C0]/80">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.08] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
          <Kicker>Cómo se trabaja con VORDIA</Kicker>
          <Title className="mt-3 max-w-xl">
            Si querés conocer VORDIA,
            <br />
            el siguiente paso es una <span className="text-[#3d8fff]">demostración.</span>
          </Title>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              { n: "01", t: "Contanos tu operación", d: "Indicá el sector y cómo se gestiona hoy. No hace falta un expediente completo." },
              { n: "02", t: "Revisamos la solicitud", d: "Un responsable de VORDIA lee el caso y se comunica para coordinar el siguiente paso." },
              { n: "03", t: "Conversación y demostración", d: "Vemos juntas si la solución corresponde a tu operación." },
            ].map((x) => (
              <div key={x.n}>
                <p className="text-[12px] font-semibold text-[#5eb0ff]">{x.n}</p>
                <h3 className="mt-2 text-[16px] font-semibold text-white">{x.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#AAB3C0]/80">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="relative overflow-hidden border-t border-white/[0.08]">
        <img
          src="/images/web/cityscape-cta.png"
          alt=""
          width={1600}
          height={700}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #020407 0%, rgba(2,4,7,0.92) 40%, rgba(2,4,7,0.4) 72%, rgba(2,4,7,0.18) 100%)",
          }}
        />
        <div className="relative mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-24">
          <p className="text-[14px] text-[#AAB3C0]">Tu empresa ya tiene muchas partes.</p>
          <Title className="mt-2 max-w-xl text-[clamp(1.7rem,4vw,2.55rem)]">
            Hagamos que trabajen
            <br />
            como una sola.
          </Title>
          <p className="mt-4 max-w-md text-[14px] text-[#AAB3C0]/80">
            Conocé la solución VORDIA diseñada para la realidad de tu operación.
          </p>
          <BtnDemo onClick={() => abrirDemo()} className="mt-8 px-6 py-3 text-[14px]">
            Solicitar una demostración <ArrowRight size={16} />
          </BtnDemo>
        </div>
      </section>
    </>
  );
}
