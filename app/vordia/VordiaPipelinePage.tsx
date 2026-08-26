"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CrmCliente,
  PIPELINE_ESTADOS,
  estadoColor,
  formatFecha,
  formatGs,
} from "./VordiaClientesPage";
import { ChevronRight } from "lucide-react";

type Columna = {
  estado: string;
  cantidad: number;
  clientes: CrmCliente[];
};

type Props = {
  empresaId: number;
  usuario: { id?: number; nombre?: string } | null;
};

export function VordiaPipelinePage({ empresaId, usuario }: Props) {
  const [columnas, setColumnas] = useState<Columna[]>([]);
  const [loading, setLoading] = useState(true);
  const [moviendoId, setMoviendoId] = useState<number | null>(null);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/Crm/pipeline?empresaId=${empresaId}`);
      if (!res.ok) throw new Error();
      setColumnas(await res.json());
    } catch {
      toast.error("No se pudo cargar el pipeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) cargar();
  }, [empresaId]);

  const mover = async (cliente: CrmCliente, nuevoEstado: string) => {
    if (cliente.estadoPipeline === nuevoEstado) return;
    setMoviendoId(cliente.clienteId);
    try {
      const res = await fetch(
        `${API_BASE}/api/Crm/clientes/${cliente.clienteId}/estado?empresaId=${empresaId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estadoPipeline: nuevoEstado,
            nota: `Movido en pipeline a ${nuevoEstado}`,
            usuarioId: usuario?.id,
            usuarioNombre: usuario?.nombre,
          }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(`${cliente.razonSocial} → ${nuevoEstado}`);
      await cargar();
    } catch {
      toast.error("No se pudo cambiar el estado");
    } finally {
      setMoviendoId(null);
    }
  };

  const avanzar = (cliente: CrmCliente) => {
    const idx = PIPELINE_ESTADOS.indexOf(cliente.estadoPipeline as any);
    if (idx < 0 || idx >= PIPELINE_ESTADOS.length - 1) return;
    mover(cliente, PIPELINE_ESTADOS[idx + 1]);
  };

  if (loading) {
    return <p className="text-slate-500 text-sm p-6">Cargando pipeline…</p>;
  }

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] px-4 sm:px-5 py-4">
        <p className="text-sm text-[#94a3b8]">
          Arrastrá mentalmente el flujo:{" "}
          <span className="text-white font-medium">
            Prospecto → Contactado → En negociación → Propuesta → Cerrado → Cliente activo
          </span>
          . Usá el selector o “Avanzar” en cada tarjeta.
        </p>
      </div>

      <div className="vordia-kanban flex gap-3 overflow-x-auto pb-3 snap-x">
        {columnas.map((col) => (
          <div
            key={col.estado}
            className="snap-start shrink-0 w-[min(280px,85vw)] lg:w-[300px] rounded-[1.25rem] border border-white/5 bg-[#080E1E] flex flex-col max-h-[70vh]"
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-white">{col.estado}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{col.cantidad} oportunidad{col.cantidad === 1 ? "" : "es"}</p>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${estadoColor(col.estado)}`}>
                {col.cantidad}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {col.clientes.length === 0 && (
                <p className="text-[11px] text-slate-600 text-center py-8">Vacío</p>
              )}
              {col.clientes.map((c) => (
                <div
                  key={c.clienteId}
                  className={`rounded-xl border border-white/5 bg-[#0C1327] p-3 space-y-2 ${
                    moviendoId === c.clienteId ? "opacity-50" : ""
                  }`}
                >
                  <p className="text-sm font-semibold text-white leading-snug">{c.razonSocial}</p>
                  <p className="text-[11px] text-[#94a3b8] line-clamp-2">
                    {c.sistemaServicio || "Sin sistema"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {c.contactoNombre || "Sin contacto"} · Cierre {formatFecha(c.fechaEstimadaCierre)}
                  </p>
                  <p className="text-[10px] text-[#5eb0ff] font-medium">{formatGs(c.feeEstimadoMensual)}</p>
                  {c.proximosPasos && (
                    <p className="text-[10px] text-slate-400 bg-[#050B18] rounded-lg px-2 py-1.5 border border-white/5">
                      → {c.proximosPasos}
                    </p>
                  )}

                  <div className="flex gap-1.5 pt-1">
                    <select
                      value={c.estadoPipeline}
                      disabled={moviendoId === c.clienteId}
                      onChange={(e) => mover(c, e.target.value)}
                      className="flex-1 min-w-0 bg-[#050B18] border border-white/10 text-[10px] text-slate-300 rounded-lg px-1.5 py-1.5"
                    >
                      {PIPELINE_ESTADOS.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    {c.estadoPipeline !== "Cliente activo" && (
                      <button
                        type="button"
                        disabled={moviendoId === c.clienteId}
                        onClick={() => avanzar(c)}
                        className="shrink-0 inline-flex items-center gap-0.5 px-2.5 min-h-[2.5rem] rounded-lg bg-[#007bff]/15 text-[#5eb0ff] text-[10px] font-bold border border-[#007bff]/25 hover:bg-[#007bff]/25"
                        title="Avanzar una etapa"
                      >
                        Avanzar <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
