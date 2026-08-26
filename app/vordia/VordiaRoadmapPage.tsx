"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Pencil, Trash2, X, Map, Lightbulb, Handshake, History, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatFecha } from "./VordiaClientesPage";

type RoadmapItem = {
  roadmapId: number;
  tipo: string;
  titulo: string;
  descripcion?: string | null;
  estado: string;
  prioridad: string;
  responsableUsuarioId?: number | null;
  responsableNombre?: string | null;
  fechaRegistro: string;
  fechaMeta?: string | null;
  proximoPaso?: string | null;
  fechaProximoPaso?: string | null;
  convertidoA?: string | null;
  notas?: string | null;
  vencidoProximoPaso?: boolean;
  vencidaMeta?: boolean;
  historial?: HistorialItem[];
};

type HistorialItem = {
  historialId: number;
  tipo: string;
  titulo: string;
  detalle?: string | null;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  usuarioNombre?: string | null;
  fecha: string;
};

const TIPOS = ["Idea", "Alianza"] as const;
const ESTADOS = ["Borrador", "En evaluacion", "Priorizado", "En curso", "Convertido", "Descartado"] as const;
const PRIORIDADES = ["P0", "P1", "P2"] as const;
const CONVERTIDOS = ["", "Producto", "CRM", "Proyecto"] as const;
const RESPONSABLES = ["Eli Ortigoza", "Nery Chavez"] as const;

function estadoColor(e: string) {
  switch (e) {
    case "Borrador": return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    case "En evaluacion": return "bg-sky-500/20 text-sky-300 border-sky-500/30";
    case "Priorizado": return "bg-violet-500/20 text-violet-300 border-violet-500/30";
    case "En curso": return "bg-[#007bff]/20 text-[#5eb0ff] border-[#007bff]/35";
    case "Convertido": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "Descartado": return "bg-red-500/20 text-red-300 border-red-500/30";
    default: return "bg-white/10 text-slate-400 border-white/10";
  }
}

function priColor(p: string) {
  if (p === "P0") return "text-red-300";
  if (p === "P1") return "text-amber-300";
  return "text-slate-400";
}

function toDateInput(v?: string | null) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

const emptyForm = {
  tipo: "Idea",
  titulo: "",
  descripcion: "",
  estado: "Borrador",
  prioridad: "P2",
  responsableNombre: "",
  fechaRegistro: new Date().toISOString().slice(0, 10),
  fechaMeta: "",
  proximoPaso: "",
  fechaProximoPaso: "",
  convertidoA: "",
  notas: "",
};

type Props = { empresaId: number; usuario: { id?: number; nombre?: string } | null };

