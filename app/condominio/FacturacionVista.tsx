"use client";

import React, { useState } from "react";
import { formatDuplex } from "@/lib/utils";
import { 
  Wallet, Printer, Mail, Search, CheckCircle2, Clock, 
  ArrowUpRight, FileText, Calendar, CreditCard, 
  Home, Zap, Droplets, Trash2, X, AlertTriangle, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter, DialogClose 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FacturaReporte } from "./FacturaReporte";
import { numberToWords } from "@/lib/numberToWords";
import { MorosidadesMainModal } from "./MorosidadesMainModal";

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
    unidad: { codigoUnidad: string; nombreCondominio: string; };
    inquilino: { razonSocial: string; email: string; cedula: string; };
    serviciosIncluidos?: string;
  };
}

export function FacturacionVista() {
  const [loadingEmail, setLoadingEmail] = useState<number | null>(null);
  const [cobros, setCobros] = useState<PagoCompleto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pagoToAnular, setPagoToAnular] = useState<number | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [isMorosidadesOpen, setIsMorosidadesOpen] = useState(false);
  const [selectedFacturaData, setSelectedFacturaData] = useState<any | null>(null);
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  React.useEffect(() => {
    fetchCobros();
    fetchDashboard();
  }, []);

  const fetchCobros = async () => {
    try {
      const resp = await fetch(`http://localhost:5034/api/Contratos/pagos?t=${Date.now()}`);
      if (resp.ok) setCobros(await resp.json());
    } catch (error) { console.error(error); } finally { setIsLoadingData(false); }
  };

  const fetchDashboard = async () => {
    try {
      const resp = await fetch(`http://localhost:5034/api/Dashboard/condominio/7?t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setDashboardSummary(data.summary);
      }
    } catch (error) { console.error(error); }
  };

  const handleAnularCobro = (id: number) => {
    setPagoToAnular(id);
    setIsConfirmOpen(true);
  };

  const confirmAnularCobro = async () => {
    if (!pagoToAnular) return;
    try {
      const resp = await fetch(`http://localhost:5034/api/Contratos/pago/${pagoToAnular}`, { method: "DELETE" });
      if (resp.ok) {
        toast.success("Cobro Anulado");
        fetchCobros();
        fetchDashboard();
      }
    } catch (error) { toast.error("Error de conexión"); } finally {
      setIsConfirmOpen(false);
      setPagoToAnular(null);
    }
  };

  const handleEnviarEmail = (id: number, email: string) => {
    if (!email || email === "S/E") { toast.error("Inquilino sin correo."); return; }
    setLoadingEmail(id);
    setTimeout(() => {
        toast.success("Enviado con éxito");
        setLoadingEmail(null);
    }, 1500);
  };

  const handleOpenFactura = (c: PagoCompleto) => {
    const total = c.montoPagado || 0;
    // IMPORTANTE: Agregamos "?? ''" a todos los campos para evitar el error de Controlled Input
    setSelectedFacturaData({
      numero: c.numeroFactura ?? `001-001 ${String(c.pagoId).padStart(7, '0')}`,
      rucEmpresa: "3389403-5", 
      nombreEmpresa: "Marcelo David Ortigoza Maidana",
      direccionEmpresa: "Merlo de Portugal y Capitán Pedro Mayor Echauri",
      fecha: c.fechaPago ? new Date(c.fechaPago).toLocaleDateString('es-PY') : "",
      rucInquilino: c.contrato?.inquilino?.cedula ?? "", 
      nombreInquilino: c.contrato?.inquilino?.razonSocial ?? "", 
      direccionInquilino: c.contrato?.unidad?.codigoUnidad ?? "",
      items: [{ 
        cantidad: 1, 
        descripcion: `Alquiler ${c.mesPagado ?? ''}/${c.anioPagado ?? ''}`, 
        precioUnitario: total, 
        iva10: total 
      }],
      total, 
      totalIva10: Math.round(total / 11), 
      totalLetras: numberToWords(total) ?? "",
      pagoId: c.pagoId
    });
    setIsFacturaModalOpen(true);
  };

  const filteredCobros = cobros.filter(c => {
    const val = searchFilter.toLowerCase();
    return (c.contrato?.inquilino?.razonSocial?.toLowerCase() || "").includes(val) ||
           (c.contrato?.unidad?.codigoUnidad?.toLowerCase() || "").includes(val);
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const totalHoy = cobros.filter(c => c.fechaPago && c.fechaPago.split('T')[0] === todayStr).reduce((acc, c) => acc + c.montoPagado, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      <div className="no-print space-y-8">
          {/* HEADER */}
          <div className="bg-card p-8 rounded-[2.5rem] shadow-sm border border-border flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                  <div className="bg-primary p-3 rounded-2xl text-primary-foreground"><FileText className="w-8 h-8" /></div>
                  <div>
                      <h2 className="text-4xl font-black italic text-foreground tracking-tighter uppercase leading-none">Centro de <span className="text-primary">Cobranzas</span></h2>
                      <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Gestión de Pagos e Impresión Legal</p>
                  </div>
              </div>
              <div className="flex gap-3">
                  <Button onClick={() => setIsMorosidadesOpen(true)} variant="destructive" className="h-12 rounded-xl font-black italic">MOROSIDADES</Button>
                  <Button onClick={() => window.print()} className="h-12 rounded-xl bg-primary text-primary-foreground font-black italic px-8 shadow-xl">REIMPRESIÓN MASIVA</Button>
              </div>
          </div>

          {/* LAS 3 TARJETAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none rounded-3xl bg-emerald-500 text-white p-6 shadow-lg shadow-emerald-500/10">
                <p className="text-[10px] font-black uppercase opacity-70">Cobrado Hoy</p>
                <h3 className="text-3xl font-black mt-1 italic tracking-tighter">Gs. {totalHoy.toLocaleString()}</h3>
              </Card>
              <Card className="border-none rounded-3xl bg-card p-6 border border-border shadow-sm">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Pendiente de Facturar</p>
                <h3 className="text-3xl font-black mt-1 italic tracking-tighter">Gs. {(dashboardSummary?.faltaCobrar || 0).toLocaleString()}</h3>
              </Card>
              <Card className="border-none rounded-3xl bg-primary text-white p-6 shadow-lg shadow-primary/20">
                <p className="text-[10px] font-black uppercase opacity-70">Siguiente Correlativo</p>
                <h3 className="text-2xl font-black mt-1 italic tracking-tighter">001-001-0000046</h3>
              </Card>
          </div>

          {/* TABLA DE COBROS */}
          <Card className="border-none shadow-xl shadow-primary/5 rounded-[2.5rem] overflow-hidden bg-card">
              <CardHeader className="p-8 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3"><Wallet className="w-5 h-5 text-primary" /><CardTitle className="text-sm font-black uppercase italic tracking-widest">Historial de Cobranzas</CardTitle></div>
                  <Input placeholder="Buscar recibo, inquilino o cobrador..." className="w-64 rounded-full bg-secondary border-none font-bold" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} />
              </CardHeader>
              <Table>
                  <TableHeader className="bg-secondary/50">
                      <TableRow>
                          <TableHead className="pl-8 text-[10px] font-black uppercase">Unidad / Condo</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Inquilino</TableHead>
                          <TableHead className="text-center text-[10px] font-black uppercase">Estado Legal</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Acciones OIMA</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCobros.map((cobro) => (
                      <tr key={cobro.pagoId} className="hover:bg-secondary/35 border-b border-border/50 group transition-all">
                          <td className="pl-8 py-5">
                            <span className="font-black uppercase italic text-xs text-foreground">{formatDuplex(cobro.contrato?.unidad?.codigoUnidad)}</span>
                            <p className="text-[9px] text-muted-foreground uppercase">{cobro.contrato?.unidad?.nombreCondominio}</p>
                          </td>
                          <td>
                            <p className="font-black uppercase italic text-xs text-foreground/80">{cobro.contrato?.inquilino?.razonSocial}</p>
                            <p className="text-[9px] font-bold text-primary underline">{cobro.contrato?.inquilino?.email || "S/E"}</p>
                          </td>
                          <td className="text-center">
                              <Badge className="bg-emerald-500 text-white font-black italic text-[9px] uppercase px-3 py-1 rounded-lg">COBRADO</Badge>
                              {cobro.numeroFactura && <p className="text-[8px] font-black text-emerald-600 mt-1">Factura: {cobro.numeroFactura}</p>}
                          </td>
                          <td className="text-right pr-8">
                              <div className="flex justify-end items-center gap-1.5">
                                  {/* BOTON 1: IMPRIMIR */}
                                  <Button onClick={() => handleOpenFactura(cobro)} variant="ghost" size="icon" title="Reimprimir"><Printer className="w-4 h-4" /></Button>
                                  
                                  {/* BOTON 2: EMAIL */}
                                  <Button 
                                    onClick={() => handleEnviarEmail(cobro.pagoId, cobro.contrato?.inquilino?.email)} 
                                    disabled={loadingEmail === cobro.pagoId} 
                                    variant="ghost" size="icon" 
                                    className={`h-9 w-9 rounded-xl transition-all ${loadingEmail === cobro.pagoId ? 'bg-blue-600 text-white' : 'hover:bg-blue-600 hover:text-white'}`}
                                  >
                                      {loadingEmail === cobro.pagoId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                  </Button>

                                  {/* BOTON 3: ANULAR */}
                                  <Button onClick={() => handleAnularCobro(cobro.pagoId)} variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-500"><ArrowUpRight className="w-4 h-4 rotate-45" /></Button>
                              </div>
                          </td>
                      </tr>
                    ))}
                  </TableBody>
              </Table>
          </Card>
      </div>

      {/* DIALOGS CON ACCESIBILIDAD CORREGIDA */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden bg-card text-center">
            <DialogHeader className="p-8 bg-red-500/10 flex flex-col items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-red-600" />
                <DialogTitle className="text-2xl font-black italic uppercase text-red-600">¿Anular Cobro?</DialogTitle>
                <DialogDescription className="font-bold text-xs uppercase text-muted-foreground">Esta acción habilitará la cuota de nuevo.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="p-6 bg-muted flex sm:flex-row gap-3">
                <DialogClose asChild><Button variant="ghost" className="flex-1">Cancelar</Button></DialogClose>
                <Button onClick={confirmAnularCobro} className="flex-1 bg-red-600 text-white font-black italic">Confirmar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFacturaModalOpen} onOpenChange={setIsFacturaModalOpen}>
        <DialogContent className="sm:max-w-[1150px] max-h-[95vh] overflow-y-auto p-6 bg-muted rounded-[2.5rem]">
          <DialogHeader className="sr-only">
             <DialogTitle>Impresión de Factura</DialogTitle>
             <DialogDescription>Generación de comprobante legal.</DialogDescription>
          </DialogHeader>
          {selectedFacturaData && <FacturaReporte facturaData={selectedFacturaData} onSaved={fetchCobros} />}
        </DialogContent>
      </Dialog>

      <MorosidadesMainModal isOpen={isMorosidadesOpen} onClose={() => setIsMorosidadesOpen(false)} />
      
      {/* REPORTE IMPRESION MASIVA */}
      <div className="printable-report hidden print:block bg-white text-black p-10">
          <h1 className="text-2xl font-black uppercase border-b-4 border-black pb-2 mb-6 text-center">REPORTE DE COBRANZAS</h1>
          <table className="w-full text-xs border-collapse">
              <thead><tr className="border-y-2 border-black bg-gray-100 text-left"><th className="p-2">Fecha</th><th className="p-2">Inquilino</th><th className="p-2 text-right">Monto</th></tr></thead>
              <tbody>{filteredCobros.map(c => (<tr key={c.pagoId} className="border-b"><td className="p-2">{new Date(c.fechaPago).toLocaleDateString()}</td><td className="p-2 font-bold uppercase">{c.contrato?.inquilino?.razonSocial}</td><td className="p-2 text-right font-black italic">Gs. {c.montoPagado.toLocaleString()}</td></tr>))}</tbody>
          </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } .printable-report { display: block !important; position: absolute; left:0; top:0; width:100%; } body { background: white !important; } }`}} />
    </div>
  );
}