"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Pencil, Trash2, X, Phone, Mail, Building2,
  User, History, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export type CrmCliente = {
  clienteId: number;
  empresaId: number;
  razonSocial: string;
  nombreComercial?: string | null;
  rubro?: string | null;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  contactoNombre?: string | null;
  contactoCargo?: string | null;
  contactoEmail?: string | null;
  contactoTelefono?: string | null;
  estadoPipeline: string;
  sistemaServicio?: string | null;
  proximosPasos?: string | null;
  fechaEstimadaCierre?: string | null;
  feeEstimadoMensual?: number | null;
  notas?: string | null;
  activo: boolean;
  cantidadHistorial?: number;
};

export type CrmHistorial = {
  historialId: number;
  tipo: string;
  titulo: string;
  detalle?: string | null;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  fecha: string;
  usuarioNombre?: string | null;
};

export const PIPELINE_ESTADOS = [
  "Prospecto",
  "Contactado",
  "En negociacion",
  "Propuesta enviada",
  "Cerrado",
  "Cliente activo",
] as const;

export function estadoColor(estado: string) {
  switch (estado) {
    case "Prospecto": return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    case "Contactado": return "bg-sky-500/20 text-sky-300 border-sky-500/30";
    case "En negociacion": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "Propuesta enviada": return "bg-[#007bff]/20 text-[#5eb0ff] border-[#007bff]/35";
    case "Cerrado": return "bg-violet-500/20 text-violet-300 border-violet-500/30";
    case "Cliente activo": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    default: return "bg-white/10 text-slate-400 border-white/10";
  }
}

export function formatGs(n?: number | null) {
  if (n == null) return "—";
  return `Gs. ${Number(n).toLocaleString("es-PY")}`;
}

export function formatFecha(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("es-PY");
}

const emptyForm = {
  razonSocial: "",
  nombreComercial: "",
  rubro: "",
  documento: "",
  email: "",
  telefono: "",
  contactoNombre: "",
  contactoCargo: "",
  contactoEmail: "",
  contactoTelefono: "",
  estadoPipeline: "Prospecto",
  sistemaServicio: "",
  proximosPasos: "",
  fechaEstimadaCierre: "",
  feeEstimadoMensual: "",
  notas: "",
};

type Props = {
  empresaId: number;
  usuario: { id?: number; nombre?: string } | null;
};

