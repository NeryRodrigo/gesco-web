"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { formatGs } from "./VordiaClientesPage";

type Props = { empresaId: number; onNavigate?: (vista: string) => void };

export function VordiaReportesHqPage({ empresaId, onNavigate }: Props) {
  const [data, setData] = useState({
    mrr: 0,
    cobradoMes: 0,
    pendiente: 0,
    capital: 0,
    nomina: 0,
    empleados: 0,
    objetivosAbiertos: 0,
    tareasAbiertas: 0,
    clientes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [f, cap, emp, obj, tar, cl] = await Promise.all([
          fetch(`${API_BASE}/api/Crm/flujo-caja?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/capital?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/empleados-hq?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/objetivos?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/tareas?empresaId=${empresaId}`),
          fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
        ]);
        if (cancelled) return;
        const flujo = f.ok ? await f.json() : null;
        const capital = cap.ok ? await cap.json() : null;
        const empleados = emp.ok ? await emp.json() : null;
        const objetivos = obj.ok ? await obj.json() : [];
        const tareas = tar.ok ? await tar.json() : [];
        const clientes = cl.ok ? await cl.json() : [];
        setData({
          mrr: flujo?.mrrActivo || 0,
          cobradoMes: flujo?.cobradoMesActual || 0,
          pendiente: flujo?.pendienteCobro || 0,
          capital: capital?.saldoCapitalGs || 0,
          nomina: empleados?.nominaMensualGs || 0,
          empleados: empleados?.cantidadActivos || 0,
          objetivosAbiertos: (objetivos || []).filter(
            (o: any) => o.estado === "Pendiente" || o.estado === "En curso"
          ).length,
          tareasAbiertas: (tareas || []).filter(
            (t: any) => t.estado === "Pendiente" || t.estado === "En curso"
          ).length,
          clientes: Array.isArray(clientes) ? clientes.length : 0,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  if (loading) {
    return <p className="text-slate-500 text-sm p-4">Generando resumen ejecutivo…</p>;
  }

  const cards = [
    { l: "Ingreso total mensual", v: formatGs(data.mrr), go: "vordia_caja" },
    { l: "Cobrado del mes", v: formatGs(data.cobradoMes), go: "vordia_ingresos" },
    { l: "Pendiente cobro", v: formatGs(data.pendiente), go: "vordia_cxc" },
    { l: "Saldo capital", v: formatGs(data.capital), go: "vordia_capital" },
    { l: "Nómina mensual", v: formatGs(data.nomina), go: "vordia_gastos" },
    { l: "Empleados activos", v: String(data.empleados), go: "vordia_gastos" },
    { l: "Objetivos abiertos", v: String(data.objetivosAbiertos), go: "vordia_objetivos" },
    { l: "Tareas abiertas", v: String(data.tareasAbiertas), go: "vordia_tareas" },
    { l: "Clientes CRM", v: String(data.clientes), go: "vordia_clientes" },
  ];

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#007bff]/15 text-[#5eb0ff] flex items-center justify-center shrink-0">
          <BarChart3 size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Reportes · snapshot HQ</h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Vista viva de finanzas, capital, equipo y ejecución. Tocá una tarjeta para ir al módulo.
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <button
            key={c.l}
            type="button"
            onClick={() => onNavigate?.(c.go)}
            className="text-left rounded-2xl border border-white/5 bg-[#0C1327] p-4 hover:border-[#007bff]/40 transition"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.l}</p>
            <p className="text-xl font-semibold text-white mt-2">{c.v}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
