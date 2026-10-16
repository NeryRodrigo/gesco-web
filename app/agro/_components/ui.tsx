"use client";

import { type ReactNode, useState } from "react";
import { Battery, Check } from "lucide-react";
import type { AgroAtencion, AgroEtapa } from "@/lib/agroApi";

/* ───────────── Formato ───────────── */

export function fmtKg(n?: number | null, dec = 1) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Number(n).toLocaleString("es-PY", { maximumFractionDigits: dec })} kg`;
}

export function fmtNum(n?: number | null, dec = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("es-PY", { maximumFractionDigits: dec });
}

/** Guaraníes abreviados para KPIs: Gs. 828,4 M */
export function fmtGs(n?: number | null, corto = false) {
  if (n == null || Number.isNaN(n)) return "—";
  const v = Number(n);
  if (corto && Math.abs(v) >= 1_000_000_000) return `Gs. ${(v / 1_000_000_000).toLocaleString("es-PY", { maximumFractionDigits: 2 })} MM`;
  if (corto && Math.abs(v) >= 1_000_000) return `Gs. ${(v / 1_000_000).toLocaleString("es-PY", { maximumFractionDigits: 1 })} M`;
  return `Gs. ${v.toLocaleString("es-PY", { maximumFractionDigits: 0 })}`;
}

export function fmtFecha(iso?: string | null, conHora = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PY", {
    day: "numeric",
    month: "short",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function hace(iso?: string | null) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(min)) return "";
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 8) return `hace ${d} d`;
  return fmtFecha(iso);
}

/** Días desde hoy a una fecha (negativo = pasado). */
export function diasHasta(iso?: string | null) {
  if (!iso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
}

/* ───────────── Estilos compartidos ───────────── */

export const FIELD =
  "h-11 bg-[#08140f] border-white/10 text-white placeholder:text-white/30 rounded-xl focus-visible:border-emerald-400/50 focus-visible:ring-emerald-400/20";
export const SELECT =
  "h-11 w-full bg-[#08140f] border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-emerald-400/50";
export const CARD = "rounded-2xl border border-white/[0.06] bg-[#0b1511]/90 shadow-[0_0_0_1px_rgba(16,185,129,0.04)]";
export const BTN_PRIMARY = "h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold gap-1.5 text-white";
export const BTN_GHOST =
  "rounded-xl bg-white/[0.06] hover:bg-emerald-600 text-white border border-white/10 gap-1.5 h-9";

export const ETAPA_LABEL: Record<AgroEtapa, string> = {
  Reproductor: "Reproductores",
  Cria: "Cría",
  Recria: "Recría",
  Engorde: "Engorde",
  Terminado: "Terminados",
  Vendido: "Vendidos",
  Baja: "Bajas",
};

export const MODULO_LABEL: Record<string, string> = {
  CRIA: "Cría",
  RECRIA: "Recría",
  FEED: "Feed",
  HEALTH: "Sanidad",
  TRACE: "Trazabilidad",
  FINANCE: "Finanzas",
  CONNECT: "Connect",
};

/* ───────────── Piezas ───────────── */

type Tone = "neutral" | "ok" | "warn" | "danger";

export function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  onClick?: () => void;
}) {
  const wrap = {
    neutral: "border-white/[0.06] bg-[#0c1612]",
    ok: "border-emerald-400/20 bg-emerald-500/[0.07]",
    warn: "border-amber-400/25 bg-amber-500/[0.08]",
    danger: "border-rose-400/25 bg-rose-500/[0.08]",
  }[tone];
  const ico = {
    neutral: "text-emerald-300 bg-emerald-500/10",
    ok: "text-emerald-300 bg-emerald-500/15",
    warn: "text-amber-300 bg-amber-500/15",
    danger: "text-rose-300 bg-rose-500/15",
  }[tone];
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 ${wrap} ${onClick ? "hover:border-emerald-400/40 transition" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/45 leading-tight">{label}</p>
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${ico}`}>{icon}</span>
      </div>
      <p className="mt-2.5 text-[1.5rem] leading-none font-semibold tracking-tight text-white tabular-nums">{value}</p>
      {hint ? <p className="mt-2 text-[11px] text-white/40 leading-snug">{hint}</p> : null}
    </Comp>
  );
}

