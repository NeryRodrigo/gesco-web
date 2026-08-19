"use client";

import { API_BASE } from "@/lib/api";

import React, { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, History, Send, Printer } from "lucide-react";
import { ReciboDineroModal } from "./ReciboDineroModal";

export function MorosidadDetalleModal({ morosidadId, isOpen, onClose }: { morosidadId: number, isOpen: boolean, onClose: () => void }) {
  const [detalle, setDetalle] = useState<any>(null);
  const [selectedCuota, setSelectedCuota] = useState<number | null>(null);
  const [nuevoSeguimiento, setNuevoSeguimiento] = useState("");

  // State for Recibo de Dinero
  const [isReciboOpen, setIsReciboOpen] = useState(false);
  const [reciboData, setReciboData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && morosidadId) {
      fetchDetalle();
    }
  }, [isOpen, morosidadId]);

  const fetchDetalle = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/Morosidad/${morosidadId}?t=${Date.now()}`);
      if (resp.ok) {
        setDetalle(await resp.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCobrarCuota = async (cuotaId: number) => {
    if (!confirm("¿Registrar el cobro de esta cuota? (Afectará a facturación)")) return;
    
    try {
      const resp = await fetch(`${API_BASE}/api/Morosidad/cuota/${cuotaId}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodoPago: "Efectivo",
          contratoActualId: 1, // Esto debería salir del contexto, pero es un mock por ahora
          notas: "Recuperación de mora"
        })
      });

      if (resp.ok) {
        toast.success("Cobro Registrado", { description: "La cuota fue pagada con éxito y enviada a Facturación." });
        
        // Mostrar recibo de dinero
        if (detalle) {
          const cuotaCobrada = detalle.cuotas?.find((c: any) => c.cuotaId === cuotaId);
          setReciboData({
            reciboId: cuotaId,
            inquilinoNombre: detalle.inquilino?.razonSocial || "S/D",
            monto: cuotaCobrada?.monto || 0,
            concepto: `Recuperación de mora - Cuota #${cuotaCobrada?.numeroCuota || "?"}`,
            unidadCodigo: detalle.unidad?.codigoUnidad || "S/D",
            condominio: detalle.unidad?.nombreCondominio || "Agus",
            fechaPago: new Date().toISOString(),
            metodoPago: "Efectivo"
          });
          setIsReciboOpen(true);
        }
        
        fetchDetalle();
      } else {
        toast.error("No se pudo cobrar la cuota");
      }
    } catch (e) {
      toast.error("Error de red al cobrar");
    }
  };

  const handleAddSeguimiento = async () => {
    if (!nuevoSeguimiento || !selectedCuota) return;

    try {
      const resp = await fetch(`${API_BASE}/api/Morosidad/cuota/${selectedCuota}/seguimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacion: nuevoSeguimiento })
      });

      if (resp.ok) {
        toast.success("Seguimiento Jurídico Guardado");
        setNuevoSeguimiento("");
        fetchDetalle();
      }
    } catch (e) {
      toast.error("Error de red");
    }
  };

  if (!detalle) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl w-[95vw] border-none shadow-2xl rounded-[2rem] overflow-hidden p-0 bg-card">
          <div className="bg-secondary p-6 pr-12 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <DialogTitle className="text-xl font-black italic uppercase text-foreground">
                      Detalle de Morosidad EXP-{detalle.morosidadId.toString().padStart(5, '0')}
                  </DialogTitle>
                  <DialogDescription className="font-bold text-xs flex flex-col gap-1 mt-1">
                      <span>{detalle.inquilino?.razonSocial} - Deuda Total Actualizada: Gs. {detalle.montoTotal.toLocaleString()}</span>
                      <span className="text-[10px] text-red-500 flex items-center gap-2">
                        {detalle.montoInteresDiario > 0 ? (
                           <>
                             <Badge variant="outline" className="text-[9px] border-red-500 text-red-500">INTERÉS DIARIO: Gs. {detalle.montoInteresDiario.toLocaleString()}</Badge>
                             <span>Acumulado a la fecha: Gs. {detalle.interesAcumuladoTotal.toLocaleString()}</span>
                           </>
                        ) : (
                           <Badge variant="outline" className="text-[9px]">SIN INTERÉS MORATORIO CONFIGURADO</Badge>
                        )}
                      </span>
                  </DialogDescription>
              </div>
              <Button onClick={() => toast.info("Generando Documento...")} variant="outline" className="h-10 rounded-xl bg-card text-xs font-bold shadow-sm shrink-0">
                  <Printer className="w-4 h-4 mr-2" /> Imprimir Plan de Pagos
              </Button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LISTA DE CUOTAS */}
              <div className="border border-border rounded-[1.5rem] bg-card h-[400px] overflow-x-auto overflow-y-auto">
                  <Table className="min-w-[400px]">
                      <TableHeader className="bg-secondary/50 sticky top-0 z-10">
                          <TableRow>
                              <TableHead className="font-black text-[10px] uppercase pl-4">Cuota</TableHead>
                              <TableHead className="font-black text-[10px] uppercase">Monto</TableHead>
                              <TableHead className="font-black text-[10px] uppercase">Estado</TableHead>
                              <TableHead className="text-right font-black text-[10px] uppercase pr-4">Acción</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {detalle.cuotas?.map((c: any) => (
                              <TableRow 
                                key={c.cuotaId} 
                                onClick={() => setSelectedCuota(c.cuotaId)}
                                className={`cursor-pointer transition-all ${selectedCuota === c.cuotaId ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                              >
                                  <TableCell className="pl-4 font-black italic text-xs">
                                      #{c.numeroCuota}
                                      <p className="text-[9px] font-bold text-muted-foreground">{new Date(c.fechaVencimiento).toLocaleDateString()}</p>
                                  </TableCell>
                                  <TableCell className="font-black">Gs. {c.monto.toLocaleString()}</TableCell>
                                  <TableCell>
                                      {c.estaPagado ? (
                                        <Badge className="bg-emerald-500 text-[9px] font-black uppercase">PAGADO</Badge>
                                      ) : (
                                        <Badge className="bg-orange-500 text-[9px] font-black uppercase">PENDIENTE</Badge>
                                      )}
                                  </TableCell>
                                  <TableCell className="text-right pr-4">
                                      {!c.estaPagado ? (
                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleCobrarCuota(c.cuotaId); }} className="h-7 text-[10px] bg-primary font-bold">Cobrar</Button>
                                      ) : (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 inline-block" />
                                      )}
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>

              {/* SEGUIMIENTO JURIDICO */}
              <div className="bg-secondary/20 border border-border rounded-[1.5rem] p-5 h-[400px] flex flex-col">
                  <h3 className="font-black italic uppercase text-sm mb-4 flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" /> Historial y Seguimiento
                  </h3>

                  {!selectedCuota ? (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs font-bold text-center">
                          Seleccione una cuota a la izquierda para ver o agregar su seguimiento jurídico.
                      </div>
                  ) : (
                      <>
                          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                              {detalle.cuotas?.find((c:any) => c.cuotaId === selectedCuota)?.seguimientos?.length === 0 ? (
                                  <p className="text-xs text-muted-foreground font-bold italic text-center mt-10">Sin seguimientos registrados.</p>
                              ) : (
                                  detalle.cuotas?.find((c:any) => c.cuotaId === selectedCuota)?.seguimientos?.map((seg: any) => (
                                      <div key={seg.seguimientoId} className="bg-card p-3 rounded-xl border border-border shadow-sm">
                                          <p className="text-[9px] font-black text-primary uppercase">{new Date(seg.fechaRegistro).toLocaleString()}</p>
                                          <p className="text-xs font-medium mt-1">{seg.observacion}</p>
                                      </div>
                                  ))
                              )}
                          </div>
                          <div className="flex gap-2">
                              <Input 
                                  value={nuevoSeguimiento} 
                                  onChange={e => setNuevoSeguimiento(e.target.value)} 
                                  placeholder="Escribir nueva observación..." 
                                  className="h-10 text-xs bg-card" 
                                  onKeyDown={e => { if(e.key === 'Enter') handleAddSeguimiento() }}
                              />
                              <Button onClick={handleAddSeguimiento} className="h-10 w-10 p-0 shrink-0 rounded-xl bg-primary hover:bg-primary/90">
                                  <Send className="w-4 h-4" />
                              </Button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      </DialogContent>
    </Dialog>

    {/* RECIBO DE DINERO */}
    <ReciboDineroModal 
      isOpen={isReciboOpen} 
      onClose={() => setIsReciboOpen(false)} 
      reciboData={reciboData} 
    />
    </>
  );
}
