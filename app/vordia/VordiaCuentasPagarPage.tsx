"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Check, Clock, Plus, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { formatFecha, formatGs } from "./VordiaClientesPage";

type Gasto = {
  gastoId: number;
  concepto: string;
  categoria: string;
  montoGs: number;
  fechaEmision: string;
  fechaVencimiento?: string | null;
  fechaPago?: string | null;
  estado: string;
  proveedorNombre?: string | null;
  vencido: boolean;
  diasParaVencer?: number | null;
};

type Resumen = {
  pagadoMesActual: number;
  pagadoTotal: number;
  pendienteTotal: number;
  cantidadPendientes: number;
  venceProximos7Dias: number;
  cantidadVenceProximos7Dias: number;
  vencidoTotal: number;
  cantidadVencidos: number;
  gastos: Gasto[];
};

type Props = { empresaId: number; usuarioNombre?: string };

const CATEGORIAS = [
  "Operativo",
  "Servicios",
  "Infraestructura",
  "Impuestos",
  "Marketing",
  "Honorarios",
  "Otros",
] as const;

const FILTROS = ["TODOS", "Pendiente", "Pagado"] as const;

const FORM_INICIAL = {
  concepto: "",
  montoGs: "",
  categoria: "Operativo",
  proveedorNombre: "",
  fechaVencimiento: "",
  yaPagado: false,
};

