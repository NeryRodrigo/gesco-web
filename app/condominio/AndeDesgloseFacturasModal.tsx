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
  /** ultima = factura más reciente; penultima = la anterior. */
  origen?: "ultima" | "penultima" | null;
};

function textoCampo(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Acepta camelCase o PascalCase (producción a veces serializa distinto). */
export function pdfParamsDeFactura(
  f?: AndeFacturaDesglose | Record<string, unknown> | null,
  origen?: AndePdfParams["origen"]
): AndePdfParams {
  const anyF = (f || {}) as Record<string, unknown>;
  return {
    secNis: textoCampo(anyF.secNis) || textoCampo(anyF.SecNis) || null,
    secRec: textoCampo(anyF.secRec) || textoCampo(anyF.SecRec) || null,
    fFact:
      textoCampo(anyF.fechaFacturacion) ||
      textoCampo(anyF.FechaFacturacion) ||
      textoCampo(anyF.emision) ||
      textoCampo(anyF.Emision) ||
      null,
    electronica: anyF.facturaElectronica !== false && anyF.FacturaElectronica !== false,
    origen: origen ?? null,
  };
}

const ANDE_API = `${API_BASE}/api/Ande`;
const ANDE_RECAPTCHA_SITE_KEY = "6LcND9ohAAAAALizDIFfkfpSjHm3Xtr0DwLOLc60";

function fechaFacturaAnde(raw?: string | null) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
}

function esPdfBytes(buf: ArrayBuffer) {
  const u = new Uint8Array(buf.slice(0, 5));
  return u.length >= 4 && u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46;
}

function loadGrecaptchaAnde(): Promise<{ execute: (key: string, opts: { action: string }) => Promise<string> }> {
  const w = window as Window & { grecaptcha?: { ready: (cb: () => void) => void; execute: (key: string, opts: { action: string }) => Promise<string> } };
  if (w.grecaptcha?.execute) {
    return new Promise((resolve) => w.grecaptcha!.ready(() => resolve(w.grecaptcha!)));
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-ande-recaptcha]");
    const onReady = () => {
      const g = (window as typeof w).grecaptcha;
      if (!g?.execute) {
        reject(new Error("grecaptcha"));
        return;
      }
      g.ready(() => resolve(g));
    };
    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${ANDE_RECAPTCHA_SITE_KEY}`;
    s.async = true;
    s.dataset.andeRecaptcha = "1";
    s.onload = onReady;
    s.onerror = () => reject(new Error("grecaptcha script"));
    document.head.appendChild(s);
  });
}

async function tokenRecaptchaAnde(): Promise<string | null> {
  try {
    const g = await loadGrecaptchaAnde();
    const token = await g.execute(ANDE_RECAPTCHA_SITE_KEY, { action: "submit" });
    return token || null;
  } catch {
    return null;
  }
}

function tiempoEmisionAnde(raw?: string | null) {
  const s = String(raw || "").trim();
  if (!s) return 0;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    return new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10)).getTime();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

async function abrirFacturaPdf(
  nis: string,
  inquilino = "",
  duplex = "",
  pdfParams?: AndePdfParams
) {
  const nisClean = String(nis || "").replace(/\D/g, "");
  if (!nisClean) {
    toast.error("NIS inválido. Revisá el medidor de la unidad.");
    return;
  }

  const toastId = toast.loading("Obteniendo comprobante oficial de ANDE…");
  try {
    const recapt = await tokenRecaptchaAnde();
    const qs = new URLSearchParams();
    if (inquilino) qs.set("inquilino", inquilino);
    if (duplex) qs.set("duplex", duplex);
    if (pdfParams?.secNis) qs.set("secNis", String(pdfParams.secNis));
    if (pdfParams?.secRec) qs.set("secRec", String(pdfParams.secRec));
    if (pdfParams?.fFact) qs.set("fFact", fechaFacturaAnde(pdfParams.fFact));
    if (pdfParams?.electronica === false) qs.set("electronica", "false");
    if (pdfParams?.origen) qs.set("origen", pdfParams.origen);

    const headers: Record<string, string> = {};
    if (recapt) headers["X-Ande-Recapt"] = recapt;

    const res = await fetch(
      `${ANDE_API}/factura-pdf/${encodeURIComponent(nisClean)}?${qs}`,
      { headers }
    );
    if (res.status === 401) {
      toast.error("Faltan credenciales ANDE. Configurá usuario y contraseña de Mi Cuenta.", { id: toastId });
      return;
    }
    if (!res.ok) {
      toast.error("No se pudo obtener el PDF oficial de ANDE. Reintentá en un momento.", { id: toastId });
      return;
    }

    const buf = await res.arrayBuffer();
    if (!esPdfBytes(buf)) {
      toast.error("ANDE no devolvió el PDF oficial. Reintentá en un momento.", { id: toastId });
      return;
    }

    const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
    window.open(url, "_blank", "noreferrer");
    toast.success("Comprobante oficial listo.", { id: toastId });
  } catch {
    toast.error("Error al obtener el PDF oficial de ANDE.", { id: toastId });
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
  const pendientesPorFecha = [...pendientes].sort(
    (a, b) =>
      tiempoEmisionAnde(b.fechaFacturacion || b.emision) -
      tiempoEmisionAnde(a.fechaFacturacion || a.emision)
  );
  const origenDe = (f: (typeof facturasClasificadas)[number]): AndePdfParams["origen"] => {
    const idx = pendientesPorFecha.findIndex(
      (p) => p === f || (Number(p.monto) === Number(f.monto) && p.emision === f.emision)
    );
    if (idx === 0) return "ultima";
    if (idx === 1) return "penultima";
    return null;
  };

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
                  const pdfParams = pdfParamsDeFactura(f, origenDe(f));
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
