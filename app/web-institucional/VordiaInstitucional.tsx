"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  GitMerge,
  Instagram,
  Layers,
  LayoutGrid,
  Linkedin,
  Menu,
  Search,
  TrendingUp,
  Users,
  X,
  Youtube,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

const FONDO = "#020407";
const LOCKUP = "/images/web/lockup-wordmark.png";
const AZUL = "#006CFF";

const NAV = [
  { href: "#soluciones", label: "Soluciones" },
  { href: "#como-trabajamos", label: "Cómo trabajamos" },
  { href: "#contacto", label: "Contacto" },
];

const PRODUCTOS = [
  {
    codigo: "HABITAT",
    nombre: "Condominios y edificios",
    texto: "Administración integral, finanzas, comunicación y operación en un solo lugar.",
    pills: ["Administración centralizada", "Finanzas transparentes", "Comunicación eficiente"],
    imagen: "/images/web/habitat-edificio.png",
  },
  {
    codigo: "STAY",
    nombre: "Hoteles y alojamientos",
    texto: "Reservas, huéspedes y operación diaria con una sola visión de ocupación.",
    pills: ["Reservas", "Huéspedes", "Ocupación"],
    imagen: "/images/web/stay-hotel.png?v=2",
  },
  {
    codigo: "DINE",
    nombre: "Gastronomía",
    texto: "Salón, cocina y caja dentro de una misma gestión, sin perder el ritmo.",
    pills: ["Salón", "Cocina", "Caja"],
    imagen: "/images/web/dine-restaurante.png?v=2",
  },
  {
    codigo: "RETAIL",
    nombre: "Comercio y librerías",
    texto: "Del inventario a la venta, cada movimiento queda relacionado.",
    pills: ["Inventario", "Ventas", "Caja"],
    imagen: "/images/web/retail-comercio.png?v=2",
  },
  {
    codigo: "BOUTIQUE",
    nombre: "Moda",
    texto: "Gestión especializada para el mundo de la moda, venta y alquiler.",
    pills: ["Variantes", "Venta", "Alquiler"],
    imagen: "/images/web/boutique-moda.png?v=2",
  },
  {
    codigo: "OPS",
    nombre: "Operaciones y logística",
    texto: "Más trazabilidad para operaciones que no pueden detenerse.",
    pills: ["Depósito", "Traslados", "Trazas"],
    imagen: "/images/web/ops-logistica.png?v=2",
  },
  {
    codigo: "AGRO",
    nombre: "Producción agrícola",
    texto: "Información organizada para cada etapa productiva.",
    pills: ["Lotes", "Etapas", "Campañas"],
    imagen: "/images/web/agro-produccion.png?v=2",
  },
];

const TAMANOS = [
  { value: "1-10", label: "1 a 10 personas o unidades" },
  { value: "11-50", label: "11 a 50" },
  { value: "51-200", label: "51 a 200" },
  { value: "200+", label: "Más de 200" },
];

const GESTION = [
  { value: "planillas", label: "Planillas, Excel y WhatsApp" },
  { value: "otro_sistema", label: "Ya usamos otro sistema" },
  { value: "mixto", label: "Mixto: planillas y un sistema" },
  { value: "nada", label: "Todavía no tenemos un método claro" },
];

const HORARIOS = ["Mañana", "Mediodía", "Tarde", "WhatsApp cuando puedan"];

const CAMPO =
  "w-full rounded-lg border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#006CFF]/60";
const SELECT =
  "w-full rounded-lg border border-white/12 bg-[#050B13] px-4 py-3 text-sm text-white outline-none focus:border-[#006CFF]/60";

function Kicker({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5eb0ff]">{children}</p>
  );
}

