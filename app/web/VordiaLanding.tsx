"use client";

import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { apiUrl } from "@/lib/api";

const FONDO = "#010618";
const PRINCIPAL = "#022a8c";
const SECUNDARIO = "#0268f9";
const CLARO = "#e6edfa";

const NAV = [
  { href: "#soluciones", label: "Soluciones" },
  { href: "#por-que", label: "Por qué Vordia" },
  { href: "#producto", label: "El sistema" },
  { href: "#contacto", label: "Conversar" },
];

const PRODUCTOS = [
  {
    codigo: "HQ",
    logo: "/images/web/hq.png",
    nombre: "Dirección",
    texto: "El dueño ve cobros, gastos, clientes y prioridades en una sola pantalla. Sin pedir un reporte.",
  },
  {
    codigo: "HABITAT",
    logo: "/images/web/habitat.png",
    nombre: "Inmuebles",
    texto: "Contratos, alquileres y morosidad. La administración deja de depender de una planilla.",
  },
  {
    codigo: "STAY",
    logo: "/images/web/stay.png",
    nombre: "Hospedaje",
    texto: "Reservas, ocupación y caja del día. Para hostales y estancias que no pueden parar.",
  },
  {
    codigo: "DINE",
    logo: "/images/web/dine.png",
    nombre: "Gastronomía",
    texto: "Costos, insumos y servicio. El restaurante opera con números, no con memoria.",
  },
  {
    codigo: "RETAIL",
    logo: "/images/web/retail.png",
    nombre: "Comercio",
    texto: "Stock y ventas en el mismo lugar. El mostrador y la gerencia ven lo mismo.",
  },
  {
    codigo: "AGRO",
    logo: "/images/web/agro.png",
    nombre: "Campo",
    texto: "Lotes, campañas y costos. El campo entra al mismo sistema que la oficina.",
  },
];

const RAZONES = [
  {
    t: "Diseñado para Paraguay",
    d: "Guaraníes, contratos, cobros y el ritmo real de una empresa de acá. No es un software extranjero adaptado.",
  },
  {
    t: "Un ecosistema, no un catálogo",
    d: "Dirección, inmuebles, hospedaje, gastronomía, comercio y campo conversan. El dato se carga una vez.",
  },
  {
    t: "Hecho para quien decide",
    d: "Si el socio no entiende el número en diez segundos, el sistema no sirve. Vordia se lee, no se explica.",
  },
];

function Kicker({ children }: { children: string }) {
  return (
    <p
      className="text-[10px] font-heading font-bold uppercase"
      style={{ color: SECUNDARIO, letterSpacing: "0.32em" }}
    >
      {children}
    </p>
  );
}

