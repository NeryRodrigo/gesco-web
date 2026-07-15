"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Wallet, 
  Calendar, 
  DollarSign, 
  Camera, 
  Trash2, 
  Zap, 
  CreditCard,
  Save,
  Clock,
  ArrowRight,
  User,
  FileText,
  MessageCircle,
  Mail,
  X,
  Printer
} from "lucide-react";
import { toast } from "sonner";
import { numberToWords } from "@/lib/numberToWords";

export interface PagoConsolidadoData {
  contratoId: number;
  tipoPago: "Alquiler" | "Luz" | "Basura" | "Agua";
  mesPagado: number;
  anioPagado: number;
  fechaPago: string;
  montoPagado: number;
  metodoPago: string;
  saldoPendiente: number;
  mora: number;
  numeroFactura?: string;
  nroComprobante?: string;
  banco?: string;
  notas?: string;
  responsableCobro?: string;
  facturaEmitida?: boolean;
}

interface RegistrarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidadId: number;
  codigoUnidad: string;
  inquilinoNombre: string;
  empresaId: number;
  onSave: (pagos: PagoConsolidadoData[], sendAlerts: { whatsapp: boolean, email: boolean, phone: string, emailAddr: string }) => void;
}

interface ContratoDetails {
  contratoId: number;
  montoMensualAlquiler: number;
  fechaInicioContrato: string;
  diaVencimiento: number;
  serviciosIncluidos?: string;
  inquilino: {
    razonSocial: string;
    cedula: string;
    telefono: string;
    email: string;
  };
}

interface FineConfig {
  montoMulta: number;
  tipoAplicacion: string; // "FinMesAtrasado" or "CincoDias"
  diasGracia: number;
}

