"use client";


import React, { useState, useEffect, useRef } from "react";
import { Printer, X, Save, FileText, Receipt, Check, DollarSign, Trash2, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { numberToWords } from "@/lib/numberToWords";
import { toast } from "sonner";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { PrintPortal } from "@/components/ui/print-portal";
import { formatFechaLarga, formatConceptoPeriodo } from "@/lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { API_BASE } from "@/lib/api";


interface ComprobantePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagoData: {
    pagoId: number;
    tipoPago: string;
    mesPagado: number;
    anioPagado: number;
    montoPagado: number;
    metodoPago: string;
    fechaPago: string;
    facturaEmitida?: boolean;
    numeroFactura?: string;
    comprobanteUrl?: string;
    inquilinoNombre: string;
    inquilinoEmail?: string;
    inquilinoDocumento: string;
    unidadCodigo: string;
    condominioNombre?: string;
    items?: Array<{ cantidad?: number; descripcion: string; precioUnitario: number; exenta?: number; iva5?: number; iva10?: number; }>;
    /** Otros pagos del mismo cobro consolidado (multi-mes) a actualizar al guardar la factura */
    relatedPagoIds?: number[];
    /** Si true, no intenta guardar en /api/Contratos/pago (Fontana / garantía local) */
    localOnly?: boolean;
    /** Forzar recibo o factura al abrir (Fontana) */
    forceTipoEmision?: "recibo" | "factura";
    contrato?: {
    inquilino?: {
      telefono?: string | null;
      email?: string | null;
    }
  };
  } | null;
  onSaved?: (payload?: {
    facturaEmitida: boolean;
    numeroFactura: string;
    descripcion: string;
    metadata: Record<string, unknown>;
  }) => void | Promise<void>;
}