export function Section({
  title,
  icon,
  right,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${CARD} p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
          {icon ? (
            <span className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-300 flex items-center justify-center">{icon}</span>
          ) : null}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] py-10 text-center text-sm text-white/40">{children}</div>;
}

export function Occupancy({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const bar = pct >= 95 ? "bg-rose-400" : pct >= 80 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/50 mb-1.5 tabular-nums">
        <span>
          {current} / {max} cab.
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Avance hacia el peso objetivo. */
export function Progreso({ actual, objetivo, inicio }: { actual?: number | null; objetivo?: number | null; inicio?: number | null }) {
  if (!actual || !objetivo) return null;
  const base = inicio && inicio < objetivo ? inicio : 0;
  const pct = Math.max(0, Math.min(100, Math.round(((actual - base) / (objetivo - base)) * 100)));
  return (
    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden" title={`${pct}% del objetivo`}>
      <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-300" : "bg-emerald-500/70"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BatteryBar({ pct }: { pct: number }) {
  const bar = pct < 25 ? "bg-rose-400" : pct < 50 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/50">
      <Battery size={12} />
      <span className="w-10 h-1 rounded-full bg-white/10 overflow-hidden">
        <span className={`block h-full ${bar}`} style={{ width: `${Math.max(4, pct)}%` }} />
      </span>
      {pct}%
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone | "info" }) {
  const cls = {
    neutral: "bg-white/5 text-white/55 border-white/10",
    ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    warn: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    danger: "bg-rose-500/15 text-rose-300 border-rose-500/20",
    info: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

const PRIORIDAD = {
  Critica: { bar: "bg-rose-500", text: "text-rose-300", border: "border-rose-500/30" },
  Alta: { bar: "bg-rose-400", text: "text-rose-300", border: "border-rose-500/20" },
  Media: { bar: "bg-amber-400", text: "text-amber-300", border: "border-white/[0.06]" },
  Baja: { bar: "bg-sky-400", text: "text-sky-300", border: "border-white/[0.06]" },
};

/** Lista "Qué requiere atención hoy". */
export function AtencionList({
  items,
  onAccion,
  vacio = "Nada urgente hoy. La operación está en orden.",
  max,
}: {
  items: AgroAtencion[];
  onAccion?: (item: AgroAtencion) => ReactNode;
  vacio?: string;
  max?: number;
}) {
  if (!items.length)
    return (
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-8 text-center">
        <Check className="mx-auto text-emerald-400 mb-2" size={22} />
        <p className="text-sm text-emerald-100/80">{vacio}</p>
      </div>
    );
  return (
    <div className="space-y-2">
      {(max ? items.slice(0, max) : items).map((a, i) => {
        const p = PRIORIDAD[a.prioridad] ?? PRIORIDAD.Media;
        return (
          <div
            key={`${a.titulo}-${i}`}
            className={`relative overflow-hidden rounded-xl border bg-[#07110d] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between ${p.border}`}
          >
            <span className={`absolute left-0 top-0 bottom-0 w-0.5 ${p.bar}`} />
            <div className="min-w-0 pl-1">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${p.text}`}>{a.prioridad}</span>
                <span className="text-[10px] uppercase tracking-wider text-white/35">{MODULO_LABEL[a.modulo] ?? a.modulo}</span>
              </div>
              <p className="text-sm font-medium text-white/95">{a.titulo}</p>
              {a.detalle ? <p className="text-[12px] text-white/40 mt-0.5">{a.detalle}</p> : null}
            </div>
            {onAccion ? <div className="shrink-0">{onAccion(a)}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── Ciclo productivo ───────────── */

const CICLO: { etapa: AgroEtapa; label: string }[] = [
  { etapa: "Cria", label: "Nacimiento / Cría" },
  { etapa: "Recria", label: "Destete / Recría" },
  { etapa: "Engorde", label: "Engorde" },
  { etapa: "Terminado", label: "Terminado" },
  { etapa: "Vendido", label: "Venta / Faena" },
];

/** Nacimiento ✓ → Cría ✓ → Recría ✓ → Engorde ● → Venta ○ */
export function CicloStepper({ etapa }: { etapa: AgroEtapa }) {
  if (etapa === "Reproductor" || etapa === "Baja") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <Pill tone={etapa === "Baja" ? "danger" : "info"}>{etapa === "Baja" ? "Baja del rodeo" : "Rodeo reproductor"}</Pill>
        <span className="text-white/40">
          {etapa === "Baja" ? "Ciclo cerrado por salida excepcional." : "Vaca madre / toro: alimenta el ciclo con nuevas pariciones."}
        </span>
      </div>
    );
  }
  const idx = CICLO.findIndex((c) => c.etapa === etapa);
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[11px]">
      {CICLO.map((c, i) => {
        const done = i < idx;
        const cur = i === idx;
        return (
          <li key={c.etapa} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border font-semibold ${
                cur
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                  : done
                    ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300/80"
                    : "border-white/10 text-white/35"
              }`}
            >
              {done ? <Check size={11} /> : <span className={`h-1.5 w-1.5 rounded-full ${cur ? "bg-emerald-300" : "bg-white/25"}`} />}
              {c.label}
            </span>
            {i < CICLO.length - 1 ? <span className="text-white/20">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── Gráficos (SVG, una serie, con tooltip) ───────────── */

const W = 600;

/** Línea de una serie con línea de referencia opcional (objetivo) y crosshair. */
export function LineChart({
  points,
  unidad = "kg",
  referencia,
  referenciaLabel,
  height = 200,
  formatX = (s: string) => fmtFecha(s),
  area = false,
}: {
  points: { x: string; y: number | null | undefined; extra?: string; objetivo?: number | null }[];
  unidad?: string;
  referencia?: number;
  referenciaLabel?: string;
  height?: number;
  formatX?: (s: string) => string;
  /** Área sombreada bajo la serie real (estilo dashboard). */
  area?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const vals = points.map((p) => p.y).filter((v): v is number => v != null);
  if (!vals.length) return <Empty>Sin datos suficientes todavía.</Empty>;
  const H = height;
  const pad = { l: 52, r: 16, t: 14, b: 26 };
  const objetivos = points.map((p) => p.objetivo).filter((v): v is number => v != null);
  const all = [...vals, ...objetivos, ...(referencia != null ? [referencia] : [])];
  const min = Math.floor((Math.min(...all) * 0.97) / 10) * 10;
  const max = Math.ceil((Math.max(...all) * 1.02) / 10) * 10;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad.t + (1 - (v - min) / Math.max(1, max - min)) * (H - pad.t - pad.b);
  const path = points
    .map((p, i) => (p.y == null ? null : `${x(i)},${y(p.y)}`))
    .filter(Boolean)
    .join(" L ");
  const ticks = [min, Math.round((min + max) / 2), max];
  const h = hover != null ? points[hover] : null;
  const paso = Math.max(1, Math.ceil(points.length / 6));
  const pathObjetivo = points
    .map((p, i) => (p.objetivo == null ? null : `${x(i)},${y(p.objetivo)}`))
    .filter(Boolean)
    .join(" L ");
  const conValor = points.map((p, i) => ({ p, i })).filter(({ p }) => p.y != null);
  const pathArea = area && conValor.length > 1
    ? `M ${x(conValor[0].i)},${H - pad.b} L ${conValor.map(({ p, i }) => `${x(i)},${y(p.y!)}`).join(" L ")} L ${x(conValor[conValor.length - 1].i)},${H - pad.b} Z`
    : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Evolución" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="rgba(255,255,255,0.4)">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        {referencia != null ? (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(referencia)} y2={y(referencia)} stroke="rgba(252,211,77,0.55)" strokeDasharray="4 4" />
            <text x={W - pad.r} y={y(referencia) - 5} textAnchor="end" fontSize="12" fill="rgba(252,211,77,0.85)">
              {referenciaLabel ?? `Objetivo ${fmtNum(referencia)} ${unidad}`}
            </text>
          </g>
        ) : null}
        <defs>
          <linearGradient id="agro-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {pathArea ? <path d={pathArea} fill="url(#agro-area)" /> : null}
        {pathObjetivo ? (
          <path d={`M ${pathObjetivo}`} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeDasharray="5 5" />
        ) : null}
        <path d={`M ${path}`} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) =>
          i === 0 || i === points.length - 1 || (i % paso === 0 && points.length - 1 - i >= paso / 2) ? (
            <text key={`l${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.4)">
              {formatX(p.x)}
            </text>
          ) : null,
        )}
        {hover != null && h?.y != null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgba(255,255,255,0.18)" />
            <circle cx={x(hover)} cy={y(h.y)} r="5" fill="#34d399" stroke="#0b1511" strokeWidth="2" />
          </g>
        ) : null}
        {points.map((_, i) => (
          <rect
            key={`h${i}`}
            x={x(i) - (W - pad.l - pad.r) / Math.max(1, points.length - 1) / 2}
            y={0}
            width={(W - pad.l - pad.r) / Math.max(1, points.length - 1)}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>
      {h && h.y != null ? (
        <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-[#07110d]/95 px-3 py-1.5 text-[11px] text-white/80 shadow-xl whitespace-nowrap">
          <span className="text-white/50">{formatX(h.x)}</span> · <span className="font-semibold text-white">{fmtNum(h.y, 1)} {unidad}</span>
          {h.objetivo != null ? <span className="text-white/45"> · objetivo {fmtNum(h.objetivo, 1)}</span> : null}
          {h.extra ? <span className="text-white/45"> · {h.extra}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Barras verticales de una serie con tooltip por barra. */
export function BarChart({
  points,
  unidad = "kg",
  height = 170,
  formatX = (s: string) => fmtFecha(s),
}: {
  points: { x: string; y: number; extra?: string }[];
  unidad?: string;
  height?: number;
  formatX?: (s: string) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length || points.every((p) => !p.y)) return <Empty>Sin entregas registradas.</Empty>;
  const H = height;
  const pad = { l: 52, r: 8, t: 10, b: 24 };
  const max = Math.max(...points.map((p) => p.y)) * 1.1;
  const slot = (W - pad.l - pad.r) / points.length;
  const bw = Math.max(4, slot - 4);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const h = hover != null ? points[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Barras" onMouseLeave={() => setHover(null)}>
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="rgba(255,255,255,0.4)">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const top = y(p.y);
          const bx = pad.l + i * slot + (slot - bw) / 2;
          const bh = Math.max(0, H - pad.b - top);
          const r = Math.min(4, bw / 2, bh);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent" />
              <path
                d={`M ${bx},${H - pad.b} V ${top + r} Q ${bx},${top} ${bx + r},${top} H ${bx + bw - r} Q ${bx + bw},${top} ${bx + bw},${top + r} V ${H - pad.b} Z`}
                fill={hover === i ? "#6ee7b7" : "#10b981"}
                opacity={hover == null || hover === i ? 1 : 0.55}
              />
              {i === 0 || i === points.length - 1 || (i % 3 === 0 && points.length - 1 - i >= 2) ? (
                <text x={bx + bw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.4)">
                  {formatX(p.x)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {h ? (
        <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-[#07110d]/95 px-3 py-1.5 text-[11px] text-white/80 shadow-xl whitespace-nowrap">
          <span className="text-white/50">{formatX(h.x)}</span> · <span className="font-semibold text-white">{fmtNum(h.y)} {unidad}</span>
          {h.extra ? <span className="text-white/45"> · {h.extra}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
