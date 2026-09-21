"use client";

import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckSquare,
  Handshake,
  Package,
  Rocket,
  Settings,
  Target,
  Users,
} from "lucide-react";
import { formatCompact, formatDelta, goProductoExterno, type HqDash } from "./hqModel";

const LOGO: Record<string, string> = {
  HQ: "/images/vordia-products/hq.png",
  HABITAT: "/images/vordia-products/habitat.png",
  STAY: "/images/vordia-products/stay.png",
  AGRO: "/images/vordia-products/agro.png",
  DINE: "/images/vordia-products/dine.png",
  RETAIL: "/images/vordia-products/retail.png",
};

type Props = {
  d: HqDash;
  onNavigate: (v: string) => void;
};

const CARD = "rounded-[10px] border border-[#16324d] bg-[#071A2E]";
const MUTED = "text-[#8BA0B8]";
const GREEN = "text-[#16D98B]";
const RED = "text-[#FF4D5A]";
const BLUE = "text-[#4DA3FF]";
const AMBER = "text-[#F5B83D]";

function pill(estado: string) {
  const e = estado.toLowerCase();
  if (/operativ|activ|tiempo/.test(e)) return "text-[#16D98B]";
  if (/desarrollo|negoci/.test(e)) return "text-[#F5B83D]";
  if (/prueba|convers|camino/.test(e)) return "text-[#4DA3FF]";
  if (/planif/.test(e)) return "text-[#A78BFA]";
  if (/atras|riesgo/.test(e)) return "text-[#F5B83D]";
  if (/bloque/.test(e)) return "text-[#FF4D5A]";
  return "text-[#8BA0B8]";
}