export function VordiaRoadmapPage({ empresaId, usuario }: Props) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [detalle, setDetalle] = useState<RoadmapItem | null>(null);
  const [notaTitulo, setNotaTitulo] = useState("");
  const [notaDetalle, setNotaDetalle] = useState("");

  const cargar = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ empresaId: String(empresaId) });
      if (filtroTipo) params.set("tipo", filtroTipo);
      if (filtroEstado) params.set("estado", filtroEstado);
      const res = await fetch(`${API_BASE}/api/Crm/roadmap?${params}`);
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      toast.error("No se pudo cargar el roadmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, filtroTipo, filtroEstado]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      responsableNombre: usuario?.nombre || "",
      fechaRegistro: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const abrirEditar = (r: RoadmapItem) => {
    setEditId(r.roadmapId);
    setForm({
      tipo: r.tipo,
      titulo: r.titulo,
      descripcion: r.descripcion || "",
      estado: r.estado,
      prioridad: r.prioridad,
      responsableNombre: r.responsableNombre || "",
      fechaRegistro: toDateInput(r.fechaRegistro),
      fechaMeta: toDateInput(r.fechaMeta),
      proximoPaso: r.proximoPaso || "",
      fechaProximoPaso: toDateInput(r.fechaProximoPaso),
      convertidoA: r.convertidoA || "",
      notas: r.notas || "",
    });
    setModalOpen(true);
  };

  const bodyPayload = () => ({
    empresaId,
    tipo: form.tipo,
    titulo: form.titulo,
    descripcion: form.descripcion || null,
    estado: form.estado,
    prioridad: form.prioridad,
    responsableNombre: form.responsableNombre || null,
    fechaRegistro: form.fechaRegistro || null,
    fechaMeta: form.fechaMeta || null,
    proximoPaso: form.proximoPaso || null,
    fechaProximoPaso: form.fechaProximoPaso || null,
    convertidoA: form.convertidoA || null,
    notas: form.notas || null,
    usuarioId: usuario?.id,
    usuarioNombre: usuario?.nombre,
  });

  const guardar = async () => {
    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    try {
      const res = await fetch(
        editId ? `${API_BASE}/api/Crm/roadmap/${editId}` : `${API_BASE}/api/Crm/roadmap`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload()),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(editId ? "Actualizado" : "Registrado en Roadmap");
      setModalOpen(false);
      cargar();
      if (detalle?.roadmapId === editId) abrirDetalle(editId!);
    } catch {
      toast.error("No se pudo guardar");
    }
  };

  const eliminar = async (r: RoadmapItem) => {
    if (!confirm(`¿Archivar "${r.titulo}"?`)) return;
    const res = await fetch(`${API_BASE}/api/Crm/roadmap/${r.roadmapId}?empresaId=${empresaId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Archivado");
      if (detalle?.roadmapId === r.roadmapId) setDetalle(null);
      cargar();
    } else toast.error("No se pudo archivar");
  };

  const abrirDetalle = async (roadmapId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/Crm/roadmap/${roadmapId}?empresaId=${empresaId}`);
      if (!res.ok) throw new Error();
      setDetalle(await res.json());
    } catch {
      toast.error("No se pudo abrir el detalle");
    }
  };

  const cambiarEstado = async (r: RoadmapItem, estado: string) => {
    const res = await fetch(
      `${API_BASE}/api/Crm/roadmap/${r.roadmapId}/estado?empresaId=${empresaId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado,
          usuarioId: usuario?.id,
          usuarioNombre: usuario?.nombre,
        }),
      }
    );
    if (res.ok) {
      toast.success(`→ ${estado}`);
      cargar();
      if (detalle?.roadmapId === r.roadmapId) abrirDetalle(r.roadmapId);
    } else toast.error("No se pudo cambiar el estado");
  };

  const agregarNota = async () => {
    if (!detalle || !notaTitulo.trim()) return;
    const res = await fetch(`${API_BASE}/api/Crm/roadmap/${detalle.roadmapId}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        titulo: notaTitulo,
        detalle: notaDetalle,
        usuarioId: usuario?.id,
        usuarioNombre: usuario?.nombre,
      }),
    });
    if (res.ok) {
      toast.success("Nota registrada");
      setNotaTitulo("");
      setNotaDetalle("");
      setDetalle(await res.json());
      cargar();
    } else toast.error("No se pudo agregar la nota");
  };

  const stats = useMemo(() => ({
    ideas: items.filter((i) => i.tipo === "Idea").length,
    alianzas: items.filter((i) => i.tipo === "Alianza").length,
    activos: items.filter((i) => !["Convertido", "Descartado"].includes(i.estado)).length,
    vencidos: items.filter((i) => i.vencidoProximoPaso || i.vencidaMeta).length,
  }), [items]);

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="vordia-toolbar flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <div className="min-w-0">
          <p className="text-sm text-white font-medium flex items-center gap-2">
            <Map size={16} className="text-[#007bff] shrink-0" />
            Roadmap · Ideas & Alianzas
          </p>
          <p className="text-xs text-[#94a3b8] mt-1">
            Registro estratégico compartido (Eli / Nery) con fechas, próximos pasos e historial.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-[#050B18] border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm w-full sm:w-auto"
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[#050B18] border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm w-full sm:w-auto"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <Button onClick={abrirNuevo} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2 w-full sm:w-auto shrink-0">
            <Plus size={16} /> Nueva idea / alianza
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
        {[
          { l: "Ideas", v: String(stats.ideas), icon: <Lightbulb size={14} /> },
          { l: "Alianzas", v: String(stats.alianzas), icon: <Handshake size={14} /> },
          { l: "Activos", v: String(stats.activos), icon: <Map size={14} /> },
          { l: "Fechas vencidas", v: String(stats.vencidos), icon: <AlertTriangle size={14} /> },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-white/5 bg-[#0C1327] p-3.5 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{k.l}</p>
              <span className="text-[#5eb0ff] opacity-80">{k.icon}</span>
            </div>
            <p className="text-xl font-semibold text-white">{k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className={`${detalle ? "xl:col-span-3" : "xl:col-span-5"} rounded-[1.5rem] border border-white/5 bg-[#0C1327] overflow-hidden`}>
          {loading ? (
            <p className="p-8 text-slate-500 text-sm">Cargando roadmap…</p>
          ) : items.length === 0 ? (
            <p className="p-8 text-slate-500 text-sm">Sin registros. Creá la primera idea o alianza.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map((r) => (
                <button
                  key={r.roadmapId}
                  type="button"
                  onClick={() => abrirDetalle(r.roadmapId)}
                  className={`w-full text-left px-4 lg:px-5 py-4 hover:bg-white/[0.03] transition-colors flex gap-3 items-start ${
                    detalle?.roadmapId === r.roadmapId ? "bg-[#007bff]/10" : ""
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    r.tipo === "Alianza" ? "bg-emerald-500/15 text-emerald-300" : "bg-[#007bff]/15 text-[#007bff]"
                  }`}>
                    {r.tipo === "Alianza" ? <Handshake size={18} /> : <Lightbulb size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white truncate">{r.titulo}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${estadoColor(r.estado)}`}>
                        {r.estado}
                      </span>
                      <span className={`text-[10px] font-black uppercase ${priColor(r.prioridad)}`}>{r.prioridad}</span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-1 truncate">
                      {r.tipo} · {r.responsableNombre || "Sin responsable"} · Registro {formatFecha(r.fechaRegistro)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Meta {formatFecha(r.fechaMeta)}
                      {r.fechaProximoPaso ? ` · Próx. paso ${formatFecha(r.fechaProximoPaso)}` : ""}
                      {r.vencidoProximoPaso || r.vencidaMeta ? " · VENCIDO" : ""}
                    </p>
                    {r.proximoPaso && (
                      <p className="text-[11px] text-[#5eb0ff] mt-1 truncate">→ {r.proximoPaso}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); abrirEditar(r); }}
                      className="vordia-icon-btn p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"
                    >
                      <Pencil size={14} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); eliminar(r); }}
                      className="vordia-icon-btn p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5"
                    >
                      <Trash2 size={14} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {detalle && (
          <div className="xl:col-span-2 rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">{detalle.titulo}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${estadoColor(detalle.estado)}`}>
                    {detalle.estado}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">{detalle.tipo}</span>
                  <span className={`text-[10px] font-black ${priColor(detalle.prioridad)}`}>{detalle.prioridad}</span>
                </div>
              </div>
              <button type="button" onClick={() => setDetalle(null)} className="vordia-icon-btn text-slate-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {detalle.descripcion && (
              <p className="text-sm text-[#94a3b8] leading-relaxed">{detalle.descripcion}</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs text-[#94a3b8]">
              <div className="rounded-xl bg-[#050B18]/80 border border-white/5 p-3">
                <p className="text-[9px] uppercase font-bold text-slate-500">Registro</p>
                <p className="text-white mt-1">{formatFecha(detalle.fechaRegistro)}</p>
              </div>
              <div className="rounded-xl bg-[#050B18]/80 border border-white/5 p-3">
                <p className="text-[9px] uppercase font-bold text-slate-500">Fecha meta</p>
                <p className={`mt-1 ${detalle.vencidaMeta ? "text-red-300" : "text-white"}`}>{formatFecha(detalle.fechaMeta)}</p>
              </div>
              <div className="rounded-xl bg-[#050B18]/80 border border-white/5 p-3 col-span-2">
                <p className="text-[9px] uppercase font-bold text-slate-500">Próximo paso</p>
                <p className="text-white mt-1">{detalle.proximoPaso || "—"}</p>
                <p className={`text-[10px] mt-1 ${detalle.vencidoProximoPaso ? "text-red-300" : "text-slate-500"}`}>
                  Fecha: {formatFecha(detalle.fechaProximoPaso)}
                </p>
              </div>
              <div className="rounded-xl bg-[#050B18]/80 border border-white/5 p-3">
                <p className="text-[9px] uppercase font-bold text-slate-500">Responsable</p>
                <p className="text-white mt-1">{detalle.responsableNombre || "—"}</p>
              </div>
              <div className="rounded-xl bg-[#050B18]/80 border border-white/5 p-3">
                <p className="text-[9px] uppercase font-bold text-slate-500">Convertido a</p>
                <p className="text-white mt-1">{detalle.convertidoA || "—"}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Cambiar estado</p>
              <select
                value={detalle.estado}
                onChange={(e) => cambiarEstado(detalle, e.target.value)}
                className="w-full bg-[#050B18] border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm"
              >
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#007bff] flex items-center gap-2">
                <History size={14} /> Historial
              </p>
              <Input value={notaTitulo} onChange={(e) => setNotaTitulo(e.target.value)} placeholder="Título de la nota" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input value={notaDetalle} onChange={(e) => setNotaDetalle(e.target.value)} placeholder="Detalle (opcional)" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Button onClick={agregarNota} className="w-full bg-[#007bff]/20 hover:bg-[#007bff]/30 text-[#5eb0ff] border border-[#007bff]/30 rounded-xl">
                Agregar nota
              </Button>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {(detalle.historial || []).map((h) => (
                  <div key={h.historialId} className="rounded-xl border border-white/5 bg-[#050B18]/80 p-3">
                    <div className="flex justify-between gap-2">
                      <p className="text-xs font-semibold text-white">{h.titulo}</p>
                      <span className="text-[10px] text-slate-500 uppercase">{h.tipo}</span>
                    </div>
                    {h.detalle && <p className="text-[11px] text-slate-400 mt-1">{h.detalle}</p>}
                    <p className="text-[10px] text-slate-600 mt-1">
                      {formatFecha(h.fecha)} · {h.usuarioNombre || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="vordia-modal fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div
            className="vordia-modal-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0C1327] p-5 lg:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editId ? "Editar registro" : "Nueva idea / alianza"}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="vordia-icon-btn text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Prioridad</label>
                <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Título *</label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Descripción</label>
                <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Estado</label>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Responsable</label>
                <select value={form.responsableNombre} onChange={(e) => setForm({ ...form, responsableNombre: e.target.value })} className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  <option value="">Seleccionar…</option>
                  {RESPONSABLES.map((n) => <option key={n} value={n}>{n}</option>)}
                  {form.responsableNombre && !(RESPONSABLES as readonly string[]).includes(form.responsableNombre) && (
                    <option value={form.responsableNombre}>{form.responsableNombre}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Fecha de registro *</label>
                <Input type="date" value={form.fechaRegistro} onChange={(e) => setForm({ ...form, fechaRegistro: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Fecha meta</label>
                <Input type="date" value={form.fechaMeta} onChange={(e) => setForm({ ...form, fechaMeta: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Próximo paso</label>
                <Input value={form.proximoPaso} onChange={(e) => setForm({ ...form, proximoPaso: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Fecha próximo paso</label>
                <Input type="date" value={form.fechaProximoPaso} onChange={(e) => setForm({ ...form, fechaProximoPaso: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Convertir a (si madura)</label>
                <select value={form.convertidoA} onChange={(e) => setForm({ ...form, convertidoA: e.target.value })} className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  {CONVERTIDOS.map((c) => <option key={c || "none"} value={c}>{c || "— Sin convertir —"}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Notas</label>
                <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
            </div>

            <div className="vordia-modal-actions flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={guardar} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold">Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
