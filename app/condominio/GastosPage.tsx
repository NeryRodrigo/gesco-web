"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, TrendingUp, TrendingDown, Plus, 
  Building2, Wrench, Hammer, RefreshCw, ArrowUpRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

// Interfaces actualizadas según tus Controllers
interface UnidadCondominio {
  unidadId: number;
  codigoUnidad: string;
  nombreCondominio: string;
  empresaId: number;
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

interface DashboardGastos {
  ingresosTotales: number;
  gastosDetalle: Gasto[];
}

interface Empresa {
  empresaId: number;
  razonSocial: string;
}

export default function GastosInversionPage({ empresaId: propEmpresaId }: { empresaId: number }) {
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1);
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());
  const [rawData, setRawData] = useState<DashboardGastos | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<UnidadCondominio[]>([]); 
  const [selectedCondominio, setSelectedCondominio] = useState<string>(""); // Estado para el primer nivel de filtro

  const [formData, setFormData] = useState({
    unidadId: 0,
    descripcion: "",
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
    proveedor: "",
    nroComprobante: "",
    metodoPago: "EFECTIVO",
    empresaId: propEmpresaId || 0
  });

  // 1. Cargar Empresas
  useEffect(() => {
    fetch("http://localhost:5034/api/Auth/empresas")
        .then(res => res.json())
        .then(data => {
            setEmpresas(data);
            if (data.length > 0 && !formData.empresaId) {
                setFormData(prev => ({ ...prev, empresaId: data[0].empresaId }));
            }
        })
        .catch(() => toast.error("Error al conectar con empresas"));
  }, []);

  // 2. Cargar Dashboard y Unidades por Empresa
  const fetchData = async () => {
    const idParaCarga = propEmpresaId || formData.empresaId;
    if (!idParaCarga) return;

    setLoading(true);
    try {
      const resDash = await fetch(`http://localhost:5034/api/Gastos/dashboard?empresaId=${idParaCarga}&mes=${mesActual}&anio=${anioActual}`);
      if (resDash.ok) setRawData(await resDash.json());

      // Usando tu nuevo endpoint de UnidadesCondominio
      const resUni = await fetch(`http://localhost:5034/api/UnidadesCondominio/empresa/${idParaCarga}`);
      if (resUni.ok) setUnidades(await resUni.json());
      
    } catch (e) {
      toast.error("Error al sincronizar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [propEmpresaId, formData.empresaId, mesActual, anioActual]);

  // --- LÓGICA DE FILTRADO PARA LOS SELECTS DEL MODAL ---
  
  // Obtener lista única de Condominios
  const listaCondominios = useMemo(() => {
    const nombres = unidades.map(u => u.nombreCondominio);
    return Array.from(new Set(nombres)).sort();
  }, [unidades]);

  // Obtener Dúplex filtrados por el condominio seleccionado
  const unidadesFiltradas = useMemo(() => {
    if (!selectedCondominio) return [];
    return unidades.filter(u => u.nombreCondominio === selectedCondominio);
  }, [selectedCondominio, unidades]);

  // --- RESTO DE LÓGICA ---
  const inversionData = useMemo(() => {
    if (!rawData) return null;
    const filtrados = rawData.gastosDetalle.filter(g => 
      !g.descripcion.toLowerCase().includes("luz") && 
      !g.proveedor?.toLowerCase().includes("ande")
    );
    const totalInversion = filtrados.reduce((acc, curr) => acc + curr.monto, 0);
    return { filtrados, totalInversion, ingresos: rawData.ingresosTotales, ganancia: rawData.ingresosTotales - totalInversion, roi: rawData.ingresosTotales > 0 ? ((rawData.ingresosTotales - totalInversion) / rawData.ingresosTotales) * 100 : 0 };
  }, [rawData]);

  const handleCrearGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.unidadId === 0) return toast.error("Seleccione un Dúplex");
    
    try {
      const res = await fetch(`http://localhost:5034/api/Gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success("Gasto registrado");
        setIsModalOpen(false);
        setFormData(prev => ({ ...prev, descripcion: "", monto: 0 }));
        setSelectedCondominio(""); // Reset del filtro
        fetchData();
      }
    } catch (e) { toast.error("Error al registrar"); }
  };

  const formatGS = (n: number) => new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black italic text-foreground tracking-tighter uppercase">Inversión y Refacciones</h2>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-[0.3em] mt-2 opacity-60">
            {empresas.find(e => e.empresaId === (propEmpresaId || formData.empresaId))?.razonSocial || "Cargando Empresa..."}
          </p>
        </div>
        <div className="flex gap-3">
          <Input type="number" value={mesActual} onChange={e => setMesActual(parseInt(e.target.value))} className="w-16 h-11 bg-card font-black text-center" />
          <Input type="number" value={anioActual} onChange={e => setAnioActual(parseInt(e.target.value))} className="w-24 h-11 bg-card font-black text-center" />
          <Button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-black italic uppercase rounded-xl h-11 px-6 shadow-lg shadow-red-900/20">
            <Plus className="w-5 h-5 mr-2" /> Registrar Obra
          </Button>
        </div>
      </div>

      {/* MÉTRICAS Y TABLA (Se mantiene igual que tu diseño anterior) */}
      {!loading && inversionData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white border-none shadow-xl rounded-[1.5rem] p-8">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Ingresos Totales</p>
                <h3 className="text-2xl font-black italic text-slate-800 mt-2">{formatGS(inversionData.ingresos)}</h3>
            </Card>
            <Card className="bg-white border-none shadow-xl rounded-[1.5rem] p-8">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Inversión en Obras</p>
                <h3 className="text-2xl font-black italic text-red-600 mt-2">{formatGS(inversionData.totalInversion)}</h3>
            </Card>
            <Card className="bg-[#e9fbf4] border-none shadow-xl rounded-[1.5rem] p-8 text-emerald-600">
                <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Utilidad Neta</p>
                <h3 className="text-2xl font-black italic mt-2">{formatGS(inversionData.ganancia)}</h3>
            </Card>
            <Card className="bg-white border-none shadow-xl rounded-[1.5rem] p-8 text-purple-600">
                <p className="text-[10px] font-black uppercase opacity-40 tracking-[0.2em]">ROI</p>
                <h3 className="text-2xl font-black italic mt-2">{inversionData.roi.toFixed(2)}%</h3>
            </Card>
          </div>

          <Card className="bg-[#0c1421] border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden mt-8">
            <div className="p-8 border-b border-slate-800">
                <h4 className="text-xs font-black italic uppercase text-white tracking-[0.3em] flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-blue-500" /> Historial de Gastos Internos
                </h4>
            </div>
            <Table>
              <TableHeader className="bg-[#050a14]">
                <TableRow className="border-slate-800">
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 py-6 px-8">Fecha</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Descripción</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Unidad</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-8">Inversión (Gs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inversionData.filtrados.map((g) => (
                  <TableRow key={g.gastoId} className="border-slate-800 hover:bg-white/[0.02]">
                    <TableCell className="px-8 py-5 text-slate-400 font-bold text-xs">{g.fecha}</TableCell>
                    <TableCell className="text-white font-black italic uppercase text-xs">{g.descripcion}</TableCell>
                    <TableCell><Badge className="bg-slate-800 text-slate-300 border-none">{g.unidadNombre}</Badge></TableCell>
                    <TableCell className="text-right px-8 font-black text-red-500 text-sm italic">{formatGS(g.monto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* MODAL DE REGISTRO CON SELECTORES EN CASCADA */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#0c1421] border-slate-800 text-white rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Nuevo Registro de Inversión</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCrearGasto} className="space-y-5 mt-6">
            
            {/* NIVEL 1: Seleccionar Condominio */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">1. Seleccionar Condominio</label>
              <select 
                className="w-full h-12 bg-[#161f2e] border-none rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 ring-blue-500 text-white"
                value={selectedCondominio} 
                onChange={e => {
                  setSelectedCondominio(e.target.value);
                  setFormData({...formData, unidadId: 0}); // Reset del dúplex al cambiar condominio
                }}
              >
                <option value="">Elegir Condominio...</option>
                {listaCondominios.map(nombre => (
                    <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </select>
            </div>

            {/* NIVEL 2: Seleccionar Unidad/Dúplex (Filtrado) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">2. Seleccionar Dúplex / Unidad</label>
              <select 
                className={`w-full h-12 border-none rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 ring-red-600 text-white transition-opacity ${!selectedCondominio ? 'opacity-30 bg-slate-900 cursor-not-allowed' : 'bg-[#161f2e]'}`}
                disabled={!selectedCondominio}
                value={formData.unidadId} 
                onChange={e => setFormData({...formData, unidadId: parseInt(e.target.value)})}
              >
                <option value={0}>Elegir Unidad...</option>
                {unidadesFiltradas.map(u => (
                    <option key={u.unidadId} value={u.unidadId}>
                        {u.codigoUnidad}
                    </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Descripción del Trabajo</label>
              <Input placeholder="Ej. Pintura, Refacción..." className="bg-[#161f2e] border-none h-12 rounded-xl font-bold" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Costo (Gs)</label>
                <Input type="number" className="bg-[#161f2e] border-none h-12 rounded-xl font-black text-red-500" value={formData.monto || ''} onChange={e => setFormData({...formData, monto: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Fecha</label>
                <Input type="date" className="bg-[#161f2e] border-none h-12 rounded-xl font-bold uppercase text-xs" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
              </div>
            </div>
            
            <Button type="submit" disabled={!formData.unidadId} className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase rounded-xl shadow-xl shadow-red-900/20 disabled:opacity-50 transition-all">
                Guardar en Historial
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}