"use client";

import React, { useState, useMemo } from "react";
import { 
  Building2, 
  Home, 
  Users, 
  Wallet, 
  AlertTriangle, 
  Calendar,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NuevoContratoModal } from "./NuevoContratoModal";
import { verificarPermisoGranular, ModalAccesoRestringido } from "@/app/login/PermisosGranularesMatriz";
import { RegistrarPagoModal } from "./RegistrarPagoModal";
import { DetalleUnidadModal } from "./DetalleUnidadModal";
import { ComprobantePreviewModal } from "./ComprobantePreviewModal";
import AlertasVencimientoModal from "./AlertasVencimientoModal";
import { Download, Printer, FileSpreadsheet, LayoutGrid, Table as TableIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuplex } from "@/lib/utils";

// --- Interfaces ---
interface Contrato {
  contratoId: number;
  estaActivo: boolean;
  montoMensualAlquiler: number;
  fechaInicioContrato: string;
  fechaFinContrato: string;
  inquilino: {
    razonSocial: string;
    cedula: string;
    telefono: string;
    email: string;
  };
  pagos: Pago[];
}

interface Pago {
  pagoId: number;
  tipoPago: string;
  mesPagado: number;
  anioPagado: number;
  montoPagado: number;
  saldoPendiente: number;
  mora: number;
}

interface Unidad {
  unidadId: number;
  codigoUnidad: string;
  nombreCondominio: string;
  estado: string;
  contratos?: Contrato[];
  nisAnde?: string | null;
  medidorAgua?: string | null;
  observaciones?: string | null;
}

interface CondoGroup {
  name: string;
  units: Unidad[];
}

interface Usuario {
  id: number;
  nombre: string;
  rol: string;
  empresaId: number;
  requiereCambioPass?: boolean;
  rubro: string;
}

interface SelectedUnit {
  id: number;
  code: string;
  condo: string;
  tenant: string | null;
  status: string;
  nisAnde?: string | null;
  medidorAgua?: string | null;
  observaciones?: string | null;
}

function toSelectedUnit(unit: Unidad, tenant: string | null): SelectedUnit {
  return {
    id: unit.unidadId,
    code: unit.codigoUnidad,
    condo: unit.nombreCondominio,
    tenant,
    status: unit.estado,
    nisAnde: unit.nisAnde ?? null,
    medidorAgua: unit.medidorAgua ?? null,
    observaciones: unit.observaciones ?? null,
  };
}

interface NuevoContratoData {
  unidadId: number;
  inquilino: {
    nombreCompleto: string;
    cedula: string;
    telefono: string;
    correo: string;
  };
  contrato: {
    fechaIngreso?: string;
    fechaInicio: string;
    fechaFin: string;
    montoMensual: number;
    garantia: number;
  };
  adicionales: {
    cantidadOcupantes: number;
    vehiculo: string;
    observaciones: string;
  };
}

// RegistrarPagoData se reemplaza por PagoData importado
const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- Datos Simulados para el Diseño ---
const SUMMARY = {
  totalOccupied: 14,
  totalAvailable: 3,
  collectedThisMonth: 28500000,
  pendingToCollect: 5200000,
  expiringContracts: 2,
  debtors: 3
};

const CONDOS = [
  { 
    name: "Aguz 1", 
    units: [
      { id: 1, code: "D-01", status: "Ocupado", tenant: "Juan Perez", debt: 0 },
      { id: 2, code: "D-02", status: "Disponible", tenant: null, debt: 0 },
      { id: 3, code: "D-03", status: "Ocupado", tenant: "Maria Silva", debt: 150000 },
      { id: 4, code: "D-04", status: "Ocupado", tenant: "Carlos Gomez", debt: 0 },
      { id: 5, code: "D-05", status: "Reparacion", tenant: null, debt: 0 },
    ]
  },
  { 
    name: "Aguz 2", 
    units: [
      { id: 6, code: "D-01", status: "Ocupado", tenant: "Lucia Benitez", debt: 0 },
      { id: 7, code: "D-02", status: "Ocupado", tenant: "Pedro Jara", debt: 2500000 },
      { id: 8, code: "D-03", status: "Ocupado", tenant: "Ana Ortiz", debt: 0 },
      { id: 9, code: "D-04", status: "Ocupado", tenant: "Jose Ruiz", debt: 0 },
      { id: 10, code: "D-05", status: "Ocupado", tenant: "Elena Sosa", debt: 0 },
      { id: 11, code: "D-06", status: "Disponible", tenant: null, debt: 0 },
    ]
  },
  { 
    name: "Aguz 3", 
    units: [
      { id: 12, code: "D-01", status: "Ocupado", tenant: "Marcos Diaz", debt: 0 },
      { id: 13, code: "D-02", status: "Ocupado", tenant: "Sofia Vazquez", debt: 0 },
      { id: 14, code: "D-03", status: "Ocupado", tenant: "Ricardo Meza", debt: 0 },
      { id: 15, code: "D-04", status: "Ocupado", tenant: "Laura Galeano", debt: 0 },
      { id: 16, code: "D-05", status: "Ocupado", tenant: "Andres Torres", debt: 0 },
      { id: 17, code: "D-06", status: "Disponible", tenant: null, debt: 0 },
    ]
  }
];

