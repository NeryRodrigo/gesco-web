"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays, CalendarHeart, ExternalLink, Eye, LayoutDashboard, Loader2, LogOut, Menu, MessageCircle, Shirt, ShoppingBag, Sparkles, Store, Users, Wand2, X,
} from "lucide-react";
import { API_BASE, installAuthFetch } from "@/lib/api";
import { loadVordiaSession } from "@/lib/utils";
import { fraunces } from "@/lib/fuentesBoutique";
import { btqApi, gs, gsCorto, fechaHora, linkWhatsapp, type BtqPanel, type BtqPerfil, type BtqPrendaFila, type BtqPrueba } from "@/lib/boutiqueApi";
import { BOTON, BOTON_PRIMARIO, DEGRADE, FONDO, Kpi, SERIF, Tarjeta, TEXTO_SUAVE, Vacio } from "@/components/boutique/BoutiqueUI";
import { PrendasView } from "./PrendasView";
import { CajaView } from "./CajaView";
import { AgendaView } from "./AgendaView";
import { ClientasView } from "./ClientasView";
import { VidrieraView } from "./VidrieraView";

export type Vista = "panel" | "prendas" | "caja" | "agenda" | "clientas" | "vidriera";

type ItemNav = { id: Vista; label: string; icon: React.ReactNode; titulo: string; bajada: string };

/** Menú agrupado como en VORDIA HQ: operación del día, catálogo y clientas. */
const GRUPOS: { titulo: string; items: ItemNav[] }[] = [
  {
    titulo: "Operación",
    items: [
      { id: "panel", label: "Hoy", icon: <LayoutDashboard size={18} />, titulo: "Resumen del día", bajada: "Ventas, pendientes y lo que piden en el marketplace" },
      { id: "caja", label: "Vender", icon: <ShoppingBag size={18} />, titulo: "Caja", bajada: "Ventas, apartados con seña y saldos" },
      { id: "agenda", label: "Alquileres y pruebas", icon: <CalendarHeart size={18} />, titulo: "Alquileres y pruebas", bajada: "Agenda por fecha, retiros y devoluciones" },
    ],
  },
  {
    titulo: "Catálogo",
    items: [
      { id: "prendas", label: "Prendas y stock", icon: <Shirt size={18} />, titulo: "Prendas y stock", bajada: "Talles, colores, fotos y precios" },
      { id: "vidriera", label: "Mi vidriera", icon: <Store size={18} />, titulo: "Mi vidriera", bajada: "Tu página en VORDIA Closet" },
    ],
  },
  {
    titulo: "Clientas",
    items: [{ id: "clientas", label: "Clientas", icon: <Users size={18} />, titulo: "Clientas", bajada: "Talles, cumpleaños y avisos por WhatsApp" }],
  },
];
const NAV = GRUPOS.flatMap((g) => g.items);

export type ContextoBoutique = {
  empresaId: number;
  prendas: BtqPrendaFila[];
  perfil: BtqPerfil | null;
  recargar: () => void;
  version: number;
  ir: (v: Vista) => void;
};

