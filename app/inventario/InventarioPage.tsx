"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search, Package, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface ProductoDto {
  productoId: number;
  codigoBarra: string;
  sku: string;
  descripcion: string;
  precioVenta: number;
  costo: number;
  stockActual: number;
  ivaPorcentaje: number;
  activo: boolean;
  categoriaNombre: string;
  marcaNombre: string;
}

export function InventarioPage({ empresaId }: { empresaId: number }) {
  const [productos, setProductos] = useState<ProductoDto[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigoBarra: "",
    sku: "",
    descripcion: "",
    precioVenta: 0,
    costo: 0,
    ivaPorcentaje: 10,
    categoriaId: null,
    marcaId: null
  });

  // Ajuste Stock State
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [productoToAjustar, setProductoToAjustar] = useState<ProductoDto | null>(null);
  const [nuevoStock, setNuevoStock] = useState<number>(0);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/inventario/empresa/${empresaId}`);
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
      } else {
        toast.error("Error", { description: "No se pudieron cargar los productos." });
      }
    } catch (error) {
      toast.error("Error", { description: "Problema de conexión con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, [empresaId]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inventario/empresa/${empresaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("Éxito", { description: "Producto creado correctamente." });
        setIsModalOpen(false);
        cargarProductos();
      } else {
        toast.error("Error", { description: "No se pudo guardar el producto." });
      }
    } catch (error) {
      toast.error("Error", { description: "Problema de conexión." });
    }
  };

  const handleAjustarStock = async () => {
    if (!productoToAjustar) return;
    try {
      const res = await fetch(`${API_BASE}/api/inventario/empresa/${empresaId}/producto/${productoToAjustar.productoId}/ajustar-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoStock)
      });
      if (res.ok) {
        toast.success("Éxito", { description: "Stock actualizado correctamente." });
        setIsAjusteModalOpen(false);
        cargarProductos();
      } else {
        toast.error("Error", { description: "No se pudo actualizar el stock." });
      }
    } catch (error) {
      toast.error("Error", { description: "Problema de conexión." });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  const filtrados = productos.filter(p => 
    p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigoBarra?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic text-foreground tracking-tight">Inventario WMS</h2>
          <p className="text-sm text-muted-foreground font-medium">Gestión de Catálogo y Stock en tiempo real</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md font-bold">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-black italic text-xl">Registrar Producto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">SKU</label>
                  <Input 
                    value={formData.sku} 
                    onChange={e => setFormData({...formData, sku: e.target.value})} 
                    placeholder="Ej. BRU-001" 
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Cód. Barras</label>
                  <Input 
                    value={formData.codigoBarra} 
                    onChange={e => setFormData({...formData, codigoBarra: e.target.value})} 
                    placeholder="Ej. 784000000" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Descripción *</label>
                <Input 
                  value={formData.descripcion} 
                  onChange={e => setFormData({...formData, descripcion: e.target.value})} 
                  placeholder="Ej. Gaseosa Cola 2L" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Costo</label>
                  <Input 
                    type="number"
                    value={formData.costo} 
                    onChange={e => setFormData({...formData, costo: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Precio Venta *</label>
                  <Input 
                    type="number"
                    value={formData.precioVenta} 
                    onChange={e => setFormData({...formData, precioVenta: parseFloat(e.target.value) || 0})} 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-primary text-white">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL DE AJUSTE DE STOCK */}
        <Dialog open={isAjusteModalOpen} onOpenChange={setIsAjusteModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-black italic text-xl text-primary">Ajuste Manual de Stock</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm font-bold text-foreground mb-4">{productoToAjustar?.descripcion}</p>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Nuevo Stock Real</label>
                <Input 
                  type="number"
                  value={nuevoStock} 
                  onChange={e => setNuevoStock(parseFloat(e.target.value) || 0)} 
                  className="text-lg font-black text-center"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsAjusteModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAjustarStock} className="bg-primary text-white">Aplicar Ajuste</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar producto por SKU, nombre..." 
              className="pl-9 bg-muted border-none rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total: {productos.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider w-[100px]">SKU</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Descripción</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Costo</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Precio</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-center">Stock</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-sm font-bold italic">Cargando inventario...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <span className="text-sm font-medium">No se encontraron productos</span>
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((p) => (
                  <TableRow key={p.productoId} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || '-'}</TableCell>
                    <TableCell className="font-bold text-foreground">
                      {p.descripcion}
                      <div className="text-[10px] text-muted-foreground font-normal">CB: {p.codigoBarra || '-'}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(p.costo)}</TableCell>
                    <TableCell className="text-right font-black text-emerald-600">{formatCurrency(p.precioVenta)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.stockActual > 10 ? 'bg-emerald-100 text-emerald-700' : p.stockActual > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {p.stockActual}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 mr-1"
                        onClick={() => {
                          setProductoToAjustar(p);
                          setNuevoStock(p.stockActual);
                          setIsAjusteModalOpen(true);
                        }}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