interface DashboardData {
  summary: {
    totalOcupados: number;
    totalDisponibles: number;
    objetivoMes: number;
    cobradoMes: number;
    faltaCobrar: number;
    totalVencimientos: number;
    totalMorosos: number;
  };
  ocupados: DashboardDetail[];
  disponibles: DashboardDetail[];
  objetivosMes: DashboardDetail[];
  cobrados: DashboardDetail[];
  faltaCobrar: DashboardDetail[];
  vencimientos: DashboardDetail[];
  morosos: DashboardDetail[];
}

interface DashboardDetail {
  unidadId: number;
  duplex: string;
  condominio: string;
  inquilino: string;
  cedula?: string;
  nisAnde?: string;
  ocupantes?: number;
  monto: number;
  interesAcumulado?: number;
  montoRestante?: number;
  facturaEmitida: boolean;
  estadoFactura: string;
  tipoPago?: string;
  fecha: string;
}

export default function CondominioDashboard({ empresaId, usuario }: { empresaId: number, usuario: Usuario | null }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [isAlertasModalOpen, setIsAlertasModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  const [alertaRestriccion, setAlertaRestriccion] = useState<{
    visible: boolean;
    mensaje?: string;
    permisoNombre?: string;
  }>({ visible: false });

  const [isPreviewComprobanteOpen, setIsPreviewComprobanteOpen] = useState(false);
  const [comprobantePagoData, setComprobantePagoData] = useState<any>(null);

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [groupBy, setGroupBy] = useState<"none" | "condominio" | "estado">("none");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([
    "condominio",
    "duplex",
    "inquilino",
    "estado",
    "nisAnde",
    "medidorAgua",
    "observaciones",
    "deuda"
  ]);

  const columnLabels: Record<string, string> = {
    condominio: "Condominio",
    duplex: "Dúplex",
    inquilino: "Inquilino",
    estado: "Estado",
    nisAnde: "ANDE/Luz NIS",
    medidorAgua: "Medidor Agua",
    observaciones: "Observaciones",
    deuda: "Deuda"
  };

  const calcularDeudaUnidad = (unit: Unidad): number => {
    const activeContract = unit.contratos?.find(c => c.estaActivo);
    if (!activeContract) return 0;
    
    const start = new Date(activeContract.fechaInicioContrato);
    const end = new Date(activeContract.fechaFinContrato);
    const now = new Date();
    
    const currentVenc = new Date(start);
    currentVenc.setMonth(currentVenc.getMonth() + 1);
    
    const tempInstallments: { mes: number; anio: number; fecha: Date }[] = [];
    let mesCounter = start.getMonth() + 1;
    let anioCounter = start.getFullYear();

    while (currentVenc < end) {
      tempInstallments.push({ 
        mes: mesCounter, 
        anio: anioCounter, 
        fecha: new Date(currentVenc) 
      });
      
      mesCounter++;
      if (mesCounter > 12) {
        mesCounter = 1;
        anioCounter++;
      }
      currentVenc.setMonth(currentVenc.getMonth() + 1);
    }
    
    if (end > start) {
      tempInstallments.push({ 
        mes: mesCounter, 
        anio: anioCounter, 
        fecha: new Date(end) 
      });
    }

    tempInstallments.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    const pagosDisponibles = [...(activeContract.pagos || [])].filter(p => !p.tipoPago || p.tipoPago === "Alquiler");

    let totalDeuda = 0;
    tempInstallments.forEach(ti => {
      const pagoIdx = pagosDisponibles.findIndex(p => p.mesPagado === ti.mes && p.anioPagado === ti.anio);
      let pagado = 0;
      if (pagoIdx !== -1) {
        pagado = pagosDisponibles[pagoIdx].montoPagado;
        pagosDisponibles.splice(pagoIdx, 1);
      }
      if (pagado < activeContract.montoMensualAlquiler && now > ti.fecha) {
        totalDeuda += (activeContract.montoMensualAlquiler - pagado);
      }
    });

    return totalDeuda;
  };

  
  
  const [loading, setLoading] = useState(true);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  // Cálculo de estadísticas dinámicas
  const stats = useMemo(() => {
    const total = 15;
    const occupiedUnits = unidades.filter(u => u.estado === 'Ocupado');
    const occupied = dashboardData?.summary.totalOcupados || occupiedUnits.length;
    const available = dashboardData?.summary.totalDisponibles || (total - occupiedUnits.length);
    
    // Calcular objetivos (Suma de montos mensuales de contratos activos)
    const objetivos = dashboardData?.summary.objetivoMes || occupiedUnits.reduce((acc, curr) => {
      const activo = curr.contratos?.find(c => c.estaActivo);
      return acc + (activo?.montoMensualAlquiler || 0);
    }, 0);

    // Cobrado Mes: Solo contar pagos de tipo "Alquiler" (no servicios sueltos)
    // Los servicios (Luz, Agua, Basura) solo se suman si están incluidos en el contrato
    const cobradoAlquiler = dashboardData?.cobrados
      ?.filter(c => !c.tipoPago || c.tipoPago === "Alquiler")
      .reduce((acc, curr) => acc + curr.monto, 0) || 0;

    const faltaCobrar = (objetivos - cobradoAlquiler) > 0 ? (objetivos - cobradoAlquiler) : 0;

    return {
      occupied,
      available,
      collected: cobradoAlquiler,
      pending: faltaCobrar,
      expiring: dashboardData?.summary.totalVencimientos || occupiedUnits.filter(u => {
        const c = u.contratos?.find(con => con.estaActivo);
        if (!c) return false;
        const fin = new Date(c.fechaFinContrato);
        const hoy = new Date();
        const diff = (fin.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
        return diff > 0 && diff < 30;
      }).length,
      debtors: dashboardData?.summary.totalMorosos || 0,
      objective: objetivos
    };
  }, [unidades, dashboardData]);

  // Agrupar unidades por condominio: usa unidades reales de BD (incluye códigos renombrados)
  const condosGrouped = useMemo<CondoGroup[]>(() => {
    const sectors = [
      { name: "Aguz 1", count: 5 },
      { name: "Aguz 2", count: 6 },
      { name: "Aguz 3", count: 4 }
    ];

    return sectors.map((sector, sIdx) => {
      const realUnits = unidades
        .filter(u => u.nombreCondominio === sector.name)
        .sort((a, b) => a.codigoUnidad.localeCompare(b.codigoUnidad, "es", { numeric: true }));

      if (realUnits.length > 0) {
        return { name: sector.name, units: realUnits };
      }

      // Fallback a plantilla solo si aún no hay unidades en BD
      const units: Unidad[] = [];
      for (let i = 1; i <= sector.count; i++) {
        const code = `D-${i.toString().padStart(2, '0')}`;
        units.push({
          unidadId: -((sIdx + 1) * 100 + i),
          codigoUnidad: code,
          nombreCondominio: sector.name,
          estado: "Disponible",
          contratos: []
        });
      }
      return { name: sector.name, units };
    });
  }, [unidades]);

  const allUnitsFlat = useMemo(() => {
    return condosGrouped.flatMap(g => g.units);
  }, [condosGrouped]);

  const filteredUnits = useMemo(() => {
    return allUnitsFlat.filter(u => {
      const contratoActivo = u.contratos?.find((c) => c.estaActivo);
      const inquilino = contratoActivo?.inquilino?.razonSocial || "";
      const query = searchTerm.toLowerCase();
      return (
        u.codigoUnidad.toLowerCase().includes(query) ||
        u.nombreCondominio.toLowerCase().includes(query) ||
        (u.nisAnde && u.nisAnde.toLowerCase().includes(query)) ||
        inquilino.toLowerCase().includes(query)
      );
    });
  }, [allUnitsFlat, searchTerm]);

  const totalGlobalDeuda = useMemo(() => {
    return filteredUnits.reduce((acc, unit) => acc + calcularDeudaUnidad(unit), 0);
  }, [filteredUnits]);

  const groupedUnits = useMemo(() => {
    if (groupBy === "none") return null;
    const groups: Record<string, Unidad[]> = {};
    filteredUnits.forEach(u => {
      const key = groupBy === "condominio" ? u.nombreCondominio : u.estado;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(u);
    });
    return groups;
  }, [filteredUnits, groupBy]);

  const handleShiftColumn = (colKey: string, direction: "left" | "right") => {
    const idx = columnOrder.indexOf(colKey);
    if (idx === -1) return;
    const targetIdx = direction === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= columnOrder.length) return;
    const newOrder = [...columnOrder];
    newOrder[idx] = newOrder[targetIdx];
    newOrder[targetIdx] = colKey;
    setColumnOrder(newOrder);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: prev[groupName] === false ? true : false
    }));
  };

  const renderCellContent = (unit: Unidad, colKey: string) => {
    const contratoActivo = unit.contratos?.find((c) => c.estaActivo);
    const inquilino = contratoActivo?.inquilino?.razonSocial || null;
    
    switch (colKey) {
      case "condominio":
        return <span className="font-bold text-foreground">{unit.nombreCondominio}</span>;
      case "duplex":
        return <Badge className="bg-primary/5 text-primary border-none font-bold">{formatDuplex(unit.codigoUnidad)}</Badge>;
      case "inquilino":
        return <span className={`font-black uppercase italic ${contratoActivo ? 'text-foreground' : 'text-muted-foreground'}`}>{inquilino || "DISPONIBLE"}</span>;
      case "estado":
        return (
          <span className={`text-[10px] font-black uppercase italic ${unit.estado === 'Ocupado' ? 'text-primary' : 'text-emerald-500'}`}>
            {unit.estado}
          </span>
        );
      case "nisAnde":
        return <span className="font-mono font-bold text-xs text-muted-foreground">{unit.nisAnde || "-"}</span>;
      case "medidorAgua":
        return <span className="font-mono font-bold text-xs text-muted-foreground">{unit.medidorAgua || "-"}</span>;
      case "observaciones":
        return <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{unit.observaciones || "-"}</span>;
      case "deuda":
        const deud = calcularDeudaUnidad(unit);
        return (
          <span className={`font-black italic ${deud > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            {formatCurrency(deud)}
          </span>
        );
      default:
        return null;
    }
  };

  const renderGroupedRows = () => {
    if (!groupedUnits) return null;
    
    return Object.keys(groupedUnits).map((groupName) => {
      const groupUnits = groupedUnits[groupName];
      const isExpanded = expandedGroups[groupName] !== false;
      
      const totalUnidades = groupUnits.length;
      const totalObjetivo = groupUnits.reduce((acc, u) => {
        const activeC = u.contratos?.find(c => c.estaActivo);
        return acc + (activeC?.montoMensualAlquiler || 0);
      }, 0);
      const totalDeuda = groupUnits.reduce((acc, u) => acc + calcularDeudaUnidad(u), 0);
      
      return (
        <React.Fragment key={groupName}>
          <TableRow 
            onClick={() => toggleGroup(groupName)}
            className="bg-secondary/20 hover:bg-secondary/35 cursor-pointer font-sans select-none border-b border-border/70 no-print"
          >
            <TableCell colSpan={columnOrder.length} className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-primary font-black text-xs shrink-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4 inline-block mr-1 align-text-top" /> : <ChevronRight className="w-4 h-4 inline-block mr-1 align-text-top" />}
                    GRUPO: {groupName.toUpperCase() || "SIN ASIGNAR"}
                  </span>
                  <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black italic rounded-full px-2 py-0.5">
                    {totalUnidades} {totalUnidades === 1 ? "UNIDAD" : "UNIDADES"}
                  </Badge>
                </div>
                <div className="flex gap-6 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                  <span>Alquiler Objetivo: <strong className="text-primary">{formatCurrency(totalObjetivo)}</strong></span>
                  <span>Deuda Total: <strong className={totalDeuda > 0 ? "text-red-500" : "text-emerald-600"}>{formatCurrency(totalDeuda)}</strong></span>
                </div>
              </div>
            </TableCell>
          </TableRow>

          <tr className="hidden print:table-row bg-muted font-bold border-b border-border">
            <td colSpan={columnOrder.length} className="py-2 px-3 text-xs font-bold text-black" style={{ backgroundColor: '#f1f5f9' }}>
              GRUPO: {groupName.toUpperCase() || "SIN ASIGNAR"} ({totalUnidades} Unidades, Alquiler Objetivo: {formatCurrency(totalObjetivo)}, Deuda Total: {formatCurrency(totalDeuda)})
            </td>
          </tr>
          
          {groupUnits.map((unit) => {
            const contratoActivo = unit.contratos?.find((c) => c.estaActivo);
            const inquilino = contratoActivo?.inquilino?.razonSocial || null;
            
            return (
              <TableRow 
                key={unit.unidadId}
                onClick={() => {
                  setSelectedUnit(toSelectedUnit(unit, inquilino));
                  setIsDetalleModalOpen(true);
                }}
                className={`hover:bg-muted cursor-pointer transition-colors border-b border-border/50 font-sans text-xs text-foreground ${!isExpanded ? 'hidden print:table-row' : ''}`}
              >
                {columnOrder.map((colKey) => (
                  <TableCell key={colKey} className="py-4">
                    {renderCellContent(unit, colKey)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </React.Fragment>
      );
    });
  };

  const cargarUnidades = async () => {
    setLoading(true);
    try {
      const [respUnits, respDashboard] = await Promise.all([
        fetch(`http://localhost:5034/api/UnidadesCondominio/empresa/${empresaId}`),
        fetch(`http://localhost:5034/api/Dashboard/condominio/${empresaId}`)
      ]);

      if (respUnits.ok) {
        const data = await respUnits.json();
        setUnidades(data);
      }

      if (respDashboard.ok) {
        const data = await respDashboard.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Error cargando datos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarUnidad = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (id < 0) return; // No eliminar placeholders
    if (!confirm("¿Estás seguro de eliminar esta unidad y todos sus registros asociados?")) return;
    
    try {
      const resp = await fetch(`http://localhost:5034/api/UnidadesCondominio/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        toast.success("Unidad eliminada correctamente");
        cargarUnidades();
      } else {
        toast.error("No se pudo eliminar la unidad (API Error)");
      }
    } catch (error) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const handleSeedAguz = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`http://localhost:5034/api/UnidadesCondominio/seed/${empresaId}`, {
        method: "POST"
      });
      if (resp.ok) {
        toast.success("Estructura de Condominios Aguz sincronizada!");
        cargarUnidades();
      } else {
        toast.error("No se pudo sincronizar la estructura");
      }
    } catch (error) {
      toast.error("Error de comunicación con el servidor");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (empresaId > 0) cargarUnidades();
  }, [empresaId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-12 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-12">
        
        {/* PANEL HEADER */}
        <div className="bg-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-border flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="bg-primary p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl shadow-primary/20 text-white">
              <Building2 className="w-6 h-6 md:w-10 md:h-10" />
            </div>
            <div>
              <h1 className="text-xl md:text-4xl font-heading font-bold uppercase tracking-tighter text-primary leading-none">Condominios</h1>
              <p className="text-muted-foreground text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Aguz 1, 2 y 3</p>
            </div>
          </div>
          {/* Botones: Se apilan en móvil */}
          {/*
          <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
            <Button className="flex-1 md:flex-none h-10 px-4 rounded-xl bg-amber-500 text-[10px] font-bold">🔔 ALERTAS</Button>
            <Button variant="outline" className="flex-1 md:flex-none h-10 px-4 rounded-xl text-[10px] font-bold"><Printer className="w-4 h-4 mr-2"/> PDF</Button>
          </div>
          */}
          <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
            <Button 
              onClick={() => {
                const verif = verificarPermisoGranular("condo_morosidad");
                if (!verif.permitido) {
                  setAlertaRestriccion({
                    visible: true,
                    mensaje: verif.mensaje,
                    permisoNombre: verif.permisoNombre || "Gestión de Morosidad y Avisos"
                  });
                  return;
                }
                setIsAlertasModalOpen(true);
              }}
              className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] md:text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
            >
              🔔 ALERTAS (5 DÍAS)
            </Button>

            <Button 
              onClick={() => {
                const verif = verificarPermisoGranular("condo_recibos");
                if (!verif.permitido) {
                  setAlertaRestriccion({
                    visible: true,
                    mensaje: verif.mensaje,
                    permisoNombre: verif.permisoNombre || "Imprimir Recibos de Dinero"
                  });
                  return;
                }
                window.print();
              }}
              variant="outline" 
              className="flex-1 md:flex-none h-11 px-6 rounded-xl border-border font-bold text-[10px] md:text-xs hover:bg-secondary flex items-center justify-center"
            >
              <Printer className="w-4 h-4 mr-2" /> PDF / IMPRIMIR
            </Button>

            <Button variant="outline" className="flex-1 md:flex-none h-11 px-6 rounded-xl border-border font-bold text-[10px] md:text-xs hover:bg-secondary flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> EXCEL
            </Button>
          </div>

        </div>

        {/* SEARCH BAR */}
        <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border flex flex-col md:flex-row gap-4 items-center no-print">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar por inquilino, cédula o NIS..." 
                className="w-full pl-16 pr-6 py-5 bg-muted rounded-2xl border-none font-bold text-sm text-foreground focus:ring-2 focus:ring-primary transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>

           {/* VISTA TOGGLE */}
           <div className="flex gap-1.5 bg-muted p-1.5 rounded-2xl border border-border w-full md:w-auto">
             <Button
               variant={viewMode === "grid" ? "default" : "ghost"}
               onClick={() => setViewMode("grid")}
               className={`flex-1 md:flex-initial h-12 px-6 rounded-xl font-black italic text-xs uppercase transition-all ${
                 viewMode === "grid" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-sidebar-foreground hover:bg-secondary"
               }`}
             >
               <LayoutGrid className="w-4 h-4 mr-2" /> Cuadrícula
             </Button>
             <Button
               variant={viewMode === "table" ? "default" : "ghost"}
               onClick={() => setViewMode("table")}
               className={`flex-1 md:flex-initial h-12 px-6 rounded-xl font-black italic text-xs uppercase transition-all ${
                 viewMode === "table" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-sidebar-foreground hover:bg-secondary"
               }`}
             >
               <TableIcon className="w-4 h-4 mr-2" /> Tabla Plana
             </Button>
           </div>

           {/* AGRUPAR SELECTOR */}
           {viewMode === "table" && (
              <div className="flex items-center gap-3 bg-neutral-100 p-1.5 px-4 h-12 rounded-2xl border border-neutral-200 w-full md:w-auto">
               <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Agrupar:</span>
               <select
                 value={groupBy}
                 onChange={(e) => setGroupBy(e.target.value as any)}
                 className="bg-transparent border-none font-black text-xs uppercase outline-none cursor-pointer text-orange-600"
               >
                 <option value="none">Ninguno</option>
                 <option value="condominio">Condominio</option>
                 <option value="estado">Estado</option>
               </select>
             </div>
           )}

           <Button variant="outline" className="h-16 px-10 rounded-2xl border-border font-black italic text-xs tracking-widest uppercase w-full md:w-auto">
              <Filter className="w-4 h-4 mr-2" /> Filtrar
           </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
             <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Sincronizando...</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {condosGrouped.map((condo, idx) => (
              <div key={idx} className="space-y-6">
                <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
                  <h2 className="text-2xl font-heading font-bold uppercase text-foreground tracking-tighter">{condo.name}</h2>
                  <Badge className="bg-slate-900 text-white text-[9px] rounded-full px-3 py-1 font-black italic border-none">
                    {condo.units.filter(u => u.unidadId > 0).length} REALES
                  </Badge>
                </div>

                <div className="space-y-4">
                  {condo.units.filter(u => u.unidadId > 0).length === 0 && (
                    <Button 
                      onClick={handleSeedAguz}
                      className="w-full h-16 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 border-2 border-dashed border-blue-200 rounded-3xl font-black italic text-xs tracking-widest uppercase mb-4"
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Sincronizar Estructura {condo.name}
                    </Button>
                  )}
                  {condo.units.length === 0 ? (
                    <div className="bg-card/40 border-2 border-dashed border-border/40 rounded-3xl p-10 text-center">
                       <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.3em] font-sans">Sector Vacío</p>
                    </div>
                  ) : (
                    condo.units
                      .filter(u => 
                        u.codigoUnidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.contratos?.some((c) => c.inquilino?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map((unit) => {
                        const contratoActivo = unit.contratos?.find((c) => c.estaActivo);
                        const inquilino = contratoActivo?.inquilino?.razonSocial || null;
                        
                        return (
                          <Card 
                            key={unit.unidadId}
                            onClick={() => {
                              setSelectedUnit(toSelectedUnit(unit, inquilino));
                              setIsDetalleModalOpen(true);
                            }}
                            className={`group cursor-pointer transition-all duration-300 border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/30 bg-card`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-4">
                                <div className={`w-auto px-3 min-w-14 h-14 shrink-0 rounded-xl flex items-center justify-center font-black italic text-sm tracking-tight
                                  ${unit.estado === 'Ocupado' ? 'bg-primary/5 text-primary' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {formatDuplex(unit.codigoUnidad)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`text-[12px] font-heading font-bold uppercase truncate ${inquilino ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {inquilino || "DISPONIBLE"}
                                  </h4>
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-lg hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                        onClick={(e) => handleEliminarUnidad(e, unit.unidadId)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                      <span className={`text-[8px] font-bold uppercase font-sans ${unit.estado === 'Ocupado' ? 'text-primary' : 'text-emerald-500'}`}>
                                        {unit.estado}
                                      </span>
                                    </div>
                                    {unit.estado === 'Disponible' ? (
                                       <Button 
                                         size="sm"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setSelectedUnit(toSelectedUnit(unit, null));
                                           setIsModalOpen(true);
                                         }}
                                         className="h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black italic text-[8px] uppercase rounded-lg shadow-lg shadow-emerald-100"
                                       >
                                         CONTRATAR +
                                       </Button>
                                    ) : (
                                       <span className="text-[7px] font-black text-red-500 italic opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                                          VER EXPEDIENTE →
                                       </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border border-border shadow-xl shadow-primary/5 rounded-[2.5rem] overflow-hidden bg-card print-content-full">
            <CardHeader className="p-8 border-b border-border flex flex-row items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground font-sans">Listado de Unidades (Tabla Plana)</CardTitle>
              </div>
              <Badge className="bg-slate-900 text-white text-[9px] rounded-full px-3 py-1 font-black italic border-none">
                {filteredUnits.length} REGISTROS
              </Badge>
            </CardHeader>
            <div className="overflow-x-auto print-content-full">
              <Table className="print-content-full">
                <TableHeader className="bg-muted">
                  <TableRow>
                    {columnOrder.map((colKey, colIdx) => (
                      <TableHead key={colKey} className="py-4 text-[10px] font-black uppercase text-muted-foreground select-none relative group">
                        <div className="flex items-center justify-between gap-2">
                          <span>{columnLabels[colKey]}</span>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-card/85 p-0.5 rounded border border-border/40 shadow-sm gap-0.5 no-print">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleShiftColumn(colKey, "left"); }}
                              disabled={colIdx === 0}
                              className="p-1 hover:bg-muted rounded disabled:opacity-20 transition-colors"
                              title="Mover a la izquierda"
                            >
                              <ChevronLeft className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleShiftColumn(colKey, "right"); }}
                              disabled={colIdx === columnOrder.length - 1}
                              className="p-1 hover:bg-muted rounded disabled:opacity-20 transition-colors"
                              title="Mover a la derecha"
                            >
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupBy === "none" ? (
                    filteredUnits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columnOrder.length} className="text-center py-20 text-muted-foreground italic font-bold">
                          No se encontraron duplexes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUnits.map((unit) => {
                        const contratoActivo = unit.contratos?.find((c) => c.estaActivo);
                        const inquilino = contratoActivo?.inquilino?.razonSocial || null;
                        
                        return (
                          <TableRow 
                            key={unit.unidadId}
                            onClick={() => {
                              setSelectedUnit(toSelectedUnit(unit, inquilino));
                              setIsDetalleModalOpen(true);
                            }}
                            className="hover:bg-muted cursor-pointer transition-colors border-b border-border/50 font-sans text-xs text-foreground"
                          >
                            {columnOrder.map((colKey) => (
                              <TableCell key={colKey} className="py-4">
                                {renderCellContent(unit, colKey)}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    )
                  ) : (
                    renderGroupedRows()
                  )}
                </TableBody>
                {/* --- INICIO DEL PIE DE TABLA --- */}
                <tfoot className="bg-secondary/10 border-t-2 border-border font-sans">
                  <TableRow>
                    {/* Unimos todas las columnas excepto la última para el texto de "TOTAL" */}
                    <TableCell 
                      colSpan={columnOrder.length - 1} 
                      className="py-6 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest"
                    >
                      Total Deuda Acumulada:
                    </TableCell>
                    
                    {/* La última columna muestra el monto en rojo y grande para que resalte */}
                    <TableCell className="py-6 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-2xl font-heading font-bold text-red-600 tracking-tighter">
                          {formatCurrency(
                            // Si tienes los datos del dashboard usa ese, sino calculamos del filtro actual
                            dashboardData?.summary.totalMorosos ?? 
                            filteredUnits.reduce((acc, unit) => acc + calcularDeudaUnidad(unit), 0)
                          )}
                        </span>
                        
                      </div>
                    </TableCell>
                  </TableRow>
                </tfoot>
                {/* --- FIN DEL PIE DE TABLA --- */}
              </Table>
            </div>
          </Card>
        )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          aside,
          nav,
          footer,
          .no-print,
          button,
          .btn,
          header,
          .fixed-floating-buttons {
            display: none !important;
          }
          
          body, html, main, #root, .min-h-screen, .max-w-\\[1600px\\] {
            background: white !important;
            color: black !important;
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          .print-content-full {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px 12px !important;
            font-size: 11px !important;
            color: black !important;
            text-align: left !important;
          }
          
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
          }
        }
      `}} />

        {/* MODALES */}
        {selectedUnit && (
          <NuevoContratoModal 
            key={selectedUnit.id}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            unidadId={selectedUnit.id}
            codigoUnidad={selectedUnit.code}
            nombreCondominio={selectedUnit.condo}
            unidadesDisponibles={condosGrouped.flatMap(c => c.units.map(u => ({ id: u.unidadId, code: u.codigoUnidad, condo: c.name })))}
            onSave={async (data: NuevoContratoData) => {
              try {
                // Ahora que ya sincronizamos, el ID siempre debe ser positivo (> 0)
                if (data.unidadId <= 0) {
                  toast.error("Por favor, selecciona una ubicación válida (Sincroniza la estructura primero si es necesario)");
                  return;
                }

                const resp = await fetch("http://localhost:5034/api/Contratos", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    empresaId: empresaId,
                    unidadId: data.unidadId,
                    nombreCompleto: data.inquilino.nombreCompleto,
                    cedula: data.inquilino.cedula,
                    telefono: data.inquilino.telefono,
                    email: data.inquilino.correo,
                    fechaIngreso: data.contrato.fechaIngreso || data.contrato.fechaInicio,
                    fechaInicio: data.contrato.fechaInicio,
                    fechaFin: data.contrato.fechaFin,
                    montoMensual: data.contrato.montoMensual,
                    garantia: data.contrato.garantia,
                    cantidadOcupantes: data.adicionales.cantidadOcupantes,
                    vehiculo: data.adicionales.vehiculo,
                    observaciones: data.adicionales.observaciones
                  })
                });

                if (resp.ok) {
                  toast.success("Â¡Contrato registrado con éxito!");
                  setIsModalOpen(false);
                  cargarUnidades();
                } else {
                  const errorText = await resp.text();
                  toast.error("Error del servidor: " + errorText);
                }
              } catch (error) {
                console.error("Error al registrar contrato", error);
                toast.error("Error de conexión con el servidor");
              }
            }}
          />
        )}

        {selectedUnit && (
          <RegistrarPagoModal 
            isOpen={isPagoModalOpen}
            onClose={() => setIsPagoModalOpen(false)}
            unidadId={selectedUnit.id}
            codigoUnidad={selectedUnit.code}
            inquilinoNombre={selectedUnit.tenant || "Inquilino Desconocido"}
            empresaId={empresaId}
            onSave={async (pagos, sendAlerts) => {
              try {
                const resp = await fetch("http://localhost:5034/api/Contratos/pagos-consolidados", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(pagos)
                });
                if (resp.ok) {
                  let createdPagos: any[] = [];
                  try { createdPagos = await resp.json(); } catch(e) {}
                  const firstPago = (Array.isArray(createdPagos) && createdPagos.length > 0) ? createdPagos[0] : null;
                  
                  toast.success("Pago consolidado registrado y guardado con éxito");
                  cargarUnidades();

                  setComprobantePagoData({
                    pagoId: firstPago?.pagoId || Date.now(),
                    tipoPago: firstPago?.tipoPago || pagos[0]?.tipoPago || "Alquiler",
                    mesPagado: firstPago?.mesPagado || pagos[0]?.mesPagado || new Date().getMonth() + 1,
                    anioPagado: firstPago?.anioPagado || pagos[0]?.anioPagado || new Date().getFullYear(),
                    montoPagado: pagos.reduce((acc, p) => acc + p.montoPagado, 0),
                    metodoPago: firstPago?.metodoPago || pagos[0]?.metodoPago || "Efectivo",
                    fechaPago: firstPago?.fechaPago || pagos[0]?.fechaPago || new Date().toISOString(),
                    facturaEmitida: Boolean(pagos[0]?.facturaEmitida || pagos[0]?.numeroFactura),
                    numeroFactura: firstPago?.numeroFactura || pagos[0]?.numeroFactura,
                    comprobanteUrl: firstPago?.comprobanteUrl,
                    inquilinoNombre: selectedUnit?.tenant || "Cliente",
                    inquilinoDocumento: "Sin Documento",
                    unidadCodigo: selectedUnit?.code || "",
                    condominioNombre: selectedUnit?.condo || "Condominio"
                  });
                  setIsPreviewComprobanteOpen(true);

                  // Flujo de Notificaciones
                  if (sendAlerts.email && sendAlerts.emailAddr) {
                    toast.info(`Simulando envío de correo legal a: ${sendAlerts.emailAddr}`);
                  }

                  if (sendAlerts.whatsapp && sendAlerts.phone) {
                    const phoneNormalized = sendAlerts.phone.replace(/[^0-9]/g, "");
                    const detail = pagos.map(p => `• ${p.tipoPago} (${meses[p.mesPagado - 1]}/${p.anioPagado}): ${new Intl.NumberFormat('es-PY').format(p.montoPagado)} Gs.`).join("\n");
                    const total = pagos.reduce((acc, p) => acc + p.montoPagado + p.mora + p.saldoPendiente, 0);
                    
                    const text = `*COMPROBANTE DE COBRO CONSOLIDADO - VORDIA*\n\nEstimado inquilino *${selectedUnit.tenant || "Inquilino Desconocido"}*,\nSe ha registrado con éxito su pago del duplex *${selectedUnit.code}*.\n\n*Detalles del Pago:*\n${detail}\n\n*Total Abonado:* ${new Intl.NumberFormat('es-PY').format(total)} Gs.\n*Número de Factura:* ${pagos[0]?.numeroFactura || "N/A"}\n*Método de Pago:* ${pagos[0]?.metodoPago || "N/A"}\n\n_¡Muchas gracias por su puntualidad!_`;
                    
                    const url = `https://api.whatsapp.com/send?phone=${phoneNormalized}&text=${encodeURIComponent(text)}`;
                    window.open(url, "_blank");
                  }
                } else {
                  const errText = await resp.text();
                  toast.error("Error al registrar pago consolidado: " + errText);
                }
              } catch (error) {
                console.error("Error al registrar pago consolidado", error);
                toast.error("Error de comunicación con el servidor");
              }
            }}
          />
        )}

        <DetalleUnidadModal 
          isOpen={isDetalleModalOpen}
          onClose={() => setIsDetalleModalOpen(false)}
          unidad={selectedUnit}
          onUpdate={() => cargarUnidades()}
        />
        <ComprobantePreviewModal
          isOpen={isPreviewComprobanteOpen}
          onClose={() => setIsPreviewComprobanteOpen(false)}
          pagoData={comprobantePagoData}
          onSaved={() => cargarUnidades()}
        />
        <AlertasVencimientoModal
          isOpen={isAlertasModalOpen}
          onClose={() => setIsAlertasModalOpen(false)}
        />
        <ModalAccesoRestringido
          isOpen={alertaRestriccion.visible}
          onClose={() => setAlertaRestriccion({ visible: false })}
          mensaje={alertaRestriccion.mensaje}
          permisoNombre={alertaRestriccion.permisoNombre}
        />

      </div>
    </div>
  );
}


