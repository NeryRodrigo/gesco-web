"use client";


import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MembreteFontanaDiLuque, PieVordiaFontana } from "@/components/fontana/MembreteFontana";

export const ActaEntregaImprimible = ({ contractData, dataUnidad, isPreview }: any) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!contractData) return null;

    const fechaHoy = new Date();
    const dia = fechaHoy.getDate().toString().padStart(2, '0');
    const mes = fechaHoy.toLocaleDateString('es-PY', { month: 'long' });
    const anio = fechaHoy.getFullYear();

    const locatarioNombre = (contractData.inquilino?.razonSocial || contractData.nombreCompleto || "__________________________").toUpperCase();
    const locatarioDoc = contractData.inquilino?.documento || contractData.cedula || "_________________";
    
    const codeudorNombre = (contractData.codeudorNombre || "__________________________").toUpperCase();
    const codeudorDoc = contractData.codeudorCedula || "_________________";

    const content = (
        <div 
            id={isPreview ? undefined : "imprimible-acta"} 
            className={isPreview 
                ? "text-black p-8 sm:p-16 text-[13px] leading-relaxed font-serif text-justify w-full mx-auto select-text print:hidden bg-white shadow-inner" 
                : "hidden print:block bg-white text-black text-[13px] leading-relaxed font-serif text-justify"
            } 
            style={{ backgroundColor: 'white', color: 'black', WebkitPrintColorAdjust: 'exact' }}
        >
            <MembreteFontanaDiLuque
              titulo="Acta de entrega y recepción"
              meta={[
                { label: "Dúplex", value: String(dataUnidad?.codigo || dataUnidad?.code || "—") },
                { label: "Fecha", value: `${dia}/${mes}/${anio}` },
              ]}
            />
            <h1 className="text-center font-bold text-lg mb-2 uppercase">ACTA DE ENTREGA Y RECEPCIÓN DE INMUEBLE</h1>
            <div className="border-y border-black py-2 mb-6">
                <p><strong>Inmueble:</strong> Dúplex N.º {dataUnidad?.codigo || dataUnidad?.code || "_______"} – Condominio Fontana di Luque</p>
                <p><strong>Dirección:</strong> Melo de Portugal c/ Amistad, Luque</p>
            </div>

            <p className="mb-6">
                En la ciudad de Luque, República del Paraguay, a los <strong>{dia}</strong> días del mes de <strong>{mes}</strong> de <strong>{anio}</strong>, EL LOCADOR hace entrega y EL LOCATARIO recibe el inmueble identificado precedentemente, conjuntamente con sus llaves, controles, instalaciones, accesorios y demás elementos detallados en el Inventario de Entrega y Anexo Fotográfico, que forman parte integrante de la presente acta.
            </p>

            <p className="mb-6">
                EL LOCATARIO declara haber inspeccionado el inmueble y recibirlo en condiciones aptas de uso y habitabilidad, sin observaciones distintas a las consignadas en el Inventario de Entrega.
            </p>

            <h3 className="font-bold border-b border-black mb-3">ELEMENTOS ENTREGADOS</h3>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 mb-8">
                <p>Llaves: __________________________</p>
                <p>Controles remotos: _________________</p>
                <p>Aires acondicionados: _______________</p>
                <p>Termocalefón: _____________________</p>
                <p>Portón eléctrico: ___________________</p>
                <p>Tanque de agua: ____________________</p>
                <p className="col-span-2">Otros: __________________________________________________________________</p>
            </div>

            <h3 className="font-bold border-b border-black mb-3">OBSERVACIONES</h3>
            <div className="min-h-[100px] border border-dashed border-gray-400 p-4 mb-10 italic text-gray-600">
                {contractData.observacionesEntrega || "Sin observaciones adicionales al momento de la entrega."}
            </div>

            <p className="text-center mb-12">En prueba de conformidad, las partes firman la presente acta.</p>

            {/* SECCIÓN DE FIRMAS */}
            <div className="grid grid-cols-2 gap-20 px-10">
                <div className="text-center">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold">EL LOCADOR</p>
                        <p className="text-xs">MARCELO ORTIGOZA</p>
                        <p className="text-xs">C.I. N° 3.389.403</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold">EL LOCATARIO</p>
                        <p className="text-xs">{locatarioNombre}</p>
                        <p className="text-xs">C.I. N° {locatarioDoc}</p>
                    </div>
                </div>
                <div className="text-center col-span-2 w-1/2 mx-auto mt-10">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold">CODEUDOR SOLIDARIO</p>
                        <p className="text-xs">{codeudorNombre}</p>
                        <p className="text-xs">C.I. N° {codeudorDoc}</p>
                    </div>
                </div>
            </div>
            <PieVordiaFontana />
        </div>
    );

    if (isPreview) return content;
    if (!mounted) return null;

    return createPortal(
        <>
            {content}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 2cm; size: A4 portrait; }
                    body * { visibility: hidden; }
                    #imprimible-acta, #imprimible-acta * { visibility: visible; }
                    #imprimible-acta { position: absolute; left: 0; top: 0; width: 100%; background: white !important; }
                }
            `}} />
        </>,
        document.body
    );
};
