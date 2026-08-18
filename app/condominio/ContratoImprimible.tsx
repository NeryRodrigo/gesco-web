"use client";


import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const CODEUDOR_MARKER_RE = /<!--CODEUDOR:([\s\S]*?)-->\n?/;

export type CodeudorInfo = {
  nombre: string;
  cedula: string;
  direccion: string;
  telefono: string;
  tieneCodeudor: boolean;
  observacionesLimpias: string;
};

/** Lee codeudor desde campos directos o desde el marcador embebido en observaciones. */
export function resolveCodeudor(contractData: any): CodeudorInfo {
  let nombre = String(contractData?.codeudorNombre || "").trim();
  let cedula = String(contractData?.codeudorCedula || "").trim();
  let direccion = String(contractData?.codeudorDireccion || "").trim();
  let telefono = String(contractData?.codeudorTelefono || "").trim();
  let obsRaw = String(contractData?.observaciones || "");

  const m = obsRaw.match(CODEUDOR_MARKER_RE);
  if (m) {
    try {
      const d = JSON.parse(m[1]);
      if (!nombre) nombre = String(d.nombre || "").trim();
      if (!cedula) cedula = String(d.cedula || "").trim();
      if (!direccion) direccion = String(d.direccion || "").trim();
      if (!telefono) telefono = String(d.telefono || "").trim();
    } catch {
      /* ignore JSON inválido */
    }
    obsRaw = obsRaw.replace(CODEUDOR_MARKER_RE, "").trim();
  }

  return {
    nombre,
    cedula,
    direccion,
    telefono,
    tieneCodeudor: Boolean(nombre),
    observacionesLimpias: obsRaw,
  };
}

/** Persiste datos del codeudor dentro de observaciones sin migrar la BD. */
export function serializeCodeudorEnObservaciones(
  textoObservaciones: string,
  codeudor: { nombre?: string; cedula?: string; direccion?: string; telefono?: string }
) {
  const limpio = String(textoObservaciones || "").replace(CODEUDOR_MARKER_RE, "").trim();
  const nombre = String(codeudor?.nombre || "").trim();
  if (!nombre) return limpio;
  const payload = {
    nombre,
    cedula: String(codeudor?.cedula || "").trim(),
    direccion: String(codeudor?.direccion || "").trim(),
    telefono: String(codeudor?.telefono || "").trim(),
  };
  return `<!--CODEUDOR:${JSON.stringify(payload)}-->\n${limpio}`;
}

function titulosClausulasFinales(tieneCodeudor: boolean, tieneObs: boolean) {
  if (tieneCodeudor) {
    return {
      codeudor: "DECIMA SEXTA",
      informconf: "DECIMA SEPTIMA",
      riesgo: "DECIMO OCTAVA",
      termino: "DECIMA NOVENA",
      obligaciones: "VIGESIMA",
      obs: tieneObs ? "VIGESIMA PRIMERA" : null as string | null,
      jurisdiccion: tieneObs ? "VIGESIMA SEGUNDA" : "VIGESIMA PRIMERA",
    };
  }
  return {
    codeudor: null as string | null,
    informconf: "DECIMA SEXTA",
    riesgo: "DECIMA SEPTIMA",
    termino: "DECIMA OCTAVA",
    obligaciones: "DECIMA NOVENA",
    obs: tieneObs ? "VIGESIMA" : null as string | null,
    jurisdiccion: tieneObs ? "VIGESIMA PRIMERA" : "VIGESIMA",
  };
}

const TEXTO_CODEUDOR_REST =
  "asume el carácter de CODEUDOR solidario de las obligaciones del presente contrato que correspondan a EL LOCATARIO, de conformidad a lo establecido en el Art. 816 del Código Civil Paraguayo, quien en prueba de conformidad, se obliga solidariamente y la fianza es válida mientras no sean devueltas las llaves del inmueble a EL LOCADOR, totalmente desocupado y en estado en que los recibe, independientemente de lo establecido en la cláusula quinta y aun cuando este contrato fuese prorrogado sucesivamente en su vigencia sin su consentimiento o consentimiento previo. Se compromete además al pago del alquiler a la simple presentación del recibo, si EL LOCATARIO no lo hiciere en fecha pactada. En caso de falencia, irresponsabilidad comprobada o fallecimiento del fiador, EL LOCADOR podrá pedir en cualquier momento otro garante en reemplazo del señalado en la presente cláusula y EL LOCATARIO deberá presentarlo en el plazo de 3 (tres) días, so pena de considerar rescindo el contrato. La presente codeudorìa solidaria se extiende inclusive a los daños y perjuicios o cualquier otro reclamo que conforme al presente acuerdo pudiera reclamarse al LOCATARIO.-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------";

const TEXTO_INFORMCONF_CON =
  'Por el presente instrumento tanto la persona CODEUDORA como EL LOCATARIO autorizan en forma expresa e irrevocable, otorgando suficiente mandato en los términos del Art. 917 Inc. "A" del Código Civil Paraguayo para que por su propia cuenta o a través de empresas especializadas de nuestro medio puedan recabar información en plaza referente a su situación patrimonial, solvencia económica o el cumplimiento de sus obligaciones comerciales. De igual manera y en los mismos términos, autorizan para que en caso de atraso superior a los noventa días en el pago del alquiler o cualquier otra deuda pendiente que mantengan con EL LOCADOR y/o representante incluyan sus nombres en el Registro General de Morosos Informconf. La eliminación de dicho registro se realiza de acuerdo a los términos establecidos en la Ley N° 1682/01 y su modificatoria Ley N° 1969/02.-------------------------------------------------------------------------------------------------------------------';

const TEXTO_INFORMCONF_SIN =
  'Por el presente instrumento EL LOCATARIO autoriza en forma expresa e irrevocable, otorgando suficiente mandato en los términos del Art. 917 Inc. "A" del Código Civil Paraguayo para que por su propia cuenta o a través de empresas especializadas de nuestro medio puedan recabar información en plaza referente a su situación patrimonial, solvencia económica o el cumplimiento de sus obligaciones comerciales. De igual manera y en los mismos términos, autoriza para que en caso de atraso superior a los noventa días en el pago del alquiler o cualquier otra deuda pendiente que mantenga con EL LOCADOR y/o representante incluyan su nombre en el Registro General de Morosos Informconf. La eliminación de dicho registro se realiza de acuerdo a los términos establecidos en la Ley N° 1682/01 y su modificatoria Ley N° 1969/02.-------------------------------------------------------------------------------------------------------------------';

const TEXTO_RIESGO =
  "El LOCATARIO toma a su cargo el riesgo por la utilización o manejo de cualquier artefacto o aparato de refrigeración o electricidad que esté en el inmueble arrendado o que fuera puesto en lo sucesivo, exonerando expresamente a EL LOCADOR de toda responsabilidad. Queda liberado EL LOCADOR de las responsabilidades civiles, por los daños y perjuicios que padezca EL LOCATARIO o terceros en sus personas y/o bienes, originados por accidentes dentro del inmueble locado.--";

const TEXTO_TERMINO =
  "El término de la presente locación, ya sea por vencimiento del plazo establecido o por falta de pago de alquileres en la forma indicada, o cualquier causa de rescisión de éste contrato, dará derecho al PROPIETARIO a hacerse cargo de inmediato del inmueble y ocuparlo, para lo cual queda expresamente autorizado por EL LOCATARIO, aunque éste estuviere ausente y el inmueble se hallare cerrado, a tomar posesión del inmueble con intervención judicial o notarial en su defecto, siendo suficiente la notificación por telegrama colacionado, de intimación de entrega del inmueble.-----------------------------";

const TEXTO_OBLIGACIONES =
  "Todas las obligaciones originadas y derivadas de esta locación regirán hasta el día en que EL LOCADOR, haya recibido el inmueble a entera satisfacción y bajo constancia escrita y aun si, vencido el plazo contractual, EL LOCATARIO continuara en el uso y goce del inmueble sin contrato alguno.---------------------------------------------------------------";

