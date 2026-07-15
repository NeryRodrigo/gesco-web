"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { numberToWords } from "@/lib/numberToWords";
import { PrintPortal } from "@/components/ui/print-portal";

interface ReciboDineroModalProps {
  isOpen: boolean;
  onClose: () => void;
  reciboData: {
    reciboId: number;
    inquilinoNombre: string;
    monto: number;
    concepto: string;
    unidadCodigo: string;
    condominio: string;
    fechaPago: string;
    metodoPago: string;
  } | null;
}

export function ReciboDineroModal({ isOpen, onClose, reciboData }: ReciboDineroModalProps) {
  if (!reciboData) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-PY").format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const receiptContent = (
    <div className="bg-card p-8 border border-border rounded-[1.5rem] shadow-sm max-w-[650px] mx-auto font-mono text-[12px] text-foreground leading-normal printable-receipt">
      {/* HEADER RECIBO */}
      <div className="flex justify-between items-start border-b border-border pb-4 mb-6">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">GESCO REAL ESTATE</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Gestión de Alquileres y Administración</p>
          <p className="text-[9px] text-muted-foreground">Luque - Paraguay</p>
        </div>
        <div className="text-right border-l border-border pl-6">
          <h3 className="text-sm font-black text-foreground uppercase">RECIBO DE DINERO</h3>
          <p className="text-sm font-black text-primary italic mt-1">Gs. {formatCurrency(reciboData.monto)}</p>
          <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Nº REC-{String(reciboData.reciboId).padStart(6, "0")}</p>
        </div>
      </div>

      {/* CUERPO DEL RECIBO */}
      <div className="space-y-4">
        <div className="flex justify-between border-b border-border pb-2">
          <span className="font-bold text-muted-foreground uppercase text-[10px]">Fecha de Pago:</span>
          <span className="font-black text-foreground">{new Date(reciboData.fechaPago).toLocaleDateString("es-PY")}</span>
        </div>

        <div className="border-b border-border pb-2">
          <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Recibimos de:</span>
          <span className="font-black text-foreground text-sm uppercase italic">{reciboData.inquilinoNombre}</span>
        </div>

        <div className="border-b border-border pb-2">
          <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">La suma de guaraníes:</span>
          <span className="font-black text-foreground uppercase italic text-[11px] leading-tight block">
            {numberToWords(reciboData.monto)}
          </span>
        </div>

        <div className="border-b border-border pb-2">
          <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">En concepto de:</span>
          <span className="font-bold text-foreground text-xs uppercase">{reciboData.concepto} - Unidad {reciboData.unidadCodigo} ({reciboData.condominio})</span>
        </div>

        <div className="flex justify-between border-b border-border pb-2">
          <span className="font-bold text-muted-foreground uppercase text-[10px]">Método de Pago:</span>
          <span className="font-black text-foreground uppercase">{reciboData.metodoPago}</span>
        </div>
      </div>

      {/* SIGNATURES */}
      <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-border">
        <div className="text-center">
          <div className="border-b border-border h-8" />
          <p className="text-[9px] font-black uppercase text-muted-foreground mt-2">Entregué Conforme</p>
          <p className="text-[9px] text-muted-foreground font-bold mt-0.5">Inquilino</p>
        </div>
        <div className="text-center">
          <div className="border-b border-border h-8" />
          <p className="text-[9px] font-black uppercase text-muted-foreground mt-2">Recibí Conforme</p>
          <p className="text-[9px] text-muted-foreground font-bold mt-0.5">Administración Gesco</p>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[700px] border-none p-6 shadow-2xl bg-muted rounded-[2.5rem]">
        <DialogHeader className="sr-only">
          <DialogTitle>Recibo de Dinero</DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border/60 shadow-sm mb-4 no-print">
          <h4 className="font-black italic uppercase text-foreground text-sm">Comprobante de Pago Generado</h4>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>

        {/* CONTENIDO DEL RECIBO IMPRIMIBLE EN VISUALIZACIÓN */}
        {receiptContent}

        {/* ACCIONES */}
        <div className="mt-6 flex justify-center gap-4 no-print">
          <Button onClick={handlePrint} className="bg-slate-900 text-white font-black italic rounded-xl px-8 shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> IMPRIMIR RECIBO
          </Button>
        </div>
      </DialogContent>

      <PrintPortal>{receiptContent}</PrintPortal>
    </Dialog>
  );
}
