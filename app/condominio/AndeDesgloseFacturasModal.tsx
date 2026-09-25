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
const MSG_ANDE_FALLAS = "ANDE con fallas";

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

function mostrarPdf(buf: ArrayBuffer) {
  const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
  window.open(url, "_blank", "noreferrer");
}

function postComprobanteOficial(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.target = "_blank";
  form.acceptCharset = "UTF-8";
  for (const [name, value] of Object.entries(fields || {})) {
    if (value == null || value === "") continue;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
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
    const qs = new URLSearchParams();
    if (inquilino) qs.set("inquilino", inquilino);
    if (duplex) qs.set("duplex", duplex);
    if (pdfParams?.secNis) qs.set("secNis", String(pdfParams.secNis));
    if (pdfParams?.secRec) qs.set("secRec", String(pdfParams.secRec));
    if (pdfParams?.fFact) qs.set("fFact", fechaFacturaAnde(pdfParams.fFact));
    if (pdfParams?.electronica === false) qs.set("electronica", "false");
    if (pdfParams?.origen) qs.set("origen", pdfParams.origen);

    const ac = new AbortController();
    const timeout = window.setTimeout(() => ac.abort(), 180000);
    const res = await fetch(
      `${ANDE_API}/factura-pdf/${encodeURIComponent(nisClean)}?${qs}`,
      { signal: ac.signal }
    );
    window.clearTimeout(timeout);

    if (res.status === 401) {
      toast.error("Faltan credenciales ANDE. Configurá usuario y contraseña de Mi Cuenta.", { id: toastId });
      return;
    }

    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (esPdfBytes(buf)) {
        mostrarPdf(buf);
        toast.success("Comprobante oficial de ANDE.", { id: toastId });
        return;
      }
    }

    // En el servidor GCP a veces ANDE bloquea la API. El navegador (misma IP que local) pide el KUDE.
    const linkRes = await fetch(
      `${ANDE_API}/comprobante-oficial/${encodeURIComponent(nisClean)}?${qs}`
    );
    if (linkRes.status === 401) {
      toast.error("Faltan credenciales ANDE. Configurá usuario y contraseña de Mi Cuenta.", { id: toastId });
      return;
    }
    if (linkRes.ok) {
      const data = await linkRes.json();
      if (data?.action && data?.fields) {
        postComprobanteOficial(String(data.action), data.fields as Record<string, string>);
        toast.success("Comprobante oficial de ANDE.", { id: toastId });
        return;
      }
    }

    toast.error(MSG_ANDE_FALLAS, { id: toastId });
  } catch {
    toast.error(MSG_ANDE_FALLAS, { id: toastId });
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
  const facturasClasificadas = [...facturas]
    .sort(
      (a, b) =>
        tiempoEmisionAnde(b.fechaFacturacion || b.emision) -
        tiempoEmisionAnde(a.fechaFacturacion || a.emision)
    )
    .map((f) => ({ ...f, pendiente: esPendiente(f.estado) }));
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