/** Ítem del menú lateral: mismo comportamiento que VORDIA HQ, con brillo rosa neón. */
function ItemMenu({ item, activo, onClick }: { item: ItemNav; activo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
        activo
          ? "border-[#FF3DC8]/40 bg-[#FF3DC8]/[0.13] text-white shadow-[0_0_22px_rgba(255,61,200,0.18)]"
          : "border-transparent text-[color:var(--btq-suave)] hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <span className={`shrink-0 ${activo ? "text-[#FF5CCF] drop-shadow-[0_0_6px_rgba(255,61,200,0.8)]" : "text-[color:var(--btq-tenue)]"}`}>{item.icon}</span>
      <span className="text-[13px] font-semibold tracking-wide">{item.label}</span>
    </button>
  );
}

/** Logo VORDIA BOUTIQUE: vertical en el menú, horizontal en la barra del celular. */
function Logo({ horizontal = false, className = "" }: { horizontal?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={horizontal ? "/images/vordia-products/boutique-horizontal.png" : "/images/vordia-products/boutique.png"}
      alt="VORDIA BOUTIQUE"
      className={`h-auto object-contain drop-shadow-[0_0_26px_rgba(255,61,200,0.28)] ${className}`}
    />
  );
}

function rangoMes() {
  const hoy = new Date();
  const f = (d: Date) => d.toLocaleDateString("es-PY", { day: "numeric", month: "short", year: "numeric" });
  return `${f(new Date(hoy.getFullYear(), hoy.getMonth(), 1))} - ${f(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))}`;
}

/**
 * VORDIA BOUTIQUE. Pantalla completa para boutiques (rubro BOUTIQUE) con el esquema de VORDIA HQ
 * (menú lateral, barra superior y tarjetas) en rosa neón; con `embebido` se muestra dentro de HQ como demo.
 */
export default function BoutiqueApp({ embebido = false, onLogout }: { embebido?: boolean; onLogout?: () => void }) {
  // La sesión ya está en el navegador cuando se monta (la app se muestra después del login)
  const [sesion] = useState(() => loadVordiaSession()?.user ?? {});
  const [empresaId, setEmpresaId] = useState(() =>
    String(sesion.rubro ?? sesion.Rubro ?? "").toUpperCase() === "BOUTIQUE" ? Number(sesion.empresaId ?? sesion.EmpresaId ?? 0) : 0,
  );
  const usuario = String(sesion.nombre ?? sesion.Nombre ?? "");
  const rol = String(sesion.rol ?? sesion.Rol ?? "Admin");
  const [vista, setVista] = useState<Vista>("panel");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [prendas, setPrendas] = useState<BtqPrendaFila[] | null>(null);
  const [perfil, setPerfil] = useState<BtqPerfil | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  // Empresa: la de la sesión (rubro BOUTIQUE) o la boutique demo para usuarios de HQ
  useEffect(() => {
    installAuthFetch();
    if (empresaId) return;
    fetch(`${API_BASE}/api/Auth/empresas`)
      .then((r) => r.json())
      .then((empresas: { empresaId?: number; EmpresaId?: number; rubro?: string; Rubro?: string }[]) => {
        const demo = empresas.find((e) => String(e.rubro ?? e.Rubro ?? "").toUpperCase() === "BOUTIQUE");
        if (demo) setEmpresaId(Number(demo.empresaId ?? demo.EmpresaId));
        else toast.error("No hay una boutique configurada (rubro BOUTIQUE)");
      })
      .catch(() => toast.error("No se pudo conectar con el servidor"));
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    let vivo = true;
    Promise.all([
      btqApi<BtqPrendaFila[]>(`/api/Boutique/prendas?empresaId=${empresaId}`),
      btqApi<{ perfil: BtqPerfil | null }>(`/api/Boutique/perfil?empresaId=${empresaId}`),
    ])
      .then(([p, pf]) => {
        if (!vivo) return;
        setPrendas(p);
        setPerfil(pf.perfil);
      })
      .catch((e) => vivo && toast.error(e instanceof Error ? e.message : "No se pudieron cargar los datos"));
    return () => {
      vivo = false;
    };
  }, [empresaId, version]);

  const ir = useCallback((v: Vista) => {
    setVista(v);
    setMenuAbierto(false);
  }, []);
  const ctx: ContextoBoutique | null = empresaId && prendas ? { empresaId, prendas, perfil, recargar, version, ir } : null;
  const nombreTienda = perfil?.nombreComercial || "Tu boutique";
  const actual = NAV.find((n) => n.id === vista) ?? NAV[0];

  const contenido = !ctx ? (
    <div className={`flex items-center gap-2 p-8 text-[14px] ${TEXTO_SUAVE}`}><Loader2 size={16} className="animate-spin" /> Abriendo tu boutique…</div>
  ) : vista === "panel" ? (
    <PanelView ctx={ctx} usuario={usuario} />
  ) : vista === "prendas" ? (
    <PrendasView ctx={ctx} />
  ) : vista === "caja" ? (
    <CajaView ctx={ctx} />
  ) : vista === "agenda" ? (
    <AgendaView ctx={ctx} />
  ) : vista === "clientas" ? (
    <ClientasView ctx={ctx} />
  ) : (
    <VidrieraView ctx={ctx} />
  );

  if (embebido) {
    return (
      <div className={`${fraunces.variable} btq-neon ${FONDO} min-h-[80dvh] space-y-4 rounded-3xl border border-[#FF3DC8]/15 p-4 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Logo horizontal className="w-[180px]" />
            <span className="rounded-full border border-[#FF3DC8]/30 bg-[#FF3DC8]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF8ADF]">demo · {nombreTienda}</span>
          </div>
          <a href="/closet" target="_blank" rel="noreferrer" className={BOTON}><Sparkles size={15} /> Ver VORDIA Closet</a>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setVista(n.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold ${vista === n.id ? "border-[#FF3DC8]/40 bg-[#FF3DC8]/[0.13] text-white shadow-[0_0_22px_rgba(255,61,200,0.18)]" : "border-white/10 text-[color:var(--btq-suave)] hover:text-white"}`}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        {contenido}
      </div>
    );
  }

  const inicial = (usuario || "B").charAt(0).toUpperCase();

  return (
    <div className={`${fraunces.variable} btq-neon ${FONDO} flex min-h-dvh overflow-x-hidden font-sans`}>
      {/* Fondo oscuro detrás del menú en el celular */}
      {menuAbierto && <button type="button" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />}

      {/* MENÚ LATERAL — mismo esquema que VORDIA HQ */}
      <aside
        aria-label="Menú de navegación"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,88vw)] flex-col overflow-hidden border-r border-white/5 bg-[color:var(--btq-panel)] transition-transform duration-200 ease-out max-lg:pb-[env(safe-area-inset-bottom)] max-lg:pt-[env(safe-area-inset-top)] lg:w-72 lg:translate-x-0 ${menuAbierto ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Trazo de luz rosa, como las pistas de un circuito */}
        <span className="pointer-events-none absolute right-0 top-0 h-full w-px bg-[linear-gradient(180deg,transparent,rgba(255,61,200,0.55)_30%,rgba(124,92,255,0.35)_70%,transparent)]" />
        <button type="button" onClick={() => setMenuAbierto(false)} className="absolute right-4 top-4 z-10 rounded-xl p-2.5 text-[color:var(--btq-suave)] hover:bg-white/5 hover:text-white lg:hidden" aria-label="Cerrar menú">
          <X size={22} />
        </button>

        <div className="flex shrink-0 flex-col items-center px-6 pb-4 pt-7 lg:px-8 lg:pb-6 lg:pt-8">
          <button type="button" onClick={() => ir("panel")} className="transition-transform duration-500 hover:scale-[1.03]" aria-label="Ir al inicio">
            <Logo className="w-[150px] lg:w-[188px]" />
          </button>
          <span className="mt-4 max-w-full truncate rounded-full border border-[#FF3DC8]/25 bg-[#FF3DC8]/[0.08] px-3 py-1 text-[11.5px] font-semibold text-[#FF8ADF]">{nombreTienda}</span>
        </div>

        <nav className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-5 lg:px-6">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <p className="mb-2 ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF3DC8]/80">{g.titulo}</p>
              <div className="space-y-1.5">
                {g.items.map((it) => <ItemMenu key={it.id} item={it} activo={vista === it.id} onClick={() => ir(it.id)} />)}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/5 px-5 py-4 lg:px-6">
          {perfil?.slug && (
            <a href={`/closet/${perfil.slug}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[color:var(--btq-suave)] hover:bg-white/[0.04] hover:text-white">
              <Eye size={18} className="text-[color:var(--btq-tenue)]" /> Ver mi vidriera <ExternalLink size={13} className="ml-auto" />
            </a>
          )}
          {onLogout && (
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[color:var(--btq-suave)] hover:bg-[#FF3D6E]/10 hover:text-[#FF7A9C]">
              <LogOut size={18} /> Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-72">
        {/* BARRA SUPERIOR — como VORDIA HQ */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0A0714]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMenuAbierto(true)} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-[color:var(--btq-ink2)] lg:hidden" aria-label="Abrir menú">
                <Menu size={20} />
              </button>
              <Logo horizontal className="w-[120px] sm:hidden" />
              <div className="hidden min-w-0 sm:block">
                <h2 className="truncate text-[17px] font-bold text-white lg:text-[19px]">{actual.titulo}</h2>
                <p className="truncate text-[12px] text-[color:var(--btq-suave)]">{actual.bajada}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 lg:gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-[color:var(--btq-ink2)] xl:flex">
                <CalendarDays size={14} className="text-[#FF5CCF]" /> {rangoMes()}
              </div>
              <a href="/closet" target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold text-[color:var(--btq-ink2)] hover:border-[#FF3DC8]/40 hover:text-white md:flex">
                <Sparkles size={14} className="text-[#FF5CCF]" /> VORDIA Closet
              </a>
              <button type="button" onClick={() => ir("caja")} className={`${BOTON_PRIMARIO} hidden sm:inline-flex`}><ShoppingBag size={15} /> Vender</button>
              <div className="flex items-center gap-2 pl-1">
                <div className={`grid h-9 w-9 place-items-center rounded-full ${DEGRADE} text-xs font-bold text-white shadow-[0_0_16px_rgba(255,61,200,0.45)]`}>{inicial}</div>
                <div className="hidden leading-tight sm:block">
                  <p className="text-[12px] font-semibold text-white">{rol}</p>
                  <p className="text-[10px] text-[color:var(--btq-suave)]">VORDIA BOUTIQUE</p>
                </div>
              </div>
            </div>
          </div>
          {/* Línea de luz inferior */}
          <span className="block h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,61,200,0.6),rgba(124,92,255,0.4),transparent)]" />
        </header>

        <main className="w-full min-w-0 max-w-[1400px] flex-1 p-3 pb-24 sm:p-4 lg:p-6">{contenido}</main>

        {/* Acceso rápido a la caja en el celular */}
        {vista !== "caja" && (
          <button type="button" onClick={() => ir("caja")} className={`fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full ${DEGRADE} text-white shadow-[0_0_28px_rgba(255,61,200,0.6)] sm:hidden`} aria-label="Nueva venta">
            <ShoppingBag size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buen día" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

function PanelView({ ctx, usuario }: { ctx: ContextoBoutique; usuario: string }) {
  const [panel, setPanel] = useState<BtqPanel | null>(null);
  const [pruebas, setPruebas] = useState<BtqPrueba[]>([]);
  const [cargandoDemo, setCargandoDemo] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      btqApi<BtqPanel>(`/api/Boutique/panel?empresaId=${ctx.empresaId}`),
      btqApi<BtqPrueba[]>(`/api/Boutique/pruebas?empresaId=${ctx.empresaId}`),
    ])
      .then(([p, pr]) => {
        if (!vivo) return;
        setPanel(p);
        setPruebas(pr);
      })
      .catch((e) => vivo && toast.error(e instanceof Error ? e.message : "No se pudo cargar el panel"));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  const cargarDemo = async () => {
    setCargandoDemo(true);
    try {
      const r = await btqApi<{ prendas: number }>(`/api/Boutique/demo?empresaId=${ctx.empresaId}`, { method: "POST" });
      toast.success(`Listo: ${r.prendas} prendas de ejemplo en tu boutique y en el marketplace`);
      ctx.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar la demo");
    } finally {
      setCargandoDemo(false);
    }
  };

  const nombre = usuario.split(" ")[0];
  const pedidas = pruebas.filter((p) => p.prueba.estado === "Pedida");
  const maxCanal = Math.max(1, ...(panel?.porCanal.map((c) => c.total) ?? [1]));

  return (
    <div className="space-y-4">
      {/* Saludo con brillo de circuito */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#FF3DC8]/15 bg-[color:var(--btq-card)] px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#FF3DC8]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-40 h-48 w-48 rounded-full bg-[#7C5CFF]/15 blur-3xl" />
        <svg className="pointer-events-none absolute right-0 top-0 hidden h-full w-[45%] opacity-60 md:block" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 120 H120 L150 90 H260 L290 60 H400" fill="none" stroke="#FF3DC8" strokeWidth="1.5" opacity="0.55" />
          <path d="M60 150 H180 L210 120 H330 L360 95 H400" fill="none" stroke="#B46BFF" strokeWidth="1.2" opacity="0.4" />
          <path d="M140 20 H240 L270 45 H400" fill="none" stroke="#FF3DC8" strokeWidth="1" opacity="0.35" />
          <circle cx="150" cy="90" r="3" fill="#FF7AE0" />
          <circle cx="290" cy="60" r="3" fill="#FF7AE0" />
          <circle cx="210" cy="120" r="2.5" fill="#C9A0FF" />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`text-[12.5px] capitalize ${TEXTO_SUAVE}`}>{new Date().toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className={`${SERIF} text-[26px] font-bold leading-tight text-white sm:text-[30px]`}>
              {saludo()}{nombre ? `, ${nombre}` : ""}
            </h1>
            <p className={`mt-1 text-[13px] ${TEXTO_SUAVE}`}>Tu boutique, tu stock y tu vidriera en VORDIA Closet, en un solo lugar.</p>
          </div>
          <button type="button" onClick={() => ctx.ir("caja")} className={BOTON_PRIMARIO}><ShoppingBag size={16} /> Nueva venta</button>
        </div>
      </div>

      {ctx.prendas.length === 0 && (
        <Vacio
          titulo="Tu boutique está lista para empezar"
          texto="Cargá tu primera prenda con sus talles y colores, o mirá cómo funciona con una boutique de ejemplo (Maison Lila) y otras cuatro boutiques en el marketplace."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => ctx.ir("prendas")} className={BOTON}><Shirt size={15} /> Cargar mi primera prenda</button>
              <button type="button" onClick={cargarDemo} disabled={cargandoDemo} className={BOTON_PRIMARIO}>
                {cargandoDemo ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} Cargar demo
              </button>
            </div>
          }
        />
      )}

      {panel && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Vendido hoy" valor={gsCorto(panel.ventasHoy)} nota={`${panel.cantidadHoy} venta${panel.cantidadHoy === 1 ? "" : "s"}`} tono="bien" icono={<ShoppingBag size={15} />} />
            <Kpi label="Este mes" valor={gsCorto(panel.ventasMes)} nota={`${panel.cantidadMes} ventas`} icono={<CalendarDays size={15} />} />
            <Kpi
              label="Apartados"
              valor={String(panel.apartados)}
              nota={panel.apartados ? `Saldo por cobrar ${gsCorto(panel.saldoApartados)}` : "Sin apartados"}
              tono={panel.apartadosVencidos ? "alerta" : "normal"}
              icono={<Sparkles size={15} />}
            />
            <Kpi label="En el marketplace" valor={panel.vistasMarketplace.toLocaleString("es-PY")} nota="vistas de tus prendas" icono={<Eye size={15} />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Tarjeta>
              <p className={`${SERIF} text-[17px] font-bold`}>Para hacer hoy</p>
              <ul className="mt-3 space-y-2">
                {pedidas.map((p) => (
                  <li key={p.prueba.pruebaId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[color:var(--btq-borde)] bg-[color:var(--btq-tinte)] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold">{p.prueba.nombre} quiere probarse {p.prenda}</p>
                      <p className={`text-[12px] ${TEXTO_SUAVE}`}>{fechaHora(p.prueba.fechaHora)}{p.variante ? ` · ${p.variante}` : ""} · pedido desde el marketplace</p>
                    </div>
                    <a
                      href={linkWhatsapp(p.prueba.whatsapp, `¡Hola ${p.prueba.nombre.split(" ")[0]}! Te escribimos de ${ctx.perfil?.nombreComercial ?? "la boutique"} por tu prueba de ${p.prenda} el ${fechaHora(p.prueba.fechaHora)}. ¿Te confirmamos el turno?`)}
                      target="_blank"
                      rel="noreferrer"
                      className={BOTON}
                    >
                      <MessageCircle size={14} /> Confirmar
                    </a>
                  </li>
                ))}
                {panel.apartadosVencidos > 0 && (
                  <li className="flex items-center justify-between gap-2 rounded-2xl border border-[color:var(--btq-borde)] bg-[color:var(--btq-rosa-bg)] px-3.5 py-2.5">
                    <p className="text-[13.5px]"><b>{panel.apartadosVencidos} apartado{panel.apartadosVencidos === 1 ? "" : "s"} vencido{panel.apartadosVencidos === 1 ? "" : "s"}</b>: cobrá el saldo o liberá la prenda.</p>
                    <button type="button" onClick={() => ctx.ir("caja")} className={BOTON}>Ver</button>
                  </li>
                )}
                {panel.alquileresSemana > 0 && (
                  <li className="flex items-center justify-between gap-2 rounded-2xl border border-[color:var(--btq-borde)] bg-[color:var(--btq-lila-bg)] px-3.5 py-2.5">
                    <p className="text-[13.5px]"><b>{panel.alquileresSemana} alquiler{panel.alquileresSemana === 1 ? "" : "es"}</b> se retira{panel.alquileresSemana === 1 ? "" : "n"} o vuelve{panel.alquileresSemana === 1 ? "" : "n"} esta semana.</p>
                    <button type="button" onClick={() => ctx.ir("agenda")} className={BOTON}>Agenda</button>
                  </li>
                )}
                {pedidas.length === 0 && !panel.apartadosVencidos && !panel.alquileresSemana && (
                  <li className={`rounded-2xl bg-[color:var(--btq-tinte)] px-3.5 py-3 text-[13px] ${TEXTO_SUAVE}`}>Todo al día. Las pruebas que pidan desde el marketplace aparecen acá.</li>
                )}
              </ul>
            </Tarjeta>

            <Tarjeta>
              <p className={`${SERIF} text-[17px] font-bold`}>Por dónde vendés</p>
              <p className={`text-[12px] ${TEXTO_SUAVE}`}>Lo cobrado este mes por canal</p>
              <div className="mt-3 space-y-3">
                {panel.porCanal.length === 0 && <p className={`text-[13px] ${TEXTO_SUAVE}`}>Todavía no hay ventas este mes.</p>}
                {[...panel.porCanal].sort((a, b) => b.total - a.total).map((c) => (
                  <div key={c.canal}>
                    <div className="flex justify-between text-[13px]"><span>{c.canal}</span><span className="font-semibold tabular-nums">{gs(c.total)}</span></div>
                    <div className="mt-1.5 h-2 rounded-full bg-white/[0.06]">
                      <div className={`h-2 rounded-full ${DEGRADE} shadow-[0_0_12px_rgba(255,61,200,0.55)]`} style={{ width: `${(c.total / maxCanal) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Tarjeta>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta>
              <p className={`${SERIF} text-[17px] font-bold`}>Se están terminando</p>
              <p className={`text-[12px] ${TEXTO_SUAVE}`}>Talles con 1 o ninguna unidad: reponé antes de perder la venta</p>
              <ul className="mt-3 divide-y divide-[color:var(--btq-borde)]">
                {panel.sinStock.length === 0 && <li className={`py-2 text-[13px] ${TEXTO_SUAVE}`}>Nada por reponer.</li>}
                {panel.sinStock.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                    <span className="min-w-0 truncate">{s.nombre} · <b>{s.talle}</b> · {s.color}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${s.stock === 0 ? "bg-[color:var(--btq-rosa-bg)] text-[color:var(--btq-rosa)]" : "bg-[color:var(--btq-lila-bg)] text-[color:var(--btq-lila)]"}`}>{s.stock === 0 ? "Agotado" : "Última"}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
            <Tarjeta>
              <p className={`${SERIF} text-[17px] font-bold`}>Lo más mirado en VORDIA Closet</p>
              <p className={`text-[12px] ${TEXTO_SUAVE}`}>Lo que las clientas buscan: tenelo siempre en stock</p>
              <ol className="mt-3 space-y-2.5">
                {panel.masVistas.map((p, i) => (
                  <li key={p.prendaId} className="flex items-center gap-3 text-[13px]">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#FF3DC8]/30 bg-[#FF3DC8]/10 text-[11px] font-bold text-[#FF8ADF]">{i + 1}</span>
                    <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ background: p.colorHex ?? "#C9A7EB" }} />
                    <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                    <span className={`tabular-nums ${TEXTO_SUAVE}`}>{p.vistas} vistas</span>
                  </li>
                ))}
              </ol>
            </Tarjeta>
          </div>
        </>
      )}
    </div>
  );
}
