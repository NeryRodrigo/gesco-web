"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package, Plus, Pencil, X, Building2, Home, BedDouble, UtensilsCrossed, ShoppingBag, Sprout,
} from "lucide-react";
import { toast } from "sonner";
import { formatGs } from "./VordiaClientesPage";

type Producto = {
  productoId: number;
  codigo: string;
  nombre: string;
  significado?: string | null;
  queSera?: string | null;
  queIncluye?: string | null;
  ideaCentral?: string | null;
  estado: string;
  prioridad: string;
  feeEstimadoGs: number;
  orden: number;
  notas?: string | null;
};

type Props = { empresaId: number; onNavigate?: (vista: string) => void };

const ESTADOS = ["Activo", "En desarrollo", "Planificado", "Pausado"] as const;
const PRIORIDADES = ["P0", "P1", "P2"] as const;

function iconFor(codigo: string) {
  switch (codigo) {
    case "HQ": return <Building2 size={18} />;
    case "HABITAT": return <Home size={18} />;
    case "STAY": return <BedDouble size={18} />;
    case "DINE": return <UtensilsCrossed size={18} />;
    case "RETAIL": return <ShoppingBag size={18} />;
    case "AGRO": return <Sprout size={18} />;
    default: return <Package size={18} />;
  }
}

function estadoStyle(e: string) {
  if (e === "Activo") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (e === "En desarrollo") return "bg-[#007bff]/15 text-[#5eb0ff] border-[#007bff]/35";
  if (e === "Pausado") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-slate-500/15 text-slate-300 border-slate-500/30";
}

const empty = {
  codigo: "",
  nombre: "",
  significado: "",
  queSera: "",
  queIncluye: "",
  ideaCentral: "",
  estado: "Planificado",
  prioridad: "P2",
  feeEstimadoGs: 0,
  orden: 99,
  notas: "",
};

