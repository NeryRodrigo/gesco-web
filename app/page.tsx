"use client";
import { useEffect, useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, UploadCloud, LayoutDashboard, ChevronRight, MapPin,
  Calendar as CalendarIcon, Edit, Trash2, ArrowLeft,
  ExternalLink, Save, X, DollarSign, Ruler, Navigation,
  ShieldCheck, CheckCircle, XCircle, CheckCircle2, Info, Search, Filter, Sparkles,
  User, Building2, Wallet, LogOut, ChevronDown, Activity, Phone, Users,
  ArrowUpRight, AlertTriangle, Home, FileText, Cpu, Lock, History
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { AdministracionPage } from "./condominio/AdministracionPage";
import { ActividadesVista } from "./condominio/ActividadesVista";

// Tipos
import type { Propiedad } from "../types/propiedad";
import AuthScreen from "./login/Registro";
import { RegistroUsuarioModal } from "./login/RegistroUsuarioModal";
import { EditarUsuarioModal } from "./login/EditarUsuarioModal";
import { PermisosGranularesMatriz, verificarPermisoGranular, ModalAccesoRestringido } from "./login/PermisosGranularesMatriz";

// --- Nuevas Vistas ---
import CondominioDashboard from "./condominio/page";
import { DashboardCards } from "./condominio/DashboardCards";
import { FacturacionVista } from "./condominio/FacturacionVista";
import GastosPage from "./condominio/GastosPage";
import HistoricoContratosPage from "./condominio/HistoricoContratosPage";
import ConfiguracionPage from "./configuracion/page";
import { InventarioPage } from "./inventario/InventarioPage";
import { CajaPage } from "./caja/CajaPage";
import { ComprasPage } from "./compras/ComprasPage";
import { FinanzasPage } from "./finanzas/FinanzasPage";
import { CRMClientesPage } from "./crm/CRMClientesPage";
import { RRHHPage } from "./rrhh/RRHHPage";
import { BIPage } from "./bi/BIPage";
import { ProduccionPage } from "./produccion/ProduccionPage";
import { ContabilidadPage } from "./contabilidad/ContabilidadPage";
import { MigradorPage } from "./configuracion/MigradorPage";
import type { CaptacionFormData } from "./captacion/NuevaCaptacionModal";

// Componentes Dinámicos
const MapaPropiedades = dynamic(() => import('@/components/MapaPropiedades'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-muted animate-pulse rounded-2xl flex items-center justify-center text-muted-foreground font-bold italic">Iniciando Mapa Inmobiliario GESCO...</div>
});

const NuevaCaptacionModal = dynamic(
  () => import('./captacion/NuevaCaptacionModal').then((mod) => mod.NuevaCaptacionModal),
  { ssr: false }
);

// --- INTERFACES ---
interface AnalisisMercado {
  analisisMercadoId: number;
  nombrePropiedad: string;
  agenteNombre: string;
  fechaCarga: string;
  m2Terreno: number;
  m2Construccion: number;
  tipoCambio: number;
  precioM2Terreno: number;
  precioM2TerrenoUsd: number;
  precioM2Construccion: number;
  precioM2ConstruccionUsd: number;
  resumenVentaGs: number;
  resumenVentaUsd: number;
  resumenComisionGs: number;
  resumenEscribaniaGs: number;
  resumenRetencionGs: number;
  resumenNetoGs: number;
  resumenNetoUsd: number;
  inmuebleReferencias: InmuebleRef[];
}

interface InmuebleRef {
  referenciaId: number;
  precioVentaGs: number;
  m2Terreno: number;
  linkUrl: string;
}

interface Usuario {
  id: number;
  nombre: string;
  email?: string;
  rol: string;
  empresaId: number;
  requiereCambioPass: boolean;
  rubro: string;
}

interface Modulo {
  moduloId: number;
  nombreModulo: string;
  rubroAsociado: string;
  icono: string;
  rutaFrontend: string;
  isContratado?: boolean;
}

interface UsuarioAdmin {
  usuarioId: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  requiereCambioPass: boolean;
  iniciales: string;
  modulosIds: number[];
}

interface CondoDashboardData {
  summary: {
    totalOcupados: number;
    totalDisponibles: number;
    objetivoMes: number;
    cobradoMes: number;
    faltaCobrar: number;
    totalVencimientos: number;
    totalMorosos: number;
  }
}

type Vista = "inicio" | "inmobiliaria" | "administracion" | "usuarios" | "condominio" | "facturacion" | "configuracion" | "gastos" | "historico_contratos" | "aprobacion" | "consolidado" | "inventario" | "caja" | "compras" | "finanzas" | "crm" | "rrhh" | "analytics" | "produccion" | "contabilidad" | "migrador" | "actividades";

export default function OimaDashboard() {
  // --- ESTADOS DE NAVEGACIÓN PRINCIPAL ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState<Usuario | null>(null);
  const [vistaActual, setVistaActual] = useState<Vista>("condominio");
  const [modulosUsuario, setModulosUsuario] = useState<Modulo[]>([]); // Para el Sidebar
  const [usuariosAdmin, setUsuariosAdmin] = useState<UsuarioAdmin[]>([]);   // Para la tabla de Admin
  const [isModalRegistroOpen, setIsModalRegistroOpen] = useState(false); // Para el nuevo modal
  const [moduloExpandido, setModuloExpandido] = useState<string | null>("condominio"); // Condominio expandido por defecto para Aguz
  const [usuarioAEditar, setUsuarioAEditar] = useState<UsuarioAdmin | null>(null);
  const [isModalEdicionOpen, setIsModalEdicionOpen] = useState(false);
  const [usuarioPermisosId, setUsuarioPermisosId] = useState<number | null>(null);
  const [alertaRestriccion, setAlertaRestriccion] = useState<{
    visible: boolean;
    mensaje?: string;
    permisoNombre?: string;
  }>({ visible: false });

  const navegarConPermiso = (nuevaVista: Vista, empresaIdOpcional?: number) => {
    const mapaPermisos: Record<string, string> = {
      condominio: "condo_ver_panel",
      actividades: "act_ver",
      facturacion: "fact_ver",
      administracion: "admin_ver_reportes",
      configuracion: "conf_ver",
      gastos: "admin_gastos",
      historico_contratos: "condo_ver_panel",
      usuarios: "conf_usuarios"
    };

    const permisoRequerido = mapaPermisos[nuevaVista];
    if (permisoRequerido) {
      const verif = verificarPermisoGranular(permisoRequerido);
      if (!verif.permitido) {
        setAlertaRestriccion({
          visible: true,
          mensaje: verif.mensaje,
          permisoNombre: verif.permisoNombre
        });
        return;
      }
    }

    setVistaActual(nuevaVista);
    if (nuevaVista === "condominio" && usuarioActivo) {
      setUsuarioActivo({ ...usuarioActivo, empresaId: empresaIdOpcional || 7 });
    }
  };

  // --- ESTADOS DE ACM ---
  const [subVistaAcm, setSubVistaAcm] = useState<"calendario" | "dias" | "detalle">("calendario");
  const [mesSeleccionado, setMesSeleccionado] = useState<number | null>(null);
  const [analisisSeleccionado, setAnalisisSeleccionado] = useState<AnalisisMercado | null>(null);
  const [isEditingAcm, setIsEditingAcm] = useState(false);
  const [isNewAcm, setIsNewAcm] = useState(false);
  const [editFormData, setEditFormData] = useState<AnalisisMercado | null>(null);

  // --- ESTADOS DE DATOS ---
  const [analisisList, setAnalisisList] = useState<AnalisisMercado[]>([]);
  const [propiedadesList, setPropiedadesList] = useState<Propiedad[]>([]);
  const [propiedadesPendientes, setPropiedadesPendientes] = useState<Propiedad[]>([]);

  // --- ESTADOS UI ---
  const [uploading, setUploading] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [urlManual, setUrlManual] = useState("");
  const [filtroMls, setFiltroMls] = useState("");
  const [filtroPrecioMax, setFiltroPrecioMax] = useState("");
  const [isModalCreacionOpen, setIsModalCreacionOpen] = useState(false);
  const [isModalUpgradeOpen, setIsModalUpgradeOpen] = useState(false);
  const [moduloParaUpgrade, setModuloParaUpgrade] = useState<Modulo | null>(null);
  const [condoDashboardData, setCondoDashboardData] = useState<CondoDashboardData | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const canSeeGestionUsuarios = usuarioActivo?.rol === "ADMIN";

  const handleSuscripcion = async (pasarela: "Stripe" | "Bancard") => {
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`http://localhost:5034/api/Payment/crear-suscripcion?empresaId=${empresaId}&pasarela=${pasarela}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl; // Redirigir a pasarela
      } else {
        toast.error("Error al generar el cobro", { description: data.error || "Intente nuevamente" });
      }
    } catch (error) {
      toast.error("Error de conexión con el banco");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderIcon = (icono: string, isLaunchpad: boolean = false) => {
    const className = isLaunchpad ? "h-8 w-8" : "mr-3 h-5 w-5";
    switch (icono) {
      case "LayoutDashboard": return <LayoutDashboard className={className} />;
      case "Building2": return <Building2 className={className} />;
      case "MapPin": return <MapPin className={className} />;
      case "User": return <User className={className} />;
      case "Wallet": return <Wallet className={className} />;
      case "Cpu": return <Cpu className={className} />;
      case "Calendar": return <CalendarIcon className={className} />;
      default: return <Activity className={className} />;
    }
  };

  const getSapInfo = (rutaFrontend: string) => {
    switch (rutaFrontend) {
      case "rrhh": return { title: "OIMA SuccessFactors", subtitle: "Gestión MTESS / IPS" };
      case "compras": return { title: "OIMA Ariba", subtitle: "Aprovisionamiento B2B" };
      case "caja": return { title: "OIMA SD POS", subtitle: "Ventas / SIFEN Nativo" };
      case "finanzas": return { title: "OIMA FI/CO", subtitle: "Finanzas y Contabilidad" };
      case "analytics": return { title: "OIMA Analytics Cloud", subtitle: "Business Intelligence" };
      case "crm": return { title: "OIMA Customer Experience", subtitle: "CRM y Fidelización" };
      case "inventario": return { title: "OIMA EWM", subtitle: "Stock e Inventarios" };
      case "administracion": return { title: "OIMA Basis", subtitle: "Usuarios y Roles" };
      case "usuarios": return { title: "OIMA Basis", subtitle: "Usuarios y Roles" };
      case "configuracion": return { title: "OIMA Solution Manager", subtitle: "Parámetros Globales" };
      case "condominio": return { title: "OIMA RE-FX", subtitle: "Gestión Inmobiliaria" };
      case "inmobiliaria": return { title: "OIMA Property", subtitle: "Gestión de Propiedades" };
      case "facturacion": return { title: "OIMA Billing", subtitle: "Comprobantes Legales" };
      case "produccion": return { title: "OIMA PP", subtitle: "Producción / Régimen Maquila" };
      case "contabilidad": return { title: "OIMA FI", subtitle: "Libro Diario / Mayor" };
      case "migrador": return { title: "OIMA Data Intelligence", subtitle: "Universal Data Migrator" };
      default: return { title: "OIMA Enterprise App", subtitle: "Módulo de Negocio" };
    }
  };

  const empresaId = usuarioActivo?.empresaId || 7;
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };
  // --- CARGA DE DATOS ---
  const cargarDatos = async () => {
    // Si no hay usuario activo, no intentamos cargar nada
    if (!usuarioActivo) return;
    try {
      // Usamos usuarioActivo.empresaId en lugar del 6 fijo
      const idEmpresa = usuarioActivo.empresaId;
      const resA = await fetch(`http://localhost:5034/api/Migration/analisis/${idEmpresa}`);
      const dataA = await resA.json();
      setAnalisisList(dataA);

      const resP = await fetch(`http://localhost:5034/api/Migration/propiedades/${idEmpresa}`);
      const dataP: Propiedad[] = await resP.json();

      const aprobadas = dataP.filter((p: Propiedad) => p.esAprobada === true);
      const pendientes = dataP.filter((p: Propiedad) => !p.esAprobada);

      setPropiedadesList(aprobadas);
      setPropiedadesPendientes(pendientes);

      // Carga de datos de Condominios si es el entorno de Aguz (7) o similar
      if (idEmpresa === 7 || idEmpresa === 6) {
        const resC = await fetch(`http://localhost:5034/api/Dashboard/condominio/${idEmpresa}`);
        if (resC.ok) {
          const dataC = await resC.json();
          setCondoDashboardData(dataC);
        }
      }
    }
    catch (e) {
      //console.error("Error al cargar datos:", e);
      toast.error('Error',
        {
          description: 'Error al cargar datos. Intente mas tarde.'
        });
    }
  };

  /*useEffect(() => { 
    // Solo cargamos datos si está autenticado
    if (isAuthenticated) {
      cargarDatos(); 
    }
  }, [isAuthenticated]);*/ // Agregamos isAuthenticated como dependencia

  useEffect(() => {
    if (isAuthenticated && usuarioActivo) {
      if (typeof window !== "undefined" && usuarioActivo.email) {
        localStorage.setItem("gesco_active_user_email", usuarioActivo.email);
      }
      // 1. CARGA GLOBAL: Traer datos de negocio (ACM/Captaciones)
      cargarDatos();

      // 2. CARGA GLOBAL: Módulos del Sidebar (Permisos)
      fetch(`http://localhost:5034/api/Auth/modulos/${usuarioActivo.id}`)
        .then(async res => {
          if (!res.ok) {
            const text = await res.text();
            console.error("Backend error al sincronizar permisos:", res.status, "Detalle:", text);
            return null;
          }
          return res.json();
        })
        .then((data: Modulo[] | null) => {
          if (data !== null) {
            setModulosUsuario(Array.isArray(data) ? data : []);
          }
        })
        .catch(err => {
          console.error("Fetch error al sincronizar permisos:", err);
        });

      // 3. CARGA ESPECÃ FICA: Si el Admin entra a "Usuarios / Roles"
      if (vistaActual === "administracion" || vistaActual === "usuarios") {
        // Llamamos a la función que definimos antes
        cargarListaUsuariosAdmin();
      }
    }
  }, [isAuthenticated, usuarioActivo, vistaActual]);

  // --- LÃƒâ€œGICA DE GENERACIÃƒâ€œN DE MLSID (CORRELATIVO) ---
  const sugerirSiguienteMLSID = () => {
    // Unimos ambas listas para encontrar el último real registrado o por aprobar
    const todas = [...propiedadesList, ...propiedadesPendientes];

    if (todas.length === 0) return "143000000-1";

    const mlasParsed = todas
      .map(p => {
        const parts = (p.mlsid || "").split('-');
        return {
          prefix: parseInt(parts[0]) || 0,
          suffix: parseInt(parts[1]) || 0
        };
      })
      .filter(p => p.prefix > 0);

    if (mlasParsed.length === 0) return "143000000-1";

    // 1. Buscamos el prefijo máximo (el número antes del guión)
    const maxPrefix = Math.max(...mlasParsed.map(p => p.prefix));

    // 2. Buscamos el sufijo máximo para ese prefijo (el número después del guión)
    const suffixesForMaxPrefix = mlasParsed
      .filter(p => p.prefix === maxPrefix)
      .map(p => p.suffix);

    const maxSuffix = Math.max(...suffixesForMaxPrefix);

    // Retornamos el mismo prefijo pero con el sufijo incrementado
    return `${maxPrefix}-${maxSuffix + 1}`;
  };

  // --- LÃƒâ€œGICA DE MOTOR ACM ---
  const handleAcmChange = <K extends keyof AnalisisMercado>(field: K, value: AnalisisMercado[K]) => {
    if (!editFormData) return;
    const newData = { ...editFormData, [field]: value };
    const tc = newData.tipoCambio || 7070;
    const precioACM = (newData.m2Terreno * newData.precioM2Terreno) + (newData.m2Construccion * newData.precioM2Construccion);
    newData.resumenVentaGs = precioACM;
    newData.resumenVentaUsd = precioACM / tc;
    newData.resumenComisionGs = precioACM * 0.055;
    newData.resumenEscribaniaGs = precioACM * 0.0125;
    newData.resumenRetencionGs = precioACM * 0.024;
    newData.resumenNetoGs = precioACM - (newData.resumenComisionGs + newData.resumenEscribaniaGs + newData.resumenRetencionGs);
    newData.resumenNetoUsd = newData.resumenNetoGs / tc;
    setEditFormData(newData);
  };

  const handleRefChange = <K extends keyof InmuebleRef>(idx: number, field: K, value: InmuebleRef[K]) => {
    if (!editFormData) return;
    const newRefs = [...editFormData.inmuebleReferencias];
    newRefs[idx] = { ...newRefs[idx], [field]: value };
    setEditFormData({ ...editFormData, inmuebleReferencias: newRefs });
  };

  const handleCambiarRol = async (usuarioId: number, nuevoRol: string) => {
    const verif = verificarPermisoGranular("conf_usuarios");
    if (!verif.permitido) {
      setAlertaRestriccion({ visible: true, mensaje: verif.mensaje, permisoNombre: verif.permisoNombre || "Gestión de Colaboradores y Roles" });
      return;
    }
    try {
      const response = await fetch("http://localhost:5034/api/Usuario/cambiar-rol", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, rol: nuevoRol }),
      });

      if (response.ok) {
        toast.success("Seguridad Actualizada", { description: `El usuario ahora tiene el rol de ${nuevoRol}.` });
        // Actualizamos el estado local para que se vea el cambio sin recargar
        setUsuariosAdmin(prev => prev.map(u => u.usuarioId === usuarioId ? { ...u, rol: nuevoRol } : u));
      }
    } catch (error) {
      toast.error("Error al actualizar el rol");
    }
  };

  const cargarListaUsuariosAdmin = async () => {
    if (!usuarioActivo) return;

    try {
      const response = await fetch(`http://localhost:5034/api/Usuario/lista/${empresaId}`);
      if (response.ok) {
        const data = await response.json();
        setUsuariosAdmin(data);
      }
      else {
        // Si el servidor responde pero con error (ej. 404 o 500)
        toast.error("Fallo de Sincronización", {
          description: "OIMA Central no pudo recuperar la lista de colaboradores."
        });
      }
    }
    catch (error) {
      // Si no hay internet o el servidor está caído
      toast.error("Error Critico en OIMA", {
        description: error instanceof Error ? error.message : "Ocurrio un problema inesperado al cargar los roles.",
        duration: 5000, // Le damos más tiempo para que lo lea
      });
    }
  };

  const handleEliminarUsuario = async (usuarioId: number, nombre: string) => {
    if (!confirm(`¿Estas seguro de eliminar el acceso a Gesco para ${nombre}?`)) return;

    try {
      const response = await fetch(`http://localhost:5034/api/Usuario/${usuarioId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Usuario Eliminado", { description: "El acceso ha sido revocado correctamente." });
        setUsuariosAdmin(prev => prev.filter(u => u.usuarioId !== usuarioId));
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const handleLogoutConfirmation = () => {
    toast.warning("¿Deseas finalizar tu sesión?", {
      description: "Se cerrará el acceso seguro al ecosistema GESCO.",
      action: {
        label: "Cerrar Sesión",
        onClick: () => {
          // Lógica de salida
          setIsAuthenticated(false);
          setUsuarioActivo(null);
          setVistaActual("inicio");
          toast.success("Sesión finalizada correctamente");
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => toast.dismiss(), // Cierra el toast si se arrepiente
      },
      duration: 5000, // Le damos 5 segundos para decidir
    });
  };

  const handleSaveAcm = async () => {
    if (!editFormData) return;
    const url = isNewAcm
      ? `http://localhost:5034/api/Migration/analisis-manual?empresaId=${empresaId}`
      : `http://localhost:5034/api/Migration/analisis/${editFormData.analisisMercadoId}`;
    try {
      const res = await fetch(url, {
        method: isNewAcm ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setIsEditingAcm(false);
        setIsNewAcm(false);
        await cargarDatos();
        setSubVistaAcm("calendario");
        //alert("Expediente guardado correctamente.");
        toast.success('Captacion',
          {
            description: 'Propiedad aprobada!'
          });

      }
    } catch (e) { alert("Error al guardar"); }
  };

  const handleDeleteAnalisis = async (id: number) => {
    if (!confirm("¿Eliminar definitivamente este ACM?")) return;
    try {
      const res = await fetch(`http://localhost:5034/api/Migration/analisis/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAnalisisList(prev => prev.filter(a => a.analisisMercadoId !== id));
      }
    } catch (e) { alert("Error"); }
  };

  // --- LÃƒâ€œGICA DE CAPTACIONES ---
  const handleGuardarNuevaCaptacion = async (data: CaptacionFormData) => {
    try {
      const payload = { ...data, empresaId, esAprobada: false, sync: false };
      const res = await fetch("http://localhost:5034/api/Migration/crear-captacion-manual", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setTimeout(async () => {
          await cargarDatos();
          //alert("Captación generada con éxito.");
          toast.success('Captacion',
            {
              description: 'Captación generada con éxito.'
            });
          setIsModalCreacionOpen(false);
          setVistaActual("aprobacion");
        }, 500);
      }
    }
    catch (e) {
      //alert("Error al conectar con el servidor");
      toast.error('Error',
        {
          description: 'No se generó la captación.'
        });

    }
  };

  const handleAprobarPropiedad = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5034/api/Migration/aprobar-propiedad/${id}`, { method: "PUT" });
      if (res.ok) {
        await cargarDatos();
        //alert("Propiedad aprobada."); 
        toast.success('Captacion',
          {
            description: 'Propiedad aprobada!'
          });
      }
    }
    catch (e) {
      //alert("Error");
      toast.error('Error',
        {
          description: 'No se aprobó la propiedad.'
        });
    }
  };

  const onUpdatePropiedad = async (propActualizada: Propiedad) => {
    try {
      const response = await fetch("http://localhost:5034/api/Migration/actualizar-propiedad", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(propActualizada),
      });
      if (response.ok) {
        await cargarDatos();
        //alert("Propiedad actualizada.");
        toast.success('Captacion',
          {
            description: 'Propiedad actualizada!'
          });
      }
    }
    catch (err) {
      //alert("Error");
      toast.error('Error',
        {
          description: 'No se actualizó la propiedad.'
        });
    }
  };

  const onDeletePropiedad = async (id: number) => {
    if (!confirm("¿Eliminar?")) return;
    try {
      const response = await fetch(`http://localhost:5034/api/Migration/propiedad/${id}`, { method: "DELETE" });
      if (response.ok) await cargarDatos();
    } catch (error) { alert("Error"); }
  };

  const ejecutarScrappingMasivo = async () => {
    setUploading(true);
    setShowSyncPanel(true);
    try {
      const queryParams = new URLSearchParams({ empresaId: empresaId.toString(), ...(urlManual && { urlManual }) });
      const scrap = await fetch(`http://localhost:5034/api/Migration/scrapping-masivo?${queryParams}`, { method: "POST" });
      if (scrap.ok) await cargarDatos();
    } catch (err) { alert("Error"); }
    finally { setUploading(false); setShowSyncPanel(false); }
  };

  // --- MEMOS ---
  const analisisPorMes = useMemo(() => meses.map((nombre, index) => ({
    nombre, index, cantidad: analisisList.filter(a => new Date(a.fechaCarga).getMonth() === index).length
  })), [analisisList]);

  const conteoPorCliente = useMemo(() => {
    const conteo: Record<string, number> = {};
    analisisList.forEach(a => {
      const cliente = a.agenteNombre || "Sin Asignar";
      conteo[cliente] = (conteo[cliente] || 0) + 1;
    });
    return conteo;
  }, [analisisList]);

  const isUsuarioCondominio = true;

  const isUsuarioInmobiliaria = useMemo(() => {
    return usuarioActivo?.rubro === "INMOBILIARIA";
  }, [usuarioActivo]);

  const isUsuarioRetail = useMemo(() => {
    return usuarioActivo?.rubro === "RETAIL";
  }, [usuarioActivo]);

  const propiedadesFiltradas = useMemo(() => propiedadesList.filter(p => {
    const matchMls = filtroMls ? p.mlsid?.toLowerCase().includes(filtroMls.toLowerCase()) : true;
    const matchPrecio = filtroPrecioMax ? p.precioVentaGs <= parseInt(filtroPrecioMax) : true;
    return matchMls && matchPrecio;
  }), [propiedadesList, filtroMls, filtroPrecioMax]);

  // Si no está autenticado, mostramos la pantalla de Auth
  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={(user) => {
      setUsuarioActivo(user);
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#021A52] text-white flex flex-col border-r border-[#021A52]/80 shadow-sm z-40">
        <div className="p-6 cursor-pointer group" onClick={() => setVistaActual("inicio")}>
          <h1 className="text-2xl font-black italic">Gesco<span className="text-amber-400">.</span></h1>
          <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest leading-none mb-6 italic">Software de Gestión</p>
          {/* SIDEBAR LOGO */}
          <div className="flex justify-start items-center px-4 py-2">
            {isUsuarioInmobiliaria ? (
              <img src="/remax-logo.png" alt="REMAX" className="w-32 h-auto object-contain" />
            ) : isUsuarioCondominio ? (
              <div className="flex justify-center items-center w-full py-2">
                <img
                  src="/fontana-logo.jpeg"
                  alt="Fontana Di Luque Logo"
                  className="w-40 h-auto object-contain drop-shadow-xl transition-all hover:scale-105"
                />
              </div>
            ) : (
              <div className="text-xl font-black italic text-amber-400 tracking-tighter uppercase">{usuarioActivo?.rubro} ERP</div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar">
          {/* MÃƒâ€œDULOS DINÃMICOS DESDE LA DB */}
          {/* MÃƒâ€œDULOS DE OIMA ENTERPRISE - SOLO OTRAS EMPRESAS */}
          {!isUsuarioCondominio && modulosUsuario.filter(m =>
            m.rutaFrontend !== "condominio" &&
            m.rutaFrontend !== "facturacion" &&
            m.rutaFrontend !== "configuracion" &&
            m.rutaFrontend !== "administracion" &&
            m.rutaFrontend !== "usuarios"
          ).map((mod) => (
            <Button
              key={mod.moduloId}
              variant="ghost"
              className={`w-full justify-start transition-all h-12 rounded-xl mb-1 ${vistaActual === mod.rutaFrontend ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              onClick={() => setVistaActual(mod.rutaFrontend as Vista)}
            >
              {renderIcon(mod.icono)}
              <span className="ml-3 font-bold text-sm">{mod.nombreModulo}</span>
            </Button>
          ))}

          {/* SECCIÃƒâ€œN ESPECIAL: GESTIÃƒâ€œN DE CONDOMINIOS (ESTRUCTURA PLANA) */}
          {isUsuarioCondominio && (
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4 ml-4">Módulos de Gestión</p>

              <div className="space-y-1">
                {/* CONDOMINIO Aguz */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl ${vistaActual === 'condominio' ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  onClick={() => navegarConPermiso("condominio", 7)}
                >
                  <Building2 className={`mr-3 h-5 w-5 ${vistaActual === 'condominio' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-black italic uppercase text-xs tracking-tighter">Condominio Aguz</span>
                </Button>

                {/* ACTIVIDADES */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl ${vistaActual === 'actividades' ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  onClick={() => navegarConPermiso("actividades")}
                >
                  <Activity className={`mr-3 h-5 w-5 ${vistaActual === 'actividades' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-black italic uppercase text-xs tracking-tighter">Actividades</span>
                </Button>

                {/* FACTURACIÃƒâ€œN */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl ${vistaActual === 'facturacion' ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  onClick={() => navegarConPermiso("facturacion")}
                >
                  <Wallet className={`mr-3 h-5 w-5 ${vistaActual === 'facturacion' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-black italic uppercase text-xs tracking-tighter">Facturación</span>
                </Button>

                {/* ADMINISTRACIÃƒâ€œN */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl ${vistaActual === 'administracion' ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  onClick={() => navegarConPermiso("administracion")}
                >
                  <FileText className={`mr-3 h-5 w-5 ${vistaActual === 'administracion' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-black italic uppercase text-xs tracking-tighter">Administración</span>
                </Button>

                {/* CONFIGURACIÃƒâ€œN */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl ${vistaActual === 'configuracion' ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  onClick={() => navegarConPermiso("configuracion")}
                >
                  <ShieldCheck className={`mr-3 h-5 w-5 ${vistaActual === 'configuracion' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-black italic uppercase text-xs tracking-tighter">Configuración</span>
                </Button>
                {/* GASTOS Y MANTENIMIENTO */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl ${vistaActual === 'gastos' ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  onClick={() => navegarConPermiso("gastos")}
                >
                  <DollarSign className={`mr-3 h-5 w-5 ${vistaActual === 'gastos' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-black italic uppercase text-xs tracking-tighter">Gastos del Condominio</span>
                </Button>
                {/* HISTÓRICO DE CONTRATOS E INQUILINOS */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl ${vistaActual === 'historico_contratos' ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  onClick={() => navegarConPermiso("historico_contratos")}
                >
                  <History className={`mr-3 h-5 w-5 ${vistaActual === 'historico_contratos' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-black italic uppercase text-xs tracking-tighter">Histórico de Contratos</span>
                </Button>
                {/* USUARIOS / ROLES */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl ${vistaActual === 'usuarios' ? 'bg-primary/10 text-primary shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
                  onClick={() => navegarConPermiso("usuarios")}
                >
                  <Users className={`mr-3 h-5 w-5 ${vistaActual === 'usuarios' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-black italic uppercase text-xs tracking-tighter">Usuarios / Roles</span>
                </Button>
              </div>
            </div>
          )}


        </nav>
        {/* FOOTER DEL SIDEBAR: PERFIL DE USUARIO (Estilo SAP/SaaS Pro) */}
        <div className="mt-auto p-4 border-t border-sidebar-border bg-sidebar-accent/50">
          <div className="flex items-center gap-3 px-2 mb-4">
            {/* Avatar dinámico con iniciales */}
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center font-black text-white shadow-md border border-white/10 shrink-0">
              {usuarioActivo?.nombre?.substring(0, 1).toUpperCase() || "U"}
            </div>

            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black italic text-white uppercase truncate tracking-tight">
                {usuarioActivo?.nombre || "Usuario Gesco"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[9px] text-primary font-bold uppercase tracking-[0.2em]">
                  {usuarioActivo?.rol || "AGENTE"}
                </p>
              </div>
            </div>
          </div>

          {/* Botón de Cerrar Sesión */}
          <Button
            variant="ghost"
            onClick={handleLogoutConfirmation}
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 rounded-xl transition-all group"
          >
            <XCircle className="mr-3 h-4 w-4 group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Finalizar Sesión</span>
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">

        {/* HEADER */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center text-muted-foreground text-sm font-bold">
            <LayoutDashboard className="h-4 w-4 mr-2" /> <span>Panel</span>
            {vistaActual !== "inicio" && <><ChevronRight className="h-4 w-4 mx-2" /><span className="text-foreground capitalize font-black tracking-tight">{vistaActual}</span></>}
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-border"><Info className="h-4 w-4 text-muted-foreground" /></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-background">

          {vistaActual === "inicio" && (
            <div className="space-y-8 animate-in fade-in duration-700">

              {!isUsuarioCondominio && (
                <>
                  <div className="mb-8">
                    <h2 className="text-3xl font-black italic text-foreground tracking-tight">Gesco Workspace</h2>
                    <p className="text-muted-foreground font-medium mt-1">Seleccione un módulo autorizado para comenzar a operar.</p>
                  </div>

                  {/* SAP Fiori Style Launchpad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                    {modulosUsuario.map(mod => {
                      const sapInfo = getSapInfo(mod.rutaFrontend);
                      return (
                        <Card
                          key={mod.moduloId}
                          onClick={() => {
                            if (mod.isContratado || usuarioActivo?.empresaId === 7) {
                              setVistaActual(mod.rutaFrontend as Vista);
                            } else {
                              setModuloParaUpgrade(mod);
                              setIsModalUpgradeOpen(true);
                            }
                          }}
                          className={`border border-border shadow-sm transition-all cursor-pointer bg-card overflow-hidden group flex flex-col items-start p-6 relative ${mod.isContratado || usuarioActivo?.empresaId === 7
                              ? 'hover:shadow-xl hover:border-primary/30 hover:-translate-y-1'
                              : 'opacity-70 hover:opacity-100 bg-muted'
                            }`}
                        >
                          {!(mod.isContratado || usuarioActivo?.empresaId === 7) && (
                            <div className="absolute top-4 right-4 bg-muted text-muted-foreground rounded-full p-1.5 z-10 shadow-sm">
                              <Lock className="w-4 h-4" />
                            </div>
                          )}
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 bg-muted text-muted-foreground rounded-xl flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300">
                              {renderIcon(mod.icono, true)}
                            </div>
                            <div>
                              <h3 className="font-black text-foreground text-lg group-hover:text-primary transition-colors leading-tight">{mod.nombreModulo}</h3>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">{sapInfo.subtitle}</p>
                            </div>
                          </div>
                          <div className="mt-auto w-full pt-4 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-xs font-medium text-muted-foreground">{sapInfo.title}</span>
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                              <Activity className="h-3 w-3" />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              {isUsuarioCondominio && (
                /* Dashboard Principal (Tarjetas Dinámicas Reales) */
                <DashboardCards dashboardData={condoDashboardData} onRefresh={cargarDatos} />
              )}
            </div>
          )}

          {/* NUEVAS VISTAS: CONDOMINIO Aguz */}
          {vistaActual === "condominio" && <CondominioDashboard empresaId={empresaId} usuario={usuarioActivo} />}
          {vistaActual === "actividades" && <ActividadesVista empresaId={empresaId} />}
          {vistaActual === "facturacion" && <FacturacionVista />}
          {vistaActual === "gastos" && <GastosPage empresaId={empresaId} />}
          {vistaActual === "historico_contratos" && <HistoricoContratosPage empresaId={empresaId} />}
          {vistaActual === "inventario" && <InventarioPage empresaId={empresaId} />}
          {vistaActual === "caja" && <CajaPage empresaId={empresaId} />}
          {vistaActual === "compras" && <ComprasPage empresaId={empresaId} />}
          {vistaActual === "finanzas" && <FinanzasPage empresaId={empresaId} />}
          {vistaActual === "crm" && <CRMClientesPage empresaId={empresaId} />}
          {vistaActual === "rrhh" && <RRHHPage empresaId={empresaId} />}
          {vistaActual === "analytics" && <BIPage empresaId={empresaId} />}
          {vistaActual === "produccion" && <ProduccionPage empresaId={empresaId} />}
          {vistaActual === "contabilidad" && <ContabilidadPage />}
          {vistaActual === "migrador" && <MigradorPage empresaId={empresaId} />}
          {vistaActual === "administracion" && (
            <AdministracionPage empresaId={empresaId} usuario={usuarioActivo} />
          )}
          {vistaActual === "configuracion" && <ConfiguracionPage empresaId={empresaId} />}

          {vistaActual === "inmobiliaria" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {subVistaAcm === "calendario" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {analisisPorMes.map((m) => (
                    <Card key={m.index} className="hover:shadow-2xl transition-all cursor-pointer border-none bg-card overflow-hidden group" onClick={() => { setMesSeleccionado(m.index); setSubVistaAcm("dias"); }}>
                      <div className={`h-2 w-full transition-colors ${m.cantidad > 0 ? 'bg-blue-600' : 'bg-muted group-hover:bg-blue-300'}`} />
                      <CardContent className="p-6 flex flex-col items-center">
                        <CalendarIcon className={`h-12 w-12 mb-3 transition-colors ${m.cantidad > 0 ? 'text-blue-500' : 'text-slate-200 group-hover:text-blue-300'}`} />
                        <h3 className="text-lg font-black uppercase italic text-foreground">{m.nombre}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold">{m.cantidad} Archivos</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* SUBVISTA: LISTADO POR DÃAS (REDISEÑADO) */}
              {subVistaAcm === "dias" && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => setSubVistaAcm("calendario")}
                      className="text-muted-foreground hover:bg-card hover:text-foreground transition-all font-bold group"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                      Volver al Calendario
                    </Button>
                    <div className="bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                        Registros de {meses[mesSeleccionado || 0]}
                      </span>
                    </div>
                  </div>

                  <div className="bg-card rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden border border-border">
                    <Table>
                      <TableHeader className="bg-muted/50 uppercase text-[10px] font-black tracking-widest text-muted-foreground">
                        <TableRow>
                          <TableHead className="pl-8">Fecha</TableHead>
                          <TableHead>Agente</TableHead>
                          <TableHead className="text-center">Cant.</TableHead>
                          <TableHead>Nombre ACM</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead className="text-right pr-8">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analisisList
                          .filter(a => new Date(a.fechaCarga).getMonth() === mesSeleccionado)
                          .sort((a, b) => new Date(b.fechaCarga).getTime() - new Date(a.fechaCarga).getTime())
                          .map(a => (
                            <TableRow
                              key={a.analisisMercadoId}
                              className="hover:bg-blue-50/50 cursor-pointer transition-colors group border-b border-slate-50"
                              onDoubleClick={() => { setAnalisisSeleccionado(a); setSubVistaAcm("detalle"); }}
                            >
                              <TableCell className="pl-8 font-medium text-muted-foreground">
                                {new Date(a.fechaCarga).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-black uppercase text-foreground italic tracking-tighter">
                                {a.agenteNombre}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="bg-card border border-blue-100 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black shadow-sm">
                                  {conteoPorCliente[a.agenteNombre] || 1}
                                </span>
                              </TableCell>
                              <TableCell className="font-bold text-blue-700 uppercase tracking-tight">
                                {a.nombrePropiedad}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground text-xs font-bold">
                                {new Date(a.fechaCarga).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell className="text-right pr-8">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAnalisis(a.analisisMercadoId); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* SUBVISTA: DETALLE / EXPEDIENTE TÃƒâ€°CNICO (REDISEÑADO) */}
              {subVistaAcm === "detalle" && (isNewAcm || analisisSeleccionado) && (() => {
                const data = editFormData || analisisSeleccionado!;
                const tc = data.tipoCambio || 7070;
                const totalTerreno = data.m2Terreno * data.precioM2Terreno;
                const totalConstruccion = data.m2Construccion * data.precioM2Construccion;

                return (
                  <div className="space-y-8 animate-in slide-in-from-bottom-10 pb-20 max-w-[1400px] mx-auto">

                    {/* HEADER TÃƒâ€°CNICO */}
                    <div className="flex justify-between items-center bg-card p-8 rounded-[2.5rem] shadow-xl border border-border border-l-[12px] border-blue-600">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Expediente Valuado OIMA</span>
                        </div>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                          {isNewAcm ? "Nuevo Cálculo Técnico" : data.nombrePropiedad}
                        </h2>
                        <p className="text-muted-foreground font-bold text-xs uppercase mt-2 tracking-widest">
                          Responsable: {data.agenteNombre} â€¢ Registro ID: {data.analisisMercadoId}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        {!isEditingAcm ? (
                          <Button onClick={() => { setEditFormData(analisisSeleccionado); setIsEditingAcm(true); }} className="bg-blue-600 hover:bg-blue-700 font-black italic shadow-lg h-12 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95">
                            <Edit className="w-4 h-4 mr-2" /> EDITAR DATOS
                          </Button>
                        ) : (
                          <>
                            <Button onClick={handleSaveAcm} className="bg-green-600 hover:bg-green-700 font-black italic shadow-lg h-12 px-8 rounded-2xl">
                              <Save className="w-4 h-4 mr-2" /> GUARDAR CAMBIOS
                            </Button>
                            <Button variant="ghost" onClick={() => { setIsEditingAcm(false); setIsNewAcm(false); }} className="font-bold text-muted-foreground hover:text-foreground h-12">
                              <X className="w-4 h-4 mr-2" /> CANCELAR
                            </Button>
                          </>
                        )}
                        <Button variant="outline" onClick={() => setSubVistaAcm("dias")} className="font-bold border-border h-12 rounded-2xl px-6">
                          <ArrowLeft className="w-4 h-4 mr-2" /> VOLVER
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* CALCULADORA DE SUPERFICIE */}
                      <Card className="lg:col-span-2 border-none shadow-2xl overflow-hidden rounded-[2rem] bg-card">
                        <CardHeader className="bg-[#4472C4] text-white py-5 px-8 flex flex-row justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Ruler className="h-5 w-5 opacity-50" />
                            <CardTitle className="text-sm font-black uppercase italic tracking-widest">Calculadora de Superficie</CardTitle>
                          </div>
                          <div className="flex items-center gap-3 bg-card/10 p-2 rounded-xl border border-white/20">
                            <span className="text-[10px] font-black uppercase">Tipo de Cambio</span>
                            {isEditingAcm ?
                              <Input type="number" value={data.tipoCambio} onChange={(e) => handleAcmChange('tipoCambio', Number(e.target.value))} className="h-8 w-24 bg-card text-foreground font-black border-none text-center" />
                              : <span className="font-mono font-bold text-lg">Gs. {tc.toLocaleString('es-PY')}</span>
                            }
                          </div>
                        </CardHeader>
                        <Table>
                          <TableHeader className="bg-muted uppercase text-[10px] font-black text-muted-foreground">
                            <TableRow>
                              <TableHead className="pl-8">Detalle de Activo</TableHead>
                              <TableHead className="text-center">M2 Totales</TableHead>
                              <TableHead className="text-right">Valuación Gs/M2</TableHead>
                              <TableHead className="text-right pr-8">Subtotal Gs.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="font-bold">
                            <TableRow className="border-b border-slate-50">
                              <TableCell className="pl-8 text-muted-foreground italic">Superficie Terreno</TableCell>
                              <TableCell className="text-center">
                                {isEditingAcm ? <Input type="number" value={data.m2Terreno} onChange={(e) => handleAcmChange('m2Terreno', Number(e.target.value))} className="h-9 w-24 mx-auto text-center font-bold" /> : data.m2Terreno}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditingAcm ? <Input type="number" value={data.precioM2Terreno} onChange={(e) => handleAcmChange('precioM2Terreno', Number(e.target.value))} className="h-9 w-32 ml-auto text-right font-bold" /> : `Gs. ${data.precioM2Terreno.toLocaleString()}`}
                              </TableCell>
                              <TableCell className="text-right pr-8 text-blue-600 font-black">Gs. {totalTerreno.toLocaleString()}</TableCell>
                            </TableRow>
                            <TableRow className="border-b border-slate-50">
                              <TableCell className="pl-8 text-muted-foreground italic">Ãrea Construida</TableCell>
                              <TableCell className="text-center">
                                {isEditingAcm ? <Input type="number" value={data.m2Construccion} onChange={(e) => handleAcmChange('m2Construccion', Number(e.target.value))} className="h-9 w-24 mx-auto text-center font-bold" /> : data.m2Construccion}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditingAcm ? <Input type="number" value={data.precioM2Construccion} onChange={(e) => handleAcmChange('precioM2Construccion', Number(e.target.value))} className="h-9 w-32 ml-auto text-right font-bold" /> : `Gs. ${data.precioM2Construccion.toLocaleString()}`}
                              </TableCell>
                              <TableCell className="text-right pr-8 text-blue-600 font-black">Gs. {totalConstruccion.toLocaleString()}</TableCell>
                            </TableRow>
                            <TableRow className="bg-blue-50/50">
                              <TableCell colSpan={3} className="pl-8 text-right font-black text-blue-700 italic text-xl uppercase tracking-tighter">Precio ACM Sugerido de Mercado</TableCell>
                              <TableCell className="text-right pr-8 font-black text-blue-700 text-3xl tracking-tighter italic">Gs. {data.resumenVentaGs.toLocaleString()}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </Card>

                      {/* LIQUIDACIÃƒâ€œN DE EGRESOS */}
                      <Card className="border-2 border-slate-900 shadow-[10px_10px_0px_0px_#0F172A] rounded-[2rem] overflow-hidden bg-card">
                        <CardHeader className="bg-slate-900 text-white py-5 px-6 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-orange-400" />
                          <CardTitle className="text-xs font-black uppercase italic tracking-widest">Liquidación Proyectada</CardTitle>
                        </CardHeader>
                        <Table className="text-xs font-bold uppercase">
                          <TableBody>
                            <TableRow className="text-blue-600 border-b border-border"><TableCell className="pl-6">Comisión Inmob. (5.5%)</TableCell><TableCell className="text-right pr-6">Gs. {data.resumenComisionGs.toLocaleString()}</TableCell></TableRow>
                            <TableRow className="border-b border-border"><TableCell className="pl-6">Gastos Escribanía (1.25%)</TableCell><TableCell className="text-right pr-6">Gs. {data.resumenEscribaniaGs.toLocaleString()}</TableCell></TableRow>
                            <TableRow className="border-b border-border"><TableCell className="pl-6">Retención Renta (2.4%)</TableCell><TableCell className="text-right pr-6">Gs. {data.resumenRetencionGs.toLocaleString()}</TableCell></TableRow>
                            <TableRow className="bg-green-600 text-white h-20">
                              <TableCell className="pl-6 font-black italic text-sm">NETO PROPIETARIO</TableCell>
                              <TableCell className="text-right pr-6 font-black text-xl italic tracking-tighter">Gs. {data.resumenNetoGs.toLocaleString()}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </Card>
                    </div>

                    {/* SECCIÃƒâ€œN TESTIGOS (MEJORADA) */}
                    <section className="space-y-8">
                      <div className="flex justify-between items-center border-b-4 border-slate-900 pb-4 uppercase italic">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-3 bg-blue-600 rounded-full" />
                          <h2 className="text-4xl font-black tracking-tighter">Testigos de Mercado</h2>
                        </div>
                        {isEditingAcm && (
                          <Button
                            onClick={() => {
                              const newRefs = [...data.inmuebleReferencias, { referenciaId: 0, precioVentaGs: 0, m2Terreno: 0, linkUrl: "" }];
                              setEditFormData({ ...data, inmuebleReferencias: newRefs });
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-black h-12 shadow-xl rounded-2xl px-8"
                          >
                            <Plus className="mr-2 h-5 w-5 text-orange-400" /> AGREGAR TESTIGO
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {data.inmuebleReferencias.map((ref, idx) => (
                          <div key={idx} className="relative group bg-card border border-border rounded-[2rem] overflow-hidden flex shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all duration-500">
                            {isEditingAcm && (
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-4 right-4 h-8 w-8 z-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const nR = data.inmuebleReferencias.filter((_, i) => i !== idx);
                                  setEditFormData({ ...data, inmuebleReferencias: nR });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            <div className="w-[80px] bg-slate-900 text-white font-black text-center py-6 flex flex-col justify-center italic">
                              <span className="text-[10px] text-muted-foreground uppercase">Ref</span>
                              <span className="text-4xl text-orange-400">{idx + 1}</span>
                            </div>
                            <div className="flex-1 p-8 space-y-6">
                              <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Precio de Publicación</label>
                                  {isEditingAcm ?
                                    <Input type="number" value={ref.precioVentaGs} onChange={(e) => handleRefChange(idx, 'precioVentaGs', Number(e.target.value))} className="h-10 font-black border-border bg-muted" />
                                    : <div className="text-xl font-black italic tracking-tighter">Gs. {ref.precioVentaGs.toLocaleString()}</div>
                                  }
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Superficie Terreno</label>
                                  {isEditingAcm ?
                                    <Input type="number" value={ref.m2Terreno} onChange={(e) => handleRefChange(idx, 'm2Terreno', Number(e.target.value))} className="h-10 font-black border-border bg-muted" />
                                    : <div className="text-xl font-black italic text-blue-600">{ref.m2Terreno} mÃ‚Â²</div>
                                  }
                                </div>
                              </div>

                              <div className="pt-6 border-t border-border flex items-center justify-between">
                                <div className="bg-muted px-4 py-2 rounded-2xl flex flex-col shadow-inner">
                                  <span className="text-[9px] font-black text-muted-foreground uppercase">Ratio MÃ‚Â²</span>
                                  <span className="text-xs font-black text-muted-foreground">Gs. {Math.round(ref.precioVentaGs / (ref.m2Terreno || 1)).toLocaleString()}</span>
                                </div>

                                {isEditingAcm ?
                                  <Input placeholder="URL de referencia..." value={ref.linkUrl} onChange={(e) => handleRefChange(idx, 'linkUrl', e.target.value)} className="h-10 text-xs w-[60%] font-medium" />
                                  : (ref.linkUrl && (
                                    <Button variant="outline" size="sm" className="rounded-xl border-border text-blue-600 font-bold hover:bg-blue-50" asChild>
                                      <a href={ref.linkUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-3 w-3 mr-2" /> VER FUENTE
                                      </a>
                                    </Button>
                                  ))
                                }
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="flex justify-center pt-16">
                      <Button
                        variant="ghost"
                        onClick={() => setSubVistaAcm("dias")}
                        className="text-muted-foreground hover:text-foreground font-bold h-14 hover:bg-card rounded-full px-12 transition-all"
                      >
                        <ArrowLeft className="mr-3 h-5 w-5" /> Volver al Listado General
                      </Button>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* VISTA CONSOLIDADO (CAPTACONES / MAPA) */}
          {vistaActual === "consolidado" && (
            <div className="space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">

              <div className="bg-card p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-border flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-[0.2em]">
                    <Sparkles className="h-3 w-3" /> Inteligencia OIMA
                  </div>
                  <h2 className="text-4xl font-black italic text-foreground tracking-tighter uppercase leading-none">Mercado Global</h2>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={() => setIsModalCreacionOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl px-8 h-14 font-black italic text-base transition-all hover:scale-105"
                  >
                    <Plus className="mr-2 h-5 w-5" /> GENERAR CAPTACIÃƒâ€œN
                  </Button>

                  {(!showSyncPanel && usuarioActivo?.rol?.toUpperCase() === "BROKER") &&
                    <Button
                      onClick={ejecutarScrappingMasivo}
                      disabled={uploading}
                      className="bg-orange-600 hover:bg-orange-700 text-white shadow-xl px-8 h-14 font-black italic text-base transition-all hover:scale-105"
                    >
                      {uploading ? "PROCESANDO..." : <><UploadCloud className="mr-2 h-5 w-5" /> SINCRONIZAR PORTAL âœ¨</>}
                    </Button>
                  }
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="MLSID..." value={filtroMls} onChange={(e) => setFiltroMls(e.target.value)} className="pl-12 bg-card h-16 rounded-2xl font-bold" />
                </div>
                <div className="relative group">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" placeholder="Precio Máx." value={filtroPrecioMax} onChange={(e) => setFiltroPrecioMax(e.target.value)} className="pl-12 bg-card h-16 rounded-2xl font-bold" />
                </div>
              </div>

              <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-card">
                <CardHeader className="bg-muted/50 border-b px-8 py-6 flex flex-row justify-between items-center">
                  <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-blue-600" /><CardTitle className="text-base font-black uppercase italic text-foreground">Mapa de Captaciones Aprobadas</CardTitle></div>
                  <span className="bg-card border border-border text-muted-foreground text-[11px] px-4 py-2 rounded-full font-black shadow-sm">{propiedadesFiltradas.length} RESULTADOS</span>
                </CardHeader>
                <CardContent className="p-0"><div className="h-[700px] w-full"><MapaPropiedades propiedades={propiedadesFiltradas} onUpdatePropiedad={onUpdatePropiedad} onDeletePropiedad={onDeletePropiedad} /></div></CardContent>
              </Card>
            </div>
          )}

          {/* VISTA ADMINISTRACIÃƒâ€œN */}
          {vistaActual === "aprobacion" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-card p-6 rounded-3xl shadow-xl border-l-8 border-red-600">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Panel de Aprobaciones</h2>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest italic flex items-center gap-2"><Info className="w-3 h-3" /> Revisa las captaciones manuales generadas por tu equipo</p>
              </div>
              <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted uppercase text-[10px] font-black">
                    <TableRow><TableHead>Fecha</TableHead><TableHead>Agente</TableHead><TableHead>Propiedad</TableHead><TableHead className="text-right pr-8">Acciones</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {propiedadesPendientes.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-bold italic">No hay captaciones pendientes de revisión.</TableCell></TableRow>) : (
                      propiedadesPendientes.map((p) => (
                        <TableRow key={p.propiedadId} className="hover:bg-red-50/30">
                          <TableCell>{new Date(p.fechaCreacion || Date.now()).toLocaleDateString()}</TableCell>
                          <TableCell className="font-bold uppercase text-foreground">{p.agenteCreadorNombre || "Agente OIMA"}</TableCell>
                          <TableCell className="font-bold text-blue-700 uppercase">{p.titulo}</TableCell>
                          <TableCell className="text-right pr-8 space-x-2">
                            <Button variant="ghost" size="sm" className="text-red-500 font-bold" onClick={() => onDeletePropiedad(p.propiedadId)}><XCircle className="w-4 h-4 mr-1" /> Rechazar</Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 font-black italic" onClick={() => handleAprobarPropiedad(p.propiedadId)}><CheckCircle className="w-4 h-4 mr-1" /> APROBAR</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
          {/* VISTA GESTIÃƒâ€œN DE USUARIOS (Solo visible para Admin) */}
          {vistaActual === "usuarios" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-card p-8 rounded-3xl shadow-xl flex justify-between items-center border border-border">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Gestión de Usuarios y Roles</h2>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Control de accesos y permisos del ecosistema OIMA</p>
                </div>
                <Button
                  onClick={() => {
                    const verif = verificarPermisoGranular("conf_usuarios");
                    if (!verif.permitido) {
                      setAlertaRestriccion({ visible: true, mensaje: verif.mensaje, permisoNombre: verif.permisoNombre || "Gestión de Colaboradores y Roles" });
                      return;
                    }
                    setIsModalRegistroOpen(true);
                  }}
                  className="bg-slate-900 text-white rounded-2xl font-bold px-6 h-12">
                  <Plus className="mr-2 h-4 w-4" /> REGISTRAR USUARIO
                </Button>
              </div>

              <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/50 uppercase text-[10px] font-black tracking-widest text-muted-foreground">
                    <TableRow>
                      {/* 5 Cabeceras */}
                      <TableHead className="pl-8">Usuario</TableHead>
                      <TableHead>Rol Asignado</TableHead>
                      <TableHead>Módulos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right pr-8">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosAdmin.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center text-muted-foreground font-bold italic">
                          Sincronizando con base de datos OIMA...
                        </TableCell>
                      </TableRow>
                    ) : (
                      usuariosAdmin.map((u) => (
                        <TableRow key={u.usuarioId} className="group hover:bg-muted transition-all">

                          {/* Columna 1: Avatar + Info */}
                          <TableCell className="pl-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600 shadow-sm">
                                {u.iniciales}
                              </div>
                              <div>
                                <p className="font-black text-foreground uppercase italic text-sm tracking-tighter flex items-center gap-1.5">
                                  {u.nombre}
                                  {u.email?.toLowerCase().includes("gmail.com") && (
                                    <span className="bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Gmail</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-bold">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Columna 2: SELECTOR DE ROL */}
                          <TableCell>
                            <select
                              value={u.rol}
                              onChange={(e) => handleCambiarRol(u.usuarioId, e.target.value)}
                              className="bg-muted border-none rounded-lg text-[10px] font-black uppercase p-2 focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none transition-all hover:bg-muted"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="BROKER">BROKER</option>
                              <option value="AGENTE">AGENTE</option>
                              <option value="VISUALIZADOR">VISUALIZADOR</option>
                            </select>
                          </TableCell>

                          {/* Columna 3: MÓDULOS PERMITIDOS */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[260px]">
                              {u.email?.toLowerCase() === "rody.moran.py@gmail.com" || u.email?.toLowerCase() === "adminagus@oima.com.py" ? (
                                <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" /> TODOS (TOTAL)
                                </span>
                              ) : (
                                ["Condominio Agus", "Actividades", "Facturación", "Administración", "Configuración"].map((mod, idx) => (
                                  <span key={idx} className="bg-muted text-foreground font-extrabold text-[8px] px-2 py-0.5 rounded border border-border uppercase">
                                    {mod}
                                  </span>
                                ))
                              )}
                            </div>
                          </TableCell>

                          {/* Columna 4: Estado */}
                          <TableCell>
                            <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase shadow-sm ${u.estado === 'ACTIVO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                              }`}>
                              {u.estado}
                            </span>
                          </TableCell>

                          {/* Columna 5: Acciones */}
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`text-xs font-black rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                                  usuarioPermisosId === u.usuarioId ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-muted text-foreground hover:bg-muted"
                                }`}
                                onClick={() => setUsuarioPermisosId(u.usuarioId)}
                                title="Desglosar comportamientos por módulo"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" /> Permisos
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl h-8 w-8"
                                onClick={() => {
                                  setUsuarioAEditar(u);
                                  setIsModalEdicionOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl h-8 w-8"
                                onClick={() => handleEliminarUsuario(u.usuarioId, u.nombre)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>

                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* MATRIZ GRANULAR DE COMPORTAMIENTOS POR MÓDULO */}
              <div className="pt-2">
                <PermisosGranularesMatriz
                  usuarios={usuariosAdmin}
                  usuarioSeleccionadoId={usuarioPermisosId || (usuariosAdmin.length > 0 ? usuariosAdmin[0].usuarioId : null)}
                  onSelectUsuario={(id) => setUsuarioPermisosId(id)}
                />
              </div>
            </div>
          )}
        </div>

        {/* MODAL DE REGISTRO PROFESIONAL OIMA */}
        <RegistroUsuarioModal
          isOpen={isModalRegistroOpen}
          onClose={() => setIsModalRegistroOpen(false)}
          empresaId={usuarioActivo?.empresaId || 0}
          rubro={usuarioActivo?.rubro || ""} // Viene del Login que actualizamos
        />

        <EditarUsuarioModal
          isOpen={isModalEdicionOpen}
          onClose={() => setIsModalEdicionOpen(false)}
          usuario={usuarioAEditar}
          onRefresh={cargarListaUsuariosAdmin}
          empresaId={usuarioActivo?.empresaId || 0}
        />

        {/* MODAL DE UPGRADE / PREMIUM */}
        <Dialog open={isModalUpgradeOpen} onOpenChange={setIsModalUpgradeOpen}>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] border border-white/20 shadow-[0_40px_80px_rgba(0,0,0,0.4)] p-0 overflow-hidden bg-card/40 backdrop-blur-3xl">
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black p-10 text-center relative overflow-hidden">
              {/* Decorative background blurs */}
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>

              <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-900 text-[10px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-[0.2em] shadow-lg">
                OIMA Premium
              </div>
              <div className="w-20 h-20 bg-card/5 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-white/10 shadow-inner backdrop-blur-md relative z-10">
                <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
              </div>
              <DialogTitle className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase tracking-tighter relative z-10">
                Módulo Bloqueado
              </DialogTitle>
              <p className="text-muted-foreground font-medium text-sm mt-3 relative z-10">
                Actualiza a <strong className="text-white">OIMA Enterprise</strong> para desbloquear {moduloParaUpgrade?.nombreModulo || "este módulo"} y llevar tus datos al siguiente nivel.
              </p>
            </div>
            <div className="p-8 text-center space-y-6 bg-card/90">
              <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-3xl shadow-sm border border-border/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <h4 className="text-5xl font-black italic text-foreground tracking-tighter relative z-10">
                  <span className="text-xl text-muted-foreground align-top mr-1 font-sans">$</span>
                  99<span className="text-lg text-muted-foreground font-sans tracking-normal">/mes</span>
                </h4>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2 relative z-10">
                  Migración Universal Incluida
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => handleSuscripcion("Stripe")}
                  disabled={isProcessingPayment}
                  className="w-full h-14 rounded-2xl font-black tracking-[0.1em] uppercase italic text-sm shadow-xl shadow-indigo-600/20 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white transition-all hover:scale-[1.02]"
                >
                  {isProcessingPayment ? "Procesando..." : "Desbloquear con Stripe (Global)"}
                </Button>
                <Button
                  onClick={() => handleSuscripcion("Bancard")}
                  disabled={isProcessingPayment}
                  variant="outline"
                  className="w-full h-14 rounded-2xl font-black tracking-[0.1em] uppercase italic text-sm border-2 border-border text-muted-foreground hover:bg-muted transition-all hover:scale-[1.02]"
                >
                  {isProcessingPayment ? "Procesando..." : "Pagar con vPOS Bancard (Local)"}
                </Button>
                <Button variant="ghost" onClick={() => setIsModalUpgradeOpen(false)} className="w-full h-12 rounded-xl font-bold text-muted-foreground hover:text-muted-foreground">
                  Quizás más tarde
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODALES */}
        <NuevaCaptacionModal
          isOpen={isModalCreacionOpen}
          onClose={() => setIsModalCreacionOpen(false)}
          onSave={handleGuardarNuevaCaptacion}
          empresaId={empresaId}
          mlsidSugerido={sugerirSiguienteMLSID()}
        />

        <footer className="h-10 border-t border-border flex items-center justify-end px-8 bg-card text-muted-foreground select-none">
          <span className="text-foreground font-black tracking-widest text-[9px] uppercase italic">GESCO SYSTEMS</span>
        </footer>

        {/* DEBUG PANEL (FLOTANTE) */}
        {canSeeGestionUsuarios && !isUsuarioCondominio && (
          <div className="fixed bottom-6 right-6 bg-slate-900/90 backdrop-blur-md border border-white/10 text-white p-4 rounded-2xl shadow-2xl z-50 flex flex-col gap-3 opacity-30 hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-black tracking-[0.2em] text-yellow-400 uppercase italic flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Dev Tools
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] font-black tracking-widest uppercase text-foreground bg-card hover:bg-muted"
                onClick={() => {
                  setModuloParaUpgrade({ moduloId: 99, nombreModulo: "Módulo Premium AI", rubroAsociado: "", icono: "", rutaFrontend: "" });
                  setIsModalUpgradeOpen(true);
                }}
              >
                Ã°Å¸â€â€™ Simular Fin Demo
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-[10px] font-black tracking-widest uppercase border-none text-white shadow-lg"
                onClick={async () => {
                  toast.info("Iniciando IA Web Scraper...", { description: "Espere mientras se extraen datos del sistema origen..." });
                  try {
                    const res = await fetch(`http://localhost:5034/api/Migration/migrar-universal`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ TargetUrl: "https://sistema-viejo.com.py", EmpresaId: empresaId })
                    });
                    if (res.ok) {
                      toast.success("âœ… IA Scraper Finalizado", { description: "Datos inyectados en la BD de OIMA." });
                    } else {
                      toast.error("Error en Web Scraper");
                    }
                  } catch (e) {
                    toast.error("Error de Conexión Scraper");
                  }
                }}
              >
                Ã°Å¸Â¤â€“ Test IA Scraper
              </Button>
            </div>
          </div>
        )}

        <ModalAccesoRestringido
          isOpen={alertaRestriccion.visible}
          onClose={() => setAlertaRestriccion({ visible: false })}
          mensaje={alertaRestriccion.mensaje}
          permisoNombre={alertaRestriccion.permisoNombre}
        />
      </main>
    </div>
  );
}

