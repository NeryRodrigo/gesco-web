"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Factory, Wrench, PackagePlus, Search, Edit, Trash2, Plus, PlayCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface OrdenProduccion {
  id: number;
  codigo: string;
  producto: string;
  cantidad: number;
  estado: "Pendiente" | "En Proceso" | "Completado";
  fechaInicio: string;
}

export function ProduccionPage({ empresaId }: { empresaId: number }) {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([
    { id: 1, codigo: "OP-1001", producto: "Pintura Látex Amambay Blanco 18L (Lote C-25)", cantidad: 200, estado: "En Proceso", fechaInicio: "2026-05-15" },
    { id: 2, codigo: "OP-1002", producto: "Esmalte Sintético Maxi Color Rojo 3.6L (Lote E-12)", cantidad: 150, estado: "Pendiente", fechaInicio: "2026-05-18" },
    { id: 3, codigo: "OP-1003", producto: "Pintura Acrílica Super Lavable Azul 18L (Lote A-08)", cantidad: 100, estado: "Completado", fechaInicio: "2026-05-12" },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrden, setNewOrden] = useState({ producto: "", cantidad: 0, fechaInicio: "" });

  const handleSave = () => {
    const orden: OrdenProduccion = {
      id: Date.now(),
      codigo: `OP-${Math.floor(Math.random() * 9000) + 1000}`,
      producto: newOrden.producto,
      cantidad: newOrden.cantidad,
      estado: "Pendiente",
      fechaInicio: newOrden.fechaInicio
    };
    setOrdenes([...ordenes, orden]);
    setIsModalOpen(false);
  };

  const cambiarEstado = (id: number, nuevoEstado: "Pendiente" | "En Proceso" | "Completado") => {
    setOrdenes(ordenes.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic text-foreground tracking-tight">Módulo de Producción (MRP)</h2>
          <p className="text-sm text-muted-foreground font-medium">Planificación y ejecución de órdenes de manufactura.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold">
              <Plus className="mr-2 h-4 w-4" /> Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-black italic text-xl text-primary">Crear Orden de Producción</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Producto a Fabricar</label>
                <Input placeholder="Ej. Silla Ergonómica" onChange={e => setNewOrden({...newOrden, producto: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Cantidad Objetivo</label>
                  <Input type="number" onChange={e => setNewOrden({...newOrden, cantidad: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Fecha Estimada</label>
                  <Input type="date" onChange={e => setNewOrden({...newOrden, fechaInicio: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>Liberar Orden</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-none shadow-sm rounded-2xl p-6">
          <Factory className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-muted-foreground font-bold uppercase text-[10px]">Órdenes Activas</p>
          <h3 className="text-3xl font-black text-foreground">{ordenes.length}</h3>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px]">Cód. Orden</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px]">Producto (BOM)</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px]">Cant.</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px]">Estado</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-muted-foreground font-bold">{o.codigo}</TableCell>
                <TableCell className="font-medium">{o.producto}</TableCell>
                <TableCell>{o.cantidad} unds</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                    o.estado === 'Completado' ? 'bg-emerald-100 text-emerald-700' : 
                    o.estado === 'En Proceso' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-foreground'
                  }`}>
                    {o.estado}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {o.estado === "Pendiente" && (
                    <Button variant="ghost" size="sm" onClick={() => cambiarEstado(o.id, "En Proceso")} className="text-blue-500"><PlayCircle className="w-4 h-4 mr-1"/> Iniciar</Button>
                  )}
                  {o.estado === "En Proceso" && (
                    <Button variant="ghost" size="sm" onClick={() => cambiarEstado(o.id, "Completado")} className="text-emerald-500"><CheckCircle2 className="w-4 h-4 mr-1"/> Finalizar</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