export function VordiaCuentasPagarPage({ empresaId, usuarioNombre }: Props) {
  const [data, setData] = useState<Resumen | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("TODOS");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const cargar = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/Crm/gastos?empresaId=${empresaId}`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      toast.error("No se pudieron cargar los gastos (¿corriste Create_Crm_Gastos.sql?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm(FORM_INICIAL);
    setOpen(true);
  };

  const abrirEdicion = (g: Gasto) => {
    setEditId(g.gastoId);
    setForm({
      concepto: g.concepto,
      montoGs: String(g.montoGs),
      categoria: g.categoria,
      proveedorNombre: g.proveedorNombre || "",
      fechaVencimiento: g.fechaVencimiento ? g.fechaVencimiento.slice(0, 10) : "",
      yaPagado: g.estado === "Pagado",
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.concepto.trim()) {
      toast.error("El detalle del gasto es obligatorio");
      return;
    }
    const monto = Number(form.montoGs);
    if (!monto || monto <= 0) {
      toast.error("Ingresá un monto mayor a cero");
      return;
    }

    setGuardando(true);
    try {
      const body = {
        empresaId,
        concepto: form.concepto.trim(),
        montoGs: monto,
        categoria: form.categoria,
        proveedorNombre: form.proveedorNombre.trim() || null,
        fechaVencimiento: form.fechaVencimiento || null,
        estado: form.yaPagado ? "Pagado" : "Pendiente",
        usuarioNombre,
      };
      const r = await fetch(
        editId ? `${API_BASE}/api/Crm/gastos/${editId}` : `${API_BASE}/api/Crm/gastos`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error();
      toast.success(editId ? "Gasto actualizado" : "Gasto registrado");
      setOpen(false);
      await cargar();
    } catch {
      toast.error("No se pudo guardar el gasto");
    } finally {
      setGuardando(false);
    }
  };

  const marcarPagado = async (gastoId: number) => {
    try {
      const r = await fetch(`${API_BASE}/api/Crm/gastos/${gastoId}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, usuarioNombre }),
      });
      if (!r.ok) throw new Error();
      toast.success("Gasto marcado como pagado");
      await cargar();
    } catch {
      toast.error("No se pudo marcar el pago");
    }
  };

  const eliminar = async (gastoId: number) => {
    try {
      const r = await fetch(`${API_BASE}/api/Crm/gastos/${gastoId}?empresaId=${empresaId}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error();
      toast.success("Gasto eliminado");
      await cargar();
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const gastos = (data?.gastos || []).filter((g) =>
    filtro === "TODOS" ? true : g.estado === filtro
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Pagado este mes</p>
          <p className="text-xl font-black text-emerald-300 mt-1">{formatGs(data?.pagadoMesActual)}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Debemos pagar</p>
          <p className="text-xl font-black text-white mt-1">{formatGs(data?.pendienteTotal)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{data?.cantidadPendientes || 0} pendientes</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Vence en 7 días</p>
          <p className="text-xl font-black text-sky-300 mt-1">{formatGs(data?.venceProximos7Dias)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {data?.cantidadVenceProximos7Dias || 0} pagos
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            data?.cantidadVencidos
              ? "border-rose-500/30 bg-rose-500/5"
              : "border-white/5 bg-[#0C1327]"
          }`}
        >
          <p className="text-[10px] uppercase text-slate-500 font-bold">Ya vencidos</p>
          <p className="text-xl font-black text-rose-300 mt-1">{formatGs(data?.vencidoTotal)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{data?.cantidadVencidos || 0} pagos</p>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                filtro === f
                  ? "bg-[#007bff]/15 border-[#007bff]/40 text-white"
                  : "border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {f === "TODOS" ? "Todos" : f}
            </button>
          ))}
        </div>
        <Button onClick={abrirNuevo} className="ml-auto bg-[#007bff] rounded-xl font-bold gap-2">
          <Plus size={15} />
          Nuevo gasto
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-slate-600 text-xs py-10">Cargando gastos…</p>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] divide-y divide-white/5">
          {gastos.map((g) => (
            <div key={g.gastoId} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${
                  g.estado === "Pagado"
                    ? "bg-emerald-500/10"
                    : g.vencido
                      ? "bg-rose-500/10"
                      : "bg-sky-500/10"
                }`}
              >
                {g.estado === "Pagado" ? (
                  <Check size={16} className="text-emerald-300" />
                ) : g.vencido ? (
                  <AlertTriangle size={16} className="text-rose-300" />
                ) : (
                  <Clock size={16} className="text-sky-300" />
                )}
              </span>

              <button
                type="button"
                onClick={() => abrirEdicion(g)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-semibold text-white truncate">{g.concepto}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {g.categoria}
                  {g.proveedorNombre ? ` · ${g.proveedorNombre}` : ""}
                  {g.estado === "Pagado"
                    ? ` · pagado ${formatFecha(g.fechaPago)}`
                    : g.fechaVencimiento
                      ? ` · vence ${formatFecha(g.fechaVencimiento)}`
                      : " · sin vencimiento"}
                </p>
              </button>

              <p
                className={`text-sm font-black shrink-0 ${
                  g.estado === "Pagado" ? "text-slate-400" : "text-white"
                }`}
              >
                {formatGs(g.montoGs)}
              </p>

              {g.estado !== "Pagado" && (
                <button
                  type="button"
                  onClick={() => void marcarPagado(g.gastoId)}
                  className="shrink-0 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10 transition"
                >
                  Pagar
                </button>
              )}
              <button
                type="button"
                onClick={() => void eliminar(g.gastoId)}
                className="shrink-0 text-slate-600 hover:text-rose-400 p-1.5"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!gastos.length && (
            <div className="text-center py-12 px-4">
              <Wallet size={22} className="mx-auto text-slate-700" />
              <p className="text-slate-500 text-xs mt-2">
                {filtro === "TODOS"
                  ? "Todavía no hay gastos cargados."
                  : `Sin gastos en estado ${filtro}.`}
              </p>
              <p className="text-slate-600 text-[11px] mt-1">
                Cargá el primero con «Nuevo gasto» y aparece en el dashboard.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de carga */}
      {open && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                {editId ? "Editar gasto" : "Nuevo gasto"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Detalle *</label>
              <Input
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                placeholder="Ej. Alquiler de oficina, servidor cloud, honorarios"
                className="bg-[#050B18] border-white/10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Monto en Gs. *</label>
              <Input
                type="number"
                min={0}
                value={form.montoGs}
                onChange={(e) => setForm({ ...form, montoGs: e.target.value })}
                placeholder="0"
                className="bg-[#050B18] border-white/10 rounded-xl"
              />
              {Number(form.montoGs) > 0 && (
                <p className="text-[11px] text-emerald-300 font-semibold">
                  {formatGs(Number(form.montoGs))}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full h-10 rounded-xl bg-[#050B18] border border-white/10 px-3 text-sm text-white"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Vencimiento</label>
                <Input
                  type="date"
                  value={form.fechaVencimiento}
                  onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                  className="bg-[#050B18] border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Proveedor (opcional)
              </label>
              <Input
                value={form.proveedorNombre}
                onChange={(e) => setForm({ ...form, proveedorNombre: e.target.value })}
                placeholder="A quién se le paga"
                className="bg-[#050B18] border-white/10 rounded-xl"
              />
            </div>

            <button
              type="button"
              onClick={() => setForm({ ...form, yaPagado: !form.yaPagado })}
              className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                form.yaPagado
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-white/10 bg-[#050B18] hover:border-white/20"
              }`}
            >
              <span
                className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center ${
                  form.yaPagado ? "border-emerald-400 bg-emerald-500/20" : "border-slate-600"
                }`}
              >
                {form.yaPagado && <Check size={13} className="text-emerald-300" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-white">
                  Este gasto ya está pagado
                </span>
                <span className="block text-[11px] text-slate-500">
                  {form.yaPagado
                    ? "Suma a «Gastos pagados» del mes"
                    : "Queda en «Debemos pagar» hasta que lo marques"}
                </span>
              </span>
            </button>

            <Button
              onClick={() => void guardar()}
              disabled={guardando}
              className="w-full bg-[#007bff] rounded-xl font-bold"
            >
              {guardando ? "Guardando…" : "Guardar gasto"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
