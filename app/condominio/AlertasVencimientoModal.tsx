"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Send, AlertTriangle, CheckCircle2, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatDuplex } from "@/lib/utils";

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
  const [diasFiltro, setDiasFiltro] = useState<number>(5);

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
      const resp = await fetch(
        `http://localhost:5034/api/Contratos/alertas-vencimiento?diasMaximos=${dias}`
      );
      if (resp.ok) {
        const data = await resp.json();
        setAlertas(data);
      } else {
        toast.error("No se pudieron cargar las alertas de vencimiento.");
      }
    } catch (error) {
      console.error("Error al cargar alertas de vencimiento:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarAlertas(diasFiltro);
    }
  }, [isOpen, diasFiltro]);

  const handleSimularAlerta = async () => {
    setSimulando(true);
    try {
      const resp = await fetch(
        "http://localhost:5034/api/Contratos/simular-alerta-5-dias",
        { method: "POST" }
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        toast.success("Correo de prueba enviado exitosamente", {
          description: `Alerta simulada de 5 días enviada a ${data.datosEnviados?.emailDestino || "Inquilino y Administrador"}.`,
        });
      } else {
        toast.error(data.message || "Error al simular la alerta de 5 días.");
      }
    } catch (error) {
      toast.error("Error de conexión al simular la alerta.");
    } finally {
      setSimulando(false);
    }
  };

  const handleEnviarAlerta = async (alerta: AlertaItem) => {
    if (!alerta.email || !alerta.email.includes("@")) {
      toast.error(
        "El inquilino no tiene un correo electrónico válido configurado."
      );
      return;
    }

    setSendingId(alerta.contratoId);
    try {
      const resp = await fetch(
        "http://localhost:5034/api/Contratos/enviar-alerta-vencimiento",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailDestino: alerta.email,
            nombreCliente: alerta.inquilinoNombre,
            nombreUnidad: alerta.unidadNombre,
            montoMensual: alerta.montoMensual,
            fechaVencimiento: alerta.fechaVencimiento,
            diasRestantes: alerta.diasRestantes,
          }),
        }
      );

      const data = await resp.json();
      if (resp.ok && data.success) {
        toast.success("Alerta enviada exitosamente", {
          description: `Se notificó a ${alerta.inquilinoNombre} y al administrador.`,
        });
      } else {
        toast.error(data.message || "Error al enviar la alerta.");
      }
    } catch (error) {
      toast.error("Error de conexión al enviar el correo de alerta.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[96vw] max-w-[1180px] sm:max-w-[94vw] md:max-w-[1080px] lg:max-w-[1180px] bg-card rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl border border-border max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
                <Bell className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-heading font-bold uppercase tracking-tight text-foreground leading-snug">
                  Alertas de Vencimiento de Alquiler (5 Días)
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  Notificación automática y manual al Inquilino y Administrador antes del vencimiento de la cuota
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleSimularAlerta}
                disabled={simulando}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold font-sans text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {simulando ? "Enviando..." : "Simular Alerta (Prueba 5 Días)"}
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

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-500 leading-relaxed font-sans">
            <span className="font-bold uppercase">Monitoreo Automático:</span> El servicio en segundo plano (<code className="font-bold">AlquilerAlertasBackgroundService</code>) revisa diariamente los contratos activos y envía un correo electrónico al inquilino con copia (BCC) al administrador 5 días antes de la fecha de vencimiento. Aquí también puedes supervisar el estado y disparar la alerta de manera inmediata.
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">
              Consultando vencimientos próximos...
            </p>
          </div>
        ) : alertas.length === 0 ? (
          <div className="text-center py-14 bg-muted border border-border rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold font-heading text-foreground uppercase">
              ¡Todos al día!
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              No hay alquileres pendientes próximos a vencer en los próximos {diasFiltro} días.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Button
                onClick={handleSimularAlerta}
                disabled={simulando}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl px-5 py-2.5 shadow-md flex items-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                {simulando ? "Enviando Correo..." : "Probar Correo (Simular Alerta 5 Días)"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDiasFiltro(diasFiltro === 5 ? 35 : 5)}
                className="border-border text-foreground font-bold text-xs rounded-xl px-4 py-2.5"
              >
                {diasFiltro === 5
                  ? "Ver todos los contratos del mes (35 días)"
                  : "Ver solo próximos 5 días"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {alertas.map((alerta) => (
              <div
                key={alerta.contratoId}
                className="bg-card border border-border hover:border-primary/50 rounded-2xl p-4 sm:p-6 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md"
              >
                {/* Información Izquierda */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-heading font-bold text-base uppercase text-foreground tracking-tight">
                      {formatDuplex(alerta.unidadNombre)}
                    </span>
                    <Badge
                      className={`text-[10px] font-black uppercase px-3 py-0.5 rounded-full shrink-0 ${
                        alerta.diasRestantes < 0
                          ? "bg-red-100 text-red-700 border border-red-300"
                          : alerta.diasRestantes <= 2
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-blue-100 text-blue-700 border border-blue-300"
                      }`}
                    >
                      {alerta.estadoAlerta}
                    </Badge>
                  </div>

                  <div className="text-sm font-bold text-foreground truncate font-sans">
                    {alerta.inquilinoNombre}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium truncate">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {alerta.email || "Sin email registrado"}
                    </span>
                    <span className="hidden sm:inline text-muted-foreground">•</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      Vence: <strong className="text-foreground">{alerta.fechaVencimiento}</strong>
                    </span>
                  </div>
                </div>

                {/* Importe y Botón Derecha */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-3.5 md:pt-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Cuota Alquiler
                    </div>
                    <div className="text-lg font-bold font-heading text-foreground tracking-tight">
                      {formatGs(alerta.montoMensual)}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleEnviarAlerta(alerta)}
                    disabled={
                      sendingId === alerta.contratoId || !alerta.email
                    }
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold font-sans text-xs px-6 h-12 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
                  >
                    {sendingId === alerta.contratoId ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 shrink-0" />
                        <span>Enviar Alerta Ahora</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-8 h-11 rounded-xl font-bold text-xs font-sans text-foreground"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