export function VordiaClientesPage({ empresaId, usuario }: Props) {
  const [clientes, setClientes] = useState<CrmCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [detalle, setDetalle] = useState<CrmCliente | null>(null);
  const [historial, setHistorial] = useState<CrmHistorial[]>([]);
  const [notaTitulo, setNotaTitulo] = useState("");
  const [notaDetalle, setNotaDetalle] = useState("");
  const [notaTipo, setNotaTipo] = useState("nota");

  const cargar = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ empresaId: String(empresaId) });
      if (filtroEstado) params.set("estado", filtroEstado);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`${API_BASE}/api/Crm/clientes?${params}`);
      if (!res.ok) throw new Error();
      setClientes(await res.json());
    } catch {
      toast.error("No se pudieron cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, filtroEstado]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const abrirEditar = (c: CrmCliente) => {
    setEditId(c.clienteId);
    setForm({
      razonSocial: c.razonSocial || "",
      nombreComercial: c.nombreComercial || "",
      rubro: c.rubro || "",
      documento: c.documento || "",
      email: c.email || "",
      telefono: c.telefono || "",
      contactoNombre: c.contactoNombre || "",
      contactoCargo: c.contactoCargo || "",
      contactoEmail: c.contactoEmail || "",
      contactoTelefono: c.contactoTelefono || "",
      estadoPipeline: c.estadoPipeline || "Prospecto",
      sistemaServicio: c.sistemaServicio || "",
      proximosPasos: c.proximosPasos || "",
      fechaEstimadaCierre: c.fechaEstimadaCierre ? String(c.fechaEstimadaCierre).slice(0, 10) : "",
      feeEstimadoMensual: c.feeEstimadoMensual != null ? String(c.feeEstimadoMensual) : "",
      notas: c.notas || "",
    });
    setModalOpen(true);
  };

  const guardar = async () => {
    if (!form.razonSocial.trim()) {
      toast.error("La razón social es obligatoria");
      return;
    }
    const body = {
      empresaId,
      ...form,
      feeEstimadoMensual: form.feeEstimadoMensual ? Number(form.feeEstimadoMensual) : null,
      fechaEstimadaCierre: form.fechaEstimadaCierre || null,
      usuarioId: usuario?.id,
      usuarioNombre: usuario?.nombre,
      usuarioResponsableId: usuario?.id,
    };
    try {
      const res = await fetch(
        editId ? `${API_BASE}/api/Crm/clientes/${editId}` : `${API_BASE}/api/Crm/clientes`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(editId ? "Cliente actualizado" : "Cliente creado");
      setModalOpen(false);
      cargar();
      if (detalle?.clienteId === editId) {
        const updated = await res.json();
        setDetalle(updated);
        abrirDetalle(updated.clienteId);
      }
    } catch {
      toast.error("Error al guardar");
    }
  };

  const eliminar = async (c: CrmCliente) => {
    if (!confirm(`¿Eliminar a ${c.razonSocial}?`)) return;
    const res = await fetch(`${API_BASE}/api/Crm/clientes/${c.clienteId}?empresaId=${empresaId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Cliente eliminado");
      if (detalle?.clienteId === c.clienteId) setDetalle(null);
      cargar();
    } else toast.error("No se pudo eliminar");
  };

  const abrirDetalle = async (clienteId: number) => {
    try {
      const [cRes, hRes] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/clientes/${clienteId}?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/clientes/${clienteId}/historial?empresaId=${empresaId}`),
      ]);
      if (!cRes.ok) throw new Error();
      setDetalle(await cRes.json());
      setHistorial(hRes.ok ? await hRes.json() : []);
    } catch {
      toast.error("No se pudo abrir el detalle");
    }
  };

  const agregarNota = async () => {
    if (!detalle || !notaTitulo.trim()) return;
    const res = await fetch(`${API_BASE}/api/Crm/clientes/${detalle.clienteId}/historial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        tipo: notaTipo,
        titulo: notaTitulo,
        detalle: notaDetalle,
        usuarioId: usuario?.id,
        usuarioNombre: usuario?.nombre,
      }),
    });
    if (res.ok) {
      toast.success("Nota agregada");
      setNotaTitulo("");
      setNotaDetalle("");
      abrirDetalle(detalle.clienteId);
      cargar();
    } else toast.error("No se pudo agregar la nota");
  };

  const filtrados = useMemo(() => {
    if (!q.trim()) return clientes;
    const t = q.toLowerCase();
    return clientes.filter(
      (c) =>
        c.razonSocial.toLowerCase().includes(t) ||
        (c.contactoNombre || "").toLowerCase().includes(t) ||
        (c.sistemaServicio || "").toLowerCase().includes(t)
    );
  }, [clientes, q]);

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && cargar()}
              placeholder="Buscar cliente, contacto o sistema…"
              className="pl-9 bg-[#050B18] border-white/10 text-white rounded-xl"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[#050B18] border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            {PIPELINE_ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <Button onClick={abrirNuevo} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
          <Plus size={16} /> Nuevo cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className={`${detalle ? "xl:col-span-3" : "xl:col-span-5"} rounded-[1.5rem] border border-white/5 bg-[#0C1327] overflow-hidden`}>
          {loading ? (
            <p className="p-8 text-slate-500 text-sm">Cargando clientes…</p>
          ) : filtrados.length === 0 ? (
            <p className="p-8 text-slate-500 text-sm">No hay clientes. Creá el primero con “Nuevo cliente”.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {filtrados.map((c) => (
                <button
                  key={c.clienteId}
                  type="button"
                  onClick={() => abrirDetalle(c.clienteId)}
                  className={`w-full text-left px-4 lg:px-5 py-4 hover:bg-white/[0.03] transition-colors flex gap-3 items-start ${
                    detalle?.clienteId === c.clienteId ? "bg-[#007bff]/10" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-[#007bff]/15 text-[#007bff] flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white truncate">{c.razonSocial}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg border ${estadoColor(c.estadoPipeline)}`}>
                        {c.estadoPipeline}
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-1 truncate">
                      {c.sistemaServicio || "Sin sistema definido"} · {c.contactoNombre || "Sin contacto"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Cierre est.: {formatFecha(c.fechaEstimadaCierre)} · Fee: {formatGs(c.feeEstimadoMensual)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); abrirEditar(c); } }}
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"
                    >
                      <Pencil size={14} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); eliminar(c); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); eliminar(c); } }}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5"
                    >
                      <Trash2 size={14} />
                    </span>
                    <ChevronRight size={16} className="text-slate-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {detalle && (
          <div className="xl:col-span-2 rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-white">{detalle.razonSocial}</h3>
                <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg border ${estadoColor(detalle.estadoPipeline)}`}>
                  {detalle.estadoPipeline}
                </span>
              </div>
              <button type="button" onClick={() => setDetalle(null)} className="text-slate-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-sm text-[#94a3b8]">
              <p className="flex items-center gap-2"><User size={14} /> {detalle.contactoNombre || "—"} {detalle.contactoCargo ? `· ${detalle.contactoCargo}` : ""}</p>
              <p className="flex items-center gap-2"><Mail size={14} /> {detalle.contactoEmail || detalle.email || "—"}</p>
              <p className="flex items-center gap-2"><Phone size={14} /> {detalle.contactoTelefono || detalle.telefono || "—"}</p>
              <p><span className="text-slate-500">Rubro:</span> {detalle.rubro || "—"}</p>
              <p><span className="text-slate-500">Sistema:</span> {detalle.sistemaServicio || "—"}</p>
              <p><span className="text-slate-500">Próximos pasos:</span> {detalle.proximosPasos || "—"}</p>
              <p><span className="text-slate-500">Cierre estimado:</span> {formatFecha(detalle.fechaEstimadaCierre)}</p>
              <p><span className="text-slate-500">Fee estimado:</span> {formatGs(detalle.feeEstimadoMensual)}</p>
              {detalle.notas && <p className="text-xs bg-[#050B18] rounded-xl p-3 border border-white/5">{detalle.notas}</p>}
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#007bff] flex items-center gap-2">
                <History size={14} /> Historial
              </p>
              <div className="space-y-2">
                <select value={notaTipo} onChange={(e) => setNotaTipo(e.target.value)} className="w-full bg-[#050B18] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300">
                  <option value="nota">Nota</option>
                  <option value="llamada">Llamada</option>
                  <option value="reunion">Reunión</option>
                  <option value="email">Email</option>
                </select>
                <Input value={notaTitulo} onChange={(e) => setNotaTitulo(e.target.value)} placeholder="Título" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
                <Input value={notaDetalle} onChange={(e) => setNotaDetalle(e.target.value)} placeholder="Detalle (opcional)" className="bg-[#050B18] border-white/10 text-white rounded-xl" />
                <Button onClick={agregarNota} className="w-full bg-[#007bff]/20 hover:bg-[#007bff]/30 text-[#5eb0ff] border border-[#007bff]/30 rounded-xl">
                  Agregar al historial
                </Button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {historial.map((h) => (
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
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0C1327] p-5 lg:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editId ? "Editar cliente" : "Nuevo cliente"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["razonSocial", "Razón social *"],
                  ["nombreComercial", "Nombre comercial"],
                  ["rubro", "Rubro / empresa"],
                  ["documento", "RUC / documento"],
                  ["email", "Email empresa"],
                  ["telefono", "Teléfono"],
                  ["contactoNombre", "Persona de contacto"],
                  ["contactoCargo", "Cargo contacto"],
                  ["contactoEmail", "Email contacto"],
                  ["contactoTelefono", "Tel. contacto"],
                  ["sistemaServicio", "Sistema / servicio ofrecido"],
                  ["proximosPasos", "Próximos pasos"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={key === "sistemaServicio" || key === "proximosPasos" ? "sm:col-span-2" : ""}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
                  <Input
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl"
                  />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado pipeline</label>
                <select
                  value={form.estadoPipeline}
                  onChange={(e) => setForm({ ...form, estadoPipeline: e.target.value })}
                  className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
                >
                  {PIPELINE_ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha estimada cierre</label>
                <Input
                  type="date"
                  value={form.fechaEstimadaCierre}
                  onChange={(e) => setForm({ ...form, fechaEstimadaCierre: e.target.value })}
                  className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fee estimado mensual (Gs.)</label>
                <Input
                  type="number"
                  value={form.feeEstimadoMensual}
                  onChange={(e) => setForm({ ...form, feeEstimadoMensual: e.target.value })}
                  className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notas</label>
                <Input
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={guardar} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold">Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
