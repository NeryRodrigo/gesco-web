"use client";

import React, { useMemo, memo } from "react";
import { formatDuplex, displayCondoName } from "@/lib/utils";
import { Building2, Printer } from "lucide-react";
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
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

const pyFmt = new Intl.NumberFormat("es-PY", {
  style: "currency",
  currency: "PYG",
  maximumFractionDigits: 0,
});

const formatCurrency = (val: number) => pyFmt.format(val);
const formatGs = (val: number) => formatCurrency(val).replace(/GS\.?\s?/i, "");

type MonthCell = {
  active: boolean;
  agreed: number;
  paid: number;
  balance: number;
};

type RowModel = {
  unit: Unidad;
  inquilino: string;
  isAvailable: boolean;
  duplexLabel: string;
  months: MonthCell[];
  totalBalance: number;
  observaciones: string;
};

function buildMonthCells(contrato: Contrato | undefined, year: number, monthCount: number): MonthCell[] {
  const cells: MonthCell[] = Array.from({ length: monthCount }, () => ({
    active: false,
    agreed: 0,
    paid: 0,
    balance: 0,
  }));

  if (!contrato) return cells;

  const startDate = new Date(contrato.fechaInicioContrato);
  const endDate = new Date(contrato.fechaFinContrato);
  const paidByMonth = new Array(12).fill(0);

  for (const p of contrato.pagos || []) {
    if (p.anioPagado !== year || p.tipoPago !== "Alquiler") continue;
    const idx = (p.mesPagado || 0) - 1;
    if (idx >= 0 && idx < 12) paidByMonth[idx] += p.montoPagado || 0;
  }

  let overallLastPaidMonthIdx = -1;
  for (let m = 0; m < 12; m++) {
    if (paidByMonth[m] > 0) overallLastPaidMonthIdx = m;
  }

  for (let mIdx = 0; mIdx < monthCount; mIdx++) {
    const dateInMonth = new Date(year, mIdx, 15);
    const active = dateInMonth >= startDate && dateInMonth <= endDate;
    if (!active) continue;

    const paid = paidByMonth[mIdx];
    if (paid > 0) {
      cells[mIdx] = { active: true, agreed: paid, paid, balance: 0 };
      continue;
    }

    let agreed = contrato.montoMensualAlquiler;
    if (mIdx <= overallLastPaidMonthIdx) {
      let lastPaidBefore = -1;
      for (let m = 0; m < mIdx; m++) {
        if (paidByMonth[m] > 0) lastPaidBefore = m;
      }
      if (lastPaidBefore !== -1) agreed = paidByMonth[lastPaidBefore];
    }
    cells[mIdx] = { active: true, agreed, paid: 0, balance: agreed };
  }

  return cells;
}

const MonthCellView = memo(function MonthCellView({
  cell,
  monthLabel,
  year,
}: {
  cell: MonthCell;
  monthLabel: string;
  year: number;
}) {
  if (!cell.active) {
    return <td className="p-3 sm:p-4 border-r border-white/10 align-middle bg-white/[0.03]"><div className="h-10" /></td>;
  }

  return (
    <td className="p-3 sm:p-4 border-r border-white/10 align-middle">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1.5 cursor-help py-0.5 contain-layout">
            <div className="flex justify-between items-center text-[9px] font-bold gap-1">
              <span className="text-slate-400 shrink-0">ACO.</span>
              <span className="text-white tabular-nums">{formatGs(cell.agreed)}</span>
            </div>
            <div className="flex justify-between items-center text-[9px] font-bold gap-1">
              <span className="text-emerald-400 shrink-0">ABO.</span>
              <span className="text-emerald-500 tabular-nums">{cell.paid > 0 ? formatGs(cell.paid) : "0"}</span>
            </div>
            <div
              className={`flex justify-between items-center text-[10px] font-black border-t border-white/10 pt-1.5 gap-1 ${
                cell.balance > 0 ? "text-red-400" : "text-blue-400"
              }`}
            >
              <span className="text-[7px] opacity-50 uppercase shrink-0">SALDO</span>
              <span className="tabular-nums">{cell.balance > 0 ? formatGs(cell.balance) : "OK"}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white p-3 rounded-xl border border-white/10">
          <p className="text-[10px] font-black uppercase mb-1">
            {monthLabel} {year}
          </p>
          <p className="text-xs">Saldo: {formatCurrency(cell.balance)}</p>
        </TooltipContent>
      </Tooltip>
    </td>
  );
});

