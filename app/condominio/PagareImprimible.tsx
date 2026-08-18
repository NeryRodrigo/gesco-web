"use client";


import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Función Auxiliar para convertir números a letras (Castellano)
 */
const convertirNumeroALetras = (num: number): string => {
    const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const decenas = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
    const decenas2 = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    const leerCentenas = (n: number):string => {
        if (n === 100) return "CIEN";
        if (n < 10) return unidades[n];
        if (n < 20) return decenas[n - 10];
        if (n < 100) {
            let d = Math.floor(n / 10);
            let u = n % 10;
            return decenas2[d] + (u > 0 ? " Y " + unidades[u] : "");
        }
        let c = Math.floor(n / 100);
        let resto = n % 100;
        return centenas[c] + (resto > 0 ? " " + leerCentenas(resto) : "");
    };

    const leerMiles = (n: number):string => {
        let mil = Math.floor(n / 1000);
        let resto = n % 1000;
        let str = "";
        if (mil === 1) str = "MIL";
        else if (mil > 1) str = leerCentenas(mil) + " MIL";
        return str + (resto > 0 ? " " + leerCentenas(resto) : "");
    };

    const leerMillones = (n: number):string => {
        let millon = Math.floor(n / 1000000);
        let resto = n % 1000000;
        let str = "";
        if (millon === 1) str = "UN MILLÓN";
        else if (millon > 1) str = leerCentenas(millon) + " MILLONES";
        return str + (resto > 0 ? " " + leerMiles(resto) : "");
    };

    if (num === 0) return "CERO";
    if (num < 1000) return leerCentenas(num);
    if (num < 1000000) return leerMiles(num);
    return leerMillones(num);
};

