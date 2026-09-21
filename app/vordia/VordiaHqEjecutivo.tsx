"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Coins,
  Handshake,
  Layers,
  Package,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatGs } from "./VordiaClientesPage";
import { formatCompact, formatDelta, type HqDash } from "./hqModel";

type Props = {
  d: HqDash;
  nombre: string;
  saludo: string;
  clientesN: number;
  onNavigate: (v: string) => void;
};

const CARD = "rounded-[10px] border border-[#16324d] bg-[#071A2E] hover:border-[#1e4a73] transition-colors";
const MUTED = "text-[#8BA0B8]";
const GREEN = "text-[#16D98B]";
const RED = "text-[#FF4D5A]";

function Delta({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? GREEN : RED}`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {formatDelta(pct)}
    </span>
  );
}

function Ring({ pct, size = 36 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#12324a" strokeWidth="3.5" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#1687FF"
        strokeWidth="3.5"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Ico({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: "blue" | "green" | "red" | "amber" | "cyan" }) {
  const map = {
    blue: "text-[#4DA3FF] bg-[#1687FF]/12",
    green: "text-[#16D98B] bg-[#16D98B]/12",
    red: "text-[#FF4D5A] bg-[#FF4D5A]/12",
    amber: "text-[#F5B83D] bg-[#F5B83D]/12",
    cyan: "text-[#00C8FF] bg-[#00C8FF]/12",
  };
  return (
    <span className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${map[tone]}`}>
      <Icon size={14} />
    </span>
  );
}

