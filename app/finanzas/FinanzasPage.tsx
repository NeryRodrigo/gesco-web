"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Search, Filter, CalendarDays, RefreshCcw, Trash2, Edit, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FlujoCajaResponse {
  totalIngresos: number;
  totalEgresos: number;
  balanceNeto: number;
  movimientos: MovimientoFinanciero[];
}

interface MovimientoFinanciero {
  fecha: string;
  tipo: string;
  categoria: string;
  descripcion: string;
  monto: number;
  idOrigen: number;
}

export function FinanzasPage({ empresaId }: { empresaId: number }) {
  const [flujo, setFlujo] = useState<FlujoCajaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMov, setEditingMov] = useState<{ tipo: string; idOrigen: number; monto: number; descripcion: string } | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-PY", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const cargarFlujo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5034/api/Tesoreria/empresa/${empresaId}/flujo?mes=${mes}&anio=${anio}`);
      if (res.ok) {
        const data = await res.json();
        setFlujo(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFlujo();
  }, [empresaId, mes, anio]);

  const handleEliminarMovimiento = async (tipo: string, idOrigen: number) => {
    if (!confirm("¿Estás seguro de anular este movimiento? Esto revertirá el stock de los productos afectados.")) return;
    try {
      const res = await fetch(`http://localhost:5034/api/Tesoreria/empresa/${empresaId}/movimiento/${tipo}/${idOrigen}`, {
        method: "DELETE"
      });
      if (res.ok) {
        cargarFlujo();
      } else {
        alert("Error al anular movimiento");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
  };

  const openEditModal = (mov: MovimientoFinanciero) => {
    setEditingMov({ tipo: mov.tipo, idOrigen: mov.idOrigen, monto: mov.monto, descripcion: mov.descripcion });
    setIsEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingMov) return;
    try {
      const res = await fetch(`http://localhost:5034/api/Tesoreria/empresa/${empresaId}/movimiento/${editingMov.tipo}/${editingMov.idOrigen}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: editingMov.monto, descripcion: editingMov.descripcion })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        cargarFlujo();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Tesorería y Flujo de Caja</h2>
          <p className="text-muted-foreground font-medium mt-1">Visibilidad en tiempo real de los ingresos y egresos operativos.</p>
        </div>
        <div className="flex gap-2">
          <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <SelectItem key={m} value={m.toString()}>Mes {m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anio.toString()} onValueChange={(v) => setAnio(parseInt(v))}>
            <SelectTrigger className="w-[100px] bg-card border-border">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(a => (
                <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={cargarFlujo}>
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <TrendingUp className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-emerald-100 font-bold uppercase tracking-widest text-xs mb-2">Ingresos del Mes</p>
            <h3 className="text-3xl font-black">{flujo ? formatCurrency(flujo.totalIngresos) : "---"}</h3>
            <div className="mt-4 flex items-center text-sm font-medium bg-emerald-700/30 w-max px-3 py-1 rounded-full">
              <ArrowUpRight className="w-4 h-4 mr-1" /> Ventas POS / Facturas
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <ArrowDownLeft className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-red-100 font-bold uppercase tracking-widest text-xs mb-2">Egresos del Mes</p>
            <h3 className="text-3xl font-black">{flujo ? formatCurrency(flujo.totalEgresos) : "---"}</h3>
            <div className="mt-4 flex items-center text-sm font-medium bg-red-700/30 w-max px-3 py-1 rounded-full">
              <ArrowDownLeft className="w-4 h-4 mr-1" /> Compras a Proveedores
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden border-t-4 border-slate-900 relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Wallet className="w-24 h-24 text-foreground" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mb-2">Balance Neto (Caja)</p>
            <h3 className={`text-3xl font-black ${flujo && flujo.balanceNeto >= 0 ? "text-foreground" : "text-red-600"}`}>
              {flujo ? formatCurrency(flujo.balanceNeto) : "---"}
            </h3>
            <div className="mt-4 flex items-center text-sm font-medium bg-muted text-muted-foreground w-max px-3 py-1 rounded-full">
              Utilidad Bruta Operativa
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MOVEMENTS TABLE */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
          <h3 className="font-bold text-foreground">Libro Mayor - Movimientos Detallados</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar movimiento..." className="pl-9 h-9 w-[250px] bg-card border-border" />
            </div>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="w-4 h-4 mr-2" /> Filtrar
            </Button>
          </div>
        </div>
        <div className="p-0">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider py-4">Fecha y Hora</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Tipo</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Categoría</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Descripción / Referencia</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Monto (Gs.)</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flujo?.movimientos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-medium">
                    No hay movimientos financieros registrados en este período.
                  </TableCell>
                </TableRow>
              )}
              {flujo?.movimientos.map((mov, idx) => (
                <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="text-muted-foreground font-medium">{formatDate(mov.fecha)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black tracking-widest uppercase ${
                      mov.tipo === "INGRESO" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {mov.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-foreground">{mov.categoria}</TableCell>
                  <TableCell className="text-muted-foreground">{mov.descripcion}</TableCell>
                  <TableCell className={`text-right font-black ${
                    mov.tipo === "INGRESO" ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {mov.tipo === "INGRESO" ? "+" : "-"}{formatCurrency(mov.monto)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const path = mov.tipo === "INGRESO" ? "venta" : "compra";
                        window.open(`http://localhost:5034/api/cajapos/${path}/${mov.idOrigen}/pdf`, "_blank");
                      }} 
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-0 h-8 w-8 mr-1"
                      title="Descargar Comprobante PDF (QuestPDF)"
                    >
                      <FileDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(mov)} className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-0 h-8 w-8 mr-1">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEliminarMovimiento(mov.tipo, mov.idOrigen)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-0 h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* MODAL EDITAR MOVIMIENTO */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black italic text-xl text-primary">Editar Movimiento</DialogTitle>
          </DialogHeader>
          {editingMov && (
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Descripción</label>
                <Input value={editingMov.descripcion} onChange={e => setEditingMov({...editingMov, descripcion: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Monto (Gs.)</label>
                <Input type="number" value={editingMov.monto} onChange={e => setEditingMov({...editingMov, monto: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSave} className="bg-primary text-white">Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

