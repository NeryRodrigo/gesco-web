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
  FileText,
  AlertCircle
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
  const currentYear = 2026; 
  const today = new Date();
  const currentMonthIdx = today.getFullYear() > currentYear ? 11 : today.getMonth();
  const visibleMonths = MONTHS.slice(0, currentMonthIdx + 1);

  const [isUploading, setIsUploading] = React.useState(false);
  const [isUploadingContratos, setIsUploadingContratos] = React.useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);
  };

  const getMonthlyRentAndPayment = React.useCallback((contrato: Contrato | undefined, monthIndex: number) => {
    if (!contrato) return { agreed: 0, paid: 0, balance: 0 };
    const month = monthIndex + 1;
    const pagos = contrato.pagos?.filter(p => p.mesPagado === month && p.anioPagado === currentYear && p.tipoPago === "Alquiler") || [];
    const paid = pagos.reduce((acc, p) => acc + p.montoPagado, 0);
    if (paid > 0) return { agreed: paid, paid, balance: 0 };

    let overallLastPaidMonthIdx = -1;
    for (let m = 0; m < 12; m++) {
      const mPagos = contrato.pagos?.filter(p => p.mesPagado === (m+1) && p.anioPagado === currentYear && p.tipoPago === "Alquiler") || [];
      if (mPagos.reduce((acc, p) => acc + p.montoPagado, 0) > 0) overallLastPaidMonthIdx = m;
    }

    let agreed = contrato.montoMensualAlquiler;
    if (monthIndex <= overallLastPaidMonthIdx) {
      let lastPaidBefore = -1;
      for (let m = 0; m < monthIndex; m++) {
        const mPaid = (contrato.pagos?.filter(p => p.mesPagado === (m+1) && p.anioPagado === currentYear && p.tipoPago === "Alquiler") || []).reduce((acc, p) => acc + p.montoPagado, 0);
        if (mPaid > 0) lastPaidBefore = m;
      }
      if (lastPaidBefore !== -1) {
        agreed = (contrato.pagos?.filter(p => p.mesPagado === (lastPaidBefore + 1) && p.anioPagado === currentYear && p.tipoPago === "Alquiler") || []).reduce((acc, p) => acc + p.montoPagado, 0);
      }
    }
    return { agreed, paid: 0, balance: agreed };
  }, [currentYear]);

  const groupedData = useMemo(() => {
    const condos = ["Aguz 1", "Aguz 2", "Aguz 3"];
    return condos.map(condoName => ({
      name: condoName,
      units: unidades.filter(u => u.nombreCondominio === condoName)
    }));
  }, [unidades]);

  const monthlyTotals = useMemo(() => {
    const totals = visibleMonths.map((_, index) => ({
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
        visibleMonths.forEach((_, mIdx) => {
          const dateInMonth = new Date(currentYear, mIdx, 15);
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
  }, [unidades, currentYear, getMonthlyRentAndPayment, visibleMonths]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Planilla de Administración {currentYear}</h2>
          <div className="flex items-center gap-2 mt-1">
             <Badge className="bg-primary text-white font-black px-2 py-0.5 text-[9px] uppercase">Corte: {MONTHS[currentMonthIdx]}</Badge>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Control de cobros y saldos acumulados</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="h-10 px-4 rounded-xl border-border font-bold text-[10px] uppercase hover:bg-muted"><Download className="w-4 h-4 mr-2" /> PDF</Button>
           <Button className="h-10 px-4 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase hover:bg-slate-800 shadow-lg shadow-slate-200"><Printer className="w-4 h-4 mr-2" /> IMPRIMIR</Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2rem] bg-[#0C1327] overflow-hidden">
        <CardContent className="p-0">
          {/* Un solo scroll horizontal (el padre en page.tsx también scrollea al achicar) */}
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="min-w-[1500px] w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {/* Columna Sticky (Pegajosa) a la izquierda */}
                  <th className="sticky left-0 z-30 bg-slate-900 p-4 sm:p-6 text-left min-w-[220px] w-[220px] border-r border-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)] align-middle">
                    <span className="text-[11px] font-black uppercase tracking-widest italic">Inquilino / Unidad</span>
                  </th>
                  <th className="p-4 sm:p-6 text-center border-r border-slate-800 min-w-[80px] w-[80px] align-middle">
                    <span className="text-[11px] font-black uppercase tracking-widest italic">Duplex</span>
                  </th>
                  {visibleMonths.map(month => (
                    <th key={month} className="p-4 sm:p-6 text-center min-w-[130px] w-[130px] border-r border-slate-800 bg-slate-900/90 align-middle">
                      <span className="text-[11px] font-black uppercase tracking-widest italic">{month}</span>
                    </th>
                  ))}
                  <th className="p-4 sm:p-6 text-center min-w-[150px] w-[150px] bg-red-900/40 border-l border-slate-800 align-middle">
                    <span className="text-[11px] font-black uppercase tracking-widest italic text-red-200">Deuda Total</span>
                  </th>
                  <th className="p-4 sm:p-6 text-center min-w-[150px] w-[150px] bg-slate-800 align-middle">
                    <span className="text-[11px] font-black uppercase tracking-widest italic">Observaciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {groupedData.map((condo) => (
                  <React.Fragment key={condo.name}>
                    <tr className="bg-emerald-500/10">
                      {/* Sin sticky en colspan: evitaba cabeceras “subidas” / recortadas */}
                      <td colSpan={visibleMonths.length + 4} className="px-6 py-3.5 align-middle">
                        <div className="flex items-center gap-3 min-h-[28px]">
                          <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <span className="text-sm font-black italic uppercase text-emerald-400 tracking-tighter">{condo.name}</span>
                          <div className="h-[1px] flex-1 bg-emerald-500/20 ml-4"></div>
                        </div>
                      </td>
                    </tr>
                    
                    {condo.units.map((unit) => {
                      const contrato = unit.contratos?.find(c => c.estaActivo);
                      const inquilino = contrato?.inquilino?.razonSocial || "DISPONIBLE";
                      const isAvailable = !contrato;
                      let rowTotalBalance = 0;

                      return (
                        <tr key={unit.unidadId} className="hover:bg-white/5 transition-colors group">
                          {/* Celda Sticky del Inquilino */}
                          <td 
                            className="sticky left-0 z-20 bg-[#0C1327] group-hover:bg-slate-800 transition-colors p-4 sm:p-5 border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.3)] align-middle" 
                            onDoubleClick={() => !isAvailable && onTenantClick(unit, inquilino)}
                          >
                            <div className={`flex flex-col gap-0.5 justify-center ${isAvailable ? 'opacity-30' : 'cursor-pointer'}`}>
                              <span className="text-[12px] font-black uppercase text-white leading-snug italic truncate max-w-[180px]">{inquilino}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-snug">{unit.nombreCondominio} - {formatDuplex(unit.codigoUnidad)}</span>
                            </div>
                          </td>
                          <td className="p-4 sm:p-5 text-center border-r border-white/10 text-[13px] font-black italic text-blue-400 align-middle">
                            {formatDuplex(unit.codigoUnidad).replace('Dúplex ', '')}
                          </td>
                          
                          {visibleMonths.map((_, mIdx) => {
                            const { agreed, paid, balance } = getMonthlyRentAndPayment(contrato, mIdx);
                            const startDate = contrato ? new Date(contrato.fechaInicioContrato) : null;
                            const endDate = contrato ? new Date(contrato.fechaFinContrato) : null;
                            const dateInMonth = new Date(currentYear, mIdx, 15);
                            const isActiveInMonth = startDate && endDate && dateInMonth >= startDate && dateInMonth <= endDate;

                            if (isActiveInMonth) rowTotalBalance += balance;

                            return (
                              <td key={mIdx} className={`p-3 sm:p-4 border-r border-white/10 align-middle ${!isActiveInMonth ? 'bg-white/5' : ''}`}>
                                {isActiveInMonth ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="space-y-1.5 cursor-help py-0.5">
                                          <div className="flex justify-between items-center text-[9px] font-bold gap-1">
                                            <span className="text-slate-400 shrink-0">ACO.</span>
                                            <span className="text-white tabular-nums">{formatCurrency(agreed).replace('GS. ', '')}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-[9px] font-bold gap-1">
                                            <span className="text-emerald-400 shrink-0">ABO.</span>
                                            <span className="text-emerald-500 tabular-nums">{paid > 0 ? formatCurrency(paid).replace('GS. ', '') : "0"}</span>
                                          </div>
                                          <div className={`flex justify-between items-center text-[10px] font-black border-t border-white/10 pt-1.5 gap-1 ${balance > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                            <span className="text-[7px] opacity-50 uppercase shrink-0">SALDO</span>
                                            <span className="tabular-nums">{balance > 0 ? formatCurrency(balance).replace('GS. ', '') : "OK"}</span>
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white p-3 rounded-xl border border-white/10">
                                          <p className="text-[10px] font-black uppercase mb-1">{MONTHS[mIdx]} {currentYear}</p>
                                          <p className="text-xs">Saldo: {formatCurrency(balance)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : <div className="h-10"></div>}
                              </td>
                            );
                          })}

                          <td className="p-4 sm:p-5 border-r border-white/10 bg-red-500/5 text-center align-middle">
                            <span className={`text-sm font-black italic ${rowTotalBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {rowTotalBalance > 0 ? formatCurrency(rowTotalBalance).replace('GS. ', '') : "0"}
                            </span>
                          </td>

                          <td className="p-4 sm:p-5 border-r border-white/10 align-middle">
                             <div className="text-[9px] font-bold text-slate-400 line-clamp-2 uppercase italic">{contrato?.observaciones || "-"}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  {/* Footer Sticky */}
                  <th colSpan={2} className="sticky left-0 z-30 bg-slate-900 p-8 text-left border-r border-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Totales hasta {MONTHS[currentMonthIdx]}</span>
                  </th>
                  {monthlyTotals.map((total, idx) => (
                    <th key={idx} className="p-4 border-r border-slate-800 bg-slate-900/95">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[7px] font-black uppercase text-slate-500">Abonado</span>
                        <span className="text-[11px] font-black italic text-emerald-400">{formatCurrency(total.abonado).replace('GS. ', '')}</span>
                        <span className="text-[7px] font-black uppercase text-red-400 mt-1">Saldo</span>
                        <span className="text-[12px] font-black italic text-red-500">{formatCurrency(total.saldo).replace('GS. ', '')}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-4 bg-red-900/20 text-center border-l border-slate-800">
                     <span className="text-[7px] font-black uppercase text-red-300 block mb-1">Total Saldo</span>
                     <span className="text-[15px] font-black italic text-red-400">
                        {formatCurrency(monthlyTotals.reduce((a, b) => a + b.saldo, 0)).replace('GS. ', '')}
                     </span>
                  </th>
                  <th className="bg-slate-900"></th>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
