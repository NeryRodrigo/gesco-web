"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Proveedor = {
  proveedorId: number;
  nombre: string;
  categoria: string;
  contactoNombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  ruc?: string | null;
  productoCodigo?: string | null;
  estado: string;
  notas?: string | null;
};

type Props = { empresaId: number };

const ESTADOS = ["Activo", "Inactivo", "Prospecto"] as const;
const PRODUCTOS = ["", "HQ", "HABITAT", "STAY", "DINE", "RETAIL", "AGRO"] as const;
const CATEGORIAS = ["General", "Tecnología", "Legal", "Contabilidad", "Marketing", "Infraestructura", "Servicios", "Otro"];

const empty = {
  nombre: "",
  categoria: "General",
  contactoNombre: "",
  email: "",
  telefono: "",
  ruc: "",
  productoCodigo: "",
  estado: "Activo",
  notas: "",
};

export function VordiaProveedoresPage({ empresaId }: Props) {
  const [items, setItems] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty });

  const cargar = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/Crm/proveedores?empresaId=${empresaId}`);
      if (!r.ok) throw new Error();
      setItems(await r.json());
    } catch {
      toast.error("No se pudieron cargar proveedores (¿SQL ejecutado?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) void cargar();
  }, [empresaId]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        (p.productoCodigo || "").toLowerCase().includes(q) ||
        (p.contactoNombre || "").toLowerCase().includes(q)
    );
  }, [items, filtro]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const abrirEditar = (p: Proveedor) => {
    setEditId(p.proveedorId);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria,
      contactoNombre: p.contactoNombre || "",
      email: p.email || "",
      telefono: p.telefono || "",
      ruc: p.ruc || "",
      productoCodigo: p.productoCodigo || "",
      estado: p.estado,
      notas: p.notas || "",
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error("Nombre obligatorio");
      return;
    }
    const url = editId
      ? `${API_BASE}/api/Crm/proveedores/${editId}`
      : `${API_BASE}/api/Crm/proveedores`;
    const r = await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        ...form,
        productoCodigo: form.productoCodigo || null,
      }),
    });
    if (r.ok) {
      toast.success(editId ? "Proveedor actualizado" : "Proveedor creado");
      setOpen(false);
      cargar();
    } else toast.error("No se pudo guardar");
  };

  const eliminar = async (p: Proveedor) => {
    if (!confirm(`¿Desactivar "${p.nombre}"?`)) return;
    const r = await fetch(`${API_BASE}/api/Crm/proveedores/${p.proveedorId}?empresaId=${empresaId}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Proveedor desactivado");
      cargar();
    }
  };

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Truck size={18} className="text-[#5eb0ff]" /> Proveedores HQ
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Servicios y proveedores de VORDIA, opcionales por línea de producto.
          </p>
        </div>
        <Button onClick={abrirNuevo} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2 shrink-0">
          <Plus size={16} /> Nuevo proveedor
        </Button>
      </div>

      <Input
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Buscar por nombre, categoría, producto…"
        className="bg-[#0C1327] border-white/10 text-white rounded-xl max-w-md"
      />

      {loading ? (
        <p className="text-slate-500 text-sm p-4">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {filtrados.map((p) => (
            <div key={p.proveedorId} className="rounded-xl border border-white/5 bg-[#0C1327] p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{p.nombre}</p>
                  <span className="text-[10px] font-bold uppercase text-slate-500">{p.categoria}</span>
                  {p.productoCodigo && (
                    <span className="text-[10px] font-black uppercase tracking-wide text-[#5eb0ff]">{p.productoCodigo}</span>
                  )}
                  <span className={`text-[10px] font-bold ${p.estado === "Activo" ? "text-emerald-400" : "text-slate-500"}`}>
                    {p.estado}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {[p.contactoNombre, p.email, p.telefono, p.ruc ? `RUC ${p.ruc}` : null].filter(Boolean).join(" · ") || "Sin contacto"}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={() => abrirEditar(p)} className="p-2 rounded-lg text-slate-500 hover:text-white">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => void eliminar(p)} className="p-2 rounded-lg text-slate-500 hover:text-rose-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!filtrados.length && (
            <p className="text-center text-slate-600 text-sm py-10">Sin proveedores. Cargá el primero para CxP y operaciones.</p>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{editId ? "Editar proveedor" : "Nuevo proveedor"}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre *" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <Input value={form.contactoNombre} onChange={(e) => setForm({ ...form, contactoNombre: e.target.value })} placeholder="Contacto" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Teléfono" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
              <Input value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} placeholder="RUC" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
            </div>
            <select value={form.productoCodigo} onChange={(e) => setForm({ ...form, productoCodigo: e.target.value })} className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
              {PRODUCTOS.map((p) => (
                <option key={p || "none"} value={p}>{p ? `Línea ${p}` : "Sin línea de producto"}</option>
              ))}
            </select>
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
