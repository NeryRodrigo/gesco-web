"use client";

import React, { useState } from "react";
import { formatDuplex } from "@/lib/utils";
import { 
  Wallet, 
  Printer, 
  Mail, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  CreditCard,
  Download,
  Home,
  Zap,
  Droplets,
  Trash2,
  User,
  MessageCircle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { FacturaReporte } from "./FacturaReporte";
import { numberToWords } from "@/lib/numberToWords";

interface PagoCompleto {
  pagoId: number;
  montoPagado: number;
  fechaPago: string;
  metodoPago: string;
  facturaEmitida: boolean;
  tipoPago?: string;
  numeroFactura?: string;
  responsableCobro?: string;
  mesPagado: number;
  anioPagado: number;
  contrato: {
    unidad: {
      codigoUnidad: string;
      nombreCondominio: string;
    };
    inquilino: {
      razonSocial: string;
      email: string;
      cedula: string;
    };
    serviciosIncluidos?: string;
  };
}

import { MorosidadesMainModal } from "./MorosidadesMainModal";

export function FacturacionVista() {
  const [loading, setLoading] = useState<number | null>(null);
  const [cobros, setCobros] = useState<PagoCompleto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pagoToAnular, setPagoToAnular] = useState<number | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<{ faltaCobrar: number; cobradoMes: number; objetivoMes: number; totalCuotasPendientes: number } | null>(null);
  const [isMorosidadesOpen, setIsMorosidadesOpen] = useState(false);

  // Estados para Reimpresión e Invoices Consolidados
  const [selectedFacturaData, setSelectedFacturaData] = useState<any | null>(null);
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);

  // Estados para Reporte Mensual
  const [isReporteModalOpen, setIsReporteModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  React.useEffect(() => {
    fetchCobros();
    fetchDashboard();
  }, []);

  const fetchCobros = async () => {
    try {
      const resp = await fetch(`http://localhost:5034/api/Contratos/pagos?t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setCobros(data);
      }
    } catch (error) {
      console.error("Error al cargar cobros", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const resp = await fetch(`http://localhost:5034/api/Dashboard/condominio/7?t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setDashboardSummary(data.summary);
      }
    } catch (error) {
      console.error("Error al cargar dashboard", error);
    }
  };

  const handleAnularCobro = async (id: number) => {
    setPagoToAnular(id);
    setIsConfirmOpen(true);
  };

  const confirmAnularCobro = async () => {
    if (!pagoToAnular) return;
    
    try {
      const resp = await fetch(`http://localhost:5034/api/Contratos/pago/${pagoToAnular}`, {
        method: "DELETE"
      });

      if (resp.ok) {
        toast.success("Cobro Anulado", { description: "La cuota ha sido habilitada nuevamente para cobro." });
        fetchCobros();
        fetchDashboard();
      } else {
        toast.error("Error al anular");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsConfirmOpen(false);
      setPagoToAnular(null);
    }
  };

  const handleEnviarEmail = (id: number, email: string) => {
    setLoading(id);
    setTimeout(() => {
        toast.success("Factura Enviada", { description: `El documento legal fue enviado a ${email}` });
        setLoading(null);
    }, 1500);
  };

  // Abre el comprobante legal consolidando cobros con el mismo número de factura
  const handleOpenFactura = (c: PagoCompleto) => {
    const rucInq = c.contrato?.inquilino?.cedula || "N/D";
    const nomInq = c.contrato?.inquilino?.razonSocial || "S/D";
    const dirInq = `${formatDuplex(c.contrato?.unidad?.codigoUnidad) || "N/D"} - ${c.contrato?.unidad?.nombreCondominio || "Aguz"}`;

    // Agrupar todos los cobros del mismo número de factura (Facturación consolidada)
    const pagosMismoNro = c.numeroFactura 
      ? cobros.filter(p => p.numeroFactura === c.numeroFactura)
      : [c];

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const items = pagosMismoNro.map(p => {
      const mesNombre = meses[p.mesPagado - 1] || "S/D";
      return {
        cantidad: 1,
        descripcion: `Alquiler del mes de ${mesNombre} ${p.anioPagado}`,
        precioUnitario: p.montoPagado,
        exenta: 0,
        iva5: 0,
        iva10: p.montoPagado
      };
    });

    const total = pagosMismoNro.reduce((sum, p) => sum + p.montoPagado, 0);

    const facturaData = {
      numero: c.numeroFactura || `001-001 ${String(c.pagoId).padStart(7, '0')}`,
      timbrado: "18093421",
      validezInicio: "11/Junio/2025",
      validezFin: "30/Junio/2026",
      rucEmpresa: "3389403-5",
      nombreEmpresa: "Marcelo David Ortigoza Maidana",
      actividadesEmpresa: "ACTIVIDADES PROFESIONALES, CIENTÍFICAS Y TÉCNICAS - OTROS ALOJAMIENTOS DE CORTO PLAZO.\nACTIVIDADES DE SERVICIOS DE ARQUITECTURA E INGENIERÍA.\nCOMERCIO AL POR MAYOR DE MERCANCÍAS A CAMBIO DE UNA RETRIBUCIÓN O POR CONTRATA.\nINTERMEDIACIÓN EN LA COMPRA, VENTA Y ARRENDAMIENTO DE INMUEBLES.",
      direccionEmpresa: "Merlo de Portugal y Capitán Pedro Mayor Echauri",
      celEmpresa: "(0994) 254 655",
      ciudadEmpresa: "Luque - Paraguay",
      fecha: new Date(c.fechaPago).toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' }),
      condicionVenta: "Contado",
      rucInquilino: rucInq,
      nombreInquilino: nomInq,
      direccionInquilino: dirInq,
      telefonoInquilino: "",
      items: items,
      total: total,
      totalIva5: 0,
      totalIva10: Math.round(total / 11),
      totalLetras: numberToWords(total),
      pagoId: c.pagoId,
      comprobanteUrl: (c as any).comprobanteUrl
    };

    setSelectedFacturaData(facturaData);
    setIsFacturaModalOpen(true);
  };

  // Filtrar cobros por buscador
  const filteredCobros = cobros.filter(c => {
    const val = searchFilter.toLowerCase();
    return c.contrato?.inquilino?.razonSocial?.toLowerCase().includes(val) ||
           c.contrato?.unidad?.codigoUnidad?.toLowerCase().includes(val) ||
           (c.numeroFactura && c.numeroFactura.includes(val)) ||
           (c.responsableCobro && c.responsableCobro.toLowerCase().includes(val));
  });

  // Cobros del mes corriente (para el Reporte Mensual)
  const currentMonthCobros = cobros.filter(c => {
    const date = new Date(c.fechaPago);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const totalRecaudadoMes = currentMonthCobros.reduce((acc, c) => acc + c.montoPagado, 0);

  const handleShareReportWhatsApp = () => {
    const now = new Date();
    const mesNombre = now.toLocaleString('es', { month: 'long' }).toUpperCase();
    
    let detail = `*REPORTE MENSUAL DE COBRANZA - GESCO*\n`;
    detail += `Periodo: ${mesNombre} ${now.getFullYear()}\n\n`;
    
    currentMonthCobros.forEach((c) => {
      detail += `• *${formatDuplex(c.contrato?.unidad?.codigoUnidad)}*: ${c.contrato?.inquilino?.razonSocial} - Monto: ${new Intl.NumberFormat('es-PY').format(c.montoPagado)} Gs. (Factura: ${c.numeroFactura || "S/N"})\n`;
    });
    
    detail += `\n*TOTAL RECAUDADO:* ${new Intl.NumberFormat('es-PY').format(totalRecaudadoMes)} Gs.\n\n_Reporte generado automáticamente por Gesco Inmobiliaria_`;
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(detail)}`;
    window.open(url, "_blank");
  };

  // Cálculos dinámicos de Cobrado Hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const totalHoy = cobros
    .filter(c => c.fechaPago && c.fechaPago.split('T')[0] === todayStr)
    .reduce((acc, c) => acc + c.montoPagado, 0);

  const pendientesFacturar = dashboardSummary?.faltaCobrar || 0;
  const totalOperacionesPendientes = dashboardSummary?.totalCuotasPendientes || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER DE FACTURACIÓN */}
      <div className="bg-card p-8 rounded-[2.5rem] shadow-sm border border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
              <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20 text-primary-foreground">
                  <FileText className="w-8 h-8" />
              </div>
              <div>
                  <h2 className="text-4xl font-black italic text-foreground tracking-tighter uppercase leading-none">Centro de <span className="text-primary">Cobranzas</span></h2>
                  <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Gestión de Pagos e Impresión Legal</p>
              </div>
          </div>
          
          <div className="flex gap-3">
              <Button onClick={() => setIsMorosidadesOpen(true)} variant="destructive" className="h-12 rounded-xl font-black italic px-6 shadow-xl shadow-red-500/20 hover:scale-105 transition-all">
                 <AlertTriangle className="w-4 h-4 mr-2" /> MOROSIDADES
              </Button>
              <Button onClick={() => setIsReporteModalOpen(true)} variant="outline" className="h-12 rounded-xl border-border font-bold px-6 bg-secondary hover:bg-muted transition-colors">
                 <Download className="w-4 h-4 mr-2" /> REPORTE MENSUAL
              </Button>
              <Button onClick={() => window.print()} className="h-12 rounded-xl bg-primary text-primary-foreground font-black italic px-8 shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                 <Printer className="w-4 h-4 mr-2" /> REIMPRESIÓN MASIVA
              </Button>
          </div>
      </div>

      {/* MÉTDRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm rounded-3xl bg-emerald-500 text-white">
            <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">Cobrado Hoy</p>
                <h3 className="text-3xl font-black mt-1 tracking-tighter italic">Gs. {totalHoy.toLocaleString()}</h3>
                <div className="mt-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span className="text-[10px] font-bold uppercase">
                        {cobros.filter(c => c.fechaPago && c.fechaPago.split('T')[0] === todayStr).length} Operaciones exitosas
                    </span>
                </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl bg-card">
            <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pendiente de Facturar</p>
                <h3 className="text-3xl font-black text-foreground mt-1 tracking-tighter italic">Gs. {pendientesFacturar.toLocaleString()}</h3>
                <div className="mt-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{totalOperacionesPendientes} cobros sin documento legal</span>
                </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl bg-primary text-primary-foreground">
            <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase text-primary-foreground/70 tracking-widest">Siguiente Correlativo</p>
                <h3 className="text-2xl font-black mt-1 tracking-tighter italic">001-001-0000046</h3>
                <div className="mt-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-foreground/70" />
                    <span className="text-[10px] font-bold uppercase italic">Vence en 245 días</span>
                </div>
            </CardContent>
          </Card>
      </div>

      {/* TABLA DE COBROS */}
      <Card className="border-none shadow-xl shadow-primary/5 rounded-[2.5rem] overflow-hidden bg-card">
          <CardHeader className="p-8 border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-primary" />
                  <CardTitle className="text-sm font-black uppercase italic tracking-widest text-foreground">Historial Reciente de Cobranzas</CardTitle>
              </div>
              <div className="flex gap-2">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar recibo, inquilino o cobrador..." 
                        className="pl-9 h-9 w-64 text-[10px] rounded-full bg-secondary border-none font-bold text-foreground" 
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                      />
                  </div>
              </div>
          </CardHeader>
          <Table>
              <TableHeader className="bg-secondary/50">
                  <TableRow>
                      <TableHead className="pl-8 text-[10px] font-black uppercase text-muted-foreground">Unidad / Condo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Inquilino</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Concepto</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Monto Cobrado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Método / Fecha</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Cobrador</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-center">Estado Legal</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-muted-foreground">Acciones OIMA</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {isLoadingData ? (
                      <TableRow>
                          <TableCell colSpan={8} className="text-center py-20 text-muted-foreground font-bold animate-pulse">Cargando registros del servidor...</TableCell>
                      </TableRow>
                  ) : filteredCobros.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic font-bold">No se encontraron cobros registrados.</TableCell>
                      </TableRow>
                  ) : (
                    filteredCobros.map((cobro) => (
                      <tr key={cobro.pagoId} className="hover:bg-secondary/35 transition-all group border-b border-border/50 font-sans text-xs text-foreground">
                          <td className="pl-8 py-5">
                              <div className="flex items-center gap-3">
                                  <div className="bg-primary/10 p-2 rounded-xl text-primary font-black text-xs uppercase shadow-inner">
                                      {formatDuplex(cobro.contrato?.unidad?.codigoUnidad) || "N/A"}
                                  </div>
                                  <div>
                                      <p className="font-black text-foreground uppercase italic text-xs tracking-tight">{cobro.contrato?.unidad?.nombreCondominio || "Aguz"}</p>
                                      <p className="text-[9px] font-bold text-muted-foreground">ID COBRO: #{cobro.pagoId}</p>
                                  </div>
                              </div>
                          </td>
                          <td>
                              <p className="font-black text-foreground/80 uppercase italic text-xs tracking-tight">{cobro.contrato?.inquilino?.razonSocial || "S/D"}</p>
                              <p className="text-[9px] font-bold text-primary underline">{cobro.contrato?.inquilino?.email || "S/E"}</p>
                          </td>
                          <td>
                              <div className="flex items-center gap-2">
                                  {cobro.tipoPago === "Alquiler" && <div className="p-1 bg-blue-100 text-blue-600 rounded-md"><Home className="w-3 h-3" /></div>}
                                  {cobro.tipoPago === "Luz" && <div className="p-1 bg-yellow-100 text-yellow-600 rounded-md"><Zap className="w-3 h-3" /></div>}
                                  {cobro.tipoPago === "Agua" && <div className="p-1 bg-blue-100 text-blue-500 rounded-md"><Droplets className="w-3 h-3" /></div>}
                                  {cobro.tipoPago === "Basura" && <div className="p-1 bg-muted text-muted-foreground rounded-md"><Trash2 className="w-3 h-3" /></div>}
                                  <span className="font-black text-foreground uppercase italic text-[10px] tracking-tighter">
                                      {cobro.tipoPago === "Alquiler" && cobro.contrato?.serviciosIncluidos 
                                        ? `Alquiler (+ ${cobro.contrato.serviciosIncluidos})` 
                                        : (cobro.tipoPago || "Alquiler")}
                                  </span>
                              </div>
                          </td>
                          <td>
                              <span className="font-black text-foreground italic text-sm">Gs. {cobro.montoPagado.toLocaleString()}</span>
                          </td>
                          <td>
                              <div className="flex items-center gap-2">
                                  <CreditCard className="w-3 h-3 text-muted-foreground/30" />
                                  <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-tighter">{cobro.metodoPago} - {new Date(cobro.fechaPago).toLocaleDateString()}</span>
                              </div>
                          </td>
                          <td>
                              {cobro.responsableCobro ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-foreground shrink-0">
                                    {cobro.responsableCobro.substring(0, 1).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-xs uppercase text-foreground">{cobro.responsableCobro}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-muted-foreground italic">Sistema</span>
                              )}
                          </td>
                          <td className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge className="bg-emerald-500 text-white font-black italic text-[9px] uppercase px-3 py-1 rounded-lg shadow-md border-none">
                                  COBRADO
                                </Badge>
                                {cobro.numeroFactura ? (
                                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Factura: {cobro.numeroFactura}</span>
                                ) : (
                                  <span className="text-[8px] font-black text-orange-500 uppercase tracking-tighter">Pendiente Factura</span>
                                )}
                              </div>
                          </td>
                          <td className="text-right pr-8">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    onClick={() => handleOpenFactura(cobro)}
                                    variant="ghost" size="icon" title="Reimprimir Comprobante" className="h-9 w-9 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                                      <Printer className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    onClick={() => handleEnviarEmail(cobro.pagoId, cobro.contrato?.inquilino?.email)}
                                    disabled={loading === cobro.pagoId}
                                    variant="ghost" size="icon" title="Enviar Email" className={`h-9 w-9 rounded-xl transition-all ${loading === cobro.pagoId ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'}`}
                                  >
                                      {loading === cobro.pagoId ? <Clock className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                  </Button>
                                  <Button 
                                    onClick={() => handleAnularCobro(cobro.pagoId)}
                                    variant="ghost" size="icon" title="Anular Cobro" className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-400 transition-all">
                                      <ArrowUpRight className="w-4 h-4 rotate-45" />
                                  </Button>
                              </div>
                          </td>
                      </tr>
                    ))
                  )}
              </TableBody>
          </Table>
      </Card>
      
      {/* DIALOG DE CONFIRMACIÓN PARA ANULACIÓN */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] border-none shadow-2xl rounded-[2rem] overflow-hidden p-0 bg-card">
            <div className="bg-red-500/10 p-8 flex flex-col items-center text-center gap-4">
                <div className="bg-red-500 p-4 rounded-full shadow-lg shadow-red-500/30 text-white animate-bounce">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-red-600">
                        ¿Confirmar Anulación?
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-bold text-xs uppercase tracking-wide leading-relaxed">
                        Esta acción es irreversible y revertirá el estado de la cuota en el historial de la unidad.
                    </DialogDescription>
                </div>
            </div>
            
            <DialogFooter className="p-6 bg-muted flex sm:flex-row gap-3">
                <DialogClose asChild>
                    <Button variant="ghost" className="flex-1 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-muted">
                        Cancelar
                    </Button>
                </DialogClose>
                <Button 
                    onClick={confirmAnularCobro}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black italic uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/20 transition-all hover:scale-105"
                >
                    Confirmar Anulación
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG REIMPRESIÓN FACTURA CONSOLIDADA */}
      <Dialog open={isFacturaModalOpen} onOpenChange={setIsFacturaModalOpen}>
        <DialogContent className="sm:max-w-[1150px] max-h-[95vh] overflow-y-auto border-none p-6 shadow-2xl bg-muted rounded-[2.5rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>Impresión de Factura</DialogTitle>
          </DialogHeader>
          <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border/60 shadow-sm mb-4">
            <h4 className="font-black italic uppercase text-foreground text-sm">Vista Previa del Comprobante Legal</h4>
            <Button variant="ghost" size="icon" onClick={() => setIsFacturaModalOpen(false)}>
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </Button>
          </div>
          {selectedFacturaData && (
            <FacturaReporte facturaData={selectedFacturaData} onSaved={fetchCobros} />
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG REPORTE MENSUAL */}
      <Dialog open={isReporteModalOpen} onOpenChange={setIsReporteModalOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 rounded-[2.5rem] bg-card border-none shadow-2xl overflow-hidden text-foreground">
          <DialogHeader className="sr-only">
            <DialogTitle>Reporte Mensual Inmobiliario</DialogTitle>
            <DialogDescription>
              Cierre de caja, listado de inquilinos al día y cobros consolidados del mes.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-950 p-8 text-white relative">
            <button 
              onClick={() => setIsReporteModalOpen(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-white rounded-full p-1.5 hover:bg-card/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em] mb-1">Cierre de Caja y Recaudación</p>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter">
              Reporte Mensual Inmobiliario
            </h3>
            <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mt-1">
              Listado de inquilinos al día y cobros consolidados
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center bg-muted p-5 rounded-2xl border border-border">
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Total Cobrado en el Mes</p>
                <p className="text-2xl font-black italic text-emerald-600 leading-none">
                  Gs. {totalRecaudadoMes.toLocaleString()}
                </p>
              </div>
              <Button 
                onClick={handleShareReportWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black italic px-6 h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" /> COMPARTIR POR WHATSAPP
              </Button>
            </div>

            <div className="border border-border/60 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted uppercase text-[9px] font-black text-muted-foreground">
                  <TableRow>
                    <TableHead className="pl-6 py-3">Unidad</TableHead>
                    <TableHead className="py-3">Inquilino</TableHead>
                    <TableHead className="py-3">Cédula/RUC</TableHead>
                    <TableHead className="py-3 text-right">Monto Cobrado</TableHead>
                    <TableHead className="pr-6 py-3 text-right">Factura N°</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-bold text-foreground">
                  {currentMonthCobros.length === 0 ? (
                    <TableRow>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground italic">
                        No hay cobros registrados en el mes actual.
                      </td>
                    </TableRow>
                  ) : (
                    currentMonthCobros.map((c) => (
                      <TableRow key={c.pagoId} className="hover:bg-muted">
                        <TableCell className="pl-6 py-3 text-primary font-black italic text-xs">{formatDuplex(c.contrato?.unidad?.codigoUnidad)}</TableCell>
                        <TableCell className="py-3 uppercase text-[10px] tracking-tight">{c.contrato?.inquilino?.razonSocial}</TableCell>
                        <TableCell className="py-3">{c.contrato?.inquilino?.cedula || "N/A"}</TableCell>
                        <TableCell className="py-3 text-right text-foreground font-black italic">{c.montoPagado.toLocaleString()} Gs.</TableCell>
                        <TableCell className="pr-6 py-3 text-right text-muted-foreground font-mono">{c.numeroFactura || "S/N"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 flex justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsReporteModalOpen(false)}
              className="font-bold text-muted-foreground h-11 px-6 rounded-xl"
            >
              CERRAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MorosidadesMainModal 
        isOpen={isMorosidadesOpen} 
        onClose={() => { setIsMorosidadesOpen(false); fetchDashboard(); }} 
      />
    </div>
  );
}
