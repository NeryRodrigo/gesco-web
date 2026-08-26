"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, DollarSign, X, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatFecha, formatGs } from "./VordiaClientesPage";
import type { CrmContrato } from "./VordiaContratosPage";

type CrmPago = {
  pagoId: number;
  contratoId: number;
  clienteNombre: string;
  sistemaServicio: string;
  monto: number;
  fechaPago: string;
  periodo?: string | null;
  metodoPago?: string | null;
  concepto?: string | null;
  usuarioNombre?: string | null;
};

type Resumen = {
  mrrActivo: number;
  arrProyectado: number;
  cobradoMesActual: number;
  cobradoTotal: number;
  contratosActivos: number;
  contratosPendientesPago: number;
  contratosVencidos: number;
  recurrentes: CrmContrato[];
  ultimosPagos: CrmPago[];
};

type Props = { empresaId: number; usuario: { id?: number; nombre?: string } | null };

export function VordiaIngresosPage({ empresaId, usuario }: Props) {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [contratos, setContratos] = useState<CrmContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    contratoId: "",
    monto: "",
    fechaPago: new Date().toISOString().slice(0, 10),
    periodo: new Date().toISOString().slice(0, 7),
    metodoPago: "Transferencia",
    concepto: "Fee mensual",
    notas: "",
    marcarContratoAlDia: true,
  });

  const cargar = async () => {
    try {
      setLoading(true);
      const [iRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/ingresos?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/contratos?empresaId=${empresaId}&estado=Activo`),
      ]);
      if (!iRes.ok) throw new Error();
      setResumen(await iRes.json());
      if (cRes.ok) setContratos(await cRes.json());
    } catch {
      toast.error("No se pudieron cargar los ingresos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) cargar();
  }, [empresaId]);

  const abrirPago = () => {
    const first = contratos[0];
    setForm({
      contratoId: first ? String(first.contratoId) : "",
      monto: first ? String(first.feeMensual) : "",
      fechaPago: new Date().toISOString().slice(0, 10),
      periodo: new Date().toISOString().slice(0, 7),
      metodoPago: "Transferencia",
      concepto: "Fee mensual",
      notas: "",
      marcarContratoAlDia: true,
    });
    setModalOpen(true);
  };

  const onContratoChange = (id: string) => {
    const c = contratos.find((x) => String(x.contratoId) === id);
    setForm((f) => ({
      ...f,
      contratoId: id,
      monto: c ? String(c.feeMensual) : f.monto,
    }));
  };

  const registrar = async () => {
    if (!form.contratoId || !form.monto) {
      toast.error("Contrato y monto son obligatorios");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/Crm/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          contratoId: Number(form.contratoId),
          monto: Number(form.monto),
          fechaPago: form.fechaPago,
          periodo: form.periodo,
          metodoPago: form.metodoPago,
          concepto: form.concepto,
          notas: form.notas,
          marcarContratoAlDia: form.marcarContratoAlDia,
          usuarioId: usuario?.id,
          usuarioNombre: usuario?.nombre,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje || "Error");
      }
      toast.success("Pago registrado");
      setModalOpen(false);
      cargar();
    } catch (e: any) {
      toast.error(e.message || "No se pudo registrar el pago");
    }
  };

  if (loading && !resumen) {
    return <p className="text-slate-500 text-sm p-6">Cargando ingresos…</p>;
  }

  const kpis = [
    { label: "MRR activo", value: formatGs(resumen?.mrrActivo) },
    { label: "ARR proyectado", value: formatGs(resumen?.arrProyectado) },
    { label: "Cobrado este mes", value: formatGs(resumen?.cobradoMesActual) },
    { label: "Cobrado total", value: formatGs(resumen?.cobradoTotal) },
  ];

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="vordia-toolbar flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <div className="min-w-0">
          <p className="text-sm text-white font-medium">Ingresos recurrentes y historial de pagos</p>
          <p className="text-xs text-[#94a3b8] mt-1">
            Activos: {resumen?.contratosActivos ?? 0} · Pendientes: {resumen?.contratosPendientesPago ?? 0} · Vencidos: {resumen?.contratosVencidos ?? 0}
          </p>
        </div>
        <Button onClick={abrirPago} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2 w-full sm:w-auto shrink-0">
          <Plus size={16} /> Registrar pago
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[1.25rem] border border-white/5 bg-[#0C1327] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{k.label}</p>
            <p className="mt-2 text-lg font-semibold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#007bff]" />
            <h4 className="text-sm font-semibold text-white">Recurrentes activos</h4>
          </div>
          <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
            {(resumen?.recurrentes || []).length === 0 && (
              <p className="p-6 text-slate-500 text-sm">Sin contratos recurrentes activos.</p>
            )}
            {(resumen?.recurrentes || []).map((c) => (
              <div key={c.contratoId} className="px-5 py-3">
                <p className="text-sm font-semibold text-white">{c.clienteNombre}</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">{c.sistemaServicio}</p>
                <p className="text-[11px] text-[#5eb0ff] mt-1">
                  {formatGs(c.feeMensual)} / mes · Vence {formatFecha(c.proximoVencimiento)} · {c.estadoPago}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <DollarSign size={16} className="text-[#10b981]" />
            <h4 className="text-sm font-semibold text-white">Historial de pagos</h4>
          </div>
          <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
            {(resumen?.ultimosPagos || []).length === 0 && (
              <p className="p-6 text-slate-500 text-sm">Aún no hay pagos registrados.</p>
            )}
            {(resumen?.ultimosPagos || []).map((p) => (
              <div key={p.pagoId} className="px-5 py-3 flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.clienteNombre}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5">
                    {p.concepto || "Pago"} · {p.periodo || "—"} · {p.metodoPago || "—"}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {formatFecha(p.fechaPago)} · {p.usuarioNombre || "—"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-emerald-300 shrink-0">{formatGs(p.monto)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="vordia-modal fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="vordia-modal-panel w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Registrar pago</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Contrato activo *</label>
                <select
                  value={form.contratoId}
                  onChange={(e) => onContratoChange(e.target.value)}
                  className="mt-1 w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  {contratos.map((c) => (
                    <option key={c.contratoId} value={c.contratoId}>
                      {c.clienteNombre} — {formatGs(c.feeMensual)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Monto (Gs.)</label>
                  <Input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Fecha pago</label>
                  <Input type="date" value={form.fechaPago} onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Periodo</label>
                  <Input value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} placeholder="2026-08" className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Método</label>
                  <Input value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Concepto</label>
                <Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} className="mt-1 bg-[#050B18] border-white/10 text-white rounded-xl" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={form.marcarContratoAlDia} onChange={(e) => setForm({ ...form, marcarContratoAlDia: e.target.checked })} />
                Marcar contrato al día y avanzar vencimiento
              </label>
            </div>
            <div className="vordia-modal-actions flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={registrar} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold">Registrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