const TEXTO_JURISDICCION =
  "Las partes se someten voluntariamente a la Jurisdicción y Competencia de los Tribunales Ordinarios de la Ciudad de Luque, quedando sujetos a las disposiciones generales de La Ley, y en particular de los contratos de locación del Código Civil, Ley N° 1.183/5, renunciando a todo otro fuero o jurisdicción que pudiera corresponderles. Asimismo constituyen domicilio legal y especial en los respectivos domicilios reales, donde serán considerados válidas todas las intimaciones y notificaciones que en ellos se haga.----------------------------------------------------------------------------------";

function buildClausulasFinalesHtml(codeudor: CodeudorInfo) {
  const observaciones = codeudor.observacionesLimpias;
  const t = titulosClausulasFinales(codeudor.tieneCodeudor, Boolean(observaciones));
  const parts: string[] = [];

  if (codeudor.tieneCodeudor && t.codeudor) {
    parts.push(
      `<p><strong>${t.codeudor}:</strong> El/La Señor/a <strong>${codeudor.nombre.toUpperCase()}</strong>, con documento <strong>${codeudor.cedula || "_________________"}</strong> con domicilio particular en <strong>${(codeudor.direccion || "_________________").toUpperCase()}</strong> ${TEXTO_CODEUDOR_REST}</p>`
    );
  }

  parts.push(
    `<p><strong>${t.informconf}:</strong> ${codeudor.tieneCodeudor ? TEXTO_INFORMCONF_CON : TEXTO_INFORMCONF_SIN}</p>`
  );
  parts.push(`<p><strong>${t.riesgo}:</strong> ${TEXTO_RIESGO}</p>`);
  parts.push(`<p><strong>${t.termino}:</strong> ${TEXTO_TERMINO}</p>`);
  parts.push(`<p><strong>${t.obligaciones}:</strong> ${TEXTO_OBLIGACIONES}</p>`);

  if (observaciones && t.obs) {
    parts.push(
      `<p><strong>${t.obs} (OBSERVACIONES O CLÁUSULAS ESPECIALES):</strong> ${observaciones}</p>`
    );
  }

  parts.push(`<p><strong>${t.jurisdiccion}:</strong> ${TEXTO_JURISDICCION}</p>`);
  return parts.join("\n            ");
}

function buildFirmaCodeudorHtml(codeudor: CodeudorInfo) {
  if (!codeudor.tieneCodeudor) return "";
  return `
            <table style="margin-top: 50pt;">
                <tr>
                    <td style="text-align: center; width: 100%;">
                        ____________________________________<br/>
                        <strong>GARANTE / CODEUDOR</strong><br/>
                        <strong>${codeudor.nombre.toUpperCase()}</strong><br/>
                        C.I. N° ${codeudor.cedula || "_____________________"}
                    </td>
                </tr>
            </table>`;
}

const parseFechaContrato = (dateString?: string) => {
    if (!dateString) return ".................";
    try {
        const raw = String(dateString).trim();
        const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
            const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
            return d.toLocaleDateString("es-PY", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            });
        }
        const d = new Date(raw);
        if (isNaN(d.getTime())) return ".................";
        return d.toLocaleDateString("es-PY", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    } catch {
        return ".................";
    }
};

