"use client";


import React from "react";
import { PrintPortal } from "@/components/ui/print-portal";
import { formatDuplex } from "@/lib/utils";

export type ReimpresionCobroItem = {
  pagoId: number;
  fechaPago: string;
  montoPagado: number;
  metodoPago: string;
  facturaEmitida: boolean;
  numeroFactura?: string;
  mesPagado: number;
  anioPagado: number;
  tipoPago?: string;
  condominio: string;
  duplex: string;
  inquilino: string;
  cedula: string;
  email?: string;
};

export type ReimpresionMasivaPrintData = {
  fechaEmision: string;
  modo: "listado" | "cola";
  filtrosResumen: string;
  items: ReimpresionCobroItem[];
};

const fmtGs = (n: number) =>
  new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(n || 0);

function Membrete({ titulo }: { titulo: string }) {
  return (
    <header className="flex items-start gap-4 border-b border-[#e2e8f0] pb-4 mb-5">
      <div
        className="w-[72px] h-[72px] rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: "#080E1E" }}
      >
        <img src="/fontanas.png" alt="Fontana" className="w-14 h-14 object-contain" />
      </div>
      <div className="pt-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3b82f6] m-0 mb-1">
          {titulo}
        </p>
        <p className="text-[13px] font-black uppercase tracking-tight text-[#0f172a] m-0">
          Fontana Luque · Administración
        </p>
        <p className="text-[10px] text-[#64748b] m-0 mt-0.5">
          Centro de cobranzas — Vordia
        </p>
      </div>
    </header>
  );
}

function PieVordia({ extra }: { extra?: string }) {
  return (
    <footer className="flex items-end justify-between border-t border-[#e2e8f0] pt-4 mt-8">
      <div className="flex items-center gap-3">
        <img src="/images/ISOTIPO.png" alt="Vordia" className="h-10 w-auto object-contain" />
        <div>
          <p className="m-0 text-[10px] font-bold text-[#0f172a]">Vordia</p>
          <p className="m-0 text-[9px] text-[#64748b]">
            Administración Inmobiliaria — Luque, Paraguay
          </p>
        </div>
      </div>
      {extra ? <p className="m-0 text-[9px] text-[#94a3b8]">{extra}</p> : null}
    </footer>
  );
}