export function ComprobantePreviewModal({ isOpen, onClose, pagoData, onSaved }: ComprobantePreviewModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false); // Estado para detectar móvil
  const [tipoEmision, setTipoEmision] = useState<"recibo" | "factura">("recibo");
  
  // Editable fields
  const [numeroFactura, setNumeroFactura] = useState("001-001 0001229");
  const [rucInquilino, setRucInquilino] = useState("N/D");
  const [nombreInquilino, setNombreInquilino] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("Merlo de Portugal y Capitán Pedro Mayor Echauri");
  const [descripcionFactura, setDescripcionFactura] = useState("");
  const [montoLetras, setMontoLetras] = useState("");
  const [montoRecibo, setMontoRecibo] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmAnular, setShowConfirmAnular] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailDestino, setEmailDestino] = useState("");

  useEffect(() => {
    if (!pagoData) return;

    setTipoEmision(
      pagoData.forceTipoEmision || (pagoData.facturaEmitida ? "factura" : "recibo")
    );
    setNumeroFactura(pagoData.numeroFactura || "001-001 0001229");
    setMontoRecibo(pagoData.montoPagado || 0);



    // Default calculations
    const defaultWords = numberToWords(pagoData.montoPagado || 0);
    const defaultDesc = formatConceptoPeriodo(
      pagoData.tipoPago,
      pagoData.mesPagado || 1,
      pagoData.anioPagado || new Date().getFullYear()
    );
    const multiFromItems =
      pagoData.items && pagoData.items.length > 1
        ? pagoData.items.map((i) => i.descripcion).join(" + ")
        : "";
    const singleItemDesc =
      pagoData.items && pagoData.items.length === 1
        ? pagoData.items[0].descripcion
        : "";
    
    let parsedMeta: any = {};
    if (pagoData.comprobanteUrl && pagoData.comprobanteUrl.startsWith("{")) {
      try {
        parsedMeta = JSON.parse(pagoData.comprobanteUrl);
      } catch (e) {
        console.error("Error parsing comprobante metadata:", e);
      }
    }
    setEmailDestino(pagoData.inquilinoEmail || parsedMeta.emailInquilino || "");

    setRucInquilino(parsedMeta.rucInquilino || (pagoData.inquilinoDocumento && pagoData.inquilinoDocumento !== "Sin Documento" ? pagoData.inquilinoDocumento : "N/D"));
    setNombreInquilino(parsedMeta.nombreInquilino || pagoData.inquilinoNombre || "Cliente");
    setDireccionCliente(parsedMeta.direccion || "Merlo de Portugal y Capitán Pedro Mayor Echauri");
    // Cobro consolidado / Fontana (garantía o alojamiento): respetar descripción del ítem
    const esConsolidado = Boolean(pagoData.items && pagoData.items.length > 1);
    setDescripcionFactura(
      parsedMeta.descripcion ||
        parsedMeta.concepto ||
        (esConsolidado ? multiFromItems : "") ||
        singleItemDesc ||
        defaultDesc
    );
    setMontoLetras(parsedMeta.montoLetras || defaultWords);
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|iPhone|iPad|iPod/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, [pagoData, isOpen]);

  if (!pagoData) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-PY").format(val);
  };

  const handleSaveAndPrint = async () => {
    if (!pagoData) return;
    setIsSaving(true);

    const metadata = {
      rucInquilino,
      nombreInquilino,
      direccion: direccionCliente,
      descripcion: descripcionFactura,
      montoLetras,
      concepto: descripcionFactura
    };

    const body = {
      facturaEmitida: tipoEmision === "factura",
      numeroFactura: numeroFactura || null,
      comprobanteUrl: JSON.stringify(metadata)
    };

    // Fontana / garantía: solo imprimir y notificar (sin PUT de contrato)
    if (pagoData.localOnly || !pagoData.pagoId || pagoData.pagoId <= 0) {
      try {
        toast.success("Comprobante listo para imprimir");
        if (onSaved) {
          await onSaved({
            facturaEmitida: tipoEmision === "factura",
            numeroFactura: numeroFactura || "",
            descripcion: descripcionFactura,
            metadata,
          });
        }
        setTimeout(() => {
          window.print();
          setIsSaving(false);
        }, 300);
      } catch (err) {
        console.error(err);
        toast.error("Error al preparar comprobante");
        setIsSaving(false);
      }
      return;
    }

    // Cobro multi-mes: propagar número de factura / metadata a todos los pagos del lote
    const pagoIds = Array.from(
      new Set(
        [pagoData.pagoId, ...(pagoData.relatedPagoIds || [])].filter(
          (id): id is number => typeof id === "number" && id > 0
        )
      )
    );

    try {
      const results = await Promise.all(
        pagoIds.map((id) =>
          fetch(`${API_BASE}/api/Contratos/pago/${id}/comprobante`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        )
      );

      if (results.every((r) => r.ok)) {
        toast.success("Comprobante guardado correctamente");
        if (onSaved) {
          await onSaved({
            facturaEmitida: tipoEmision === "factura",
            numeroFactura: numeroFactura || "",
            descripcion: descripcionFactura,
            metadata,
          });
        }

        setTimeout(() => {
          window.print();
          setIsSaving(false);
        }, 300);
      } else {
        toast.error("Error al guardar comprobante en el servidor");
        setIsSaving(false);
      }
    } catch (err) {
      console.error("Error saving comprobante:", err);
      toast.error("Error de conexión al guardar");
      setIsSaving(false);
    }
  };

  const handleAnularCobro = async () => {
    if (!pagoData || !pagoData.pagoId) return;

    setIsDeleting(true);
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/pago/${pagoData.pagoId}`, {
        method: "DELETE"
      });

      if (resp.ok) {
        toast.success("Factura/cobro anulada correctamente. El alquiler volvió a estar pendiente.");
        if (onSaved) await onSaved();
        onClose();
      } else {
        toast.error("Error al anular en el servidor");
      }
    } catch (err) {
      console.error("Error deleting pago:", err);
      toast.error("Error de conexión al anular cobro");
    } finally {
      setIsDeleting(false);
      setShowConfirmAnular(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!pagoData) return;
    const loadingToast = toast.loading("Generando comprobante...");

    try {
      const pdfBlob = await generatePDFBlob();
      if (!pdfBlob) {
        toast.dismiss(loadingToast);
        toast.error("No se pudo generar el PDF");
        return;
      }

      // 1. Descarga inmediata
      const fileName = `Comprobante_${nombreInquilino.replace(/\s/g, "_")}.pdf`;
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Preparar WhatsApp
      let tel = pagoData.contrato?.inquilino?.telefono || "";
      tel = tel.replace(/\D/g, "");
      if (tel.startsWith("0")) tel = "595" + tel.substring(1);
      if (tel !== "" && !tel.startsWith("595")) tel = "595" + tel;

      const texto = `*COMPROBANTE DE PAGO - VORDIA*\n\nHola *${nombreInquilino}*, adjunto tu comprobante de pago.\n\n*Total:* ${new Intl.NumberFormat("es-PY").format(total)} Gs.`;

      // 3. Abrir WhatsApp (Asegúrate de permitir pop-ups en el navegador)
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(texto)}`;
      window.open(whatsappUrl, "_blank");

      toast.dismiss(loadingToast);
      toast.success("PDF descargado. Arrástrelo al chat de WhatsApp.");

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error(error);
    }
    
    /*setIsSaving(true);

    const metadata = {
      rucInquilino,
      nombreInquilino,
      direccion: direccionCliente,
      descripcion: descripcionFactura,
      montoLetras,
      concepto: descripcionFactura
    };

    try {
      await fetch(`${API_BASE}/api/Contratos/pago/${pagoData.pagoId}/comprobante`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facturaEmitida: tipoEmision === "factura",
          numeroFactura: numeroFactura || null,
          comprobanteUrl: JSON.stringify(metadata)
        })
      });
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Error saving comprobante before share:", err);
    } finally {
      setIsSaving(false);
    }

    const fechaFormateada = new Date(pagoData.fechaPago).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    let mensaje = `*COMPROBANTE LEGAL / ${tipoEmision === "factura" ? "FACTURA" : "RECIBO"} - VORDIA*\n\n`;
    mensaje += `*Emisor:* Marcelo David Ortigoza Maidana\n`;
    mensaje += `*RUC:* 3389403-5\n`;
    mensaje += `*Comprobante N°:* ${numeroFactura || "S/N"}\n`;
    mensaje += `*Timbrado N°:* 18093421\n`;
    mensaje += `*Fecha de Emisión:* ${fechaFormateada}\n\n`;
    mensaje += `*Cliente / Razón Social:* ${nombreInquilino}\n`;
    mensaje += `*RUC / C.I.:* ${rucInquilino}\n`;
    if (direccionCliente) mensaje += `*Dirección:* ${direccionCliente}\n`;
    mensaje += `\n*DETALLE DE CONCEPTOS:*\n`;
    if (pagoData.items && pagoData.items.length > 0) {
      pagoData.items.forEach(i => {
        mensaje += `• ${i.cantidad || 1}x ${i.descripcion} — *${new Intl.NumberFormat("es-PY").format(i.precioUnitario)} Gs.*\n`;
      });
    } else {
      mensaje += `• 1x ${descripcionFactura} — *${new Intl.NumberFormat("es-PY").format(total)} Gs.*\n`;
    }
    mensaje += `\n*TOTAL A PAGAR:* *${new Intl.NumberFormat("es-PY").format(total)} Gs.*\n`;
    if (montoLetras) mensaje += `_(${montoLetras})_\n\n`;
    if (tipoEmision === "factura") {
      mensaje += `*Liquidación de IVA (10%):* ${new Intl.NumberFormat("es-PY").format(liqIva10)} Gs.\n\n`;
    }
    mensaje += `_Adjuntamos el comprobante en formato PDF. Muchas gracias por su preferencia._`;

    toast.success("Abriendo WhatsApp y preparando PDF...", {
      description: "En la ventana de impresión, elige 'Guardar como PDF' para adjuntarlo al chat de WhatsApp."
    });

    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");

    setTimeout(() => {
      window.print();
    }, 1000);*/

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /*
    toast.info("Generando PDF para WhatsApp...");
    const pdf = await generatePDF();
    if (pdf) {
      const fileName = `${tipoEmision.toUpperCase()}_${nombreInquilino.replace(/\s/g, "_")}.pdf`;
      pdf.save(fileName); // Descarga el PDF automáticamente

      const fechaFormateada = new Date().toLocaleDateString();
      const texto = `*COMPROBANTE LEGAL - VORDIA*\n\nEstimado/a *${nombreInquilino}*,\nAdjuntamos su *${tipoEmision.toUpperCase()} N° ${numeroFactura}* correspondiente al pago de fecha ${fechaFormateada}.\n\n*Monto:* ${new Intl.NumberFormat("es-PY").format(total)} Gs.\n\n_Favor adjuntar el archivo descargado a esta conversación._`;
      
      const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
      window.open(whatsappUrl, "_blank");
      toast.success("PDF descargado. Ahora arrástrelo al chat de WhatsApp.");
    }*/

  };

  const confirmSendEmail = async () => {
    if (!emailDestino || !emailDestino.includes("@")) {
      toast.error("Por favor ingresa un correo electrónico válido");
      return;
    }
    if (!pagoData) return;

    setIsSendingEmail(true);
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/enviar-comprobante`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailDestino: emailDestino.trim(),
          nombreCliente: nombreInquilino || pagoData.inquilinoNombre,
          rucCliente: rucInquilino || "5865896",
          direccionCliente: direccionCliente || "MERLO DE PORTUGAL Y CAPITÁN PEDRO MAYOR ECHAURI",
          numeroComprobante: numeroFactura || "001-001 0001229",
          tipoEmision: tipoEmision === "factura" ? "FACTURA" : "RECIBO",
          monto: montoRecibo || pagoData.montoPagado || 0,
          concepto: descripcionFactura
        })
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        toast.success("Correo enviado exitosamente", {
          description: `El comprobante fue enviado al correo ${emailDestino}.`
        });
        setShowEmailPrompt(false);
      } else {
        toast.error("Error al enviar el correo", {
          description: data.message || "Verifica la configuración SMTP del servidor."
        });
      }
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("Error de conexión al intentar enviar el correo.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Cálculos de IVA
  const total = (() => {
    if (pagoData.items && pagoData.items.length > 0) {
      return pagoData.items.reduce((a, i) => a + (Number(i.precioUnitario) || 0), 0);
    }
    return montoRecibo || pagoData.montoPagado || 0;
  })();
  const montoExenta =
    pagoData.items && pagoData.items.length > 0
      ? pagoData.items.reduce((a, i) => a + (Number(i.exenta) || 0), 0)
      : 0;
  const montoIva10Col =
    pagoData.items && pagoData.items.length > 0
      ? pagoData.items.reduce((a, i) => a + (Number(i.iva10) || 0), 0)
      : montoExenta > 0
        ? 0
        : total;
  const liqIva10 = montoIva10Col > 0 ? Math.round(montoIva10Col / 11) : 0;
  const filasItems =
    pagoData.items && pagoData.items.length > 0
      ? pagoData.items
      : [
          {
            cantidad: 1,
            descripcion: descripcionFactura,
            precioUnitario: total,
            exenta: montoExenta || undefined,
            iva10: montoIva10Col || undefined,
          },
        ];
  const filasRelleno = Math.max(0, 10 - filasItems.length);

  // --- FUNCIÓN PARA GENERAR PDF ---
  const generatePDFBlob = async () => {
    /*if (!receiptRef.current) return null;
    const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
    //return pdf;
    return pdf.output('blob');*/
    try {
      if (!receiptRef.current) {
        console.error("Referencia al recibo no encontrada.");
        return null;
      }

      // 1. Aumentamos un poco el tiempo de espera para asegurar que el DOM esté listo
      await new Promise(r => setTimeout(r, 600));

      // 2. Capturamos con html2canvas
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // Bajamos de 3 a 2 para evitar errores de memoria/firma, 2 es suficiente para A4
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        
      });

      // 3. CAMBIO CLAVE: Usamos JPEG en lugar de PNG
      // El segundo parámetro (0.95) es la calidad (95%)
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // Validación de seguridad
      if (imgData === "data:," || imgData.length < 500) {
        console.error("La imagen generada está vacía.");
        return null;
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true // Comprimimos para que el PDF no pese demasiado
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // 4. Añadimos la imagen especificando 'JPEG'
      // El parámetro 'NONE' evita compresiones extra que puedan dar errores de firma
      pdf.addImage(imgData, "JPEG", 0, 5, pdfWidth, pdfHeight, undefined, 'NONE');

      return pdf.output('blob');
    } catch (err) {
      console.error("Error detallado al generar PDF:", err);
      toast.error("Error al procesar la imagen del comprobante.");
      return null;
    }
    
  };

  const receiptContent = (
    <div ref={receiptRef} className="bg-white w-[650px] min-h-[850px] font-sans text-black leading-tight shadow-none rounded-none border-[2px] border-black p-0 printable-receipt shrink-0 flex flex-col">
      
      {pagoData.localOnly && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b-2 border-black bg-white">
          <div className="flex items-center gap-2.5">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: "#080E1E" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/fontanas.png" alt="Fontana" width={40} height={40} className="w-10 h-10 object-contain" />
            </div>
            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-[#1E7BFF]">Fontana Di Luque</p>
              <p className="m-0 text-[9px] text-slate-500 uppercase">Hospedaje · comprobante</p>
            </div>
          </div>
          <div className="text-right">
            <p className="m-0 text-[10px] font-black tracking-widest uppercase">Fontana</p>
            <p className="m-0 text-[8px] text-slate-500">Di Luque · Est. 2020</p>
          </div>
        </div>
      )}

      {/* SECCIÓN 1: CABECERA (Usamos tabla para mayor estabilidad de líneas) */}
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] p-4 border-b-[2px] border-r-[2px] border-black align-top">
              <h1 className="text-[18px] font-bold text-black mb-2 font-serif leading-tight">Marcelo David Ortigoza Maidana</h1>
              <div className="text-[10.5px] uppercase font-bold text-black space-y-0.5 mt-2 leading-[1.45]">
                <p className="m-0">ACTIVIDADES PROFESIONALES, CIENTÍFICAS Y TÉCNICAS - OTROS ALOJAMIENTOS.</p>
                <p className="m-0">ACTIVIDADES DE SERVICIOS DE ARQUITECTURA E INGENIERÍA.</p>
                <p className="m-0">INTERMEDIACIÓN EN LA COMPRA, VENTA Y ARRENDAMIENTO DE INMUEBLES.</p>
              </div>
              <p className="text-[11px] mt-4 font-bold text-black uppercase leading-snug m-0">
                Merlo de Portugal y Capitán Pedro Mayor Echauri - Cel.: (0994) 254 655
              </p>
              <p className="text-[11px] font-bold text-black uppercase m-0 mt-0.5">Luque - Paraguay</p>
            </td>
            <td className="w-[35%] p-3 border-b-[2px] border-black text-center align-top">
              <div className="text-[8px] font-bold uppercase text-black">
                <p className="tracking-widest">TIMBRADO Nº 18093421</p>
                <p>Vigencia: 30/JUNIO/2026</p>
              </div>
              <div className="mt-4 text-black">
                <p className="text-[12px] font-black">RUC: 3389403-5</p>
                <h2 className="text-[26px] font-black uppercase leading-none my-1">{tipoEmision === "factura" ? "FACTURA" : "RECIBO"}</h2>
                <p className="text-[12px] font-black tracking-widest">Nº {numeroFactura}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECCIÓN 2: DATOS CLIENTE (Tabla para asegurar bordes) */}
      <table className="w-full border-collapse">
        <tbody>
          <tr className="h-10">
            <td className="px-4 border-b-[2px] border-r-[2px] border-black font-bold text-[10px] w-[65%]">
              FECHA DE EMISIÓN: <span className="font-bold ml-2">{formatFechaLarga(pagoData.fechaPago)}</span>
            </td>
            <td className="px-4 border-b-[2px] border-black font-bold text-[9px] w-[35%]">
              <div className="flex justify-between">
                <span>COND. VENTA:</span>
                <span>CONTADO ☑</span>
                <span>CRÉDITO ☐</span>
              </div>
            </td>
          </tr>
          <tr className="h-10">
            <td className="px-4 border-b-[2px] border-r-[2px] border-black font-bold text-[10px]">
              RUC: <span className="font-bold ml-2">{rucInquilino || "S/D"}</span>
            </td>
            <td className="px-4 border-b-[2px] border-black font-bold text-[10px]">
              NOTA DE REMISIÓN:
            </td>
          </tr>
          <tr className="h-10">
            <td colSpan={2} className="px-4 border-b-[2px] border-black font-bold text-[10px]">
              NOMBRE O RAZÓN SOCIAL: <span className="font-bold ml-2 uppercase text-[11px]">{nombreInquilino}</span>
            </td>
          </tr>
          <tr className="h-10">
            <td className="px-4 border-b-[2px] border-r-[2px] border-black font-bold text-[10px] overflow-hidden">
              DIRECCIÓN: <span className="font-bold ml-2 uppercase truncate">{direccionCliente}</span>
            </td>
            <td className="px-4 border-b-[2px] border-black font-bold text-[10px]">
              TELÉFONO: <span className="ml-2 font-medium">{pagoData.contrato?.inquilino?.telefono || ""}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECCIÓN 3: TABLA DE ÍTEMS */}
      <div className="flex-1 bg-white">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="text-[9px] font-black uppercase">
              <th className="py-2 border-b-[2px] border-r-[2px] border-black w-[40px] text-center">Cant.</th>
              <th className="py-2 border-b-[2px] border-r-[2px] border-black px-2 text-left">Descripción</th>
              <th className="py-2 border-b-[2px] border-r-[2px] border-black w-[90px] text-right px-2">P. Unitario</th>
              <th className="py-2 border-b-[2px] border-r-[2px] border-black w-[65px] text-center">Exentas</th>
              <th className="py-2 border-b-[2px] border-r-[2px] border-black w-[65px] text-center">5%</th>
              <th className="py-2 border-b-[2px] border-black w-[85px] text-right px-2">10%</th>
            </tr>
          </thead>
          <tbody className="text-[10px] font-bold">
            {filasItems.map((it, idx) => {
              const pu = Number(it.precioUnitario) || 0;
              const ex = Number(it.exenta) || 0;
              const i10 = Number(it.iva10) || 0;
              return (
                <tr key={idx} className="h-10">
                  <td className="text-center border-r-[2px] border-b border-black/10 border-black">
                    {it.cantidad || 1}
                  </td>
                  <td className="px-2 border-r-[2px] border-b border-black/10 border-black uppercase text-[9.5px] leading-tight">
                    {it.descripcion || descripcionFactura}
                  </td>
                  <td className="text-right px-2 border-r-[2px] border-b border-black/10 border-black">
                    {formatCurrency(pu)}
                  </td>
                  <td className="text-right px-1 border-r-[2px] border-b border-black/10 border-black text-[9px]">
                    {ex > 0 ? formatCurrency(ex) : ""}
                  </td>
                  <td className="border-r-[2px] border-b border-black/10 border-black"></td>
                  <td className="text-right px-2 border-b border-black/10">
                    {i10 > 0 ? formatCurrency(i10) : ""}
                  </td>
                </tr>
              );
            })}
            {/* Filas de relleno con bordes reforzados */}
            {[...Array(filasRelleno)].map((_, i) => (
              <tr key={`pad-${i}`} className="h-8">
                <td className="border-r-[2px] border-black"></td>
                <td className="border-r-[2px] border-black"></td>
                <td className="border-r-[2px] border-black"></td>
                <td className="border-r-[2px] border-black"></td>
                <td className="border-r-[2px] border-black"></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN 4: TOTALES (Sincronizada con la tabla de arriba) */}
      <table className="w-full border-collapse table-fixed">
        <tbody>
          {/* Fila Subtotales */}
          <tr className="h-9 border-t-[2px] border-black font-bold">
            <td colSpan={3} className="px-4 text-[9px] font-black uppercase border-r-[2px] border-black">Subtotales:</td>
            <td className="w-[65px] text-right px-1 text-[10px] border-r-[2px] border-black">
              {montoExenta > 0 ? formatCurrency(montoExenta) : ""}
            </td>
            <td className="w-[65px] border-r-[2px] border-black"></td>
            <td className="w-[85px] text-right px-2 text-[11px] border-black">
              {montoIva10Col > 0 ? formatCurrency(montoIva10Col) : ""}
            </td>
          </tr>
          {/* Fila Total a Pagar */}
          <tr className="h-10 border-t-[2px] border-black font-bold">
            <td colSpan={5} className="px-4 text-[9px] font-black uppercase border-r-[2px] border-black">
              Total a Pagar Guaraníes: <span className="ml-3 italic text-[10px] lowercase font-medium">{montoLetras}</span>
            </td>
            <td className="text-right px-2 text-[14px] font-black">{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>

      {/* SECCIÓN 5: IVA Y PIE */}
      <div className="border-t-[2px] border-black">
        <div className="flex h-8 items-center bg-gray-50 px-4 justify-between text-[8px] font-black uppercase border-b-[2px] border-black">
          <span>Liquidación IVA: &nbsp; (5%) 0</span>
          <span>(10%) {formatCurrency(liqIva10)}</span>
          <span className="text-[10px]">Total IVA: {formatCurrency(liqIva10)}</span>
        </div>
        <div className="p-2 bg-white flex justify-between items-start text-[7px] font-bold text-gray-500">
          <div className="space-y-0.5">
            <p>GRAFICONT de Arnaldo Rojas - HAB. N° 1365 - RUC: 709716-5 - Gaspar R. de Francia 483, Luque</p>
            <p>Numerados del 0001.200 al 0001.500 - Cel: (0981) 749 696</p>
          </div>
          <div className="text-right flex flex-col items-end uppercase gap-0.5 text-black">
            {pagoData.localOnly ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/VORDIA H NEGRO.png"
                alt="Vordia"
                width={48}
                height={48}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <span>Original: Cliente / Duplicado: Archivo Tributario</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="sm:max-w-[1150px] border-none p-0 shadow-2xl bg-muted rounded-2xl sm:rounded-[2.5rem] overflow-hidden max-h-[min(95dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] flex flex-col w-[calc(100%-0.5rem)] sm:w-full"
        data-scroll="internal"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Vista Previa y Edición de Comprobante</DialogTitle>
        </DialogHeader>

        {/* HEADER BAR */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center shrink-0 no-print pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary/20 p-2.5 rounded-2xl text-primary shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black italic uppercase tracking-tighter truncate">Emisión de Comprobante Legal</h3>
              <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest truncate">
                Pago #{pagoData.pagoId} · Unidad {pagoData.unidadCodigo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {/* TABS DE EMISIÓN */}
            <div className="bg-slate-800 p-1 rounded-2xl flex gap-1 border border-slate-700/60 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setTipoEmision("recibo")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all touch-manipulation min-h-10 ${
                  tipoEmision === "recibo"
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Receipt className="w-4 h-4" /> Recibo
              </button>
              <button
                type="button"
                onClick={() => setTipoEmision("factura")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all touch-manipulation min-h-10 ${
                  tipoEmision === "factura"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" /> Factura Legal
              </button>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-white hover:bg-slate-800 rounded-full shrink-0 min-h-11 min-w-11 touch-manipulation">
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* BODY CONTAINER: SPLIT SCREEN */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 p-3 sm:p-6 overflow-y-auto flex-1 overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          
          {/* PANEL DE EDICIÓN RÁPIDA (4 COLUMNAS) */}
          <div className="md:col-span-4 bg-card p-6 rounded-[2rem] shadow-sm border border-border/80 space-y-4 h-fit no-print">
            <div className="border-b border-border pb-3">
              <h4 className="font-black italic uppercase text-foreground text-sm tracking-tight flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Datos Editables del Comprobante
              </h4>
              <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                Modifica aquí antes de imprimir. Se guardará al emitir.
              </p>
            </div>

            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nº de Comprobante / Factura</label>
                <Input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  className="bg-muted border-none rounded-xl font-bold text-foreground h-10 text-xs"
                  placeholder="001-001 0001229"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">RUC / CI Cliente</label>
                <Input
                  value={rucInquilino}
                  onChange={(e) => setRucInquilino(e.target.value)}
                  className="bg-muted border-none rounded-xl font-bold text-foreground h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nombre o Razón Social</label>
                <Input
                  value={nombreInquilino}
                  onChange={(e) => setNombreInquilino(e.target.value)}
                  className="bg-muted border-none rounded-xl font-bold text-foreground h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Dirección / Domicilio</label>
                <Input
                  value={direccionCliente}
                  onChange={(e) => setDireccionCliente(e.target.value)}
                  className="bg-muted border-none rounded-xl font-bold text-foreground h-10 text-xs"
                  placeholder="Merlo de Portugal y Capitán Pedro Mayor Echauri"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Descripción / Concepto</label>
                <textarea
                  value={descripcionFactura}
                  onChange={(e) => setDescripcionFactura(e.target.value)}
                  className="w-full bg-muted border-none rounded-xl p-2.5 font-bold text-foreground text-xs min-h-[60px] focus:ring-2 ring-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Monto Total (Gs.)</label>
                <Input
                  type="number"
                  value={montoRecibo}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMontoRecibo(val);
                    setMontoLetras(numberToWords(val));
                  }}
                  className="bg-muted border-none rounded-xl font-black text-foreground text-base h-11 text-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Monto en Letras (Editable)</label>
                <textarea
                  value={montoLetras}
                  onChange={(e) => setMontoLetras(e.target.value)}
                  className="w-full bg-muted border-none rounded-xl p-2.5 font-bold text-foreground text-[11px] min-h-[50px] focus:ring-2 ring-primary outline-none uppercase"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <Button
                onClick={handleSaveAndPrint}
                disabled={isSaving || isDeleting}
                className="w-full bg-emerald-600 text-white font-black italic rounded-2xl h-12 shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 hover:bg-emerald-700 transition-all text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {isSaving ? "GUARDANDO..." : "IMPRIMIR Y GUARDAR COMPROBANTE"}
              </Button>
              
              {isMobile && (
              <Button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isSaving || isDeleting || isSendingEmail}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black italic rounded-2xl h-11 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WHATSAPP
              </Button>
              )}

              <Button
                type="button"
                onClick={() => {
                  if (!emailDestino) setEmailDestino("rody.moran.py@gmail.com");
                  setShowEmailPrompt(true);
                }}
                disabled={isSaving || isDeleting || isSendingEmail}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-2xl h-11 shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {isSendingEmail ? "ENVIANDO CORREO..." : "ENVIAR POR CORREO ELECTRÓNICO (SMTP)"}
              </Button>

              {!pagoData.localOnly && (
              <Button
                type="button"
                onClick={() => setShowConfirmAnular(true)}
                disabled={isSaving || isDeleting || isSendingEmail}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-2xl h-11 text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? "ANULANDO..." : "ANULAR ESTA FACTURA / COBRO"}
              </Button>
              )}
            </div>
          </div>

          {/* VISTA PREVIA OFICIAL DEL COMPROBANTE (8 COLUMNAS) */}
          <div className="md:col-span-8 bg-muted/80 p-2 sm:p-6 rounded-2xl sm:rounded-[2rem] flex justify-center items-start overflow-auto border border-border/50 max-h-[min(55dvh,480px)] md:max-h-none overscroll-contain">
            <div className="origin-top scale-[0.52] sm:scale-[0.72] md:scale-100 w-[650px] shrink-0">
              {receiptContent}
            </div>
          </div>
        </div>
      </DialogContent>

      <PrintPortal>{receiptContent}</PrintPortal>
      
      <ConfirmActionModal
        isOpen={showConfirmAnular}
        onClose={() => setShowConfirmAnular(false)}
        onConfirm={handleAnularCobro}
        title="¿Anular Factura / Cobro?"
        description="Estás por anular esta factura emitida y eliminar el registro de cobro."
        details={[
          "El registro del pago se eliminará del sistema permanentemente.",
          "El alquiler o cuota volverá automáticamente al estado PENDIENTE DE PAGO.",
          "El saldo y los estados de cuenta del inquilino se restablecerán."
        ]}
        confirmText="Sí, Anular Factura"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* MODAL / PROMPT PARA CORREO ELECTRÓNICO */}
      <Dialog open={showEmailPrompt} onOpenChange={setShowEmailPrompt}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-card text-foreground shadow-2xl border border-border z-[100]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black italic text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Enviar Comprobante por Correo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground font-medium">
              El comprobante (Factura o Recibo) será generado y enviado automáticamente en formato PDF y HTML usando el servidor SMTP de Google <span className="font-bold text-foreground">(rody.moran.py@gmail.com)</span>.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                Correo Electrónico de Destino
              </label>
              <Input
                type="email"
                placeholder="ejemplo@correo.com"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl p-3 font-semibold text-foreground text-sm focus:ring-2 ring-blue-600 outline-none"
              />
            </div>
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmailPrompt(false)}
                disabled={isSendingEmail}
                className="flex-1 rounded-xl font-bold border-border text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={confirmSendEmail}
                disabled={isSendingEmail || !emailDestino}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {isSendingEmail ? "Enviando..." : "Enviar Ahora"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

