"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatFecha, formatGs } from "./VordiaClientesPage";

export type CrmContrato = {
  contratoId: number;
  empresaId: number;
  clienteId: number;
  clienteNombre: string;
  sistemaServicio: string;
  feeAcordado: number;
  feeMensual: number;
  feeAnual: number;
  fechaInicio: string;
  proximoVencimiento?: string | null;
  estadoPago: string;
  estadoContrato: string;
  esRecurrente: boolean;
  periodicidad: string;
  notas?: string | null;
  cantidadPagos: number;
  totalCobrado: number;
};

type ClienteOpt = { clienteId: number; razonSocial: string };

const ESTADOS_PAGO = ["Al dia", "Pendiente", "Vencido", "Pagado"];
const ESTADOS_CONTRATO = ["Borrador", "Activo", "Suspendido", "Finalizado"];

function badgePago(e: string) {
  if (e === "Al dia" || e === "Pagado") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (e === "Vencido") return "bg-red-500/20 text-red-300 border-red-500/30";
  return "bg-amber-500/20 text-amber-300 border-amber-500/30";
}

function badgeContrato(e: string) {
  if (e === "Activo") return "bg-[#007bff]/20 text-[#5eb0ff] border-[#007bff]/35";
  if (e === "Finalizado") return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  if (e === "Suspendido") return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  return "bg-violet-500/20 text-violet-300 border-violet-500/30";
}

type Props = { empresaId: number; usuario: { id?: number; nombre?: string } | null };

