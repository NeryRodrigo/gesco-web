"use client";

import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Plus,
  Calendar as CalendarIcon,
  Search,
  Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface GastosPageProps {
  empresaId: number;
}

interface DashboardGastos {
  ingresosTotales: number;
  gastosTotales: number;
  gananciaNeta: number;
  rentabilidadPorcentaje: number;
  alertaGastosAltos: boolean;
  gastosDetalle: Gasto[];
}

interface Gasto {
  gastoId: number;
  descripcion: string;
  monto: number;
  fecha: string;
  proveedor?: string;
  nroComprobante?: string;
  unidadNombre: string;
}

interface Unidad {
  unidadId: number;
  codigoUnidad: string;
  nombreCondominio: string;
}

export default function GastosPage({ empresaId }: GastosPageProps) {
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1);
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());
  const [data, setData] = useState<DashboardGastos | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [formData, setFormData] = useState({
    unidadId: 0,
    descripcion: "",
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
    proveedor: "",
    nroComprobante: "",
    metodoPago: "EFECTIVO"
  });

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5034/api/Gastos/dashboard?empresaId=${empresaId}&mes=${mesActual}&anio=${anioActual}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      toast.error("Error cargando dashboard de gastos");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnidades = async () => {
    try {
      const res = await fetch(`http://localhost:5034/api/Condominio/unidades/${empresaId}`);
      if (res.ok) {
        const json = await res.json();
        setUnidades(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchUnidades();
  }, [empresaId, mesActual, anioActual]);

  const handleCrearGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.unidadId <= 0 || !formData.descripcion || formData.monto <= 0) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    try {
      const res = await fetch(`http://localhost:5034/api/Gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("Gasto registrado exitosamente");
        setIsModalOpen(false);
        setFormData({ ...formData, descripcion: "", monto: 0, proveedor: "", nroComprobante: "" });
        fetchDashboard();
      } else {
        toast.error("Error al registrar gasto");
      }
    } catch (e) {
      toast.error("Error de conexión");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black italic text-foreground tracking-tight">Gastos y Rentabilidad</h2>
          <p className="text-muted-foreground font-medium mt-1">Análisis financiero del mes</p>
        </div>
        <div className="flex gap-4">
          <Input 
            type="number" 
            min={1} max={12} 
            value={mesActual} 
            onChange={(e) => setMesActual(parseInt(e.target.value))} 
            className="w-24 font-bold"
          />
          <Input 
            type="number" 
            value={anioActual} 
            onChange={(e) => setAnioActual(parseInt(e.target.value))} 
            className="w-28 font-bold"
          />
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 font-black italic">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic text-foreground">Nuevo Gasto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCrearGasto} className="space-y-4 mt-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Unidad / Dúplex</label>
                  <select 
                    className="w-full h-10 border rounded-lg px-3 mt-1 text-sm bg-muted"
                    value={formData.unidadId}
                    onChange={(e) => setFormData({...formData, unidadId: parseInt(e.target.value)})}
                  >
                    <option value={0}>Seleccione Dúplex (o Condominio General)</option>
                    <option value={-1} className="font-bold text-blue-600">🏢 TODO EL CONDOMINIO (Gasto General)</option>
                    {unidades.map(u => (
                      <option key={u.unidadId} value={u.unidadId}>{u.nombreCondominio} - {u.codigoUnidad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Descripción</label>
                  <Input 
                    required
                    placeholder="Ej. Plomería, Pintura..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Monto (Gs)</label>
                  <Input 
                    type="number"
                    required min={1}
                    value={formData.monto || ''}
                    onChange={(e) => setFormData({...formData, monto: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
                    <Input 
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Comprobante</label>
                    <Input 
                      placeholder="Factura N°"
                      value={formData.nroComprobante}
                      onChange={(e) => setFormData({...formData, nroComprobante: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Proveedor (Opcional)</label>
                  <Input 
                    placeholder="Nombre del proveedor"
                    value={formData.proveedor}
                    onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl font-black italic bg-slate-900 text-white mt-4">
                  Guardar Gasto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading && <div className="h-64 flex items-center justify-center text-muted-foreground font-bold italic animate-pulse">Cargando métricas...</div>}

      {data && !loading && (
        <>
          {data.alertaGastosAltos && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm mb-6 flex items-center gap-4 animate-in slide-in-from-top">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="text-red-800 font-black italic">¡ALERTA DE RENTABILIDAD!</h4>
                <p className="text-red-600 text-sm font-medium">
                  Los gastos operativos de este mes han superado el 50% de los ingresos por alquileres. Revisá los egresos.
                </p>
              </div>
            </div>
          )}

          {/* DASHBOARD CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none shadow-xl shadow-blue-900/5 bg-gradient-to-br from-blue-50 to-white overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ingresos Totales</p>
                    <h3 className="text-3xl font-black italic text-foreground mt-2 tracking-tighter">
                      {formatCurrency(data.ingresosTotales)}
                    </h3>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-4">Alquileres cobrados en el mes</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-red-900/5 bg-gradient-to-br from-red-50 to-white overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Gastos Totales</p>
                    <h3 className="text-3xl font-black italic text-foreground mt-2 tracking-tighter text-red-600">
                      {formatCurrency(data.gastosTotales)}
                    </h3>
                  </div>
                  <div className="h-10 w-10 bg-red-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-4">Mantenimientos y salidas</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-emerald-900/5 bg-gradient-to-br from-emerald-50 to-white overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ganancia Neta</p>
                    <h3 className="text-3xl font-black italic text-foreground mt-2 tracking-tighter text-emerald-600">
                      {formatCurrency(data.gananciaNeta)}
                    </h3>
                  </div>
                  <div className="h-10 w-10 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-4">Flujo libre de caja</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-purple-900/5 bg-gradient-to-br from-purple-50 to-white overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Rentabilidad</p>
                    <h3 className="text-3xl font-black italic text-foreground mt-2 tracking-tighter text-purple-600">
                      {data.rentabilidadPorcentaje.toFixed(2)}%
                    </h3>
                  </div>
                  <div className="h-10 w-10 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-4">Margen operativo del mes</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border shadow-xl shadow-slate-200/20 bg-card/50 backdrop-blur-xl mt-8">
            <CardHeader className="bg-muted/50 border-b border-border pb-4">
              <CardTitle className="text-sm font-black italic uppercase text-foreground tracking-widest">
                Detalle de Gastos del Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.gastosDetalle.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-bold italic">
                  No hay gastos registrados en este período.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fecha</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descripción</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Unidad</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Proveedor/Nro</TableHead>
                      <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.gastosDetalle.map((g) => (
                      <TableRow key={g.gastoId} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-foreground">{g.fecha}</TableCell>
                        <TableCell className="font-bold text-foreground">{g.descripcion}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-card">{g.unidadNombre}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {g.proveedor || "-"} {g.nroComprobante ? `(#${g.nroComprobante})` : ""}
                        </TableCell>
                        <TableCell className="text-right font-black text-red-600">
                          {formatCurrency(g.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
