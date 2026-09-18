"use client";

import { API_BASE } from "@/lib/api";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Send, AlertTriangle, CheckCircle2, RefreshCw, Calendar, MailPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDuplex } from "@/lib/utils";
import { avisarCampoFaltante, campoPorId } from "./validacionProceso";

interface AlertaItem {
  contratoId: number;
  unidadNombre: string;
  inquilinoNombre: string;
  email: string;
  telefono: string;
  montoMensual: number;
  fechaVencimiento: string;
  diasRestantes: number;
  estadoAlerta: string;
}

interface AlertasVencimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertasVencimientoModal({
  isOpen,
  onClose,
}: AlertasVencimientoModalProps) {
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  
  // NUEVOS ESTADOS SIN AFECTAR AL DISEÑO
  const [diasFiltro, setDiasFiltro] = useState<number>(5);
  const [fechaProgramada, setFechaProgramada] = useState<string>(new Date().toISOString().split('T')[0]);
  const [emailBcc, setEmailBcc] = useState<string>("");
  // Correos tipeados en tarjetas de inquilinos que no tienen email en su ficha
  const [emailsNuevos, setEmailsNuevos] = useState<Record<number, string>>({});
  const [diagnostico, setDiagnostico] = useState<string | null>(null);
  const [diagnosticando, setDiagnosticando] = useState(false);

  const formatGs = (n: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      maximumFractionDigits: 0,
    }).format(n || 0);
  };

  const cargarAlertas = async (dias = diasFiltro) => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/alertas-vencimiento?diasMaximos=${dias}`);
      if (resp.ok) {
        const data = await resp.json();
        setAlertas(data);
      }
    } catch (error) {
      console.error("Error al cargar alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) cargarAlertas(diasFiltro);
  }, [isOpen, diasFiltro]);

  /** Envía una alerta y devuelve el motivo si el backend la rechaza. */
  const enviarAlerta = async (alerta: AlertaItem): Promise<string | null> => {
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/enviar-alerta-vencimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailDestino: alerta.email,
          emailCopia: emailBcc,
          nombreCliente: alerta.inquilinoNombre,
          nombreUnidad: alerta.unidadNombre,
          montoMensual: alerta.montoMensual,
          fechaVencimiento: alerta.fechaVencimiento,
          diasRestantes: alerta.diasRestantes,
        }),
      });
      if (resp.ok) return null;
      if (resp.status === 401) return "Sesión vencida: volvé a iniciar sesión.";
      const data = await resp.json().catch(() => null);
      return data?.message || `El servidor respondió ${resp.status}.`;
    } catch {
      return "No se pudo contactar al servidor.";
    }
  };

  /** Guarda en la ficha del inquilino el correo tipeado en la tarjeta. */
  const guardarEmailFicha = async (contratoId: number, email: string): Promise<string | null> => {
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/${contratoId}/email-inquilino`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (resp.ok) return null;
      if (resp.status === 401) return "Sesión vencida: volvé a iniciar sesión.";
      const data = await resp.json().catch(() => null);
      return data?.message || `El servidor respondió ${resp.status}.`;
    } catch {
      return "No se pudo contactar al servidor.";
    }
  };

  const handleEnviarAlerta = async (alerta: AlertaItem) => {
    const emailTipeado = (emailsNuevos[alerta.contratoId] || "").trim();
    const emailFicha = alerta.email?.trim() || "";

    if (!emailFicha && !emailTipeado.includes("@")) {
      avisarCampoFaltante(
        `Falta el correo de ${alerta.inquilinoNombre}. Cargalo en la tarjeta.`,
        campoPorId(`alerta-email-${alerta.contratoId}`)
      );
      return;
    }

    setSendingId(alerta.contratoId);

    // Si el inquilino no tenía correo, primero queda guardado en su ficha
    if (!emailFicha) {
      const errorGuardado = await guardarEmailFicha(alerta.contratoId, emailTipeado);
      if (errorGuardado) {
        setSendingId(null);
        toast.error(`No se pudo guardar el correo: ${errorGuardado}`, { duration: 8000 });
        return;
      }
      toast.success(`Correo guardado en la ficha de ${alerta.inquilinoNombre}`);
    }

    const error = await enviarAlerta({ ...alerta, email: emailFicha || emailTipeado });
    setSendingId(null);

    if (error) {
      toast.error(error, { duration: 8000 });
      return;
    }
    toast.success(`Alerta enviada a ${alerta.inquilinoNombre}`);
    if (!emailFicha) {
      setEmailsNuevos((prev) => {
        const { [alerta.contratoId]: _, ...resto } = prev;
        return resto;
      });
      cargarAlertas();
    }
  };

  const handleSimular = async () => {
    setSimulando(true);
    try {
      const params = new URLSearchParams();
      if (emailBcc.includes("@")) params.set("emailCopia", emailBcc);
      const resp = await fetch(
        `${API_BASE}/api/Contratos/simular-alerta-5-dias?${params.toString()}`,
        { method: "POST" }
      );
      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.success) {
        toast.success(`Prueba enviada a ${data?.datosEnviados?.emailDestino ?? "el inquilino"}`);
      } else {
        toast.error(data?.message || `El servidor respondió ${resp.status}.`, { duration: 8000 });
      }
    } catch {
      toast.error("No se pudo contactar al servidor.");
    } finally {
      setSimulando(false);
    }
  };

  const handleDiagnostico = async () => {
    setDiagnosticando(true);
    setDiagnostico(null);
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/diagnostico-smtp`, { method: "POST" });
      if (resp.status === 401) {
        setDiagnostico("Sesión vencida: volvé a iniciar sesión.");
        return;
      }
      const d = await resp.json().catch(() => null);
      if (!d) {
        setDiagnostico(`El servidor respondió ${resp.status} sin detalle.`);
        return;
      }
      const lineas = [
        d.resumen,
        `Servidor: ${d.smtpServer}:${d.smtpPort} · Remitente: ${d.senderEmail}`,
        `Contraseña configurada: ${d.tienePassword ? `sí (${d.largoPassword} caracteres)` : "NO"}`,
        `Conexión al puerto: ${d.conexionOk ? "OK" : `FALLA — ${d.conexionError ?? "sin detalle"}`}`,
        `Envío de prueba: ${d.envioOk ? "OK" : `FALLA — ${d.envioError ?? "no se intentó"}`}`,
      ];
      setDiagnostico(lineas.filter(Boolean).join("\n"));
    } catch {
      setDiagnostico("No se pudo contactar al servidor.");
    } finally {
      setDiagnosticando(false);
    }
  };

  const handleEnvioMasivo = async () => {
    const emailDe = (a: AlertaItem) => (a.email?.trim() || emailsNuevos[a.contratoId]?.trim() || "");
    const validos = alertas.filter(a => emailDe(a).includes("@"));
    const sinCorreo = alertas.length - validos.length;

    if (validos.length === 0) {
      return toast.error("Ningún inquilino de la lista tiene correo cargado.");
    }
    const aviso = sinCorreo > 0 ? ` (${sinCorreo} se omiten por no tener correo)` : "";
    if (!confirm(`¿Desea enviar notificaciones masivas a ${validos.length} inquilinos?${aviso}`)) return;

    setIsBulkSending(true);
    let enviados = 0;
    let ultimoError: string | null = null;
    for (const alerta of validos) {
      const emailFicha = alerta.email?.trim() || "";
      if (!emailFicha) {
        const errorGuardado = await guardarEmailFicha(alerta.contratoId, emailDe(alerta));
        if (errorGuardado) {
          ultimoError = errorGuardado;
          continue;
        }
      }
      const error = await enviarAlerta({ ...alerta, email: emailDe(alerta) });
      if (error) ultimoError = error;
      else enviados++;
    }
    setIsBulkSending(false);

    if (enviados === validos.length) {
      toast.success(`Envío masivo completado: ${enviados} alertas enviadas.`);
    } else {
      toast.error(
        `Se enviaron ${enviados} de ${validos.length}. Motivo de las fallas: ${ultimoError}`,
        { duration: 10000 }
      );
    }
    cargarAlertas();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      {/* MANTENEMOS TUS DIMENSIONES ORIGINALES EXACTAS */}
      <DialogContent className="w-[96vw] max-w-[1180px] sm:max-w-[94vw] md:max-w-[1080px] lg:max-w-[1180px] bg-card rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl border border-border max-h-[92vh] overflow-y-auto overflow-x-hidden">
        
        {/* HEADER ORIGINAL */}
        <DialogHeader className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
                <Bell className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-heading font-bold uppercase tracking-tight text-foreground leading-snug">
                  Alertas de Vencimiento de Alquiler ({diasFiltro} Días)
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  Notificación automática y manual al Inquilino y Administrador antes del vencimiento de la cuota
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSimular}
                disabled={simulando}
                className="rounded-xl border-border font-bold text-xs flex items-center gap-2"
              >
                {simulando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Simular Alerta (Prueba 5 Días)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDiagnostico}
                disabled={diagnosticando}
                className="rounded-xl border-border font-bold text-xs flex items-center gap-2"
              >
                {diagnosticando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MailPlus className="w-3.5 h-3.5" />}
                Probar Correo del Servidor
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiasFiltro(diasFiltro === 5 ? 35 : 5)}
                className="rounded-xl border-border font-bold text-xs flex items-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {diasFiltro === 5 ? "Ver mes (35 días)" : "Ver 5 días"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cargarAlertas(diasFiltro)}
                disabled={loading}
                className="rounded-xl border-border font-bold text-xs flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* FRANJA NARANJA ORIGINAL */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-500 leading-relaxed font-sans">
            <span className="font-bold uppercase">Monitoreo Automático:</span> El servicio en segundo plano revisa diariamente los contratos activos y envía un correo electrónico al inquilino con copia (BCC) al administrador 5 días antes de la fecha de vencimiento.
          </div>
        </div>

        {diagnostico && (
          <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Estado del correo saliente</p>
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">{diagnostico}</pre>
            </div>
            <button
              type="button"
              onClick={() => setDiagnostico(null)}
              className="text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              Ocultar
            </button>
          </div>
        )}

        {/* --- NUEVA BARRA DE CONFIGURACIÓN INTEGRADA PULCRAMENTE --- */}
        <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-[2rem] mb-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-8">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Fecha Programada</Label>
                    <Input 
                      type="date" 
                      value={fechaProgramada} 
                      onChange={(e) => setFechaProgramada(e.target.value)} 
                      className="bg-background/50 border-border text-foreground text-xs h-10 w-44 rounded-xl focus:ring-1 ring-blue-500" 
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Copia a Administración (Opcional)</Label>
                    <Input 
                      type="email" 
                      value={emailBcc} 
                      onChange={(e) => setEmailBcc(e.target.value)} 
                      placeholder="Dejar vacío: va solo al inquilino"
                      className="bg-background/50 border-border text-foreground text-xs h-10 w-64 rounded-xl focus:ring-1 ring-blue-500" 
                    />
                </div>
            </div>
            <Button 
              onClick={handleEnvioMasivo}
              disabled={isBulkSending || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8 rounded-2xl font-black italic text-[11px] uppercase shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
                {isBulkSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Ejecutar Envío Masivo
            </Button>
        </div>

        {/* LISTADO DE TARJETAS ORIGINALES */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : alertas.length === 0 ? (
          <div className="text-center py-14 bg-muted border border-border rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold uppercase">¡Todos al día!</h4>
          </div>
        ) : (
          <div className="space-y-3.5">
            {alertas.map((alerta) => (
              <div
                key={alerta.contratoId}
                className="bg-card border border-border hover:border-primary/50 rounded-2xl p-4 sm:p-6 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-heading font-bold text-base uppercase text-foreground tracking-tight">
                      {formatDuplex(alerta.unidadNombre)}
                    </span>
                    <Badge className={`text-[10px] font-black uppercase px-3 py-0.5 rounded-full shrink-0 ${alerta.diasRestantes < 0 ? "bg-red-100 text-red-700 border border-red-300" : "bg-blue-100 text-blue-700 border border-blue-300"}`}>
                      {alerta.estadoAlerta}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-foreground truncate">{alerta.inquilinoNombre}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {alerta.email ? (
                      <span className="flex items-center gap-1.5 font-medium truncate"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{alerta.email}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-medium">
                        <Mail className="w-3.5 h-3.5 text-amber-500" />
                        <Input
                          type="email"
                          id={`alerta-email-${alerta.contratoId}`}
                          value={emailsNuevos[alerta.contratoId] ?? ""}
                          onChange={(e) =>
                            setEmailsNuevos((prev) => ({ ...prev, [alerta.contratoId]: e.target.value }))
                          }
                          placeholder="Sin correo en la ficha: cargalo acá"
                          className="bg-background/50 border-amber-500/40 text-foreground text-xs h-8 w-60 rounded-lg focus:ring-1 ring-blue-500"
                        />
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-medium"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />Vence: <strong className="text-foreground">{alerta.fechaVencimiento}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-3.5 md:pt-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Cuota Alquiler</div>
                    <div className="text-lg font-bold font-heading text-foreground tracking-tight">{formatGs(alerta.montoMensual)}</div>
                  </div>
                  <Button
                    onClick={() => handleEnviarAlerta(alerta)}
                    disabled={sendingId === alerta.contratoId}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold font-sans text-xs px-6 h-12 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {sendingId === alerta.contratoId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {alerta.email ? "Enviar Alerta Ahora" : "Guardar Correo y Enviar"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose} className="px-8 h-11 rounded-xl font-bold text-xs text-foreground">Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