export const ContratoImprimible = ({ contractData, dataUnidad, localNisAnde, isPreview }: any) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!contractData) return null;

    const fechaInicio = parseFechaContrato(contractData.fechaInicioContrato);
    const fechaFin = parseFechaContrato(contractData.fechaFinContrato);

    const montoAlquiler = Number(contractData.montoMensualAlquiler || 0).toLocaleString('es-PY');
    const deposito = Number(contractData.depositoGarantia || 0).toLocaleString('es-PY');

    const fechaHoy = new Date();
    const diaHoy = fechaHoy.getDate().toString().padStart(2, '0');
    const mesHoy = fechaHoy.toLocaleDateString('es-PY', { month: 'long' });
    const anioHoy = fechaHoy.getFullYear();

    const codeudor = resolveCodeudor(contractData);
    const observaciones = codeudor.observacionesLimpias;
    const titulos = titulosClausulasFinales(codeudor.tieneCodeudor, Boolean(observaciones));
    const nombreLocatario = String(
      contractData.inquilino?.razonSocial ||
        contractData.inquilino?.nombre ||
        contractData.nombreCompleto ||
        "__________________________"
    ).toUpperCase();

    const content = (
            <div 
                id={isPreview ? "imprimible-contrato-preview" : "imprimible-contrato"} 
                className={isPreview 
                    ? "contrato-legal-doc text-black p-8 sm:p-16 text-[13px] leading-relaxed font-serif text-justify w-full mx-auto select-text" 
                    : "contrato-legal-doc hidden print:block bg-white text-black text-[13px] leading-relaxed font-serif text-justify"
                } 
                style={{ 
                    backgroundColor: 'white',
                    color: 'black',
                    fontFamily: "'Times New Roman', Times, serif",
                    WebkitPrintColorAdjust: 'exact', 
                    printColorAdjust: 'exact',
                } as React.CSSProperties}
            >
            
            <h1 className="text-center font-bold text-lg mb-6 uppercase">CONTRATO DE LOCACIÓN</h1>

            <p className="mb-4">
                Entre el Señor <strong>MARCELO ORTIGOZA</strong> con C.I. 3.389.403, en adelante denominado LOCADOR, por una parte, y el/la señor/a <strong>{nombreLocatario}</strong> con nro de documento <strong>{contractData.inquilino?.documento || contractData.inquilino?.cedula || contractData.cedula || "_________________"}</strong>, de Nacionalidad Paraguaya, fijando domicilio en la calle Melo de Portugal c/ Amistad, durante la duración del presente contrato, en adelante designado como: EL LOCATARIO, acuerdan libre y voluntariamente la celebración del presente contrato de locación de inmueble a ser ejecutado de conformidad con las cláusulas y condiciones siguientes:-------------
            </p>

            <p className="mb-4">
                <strong>PRIMERA:</strong> El LOCADOR da en locación al EL LOCATARIO un inmueble de su propiedad, individualizado con Cta. Cte. Ctral ........................................, ubicado en la calle Melo de Portugal c/ Amistad, <strong>Duplex {dataUnidad?.codigo || dataUnidad?.code || "_______"}</strong>, de la Ciudad de Luque.------
            </p>

            <p className="mb-4">
                <strong>SEGUNDA:</strong> El precio del alquiler mensual se fija en la suma de <strong>{montoAlquiler} Gs.</strong>, iva y {contractData.serviciosIncluidos ? `servicios incluidos (${contractData.serviciosIncluidos})` : 'expensas del condominio incluidas'}, pagaderos por adelantado del 01 al 05 de cada mes. El alquiler será abonado mensualmente a la CUENTA NRO 000-15-1049691, BANCO BNF A NOMBRE DEL LOCADOR MARCELO ORTIGOZA. No sufriendo incremento durante el periodo del presente contrato.
            </p>

            <p className="mb-4">
                <strong>TERCERA:</strong> En caso de atraso en el pago, EL LOCATARIO incurrirá automáticamente en mora y abonará una multa de treinta mil (30.000) guaraníes por cada día de atraso hasta la total cancelación, en forma indefectible; independientemente del monto del alquiler. El locador no estará obligado a recibir el alquiler si no fuere pagado juntamente con la multa.--
            </p>

            <p className="mb-4">
                <strong>CUARTA:</strong> La unidad locada es una casa independiente y será destinada única y exclusivamente para VIVIENDA de EL LOCATARIO {contractData.cantidadOcupantes ? `(autorizado para hasta ${contractData.cantidadOcupantes} ocupantes)` : ''}, no pudiendo ser subarrendada, en forma parcial ni total, ni recibir pensionistas, ni transferir ni ceder el presente contrato, bajo pena de rescisión.---------------------------
            </p>

            <p className="mb-4">
                <strong>QUINTA:</strong> El presente contrato tendrá vigencia desde el <strong>{fechaInicio}</strong> al <strong>{fechaFin}</strong>. Podrá ser prorrogado de común acuerdo. La conclusión de un nuevo contrato deberá hacerse por escrito, con no menos de (30) treinta días de antelación al vencimiento del presente contrato. En caso de no ser concluida la negociación del nuevo contrato y desde la fecha de vencimiento del presente, el valor de los alquileres correspondiente a los meses en que EL LOCATARIO persista en la tenencia, uso y/o habitación del inmueble será incrementado automáticamente en un treinta por ciento (30%) más, calculado sobre el precio pactado en la clausula segunda, esto sin necesidad de notificación alguna y sin que signifique aceptación o reconducción del contrato por cualquier otro período. EL LOCADOR podrá optar siempre por solicitar al LOCATARIO el desalojo del inmueble locado, quedando obligado éste último al pago de los alquileres correspondientes con los aumentos descriptos y demás obligaciones estipuladas en el presente contrato, hasta la efectiva entrega y aceptación por parte de EL LOCADOR.---------
            </p>

            <p className="mb-4">
                <strong>SEXTA:</strong> EL LOCATARIO recibe la unidad dada en locación con su pintura en buen estado y todas sus instalaciones en perfecto funcionamiento, con todos sus herrajes, vidrios, llaves y demás accesorios, así como también bienes muebles, obligándose a mantener y devolver la unidad locada, al término de la locación en las mismas condiciones en que fue recibida, salvo caso de los deterioros propios de las cosas ocasionados por el buen uso y acción del tiempo, debidamente comprobados y consentidos por EL LOCADOR. EL LOCADOR se reserva el derecho a efectuar inspecciones periódicas al inmueble de forma personal o designando al efecto una persona de su confianza para la constatación del buen uso y estado de conservación de la cosa, objeto del presente acto jurídico, con acuerdo previo de EL LOCATARIO. En caso de no lograrse un acuerdo para dichas inspecciones, EL LOCADOR podrá realizarlas igualmente comunicando con veinticuatro (24) horas de antelación la realización de las mismas, no pudiendo EL LOCATARIO negarle la entrada ni el paso al LOCADOR o a las personas designadas por éste para el efecto. EL LOCATARIO queda con el compromiso de hacer periódicamente el mantenimiento de los Split previa entrega de comprobantes al LOCADOR.-----------------------------------------------------------------------
            </p>

            <p className="mb-4">
                <strong>SEPTIMA:</strong> EL LOCATARIO podrá rescindir unilateralmente el presente contrato, con preaviso de sesenta (60) días, dado por telegrama colacionado o nota debidamente recibida por EL LOCADOR. En caso de incumplimiento de lo antedicho y siempre que la rescisión no fuere causada por culpa del EL LOCADOR, éste tendrá derecho a percibir como compensación el importe de dos (2) meses de alquiler que EL LOCATARIO se obliga a abonar en concepto de indemnización, asimismo EL LOCATARIO perderá automáticamente el importe entregado como depósito en garantía. Además, EL LOCATARIO faculta expresamente a EL LOCADOR a permitir el ingreso a la unidad arrendada a eventuales interesados en el posterior alquiler, en días y horarios a ser convenidos con EL LOCATARIO. En caso de no lograrse un acuerdo para dichas muestras, El LOCADOR podrá realizarlas igualmente comunicando con veinticuatro (24) horas de antelación la realización de las mismas, no pudiendo EL LOCATARIO negarle la entrada ni el paso al LOCADOR o a las personas designadas por éste para el efecto, ni a los terceros interesados. EL LOCADOR por su parte podrá rescindir el presente contrato, notificando la medida a EL LOCATARIO, por escrito y con una antelación no menor a sesenta (60) días calendarios sin quedar obligado a abonar ningún tipo de indemnización a EL LOCATARIO.--------------------------------------
            </p>

            <p className="mb-4">
                <strong>OCTAVA:</strong> El LOCATARIO no podrá sin expresa autorización escrita de EL LOCADOR modificar la estructura interna y/o externa de la unidad locada, ni introducir mejoras de ninguna clase como por ejemplo: a) colocar alfombras con pegamentos en los pisos, b) pintar las paredes y/o aberturas de un color distinto al actual, ni cualquier otra alteración a la structure del inmueble locado como tampoco en lo superficial; la cita de los ejemplos son meramente enunciativas, extendiéndose la prohibición de conformidad a lo establecido en el presente. Cualquier violación a ésta cláusula, exonerará a EL LOCADOR del pago de las mismas, salvo caso de aceptación expresa y por escrito de las modificaciones, pero quedando siempre las mejoras en beneficio de la unidad locada. EL LOCADOR podrá igualmente optar por la devolución del inmueble en el mismo estado en el que se encontraba al momento de la entrega del mismo al LOCATARIO, corriendo por cuenta de éste, todos los gastos que demande dicha transformación.-----------------------------
            </p>

            <p className="mb-4">
                <strong>NOVENA:</strong> Será por cuenta de EL LOCATARIO el pago mensual y puntual de los servicios públicos energía eléctrica (ANDE, NIS: <strong>{localNisAnde || dataUnidad?.nisAnde || "________________"}</strong>), solo agua y basura incluyen en el costo del alquiler, haciéndose cargo de cualquier problema que surgiere como consecuencia de la falta de pago a tiempo de los mismos. Así mismo, está obligado a la conservación de los recibos por los pagos realizados y a la entrega de las copias de los mismos a EL LOCADOR, todos los meses, en ocasión del pago del alquiler.--------------------------------------------------------------------------
            </p>

            <p className="mb-4">
                <strong>DECIMA:</strong> La eventual conexión de videocable, línea telefónica y/o de Internet, será contratada en forma particular y exclusiva por EL LOCATARIO, obligándose a rescindir el contrato con la empresa pertinente, al concluir el plazo de la presente locación y exonerando en forma expresa a EL LOCADOR por responsabilidad alguna respecto a dichas eventuales conexiones.------------------------------------------------------------------------------------------------
            </p>

            <p className="mb-4">
                <strong>DECIMA PRIMERA:</strong> EL LOCATARIO se obliga al fiel cumplimiento de las cláusulas y condiciones pactadas en el presente contrato de locación cuyo incumplimiento por parte de EL LOCATARIO autorizará de pleno derecho a EL LOCADOR a rescindirlo unilateralmente y a exigir el inmediato desalojo de la unidad arrendada. EL LOCATARIO quedará obligado además y sin perjuicio de otras reclamaciones posteriores al pago del equivalente a dos (2) meses de alquiler como cláusula penal en concepto de indemnización por incumplimiento de contrato, asimismo EL LOCATARIO perderá automáticamente el importe entregado como depósito en garantía.---
            </p>

            <p className="mb-4">
                <strong>DECIMA SEGUNDA:</strong> El presente contrato caducará de pleno derecho por la falta de pago de dos (2) mensualidades consecutivas de conformidad a lo establecido en el Art. 837 inc h) del Código Civil Paraguayo, dando derecho a EL LOCADOR a rescindir el presente contrato y exigir el inmediato desalojo de la unidad arrendada y sin perjuicio de reclamar el pago de las sumas adeudadas, incluidas las estipuladas en todas las cláusulas del presente contrato, en especial en la TERCERA Y DECIMA SEGUNDA.-----------
            </p>

            <p className="mb-4">
                <strong>DECIMA TERCERA:</strong> EL LOCATARIO entregará a EL LOCADOR la cantidad de Gs. <strong>{deposito}</strong>, en concepto de depósito en garantía, 1er pago a realizarse, debiendo ser documentada dicha entrega con los correspondientes recibos. Dicho depósito no devengará interés alguno, ni podrá ser imputado al pago de mensualidades atrasadas y sólo será devuelto a EL LOCATARIO, previa deducción de las deudas a su cargo en concepto de servicios públicos o de posibles deterioros del inmueble, a los sesenta (60) días de concluida la locación y realizada la entrega y aceptación del inmueble. En caso que este depósito no cubra los daños y gastos, EL LOCATARIO deberá abonar la totalidad del importe de los mismos. EL LOCATARIO perderá está garantía en caso de desalojo o rescisión culpable. En caso de que el alquiler del presente inmueble sea objeto de renovación, la garantía quedará como tal en poder del LOCADOR bajo los mismos términos, debiendo EL LOCATARIO completar proporcionalmente al aumento de la nueva mensualidad y entregar la diferencia al LOCADOR al momento de la firma del nuevo contrato.--------------------------------------------
            </p>

            <p className="mb-4">
                <strong>DECIMA CUARTA:</strong> La recepción del inmueble se realizará de la manera como indica ésta cláusula, no siendo aceptada ninguna otra forma de recepción: A más tardar ocho días antes del vencimiento del presente contrato EL LOCATARIO deberá acordar con EL LOCADOR día y horas hábiles para efectuar la constatación visual del estado general del inmueble, debiendo facilitar EL LOCATARIO las condiciones que permitan dicha verificación, encontrándose el inmueble sin mobiliario alguno que imposibilite la tarea. Hallándose el inmueble en las mismas condiciones de entrega y en perfecto funcionamiento de todos sus accesorios, se procederá a la recepción del inmueble, previa presentación de las últimas facturas abonadas por los servicios de luz; debiendo además entregar a EL LOCADOR la suma que resulte necesaria para cancelar las facturas pendientes de pago, en cuyo caso se tomará como base el promedio resultante de los importes que figuren en las facturas anteriores con hasta tres meses de anticipación y que cubran los periodos hasta la recepción del inmueble. En caso de que dichos promedios no cubran la totalidad de la deuda, la diferencia deberá ser abonada por EL LOCATARIO y éste quedará obligado ante el requerimiento del LOCADOR.-
            </p>

            <p className="mb-4">
                <strong>DECIMA QUINTA:</strong> EL LOCATARIO también se obliga a comunicar, bajo constancia escrita y con la debida antelación, al LOCADOR en caso que tuviera que ausentarse del país o dejar libre la unidad locada, designando la persona responsable de abonar los servicios públicos y mensualidades, así como la persona que pueda ingresar a la unidad en su ausencia. EL LOCATARIO no podrá introducir ni utilizar la unidad locada, para el almacenamiento de materiales explosivos, combustibles o inflamables y/o que sean peligrosos y que por su naturaleza pudiera ocasionar o causar daños y/o molestias, haciéndose exclusivamente responsable de los daños y perjuicios que por tales hechos sean ocasionados en caso de ejecutarlos, reservándose EL LOCADOR el derecho de accionar judicialmente.-------------
            </p>

            {codeudor.tieneCodeudor && titulos.codeudor && (
            <p className="mb-4">
                <strong>{titulos.codeudor}:</strong> El/La Señor/a <strong>{codeudor.nombre.toUpperCase()}</strong>, con documento <strong>{codeudor.cedula || "_________________"}</strong> con domicilio particular en <strong>{(codeudor.direccion || "_________________").toUpperCase()}</strong> {TEXTO_CODEUDOR_REST}
            </p>
            )}

            <p className="mb-4">
                <strong>{titulos.informconf}:</strong> {codeudor.tieneCodeudor ? TEXTO_INFORMCONF_CON : TEXTO_INFORMCONF_SIN}
            </p>

            <p className="mb-4">
                <strong>{titulos.riesgo}:</strong> {TEXTO_RIESGO}
            </p>

            <p className="mb-4">
                <strong>{titulos.termino}:</strong> {TEXTO_TERMINO}
            </p>

            <p className="mb-4">
                <strong>{titulos.obligaciones}:</strong> {TEXTO_OBLIGACIONES}
            </p>

            {observaciones && titulos.obs && (
                <p className="mb-4">
                    <strong>{titulos.obs} (OBSERVACIONES O CLÁUSULAS ESPECIALES):</strong> {observaciones}
                </p>
            )}

            <p className="mb-4">
                <strong>{titulos.jurisdiccion}:</strong> {TEXTO_JURISDICCION}
            </p>

            <div className="break-inside-avoid">
                <p className="mb-8 mt-6 font-bold text-center">
                    EN PRUEBA DE CONFORMIDAD, firman las partes contratantes en un mismo tenor y a un solo efecto, a los {diaHoy} días del mes de {mesHoy} del año {anioHoy}.-------------
                </p>

                <div className="flex justify-between items-end mt-16 mb-10 px-10">
                    <div className="text-center w-[30%]">
                        <div className="border-t border-black mb-2"></div>
                        <p className="font-bold">EL LOCADOR</p>
                        <p className="text-xs">MARCELO ORTIGOZA</p>
                        <p className="text-xs">C.I. N° 3.389.403</p>
                    </div>
                    <div className="text-center w-[30%]">
                        <div className="border-t border-black mb-2"></div>
                        <p className="font-bold">EL LOCATARIO</p>
                        <p className="text-xs font-bold">{nombreLocatario}</p>
                        <p className="text-xs">C.I. N° {contractData.inquilino?.documento || contractData.inquilino?.cedula || contractData.cedula || "_____________________"}</p>
                    </div>
                </div>
                
                {codeudor.tieneCodeudor && (
                <div className="flex justify-center items-end mt-10 px-10 pb-8">
                    <div className="text-center w-[30%]">
                        <div className="border-t border-black mb-2"></div>
                        <p className="font-bold">GARANTE / CODEUDOR</p>
                        <p className="text-xs font-bold">{codeudor.nombre.toUpperCase()}</p>
                        <p className="text-xs">C.I. N° {codeudor.cedula || "_____________________"}</p>
                    </div>
                </div>
                )}
            </div>
        </div>
    );

    if (isPreview) {
        return (
            <>
                {content}
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        @page {
                            margin: 1.8cm 2cm;
                            size: A4 portrait;
                        }
                        html, body {
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        body * { visibility: hidden !important; }
                        .contrato-legal-doc,
                        .contrato-legal-doc * {
                            visibility: visible !important;
                        }
                        .contrato-legal-doc {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            color: #000 !important;
                            font-family: 'Times New Roman', Times, serif !important;
                            font-size: 11pt !important;
                            line-height: 1.5 !important;
                            text-align: justify !important;
                            box-shadow: none !important;
                            border: none !important;
                            border-radius: 0 !important;
                            z-index: 999999 !important;
                        }
                        .contrato-legal-doc h1 {
                            font-size: 14pt !important;
                            text-align: center !important;
                            font-weight: bold !important;
                            margin-bottom: 16pt !important;
                        }
                        .contrato-legal-doc p {
                            margin-bottom: 10pt !important;
                            orphans: 3;
                            widows: 3;
                        }
                    }
                `}} />
            </>
        );
    }

    if (!mounted) return null;

    return createPortal(
        <>
            {content}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { 
                        margin: 1.8cm 2cm 1.8cm 2cm;
                        size: A4 portrait;
                    }
                    html, body {
                        height: auto !important;
                        min-height: 100% !important;
                        overflow: visible !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    .contrato-legal-doc, .contrato-legal-doc * {
                        visibility: visible !important;
                    }
                    #imprimible-contrato.contrato-legal-doc {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        display: block !important;
                        background-color: white !important;
                        color: #000 !important;
                        font-family: 'Times New Roman', Times, serif !important;
                        font-size: 11pt !important;
                        line-height: 1.5 !important;
                        text-align: justify !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                        z-index: 999999 !important;
                    }
                    .contrato-legal-doc h1 {
                        font-size: 14pt !important;
                        text-align: center !important;
                    }
                    .contrato-legal-doc p {
                        orphans: 3;
                        widows: 3;
                    }
                }
            `}} />
        </>,
        document.body
    );
};

