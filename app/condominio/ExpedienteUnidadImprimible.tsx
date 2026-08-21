"use client";


import React from "react";
import { PrintPortal } from "@/components/ui/print-portal";

export type ExpedientePagoRow = {
  fecha: string;
  periodo: string;
  concepto: string;
  monto: number;
  estado: string;
  metodo?: string;
};

export type ExpedienteMantenimientoRow = {
  fecha: string;
  periodo: string;
  origen: string;
  monto: number;
  estado: string;
};

export type ExpedienteComprobanteRow = {
  tipo: "Factura" | "Recibo";
  fecha: string;
  numero: string;
  periodo: string;
  monto: number;
};

export type ExpedienteSeccionesPrint = {
  historialPagos: boolean;
  mantenimiento: boolean;
  comprobantes: boolean;
};

export type ExpedienteUnidadPrintData = {
  fechaEmision: string;
  condominio: string;
  duplex: string;
  nisAnde: string;
  estadoUnidad: string;
  inquilino: {
    nombre: string;
    cedula: string;
    telefono: string;
    correo: string;
    fechaIngreso: string;
    contratoInicio: string;
    contratoFin: string;
    alquiler: number;
    garantia: number;
    ocupantes: number;
    vehiculo: string;
    servicios: string[];
    observaciones: string;
  };
  historialPagos: ExpedientePagoRow[];
  mantenimiento: ExpedienteMantenimientoRow[];
  comprobantes: ExpedienteComprobanteRow[];
  /** Si no se envía, se imprimen las 3 secciones. */
  secciones?: ExpedienteSeccionesPrint;
};

const fmtGs = (n: number) =>
  new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(n || 0);

function estadoTone(estado: string) {
  const e = (estado || "").toLowerCase();
  if (e.includes("pagad") || e.includes("cobrad") || e.includes("registrad")) {
    return "text-[#047857]";
  }
  if (e.includes("atras") || e.includes("vencid") || e.includes("pendiente")) {
    return "text-[#b91c1c]";
  }
  return "text-[#0f172a]";
}