export function VordiaProductosPage({ empresaId, onNavigate }: Props) {
  const [items, setItems] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Producto | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty });

  const cargar = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/Crm/productos?empresaId=${empresaId}`);
      if (!r.ok) throw new Error();
      setItems(await r.json());
    } catch {
      toast.error("No se pudieron cargar productos (¿SQL ejecutado?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) void cargar();
  }, [empresaId]);

  const resumen = useMemo(() => ({
    activos: items.filter((i) => i.estado === "Activo").length,
    desarrollo: items.filter((i) => i.estado === "En desarrollo").length,
    plan: items.filter((i) => i.estado === "Planificado").length,
  }), [items]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ ...empty });
    setEditOpen(true);
  };

  const abrirEditar = (p: Producto) => {
    setEditId(p.productoId);
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      significado: p.significado || "",
      queSera: p.queSera || "",
      queIncluye: p.queIncluye || "",
      ideaCentral: p.ideaCentral || "",
      estado: p.estado,
      prioridad: p.prioridad,
      feeEstimadoGs: p.feeEstimadoGs || 0,
      orden: p.orden,
      notas: p.notas || "",
    });
    setEditOpen(true);
  };

  const guardar = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error("Código y nombre obligatorios");
      return;
    }
    const url = editId
      ? `${API_BASE}/api/Crm/productos/${editId}`
      : `${API_BASE}/api/Crm/productos`;
    const r = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId, ...form, feeEstimadoGs: Number(form.feeEstimadoGs) }),
    });
    if (r.ok) {
      toast.success(editId ? "Producto actualizado" : "Producto creado");
      setEditOpen(false);
      setDetalle(null);
      cargar();
    } else toast.error("No se pudo guardar");
  };

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package size={18} className="text-[#5eb0ff]" /> Arquitectura de productos VORDIA
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            HQ · Habitat · Stay · Dine · Retail · Agro — portafolio único desde el centro de mando.
          </p>
        </div>
        <Button onClick={abrirNuevo} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2 shrink-0">
          <Plus size={16} /> Nuevo producto
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Activos", n: resumen.activos },
          { l: "En desarrollo", n: resumen.desarrollo },
          { l: "Planificados", n: resumen.plan },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-white/5 bg-[#0C1327] px-3 py-2.5">
            <p className="text-[10px] uppercase font-bold text-slate-500">{k.l}</p>
            <p className="text-lg font-semibold text-white">{k.n}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm p-4">Cargando portafolio…</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((p) => (
            <button
              key={p.productoId}
              type="button"
              onClick={() => setDetalle(p)}
              className="text-left rounded-2xl border border-white/5 bg-[#0C1327] p-4 hover:border-[#007bff]/45 transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-9 w-9 rounded-xl bg-[#007bff]/15 text-[#5eb0ff] flex items-center justify-center shrink-0">
                    {iconFor(p.codigo)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#5eb0ff]">{p.codigo}</p>
                    <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${estadoStyle(p.estado)}`}>
                  {p.estado}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{p.ideaCentral || p.queSera}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-bold uppercase">{p.prioridad}</span>
                {p.feeEstimadoGs > 0 && <span>{formatGs(p.feeEstimadoGs)} fee est.</span>}
              </div>
            </button>
          ))}
          {!items.length && (
            <p className="col-span-full text-center text-slate-600 text-sm py-10">
              Sin productos. Ejecutá el SQL de seed o creá el primero.
            </p>
          )}
        </div>
      )}

      {detalle && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-[#007bff]/15 text-[#5eb0ff] flex items-center justify-center">
                  {iconFor(detalle.codigo)}
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#5eb0ff]">{detalle.codigo}</p>
                  <h3 className="text-lg font-semibold text-white">{detalle.nombre}</h3>
                </div>
              </div>
              <button type="button" onClick={() => setDetalle(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-lg border ${estadoStyle(detalle.estado)}`}>
              {detalle.estado} · {detalle.prioridad}
            </span>
            {[
              { t: "Significado", v: detalle.significado },
              { t: "Qué será", v: detalle.queSera },
              { t: "Qué incluye", v: detalle.queIncluye },
              { t: "Idea central", v: detalle.ideaCentral },
              { t: "Notas", v: detalle.notas },
            ].filter((x) => x.v).map((x) => (
              <div key={x.t}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{x.t}</p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{x.v}</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => abrirEditar(detalle)} className="bg-[#007bff] rounded-xl font-bold gap-2">
                <Pencil size={14} /> Editar
              </Button>
              {detalle.codigo === "HQ" && (
                <Button variant="outline" onClick={() => onNavigate?.("inicio")} className="rounded-xl border-white/15 text-slate-200">
                  Ir a Inicio HQ
                </Button>
              )}
              {detalle.codigo === "STAY" && (
                <Button variant="outline" onClick={() => onNavigate?.("vordia_proyectos")} className="rounded-xl border-white/15 text-slate-200">
                  Ver proyectos Stay
                </Button>
              )}
              <Button variant="outline" onClick={() => onNavigate?.("vordia_proyectos")} className="rounded-xl border-white/15 text-slate-200">
                Proyectos de línea
              </Button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{editId ? "Editar producto" : "Nuevo producto"}</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="Código (HQ, STAY…)" className="bg-[#050B18] border-white/10 text-white rounded-xl" disabled={!!editId} />
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre *" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Input value={form.significado} onChange={(e) => setForm({ ...form, significado: e.target.value })} placeholder="Significado" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
            <textarea value={form.queSera} onChange={(e) => setForm({ ...form, queSera: e.target.value })} placeholder="Qué será" rows={2} className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm" />
            <textarea value={form.queIncluye} onChange={(e) => setForm({ ...form, queIncluye: e.target.value })} placeholder="Qué incluye" rows={2} className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm" />
            <textarea value={form.ideaCentral} onChange={(e) => setForm({ ...form, ideaCentral: e.target.value })} placeholder="Idea central" rows={2} className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={form.feeEstimadoGs || ""} onChange={(e) => setForm({ ...form, feeEstimadoGs: Number(e.target.value) })} placeholder="Fee estimado Gs" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} placeholder="Orden" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={() => void guardar()} className="bg-[#007bff] rounded-xl font-bold">Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