export const descargarContratoDoc = (contractData: any, dataUnidad: any) => {
    if (!contractData) return;
    const nombre = String(contractData?.inquilino?.razonSocial || contractData?.inquilino?.nombre || contractData?.nombreCompleto || "__________________________").toUpperCase();
    const cedula = contractData?.inquilino?.documento || contractData?.inquilino?.cedula || contractData?.cedula || "_________________";
    const code = dataUnidad?.codigo || dataUnidad?.code || "_______";
    const monto = Number(contractData?.montoMensualAlquiler || contractData?.montoAlquiler || 0).toLocaleString("es-PY");
    const nis = contractData?.nisAnde || dataUnidad?.nisAnde || "________________";
    const deposito = Number(contractData?.depositoGarantia || contractData?.montoDepositoGarantia || contractData?.deposito || 0).toLocaleString("es-PY");
    const codeudor = resolveCodeudor(contractData);
    const servicios = contractData?.serviciosIncluidos ? `servicios incluidos (${contractData?.serviciosIncluidos})` : 'expensas del condominio incluidas';
    const ocupantes = contractData?.cantidadOcupantes ? `(autorizado para hasta ${contractData?.cantidadOcupantes} ocupantes)` : '';

    const fInicio = parseFechaContrato(contractData?.fechaInicioContrato);
    const fFin = parseFechaContrato(contractData?.fechaFinContrato);

    const fechaHoy = new Date();
    const diaHoy = fechaHoy.getDate().toString().padStart(2, '0');
    const mesHoy = fechaHoy.toLocaleDateString('es-PY', { month: 'long' });
    const anioHoy = fechaHoy.getFullYear();
    const clausulasFinales = buildClausulasFinalesHtml(codeudor);
    const firmaCodeudor = buildFirmaCodeudorHtml(codeudor);

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Contrato de Locación - ${code}</title>
            <style>
                @page { margin: 2cm; size: A4 portrait; }
                body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; text-align: justify; color: #000; }
                h1 { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20pt; }
                p { margin-bottom: 12pt; text-align: justify; }
                table { width: 100%; border-collapse: collapse; margin-top: 40pt; }
                td { vertical-align: top; }
            </style>
        </head>
        <body>
            <h1>CONTRATO DE LOCACIÓN</h1>

            <p>Entre el Señor <strong>MARCELO ORTIGOZA</strong> con C.I. 3.389.403, en adelante denominado LOCADOR, por una parte, y el/la señor/a <strong>${nombre}</strong> con nro de documento <strong>${cedula}</strong>, de Nacionalidad Paraguaya, fijando domicilio en la calle Melo de Portugal c/ Amistad, durante la duración del presente contrato, en adelante designado como: EL LOCATARIO, acuerdan libre y voluntariamente la celebración del presente contrato de locación de inmueble a ser ejecutado de conformidad con las cláusulas y condiciones siguientes:-------------</p>

            <p><strong>PRIMERA:</strong> El LOCADOR da en locación al EL LOCATARIO un inmueble de su propiedad, individualizado con Cta. Cte. Ctral ........................................, ubicado en la calle Melo de Portugal c/ Amistad, <strong>Duplex ${code}</strong>, de la Ciudad de Luque.------</p>

            <p><strong>SEGUNDA:</strong> El precio del alquiler mensual se fija en la suma de <strong>${monto} Gs.</strong>, iva y ${servicios}, pagaderos por adelantado del 01 al 05 de cada mes. El alquiler será abonado mensualmente a la CUENTA NRO 000-15-1049691, BANCO BNF A NOMBRE DEL LOCADOR MARCELO ORTIGOZA. No sufriendo incremento durante el periodo del presente contrato.</p>

            <p><strong>TERCERA:</strong> En caso de atraso en el pago, EL LOCATARIO incurrirá automáticamente en mora y abonará una multa de treinta mil (30.000) guaraníes por cada día de atraso hasta la total cancelación, en forma indefectible; independientemente del monto del alquiler. El locador no estará obligado a recibir el alquiler si no fuere pagado juntamente con la multa.--</p>

            <p><strong>CUARTA:</strong> La unidad locada es una casa independiente y será destinada única y exclusivamente para VIVIENDA de EL LOCATARIO ${ocupantes}, no pudiendo ser subarrendada, en forma parcial ni total, ni recibir pensionistas, ni transferir ni ceder el presente contrato, bajo pena de rescisión.---------------------------</p>

            <p><strong>QUINTA:</strong> El presente contrato tendrá vigencia desde el <strong>${fInicio}</strong> al <strong>${fFin}</strong>. Podrá ser prorrogado de común acuerdo. La conclusión de un nuevo contrato deberá hacerse por escrito, con no menos de (30) treinta días de antelación al vencimiento del presente contrato. En caso de no ser concluida la negociación del nuevo contrato y desde la fecha de vencimiento del presente, el valor de los alquileres correspondiente a los meses en que EL LOCATARIO persista en la tenencia, uso y/o habitación del inmueble será incrementado automáticamente en un treinta por ciento (30%) más, calculado sobre el precio pactado en la clausula segunda, esto sin necesidad de notificación alguna y sin que signifique aceptación o reconducción del contrato por cualquier otro período. EL LOCADOR podrá optar siempre por solicitar al LOCATARIO el desalojo del inmueble locado, quedando obligado éste último al pago de los alquileres correspondientes con los aumentos descriptos y demás obligaciones estipuladas en el presente contrato, hasta la efectiva entrega y aceptación por parte de EL LOCADOR.---------</p>

            <p><strong>SEXTA:</strong> EL LOCATARIO recibe la unidad dada en locación con su pintura en buen estado y todas sus instalaciones en perfecto funcionamiento, con todos sus herrajes, vidrios, llaves y demás accesorios, así como también bienes muebles, obligándose a mantener y devolver la unidad locada, al término de la locación en las mismas condiciones en que fue recibida, salvo caso de los deterioros propios de las cosas ocasionados por el buen uso y acción del tiempo, debidamente comprobados y consentidos por EL LOCADOR. EL LOCADOR se reserva el derecho a efectuar inspecciones periódicas al inmueble de forma personal o designando al efecto una persona de su confianza para la constatación del buen uso y estado de conservación de la cosa, objeto del presente acto jurídico, con acuerdo previo de EL LOCATARIO. En caso de no lograrse un acuerdo para dichas inspecciones, EL LOCADOR podrá realizarlas igualmente comunicando con veinticuatro (24) horas de antelación la realización de las mismas, no pudiendo EL LOCATARIO negarle la entrada ni el paso al LOCADOR o a las personas designadas por éste para el efecto. EL LOCATARIO queda con el compromiso de hacer periódicamente el mantenimiento de los Split previa entrega de comprobantes al LOCADOR.-----------------------------------------------------------------------</p>

            <p><strong>SEPTIMA:</strong> EL LOCATARIO podrá rescindir unilateralmente el presente contrato, con preaviso de sesenta (60) días, dado por telegrama colacionado o nota debidamente recibida por EL LOCADOR. En caso de incumplimiento de lo antedicho y siempre que la rescisión no fuere causada por culpa del EL LOCADOR, éste tendrá derecho a percibir como compensación el importe de dos (2) meses de alquiler que EL LOCATARIO se obliga a abonar en concepto de indemnización, asimismo EL LOCATARIO perderá automáticamente el importe entregado como depósito en garantía. Además, EL LOCATARIO faculta expresamente a EL LOCADOR a permitir el ingreso a la unidad arrendada a eventuales interesados en el posterior alquiler, en días y horarios a ser convenidos con EL LOCATARIO. En caso de no lograrse un acuerdo para dichas muestras, El LOCADOR podrá realizarlas igualmente comunicando con veinticuatro (24) horas de antelación la realización de las mismas, no pudiendo EL LOCATARIO negarle la entrada ni el paso al LOCADOR o a las personas designadas por éste para el efecto, ni a los terceros interesados. EL LOCADOR por su parte podrá rescindir el presente contrato, notificando la medida a EL LOCATARIO, por escrito y con una antelación no menor a sesenta (60) días calendarios sin quedar obligado a abonar ningún tipo de indemnización a EL LOCATARIO.--------------------------------------</p>

            <p><strong>OCTAVA:</strong> El LOCATARIO no podrá sin expresa autorización escrita de EL LOCADOR modificar la estructura interna y/o externa de la unidad locada, ni introducir mejoras de ninguna clase como por ejemplo: a) colocar alfombras con pegamentos en los pisos, b) pintar las paredes y/o aberturas de un color distinto al actual, ni cualquier otra alteración a la structure del inmueble locado como tampoco en lo superficial; la cita de los ejemplos son meramente enunciativas, extendiéndose la prohibición de conformidad a lo establecido en el presente. Cualquier violación a ésta cláusula, exonerará a EL LOCADOR del pago de las mismas, salvo caso de aceptación expresa y por escrito de las modificaciones, pero quedando siempre las mejoras en beneficio de la unidad locada. EL LOCADOR podrá igualmente optar por la devolución del inmueble en el mismo estado en el que se encontraba al momento de la entrega del mismo al LOCATARIO, corriendo por cuenta de éste, todos los gastos que demande dicha transformación.-----------------------------</p>

            <p><strong>NOVENA:</strong> Será por cuenta de EL LOCATARIO el pago mensual y puntual de los servicios públicos energía eléctrica (ANDE, NIS: <strong>${nis}</strong>), solo agua y basura incluyen en el costo del alquiler, haciéndose cargo de cualquier problema que surgiere como consecuencia de la falta de pago a tiempo de los mismos. Así mismo, está obligado a la conservación de los recibos por los pagos realizados y a la entrega de las copias de los mismos a EL LOCADOR, todos los meses, en ocasión del pago del alquiler.--------------------------------------------------------------------------</p>

            <p><strong>DECIMA:</strong> La eventual conexión de videocable, línea telefónica y/o de Internet, será contratada en forma particular y exclusiva por EL LOCATARIO, obligándose a rescindir el contrato con la empresa pertinente, al concluir el plazo de la presente locación y exonerando en forma expresa a EL LOCADOR por responsabilidad alguna respecto a dichas eventuales conexiones.------------------------------------------------------------------------------------------------</p>

            <p><strong>DECIMA PRIMERA:</strong> EL LOCATARIO se obliga al fiel cumplimiento de las cláusulas y condiciones pactadas en el presente contrato de locación cuyo incumplimiento por parte de EL LOCATARIO autorizará de pleno derecho a EL LOCADOR a rescindirlo unilateralmente y a exigir el inmediato desalojo de la unidad arrendada. EL LOCATARIO quedará obligado además y sin perjuicio de otras reclamaciones posteriores al pago del equivalente a dos (2) meses de alquiler como cláusula penal en concepto de indemnización por incumplimiento de contrato, asimismo EL LOCATARIO perderá automáticamente el importe entregado como depósito en garantía.---</p>

            <p><strong>DECIMA SEGUNDA:</strong> El presente contrato caducará de pleno derecho por la falta de pago de dos (2) mensualidades consecutivas de conformidad a lo establecido en el Art. 837 inc h) del Código Civil Paraguayo, dando derecho a EL LOCADOR a rescindir el presente contrato y exigir el inmediato desalojo de la unidad arrendada y sin perjuicio de reclamar el pago de las sumas adeudadas, incluidas las estipuladas en todas las cláusulas del presente contrato, en especial en la TERCERA Y DECIMA SEGUNDA.-----------</p>

            <p><strong>DECIMA TERCERA:</strong> EL LOCATARIO entregará a EL LOCADOR la cantidad de Gs. <strong>${deposito}</strong>, en concepto de depósito en garantía, 1er pago a realizarse, debiendo ser documentada dicha entrega con los correspondientes recibos. Dicho depósito no devengará interés alguno, ni podrá ser imputado al pago de mensualidades atrasadas y sólo será devuelto a EL LOCATARIO, previa deducción de las deudas a su cargo en concepto de servicios públicos o de posibles deterioros del inmueble, a los sesenta (60) días de concluida la locación y realizada la entrega y aceptación del inmueble. En caso que este depósito no cubra los daños y gastos, EL LOCATARIO deberá abonar la totalidad del importe de los mismos. EL LOCATARIO perderá está garantía en caso de desalojo o rescisión culpable. En caso de que el alquiler del presente inmueble sea objeto de renovación, la garantía quedará como tal en poder del LOCADOR bajo los mismos términos, debiendo EL LOCATARIO completar proporcionalmente al aumento de la nueva mensualidad y entregar la diferencia al LOCADOR al momento de la firma del nuevo contrato.--------------------------------------------</p>

            <p><strong>DECIMA CUARTA:</strong> La recepción del inmueble se realizará de la manera como indica ésta cláusula, no siendo aceptada ninguna otra forma de recepción: A más tardar ocho días antes del vencimiento del presente contrato EL LOCATARIO deberá acordar con EL LOCADOR día y horas hábiles para efectuar la constatación visual del estado general del inmueble, debiendo facilitar EL LOCATARIO las condiciones que permitan dicha verificación, encontrándose el inmueble sin mobiliario alguno que imposibilite la tarea. Hallándose el inmueble en las mismas condiciones de entrega y en perfecto funcionamiento de todos sus accesorios, se procederá a la recepción del inmueble, previa presentación de las últimas facturas abonadas por los servicios de luz; debiendo además entregar a EL LOCADOR la suma que resulte necesaria para cancelar las facturas pendientes de pago, en cuyo caso se tomará como base el promedio resultante de los importes que figuren en las facturas anteriores con hasta tres meses de anticipación y que cubran los periodos hasta la recepción del inmueble. En caso de que dichos promedios no cubran la totalidad de la deuda, la diferencia deberá ser abonada por EL LOCATARIO y éste quedará obligado ante el requerimiento del LOCADOR.-</p>

            <p><strong>DECIMA QUINTA:</strong> EL LOCATARIO también se obliga a comunicar, bajo constancia escrita y con la debida antelación, al LOCADOR en caso que tuviera que ausentarse del país o dejar libre la unidad locada, designando la persona responsable de abonar los servicios públicos y mensualidades, así como la persona que pueda ingresar a la unidad en su ausencia. EL LOCATARIO no podrá introducir ni utilizar la unidad locada, para el almacenamiento de materiales explosivos, combustibles o inflamables y/o que sean peligrosos y que por su naturaleza pudiera ocasionar o causar daños y/o molestias, haciéndose exclusivamente responsable de los daños y perjuicios que por tales hechos sean ocasionados en caso de ejecutarlos, reservándose EL LOCADOR el derecho de accionar judicialmente.-------------</p>

            ${clausulasFinales}

            <p style="text-align: center; font-weight: bold; margin-top: 30pt; margin-bottom: 40pt;">EN PRUEBA DE CONFORMIDAD, firman las partes contratantes en un mismo tenor y a un solo efecto, a los ${diaHoy} días del mes de ${mesHoy} del año ${anioHoy}.-------------</p>

            <table>
                <tr>
                    <td style="text-align: center; width: 45%;">
                        ____________________________________<br/>
                        <strong>EL LOCADOR</strong><br/>
                        MARCELO ORTIGOZA<br/>
                        C.I. N° 3.389.403
                    </td>
                    <td style="width: 10%;"></td>
                    <td style="text-align: center; width: 45%;">
                        ____________________________________<br/>
                        <strong>EL LOCATARIO</strong><br/>
                        <strong>${nombre}</strong><br/>
                        C.I. N° ${cedula}
                    </td>
                </tr>
            </table>
