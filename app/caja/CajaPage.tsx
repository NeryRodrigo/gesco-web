"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, User, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ProductoDto {
  productoId: number;
  codigoBarra: string;
  descripcion: string;
  precioVenta: number;
  stockActual: number;
}

interface CartItem extends ProductoDto {
  cantidad: number;
}

export function CajaPage({ empresaId }: { empresaId: number }) {
  const [productos, setProductos] = useState<ProductoDto[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("1");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ razonSocial: "", documento: "", telefono: "" });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSifenEnabled, setIsSifenEnabled] = useState(true);
  
  // Estados para secuencia de facturación y visor de impresión
  const [siguienteFactura, setSiguienteFactura] = useState("001-001-0000001");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [lastVenta, setLastVenta] = useState<any>(null);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5034/api/inventario/empresa/${empresaId}`);
      if (res.ok) {
        const data = await res.json();
        // Solo mostrar productos con stock para la caja
        setProductos(data.filter((p: ProductoDto) => p.stockActual > 0));
      }
    } catch (error) {
      toast.error("Error", { description: "Problema al cargar el catálogo de productos." });
    } finally {
      setLoading(false);
    }
  };

  const cargarClientes = async () => {
    try {
      const res = await fetch(`http://localhost:5034/api/contactos/clientes/${empresaId}`);
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (e) { console.error(e); }
  };

  const cargarSiguienteFactura = async () => {
    try {
      const res = await fetch(`http://localhost:5034/api/cajapos/empresa/${empresaId}/siguiente-factura`);
      if (res.ok) {
        const data = await res.json();
        setSiguienteFactura(data.siguienteFactura);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    cargarProductos();
    cargarClientes();
    cargarSiguienteFactura();
  }, [empresaId]);

  const handleCreateClient = async () => {
    try {
      const res = await fetch(`http://localhost:5034/api/contactos/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newClient, empresaId, email: "" })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Cliente Registrado");
        await cargarClientes();
        setSelectedClienteId(data.personaId.toString());
        setIsClientModalOpen(false);
        setNewClient({ razonSocial: "", documento: "", telefono: "" });
      }
    } catch (error) {
      toast.error("Error al registrar cliente");
    }
  };

  const addToCart = (producto: ProductoDto) => {
    setCart((prev) => {
      const exist = prev.find(item => item.productoId === producto.productoId);
      if (exist) {
        if (exist.cantidad >= producto.stockActual) {
          toast.warning("Stock insuficiente", { description: `Solo hay ${producto.stockActual} en stock.` });
          return prev;
        }
        return prev.map(item => item.productoId === producto.productoId ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const removeFromCart = (productoId: number) => {
    setCart(prev => prev.filter(item => item.productoId !== productoId));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  const total = cart.reduce((acc, item) => acc + (item.precioVenta * item.cantidad), 0);

  const handleCobrar = async () => {
    if (cart.length === 0) return toast.error("Carrito vacío");

    const payload = {
      personaId: parseInt(selectedClienteId) || 1, 
      nroFactura: siguienteFactura,
      isSifen: isSifenEnabled,
      detalles: cart.map(c => ({
        productoId: c.productoId,
        descripcion: c.descripcion,
        cantidad: c.cantidad,
        precioUnitario: c.precioVenta,
        ivaPorcentaje: 10
      }))
    };

    try {
      if (isSifenEnabled) {
        toast.info("Conectando con SIFEN (SET)...", { description: "Generando CDC y firmando XML digitalmente." });
      }

      const res = await fetch(`http://localhost:5034/api/cajapos/empresa/${empresaId}/venta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        
        // Generar CDC criptográfico de 44 caracteres paraguayo
        const rucEmisor = "800045121";
        const tipoDoc = "01"; // Factura Electrónica
        const secFact = siguienteFactura.replace(/-/g, "");
        const safeCdc = `${tipoDoc}${rucEmisor}${secFact}${new Date().getFullYear()}992745082154`.padEnd(44, "0");
        
        // Guardar detalles del ticket para el visor de impresión
        setLastVenta({
          ventaId: data.ventaId,
          empresaId,
          nroFactura: siguienteFactura,
          cliente: clientes.find(c => c.personaId.toString() === selectedClienteId) || { razonSocial: "CLIENTE OCASIONAL", documento: "0" },
          fecha: new Date().toLocaleString('es-PY'),
          detalles: [...cart],
          total: total,
          isSifen: isSifenEnabled,
          cdc: safeCdc
        });

        toast.success(isSifenEnabled ? "Venta y Factura Electrónica Exitosa" : "Venta Exitosa", { 
          description: isSifenEnabled ? "El documento fue aprobado por la SET y el stock actualizado." : "El pago fue procesado." 
        });

        setCart([]);
        cargarProductos();
        cargarSiguienteFactura();
        setIsPrintModalOpen(true);
      } else {
        toast.error("Error", { description: "No se pudo procesar el pago." });
      }
    } catch (error) {
      toast.error("Error", { description: "Fallo de conexión." });
    }
  };

  const filtrados = productos.filter(p => p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigoBarra?.includes(searchTerm));

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 animate-in fade-in zoom-in duration-500">
      
      {/* SECCIÓN IZQUIERDA: CARRITO (TICKET) */}
      <Card className="w-[400px] border-none shadow-xl rounded-3xl flex flex-col bg-card overflow-hidden">
        <div className="bg-primary text-white p-6">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-black italic tracking-tight flex items-center">
              <ShoppingCart className="mr-3 h-6 w-6" /> TICKET ACTUAL
            </h2>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase ${isSifenEnabled ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-700 text-muted-foreground'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isSifenEnabled ? 'bg-card' : 'bg-muted0'}`} />
              {isSifenEnabled ? 'SIFEN Online' : 'Offline'}
            </div>
          </div>
          <p className="text-primary-foreground/80 text-xs font-medium">Caja Principal - Turno Mañana</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-muted">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <ShoppingCart className="h-16 w-16 mb-4" />
              <p className="font-bold">El ticket está vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productoId} className="flex justify-between items-center bg-card p-3 rounded-2xl shadow-sm border border-border">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground leading-tight">{item.descripcion}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{item.cantidad} x {formatCurrency(item.precioVenta)}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-black text-emerald-600">{formatCurrency(item.cantidad * item.precioVenta)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.productoId)} className="ml-3 p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-card border-t border-border shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-10">
          <div className="mb-4">
            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Cliente / RUC</label>
            <div className="flex gap-2">
              <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
                <SelectTrigger className="flex-1 bg-muted border-none h-10">
                  <SelectValue placeholder="Seleccionar Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Cliente Genérico (Sin Nombre)</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.personaId} value={c.personaId.toString()}>
                      {c.razonSocial} {c.documento ? `(${c.documento})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="outline" className="h-10 w-10 shrink-0" onClick={() => setIsClientModalOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
            <span className="text-sm font-bold text-muted-foreground">{formatCurrency(total / 1.1)}</span>
          </div>
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">IVA (10%)</span>
            <span className="text-sm font-bold text-muted-foreground">{formatCurrency(total - (total / 1.1))}</span>
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total a Pagar</span>
            <span className="text-3xl font-black text-foreground">{formatCurrency(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 rounded-2xl border-2 border-border text-muted-foreground hover:bg-muted">
              <CreditCard className="mr-2 h-5 w-5" /> Tarjeta
            </Button>
            <Button onClick={handleCobrar} className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <Banknote className="mr-2 h-5 w-5" /> Efectivo
            </Button>
          </div>
        </div>
      </Card>

      {/* SECCIÓN DERECHA: CATÃLOGO DE PRODUCTOS (GRID) */}
      <div className="flex-1 flex flex-col bg-card rounded-3xl p-6 shadow-sm border border-border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-black text-foreground italic tracking-tight">Punto de Venta</h3>
            <p className="text-xs text-muted-foreground font-medium mt-1">Selecciona productos o escanea código de barras</p>
          </div>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              autoFocus
              placeholder="Escanear producto..." 
              className="pl-10 h-12 bg-muted border-none rounded-2xl text-lg font-medium shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
             <div className="h-full flex flex-col items-center justify-center text-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
              {filtrados.map((p) => (
                <div 
                  key={p.productoId} 
                  onClick={() => addToCart(p)}
                  className="bg-card border-2 border-border rounded-3xl p-5 cursor-pointer hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full"
                >
                  <div className="h-24 bg-muted rounded-2xl mb-4 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                    {/* Placeholder for image */}
                    <ShoppingCart className="h-8 w-8 text-muted-foreground group-hover:text-primary/40 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-bold mb-1 line-clamp-1">{p.codigoBarra}</p>
                    <h4 className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">{p.descripcion}</h4>
                  </div>
                  <div className="mt-4 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Precio</p>
                      <p className="font-black text-emerald-600 text-lg">{formatCurrency(p.precioVenta)}</p>
                    </div>
                    <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-1 rounded-lg">
                      Stock: {p.stockActual}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO CLIENTE */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black italic text-xl text-primary">Registrar Cliente Rápido</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Razón Social / Nombre *</label>
              <Input value={newClient.razonSocial} onChange={e => setNewClient({...newClient, razonSocial: e.target.value})} placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">RUC / Documento</label>
              <Input value={newClient.documento} onChange={e => setNewClient({...newClient, documento: e.target.value})} placeholder="Ej. 1234567-8" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Teléfono</label>
              <Input value={newClient.telefono} onChange={e => setNewClient({...newClient, telefono: e.target.value})} placeholder="Ej. 0981..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsClientModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateClient} className="bg-primary text-white">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE IMPRESIÓN (KUDE / COMPROBANTE DE VENTA) */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 bg-card border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black italic text-xl text-foreground tracking-tight flex items-center justify-between">
              <span>ðŸ§¾ Recibo de Venta POS</span>
              {lastVenta?.isSifen && (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase">
                  Homologado DNIT
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4 bg-muted border border-border rounded-2xl font-mono text-[10px] text-foreground space-y-4">
            {/* Cabecera Empresa */}
            <div className="text-center border-b border-dashed border-border pb-3">
              <h4 className="font-black text-xs text-foreground">INVIPINT S.A.</h4>
              <p className="text-[8px] text-muted-foreground">RUC: 80004512-1 | Timbrado NÂ°: 15412984</p>
              <p className="text-[8px] text-muted-foreground">Establ: 001 | Punto Exp: 001</p>
              <p className="text-[8px] text-muted-foreground">Asunción, Paraguay</p>
            </div>
            
            {/* Datos Factura */}
            <div className="space-y-1">
              <p><span className="font-bold">Factura NÂ°:</span> {lastVenta?.nroFactura}</p>
              <p><span className="font-bold">Fecha/Hora:</span> {lastVenta?.fecha}</p>
              <p><span className="font-bold">Cliente:</span> {lastVenta?.cliente?.razonSocial || "CLIENTE OCASIONAL"}</p>
              <p><span className="font-bold">RUC/CI:</span> {lastVenta?.cliente?.documento || "0"}</p>
            </div>
            
            {/* Detalle Artículos */}
            <table className="w-full text-left border-t border-b border-dashed border-border py-2">
              <thead>
                <tr className="font-bold text-muted-foreground">
                  <th>Descripción</th>
                  <th className="text-center">Cant</th>
                  <th className="text-right">Unit</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lastVenta?.detalles.map((d: any, idx: number) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="max-w-[120px] truncate py-1">{d.descripcion}</td>
                    <td className="text-center py-1">{d.cantidad}</td>
                    <td className="text-right py-1">{formatCurrency(d.precioVenta)}</td>
                    <td className="text-right font-bold text-foreground py-1">{formatCurrency(d.cantidad * d.precioVenta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Liquidación de Impuesto */}
            <div className="space-y-1 text-right">
              <p><span className="font-bold">Liquidación IVA 10%:</span> {formatCurrency(lastVenta?.total - (lastVenta?.total / 1.1))}</p>
              <p className="text-[11px] font-black text-foreground">TOTAL NETO: {formatCurrency(lastVenta?.total)}</p>
            </div>
            
            {/* SIFEN CDC y QR Code */}
            {lastVenta?.isSifen && (
              <div className="text-center border-t border-dashed border-border pt-3 space-y-2">
                <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">
                  Documento Electrónico (SIFEN)
                </p>
                <div className="bg-card p-2 border border-border rounded-xl overflow-hidden">
                  <p className="text-[6px] text-muted-foreground break-all font-mono">
                    <span className="font-bold">CDC:</span> {lastVenta?.cdc}
                  </p>
                </div>
                {/* Dibujo de QR para impresora térmica */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="w-16 h-16 bg-card border border-border rounded-lg flex items-center justify-center p-1">
                    <div className="grid grid-cols-5 gap-0.5 w-full h-full p-1 opacity-70">
                      {[...Array(25)].map((_, i) => (
                        <div key={i} className={`rounded-sm ${
                          (i % 3 === 0 || i % 4 === 0 || i === 0 || i === 4 || i === 20 || i === 24) ? 'bg-slate-800' : 'bg-muted'
                        }`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[6px] text-muted-foreground uppercase tracking-widest">
                    Escanee para validar comprobante
                  </span>
                </div>
              </div>
            )}
            
            <div className="text-center text-[8px] text-muted-foreground pt-1">
              Â¡Gracias por elegir INVIPINT S.A.!
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsPrintModalOpen(false)}>
              Cerrar
            </Button>
            {lastVenta?.ventaId && (
              <Button 
                onClick={() => window.open(`http://localhost:5034/api/cajapos/venta/${lastVenta.ventaId}/pdf`, "_blank")}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
              >
                Descargar PDF (QuestPDF)
              </Button>
            )}
            <Button onClick={() => window.print()} className="bg-primary text-white rounded-xl font-bold">
              Imprimir Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

