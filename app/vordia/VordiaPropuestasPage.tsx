"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, FileText, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { formatFecha, formatGs } from "./VordiaClientesPage";

type Propuesta = {
  propuestaId: number;
  clienteId: number;
  clienteNombre: string;
  descripcion: string;
  montoGs: number;
  estado: string;
  fechaEnvio: string;
  fechaCierre?: string | null;
  estadoPipelineCliente?: string | null;
};

type Resumen = {
  montoEnviado: number;
  cantidadEnviadas: number;
  montoGanado: number;
  cantidadGanadas: number;
  montoPerdido: number;
  cantidadPerdidas: number;
  tasaCierrePct: number;
  propuestas: Propuesta[];
};

type ClienteOpcion = { clienteId: number; razonSocial: string; estadoPipeline: string };

type Props = { empresaId: number; usuarioNombre?: string };

const FILTROS = ["TODOS", "Enviada", "Ganada", "Perdida"] as const;

const FORM_INICIAL = {
  clienteId: "",
  descripcion: "",
  montoGs: "",
  cerrada: false,
  gano: true,
};

const ESTADO_TONO: Record<string, string> = {
  Enviada: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  Ganada: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  Perdida: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export function VordiaPropuestasPage({ empresaId, usuarioNombre }: Props) {
  const [data, setData] = useState<Resumen | null>(null);
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("TODOS");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const cargar = async () => {
    try {
      setLoading(true);
      const [p, c] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/propuestas?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
      ]);
      if (!p.ok) throw new Error();
      setData(await p.json());
      if (c.ok) setClientes(await c.json());
    } catch {
      toast.error("No se pudieron cargar las propuestas (¿corriste Create_Crm_Propuestas.sql?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const abrirNueva = () => {
    setEditId(null);
    setForm(FORM_INICIAL);
    setOpen(true);
  };

  const abrirEdicion = (p: Propuesta) => {
    setEditId(p.propuestaId);
    setForm({
      clienteId: String(p.clienteId),
      descripcion: p.descripcion,
      montoGs: String(p.montoGs),
      cerrada: p.estado !== "Enviada",
      gano: p.estado !== "Perdida",
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.clienteId) {
      toast.error("Elegí el cliente de la propuesta");
      return;
    }
    if (!form.descripcion.trim()) {
      toast.error("La descripción es obligatoria");
      return;
    }
    const monto = Number(form.montoGs);
    if (!monto || monto <= 0) {
      toast.error("Ingresá un monto mayor a cero");
      return;
    }

    setGuardando(true);
    try {
      const estado = form.cerrada ? (form.gano ? "Ganada" : "Perdida") : "Enviada";
      const body = {
        empresaId,
        clienteId: Number(form.clienteId),
        descripcion: form.descripcion.trim(),
        montoGs: monto,
        estado,
        usuarioNombre,
      };
      const r = await fetch(
        editId ? `${API_BASE}/api/Crm/propuestas/${editId}` : `${API_BASE}/api/Crm/propuestas`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error();
      toast.success(
        estado === "Ganada"
          ? "Propuesta ganada. El cliente pasó a activo."
          : estado === "Perdida"
            ? "Propuesta marcada como perdida"
            : "Propuesta registrada"
      );
      setOpen(false);
      await cargar();
    } catch {
      toast.error("No se pudo guardar la propuesta");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (propuestaId: number) => {
    try {
      const r = await fetch(
        `${API_BASE}/api/Crm/propuestas/${propuestaId}?empresaId=${empresaId}`,
        { method: "DELETE" }
      );
      if (!r.ok) throw new Error();
      toast.success("Propuesta eliminada");
      await cargar();
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const propuestas = (data?.propuestas || []).filter((p) =>
    filtro === "TODOS" ? true : p.estado === filtro
  );
  const clienteElegido = clientes.find((c) => String(c.clienteId) === form.clienteId);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">En la calle</p>
          <p className="text-xl font-black text-sky-300 mt-1">{formatGs(data?.montoEnviado)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {data?.cantidadEnviadas || 0} sin respuesta
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Ganado</p>
          <p className="text-xl font-black text-emerald-300 mt-1">{formatGs(data?.montoGanado)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {data?.cantidadGanadas || 0} propuestas
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Perdido</p>
          <p className="text-xl font-black text-rose-300 mt-1">{formatGs(data?.montoPerdido)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {data?.cantidadPerdidas || 0} propuestas
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Tasa de cierre</p>
          <p className="text-xl font-black text-amber-300 mt-1">{data?.tasaCierrePct || 0}%</p>
          <p className="text-[10px] text-slate-500 mt-1">Ganadas sobre cerradas</p>
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
              {f === "TODOS" ? "Todas" : f}
            </button>
          ))}
        </div>
        <Button onClick={abrirNueva} className="ml-auto bg-[#007bff] rounded-xl font-bold gap-2">
          <Plus size={15} />
          Nueva propuesta
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-slate-600 text-xs py-10">Cargando propuestas…</p>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] divide-y divide-white/5">
          {propuestas.map((p) => (
            <div key={p.propuestaId} className="flex items-center gap-3 px-4 py-3">
              <span className="h-9 w-9 shrink-0 rounded-xl bg-[#050B18] flex items-center justify-center">
                {p.estado === "Ganada" ? (
                  <TrendingUp size={16} className="text-emerald-300" />
                ) : (
                  <FileText size={16} className="text-slate-400" />
                )}
              </span>

              <button
                type="button"
                onClick={() => abrirEdicion(p)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-semibold text-white truncate">{p.clienteNombre}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {p.descripcion} · enviada {formatFecha(p.fechaEnvio)}
                  {p.fechaCierre ? ` · cerrada ${formatFecha(p.fechaCierre)}` : ""}
                </p>
              </button>

              <p className="text-sm font-black text-white shrink-0">{formatGs(p.montoGs)}</p>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  ESTADO_TONO[p.estado] || ESTADO_TONO.Enviada
                }`}
              >
                {p.estado}
              </span>
              <button
                type="button"
                onClick={() => void eliminar(p.propuestaId)}
                className="shrink-0 text-slate-600 hover:text-rose-400 p-1.5"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!propuestas.length && (
            <div className="text-center py-12 px-4">
              <FileText size={22} className="mx-auto text-slate-700" />
              <p className="text-slate-500 text-xs mt-2">
                {filtro === "TODOS"
                  ? "Todavía no hay propuestas cargadas."
                  : `Sin propuestas en estado ${filtro}.`}
              </p>
              <p className="text-slate-600 text-[11px] mt-1">
                Al ganar una propuesta, el cliente pasa automáticamente a activo.
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
                {editId ? "Editar propuesta" : "Nueva propuesta comercial"}
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
              <label className="text-[11px] font-bold text-slate-400 uppercase">Cliente *</label>
              <select
                value={form.clienteId}
                onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                className="w-full h-10 rounded-xl bg-[#050B18] border border-white/10 px-3 text-sm text-white"
              >
                <option value="">Elegí un cliente…</option>
                {clientes.map((c) => (
                  <option key={c.clienteId} value={c.clienteId}>
                    {c.razonSocial}
                  </option>
                ))}
              </select>
              {clienteElegido && (
                <p className="text-[11px] text-slate-500">
                  Hoy está como{" "}
                  <span className="text-slate-300 font-semibold">
                    {clienteElegido.estadoPipeline}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Descripción *
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Qué le estás proponiendo: sistema, alcance, plazo"
                className="w-full min-h-[70px] rounded-xl bg-[#050B18] border border-white/10 p-3 text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Monto en Gs. *
              </label>
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

            {/* Cierre de la propuesta */}
            <button
              type="button"
              onClick={() => setForm({ ...form, cerrada: !form.cerrada })}
              className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                form.cerrada
                  ? "border-[#007bff]/40 bg-[#007bff]/10"
                  : "border-white/10 bg-[#050B18] hover:border-white/20"
              }`}
            >
              <span
                className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center ${
                  form.cerrada ? "border-[#4da3ff] bg-[#007bff]/20" : "border-slate-600"
                }`}
              >
                {form.cerrada && <Check size={13} className="text-[#4da3ff]" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-white">
                  Ya se cerró esta propuesta
                </span>
                <span className="block text-[11px] text-slate-500">
                  {form.cerrada
                    ? "Elegí abajo si se ganó o se perdió"
                    : "Queda como enviada, esperando respuesta"}
                </span>
              </span>
            </button>

            {form.cerrada && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gano: true })}
                  className={`rounded-xl border px-3 py-2.5 text-center transition ${
                    form.gano
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-white/10 bg-[#050B18] hover:border-white/20"
                  }`}
                >
                  <span className="block text-[13px] font-bold text-white">Se ganó</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    El cliente pasa a activo
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gano: false })}
                  className={`rounded-xl border px-3 py-2.5 text-center transition ${
                    !form.gano
                      ? "border-rose-500/40 bg-rose-500/10"
                      : "border-white/10 bg-[#050B18] hover:border-white/20"
                  }`}
                >
                  <span className="block text-[13px] font-bold text-white">Se perdió</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    El cliente queda cerrado
                  </span>
                </button>
              </div>
            )}

            <Button
              onClick={() => void guardar()}
              disabled={guardando}
              className="w-full bg-[#007bff] rounded-xl font-bold"
            >
              {guardando ? "Guardando…" : "Guardar propuesta"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
