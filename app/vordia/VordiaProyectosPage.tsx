"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderKanban, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatFecha } from "./VordiaClientesPage";

type Proyecto = {
  proyectoId: number;
  titulo: string;
  descripcion?: string | null;
  productoCodigo?: string | null;
  estado: string;
  prioridad: string;
  clienteId?: number | null;
  clienteNombre?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  responsableNombre?: string | null;
  avancePct: number;
  notas?: string | null;
};

type ClienteOpt = { clienteId: number; razonSocial: string };
type Props = { empresaId: number; usuario: { nombre?: string } | null };

const ESTADOS = ["Planificado", "En curso", "Pausado", "Hecho", "Cancelado"] as const;
const PRIORIDADES = ["P0", "P1", "P2"] as const;
const PRODUCTOS = ["", "HQ", "HABITAT", "STAY", "DINE", "RETAIL", "AGRO"] as const;

function estadoColor(e: string) {
  if (e === "En curso") return "text-[#5eb0ff]";
  if (e === "Hecho") return "text-emerald-300";
  if (e === "Pausado") return "text-amber-300";
  if (e === "Cancelado") return "text-rose-300";
  return "text-slate-400";
}

const empty = {
  titulo: "",
  descripcion: "",
  productoCodigo: "HQ",
  estado: "Planificado",
  prioridad: "P1",
  clienteId: "",
  fechaInicio: "",
  fechaFin: "",
  responsableNombre: "",
  avancePct: 0,
  notas: "",
};

