"use client";

import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Beef, Syringe, Wheat, Fence, Package, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  agroAnimalesFull, agroInventario, agroRaciones, agroSanidad,
} from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BTN_GHOST, CARD, ETAPA_LABEL } from "./ui";
import { descargarCsv } from "./csv";

type Reporte = { id: string; titulo: string; detalle: string; icon: ReactNode; generar: () => Promise<void> };

/** Reportes descargables (CSV para Excel) con los datos del establecimiento. */
export default function ReportesView({ ctx }: { ctx: AgroCtx }) {
  const [generando, setGenerando] = useState<string | null>(null);
  const hoy = new Date().toISOString().slice(0, 10);

  const reportes: Reporte[] = [
    {
      id: "rodeo",
      titulo: "Inventario de hacienda",
      detalle: "Todos los animales activos con etapa, lote, peso, GPD y genealogía.",
      icon: <Beef size={20} />,
      generar: async () => {
        const a = (await agroAnimalesFull(ctx.empresaId)).filter((x) => x.etapa !== "Vendido" && x.etapa !== "Baja");
        descargarCsv(
          `inventario-hacienda-${hoy}.csv`,
          ["Caravana", "RFID", "Categoría", "Sexo", "Raza", "Etapa", "Lote", "Estado", "Peso actual (kg)", "Peso ingreso (kg)", "GPD (kg/d)", "Objetivo (kg)", "Listo para venta", "Retiro sanitario hasta", "Madre", "Padre"],
          a.map((x) => [
            x.codigoInterno, x.rfidTag, x.categoria, x.sexo, x.raza, ETAPA_LABEL[x.etapa] ?? x.etapa, x.loteCodigo, x.estado, x.pesoActualKg, x.pesoIngresoKg,
            x.gpdKg, x.pesoObjetivoKg, x.listoParaVenta ? "Sí" : "No", x.retiroSanitarioHasta?.slice(0, 10), x.madreCodigo, x.padreCodigo,
          ]),
        );
      },
    },
    {
      id: "sanidad",
      titulo: "Plan sanitario",
      detalle: "Vacunas, tratamientos y desparasitaciones: programadas, vencidas y aplicadas, con retiros.",
      icon: <Syringe size={20} />,
      generar: async () => {
        const s = await agroSanidad(ctx.empresaId);
        descargarCsv(
          `plan-sanitario-${hoy}.csv`,
          ["Tipo", "Producto", "Dosis", "Destino", "Animales", "Estado", "Programada", "Aplicada", "Retiro hasta", "Responsable", "Notas"],
          s.map((x) => [
            x.tipo, x.producto, x.dosis, x.loteCodigo ? `Lote ${x.loteCodigo}` : `#${x.animalCodigo}`, x.animalesAlcanzados, x.vencida ? "Vencida" : x.estado,
            x.fechaProgramada?.slice(0, 10), x.fechaAplicacion?.slice(0, 10), x.retiroHasta?.slice(0, 10), x.responsable, x.notas,
          ]),
        );
      },
    },
    {
      id: "alimentacion",
      titulo: "Entregas de alimento",
      detalle: "Raciones entregadas por corral, con kilos, operario y costo (últimas 100).",
      icon: <Wheat size={20} />,
      generar: async () => {
        const r = await agroRaciones(ctx.empresaId);
        descargarCsv(
          `entregas-alimento-${hoy}.csv`,
          ["Fecha", "Lote", "Alimento", "Kg", "Costo (Gs.)", "Operario", "Vehículo"],
          r.map((x) => [x.fechaEntrega.slice(0, 16).replace("T", " "), x.loteCodigo, x.tipoAlimento, x.cantidadKg, x.costoGs, x.operario, x.vehiculo]),
        );
      },
    },
    {
      id: "lotes",
      titulo: "Ocupación de lotes",
      detalle: "Lotes, corrales y potreros con capacidad, cabezas y etapa.",
      icon: <Fence size={20} />,
      generar: async () => {
        descargarCsv(
          `ocupacion-lotes-${hoy}.csv`,
          ["Código", "Nombre", "Tipo", "Etapa", "Cabezas", "Capacidad", "Ocupación %", "Peso objetivo (kg)"],
          ctx.lotes.map((l) => [
            l.codigo, l.nombre, l.tipo, l.etapa ? ETAPA_LABEL[l.etapa] : "", l.animales, l.capacidad, l.capacidad ? Math.round((l.animales * 100) / l.capacidad) : null, l.pesoObjetivoKg,
          ]),
        );
      },
    },
    {
      id: "insumos",
      titulo: "Stock de insumos",
      detalle: "Alimento y medicamentos con stock, consumo diario, días de cobertura y costo.",
      icon: <Package size={20} />,
      generar: async () => {
        const i = await agroInventario(ctx.empresaId);
        descargarCsv(
          `stock-insumos-${hoy}.csv`,
          ["Insumo", "Tipo", "Unidad", "Stock", "Consumo diario", "Días de cobertura", "Mínimo", "Costo promedio (Gs.)", "Última compra"],
          i.map((x) => [x.nombre, x.tipo, x.unidad, x.stock, x.consumoDiario, x.diasRestantes, x.stockMinimo, x.costoPromedioGs, x.ultimoIngreso?.slice(0, 10)]),
        );
      },
    },
  ];

  const correr = async (r: Reporte) => {
    try {
      setGenerando(r.id);
      await r.generar();
      toast.success(`${r.titulo} descargado`);
    } catch (e) {
      toast.error("No se pudo generar el reporte", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {reportes.map((r) => (
          <div key={r.id} className={`${CARD} p-5 flex flex-col`}>
            <span className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-300 flex items-center justify-center">{r.icon}</span>
            <p className="text-sm font-semibold mt-3">{r.titulo}</p>
            <p className="text-[12px] text-white/45 mt-1 leading-relaxed flex-1">{r.detalle}</p>
            <Button className={`${BTN_GHOST} h-10 mt-4`} disabled={generando === r.id} onClick={() => void correr(r)}>
              <Download size={14} /> {generando === r.id ? "Generando…" : "Descargar CSV (Excel)"}
            </Button>
          </div>
        ))}
        <div className={`${CARD} p-5 flex flex-col`}>
          <span className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-300 flex items-center justify-center">
            <Printer size={20} />
          </span>
          <p className="text-sm font-semibold mt-3">Dashboard en PDF</p>
          <p className="text-[12px] text-white/45 mt-1 leading-relaxed flex-1">Abrí el Dashboard y usá Imprimir → Guardar como PDF para compartir el resumen del día.</p>
          <Button
            className={`${BTN_GHOST} h-10 mt-4`}
            onClick={() => {
              ctx.irA("ejecutivo");
              setTimeout(() => window.print(), 1500);
            }}
          >
            <Printer size={14} /> Imprimir dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