const UnitRow = memo(function UnitRow({
  row,
  visibleMonths,
  year,
  onTenantClick,
}: {
  row: RowModel;
  visibleMonths: readonly string[];
  year: number;
  onTenantClick: (unit: Unidad, tenantName: string) => void;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.04]">
      <td
        className="sticky left-0 z-20 bg-[#0C1327] p-4 sm:p-5 border-r border-white/10 shadow-[2px_0_8px_rgba(0,0,0,0.25)] align-middle"
        onDoubleClick={() => !row.isAvailable && onTenantClick(row.unit, row.inquilino)}
      >
        <div className={`flex flex-col gap-0.5 justify-center ${row.isAvailable ? "opacity-30" : "cursor-pointer"}`}>
          <span className="text-[12px] font-black uppercase text-white leading-snug italic break-words max-w-[140px] sm:max-w-[200px] lg:max-w-[260px]">
            {row.inquilino}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-snug">
            {displayCondoName(row.unit.nombreCondominio)} - {row.duplexLabel}
          </span>
        </div>
      </td>
      <td className="p-4 sm:p-5 text-center border-r border-white/10 text-[13px] font-black italic text-blue-400 align-middle">
        {row.duplexLabel.replace("Dúplex ", "")}
      </td>
      {row.months.map((cell, mIdx) => (
        <MonthCellView key={mIdx} cell={cell} monthLabel={visibleMonths[mIdx]} year={year} />
      ))}
      <td className="p-4 sm:p-5 border-r border-white/10 bg-red-500/5 text-center align-middle">
        <span className={`text-sm font-black italic ${row.totalBalance > 0 ? "text-red-400" : "text-emerald-400"}`}>
          {row.totalBalance > 0 ? formatGs(row.totalBalance) : "0"}
        </span>
      </td>
      <td className="p-4 sm:p-5 border-r border-white/10 align-middle">
        <div className="text-[9px] font-bold text-slate-400 line-clamp-2 uppercase italic">
          {row.observaciones || "-"}
        </div>
      </td>
    </tr>
  );
});

