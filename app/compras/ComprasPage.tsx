"use client";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Search, Truck, Save, History, FileText } from "lucide-react";
import { toast } from "sonner";

interface ProveedorDto {
  proveedorId: number;
  razonSocial: string;
  ruc: string;
}

interface ProductoDto {
  productoId: number;
  codigoBarra: string;
  descripcion: string;
  costo: number;
}

interface DetalleCompra {
  productoId: number;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
}

export function ComprasPage({ empresaId }: { empresaId: number }) {
  const [proveedores, setProveedores] = useState<ProveedorDto[]>([]);
  const [productos, setProductos] = useState<ProductoDto[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [filtroHistorial, setFiltroHistorial] = useState("");
  
  // Factura State
  const [proveedorId, setProveedorId] = useState<string>("");
  const [nroFactura, setNroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(new Date().toISOString().split("T")[0]);
  const [detalles, setDetalles] = useState<DetalleCompra[]>([]);
  
  // Agregar Producto State
  const [selectedProd, setSelectedProd] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [costo, setCosto] = useState<number>(0);

  // Nuevo Proveedor State
  const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState({
    razonSocial: "",
    ruc: "",
    email: "",
    telefono: ""
  });

  const cargarProveedores = () => {
    fetch(`http://localhost:5034/api/contactos/proveedores/${empresaId}`)
      .then(res => res.json())
      .then(data => setProveedores(data));
  };

  const cargarHistorial = () => {
    fetch(`http://localhost:5034/api/compras/empresa/${empresaId}/historial`)
      .then(res => res.json())
      .then(data => setCompras(data))
      .catch(err => console.error("Error al cargar historial:", err));
  };

  useEffect(() => {
    // Cargar Proveedores
    cargarProveedores();

    // Cargar Historial
    cargarHistorial();

    // Cargar Productos (Catálogo base)
    fetch(`http://localhost:5034/api/inventario/empresa/${empresaId}`)
      .then(res => res.json())
      .then(data => setProductos(data));
  }, [empresaId]);

  const handleAddDetalle = () => {
    if (!selectedProd) return toast.error("Selecciona un producto");
    if (cantidad <= 0) return toast.error("La cantidad debe ser mayor a 0");
    if (costo <= 0) return toast.error("El costo debe ser mayor a 0");

    const prod = productos.find(p => p.productoId.toString() === selectedProd);
    if (!prod) return;

    // Si ya existe el producto en el detalle, sumarle la cantidad en vez de duplicarlo
    const indexExistente = detalles.findIndex(d => d.productoId === prod.productoId);
    if (indexExistente !== -1) {
      const nuevosDetalles = [...detalles];
      nuevosDetalles[indexExistente].cantidad += cantidad;
      nuevosDetalles[indexExistente].costoUnitario = costo; // Actualiza con el último costo
      setDetalles(nuevosDetalles);
    } else {
      setDetalles([...detalles, {
        productoId: prod.productoId,
        descripcion: prod.descripcion,
        cantidad,
        costoUnitario: costo
      }]);
    }

    // Reset fields
    setSelectedProd("");
    setCantidad(1);
    setCosto(0);
  };

  const removeDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  const total = detalles.reduce((acc, item) => acc + (item.cantidad * item.costoUnitario), 0);

  const handleCargarCompra = (c: any) => {
    setProveedorId(c.proveedorId.toString());
    setNroFactura(c.nroFactura);
    setFechaFactura(c.fechaFactura.split("T")[0]);
    setDetalles(c.detalles.map((d: any) => ({
      productoId: d.productoId,
      descripcion: d.descripcion,
      cantidad: d.cantidad,
      costoUnitario: d.costoUnitario
    })));
    toast.success("Factura cargada", { 
      description: `Se cargaron los datos de la factura ${c.nroFactura} de ${c.proveedorRazonSocial} en el panel de edición.` 
    });
  };

  const handleGuardarFactura = async () => {
    if (!proveedorId || !nroFactura) return toast.error("Completa Proveedor y Nro de Factura");
    if (detalles.length === 0) return toast.error("La factura debe tener al menos un producto");

    const payload = {
      proveedorId: parseInt(proveedorId),
      nroFactura,
      fechaFactura: new Date(fechaFactura).toISOString(),
      detalles
    };

    try {
      const res = await fetch(`http://localhost:5034/api/compras/empresa/${empresaId}/factura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Compra Registrada", { description: "El stock de los productos ha sido actualizado." });
        setDetalles([]);
        setNroFactura("");
        setProveedorId("");
        cargarHistorial();
      } else {
        toast.error("Error al registrar factura");
      }
    } catch (error) {
      toast.error("Fallo de conexión");
    }
  };

  const handleCrearProveedor = async () => {
    try {
      const res = await fetch(`http://localhost:5034/api/contactos/proveedores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nuevoProveedor, empresaId })
      });
      if (res.ok) {
        toast.success("Éxito", { description: "Proveedor registrado." });
        setIsProveedorModalOpen(false);
        setNuevoProveedor({ razonSocial: "", ruc: "", email: "", telefono: "" });
        cargarProveedores();
      } else {
        toast.error("Error", { description: "No se pudo registrar el proveedor." });
      }
    } catch (e) { toast.error("Error", { description: "Problema de conexión." }); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic text-foreground tracking-tight">Registro de Compras</h2>
          <p className="text-sm text-muted-foreground font-medium">Ingresa mercadería y actualiza stock automáticamente</p>
        </div>
        <Button onClick={handleGuardarFactura} className="bg-primary text-white h-12 px-6 rounded-xl shadow-lg">
          <Save className="mr-2 h-5 w-5" /> Registrar Factura y Actualizar Stock
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lado Izquierdo: Cabecera y Agregar Productos */}
        <div className="col-span-1 space-y-6">
          <Card className="border-none shadow-sm rounded-3xl bg-card p-6">
            <h3 className="font-black uppercase text-foreground text-sm mb-4 tracking-wider flex items-center">
              <Truck className="mr-2 h-5 w-5 text-primary" /> Datos del Proveedor
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Proveedor</label>
                  <Button variant="ghost" size="sm" className="h-4 p-0 text-primary text-[10px] font-black uppercase tracking-wider" onClick={() => setIsProveedorModalOpen(true)}>+ Nuevo</Button>
                </div>
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted border-none">
                    <SelectValue placeholder="Seleccione un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map(p => (
                      <SelectItem key={p.proveedorId} value={p.proveedorId.toString()}>{p.razonSocial} (RUC: {p.ruc})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Nro Factura</label>
                <Input value={nroFactura} onChange={e => setNroFactura(e.target.value)} placeholder="001-001-XXXXXXX" className="h-12 rounded-xl bg-muted border-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Fecha Emisión</label>
                <Input type="date" value={fechaFactura} onChange={e => setFechaFactura(e.target.value)} className="h-12 rounded-xl bg-muted border-none" />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl bg-primary/5 p-6 border border-primary/10">
            <h3 className="font-black uppercase text-primary text-sm mb-4 tracking-wider flex items-center">
              <Plus className="mr-2 h-5 w-5" /> Agregar al Detalle
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Producto</label>
                <Select value={selectedProd} onValueChange={(val) => {
                  setSelectedProd(val);
                  const prod = productos.find(p => p.productoId.toString() === val);
                  if (prod) setCosto(prod.costo); // Sugiere el último costo conocido
                }}>
                  <SelectTrigger className="h-12 rounded-xl bg-card border-none shadow-sm">
                    <SelectValue placeholder="Buscar en catálogo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map(p => (
                      <SelectItem key={p.productoId} value={p.productoId.toString()}>{p.descripcion} (CB: {p.codigoBarra})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Cantidad</label>
                  <Input type="number" value={cantidad} onChange={e => setCantidad(parseFloat(e.target.value) || 0)} className="h-12 rounded-xl bg-card border-none shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Costo Unit.</label>
                  <Input type="number" value={costo} onChange={e => setCosto(parseFloat(e.target.value) || 0)} className="h-12 rounded-xl bg-card border-none shadow-sm" />
                </div>
              </div>
              <Button onClick={handleAddDetalle} className="w-full h-12 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700">
                Añadir al Ticket
              </Button>
            </div>
          </Card>
        </div>

        {/* Lado Derecho: Ticket de Factura */}
        <div className="col-span-2">
          <Card className="h-full border-none shadow-sm rounded-3xl bg-card flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted">
              <h3 className="font-black italic uppercase tracking-tighter text-lg text-foreground">Detalle de Mercadería Entrante</h3>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Factura</p>
                <p className="text-2xl font-black text-emerald-600 leading-none mt-1">{formatCurrency(total)}</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider">Producto</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider text-right">Cant.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider text-right">Costo Unit.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        <Truck className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p className="font-medium">No hay productos en la factura actual</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    detalles.map((d, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-foreground">{d.descripcion}</TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">{d.cantidad}</TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(d.costoUnitario)}</TableCell>
                        <TableCell className="text-right font-black text-foreground">{formatCurrency(d.cantidad * d.costoUnitario)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeDetalle(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4" />
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
      </div>

      {/* HISTORIAL DE COMPRAS REGISTRADAS */}
      <Card className="border-none shadow-sm rounded-3xl bg-card p-6 mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black uppercase text-foreground text-sm tracking-wider flex items-center">
              <History className="mr-2 h-5 w-5 text-primary animate-pulse" /> Historial de Compras Registradas
            </h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">
              Haz doble clic en cualquier fila o presiona "Cargar" para visualizar el detalle completo de la factura en el visor de arriba.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              value={filtroHistorial}
              onChange={e => setFiltroHistorial(e.target.value)}
              placeholder="Buscar por Nro Factura o Proveedor..." 
              className="pl-9 h-10 rounded-xl bg-muted border-none w-full shadow-inner"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider">Fecha</TableHead>
                <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider">Nro Factura</TableHead>
                <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider">Proveedor</TableHead>
                <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider text-right">Cant. Artículos</TableHead>
                <TableHead className="font-bold text-muted-foreground text-xs uppercase tracking-wider text-right">Total Factura</TableHead>
                <TableHead className="w-[120px] text-center font-bold text-muted-foreground text-xs uppercase tracking-wider">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras
                .filter(c => 
                  c.nroFactura.toLowerCase().includes(filtroHistorial.toLowerCase()) ||
                  c.proveedorRazonSocial.toLowerCase().includes(filtroHistorial.toLowerCase())
                ).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="font-medium">No se encontraron facturas en el historial</p>
                  </TableCell>
                </TableRow>
              ) : (
                compras
                  .filter(c => 
                    c.nroFactura.toLowerCase().includes(filtroHistorial.toLowerCase()) ||
                    c.proveedorRazonSocial.toLowerCase().includes(filtroHistorial.toLowerCase())
                  )
                  .map((c) => (
                    <TableRow 
                      key={c.compraCabeceraId} 
                      className="hover:bg-muted/70 cursor-pointer transition-colors duration-150"
                      onDoubleClick={() => handleCargarCompra(c)}
                      title="Doble clic para cargar en el visor"
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {new Date(c.fechaFactura).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="font-bold text-primary">{c.nroFactura}</TableCell>
                      <TableCell className="font-bold text-foreground">{c.proveedorRazonSocial}</TableCell>
                      <TableCell className="text-right font-semibold text-muted-foreground">{c.detalles.length}</TableCell>
                      <TableCell className="text-right font-black text-emerald-600">{formatCurrency(c.total)}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          onClick={() => handleCargarCompra(c)}
                          className="h-8 rounded-lg text-[10px] font-black uppercase bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          Cargar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* MODAL DE NUEVO PROVEEDOR */}
      <Dialog open={isProveedorModalOpen} onOpenChange={setIsProveedorModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black italic text-xl text-primary">Registrar Proveedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Razón Social *</label>
              <Input 
                value={nuevoProveedor.razonSocial} 
                onChange={e => setNuevoProveedor({...nuevoProveedor, razonSocial: e.target.value})} 
                placeholder="Ej. Distribuidora S.A." 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">RUC *</label>
              <Input 
                value={nuevoProveedor.ruc} 
                onChange={e => setNuevoProveedor({...nuevoProveedor, ruc: e.target.value})} 
                placeholder="Ej. 80000000-1" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Teléfono</label>
                <Input 
                  value={nuevoProveedor.telefono} 
                  onChange={e => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Email</label>
                <Input 
                  value={nuevoProveedor.email} 
                  onChange={e => setNuevoProveedor({...nuevoProveedor, email: e.target.value})} 
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsProveedorModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrearProveedor} className="bg-primary text-white">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

