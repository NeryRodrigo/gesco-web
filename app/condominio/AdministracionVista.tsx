"use client";

import React, { useMemo } from "react";
import { formatDuplex } from "@/lib/utils";
import { 
  Building2, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  User,
  Info,
  Loader2,
  FileSignature,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

interface Pago {
  pagoId: number;
  tipoPago: string;
  mesPagado: number;
  anioPagado: number;
  montoPagado: number;
  saldoPendiente: number;
  mora: number;
}

interface Contrato {
  contratoId: number;
  estaActivo: boolean;
  montoMensualAlquiler: number;
  fechaInicioContrato: string;
  fechaFinContrato: string;
  inquilino: {
    razonSocial: string;
    cedula: string;
    telefono: string;
    email: string;
  };
  pagos: Pago[];
  observaciones?: string;
}

interface Unidad {
  unidadId: number;
  codigoUnidad: string;
  nombreCondominio: string;
  estado: string;
  contratos?: Contrato[];
}

interface AdministracionVistaProps {
  unidades: Unidad[];
  empresaId: number;
  onTenantClick: (unit: Unidad, tenantName: string) => void;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function AdministracionVista({ unidades, empresaId, onTenantClick }: AdministracionVistaProps) {
  const currentYear = 2026; // Podría ser dinámico
  const [isUploading, setIsUploading] = React.useState(false);
  const [isUploadingContratos, setIsUploadingContratos] = React.useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`http://localhost:5034/api/Migration/upload-condominio?empresaId=7`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Migración Exitosa", { description: data.Message });
        // Opcionalmente recargar la página para ver los datos frescos
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await res.json();
        toast.error("Error al migrar", { description: err.detalle || "Error desconocido" });
      }
    } catch (error) {
      toast.error("Fallo de conexión", { description: "No se pudo conectar con OIMA Data Intelligence." });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleMigrarContratos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
        formData.append("files", e.target.files[i]);
    }

    setIsUploadingContratos(true);
    toast.info(`Iniciando migración de ${e.target.files.length} Contratos (PDF)...`, { duration: 3000 });
    
    try {
      const resp = await fetch("http://localhost:5034/api/Migration/upload-contratos?empresaId=" + empresaId, {
        method: "POST",
        body: formData
      });

      if (resp.ok) {
          const data = await resp.json();
          toast.success("Contratos Migrados con Éxito", { 
            description: data.Message
          });
          setTimeout(() => window.location.reload(), 2000);
      } else {
          toast.error("Error al migrar contratos");
      }
    } catch (error: any) {
      console.error("Migration Error:", error);
      toast.error("Fallo de conexión", { description: "Error interno: " + (error?.message || "Revisar consola") });
    } finally {
      setIsUploadingContratos(false);
      e.target.value = '';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);
  };

  // Helper para calcular dinámicamente el monto acordado, abonado y saldo para un mes específico
  const getMonthlyRentAndPayment = React.useCallback((contrato: Contrato | undefined, monthIndex: number) => {
    if (!contrato) return { agreed: 0, paid: 0, balance: 0 };

    const month = monthIndex + 1;
    const pagos = contrato.pagos?.filter(p => p.mesPagado === month && p.anioPagado === currentYear && p.tipoPago === "Alquiler") || [];
    const paid = pagos.reduce((acc, p) => acc + p.montoPagado, 0);

    if (paid > 0) {
      return { agreed: paid, paid, balance: 0 };
    }

    // Si el mes no está cobrado (blank):
    // 1. Encontrar el último mes con cobro en TODO el año
    let overallLastPaidMonthIdx = -1;
    for (let m = 0; m < 12; m++) {
      const mMonth = m + 1;
      const mPagos = contrato.pagos?.filter(p => p.mesPagado === mMonth && p.anioPagado === currentYear && p.tipoPago === "Alquiler") || [];
      const mPaid = mPagos.reduce((acc, p) => acc + p.montoPagado, 0);
      if (mPaid > 0) {
        overallLastPaidMonthIdx = m;
      }
    }

    let agreed = contrato.montoMensualAlquiler;

    // Si este mes está después del último cobro registrado, o no hay ningún cobro:
    // heredamos directamente el monto actual del contrato (que puede haber sido modificado en la ficha)
    if (monthIndex > overallLastPaidMonthIdx) {
      agreed = contrato.montoMensualAlquiler;
    } else {
      // Si está antes del último cobro (un mes intermedio que quedó en blanco),
      // hereda del mes anterior cobrado, o del monto del contrato si no hay ninguno anterior.
      let lastPaidBefore = -1;
      for (let m = 0; m < monthIndex; m++) {
        const mMonth = m + 1;
        const mPagos = contrato.pagos?.filter(p => p.mesPagado === mMonth && p.anioPagado === currentYear && p.tipoPago === "Alquiler") || [];
        const mPaid = mPagos.reduce((acc, p) => acc + p.montoPagado, 0);
        if (mPaid > 0) {
          lastPaidBefore = m;
        }
      }

      if (lastPaidBefore !== -1) {
        const prevPagos = contrato.pagos?.filter(p => p.mesPagado === (lastPaidBefore + 1) && p.anioPagado === currentYear && p.tipoPago === "Alquiler") || [];
        agreed = prevPagos.reduce((acc, p) => acc + p.montoPagado, 0);
      } else {
        agreed = contrato.montoMensualAlquiler;
      }
    }

    return { agreed, paid: 0, balance: agreed };
  }, [currentYear]);

  const groupedData = useMemo(() => {
    const condos = ["Aguz 1", "Aguz 2", "Aguz 3"];
    return condos.map(condoName => {
      const condoUnits = unidades.filter(u => u.nombreCondominio === condoName);
      return {
        name: condoName,
        units: condoUnits
      };
    });
  }, [unidades]);

  // Cálculo de totales por mes
  const monthlyTotals = useMemo(() => {
    const totals = MONTHS.map((_, index) => ({
      month: index + 1,
      acordado: 0,
      abonado: 0,
      saldo: 0
    }));

    unidades.forEach(unit => {
      const activeContrato = unit.contratos?.find(c => c.estaActivo);
      if (activeContrato) {
        const startDate = new Date(activeContrato.fechaInicioContrato);
        const endDate = new Date(activeContrato.fechaFinContrato);

        MONTHS.forEach((_, mIdx) => {
          const dateInMonth = new Date(currentYear, mIdx, 15); // Mediados de mes para comparar

          // Si el contrato está activo este mes
          if (dateInMonth >= startDate && dateInMonth <= endDate) {
            const { agreed, paid, balance } = getMonthlyRentAndPayment(activeContrato, mIdx);
            totals[mIdx].acordado += agreed;
            totals[mIdx].abonado += paid;
            totals[mIdx].saldo += balance;
          }
        });
      }
    });

    return totals;
  }, [unidades, currentYear, getMonthlyRentAndPayment]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header local de la pestaña */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">Planilla de Administración {currentYear}</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Control de cobros mensuales y saldos pendientes</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="h-10 px-4 rounded-xl border-border font-bold text-[10px] uppercase hover:bg-muted">
             <Download className="w-4 h-4 mr-2" /> PDF
           </Button>
           <div className="relative flex gap-2">
             {/* Migrar Condominio Excel */}
             <input 
               type="file" 
               accept=".xlsx" 
               className="hidden" 
               id="excel-upload" 
               onChange={handleFileUpload} 
               disabled={isUploading || isUploadingContratos} 
             />
             <Button 
               variant="outline" 
               className="h-10 px-4 rounded-xl border-border font-bold text-[10px] uppercase hover:bg-muted"
               onClick={() => document.getElementById('excel-upload')?.click()}
               disabled={isUploading || isUploadingContratos}
             >
               {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
               {isUploading ? "Procesando..." : "MIGRAR EXCEL"}
             </Button>

             <input 
               type="file" 
               accept=".pdf" 
               multiple
               className="hidden" 
               id="contrato-upload" 
               onChange={handleMigrarContratos} 
               disabled={isUploading || isUploadingContratos} 
             />
             <Button 
               variant="outline" 
               className="h-10 px-4 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 font-bold text-[10px] uppercase hover:bg-emerald-100"
               onClick={() => document.getElementById('contrato-upload')?.click()}
               disabled={isUploading || isUploadingContratos}
             >
               {isUploadingContratos ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="w-4 h-4 mr-2" />}
               {isUploadingContratos ? "Procesando..." : "MIGRAR CONTRATOS (PDF)"}
             </Button>
           </div>
           <Button className="h-10 px-4 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase hover:bg-slate-800 shadow-lg shadow-slate-200">
             <Printer className="w-4 h-4 mr-2" /> IMPRIMIR PLANILLA
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2rem] bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="sticky left-0 z-20 bg-slate-900 p-6 text-left min-w-[250px] border-r border-slate-800">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[11px] font-black uppercase tracking-widest italic">Inquilino / Unidad</span>
                    </div>
                  </th>
                  <th className="p-6 text-center border-r border-slate-800 min-w-[80px]">
                    <span className="text-[11px] font-black uppercase tracking-widest italic">Duplex</span>
                  </th>
                  {MONTHS.map(month => (
                    <th key={month} className="p-6 text-center min-w-[140px] border-r border-slate-800 bg-slate-900/90">
                      <span className="text-[11px] font-black uppercase tracking-widest italic">{month}</span>
                    </th>
                  ))}
                  <th className="p-6 text-center min-w-[150px] bg-slate-800">
                    <span className="text-[11px] font-black uppercase tracking-widest italic">Observaciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedData.map((condo) => (
                  <React.Fragment key={condo.name}>
                    {/* Fila separadora de Condominio */}
                    <tr className="bg-emerald-50/50">
                      <td colSpan={MONTHS.length + 3} className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-black italic uppercase text-emerald-700 tracking-tighter">{condo.name}</span>
                          <div className="h-[1px] flex-1 bg-emerald-100 ml-4"></div>
                        </div>
                      </td>
                    </tr>
                    
                    {condo.units.map((unit) => {
                      const contrato = unit.contratos?.find(c => c.estaActivo);
                      const inquilino = contrato?.inquilino?.razonSocial || "DISPONIBLE";
                      const isAvailable = !contrato;

                      return (
                        <tr key={unit.unidadId} className="hover:bg-muted/80 transition-colors group">
                          <td 
                            className="sticky left-0 z-10 bg-card group-hover:bg-muted transition-colors p-5 border-r border-border shadow-[2px_0_10px_rgba(0,0,0,0.02)]"
                            onDoubleClick={() => !isAvailable && onTenantClick(unit, inquilino)}
                          >
                            <div className={`flex flex-col ${isAvailable ? 'opacity-30' : 'cursor-pointer'}`}>
                              <span className="text-[12px] font-black uppercase text-foreground leading-tight italic truncate max-w-[200px]">
                                {inquilino}
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                {unit.nombreCondominio} - {formatDuplex(unit.codigoUnidad)}
                              </span>
                            </div>
                          </td>
                          <td className="p-5 text-center border-r border-border">
                             <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black italic text-sm border-2 
                               ${isAvailable ? 'bg-muted border-border text-muted-foreground' : 'bg-primary/5 border-primary/10 text-primary'}`}>
                               {formatDuplex(unit.codigoUnidad).replace('Dúplex ', '')}
                             </div>
                          </td>
                          
                          {MONTHS.map((_, mIdx) => {
                            const { agreed, paid, balance } = getMonthlyRentAndPayment(contrato, mIdx);
                             
                            // Verificar si el contrato estaba activo en este mes
                            const startDate = contrato ? new Date(contrato.fechaInicioContrato) : null;
                            const endDate = contrato ? new Date(contrato.fechaFinContrato) : null;
                            const dateInMonth = new Date(currentYear, mIdx, 15);
                            const isActiveInMonth = startDate && endDate && dateInMonth >= startDate && dateInMonth <= endDate;

                            if (!isActiveInMonth) {
                              return (
                                <td key={mIdx} className="p-4 border-r border-border bg-muted/30">
                                  <div className="h-10"></div>
                                </td>
                              );
                            }

                            return (
                              <td key={mIdx} className="p-4 border-r border-border">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="space-y-1.5 cursor-help">
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                          <span className="text-muted-foreground">ACOR.</span>
                                          <span className="text-foreground italic">{formatCurrency(agreed).replace('GS. ', '')}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                          <span className="text-emerald-500">ABON.</span>
                                          <span className="text-emerald-600 italic">{paid > 0 ? formatCurrency(paid).replace('GS. ', '') : "0"}</span>
                                        </div>
                                        <div className={`flex justify-between items-center text-[11px] font-black border-t pt-1 ${balance > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                          <span className="text-[8px] opacity-50 uppercase tracking-tighter">SALDO</span>
                                          <span className="italic">{balance > 0 ? formatCurrency(balance).replace('GS. ', '') : "Saldado"}</span>
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-900 text-white border-none p-4 rounded-2xl shadow-2xl">
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground">Detalle de Cobro - {MONTHS[mIdx]}</p>
                                        <div className="flex justify-between gap-8">
                                          <span className="text-sm font-bold">Monto Acordado:</span>
                                          <span className="text-sm font-black italic">{formatCurrency(agreed)}</span>
                                        </div>
                                        <div className="flex justify-between gap-8">
                                          <span className="text-sm font-bold text-emerald-400">Total Abonado:</span>
                                          <span className="text-sm font-black italic text-emerald-400">{formatCurrency(paid)}</span>
                                        </div>
                                        <div className="h-[1px] bg-card/10"></div>
                                        <div className="flex justify-between gap-8">
                                          <span className="text-sm font-bold text-red-400">Saldo Pendiente:</span>
                                          <span className="text-sm font-black italic text-red-400">{formatCurrency(balance)}</span>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </td>
                            );
                          })}

                          <td className="p-5 border-r border-border">
                             <div className="text-[9px] font-bold text-muted-foreground line-clamp-3 uppercase leading-relaxed italic">
                               {contrato?.observaciones || "-"}
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              
              {/* Footer de Totales */}
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  <th colSpan={2} className="sticky left-0 z-20 bg-slate-900 p-8 text-left border-r border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic mb-1">Totalización Mensual</span>
                      <span className="text-2xl font-black italic uppercase tracking-tighter">Resumen Global</span>
                    </div>
                  </th>
                  {monthlyTotals.map((total, idx) => (
                    <th key={idx} className="p-6 border-r border-slate-800 bg-slate-900/95">
                      <div className="space-y-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Acordado</span>
                          <span className="text-[12px] font-black italic text-muted-foreground">{formatCurrency(total.acordado).replace('GS. ', '')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-emerald-500">Abonado</span>
                          <span className="text-[12px] font-black italic text-emerald-400">{formatCurrency(total.abonado).replace('GS. ', '')}</span>
                        </div>
                        <div className="flex flex-col items-center bg-card/5 rounded-xl py-2 px-1">
                          <span className="text-[7px] font-black uppercase tracking-widest text-red-400">Saldo</span>
                          <span className="text-[14px] font-black italic text-red-500">{formatCurrency(total.saldo).replace('GS. ', '')}</span>
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="bg-slate-900"></th>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Leyenda y Notas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex gap-4">
           <div className="bg-blue-600 p-3 rounded-2xl h-fit text-white">
              <Info className="w-6 h-6" />
           </div>
           <div>
             <h4 className="font-black italic uppercase text-blue-900 text-sm tracking-tighter">Información del Panel</h4>
             <p className="text-[11px] font-bold text-blue-700/70 leading-relaxed mt-1">
               Esta planilla muestra únicamente los montos correspondientes al concepto de "Alquiler". Los servicios (luz, agua) se gestionan individualmente en la ficha de cada inquilino.
             </p>
           </div>
        </div>
        <div className="bg-muted p-6 rounded-3xl border border-border">
           <h4 className="font-black italic uppercase text-foreground text-[10px] tracking-widest mb-3">Acciones Rápidas</h4>
           <div className="flex flex-wrap gap-2">
             <Badge className="bg-card text-muted-foreground border-border px-3 py-1 font-black italic text-[9px] uppercase cursor-pointer hover:bg-muted">Doble Click: Ver Ficha</Badge>
             <Badge className="bg-card text-muted-foreground border-border px-3 py-1 font-black italic text-[9px] uppercase cursor-pointer hover:bg-muted">Hover: Detalle de Pago</Badge>
           </div>
        </div>
        <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
           <h4 className="font-black italic uppercase text-emerald-900 text-[10px] tracking-widest mb-2">Estado de Recaudación</h4>
           <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 w-full bg-emerald-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 w-[75%]" />
                </div>
              </div>
              <span className="text-xl font-black italic text-emerald-700">75%</span>
           </div>
           <p className="text-[9px] font-bold text-emerald-600 uppercase mt-2 italic">Objetivo de recaudación anual en curso</p>
        </div>
      </div>
    </div>
  );
}

