"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bed,
  CalendarRange,
  CheckCircle2,
  CreditCard,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { installAuthFetch, API_BASE } from "@/lib/api";
import { loadVordiaSession } from "@/lib/utils";
import {
  stayCheckIn,
  stayCheckOut,
  stayCrearBloqueo,
  stayDisponibilidad,
  stayListHabitaciones,
  stayListReservas,
  stayListTarifas,
  stayPing,
  stayRegistrarPago,
  stayUpsertTarifa,
  type StayTarifa,
} from "@/lib/stayApi";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function resolveEmpresaId(): number {
  try {
    const s = loadVordiaSession();
    const id = Number(s?.user?.empresaId ?? s?.user?.EmpresaId ?? 7);
    return Number.isFinite(id) && id > 0 ? id : 7;
  } catch {
    return 7;
  }
}

export default function StayPage() {
  const [empresaId, setEmpresaId] = useState(7);
  const [ping, setPing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<any>(null);
  const [desde, setDesde] = useState(todayIso());
  const [hasta, setHasta] = useState(plusDaysIso(7));

  const [tarifaForm, setTarifaForm] = useState<StayTarifa>({
    empresaId: 7,
    nombre: "Noche estándar",
    tipoHabitacion: "Habitación",
    precioPorNocheGs: 250000,
  });

  const [pagoForm, setPagoForm] = useState({
    reservaId: 0,
    montoGs: 0,
    metodoPago: "Efectivo",
    concepto: "Pago reserva Stay",
  });

  const [bloqueoForm, setBloqueoForm] = useState({
    habitacionId: 0,
    fechaDesde: todayIso(),
    fechaHasta: plusDaysIso(2),
    motivo: "Mantenimiento",
    notas: "",
  });

  useEffect(() => {
    installAuthFetch();
    const id = resolveEmpresaId();
    setEmpresaId(id);
    setTarifaForm((f) => ({ ...f, empresaId: id }));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [p, habs, res, tars, disp] = await Promise.all([
        stayPing(),
        stayListHabitaciones(empresaId).catch(() => []),
        stayListReservas(empresaId).catch(() => []),
        stayListTarifas(empresaId).catch(() => []),
        stayDisponibilidad(empresaId, desde, hasta).catch(() => null),
      ]);
      setPing(p);
      setHabitaciones(Array.isArray(habs) ? habs : []);
      setReservas(Array.isArray(res) ? res : []);
      setTarifas(Array.isArray(tars) ? tars : []);
      setDisponibilidad(disp);
      toast.success("Stay sincronizado");
    } catch (e: any) {
      toast.error("No se pudo cargar Stay", {
        description: e?.message || `¿API en ${API_BASE}? ¿SQL Create_Vordia_Stay ejecutado?`,
      });
    } finally {
      setLoading(false);
    }
  }, [empresaId, desde, hasta]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const reservasActivas = useMemo(
    () =>
      reservas.filter((r) => {
        const e = String(r.estado || r.Estado || "");
        return e !== "Cancelada" && e !== "CheckOut";
      }),
    [reservas]
  );

  const crearTarifa = async () => {
    try {
      await stayUpsertTarifa({ ...tarifaForm, empresaId });
      toast.success("Tarifa guardada");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar tarifa");
    }
  };

  const registrarPago = async () => {
    if (!pagoForm.reservaId || pagoForm.montoGs <= 0) {
      toast.error("Indicá reserva y monto");
      return;
    }
    try {
      await stayRegistrarPago({
        empresaId,
        reservaId: Number(pagoForm.reservaId),
        montoGs: Number(pagoForm.montoGs),
        metodoPago: pagoForm.metodoPago,
        concepto: pagoForm.concepto,
        fechaPago: new Date().toISOString(),
      });
      toast.success("Pago Stay registrado");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Error al registrar pago");
    }
  };

  const crearBloqueo = async () => {
    if (!bloqueoForm.habitacionId) {
      toast.error("Elegí habitación");
      return;
    }
    try {
      await stayCrearBloqueo({
        empresaId,
        habitacionId: Number(bloqueoForm.habitacionId),
        fechaDesde: new Date(bloqueoForm.fechaDesde).toISOString(),
        fechaHasta: new Date(bloqueoForm.fechaHasta + "T23:59:59").toISOString(),
        motivo: bloqueoForm.motivo,
        notas: bloqueoForm.notas || null,
      });
      toast.success("Bloqueo creado");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Error al crear bloqueo");
    }
  };

  return (
    <div className="min-h-dvh bg-[#050B18] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050B18]/95 backdrop-blur px-4 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
              <Bed className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-black italic uppercase tracking-tighter truncate">
                Vordia Stay
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Consola de prueba · no modifica HQ ni Habitat
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              className="w-28 h-10 bg-white/5 border-white/10 rounded-xl"
              value={empresaId}
              onChange={(e) => setEmpresaId(Number(e.target.value) || 7)}
              title="EmpresaId"
            />
            <Button
              onClick={() => void reload()}
              disabled={loading}
              className="h-10 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <a href="/" className="text-xs font-bold uppercase text-slate-400 hover:text-white px-3">
              Volver al shell
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Estado API */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-2">
              <h2 className="font-black uppercase italic text-sm tracking-tight">Estado del producto</h2>
              {ping ? (
                <>
                  <p className="text-xs text-emerald-300 font-bold">
                    {ping.producto} · {ping.version} · API {API_BASE}
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc pl-4">
                    {(ping.areas || []).map((a: string) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-amber-300">
                  Sin respuesta de `/api/Stay/ping`. Ejecutá el SQL y reiniciá la API.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Rango disponibilidad */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-sky-300" />
            <h2 className="font-black uppercase italic text-sm">Disponibilidad</h2>
            {disponibilidad && (
              <Badge className="bg-sky-500/20 text-sky-200 border-sky-500/30 text-[10px]">
                {disponibilidad.disponibles}/{disponibilidad.totalHabitaciones} libres
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">Desde</label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="h-10 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">Hasta</label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="h-10 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-xl border-white/15"
              onClick={() => void reload()}
            >
              Consultar
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Habitación</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">En rango</th>
                  <th className="px-3 py-2">Ocupaciones</th>
                </tr>
              </thead>
              <tbody>
                {(disponibilidad?.habitaciones || habitaciones).map((h: any) => (
                  <tr key={h.habitacionId || h.HabitacionId} className="border-t border-white/5">
                    <td className="px-3 py-2 font-bold">{h.nombre || h.Nombre}</td>
                    <td className="px-3 py-2 text-slate-400">{h.tipo || h.Tipo}</td>
                    <td className="px-3 py-2">{h.estado || h.Estado}</td>
                    <td className="px-3 py-2">
                      {h.disponibleEnRango === true ? (
                        <span className="text-emerald-400 font-bold">Libre</span>
                      ) : h.disponibleEnRango === false ? (
                        <span className="text-rose-400 font-bold">Ocupada/Bloq.</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {Array.isArray(h.ocupaciones) ? h.ocupaciones.length : "—"}
                    </td>
                  </tr>
                ))}
                {(disponibilidad?.habitaciones || habitaciones).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Sin habitaciones. Creá alguna con `/api/Habitaciones` o desde Fontana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Tarifas */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-300" />
              <h2 className="font-black uppercase italic text-sm">Tarifas Stay</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nombre"
                value={tarifaForm.nombre}
                onChange={(e) => setTarifaForm({ ...tarifaForm, nombre: e.target.value })}
                className="h-10 bg-white/5 border-white/10 rounded-xl col-span-2"
              />
              <Input
                placeholder="Tipo habitación"
                value={tarifaForm.tipoHabitacion}
                onChange={(e) => setTarifaForm({ ...tarifaForm, tipoHabitacion: e.target.value })}
                className="h-10 bg-white/5 border-white/10 rounded-xl"
              />
              <Input
                type="number"
                placeholder="Gs / noche"
                value={tarifaForm.precioPorNocheGs}
                onChange={(e) =>
                  setTarifaForm({ ...tarifaForm, precioPorNocheGs: Number(e.target.value) || 0 })
                }
                className="h-10 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <Button onClick={() => void crearTarifa()} className="w-full h-10 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold">
              Guardar tarifa
            </Button>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {tarifas.map((t: any) => (
                <li
                  key={t.stayTarifaId || t.StayTarifaId}
                  className="flex justify-between gap-2 text-xs rounded-xl bg-black/20 px-3 py-2 border border-white/5"
                >
                  <span className="font-bold truncate">
                    {t.nombre || t.Nombre} · {t.tipoHabitacion || t.TipoHabitacion}
                  </span>
                  <span className="text-amber-300 tabular-nums shrink-0">
                    Gs. {Number(t.precioPorNocheGs ?? t.PrecioPorNocheGs ?? 0).toLocaleString("es-PY")}
                  </span>
                </li>
              ))}
              {tarifas.length === 0 && (
                <li className="text-[11px] text-slate-500 text-center py-2">Sin tarifas aún</li>
              )}
            </ul>
          </section>

          {/* Bloqueo */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-rose-300" />
              <h2 className="font-black uppercase italic text-sm">Bloqueo calendario</h2>
            </div>
            <select
              className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm"
              value={bloqueoForm.habitacionId}
              onChange={(e) =>
                setBloqueoForm({ ...bloqueoForm, habitacionId: Number(e.target.value) })
              }
            >
              <option value={0}>Habitación…</option>
              {habitaciones.map((h: any) => (
                <option key={h.habitacionId || h.HabitacionId} value={h.habitacionId || h.HabitacionId}>
                  {h.nombre || h.Nombre}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={bloqueoForm.fechaDesde}
                onChange={(e) => setBloqueoForm({ ...bloqueoForm, fechaDesde: e.target.value })}
                className="h-10 bg-white/5 border-white/10 rounded-xl"
              />
              <Input
                type="date"
                value={bloqueoForm.fechaHasta}
                onChange={(e) => setBloqueoForm({ ...bloqueoForm, fechaHasta: e.target.value })}
                className="h-10 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <Input
              placeholder="Motivo (Mantenimiento / Owner / BloqueoManual)"
              value={bloqueoForm.motivo}
              onChange={(e) => setBloqueoForm({ ...bloqueoForm, motivo: e.target.value })}
              className="h-10 bg-white/5 border-white/10 rounded-xl"
            />
            <Button
              onClick={() => void crearBloqueo()}
              className="w-full h-10 rounded-xl bg-rose-700 hover:bg-rose-600 font-bold"
            >
              Crear bloqueo
            </Button>
          </section>
        </div>

        {/* Reservas + pagos + check-in/out */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <h2 className="font-black uppercase italic text-sm">Reservas · Check-in / out · Pagos</h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Id</th>
                  <th className="px-3 py-2">Hab.</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Check-in</th>
                  <th className="px-3 py-2">Pagado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasActivas.map((r: any) => {
                  const id = r.reservaId || r.ReservaId;
                  return (
                    <tr key={id} className="border-t border-white/5">
                      <td className="px-3 py-2 font-mono">{id}</td>
                      <td className="px-3 py-2">{r.habitacionId || r.HabitacionId}</td>
                      <td className="px-3 py-2 font-bold">{r.estado || r.Estado}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {String(r.fechaCheckIn || r.FechaCheckIn || "").slice(0, 10)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {Number(r.montoPagadoGs ?? r.MontoPagadoGs ?? 0).toLocaleString("es-PY")}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            className="h-8 text-[10px] rounded-lg bg-emerald-700"
                            onClick={async () => {
                              try {
                                await stayCheckIn(empresaId, id);
                                toast.success(`Check-in #${id}`);
                                await reload();
                              } catch (e: any) {
                                toast.error(e?.message || "Error check-in");
                              }
                            }}
                          >
                            Check-in
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-[10px] rounded-lg bg-slate-700"
                            onClick={async () => {
                              try {
                                await stayCheckOut(empresaId, id);
                                toast.success(`Check-out #${id}`);
                                await reload();
                              } catch (e: any) {
                                toast.error(e?.message || "Error check-out");
                              }
                            }}
                          >
                            <LogOut className="w-3 h-3 mr-1" /> Out
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[10px] rounded-lg border-white/15"
                            onClick={() =>
                              setPagoForm((p) => ({
                                ...p,
                                reservaId: id,
                                montoGs:
                                  Number(r.montoTotalGs ?? r.MontoTotalGs ?? 0) -
                                  Number(r.montoPagadoGs ?? r.MontoPagadoGs ?? 0) || 100000,
                              }))
                            }
                          >
                            <CreditCard className="w-3 h-3 mr-1" /> Pagar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {reservasActivas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Sin reservas activas. Creá una con `/api/Reservas` o Fontana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagoForm.reservaId > 0 && (
            <div className="flex flex-wrap gap-2 items-end border-t border-white/10 pt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Reserva</label>
                <Input
                  type="number"
                  value={pagoForm.reservaId}
                  onChange={(e) => setPagoForm({ ...pagoForm, reservaId: Number(e.target.value) })}
                  className="h-10 w-28 bg-white/5 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Monto Gs</label>
                <Input
                  type="number"
                  value={pagoForm.montoGs}
                  onChange={(e) => setPagoForm({ ...pagoForm, montoGs: Number(e.target.value) })}
                  className="h-10 w-36 bg-white/5 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Método</label>
                <select
                  value={pagoForm.metodoPago}
                  onChange={(e) => setPagoForm({ ...pagoForm, metodoPago: e.target.value })}
                  className="h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm"
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Tarjeta</option>
                </select>
              </div>
              <Button
                onClick={() => void registrarPago()}
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                Registrar pago Stay
              </Button>
            </div>
          )}
        </section>

        <p className="text-[10px] text-slate-600 text-center pb-8">
          Ruta dedicada <code className="text-slate-400">/stay</code> · Habitaciones/Reservas son Core existente ·
          Tablas nuevas: StayTarifas, StayPagos, StayBloqueos, StayHuespedes
        </p>
      </main>
    </div>
  );
}
