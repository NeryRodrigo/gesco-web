"use client";

import { use, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { productoPorSlug } from "@/lib/vordiaProductos";
import { ESTUDIO_TAMANO, planRecomendado, preciosAProbar } from "@/lib/estudioPrecios";
import type { VordiaProductoSlug } from "@/lib/vordiaEntornos";

const HERRAMIENTAS = ["Excel o planillas", "Cuaderno o papel", "Otro sistema", "WhatsApp y memoria", "Nada todavía"];
const PROBLEMAS: Record<string, string[]> = {
  habitat: ["Cobrar expensas a tiempo", "Ordenar gastos y proveedores", "Comunicación con residentes", "Rendir cuentas al consorcio"],
  stay: ["Ocupación y reservas", "Cobros y caja", "Tarifas por temporada", "Datos de huéspedes"],
  dine: ["Facturación electrónica", "Comandas y cocina", "Control de stock", "Cierre de caja"],
  retail: ["Facturación electrónica", "Control de stock", "Compras a proveedores", "Ventas por vendedor"],
  boutique: ["Stock por talle y color", "Facturación electrónica", "Temporadas y liquidaciones", "Clientes frecuentes"],
  ops: ["Seguimiento de vehículos", "Órdenes de trabajo", "Costos por viaje", "Mantenimiento de flota"],
  agro: ["Pesajes y ganancia diaria", "Sanidad y vacunas", "Costos por cabeza", "Trazabilidad"],
};
const INTENCION = ["Seguro que no", "Probablemente no", "No sé", "Probablemente sí", "Seguro que sí"];

const CAMPO = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20";
const ETIQUETA = "text-[14px] font-medium text-slate-800";
const gs = (n: number) => `Gs ${n.toLocaleString("es-PY")}`;
const soloNumero = (s: string) => Number(s.replace(/\D/g, "")) || 0;

/** Campo de monto en guaraníes con separador de miles. */
function Monto({ id, valor, onChange }: { id: string; valor: number; onChange: (n: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-slate-500">Gs</span>
      <input
        id={id}
        inputMode="numeric"
        className={`${CAMPO} pl-10`}
        value={valor ? valor.toLocaleString("es-PY") : ""}
        onChange={(e) => onChange(soloNumero(e.target.value))}
        placeholder="0"
        required
      />
    </div>
  );
}

/**
 * Encuesta pública de precios (Van Westendorp + Gabor-Granger). Primero se piden los umbrales
 * de precio sin mostrar ninguno, para no condicionar la respuesta; recién después se muestra el plan
 * con uno de tres precios elegido al azar.
 */
export default function EstudioPreciosPage({
  params,
  searchParams,
}: {
  params: Promise<{ producto: string }>;
  searchParams: Promise<{ o?: string }>;
}) {
  const { producto: slug } = use(params);
  const { o: origen } = use(searchParams);
  const producto = productoPorSlug(slug);
  const plan = planRecomendado(slug);
  const [precioMostrado] = useState(() => {
    const opciones = preciosAProbar(slug);
    return opciones[Math.floor(Math.random() * opciones.length)] ?? 0;
  });

  const [paso, setPaso] = useState(1);
  const [f, setF] = useState({
    tamano: "", ciudad: "", herramienta: "", gasto: 0, problema: "", decisor: "",
    muyBarato: 0, barato: 0, caro: 0, muyCaro: 0,
    intencion: 0, comentario: "", acepta: false, nombre: "", empresa: "", contacto: "", sitio: "",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  if (!producto || !plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <p className="text-slate-600">Este estudio no existe. Revisá el link que te enviaron.</p>
      </main>
    );
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const siguiente = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (paso === 2) {
      const { muyBarato, barato, caro, muyCaro } = f;
      if (!(muyBarato > 0 && barato > muyBarato && caro > barato && muyCaro > caro)) {
        setError("Los cuatro montos tienen que ir de menor a mayor: muy barato < buen precio < caro < demasiado caro.");
        return;
      }
    }
    setPaso((p) => p + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.intencion) return setError("Elegí qué tan probable es que lo contrates.");
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/public/estudio-precios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto: slug, origen: origen ?? null,
          tamano: Number(f.tamano) || null, ciudad: f.ciudad, herramientaActual: f.herramienta,
          gastoActualGs: f.gasto || null, problemaPrincipal: f.problema, decisor: f.decisor,
          muyBaratoGs: f.muyBarato, baratoGs: f.barato, caroGs: f.caro, muyCaroGs: f.muyCaro,
          precioMostradoGs: precioMostrado, intencionCompra: f.intencion, comentario: f.comentario,
          aceptaContacto: f.acepta, contactoNombre: f.nombre, contactoEmpresa: f.empresa, contactoDato: f.contacto,
          sitio: f.sitio,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || "No pudimos guardar tu respuesta.");
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar tu respuesta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-700">VORDIA · {producto.codigo}</p>
        <h1 className="mt-2 text-[26px] font-bold leading-tight">¿Cuánto vale para vos un sistema para {producto.nombre.toLowerCase()}?</h1>
        <p className="mt-2 text-[15px] text-slate-600">3 minutos. Tus respuestas nos ayudan a fijar precios justos. No hace falta crear cuenta.</p>

        {listo ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-white p-6 text-center">
            <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
            <h2 className="mt-3 text-lg font-semibold">¡Gracias por tu tiempo!</h2>
            <p className="mt-1 text-[14px] text-slate-600">
              {f.acepta ? "Te vamos a escribir con el precio fundador para los primeros clientes." : "Tu respuesta quedó registrada de forma anónima."}
            </p>
          </div>
        ) : (
          <>
            <ol className="mt-6 flex gap-2" aria-label="Progreso">
              {[1, 2, 3].map((n) => (
                <li key={n} className={`h-1.5 flex-1 rounded-full ${n <= paso ? "bg-blue-600" : "bg-slate-200"}`} />
              ))}
            </ol>

            {paso === 1 && (
              <form onSubmit={siguiente} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-semibold">Tu negocio hoy</h2>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>{ESTUDIO_TAMANO[slug as VordiaProductoSlug]}</span>
                  <input id="tamano" inputMode="numeric" className={CAMPO} value={f.tamano} onChange={(e) => set("tamano", e.target.value.replace(/\D/g, ""))} required />
                </label>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>¿Con qué lo gestionás hoy?</span>
                  <select id="herramienta" className={CAMPO} value={f.herramienta} onChange={(e) => set("herramienta", e.target.value)} required>
                    <option value="">Elegí una opción</option>
                    {HERRAMIENTAS.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>¿Cuánto pagás hoy por mes en sistemas o herramientas para esto? (0 si nada)</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-slate-500">Gs</span>
                    <input id="gasto" inputMode="numeric" className={`${CAMPO} pl-10`} value={f.gasto ? f.gasto.toLocaleString("es-PY") : ""} onChange={(e) => set("gasto", soloNumero(e.target.value))} placeholder="0" />
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>¿Qué es lo que más te cuesta resolver?</span>
                  <select id="problema" className={CAMPO} value={f.problema} onChange={(e) => set("problema", e.target.value)} required>
                    <option value="">Elegí una opción</option>
                    {(PROBLEMAS[slug] ?? []).map((p) => <option key={p}>{p}</option>)}
                    <option>Otro</option>
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className={ETIQUETA}>Ciudad</span>
                    <input id="ciudad" className={CAMPO} value={f.ciudad} onChange={(e) => set("ciudad", e.target.value)} placeholder="Asunción" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className={ETIQUETA}>¿Decidís vos la compra?</span>
                    <select id="decisor" className={CAMPO} value={f.decisor} onChange={(e) => set("decisor", e.target.value)} required>
                      <option value="">Elegí</option>
                      <option>Sí</option>
                      <option>Lo decido con otros</option>
                      <option>No</option>
                    </select>
                  </label>
                </div>
                <button className="w-full rounded-full bg-blue-600 py-3 text-[15px] font-semibold text-white hover:bg-blue-700">Siguiente</button>
              </form>
            )}

            {paso === 2 && (
              <form onSubmit={siguiente} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-semibold">Pensá en un sistema que resuelva eso por completo</h2>
                  <p className="mt-1 text-[14px] text-slate-600">Con soporte en Paraguay, factura y acceso desde el celular. Respondé con el monto <b>mensual</b> que te parezca, sin buscar precios.</p>
                </div>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>¿A qué precio te parecería <b>tan barato</b> que dudarías de que funcione bien?</span>
                  <Monto id="muyBarato" valor={f.muyBarato} onChange={(n) => set("muyBarato", n)} />
                </label>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>¿A qué precio te parecería una <b>buena compra</b>?</span>
                  <Monto id="barato" valor={f.barato} onChange={(n) => set("barato", n)} />
                </label>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>¿A qué precio empezaría a parecerte <b>caro</b>, aunque lo pensarías?</span>
                  <Monto id="caro" valor={f.caro} onChange={(n) => set("caro", n)} />
                </label>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>¿A qué precio sería <b>tan caro</b> que no lo considerarías?</span>
                  <Monto id="muyCaro" valor={f.muyCaro} onChange={(n) => set("muyCaro", n)} />
                </label>
                {error && <p className="text-[13px] text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setPaso(1)} className="rounded-full border border-slate-300 px-5 py-3 text-[15px]">Atrás</button>
                  <button className="flex-1 rounded-full bg-blue-600 py-3 text-[15px] font-semibold text-white hover:bg-blue-700">Siguiente</button>
                </div>
              </form>
            )}

            {paso === 3 && (
              <form onSubmit={enviar} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-700">VORDIA {producto.codigo} · Plan {plan.nombre}</p>
                  <p className="mt-1 text-[24px] font-bold">{gs(precioMostrado)} <span className="text-[14px] font-normal text-slate-600">por mes, IVA incluido</span></p>
                  <p className="text-[13px] text-slate-600">{plan.limite}</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[14px] text-slate-700">
                    {plan.incluye.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </div>
                <fieldset className="space-y-2">
                  <legend className={ETIQUETA}>Con este precio, ¿qué tan probable es que lo contrates en los próximos 3 meses?</legend>
                  <div className="grid gap-2">
                    {INTENCION.map((t, i) => (
                      <label key={t} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[15px] ${f.intencion === i + 1 ? "border-blue-600 bg-blue-50" : "border-slate-300"}`}>
                        <input type="radio" name="intencion" className="accent-blue-600" checked={f.intencion === i + 1} onChange={() => set("intencion", i + 1)} />
                        {t}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block space-y-1.5">
                  <span className={ETIQUETA}>¿Qué te haría decir que sí? (opcional)</span>
                  <textarea id="comentario" rows={3} className={CAMPO} value={f.comentario} onChange={(e) => set("comentario", e.target.value)} />
                </label>
                <label className="flex items-start gap-2.5 text-[14px] text-slate-700">
                  <input type="checkbox" className="mt-1 accent-blue-600" checked={f.acepta} onChange={(e) => set("acepta", e.target.checked)} />
                  <span>
                    Quiero que me contacten con el precio fundador. Acepto que VORDIA use estos datos según su{" "}
                    <a href="/privacidad" target="_blank" className="text-blue-700 underline">Política de Privacidad</a>.
                  </span>
                </label>
                {f.acepta && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input id="nombre" className={CAMPO} placeholder="Nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} required />
                    <input id="empresa" className={CAMPO} placeholder="Empresa" value={f.empresa} onChange={(e) => set("empresa", e.target.value)} />
                    <input id="contacto" className={CAMPO} placeholder="WhatsApp o correo" value={f.contacto} onChange={(e) => set("contacto", e.target.value)} required />
                  </div>
                )}
                <input id="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={f.sitio} onChange={(e) => set("sitio", e.target.value)} />
                {error && <p className="text-[13px] text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setPaso(2)} className="rounded-full border border-slate-300 px-5 py-3 text-[15px]">Atrás</button>
                  <button disabled={enviando} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-[15px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {enviando && <Loader2 size={16} className="animate-spin" />} Enviar respuestas
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        <p className="mt-6 text-center text-[12px] text-slate-400">VORDIA · Software de gestión en Paraguay</p>
      </div>
    </main>
  );
}
