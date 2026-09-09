"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Plus, Trash2, TrendingUp, Users, X } from "lucide-react";
import { toast } from "sonner";
import { formatGs } from "./VordiaClientesPage";

type Vendedor = {
  vendedorId: number;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  comisionPct: number;
  metaMensualGs: number;
  estado: string;
  fechaIngreso?: string | null;
  notas?: string | null;
  esSocio: boolean;
  socioId?: number | null;
  fechaSocioDesde?: string | null;
  porcentajeSocio?: number | null;
  ventasTotalGs: number;
  ventasMesGs: number;
  enNegociacionGs: number;
  propuestasAbiertas: number;
  propuestasGanadas: number;
  propuestasPerdidas: number;
  comisionMesGs: number;
  cumplimientoMetaPct?: number | null;
};

type Resumen = {
  cantidadActivos: number;
  cantidadSocios: number;
  ventasMesGs: number;
  ventasTotalGs: number;
  comisionesMesGs: number;
  metaMensualTotalGs: number;
  vendedores: Vendedor[];
};

type Props = { empresaId: number; usuarioNombre?: string };

const FORM_INICIAL = {
  nombre: "",
  email: "",
  telefono: "",
  comisionPct: "",
  metaMensualGs: "",
  estado: "Activo",
};

export function VordiaVendedoresPage({ empresaId, usuarioNombre }: Props) {
  const [data, setData] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [promover, setPromover] = useState<Vendedor | null>(null);
  const [porcentajeSocio, setPorcentajeSocio] = useState("");

  const cargar = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/Crm/vendedores?empresaId=${empresaId}`);
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      toast.error("No se pudo cargar el equipo (¿corriste Create_Crm_Vendedores.sql?)");
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

  const abrirEdicion = (v: Vendedor) => {
    setEditId(v.vendedorId);
    setForm({
      nombre: v.nombre,
      email: v.email || "",
      telefono: v.telefono || "",
      comisionPct: String(v.comisionPct),
      metaMensualGs: String(v.metaMensualGs),
      estado: v.estado,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const comision = Number(form.comisionPct) || 0;
    if (comision < 0 || comision > 100) {
      toast.error("La comisión tiene que estar entre 0 y 100");
      return;
    }

    setGuardando(true);
    try {
      const body = {
        empresaId,
        nombre: form.nombre.trim(),
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        comisionPct: comision,
        metaMensualGs: Number(form.metaMensualGs) || 0,
        estado: form.estado,
      };
      const r = await fetch(
        editId ? `${API_BASE}/api/Crm/vendedores/${editId}` : `${API_BASE}/api/Crm/vendedores`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error();
      toast.success(editId ? "Vendedor actualizado" : "Vendedor agregado");
      setOpen(false);
      await cargar();
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarPromocion = async () => {
    if (!promover) return;
    const pct = Number(porcentajeSocio);
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
      toast.error("Ingresá una participación entre 1 y 100");
      return;
    }
    try {
      const r = await fetch(
        `${API_BASE}/api/Crm/vendedores/${promover.vendedorId}/promover-socio`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empresaId, porcentaje: pct, usuarioNombre }),
        }
      );
      if (!r.ok) throw new Error();
      toast.success(`${promover.nombre} ahora también es socio`);
      setPromover(null);
      setPorcentajeSocio("");
      await cargar();
    } catch {
      toast.error("No se pudo hacer socio al vendedor");
    }
  };

  const quitarSocio = async (v: Vendedor) => {
    try {
      const r = await fetch(
        `${API_BASE}/api/Crm/vendedores/${v.vendedorId}/quitar-socio?empresaId=${empresaId}`,
        { method: "POST" }
      );
      if (!r.ok) throw new Error();
      toast.success(`${v.nombre} deja de ser socio, sigue como vendedor`);
      await cargar();
    } catch {
      toast.error("No se pudo quitar la condición de socio");
    }
  };

  const eliminar = async (vendedorId: number) => {
    try {
      const r = await fetch(`${API_BASE}/api/Crm/vendedores/${vendedorId}?empresaId=${empresaId}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error();
      toast.success("Vendedor eliminado");
      await cargar();
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const vendedores = data?.vendedores || [];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Equipo activo</p>
          <p className="text-xl font-black text-white mt-1">{data?.cantidadActivos || 0}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {data?.cantidadSocios || 0} también son socios
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Vendido este mes</p>
          <p className="text-xl font-black text-emerald-300 mt-1">{formatGs(data?.ventasMesGs)}</p>
          <p className="text-[10px] text-slate-500 mt-1">propuestas ganadas</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Comisiones del mes</p>
          <p className="text-xl font-black text-amber-300 mt-1">
            {formatGs(data?.comisionesMesGs)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">a pagar al equipo</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Meta del equipo</p>
          <p className="text-xl font-black text-sky-300 mt-1">
            {formatGs(data?.metaMensualTotalGs)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">suma de metas del mes</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-[11px] text-slate-500">
          Las ventas salen de las propuestas ganadas de cada uno. Ser socio se decide acá.
        </p>
        <Button onClick={abrirNuevo} className="ml-auto bg-[#007bff] rounded-xl font-bold gap-2">
          <Plus size={15} />
          Nuevo vendedor
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-slate-600 text-xs py-10">Cargando equipo…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {vendedores.map((v) => {
            const pct = v.cumplimientoMetaPct;
            return (
              <div
                key={v.vendedorId}
                className={`rounded-2xl border p-4 ${
                  v.estado === "Inactivo"
                    ? "border-white/5 bg-[#0C1327]/50 opacity-60"
                    : "border-white/5 bg-[#0C1327]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="h-10 w-10 shrink-0 rounded-xl bg-[#050B18] flex items-center justify-center">
                    {v.esSocio ? (
                      <Crown size={17} className="text-amber-300" />
                    ) : (
                      <TrendingUp size={17} className="text-[#4da3ff]" />
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => abrirEdicion(v)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{v.nombre}</p>
                      {v.esSocio && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black border border-amber-500/30 bg-amber-500/10 text-amber-300">
                          SOCIO {v.porcentajeSocio}%
                        </span>
                      )}
                      {v.estado === "Inactivo" && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black border border-white/10 text-slate-500">
                          INACTIVO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {v.email || v.telefono || "Sin contacto"} · comisión {v.comisionPct}%
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void eliminar(v.vendedorId)}
                    className="shrink-0 text-slate-600 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Ventas y meta */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="rounded-xl bg-[#050B18] px-3 py-2">
                    <p className="text-[9px] uppercase text-slate-500 font-bold">Este mes</p>
                    <p className="text-[13px] font-black text-white mt-0.5">
                      {formatGs(v.ventasMesGs)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#050B18] px-3 py-2">
                    <p className="text-[9px] uppercase text-slate-500 font-bold">Comisión</p>
                    <p className="text-[13px] font-black text-amber-300 mt-0.5">
                      {formatGs(v.comisionMesGs)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#050B18] px-3 py-2">
                    <p className="text-[9px] uppercase text-slate-500 font-bold">Acumulado</p>
                    <p className="text-[13px] font-black text-slate-300 mt-0.5">
                      {formatGs(v.ventasTotalGs)}
                    </p>
                  </div>
                </div>

                {v.metaMensualGs > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Meta {formatGs(v.metaMensualGs)}</span>
                      <span
                        className={`font-bold ${
                          (pct || 0) >= 100 ? "text-emerald-300" : "text-amber-300"
                        }`}
                      >
                        {pct || 0}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#050B18] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (pct || 0) >= 100 ? "bg-emerald-400" : "bg-[#3b82f6]"
                        }`}
                        style={{ width: `${Math.min(100, pct || 0)}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 mt-3">
                  {v.propuestasGanadas} ganadas · {v.propuestasAbiertas} abiertas por{" "}
                  {formatGs(v.enNegociacionGs)} · {v.propuestasPerdidas} perdidas
                </p>

                {/* Decisión de los dueños */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  {v.esSocio ? (
                    <button
                      type="button"
                      onClick={() => void quitarSocio(v)}
                      className="w-full rounded-lg border border-white/10 py-2 text-[11px] font-bold text-slate-400 hover:text-white hover:border-white/25 transition"
                    >
                      Dejar de ser socio (sigue vendiendo)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPromover(v);
                        setPorcentajeSocio("");
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 py-2 text-[11px] font-bold text-amber-300 hover:bg-amber-500/10 transition"
                    >
                      <Crown size={13} />
                      Hacerlo socio
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!vendedores.length && (
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0C1327] text-center py-12 px-4">
              <Users size={22} className="mx-auto text-slate-700" />
              <p className="text-slate-500 text-xs mt-2">Todavía no hay vendedores cargados.</p>
              <p className="text-slate-600 text-[11px] mt-1">
                Agregá a la gente de confianza que vende para VORDIA.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal alta / edición */}
      {open && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                {editId ? "Editar vendedor" : "Nuevo vendedor"}
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
              <label className="text-[11px] font-bold text-slate-400 uppercase">Nombre *</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre y apellido"
                className="bg-[#050B18] border-white/10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="bg-[#050B18] border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Teléfono</label>
                <Input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="09xx xxx xxx"
                  className="bg-[#050B18] border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">
                  Comisión (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.comisionPct}
                  onChange={(e) => setForm({ ...form, comisionPct: e.target.value })}
                  placeholder="0"
                  className="bg-[#050B18] border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">
                  Meta del mes (Gs.)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.metaMensualGs}
                  onChange={(e) => setForm({ ...form, metaMensualGs: e.target.value })}
                  placeholder="0"
                  className="bg-[#050B18] border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full h-10 rounded-xl bg-[#050B18] border border-white/10 px-3 text-sm text-white"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-500">
              Las ventas no se cargan acá: se calculan solas con las propuestas que le asignes.
            </p>

            <Button
              onClick={() => void guardar()}
              disabled={guardando}
              className="w-full bg-[#007bff] rounded-xl font-bold"
            >
              {guardando ? "Guardando…" : "Guardar vendedor"}
            </Button>
          </div>
        </div>
      )}

      {/* Modal de promoción a socio */}
      {promover && (
        <div
          className="fixed inset-0 z-[85] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPromover(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-amber-500/25 bg-[#0C1327] p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Crown size={17} className="text-amber-300" />
              </span>
              <h3 className="text-base font-semibold text-white">Hacer socio a {promover.nombre}</h3>
            </div>

            <p className="text-[12px] text-slate-400">
              Pasa a repartir ganancias con Eli y vos. Sigue siendo vendedor y cobrando su comisión.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Participación (%) *
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={porcentajeSocio}
                onChange={(e) => setPorcentajeSocio(e.target.value)}
                placeholder="Ej. 10"
                className="bg-[#050B18] border-white/10 rounded-xl"
              />
              <p className="text-[11px] text-slate-500">
                Se descuenta del reparto. Revisá que entre todos los socios no pasen de 100%.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setPromover(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 rounded-xl font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => void confirmarPromocion()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
