"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Plus, X, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatFecha } from "./VordiaClientesPage";

type Objetivo = {
  objetivoId: number;
  ambito: string;
  titulo: string;
  descripcion?: string | null;
  notasReunion?: string | null;
  estado: string;
  prioridad: string;
  fechaObjetivo?: string | null;
  clienteId?: number | null;
  clienteNombre?: string | null;
  tareaId?: number | null;
  tareaTitulo?: string | null;
};

type Props = { empresaId: number; usuarioNombre?: string };

const AMBITOS = ["Empresa", "Crm", "Tarea"] as const;
const ESTADOS = ["Pendiente", "En curso", "Logrado", "Pausado", "Cancelado"] as const;

export function VordiaObjetivosPage({ empresaId, usuarioNombre }: Props) {
  const [items, setItems] = useState<Objetivo[]>([]);
  const [filtro, setFiltro] = useState<string>("TODOS");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    ambito: "Crm",
    titulo: "",
    descripcion: "",
    notasReunion: "",
    estado: "Pendiente",
    prioridad: "Media",
    fechaObjetivo: "",
  });

  const cargar = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/Crm/objetivos?empresaId=${empresaId}`);
      if (!r.ok) throw new Error();
      setItems(await r.json());
    } catch {
      toast.error("No se pudieron cargar objetivos (¿SQL HQ ejecutado?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) void cargar();
  }, [empresaId]);

  const filtrados = useMemo(
    () => (filtro === "TODOS" ? items : items.filter((i) => i.ambito === filtro)),
    [items, filtro]
  );

  const abrirNuevo = () => {
    setEditId(null);
    setForm({
      ambito: "Crm",
      titulo: "",
      descripcion: "",
      notasReunion: "",
      estado: "Pendiente",
      prioridad: "Media",
      fechaObjetivo: new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  };

  const abrirEdit = (o: Objetivo) => {
    setEditId(o.objetivoId);
    setForm({
      ambito: o.ambito,
      titulo: o.titulo,
      descripcion: o.descripcion || "",
      notasReunion: o.notasReunion || "",
      estado: o.estado,
      prioridad: o.prioridad,
      fechaObjetivo: o.fechaObjetivo ? String(o.fechaObjetivo).slice(0, 10) : "",
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.titulo.trim()) {
      toast.error("Título obligatorio");
      return;
    }
    const body = {
      empresaId,
      ...form,
      fechaObjetivo: form.fechaObjetivo || null,
      creadoPor: usuarioNombre || null,
    };
    const url = editId ? `${API_BASE}/api/Crm/objetivos/${editId}` : `${API_BASE}/api/Crm/objetivos`;
    const method = editId ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      toast.success(editId ? "Objetivo actualizado" : "Objetivo creado");
      setOpen(false);
      cargar();
    } else toast.error("No se pudo guardar");
  };

  const eliminar = async (id: number) => {
    const r = await fetch(`${API_BASE}/api/Crm/objetivos/${id}?empresaId=${empresaId}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Objetivo eliminado");
      cargar();
    }
  };

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-white font-medium flex items-center gap-2">
            <Target size={16} className="text-[#007bff]" /> Objetivos CRM / Empresa
          </p>
          <p className="text-xs text-[#94a3b8] mt-1">
            Metas específicas y notas de reunión para alinear con tu socia.
          </p>
        </div>
        <Button onClick={abrirNuevo} className="bg-[#007bff] rounded-xl font-bold gap-2 shrink-0">
          <Plus size={16} /> Nuevo objetivo
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["TODOS", ...AMBITOS].map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setFiltro(a)}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase border ${
              filtro === a ? "bg-[#007bff] border-[#007bff] text-white" : "border-white/10 text-slate-400"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm p-4">Cargando…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtrados.map((o) => (
            <button
              key={o.objetivoId}
              type="button"
              onClick={() => abrirEdit(o)}
              className="text-left rounded-2xl border border-white/5 bg-[#0C1327] p-4 hover:border-[#007bff]/40 transition space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">{o.titulo}</p>
                <span className="text-[9px] font-black uppercase text-sky-300 shrink-0">{o.ambito}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {o.estado} · {o.prioridad} · vence {formatFecha(o.fechaObjetivo)}
              </p>
              {o.descripcion && <p className="text-[11px] text-[#94a3b8] line-clamp-2">{o.descripcion}</p>}
              {o.notasReunion && (
                <p className="text-[11px] text-amber-200/80 flex gap-1.5 items-start">
                  <MessageSquare size={12} className="mt-0.5 shrink-0" />
                  <span className="line-clamp-3">{o.notasReunion}</span>
                </p>
              )}
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => void eliminar(o.objetivoId)} className="text-slate-600 hover:text-rose-400 p-1">
                  <Trash2 size={12} />
                </button>
              </div>
            </button>
          ))}
          {!filtrados.length && (
            <p className="text-slate-600 text-xs col-span-2 text-center py-10">Sin objetivos en este filtro.</p>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{editId ? "Editar objetivo" : "Nuevo objetivo"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <select value={form.ambito} onChange={(e) => setForm({ ...form, ambito: e.target.value })} className="w-full h-10 rounded-xl bg-[#050B18] border border-white/10 px-3 text-sm">
              {AMBITOS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título *" className="bg-[#050B18] border-white/10 rounded-xl" />
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción / meta"
              className="w-full min-h-[70px] rounded-xl bg-[#050B18] border border-white/10 p-3 text-sm text-white"
            />
            <textarea
              value={form.notasReunion}
              onChange={(e) => setForm({ ...form, notasReunion: e.target.value })}
              placeholder="Notas de reunión (para compartir con tu socia)"
              className="w-full min-h-[90px] rounded-xl bg-[#050B18] border border-amber-500/20 p-3 text-sm text-amber-50"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input type="date" value={form.fechaObjetivo} onChange={(e) => setForm({ ...form, fechaObjetivo: e.target.value })} className="bg-[#050B18] border-white/10 rounded-xl" />
              <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className="h-10 rounded-xl bg-[#050B18] border border-white/10 px-2 text-sm">
                <option>Baja</option>
                <option>Media</option>
                <option>Alta</option>
              </select>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="h-10 rounded-xl bg-[#050B18] border border-white/10 px-2 text-sm">
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <Button onClick={() => void guardar()} className="w-full bg-[#007bff] rounded-xl font-bold">
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