export const PagareImprimible = ({ contractData, dataUnidad, isPreview }: any) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!contractData) return null;

    // FORMATEO DE MONTOS
    const montoNumerico = Number(contractData.depositoGarantia || 0);
    const montoGarantia = montoNumerico.toLocaleString('es-PY');
    
    // VARIABLE SOLICITADA: Monto en letras
    const MontoPagareLetras = convertirNumeroALetras(montoNumerico);
    
    const fechaHoy = new Date();
    const diaHoy = fechaHoy.getDate().toString().padStart(2, '0');
    const mesHoy = fechaHoy.toLocaleDateString('es-PY', { month: 'long' });
    const anioHoy = fechaHoy.getFullYear();

    const locatarioNombre = contractData.inquilino?.razonSocial || contractData.inquilino?.nombre || contractData.nombreCompleto || "__________________________";
    const locatarioDoc = contractData.inquilino?.documento || contractData.inquilino?.cedula || contractData.cedula || "_________________";
    const locatarioDom = "Melo de Portugal c/ Amistad, Luque";

    const codeudorNombre = contractData.codeudorNombre || "........................................................................";
    const codeudorDoc = contractData.codeudorCedula || "..........................................";
    const codeudorDom = contractData.codeudorDireccion || "........................................................................";
    const codeudorTelf = contractData.codeudorTelefono || "..........................................";

    const content = (
        <div 
            id={isPreview ? undefined : "imprimible-pagare"} 
            className={isPreview 
                ? "text-black p-8 sm:p-16 text-[14px] leading-relaxed font-serif text-justify w-full mx-auto select-text print:hidden bg-white shadow-inner" 
                : "hidden print:block bg-white text-black text-[14px] leading-relaxed font-serif text-justify"
            } 
            style={{ backgroundColor: 'white', color: 'black', WebkitPrintColorAdjust: 'exact' }}
        >
            <div className="flex justify-between items-start mb-10 border-b-2 border-black pb-4">
                <div className="text-left">
                    <p className="font-bold uppercase">Lugar y Fecha: <span className="font-normal underline">Luque, {diaHoy} de {mesHoy} de {anioHoy}</span></p>
                    <p className="font-bold uppercase mt-1">Vencimiento: <span className="font-normal">A LA VISTA</span></p>
                </div>
                <div className="text-right">
                    <div className="border-2 border-black px-4 py-2 bg-gray-50">
                        <p className="font-black text-xl">Gs. {montoGarantia}</p>
                    </div>
                </div>
            </div>

            <h1 className="text-center font-bold text-2xl mb-12 uppercase tracking-tight underline underline-offset-8">PAGARÉ DE GARANTÍA</h1>

            <div className="space-y-6">
                <p>
                    Por valor recibido, los abajo firmantes, en carácter de <strong>DEUDOR PRINCIPAL</strong> y <strong>CODEUDOR SOLIDARIO Y PRINCIPAL PAGADOR</strong>, nos obligamos solidaria e incondicionalmente a pagar a la orden de:
                </p>

                <div className="py-4 text-center">
                    <p className="text-xl font-black italic">MARCELO ORTIGOZA</p>
                    <p className="font-bold">C.I. N.º 3.389.403</p>
                </div>

                <p>
                    o a quien legalmente represente sus derechos, la suma de: 
                    {/* USO DE LA VARIABLE EN LETRAS */}
                    <strong className="uppercase"> GUARANÍES {MontoPagareLetras} ({montoGarantia} Gs.)</strong>, 
                    renunciando expresamente a los beneficios de división, excusión y cualquier otra excepción que pudiera limitar nuestra responsabilidad solidaria.
                </p>

                <p className="text-sm border-l-4 border-black pl-4 py-2 italic bg-gray-50">
                    El presente pagaré se suscribe como garantía adicional de todas las obligaciones emergentes del Contrato de Locación de Inmueble correspondiente al inmueble identificado como:
                    <br />
                    <strong>Dúplex N.º {dataUnidad?.codigo || dataUnidad?.code || "_______"} – Condominio Fontana di Luque</strong>
                    <br />
                    Melo de Portugal c/ Amistad - Ciudad de Luque.
                </p>
            </div>

            <div className="mt-20 grid grid-cols-1 gap-16">
                <div className="border border-black p-6 rounded-none relative">
                    <span className="absolute -top-3 left-4 bg-white px-2 font-bold text-xs uppercase">DEUDOR PRINCIPAL (LOCATARIO)</span>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 text-xs">
                            <p><strong>Nombre y Apellido:</strong> {locatarioNombre.toUpperCase()}</p>
                            <p><strong>C.I. N.º:</strong> {locatarioDoc}</p>
                            <p><strong>Domicilio:</strong> {locatarioDom}</p>
                        </div>
                        <div className="flex flex-col justify-end items-center">
                            <div className="w-full border-t border-black mb-1"></div>
                            <p className="text-[10px] font-bold">FIRMA Y ACLARACIÓN</p>
                        </div>
                    </div>
                </div>

                <div className="border border-black p-6 rounded-none relative">
                    <span className="absolute -top-3 left-4 bg-white px-2 font-bold text-xs uppercase">CODEUDOR SOLIDARIO Y PRINCIPAL PAGADOR</span>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 text-xs">
                            <p><strong>Nombre y Apellido:</strong> {codeudorNombre.toUpperCase()}</p>
                            <p><strong>C.I. N.º:</strong> {codeudorDoc}</p>
                            <p><strong>Domicilio:</strong> {codeudorDom}</p>
                        </div>
                        <div className="flex flex-col justify-end items-center">
                            <div className="w-full border-t border-black mb-1"></div>
                            <p className="text-[10px] font-bold">FIRMA Y ACLARACIÓN</p>
                        </div>
                    </div>
                </div>
            </div>
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
                    #imprimible-pagare, #imprimible-pagare * { visibility: visible; }
                    #imprimible-pagare { position: absolute; left: 0; top: 0; width: 100%; background: white !important; }
                }
            `}} />
        </>,
        document.body
    );
};

export const descargarPagareDoc = (contractData: any, dataUnidad: any) => {
    if (!contractData) return;
    
    const montoNumerico = Number(contractData.depositoGarantia || 0);
    const montoGarantia = montoNumerico.toLocaleString('es-PY');
    const MontoPagareLetras = convertirNumeroALetras(montoNumerico);
    const locatarioNombre = (contractData.inquilino?.razonSocial || contractData.nombreCompleto || "__________________________").toUpperCase();
    const code = dataUnidad?.codigo || dataUnidad?.code || "_______";
    const fecha = new Date().toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric'});

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Pagaré de Garantía</title>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 11pt; text-align: justify; }
            .header { border-bottom: 2px solid black; margin-bottom: 20pt; padding-bottom: 10pt; }
            h1 { text-align: center; text-decoration: underline; font-size: 14pt; }
            .firma-box { border: 1pt solid black; padding: 15pt; margin-top: 25pt; }
        </style>
        </head>
        <body>
            <div class="header">
                <p>Lugar y Fecha: Luque, ${fecha}</p>
                <p style="text-align: right; font-weight: bold; font-size: 14pt;">Gs. ${montoGarantia}</p>
            </div>
            <h1>PAGARÉ DE GARANTÍA</h1>
            <p>Por valor recibido, los abajo firmantes... pagaremos la suma de <b>GUARANÍES ${MontoPagareLetras} (${montoGarantia} Gs.)</b> a la orden de MARCELO ORTIGOZA...</p>
            <p>Garantía de: Dúplex ${code} - Fontana di Luque</p>
            <div class="firma-box">
                <p><b>DEUDOR:</b> ${locatarioNombre}</p>
                <p><b>C.I.:</b> ${contractData.inquilino?.documento || ""}</p>
            </div>
            <div class="firma-box">
                <p><b>CODEUDOR:</b> ................................................................</p>
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pagare_Garantia_${code}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
