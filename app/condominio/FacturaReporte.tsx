"use client";

import React, { useState, useEffect } from "react";
import { Printer, Mail, MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { numberToWords } from "@/lib/numberToWords";
import { toast } from "sonner";

interface FacturaReporteProps {
  facturaData: {
    numero: string;
    timbrado: string;
    validezInicio: string;
    validezFin: string;
    rucEmpresa: string;
    nombreEmpresa: string;
    actividadesEmpresa: string;
    direccionEmpresa: string;
    celEmpresa: string;
    ciudadEmpresa: string;
    fecha: string;
    condicionVenta: string;
    rucInquilino: string;
    nombreInquilino: string;
    direccionInquilino: string;
    telefonoInquilino: string;
    items: Array<{ cantidad: number; descripcion: string; precioUnitario: number; exenta: number; iva5: number; iva10: number }>;
    total: number;
    totalIva5: number;
    totalIva10: number;
    totalLetras: string;
    pagoId?: number;
    comprobanteUrl?: string;
  };
  onSaved?: () => void;
}

export function FacturaReporte({ facturaData, onSaved }: FacturaReporteProps) {
  const [numero, setNumero] = useState(facturaData.numero);
  const [rucInquilino, setRucInquilino] = useState(facturaData.rucInquilino);
  const [nombreInquilino, setNombreInquilino] = useState(facturaData.nombreInquilino);
  const [direccionInquilino, setDireccionInquilino] = useState(facturaData.direccionInquilino);
  const [descripcion, setDescripcion] = useState(() => 
    facturaData.items.map(i => i.descripcion).join("; ")
  );
  const [montoLetras, setMontoLetras] = useState(facturaData.totalLetras);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailDestino, setEmailDestino] = useState("rody.moran.py@gmail.com");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    let parsedMeta: any = {};
    if (facturaData.comprobanteUrl && facturaData.comprobanteUrl.startsWith("{")) {
      try {
        parsedMeta = JSON.parse(facturaData.comprobanteUrl);
      } catch (e) {
        console.error("Error parsing comprobante metadata in FacturaReporte:", e);
      }
    }

    setNumero(facturaData.numero);
    setRucInquilino(parsedMeta.rucInquilino || facturaData.rucInquilino || "N/D");
    setNombreInquilino(parsedMeta.nombreInquilino || facturaData.nombreInquilino || "Cliente");
    setDireccionInquilino(parsedMeta.direccion || facturaData.direccionInquilino || "Merlo de Portugal y Capitán Pedro Mayor Echauri");
    setDescripcion(parsedMeta.descripcion || facturaData.items.map(i => i.descripcion).join("; "));
    setMontoLetras(parsedMeta.montoLetras || facturaData.totalLetras || numberToWords(facturaData.total));
  }, [facturaData]);

  const fmt = (val: number) => {
    if (val === 0) return "";
    return new Intl.NumberFormat('es-PY').format(val);
  };

  const fmtAlways = (val: number) => {
    return new Intl.NumberFormat('es-PY').format(val);
  };

  const handleSaveToBackend = async () => {
    if (!facturaData.pagoId) return;
    setIsSaving(true);

    const metadata = {
      rucInquilino,
      nombreInquilino,
      direccion: direccionInquilino,
      descripcion,
      montoLetras,
      concepto: descripcion
    };

    try {
      await fetch(`http://localhost:5034/api/Contratos/pago/${facturaData.pagoId}/comprobante`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facturaEmitida: true,
          numeroFactura: numero || null,
          comprobanteUrl: JSON.stringify(metadata)
        })
      });
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Error saving in FacturaReporte:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    await handleSaveToBackend();
    toast.success("Comprobante guardado", { description: "Abriendo vista previa para imprimir..." });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleShareWhatsApp = async () => {
    await handleSaveToBackend();
    const subIva10Calc = Math.round(facturaData.items.reduce((s, i) => s + i.iva10, 0) / 11);
    
    let mensaje = `*COMPROBANTE LEGAL / FACTURA - VORDIA*\n\n`;
    mensaje += `*Emisor:* ${facturaData.nombreEmpresa || "Marcelo David Ortigoza Maidana"}\n`;
    if (facturaData.rucEmpresa) mensaje += `*RUC:* ${facturaData.rucEmpresa}\n`;
    mensaje += `*Comprobante N°:* ${numero || "S/N"}\n`;
    if (facturaData.timbrado) mensaje += `*Timbrado N°:* ${facturaData.timbrado}\n`;
    mensaje += `*Fecha de Emisión:* ${facturaData.fecha || new Date().toLocaleDateString()}\n\n`;
    mensaje += `*Cliente / Razón Social:* ${nombreInquilino || "Cliente"}\n`;
    if (rucInquilino) mensaje += `*RUC / C.I.:* ${rucInquilino}\n`;
    if (direccionInquilino) mensaje += `*Dirección:* ${direccionInquilino}\n`;
    mensaje += `\n*DETALLE DE CONCEPTOS:*\n`;
    
    if (facturaData.items && facturaData.items.length > 1) {
      facturaData.items.forEach(item => {
        mensaje += `• ${item.cantidad || 1}x ${item.descripcion} — *${fmtAlways(item.precioUnitario)} Gs.*\n`;
      });
    } else {
      mensaje += `• 1x ${descripcion} — *${fmtAlways(facturaData.total)} Gs.*\n`;
    }
    
    mensaje += `\n*TOTAL A PAGAR:* *${fmtAlways(facturaData.total)} Gs.*\n`;
    if (montoLetras) mensaje += `_(${montoLetras})_\n\n`;
    mensaje += `*Liquidación de IVA (10%):* ${fmtAlways(subIva10Calc)} Gs.\n\n`;
    mensaje += `_Adjuntamos el comprobante en formato PDF. Muchas gracias por su preferencia._`;

    toast.success("Abriendo WhatsApp y preparando PDF...", {
      description: "En la ventana de impresión, elige 'Guardar como PDF' para adjuntarlo al chat de WhatsApp."
    });

    const telefono = (facturaData as any).telefonoInquilino ? String((facturaData as any).telefonoInquilino).replace(/\D/g, '') : '';
    const url = telefono 
      ? `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    
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

    setIsSendingEmail(true);
    try {
      const resp = await fetch("http://localhost:5034/api/Contratos/enviar-comprobante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailDestino: emailDestino.trim(),
          nombreCliente: nombreInquilino || "Cliente",
          rucCliente: rucInquilino || "5865896",
          direccionCliente: direccionInquilino || "Luque - Paraguay",
          numeroComprobante: numero || "001-001 0000000",
          tipoEmision: "FACTURA",
          monto: facturaData.total || 0,
          concepto: descripcion
        })
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        toast.success("Correo enviado exitosamente", {
          description: `La factura fue reenviada al correo ${emailDestino} con el PDF adjunto.`
        });
        setShowEmailPrompt(false);
      } else {
        toast.error("Error al enviar el correo", {
          description: data.message || "Verifica la configuración SMTP del servidor."
        });
      }
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("Error de red", { description: "No se pudo conectar con el servidor." });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const subExentas = facturaData.items.reduce((s, i) => s + i.exenta, 0);
  const subIva5 = facturaData.items.reduce((s, i) => s + i.iva5, 0);
  const subIva10 = facturaData.items.reduce((s, i) => s + i.iva10, 0);
  const liqIva5 = Math.round(subIva5 / 21);
  const liqIva10 = Math.round(subIva10 / 11);
  const totalIva = liqIva5 + liqIva10;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-2">
      {/* PANEL DE EDICIÓN RÁPIDA (4 COLUMNAS) */}
      <div className="md:col-span-4 bg-card p-6 rounded-[2rem] shadow-sm border border-border/80 space-y-4 h-fit no-print">
        <div className="border-b border-border pb-3">
          <h4 className="font-black italic uppercase text-foreground text-sm tracking-tight flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            Datos Editables de la Factura
          </h4>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
            Modifica aquí antes de imprimir o compartir. Se guardará al emitir.
          </p>
        </div>

        <div className="space-y-3.5 animate-in fade-in duration-200">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nº de Comprobante / Factura</label>
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="bg-muted border-none rounded-xl font-bold text-foreground h-10 text-xs"
              placeholder="001-001 0000001"
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
              value={direccionInquilino}
              onChange={(e) => setDireccionInquilino(e.target.value)}
              className="bg-muted border-none rounded-xl font-bold text-foreground h-10 text-xs"
              placeholder="Merlo de Portugal y Capitán Pedro Mayor Echauri"
            />
          </div>
          {facturaData.items.length === 1 && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Descripción / Concepto</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full bg-muted border-none rounded-xl p-2.5 font-bold text-foreground text-[11px] min-h-[50px] focus:ring-2 ring-primary outline-none resize-y"
              />
            </div>
          )}
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
            onClick={handlePrint}
            disabled={isSaving}
            className="w-full bg-slate-900 text-white font-black italic rounded-2xl h-12 shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 hover:bg-slate-800 transition-all text-xs flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {isSaving ? "GUARDANDO..." : "RE-IMPRIMIR Y GUARDAR"}
          </Button>
          <Button
            onClick={handleShareWhatsApp}
            disabled={isSaving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black italic rounded-2xl h-11 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            COMPARTIR WHATSAPP (PDF)
          </Button>
          <Button
            onClick={() => {
              if (!emailDestino) setEmailDestino("rody.moran.py@gmail.com");
              setShowEmailPrompt(true);
            }}
            disabled={isSaving || isSendingEmail}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black italic rounded-2xl h-11 shadow-xl transition-all text-xs flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {isSendingEmail ? "ENVIANDO..." : "RE-ENVIAR CORREO"}
          </Button>
        </div>
      </div>

      {/* VISTA PREVIA DE LA FACTURA (8 COLUMNAS) */}
      <div className="md:col-span-8 bg-muted/80 p-6 rounded-[2rem] flex justify-center items-start overflow-auto border border-border/50">
        <div className="bg-card w-full max-w-[750px] font-sans text-[11.5px] text-foreground leading-tight shadow-2xl rounded-none border-[1.5px] border-slate-900 p-0 printable-receipt shrink-0">
          
          {/* HEADER INVOICE */}
          <div className="grid grid-cols-[1fr_250px] border-b-[1.5px] border-slate-900">
            <div className="p-4 pr-6 border-r-[1.5px] border-slate-900 flex flex-col justify-between">
              <div>
                <h1 className="text-[20px] font-bold tracking-tight text-[#1e293b] mb-1.5 font-serif">
                  {facturaData.nombreEmpresa}
                </h1>
                <div className="text-[8px] leading-[1.35] text-foreground uppercase font-semibold space-y-0.5 whitespace-pre-line">
                  {facturaData.actividadesEmpresa}
                </div>
              </div>
              <div className="text-[9.5px] text-foreground mt-4 font-medium space-y-0.5">
                <p>{facturaData.direccionEmpresa} - Cel.: {facturaData.celEmpresa}</p>
                <p>{facturaData.ciudadEmpresa}</p>
              </div>
            </div>

            <div className="p-4 px-5 text-center flex flex-col justify-between items-center bg-card">
              <div className="text-[8.5px] leading-[1.4] text-foreground font-bold uppercase tracking-wide">
                <p>TIMBRADO Nº {facturaData.timbrado}</p>
                <p>Fecha Inicio Vigencia: {facturaData.validezInicio}</p>
                <p>Fecha Fin Vigencia: {facturaData.validezFin}</p>
              </div>
              <div className="mt-3">
                <p className="text-[13px] font-black text-foreground tracking-wide">RUC: {facturaData.rucEmpresa}</p>
                <h2 className="text-[24px] font-black tracking-wider text-foreground leading-none mt-1 uppercase">
                  FACTURA
                </h2>
                <p className="text-[13px] font-black text-foreground mt-1.5 tracking-wider">
                  Nº {numero}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b-[1.5px] border-slate-900">
            <div className="grid grid-cols-[1fr_auto] border-b-[1.5px] border-slate-900 text-[10.5px]">
              <div className="px-4 py-2 border-r-[1.5px] border-slate-900 font-bold uppercase flex items-center gap-2">
                <span className="text-foreground">FECHA DE EMISIÓN: </span>
                <span className="font-bold text-slate-950 lowercase">{facturaData.fecha}</span>
              </div>
              <div className="px-5 py-2 flex items-center gap-5 font-bold uppercase tracking-wider text-[10px] text-foreground">
                <span>COND. DE VENTA</span>
                <span>CONTADO {facturaData.condicionVenta === "Contado" ? "☑" : "☐"}</span>
                <span>CRÉDITO {facturaData.condicionVenta === "Crédito" ? "☑" : "☐"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b-[1.5px] border-slate-900 text-[10.5px]">
              <div className="px-4 py-2 border-r-[1.5px] border-slate-900 font-bold uppercase flex items-center gap-2">
                <span className="text-foreground">RUC: </span>
                <span className="font-bold text-slate-950">{rucInquilino}</span>
              </div>
              <div className="px-4 py-2 font-bold uppercase flex items-center gap-2 text-foreground">
                <span>NOTA DE REMISIÓN:</span>
              </div>
            </div>
            <div className="px-4 py-2 border-b-[1.5px] border-slate-900 font-bold text-[10.5px] uppercase flex items-center gap-2">
              <span className="text-foreground">NOMBRE O RAZÓN SOCIAL: </span>
              <span className="font-bold text-slate-950 text-[11.5px]">{nombreInquilino}</span>
            </div>
            <div className="grid grid-cols-[1fr_220px] text-[10.5px]">
              <div className="px-4 py-2 border-r-[1.5px] border-slate-900 font-bold uppercase flex items-center gap-2">
                <span className="text-foreground">DIRECCIÓN: </span>
                <span className="font-bold text-slate-950 uppercase">{direccionInquilino}</span>
              </div>
              <div className="px-4 py-2 font-bold uppercase flex items-center gap-2 text-foreground">
                <span>TELÉFONO: </span>
                <span className="font-bold text-slate-950">{facturaData.telefonoInquilino}</span>
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-slate-900 bg-card text-slate-950">
                <th rowSpan={2} className="py-2.5 px-2 text-center font-black text-[9.5px] uppercase border-r-[1.5px] border-slate-900 w-[50px]">CANT.</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center font-black text-[9.5px] uppercase border-r-[1.5px] border-slate-900">D E S C R I P C I Ó N</th>
                <th rowSpan={2} className="py-2.5 px-2 text-center font-black text-[9.5px] uppercase border-r-[1.5px] border-slate-900 w-[95px]">PRECIO<br/>UNITARIO</th>
                <th rowSpan={2} className="py-2.5 px-2 text-center font-black text-[9.5px] uppercase border-r-[1.5px] border-slate-900 w-[75px]">EXENTAS</th>
                <th colSpan={2} className="py-1 text-center font-black text-[9px] uppercase border-b-[1.5px] border-slate-900">VALOR DE VENTA</th>
              </tr>
              <tr className="border-b-[1.5px] border-slate-900 bg-card text-slate-950">
                <th className="py-1 px-2 text-center font-black text-[9px] uppercase border-r-[1.5px] border-slate-900 w-[75px]">5%</th>
                <th className="py-1 px-2 text-center font-black text-[9px] uppercase w-[90px]">10%</th>
              </tr>
            </thead>
            <tbody>
              {facturaData.items.length === 1 ? (
                <tr className="border-b border-border">
                  <td className="py-3.5 px-2 text-center border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">{facturaData.items[0].cantidad}</td>
                  <td className="py-3.5 px-3 border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">{descripcion}</td>
                  <td className="py-3.5 px-2 text-right border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">{fmtAlways(facturaData.items[0].precioUnitario)}</td>
                  <td className="py-3.5 px-2 text-right border-r-[1.5px] border-slate-900 font-medium text-[11px] text-foreground">{facturaData.items[0].exenta ? fmtAlways(facturaData.items[0].exenta) : ''}</td>
                  <td className="py-3.5 px-2 text-right border-r-[1.5px] border-slate-900 font-medium text-[11px] text-foreground">{facturaData.items[0].iva5 ? fmtAlways(facturaData.items[0].iva5) : ''}</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[11px] text-foreground">{facturaData.items[0].iva10 ? fmtAlways(facturaData.items[0].iva10) : ''}</td>
                </tr>
              ) : (
                facturaData.items.map((item, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-3.5 px-2 text-center border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">{item.cantidad}</td>
                    <td className="py-3.5 px-3 border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">{item.descripcion}</td>
                    <td className="py-3.5 px-2 text-right border-r-[1.5px] border-slate-900 font-bold text-[11px] text-foreground">{fmtAlways(item.precioUnitario)}</td>
                    <td className="py-3.5 px-2 text-right border-r-[1.5px] border-slate-900 font-medium text-[11px] text-foreground">{item.exenta ? fmtAlways(item.exenta) : ''}</td>
                    <td className="py-3.5 px-2 text-right border-r-[1.5px] border-slate-900 font-medium text-[11px] text-foreground">{item.iva5 ? fmtAlways(item.iva5) : ''}</td>
                    <td className="py-3.5 px-3 text-right font-bold text-[11px] text-foreground">{item.iva10 ? fmtAlways(item.iva10) : ''}</td>
                  </tr>
                ))
              )}
              {Array.from({length: Math.max(0, 5 - facturaData.items.length)}).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-border">
                  <td className="py-3 px-2 border-r-[1.5px] border-slate-900">&nbsp;</td>
                  <td className="py-3 px-3 border-r-[1.5px] border-slate-900"></td>
                  <td className="py-3 px-2 border-r-[1.5px] border-slate-900"></td>
                  <td className="py-3 px-2 border-r-[1.5px] border-slate-900"></td>
                  <td className="py-3 px-2 border-r-[1.5px] border-slate-900"></td>
                  <td className="py-3 px-3"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-[1.5px] border-slate-900 font-bold text-slate-950">
                <td colSpan={3} className="py-2 px-3 text-left font-black text-[10px] uppercase border-r-[1.5px] border-slate-900">SUB TOTALES:</td>
                <td className="py-2 px-2 text-right font-medium text-[11px] border-r-[1.5px] border-slate-900">{fmt(subExentas)}</td>
                <td className="py-2 px-2 text-right font-medium text-[11px] border-r-[1.5px] border-slate-900">{fmt(subIva5)}</td>
                <td className="py-2 px-3 text-right font-black text-[11px]">{fmtAlways(subIva10)}</td>
              </tr>
            </tfoot>
          </table>

          {/* TOTAL A PAGAR + TOTAL EN LETRAS */}
          <div className="border-t-[1.5px] border-slate-900">
            <div className="grid grid-cols-[1fr_90px] border-b-[1.5px] border-slate-900 text-[10.5px]">
              <div className="px-4 py-2 border-r-[1.5px] border-slate-900 font-bold uppercase flex items-center gap-2">
                <span className="text-foreground">TOTAL A PAGAR GUARANÍES: </span>
                <span className="font-black text-slate-950 uppercase">{montoLetras}</span>
              </div>
              <div className="px-4 py-2 font-black text-right text-slate-950 text-[11.5px]">
                {fmtAlways(facturaData.total)}
              </div>
            </div>
          </div>

          {/* LIQUIDACIÓN DEL IVA */}
          <div className="px-4 py-2 flex items-center justify-between text-[10px] font-bold border-b-[1.5px] border-slate-900 uppercase">
            <span>LIQUIDACIÓN DEL IVA: <span className="ml-1 text-foreground">(5%)</span> <span className="ml-0.5 font-black text-slate-950">{fmtAlways(liqIva5)}</span></span>
            <span>(10%) <span className="ml-0.5 font-black text-slate-950">{fmtAlways(liqIva10)}</span></span>
            <span className="font-black text-slate-950">TOTAL IVA: {fmtAlways(totalIva)}</span>
          </div>

          {/* PIE DE IMPRENTA */}
          <div className="px-3 py-2 flex items-center justify-between text-[7px] text-muted-foreground bg-card font-medium">
            <p className="max-w-[75%] leading-tight">
              GRAFICONT de Arnaldo Rojas · HAB. Nº 1.365 - RUC: 709716 - 6 · Gaspar R. de Francia 483 c/ Vapor Cué, Luque<br/>
              05 Tal. 50x3 · Numerados del 0001.551 al 0001.800 · E-mail: graficontajr@hotmail.com - Cel.: (0981) 749 696 - (0974) 749 696
            </p>
            <div className="text-right leading-tight font-bold">
              <p>ORIGINAL: Cliente</p>
              <p>DUPL.: No Válido para Crédito Fiscal</p>
              <p>TRIPL.: Archivo Tributario</p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL / PROMPT PARA RE-ENVIAR CORREO ELECTRÓNICO */}
      <Dialog open={showEmailPrompt} onOpenChange={setShowEmailPrompt}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-card text-foreground shadow-2xl border border-border z-[100]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black italic text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-600" />
              Re-enviar Factura por Correo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground font-medium">
              Se generará la Factura Electrónica/Legal oficial en formato PDF y se enviará mediante el servidor SMTP al correo del cliente.
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
                className="w-full bg-muted border border-border rounded-xl p-3 font-semibold text-foreground text-sm focus:ring-2 ring-emerald-600 outline-none"
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black italic rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {isSendingEmail ? "Enviando..." : "Enviar Ahora"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

