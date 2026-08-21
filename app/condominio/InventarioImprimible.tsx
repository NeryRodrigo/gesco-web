"use client";


import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MembreteFontanaDiLuque, PieVordiaFontana } from "@/components/fontana/MembreteFontana";

export const InventarioImprimible = ({ contractData, dataUnidad, isPreview }: any) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!contractData) return null;

    const fechaHoy = new Date().toLocaleDateString('es-PY');
    const locatarioNombre = (contractData.inquilino?.razonSocial || "________________").toUpperCase();
    const locatarioDoc = contractData.inquilino?.documento || "________________";
    const codeudorNombre = (contractData.codeudorNombre || "________________").toUpperCase();
    const codeudorDoc = contractData.codeudorCedula || "________________";

    const renderTablaSeccion = (titulo: string, items: string[]) => (
        <div className="mb-6 break-inside-avoid">
            <h3 className="font-bold text-xs bg-gray-200 p-1 uppercase border border-black">{titulo}</h3>
            <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="border border-black p-1 text-left w-1/3">Ítem</th>
                        <th className="border border-black p-1 w-10">B</th>
                        <th className="border border-black p-1 w-10">R</th>
                        <th className="border border-black p-1 w-10">M</th>
                        <th className="border border-black p-1">Observaciones / Foto N.º</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border border-black p-1">{item}</td>
                            <td className="border border-black p-1 text-center">☐</td>
                            <td className="border border-black p-1 text-center">☐</td>
                            <td className="border border-black p-1 text-center">☐</td>
                            <td className="border border-black p-1">_________________________________</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const content = (
        <div 
            id={isPreview ? undefined : "imprimible-inventario"} 
            className={isPreview 
                ? "text-black p-8 sm:p-12 text-[11px] leading-tight font-sans w-full mx-auto bg-white shadow-inner" 
                : "hidden print:block bg-white text-black text-[11px]"
            } 
            style={{ backgroundColor: 'white', color: 'black', WebkitPrintColorAdjust: 'exact' }}
        >
            <MembreteFontanaDiLuque
              titulo="Inventario de entrega del inmueble"
              meta={[
                { label: "Dúplex", value: String(dataUnidad?.codigo || dataUnidad?.code || "—") },
                { label: "Fecha", value: fechaHoy },
              ]}
            />
            <div className="text-center mb-4">
                <h1 className="font-bold text-lg uppercase">INVENTARIO DE ENTREGA DEL INMUEBLE</h1>
                <p className="text-[10px] italic">Condominio Fontana di Luque – Dúplex N.º {dataUnidad?.codigo || dataUnidad?.code || "_______"}</p>
            </div>

            {/* 1. DATOS GENERALES */}
            <div className="mb-6">
                <h3 className="font-bold text-xs bg-gray-800 text-white p-1 uppercase">1. DATOS GENERALES</h3>
                <div className="grid grid-cols-2 border border-black p-2 gap-y-1">
                    <p><strong>Fecha de entrega:</strong> {fechaHoy}</p>
                    <p><strong>Inmueble:</strong> Dúplex {dataUnidad?.codigo}</p>
                    <p><strong>Locador:</strong> Marcelo Ortigoza</p>
                    <p><strong>C.I.:</strong> 3.389.403</p>
                    <p><strong>Locatario:</strong> {locatarioNombre}</p>
                    <p><strong>C.I.:</strong> {locatarioDoc}</p>
                    <p><strong>Lectura ANDE:</strong> ________________</p>
                    <p><strong>N.º Medidor:</strong> {dataUnidad?.nisAnde || "________________"}</p>
                </div>
            </div>

            {/* SECCIONES CHECKLIST */}
            {renderTablaSeccion("2. EXTERIOR Y ESTACIONAMIENTO", ["Fachada", "Jardín frontal", "Estacionamiento", "Portón eléctrico", "Controles portón", "Vereda / acceso", "Iluminación exterior"])}
            {renderTablaSeccion("3. SALA Y COMEDOR", ["Piso", "Paredes", "Techo", "Puertas/Ventanas", "Cerraduras", "Tomacorrientes/Interruptores", "Pintura general"])}
            {renderTablaSeccion("4. COCINA", ["Muebles de cocina", "Mesada/Bacha", "Grifería/Desagüe", "Termocalefón", "Piso/Paredes"])}
            {renderTablaSeccion("5. HABITACIONES", ["Habitación Suite", "Habitación 2", "Habitación 3", "Aires Acondicionados", "Controles AA"])}
            {renderTablaSeccion("6. BAÑOS", ["Baño Suite", "Baño Compartido", "Baño Social", "Inodoros/Lavatorios", "Grifería/Ducha", "Espejos/Accesorios"])}
            {renderTablaSeccion("7. PATIO Y SERVICIOS", ["Patio interno", "Tanque de agua", "Canaletas/Desagües", "Limpieza general"])}

            {/* OBSERVACIONES */}
            <div className="mb-6 break-inside-avoid">
                <h3 className="font-bold text-xs uppercase border-b border-black">Observaciones Generales</h3>
                <div className="h-16 border border-black mt-1 p-2 italic text-gray-500">
                    Escriba aquí cualquier detalle adicional...
                </div>
            </div>

            {/* DECLARACIÓN Y FIRMAS */}
            <div className="mt-8 break-inside-avoid">
                <p className="text-[9px] mb-4 text-justify italic">
                    EL LOCATARIO declara recibir el inmueble en el estado indicado en el presente inventario. Cualquier observación no consignada se tendrá por no declarada, salvo defectos ocultos.
                </p>
                <div className="grid grid-cols-3 gap-4 text-center mt-10">
                    <div className="border-t border-black pt-1">
                        <p className="font-bold text-[9px]">EL LOCADOR</p>
                        <p className="text-[8px]">MARCELO ORTIGOZA</p>
                    </div>
                    <div className="border-t border-black pt-1">
                        <p className="font-bold text-[9px]">EL LOCATARIO</p>
                        <p className="text-[8px]">{locatarioNombre}</p>
                    </div>
                    <div className="border-t border-black pt-1">
                        <p className="font-bold text-[9px]">CODEUDOR</p>
                        <p className="text-[8px]">{codeudorNombre}</p>
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
                    @page { margin: 1cm; size: A4; }
                    body * { visibility: hidden; }
                    #imprimible-inventario, #imprimible-inventario * { visibility: visible; }
                    #imprimible-inventario { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}} />
        </>,
        document.body
    );
};
