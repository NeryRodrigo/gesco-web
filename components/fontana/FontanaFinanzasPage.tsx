"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
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
import {
  GASTO_CATEGORIAS,
  INGRESO_CATEGORIAS,
  METODOS_PAGO,
  addFontanaMovimiento,
  fetchFontanaMovimientos,
  filtrarMovimientos,
  formatGs,
  rangoPeriodo,
  removeFontanaMovimiento,
  resumenFinanciero,
  type FontanaFinanzaPropiedad,
  type FontanaMovimiento,
  type FontanaMovimientoTipo,
  type FontanaPeriodoPreset,
} from "@/lib/fontanaFinanzas";
import { calcPorCobrar } from "@/lib/fontanaReportes";
import type { Habitacion, Reserva } from "@/types/hostel";

type Props = {
  empresaId: number;
  habitaciones: Habitacion[];
  reservas: Reserva[];
};

export function FontanaFinanzasPage({ empresaId, habitaciones, reservas }: Props) {
  const [movimientos, setMovimientos] = useState<FontanaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [propiedad, setPropiedad] = useState<FontanaFinanzaPropiedad>("Todas");
  const [periodo, setPeriodo] = useState<FontanaPeriodoPreset>("mes");
  const [fromCustom, setFromCustom] = useState("");
  const [toCustom, setToCustom] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "ingreso" as FontanaMovimientoTipo,
    propiedad: "Fontana 1" as FontanaPropiedadPlano,
    categoria: "Hospedaje diario",
    concepto: "",
    monto: 0,
    fecha: new Date().toISOString().slice(0, 10),
    metodoPago: "Efectivo",
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setMovimientos(await fetchFontanaMovimientos(empresaId));
    } catch (e: any) {
      toast.error(e?.message || "No se pudieron cargar los movimientos");
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { from, to } = useMemo(
    () => rangoPeriodo(periodo, fromCustom, toCustom),
    [periodo, fromCustom, toCustom]
  );

  const filtrados = useMemo(
    () => filtrarMovimientos(movimientos, { propiedad, from, to }),
    [movimientos, propiedad, from, to]
  );

  const resumen = useMemo(() => resumenFinanciero(filtrados), [filtrados]);
  const porCobrar = useMemo(
    () => calcPorCobrar(habitaciones, reservas),
    [habitaciones, reservas]
  );

  const categorias =
    form.tipo === "ingreso" ? INGRESO_CATEGORIAS : GASTO_CATEGORIAS;

  const guardar = async () => {
    if (!form.concepto.trim()) {
      toast.error("Indicá un concepto");
      return;
    }
    if (!form.monto || form.monto <= 0) {
      toast.error("Monto inválido");
      return;
    }
    try {
      await addFontanaMovimiento(empresaId, {
        tipo: form.tipo,
        propiedad: form.propiedad,
        categoria: form.categoria,
        concepto: form.concepto.trim(),
        monto: form.monto,
        fecha: form.fecha,
        metodoPago: form.metodoPago,
        origen: "manual",
      });
      toast.success(form.tipo === "ingreso" ? "Ingreso registrado" : "Gasto registrado");
      setOpen(false);
      setForm((f) => ({ ...f, concepto: "", monto: 0 }));
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar en el servidor");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-400">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" /> Finanzas
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Persistido en API/BD · Abrí → mirá resultado → registrá cobro o gasto.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black italic rounded-xl min-h-11"
        >
          <Plus className="w-4 h-4 mr-2" /> Registrar movimiento
        </Button>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(["Todas", ...FONTANA_PROPIEDADES_PLANO] as FontanaFinanzaPropiedad[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPropiedad(p)}
              className={`min-h-10 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border touch-manipulation ${
                propiedad === p
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : "bg-white/5 text-slate-300 border-white/10"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(
            [
              ["hoy", "Hoy"],
              ["semana", "Semana"],
              ["mes", "Mes"],
              ["anio", "Año"],
              ["custom", "Personalizado"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setPeriodo(k)}
              className={`min-h-9 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                periodo === k ? "bg-sky-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
          {periodo === "custom" && (
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={fromCustom}
                onChange={(e) => setFromCustom(e.target.value)}
                className="h-9 bg-black/30 border-white/10 text-white text-xs"
              />
              <Input
                type="date"
                value={toCustom}
                onChange={(e) => setToCustom(e.target.value)}
                className="h-9 bg-black/30 border-white/10 text-white text-xs"
              />
            </div>
          )}
        </div>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          Periodo {from} → {to}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Ingresos", value: formatGs(resumen.ingresos), accent: "text-emerald-300" },
          { label: "Gastos", value: formatGs(resumen.gastos), accent: "text-rose-300" },
          {
            label: "Resultado",
            value: formatGs(resumen.resultado),
            accent: resumen.resultado >= 0 ? "text-amber-300" : "text-rose-400",
          },
          { label: "Por cobrar", value: formatGs(porCobrar.total), accent: "text-sky-300" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-[#0C1327] p-3 sm:p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{k.label}</p>
            <p className={`text-lg sm:text-xl font-black tabular-nums mt-1 ${k.accent}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Movimientos */}
      <section className="rounded-2xl border border-white/5 bg-[#0C1327]/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Movimientos ({filtrados.length})
          </p>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Cargando desde el servidor…</p>
        ) : filtrados.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 italic">Sin movimientos en este filtro.</p>
        ) : (
          <ul className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
            {filtrados.map((m) => (
              <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                <Badge
                  className={`shrink-0 border-none text-[8px] font-black uppercase ${
                    m.tipo === "ingreso"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {m.tipo}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{m.concepto}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {m.propiedad} · {m.categoria} · {m.fecha}
                    {m.metodoPago ? ` · ${m.metodoPago}` : ""}
                  </p>
                </div>
                <p
                  className={`text-sm font-black tabular-nums shrink-0 ${
                    m.tipo === "ingreso" ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {m.tipo === "ingreso" ? "+" : "−"}
                  {formatGs(m.monto)}
                </p>
                <button
                  type="button"
                  className="text-slate-600 hover:text-rose-400 p-1"
                  onClick={async () => {
                    try {
                      await removeFontanaMovimiento(empresaId, m.id);
                      await reload();
                    } catch (e: any) {
                      toast.error(e?.message || "No se pudo eliminar");
                    }
                  }}
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {porCobrar.items.length > 0 && (
        <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">
            Cuentas por cobrar (desde fichas / reservas)
          </p>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {porCobrar.items.slice(0, 8).map((i) => (
              <li
                key={i.habitacionId}
                className="flex justify-between gap-2 text-[11px] text-slate-300"
              >
                <span className="truncate">
                  {i.propiedad} · {i.etiqueta} · {i.huesped}
                </span>
                <span className="font-black text-sky-300 tabular-nums shrink-0">
                  {formatGs(i.saldo)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0C1327] border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter">
              Nuevo movimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="flex gap-2">
              {(["ingreso", "gasto"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      tipo: t,
                      categoria: t === "ingreso" ? "Hospedaje diario" : "Personal",
                    }))
                  }
                  className={`flex-1 min-h-10 rounded-xl text-[10px] font-black uppercase ${
                    form.tipo === t ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <select
              value={form.propiedad}
              onChange={(e) =>
                setForm((f) => ({ ...f, propiedad: e.target.value as FontanaPropiedadPlano }))
              }
              className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
            >
              {FONTANA_PROPIEDADES_PLANO.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Input
              placeholder="Concepto"
              value={form.concepto}
              onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
            <Input
              type="number"
              placeholder="Monto Gs."
              value={form.monto || ""}
              onChange={(e) => setForm((f) => ({ ...f, monto: Number(e.target.value) }))}
              className="bg-white/5 border-white/10"
            />
            <Input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
            <select
              value={form.metodoPago}
              onChange={(e) => setForm((f) => ({ ...f, metodoPago: e.target.value }))}
              className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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
