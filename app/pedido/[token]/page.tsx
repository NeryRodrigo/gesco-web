"use client";

import { API_BASE } from "@/lib/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";

type PedidoPublico = {
  numero: string;
  clienteNombre: string;
  producto: string;
  incluye?: string | null;
  moneda: string;
  precioSetup: number;
  precioMensual: number;
  plazoDias: number;
  validoHasta: string;
  condicionesPago?: string | null;
  estado: "Pendiente" | "Aceptado" | "Rechazado" | "Pagado" | "Vencido";
  vencido: boolean;
  fechaRespuesta?: string | null;
  respuestaNombre?: string | null;
};

const monto = (m: string, v: number) => `${m} ${v.toLocaleString("es-PY", { maximumFractionDigits: 2 })}`;

/** Página pública del pedido: el cliente la abre desde WhatsApp o correo y acepta con un clic. */
export default function PedidoPublicoPage() {
  const { token } = useParams<{ token: string }>();
  const [p, setP] = useState<PedidoPublico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ nombre: "", email: "", telefono: "", comentario: "", sitio: "" });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`${API_BASE}/api/public/pedidos/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "No encontramos este pedido. Revisá el link." : "No pudimos cargar el pedido. Probá de nuevo en un momento.");
        return r.json();
      })
      .then((d) => vivo && setP(d))
      .catch((e) => vivo && setError(e.message));
    return () => {
      vivo = false;
    };
  }, [token]);

  const responder = async (aceptar: boolean) => {
    if (aceptar && !f.nombre.trim()) return setError("Escribí tu nombre para aceptar el pedido.");
    try {
      setEnviando(true);
      setError(null);
      const r = await fetch(`${API_BASE}/api/public/pedidos/${encodeURIComponent(token)}/${aceptar ? "aceptar" : "rechazar"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.mensaje ?? "No pudimos registrar tu respuesta.");
      setP(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos registrar tu respuesta.");
    } finally {
      setEnviando(false);
    }
  };

  const items = (p?.incluye ?? "").split("\n").map((x) => x.replace(/^[-•]\s*/, "").trim()).filter(Boolean);
  const abierto = p && p.estado === "Pendiente" && !p.vencido;
  const input = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 outline-none focus:border-[#007bff] focus:ring-2 focus:ring-[#007bff]/15";

  return (
    <main className="min-h-dvh bg-[#f3f5fa] text-slate-900 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <p className="text-lg font-bold tracking-[0.3em] text-[#050B18]">VORDIA</p>
          {p ? <p className="text-xs text-slate-500 font-mono">{p.numero}</p> : null}
        </div>

        {!p && !error && <div className="h-80 rounded-2xl bg-white border border-slate-200 animate-pulse" />}
        {!p && error && <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-600">{error}</div>}

        {p && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#050B18] px-5 py-5 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7c8db5]">Pedido para</p>
              <p className="text-xl font-semibold mt-0.5">{p.clienteNombre}</p>
              <p className="text-[15px] text-[#cfe0ff] mt-2">{p.producto}</p>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                  <p className="text-xs text-slate-500">Implementación</p>
                  <p className="text-xl font-bold text-slate-900">{monto(p.moneda, p.precioSetup)}</p>
                  <p className="text-xs text-slate-500">pago único</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                  <p className="text-xs text-slate-500">Mensualidad</p>
                  <p className="text-xl font-bold text-slate-900">{p.precioMensual ? monto(p.moneda, p.precioMensual) : "—"}</p>
                  <p className="text-xs text-slate-500">{p.precioMensual ? "soporte incluido" : "sin mensualidad"}</p>
                </div>
              </div>

              {items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-2">Incluye</p>
                  <ul className="space-y-1.5">
                    {items.map((it) => (
                      <li key={it} className="flex gap-2 text-[14px] text-slate-700">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
                <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Listo en {p.plazoDias} días</span>
                <span>Válido hasta el {new Date(p.validoHasta).toLocaleDateString("es-PY")}</span>
              </div>
              {p.condicionesPago ? <p className="text-[13px] text-slate-600 leading-relaxed">{p.condicionesPago}</p> : null}

              {abierto && (
                <div className="space-y-2.5 border-t border-slate-200 pt-5">
                  <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Tu nombre *" className={input} autoComplete="name" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="WhatsApp" className={input} inputMode="tel" autoComplete="tel" />
                    <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Correo" className={input} inputMode="email" autoComplete="email" />
                  </div>
                  <textarea value={f.comentario} onChange={(e) => setF({ ...f, comentario: e.target.value })} placeholder="Comentario (opcional)" rows={2} className={input} />
                  {/* Honeypot para bots */}
                  <input value={f.sitio} onChange={(e) => setF({ ...f, sitio: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => void responder(true)}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-3.5 text-[16px] font-bold text-white"
                  >
                    {enviando ? "Enviando…" : "Acepto el pedido"}
                  </button>
                  <button type="button" disabled={enviando} onClick={() => void responder(false)} className="w-full text-sm text-slate-500 hover:text-slate-700 py-1">
                    No me interesa por ahora
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <ShieldCheck size={13} /> Aceptar no realiza ningún cobro: coordinamos el pago con vos.
                  </p>
                </div>
              )}

              {!abierto && (
                <div
                  className={`rounded-xl p-4 text-center ${
                    p.estado === "Aceptado" || p.estado === "Pagado"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : p.estado === "Rechazado"
                        ? "bg-slate-50 border border-slate-200 text-slate-600"
                        : "bg-amber-50 border border-amber-200 text-amber-800"
                  }`}
                >
                  {p.estado === "Aceptado" || p.estado === "Pagado" ? (
                    <>
                      <CheckCircle2 className="mx-auto mb-1.5" size={26} />
                      <p className="font-semibold">¡Pedido aceptado{p.respuestaNombre ? `, ${p.respuestaNombre.split(" ")[0]}` : ""}!</p>
                      <p className="text-sm mt-1">Te escribimos en breve para coordinar el pago y el inicio.</p>
                    </>
                  ) : p.estado === "Rechazado" ? (
                    <>
                      <XCircle className="mx-auto mb-1.5" size={26} />
                      <p className="font-semibold">Gracias por tu respuesta.</p>
                      <p className="text-sm mt-1">Si más adelante lo necesitás, escribinos y lo retomamos.</p>
                    </>
                  ) : (
                    <>
                      <Clock className="mx-auto mb-1.5" size={26} />
                      <p className="font-semibold">Este pedido venció.</p>
                      <p className="text-sm mt-1">Pedinos uno actualizado y te lo enviamos al instante.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">Vordia · vordia.com.py</p>
      </div>
    </main>
  );
}
