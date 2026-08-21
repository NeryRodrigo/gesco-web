"use client";


import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MembreteFontanaDiLuque, PieVordiaFontana } from "@/components/fontana/MembreteFontana";

export const AnexoFotograficoImprimible = ({ contractData, dataUnidad, isPreview }: any) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!contractData) return null;

    const fechaHoy = new Date().toLocaleDateString('es-PY');

    // Lista de ambientes/fotos requeridas
    const ambientes = [
        "Fachada Frontal", "Estacionamiento", "Sala", "Comedor", "Cocina", 
        "Habitación Suite", "Baño Suite", "Habitación N.º 2", "Habitación N.º 3",
        "Baño Compartido", "Baño Social", "Patio Interno", "Jardín Frontal",
        "Portón Eléctrico", "Termocalefón", "Aires Acondicionados", "Tanque de Agua"
    ];

    const content = (
        <div 
            id={isPreview ? undefined : "imprimible-anexo-fotos"} 
            className={isPreview 
                ? "text-black p-8 sm:p-12 text-[12px] leading-relaxed font-sans w-full mx-auto bg-white shadow-inner" 
                : "hidden print:block bg-white text-black text-[12px] leading-relaxed font-sans"
            } 
            style={{ backgroundColor: 'white', color: 'black', WebkitPrintColorAdjust: 'exact' }}
        >
            <MembreteFontanaDiLuque
              titulo="Anexo fotográfico de entrega"
              meta={[
                { label: "Dúplex", value: String(dataUnidad?.codigo || dataUnidad?.code || "—") },
                { label: "Fecha", value: fechaHoy },
              ]}
            />
            <h1 className="text-center font-bold text-xl mb-4 uppercase">ANEXO FOTOGRÁFICO DE ENTREGA DE INMUEBLE</h1>
            
            <div className="bg-gray-100 p-4 rounded-lg mb-8 border border-gray-300">
                <p><strong>Inmueble:</strong> Dúplex N.º {dataUnidad?.codigo || dataUnidad?.code || "_______"} – Condominio Fontana di Luque</p>
                <p><strong>Dirección:</strong> Melo de Portugal c/ Amistad, Luque</p>
                <p><strong>Fecha de relevamiento:</strong> {fechaHoy}</p>
            </div>

            {/* GRILLA DE FOTOGRAFÍAS */}
            <div className="grid grid-cols-1 gap-12">
                {ambientes.map((nombre, index) => (
                    <div key={index} className="break-inside-avoid border-b border-gray-200 pb-8">
                        <h3 className="font-bold text-sm mb-4 uppercase text-blue-800">
                            FOTOGRAFÍA N.º {index + 1} – {nombre}
                        </h3>
                        <div className="w-full h-80 border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 mb-4 rounded-xl">
                            <span className="text-gray-400 font-bold italic text-lg uppercase tracking-widest">[ Espacio para Fotografía: {nombre} ]</span>
                        </div>
                        <p className="font-bold">Observaciones: <span className="font-normal">_________________________________________________________________________________</span></p>
                    </div>
                ))}
            </div>

            {/* DECLARACIÓN FINAL */}
            <div className="mt-12 p-6 border-2 border-black rounded-xl break-inside-avoid">
                <h3 className="font-bold mb-2 uppercase text-center">DECLARACIÓN</h3>
                <p className="text-justify text-[11px]">
                    Las fotografías incorporadas en el presente anexo reflejan fielmente el estado del inmueble al momento de la entrega y forman parte integrante del Contrato de Locación, Inventario de Entrega y Acta de Entrega y Recepción. El Locatario manifiesta su plena conformidad con lo visualizado en este documento.
                </p>
            </div>

            {/* FIRMAS */}
            <div className="grid grid-cols-3 gap-8 mt-20 text-center break-inside-avoid">
                <div className="space-y-1">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold text-[10px]">EL LOCADOR</p>
                        <p className="text-[9px]">MARCELO ORTIGOZA</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold text-[10px]">EL LOCATARIO</p>
                        <p className="text-[9px]">{(contractData.inquilino?.razonSocial || "________________").toUpperCase()}</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold text-[10px]">CODEUDOR SOLIDARIO</p>
                        <p className="text-[9px]">{(contractData.codeudorNombre || "________________").toUpperCase()}</p>
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
                    @page { margin: 1.5cm; size: A4 portrait; }
                    body * { visibility: hidden; }
                    #imprimible-anexo-fotos, #imprimible-anexo-fotos * { visibility: visible; }
                    #imprimible-anexo-fotos { position: absolute; left: 0; top: 0; width: 100%; background: white !important; }
                    .break-inside-avoid { break-inside: avoid; }
                }
            `}} />
        </>,
        document.body
    );
};
