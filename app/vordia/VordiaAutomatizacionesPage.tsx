"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  X,
  Play,
  FlaskConical,
  Pause,
  History,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Automatizacion = {
  automatizacionId: number;
  nombre: string;
  descripcion?: string | null;
  disparador: string;
  disparadorNombre: string;
  diasAnticipacion: number;
  accion: string;
  accionNombre: string;
  emailDestino?: string | null;
  asuntoPlantilla?: string | null;
  mensajePlantilla?: string | null;
  activa: boolean;
  ultimaEjecucion?: string | null;
  ultimoResultado?: string | null;
  vecesDisparada: number;
  creadoPor?: string | null;
  fechaCreacion: string;
};

type Opcion = {
  codigo: string;
  nombre: string;
  descripcion: string;
  etiquetaDias?: string | null;
};

type Catalogo = { disparadores: Opcion[]; acciones: Opcion[] };

type Ejecucion = {
  ejecucionId: number;
  automatizacionId: number;
  automatizacionNombre: string;
  resultado: string;
  referencia?: string | null;
  detalle?: string | null;
  fecha: string;
};

type Corrida = {
  reglasEvaluadas: number;
  coincidencias: number;
  disparos: number;
  yaAvisados: number;
  errores: number;
  detalle: string[];
  resumen: string;
};

type Props = { empresaId: number; usuarioNombre?: string };

const emptyForm = {
  nombre: "",
  descripcion: "",
  disparador: "documento_por_vencer",
  diasAnticipacion: 5,
  accion: "email",
  emailDestino: "",
  asuntoPlantilla: "",
  mensajePlantilla: "",
  activa: false,
};

function badgeResultado(resultado: string) {
  if (resultado === "error") return "bg-red-500/20 text-red-300 border-red-500/30";
  if (resultado === "omitido") return "bg-white/5 text-slate-400 border-white/10";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
}