function Title({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-sans text-[clamp(1.55rem,2.8vw,2.15rem)] font-extrabold leading-[1.15] tracking-[-0.035em] text-white ${className}`}
    >
      {children}
    </h2>
  );
}

function BtnDemo({
  onClick,
  children,
  className = "",
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#006CFF] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_28px_rgba(0,108,255,0.4)] transition hover:bg-[#1a7aff] ${className}`}
    >
      {children}
    </button>
  );
}

export function VordiaInstitucional() {
  const [menu, setMenu] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [sector, setSector] = useState("HABITAT");
  const [activo, setActivo] = useState("HABITAT");
  const [sent, setSent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const producto = useMemo(
    () => PRODUCTOS.find((p) => p.codigo === activo) ?? PRODUCTOS[0],
    [activo]
  );

  function abrirDemo(codigo?: string) {
    if (codigo) {
      setSector(codigo);
      setActivo(codigo);
    }
    setFormOpen(true);
    setMenu(false);
  }

  async function enviarSolicitud(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/leads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: fd.get("nombre"),
          cargo: fd.get("cargo"),
          empresa: fd.get("empresa"),
          ciudad: fd.get("ciudad"),
          email: fd.get("email"),
          telefono: fd.get("telefono"),
          sector: fd.get("sector"),
          tamano: fd.get("tamano"),
          gestionActual: fd.get("gestionActual"),
          horarioContacto: fd.get("horarioContacto"),
          necesidad: fd.get("necesidad"),
          sitio: fd.get("sitio"),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSent(true);
    } catch {
      setError("No pudimos enviar la solicitud. Escribinos por WhatsApp y lo resolvemos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden font-sans text-[#F5F7FA]" style={{ background: FONDO }}>
      <header className="fixed inset-x-0 top-0 z-40 bg-[#020407]/70 backdrop-blur-xl">
        <div className="mx-auto grid h-[72px] max-w-[1180px] grid-cols-[1fr_auto] items-center px-5 md:grid-cols-[1fr_auto_1fr] sm:px-8">
          <a href="#inicio" className="justify-self-start" aria-label="VORDIA">
            <img src={LOCKUP} alt="VORDIA" className="h-8 w-auto object-contain mix-blend-screen" />
          </a>
          <nav className="hidden items-center gap-10 md:flex">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="text-[13px] text-white/65 transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => abrirDemo()}
              className="hidden md:inline-flex items-center gap-2 rounded-full border border-[#006CFF] px-5 py-2 text-[13px] font-semibold text-white shadow-[0_0_22px_rgba(0,108,255,0.28)] hover:bg-[#006CFF]/12"
            >
              Solicitar una demo <ArrowRight size={14} />
            </button>
            <button type="button" className="p-2 md:hidden" onClick={() => setMenu((v) => !v)} aria-label="Menú">
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menu && (
          <div className="space-y-2 border-t border-white/10 bg-[#020407] px-5 py-4 md:hidden">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenu(false)} className="block py-2 text-[15px] text-white/80">
                {l.label}
              </a>
            ))}
            <BtnDemo onClick={() => abrirDemo()} className="mt-2 w-full">
              Solicitar una demo
            </BtnDemo>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="inicio" className="relative overflow-hidden">
        <div className="relative w-full lg:aspect-[2170/725]">
          <img
            src="/images/web/vordia-4k.png?v=3"
            alt=""
            aria-hidden
            className="pointer-events-none hidden object-contain object-center lg:absolute lg:left-1/2 lg:top-[54%] lg:block lg:h-[86%] lg:w-[86%] lg:-translate-x-1/2 lg:-translate-y-1/2"
          />
          <div className="relative z-10 mx-auto flex h-full max-w-[1180px] flex-col justify-center px-5 pt-[100px] pb-8 sm:px-8 lg:pt-[64px] lg:pb-6">
            <div className="vordia-fade-up max-w-[34rem]">
              <h1 className="font-sans text-[clamp(1.9rem,3.5vw,3.1rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-white">
                Muchas partes.
                <br />
                <span className="text-[#3d8fff]">Una sola operación.</span>
              </h1>
              <p className="mt-4 max-w-[26rem] text-[13px] leading-[1.65] text-[#AAB3C0] sm:text-[14px]">
                VORDIA conecta procesos, información y decisiones mediante plataformas especializadas
                para cada sector.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <a
                  href="#soluciones"
                  className="inline-flex items-center gap-2 rounded-full bg-[#006CFF] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_0_32px_rgba(0,108,255,0.45)]"
                >
                  Encontrá tu solución <ArrowRight size={16} />
                </a>
                <a href="#como-trabajamos" className="text-[14px] font-medium text-[#5eb0ff] hover:text-white">
                  Conocé VORDIA
                </a>
              </div>
            </div>
            <img
              src="/images/web/vordia-4k.png?v=3"
              alt=""
              aria-hidden
              className="mx-auto mt-8 w-[86%] object-contain object-center lg:hidden"
              style={{ aspectRatio: "2170 / 725" }}
            />
          </div>
        </div>
      </section>

      {/* LO QUE VORDIA CONECTA */}
      <section className="border-y border-white/[0.08]">
        <div className="mx-auto grid max-w-[1180px] items-start gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
          <div>
            <Kicker>Lo que VORDIA conecta</Kicker>
            <Title className="mt-3">
              La operación completa,
              <br />
              <span className="text-[#3d8fff]">en una misma dirección.</span>
            </Title>
          </div>
          <div className="grid sm:grid-cols-3">
            {[
              { n: "01", Icon: Users, t: "Personas", d: "Equipos que saben qué hacer, cuándo hacerlo y qué necesita atención." },
              { n: "02", Icon: Layers, t: "Procesos", d: "Actividades conectadas, responsabilidades claras y continuidad operativa." },
              { n: "03", Icon: BarChart3, t: "Información", d: "Datos ordenados que se convierten en visibilidad y mejores decisiones." },
            ].map((x, i) => (
              <div
                key={x.n}
                className={`px-0 py-4 sm:px-6 sm:py-0 ${i > 0 ? "sm:border-l sm:border-white/[0.08]" : ""}`}
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

      {/* LO QUE CAMBIA */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 80% at 78% 58%, rgba(0,108,255,0.18) 0%, transparent 62%)" }}
        />
        <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
          <Kicker>Lo que cambia</Kicker>
          <Title className="mt-3 max-w-xl">
            La complejidad deja
            <br />
            de sentirse <span className="text-[#3d8fff]">fragmentada.</span>
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
                { t: "De datos dispersos", d: "a información útil." },
                { t: "De tareas aisladas", d: "a procesos conectados." },
                { t: "De reaccionar tarde", d: "a decidir con claridad." },
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

      {/* ECOSISTEMA */}
      <section id="soluciones" className="border-t border-white/[0.08] py-16 sm:py-24">
        <div className="mx-auto grid max-w-[1180px] items-stretch gap-10 px-5 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-12">
          <div className="flex flex-col justify-center">
            <Kicker>Ecosistema VORDIA</Kicker>
            <Title className="mt-3">
              Una tecnología.
              <br />
              Siete soluciones
              <br />
              <span className="text-[#3d8fff]">especializadas.</span>
            </Title>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-[#AAB3C0]/85">
              Distintos sectores. Una misma lógica. Cada solución entiende la realidad de su
              industria y comparte la precisión, la claridad y la visión de VORDIA.
            </p>
            <button
              type="button"
              onClick={() => abrirDemo(activo)}
              className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#5eb0ff] hover:text-white"
            >
              Conocé todas las soluciones <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#006CFF]/25 bg-[#050B13] shadow-[0_0_48px_rgba(0,108,255,0.1)]">
            <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] px-3 py-3 lg:hidden">
              {PRODUCTOS.map((p, i) => (
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
                {PRODUCTOS.map((p, i) => (
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
                  alt=""
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
                  <BtnDemo onClick={() => abrirDemo(producto.codigo)} className="mt-6 w-fit">
                    Conocer la solución <ArrowRight size={14} />
                  </BtnDemo>
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

      {/* CÓMO TRABAJAMOS */}
      <section id="como-trabajamos" className="border-t border-white/[0.08] py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1180px] items-start gap-10 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div>
            <Kicker>Cómo trabajamos</Kicker>
            <Title className="mt-3">
              Tecnología que parte
              <br />
              de la operación real.
            </Title>
            <p className="mt-4 text-[14px] leading-relaxed text-[#AAB3C0]/80">
              Desde la estrategia hasta la operación, te acompañamos en cada etapa.
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

      {/* LA DIFERENCIA */}
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

      {/* CTA FINAL */}
      <section id="contacto" className="relative overflow-hidden border-t border-white/[0.08]">
        <img
          src="/images/web/cityscape-cta.png"
          alt=""
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

      <footer className="border-t border-white/[0.08] py-7">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-5 px-5 sm:flex-row sm:px-8">
          <img src={LOCKUP} alt="VORDIA" className="h-7 w-auto object-contain mix-blend-screen" />
          <nav className="flex items-center gap-6 text-[13px] text-white/45">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-white/40">
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <Linkedin size={16} />
            </a>
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram size={16} />
            </a>
            <a href="https://www.youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
              <Youtube size={16} />
            </a>
            <span className="hidden h-4 w-px bg-white/15 sm:block" />
            <p className="text-[11px] text-white/30">© 2026 VORDIA. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setFormOpen(false)}>
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#050B13] p-5 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <Kicker>Solicitar una demostración</Kicker>
                <h3 className="mt-2 text-[20px] font-semibold text-white">Contanos tu operación</h3>
                <p className="mt-1 text-[13px] text-white/50">
                  Estos datos entran a Vordia HQ como cliente potencial para contactarte.
                </p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="p-1 text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            {sent ? (
              <p className="py-6 text-[15px] leading-relaxed text-white/75">
                Recibimos tus datos. Un responsable de Vordia va a revisar la solicitud y te va a
                escribir para coordinar la primera conversación.
              </p>
            ) : (
              <form className="space-y-3" onSubmit={enviarSolicitud}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input name="nombre" required placeholder="Nombre y apellido *" className={CAMPO} />
                  <input name="cargo" required placeholder="Cargo *" className={CAMPO} />
                  <input name="empresa" required placeholder="Empresa *" className={CAMPO} />
                  <input name="ciudad" required placeholder="Ciudad *" className={CAMPO} />
                  <input name="email" type="email" required placeholder="Correo electrónico *" className={CAMPO} />
                  <input name="telefono" required inputMode="tel" placeholder="Teléfono o WhatsApp *" className={CAMPO} />
                </div>
                <select name="sector" required defaultValue={sector} className={SELECT}>
                  {PRODUCTOS.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.codigo} — {p.nombre}
                    </option>
                  ))}
                  <option value="hablar">Todavía no lo definí</option>
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="tamano" required defaultValue="" className={SELECT}>
                    <option value="" disabled>
                      Tamaño de la operación *
                    </option>
                    {TAMANOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <select name="gestionActual" required defaultValue="" className={SELECT}>
                    <option value="" disabled>
                      ¿Cómo se gestiona hoy? *
                    </option>
                    {GESTION.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <select name="horarioContacto" defaultValue="" className={SELECT}>
                  <option value="">Mejor horario para contactarte</option>
                  {HORARIOS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <textarea
                  name="necesidad"
                  required
                  rows={3}
                  placeholder="¿Qué necesita resolver tu operación? *"
                  className={`${CAMPO} resize-y`}
                />
                <input name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full rounded-full bg-[#006CFF] px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                >
                  {enviando ? "Enviando…" : "Enviar solicitud"}
                </button>
                {error && <p className="text-[13px] text-red-300/80">{error}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