export function VordiaHqGestion({ d, onNavigate }: Props) {
  const go = onNavigate;
  const toneCuando = (t: string) =>
    t === "Hoy" || t.startsWith("Hoy") ? BLUE : t === "Atrasada" || t.includes("Atras") ? RED : MUTED;

  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-md bg-[#1687FF]/12 text-[#4DA3FF] flex items-center justify-center">
            <BarChart3 size={16} />
          </span>
          <div>
            <h2 className="text-[22px] font-semibold text-white leading-none">Gestión y rendimiento</h2>
          </div>
        </div>
        <p className="hidden lg:block text-right text-[9px] font-semibold tracking-[0.2em] text-[#5B7390] uppercase leading-relaxed">
          Gestión operativa
          <br />
          que impulsa crecimiento
        </p>
      </div>

      <section className={`${CARD} p-3.5`}>
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[#4DA3FF]" />
          <h3 className="text-[14px] font-semibold text-white">Comercial y clientes</h3>
          <span className={`text-[11px] ${MUTED}`}>Ventas, equipo y relaciones comerciales</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => go("vordia_pipeline")}
            className="rounded-[10px] border border-[#16324d] bg-[#061426] p-3.5 text-left cursor-pointer hover:border-[#1e4a73]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-[#4DA3FF]" />
                <p className="text-[12px] text-white">Oportunidades de venta</p>
              </div>
              <span className={`text-[11px] font-semibold ${GREEN}`}>↑ {formatDelta(d.deltaPipeline)}</span>
            </div>
            <p className="text-[28px] font-semibold text-white mt-2 leading-none">{formatCompact(d.pipelineMonto)}</p>
            <p className={`text-[10px] ${MUTED} mt-1 mb-3`}>vs. mes anterior</p>
            <div className="flex justify-between text-[12px]">
              <span>
                <b className="text-white">{d.abiertas}</b> <span className={MUTED}>oportunidades abiertas</span>
              </span>
              <span>
                <b className="text-white">{d.conversion}%</b> <span className={MUTED}>tasa de conversión</span>
              </span>
            </div>
            <span className={`mt-3 text-[11px] ${MUTED} inline-flex items-center gap-1`}>
              Ver oportunidades <ArrowRight size={11} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => go("vordia_vendedores")}
            className="rounded-[10px] border border-[#16324d] bg-[#061426] p-3.5 text-left cursor-pointer hover:border-[#1e4a73]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#4DA3FF]" />
                <p className="text-[12px] text-white">Vendedores</p>
              </div>
              <span className={`text-[11px] font-semibold ${GREEN}`}>↑ +7,7%</span>
            </div>
            <p className="text-[22px] font-semibold text-white mt-2 leading-none">
              {d.vendedoresN || d.vendedores.length} <span className="text-[13px] font-medium text-[#8BA0B8]">activos</span>
            </p>
            <p className={`text-[10px] ${MUTED} mt-1 mb-2`}>vs. mes anterior</p>
            <p className="text-[12px] text-white mb-2">
              {d.metaEquipo}% <span className={MUTED}>de la meta</span>
            </p>
            <div className="space-y-1.5">
              {d.vendedores.map((v) => (
                <div key={v.nombre} className="flex items-center gap-2">
                  <span className={`w-20 truncate text-[11px] ${MUTED}`}>{v.nombre}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#0C2438] overflow-hidden">
                    <div className="h-full rounded-full bg-[#1687FF]" style={{ width: `${Math.min(100, v.pct)}%` }} />
                  </div>
                  <span className="text-[10px] text-white w-8 text-right">{v.pct}%</span>
                </div>
              ))}
            </div>
            <span className={`mt-3 text-[11px] ${MUTED} inline-flex items-center gap-1`}>
              Ver vendedores <ArrowRight size={11} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => go("vordia_clientes")}
            className="rounded-[10px] border border-[#16324d] bg-[#061426] p-3.5 text-left cursor-pointer hover:border-[#1e4a73]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#4DA3FF]" />
                <p className="text-[12px] text-white">Clientes</p>
              </div>
              <span className={`text-[11px] font-semibold ${GREEN}`}>↑ {formatDelta(d.deltaClientes)}</span>
            </div>
            <p className="text-[22px] font-semibold text-white mt-2 leading-none">
              {d.clientesActivos} <span className="text-[13px] font-medium text-[#8BA0B8]">activos</span>
            </p>
            <p className={`text-[10px] ${MUTED} mt-1 mb-3`}>vs. mes anterior</p>
            <div className="flex items-center justify-between text-[12px]">
              <span>
                <b className="text-white">{d.clientesNuevosMes}</b> <span className={MUTED}>nuevos este mes</span>
              </span>
              <span className={`${RED} inline-flex items-center gap-1`}>
                <AlertTriangle size={12} /> {d.seguimientosAtrasados} seguimientos atrasados
              </span>
            </div>
            <span className={`mt-3 text-[11px] ${MUTED} inline-flex items-center gap-1`}>
              Ver clientes <ArrowRight size={11} />
            </span>
          </button>
        </div>
      </section>

      <section className={`${CARD} p-3.5`}>
        <div className="flex items-center gap-2 mb-3">
          <Package size={14} className="text-[#4DA3FF]" />
          <h3 className="text-[14px] font-semibold text-white">Productos y proyectos</h3>
          <span className={`text-[11px] ${MUTED}`}>Estado de productos y proyectos en desarrollo</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <div className="rounded-[10px] border border-[#16324d] bg-[#061426] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-white">Productos VORDIA</p>
              <button type="button" onClick={() => go("vordia_productos")} className={`text-[11px] ${MUTED} hover:text-white inline-flex items-center gap-1`}>
                Ver todos <ArrowRight size={11} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2 text-[10px]">
              <span className={GREEN}>● {d.prodCounts.operativo} Operativo</span>
              <span className={AMBER}>● {d.prodCounts.desarrollo} En desarrollo</span>
              <span className={BLUE}>● {d.prodCounts.pruebas} En pruebas</span>
              <span className="text-[#A78BFA]">● {d.prodCounts.planificado} Planificado</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] ${MUTED}`}>
                  <th className="pb-1.5 font-medium">Producto</th>
                  <th className="pb-1.5 font-medium">Estado</th>
                  <th className="pb-1.5 font-medium">Próximo hito</th>
                </tr>
              </thead>
              <tbody>
                {d.productos.map((p) => (
                  <tr
                    key={p.nombre}
                    className="border-t border-white/5 cursor-pointer hover:bg-white/[0.03]"
                    onClick={() => goProductoExterno(p.codigo, go)}
                  >
                    <td className="py-1.5 text-[12px] text-white">
                      <span className="inline-flex items-center gap-2">
                        {LOGO[p.codigo?.toUpperCase()] && (
                          <span className="relative h-6 w-6 shrink-0">
                            <Image src={LOGO[p.codigo.toUpperCase()]} alt="" fill sizes="24px" className="object-contain" />
                          </span>
                        )}
                        {p.nombre}
                      </span>
                    </td>
                    <td className={`py-1.5 text-[11px] ${pill(p.estado)}`}>● {p.estado}</td>
                    <td className={`py-1.5 text-[11px] ${MUTED}`}>
                      {p.hito} <span className="ml-2">{p.fecha}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-[10px] border border-[#16324d] bg-[#061426] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-white">Proyectos en marcha</p>
              <button type="button" onClick={() => go("vordia_proyectos")} className={`text-[11px] ${MUTED} hover:text-white inline-flex items-center gap-1`}>
                Ver todos <ArrowRight size={11} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2 text-[10px]">
              <span className={BLUE}>● {d.operacion.proyectos} activos</span>
              <span className={GREEN}>● {d.prodCounts.tiempo} en tiempo</span>
              <span className={AMBER}>● {d.prodCounts.atraso} atrasado</span>
              <span className={RED}>● {d.prodCounts.bloqueado} bloqueado</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] ${MUTED}`}>
                  <th className="pb-1.5 font-medium">Proyecto</th>
                  <th className="pb-1.5 font-medium">Responsable</th>
                  <th className="pb-1.5 font-medium">Próximo hito</th>
                  <th className="pb-1.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {d.proyectosLista.map((p) => (
                  <tr
                    key={p.titulo}
                    className="border-t border-white/5 cursor-pointer hover:bg-white/[0.03]"
                    onClick={() => go("vordia_proyectos")}
                  >
                    <td className="py-1.5 text-[12px] text-white max-w-[140px] truncate">{p.titulo}</td>
                    <td className={`py-1.5 text-[11px] ${MUTED}`}>{p.responsable}</td>
                    <td className={`py-1.5 text-[11px] ${MUTED}`}>{p.hito}</td>
                    <td className={`py-1.5 text-[11px] ${pill(p.estado)}`}>● {p.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={`${CARD} p-3.5`}>
        <div className="flex items-center gap-2 mb-3">
          <Settings size={14} className="text-[#4DA3FF]" />
          <h3 className="text-[14px] font-semibold text-white">Ejecución y alianzas</h3>
          <span className={`text-[11px] ${MUTED}`}>Productividad del equipo y colaboración estratégica</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <div className="rounded-[10px] border border-[#16324d] bg-[#061426] p-3">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare size={14} className="text-[#4DA3FF]" />
              <p className="text-[12px] font-semibold text-white">Tareas del equipo</p>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div>
                <p className="text-[18px] font-semibold text-white">{d.tareas.abiertas}</p>
                <p className={`text-[10px] ${MUTED}`}>abiertas</p>
              </div>
              <div>
                <p className="text-[18px] font-semibold text-[#4DA3FF]">{d.tareas.curso}</p>
                <p className={`text-[10px] ${MUTED}`}>en curso</p>
              </div>
              <div>
                <p className={`text-[18px] font-semibold ${RED}`}>{d.tareas.atrasadas}</p>
                <p className={`text-[10px] ${MUTED}`}>atrasadas</p>
              </div>
              <div>
                <p className="text-[18px] font-semibold text-white">{d.tareas.hechasPct}%</p>
                <p className={`text-[10px] ${GREEN}`}>↑ +{d.tareas.deltaHechas}% vs. semana anterior</p>
              </div>
            </div>
            <p className={`text-[10px] ${MUTED} mb-1`}>Tareas prioritarias</p>
            {d.tareas.lista.map((t) => (
              <button
                key={t.titulo}
                type="button"
                onClick={() => go("vordia_tareas")}
                className="w-full flex items-center gap-2 py-1.5 text-left"
              >
                <span className="h-3.5 w-3.5 rounded-full border border-[#3d5a78] shrink-0" />
                <span className="flex-1 text-[12px] text-white truncate">{t.titulo}</span>
                <span className={`w-20 truncate text-[11px] ${MUTED}`}>{t.quien}</span>
                <span className={`text-[11px] ${toneCuando(t.cuando)}`}>{t.cuando}</span>
              </button>
            ))}
          </div>

          <div className="rounded-[10px] border border-[#16324d] bg-[#061426] p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Handshake size={14} className="text-[#4DA3FF]" />
                <p className="text-[12px] font-semibold text-white">Alianzas estratégicas</p>
              </div>
              <button type="button" onClick={() => go("vordia_alianzas")} className={`text-[11px] ${MUTED} hover:text-white inline-flex items-center gap-1`}>
                Ver alianzas <ArrowRight size={11} />
              </button>
            </div>
            <div className="flex items-center gap-6 mb-3 text-[12px]">
              <span>
                <b className="text-[18px] text-white">{d.alianzasMeta.activas}</b> <span className={MUTED}>activas</span>
              </span>
              <span className={MUTED}>
                {d.alianzasMeta.nuevas} nueva este mes
              </span>
              <span className={GREEN}>↑ +{d.alianzasMeta.delta}%</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] ${MUTED}`}>
                  <th className="pb-1.5 font-medium">Organización</th>
                  <th className="pb-1.5 font-medium">Estado</th>
                  <th className="pb-1.5 font-medium">Próximo paso</th>
                </tr>
              </thead>
              <tbody>
                {d.alianzasLista.map((a) => (
                  <tr
                    key={a.org}
                    className="border-t border-white/5 cursor-pointer hover:bg-white/[0.03]"
                    onClick={() => go("vordia_alianzas")}
                  >
                    <td className="py-1.5 text-[12px] text-white">{a.org}</td>
                    <td className={`py-1.5 text-[11px] ${pill(a.estado)}`}>● {a.estado}</td>
                    <td className={`py-1.5 text-[11px] ${MUTED}`}>{a.paso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={`${CARD} p-3.5`}>
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-[#4DA3FF]" />
          <h3 className="text-[14px] font-semibold text-white">Objetivos de VORDIA</h3>
          <span className={`text-[11px] ${MUTED}`}>Metas estratégicas y avances</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {d.objetivosCards.map((o) => {
            const Icon = o.titulo.toLowerCase().includes("alianza")
              ? Handshake
              : o.titulo.toLowerCase().includes("lanza")
                ? Rocket
                : Users;
            const risk = /riesgo/i.test(o.estado);
            return (
              <button
                key={o.titulo}
                type="button"
                onClick={() => go("vordia_objetivos")}
                className="text-left rounded-[10px] border border-[#16324d] bg-[#061426] p-3.5 hover:border-[#1e4a73]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-7 w-7 rounded-md bg-[#1687FF]/12 text-[#4DA3FF] flex items-center justify-center">
                    <Icon size={14} />
                  </span>
                  <p className="text-[12px] font-semibold text-white truncate">{o.titulo}</p>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <p className="text-[20px] font-semibold text-white leading-none">{o.ratio}</p>
                  <p className={`text-[12px] ${MUTED}`}>{o.pct}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-[#0C2438] overflow-hidden">
                  <div className={`h-full rounded-full ${risk ? "bg-[#F5B83D]" : "bg-[#1687FF]"}`} style={{ width: `${o.pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className={`text-[10px] ${MUTED}`}>{o.meta}</p>
                  <span className={`text-[10px] font-semibold ${risk ? AMBER : BLUE}`}>{o.estado}</span>
                </div>
                <p className={`mt-2 text-[11px] ${MUTED} inline-flex items-center gap-1`}>
                  Ver detalle <ArrowRight size={11} />
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