function LinkMini({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 text-[11px] ${MUTED} hover:text-white`}>
      {label} <ArrowRight size={11} />
    </button>
  );
}

function CashChart({ puntos, ultimo }: { puntos: { label: string; valor: number }[]; ultimo: number }) {
  const W = 640;
  const H = 168;
  const vals = puntos.map((p) => p.valor);
  const min = Math.min(...vals) * 0.82;
  const max = Math.max(...vals) * 1.08;
  const rango = max - min || 1;
  const pts = puntos.map((p, i) => {
    const x = puntos.length > 1 ? (i / (puntos.length - 1)) * W : 0;
    const y = H - ((p.valor - min) / rango) * H;
    return { x, y, ...p };
  });
  const linea = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = `${linea} L${W},${H} L0,${H} Z`;
  const ticks = [600, 450, 300, 150].map((v) => `Gs. ${v} M`);

  return (
    <div className="flex gap-2 mt-2">
      <div className="flex flex-col justify-between text-[9px] text-[#5B7390] py-1 shrink-0 w-14 text-right">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0 relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[168px] overflow-visible">
          <defs>
            <linearGradient id="cfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1687FF" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#1687FF" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.33, 0.66, 1].map((f) => (
            <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="#12324a" strokeWidth={1} />
          ))}
          <path d={area} fill="url(#cfFill)" />
          <path d={linea} fill="none" stroke="#2EA0FF" strokeWidth={2.4} strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4.2 : 2.6} fill="#7EC8FF" />
          ))}
        </svg>
        {last && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full rounded-md border border-[#1e4a73] bg-[#0A1E33] px-2 py-1 text-right shadow-lg"
            style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100 - 6}%` }}
          >
            <p className="text-[11px] font-semibold text-white leading-none">{formatGs(ultimo)}</p>
            <p className="text-[9px] text-[#8BA0B8] mt-0.5">
              {new Date().toLocaleDateString("es-PY", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        )}
        <div className="flex justify-between text-[9px] text-[#5B7390] mt-1">
          {puntos.map((p) => (
            <span key={p.label}>{p.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinCard({
  icon,
  tone,
  label,
  value,
  extra,
  onClick,
}: {
  icon: LucideIcon;
  tone: "blue" | "green" | "red" | "amber" | "cyan";
  label: string;
  value: ReactNode;
  extra: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`${CARD} px-3 py-2.5 flex items-start gap-2.5 text-left w-full cursor-pointer`}>
      <Ico icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className={`text-[10px] ${MUTED} leading-none`}>{label}</p>
        <p className="text-[13px] font-semibold text-white mt-1 leading-tight metric-amount">{value}</p>
        <div className="mt-0.5">{extra}</div>
      </div>
    </button>
  );
}

export function VordiaHqEjecutivo({ d, nombre, saludo, clientesN, onNavigate }: Props) {
  const go = onNavigate;
  const kpis: {
    icon: LucideIcon;
    label: string;
    sub: string;
    value: ReactNode;
    delta?: number;
    pie: string;
    ring?: number;
    vista: string;
  }[] = [
    { icon: Users, label: "CRM", sub: "Clientes activos", value: d.clientesActivos, delta: d.deltaClientes, pie: "vs. mes anterior", vista: "vordia_pipeline" },
    { icon: Package, label: "Productos", sub: "Productos activos", value: d.productosActivos, delta: d.deltaProductos, pie: "vs. mes anterior", vista: "vordia_productos" },
    { icon: Layers, label: "Proyectos", sub: "Proyectos en curso", value: d.proyectosCurso, delta: d.deltaProyectos, pie: "vs. mes anterior", vista: "vordia_proyectos" },
    { icon: Target, label: "Objetivos", sub: "Objetivos del período", value: d.objetivosN, ring: d.objetivosPct, pie: "en progreso", vista: "vordia_objetivos" },
    { icon: Coins, label: "Capital", sub: "Capital disponible", value: formatGs(d.capitalDisp), delta: d.deltaCapital, pie: "vs. mes anterior", vista: "vordia_capital" },
    { icon: Users, label: "Vendedores", sub: "Vendedores activos", value: d.vendedoresN, delta: d.deltaVendedores, pie: "vs. mes anterior", vista: "vordia_vendedores" },
    { icon: Handshake, label: "Alianzas estratégicas", sub: "Alianzas activas", value: d.alianzasN, delta: d.deltaAlianzas, pie: "vs. mes anterior", vista: "vordia_alianzas" },
  ];

  const port = [
    { t: "Operativos", n: d.portafolio.operativos, c: "text-[#16D98B]" },
    { t: "Desarrollo", n: d.portafolio.desarrollo, c: "text-[#4DA3FF]" },
    { t: "Testing", n: d.portafolio.testing, c: "text-[#00C8FF]" },
    { t: "Planificados", n: d.portafolio.planificados, c: "text-[#F5B83D]" },
    { t: "Pausados", n: d.portafolio.pausados, c: "text-[#FF4D5A]" },
  ];

  const dots: Record<string, string> = { red: "bg-[#FF4D5A]", orange: "bg-[#F59E3B]", yellow: "bg-[#F5B83D]" };

  return (
    <div className="space-y-3 lg:space-y-3.5 pb-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] lg:text-[28px] font-semibold text-white tracking-tight leading-none">
            ¡{saludo}, {nombre}!
          </h2>
          <p className={`mt-2 text-[12px] ${MUTED}`}>
            Centro ejecutivo VORDIA HQ · {clientesN} clientes · fuente única de verdad operativa y financiera.
          </p>
        </div>
        <p className="hidden lg:block text-right text-[9px] font-semibold tracking-[0.22em] text-[#5B7390] leading-relaxed uppercase shrink-0">
          Decisiones hoy.
          <br />
          Un mayor mañana.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-2">
        {kpis.map((k) => (
          <button type="button" key={k.label} onClick={() => go(k.vista)} className={`${CARD} px-3 py-2.5 text-left cursor-pointer`}>
            <div className="flex items-center gap-2">
              <Ico icon={k.icon} />
              <p className={`text-[11px] font-medium text-white truncate`}>{k.label}</p>
            </div>
            <p className={`text-[10px] ${MUTED} mt-2`}>{k.sub}</p>
            <div className="flex items-end justify-between gap-1 mt-0.5">
              <p className="text-[22px] font-semibold text-white leading-none metric-amount">{k.value}</p>
              {k.ring != null ? (
                <span className="relative">
                  <Ring pct={k.ring} />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-[#7EC8FF]">
                    {k.ring}%
                  </span>
                </span>
              ) : (
                <Delta pct={k.delta ?? null} />
              )}
            </div>
            <p className={`text-[9px] ${MUTED} mt-1`}>{k.pie}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2.5">
        <button type="button" onClick={() => go("vordia_caja")} className={`${CARD} p-3.5 text-left cursor-pointer`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ico icon={BarChart3} />
              <h3 className="text-[14px] font-semibold text-white">Flujo de caja</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md border border-[#16324d] px-2 py-1 text-[10px] text-[#8BA0B8]">
              Últimos 30 días
              <span className="text-[8px]">▾</span>
            </span>
          </div>
          <CashChart puntos={d.puntos} ultimo={d.saldoActual} />
          <div className="flex items-center justify-center gap-5 mt-3 text-[10px] text-[#8BA0B8]">
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-[#16D98B]" /> Entradas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-[#FF4D5A]" /> Salidas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-[#2EA0FF]" /> Saldo
            </span>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <FinCard
            icon={BarChart3}
            tone="green"
            label="Ingresos facturados"
            onClick={() => go("vordia_ingresos")}
            value={formatGs(d.facturado)}
            extra={
              <p className="text-[10px]">
                <Delta pct={d.deltaFacturado} /> <span className={MUTED}>vs. mes anterior</span>
              </p>
            }
          />
          <FinCard
            icon={Wallet}
            tone="cyan"
            label="Ingresos cobrados"
            onClick={() => go("vordia_cxc")}
            value={formatGs(d.cobradoMes)}
            extra={
              <p className="text-[10px]">
                <Delta pct={d.deltaCobrado} /> <span className={MUTED}>vs. mes anterior</span>
              </p>
            }
          />
          <FinCard
            icon={Briefcase}
            tone="red"
            label="Gastos pagados"
            onClick={() => go("vordia_cxp")}
            value={formatGs(d.pagadoMes)}
            extra={
              <p className="text-[10px]">
                <Delta pct={d.deltaPagado} /> <span className={MUTED}>vs. mes anterior</span>
              </p>
            }
          />
          <FinCard
            icon={TrendingUp}
            tone="green"
            label="Resultado del mes"
            onClick={() => go("vordia_finanzas_resumen")}
            value={formatGs(d.resultado)}
            extra={
              <p className="text-[10px]">
                <Delta pct={d.deltaResultado} /> <span className={MUTED}>vs. mes anterior</span>
              </p>
            }
          />
          <FinCard
            icon={Clock}
            tone="green"
            label="Por cobrar"
            onClick={() => go("vordia_cxc")}
            value={formatGs(d.porCobrar)}
            extra={<p className={`text-[10px] ${MUTED}`}>{d.facturasPend} facturas</p>}
          />
          <FinCard
            icon={AlertTriangle}
            tone="red"
            label="Vencido"
            onClick={() => go("vordia_cxc")}
            value={formatGs(d.vencidoGs)}
            extra={<p className={`text-[10px] ${MUTED}`}>{d.facturasVenc} facturas</p>}
          />
          <FinCard
            icon={Wallet}
            tone="amber"
            label="Por pagar"
            onClick={() => go("vordia_cxp")}
            value={formatGs(d.porPagar)}
            extra={<p className={`text-[10px] ${MUTED}`}>{d.obligaciones} obligaciones</p>}
          />
          <FinCard
            icon={CalendarDays}
            tone="blue"
            label="Próximos pagos"
            onClick={() => go("vordia_cxp")}
            value={formatGs(d.proximos30)}
            extra={<p className={`text-[10px] ${MUTED}`}>Próximos 30 días</p>}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        <button type="button" onClick={() => go("vordia_productos")} className={`${CARD} p-3.5 text-left cursor-pointer`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ico icon={Package} />
              <h3 className="text-[13px] font-semibold text-white">Portafolio de productos</h3>
            </div>
            <span className={`inline-flex items-center gap-1 text-[11px] ${MUTED}`}>Ver todos <ArrowRight size={11} /></span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {port.map((p) => (
              <div key={p.t} className="text-center">
                <p className={`text-[10px] ${MUTED} leading-tight`}>{p.t}</p>
                <p className={`text-[20px] font-semibold mt-1 ${p.c}`}>{p.n}</p>
              </div>
            ))}
          </div>
        </button>
        <button type="button" onClick={() => go("vordia_pipeline")} className={`${CARD} p-3.5 text-left cursor-pointer`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ico icon={Users} />
              <h3 className="text-[13px] font-semibold text-white">Comercial</h3>
            </div>
            <span className={`inline-flex items-center gap-1 text-[11px] ${MUTED}`}>Ver CRM <ArrowRight size={11} /></span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {[
              { t: "Negociaciones abiertas", v: d.comercial.negociaciones, vista: "vordia_pipeline" },
              { t: "Pipeline total", v: formatCompact(d.comercial.pipelineTotal), vista: "vordia_pipeline" },
              { t: "Pipeline ponderado", v: formatCompact(d.comercial.pipelinePonderado), vista: "vordia_pipeline" },
              { t: "Propuestas enviadas", v: d.comercial.propuestas, vista: "vordia_propuestas" },
            ].map((x) => (
              <div
                key={x.t}
                role="link"
                onClick={(e) => {
                  e.stopPropagation();
                  go(x.vista);
                }}
              >
                <p className={`text-[10px] ${MUTED}`}>{x.t}</p>
                <p className="text-[16px] font-semibold text-white mt-0.5">{x.v}</p>
              </div>
            ))}
          </div>
        </button>
        <div className={`${CARD} p-3.5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ico icon={Layers} />
              <h3 className="text-[13px] font-semibold text-white">Operación</h3>
            </div>
            <LinkMini label="Ver proyectos" onClick={() => go("vordia_proyectos")} />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {[
              { t: "Proyectos activos", n: d.operacion.proyectos, c: "text-white", vista: "vordia_proyectos" },
              { t: "Tareas pendientes", n: d.operacion.pendientes, c: "text-white", vista: "vordia_tareas" },
              { t: "Tareas vencidas", n: d.operacion.vencidas, c: RED, vista: "vordia_tareas" },
              { t: "Implementaciones", n: d.operacion.implementaciones, c: "text-white", vista: "vordia_productos" },
            ].map((x) => (
              <button type="button" key={x.t} onClick={() => go(x.vista)} className="text-left">
                <p className={`text-[10px] ${MUTED}`}>{x.t}</p>
                <p className={`text-[16px] font-semibold mt-0.5 ${x.c}`}>{x.n}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.95fr)] gap-2.5">
        <div className={`${CARD} p-3.5`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Ico icon={AlertTriangle} tone="red" />
              <h3 className="text-[13px] font-semibold text-white">Requiere atención</h3>
            </div>
            <LinkMini label="Ver todas" onClick={() => go("vordia_tareas")} />
          </div>
          <div className="space-y-2">
            {d.atencion.map((a) => (
              <button type="button" key={a.texto} onClick={() => go(a.vista || "vordia_tareas")} className="w-full flex items-start gap-2 text-left hover:bg-white/[0.03] rounded-md px-0.5 py-0.5">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dots[a.color]}`} />
                <p className="flex-1 text-[12px] text-[#D5DEE8] leading-snug">{a.texto}</p>
                <span className={`text-[11px] shrink-0 ${a.cuando === "Hoy" ? "text-[#4DA3FF]" : a.cuando.includes("Hace") ? RED : MUTED}`}>
                  {a.cuando}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={`${CARD} p-3.5`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Ico icon={CheckCircle2} tone="green" />
              <h3 className="text-[13px] font-semibold text-white">Próximas acciones</h3>
            </div>
            <LinkMini label="Ver calendario" onClick={() => go("vordia_tareas")} />
          </div>
          <div className="space-y-2">
            {d.proximas.map((a) => (
              <button type="button" key={a.titulo} onClick={() => go("vordia_tareas")} className="w-full flex items-center gap-2 text-left hover:bg-white/[0.03] rounded-md px-0.5 py-0.5">
                <Circle size={14} className="text-[#3d5a78] shrink-0" />
                <p className="flex-1 text-[12px] text-white truncate">{a.titulo}</p>
                <span className={`text-[11px] shrink-0 ${String(a.cuando).startsWith("Hoy") ? "text-[#4DA3FF]" : MUTED}`}>
                  {a.cuando}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={`${CARD} p-3.5`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Ico icon={BarChart3} tone="cyan" />
              <h3 className="text-[13px] font-semibold text-white">VORDIA Health</h3>
            </div>
            <LinkMini label="Ver detalles" onClick={() => go("vordia_reportes")} />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Ring pct={d.health.total} size={88} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-semibold text-white leading-none">{d.health.total}</span>
                <span className={`text-[9px] ${MUTED}`}>/ 100</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {([
                ["Finanzas", d.health.finanzas, "vordia_finanzas_resumen"],
                ["Clientes", d.health.clientes, "vordia_clientes"],
                ["Comercial", d.health.comercial, "vordia_pipeline"],
                ["Productos", d.health.productos, "vordia_productos"],
                ["Operaciones", d.health.operaciones, "vordia_proyectos"],
              ] as const).map(([lab, n, vista]) => (
                <button type="button" key={lab} onClick={() => go(vista)} className="w-full flex items-center gap-2 text-left">
                  <span className={`w-[72px] text-[10px] ${MUTED}`}>{lab}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#0C2438] overflow-hidden">
                    <div className="h-full rounded-full bg-[#16D98B]" style={{ width: `${n}%` }} />
                  </div>
                  <span className="w-6 text-right text-[10px] text-[#16D98B] font-semibold">{n}</span>
                </button>
              ))}
            </div>
          </div>
          <p className={`text-[10px] ${GREEN} mt-3`}>Sistema operativo en buen estado</p>
          <div className={`flex justify-between text-[9px] ${MUTED} mt-1`}>
            <span>Todas las operaciones funcionando correctamente</span>
            <span>
              Última actualización: hoy{" "}
              {new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
