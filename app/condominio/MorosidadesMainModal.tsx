"use client";

import { API_BASE } from "@/lib/api";

import React, { useState, useEffect } from "react";
import { formatDuplex } from "@/lib/utils";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, Printer, Search, PlusCircle, History, Landmark, Check, ShieldAlert, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MorosidadDetalleModal } from "./MorosidadDetalleModal";
import { ReciboDineroModal } from "./ReciboDineroModal";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface Cuota {
  cuotaId: number;
  numeroCuota: number;
  monto: number;
  fechaVencimiento: string;
  estaPagado: boolean;
}

interface Morosidad {
  morosidadId: number;
  inquilinoId: number;
  unidadId: number;
  inquilino: { razonSocial: string; cedula: string };
  unidad: { codigoUnidad: string; nombreCondominio: string };
  montoTotal: number;
  saldoPendiente: number;
  cantidadCuotas: number;
  fechaRegistro: string;
  estado: string;
  estaDesalojado: boolean;
  cuotas?: Cuota[];
}

export function MorosidadesMainModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [morosidades, setMorosidades] = useState<Morosidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"activos" | "desalojados">("activos");
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for Create Modal
  const [isCrearOpen, setIsCrearOpen] = useState(false);
  const [inquilinoId, setInquilinoId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [cuotas, setCuotas] = useState("");
  const [interesDiario, setInteresDiario] = useState("0");
  const [observaciones, setObservaciones] = useState("");
  
  // State for Detalle
  const [selectedMorosidad, setSelectedMorosidad] = useState<number | null>(null);

  // State for Recibo de Dinero
  const [isReciboOpen, setIsReciboOpen] = useState(false);
  const [reciboData, setReciboData] = useState<any>(null);

  // State for Confirmar Anulación de Desalojo
  const [confirmAnular, setConfirmAnular] = useState<{ unidadId: number; expCodigo: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMorosidades();
    }
  }, [isOpen]);

  const fetchMorosidades = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/Morosidad?t=` + Date.now());
      if (resp.ok) {
        setMorosidades(await resp.json());
      }
    } catch (error) {
      console.error("Error fetching morosidades", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquilinoId || !unidadId || !montoTotal || !cuotas) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    
    try {
      const resp = await fetch(`${API_BASE}/api/Morosidad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquilinoId: parseInt(inquilinoId),
          unidadId: parseInt(unidadId),
          montoTotal: parseFloat(montoTotal),
          cantidadCuotas: parseInt(cuotas),
          montoInteresDiario: parseFloat(interesDiario || "0"),
          observaciones
        })
      });

      if (resp.ok) {
        toast.success("Morosidad Registrada", { description: "Plan de pagos generado automáticamente." });
        setIsCrearOpen(false);
        // Clear form
        setInquilinoId("");
        setUnidadId("");
        setMontoTotal("");
        setCuotas("");
        setInteresDiario("0");
        setObservaciones("");
        fetchMorosidades();
      } else {
        toast.error("Error al registrar morosidad");
      }
    } catch (e) {
      toast.error("Error de red");
    }
  };

  const handleCobrarCuota = async (cuotaId: number, morosidad?: any) => {
    if (!confirm("¿Registrar el cobro de esta cuota? (Afectará a facturación)")) return;
    
    try {
      const resp = await fetch(`${API_BASE}/api/Morosidad/cuota/${cuotaId}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodoPago: "Efectivo",
          contratoActualId: 1,
          notas: "Recuperación de mora"
        })
      });

      if (resp.ok) {
        toast.success("Cobro Registrado", { description: "La cuota fue pagada con éxito y enviada a Facturación." });
        
        // Buscar datos de la cuota cobrada para el recibo
        if (morosidad) {
          const cuota = morosidad.cuotasPendientes?.find((c: any) => c.cuotaId === cuotaId);
          setReciboData({
            reciboId: cuotaId,
            inquilinoNombre: morosidad.inquilino?.razonSocial || "S/D",
            monto: cuota?.monto || 0,
            concepto: `Recuperación de mora - Cuota #${cuota?.numeroCuota || "?"}`,
            unidadCodigo: morosidad.unidad?.codigoUnidad || "S/D",
            condominio: morosidad.unidad?.nombreCondominio || "Agus",
            fechaPago: new Date().toISOString(),
            metodoPago: "Efectivo"
          });
          setIsReciboOpen(true);
        }
        
        fetchMorosidades();
      } else {
        toast.error("No se pudo cobrar la cuota");
      }
    } catch (e) {
      toast.error("Error de red al cobrar");
    }
  };

  // Helper functions for month formatting and sorting
  const getMesAnio = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "S/D";
    return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getMesKey = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    return date.getFullYear() * 100 + (date.getMonth() + 1);
  };

  // Process data: group by tenant, sort cuotas by month, and calculate total per tenant
  const processedData = morosidades
    .map(m => {
      const cuotasPendientes = (m.cuotas || [])
        .filter(c => !c.estaPagado)
        .map(c => ({
          ...c,
          mesAnio: getMesAnio(c.fechaVencimiento),
          mesKey: getMesKey(c.fechaVencimiento)
        }))
        .sort((a, b) => a.mesKey - b.mesKey);

      const totalInquilino = cuotasPendientes.reduce((sum, c) => sum + c.monto, 0);

      return {
        ...m,
        cuotasPendientes,
        totalInquilino
      };
    })
    .filter(m => m.totalInquilino > 0); // Only keep tenants with pending debt

  // Filter based on Search Term
  const filteredData = processedData.filter(m => {
    const matchSearch = 
      m.inquilino?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.unidad?.codigoUnidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.unidad?.nombreCondominio?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // Separate Active vs Evicted groups
  const activeMorosos = filteredData.filter(m => !m.estaDesalojado);
  const evictedMorosos = filteredData.filter(m => m.estaDesalojado);

  // Totals calculations
  const totalActivos = processedData.filter(m => !m.estaDesalojado).reduce((sum, m) => sum + m.totalInquilino, 0);
  const totalEvicted = processedData.filter(m => m.estaDesalojado).reduce((sum, m) => sum + m.totalInquilino, 0);
  const totalGeneral = totalActivos + totalEvicted;

  const currentList = activeTab === "activos" ? activeMorosos : evictedMorosos;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="sm:max-w-5xl w-[95vw] border-none shadow-2xl rounded-[2rem] overflow-hidden p-0 bg-card">
          <div className="bg-red-500/10 p-6 pr-12 flex flex-col md:flex-row justify-between items-center border-b border-red-500/20 gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-500/30 text-white shrink-0">
                  <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                  <DialogTitle className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-red-600">
                      Gestión de Morosidades
                  </DialogTitle>
                  <DialogDescription className="text-red-500/70 font-bold text-xs uppercase tracking-wide">
                      Recuperación de deudas, refinanciamiento y seguimiento jurídico.
                  </DialogDescription>
              </div>
            </div>
            
            <Button onClick={() => setIsCrearOpen(true)} className="shrink-0 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black italic shadow-xl shadow-red-500/20 hover:scale-105 transition-all">
               <PlusCircle className="w-4 h-4 mr-2" /> NUEVO EXPEDIENTE DE MORA
            </Button>
          </div>

          <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
                  {/* Search bar */}
                  <div className="relative w-full max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        placeholder="Buscar por inquilino o unidad..." 
                        className="pl-10 h-10 rounded-full bg-secondary border-none font-bold" 
                      />
                  </div>

                  {/* Elegant custom tabs */}
                  <div className="flex bg-secondary p-1 rounded-2xl gap-1 shrink-0">
                    <button
                      onClick={() => setActiveTab("activos")}
                      className={`px-5 py-2 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-2 ${activeTab === "activos" ? "bg-card text-red-600 shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Clock className="w-4 h-4" /> Siguen en Mora ({activeMorosos.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("desalojados")}
                      className={`px-5 py-2 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-2 ${activeTab === "desalojados" ? "bg-card text-red-600 shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <ShieldAlert className="w-4 h-4" /> Desalojados ({evictedMorosos.length})
                    </button>
                  </div>
              </div>

              {/* Grouped list of Morosos */}
              <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="text-center py-20 italic font-bold text-muted-foreground">Cargando morosidades...</div>
                ) : currentList.length === 0 ? (
                  <div className="text-center py-20 italic font-bold text-muted-foreground border-2 border-dashed border-border rounded-3xl">
                    No hay inquilinos en este grupo con saldos pendientes de pago.
                  </div>
                ) : (
                  currentList.map(m => (
                    <div key={m.morosidadId} className="border border-border rounded-3xl bg-secondary/10 overflow-hidden shadow-sm hover:shadow-md transition-all">
                      {/* Tenant Header */}
                      <div className="bg-secondary/40 p-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-red-500 uppercase italic tracking-wider">EXP-{m.morosidadId.toString().padStart(5, '0')}</span>
                            <Badge variant="outline" className="font-bold text-[10px] py-0 px-2 bg-card/50">{formatDuplex(m.unidad?.codigoUnidad)} - {m.unidad?.nombreCondominio}</Badge>
                            {m.estaDesalojado && (
                              <Badge className="bg-red-500 text-white font-bold text-[9px] py-0 px-2 uppercase">DESALOJADO</Badge>
                            )}
                            <button
                              onClick={() => setConfirmAnular({ 
                                unidadId: m.unidadId, 
                                expCodigo: `EXP-${m.morosidadId.toString().padStart(5, '0')} (${m.inquilino?.razonSocial || "Inquilino"})` 
                              })}
                              className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1 shadow-sm"
                              title="Revertir desalojo o renovación y restablecer como estaba antes"
                            >
                              <RotateCcw className="w-3 h-3" /> Anular Desalojo / Restablecer
                            </button>
                          </div>
                          <h4 className="font-black text-base uppercase mt-1 tracking-tight text-foreground">{m.inquilino?.razonSocial}</h4>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">C.I. / R.U.C.: {m.inquilino?.cedula || "S/D"}</p>
                        </div>
                        <div className="text-right sm:text-right shrink-0">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Pendiente</p>
                          <h3 className="font-black text-xl italic text-red-600">Gs. {m.totalInquilino.toLocaleString()}</h3>
                        </div>
                      </div>

                      {/* Cuotas list */}
                      <div className="p-4 px-6">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-none">
                              <TableHead className="text-[9px] font-black uppercase text-muted-foreground py-2">Mes de Vencimiento</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-muted-foreground py-2 text-center">Nro Cuota</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-muted-foreground py-2 text-right">Monto Cuota</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-muted-foreground py-2 text-right pr-4">Acción de Cobro</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {m.cuotasPendientes.map(c => (
                              <TableRow key={c.cuotaId} className="hover:bg-secondary/20 transition-all border-border/40">
                                <TableCell className="font-bold text-xs uppercase text-foreground py-3">
                                  {c.mesAnio}
                                </TableCell>
                                <TableCell className="text-center font-bold text-xs text-muted-foreground py-3">
                                  Cuota #{c.numeroCuota}
                                </TableCell>
                                <TableCell className="text-right font-black text-xs text-foreground py-3">
                                  Gs. {c.monto.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right py-3 pr-4">
                                  <div className="flex justify-end gap-2 items-center">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleCobrarCuota(c.cuotaId, m)} 
                                      className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase shadow-md shadow-emerald-500/10"
                                    >
                                      Cobrar
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => setSelectedMorosidad(m.morosidadId)}
                                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                                      title="Ver Historial"
                                    >
                                      <History className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))
                )}
              </div>
          </div>
          
          {/* Footer with grand total and close button */}
          <div className="bg-slate-900 p-6 flex flex-col sm:flex-row justify-between items-center text-white border-t border-slate-800 gap-4 rounded-b-[2rem]">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-xl text-white">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total General en Mora</p>
                  <h3 className="text-2xl font-black italic tracking-tighter text-red-500">Gs. {totalGeneral.toLocaleString()}</h3>
                </div>
              </div>
              <DialogClose asChild>
                  <Button variant="ghost" className="rounded-xl font-bold uppercase text-xs text-muted-foreground hover:text-white hover:bg-card/10 px-6 h-11">Cerrar</Button>
              </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CREACIÓN */}
      <Dialog open={isCrearOpen} onOpenChange={setIsCrearOpen}>
          <DialogContent className="sm:max-w-[500px] border-none shadow-xl rounded-[2rem] p-8">
              <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-red-600">Nuevo Expediente de Mora</DialogTitle>
                  <DialogDescription className="text-xs font-bold uppercase">Registra el desalojo y genera las cuotas de recuperación.</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCrearSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase">ID Inquilino (Ex)</Label>
                      <Input value={inquilinoId} onChange={e => setInquilinoId(e.target.value)} required placeholder="Ej: 15" className="bg-secondary border-none h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase">ID Unidad Previa</Label>
                      <Input value={unidadId} onChange={e => setUnidadId(e.target.value)} required placeholder="Ej: 8" className="bg-secondary border-none h-12 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="font-bold text-xs uppercase">Monto Deuda (Gs.)</Label>
                          <Input type="number" value={montoTotal} onChange={e => setMontoTotal(e.target.value)} required placeholder="Ej: 2500000" className="bg-secondary border-none h-12 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                          <Label className="font-bold text-xs uppercase">Cant. Cuotas</Label>
                          <Input type="number" value={cuotas} onChange={e => setCuotas(e.target.value)} required placeholder="Ej: 5" className="bg-secondary border-none h-12 rounded-xl" />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase">Monto Interés x Día (Gs)</Label>
                      <Input type="number" value={interesDiario} onChange={e => setInteresDiario(e.target.value)} required placeholder="0 si no aplica" className="bg-secondary border-none h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase">Observaciones Jurídicas</Label>
                      <Input value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: Pagaré firmado, en gestión judicial" className="bg-secondary border-none h-12 rounded-xl" />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsCrearOpen(false)} className="rounded-xl font-bold uppercase">Cancelar</Button>
                      <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black italic uppercase shadow-xl shadow-red-500/20">Generar Expediente</Button>
                  </div>
              </form>
          </DialogContent>
      </Dialog>

      {/* MODAL DE DETALLE (CUOTAS) */}
      {selectedMorosidad && (
          <MorosidadDetalleModal 
             morosidadId={selectedMorosidad} 
             isOpen={!!selectedMorosidad} 
             onClose={() => { setSelectedMorosidad(null); fetchMorosidades(); }} 
          />
      )}

      {/* RECIBO DE DINERO */}
      <ReciboDineroModal 
        isOpen={isReciboOpen} 
        onClose={() => setIsReciboOpen(false)} 
        reciboData={reciboData} 
      />

      {/* MODAL DE CONFIRMACIÓN PARA ANULAR DESALOJO */}
      <Dialog open={!!confirmAnular} onOpenChange={(open) => !open && setConfirmAnular(null)}>
        <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-[2.5rem] p-8 overflow-hidden bg-card">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-inner">
              <RotateCcw className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-foreground">
                ¿Anular Desalojo / Restablecer?
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground max-w-sm mx-auto">
                Estás por revertir el desalojo o finalización del expediente <span className="text-red-600 font-black">{confirmAnular?.expCodigo}</span>.
              </DialogDescription>
            </div>
            <div className="bg-muted border border-border rounded-2xl p-4 text-left w-full space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2 font-bold text-foreground">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Restablecerá el contrato anterior como <span className="text-emerald-600 font-black">ACTIVO</span>.
              </p>
              <p className="flex items-center gap-2 font-bold text-foreground">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" /> La unidad volverá al estado <span className="text-blue-600 font-black">OCUPADO</span>.
              </p>
              <p className="flex items-center gap-2 font-bold text-foreground">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Se mantendrá intacta la ficha detallada y el historial de pagos tal como estaba antes.
              </p>
            </div>
            <div className="flex w-full gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setConfirmAnular(null)} 
                className="flex-1 rounded-xl font-bold uppercase text-xs h-12 border-border text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={async () => {
                  if (!confirmAnular) return;
                  try {
                    const res = await fetch(`${API_BASE}/api/Contratos/unidad/${confirmAnular.unidadId}/anular-desalojo`, { method: "POST" });
                    if (res.ok) {
                      toast.success("Desalojo anulado y ficha restablecida exitosamente.");
                      setConfirmAnular(null);
                      await fetchMorosidades();
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast.error(err.message || "Error al anular el desalojo");
                    }
                  } catch (e) {
                    toast.error("Error de conexión");
                  }
                }} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black italic uppercase text-xs h-12 shadow-xl shadow-red-500/20"
              >
                Confirmar y Restablecer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