${firmaCodeudor}
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Contrato_Locacion_${code}_${nombre.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const descargarContratoPDF = async (contractData: any, dataUnidad: any, soloRetornarFile = false) => {
    if (!contractData) return;
    const nombre = String(contractData?.inquilino?.razonSocial || contractData?.inquilino?.nombre || contractData?.nombreCompleto || "__________________________").toUpperCase();
    const cedula = contractData?.inquilino?.documento || contractData?.inquilino?.cedula || contractData?.cedula || "_________________";
    const code = dataUnidad?.codigo || dataUnidad?.code || "_______";
    const monto = Number(contractData?.montoMensualAlquiler || contractData?.montoAlquiler || 0).toLocaleString("es-PY");
    const nis = contractData?.nisAnde || dataUnidad?.nisAnde || "________________";
    const deposito = Number(contractData?.depositoGarantia || contractData?.montoDepositoGarantia || contractData?.deposito || 0).toLocaleString("es-PY");
    const codeudor = resolveCodeudor(contractData);
    const servicios = contractData?.serviciosIncluidos ? `servicios incluidos (${contractData?.serviciosIncluidos})` : 'expensas del condominio incluidas';
    const ocupantes = contractData?.cantidadOcupantes ? `(autorizado para hasta ${contractData?.cantidadOcupantes} ocupantes)` : '';

    const fInicio = parseFechaContrato(contractData?.fechaInicioContrato);
    const fFin = parseFechaContrato(contractData?.fechaFinContrato);

    const fechaHoy = new Date();
    const diaHoy = fechaHoy.getDate().toString().padStart(2, '0');
    const mesHoy = fechaHoy.toLocaleDateString('es-PY', { month: 'long' });
    const anioHoy = fechaHoy.getFullYear();
    const clausulasFinales = buildClausulasFinalesHtml(codeudor);
    const firmaCodeudor = buildFirmaCodeudorHtml(codeudor);
    // 1. Contenedor off-screen con tipografía legal (Times) — mismo formato que el DOC
    const element = document.createElement("div");
    element.style.position = "fixed";
    element.style.left = "-10000px";
    element.style.top = "0";
    element.style.padding = "48px 56px";
    element.style.width = "800px";
    element.style.background = "white";
    element.style.color = "#000";
    element.style.fontFamily = "'Times New Roman', Times, serif";
    element.style.fontSize = "11pt";
    element.style.lineHeight = "1.5";
    element.style.textAlign = "justify";
    element.style.zIndex = "-1";
    
    // Aquí pegamos tu contenido HTML (el mismo que tenías para Word)
    element.innerHTML = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Contrato de Locación - ${code}</title>
            <style>
                @page { margin: 2cm; size: A4 portrait; }
                body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; text-align: justify; color: #000; }
                h1 { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20pt; }
                p { margin-bottom: 12pt; text-align: justify; }
                table { width: 100%; border-collapse: collapse; margin-top: 40pt; }
                td { vertical-align: top; }
            </style>
        </head>
        <body>
            <h1>CONTRATO DE LOCACIÓN</h1>

            <p>Entre el Señor <strong>MARCELO ORTIGOZA</strong> con C.I. 3.389.403, en adelante denominado LOCADOR, por una parte, y el/la señor/a <strong>${nombre}</strong> con nro de documento <strong>${cedula}</strong>, de Nacionalidad Paraguaya, fijando domicilio en la calle Melo de Portugal c/ Amistad, durante la duración del presente contrato, en adelante designado como: EL LOCATARIO, acuerdan libre y voluntariamente la celebración del presente contrato de locación de inmueble a ser ejecutado de conformidad con las cláusulas y condiciones siguientes:-------------</p>

            <p><strong>PRIMERA:</strong> El LOCADOR da en locación al EL LOCATARIO un inmueble de su propiedad, individualizado con Cta. Cte. Ctral ........................................, ubicado en la calle Melo de Portugal c/ Amistad, <strong>Duplex ${code}</strong>, de la Ciudad de Luque.------</p>

            <p><strong>SEGUNDA:</strong> El precio del alquiler mensual se fija en la suma de <strong>${monto} Gs.</strong>, iva y ${servicios}, pagaderos por adelantado del 01 al 05 de cada mes. El alquiler será abonado mensualmente a la CUENTA NRO 000-15-1049691, BANCO BNF A NOMBRE DEL LOCADOR MARCELO ORTIGOZA. No sufriendo incremento durante el periodo del presente contrato.</p>

            <p><strong>TERCERA:</strong> En caso de atraso en el pago, EL LOCATARIO incurrirá automáticamente en mora y abonará una multa de treinta mil (30.000) guaraníes por cada día de atraso hasta la total cancelación, en forma indefectible; independientemente del monto del alquiler. El locador no estará obligado a recibir el alquiler si no fuere pagado juntamente con la multa.--</p>

            <p><strong>CUARTA:</strong> La unidad locada es una casa independiente y será destinada única y exclusivamente para VIVIENDA de EL LOCATARIO ${ocupantes}, no pudiendo ser subarrendada, en forma parcial ni total, ni recibir pensionistas, ni transferir ni ceder el presente contrato, bajo pena de rescisión.---------------------------</p>

            <p><strong>QUINTA:</strong> El presente contrato tendrá vigencia desde el <strong>${fInicio}</strong> al <strong>${fFin}</strong>. Podrá ser prorrogado de común acuerdo. La conclusión de un nuevo contrato deberá hacerse por escrito, con no menos de (30) treinta días de antelación al vencimiento del presente contrato. En caso de no ser concluida la negociación del nuevo contrato y desde la fecha de vencimiento del presente, el valor de los alquileres correspondiente a los meses en que EL LOCATARIO persista en la tenencia, uso y/o habitación del inmueble será incrementado automáticamente en un treinta por ciento (30%) más, calculado sobre el precio pactado en la clausula segunda, esto sin necesidad de notificación alguna y sin que signifique aceptación o reconducción del contrato por cualquier otro período. EL LOCADOR podrá optar siempre por solicitar al LOCATARIO el desalojo del inmueble locado, quedando obligado éste último al pago de los alquileres correspondientes con los aumentos descriptos y demás obligaciones estipuladas en el presente contrato, hasta la efectiva entrega y aceptación por parte de EL LOCADOR.---------</p>

            <p><strong>SEXTA:</strong> EL LOCATARIO recibe la unidad dada en locación con su pintura en buen estado y todas sus instalaciones en perfecto funcionamiento, con todos sus herrajes, vidrios, llaves y demás accesorios, así como también bienes muebles, obligándose a mantener y devolver la unidad locada, al término de la locación en las mismas condiciones en que fue recibida, salvo caso de los deterioros propios de las cosas ocasionados por el buen uso y acción del tiempo, debidamente comprobados y consentidos por EL LOCADOR. EL LOCADOR se reserva el derecho a efectuar inspecciones periódicas al inmueble de forma personal o designando al efecto una persona de su confianza para la constatación del buen uso y estado de conservación de la cosa, objeto del presente acto jurídico, con acuerdo previo de EL LOCATARIO. En caso de no lograrse un acuerdo para dichas inspecciones, EL LOCADOR podrá realizarlas igualmente comunicando con veinticuatro (24) horas de antelación la realización de las mismas, no pudiendo EL LOCATARIO negarle la entrada ni el paso al LOCADOR o a las personas designadas por éste para el efecto. EL LOCATARIO queda con el compromiso de hacer periódicamente el mantenimiento de los Split previa entrega de comprobantes al LOCADOR.-----------------------------------------------------------------------</p>

            <p><strong>SEPTIMA:</strong> EL LOCATARIO podrá rescindir unilateralmente el presente contrato, con preaviso de sesenta (60) días, dado por telegrama colacionado o nota debidamente recibida por EL LOCADOR. En caso de incumplimiento de lo antedicho y siempre que la rescisión no fuere causada por culpa del EL LOCADOR, éste tendrá derecho a percibir como compensación el importe de dos (2) meses de alquiler que EL LOCATARIO se obliga a abonar en concepto de indemnización, asimismo EL LOCATARIO perderá automáticamente el importe entregado como depósito en garantía. Además, EL LOCATARIO faculta expresamente a EL LOCADOR a permitir el ingreso a la unidad arrendada a eventuales interesados en el posterior alquiler, en días y horarios a ser convenidos con EL LOCATARIO. En caso de no lograrse un acuerdo para dichas muestras, El LOCADOR podrá realizarlas igualmente comunicando con veinticuatro (24) horas de antelación la realización de las mismas, no pudiendo EL LOCATARIO negarle la entrada ni el paso al LOCADOR o a las personas designadas por éste para el efecto, ni a los terceros interesados. EL LOCADOR por su parte podrá rescindir el presente contrato, notificando la medida a EL LOCATARIO, por escrito y con una antelación no menor a sesenta (60) días calendarios sin quedar obligado a abonar ningún tipo de indemnización a EL LOCATARIO.--------------------------------------</p>

            <p><strong>OCTAVA:</strong> El LOCATARIO no podrá sin expresa autorización escrita de EL LOCADOR modificar la estructura interna y/o externa de la unidad locada, ni introducir mejoras de ninguna clase como por ejemplo: a) colocar alfombras con pegamentos en los pisos, b) pintar las paredes y/o aberturas de un color distinto al actual, ni cualquier otra alteración a la structure del inmueble locado como tampoco en lo superficial; la cita de los ejemplos son meramente enunciativas, extendiéndose la prohibición de conformidad a lo establecido en el presente. Cualquier violación a ésta cláusula, exonerará a EL LOCADOR del pago de las mismas, salvo caso de aceptación expresa y por escrito de las modificaciones, pero quedando siempre las mejoras en beneficio de la unidad locada. EL LOCADOR podrá igualmente optar por la devolución del inmueble en el mismo estado en el que se encontraba al momento de la entrega del mismo al LOCATARIO, corriendo por cuenta de éste, todos los gastos que demande dicha transformación.-----------------------------</p>

            <p><strong>NOVENA:</strong> Será por cuenta de EL LOCATARIO el pago mensual y puntual de los servicios públicos energía eléctrica (ANDE, NIS: <strong>${nis}</strong>), solo agua y basura incluyen en el costo del alquiler, haciéndose cargo de cualquier problema que surgiere como consecuencia de la falta de pago a tiempo de los mismos. Así mismo, está obligado a la conservación de los recibos por los pagos realizados y a la entrega de las copias de los mismos a EL LOCADOR, todos los meses, en ocasión del pago del alquiler.--------------------------------------------------------------------------</p>

            <p><strong>DECIMA:</strong> La eventual conexión de videocable, línea telefónica y/o de Internet, será contratada en forma particular y exclusiva por EL LOCATARIO, obligándose a rescindir el contrato con la empresa pertinente, al concluir el plazo de la presente locación y exonerando en forma expresa a EL LOCADOR por responsabilidad alguna respecto a dichas eventuales conexiones.------------------------------------------------------------------------------------------------</p>

            <p><strong>DECIMA PRIMERA:</strong> EL LOCATARIO se obliga al fiel cumplimiento de las cláusulas y condiciones pactadas en el presente contrato de locación cuyo incumplimiento por parte de EL LOCATARIO autorizará de pleno derecho a EL LOCADOR a rescindirlo unilateralmente y a exigir el inmediato desalojo de la unidad arrendada. EL LOCATARIO quedará obligado además y sin perjuicio de otras reclamaciones posteriores al pago del equivalente a dos (2) meses de alquiler como cláusula penal en concepto de indemnización por incumplimiento de contrato, asimismo EL LOCATARIO perderá automáticamente el importe entregado como depósito en garantía.---</p>

            <p><strong>DECIMA SEGUNDA:</strong> El presente contrato caducará de pleno derecho por la falta de pago de dos (2) mensualidades consecutivas de conformidad a lo establecido en el Art. 837 inc h) del Código Civil Paraguayo, dando derecho a EL LOCADOR a rescindir el presente contrato y exigir el inmediato desalojo de la unidad arrendada y sin perjuicio de reclamar el pago de las sumas adeudadas, incluidas las estipuladas en todas las cláusulas del presente contrato, en especial en la TERCERA Y DECIMA SEGUNDA.-----------</p>

            <p><strong>DECIMA TERCERA:</strong> EL LOCATARIO entregará a EL LOCADOR la cantidad de Gs. <strong>${deposito}</strong>, en concepto de depósito en garantía, 1er pago a realizarse, debiendo ser documentada dicha entrega con los correspondientes recibos. Dicho depósito no devengará interés alguno, ni podrá ser imputado al pago de mensualidades atrasadas y sólo será devuelto a EL LOCATARIO, previa deducción de las deudas a su cargo en concepto de servicios públicos o de posibles deterioros del inmueble, a los sesenta (60) días de concluida la locación y realizada la entrega y aceptación del inmueble. En caso que este depósito no cubra los daños y gastos, EL LOCATARIO deberá abonar la totalidad del importe de los mismos. EL LOCATARIO perderá está garantía en caso de desalojo o rescisión culpable. En caso de que el alquiler del presente inmueble sea objeto de renovación, la garantía quedará como tal en poder del LOCADOR bajo los mismos términos, debiendo EL LOCATARIO completar proporcionalmente al aumento de la nueva mensualidad y entregar la diferencia al LOCADOR al momento de la firma del nuevo contrato.--------------------------------------------</p>

            <p><strong>DECIMA CUARTA:</strong> La recepción del inmueble se realizará de la manera como indica ésta cláusula, no siendo aceptada ninguna otra forma de recepción: A más tardar ocho días antes del vencimiento del presente contrato EL LOCATARIO deberá acordar con EL LOCADOR día y horas hábiles para efectuar la constatación visual del estado general del inmueble, debiendo facilitar EL LOCATARIO las condiciones que permitan dicha verificación, encontrándose el inmueble sin mobiliario alguno que imposibilite la tarea. Hallándose el inmueble en las mismas condiciones de entrega y en perfecto funcionamiento de todos sus accesorios, se procederá a la recepción del inmueble, previa presentación de las últimas facturas abonadas por los servicios de luz; debiendo además entregar a EL LOCADOR la suma que resulte necesaria para cancelar las facturas pendientes de pago, en cuyo caso se tomará como base el promedio resultante de los importes que figuren en las facturas anteriores con hasta tres meses de anticipación y que cubran los periodos hasta la recepción del inmueble. En caso de que dichos promedios no cubran la totalidad de la deuda, la diferencia deberá ser abonada por EL LOCATARIO y éste quedará obligado ante el requerimiento del LOCADOR.-</p>

            <p><strong>DECIMA QUINTA:</strong> EL LOCATARIO también se obliga a comunicar, bajo constancia escrita y con la debida antelación, al LOCADOR en caso que tuviera que ausentarse del país o dejar libre la unidad locada, designando la persona responsable de abonar los servicios públicos y mensualidades, así como la persona que pueda ingresar a la unidad en su ausencia. EL LOCATARIO no podrá introducir ni utilizar la unidad locada, para el almacenamiento de materiales explosivos, combustibles o inflamables y/o que sean peligrosos y que por su naturaleza pudiera ocasionar o causar daños y/o molestias, haciéndose exclusivamente responsable de los daños y perjuicios que por tales hechos sean ocasionados en caso de ejecutarlos, reservándose EL LOCADOR el derecho de accionar judicialmente.-------------</p>

            ${clausulasFinales}

            <p style="text-align: center; font-weight: bold; margin-top: 30pt; margin-bottom: 40pt;">EN PRUEBA DE CONFORMIDAD, firman las partes contratantes en un mismo tenor y a un solo efecto, a los ${diaHoy} días del mes de ${mesHoy} del año ${anioHoy}.-------------</p>

            <table>
                <tr>
                    <td style="text-align: center; width: 45%;">
                        ____________________________________<br/>
                        <strong>EL LOCADOR</strong><br/>
                        MARCELO ORTIGOZA<br/>
                        C.I. N° 3.389.403
                    </td>
                    <td style="width: 10%;"></td>
                    <td style="text-align: center; width: 45%;">
                        ____________________________________<br/>
                        <strong>EL LOCATARIO</strong><br/>
                        <strong>${nombre}</strong><br/>
                        C.I. N° ${cedula}
                    </td>
                </tr>
            </table>
