"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy, RefreshCw, Trash2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { VORDIA_SITIO } from "@/lib/vordiaEntornos";
import { VORDIA_PRODUCTOS } from "@/lib/vordiaProductos";
import {
  ESTUDIO_MUESTRA_MINIMA, fmtGs, gaborGranger, mediana, planRecomendado, vanWestendorp,
  type RespuestaEstudio, type ResultadoVW,
} from "@/lib/estudioPrecios";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.mensaje || `Error ${res.status}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Curvas de Van Westendorp con los cuatro puntos marcados. */
function GraficoVW({ r, precioPropuesto }: { r: ResultadoVW; precioPropuesto: number }) {
  const W = 640, H = 260, M = { l: 44, r: 16, t: 14, b: 34 };
  const xs = r.curva.map((c) => c.p);
  const max = Math.max(...xs, precioPropuesto) * 1.05;
  const min = Math.min(...xs) * 0.95;
  const x = (p: number) => M.l + ((p - min) / (max - min || 1)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - v) * (H - M.t - M.b);
  const linea = (k: "muyBarato" | "barato" | "caro" | "muyCaro") => r.curva.map((c, i) => `${i ? "L" : "M"}${x(c.p).toFixed(1)},${y(c[k]).toFixed(1)}`).join(" ");
  const series = [
    { k: "muyBarato" as const, color: "#f59e0b", label: "Demasiado barato", dash: "5 4" },
    { k: "barato" as const, color: "#34d399", label: "Buena compra", dash: "" },
    { k: "caro" as const, color: "#60a5fa", label: "Caro", dash: "" },
    { k: "muyCaro" as const, color: "#f87171", label: "Demasiado caro", dash: "5 4" },
  ];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label="Curvas de sensibilidad de precio">
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.08)" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{pct(v)}</text>
          </g>
        ))}
        {ticks.map((p) => (
          <text key={p} x={x(p)} y={H - 12} textAnchor="middle" fontSize="10" fill="#94a3b8">{Math.round(p / 1000).toLocaleString("es-PY")} mil</text>
        ))}
        {r.pmc != null && r.pme != null && (
          <rect x={x(r.pmc)} y={M.t} width={Math.max(0, x(r.pme) - x(r.pmc))} height={H - M.t - M.b} fill="rgba(52,211,153,0.08)" />
        )}
        {series.map((s) => <path key={s.k} d={linea(s.k)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} />)}
        <line x1={x(precioPropuesto)} x2={x(precioPropuesto)} y1={M.t} y2={H - M.b} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="2 3" />
        <text x={x(precioPropuesto) + 4} y={M.t + 10} fontSize="10" fill="#e2e8f0">Propuesto</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {series.map((s) => (
          <span key={s.k} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: s.color }} />{s.label}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-4 rounded-sm bg-emerald-400/20" />Rango aceptable</span>
      </div>
    </div>
  );
}

/** HQ · Estudio de precios: links para enviar a prospectos y análisis por producto antes de publicar precios. */
export function VordiaEstudioPreciosPage({ empresaId }: { empresaId: number }) {
  const [respuestas, setRespuestas] = useState<RespuestaEstudio[] | null>(null);
  const [slug, setSlug] = useState("habitat");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    api<RespuestaEstudio[]>(`/api/Mercado/estudio-precios?empresaId=${empresaId}`)
      .then((r) => vivo && setRespuestas(r))
      .catch((e) => {
        if (!vivo) return;
        setRespuestas([]);
        toast.error("No se pudieron cargar las respuestas", { description: e instanceof Error ? e.message : undefined });
      });
    return () => {
      vivo = false;
    };
  }, [empresaId, version]);

  const delProducto = useMemo(() => (respuestas ?? []).filter((r) => r.producto === slug), [respuestas, slug]);
  const vw = useMemo(() => vanWestendorp(delProducto), [delProducto]);
  const gg = useMemo(() => gaborGranger(delProducto), [delProducto]);
  const plan = planRecomendado(slug);
  const propuesto = plan?.precioMensualGs ?? 0;
  const producto = VORDIA_PRODUCTOS.find((p) => p.slug === slug);
  const conteo = (slugX: string) => (respuestas ?? []).filter((r) => r.producto === slugX).length;

  const veredicto = (() => {
    if (vw.n === 0 || vw.pmc == null || vw.pme == null) return null;
    if (propuesto < vw.pmc) return { tono: "warn", texto: `El precio propuesto está por debajo del rango: puede generar dudas de calidad. Subilo al menos a ${fmtGs(vw.pmc)}.` };
    if (propuesto > vw.pme) return { tono: "bad", texto: `El precio propuesto supera el máximo aceptable (${fmtGs(vw.pme)}): muchos prospectos lo descartarían.` };
    return { tono: "ok", texto: `El precio propuesto está dentro del rango aceptable (${fmtGs(vw.pmc)} a ${fmtGs(vw.pme)}).` };
  })();

  const mejorGabor = gg.length ? gg.reduce((a, b) => (b.indiceIngreso > a.indiceIngreso ? b : a)) : null;
  const link = (origen: string) => `${VORDIA_SITIO}/estudio/${slug}?o=${origen}`;
  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Link copiado");
    } catch {
      toast.info(texto);
    }
  };
  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar esta respuesta del estudio?")) return;
    await api(`/api/Mercado/estudio-precios/${id}?empresaId=${empresaId}`, { method: "DELETE" });
    setVersion((v) => v + 1);
  };

  const herramientas = Object.entries(
    delProducto.reduce<Record<string, number>>((acc, r) => {
      const k = r.herramientaActual || "Sin dato";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Estudio de precios</h1>
          <p className="max-w-2xl text-[13px] text-slate-400">
            Antes de publicar precios: enviá el link a prospectos reales y mirá en qué rango están dispuestos a pagar
            (Van Westendorp) y cuántos comprarían a cada precio (Gabor-Granger).
          </p>
        </div>
        <button type="button" onClick={() => setVersion((v) => v + 1)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[13px] text-slate-200 hover:bg-white/5">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {VORDIA_PRODUCTOS.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setSlug(p.slug)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${slug === p.slug ? "border-[#007bff] bg-[#007bff] text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
          >
            {p.codigo} <span className="ml-1 opacity-70">{conteo(p.slug)}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0C1327] p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-white">{producto?.nombre} · plan {plan?.nombre} propuesto en {fmtGs(propuesto)}</h2>
            <span className={`text-[12px] ${vw.n >= ESTUDIO_MUESTRA_MINIMA ? "text-emerald-300" : "text-amber-300"}`}>
              {vw.n} respuestas · mínimo recomendado {ESTUDIO_MUESTRA_MINIMA}
            </span>
          </div>

          {respuestas == null ? (
            <p className="text-[13px] text-slate-400">Cargando respuestas…</p>
          ) : vw.n < 4 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-5 text-[13px] text-slate-400">
              Todavía no hay suficientes respuestas para {producto?.codigo}. Copiá el link de la derecha y envialo a prospectos de este rubro
              (clientes del CRM, contactos del radar, grupos de WhatsApp). Con 4 respuestas aparece el gráfico; para decidir el precio conviene llegar a {ESTUDIO_MUESTRA_MINIMA}.
            </p>
          ) : (
            <>
              <GraficoVW r={vw} precioPropuesto={propuesto} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { l: "Mínimo aceptable", v: vw.pmc, h: "Por debajo dudan de la calidad" },
                  { l: "Precio óptimo", v: vw.opp, h: "Menor resistencia al precio" },
                  { l: "Indiferencia", v: vw.ipp, h: "Tantos lo ven barato como caro" },
                  { l: "Máximo aceptable", v: vw.pme, h: "Por encima lo descartan" },
                ].map((k) => (
                  <div key={k.l} className="rounded-xl border border-white/10 bg-[#050B18] p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{k.l}</p>
                    <p className="mt-1 font-mono text-[16px] text-white tabular-nums">{fmtGs(k.v)}</p>
                    <p className="text-[11px] text-slate-500">{k.h}</p>
                  </div>
                ))}
              </div>
              {veredicto && (
                <p className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] ${veredicto.tono === "ok" ? "bg-emerald-500/10 text-emerald-200" : veredicto.tono === "warn" ? "bg-amber-500/10 text-amber-200" : "bg-rose-500/10 text-rose-200"}`}>
                  {veredicto.tono === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
                  {veredicto.texto}
                  {vw.n < ESTUDIO_MUESTRA_MINIMA ? " Muestra todavía chica: tomalo como orientación." : ""}
                </p>
              )}

              <div>
                <h3 className="mb-2 text-[13px] font-semibold text-white">¿Cuántos comprarían a cada precio?</h3>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-[13px]">
                    <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                      <tr><th className="px-3 py-2 text-left">Precio mostrado</th><th className="px-3 py-2 text-right">Respuestas</th><th className="px-3 py-2 text-right">Comprarían</th><th className="px-3 py-2 text-right">Ingreso por cada 100 prospectos</th></tr>
                    </thead>
                    <tbody>
                      {gg.map((g) => (
                        <tr key={g.precio} className={`border-t border-white/5 ${mejorGabor?.precio === g.precio ? "bg-emerald-500/10" : ""}`}>
                          <td className="px-3 py-2 font-mono tabular-nums text-white">{fmtGs(g.precio)}{g.precio === propuesto ? <span className="ml-2 text-[11px] text-slate-400">propuesto</span> : null}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-300">{g.n}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-300">{pct(g.compraria)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300">{fmtGs(g.indiceIngreso * 100)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">«Comprarían» = respondieron probablemente sí o seguro que sí. La fila resaltada es el precio que más ingreso deja.</p>
              </div>
            </>
          )}
        </section>

        <aside className="space-y-3">
          <div className="space-y-2 rounded-2xl border border-[#007bff]/25 bg-[#007bff]/5 p-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-[#5eb0ff]">Links para enviar</p>
            {[
              { o: "whatsapp", l: "WhatsApp" },
              { o: "correo", l: "Correo" },
              { o: "crm", l: "Clientes del CRM" },
              { o: "grupos", l: "Grupos y redes" },
            ].map((x) => (
              <button key={x.o} type="button" onClick={() => void copiar(link(x.o))} className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#050B18] px-3 py-2 text-left text-[12px] text-slate-200 hover:border-[#007bff]/40">
                <span>{x.l}</span><Copy size={13} className="text-slate-400" />
              </button>
            ))}
            <p className="text-[11px] leading-relaxed text-slate-400">Cada link marca de dónde vino la respuesta. El prospecto no ve el precio hasta después de responder sus montos.</p>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0C1327] p-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Contexto de {producto?.codigo}</p>
            <p className="text-[13px] text-slate-300">Tamaño típico: <b className="text-white">{mediana(delProducto.map((r) => r.tamano ?? NaN)) ?? "—"}</b></p>
            <p className="text-[13px] text-slate-300">Gasto actual típico: <b className="text-white">{fmtGs(mediana(delProducto.map((r) => r.gastoActualGs ?? NaN)))}</b></p>
            <p className="text-[13px] text-slate-300">Deciden la compra: <b className="text-white">{delProducto.length ? pct(delProducto.filter((r) => r.decisor === "Sí").length / delProducto.length) : "—"}</b></p>
            <ul className="space-y-1 pt-1 text-[12px] text-slate-400">
              {herramientas.map(([h, n]) => <li key={h} className="flex justify-between gap-2"><span>{h}</span><span className="tabular-nums">{n}</span></li>)}
            </ul>
          </div>
        </aside>
      </div>

      {delProducto.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0C1327] p-4 sm:p-5">
          <h2 className="mb-2 text-[14px] font-semibold text-white">Últimas respuestas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                <tr><th className="px-2 py-2 text-left">Fecha</th><th className="px-2 py-2 text-left">Origen</th><th className="px-2 py-2 text-right">Muy barato</th><th className="px-2 py-2 text-right">Buena compra</th><th className="px-2 py-2 text-right">Caro</th><th className="px-2 py-2 text-right">Muy caro</th><th className="px-2 py-2 text-right">Intención</th><th className="px-2 py-2 text-left">Contacto</th><th /></tr>
              </thead>
              <tbody>
                {delProducto.slice(0, 50).map((r) => (
                  <tr key={r.respuestaId} className="border-t border-white/5 text-slate-300">
                    <td className="px-2 py-1.5">{new Date(r.fecha).toLocaleDateString("es-PY")}</td>
                    <td className="px-2 py-1.5">{r.origen ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtGs(r.muyBaratoGs)}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtGs(r.baratoGs)}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtGs(r.caroGs)}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtGs(r.muyCaroGs)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.intencionCompra}/5 a {fmtGs(r.precioMostradoGs)}</td>
                    <td className="px-2 py-1.5">{r.aceptaContacto ? [r.contactoNombre, r.contactoEmpresa, r.contactoDato].filter(Boolean).join(" · ") : "Anónimo"}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button type="button" onClick={() => void eliminar(r.respuestaId)} className="p-1 text-slate-500 hover:text-rose-300" aria-label="Eliminar respuesta"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
