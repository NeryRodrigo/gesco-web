"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarHeart, Eye, Gem, LayoutDashboard, Loader2, LogOut, MessageCircle, Shirt, ShoppingBag, Sparkles, Store, Users, Wand2,
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

const NAV: { id: Vista; label: string; icon: React.ReactNode }[] = [
  { id: "panel", label: "Hoy", icon: <LayoutDashboard size={17} /> },
  { id: "caja", label: "Vender", icon: <ShoppingBag size={17} /> },
  { id: "prendas", label: "Prendas y stock", icon: <Shirt size={17} /> },
  { id: "agenda", label: "Alquileres y pruebas", icon: <CalendarHeart size={17} /> },
  { id: "clientas", label: "Clientas", icon: <Users size={17} /> },
  { id: "vidriera", label: "Mi vidriera", icon: <Store size={17} /> },
];

export type ContextoBoutique = {
  empresaId: number;
  prendas: BtqPrendaFila[];
  perfil: BtqPerfil | null;
  recargar: () => void;
  version: number;
  ir: (v: Vista) => void;
};

/**
 * VORDIA BOUTIQUE. Pantalla completa para boutiques (rubro BOUTIQUE);
 * con `embebido` se muestra dentro de VORDIA HQ como demo para el equipo.
 */
export default function BoutiqueApp({ embebido = false, onLogout }: { embebido?: boolean; onLogout?: () => void }) {
  // La sesión ya está en el navegador cuando se monta (la app se muestra después del login)
  const [sesion] = useState(() => loadVordiaSession()?.user ?? {});
  const [empresaId, setEmpresaId] = useState(() =>
    String(sesion.rubro ?? sesion.Rubro ?? "").toUpperCase() === "BOUTIQUE" ? Number(sesion.empresaId ?? sesion.EmpresaId ?? 0) : 0,
  );
  const usuario = String(sesion.nombre ?? sesion.Nombre ?? "");
  const [vista, setVista] = useState<Vista>("panel");
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

  const ctx: ContextoBoutique | null = empresaId && prendas ? { empresaId, prendas, perfil, recargar, version, ir: setVista } : null;
  const nombreTienda = perfil?.nombreComercial || "Tu boutique";

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
      <div className={`${fraunces.variable} ${FONDO} -m-4 min-h-[80dvh] space-y-4 rounded-3xl p-4 sm:-m-6 sm:p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${TEXTO_SUAVE}`}>VORDIA BOUTIQUE · demo</p>
            <h1 className={`${SERIF} text-[28px] font-semibold`}>{nombreTienda}</h1>
          </div>
          <a href="/closet" target="_blank" rel="noreferrer" className={BOTON}><Sparkles size={15} /> Ver VORDIA CLOSET</a>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => setVista(n.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] ${vista === n.id ? "border-transparent bg-[#2B1B3D] text-white" : "border-[#E6D6F2] bg-white/70 text-[#4A3466]"}`}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        {contenido}
      </div>
    );
  }

  return (
    <div className={`${fraunces.variable} ${FONDO} min-h-dvh lg:flex`}>
      {/* Menú lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[#EBDDF5] bg-white/55 p-5 backdrop-blur lg:flex">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-10 w-10 place-items-center rounded-2xl ${DEGRADE} text-white shadow-lg`}><Gem size={19} /></span>
          <div>
            <p className={`${SERIF} text-[17px] font-semibold leading-tight`}>{nombreTienda}</p>
            <p className={`text-[11px] uppercase tracking-[0.18em] ${TEXTO_SUAVE}`}>VORDIA BOUTIQUE</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setVista(n.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] transition ${vista === n.id ? "bg-[#2B1B3D] text-white shadow-lg" : "text-[#4A3466] hover:bg-white"}`}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {perfil?.slug && (
            <a href={`/closet/${perfil.slug}`} target="_blank" rel="noreferrer" className={`${BOTON} w-full`}><Eye size={15} /> Ver mi vidriera</a>
          )}
          <p className={`truncate text-center text-[12px] ${TEXTO_SUAVE}`}>{usuario}</p>
          {onLogout && <button type="button" onClick={onLogout} className={`${BOTON} w-full`}><LogOut size={15} /> Salir</button>}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Encabezado (celular) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#EBDDF5] bg-[#FFF5FB]/85 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${DEGRADE} text-white`}><Gem size={17} /></span>
            <p className={`${SERIF} truncate text-[17px] font-semibold`}>{nombreTienda}</p>
          </div>
          {onLogout && <button type="button" onClick={onLogout} className="rounded-full p-2 text-[#7A6690]" aria-label="Salir"><LogOut size={18} /></button>}
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">{contenido}</main>

        {/* Barra inferior (celular) */}
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[#EBDDF5] bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => setVista(n.id)} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${vista === n.id ? "text-[#B0135E]" : "text-[#7A6690]"}`}>
              {n.icon}
              <span className="max-w-full truncate px-0.5">{n.label.split(" ")[0]}</span>
            </button>
          ))}
        </nav>
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-[13px] ${TEXTO_SUAVE}`}>{new Date().toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className={`${SERIF} text-[30px] font-semibold leading-tight sm:text-[34px]`}>
            {saludo()}{nombre ? `, ${nombre}` : ""} <span className="italic text-[#C77DD8]">✦</span>
          </h1>
        </div>
        <button type="button" onClick={() => ctx.ir("caja")} className={BOTON_PRIMARIO}><ShoppingBag size={16} /> Nueva venta</button>
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
            <Kpi label="Vendido hoy" valor={gsCorto(panel.ventasHoy)} nota={`${panel.cantidadHoy} venta${panel.cantidadHoy === 1 ? "" : "s"}`} tono="bien" />
            <Kpi label="Este mes" valor={gsCorto(panel.ventasMes)} nota={`${panel.cantidadMes} ventas`} />
            <Kpi
              label="Apartados"
              valor={String(panel.apartados)}
              nota={panel.apartados ? `Saldo por cobrar ${gsCorto(panel.saldoApartados)}` : "Sin apartados"}
              tono={panel.apartadosVencidos ? "alerta" : "normal"}
            />
            <Kpi label="En el marketplace" valor={panel.vistasMarketplace.toLocaleString("es-PY")} nota="vistas de tus prendas" icono={<Eye size={15} />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Tarjeta>
              <p className={`${SERIF} text-[19px] font-semibold`}>Para hacer hoy</p>
              <ul className="mt-3 space-y-2">
                {pedidas.map((p) => (
                  <li key={p.prueba.pruebaId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#FFF1F7] px-3.5 py-2.5">
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
                  <li className="flex items-center justify-between gap-2 rounded-2xl bg-[#FFF1F7] px-3.5 py-2.5">
                    <p className="text-[13.5px]"><b>{panel.apartadosVencidos} apartado{panel.apartadosVencidos === 1 ? "" : "s"} vencido{panel.apartadosVencidos === 1 ? "" : "s"}</b>: cobrá el saldo o liberá la prenda.</p>
                    <button type="button" onClick={() => ctx.ir("caja")} className={BOTON}>Ver</button>
                  </li>
                )}
                {panel.alquileresSemana > 0 && (
                  <li className="flex items-center justify-between gap-2 rounded-2xl bg-[#F4EEFF] px-3.5 py-2.5">
                    <p className="text-[13.5px]"><b>{panel.alquileresSemana} alquiler{panel.alquileresSemana === 1 ? "" : "es"}</b> se retira{panel.alquileresSemana === 1 ? "" : "n"} o vuelve{panel.alquileresSemana === 1 ? "" : "n"} esta semana.</p>
                    <button type="button" onClick={() => ctx.ir("agenda")} className={BOTON}>Agenda</button>
                  </li>
                )}
                {pedidas.length === 0 && !panel.apartadosVencidos && !panel.alquileresSemana && (
                  <li className={`rounded-2xl bg-white px-3.5 py-3 text-[13px] ${TEXTO_SUAVE}`}>Todo al día. Las pruebas que pidan desde el marketplace aparecen acá.</li>
                )}
              </ul>
            </Tarjeta>

            <Tarjeta>
              <p className={`${SERIF} text-[19px] font-semibold`}>Por dónde vendés</p>
              <p className={`text-[12px] ${TEXTO_SUAVE}`}>Lo cobrado este mes por canal</p>
              <div className="mt-3 space-y-2.5">
                {panel.porCanal.length === 0 && <p className={`text-[13px] ${TEXTO_SUAVE}`}>Todavía no hay ventas este mes.</p>}
                {[...panel.porCanal].sort((a, b) => b.total - a.total).map((c) => (
                  <div key={c.canal}>
                    <div className="flex justify-between text-[13px]"><span>{c.canal}</span><span className="tabular-nums font-semibold">{gs(c.total)}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-[#F3E9FF]"><div className={`h-2 rounded-full ${DEGRADE}`} style={{ width: `${(c.total / maxCanal) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </Tarjeta>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta>
              <p className={`${SERIF} text-[19px] font-semibold`}>Se están terminando</p>
              <p className={`text-[12px] ${TEXTO_SUAVE}`}>Talles con 1 o ninguna unidad: reponé antes de perder la venta</p>
              <ul className="mt-3 divide-y divide-[#F1E6FA]">
                {panel.sinStock.length === 0 && <li className={`py-2 text-[13px] ${TEXTO_SUAVE}`}>Nada por reponer.</li>}
                {panel.sinStock.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                    <span className="min-w-0 truncate">{s.nombre} · <b>{s.talle}</b> · {s.color}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${s.stock === 0 ? "bg-[#FFE3F0] text-[#B0135E]" : "bg-[#F4EEFF] text-[#5B3DB0]"}`}>{s.stock === 0 ? "Agotado" : "Última"}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
            <Tarjeta>
              <p className={`${SERIF} text-[19px] font-semibold`}>Lo más mirado en VORDIA CLOSET</p>
              <p className={`text-[12px] ${TEXTO_SUAVE}`}>Lo que las clientas buscan: tenelo siempre en stock</p>
              <ol className="mt-3 space-y-2">
                {panel.masVistas.map((p, i) => (
                  <li key={p.prendaId} className="flex items-center gap-3 text-[13px]">
                    <span className={`${SERIF} w-5 text-[18px] text-[#C77DD8]`}>{i + 1}</span>
                    <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ background: p.colorHex ?? "#C9A7EB" }} />
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