function fechaHora(valor?: string | null) {
  if (!valor) return "nunca";
  return new Date(valor).toLocaleString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VordiaAutomatizacionesPage({ empresaId, usuarioNombre }: Props) {
  const [items, setItems] = useState<Automatizacion[]>([]);
  const [catalogo, setCatalogo] = useState<Catalogo>({ disparadores: [], acciones: [] });
  const [ejecuciones, setEjecuciones] = useState<Ejecucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [corriendo, setCorriendo] = useState<number | "todas" | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const [aRes, cRes, eRes] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/automatizaciones?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/automatizaciones/catalogo`),
        fetch(`${API_BASE}/api/Crm/automatizaciones/ejecuciones?empresaId=${empresaId}&top=40`),
      ]);

      if (!aRes.ok) {
        const err = await aRes.json().catch(() => null);
        if (aRes.status === 401) throw new Error("Sesión vencida: volvé a iniciar sesión.");
        throw new Error(err?.mensaje || `El servidor respondió ${aRes.status}.`);
      }
      setItems(await aRes.json());
      if (cRes.ok) setCatalogo(await cRes.json());
      if (eRes.ok) setEjecuciones(await eRes.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar las automatizaciones (¿ejecutaste el script SQL?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) void cargar();
  }, [empresaId]);

  const disparadorActual = useMemo(
    () => catalogo.disparadores.find((d) => d.codigo === form.disparador),
    [catalogo.disparadores, form.disparador]
  );

  const activas = items.filter((a) => a.activa).length;
  const avisosTotales = items.reduce((acc, a) => acc + a.vecesDisparada, 0);

  const abrirNueva = () => {
    setEditId(null);
    setForm({ ...emptyForm, disparador: catalogo.disparadores[0]?.codigo || "documento_por_vencer" });
    setOpen(true);
  };

  const abrirEditar = (a: Automatizacion) => {
    setEditId(a.automatizacionId);
    setForm({
      nombre: a.nombre,
      descripcion: a.descripcion || "",
      disparador: a.disparador,
      diasAnticipacion: a.diasAnticipacion,
      accion: a.accion,
      emailDestino: a.emailDestino || "",
      asuntoPlantilla: a.asuntoPlantilla || "",
      mensajePlantilla: a.mensajePlantilla || "",
      activa: a.activa,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error("Ponele un nombre a la regla");
      return;
    }
    setGuardando(true);
    try {
      const url = editId
        ? `${API_BASE}/api/Crm/automatizaciones/${editId}`
        : `${API_BASE}/api/Crm/automatizaciones`;
      const r = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          disparador: form.disparador,
          diasAnticipacion: Number(form.diasAnticipacion) || 0,
          accion: form.accion,
          emailDestino: form.emailDestino.trim() || null,
          asuntoPlantilla: form.asuntoPlantilla.trim() || null,
          mensajePlantilla: form.mensajePlantilla.trim() || null,
          activa: form.activa,
          creadoPor: usuarioNombre || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        throw new Error(err?.mensaje || "No se pudo guardar la regla");
      }
      toast.success(editId ? "Regla actualizada" : "Regla creada");
      setOpen(false);
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la regla");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (a: Automatizacion) => {
    const r = await fetch(`${API_BASE}/api/Crm/automatizaciones/${a.automatizacionId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId, activa: !a.activa }),
    });
    if (r.ok) {
      toast.success(a.activa ? `"${a.nombre}" quedó en pausa` : `"${a.nombre}" está encendida`);
      void cargar();
    } else toast.error("No se pudo cambiar el estado");
  };

  const eliminar = async (a: Automatizacion) => {
    if (!confirm(`¿Eliminar la regla "${a.nombre}"?`)) return;
    const r = await fetch(`${API_BASE}/api/Crm/automatizaciones/${a.automatizacionId}?empresaId=${empresaId}`, {
      method: "DELETE",
    });
    if (r.ok) {
      toast.success("Regla eliminada");
      void cargar();
    } else toast.error("No se pudo eliminar la regla");
  };

  const correr = async (automatizacionId: number | null, simular: boolean) => {
    setCorriendo(automatizacionId ?? "todas");
    try {
      const params = new URLSearchParams({ empresaId: String(empresaId) });
      if (automatizacionId) params.set("automatizacionId", String(automatizacionId));
      if (simular) params.set("simular", "true");

      const r = await fetch(`${API_BASE}/api/Crm/automatizaciones/ejecutar?${params}`, { method: "POST" });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        throw new Error(err?.mensaje || "No se pudo correr el motor");
      }
      const corrida: Corrida = await r.json();

      if (corrida.errores > 0) toast.error(corrida.resumen, { duration: 9000 });
      else toast.success(corrida.resumen, { duration: 7000 });

      if (corrida.detalle.length) {
        // El detalle explica exactamente por qué disparó cada aviso
        toast.message(simular ? "Esto haría" : "Detalle", {
          description: corrida.detalle.slice(0, 6).join("\n"),
          duration: 12000,
        });
      }
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo correr el motor");
    } finally {
      setCorriendo(null);
    }
  };

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap size={18} className="text-[#5eb0ff]" /> Automatizaciones
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Reglas que revisan la operación cada 6 horas y avisan solas: cobros, documentos por vencer, leads sin
            contactar.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => void correr(null, false)}
            disabled={corriendo !== null}
            variant="ghost"
            className="rounded-xl font-bold gap-2 text-slate-300 border border-white/10"
          >
            {corriendo === "todas" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Correr ahora
          </Button>
          <Button onClick={abrirNueva} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
            <Plus size={16} /> Nueva regla
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/5 bg-[#0C1327] p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Reglas</div>
          <p className="text-2xl font-bold text-white mt-1">{items.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0C1327] p-4">
          <div className="text-[11px] uppercase tracking-wide text-emerald-400/80 font-bold">Encendidas</div>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{activas}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0C1327] p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">En pausa</div>
          <p className="text-2xl font-bold text-slate-300 mt-1">{items.length - activas}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0C1327] p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Avisos enviados</div>
          <p className="text-2xl font-bold text-white mt-1">{avisosTotales}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm p-4">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.automatizacionId} className="rounded-xl border border-white/5 bg-[#0C1327] p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">{a.nombre}</p>
                    <span
                      className={`text-[10px] font-bold rounded-full border px-2 py-0.5 ${
                        a.activa
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      {a.activa ? "Encendida" : "En pausa"}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wide text-[#5eb0ff]">
                      {a.accionNombre}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {a.disparadorNombre} · {a.diasAnticipacion} día(s)
                    {a.emailDestino ? ` · avisa a ${a.emailDestino}` : " · avisa a la casilla de Vordia"}
                  </p>
                  {a.descripcion && <p className="text-[11px] text-slate-500 mt-1">{a.descripcion}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void correr(a.automatizacionId, true)}
                    disabled={corriendo !== null}
                    title="Probar sin enviar nada"
                    className="p-2 rounded-lg text-slate-500 hover:text-amber-300 disabled:opacity-40"
                  >
                    {corriendo === a.automatizacionId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FlaskConical size={14} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void correr(a.automatizacionId, false)}
                    disabled={corriendo !== null}
                    title="Ejecutar esta regla ahora"
                    className="p-2 rounded-lg text-slate-500 hover:text-emerald-300 disabled:opacity-40"
                  >
                    <Play size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void cambiarEstado(a)}
                    title={a.activa ? "Pausar" : "Encender"}
                    className="p-2 rounded-lg text-slate-500 hover:text-[#5eb0ff]"
                  >
                    {a.activa ? <Pause size={14} /> : <Zap size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirEditar(a)}
                    title="Editar"
                    className="p-2 rounded-lg text-slate-500 hover:text-white"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void eliminar(a)}
                    title="Eliminar"
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 border-t border-white/5 pt-2">
                <span className="flex items-center gap-1">
                  {a.ultimoResultado?.includes("error") ? (
                    <AlertTriangle size={12} className="text-red-400" />
                  ) : (
                    <CheckCircle2 size={12} className="text-emerald-400/70" />
                  )}
                  Última corrida: {fechaHora(a.ultimaEjecucion)}
                </span>
                {a.ultimoResultado && <span>· {a.ultimoResultado}</span>}
                <span>· {a.vecesDisparada} aviso(s) en total</span>
              </div>
            </div>
          ))}
          {!items.length && (
            <p className="text-center text-slate-600 text-sm py-10">
              Todavía no hay reglas. Creá la primera para que HQ te avise sin que tengas que revisar a mano.
            </p>
          )}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <button
          type="button"
          onClick={() => setVerHistorial((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-white"
        >
          <History size={16} className="text-[#5eb0ff]" />
          Bitácora de disparos ({ejecuciones.length})
          <span className="text-[11px] text-slate-500 font-normal">{verHistorial ? "ocultar" : "ver"}</span>
        </button>

        {verHistorial && (
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {ejecuciones.map((e) => (
              <div key={e.ejecucionId} className="rounded-xl border border-white/5 bg-[#050B18] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold rounded-full border px-2 py-0.5 ${badgeResultado(e.resultado)}`}>
                    {e.resultado}
                  </span>
                  <p className="text-xs font-semibold text-white">{e.automatizacionNombre}</p>
                  <span className="text-[11px] text-slate-500">{fechaHora(e.fecha)}</span>
                </div>
                {e.referencia && <p className="text-[11px] text-slate-400 mt-1">{e.referencia}</p>}
                {e.detalle && <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{e.detalle}</p>}
              </div>
            ))}
            {!ejecuciones.length && (
              <p className="text-center text-slate-600 text-sm py-6">
                Sin disparos registrados. Probá una regla con el matraz para ver qué encontraría.
              </p>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{editId ? "Editar regla" : "Nueva regla"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre de la regla *"
              className="bg-[#050B18] border-white/10 text-white rounded-xl"
            />

            <div>
              <label className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Cuándo se dispara</label>
              <select
                value={form.disparador}
                onChange={(e) => setForm({ ...form, disparador: e.target.value })}
                className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm mt-1"
              >
                {catalogo.disparadores.map((d) => (
                  <option key={d.codigo} value={d.codigo}>
                    {d.nombre}
                  </option>
                ))}
              </select>
              {disparadorActual && <p className="text-[11px] text-slate-500 mt-1">{disparadorActual.descripcion}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">
                  {disparadorActual?.etiquetaDias || "Días"}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={form.diasAnticipacion}
                  onChange={(e) => setForm({ ...form, diasAnticipacion: Number(e.target.value) })}
                  className="bg-[#050B18] border-white/10 text-white rounded-xl mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Qué hace</label>
                <select
                  value={form.accion}
                  onChange={(e) => setForm({ ...form, accion: e.target.value })}
                  className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm mt-1"
                >
                  {catalogo.acciones.map((a) => (
                    <option key={a.codigo} value={a.codigo}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              value={form.emailDestino}
              onChange={(e) => setForm({ ...form, emailDestino: e.target.value })}
              placeholder="Correo que recibe el aviso (si lo dejás vacío va a la casilla de Vordia)"
              className="bg-[#050B18] border-white/10 text-white rounded-xl"
            />

            <Input
              value={form.asuntoPlantilla}
              onChange={(e) => setForm({ ...form, asuntoPlantilla: e.target.value })}
              placeholder="Asunto del aviso (opcional)"
              className="bg-[#050B18] border-white/10 text-white rounded-xl"
            />

            <textarea
              value={form.mensajePlantilla}
              onChange={(e) => setForm({ ...form, mensajePlantilla: e.target.value })}
              placeholder="Mensaje del aviso (opcional)"
              rows={3}
              className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-slate-500">
              En el asunto y el mensaje podés usar <code className="text-[#5eb0ff]">{"{referencia}"}</code>,{" "}
              <code className="text-[#5eb0ff]">{"{fecha}"}</code>, <code className="text-[#5eb0ff]">{"{dias}"}</code> y{" "}
              <code className="text-[#5eb0ff]">{"{monto}"}</code>. Si los dejás vacíos se usa un texto por defecto.
            </p>

            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Para qué sirve esta regla (nota interna)"
              rows={2}
              className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
            />

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                className="rounded border-white/20 bg-[#050B18]"
              />
              Encender esta regla ahora
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl text-slate-400">
                Cancelar
              </Button>
              <Button onClick={() => void guardar()} disabled={guardando} className="bg-[#007bff] rounded-xl font-bold">
                {guardando ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
