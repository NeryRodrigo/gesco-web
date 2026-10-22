"use client";

import {
  createContext,
  useContext,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowRight, Instagram, Linkedin, LockKeyhole, Menu, Youtube, X } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { VORDIA_PRODUCTOS } from "@/lib/vordiaProductos";
import { identificacionVordia } from "@/lib/vordiaLegal";

export const FONDO = "#020407";
export const LOCKUP = "/images/web/lockup-wordmark.png";
export const AZUL = "#006CFF";

const NAV = [
  { href: "/#soluciones", label: "Soluciones" },
  { href: "/#como-trabajamos", label: "Cómo trabajamos" },
  { href: "/herramientas", label: "Herramientas gratis" },
  { href: "/#contacto", label: "Contacto" },
];

const REDES = [
  { href: "https://www.linkedin.com/in/vordia-py-4ab885439/", label: "LinkedIn", Icon: Linkedin },
  { href: "https://www.instagram.com/vordia.py/", label: "Instagram", Icon: Instagram },
  { href: "https://www.youtube.com/channel/UCkvRt8wEcA7P9ufYWLJRGgQ", label: "YouTube", Icon: Youtube },
  { href: "https://www.tiktok.com/@vordia.py", label: "TikTok", Icon: TikTokIcon },
];

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14.5 3c.4 2.4 1.8 4.2 4.1 4.6v2.3c-1.4 0-2.7-.4-3.8-1.2v6.6c0 3.3-2.6 5.9-5.9 5.9S3 18.6 3 15.3c0-3.2 2.5-5.8 5.7-5.9v2.4c-1.8.1-3.2 1.6-3.2 3.5 0 1.9 1.6 3.5 3.5 3.5s3.5-1.6 3.5-3.5V3h2z" />
    </svg>
  );
}

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

type SitioCtx = {
  abrirDemo: (codigo?: string) => void;
  sector: string;
};

const SitioContext = createContext<SitioCtx | null>(null);

export function useVordiaSitio() {
  const ctx = useContext(SitioContext);
  if (!ctx) throw new Error("useVordiaSitio debe usarse dentro de VordiaSitioChrome");
  return ctx;
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5eb0ff]">{children}</p>
  );
}

export function Title({
  children,
  className = "",
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h1" | "p";
}) {
  return (
    <Tag
      className={`font-sans text-[clamp(1.55rem,2.8vw,2.15rem)] font-extrabold leading-[1.15] tracking-[-0.035em] text-white ${className}`}
    >
      {children}
    </Tag>
  );
}