export function RegistrarPagoModal({ 
  isOpen, 
  onClose, 
  unidadId, 
  codigoUnidad, 
  inquilinoNombre,
  empresaId,
  onSave 
}: RegistrarPagoModalProps) {
  
  const [contrato, setContrato] = useState<ContratoDetails | null>(null);
  const [fineConfig, setFineConfig] = useState<FineConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [tipoComprobante, setTipoComprobante] = useState<"Factura" | "Recibo">("Recibo");

  // Conceptos seleccionados
  const [chkAlquiler, setChkAlquiler] = useState(true);
  const [chkLuz, setChkLuz] = useState(false);
  const [chkBasura, setChkBasura] = useState(false);
  const [chkAgua, setChkAgua] = useState(false);

  // Form general
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [nroComprobante, setNroComprobante] = useState("");
  const [banco, setBanco] = useState("");
  const [notas, setNotas] = useState("");
  const [responsableCobro, setResponsableCobro] = useState("");

  // Periodos e importes individuales
  const [mesAlquiler, setMesAlquiler] = useState(new Date().getMonth() + 1);
  const [anioAlquiler, setAnioAlquiler] = useState(new Date().getFullYear());
  const [montoAlquiler, setMontoAlquiler] = useState(0);
  const [moraAlquiler, setMoraAlquiler] = useState(0);
  const [saldoAlquiler, setSaldoAlquiler] = useState(0);

  const [mesLuz, setMesLuz] = useState(new Date().getMonth() + 1);
  const [anioLuz, setAnioLuz] = useState(new Date().getFullYear());
  const [montoLuz, setMontoLuz] = useState(0);

  const [mesBasura, setMesBasura] = useState(new Date().getMonth() + 1);
  const [anioBasura, setAnioBasura] = useState(new Date().getFullYear());
  const [montoBasura, setMontoBasura] = useState(0);

  const [mesAgua, setMesAgua] = useState(new Date().getMonth() + 1);
  const [anioAgua, setAnioAgua] = useState(new Date().getFullYear());
  const [montoAgua, setMontoAgua] = useState(0);

  // Alertas
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  // Fetch contract and fine configuration on open
  useEffect(() => {
    if (isOpen && unidadId > 0) {
      setLoading(true);
      
      const fetchInfo = async () => {
        try {
          const [respContrato, respFine] = await Promise.all([
            fetch(`http://localhost:5034/api/Contratos/unidad/${unidadId}`),
            fetch(`http://localhost:5034/api/ConfiguracionMultas/empresa/${empresaId}`)
          ]);

          if (respContrato.ok) {
            const data = await respContrato.json();
            setContrato(data);
            setMontoAlquiler(data.montoMensualAlquiler || 0);
          }
          if (respFine.ok) {
            const data = await respFine.json();
            setFineConfig(data);
          }
        } catch (error) {
          console.error("Error fetching payment details:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchInfo();
    }
  }, [isOpen, unidadId]);

  // Recalculate fine automatically when fechaPago, mesAlquiler, anioAlquiler or fineConfig changes
  useEffect(() => {
    if (!contrato || !fineConfig || !chkAlquiler) return;

    const calculateFine = () => {
      const payDate = new Date(fechaPago);
      const year = anioAlquiler;
      const month = mesAlquiler;
      
      let isLate = false;

      if (fineConfig.tipoAplicacion === "FinMesAtrasado") {
        // Rent month: month. Last day of month
        const lastDayOfRentMonth = new Date(year, month, 0); // month is 1-indexed, so passing month here gets last day of month-1. Wait: Date constructor takes 0-indexed month, so month parameter as month index gets the 0-th day of month+1, which is the last day of month!
        // E.g. month=6 (June), new Date(2026, 6, 0) is June 30, 2026.
        if (payDate > lastDayOfRentMonth) {
          isLate = true;
        }
      } else if (fineConfig.tipoAplicacion === "CincoDias") {
        // Due day is usually 5 (or diaVencimiento from contract, defaulting to 5)
        const dueDay = contrato.diaVencimiento || 5;
        const dueDate = new Date(year, month - 1, dueDay);
        // Add grace days
        const graceDays = fineConfig.diasGracia || 5;
        const limitDate = new Date(dueDate);
        limitDate.setDate(limitDate.getDate() + graceDays);

        if (payDate >= limitDate) {
          isLate = true;
        }
      }

      if (isLate) {
        setMoraAlquiler(fineConfig.montoMulta);
      } else {
        setMoraAlquiler(0);
      }
    };

    calculateFine();
  }, [fechaPago, mesAlquiler, anioAlquiler, fineConfig, contrato, chkAlquiler]);

  // Calculate totals
  const totalCobro = (chkAlquiler ? (montoAlquiler + moraAlquiler + saldoAlquiler) : 0) +
                     (chkLuz ? montoLuz : 0) +
                     (chkBasura ? montoBasura : 0) +
                     (chkAgua ? montoAgua : 0);

  const handleSave = () => {
    if (!chkAlquiler && !chkLuz && !chkBasura && !chkAgua) {
      toast.error("Debe seleccionar al menos un concepto a cobrar");
      return;
    }

    if (chkAlquiler && montoAlquiler <= 0) {
      toast.error("El monto de alquiler debe ser mayor a 0");
      return;
    }
    if (chkLuz && montoLuz <= 0) {
      toast.error("El monto de luz debe ser mayor a 0");
      return;
    }
    if (chkBasura && montoBasura <= 0) {
      toast.error("El monto de basura debe ser mayor a 0");
      return;
    }
    if (chkAgua && montoAgua <= 0) {
      toast.error("El monto de agua debe ser mayor a 0");
      return;
    }

    if (!contrato) {
      toast.error("No se han cargado los detalles del contrato");
      return;
    }

    const pagos: PagoConsolidadoData[] = [];

    if (chkAlquiler) {
      pagos.push({
        contratoId: contrato.contratoId,
        tipoPago: "Alquiler",
        mesPagado: mesAlquiler,
        anioPagado: anioAlquiler,
        fechaPago,
        montoPagado: montoAlquiler,
        metodoPago,
        saldoPendiente: saldoAlquiler,
        mora: moraAlquiler,
        banco,
        notas,
        responsableCobro,
        facturaEmitida: tipoComprobante === "Factura"
      });
    }

    if (chkLuz) {
      pagos.push({
        contratoId: contrato.contratoId,
        tipoPago: "Luz",
        mesPagado: mesLuz,
        anioPagado: anioLuz,
        fechaPago,
        montoPagado: montoLuz,
        metodoPago,
        saldoPendiente: 0,
        mora: 0,
        banco,
        notas,
        responsableCobro,
        facturaEmitida: tipoComprobante === "Factura"
      });
    }

    if (chkBasura) {
      pagos.push({
        contratoId: contrato.contratoId,
        tipoPago: "Basura",
        mesPagado: mesBasura,
        anioPagado: anioBasura,
        fechaPago,
        montoPagado: montoBasura,
        metodoPago,
        saldoPendiente: 0,
        mora: 0,
        banco,
        notas,
        responsableCobro,
        facturaEmitida: tipoComprobante === "Factura"
      });
    }

    if (chkAgua) {
      pagos.push({
        contratoId: contrato.contratoId,
        tipoPago: "Agua",
        mesPagado: mesAgua,
        anioPagado: anioAgua,
        fechaPago,
        montoPagado: montoAgua,
        metodoPago,
        saldoPendiente: 0,
        mora: 0,
        banco,
        notas,
        responsableCobro,
        facturaEmitida: tipoComprobante === "Factura"
      });
    }

    onSave(pagos, {
      whatsapp: sendWhatsApp,
      email: sendEmail,
      phone: contrato.inquilino?.telefono || "",
      emailAddr: contrato.inquilino?.email || ""
    });
    
    // Si es recibo y estamos confirmando desde la vista previa, podemos imprimir automáticamente o solo cerrar
    if (tipoComprobante === "Recibo" && step === 2) {
       setTimeout(() => window.print(), 500);
    }
    onClose();
  };

  const handleNextStep = () => {
    handleSave();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border border-border shadow-2xl rounded-[2.5rem] bg-card text-foreground">
        <DialogHeader className="sr-only">
          <DialogTitle>Registrar Cobro Consolidado - {inquilinoNombre} ({codigoUnidad})</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.25em]">Cargando expediente...</p>
          </div>
        ) : (
          <div className="max-h-[90vh] overflow-y-auto">
            {/* HEADER CON DETALLES DE INQUILINO */}
            <div className="bg-slate-950 p-8 text-white border-b border-white/5 relative no-print">
              <button 
                onClick={step === 2 ? () => setStep(1) : onClose}
                className="absolute top-6 right-6 text-muted-foreground hover:text-white rounded-full p-1.5 hover:bg-card/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <p className="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em] mb-1">
                {step === 2 ? "Vista Previa de Recibo" : "Cobro Consolidado Duplex"}
              </p>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2">
                {inquilinoNombre}
              </h2>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Unidad: {codigoUnidad} • RUC/CI: {contrato?.inquilino?.cedula || "N/A"}
              </p>
            </div>

            {step === 1 ? (
              <>
                {/* SELECCIÓN DE TIPO DE COMPROBANTE */}
                <div className="p-8 pb-4 border-b border-border/40">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block mb-3">Tipo de Comprobante a Emitir</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setTipoComprobante("Recibo")}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-black uppercase text-xs
                        ${tipoComprobante === 'Recibo' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground hover:bg-muted'}`}
                    >
                      <FileText className="w-4 h-4" /> Recibo de Dinero
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoComprobante("Factura")}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-black uppercase text-xs
                        ${tipoComprobante === 'Factura' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground hover:bg-muted'}`}
                    >
                      <FileText className="w-4 h-4" /> Factura Legal
                    </button>
                  </div>
                </div>

            {/* SELECCIÓN DE CONCEPTOS */}
            <div className="p-8 pb-4 border-b border-border/40">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block mb-3">Conceptos a Incluir en el Recibo</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setChkAlquiler(!chkAlquiler)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-center
                    ${chkAlquiler ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-muted hover:bg-muted text-muted-foreground'}`}
                >
                  <Wallet className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Alquiler</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChkLuz(!chkLuz)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-center
                    ${chkLuz ? 'border-yellow-500 bg-yellow-500/5 text-yellow-600' : 'border-border bg-muted hover:bg-muted text-muted-foreground'}`}
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Luz (ANDE)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChkBasura(!chkBasura)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-center
                    ${chkBasura ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' : 'border-border bg-muted hover:bg-muted text-muted-foreground'}`}
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Basura</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChkAgua(!chkAgua)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-center
                    ${chkAgua ? 'border-blue-500 bg-blue-500/5 text-blue-600' : 'border-border bg-muted hover:bg-muted text-muted-foreground'}`}
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Agua</span>
                </button>
              </div>
            </div>

            {/* FORMULARIOS DE IMPORTES */}
            <div className="p-8 space-y-6">
              {/* SECCIÓN ALQUILER */}
              {chkAlquiler && (
                <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
                  <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                    <span className="text-xs font-black uppercase italic tracking-tighter text-primary">Concepto: Alquiler Mensual</span>
                    <span className="text-[10px] font-bold text-muted-foreground">Vence: {contrato?.diaVencimiento || 5} de cada mes</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Periodo Alquiler</Label>
                      <div className="flex gap-1.5">
                        <select 
                          className="flex-1 h-10 rounded-xl border border-border bg-card px-2 font-bold text-xs"
                          value={mesAlquiler}
                          onChange={(e) => setMesAlquiler(Number(e.target.value))}
                        >
                          {meses.map((m, i) => (
                            <option key={i+1} value={i+1}>{m.toUpperCase()}</option>
                          ))}
                        </select>
                        <Input 
                          type="number" 
                          className="w-16 h-10 rounded-xl border-border bg-card font-bold text-xs"
                          value={anioAlquiler}
                          onChange={(e) => setAnioAlquiler(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Importe Alquiler (Gs.)</Label>
                      <Input 
                        type="number" 
                        className="h-10 rounded-xl border-border bg-card font-black text-foreground"
                        value={montoAlquiler}
                        onChange={(e) => setMontoAlquiler(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Saldo Pendiente (Gs.)</Label>
                      <Input 
                        type="number" 
                        className="h-10 rounded-xl border-border bg-card font-bold text-foreground"
                        value={saldoAlquiler}
                        onChange={(e) => setSaldoAlquiler(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-red-500 flex items-center gap-1">
                        Mora / Recargo (Gs.) 
                        {moraAlquiler > 0 && <Clock className="w-3 h-3 text-red-500 animate-pulse" />}
                      </Label>
                      <Input 
                        type="number" 
                        className="h-10 rounded-xl border-red-200 bg-card font-black text-red-600"
                        value={moraAlquiler}
                        onChange={(e) => setMoraAlquiler(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Subtotal Alquiler</p>
                        <p className="text-lg font-black text-primary italic leading-none">
                          {formatCurrency(montoAlquiler + moraAlquiler + saldoAlquiler)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN LUZ */}
              {chkLuz && (
                <div className="p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 space-y-4">
                  <div className="flex justify-between items-center border-b border-yellow-500/10 pb-2">
                    <span className="text-xs font-black uppercase italic tracking-tighter text-yellow-600">Concepto: Consumo ANDE (Luz)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Periodo Consumo</Label>
                      <div className="flex gap-1.5">
                        <select 
                          className="flex-1 h-10 rounded-xl border border-border bg-card px-2 font-bold text-xs"
                          value={mesLuz}
                          onChange={(e) => setMesLuz(Number(e.target.value))}
                        >
                          {meses.map((m, i) => (
                            <option key={i+1} value={i+1}>{m.toUpperCase()}</option>
                          ))}
                        </select>
                        <Input 
                          type="number" 
                          className="w-16 h-10 rounded-xl border-border bg-card font-bold text-xs"
                          value={anioLuz}
                          onChange={(e) => setAnioLuz(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Monto ANDE (Gs.)</Label>
                      <Input 
                        type="number" 
                        className="h-10 rounded-xl border-border bg-card font-black text-foreground"
                        value={montoLuz}
                        onChange={(e) => setMontoLuz(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Subtotal Luz</p>
                        <p className="text-lg font-black text-yellow-600 italic leading-none">
                          {formatCurrency(montoLuz)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN BASURA */}
              {chkBasura && (
                <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                  <div className="flex justify-between items-center border-b border-emerald-500/10 pb-2">
                    <span className="text-xs font-black uppercase italic tracking-tighter text-emerald-600">Concepto: Recolección de Basura</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Periodo Servicio</Label>
                      <div className="flex gap-1.5">
                        <select 
                          className="flex-1 h-10 rounded-xl border border-border bg-card px-2 font-bold text-xs"
                          value={mesBasura}
                          onChange={(e) => setMesBasura(Number(e.target.value))}
                        >
                          {meses.map((m, i) => (
                            <option key={i+1} value={i+1}>{m.toUpperCase()}</option>
                          ))}
                        </select>
                        <Input 
                          type="number" 
                          className="w-16 h-10 rounded-xl border-border bg-card font-bold text-xs"
                          value={anioBasura}
                          onChange={(e) => setAnioBasura(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Importe Servicio (Gs.)</Label>
                      <Input 
                        type="number" 
                        className="h-10 rounded-xl border-border bg-card font-black text-foreground"
                        value={montoBasura}
                        onChange={(e) => setMontoBasura(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Subtotal Basura</p>
                        <p className="text-lg font-black text-emerald-600 italic leading-none">
                          {formatCurrency(montoBasura)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN AGUA */}
              {chkAgua && (
                <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-4">
                  <div className="flex justify-between items-center border-b border-blue-500/10 pb-2">
                    <span className="text-xs font-black uppercase italic tracking-tighter text-blue-600">Concepto: Consumo de Agua</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Periodo Consumo</Label>
                      <div className="flex gap-1.5">
                        <select 
                          className="flex-1 h-10 rounded-xl border border-border bg-card px-2 font-bold text-xs"
                          value={mesAgua}
                          onChange={(e) => setMesAgua(Number(e.target.value))}
                        >
                          {meses.map((m, i) => (
                            <option key={i+1} value={i+1}>{m.toUpperCase()}</option>
                          ))}
                        </select>
                        <Input 
                          type="number" 
                          className="w-16 h-10 rounded-xl border-border bg-card font-bold text-xs"
                          value={anioAgua}
                          onChange={(e) => setAnioAgua(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Monto Consumo (Gs.)</Label>
                      <Input 
                        type="number" 
                        className="h-10 rounded-xl border-border bg-card font-black text-foreground"
                        value={montoAgua}
                        onChange={(e) => setMontoAgua(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Subtotal Agua</p>
                        <p className="text-lg font-black text-blue-600 italic leading-none">
                          {formatCurrency(montoAgua)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DETALLES DE FACTURACIÓN Y AUDITORÍA */}
              <div className="p-6 rounded-2xl border border-border/60 bg-[#F8F9FA] space-y-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Datos de Legalización y Auditoría</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Nro. Factura Legal (Consolidado)</Label>
                    <Input 
                      placeholder="Ej: 001-001-0000123" 
                      className="h-10 rounded-xl border-border bg-card font-bold text-xs"
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Responsable de Cobro</Label>
                    <Input 
                      placeholder="Nombre del Cobrador" 
                      className="h-10 rounded-xl border-border bg-card font-bold text-xs"
                      value={responsableCobro}
                      onChange={(e) => setResponsableCobro(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Fecha de Cobro</Label>
                    <Input 
                      type="date"
                      className="h-10 rounded-xl border-border bg-card font-bold text-xs"
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Método de Cobro</Label>
                    <select 
                      className="w-full h-10 rounded-xl border border-border bg-card px-2 font-bold text-xs"
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                    >
                      <option value="Efectivo">EFECTIVO</option>
                      <option value="Transferencia">TRANSFERENCIA</option>
                      <option value="Giro">GIRO / DEPÓSITO</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Nro. Comprobante / Banco</Label>
                    <div className="flex gap-1.5">
                      <Input 
                        placeholder="Nro. Transac." 
                        className="flex-1 h-10 rounded-xl border-border bg-card font-bold text-xs"
                        value={nroComprobante}
                        onChange={(e) => setNroComprobante(e.target.value)}
                      />
                      {metodoPago !== "Efectivo" && (
                        <Input 
                          placeholder="Banco" 
                          className="w-20 h-10 rounded-xl border-border bg-card font-bold text-xs"
                          value={banco}
                          onChange={(e) => setBanco(e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Notas Adicionales</Label>
                  <Input 
                    placeholder="Observaciones adicionales sobre el cobro..." 
                    className="h-10 rounded-xl border-border bg-card font-bold text-xs"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </div>
              </div>

              {/* SECCIÓN NOTIFICACIONES */}
              <div className="p-4 rounded-2xl border border-border bg-muted flex items-center justify-between gap-4">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Avisos automáticos al Inquilino:</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-foreground">
                    <Checkbox checked={sendWhatsApp} onCheckedChange={(val) => setSendWhatsApp(!!val)} />
                    <MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-foreground">
                    <Checkbox checked={sendEmail} onCheckedChange={(val) => setSendEmail(!!val)} />
                    <Mail className="w-4 h-4 text-blue-500" /> Correo Electrónico
                  </label>
                </div>
              </div>
            </div>

            {/* SECCIÓN TOTAL Y BOTONES (STEP 1) */}
            <div className="bg-muted p-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-6 no-print">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Total Consolidado a Cobrar</p>
                <p className="text-3xl font-black text-foreground italic tracking-tighter">
                  {formatCurrency(totalCobro)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose} 
                  className="font-bold text-muted-foreground hover:text-foreground h-12 rounded-xl"
                >
                  CANCELAR
                </Button>
                <Button 
                  onClick={handleNextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-2xl px-8 h-14 shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <ArrowRight className="mr-2 w-4 h-4" /> REGISTRAR COBRO Y VER VISTA PREVIA
                </Button>
              </div>
            </div>
            </>
            ) : (
              // STEP 2: VISTA PREVIA DEL RECIBO
              <div className="p-8 bg-muted flex flex-col items-center">
                <div className="bg-card p-8 border border-border rounded-[1.5rem] shadow-sm w-full max-w-[650px] font-mono text-[12px] text-foreground leading-normal printable-receipt">
                  
                  {/* HEADER RECIBO */}
                  <div className="flex justify-between items-start border-b border-border pb-4 mb-6">
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-foreground">GESCO REAL ESTATE</h2>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Gestión de Alquileres y Administración</p>
                      <p className="text-[9px] text-muted-foreground">Luque - Paraguay</p>
                    </div>
                    <div className="text-right border-l border-border pl-6">
                      <h3 className="text-sm font-black text-foreground uppercase">RECIBO DE DINERO</h3>
                      <p className="text-sm font-black text-primary italic mt-1 flex items-center justify-end gap-1">
                        Gs. 
                        <input 
                          type="number"
                          className="w-28 text-right bg-primary/10 border border-primary/20 rounded px-1 font-black no-print"
                          value={totalCobro}
                          onChange={(e) => {
                            // Actualizar el monto de alquiler basado en la diferencia
                            const newTotal = Number(e.target.value);
                            const otherCosts = (chkLuz ? montoLuz : 0) + (chkBasura ? montoBasura : 0) + (chkAgua ? montoAgua : 0) + moraAlquiler + saldoAlquiler;
                            setMontoAlquiler(newTotal - otherCosts);
                          }}
                        />
                        <span className="hidden print:inline">{formatCurrency(totalCobro).replace('Gs.', '').trim()}</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Nº REC-PENDIENTE</p>
                    </div>
                  </div>

                  {/* CUERPO DEL RECIBO */}
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="font-bold text-muted-foreground uppercase text-[10px]">Fecha de Pago:</span>
                      <span className="font-black text-foreground">{new Date(fechaPago).toLocaleDateString("es-PY")}</span>
                    </div>

                    <div className="border-b border-border pb-2">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Recibimos de:</span>
                      <span className="font-black text-foreground text-sm uppercase italic">{inquilinoNombre}</span>
                    </div>

                    <div className="border-b border-border pb-2">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">La suma de guaraníes:</span>
                      <span className="font-black text-foreground uppercase italic text-[11px] leading-tight block">
                        {numberToWords(totalCobro)}
                      </span>
                    </div>

                    <div className="border-b border-border pb-2">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">En concepto de:</span>
                      <span className="font-bold text-foreground text-xs uppercase">
                        {chkAlquiler ? `Alquiler ${meses[mesAlquiler - 1]} ${anioAlquiler} ` : ""}
                        {chkLuz ? `+ Luz ` : ""}
                        {chkBasura ? `+ Basura ` : ""}
                        {chkAgua ? `+ Agua ` : ""}
                        - Unidad {codigoUnidad}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="font-bold text-muted-foreground uppercase text-[10px]">Método de Pago:</span>
                      <span className="font-black text-foreground uppercase">{metodoPago}</span>
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

                <div className="flex justify-center gap-4 mt-8 w-full max-w-[650px] no-print">
                  <Button variant="outline" onClick={() => setStep(1)} className="font-bold rounded-xl h-12 px-6">
                    VOLVER A EDICIÓN
                  </Button>
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black italic rounded-xl px-8 h-12 shadow-lg">
                    <Printer className="w-4 h-4 mr-2" /> CONFIRMAR E IMPRIMIR RECIBO
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
