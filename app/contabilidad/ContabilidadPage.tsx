"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Plus, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ContabilidadPage() {
  const [asientos, setAsientos] = useState([
    { id: 1, fecha: "2026-05-15", cuenta: "Banco Itaú Cuenta Corriente", debe: 8500000, haber: 0, concepto: "Venta Lote Mayorista Amambay Factura #002-001-00045" },
    { id: 2, fecha: "2026-05-15", cuenta: "Ingresos por Ventas (Pinturas)", debe: 0, haber: 8500000, concepto: "Venta Lote Mayorista Amambay Factura #002-001-00045" },
    { id: 3, fecha: "2026-05-15", cuenta: "Costo de Mercaderías Vendidas (CMV)", debe: 5100000, haber: 0, concepto: "Costo de Venta Mayorista Lote C-25" },
    { id: 4, fecha: "2026-05-15", cuenta: "Inventario de Pinturas (Depósito Core)", debe: 0, haber: 5100000, concepto: "Descarga de Stock Lote C-25" },
    { id: 5, fecha: "2026-05-16", cuenta: "Caja Chica POS (Efectivo)", debe: 1200000, haber: 0, concepto: "Cierre de Caja POS Facturación Diaria" },
    { id: 6, fecha: "2026-05-16", cuenta: "Ingresos por Ventas Minoristas", debe: 0, haber: 1200000, concepto: "Cierre de Caja POS Facturación Diaria" },
    { id: 7, fecha: "2026-05-17", cuenta: "Gastos de Sueldos y Jornales (RRHH)", debe: 26200000, haber: 0, concepto: "Devengamiento de Planilla de Sueldos y Aportes IPS del Mes" },
    { id: 8, fecha: "2026-05-17", cuenta: "Sueldos y Jornales a Pagar", debe: 0, haber: 23842000, concepto: "Nómina Neta a Transferir a Personal" },
    { id: 9, fecha: "2026-05-17", cuenta: "IPS Retenciones a Pagar (9% Empleado)", debe: 0, haber: 2358000, concepto: "Retención Obligatoria IPS Aporte Obrero" },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAsiento, setNewAsiento] = useState({ cuenta: "", debe: 0, haber: 0, concepto: "" });

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);

  const handleSave = () => {
    setAsientos([...asientos, {
      id: Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      ...newAsiento
    }]);
    setIsModalOpen(false);
  };

  const totalDebe = asientos.reduce((acc, curr) => acc + curr.debe, 0);
  const totalHaber = asientos.reduce((acc, curr) => acc + curr.haber, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic text-foreground tracking-tight">Contabilidad Financiera (FI)</h2>
          <p className="text-sm text-muted-foreground font-medium">Libro Diario y Partida Doble.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white rounded-xl font-bold"><Plus className="mr-2 h-4 w-4" /> Nuevo Asiento</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="font-black italic text-xl text-primary">Registrar Asiento Contable</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Cuenta Contable (Plan de Cuentas)</label>
                <Input placeholder="Ej. Caja Moneda Nacional" onChange={e => setNewAsiento({...newAsiento, cuenta: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Concepto</label>
                <Input placeholder="Ej. Pago de Alquiler" onChange={e => setNewAsiento({...newAsiento, concepto: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Debe</label>
                  <Input type="number" onChange={e => setNewAsiento({...newAsiento, debe: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Haber</label>
                  <Input type="number" onChange={e => setNewAsiento({...newAsiento, haber: parseInt(e.target.value) || 0})} />
                </div>
              </div>
            </div>
            <div className="flex justify-end"><Button onClick={handleSave}>Contabilizar</Button></div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-none shadow-sm rounded-2xl p-6 border-l-4 border-l-blue-500">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Débitos (Debe)</p>
          <h3 className="text-2xl font-black text-foreground">{formatCurrency(totalDebe)}</h3>
        </Card>
        <Card className="bg-card border-none shadow-sm rounded-2xl p-6 border-l-4 border-l-emerald-500">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Créditos (Haber)</p>
          <h3 className="text-2xl font-black text-foreground">{formatCurrency(totalHaber)}</h3>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px]">Fecha</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px]">Cuenta Contable</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px]">Concepto</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px] text-right">Debe</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px] text-right">Haber</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {asientos.map(a => (
              <TableRow key={a.id}>
                <TableCell className="text-muted-foreground font-medium">{a.fecha}</TableCell>
                <TableCell className="font-bold">{a.cuenta}</TableCell>
                <TableCell className="text-muted-foreground italic">{a.concepto}</TableCell>
                <TableCell className="text-right font-black text-blue-600">{a.debe > 0 ? formatCurrency(a.debe) : "-"}</TableCell>
                <TableCell className="text-right font-black text-emerald-600">{a.haber > 0 ? formatCurrency(a.haber) : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
