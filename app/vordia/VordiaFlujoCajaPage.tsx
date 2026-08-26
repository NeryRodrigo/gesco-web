"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Users, Pencil, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatGs } from "./VordiaClientesPage";

type Socio = {
  socioId: number;
  nombre: string;
  email?: string | null;
  porcentaje: number;
};

type Flujo = {
  cobradoMesActual: number;
  cobradoTotal: number;
  mrrActivo: number;
  arrProyectado: number;
  pendienteCobro: number;
  sumaPorcentajesSocios: number;
  ultimosMeses: { periodo: string; ingresos: number; cantidadPagos: number }[];
  reparto: {
    socioId: number;
    nombre: string;
    porcentaje: number;
    montoMes: number;
    montoTotal: number;
    montoMrrProyectado: number;
  }[];
  socios: Socio[];
};

type Props = { empresaId: number };

export function VordiaFlujoCajaPage({ empresaId }: Props) {
  const [flujo, setFlujo] = useState<Flujo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editSocio, setEditSocio] = useState<Socio | null>(null);
  const [pct, setPct] = useState("");

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/Crm/flujo-caja?empresaId=${empresaId}`);
      if (!res.ok) throw new Error();
      setFlujo(await res.json());
    } catch {
      toast.error("No se pudo cargar el flujo de caja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) cargar();
  }, [empresaId]);

  const guardarSocio = async () => {
    if (!editSocio) return;
    const porcentaje = Number(pct);
    if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      toast.error("Porcentaje inválido (0–100)");
      return;
    }
    const res = await fetch(`${API_BASE}/api/Crm/socios/${editSocio.socioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        nombre: editSocio.nombre,
        email: editSocio.email,
        porcentaje,
      }),
    });
    if (res.ok) {
      toast.success("Porcentaje actualizado");
      setEditSocio(null);
      cargar();
    } else toast.error("No se pudo guardar");
  };

  if (loading && !flujo) {
    return <p className="text-slate-500 text-sm p-6">Cargando flujo de caja…</p>;
  }

  const maxMes = Math.max(1, ...(flujo?.ultimosMeses.map((m) => m.ingresos) || [1]));

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5 flex items-start gap-3">
        <Wallet size={18} className="text-[#007bff] mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-white font-medium">Flujo de caja y reparto de socios</p>
          <p className="text-xs text-[#94a3b8] mt-1">
            Se calcula desde los pagos reales. El reparto usa los % de cada socio sobre cobrado del mes, total y MRR.
          </p>
        </div>
      </div>

      {flujo && flujo.sumaPorcentajesSocios !== 100 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-2 text-amber-200 text-xs">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          La suma de porcentajes es {flujo.sumaPorcentajesSocios}% (ideal: 100%).
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: "Cobrado mes", v: formatGs(flujo?.cobradoMesActual) },
          { l: "Cobrado total", v: formatGs(flujo?.cobradoTotal) },
          { l: "MRR activo", v: formatGs(flujo?.mrrActivo) },
          { l: "ARR proyectado", v: formatGs(flujo?.arrProyectado) },
          { l: "Pendiente cobro", v: formatGs(flujo?.pendienteCobro) },
        ].map((k) => (
          <div key={k.l} className="rounded-[1.25rem] border border-white/5 bg-[#0C1327] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{k.l}</p>
            <p className="mt-2 text-base lg:text-lg font-semibold text-white">{k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Ingresos por mes</h4>
          {(flujo?.ultimosMeses || []).length === 0 ? (
            <p className="text-slate-500 text-sm">Sin pagos aún.</p>
          ) : (
            <div className="space-y-3">
              {flujo!.ultimosMeses.map((m) => (
                <div key={m.periodo}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">{m.periodo}</span>
                    <span className="text-white font-medium">{formatGs(m.ingresos)} · {m.cantidadPagos} pagos</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#050B18] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#007bff]"
                      style={{ width: `${Math.max(6, (m.ingresos / maxMes) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Users size={16} className="text-[#007bff]" />
            <h4 className="text-sm font-semibold text-white">Reparto de socios</h4>
          </div>
          <div className="divide-y divide-white/5">
            {(flujo?.reparto || []).map((r) => (
              <div key={r.socioId} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{r.nombre}</p>
                    <span className="text-[10px] font-bold text-[#5eb0ff]">{r.porcentaje}%</span>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-white"
                      onClick={() => {
                        setEditSocio({ socioId: r.socioId, nombre: r.nombre, porcentaje: r.porcentaje });
                        setPct(String(r.porcentaje));
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mt-1">
                    Mes {formatGs(r.montoMes)} · Total {formatGs(r.montoTotal)} · MRR {formatGs(r.montoMrrProyectado)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editSocio && (
        <div className="vordia-modal fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setEditSocio(null)}>
          <div className="vordia-modal-panel w-full max-w-sm rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">% de {editSocio.nombre}</h3>
              <button type="button" onClick={() => setEditSocio(null)} className="vordia-icon-btn text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} className="bg-[#050B18] border-white/10 text-white rounded-xl" />
            <div className="vordia-modal-actions flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditSocio(null)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={guardarSocio} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold">Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
