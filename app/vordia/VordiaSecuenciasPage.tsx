"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Check, Loader2, Mail, Pause, Play, Plus, Send, Sparkles, UserPlus, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { VORDIA_PRODUCTOS } from "@/lib/vordiaProductos";

type Secuencia = {
  secuenciaId: number; nombre: string; producto: string; oferta: string; firma: string; responderA?: string | null;
  pasos: number; diasEntrePasos: number; limiteDiario: number; activa: boolean;
};
type Resumen = { secuencia: Secuencia; porEstado: Record<string, number>; enviadosHoy: number; enviadosTotal: number };
type Contacto = {
  contactoId: number; email: string; nombre?: string | null; empresa?: string | null; contexto?: string | null;
  estado: string; pasoActual: number; asunto?: string | null; cuerpo?: string | null; proximoEnvio?: string | null; detalle?: string | null;
  clienteId?: number | null; necesidadId?: number | null;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.mensaje || `Error ${res.status}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

const CAMPO = "w-full rounded-xl border border-white/10 bg-[#050B18] px-3 py-2 text-[13px] text-white placeholder:text-slate-500 focus:border-[#007bff] focus:outline-none";
const BOTON = "inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[12.5px] text-slate-200 hover:bg-white/5 disabled:opacity-50";
const ESTADOS: Record<string, { label: string; color: string }> = {
  Borrador: { label: "Sin redactar", color: "bg-slate-500/20 text-slate-300" },
  Redactado: { label: "Para revisar", color: "bg-amber-500/15 text-amber-200" },
  Aprobado: { label: "Aprobado", color: "bg-sky-500/15 text-sky-200" },
  EnCurso: { label: "En curso", color: "bg-blue-500/15 text-blue-200" },
  Respondio: { label: "Respondió", color: "bg-emerald-500/15 text-emerald-200" },
  Terminado: { label: "Terminado", color: "bg-slate-500/20 text-slate-300" },
  Baja: { label: "Baja", color: "bg-rose-500/15 text-rose-200" },
  Descartado: { label: "Descartado", color: "bg-slate-600/20 text-slate-400" },
  Error: { label: "Error", color: "bg-rose-500/15 text-rose-200" },
};

/** Las fechas llegan en UTC sin zona: se marcan como UTC para mostrarlas en hora local. */
const fechaUtc = (iso: string) => new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);

const NUEVA = { nombre: "", producto: "HABITAT", oferta: "Precio fundador congelado 24 meses para los primeros 50 clientes y demo de 15 minutos con tus datos.", firma: "", responderA: "", pasos: 3, diasEntrePasos: 3, limiteDiario: 30 };

/** Borrador del primer correo: editable y con aprobación explícita. */
function FilaBorrador({ c, empresaId, onCambio }: { c: Contacto; empresaId: number; onCambio: () => void }) {
  const [asunto, setAsunto] = useState(c.asunto ?? "");
  const [cuerpo, setCuerpo] = useState(c.cuerpo ?? "");
  const [ocupado, setOcupado] = useState(false);
  const editado = asunto !== (c.asunto ?? "") || cuerpo !== (c.cuerpo ?? "");

  const accion = async (estado: "Aprobado" | "Descartado") => {
    setOcupado(true);
    try {
      if (estado === "Aprobado" && editado) {
        await api(`/api/Secuencias/contactos/${c.contactoId}`, { method: "PUT", body: JSON.stringify({ empresaId, asunto, cuerpo }) });
      }
      await api(`/api/Secuencias/contactos/${c.contactoId}/estado`, { method: "POST", body: JSON.stringify({ empresaId, estado }) });
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/20 bg-[#050B18] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12px]">
        <span className="text-white">{c.nombre || "Sin nombre"} · <span className="text-slate-400">{c.empresa || "—"}</span></span>
        <span className="text-slate-500">{c.email}{c.detalle ? ` · ${c.detalle}` : ""}</span>
      </div>
      {c.contexto && <p className="text-[11.5px] text-slate-500">Contexto: {c.contexto}</p>}
      <input className={CAMPO} value={asunto} onChange={(e) => setAsunto(e.target.value)} aria-label="Asunto" />
      <textarea className={`${CAMPO} min-h-[140px]`} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} aria-label="Cuerpo del correo" />
      <div className="flex justify-end gap-2">
        <button type="button" disabled={ocupado} onClick={() => void accion("Descartado")} className={BOTON}><X size={13} /> Descartar</button>
        <button type="button" disabled={ocupado} onClick={() => void accion("Aprobado")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#007bff] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[#0069d9] disabled:opacity-50">
          <Check size={13} /> {editado ? "Guardar y aprobar" : "Aprobar"}
        </button>
      </div>
    </div>
  );
}

/** HQ · Secuencias de correo: la IA redacta, una persona aprueba y los seguimientos salen solos. */
export function VordiaSecuenciasPage({ empresaId, usuario }: { empresaId: number; usuario?: { nombre?: string; email?: string } | null }) {
  const [datos, setDatos] = useState<{ iaConfigurada: boolean; iaProveedores?: string; secuencias: Resumen[] } | null>(null);
  const [selId, setSelId] = useState<number | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [form, setForm] = useState<typeof NUEVA | null>(null);
  const [manual, setManual] = useState({ email: "", nombre: "", empresa: "", contexto: "" });
  const [ocupado, setOcupado] = useState("");
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    api<{ iaConfigurada: boolean; iaProveedores?: string; secuencias: Resumen[] }>(`/api/Secuencias?empresaId=${empresaId}`)
      .then((d) => {
        if (!vivo) return;
        setDatos(d);
        setSelId((prev) => prev ?? d.secuencias[0]?.secuencia.secuenciaId ?? null);
      })
      .catch((e) => vivo && toast.error(e instanceof Error ? e.message : "No se pudieron cargar las secuencias"));
    return () => {
      vivo = false;
    };
  }, [empresaId, version]);

  useEffect(() => {
    if (!selId) return;
    let vivo = true;
    api<Contacto[]>(`/api/Secuencias/${selId}/contactos?empresaId=${empresaId}`)
      .then((c) => vivo && setContactos(c))
      .catch(() => vivo && setContactos([]));
    return () => {
      vivo = false;
    };
  }, [selId, empresaId, version]);

  const sel = datos?.secuencias.find((s) => s.secuencia.secuenciaId === selId);
  const correr = async (clave: string, fn: () => Promise<string>) => {
    setOcupado(clave);
    try {
      toast.success(await fn());
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar");
    } finally {
      setOcupado("");
    }
  };

  const guardarSecuencia = () =>
    form &&
    correr("guardar", async () => {
      const s = await api<Secuencia>("/api/Secuencias", { method: "POST", body: JSON.stringify({ ...form, empresaId, responderA: form.responderA || null }) });
      setForm(null);
      setSelId(s.secuenciaId);
      return "Secuencia creada (en pausa hasta que la actives)";
    });

  const redactados = contactos.filter((c) => c.estado === "Redactado");
  const resto = contactos.filter((c) => c.estado !== "Redactado");

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Secuencias de correo</h1>
          <p className="max-w-2xl text-[13px] text-slate-400">
            La IA redacta el primer correo para cada contacto, vos lo revisás y aprobás, y los seguimientos salen solos de lunes a viernes de 8 a 18.
            Se frena si la persona responde o pide la baja.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] ${datos?.iaConfigurada ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/10 text-amber-200"}`}>
            <Bot size={13} /> {datos?.iaConfigurada ? `IA gratuita activa (${datos.iaProveedores})` : "IA sin configurar: se usa plantilla"}
          </span>
          <button type="button" onClick={() => setForm({ ...NUEVA, firma: usuario?.nombre ?? "", responderA: usuario?.email ?? "" })} className="inline-flex items-center gap-1.5 rounded-xl bg-[#007bff] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#0069d9]">
            <Plus size={14} /> Nueva secuencia
          </button>
        </div>
      </div>

      {form && (
        <section className="grid gap-3 rounded-2xl border border-[#007bff]/30 bg-[#0C1327] p-4 sm:grid-cols-2">
          <input className={CAMPO} placeholder="Nombre (ej. Administradoras Asunción)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <select className={CAMPO} value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })} aria-label="Producto">
            {VORDIA_PRODUCTOS.map((p) => <option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre}</option>)}
          </select>
          <textarea className={`${CAMPO} sm:col-span-2`} rows={2} placeholder="Oferta" value={form.oferta} onChange={(e) => setForm({ ...form, oferta: e.target.value })} aria-label="Oferta" />
          <input className={CAMPO} placeholder="Firma (tu nombre)" value={form.firma} onChange={(e) => setForm({ ...form, firma: e.target.value })} />
          <input className={CAMPO} placeholder="Las respuestas llegan a (correo)" value={form.responderA} onChange={(e) => setForm({ ...form, responderA: e.target.value })} />
          <label className="text-[12px] text-slate-400">Correos por contacto
            <input type="number" min={1} max={4} className={CAMPO} value={form.pasos} onChange={(e) => setForm({ ...form, pasos: Number(e.target.value) })} />
          </label>
          <label className="text-[12px] text-slate-400">Días entre correos
            <input type="number" min={2} max={14} className={CAMPO} value={form.diasEntrePasos} onChange={(e) => setForm({ ...form, diasEntrePasos: Number(e.target.value) })} />
          </label>
          <label className="text-[12px] text-slate-400">Máximo por día (hasta 50)
            <input type="number" min={1} max={50} className={CAMPO} value={form.limiteDiario} onChange={(e) => setForm({ ...form, limiteDiario: Number(e.target.value) })} />
          </label>
          <div className="flex items-end justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className={BOTON}>Cancelar</button>
            <button type="button" disabled={ocupado === "guardar"} onClick={() => void guardarSecuencia()} className="rounded-xl bg-[#007bff] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">Crear</button>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {datos?.secuencias.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-[13px] text-slate-400">Todavía no hay secuencias. Creá la primera con «Nueva secuencia».</p>
          )}
          {datos?.secuencias.map((r) => (
            <button
              key={r.secuencia.secuenciaId}
              type="button"
              onClick={() => setSelId(r.secuencia.secuenciaId)}
              className={`w-full space-y-1 rounded-xl border p-3 text-left ${selId === r.secuencia.secuenciaId ? "border-[#007bff] bg-[#007bff]/10" : "border-white/10 bg-[#0C1327] hover:bg-white/5"}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-white">{r.secuencia.nombre}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] ${r.secuencia.activa ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-500/20 text-slate-300"}`}>{r.secuencia.activa ? "Activa" : "En pausa"}</span>
              </span>
              <span className="block text-[11.5px] text-slate-400">{r.secuencia.producto} · {r.enviadosHoy}/{r.secuencia.limiteDiario} hoy · {r.porEstado.Respondio ?? 0} respondieron</span>
            </button>
          ))}
        </aside>

        {sel && (
          <section className="min-w-0 space-y-4">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0C1327] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white">{sel.secuencia.nombre}</p>
                  <p className="text-[12px] text-slate-400">{sel.secuencia.pasos} correos, cada {sel.secuencia.diasEntrePasos} días · máximo {sel.secuencia.limiteDiario} por día · {sel.enviadosTotal} enviados en total</p>
                </div>
                <button
                  type="button"
                  disabled={!!ocupado}
                  onClick={() => void correr("activar", async () => {
                    await api(`/api/Secuencias/${sel.secuencia.secuenciaId}/activar?empresaId=${empresaId}&activa=${!sel.secuencia.activa}`, { method: "POST" });
                    return sel.secuencia.activa ? "Secuencia en pausa" : "Secuencia activa: los aprobados empiezan a salir en horario hábil";
                  })}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold ${sel.secuencia.activa ? "border border-white/10 text-slate-200" : "bg-emerald-600 text-white"}`}
                >
                  {sel.secuencia.activa ? <><Pause size={13} /> Pausar</> : <><Play size={13} /> Activar</>}
                </button>
              </div>
              <p className="text-[12px] text-slate-500">Oferta: {sel.secuencia.oferta}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { k: "crm", l: "Agregar prospectos del CRM" },
                  { k: "mercado", l: "Agregar pedidos privados del Mercado" },
                ].map((o) => (
                  <button key={o.k} type="button" disabled={!!ocupado} className={BOTON} onClick={() => void correr(o.k, async () => {
                    const r = await api<{ agregados: number }>(`/api/Secuencias/${sel.secuencia.secuenciaId}/importar`, { method: "POST", body: JSON.stringify({ empresaId, origen: o.k, max: 50 }) });
                    return r.agregados ? `${r.agregados} contactos agregados` : "No hay contactos nuevos con correo para agregar";
                  })}>
                    {ocupado === o.k ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} {o.l}
                  </button>
                ))}
                <button type="button" disabled={!!ocupado} className={BOTON} onClick={() => void correr("redactar", async () => {
                  const r = await api<{ redactados: number }>(`/api/Secuencias/${sel.secuencia.secuenciaId}/redactar`, { method: "POST", body: JSON.stringify({ empresaId, max: 10 }) });
                  return r.redactados ? `${r.redactados} correos redactados: revisalos abajo` : "No hay contactos sin redactar";
                })}>
                  {ocupado === "redactar" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Redactar con IA (10)
                </button>
                {redactados.length > 0 && (
                  <button type="button" disabled={!!ocupado} className={BOTON} onClick={() => void correr("aprobar", async () => {
                    const r = await api<{ aprobados: number }>(`/api/Secuencias/${sel.secuencia.secuenciaId}/aprobar-todos?empresaId=${empresaId}`, { method: "POST" });
                    return `${r.aprobados} correos aprobados`;
                  })}>
                    <Check size={13} /> Aprobar los {redactados.length} sin cambios
                  </button>
                )}
                <button type="button" disabled={!!ocupado} className={BOTON} onClick={() => void correr("procesar", async () => {
                  const r = await api<{ enviados: number; simulados: number; errores: number; bajas: number; motivo?: string | null }>(`/api/Secuencias/procesar?empresaId=${empresaId}`, { method: "POST" });
                  if (r.motivo) return r.motivo;
                  return `${r.enviados} enviados${r.simulados ? `, ${r.simulados} simulados` : ""}${r.errores ? `, ${r.errores} con error` : ""}${r.bajas ? `, ${r.bajas} bajas` : ""}`;
                })}>
                  {ocupado === "procesar" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar pendientes ahora
                </button>
              </div>
              <form
                className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  void correr("manual", async () => {
                    await api(`/api/Secuencias/${sel.secuencia.secuenciaId}/contactos`, { method: "POST", body: JSON.stringify({ empresaId, ...manual }) });
                    setManual({ email: "", nombre: "", empresa: "", contexto: "" });
                    return "Contacto agregado";
                  });
                }}
              >
                <input className={CAMPO} type="email" required placeholder="Correo" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} />
                <input className={CAMPO} placeholder="Nombre" value={manual.nombre} onChange={(e) => setManual({ ...manual, nombre: e.target.value })} />
                <input className={CAMPO} placeholder="Empresa" value={manual.empresa} onChange={(e) => setManual({ ...manual, empresa: e.target.value })} />
                <button className={BOTON} disabled={!!ocupado}><Mail size={13} /> Agregar</button>
                <input className={`${CAMPO} sm:col-span-4`} placeholder="Contexto para la IA (qué necesita, tamaño, cómo lo conociste)" value={manual.contexto} onChange={(e) => setManual({ ...manual, contexto: e.target.value })} />
              </form>
            </div>

            {redactados.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-[14px] font-semibold text-white">Para revisar ({redactados.length})</h2>
                {redactados.map((c) => <FilaBorrador key={`${c.contactoId}-${c.asunto}`} c={c} empresaId={empresaId} onCambio={recargar} />)}
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0C1327]">
              <table className="w-full text-[12.5px]">
                <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                  <tr><th className="px-3 py-2 text-left">Contacto</th><th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-right">Correos</th><th className="px-3 py-2 text-left">Próximo envío</th><th className="px-3 py-2" /></tr>
                </thead>
                <tbody>
                  {resto.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Sin contactos todavía. Agregalos desde el CRM, Necesidades del Mercado o a mano.</td></tr>
                  )}
                  {resto.map((c) => (
                    <tr key={c.contactoId} className="border-t border-white/5 text-slate-300">
                      <td className="px-3 py-2"><span className="text-white">{c.nombre || c.email}</span><span className="block text-[11px] text-slate-500">{c.empresa ?? ""} · {c.email}</span></td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${ESTADOS[c.estado]?.color ?? ""}`}>{ESTADOS[c.estado]?.label ?? c.estado}</span>
                        {c.estado === "Error" && c.detalle && <span className="block text-[11px] text-rose-300">{c.detalle}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.pasoActual}/{sel.secuencia.pasos}</td>
                      <td className="px-3 py-2">{c.proximoEnvio ? fechaUtc(c.proximoEnvio).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {(c.estado === "EnCurso" || c.estado === "Terminado" || c.estado === "Aprobado") && (
                          <button type="button" className="text-[12px] font-semibold text-emerald-300 hover:underline" onClick={() => void correr(`r${c.contactoId}`, async () => {
                            await api(`/api/Secuencias/contactos/${c.contactoId}/estado`, { method: "POST", body: JSON.stringify({ empresaId, estado: "Respondio" }) });
                            return "Marcado como respondió: se frenan los seguimientos";
                          })}>Respondió</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