export function AdministracionVista({ unidades, onTenantClick }: AdministracionVistaProps) {
  const currentYear = 2026;
  const today = useMemo(() => new Date(), []);
  const currentMonthIdx = today.getFullYear() > currentYear ? 11 : today.getMonth();
  const visibleMonths = useMemo(
    () => MONTHS.slice(0, currentMonthIdx + 1),
    [currentMonthIdx]
  );
  const monthCount = visibleMonths.length;

  const groupedRows = useMemo(() => {
    const condos = ["Aguz 1", "Aguz 2", "Aguz 3"];
    return condos.map((condoName) => {
      const units = unidades.filter((u) => u.nombreCondominio === condoName);
      const rows: RowModel[] = units.map((unit) => {
        const contrato = unit.contratos?.find((c) => c.estaActivo);
        const months = buildMonthCells(contrato, currentYear, monthCount);
        const totalBalance = months.reduce((acc, c) => acc + (c.active ? c.balance : 0), 0);
        return {
          unit,
          inquilino: contrato?.inquilino?.razonSocial || "DISPONIBLE",
          isAvailable: !contrato,
          duplexLabel: formatDuplex(unit.codigoUnidad),
          months,
          totalBalance,
          observaciones: contrato?.observaciones || "",
        };
      });
      return { name: condoName, rows };
    });
  }, [unidades, currentYear, monthCount]);

  const monthlyTotals = useMemo(() => {
    const totals = Array.from({ length: monthCount }, (_, index) => ({
      month: index + 1,
      acordado: 0,
      abonado: 0,
      saldo: 0,
    }));

    for (const condo of groupedRows) {
      for (const row of condo.rows) {
        row.months.forEach((cell, mIdx) => {
          if (!cell.active) return;
          totals[mIdx].acordado += cell.agreed;
          totals[mIdx].abonado += cell.paid;
          totals[mIdx].saldo += cell.balance;
        });
      }
    }
    return totals;
  }, [groupedRows, monthCount]);

  const totalSaldoGeneral = useMemo(
    () => monthlyTotals.reduce((a, b) => a + b.saldo, 0),
    [monthlyTotals]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white">
            Planilla de Administración {currentYear}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className="bg-primary text-white font-black px-2 py-0.5 text-[9px] uppercase">
              Corte: {MONTHS[currentMonthIdx]}
            </Badge>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Control de cobros y saldos acumulados
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            type="button"
            onClick={() => window.print()}
            className="h-10 flex-1 md:flex-none px-4 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase hover:bg-slate-800"
          >
            <Printer className="w-4 h-4 mr-2" /> IMPRIMIR
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[1.5rem] sm:rounded-[2rem] bg-[#0C1327] overflow-hidden admin-planilla-print-root">
        <CardContent className="p-0">
          {/*
            Móvil: un solo contenedor con overflow-auto (X e Y) — iOS/Android no pelean el gesto.
            Desktop: scroll horizontal; la página hace el vertical.
            NO usar touch-pan-x: bloquea el deslizamiento vertical en celulares.
          */}
          <div
            className="admin-planilla-scroll admin-planilla-print w-full max-w-full custom-scrollbar overflow-auto max-h-[min(78dvh,calc(100dvh-10.5rem))] sm:max-h-none sm:overflow-x-auto sm:overflow-y-visible"
            data-mobile-scroll="xy"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <TooltipProvider delayDuration={400} skipDelayDuration={0}>
              <table className="min-w-[1500px] w-full border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="sticky top-0 left-0 z-40 bg-slate-900 p-4 sm:p-6 text-left min-w-[220px] w-[220px] border-r border-slate-800 shadow-[2px_0_8px_rgba(0,0,0,0.4)] align-middle">
                      <span className="text-[11px] font-black uppercase tracking-widest italic">
                        Inquilino / Unidad
                      </span>
                    </th>
                    <th className="sticky top-0 z-30 bg-slate-900 p-4 sm:p-6 text-center border-r border-slate-800 min-w-[80px] w-[80px] align-middle">
                      <span className="text-[11px] font-black uppercase tracking-widest italic">Duplex</span>
                    </th>
                    {visibleMonths.map((month) => (
                      <th
                        key={month}
                        className="sticky top-0 z-30 p-4 sm:p-6 text-center min-w-[130px] w-[130px] border-r border-slate-800 bg-slate-900 align-middle"
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest italic">{month}</span>
                      </th>
                    ))}
                    <th className="sticky top-0 z-30 p-4 sm:p-6 text-center min-w-[150px] w-[150px] bg-red-900/40 border-l border-slate-800 align-middle">
                      <span className="text-[11px] font-black uppercase tracking-widest italic text-red-200">
                        Deuda Total
                      </span>
                    </th>
                    <th className="sticky top-0 z-30 p-4 sm:p-6 text-center min-w-[150px] w-[150px] bg-slate-800 align-middle">
                      <span className="text-[11px] font-black uppercase tracking-widest italic">Observaciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((condo) => (
                    <React.Fragment key={condo.name}>
                      <tr className="bg-emerald-500/10">
                        <td colSpan={monthCount + 4} className="px-6 py-3.5 align-middle">
                          <div className="flex items-center gap-3 min-h-[28px]">
                            <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span className="text-sm font-black italic uppercase text-emerald-400 tracking-tighter">
                              {displayCondoName(condo.name)}
                            </span>
                            <div className="h-px flex-1 bg-emerald-500/20 ml-4" />
                          </div>
                        </td>
                      </tr>
                      {condo.rows.map((row) => (
                        <UnitRow
                          key={row.unit.unidadId}
                          row={row}
                          visibleMonths={visibleMonths}
                          year={currentYear}
                          onTenantClick={onTenantClick}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <th
                      colSpan={2}
                      className="sticky left-0 z-30 bg-slate-900 p-6 sm:p-8 text-left border-r border-slate-800 shadow-[2px_0_8px_rgba(0,0,0,0.4)]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                        Totales hasta {MONTHS[currentMonthIdx]}
                      </span>
                    </th>
                    {monthlyTotals.map((total, idx) => (
                      <th key={idx} className="p-4 border-r border-slate-800 bg-slate-900">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[7px] font-black uppercase text-slate-500">Abonado</span>
                          <span className="text-[11px] font-black italic text-emerald-400">
                            {formatGs(total.abonado)}
                          </span>
                          <span className="text-[7px] font-black uppercase text-red-400 mt-1">Saldo</span>
                          <span className="text-[12px] font-black italic text-red-500">
                            {formatGs(total.saldo)}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="p-4 bg-red-900/20 text-center border-l border-slate-800">
                      <span className="text-[7px] font-black uppercase text-red-300 block mb-1">Total Saldo</span>
                      <span className="text-[15px] font-black italic text-red-400">
                        {formatGs(totalSaldoGeneral)}
                      </span>
                    </th>
                    <th className="bg-slate-900" />
                  </tr>
                </tfoot>
              </table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
