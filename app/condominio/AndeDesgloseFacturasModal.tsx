"use client";


import React from "react";
import { Zap, FileText, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

export type AndeFacturaDesglose = {
  monto: number;
  estado: string;
  emision: string;
  vencimiento: string;
  fechaPago?: string;
  consumoKw?: number | null;
  /** Params del comprobante concreto en ANDE (facturaElectronicaPdf). */
  secNis?: string | null;
  secRec?: string | null;
  fechaFacturacion?: string | null;
  facturaElectronica?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  nis: string;
  duplex?: string;
  inquilino?: string;
  titular?: string;
  saldoDeuda?: number;
  facturas: AndeFacturaDesglose[];
  loading?: boolean;
};

const ANDE_API = `${API_BASE}/api/Ande`;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(val);

/** Misma lógica que el portal ANDE (códigos ER + texto). */
const esPendiente = (estado?: string) => {
  const e = (estado || "").trim();
  if (!e) return true;
  if (/pagad|cobrad|al\s*d[ií]a/i.test(e)) return false;
  if (/pend|deud/i.test(e)) return true;
  const code = e.toUpperCase();
  if (/^ER[012]/.test(code) || code === "ER620") return true;
  if (/^ER3/.test(code)) return false;
  return !/pagad|cobrad/i.test(e);
};

export type AndePdfParams = {
  secNis?: string | null;
  secRec?: string | null;
  fFact?: string | null;
  electronica?: boolean;
};

async function abrirFacturaPdf(
  nis: string,
  inquilino = "",
  duplex = "",
  pdfParams?: AndePdfParams
) {
  const nisClean = String(nis || "").trim();
  if (!nisClean) {
    toast.error("NIS inválido. Revisá el medidor de la unidad.");
    return;
  }

  // Sin secNis/secRec el backend no puede bajar el PDF oficial
  if (!pdfParams?.secNis || !pdfParams?.secRec) {
    toast.warning("Primero ejecutá «Consultar Saldos ANDE» para este NIS y después tocá FACTURA PDF.");
    return;
  }

  const toastId = toast.loading("Obteniendo factura oficial ANDE…");
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 180000);
    const qs = new URLSearchParams();
    if (inquilino) qs.set("inquilino", inquilino);
    if (duplex) qs.set("duplex", duplex);
    qs.set("secNis", String(pdfParams.secNis));
    qs.set("secRec", String(pdfParams.secRec));
    if (pdfParams?.fFact) qs.set("fFact", String(pdfParams.fFact));
    if (pdfParams?.electronica != null) qs.set("electronica", pdfParams.electronica ? "true" : "false");

    const res = await fetch(
      `${ANDE_API}/factura-pdf/${encodeURIComponent(nisClean)}?${qs.toString()}`,
      { signal: controller.signal }
    );
    clearTimeout(t);
    if (!res.ok) {
      const txt = await res.text();
      let msg = txt || `Error HTTP ${res.status}`;
      try {
        const j = JSON.parse(txt);
        msg = j?.mensaje || j?.message || j?.title || msg;
      } catch {
        /* texto plano del API */
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    if (!blob || blob.size < 100) throw new Error("ANDE no devolvió un PDF válido.");

    const url = URL.createObjectURL(blob);
    const fileName = `ANDE_${nisClean}_${pdfParams.secRec || "factura"}.pdf`;

    // iOS / Android: window.open(blob) suele fallar → <a> + download / same gesture
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (isMobile) a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    toast.success(isMobile ? "PDF listo — se abrió o descargó en el dispositivo" : "Factura ANDE abierta", {
      id: toastId,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      toast.error("La descarga del PDF tardó demasiado. Reintentá.", { id: toastId });
    } else {
      toast.error(err?.message || "No se pudo obtener el PDF oficial de ANDE", { id: toastId });
    }
  }
}

export function AndeDesgloseFacturasModal({
  isOpen,
  onClose,
  nis,
  duplex,
  inquilino,
  titular,
  saldoDeuda = 0,
  facturas,
  loading,
}: Props) {
  const facturasClasificadas = facturas.map((f) => {
    let pendiente = esPendiente(f.estado);
    if (
      !pendiente &&
      (saldoDeuda || 0) > 0 &&
      Math.abs(Number(f.monto) - Number(saldoDeuda)) < 1
    ) {
      pendiente = true;
    }
    return { ...f, pendiente };
  });
  const pendientes = facturasClasificadas.filter((f) => f.pendiente);
  const sumaPendientes = pendientes.reduce((a, f) => a + (Number(f.monto) || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl w-[95vw] bg-card border-none rounded-[1.5rem] text-foreground p-0 overflow-hidden shadow-2xl [&>button]:hidden">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 pr-12 text-white flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <Zap className="w-6 h-6 fill-amber-400/30" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black italic tracking-tight text-white">
                Últimos Comprobantes ANDE
              </DialogTitle>
              <p className="text-xs text-blue-100/90 font-medium mt-0.5">
                NIS {nis}
                {duplex ? ` · ${duplex}` : ""}
                {inquilino ? ` · ${inquilino}` : ""}
              </p>
              {titular && (
                <p className="text-[11px] text-blue-200/80 font-semibold mt-0.5">Titular: {titular}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground font-bold text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Consultando ANDE…
            </div>
          ) : facturas.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground font-semibold py-10">
              No hay comprobantes para desglosar. Ejecutá primero «Consultar Saldos ANDE».
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide">
                <span className="text-muted-foreground">
                  {facturas.length} comprobante(s) · {pendientes.length} pendiente(s)
                </span>
                {pendientes.length > 0 && sumaPendientes > 0 && (
                  <span className="text-red-600">
                    Suma pendientes: {formatCurrency(sumaPendientes)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {facturasClasificadas.map((f, idx) => {
                  const pendiente = f.pendiente;
                  const pdfParams: AndePdfParams = {
                    secNis: f.secNis,
                    secRec: f.secRec,
                    fFact: f.fechaFacturacion || f.emision,
                    electronica: f.facturaElectronica !== false,
                  };
                  return (
                    <div
                      key={`${f.monto}-${f.emision}-${f.vencimiento}-${idx}`}
                      className="rounded-2xl border-2 border-border bg-background p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-2xl font-black tracking-tight text-foreground">
                          {formatCurrency(f.monto)}
                        </p>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md whitespace-nowrap ${
                            pendiente
                              ? "bg-amber-400 text-amber-950"
                              : "bg-emerald-500 text-white"
                          }`}
                        >
                          {pendiente ? "Pendiente de Pago" : "Pagado"}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs font-semibold text-muted-foreground">
                        {f.emision && (
                          <p>
                            Emisión: <span className="text-foreground font-bold">{f.emision}</span>
                          </p>
                        )}
                        {f.vencimiento && (
                          <p>
                            Vencimiento:{" "}
                            <span className="text-foreground font-bold">{f.vencimiento}</span>
                          </p>
                        )}
                        {!pendiente && f.fechaPago && (
                          <p>
                            Fecha de pago:{" "}
                            <span className="text-foreground font-bold">{f.fechaPago}</span>
                          </p>
                        )}
                        {f.consumoKw != null && Number(f.consumoKw) > 0 && (
                          <p>
                            Consumo:{" "}
                            <span className="text-foreground font-bold">{f.consumoKw} kW</span>
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() =>
                          abrirFacturaPdf(nis, inquilino || titular || "", duplex || "", pdfParams)
                        }
                        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black italic text-xs rounded-xl h-10"
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Ver Comprobante
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { abrirFacturaPdf };
