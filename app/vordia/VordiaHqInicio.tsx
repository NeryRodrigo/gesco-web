"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { VordiaHqEjecutivo } from "./VordiaHqEjecutivo";
import { VordiaHqGestion } from "./VordiaHqGestion";
import {
  buildHqDash,
  primerNombre,
  saludoHora,
  type CapitalResumen,
  type Cliente,
  type Flujo,
  type GastosResumen,
  type IngresosResumen,
  type Objetivo,
  type Pago,
  type PipelineCol,
  type Producto,
  type Proyecto,
  type RoadmapItem,
  type Tarea,
  type VendedorHq,
} from "./hqModel";

type Props = {
  empresaId: number;
  nombreUsuario?: string;
  onNavigate?: (vista: string) => void;
};

export function VordiaHqInicio({ empresaId, nombreUsuario, onNavigate }: Props) {
  const [tablero, setTablero] = useState<"ejecutivo" | "gestion">("ejecutivo");
  const [pipeline, setPipeline] = useState<PipelineCol[]>([]);
  const [flujo, setFlujo] = useState<Flujo | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [capital, setCapital] = useState<CapitalResumen | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ingresos, setIngresos] = useState<IngresosResumen | null>(null);
  const [gastos, setGastos] = useState<GastosResumen | null>(null);
  const [vendedores, setVendedores] = useState<VendedorHq[]>([]);
  const [loading, setLoading] = useState(true);

  const go = (v: string) => onNavigate?.(v);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [p, f, t, cl, prod, proy, road, obj, cap, pag, ing, gas, ven] = await Promise.all([
          fetch(`${API_BASE}/api/Crm/pipeline?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/flujo-caja?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/tareas?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/productos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/proyectos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/roadmap?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/objetivos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/capital?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/pagos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/ingresos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/gastos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/vendedores?empresaId=${empresaId}`),
        ]);
        if (cancelled) return;
        if (p.ok) setPipeline(await p.json());
        if (f.ok) setFlujo(await f.json());
        if (t.ok) setTareas(await t.json());
        if (cl.ok) setClientes(await cl.json());
        if (prod.ok) setProductos(await prod.json());
        if (proy.ok) setProyectos(await proy.json());
        if (road.ok) setRoadmap(await road.json());
        if (obj.ok) setObjetivos(await obj.json());
        if (cap.ok) setCapital(await cap.json());
        if (pag.ok) setPagos(await pag.json());
        if (ing.ok) setIngresos(await ing.json());
        if (gas.ok) setGastos(await gas.json());
        if (ven.ok) {
          const raw = await ven.json();
          const list = (raw?.vendedores || []) as VendedorHq[];
          setVendedores(
            list.map((v) => ({
              ...v,
              cumplimientoMetaPct:
                v.cumplimientoMetaPct ??
                (v.metaMensualGs ? Math.round((v.ventasMesGs / v.metaMensualGs) * 100) : 0),
            }))
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  const d = useMemo(
    () =>
      buildHqDash({
        pipeline,
        flujo,
        tareas,
        clientes,
        productos,
        proyectos,
        roadmap,
        objetivos,
        capital,
        pagos,
        ingresos,
        gastos,
        vendedores,
      }),
    [pipeline, flujo, tareas, clientes, productos, proyectos, roadmap, objetivos, capital, pagos, ingresos, gastos, vendedores]
  );

  if (loading && pipeline.length === 0 && !flujo) {
    return <p className="text-slate-500 text-sm p-6">Cargando dashboard ejecutivo…</p>;
  }

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300">
      <div className="mb-3 flex items-center gap-1 rounded-lg border border-[#16324d] bg-[#061426] p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setTablero("ejecutivo")}
          className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${
            tablero === "ejecutivo" ? "bg-[#1687FF]/20 text-white" : "text-[#8BA0B8] hover:text-white"
          }`}
        >
          Ejecutivo
        </button>
        <button
          type="button"
          onClick={() => setTablero("gestion")}
          className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${
            tablero === "gestion" ? "bg-[#1687FF]/20 text-white" : "text-[#8BA0B8] hover:text-white"
          }`}
        >
          Gestión y rendimiento
        </button>
      </div>

      {tablero === "ejecutivo" ? (
        <VordiaHqEjecutivo
          d={d}
          nombre={primerNombre(nombreUsuario)}
          saludo={saludoHora()}
          clientesN={d.clientesActivos}
          onNavigate={go}
        />
      ) : (
        <VordiaHqGestion d={d} onNavigate={go} />
      )}
    </div>
  );
}