${firmaCodeudor}
        </body>
        </html>
    `;

    document.body.appendChild(element);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 800,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 12;
      const marginY = 12;
      const contentWidth = pageWidth - marginX * 2;
      const contentHeight = pageHeight - marginY * 2;

      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;
      const pxPerMm = imgWidthPx / contentWidth;
      const pageHeightPx = contentHeight * pxPerMm;

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < imgHeightPx) {
        const sliceHeightPx = Math.min(pageHeightPx, imgHeightPx - renderedHeight);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidthPx;
        pageCanvas.height = Math.ceil(sliceHeightPx);
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          renderedHeight,
          imgWidthPx,
          sliceHeightPx,
          0,
          0,
          imgWidthPx,
          sliceHeightPx
        );

        const pageImg = pageCanvas.toDataURL("image/jpeg", 0.95);
        const sliceHeightMm = sliceHeightPx / pxPerMm;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageImg, "JPEG", marginX, marginY, contentWidth, sliceHeightMm);

        renderedHeight += sliceHeightPx;
        pageIndex += 1;
      }

      const fileName = `Contrato_Locacion_${code}_${String(nombre).replace(/\s+/g, "_")}.pdf`;

      if (soloRetornarFile) {
        const blob = pdf.output("blob");
        return new File([blob], fileName, { type: "application/pdf" });
      }

      pdf.save(fileName);
      return undefined;
    } finally {
      if (element.parentNode) document.body.removeChild(element);
    }
};
