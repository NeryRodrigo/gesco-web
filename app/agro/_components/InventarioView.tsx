"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Package, Wheat, Syringe, AlertTriangle, Plus, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, X, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroCrearInsumo, agroInventario, agroMovimientos, agroRegistrarMovimiento, type AgroInsumo, type AgroMovimiento } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BTN_GHOST, BTN_PRIMARY, CARD, Empty, FIELD, Kpi, Pill, SELECT, fmtFecha, fmtGs, fmtNum } from "./ui";

/** Stock de alimento y medicamentos. El alimento se descuenta solo con cada ración entregada. */
export default function InventarioView({ ctx }: { ctx: AgroCtx }) {
  const [items, setItems] = useState<AgroInsumo[] | null>(null);
  const [sel, setSel] = useState<AgroInsumo | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    agroInventario(ctx.empresaId)
      .then((r) => vivo && setItems(r))
      .catch(() => vivo && setItems([]));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version, version]);

  if (!items) return <div className="h-96 rounded-2xl bg-white/[0.04] animate-pulse" />;

  const alimentos = items.filter((i) => i.tipo === "Alimento");
  const criticos = items.filter((i) => i.bajoMinimo || (i.diasRestantes != null && i.diasRestantes < 5));
  const valor = items.reduce((s, i) => s + Math.max(0, i.stock) * (i.costoPromedioGs ?? 0), 0);
  const kgAlimento = alimentos.reduce((s, i) => s + Math.max(0, i.stock), 0);
  const consumo = alimentos.reduce((s, i) => s + i.consumoDiario, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Alimento en stock" value={`${fmtNum(kgAlimento)} kg`} hint={consumo > 0 ? `≈ ${fmtNum(kgAlimento / consumo, 1)} días de consumo` : undefined} icon={<Wheat size={15} />} tone={consumo > 0 && kgAlimento / consumo < 5 ? "danger" : "ok"} />
        <Kpi label="Consumo diario" value={`${fmtNum(consumo)} kg`} hint="Promedio de los últimos 7 días" icon={<ArrowUpFromLine size={15} />} />
        <Kpi label="Insumos críticos" value={fmtNum(criticos.length)} hint="Bajo mínimo o < 5 días" icon={<AlertTriangle size={15} />} tone={criticos.length ? "warn" : "neutral"} />
        <Kpi label="Inventario valorizado" value={fmtGs(valor, true)} hint="A costo promedio de compra" icon={<Coins size={15} />} />
      </div>

      <section className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold">Insumos</h2>
          <Button onClick={() => setNuevo(true)} className={`${BTN_PRIMARY} h-10 px-4`}>
            <Plus size={14} /> Insumo
          </Button>
        </div>
        {items.length === 0 ? (
          <Empty>Sin insumos. Creá el alimento con el mismo nombre que usás en las raciones (ej. “TMR engorde”) para que se descuente solo.</Empty>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
                  <th className="px-2 py-2 font-medium">Insumo</th>
                  <th className="px-2 py-2 font-medium text-right">Stock</th>
                  <th className="px-2 py-2 font-medium text-right">Consumo / día</th>
                  <th className="px-2 py-2 font-medium text-right">Alcanza</th>
                  <th className="px-2 py-2 font-medium text-right">Mínimo</th>
                  <th className="px-2 py-2 font-medium text-right">Costo prom.</th>
                  <th className="px-2 py-2 font-medium">Última compra</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {items.map((i) => {
                  const critico = i.bajoMinimo || (i.diasRestantes != null && i.diasRestantes < 5);
                  return (
                    <tr key={i.insumoId} className="border-b border-white/[0.04]">
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          {i.tipo === "Alimento" ? <Wheat size={14} className="text-emerald-400" /> : i.tipo === "Medicamento" ? <Syringe size={14} className="text-sky-300" /> : <Package size={14} className="text-white/50" />}
                          <span className="text-white font-medium">{i.nombre}</span>
                          {critico ? <Pill tone="danger">Reponer</Pill> : null}
                        </div>
                      </td>
                      <td className={`px-2 py-2.5 text-right font-semibold ${i.stock <= 0 ? "text-rose-300" : "text-white"}`}>
                        {fmtNum(i.stock)} {i.unidad}
                      </td>
                      <td className="px-2 py-2.5 text-right text-white/70">{i.consumoDiario ? `${fmtNum(i.consumoDiario, 1)} ${i.unidad}` : "—"}</td>
                      <td className={`px-2 py-2.5 text-right ${i.diasRestantes != null && i.diasRestantes < 5 ? "text-rose-300 font-semibold" : "text-white/70"}`}>
                        {i.diasRestantes != null ? `${fmtNum(i.diasRestantes, 1)} días` : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right text-white/50">{fmtNum(i.stockMinimo)} {i.unidad}</td>
                      <td className="px-2 py-2.5 text-right text-white/70">{i.costoPromedioGs ? fmtGs(i.costoPromedioGs) : "—"}</td>
                      <td className="px-2 py-2.5 text-white/50">{i.ultimoIngreso ? fmtFecha(i.ultimoIngreso) : "—"}</td>
                      <td className="px-2 py-2.5 text-right">
                        <button type="button" onClick={() => setSel(i)} className="text-[12px] text-emerald-300 hover:underline">
                          Movimientos
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sel ? (
        <MovimientosDialog
          ctx={ctx}
          insumo={sel}
          onClose={() => setSel(null)}
          onCambio={(i) => {
            setSel(i);
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
      {nuevo ? (
        <NuevoInsumo
          ctx={ctx}
          onClose={() => setNuevo(false)}
          onCreado={() => {
            setNuevo(false);
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function MovimientosDialog({ ctx, insumo, onClose, onCambio }: { ctx: AgroCtx; insumo: AgroInsumo; onClose: () => void; onCambio: (i: AgroInsumo) => void }) {
  const [movs, setMovs] = useState<AgroMovimiento[]>([]);
  const [f, setF] = useState({ tipo: "Ingreso", cantidad: "", costo: insumo.costoPromedioGs ? String(insumo.costoPromedioGs) : "", referencia: "" });
  const [guardando, setGuardando] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    agroMovimientos(ctx.empresaId, insumo.insumoId)
      .then((r) => vivo && setMovs(r))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, insumo.insumoId, version]);

  const guardar = async () => {
    const cantidad = Number(f.cantidad);
    if (!cantidad) return void toast.error("Indicá la cantidad");
    try {
      setGuardando(true);
      const upd = await agroRegistrarMovimiento(insumo.insumoId, {
        empresaId: ctx.empresaId,
        tipo: f.tipo,
        cantidad,
        costoUnitarioGs: f.tipo === "Ingreso" && f.costo ? Number(f.costo) : undefined,
        referencia: f.referencia || undefined,
      });
      toast.success(`${f.tipo} registrado · stock ${fmtNum(upd.stock)} ${upd.unidad}`);
      setF({ ...f, cantidad: "", referencia: "" });
      setVersion((v) => v + 1);
      onCambio(upd);
      ctx.refrescar();
    } catch (e) {
      toast.error("No se pudo registrar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div className={`${CARD} bg-[#0b1511] w-full sm:max-w-xl max-h-[92vh] overflow-y-auto p-5 rounded-b-none sm:rounded-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold">{insumo.nombre}</h3>
            <p className="text-[12px] text-white/50">
              Stock {fmtNum(insumo.stock)} {insumo.unidad}
              {insumo.diasRestantes != null ? ` · alcanza ${fmtNum(insumo.diasRestantes, 1)} días` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="inline-flex w-full p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.06] mb-3">
          {(
            [
              ["Ingreso", <ArrowDownToLine key="i" size={13} />, "Compra / ingreso"],
              ["Consumo", <ArrowUpFromLine key="c" size={13} />, insumo.tipo === "Alimento" ? "Otro consumo" : "Consumo"],
              ["Ajuste", <SlidersHorizontal key="a" size={13} />, "Ajuste"],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setF({ ...f, tipo: id })}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold ${f.tipo === id ? "bg-emerald-600 text-white" : "text-white/50"}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Input type="number" inputMode="decimal" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} placeholder={f.tipo === "Ajuste" ? `± ${insumo.unidad} (negativo resta)` : `Cantidad (${insumo.unidad})`} className={FIELD} />
          {f.tipo === "Ingreso" ? (
            <Input type="number" inputMode="decimal" value={f.costo} onChange={(e) => setF({ ...f, costo: e.target.value })} placeholder={`Costo Gs. / ${insumo.unidad}`} className={FIELD} />
          ) : (
            <div />
          )}
        </div>
        <Input value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} placeholder={f.tipo === "Ingreso" ? "Proveedor / factura" : "Motivo / lote aplicado"} className={`${FIELD} mt-2.5`} />
        {insumo.tipo === "Alimento" && f.tipo === "Consumo" ? (
          <p className="text-[11px] text-amber-200/80 mt-2">Las raciones entregadas ya descuentan stock: usá esto solo para pérdidas u otros usos.</p>
        ) : null}
        <Button className={`${BTN_PRIMARY} w-full mt-3`} disabled={guardando} onClick={() => void guardar()}>
          Registrar {f.tipo.toLowerCase()}
        </Button>

        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mt-5 mb-2">Movimientos</p>
        {movs.length ? (
          <div className="divide-y divide-white/[0.05]">
            {movs.map((m) => (
              <div key={m.movimientoId} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <div className="min-w-0">
                  <p className="text-white/85">{m.tipo}{m.referencia ? ` · ${m.referencia}` : ""}</p>
                  <p className="text-[11px] text-white/40">{fmtFecha(m.fecha, true)}{m.costoUnitarioGs ? ` · ${fmtGs(m.costoUnitarioGs)} / ${insumo.unidad}` : ""}</p>
                </div>
                <p className={`shrink-0 font-semibold tabular-nums ${m.tipo === "Consumo" || m.cantidad < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                  {m.tipo === "Consumo" ? "−" : m.cantidad > 0 ? "+" : ""}
                  {fmtNum(m.tipo === "Consumo" ? m.cantidad : m.cantidad)} {insumo.unidad}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40">Sin movimientos manuales.</p>
        )}
        {insumo.tipo === "Alimento" ? <p className="text-[11px] text-white/35 mt-2">Las entregas de ración se ven en Alimentación.</p> : null}
        <div className="mt-4">
          <Button className={`${BTN_GHOST} w-full h-10`} onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

function NuevoInsumo({ ctx, onClose, onCreado }: { ctx: AgroCtx; onClose: () => void; onCreado: () => void }) {
  const [f, setF] = useState({ nombre: "", tipo: "Alimento", unidad: "kg", minimo: "", inicial: "", costo: "" });
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!f.nombre.trim()) return void toast.error("Indicá el nombre");
    try {
      setGuardando(true);
      await agroCrearInsumo({
        empresaId: ctx.empresaId,
        nombre: f.nombre,
        tipo: f.tipo,
        unidad: f.unidad,
        stockMinimo: Number(f.minimo) || 0,
        stockInicial: f.inicial ? Number(f.inicial) : undefined,
        costoUnitarioGs: f.costo ? Number(f.costo) : undefined,
      });
      toast.success("Insumo creado");
      onCreado();
    } catch (e) {
      toast.error("No se pudo crear", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div className={`${CARD} bg-[#0b1511] w-full sm:max-w-md p-5 rounded-b-none sm:rounded-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Nuevo insumo</h3>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2.5">
          <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre (igual al alimento de las raciones)" className={FIELD} />
          <div className="grid grid-cols-2 gap-2.5">
            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value, unidad: e.target.value === "Alimento" ? "kg" : f.unidad })} className={SELECT}>
              <option>Alimento</option>
              <option>Medicamento</option>
              <option>Otro</option>
            </select>
            <select value={f.unidad} onChange={(e) => setF({ ...f, unidad: e.target.value })} className={SELECT}>
              {["kg", "l", "ml", "dosis", "unidad"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Input type="number" value={f.inicial} onChange={(e) => setF({ ...f, inicial: e.target.value })} placeholder="Stock inicial" className={FIELD} />
            <Input type="number" value={f.costo} onChange={(e) => setF({ ...f, costo: e.target.value })} placeholder="Costo Gs." className={FIELD} />
            <Input type="number" value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} placeholder="Mínimo" className={FIELD} />
          </div>
          <Button className={`${BTN_PRIMARY} w-full`} disabled={guardando} onClick={() => void guardar()}>
            <Plus size={14} /> Crear insumo
          </Button>
        </div>
      </div>
    </div>
  );
}
