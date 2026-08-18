"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, FileText, CheckCircle2 } from "lucide-react";
import { ContratoImprimible, resolveCodeudor } from "./ContratoImprimible";
import { PagareImprimible } from "./PagareImprimible";
import { InventarioImprimible } from "./InventarioImprimible";
import { AnexoFotograficoImprimible } from "./AnexoFotograficoImprimible";

export type PlantillaDocItem = {
  plantillaId: number;
  nombre: string;
  tipo?: string;
};

export type DatosPlantillaPreview = {
  Locatario: string;
  CedulaLocatario: string;
  DomicilioLocatario: string;
  TelefonoLocatario: string;
  Codeudor: string;
  CedulaCodeudor: string;
  DomicilioCodeudor: string;
  TelefonoCodeudor: string;
  Duplex: string;
  Condominio: string;
  NisAnde: string;
  MontoAlquiler: string;
  MontoGarantia: string;
  MontoPagare: string;
  MontoPagareLetras: string;
  FechaInicio: string;
  FechaFin: string;
  DuracionMeses: string;
  FechaFirma: string;
  DiaEntrega?: string;
  MesEntrega?: string;
  AnioEntrega?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  plantillas: PlantillaDocItem[];
  datos: DatosPlantillaPreview;
  contractData: any;
  unidad: any;
  isGenerating?: boolean;
  onConfirmGenerate: () => void | Promise<void>;
};

function kindOfPlantilla(nombre: string): "contrato" | "pagare" | "inventario" | "anexo" | "acta" | "otro" {
  const n = (nombre || "").toUpperCase();
  if (n.includes("CONTRATO")) return "contrato";
  if (n.includes("PAGAR") || n.includes("GARANT")) return "pagare";
  if (n.includes("INVENTARIO")) return "inventario";
  if (n.includes("FOTOG")) return "anexo";
  if (n.includes("ACTA")) return "acta";
  return "otro";
}

function Campo({ label, value, destacado }: { label: string; value: string; destacado?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={
          destacado
            ? "text-sm font-black uppercase text-foreground tracking-tight"
            : "text-sm font-semibold text-foreground"
        }
      >
        {value || "—"}
      </p>
    </div>
  );
}

