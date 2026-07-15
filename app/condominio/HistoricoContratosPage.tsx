"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatDuplex } from "@/lib/utils";
import { 
  History, 
  Search, 
  Building2, 
  User, 
  Calendar, 
  DollarSign, 
  RotateCcw, 
  Phone, 
  Mail, 
  Car, 
  FileText,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface HistoricoContratosPageProps {
  empresaId: number;
}

export default function HistoricoContratosPage({ empresaId }: HistoricoContratosPageProps) {
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmAnularContrato, setConfirmAnularContrato] = useState<{
    contratoId: number;
    nombre: string;
  } | null>(null);
  const [anulando, setAnulando] = useState(false);

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5034/api/Contratos/historico?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setContratos(Array.isArray(data) ? data : []);
      } else {
        setContratos([]);
      }
    } catch (error) {
      console.error("Error al cargar histórico de contratos:", error);
      toast.error("Error al conectar con el servidor para cargar el historial");
      setContratos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, [empresaId]);

  const handleConfirmAnularDesalojo = async () => {
    if (!confirmAnularContrato) return;
    setAnulando(true);
    try {
      const resp = await fetch(`http://localhost:5034/api/Contratos/${confirmAnularContrato.contratoId}/anulardesalojo`, {
        method: "POST"
      });
      if (resp.ok) {
        toast.success(`Desalojo anulado con éxito. El contrato de ${confirmAnularContrato.nombre} vuelve a estar activo.`);
        setConfirmAnularContrato(null);
        fetchHistorico();
      } else {
        toast.error("No se pudo anular el desalojo. Verifique que la unidad no tenga otro contrato activo.");
      }
    } catch (error) {
      console.error("Error al anular desalojo:", error);
      toast.error("Ocurrió un error en el servidor al intentar anular el desalojo.");
    } finally {
      setAnulando(false);
    }
  };

  const filteredContratos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contratos;
    return contratos.filter((hc) => {
      const razon = (hc.inquilino?.razonSocial || "").toLowerCase();
      const doc = (hc.inquilino?.documento || "").toLowerCase();
      const codUnidad = (hc.unidad?.codigoUnidad || "").toLowerCase();
      const cond = (hc.unidad?.nombreCondominio || "").toLowerCase();
      return razon.includes(query) || doc.includes(query) || codUnidad.includes(query) || cond.includes(query);
    });
  }, [contratos, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-2xl text-primary">
              <History className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tight text-foreground">
                Histórico de Inquilinos y Contratos
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Registro general de contratos pasados y desalojos de todas las unidades
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchHistorico}
            className="rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por inquilino, CI/RUC o código de unidad (ej. D-04)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted border-border text-sm font-medium focus:bg-card"
          />
        </div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">
          {filteredContratos.length} registro(s) encontrado(s)
        </div>
      </div>

      {/* LISTADO DE CONTRATOS HISTÓRICOS */}
      {loading ? (
        <div className="bg-card p-16 rounded-[2rem] border border-border text-center space-y-3 shadow-sm">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-muted-foreground">Cargando historial general...</p>
        </div>
      ) : filteredContratos.length === 0 ? (
        <div className="bg-card p-16 rounded-[2rem] border border-border text-center space-y-3 shadow-sm">
          <History className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-base font-bold text-muted-foreground">No hay contratos históricos registrados.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Cuando finalice o se desaloje un contrato en cualquiera de los dúplex o unidades, aparecerá automáticamente registrado en este histórico general.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredContratos.map((hc: any) => (
            <div
              key={hc.contratoId}
              className="bg-card p-6 md:p-7 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all space-y-5"
            >
              {/* ENCABEZADO DE LA TARJETA */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  {hc.unidad && (
                    <span className="bg-blue-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {formatDuplex(hc.unidad.codigoUnidad)}
                    </span>
                  )}
                  <span className="bg-muted text-foreground text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                    Contrato #{hc.contratoId}
                  </span>
                  <h4 className="font-black italic text-xl text-foreground">
                    {hc.inquilino?.razonSocial || "Inquilino"}
                  </h4>
                  <span className="text-xs font-bold text-muted-foreground">
                    CI/RUC: {hc.inquilino?.documento || "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Badge className="bg-muted text-muted-foreground font-bold text-[10px] uppercase px-3 py-1">
                    Finalizado / Desalojado
                  </Badge>
                  <button
                    onClick={() =>
                      setConfirmAnularContrato({
                        contratoId: hc.contratoId,
                        nombre: hc.inquilino?.razonSocial || "Inquilino"
                      })
                    }
                    className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 text-xs font-black uppercase px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm"
                    title="Revertir desalojo y devolver todo al estado anterior"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Anular Desalojo
                  </button>
                </div>
              </div>

              {/* DETALLES EN CUADRICULA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1 mb-1">
                    <Phone className="w-3 h-3" /> Teléfono / Email
                  </p>
                  <p className="text-sm font-bold text-foreground">{hc.inquilino?.telefono || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">{hc.inquilino?.email || ""}</p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" /> Fecha Ingreso
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {hc.fechaIngreso ? new Date(hc.fechaIngreso).toLocaleDateString("es-PY") : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" /> Inicio — Fin Contrato
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {hc.fechaInicioContrato
                      ? new Date(hc.fechaInicioContrato).toLocaleDateString("es-PY")
                      : "-"}{" "}
                    —{" "}
                    {hc.fechaFinContrato
                      ? new Date(hc.fechaFinContrato).toLocaleDateString("es-PY")
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1 mb-1">
                    <DollarSign className="w-3 h-3" /> Alquiler / Garantía
                  </p>
                  <p className="text-sm font-bold text-emerald-600">
                    Gs. {Number(hc.montoMensualAlquiler || 0).toLocaleString("es-PY")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Garantía: Gs. {Number(hc.depositoGarantia || 0).toLocaleString("es-PY")}
                  </p>
                </div>
              </div>

              {/* OBSERVACIONES Y VEHÍCULO */}
              {(hc.observaciones || hc.vehiculoInfo) && (
                <div className="pt-3 border-t border-border flex flex-col sm:flex-row gap-6 text-xs text-muted-foreground">
                  {hc.vehiculoInfo && (
                    <p className="flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                      <strong className="font-bold text-foreground">Vehículo:</strong> {hc.vehiculoInfo}
                    </p>
                  )}
                  {hc.observaciones && (
                    <p className="flex items-start gap-1.5 italic">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0 not-italic mt-0.5" />
                      <span>
                        <strong className="font-bold text-foreground not-italic">Observaciones:</strong>{" "}
                        {hc.observaciones}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN ANULAR DESALOJO */}
      <Dialog
        open={!!confirmAnularContrato}
        onOpenChange={(open) => {
          if (!open) setConfirmAnularContrato(null);
        }}
      >
        <DialogContent className="sm:max-w-[450px] p-7 rounded-[2rem] bg-card border-none shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black italic text-foreground tracking-tight">
              ¿Anular Desalojo / Finalización?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            Al confirmar, el contrato de{" "}
            <strong className="text-foreground font-bold">{confirmAnularContrato?.nombre}</strong>{" "}
            volverá a estar <strong className="text-emerald-600 font-bold">ACTIVO</strong> y el inquilino
            regresará a ocupar su unidad. Asegúrese de que la unidad no esté ocupada por un nuevo inquilino.
          </p>
          <DialogFooter className="flex gap-2 sm:justify-end pt-3">
            <Button
              variant="outline"
              disabled={anulando}
              onClick={() => setConfirmAnularContrato(null)}
              className="rounded-xl font-bold text-xs uppercase"
            >
              Cancelar
            </Button>
            <Button
              disabled={anulando}
              onClick={handleConfirmAnularDesalojo}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase px-5"
            >
              {anulando ? "Anulando..." : "Confirmar Anulación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