export function BtnDemo({
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

export function VordiaSitioChrome({
  children,
  sectorInicial = "HABITAT",
}: {
  children: ReactNode;
  sectorInicial?: string;
}) {
  const inicial = VORDIA_PRODUCTOS.some((p) => p.codigo === sectorInicial) ? sectorInicial : "HABITAT";
  const [menu, setMenu] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [sector, setSector] = useState(inicial);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [sent, setSent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function abrirDemo(codigo?: string) {
    if (codigo) setSector(codigo);
    setPaso(1);
    setSent(false);
    setError(null);
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
          cargo: fd.get("cargo") || "",
          empresa: fd.get("empresa"),
          ciudad: fd.get("ciudad") || "",
          email: fd.get("email"),
          telefono: fd.get("telefono"),
          sector: fd.get("sector"),
          tamano: fd.get("tamano") || "",
          gestionActual: fd.get("gestionActual") || "",
          horarioContacto: fd.get("horarioContacto") || "",
          necesidad: fd.get("necesidad") || "",
          sitio: fd.get("sitio"),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSent(true);
    } catch {
      setError("No pudimos enviar la solicitud. Intentá de nuevo en unos minutos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SitioContext.Provider value={{ abrirDemo, sector }}>
      <div className="min-h-screen overflow-x-hidden font-sans text-[#F5F7FA]" style={{ background: FONDO }}>
        <header className="fixed inset-x-0 top-0 z-40 bg-[#020407]/70 backdrop-blur-xl">
          <div className="mx-auto grid h-[72px] max-w-[1180px] grid-cols-[1fr_auto] items-center px-5 xl:grid-cols-[auto_1fr_auto] xl:gap-8 sm:px-8">
            <a href="/" className="justify-self-start" aria-label="VORDIA inicio">
              <img
                src={LOCKUP}
                alt="VORDIA"
                width={180}
                height={32}
                className="h-8 w-auto object-contain mix-blend-screen"
              />
            </a>
            <nav className="hidden items-center gap-9 justify-self-center xl:flex">
              {NAV.map((l) => (
                <a key={l.href} href={l.href} className="text-[13px] text-white/65 transition-colors hover:text-white">
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center justify-end gap-2">
              <a
                href="/acceso"
                rel="nofollow"
                aria-label="Iniciar sesión"
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-white/85 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white sm:px-4 sm:text-[13px]"
              >
                <LockKeyhole size={14} className="text-[#5eb0ff]" />
                <span className="hidden xl:inline">Iniciar sesión</span>
              </a>
              <button
                type="button"
                onClick={() => abrirDemo()}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#006CFF] px-3 py-2 text-[12px] font-semibold text-white shadow-[0_0_22px_rgba(0,108,255,0.28)] hover:bg-[#006CFF]/12 sm:px-5 sm:text-[13px]"
              >
                Solicitar una demo <ArrowRight size={14} />
              </button>
              <button type="button" className="p-2 xl:hidden" onClick={() => setMenu((v) => !v)} aria-label="Menú">
                {menu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          {menu && (
            <div className="space-y-2 border-t border-white/10 bg-[#020407] px-5 py-4 xl:hidden">
              {NAV.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenu(false)} className="block py-2 text-[15px] text-white/80">
                  {l.label}
                </a>
              ))}
              <a href="/acceso" rel="nofollow" className="flex items-center gap-2 border-t border-white/10 pt-3 text-[15px] font-semibold text-white">
                <LockKeyhole size={16} className="text-[#5eb0ff]" /> Iniciar sesión
              </a>
            </div>
          )}
        </header>

        {children}

        <footer className="border-t border-white/[0.08] py-10">
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div>
                <img
                  src={LOCKUP}
                  alt="VORDIA"
                  width={160}
                  height={28}
                  className="h-7 w-auto object-contain mix-blend-screen"
                />
                <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/45">
                  Software de gestión empresarial en Paraguay. Muchas partes. Una sola operación.
                </p>
              </div>
              <nav aria-label="Soluciones VORDIA" className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px] text-white/50 sm:grid-cols-4">
                {VORDIA_PRODUCTOS.map((p) => (
                  <a key={p.slug} href={`/${p.slug}`} className="hover:text-white">
                    {p.codigo}
                  </a>
                ))}
              </nav>
              <nav className="flex flex-col gap-2 text-[13px] text-white/45">
                {NAV.map((l) => (
                  <a key={l.href} href={l.href} className="hover:text-white">
                    {l.label}
                  </a>
                ))}
              </nav>
            </div>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <nav aria-label="Redes de VORDIA" className="flex items-center gap-4 text-white/40">
                {REDES.map((r) => (
                  <a
                    key={r.href}
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={r.label}
                    className="hover:text-white"
                  >
                    <r.Icon size={16} />
                  </a>
                ))}
              </nav>
              <div className="flex flex-col gap-1.5 text-[11px] text-white/30 sm:items-end">
                <nav aria-label="Legal" className="flex gap-4 text-white/45">
                  <a href="/privacidad" className="hover:text-white">Privacidad</a>
                  <a href="/terminos" className="hover:text-white">Términos y condiciones</a>
                </nav>
                <p>© 2026 {identificacionVordia()}. Todos los derechos reservados.</p>
              </div>
            </div>
          </div>
        </footer>

        {formOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setFormOpen(false)}
          >
            <div
              className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#050B13] p-5 sm:p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <Kicker>Solicitar una demostración</Kicker>
                  <h2 className="mt-2 text-[20px] font-semibold text-white">Contanos tu operación</h2>
                  <p className="mt-1 text-[13px] text-white/50">
                    Un responsable de VORDIA revisa la solicitud y te escribe para coordinar la primera conversación.
                  </p>
                </div>
                <button type="button" onClick={() => setFormOpen(false)} className="p-1 text-white/40 hover:text-white" aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
              {sent ? (
                <p className="py-6 text-[15px] leading-relaxed text-white/75">
                  Recibimos tus datos. Un responsable de VORDIA va a revisar la solicitud y te va a escribir para
                  coordinar la demostración.
                </p>
              ) : (
                <form className="space-y-3" onSubmit={enviarSolicitud}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="nombre" required placeholder="Nombre y apellido *" className={CAMPO} />
                    <input name="empresa" required placeholder="Empresa *" className={CAMPO} />
                    <input name="email" type="email" required placeholder="Correo electrónico *" className={CAMPO} />
                    <input name="telefono" required inputMode="tel" placeholder="Teléfono o WhatsApp *" className={CAMPO} />
                  </div>
                  <select key={sector} name="sector" required defaultValue={sector} className={SELECT}>
                    {VORDIA_PRODUCTOS.map((p) => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.codigo} — {p.nombre}
                      </option>
                    ))}
                    <option value="hablar">Todavía no lo definí</option>
                  </select>

                  {paso === 1 ? (
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                      <button
                        type="submit"
                        disabled={enviando}
                        className="flex-1 rounded-full bg-[#006CFF] px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                      >
                        {enviando ? "Enviando…" : "Solicitar la demostración"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaso(2)}
                        className="rounded-full px-5 py-3 text-[13px] font-medium text-[#5eb0ff] hover:text-white"
                      >
                        Agregar más contexto
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input name="cargo" placeholder="Cargo" className={CAMPO} />
                        <input name="ciudad" placeholder="Ciudad" className={CAMPO} />
                        <select name="tamano" defaultValue="" className={SELECT}>
                          <option value="">Tamaño de la operación</option>
                          {TAMANOS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <select name="gestionActual" defaultValue="" className={SELECT}>
                          <option value="">¿Cómo se gestiona hoy?</option>
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
                        rows={3}
                        placeholder="¿Qué necesita resolver tu operación?"
                        className={`${CAMPO} resize-y`}
                      />
                      <button
                        type="submit"
                        disabled={enviando}
                        className="w-full rounded-full bg-[#006CFF] px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
                      >
                        {enviando ? "Enviando…" : "Solicitar la demostración"}
                      </button>
                    </>
                  )}
                  <input name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                  {!sent && (
                    <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-white/50">
                      <input type="checkbox" name="consentimiento" required className="mt-0.5 accent-[#006CFF]" />
                      <span>
                        Acepto que VORDIA use estos datos para contactarme sobre mi solicitud, según la{" "}
                        <a href="/privacidad" target="_blank" className="text-[#5eb0ff] underline-offset-2 hover:underline">
                          Política de Privacidad
                        </a>
                        .
                      </span>
                    </label>
                  )}
                  {error && <p className="text-[13px] text-red-300/80">{error}</p>}
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </SitioContext.Provider>
  );
}
