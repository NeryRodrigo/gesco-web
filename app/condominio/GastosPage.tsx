"use client";

import { API_BASE } from "@/lib/api";

import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, Plus, 
  Wrench, Hammer, Percent, Wallet
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    fetch(`${API_BASE}/api/Auth/empresas`)
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
      const resDash = await fetch(`${API_BASE}/api/Gastos/dashboard?empresaId=${idParaCarga}&mes=${mesActual}&anio=${anioActual}`);
      if (resDash.ok) setRawData(await resDash.json());

      // Usando tu nuevo endpoint de UnidadesCondominio
      const resUni = await fetch(`${API_BASE}/api/UnidadesCondominio/empresa/${idParaCarga}`);
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
      const res = await fetch(`${API_BASE}/api/Gastos`, {
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
  const formatGSCompact = (n: number) => {
    if (n >= 1_000_000) return `Gs. ${(n / 1_000_000).toLocaleString("es-PY", { maximumFractionDigits: 1 })} M`;
    return formatGS(n);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 w-full max-w-full overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black italic text-foreground tracking-tighter uppercase leading-tight break-words">
            Inversión y Refacciones
          </h2>
          <p className="text-muted-foreground font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-2 opacity-60 truncate">
            {empresas.find(e => e.empresaId === (propEmpresaId || formData.empresaId))?.razonSocial || "Cargando Empresa..."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <Input
            type="number"
            value={mesActual}
            onChange={e => setMesActual(parseInt(e.target.value))}
            className="w-14 sm:w-16 h-11 bg-card font-black text-center shrink-0"
            aria-label="Mes"
          />
          <Input
            type="number"
            value={anioActual}
            onChange={e => setAnioActual(parseInt(e.target.value))}
            className="w-20 sm:w-24 h-11 bg-card font-black text-center shrink-0"
            aria-label="Año"
          />
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-black italic uppercase rounded-xl h-11 px-4 sm:px-6 shadow-lg shadow-red-900/20 flex-1 sm:flex-none min-w-0"
          >
            <Plus className="w-5 h-5 mr-2 shrink-0" />
            <span className="truncate">Registrar Obra</span>
          </Button>
        </div>
      </div>

      {/* MÉTRICAS (formato Resumen Operativo) + HISTORIAL */}
      {!loading && inversionData && (
        <>
          <div className="dashboard-metric-grid grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4 mb-2 sm:mb-4">
            {[
              {
                id: "ingresos",
                label: "Ingresos Totales",
                labelShort: "Ingresos totales",
                value: inversionData.ingresos,
                icon: Wallet,
                color: "text-primary",
                bg: "bg-primary/10",
                currency: true,
              },
              {
                id: "inversion",
                label: "Inversión en Obras",
                labelShort: "Inversión en obras",
                value: inversionData.totalInversion,
                icon: Hammer,
                color: "text-red-400",
                bg: "bg-red-400/10",
                currency: true,
              },
              {
                id: "utilidad",
                label: "Utilidad Neta",
                labelShort: "Utilidad neta",
                value: inversionData.ganancia,
                icon: TrendingUp,
                color: "text-emerald-400",
                bg: "bg-emerald-400/10",
                currency: true,
              },
              {
                id: "roi",
                label: "ROI",
                labelShort: "ROI",
                value: inversionData.roi,
                icon: Percent,
                color: "text-indigo-400",
                bg: "bg-indigo-400/10",
                currency: false,
                suffix: "%",
              },
            ].map((metric) => {
              const fullTitle = metric.currency
                ? formatGS(metric.value as number)
                : `${Number(metric.value).toFixed(2)}${metric.suffix || ""}`;
              const displayText = metric.currency
                ? formatGSCompact(metric.value as number)
                : `${Number(metric.value).toFixed(2)}${metric.suffix || ""}`;

              return (
                <Card
                  key={metric.id}
                  className="border border-border shadow-sm rounded-xl sm:rounded-2xl bg-card overflow-hidden min-w-0"
                >
                  <CardContent className="p-2.5 lg:p-3 relative flex flex-row items-center gap-2 lg:gap-3 min-h-[64px] lg:min-h-[72px] min-w-0">
                    <div
                      className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg ${metric.bg} ${metric.color} flex items-center justify-center shrink-0`}
                    >
                      <metric.icon className="w-4 h-4 lg:w-[18px] lg:h-[18px] stroke-[2px]" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wide text-muted-foreground leading-tight truncate">
                        {metric.labelShort}
                      </p>
                      <h3
                        title={fullTitle}
                        className="mt-0.5 text-[0.95rem] lg:text-lg font-heading font-extrabold text-foreground leading-snug tabular-nums tracking-tight break-words"
                      >
                        <span className="md:hidden">{displayText}</span>
                        <span className="hidden md:inline">
                          {metric.currency ? formatGS(metric.value as number) : displayText}
                        </span>
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-card border border-border rounded-2xl sm:rounded-[2rem] shadow-sm overflow-hidden mt-2 sm:mt-4">
            <div className="p-4 sm:p-6 md:p-8 border-b border-border">
                <h4 className="text-[10px] sm:text-xs font-black italic uppercase text-foreground tracking-widest sm:tracking-[0.3em] flex items-center gap-2 sm:gap-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-400/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Wrench className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  </span>
                  <span className="leading-snug">Historial de Gastos Internos</span>
                </h4>
            </div>

            {/* Móvil / iPad: lista en tarjetas */}
            <div className="md:hidden divide-y divide-border">
              {inversionData.filtrados.length === 0 ? (
                <p className="p-6 text-center text-xs font-bold text-muted-foreground uppercase">Sin registros</p>
              ) : (
                inversionData.filtrados.map((g) => (
                  <div key={g.gastoId} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground font-black italic uppercase text-xs leading-snug break-words">{g.descripcion}</p>
                        <p className="text-muted-foreground font-bold text-[10px] mt-1">{g.fecha}</p>
                      </div>
                      <p className="text-red-400 font-black text-xs italic tabular-nums shrink-0 text-right">
                        {formatGSCompact(g.monto)}
                      </p>
                    </div>
                    <Badge className="bg-muted text-muted-foreground border-none text-[9px]">{g.unidadNombre}</Badge>
                  </div>
                ))
              )}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border">
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground py-6 px-8">Fecha</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Descripción</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Unidad</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-muted-foreground px-8">Inversión (Gs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inversionData.filtrados.map((g) => (
                    <TableRow key={g.gastoId} className="border-border hover:bg-muted/30">
                      <TableCell className="px-8 py-5 text-muted-foreground font-bold text-xs whitespace-nowrap">{g.fecha}</TableCell>
                      <TableCell className="text-foreground font-black italic uppercase text-xs">{g.descripcion}</TableCell>
                      <TableCell><Badge className="bg-muted text-muted-foreground border-none">{g.unidadNombre}</Badge></TableCell>
                      <TableCell className="text-right px-8 font-black text-red-400 text-sm italic tabular-nums whitespace-nowrap">{formatGS(g.monto)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* MODAL DE REGISTRO CON SELECTORES EN CASCADA */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#0c1421] border-slate-800 text-white rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 w-[calc(100%-1.5rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter leading-tight">
              Nuevo Registro de Inversión
            </DialogTitle>
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
                  setFormData({...formData, unidadId: 0});
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
