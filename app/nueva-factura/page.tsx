"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react"; // Iconos para mejorar el diseño

export default function NuevaFactura() {
  const [catalogos, setCatalogos] = useState<any>(null);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [nroFactura, setNroFactura] = useState("Cargando..."); // Iniciamos en estado de carga
  const router = useRouter();
  const empresaId = 6;

  // Cálculos automáticos de IVA para Paraguay
  const totalGeneral = detalles.reduce((sum, item) => sum + item.subtotal, 0);
  const iva10 = detalles.filter(i => i.ivaPorcentaje === 10).reduce((sum, item) => sum + (item.subtotal / 11), 0);
  const iva5 = detalles.filter(i => i.ivaPorcentaje === 5).reduce((sum, item) => sum + (item.subtotal / 21), 0);

  useEffect(() => {
    // 1. Cargamos los catálogos de clientes y productos
    fetch(`http://localhost:5034/api/Migration/catalogos/${empresaId}`)
      .then(res => res.json())
      .then(data => setCatalogos(data))
      .catch(err => console.error("Error catálogos:", err));

    // 2. Cargamos el SIGUIENTE NÚMERO ALFANUMÉRICO automático
    fetch(`http://localhost:5034/api/Migration/siguiente-nro/${empresaId}`)
      .then(res => res.json())
      .then(data => setNroFactura(data.siguienteNro))
      .catch(err => {
          console.error("Error nro factura:", err);
          setNroFactura("001-001-0000001"); // Fallback de seguridad
      });
  }, []);

  const agregarProducto = (p: any) => {
    const nuevoItem = {
      descripcion: p.descripcion,
      cantidad: 1,
      precioUnitario: p.precioVenta,
      ivaPorcentaje: p.ivaPorcentaje,
      subtotal: p.precioVenta
    };
    setDetalles([...detalles, nuevoItem]);
  };

  const enviarFactura = async () => {
    const factura = {
      empresaId: empresaId,
      personaId: parseInt(clienteId),
      fecha: new Date(),
      nroFactura: nroFactura,
      total: totalGeneral,
      detalles: detalles 
    };

    try {
        const res = await fetch("http://localhost:5034/api/Migration/guardar-factura", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(factura)
        });

        if (res.ok) {
            alert("Â¡Oima! Factura guardada correctamente con numeración automática.");
            router.push("/"); 
            router.refresh(); 
        } else {
            const errorData = await res.json();
            alert("Error al guardar: " + (errorData.title || "Verifique los datos"));
        }
    } catch (error) {
        console.error("Error de red:", error);
    }
  };

  if (!catalogos) return <div className="p-10 text-center font-bold text-blue-600 animate-pulse">Iniciando motor OIMA...</div>;

  return (
    <div className="p-10 bg-muted min-h-screen font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Catálogos Migrados */}
        <div className="col-span-1 space-y-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
          </Button>

          <Card className="border-none shadow-lg">
            <CardHeader className="bg-slate-800 text-white rounded-t-lg">
              <CardTitle className="text-sm uppercase tracking-wider">1. Cliente</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <select className="w-full p-2 text-sm border rounded bg-card" onChange={(e) => setClienteId(e.target.value)}>
                <option>Seleccionar Cliente...</option>
                {catalogos.clientes.map((c: any) => (
                  <option key={c.personaId} value={c.personaId}>{c.razonSocial}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader className="bg-slate-800 text-white rounded-t-lg">
              <CardTitle className="text-sm uppercase tracking-wider">2. Productos Migrados</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 max-h-[400px] overflow-y-auto">
              {catalogos.productos.map((p: any) => (
                <div 
                    key={p.productoId} 
                    className="flex justify-between items-center p-3 border rounded hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer group" 
                    onClick={() => agregarProducto(p)}
                >
                  <span className="text-xs font-bold text-foreground">{p.descripcion}</span>
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Gs. {p.precioVenta.toLocaleString('es-PY')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Construcción de la Factura */}
        <div className="col-span-2">
          <Card className="shadow-2xl border-none">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-black italic">OIMA VENTA</CardTitle>
                <div className="text-right">
                    <p className="text-[10px] uppercase opacity-80">Nro. correlativo automático</p>
                    <p className="text-lg font-mono font-bold tracking-widest">{nroFactura}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="font-bold">Descripción</TableHead>
                    <TableHead className="text-center font-bold">IVA</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalles.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">Haga clic en los productos para agregarlos a la factura.</TableCell></TableRow>
                  ) : (
                    detalles.map((d, i) => (
                        <TableRow key={i} className="hover:bg-muted transition-colors">
                          <TableCell className="text-sm font-medium">{d.descripcion}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-muted-foreground">{d.ivaPorcentaje}%</TableCell>
                          <TableCell className="text-right font-mono font-bold">Gs. {d.subtotal.toLocaleString('es-PY')}</TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>

              {/* Resumen Final */}
              <div className="p-8 bg-slate-900 text-white rounded-b-lg space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-700 pb-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Liq. IVA 10%:</span>
                    <span className="text-white font-mono">{Math.round(iva10).toLocaleString('es-PY')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Liq. IVA 5%:</span>
                    <span className="text-white font-mono">{Math.round(iva5).toLocaleString('es-PY')}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-400">TOTAL A PAGAR</span>
                  <span className="text-4xl font-black text-white">Gs. {totalGeneral.toLocaleString('es-PY')}</span>
                </div>

                <Button 
                  onClick={enviarFactura} 
                  disabled={!clienteId || detalles.length === 0}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white h-14 text-xl font-black shadow-xl transition-all"
                >
                  <Save className="mr-2 h-6 w-6" /> GUARDAR FACTURA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
