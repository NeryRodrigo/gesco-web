"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroCambiarEtapa, type AgroAnimalFull, type AgroEtapa } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BTN_PRIMARY, CARD, ETAPA_LABEL, FIELD, SELECT, fmtKg } from "./ui";

export type DestinoEtapa = { etapa: AgroEtapa; titulo: string; descripcion: string };

/** Transiciones válidas del ciclo productivo según la etapa actual. */
export function destinosPara(a: AgroAnimalFull): DestinoEtapa[] {
  const salidas: DestinoEtapa[] = [
    { etapa: "Vendido", titulo: "Venta / faena", descripcion: "Cierra el ciclo con la salida comercial." },
    { etapa: "Baja", titulo: "Baja (muerte, descarte, transferencia, extravío)", descripcion: "Salida excepcional del rodeo." },
  ];
  switch (a.etapa) {
    case "Cria":
      return [
        { etapa: "Recria", titulo: "Destete → Recría", descripcion: "Registra el peso de destete y lo pasa a recría." },
        { etapa: "Baja", titulo: "Baja", descripcion: "Muerte u otra salida." },
      ];
    case "Recria":
      return [
        { etapa: "Engorde", titulo: "Pasar a engorde / terminación", descripcion: "Ingresa al corral o potrero de terminación." },
        ...(a.sexo === "H" ? [{ etapa: "Reproductor" as AgroEtapa, titulo: "Reemplazo → Vaquilla de servicio", descripcion: "Se suma al rodeo reproductor." }] : []),
        ...salidas,
      ];
    case "Engorde":
      return [{ etapa: "Terminado", titulo: "Marcar como terminado", descripcion: "Alcanzó los parámetros de venta." }, ...salidas];
    case "Terminado":
      return salidas;
    case "Reproductor":
      return [{ etapa: "Vendido", titulo: "Venta (vaca de refugo / descarte)", descripcion: "Salida comercial del rodeo." }, salidas[1]];
    default:
      return [];
  }
}

export default function CambioEtapaDialog({
  ctx,
  animal,
  destino,
  onClose,
  onDone,
}: {
  ctx: AgroCtx;
  animal: AgroAnimalFull;
  destino: DestinoEtapa;
  onClose: () => void;
  onDone?: (a: AgroAnimalFull) => void;
}) {
  const lotesDestino = ctx.lotes.filter((l) => !l.etapa || l.etapa === destino.etapa || (destino.etapa === "Terminado" && l.etapa === "Engorde"));
  const pideLote = ["Recria", "Engorde", "Reproductor"].includes(destino.etapa);
  const [peso, setPeso] = useState("");
  const [loteId, setLoteId] = useState(pideLote ? String(lotesDestino.find((l) => l.etapa === destino.etapa)?.loteId ?? "") : "");
  const [motivo, setMotivo] = useState(destino.etapa === "Baja" ? "Muerte" : "");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    try {
      setGuardando(true);
      const r = await agroCambiarEtapa(animal.animalId, {
        empresaId: ctx.empresaId,
        etapa: destino.etapa,
        loteId: loteId ? Number(loteId) : null,
        pesoKg: peso ? Number(peso) : null,
        motivo: motivo || undefined,
      });
      toast.success(`#${animal.codigoInterno} → ${ETAPA_LABEL[destino.etapa]}`);
      ctx.refrescar();
      onDone?.(r);
      onClose();
    } catch (e: unknown) {
      toast.error("No se pudo cambiar la etapa", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div className={`${CARD} bg-[#0b1511] w-full sm:max-w-md p-5 rounded-b-none sm:rounded-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400/90">#{animal.codigoInterno} · {ETAPA_LABEL[animal.etapa]}</p>
            <h3 className="text-base font-semibold mt-1">{destino.titulo}</h3>
            <p className="text-[12px] text-white/45 mt-0.5">{destino.descripcion}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2.5">
          <Input
            type="number"
            inputMode="decimal"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder={`Peso actual kg (último ${fmtKg(animal.pesoActualKg, 0)})`}
            className={FIELD}
          />
          {pideLote ? (
            <select value={loteId} onChange={(e) => setLoteId(e.target.value)} className={SELECT}>
              <option value="">Mantener lote actual ({animal.loteCodigo ?? "sin lote"})</option>
              {lotesDestino.map((l) => (
                <option key={l.loteId} value={l.loteId}>
                  {l.codigo} · {l.nombre} ({l.animales}/{l.capacidad})
                </option>
              ))}
            </select>
          ) : null}
          {destino.etapa === "Baja" ? (
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={SELECT}>
              {["Muerte", "Descarte", "Venta anticipada", "Transferencia", "Robo / extravío"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          ) : (
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={destino.etapa === "Vendido" ? "Comprador / destino / precio" : "Observación (opcional)"} className={FIELD} />
          )}
        </div>
        <Button className={`${BTN_PRIMARY} w-full mt-4`} disabled={guardando} onClick={() => void guardar()}>
          Confirmar
        </Button>
      </div>
    </div>
  );
}
