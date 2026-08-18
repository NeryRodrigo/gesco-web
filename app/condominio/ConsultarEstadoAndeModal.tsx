"use client";

import { API_BASE } from "@/lib/api";

import React, { useState } from "react";
import { Zap, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Search, Loader2, FileText, RefreshCw, Info } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AndeFacturaItem {
  monto: number;
  estado: string;
  emision: string;
  vencimiento: string;
  consumoKw?: number | null;
}

interface AndeConsultaResultado {
  nis: string;
  titular: string;
  documento?: string;
  direccion: string;
  saldoDeuda: number;
  consumoKw: number;
  facturasPendientes: number;
  tieneDesconexion: boolean;
  estadoConexion: string;
  estadoPago: string;
  fechaConsulta: string;
  vencimiento: string;
  observaciones: string;
  esSimulado?: boolean;
  facturas?: AndeFacturaItem[];
}

interface ConsultarEstadoAndeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultNis?: string;
}

export function ConsultarEstadoAndeModal({ isOpen, onClose, defaultNis = "" }: ConsultarEstadoAndeModalProps) {
  const [nis, setNis] = useState(defaultNis || "1185894");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<AndeConsultaResultado | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [mostrarDesglose, setMostrarDesglose] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG" }).format(val);
  };

  const consultarAnde = async (nisConsultar: string) => {
    const targetNis = (nisConsultar || nis).trim();
    if (!targetNis) return;
    
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      // Ciclo JWT/miCuenta: login automático + consulta (sin Acceder manual)
      const res = await fetch(`${API_BASE}/api/Ande/jwt/consultar/${encodeURIComponent(targetNis)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({} as any));
        throw new Error(errBody?.mensaje || "No se pudo conectar con el servicio comercial de la ANDE.");
      }
      const data: AndeConsultaResultado = await res.json();
      setResultado(data);
      setMostrarDesglose(true);
      if (data.esSimulado || /fall[oó]|bloque[oó]|Radware|credenciales/i.test(data.observaciones || "")) {
        setError(data.observaciones || "No se pudo obtener el saldo real de ANDE. Reintente en unos segundos.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setError("La consulta a ANDE tardó demasiado. Reintente en unos segundos.");
      } else {
        setError(err.message || "Ocurrió un error al consultar el NIS.");
      }
    } finally {
      setLoading(false);
    }
  };

  const descargarPdf = async () => {
    if (!resultado) return;
    setLoadingPdf(true);
    try {
      const { abrirFacturaPdf } = await import("./AndeDesgloseFacturasModal");
      await abrirFacturaPdf(resultado.nis, resultado.titular || "", resultado.direccion || "");
    } catch (e) {
      alert("Error abriendo factura PDF");
    } finally {
      setLoadingPdf(false);
    }
  };

  const sugerencias = [
    { label: "Dúplex 01 (Ana Rosa)", nis: "3070876" },
    { label: "Dúplex 02 (Michael)", nis: "3070874" },
    { label: "Dúplex 03 (Leila)", nis: "2994412" },
    { label: "NIS App ANDE (1185894)", nis: "1185894" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-[95vw] bg-card border-none rounded-[2rem] text-foreground p-0 overflow-hidden shadow-2xl [&>button]:text-white [&>button]:opacity-80 hover:[&>button]:opacity-100 [&>button]:top-6 [&>button]:right-6 [&>button]:scale-125">
        {/* Header con gradiente premium */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 pr-14 border-b border-blue-800/40 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-card/10 border border-white/20 flex items-center justify-center text-amber-400 shadow-xl shrink-0">
              <Zap className="w-7 h-7 animate-pulse fill-amber-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-500/30 text-blue-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  EN LÍNEA ANDE
                </span>
                <span className="text-xs text-blue-300 font-medium">Verificación Comercial en Tiempo Real</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black italic tracking-tight text-white flex items-center gap-2">
                CONSULTA DE SALDO Y CORTE DE SUMINISTRO
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda Fija en Superior */}
        <div className="bg-muted/90 p-5 border-b border-border/80 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && consultarAnde(nis)}
                placeholder="Ingrese Número de NIS / Medidor (Ej: 3070876)..."
                className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3 font-mono font-bold text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
              />
            </div>
            <Button
              onClick={() => consultarAnde(nis)}
              disabled={loading || !nis.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl px-8 py-6 h-auto shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current text-amber-300" />}
              <span>CONSULTAR NIS</span>
            </Button>
          </div>

          {/* Sugerencias Rápidas */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider mr-1">Pruebas rápidas:</span>
            {sugerencias.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setNis(sug.nis);
                  consultarAnde(sug.nis);
                }}
                className="bg-card hover:bg-blue-50 hover:border-blue-300 text-foreground hover:text-blue-700 text-xs font-bold px-3.5 py-1.5 rounded-lg border border-border shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body Scrollable sólo para resultados */}
        <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-card">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 p-5 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-bold shadow-sm">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Display */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center animate-pulse shadow-inner">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-lg font-black italic text-foreground">CONSULTANDO NIS EN ANDE...</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Sesión JWT por HTTP — sin Chrome ni Acceder manual.
                </p>
              </div>
            </div>
          ) : resultado ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              {/* Banner Estado de Conexión / Desconexión */}
              <div className={`p-6 rounded-3xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg ${
                resultado.tieneDesconexion 
                  ? "bg-gradient-to-r from-red-600 to-red-700 border-red-500 text-white shadow-red-500/20" 
                  : "bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-500 text-white shadow-emerald-500/20"
              }`}>
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    resultado.tieneDesconexion ? "bg-card text-red-600 animate-bounce" : "bg-card/20 text-white backdrop-blur-sm"
                  }`}>
                    {resultado.tieneDesconexion ? <ShieldAlert className="w-9 h-9" /> : <ShieldCheck className="w-9 h-9" />}
                  </div>
                  <div>
                    <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-2xs inline-block mb-1.5 ${
                      resultado.tieneDesconexion ? "bg-card text-red-700 border-white font-extrabold" : "bg-black/20 border-white/20 text-white"
                    }`}>
                      {resultado.tieneDesconexion ? "⚠️ ORDEN DE DESCONEXIÓN EN CURSO" : "✔️ SUMINISTRO NORMAL ACTIVO"}
                    </span>
                    <h3 className="text-xl md:text-2xl font-black italic tracking-tight text-white">
                      {resultado.estadoConexion}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/90 font-medium mt-1">
                      {resultado.tieneDesconexion 
                        ? "El medidor presenta riesgo inminente u orden de corte registrada en el sistema de la ANDE." 
                        : "Suministro activo sin órdenes de suspensión ni morosidad crítica en la red comercial."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid de Datos del Medidor (Sin Truncar) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted p-5 rounded-2xl border border-border/80 shadow-2xs space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Titular ANDE</span>
                  <p className="text-base sm:text-lg font-extrabold text-foreground leading-snug break-words">{resultado.titular}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none font-mono font-bold text-xs">
                      NIS: {resultado.nis}
                    </Badge>
                    {resultado.documento && (
                      <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200 border-none font-mono font-bold text-xs">
                        RUC/CI: {resultado.documento}
                      </Badge>
                    )}
                    {resultado.esSimulado ? (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-bold text-xs">
                        SIN DATOS EN VIVO
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold text-xs">
                        DATOS REALES ANDE
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="bg-muted p-5 rounded-2xl border border-border/80 shadow-2xs space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Ubicación / Condominio</span>
                  <p className="text-base sm:text-lg font-extrabold text-foreground leading-snug break-words">{resultado.direccion}</p>
                  <p className="text-xs font-semibold text-muted-foreground pt-1">Zona: Asunción / Gran Asunción - Paraguay</p>
                </div>
              </div>

              {/* Grid de Métricas Financieras y Eléctricas Amplio */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm text-center flex flex-col justify-center">
                  <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Saldo a Pagar</span>
                  <p className={`text-xl sm:text-2xl font-black italic mt-1.5 tracking-tight ${resultado.saldoDeuda > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatCurrency(resultado.saldoDeuda)}
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 bg-muted py-0.5 px-2 rounded-full mx-auto inline-block">
                    {resultado.estadoPago}
                  </span>
                </div>

                <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm text-center flex flex-col justify-center">
                  <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Consumo del Mes</span>
                  <p className="text-xl sm:text-2xl font-black italic text-blue-600 mt-1.5 tracking-tight">
                    {resultado.consumoKw} <span className="text-sm font-bold text-muted-foreground">kW/h</span>
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 bg-muted py-0.5 px-2 rounded-full mx-auto inline-block">
                    Lectura Medidor
                  </span>
                </div>

                <div 
                  onClick={() => resultado.facturasPendientes > 0 && setMostrarDesglose(!mostrarDesglose)}
                  className={`p-5 rounded-2xl border-2 shadow-sm text-center flex flex-col justify-center transition-all ${
                    resultado.facturasPendientes > 0 
                      ? "cursor-pointer bg-card hover:bg-blue-50/60 border-border hover:border-blue-500 hover:shadow-md group relative active:scale-95" 
                      : "bg-card border-border"
                  }`}
                  title="Haz clic para ver u ocultar la tabla de desglose por mes"
                >
                  <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider group-hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5">
                    <span>Facturas Pendientes</span>
                    {resultado.facturasPendientes > 0 && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black animate-pulse">
                        👆 CLIC AQUÍ
                      </span>
                    )}
                  </span>
                  <p className={`text-xl sm:text-2xl font-black italic mt-1.5 tracking-tight ${resultado.facturasPendientes > 1 ? "text-red-600" : "text-foreground"}`}>
                    {resultado.facturasPendientes} <span className="text-sm font-bold text-muted-foreground">factura(s)</span>
                  </p>
                  <span className={`text-[10px] font-bold uppercase mt-1 py-0.5 px-2 rounded-full mx-auto inline-block transition-colors ${
                    resultado.facturasPendientes > 1 
                      ? (mostrarDesglose ? "bg-red-600 text-white font-black" : "bg-red-100 text-red-700 group-hover:bg-red-200") 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {mostrarDesglose ? "📂 Ocultar Desglose" : "🔍 Ver Desglose por Mes"}
                  </span>
                </div>

                <div className="bg-card p-5 rounded-2xl border-2 border-border shadow-sm text-center flex flex-col justify-center">
                  <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Fecha Vencimiento</span>
                  <p className="text-lg sm:text-xl font-black italic text-foreground mt-1.5 font-mono tracking-tight">
                    {resultado.vencimiento}
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 bg-muted py-0.5 px-2 rounded-full mx-auto inline-block">
                    Fecha Tope
                  </span>
                </div>
              </div>

              {/* Histórico de comprobantes reales (como App Mi ANDE) */}
              {(resultado.facturas?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-black italic tracking-tight text-foreground">Histórico de Comprobantes ANDE</h4>
                      <p className="text-xs text-muted-foreground font-medium">Montos, estados y fechas tal como reporta el servicio comercial</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarDesglose(!mostrarDesglose)}
                      className="rounded-xl text-xs font-bold"
                    >
                      {mostrarDesglose ? "Ocultar" : "Ver facturas"}
                    </Button>
                  </div>

                  {mostrarDesglose && (
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                      {resultado.facturas!.map((f, idx) => {
                        const esPend =
                          /pend|deud/i.test(f.estado || "") ||
                          /^ER[012]/i.test((f.estado || "").toUpperCase()) ||
                          ((f.estado || "").toUpperCase() === "ER620");
                        const esPag =
                          /pagad|cobrad/i.test(f.estado || "") ||
                          /^ER3/i.test((f.estado || "").toUpperCase());
                        const pendienteFinal =
                          esPend ||
                          (!esPag &&
                            resultado.saldoDeuda > 0 &&
                            Math.abs(f.monto - resultado.saldoDeuda) < 1);
                        return (
                          <div
                            key={`${f.monto}-${f.emision}-${idx}`}
                            className="min-w-[240px] snap-start rounded-2xl border-2 border-border bg-card p-4 shadow-sm space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xl font-black tracking-tight text-foreground">
                                {formatCurrency(f.monto)}
                              </p>
                              <span
                                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${
                                  pendienteFinal
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}
                              >
                                {pendienteFinal ? "Pendiente de Pago" : "Pagado"}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs font-semibold text-muted-foreground">
                              {f.emision && <p>Emisión: <span className="text-foreground font-bold">{f.emision}</span></p>}
                              {f.vencimiento && <p>Vencimiento: <span className="text-foreground font-bold">{f.vencimiento}</span></p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Observaciones y Recomendaciones */}
              <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl flex items-start gap-3 text-foreground">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="font-extrabold text-blue-950 uppercase tracking-wide text-xs">Informe Técnico y Comercial ANDE:</p>
                  <p className="text-foreground leading-relaxed font-medium">{resultado.observaciones}</p>
                </div>
              </div>

              {/* Acciones del Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground font-semibold">
                  🕒 Consulta procesada el {new Date(resultado.fechaConsulta).toLocaleTimeString("es-PY")}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    onClick={descargarPdf}
                    disabled={loadingPdf}
                    className="flex-1 sm:flex-none bg-yellow-400 hover:bg-yellow-500 text-black font-black italic text-xs rounded-xl h-12 px-6 shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {loadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-foreground" />}
                    <span>VER FACTURA ANDE EN PDF</span>
                  </Button>
                  <Button
                    onClick={() => consultarAnde(resultado.nis)}
                    variant="outline"
                    className="border-border hover:bg-muted text-foreground font-bold rounded-xl h-12 px-4"
                    title="Actualizar consulta"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
