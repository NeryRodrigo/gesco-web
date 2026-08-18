"use client";


import React from "react";
import { PrintPortal } from "@/components/ui/print-portal";

export type HistorialPagoPrintRow = {
  fechaVencimiento: string;
  concepto: string;
  periodo: string;
  monto: number;
  pagado: number;
  estado: string;
  metodo?: string;
};

export type HistorialPagosPrintData = {
  fechaEmision: string;
  condominio: string;
  duplex: string;
  filtroPagoDesde?: string;
  filtroPagoHasta?: string;
  filtroContratoDesde?: string;
  filtroContratoHasta?: string;
  inquilino: {
    nombre: string;
    cedula: string;
    telefono: string;
    correo: string;
    contratoInicio: string;
    contratoFin: string;
    alquiler: number;
  };
  filas: HistorialPagoPrintRow[];
};

const fmtGs = (n: number) =>
  new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(n || 0);

export function HistorialPagosImprimible({ data }: { data: HistorialPagosPrintData }) {
  const totalCuotas = data.filas.reduce((a, r) => a + (r.monto || 0), 0);
  const totalPagado = data.filas.reduce((a, r) => a + (r.pagado || 0), 0);

  return (
    <PrintPortal>
      <div
        className="historial-pagos-print bg-white text-[#0f172a] font-sans text-[11px] leading-relaxed p-8 max-w-[210mm] mx-auto"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <header className="flex items-start justify-between gap-6 border-b border-[#e2e8f0] pb-5 mb-5">
          <div className="flex items-start gap-4">
            <div
              className="w-[72px] h-[72px] rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#080E1E" }}
            >
              <img src="/fontanas.png" alt="Fontana" className="w-14 h-14 object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3b82f6] m-0 mb-2">
                Historial de pagos
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                <div>
                  <span className="text-[#64748b]">Emisión:</span> <strong>{data.fechaEmision}</strong>
                </div>
                <div>
                  <span className="text-[#64748b]">Condominio:</span> <strong>{data.condominio}</strong>
                </div>
                <div>
                  <span className="text-[#64748b]">Dúplex:</span> <strong>{data.duplex}</strong>
                </div>
                <div>
                  <span className="text-[#64748b]">Inquilino:</span>{" "}
                  <strong className="uppercase">{data.inquilino.nombre}</strong>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 mb-5 break-inside-avoid">
          <h2 className="text-[12px] font-black uppercase tracking-[0.1em] text-[#0f172a] m-0 mb-3">
            Datos del inquilino
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <p className="m-0">
              <span className="text-[#64748b]">Documento:</span> <strong>{data.inquilino.cedula}</strong>
            </p>
            <p className="m-0">
              <span className="text-[#64748b]">Teléfono:</span> <strong>{data.inquilino.telefono}</strong>
            </p>
            <p className="m-0">
              <span className="text-[#64748b]">Correo:</span> <strong>{data.inquilino.correo}</strong>
            </p>
            <p className="m-0">
              <span className="text-[#64748b]">Alquiler:</span>{" "}
              <strong>{fmtGs(data.inquilino.alquiler)}</strong>
            </p>
            <p className="m-0 col-span-2">
              <span className="text-[#64748b]">Vigencia contrato:</span>{" "}
              <strong>
                {data.inquilino.contratoInicio} — {data.inquilino.contratoFin}
              </strong>
            </p>
          </div>
        </section>

        <section className="mb-4 text-[10px] text-[#64748b]">
          <p className="m-0">
            <strong className="text-[#0f172a]">Filtros aplicados:</strong>{" "}
            Pago {data.filtroPagoDesde || "—"} → {data.filtroPagoHasta || "—"}
            {" · "}
            Contrato {data.filtroContratoDesde || "—"} → {data.filtroContratoHasta || "—"}
          </p>
        </section>

        <section className="break-inside-avoid">
          <div className="border-b-2 border-[#0f172a] pb-1.5 mb-3">
            <h2 className="text-[13px] font-black uppercase tracking-[0.12em] m-0">
              Detalle de cuotas
            </h2>
            <p className="text-[10px] text-[#64748b] m-0 mt-0.5 italic">
              Listado según los filtros de pago y de vigencia de contrato seleccionados.
            </p>
          </div>

          {data.filas.length === 0 ? (
            <p className="text-[11px] text-[#64748b] italic border border-dashed border-[#cbd5e1] rounded-md p-3">
              No hay cuotas en el rango filtrado.
            </p>
          ) : (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-[#0f172a] text-white">
                  <th className="text-left font-bold p-2">Vencimiento</th>
                  <th className="text-left font-bold p-2">Concepto</th>
                  <th className="text-left font-bold p-2">Periodo</th>
                  <th className="text-right font-bold p-2">Cuota</th>
                  <th className="text-right font-bold p-2">Pagado</th>
                  <th className="text-center font-bold p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.filas.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                    <td className="p-2 border-b border-[#e2e8f0]">{row.fechaVencimiento}</td>
                    <td className="p-2 border-b border-[#e2e8f0]">{row.concepto}</td>
                    <td className="p-2 border-b border-[#e2e8f0] font-semibold">{row.periodo}</td>
                    <td className="p-2 border-b border-[#e2e8f0] text-right font-bold">{fmtGs(row.monto)}</td>
                    <td className="p-2 border-b border-[#e2e8f0] text-right">{fmtGs(row.pagado)}</td>
                    <td className="p-2 border-b border-[#e2e8f0] text-center font-semibold">{row.estado}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#f1f5f9] font-black">
                  <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-[9px]">
                    Totales ({data.filas.length} cuotas)
                  </td>
                  <td className="p-2 text-right">{fmtGs(totalCuotas)}</td>
                  <td className="p-2 text-right">{fmtGs(totalPagado)}</td>
                  <td className="p-2" />
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <footer className="flex items-end justify-between border-t border-[#e2e8f0] pt-4 mt-8">
          <div className="flex items-center gap-3">
            <img src="/images/ISOTIPO.png" alt="Vordia" className="h-8 sm:h-10 w-auto max-h-10 object-contain shrink-0" />
            <div>
              <p className="m-0 text-[10px] font-bold">Vordia</p>
              <p className="m-0 text-[9px] text-[#64748b]">Administración Inmobiliaria — Luque, Paraguay</p>
            </div>
          </div>
          <p className="m-0 text-[9px] text-[#94a3b8]">Historial de pagos · {data.duplex}</p>
        </footer>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page { size: A4; margin: 12mm; }
                body * { visibility: hidden !important; }
                .print-portal-content, .print-portal-content * { visibility: visible !important; }
                .print-portal-content {
                  position: absolute !important;
                  left: 0 !important; top: 0 !important;
                  width: 100% !important; background: white !important; z-index: 99999 !important;
                }
                .historial-pagos-print { padding: 0 !important; max-width: none !important; }
              }
            `,
          }}
        />
      </div>
    </PrintPortal>
  );
}
