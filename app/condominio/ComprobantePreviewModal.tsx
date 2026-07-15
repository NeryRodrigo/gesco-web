"use client";

import React, { useState, useEffect } from "react";
import { Printer, X, Save, FileText, Receipt, Check, DollarSign, Trash2, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { numberToWords } from "@/lib/numberToWords";
import { toast } from "sonner";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { PrintPortal } from "@/components/ui/print-portal";

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
    inquilinoDocumento: string;
    unidadCodigo: string;
    condominioNombre?: string;
    items?: Array<{ cantidad?: number; descripcion: string; precioUnitario: number; exenta?: number; iva5?: number; iva10?: number; }>;
  } | null;
  onSaved?: () => void;
}

export function ComprobantePreviewModal({ isOpen, onClose, pagoData, onSaved }: ComprobantePreviewModalProps) {
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

    setTipoEmision(pagoData.facturaEmitida ? "factura" : "recibo");
    setNumeroFactura(pagoData.numeroFactura || "001-001 0001229");
    setMontoRecibo(pagoData.montoPagado || 0);

    // Default calculations
    const defaultWords = numberToWords(pagoData.montoPagado || 0);
    const mesNombre = new Date(2000, (pagoData.mesPagado || 1) - 1, 1).toLocaleString('es-ES', { month: 'long' });
    const mesCapitalized = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
    const defaultDesc = `${pagoData.tipoPago || "Alquiler"} del mes de ${mesCapitalized} ${pagoData.anioPagado || new Date().getFullYear()}`;
    
    let parsedMeta: any = {};
    if (pagoData.comprobanteUrl && pagoData.comprobanteUrl.startsWith("{")) {
      try {
        parsedMeta = JSON.parse(pagoData.comprobanteUrl);
      } catch (e) {
        console.error("Error parsing comprobante metadata:", e);
      }
    }

    setRucInquilino(parsedMeta.rucInquilino || (pagoData.inquilinoDocumento && pagoData.inquilinoDocumento !== "Sin Documento" ? pagoData.inquilinoDocumento : "N/D"));
    setNombreInquilino(parsedMeta.nombreInquilino || pagoData.inquilinoNombre || "Cliente");
    setDireccionCliente(parsedMeta.direccion || "Merlo de Portugal y Capitán Pedro Mayor Echauri");
    setDescripcionFactura(parsedMeta.descripcion || defaultDesc);
    setMontoLetras(parsedMeta.montoLetras || defaultWords);
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

    try {
      const resp = await fetch(`http://localhost:5034/api/Contratos/pago/${pagoData.pagoId}/comprobante`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facturaEmitida: tipoEmision === "factura",
          numeroFactura: numeroFactura || null,
          comprobanteUrl: JSON.stringify(metadata)
        })
      });

      if (resp.ok) {
        toast.success("Comprobante guardado correctamente");
        if (onSaved) onSaved();
        
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
      const resp = await fetch(`http://localhost:5034/api/Contratos/pago/${pagoData.pagoId}`, {
        method: "DELETE"
      });

      if (resp.ok) {
        toast.success("Factura/cobro anulada correctamente. El alquiler volvió a estar pendiente.");
        if (onSaved) onSaved();
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
    setIsSaving(true);

    const metadata = {
      rucInquilino,
      nombreInquilino,
      direccion: direccionCliente,
      descripcion: descripcionFactura,
      montoLetras,
      concepto: descripcionFactura
    };

    try {
      await fetch(`http://localhost:5034/api/Contratos/pago/${pagoData.pagoId}/comprobante`, {
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
    let mensaje = `*COMPROBANTE LEGAL / ${tipoEmision === "factura" ? "FACTURA" : "RECIBO"} - GESCO*\n\n`;
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

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");

    setTimeout(() => {
      window.print();
    }, 600);
  };

  const confirmSendEmail = async () => {
    if (!emailDestino || !emailDestino.includes("@")) {
      toast.error("Por favor ingresa un correo electrónico válido");
      return;
    }
    if (!pagoData) return;

    setIsSendingEmail(true);
    try {
      const resp = await fetch("http://localhost:5034/api/Contratos/enviar-comprobante", {
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
  const total = montoRecibo || pagoData.montoPagado || 0;
  const liqIva10 = Math.round(total / 11);

  const receiptContent = (
    <div className="bg-card w-full max-w-[650px] font-sans text-[#0f172a] leading-tight shadow-2xl rounded-none border-[1.5px] border-slate-900 p-0 printable-receipt shrink-0">
      {/* HEADER (2 COLUMNAS DIVIDIDAS POR BORDE) */}
      <div className="flex items-stretch border-b-[1.5px] border-slate-900">
        {/* COLUMNA IZQUIERDA: DATOS EMISOR */}
        <div className="flex-1 p-4 pr-6 border-r-[1.5px] border-slate-900 flex flex-col justify-between">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-[#1e293b] mb-1.5 font-serif">
              Marcelo David Ortigoza Maidana
            </h1>
            <div className="text-[8px] leading-[1.35] text-foreground uppercase font-semibold space-y-0.5">
              <p>ACTIVIDADES PROFESIONALES, CIENTÍFICAS Y TÉCNICAS - OTROS ALOJAMIENTOS DE CORTO PLAZO.</p>
              <p>ACTIVIDADES DE SERVICIOS DE ARQUITECTURA E INGENIERÍA.</p>
              <p>COMERCIO AL POR MAYOR DE MERCANCÍAS A CAMBIO DE UNA RETRIBUCIÓN O POR CONTRATA.</p>
              <p>INTERMEDIACIÓN EN LA COMPRA, VENTA Y ARRENDAMIENTO DE INMUEBLES.</p>
            </div>
          </div>
          <div className="text-[9.5px] text-foreground mt-4 font-medium space-y-0.5">
            <p>Merlo de Portugal y Capitán Pedro Mayor Echauri - Cel.: (0994) 254 655</p>
            <p>Luque - Paraguay</p>
          </div>
        </div>

        {/* COLUMNA DERECHA: TIMBRADO Y N° COMPROBANTE */}
        <div className="w-[230px] shrink-0 p-3.5 px-4 text-center flex flex-col justify-between items-center bg-card">
          <div className="text-[8.5px] leading-[1.4] text-foreground font-bold uppercase tracking-wide">
            <p>TIMBRADO Nº 18093421</p>
            <p>Fecha Inicio Vigencia: 11/Junio/2025</p>
            <p>Fecha Fin Vigencia: 30/Junio/2026</p>
          </div>
          <div className="mt-3">
            <p className="text-[13px] font-black text-foreground tracking-wide">RUC: 3389403-5</p>
            <h2 className="text-[24px] font-black tracking-wider text-foreground leading-none mt-1 uppercase">
              {tipoEmision === "factura" ? "FACTURA" : "RECIBO"}
            </h2>
            <p className="text-[13px] font-black text-foreground mt-1.5 tracking-wider">
              Nº {numeroFactura || "001-001 0001229"}
            </p>
          </div>
        </div>
      </div>

      {/* FILA 2: FECHA DE EMISIÓN Y CONDICIÓN DE VENTA */}
      <div className="flex items-stretch border-b-[1.5px] border-slate-900 text-[10.5px]">
        <div className="flex-1 px-4 py-2 border-r-[1.5px] border-slate-900 font-bold uppercase flex items-center gap-2">
          <span className="text-foreground">FECHA DE EMISIÓN:</span>
          <span className="font-bold text-slate-950 lowercase">
            {new Date(pagoData.fechaPago).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="shrink-0 px-5 py-2 flex items-center gap-5 font-bold uppercase tracking-wider text-[10px] text-foreground">
          <span>COND. DE VENTA</span>
          <span>CONTADO ☑</span>
          <span>CRÉDITO ☐</span>
        </div>
      </div>

      {/* FILA 3: RUC CLIENTE Y NOTA DE REMISIÓN */}
      <div className="flex items-stretch border-b-[1.5px] border-slate-900 text-[10.5px]">
        <div className="w-1/2 px-4 py-2 border-r-[1.5px] border-slate-900 font-bold uppercase flex items-center gap-2">
          <span className="text-foreground">RUC:</span>
          <span className="font-bold text-slate-950">{rucInquilino || "N/D"}</span>
        </div>
        <div className="w-1/2 px-4 py-2 font-bold uppercase flex items-center gap-2 text-foreground">
          <span>NOTA DE REMISIÓN:</span>
        </div>
      </div>

      {/* FILA 4: NOMBRE O RAZÓN SOCIAL */}
      <div className="px-4 py-2 border-b-[1.5px] border-slate-900 font-bold text-[10.5px] uppercase flex items-center gap-2">
        <span className="text-foreground">NOMBRE O RAZÓN SOCIAL:</span>
        <span className="font-bold text-slate-950 text-[11.5px]">{nombreInquilino || pagoData.inquilinoNombre}</span>
      </div>

      {/* FILA 5: DIRECCIÓN Y TELÉFONO */}
      <div className="flex items-stretch border-b-[1.5px] border-slate-900 text-[10.5px]">
        <div className="flex-1 px-4 py-2 border-r-[1.5px] border-slate-900 font-bold uppercase flex items-center gap-2">
          <span className="text-foreground">DIRECCIÓN:</span>
          <span className="font-bold text-slate-950 uppercase">
            {direccionCliente}
          </span>
        </div>
        <div className="w-[220px] shrink-0 px-4 py-2 font-bold uppercase flex items-center gap-2 text-foreground">
          <span>TELÉFONO:</span>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE ÍTEMS */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-[1.5px] border-slate-900 bg-card text-slate-950">
            <th rowSpan={2} className="py-2 px-2 text-center font-black text-[9.5px] uppercase border-r-[1.5px] border-slate-900 w-[45px]">CANT.</th>
            <th rowSpan={2} className="py-2 px-3 text-center font-black text-[9.5px] uppercase border-r-[1.5px] border-slate-900">D E S C R I P C I Ó N</th>
            <th rowSpan={2} className="py-2 px-2 text-center font-black text-[9.5px] uppercase border-r-[1.5px] border-slate-900 w-[90px]">PRECIO<br/>UNITARIO</th>
            <th rowSpan={2} className="py-2 px-2 text-center font-black text-[9.5px] uppercase border-r-[1.5px] border-slate-900 w-[70px]">EXENTAS</th>
            <th colSpan={2} className="py-1 text-center font-black text-[9px] uppercase border-b-[1.5px] border-slate-900">VALOR DE VENTA</th>
          </tr>
          <tr className="border-b-[1.5px] border-slate-900 bg-card text-slate-950">
            <th className="py-1 px-2 text-center font-black text-[9px] uppercase border-r-[1.5px] border-slate-900 w-[70px]">5%</th>
            <th className="py-1 px-2 text-center font-black text-[9px] uppercase w-[85px]">10%</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2.5 px-2 text-center border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">1</td>
            <td className="py-2.5 px-3 border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">{descripcionFactura}</td>
            <td className="py-2.5 px-2 text-right border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">{formatCurrency(total)}</td>
            <td className="py-2.5 px-2 text-right border-r-[1.5px] border-slate-900 font-medium text-[11px] text-foreground"></td>
            <td className="py-2.5 px-2 text-right border-r-[1.5px] border-slate-900 font-medium text-[11px] text-foreground"></td>
            <td className="py-2.5 px-3 text-right font-bold text-[11px] text-foreground">{formatCurrency(total)}</td>
          </tr>
          {Array.from({ length: 3 }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-border">
              <td className="py-2 px-2 border-r-[1.5px] border-slate-900">&nbsp;</td>
              <td className="py-2 px-3 border-r-[1.5px] border-slate-900"></td>
              <td className="py-2 px-2 border-r-[1.5px] border-slate-900"></td>
              <td className="py-2 px-2 border-r-[1.5px] border-slate-900"></td>
              <td className="py-2 px-2 border-r-[1.5px] border-slate-900"></td>
              <td className="py-2 px-3"></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-[1.5px] border-slate-900 font-bold text-slate-950">
            <td colSpan={5} className="py-2 px-3 text-left font-black text-[10px] uppercase border-r-[1.5px] border-slate-900">SUB TOTALES:</td>
            <td className="py-2 px-3 text-right font-black text-[11px]">{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>

      {/* TOTAL A PAGAR EN GUARANÍES */}
      <div className="border-t-[1.5px] border-slate-900">
        <div className="flex items-stretch border-b-[1.5px] border-slate-900 text-[10.5px]">
          <div className="flex-1 px-4 py-2 border-r-[1.5px] border-slate-900 flex items-center gap-2">
            <span className="font-black uppercase text-foreground">TOTAL A PAGAR GUARANÍES:</span>
            <span className="font-black italic text-[11px] uppercase tracking-wide text-slate-950">{montoLetras || numberToWords(total)}</span>
          </div>
          <div className="w-[120px] shrink-0 px-3 py-2 text-right font-black text-[13px] text-slate-950 flex items-center justify-end">
            {formatCurrency(total)}
          </div>
        </div>
      </div>

      {/* LIQUIDACIÓN DEL IVA */}
      <div className="px-4 py-2 flex items-center justify-between text-[9.5px] font-bold border-b-[1.5px] border-slate-900 bg-muted text-foreground">
        <span>LIQUIDACIÓN DEL IVA: &nbsp;&nbsp;(5%) &nbsp;0</span>
        <span>(10%) &nbsp;{formatCurrency(liqIva10)}</span>
        <span className="font-black">TOTAL IVA: &nbsp;{formatCurrency(liqIva10)}</span>
      </div>

      {/* PIE DE PÁGINA / IMPRENTA */}
      <div className="p-2.5 px-4 flex items-start justify-between text-[7.5px] text-muted-foreground font-semibold leading-tight bg-card">
        <div className="space-y-0.5">
          <p>GRAFICONT de Arnaldo Rojas - HAB. N° 1.365 - RUC: 709716 - 5 - Gaspar R. de Francia 483 c/ Vapor Cué, Luque</p>
          <p>05 Tal. 50x3 - Numerados del 0001.551 al 0001.800 - E-mail: graficontajn@hotmail.com - Cel.: (0981) 749 696 - (0974) 749 696</p>
        </div>
        <div className="text-right space-y-0.5 uppercase tracking-tighter">
          <p>ORIGINAL: Cliente</p>
          <p>DUPL.: No Válido para Crédito Fiscal</p>
          <p>TRIPL.: Archivo Tributario</p>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[1150px] border-none p-0 shadow-2xl bg-muted rounded-[2.5rem] overflow-hidden max-h-[95vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Vista Previa y Edición de Comprobante</DialogTitle>
        </DialogHeader>

        {/* HEADER BAR */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2.5 rounded-2xl text-primary">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tighter">Emisión de Comprobante Legal</h3>
              <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest">
                Pago #{pagoData.pagoId} · Unidad {pagoData.unidadCodigo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* TABS DE EMISIÓN */}
            <div className="bg-slate-800 p-1 rounded-2xl flex gap-1 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setTipoEmision("recibo")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                  tipoEmision === "factura"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" /> Factura Legal
              </button>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-white hover:bg-slate-800 rounded-full">
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* BODY CONTAINER: SPLIT SCREEN */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-y-auto flex-1">
          
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

              <Button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isSaving || isDeleting || isSendingEmail}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black italic rounded-2xl h-11 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                COMPARTIR POR WHATSAPP (PDF)
              </Button>

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
            </div>
          </div>

          {/* VISTA PREVIA OFICIAL DEL COMPROBANTE (8 COLUMNAS) */}
          <div className="md:col-span-8 bg-muted/80 p-6 rounded-[2rem] flex justify-center items-start overflow-auto border border-border/50">
            {receiptContent}
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