export function VordiaLanding() {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demo =
    "https://wa.me/?text=" +
    encodeURIComponent("Hola. Quiero agendar una conversación sobre Vordia para mi empresa.");

  async function enviarSolicitud(e: React.FormEvent<HTMLFormElement>) {
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
          empresa: fd.get("empresa"),
          email: fd.get("email"),
          telefono: fd.get("telefono"),
          sector: fd.get("sector"),
          necesidad: fd.get("necesidad"),
          sitio: fd.get("sitio"),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setEnviado(true);
    } catch {
      setError("No pudimos enviar la solicitud. Escribinos por WhatsApp y lo resolvemos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden font-sans" style={{ background: FONDO, color: CLARO }}>
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05]"
        style={{ background: "rgba(1,6,24,0.82)", backdropFilter: "blur(20px)" }}
      >
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <a href="#inicio" className="shrink-0" aria-label="Vordia">
            <img
              src="/images/web/lockup-horizontal.png"
              alt="Vordia"
              className="h-8 w-auto object-contain"
            />
          </a>
          <nav className="hidden lg:flex items-center gap-8">
            {NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[13px] font-medium text-[#e6edfa]/55 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-5">
            <a href="/" className="text-[13px] font-medium text-[#e6edfa]/55 hover:text-white">
              Ingresar
            </a>
            <a
              href="#contacto"
              className="inline-flex items-center rounded-md px-4 py-2 text-[13px] font-semibold text-white"
              style={{ background: SECUNDARIO }}
            >
              Agendar conversación
            </a>
          </div>
          <button
            type="button"
            className="lg:hidden p-2 text-[#e6edfa]"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t border-white/[0.05] px-5 py-5 space-y-1" style={{ background: FONDO }}>
            {NAV.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2.5 text-[15px] text-[#e6edfa]/80">
                {l.label}
              </a>
            ))}
            <a href="/" className="block py-2.5 text-[15px] text-[#e6edfa]/55">Ingresar</a>
            <a
              href="#contacto"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex rounded-md px-4 py-2.5 text-[13px] font-semibold"
              style={{ background: SECUNDARIO }}
            >
              Agendar conversación
            </a>
          </div>
        )}
      </header>

      <section id="inicio" className="relative pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 55% 45% at 80% 0%, ${PRINCIPAL}40 0%, transparent 58%)`,
          }}
        />
        <div className="relative mx-auto max-w-[1120px] px-5 sm:px-8">
          <div className="max-w-[640px]">
            <Kicker>Mente operativa</Kicker>
            <h1 className="mt-5 text-[clamp(2rem,4.6vw,3.35rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-white">
              La operación de tu empresa, en un solo sistema.
            </h1>
            <p className="mt-6 max-w-[520px] text-[16px] sm:text-[17px] leading-[1.65] text-[#e6edfa]/62">
              Vordia es el software con el que dueños y gerentes en Paraguay ven el dinero, cobran y deciden — sin planillas, sin esperar a fin de mes y sin un ERP que nadie usa.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <a
                href="#contacto"
                className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-[14px] font-semibold text-white"
                style={{ background: SECUNDARIO }}
              >
                Agendar una conversación <ArrowRight size={16} />
              </a>
              <a
                href="#producto"
                className="inline-flex items-center justify-center rounded-md px-5 py-3 text-[14px] font-medium text-[#e6edfa]/80 border border-white/12 hover:border-white/25 transition-colors"
              >
                Ver el sistema
              </a>
            </div>
          </div>

          <div className="mt-16 sm:mt-20">
            <div
              className="relative overflow-hidden rounded-xl border border-white/[0.08]"
              style={{ boxShadow: `0 40px 120px -40px ${PRINCIPAL}` }}
            >
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]" style={{ background: "rgba(2,42,140,0.22)" }}>
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="ml-3 text-[11px] text-[#e6edfa]/35">vordia.com.py — HQ</span>
              </div>
              <img
                src="/images/web/dashboard.jpg"
                alt="Vordia HQ en escritorio y celular"
                className="w-full h-auto object-cover object-top"
              />
            </div>
            <p className="mt-4 text-center text-[12px] text-[#e6edfa]/35">
              Escritorio y celular. El mismo número, en cualquier lugar.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.05]">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {[
            ["Hecho en Paraguay", "Para empresas que facturan y cobran acá."],
            ["Seis verticales", "Un estándar. El rubro no cambia de sistema."],
            ["Para quien decide", "El socio lee. No necesita un informe."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="text-[14px] font-semibold text-white">{t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#e6edfa]/45">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="soluciones" className="py-24 sm:py-28">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <Kicker>Soluciones</Kicker>
          <h2 className="mt-4 max-w-xl text-[clamp(1.6rem,3vw,2.15rem)] font-semibold tracking-[-0.03em] text-white leading-snug">
            El mismo Vordia, adaptado a cómo opera tu negocio.
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.07]" style={{ background: "rgba(230,237,250,0.06)" }}>
            {PRODUCTOS.map((p) => (
              <article key={p.codigo} className="p-7 sm:p-8" style={{ background: FONDO }}>
                <img src={p.logo} alt={`Vordia ${p.codigo}`} className="h-8 w-auto object-contain" />
                <h3 className="mt-8 text-[16px] font-semibold text-white">{p.nombre}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#e6edfa]/52">{p.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="por-que" className="py-24 sm:py-28 border-t border-white/[0.05]">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <Kicker>Por qué Vordia</Kicker>
          <h2 className="mt-4 max-w-xl text-[clamp(1.6rem,3vw,2.15rem)] font-semibold tracking-[-0.03em] text-white leading-snug">
            No competimos con más módulos. Competimos con claridad.
          </h2>
          <div className="mt-14 grid md:grid-cols-3 gap-12 md:gap-10">
            {RAZONES.map((x, i) => (
              <div key={x.t}>
                <p className="text-[12px] font-medium tabular-nums" style={{ color: SECUNDARIO }}>
                  0{i + 1}
                </p>
                <h3 className="mt-3 text-[17px] font-semibold text-white">{x.t}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-[#e6edfa]/52">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="producto" className="overflow-hidden">
        <div className="relative h-[min(52vh,520px)] min-h-[260px]">
          <img
            src="/images/web/edificio.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${FONDO}40 0%, ${FONDO}88 55%, ${FONDO} 100%)`,
            }}
          />
        </div>
        <div className="relative mx-auto max-w-[1120px] px-5 sm:px-8 pt-10 pb-16 sm:pt-12 sm:pb-20" style={{ background: FONDO }}>
          <Kicker>El sistema</Kicker>
          <h2 className="mt-4 max-w-lg text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold tracking-[-0.03em] text-white leading-snug">
            Tu empresa ya funciona. Hagamos que funcione con una visión compartida.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#e6edfa]/62">
            Contanos cómo se gestiona hoy tu operación. Conversamos sobre qué información y
            procesos necesitan estar mejor conectados — sin presentación genérica.
          </p>
          <a
            href="#contacto"
            className="mt-8 inline-flex items-center gap-2 rounded-md px-5 py-3 text-[14px] font-semibold text-white"
            style={{ background: SECUNDARIO }}
          >
            Solicitar una demostración <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <section id="contacto" className="py-24 sm:py-28">
        <div className="mx-auto max-w-[560px] px-5 sm:px-8 text-center">
          <Kicker>Conversar</Kicker>
          <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.15rem)] font-semibold tracking-[-0.03em] text-white leading-snug">
            Si te hace sentido, el siguiente paso es simple.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#e6edfa]/52">
            Dejanos tus datos. Coordinamos un horario y te mostramos Vordia con el negocio que vos tenés — no con un caso de otro país.
          </p>

          {enviado ? (
            <p className="mt-10 text-[15px] leading-relaxed text-[#e6edfa]/70">
              Recibimos tu solicitud. Te vamos a contactar para coordinar la conversación.
            </p>
          ) : (
            <form className="mt-10 space-y-3 text-left" onSubmit={enviarSolicitud}>
              <input
                name="nombre"
                required
                placeholder="Nombre y apellido"
                className="w-full rounded-md border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#e6edfa]/35 outline-none focus:border-[#0066FF]/50"
              />
              <input
                name="empresa"
                required
                placeholder="Empresa"
                className="w-full rounded-md border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#e6edfa]/35 outline-none focus:border-[#0066FF]/50"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="Correo electrónico"
                className="w-full rounded-md border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#e6edfa]/35 outline-none focus:border-[#0066FF]/50"
              />
              <input
                name="telefono"
                inputMode="tel"
                placeholder="Teléfono o WhatsApp (opcional)"
                className="w-full rounded-md border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#e6edfa]/35 outline-none focus:border-[#0066FF]/50"
              />
              <select
                name="sector"
                required
                defaultValue=""
                className="w-full rounded-md border border-white/12 px-4 py-3 text-sm text-white outline-none focus:border-[#0066FF]/50"
                style={{ background: FONDO }}
              >
                <option value="" disabled>
                  ¿Qué parte del negocio querés ordenar?
                </option>
                {PRODUCTOS.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre} — {p.codigo}
                  </option>
                ))}
                <option value="hablar">Todavía no lo tengo claro</option>
              </select>
              <textarea
                name="necesidad"
                rows={3}
                placeholder="¿Cómo se gestiona hoy? Contanos la principal dificultad."
                className="w-full resize-y rounded-md border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#e6edfa]/35 outline-none focus:border-[#0066FF]/50"
              />
              <input name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              <button
                type="submit"
                disabled={enviando}
                className="w-full rounded-md px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                style={{ background: SECUNDARIO }}
              >
                {enviando ? "Enviando…" : "Solicitar una conversación"}
              </button>
              {error && <p className="text-[13px] text-red-300/80">{error}</p>}
            </form>
          )}

          <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
            <a
              href={demo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-[14px] font-medium border border-white/12 text-[#e6edfa]/80"
            >
              Escribir por WhatsApp <ArrowRight size={16} />
            </a>
            <a
              href="mailto:hola@vordia.com.py"
              className="inline-flex items-center justify-center rounded-md px-5 py-3 text-[14px] font-medium border border-white/12 text-[#e6edfa]/80"
            >
              hola@vordia.com.py
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.05] py-8">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/images/web/lockup-horizontal.png" alt="Vordia" className="h-7 w-auto object-contain" />
          <p className="text-[12px] text-[#e6edfa]/30">
            © {new Date().getFullYear()} Vordia · Paraguay
          </p>
        </div>
      </footer>
    </div>
  );
}
