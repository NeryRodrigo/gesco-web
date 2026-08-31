"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FONTANA_PROPIEDADES_PLANO, type FontanaPropiedadPlano } from "@/lib/fontanaPlanos";
import { formatGs } from "@/lib/fontanaFinanzas";
import {
  loadFontanaPersonal,
  marcarSalarioPagado,
  reiniciarEstadoPagoMes,
  removeFontanaEmpleado,
  upsertFontanaEmpleado,
  type FontanaEmpleado,
  type FontanaEmpleadoEstadoPago,
} from "@/lib/fontanaPersonal";

type Props = { empresaId: number; onFinanzasChanged?: () => void };

const emptyForm = () => ({
  id: undefined as string | undefined,
  nombre: "",
  funcion: "",
  telefono: "",
  propiedades: ["Fontana 1"] as FontanaPropiedadPlano[],
  salario: 0,
  fechaPago: new Date().toISOString().slice(0, 10),
  estadoPago: "PENDIENTE" as FontanaEmpleadoEstadoPago,
});

export function FontanaPersonalPage({ empresaId, onFinanzasChanged }: Props) {
  const [empleados, setEmpleados] = useState<FontanaEmpleado[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const reload = useCallback(async () => {
    try {
      setEmpleados(await loadFontanaPersonal(empresaId));
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cargar personal");
    }
  }, [empresaId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pendientes = useMemo(
    () => empleados.filter((e) => e.estadoPago === "PENDIENTE"),
    [empleados]
  );
  const masaSalarial = useMemo(
    () => empleados.reduce((a, e) => a + Number(e.salario || 0), 0),
    [empleados]
  );

  const toggleProp = (p: FontanaPropiedadPlano) => {
    setForm((f) => {
      const has = f.propiedades.includes(p);
      const next = has ? f.propiedades.filter((x) => x !== p) : [...f.propiedades, p];
      return { ...f, propiedades: next.length ? next : [p] };
    });
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.funcion.trim()) {
      toast.error("Nombre y función son obligatorios");
      return;
    }
    try {
      await upsertFontanaEmpleado(empresaId, {
        id: form.id,
        nombre: form.nombre.trim(),
        funcion: form.funcion.trim(),
        telefono: form.telefono.trim() || undefined,
        propiedades: form.propiedades,
        salario: form.salario,
        fechaPago: form.fechaPago,
        estadoPago: form.estadoPago,
      });
      toast.success(form.id ? "Empleado actualizado" : "Empleado creado");
      setOpen(false);
      setForm(emptyForm());
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar en el servidor");
    }
  };

  const pagar = async (id: string) => {
    const r = await marcarSalarioPagado(empresaId, id);
    if (!r.ok) {
      toast.error(r.mensaje);
      return;
    }
    toast.success(r.mensaje);
    await reload();
    onFinanzasChanged?.();
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-400">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" /> Personal
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Persistido en API/BD · Mirás quién cobra · pagás · el gasto se genera solo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await reiniciarEstadoPagoMes(empresaId);
                toast.message("Estados reiniciados a PENDIENTE");
                await reload();
              } catch (e: any) {
                toast.error(e?.message || "No se pudo reiniciar");
              }
            }}
            className="rounded-xl border-white/10 text-slate-200 min-h-11"
          >
            Reiniciar mes
          </Button>
          <Button
            onClick={() => {
              setForm(emptyForm());
              setOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black italic rounded-xl min-h-11"
          >
            <Plus className="w-4 h-4 mr-2" /> Alta empleado
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-white/10 bg-[#0C1327] p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Empleados</p>
          <p className="text-2xl font-black text-white mt-1">{empleados.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0C1327] p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            Salarios pendientes
          </p>
          <p className="text-2xl font-black text-amber-300 mt-1">{pendientes.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0C1327] p-4 col-span-2 lg:col-span-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            Masa salarial
          </p>
          <p className="text-xl font-black text-sky-300 mt-1 tabular-nums">{formatGs(masaSalarial)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/5 bg-[#0C1327]/80 overflow-hidden">
        {empleados.length === 0 ? (
          <p className="p-8 text-sm text-slate-500 italic text-center">
            Sin personal cargado. Tocá «Alta empleado».
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {empleados.map((e) => (
              <li
                key={e.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-white uppercase tracking-tight">
                      {e.nombre}
                    </p>
                    <Badge
                      className={`border-none text-[8px] font-black uppercase ${
                        e.estadoPago === "PAGADO"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {e.estadoPago}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {e.funcion}
                    {e.telefono ? ` · ${e.telefono}` : ""} · pago {e.fechaPago}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {e.propiedades.map((p) => (
                      <span
                        key={p}
                        className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-400"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-black text-amber-300 tabular-nums sm:text-right">
                  {formatGs(e.salario)}
                </p>
                <div className="flex gap-2">
                  {e.estadoPago === "PENDIENTE" && (
                    <Button
                      size="sm"
                      onClick={() => void pagar(e.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pagar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 rounded-lg text-[10px] uppercase font-bold"
                    onClick={() => {
                      setForm({
                        id: e.id,
                        nombre: e.nombre,
                        funcion: e.funcion,
                        telefono: e.telefono || "",
                        propiedades: e.propiedades,
                        salario: e.salario,
                        fechaPago: e.fechaPago,
                        estadoPago: e.estadoPago,
                      });
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <button
                    type="button"
                    className="text-slate-600 hover:text-rose-400 p-2"
                    onClick={async () => {
                      try {
                        await removeFontanaEmpleado(empresaId, e.id);
                        await reload();
                      } catch (err: any) {
                        toast.error(err?.message || "No se pudo eliminar");
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0C1327] border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter">
              {form.id ? "Editar empleado" : "Alta empleado"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
            <Input
              placeholder="Función"
              value={form.funcion}
              onChange={(e) => setForm((f) => ({ ...f, funcion: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
            <Input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
            <Input
              type="number"
              placeholder="Salario Gs."
              value={form.salario || ""}
              onChange={(e) => setForm((f) => ({ ...f, salario: Number(e.target.value) }))}
              className="bg-white/5 border-white/10"
            />
            <Input
              type="date"
              value={form.fechaPago}
              onChange={(e) => setForm((f) => ({ ...f, fechaPago: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                Fontana(s) asignada(s)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FONTANA_PROPIEDADES_PLANO.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleProp(p)}
                    className={`min-h-9 px-2.5 rounded-lg text-[9px] font-black uppercase border ${
                      form.propiedades.includes(p)
                        ? "bg-amber-500 text-slate-950 border-amber-400"
                        : "bg-white/5 text-slate-400 border-white/10"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => void guardar()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black italic rounded-xl min-h-11"
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