function MembreteFontana({ data }: { data: ExpedienteUnidadPrintData }) {
  return (
    <div className="flex items-center justify-between gap-3.5 border-b-2 border-[#0f172a] pb-3 mb-0 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-[78px] h-[78px] rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
          style={{ backgroundColor: "#080E1E" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fontanas.png"
            alt="Fontana Di Luque"
            width={68}
            height={68}
            className="w-[68px] h-[68px] object-contain"
          />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E7BFF] m-0 mb-1">
            Expediente de unidad ocupada
          </p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-0.5 text-[10.5px] leading-snug text-[#0f172a]">
            <div>
              <span className="text-[#64748b]">Emisión:</span>{" "}
              <strong>{data.fechaEmision}</strong>
            </div>
            <div>
              <span className="text-[#64748b]">Condominio:</span>{" "}
              <strong>{data.condominio}</strong>
            </div>
            <div>
              <span className="text-[#64748b]">Dúplex:</span> <strong>{data.duplex}</strong>
            </div>
            <div>
              <span className="text-[#64748b]">Estado:</span>{" "}
              <strong>{data.estadoUnidad}</strong>
            </div>
            {data.nisAnde && data.nisAnde !== "—" && (
              <div className="col-span-2">
                <span className="text-[#64748b]">NIS ANDE:</span>{" "}
                <strong className="font-mono tracking-wide">{data.nisAnde}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="m-0 text-[11px] font-black tracking-[0.2em] uppercase text-[#0f172a]">
          Fontana
        </p>
        <p className="m-0 text-[9px] text-[#64748b]">Di Luque · Est. 2020</p>
      </div>
    </div>
  );
}

function PieVordia() {
  return (
    <div className="flex items-center justify-end border-t-2 border-[#0f172a] pt-2.5 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/VORDIA H NEGRO.png"
        alt="Vordia"
        width={64}
        height={64}
        className="h-[52px] w-[52px] object-contain shrink-0"
        style={{
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      />
    </div>
  );
}

function Seccion({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-3.5">
      <div className="mb-1.5">
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0f172a] m-0">
          {titulo}
        </h2>
        <p className="text-[9px] text-[#64748b] m-0 mt-0.5 italic leading-tight">{subtitulo}</p>
        <div className="mt-1.5 h-0.5 bg-[#0f172a] expediente-linea-negra" />
      </div>
      {children}
      <div className="mt-1.5 h-0.5 bg-[#0f172a] expediente-linea-negra" />
    </section>
  );
}

function TablaVacia({ texto }: { texto: string }) {
  return (
    <p className="text-[10px] text-[#64748b] italic m-0 py-1.5">
      {texto}
    </p>
  );
}

function TablaInforme({
  headers,
  rows,
}: {
  headers: { label: string; align?: "left" | "right" | "center" }[];
  rows: React.ReactNode[][];
}) {
  const alignCls = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <table className="w-full border-collapse border-0 text-[10px] expediente-tabla">
      <thead>
        <tr className="bg-[#0f172a] text-white">
          {headers.map((h, i) => (
            <th
              key={i}
              className={`${alignCls(h.align)} font-bold px-2 py-1.5 tracking-wide uppercase text-[8.5px] border-0`}
            >
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#f1f5f9]"}>
            {cells.map((cell, j) => (
              <td
                key={j}
                className={`${alignCls(headers[j]?.align)} px-2 py-1 align-middle border-0`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ExpedienteUnidadImprimible({ data }: { data: ExpedienteUnidadPrintData }) {
  const { inquilino } = data;
  const secciones = {
    historialPagos: data.secciones?.historialPagos ?? true,
    mantenimiento: data.secciones?.mantenimiento ?? true,
    comprobantes: data.secciones?.comprobantes ?? true,
  };

  let nSeccion = 0;
  const nextTitulo = (label: string) => {
    nSeccion += 1;
    return `${nSeccion}. ${label}`;
  };

  return (
    <PrintPortal>
      <div
        className="expediente-unidad-print bg-white text-[#0f172a] font-sans text-[10.5px] leading-snug p-5 max-w-[210mm] mx-auto shadow-none border-0 outline-none ring-0"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        {/*
          Tabla envolvente: thead/tfoot se repiten en cada página al imprimir
          (más confiable que position:fixed).
        */}
        <table className="expediente-shell w-full border-collapse border-0">
          <thead>
            <tr>
              <td className="p-0 pb-2.5 align-bottom border-0">
                <MembreteFontana data={data} />
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className="p-0 align-top border-0">
                <section className="mb-1">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0f172a] m-0 mb-1">
                    Datos generales del inquilino
                  </h2>
                  <div className="mb-1.5 h-0.5 bg-[#0f172a] expediente-linea-negra" />
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px]">
                    <p className="m-0">
                      <span className="text-[#64748b]">Nombre / Razón social:</span>{" "}
                      <strong className="uppercase">{inquilino.nombre}</strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Documento:</span>{" "}
                      <strong>{inquilino.cedula}</strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Teléfono:</span>{" "}
                      <strong>{inquilino.telefono}</strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Correo:</span>{" "}
                      <strong>{inquilino.correo}</strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Ingreso:</span>{" "}
                      <strong>{inquilino.fechaIngreso}</strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Contrato:</span>{" "}
                      <strong>
                        {inquilino.contratoInicio} — {inquilino.contratoFin}
                      </strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Alquiler mensual:</span>{" "}
                      <strong>{fmtGs(inquilino.alquiler)}</strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Garantía:</span>{" "}
                      <strong>{fmtGs(inquilino.garantia)}</strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Ocupantes:</span>{" "}
                      <strong>{inquilino.ocupantes}</strong>
                    </p>
                    <p className="m-0">
                      <span className="text-[#64748b]">Vehículo:</span>{" "}
                      <strong>{inquilino.vehiculo}</strong>
                    </p>
                    <p className="m-0 col-span-2">
                      <span className="text-[#64748b]">Servicios incluidos:</span>{" "}
                      <strong>
                        {inquilino.servicios.length > 0
                          ? inquilino.servicios.join(", ")
                          : "Ninguno declarado"}
                      </strong>
                    </p>
                    <p className="m-0 col-span-2">
                      <span className="text-[#64748b]">Observaciones:</span>{" "}
                      {inquilino.observaciones}
                    </p>
                  </div>
                </section>

                {secciones.historialPagos && (
                <Seccion
                  titulo={nextTitulo("Historial de pagos")}
                  subtitulo="Cuotas de alquiler y estado de cobro registrados en el expediente."
                >
                  {data.historialPagos.length === 0 ? (
                    <TablaVacia texto="No hay cuotas de alquiler registradas para este contrato." />
                  ) : (
                    <TablaInforme
                      headers={[
                        { label: "Periodo" },
                        { label: "Vencimiento" },
                        { label: "Concepto" },
                        { label: "Monto", align: "right" },
                        { label: "Estado", align: "center" },
                      ]}
                      rows={data.historialPagos.map((row) => [
                        <span key="p" className="font-semibold">
                          {row.periodo}
                        </span>,
                        row.fecha,
                        row.concepto,
                        <span key="m" className="font-bold tabular-nums">
                          {fmtGs(row.monto)}
                        </span>,
                        <span key="e" className={`font-bold ${estadoTone(row.estado)}`}>
                          {row.estado}
                        </span>,
                      ])}
                    />
                  )}
                </Seccion>
                )}

                {secciones.mantenimiento && (
                <Seccion
                  titulo={nextTitulo("Mantenimiento y servicios")}
                  subtitulo="Registros de luz (ANDE), agua y basura asociados a la unidad ocupada."
                >
                  {data.mantenimiento.length === 0 ? (
                    <TablaVacia texto="Sin registros de luz/mantenimiento para este NIS." />
                  ) : (
                    <TablaInforme
                      headers={[
                        { label: "Fecha" },
                        { label: "Periodo" },
                        { label: "Origen" },
                        { label: "Monto", align: "right" },
                        { label: "Estado", align: "center" },
                      ]}
                      rows={data.mantenimiento.map((row) => [
                        row.fecha,
                        <span key="p" className="font-semibold">
                          {row.periodo}
                        </span>,
                        row.origen,
                        <span key="m" className="font-bold tabular-nums">
                          {fmtGs(row.monto)}
                        </span>,
                        <span key="e" className={`font-semibold ${estadoTone(row.estado)}`}>
                          {row.estado}
                        </span>,
                      ])}
                    />
                  )}
                </Seccion>
                )}

                {secciones.comprobantes && (
                <Seccion
                  titulo={nextTitulo("Facturas y recibos")}
                  subtitulo="Comprobantes emitidos (facturas legales y recibos de dinero) vinculados a la unidad."
                >
                  {data.comprobantes.length === 0 ? (
                    <TablaVacia texto="No hay facturas ni recibos emitidos para esta unidad." />
                  ) : (
                    <TablaInforme
                      headers={[
                        { label: "Tipo" },
                        { label: "Fecha" },
                        { label: "Nº / Ref." },
                        { label: "Periodo" },
                        { label: "Monto", align: "right" },
                      ]}
                      rows={data.comprobantes.map((row) => [
                        <span key="t" className="font-semibold">
                          {row.tipo}
                        </span>,
                        row.fecha,
                        <span key="n" className="font-mono text-[9.5px]">
                          {row.numero}
                        </span>,
                        row.periodo,
                        <span key="m" className="font-bold tabular-nums">
                          {fmtGs(row.monto)}
                        </span>,
                      ])}
                    />
                  )}
                </Seccion>
                )}

                <p className="text-[8px] text-[#94a3b8] mt-3 mb-1 italic leading-tight">
                  Documento generado automáticamente a partir del expediente digital del dúplex.
                  La información refleja el estado registrado al momento de la emisión.
                </p>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <td className="p-0 pt-2.5 align-top border-0">
                <PieVordia />
              </td>
            </tr>
          </tfoot>
        </table>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: A4;
                  margin: 8mm 10mm 10mm 10mm;
                }
                body * { visibility: hidden !important; }
                .print-portal-content,
                .print-portal-content * { visibility: visible !important; }
                .print-portal-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  border: none !important;
                  box-shadow: none !important;
                  outline: none !important;
                  z-index: 99999 !important;
                }
                .expediente-unidad-print {
                  padding: 0 !important;
                  max-width: none !important;
                  border: none !important;
                  box-shadow: none !important;
                  outline: none !important;
                }
                .expediente-shell,
                .expediente-shell td,
                .expediente-shell th,
                .expediente-tabla,
                .expediente-tabla th,
                .expediente-tabla td {
                  border: none !important;
                  outline: none !important;
                  box-shadow: none !important;
                }
                .expediente-shell {
                  width: 100% !important;
                }
                .expediente-shell > thead {
                  display: table-header-group !important;
                }
                .expediente-shell > tfoot {
                  display: table-footer-group !important;
                }
                .expediente-shell > tbody {
                  display: table-row-group !important;
                }
                .expediente-linea-negra {
                  background-color: #0f172a !important;
                  border: none !important;
                }
                img {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  max-width: none !important;
                }
                h2, section { break-inside: avoid; }
                tr { break-inside: avoid; page-break-inside: avoid; }
              }
            `,
          }}
        />
      </div>
    </PrintPortal>
  );
}