export function VistaPreviaDocumentosModal({
  isOpen,
  onClose,
  plantillas,
  datos,
  contractData,
  unidad,
  isGenerating,
  onConfirmGenerate,
}: Props) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const activePlantilla = useMemo(() => {
    if (!plantillas.length) return null;
    const id = activeId && plantillas.some((p) => p.plantillaId === activeId)
      ? activeId
      : plantillas[0].plantillaId;
    return plantillas.find((p) => p.plantillaId === id) || plantillas[0];
  }, [plantillas, activeId]);

  const codeudor = resolveCodeudor(contractData || {});
  const contractForPreview = useMemo(() => {
    if (!contractData) return null;
    return {
      ...contractData,
      codeudorNombre: codeudor.nombre || datos.Codeudor,
      codeudorCedula: codeudor.cedula || datos.CedulaCodeudor,
      codeudorDireccion: codeudor.direccion || datos.DomicilioCodeudor,
      codeudorTelefono: codeudor.telefono || datos.TelefonoCodeudor,
      inquilino: {
        ...(contractData.inquilino || {}),
        razonSocial: datos.Locatario || contractData.inquilino?.razonSocial,
        nombre: datos.Locatario || contractData.inquilino?.nombre,
        documento: datos.CedulaLocatario || contractData.inquilino?.documento,
        telefono: datos.TelefonoLocatario || contractData.inquilino?.telefono,
      },
      nombreCompleto: datos.Locatario,
    };
  }, [contractData, codeudor, datos]);

  const kind = kindOfPlantilla(activePlantilla?.nombre || "");

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !isGenerating && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0 rounded-2xl border-border bg-card">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-500" />
            Vista previa antes de generar
          </DialogTitle>
          <DialogDescription className="text-[11px] font-medium text-muted-foreground">
            Verificá los datos que se inyectarán en cada plantilla Word. Al confirmar se generan los{" "}
            <strong>.docx</strong> originales (formato de cada documento) en un ZIP.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Campo label="Locatario / Inquilino" value={datos.Locatario} destacado />
            <Campo label="Cédula locatario" value={datos.CedulaLocatario} />
            <Campo label="Domicilio locatario" value={datos.DomicilioLocatario} destacado />
            <Campo label="Codeudor" value={datos.Codeudor || "(sin codeudor)"} destacado />
            <Campo label="Cédula codeudor" value={datos.CedulaCodeudor} />
            <Campo label="Domicilio codeudor" value={datos.DomicilioCodeudor} destacado />
            <Campo label="Dúplex" value={datos.Duplex ? `D-${datos.Duplex}` : "—"} />
            <Campo label="Condominio" value={datos.Condominio} />
            <Campo label="NIS ANDE" value={datos.NisAnde} />
            <Campo label="Alquiler mensual" value={datos.MontoAlquiler ? `${datos.MontoAlquiler} Gs.` : "—"} />
            <Campo label="Garantía / Pagaré" value={datos.MontoGarantia ? `${datos.MontoGarantia} Gs.` : "—"} />
            <Campo label="Vigencia" value={`${datos.FechaInicio || "—"} → ${datos.FechaFin || "—"}`} />
          </div>

          <div className="flex flex-wrap gap-2">
            {plantillas.map((p) => {
              const active = activePlantilla?.plantillaId === p.plantillaId;
              return (
                <button
                  key={p.plantillaId}
                  type="button"
                  onClick={() => setActiveId(p.plantillaId)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide border transition-all ${
                    active
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-muted/40 text-foreground border-border hover:border-amber-400/50"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {p.nombre}
                  {p.tipo ? (
                    <Badge className="ml-1 text-[8px] px-1.5 py-0 font-black uppercase bg-black/10 text-inherit border-none">
                      {p.tipo}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-white text-black overflow-hidden min-h-[280px] max-h-[48vh] overflow-y-auto">
            {kind === "contrato" && contractForPreview && (
              <ContratoImprimible contractData={contractForPreview} dataUnidad={unidad} isPreview />
            )}
            {kind === "pagare" && contractForPreview && (
              <div className="p-4 scale-[0.92] origin-top">
                <PagareImprimible contractData={contractForPreview} dataUnidad={unidad} isPreview />
              </div>
            )}
            {kind === "inventario" && contractForPreview && (
              <div className="p-4">
                <InventarioImprimible contractData={contractForPreview} dataUnidad={unidad} isPreview />
              </div>
            )}
            {kind === "anexo" && contractForPreview && (
              <div className="p-4">
                <AnexoFotograficoImprimible contractData={contractForPreview} dataUnidad={unidad} isPreview />
              </div>
            )}
            {(kind === "acta" || kind === "otro") && (
              <div className="p-6 space-y-3 font-serif text-sm leading-relaxed">
                <h4 className="font-black uppercase text-base tracking-tight">
                  {activePlantilla?.nombre || "Documento"}
                </h4>
                <p className="text-xs text-slate-600">
                  Vista de datos que se insertarán en la plantilla Word oficial. El archivo descargado
                  conservará el formato original del prototipo (.docx).
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ["{Locatario}", datos.Locatario],
                      ["{CedulaLocatario}", datos.CedulaLocatario],
                      ["{DomicilioLocatario}", datos.DomicilioLocatario],
                      ["{Codeudor}", datos.Codeudor],
                      ["{CedulaCodeudor}", datos.CedulaCodeudor],
                      ["{DomicilioCodeudor}", datos.DomicilioCodeudor],
                      ["{Duplex}", datos.Duplex],
                      ["{Condominio}", datos.Condominio],
                      ["{NisAnde}", datos.NisAnde],
                      ["{MontoAlquiler}", datos.MontoAlquiler],
                      ["{MontoGarantia}", datos.MontoGarantia],
                      ["{MontoPagare}", datos.MontoPagare],
                      ["{MontoPagareLetras}", datos.MontoPagareLetras],
                      ["{FechaInicio}", datos.FechaInicio],
                      ["{FechaFin}", datos.FechaFin],
                      ["{FechaFirma}", datos.FechaFirma],
                    ] as const
                  ).map(([k, v]) => (
                    <li key={k} className="rounded-lg border border-slate-200 px-3 py-2 flex justify-between gap-2">
                      <span className="font-mono text-slate-500">{k}</span>
                      <span className="font-bold uppercase text-right">{v || "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex-row gap-2 sm:justify-between">
          <p className="text-[10px] text-muted-foreground font-medium self-center hidden sm:block">
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
            {plantillas.length} documento{plantillas.length === 1 ? "" : "s"} listo
            {plantillas.length === 1 ? "" : "s"} para generar
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={!!isGenerating}
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-xl font-bold uppercase text-xs h-11"
            >
              Revisar / Cancelar
            </Button>
            <Button
              type="button"
              disabled={!!isGenerating || plantillas.length === 0}
              onClick={() => onConfirmGenerate()}
              className="flex-1 sm:flex-none rounded-xl font-black uppercase text-xs h-11 bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? "Generando ZIP..." : `Confirmar y descargar (${plantillas.length})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
