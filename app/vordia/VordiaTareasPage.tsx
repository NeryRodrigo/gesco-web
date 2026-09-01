"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, CheckSquare, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatFecha } from "./VordiaClientesPage";

type Tarea = {
  tareaId: number;
  titulo: string;
  descripcion?: string | null;
  fechaVencimiento?: string | null;
  estado: string;
  prioridad: string;
  clienteId?: number | null;
  clienteNombre?: string | null;
  asignadoNombre?: string | null;
  vencida: boolean;
};

type ClienteOpt = { clienteId: number; razonSocial: string };

const ESTADOS = ["Pendiente", "En curso", "Hecha", "Cancelada"] as const;
const PRIORIDADES = ["Baja", "Media", "Alta"] as const;

function priColor(p: string) {
  if (p === "Alta") return "text-red-300";
  if (p === "Baja") return "text-slate-500";
  return "text-amber-300";
}

type Props = { empresaId: number; usuario: { id?: number; nombre?: string } | null };

export function VordiaTareasPage({ empresaId, usuario }: Props) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fechaVencimiento: "",
    estado: "Pendiente",
    prioridad: "Media",
    clienteId: "",
    asignadoNombre: "",
  });

  const cargar = async () => {
    try {
      setLoading(true);
      const [tRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/tareas?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
      ]);
      if (!tRes.ok) throw new Error();
      setTareas(await tRes.json());
      if (cRes.ok) {
        const list = await cRes.json();
        setClientes(list.map((c: any) => ({ clienteId: c.clienteId, razonSocial: c.razonSocial })));
      }
    } catch {
      toast.error("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) cargar();
  }, [empresaId]);

  const porEstado = useMemo(() => {
    return ESTADOS.map((estado) => ({
      estado,
      items: tareas.filter((t) => t.estado === estado),
    }));
  }, [tareas]);

  const abrirNueva = () => {
    setForm({
      titulo: "",
      descripcion: "",
      fechaVencimiento: new Date().toISOString().slice(0, 10),
      estado: "Pendiente",
      prioridad: "Media",
      clienteId: "",
      asignadoNombre: usuario?.nombre || "",
    });
    setModalOpen(true);
  };

  const guardar = async () => {
    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    const res = await fetch(`${API_BASE}/api/Crm/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        titulo: form.titulo,
        descripcion: form.descripcion,
        fechaVencimiento: form.fechaVencimiento || null,
        estado: form.estado,
        prioridad: form.prioridad,
        clienteId: form.clienteId ? Number(form.clienteId) : null,
        asignadoUsuarioId: usuario?.id,
        asignadoNombre: form.asignadoNombre || usuario?.nombre,
      }),
    });
    if (res.ok) {
      toast.success("Tarea creada");
      setModalOpen(false);
      cargar();
    } else toast.error("No se pudo crear la tarea");
  };

  const cambiarEstado = async (t: Tarea, estado: string) => {
    const res = await fetch(
      `${API_BASE}/api/Crm/tareas/${t.tareaId}/estado?empresaId=${empresaId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      }
    );
    if (res.ok) {
      toast.success(`→ ${estado}`);
      cargar();
    } else toast.error("No se pudo cambiar el estado");
  };

  const eliminar = async (t: Tarea) => {
    if (!confirm(`¿Eliminar "${t.titulo}"?`)) return;
    const res = await fetch(`${API_BASE}/api/Crm/tareas/${t.tareaId}?empresaId=${empresaId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Tarea eliminada");
      cargar();
    }
  };

  const [detalle, setDetalle] = useState<Tarea | null>(null);
  const [objsTarea, setObjsTarea] = useState<any[]>([]);
  const [nuevoObj, setNuevoObj] = useState({ titulo: "", notasReunion: "" });

  const abrirDetalle = async (t: Tarea) => {
    setDetalle(t);
    setNuevoObj({ titulo: "", notasReunion: "" });
    try {
      const r = await fetch(`${API_BASE}/api/Crm/objetivos?empresaId=${empresaId}&tareaId=${t.tareaId}`);
      if (r.ok) setObjsTarea(await r.json());
      else setObjsTarea([]);
    } catch {
      setObjsTarea([]);
    }
  };

  const guardarObjTarea = async () => {
    if (!detalle || !nuevoObj.titulo.trim()) {
      toast.error("Título del objetivo obligatorio");
      return;
    }
    const r = await fetch(`${API_BASE}/api/Crm/objetivos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        ambito: "Tarea",
        titulo: nuevoObj.titulo,
        notasReunion: nuevoObj.notasReunion || null,
        tareaId: detalle.tareaId,
        estado: "Pendiente",
        prioridad: "Media",
        creadoPor: usuario?.nombre,
      }),
    });
    if (r.ok) {
      toast.success("Objetivo de tarea añadido");
      setNuevoObj({ titulo: "", notasReunion: "" });
      abrirDetalle(detalle);
    } else toast.error("No se pudo añadir objetivo");
  };

  const guardarEdicionDetalle = async () => {
    if (!detalle) return;
    const r = await fetch(`${API_BASE}/api/Crm/tareas/${detalle.tareaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        titulo: detalle.titulo,
        descripcion: detalle.descripcion,
        fechaVencimiento: detalle.fechaVencimiento,
        estado: detalle.estado,
        prioridad: detalle.prioridad,
        clienteId: detalle.clienteId,
        asignadoNombre: detalle.asignadoNombre,
      }),
    });
    if (r.ok) {
      toast.success("Tarea actualizada");
      setDetalle(null);
      cargar();
    } else toast.error("No se pudo guardar");
  };

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="vordia-toolbar flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <p className="text-sm text-[#94a3b8]">
          Tablero cronológico: prioridades, vencimientos y responsables (Eli / Nery).
        </p>
        <Button onClick={abrirNueva} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2 w-full sm:w-auto shrink-0">
          <Plus size={16} /> Nueva tarea
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm p-4">Cargando tareas…</p>
      ) : (
        <div className="vordia-kanban flex gap-3 overflow-x-auto pb-3 snap-x">
          {porEstado.map((col) => (
            <div
              key={col.estado}
              className="snap-start shrink-0 w-[min(260px,85vw)] lg:w-[280px] rounded-[1.25rem] border border-white/5 bg-[#080E1E] flex flex-col max-h-[70vh]"
            >
              <div className="px-4 py-3 border-b border-white/5 flex justify-between">
                <p className="text-[11px] font-bold uppercase text-white">{col.estado}</p>
                <span className="text-[10px] text-slate-500 font-bold">{col.items.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {col.items.length === 0 && (
                  <p className="text-[11px] text-slate-600 text-center py-8">Vacío</p>
                )}
                {col.items.map((t) => (
                  <div
                    key={t.tareaId}
                    role="button"
                    tabIndex={0}
                    onClick={() => void abrirDetalle(t)}
                    onKeyDown={(e) => e.key === "Enter" && void abrirDetalle(t)}
                    className={`rounded-xl border p-3 space-y-2 cursor-pointer hover:border-[#007bff]/50 transition ${
                      t.vencida ? "border-red-500/40 bg-red-500/5" : "border-white/5 bg-[#0C1327]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white leading-snug">{t.titulo}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void eliminar(t);
                        }}
                        className="vordia-icon-btn p-2 rounded-lg text-slate-600 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {t.descripcion && (
                      <p className="text-[11px] text-[#94a3b8] line-clamp-2">{t.descripcion}</p>
                    )}
                    <p className={`text-[10px] font-bold uppercase ${priColor(t.prioridad)}`}>
                      {t.prioridad}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Vence {formatFecha(t.fechaVencimiento)}
                      {t.vencida ? " · VENCIDA" : ""}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {t.asignadoNombre || "Sin asignar"}
                      {t.clienteNombre ? ` · ${t.clienteNombre}` : ""}
                    </p>
                    <select
                      value={t.estado}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        void cambiarEstado(t, e.target.value);
                      }}
                      className="w-full bg-[#050B18] border border-white/10 text-[10px] text-slate-300 rounded-lg px-1.5 py-1.5"
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-[#007bff] font-bold uppercase tracking-wide">Clic · ver detalle</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="vordia-modal fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="vordia-modal-panel w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckSquare size={18} className="text-[#007bff]" /> Nueva tarea
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título *" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} className="bg-[#050B18] border-white/10 text-white rounded-xl" />
                <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <Input value={form.asignadoNombre} onChange={(e) => setForm({ ...form, asignadoNombre: e.target.value })} placeholder="Asignado a" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                <option value="">Sin cliente vinculado</option>
                {clientes.map((c) => (
                  <option key={c.clienteId} value={c.clienteId}>{c.razonSocial}</option>
                ))}
              </select>
            </div>
            <div className="vordia-modal-actions flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={guardar} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold">Crear</Button>
            </div>
          </div>
        </div>
      )}

      {detalle && (
        <div className="vordia-modal fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div
            className="vordia-modal-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#5eb0ff]">Detalle de tarea</p>
                <h3 className="text-lg font-semibold text-white mt-1">Editar y objetivos</h3>
              </div>
              <button type="button" onClick={() => setDetalle(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <Input
                value={detalle.titulo}
                onChange={(e) => setDetalle({ ...detalle, titulo: e.target.value })}
                className="bg-[#050B18] border-white/10 text-white rounded-xl font-semibold"
              />
              <textarea
                value={detalle.descripcion || ""}
                onChange={(e) => setDetalle({ ...detalle, descripcion: e.target.value })}
                placeholder="Descripción / contexto"
                rows={3}
                className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm resize-y"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={detalle.fechaVencimiento ? String(detalle.fechaVencimiento).slice(0, 10) : ""}
                  onChange={(e) => setDetalle({ ...detalle, fechaVencimiento: e.target.value })}
                  className="bg-[#050B18] border-white/10 text-white rounded-xl"
                />
                <select
                  value={detalle.prioridad}
                  onChange={(e) => setDetalle({ ...detalle, prioridad: e.target.value })}
                  className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
                >
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={detalle.estado}
                  onChange={(e) => setDetalle({ ...detalle, estado: e.target.value })}
                  className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
                >
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <Input
                  value={detalle.asignadoNombre || ""}
                  onChange={(e) => setDetalle({ ...detalle, asignadoNombre: e.target.value })}
                  placeholder="Asignado a"
                  className="bg-[#050B18] border-white/10 text-white rounded-xl"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Cliente: {detalle.clienteNombre || "Sin vincular"}
                {detalle.vencida ? " · VENCIDA" : ""}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#050B18]/80 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-white">Objetivos generales de esta tarea</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {objsTarea.length === 0 && (
                  <p className="text-[11px] text-slate-600 py-2">Sin objetivos aún. Agregá lo que quieren lograr Eli y Nery con esta tarjeta.</p>
                )}
                {objsTarea.map((o: any) => (
                  <div key={o.objetivoId} className="rounded-lg border border-white/5 bg-[#0C1327] px-3 py-2">
                    <p className="text-xs font-semibold text-white">{o.titulo}</p>
                    <p className="text-[10px] text-slate-500">{o.estado} · {o.prioridad}</p>
                    {o.notasReunion && (
                      <p className="text-[11px] text-slate-400 mt-1 whitespace-pre-wrap">{o.notasReunion}</p>
                    )}
                  </div>
                ))}
              </div>
              <Input
                value={nuevoObj.titulo}
                onChange={(e) => setNuevoObj({ ...nuevoObj, titulo: e.target.value })}
                placeholder="Nuevo objetivo *"
                className="bg-[#0C1327] border-white/10 text-white rounded-xl"
              />
              <textarea
                value={nuevoObj.notasReunion}
                onChange={(e) => setNuevoObj({ ...nuevoObj, notasReunion: e.target.value })}
                placeholder="Nota de reunión / acuerdo con socia (opcional)"
                rows={2}
                className="w-full bg-[#0C1327] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
              />
              <Button type="button" onClick={() => void guardarObjTarea()} variant="outline" className="rounded-xl border-white/15 text-slate-200 gap-2">
                <Plus size={14} /> Añadir objetivo
              </Button>
            </div>

            <div className="vordia-modal-actions flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDetalle(null)} className="rounded-xl text-slate-400">Cerrar</Button>
              <Button onClick={() => void guardarEdicionDetalle()} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold">Guardar tarea</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