function ListadoPlano({ data }: { data: ReimpresionMasivaPrintData }) {
  const total = data.items.reduce((a, i) => a + (i.montoPagado || 0), 0);
  return (
    <div className="reimpresion-page bg-white text-[#0f172a] font-sans text-[11px] p-8">
      <Membrete titulo="Reimpresión masiva · Listado de cobranzas" />
      <div className="grid grid-cols-2 gap-2 mb-4 text-[11px]">
        <p className="m-0">
          <span className="text-[#64748b]">Emisión:</span> <strong>{data.fechaEmision}</strong>
        </p>
        <p className="m-0">
          <span className="text-[#64748b]">Registros:</span> <strong>{data.items.length}</strong>
        </p>
        <p className="m-0 col-span-2">
          <span className="text-[#64748b]">Filtros:</span> {data.filtrosResumen}
        </p>
      </div>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-[#0f172a] text-white">
            <th className="text-left p-2 font-bold">Fecha</th>
            <th className="text-left p-2 font-bold">Tipo</th>
            <th className="text-left p-2 font-bold">Condo / Dúplex</th>
            <th className="text-left p-2 font-bold">Inquilino</th>
            <th className="text-left p-2 font-bold">Periodo</th>
            <th className="text-left p-2 font-bold">Nº</th>
            <th className="text-right p-2 font-bold">Monto</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((c, i) => (
            <tr key={c.pagoId} className={i % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
              <td className="p-2 border-b border-[#e2e8f0]">
                {c.fechaPago ? new Date(c.fechaPago).toLocaleDateString("es-PY") : "—"}
              </td>
              <td className="p-2 border-b border-[#e2e8f0] font-semibold">
                {c.facturaEmitida ? "Factura" : "Recibo"}
              </td>
              <td className="p-2 border-b border-[#e2e8f0]">
                <span className="block font-semibold uppercase">{c.condominio}</span>
                <span className="text-[9px] text-[#64748b]">{formatDuplex(c.duplex)}</span>
              </td>
              <td className="p-2 border-b border-[#e2e8f0] uppercase font-semibold">{c.inquilino}</td>
              <td className="p-2 border-b border-[#e2e8f0]">
                {c.mesPagado}/{c.anioPagado}
              </td>
              <td className="p-2 border-b border-[#e2e8f0] font-mono text-[9px]">
                {c.numeroFactura || `Pago #${c.pagoId}`}
              </td>
              <td className="p-2 border-b border-[#e2e8f0] text-right font-bold">
                {fmtGs(c.montoPagado)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#f1f5f9] font-black">
            <td colSpan={6} className="p-2 text-right uppercase text-[9px] tracking-wider">
              Total ({data.items.length})
            </td>
            <td className="p-2 text-right">{fmtGs(total)}</td>
          </tr>
        </tfoot>
      </table>
      <PieVordia extra="Listado plano de cobranzas" />
    </div>
  );
}

function ComprobantePagina({
  item,
  index,
  total,
  fechaEmision,
}: {
  item: ReimpresionCobroItem;
  index: number;
  total: number;
  fechaEmision: string;
}) {
  const tipo = item.facturaEmitida ? "FACTURA" : "RECIBO";
  return (
    <div className="reimpresion-page reimpresion-comprobante bg-white text-[#0f172a] font-sans text-[11px] p-8 break-after-page">
      <Membrete titulo={`Reimpresión · ${tipo}`} />
      <div className="flex justify-between items-start mb-5">
        <div>
          <p className="m-0 text-[10px] uppercase tracking-widest text-[#64748b]">Documento</p>
          <p className="m-0 text-2xl font-black italic tracking-tighter">{tipo}</p>
          <p className="m-0 text-[11px] font-mono mt-1">
            {item.numeroFactura || `001-001-${String(item.pagoId).padStart(7, "0")}`}
          </p>
        </div>
        <div className="text-right text-[11px]">
          <p className="m-0">
            <span className="text-[#64748b]">Emisión PDF:</span> {fechaEmision}
          </p>
          <p className="m-0">
            <span className="text-[#64748b]">Fecha cobro:</span>{" "}
            <strong>
              {item.fechaPago ? new Date(item.fechaPago).toLocaleDateString("es-PY") : "—"}
            </strong>
          </p>
          <p className="m-0 text-[9px] text-[#94a3b8] mt-1">
            {index + 1} / {total}
          </p>
        </div>
      </div>

      <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 mb-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <p className="m-0">
            <span className="text-[#64748b]">Inquilino:</span>{" "}
            <strong className="uppercase">{item.inquilino}</strong>
          </p>
          <p className="m-0">
            <span className="text-[#64748b]">Documento:</span> <strong>{item.cedula || "—"}</strong>
          </p>
          <p className="m-0">
            <span className="text-[#64748b]">Condominio:</span> <strong>{item.condominio}</strong>
          </p>
          <p className="m-0">
            <span className="text-[#64748b]">Dúplex:</span>{" "}
            <strong>{formatDuplex(item.duplex)}</strong>
          </p>
          <p className="m-0">
            <span className="text-[#64748b]">Periodo:</span>{" "}
            <strong>
              {item.mesPagado}/{item.anioPagado}
            </strong>
          </p>
          <p className="m-0">
            <span className="text-[#64748b]">Método:</span> <strong>{item.metodoPago || "—"}</strong>
          </p>
        </div>
      </section>

      <table className="w-full border-collapse text-[11px] mb-4">
        <thead>
          <tr className="bg-[#0f172a] text-white">
            <th className="text-left p-2.5 font-bold">Concepto</th>
            <th className="text-right p-2.5 font-bold">Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2.5 border-b border-[#e2e8f0]">
              {item.tipoPago || "Alquiler"} — periodo {item.mesPagado}/{item.anioPagado}
            </td>
            <td className="p-2.5 border-b border-[#e2e8f0] text-right font-black">
              {fmtGs(item.montoPagado)}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-[#f1f5f9]">
            <td className="p-2.5 text-right font-bold uppercase text-[10px]">Total</td>
            <td className="p-2.5 text-right font-black text-base">{fmtGs(item.montoPagado)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-[9px] text-[#94a3b8] italic mb-6">
        Comprobante reimpreso desde el centro de cobranzas. Refleja el cobro registrado en el sistema.
      </p>
      <PieVordia extra={`${tipo} · ${formatDuplex(item.duplex)}`} />
    </div>
  );
}

export function ReimpresionMasivaImprimible({ data }: { data: ReimpresionMasivaPrintData }) {
  return (
    <PrintPortal>
      <div
        className="reimpresion-masiva-print"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        {data.modo === "listado" ? (
          <ListadoPlano data={data} />
        ) : (
          data.items.map((item, index) => (
            <ComprobantePagina
              key={item.pagoId}
              item={item}
              index={index}
              total={data.items.length}
              fechaEmision={data.fechaEmision}
            />
          ))
        )}

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
                .reimpresion-page { padding: 0 !important; }
                .reimpresion-comprobante {
                  break-after: page;
                  page-break-after: always;
                }
                .reimpresion-comprobante:last-child {
                  break-after: auto;
                  page-break-after: auto;
                }
              }
            `,
          }}
        />
      </div>
    </PrintPortal>
  );
}

export function cobroToReimpresionItem(c: {
  pagoId: number;
  montoPagado: number;
  fechaPago: string;
  metodoPago: string;
  facturaEmitida: boolean;
  numeroFactura?: string;
  mesPagado: number;
  anioPagado: number;
  tipoPago?: string;
  contrato?: {
    unidad?: { codigoUnidad?: string; nombreCondominio?: string };
    inquilino?: { razonSocial?: string; email?: string; cedula?: string };
  };
}): ReimpresionCobroItem {
  return {
    pagoId: c.pagoId,
    fechaPago: c.fechaPago,
    montoPagado: c.montoPagado,
    metodoPago: c.metodoPago,
    facturaEmitida: c.facturaEmitida,
    numeroFactura: c.numeroFactura,
    mesPagado: c.mesPagado,
    anioPagado: c.anioPagado,
    tipoPago: c.tipoPago,
    condominio: c.contrato?.unidad?.nombreCondominio || "Sin condominio",
    duplex: c.contrato?.unidad?.codigoUnidad || "—",
    inquilino: c.contrato?.inquilino?.razonSocial || "—",
    cedula: c.contrato?.inquilino?.cedula || "—",
    email: c.contrato?.inquilino?.email,
  };
}