export function VordiaContratosPage({ empresaId, usuario }: Props) {
  const [contratos, setContratos] = useState<CrmContrato[]>([]);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    clienteId: "",
    sistemaServicio: "",
    feeAcordado: "",
    feeMensual: "",
    feeAnual: "",
    fechaInicio: new Date().toISOString().slice(0, 10),
    proximoVencimiento: "",
    estadoPago: "Pendiente",
    estadoContrato: "Activo",
    esRecurrente: true,
    periodicidad: "Mensual",
    notas: "",
  });

  const cargar = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ empresaId: String(empresaId) });
      if (filtro) params.set("estado", filtro);
      const [cRes, clRes] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/contratos?${params}`),
        fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
      ]);
      if (!cRes.ok) throw new Error();
      setContratos(await cRes.json());
      if (clRes.ok) {
        const list = await clRes.json();
        setClientes(list.map((c: any) => ({ clienteId: c.clienteId, razonSocial: c.razonSocial })));
      }
    } catch {
      toast.error("No se pudieron cargar los contratos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, filtro]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({
      clienteId: clientes[0] ? String(clientes[0].clienteId) : "",
      sistemaServicio: "",
      feeAcordado: "",
      feeMensual: "",
      feeAnual: "",
      fechaInicio: new Date().toISOString().slice(0, 10),
      proximoVencimiento: "",
      estadoPago: "Pendiente",
      estadoContrato: "Activo",
      esRecurrente: true,
      periodicidad: "Mensual",
      notas: "",
    });
    setModalOpen(true);
  };

  const abrirEditar = (c: CrmContrato) => {
    setEditId(c.contratoId);
    setForm({
      clienteId: String(c.clienteId),
      sistemaServicio: c.sistemaServicio,
      feeAcordado: String(c.feeAcordado),
      feeMensual: String(c.feeMensual),
      feeAnual: String(c.feeAnual),
      fechaInicio: String(c.fechaInicio).slice(0, 10),
      proximoVencimiento: c.proximoVencimiento ? String(c.proximoVencimiento).slice(0, 10) : "",
      estadoPago: c.estadoPago,
      estadoContrato: c.estadoContrato,
      esRecurrente: c.esRecurrente,
      periodicidad: c.periodicidad,
      notas: c.notas || "",
    });
    setModalOpen(true);
  };

  const onFeeMensualChange = (v: string) => {
    const n = Number(v) || 0;
    setForm((f) => ({
      ...f,
      feeMensual: v,
      feeAcordado: f.feeAcordado || v,
      feeAnual: f.feeAnual && editId ? f.feeAnual : String(n * 12),
    }));
  };

  const guardar = async () => {
    if (!form.clienteId || !form.sistemaServicio.trim()) {
      toast.error("Cliente y sistema/servicio son obligatorios");
      return;
    }
    const body = {
      empresaId,
      clienteId: Number(form.clienteId),
      sistemaServicio: form.sistemaServicio,
      feeAcordado: Number(form.feeAcordado) || 0,
      feeMensual: Number(form.feeMensual) || 0,
      feeAnual: Number(form.feeAnual) || 0,
      fechaInicio: form.fechaInicio,
      proximoVencimiento: form.proximoVencimiento || null,
      estadoPago: form.estadoPago,
      estadoContrato: form.estadoContrato,
      esRecurrente: form.esRecurrente,
      periodicidad: form.periodicidad,
      notas: form.notas,
    };
    try {
      const res = await fetch(
        editId ? `${API_BASE}/api/Crm/contratos/${editId}` : `${API_BASE}/api/Crm/contratos`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje || "Error");
      }
      toast.success(editId ? "Contrato actualizado" : "Contrato creado");
      setModalOpen(false);
      cargar();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    }
  };

  const eliminar = async (c: CrmContrato) => {
    if (!confirm(`¿Finalizar/eliminar contrato de ${c.clienteNombre}?`)) return;
    const res = await fetch(`${API_BASE}/api/Crm/contratos/${c.contratoId}?empresaId=${empresaId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Contrato finalizado");
      cargar();
    } else toast.error("No se pudo eliminar");
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <div className="flex gap-2 flex-wrap">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="bg-[#050B18] border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Todos los contratos</option>
            {ESTADOS_CONTRATO.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <p className="text-xs text-[#94a3b8] self-center">
            Fees, vencimientos y estado de pago por cliente.
          </p>
        </div>
        <Button onClick={abrirNuevo} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
          <Plus size={16} /> Nuevo contrato
        </Button>
      </div>

      <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] overflow-hidden">
        {loading ? (
          <p className="p-8 text-slate-500 text-sm">Cargando contratos…</p>
        ) : contratos.length === 0 ? (
          <p className="p-8 text-slate-500 text-sm">Sin contratos. Creá el primero.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {contratos.map((c) => (
              <div key={c.contratoId} className="px-4 lg:px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#007bff]/15 text-[#007bff] flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{c.clienteNombre}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${badgeContrato(c.estadoContrato)}`}>
                      {c.estadoContrato}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${badgePago(c.estadoPago)}`}>
                      {c.estadoPago}
                    </span>
                    {c.esRecurrente && (
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        Recurrente · {c.periodicidad}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1 truncate">{c.sistemaServicio}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mensual {formatGs(c.feeMensual)} · Anual {formatGs(c.feeAnual)} · Inicio {formatFecha(c.fechaInicio)} · Vence {formatFecha(c.proximoVencimiento)}
                  </p>
                  <p className="text-[11px] text-[#5eb0ff] mt-0.5">
                    Cobrado: {formatGs(c.totalCobrado)} ({c.cantidadPagos} pagos)
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => abrirEditar(c)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => eliminar(c)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{editId ? "Editar contrato" : "Nuevo contrato / fee"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Cliente *</label>
                <select
                  value={form.clienteId}
                  onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                  className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  {clientes.map((c) => (
                    <option key={c.clienteId} value={c.clienteId}>{c.razonSocial}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Sistema / servicio *</label>
                <Input value={form.sistemaServicio} onChange={(e) => setForm({ ...form, sistemaServicio: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Fee mensual (Gs.)</label>
                <Input type="number" value={form.feeMensual} onChange={(e) => onFeeMensualChange(e.target.value)} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Fee anual (Gs.)</label>
                <Input type="number" value={form.feeAnual} onChange={(e) => setForm({ ...form, feeAnual: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Fee acordado (Gs.)</label>
                <Input type="number" value={form.feeAcordado} onChange={(e) => setForm({ ...form, feeAcordado: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Periodicidad</label>
                <select value={form.periodicidad} onChange={(e) => setForm({ ...form, periodicidad: e.target.value })} className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  <option value="Mensual">Mensual</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Fecha inicio</label>
                <Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Próximo vencimiento</label>
                <Input type="date" value={form.proximoVencimiento} onChange={(e) => setForm({ ...form, proximoVencimiento: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Estado pago</label>
                <select value={form.estadoPago} onChange={(e) => setForm({ ...form, estadoPago: e.target.value })} className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  {ESTADOS_PAGO.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Estado contrato</label>
                <select value={form.estadoContrato} onChange={(e) => setForm({ ...form, estadoContrato: e.target.value })} className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm">
                  {ESTADOS_CONTRATO.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="rec" checked={form.esRecurrente} onChange={(e) => setForm({ ...form, esRecurrente: e.target.checked })} className="rounded" />
                <label htmlFor="rec" className="text-sm text-slate-300">Ingreso recurrente</label>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Notas</label>
                <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={guardar} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold">Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