export function VordiaProyectosPage({ empresaId, usuario }: Props) {
  const [items, setItems] = useState<Proyecto[]>([]);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProd, setFiltroProd] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Proyecto | null>(null);
  const [form, setForm] = useState({ ...empty });

  const cargar = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ empresaId: String(empresaId) });
      if (filtroEstado) qs.set("estado", filtroEstado);
      if (filtroProd) qs.set("productoCodigo", filtroProd);
      const [pRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/proyectos?${qs}`),
        fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
      ]);
      if (!pRes.ok) throw new Error();
      setItems(await pRes.json());
      if (cRes.ok) {
        const list = await cRes.json();
        setClientes(list.map((c: any) => ({ clienteId: c.clienteId, razonSocial: c.razonSocial })));
      }
    } catch {
      toast.error("No se pudieron cargar proyectos (¿SQL ejecutado?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) void cargar();
  }, [empresaId, filtroEstado, filtroProd]);

  const stats = useMemo(() => ({
    curso: items.filter((i) => i.estado === "En curso").length,
    plan: items.filter((i) => i.estado === "Planificado").length,
    hechos: items.filter((i) => i.estado === "Hecho").length,
  }), [items]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({
      ...empty,
      responsableNombre: usuario?.nombre || "",
      fechaInicio: new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  };

  const abrirEditar = (p: Proyecto) => {
    setEditId(p.proyectoId);
    setForm({
      titulo: p.titulo,
      descripcion: p.descripcion || "",
      productoCodigo: p.productoCodigo || "",
      estado: p.estado,
      prioridad: p.prioridad,
      clienteId: p.clienteId ? String(p.clienteId) : "",
      fechaInicio: p.fechaInicio ? String(p.fechaInicio).slice(0, 10) : "",
      fechaFin: p.fechaFin ? String(p.fechaFin).slice(0, 10) : "",
      responsableNombre: p.responsableNombre || "",
      avancePct: p.avancePct || 0,
      notas: p.notas || "",
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
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      productoCodigo: form.productoCodigo || null,
      estado: form.estado,
      prioridad: form.prioridad,
      clienteId: form.clienteId ? Number(form.clienteId) : null,
      fechaInicio: form.fechaInicio || null,
      fechaFin: form.fechaFin || null,
      responsableNombre: form.responsableNombre || null,
      avancePct: Number(form.avancePct) || 0,
      notas: form.notas || null,
    };
    const url = editId
      ? `${API_BASE}/api/Crm/proyectos/${editId}`
      : `${API_BASE}/api/Crm/proyectos`;
    const r = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      toast.success(editId ? "Proyecto actualizado" : "Proyecto creado");
      setOpen(false);
      setDetalle(null);
      cargar();
    } else toast.error("No se pudo guardar");
  };

  const eliminar = async (p: Proyecto) => {
    if (!confirm(`¿Eliminar "${p.titulo}"?`)) return;
    const r = await fetch(`${API_BASE}/api/Crm/proyectos/${p.proyectoId}?empresaId=${empresaId}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Proyecto eliminado");
      setDetalle(null);
      cargar();
    }
  };

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderKanban size={18} className="text-[#5eb0ff]" /> Proyectos
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Iniciativas por línea de producto (HQ, Habitat, Stay…) con avance y responsables.
          </p>
        </div>
        <Button onClick={abrirNuevo} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2 shrink-0">
          <Plus size={16} /> Nuevo proyecto
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "En curso", n: stats.curso },
          { l: "Planificados", n: stats.plan },
          { l: "Hechos", n: stats.hechos },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-white/5 bg-[#0C1327] px-3 py-2.5">
            <p className="text-[10px] uppercase font-bold text-slate-500">{k.l}</p>
            <p className="text-lg font-semibold text-white">{k.n}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={filtroProd} onChange={(e) => setFiltroProd(e.target.value)} className="bg-[#0C1327] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
          <option value="">Todas las líneas</option>
          {PRODUCTOS.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="bg-[#0C1327] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm p-4">Cargando…</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((p) => (
            <button
              key={p.proyectoId}
              type="button"
              onClick={() => setDetalle(p)}
              className="text-left rounded-2xl border border-white/5 bg-[#0C1327] p-4 hover:border-[#007bff]/40 transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#5eb0ff]">
                    {p.productoCodigo || "SIN LÍNEA"} · {p.prioridad}
                  </p>
                  <p className="text-sm font-semibold text-white mt-0.5">{p.titulo}</p>
                </div>
                <span className={`text-[11px] font-bold ${estadoColor(p.estado)}`}>{p.estado}</span>
              </div>
              {p.descripcion && <p className="text-xs text-slate-400 line-clamp-2">{p.descripcion}</p>}
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Avance</span>
                  <span className="font-bold text-white">{p.avancePct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#050B18] overflow-hidden">
                  <div className="h-full rounded-full bg-[#007bff]" style={{ width: `${Math.max(p.avancePct ? 4 : 0, p.avancePct)}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                {p.responsableNombre || "Sin responsable"}
                {p.clienteNombre ? ` · ${p.clienteNombre}` : ""}
                {p.fechaInicio ? ` · ${formatFecha(p.fechaInicio)}` : ""}
              </p>
            </button>
          ))}
          {!items.length && (
            <p className="col-span-full text-center text-slate-600 text-sm py-10">Sin proyectos. Creá el primero vinculado a una línea.</p>
          )}
        </div>
      )}

      {detalle && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#5eb0ff]">
                  {detalle.productoCodigo || "—"} · {detalle.prioridad}
                </p>
                <h3 className="text-lg font-semibold text-white mt-1">{detalle.titulo}</h3>
              </div>
              <button type="button" onClick={() => setDetalle(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <p className={`text-sm font-bold ${estadoColor(detalle.estado)}`}>{detalle.estado} · {detalle.avancePct}%</p>
            {detalle.descripcion && <p className="text-sm text-slate-300 whitespace-pre-wrap">{detalle.descripcion}</p>}
            <p className="text-xs text-slate-500">
              {detalle.responsableNombre || "Sin responsable"}
              {detalle.clienteNombre ? ` · Cliente: ${detalle.clienteNombre}` : ""}
            </p>
            {detalle.notas && (
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Notas</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{detalle.notas}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => abrirEditar(detalle)} className="bg-[#007bff] rounded-xl font-bold gap-2">
                <Pencil size={14} /> Editar
              </Button>
              <Button variant="outline" onClick={() => void eliminar(detalle)} className="rounded-xl border-rose-500/30 text-rose-300 gap-2">
                <Trash2 size={14} /> Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{editId ? "Editar proyecto" : "Nuevo proyecto"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título *" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción" rows={2} className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.productoCodigo} onChange={(e) => setForm({ ...form, productoCodigo: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                {PRODUCTOS.map((p) => <option key={p || "x"} value={p}>{p || "Sin línea"}</option>)}
              </select>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Input value={form.responsableNombre} onChange={(e) => setForm({ ...form, responsableNombre: e.target.value })} placeholder="Responsable" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input type="number" min={0} max={100} value={form.avancePct} onChange={(e) => setForm({ ...form, avancePct: Number(e.target.value) })} placeholder="Avance %" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                <option value="">Sin cliente</option>
                {clientes.map((c) => <option key={c.clienteId} value={c.clienteId}>{c.razonSocial}</option>)}
              </select>
            </div>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas" rows={2} className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={() => void guardar()} className="bg-[#007bff] rounded-xl font-bold">Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
