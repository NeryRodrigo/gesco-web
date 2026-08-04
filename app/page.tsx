"use client";
import { useEffect, useState, useMemo, ReactNode } from "react";
import { 
  AlertTriangle, LayoutDashboard, ChevronRight, MapPin, Edit, Trash2, ArrowLeft, 
  ExternalLink, Save, X, DollarSign, Ruler, ShieldCheck, XCircle, 
  Search, Filter, Sparkles, User, Building2, Wallet, LogOut, 
  Activity, Users, FileText, Cpu, Lock, History, Settings, List, CheckSquare, Menu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// --- VISTAS E INTERFACES ---
import { AdministracionPage } from "./condominio/AdministracionPage";
import { ActividadesVista } from "./condominio/ActividadesVista";
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
import AuthScreen from "./login/Registro";
import { RegistroUsuarioModal } from "./login/RegistroUsuarioModal";
import { EditarUsuarioModal } from "./login/EditarUsuarioModal";
import { verificarPermisoGranular, ModalAccesoRestringido, PermisosGranularesMatriz } from "./login/PermisosGranularesMatriz";

type Vista = "inicio" | "inmobiliaria" | "administracion" | "usuarios" | "condominio" | "facturacion" | "configuracion" | "gastos" | "historico_contratos" | "aprobacion" | "consolidado" | "inventario" | "caja" | "compras" | "finanzas" | "crm" | "rrhh" | "analytics" | "produccion" | "contabilidad" | "migrador" | "actividades";

export default function OimaDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState<any>(null);
  const [vistaActual, setVistaActual] = useState<Vista>("inicio"); // Por defecto al Dashboard de 8 tarjetas
  const [modulosUsuario, setModulosUsuario] = useState<any[]>([]);
  const [usuariosAdmin, setUsuariosAdmin] = useState<any[]>([]);
  const [isModalRegistroOpen, setIsModalRegistroOpen] = useState(false);
  const [isModalEdicionOpen, setIsModalEdicionOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState<any>(null);
  const [usuarioPermisosId, setUsuarioPermisosId] = useState<number | null>(null);
  const [condoDashboardData, setCondoDashboardData] = useState<any>(null);
  const [alertaRestriccion, setAlertaRestriccion] = useState({ visible: false, mensaje: '', permisoNombre: '' });

  const empresaId = usuarioActivo?.empresaId || 7;
  const isUsuarioCondominio = true; // Forzado según tu lógica

  const isUsuarioInmobiliaria = useMemo(() => {
    return usuarioActivo?.rubro === "INMOBILIARIA";
  }, [usuarioActivo]);

  const isUsuarioRetail = useMemo(() => {
    return usuarioActivo?.rubro === "RETAIL";
  }, [usuarioActivo]);

  const navegarConPermiso = (nuevaVista: Vista) => {
    const mapaPermisos: Record<string, string> = {
      condominio: "condo_ver_panel",
      actividades: "act_ver",
      facturacion: "fact_ver",
      administracion: "admin_ver_reportes",
      configuracion: "conf_ver",
      gastos: "admin_gastos",
      usuarios: "conf_usuarios"
    };

    const permisoRequerido = mapaPermisos[nuevaVista];
    if (permisoRequerido) {
      const verif = verificarPermisoGranular(permisoRequerido);
      if (!verif.permitido) {
        setAlertaRestriccion({ visible: true, mensaje: verif.mensaje || '', permisoNombre: verif.permisoNombre || '' });
        return;
      }
    }
    setVistaActual(nuevaVista);
    setIsMobileMenuOpen(false);
  };

  const cargarDatos = async () => {
    if (!usuarioActivo) return;
    try {
      const resC = await fetch(`http://localhost:5034/api/Dashboard/condominio/${empresaId}`);
      if (resC.ok) setCondoDashboardData(await resC.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isAuthenticated && usuarioActivo) {
      cargarDatos();
      fetch(`http://localhost:5034/api/Auth/modulos/${usuarioActivo.id}`)
        .then(res => res.json())
        .then(data => setModulosUsuario(data))
        .catch(console.error);
        
      if (vistaActual === "usuarios") cargarListaUsuariosAdmin();
    }
  }, [isAuthenticated, usuarioActivo, vistaActual]);

  const cargarListaUsuariosAdmin = async () => {
    const res = await fetch(`http://localhost:5034/api/Usuario/lista/${empresaId}`);
    if (res.ok) setUsuariosAdmin(await res.json());
  };

  const handleLogoutConfirmation = () => {
    /*if(confirm("¿Deseas cerrar tu sesión segura?")) {
      setIsAuthenticated(false);
      setUsuarioActivo(null);
    }*/
    toast.warning("¿Deseas finalizar tu sesión?", {
      description: "Se cerrará el acceso seguro al ecosistema VORDIA.",
      duration: Infinity, // Se queda fijo hasta que el usuario decida
      action: {
        label: "Cerrar Sesión",
        onClick: () => {
          setIsAuthenticated(false);
          setUsuarioActivo(null);
          setVistaActual("inicio");
          toast.success("Sesión finalizada correctamente");
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => toast.dismiss(),
      },
    });
  };

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={(user) => { setUsuarioActivo(user); setIsAuthenticated(true); }} />;
  }

  return (
    <div className="flex min-h-screen bg-[#050B18] text-white font-sans overflow-x-hidden">
      
      {/* SIDEBAR ESTILO PREMIUM */}
      <aside className={`
        ${isMobileMenuOpen ? 'flex' : 'hidden'} 
        lg:flex w-72 bg-[#080E1E] flex-col border-r border-white/5 fixed h-full z-50 
        transition-all duration-300
        `}>

        {/* BOTÓN PARA CERRAR (X) - AGREGAR ESTO */}
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-5 right-5 text-slate-500 hover:text-white p-2"
        >
          <X size={24} />
        </button>

        <div className="p-8 flex flex-col items-center">
          
          {/* 1. LOGO VORDIA (Cabecera sutil) */}
          {/*
          <div className="mb-6 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
            <img 
              src="/images/VORDIA HORIZONTAL.png" 
              alt="VORDIA Logo" 
              className="h-6 w-auto object-contain" 
            />
          </div>
          */}
          {/* 2. LOGO FONTANA (Protagonista principal) */}
          <div className="mb-12 w-full flex justify-center cursor-pointer" onClick={() => setVistaActual("inicio")}>
            {isUsuarioCondominio ? (
              <img
                src="/fontanas.png"
                alt="Fontana Di Luque Logo"
                /* Sombra ámbar sutil para que brille como en tu imagen */
                //className="w-44 h-auto object-contain drop-shadow-[0_0_25px_rgba(234,179,8,0.25)] transition-transform duration-500 hover:scale-105"
              />
            ) : isUsuarioInmobiliaria ? (
              <img src="/remax-logo.png" alt="REMAX" className="w-32 h-auto object-contain" />
            ) : (
              <div className="text-xl font-black italic text-amber-400 tracking-tighter uppercase text-center bg-white/5 py-3 px-6 rounded-2xl border border-white/5 w-full">
                {usuarioActivo?.rubro} ERP
              </div>
            )}
          </div>

          {/* MENU DE NAVEGACIÓN */}
          <nav className="w-full space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
            {/* Título de sección en el azul de la imagen (#4472C4) */}
            <p className="text-[10px] font-black uppercase text-[#4472C4] tracking-[0.2em] mb-6 ml-2">
              MÓDULO DE GESTIÓN
            </p>
            
            <div className="space-y-1.5">
              <SidebarItem 
                icon={<LayoutDashboard size={18}/>} 
                label="CONDOMINIOS AGUZ" 
                active={vistaActual === "condominio"} 
                onClick={() => navegarConPermiso("condominio")} 
              />

              <SidebarItem 
                icon={<Activity size={18}/>} 
                label="ACTIVIDADES" 
                active={vistaActual === "actividades"} 
                onClick={() => navegarConPermiso("actividades")} 
              />

              <SidebarItem 
                icon={<Wallet size={18}/>} 
                label="FACTURACIÓN" 
                active={vistaActual === "facturacion"} 
                onClick={() => navegarConPermiso("facturacion")} 
              />

              <SidebarItem 
                icon={<FileText size={18}/>} 
                label="ADMINISTRACIÓN" 
                active={vistaActual === "administracion"} 
                onClick={() => navegarConPermiso("administracion")} 
              />

              <SidebarItem 
                icon={<ShieldCheck size={18}/>} 
                label="CONFIGURACIÓN" 
                active={vistaActual === "configuracion"} 
                onClick={() => navegarConPermiso("configuracion")} 
              />

              <SidebarItem 
                icon={<DollarSign size={18}/>} 
                label="GASTOS DEL CONDOMINIO" 
                active={vistaActual === "gastos"} 
                onClick={() => navegarConPermiso("gastos")} 
              />

              <SidebarItem 
                icon={<History size={18}/>} 
                label="HISTÓRICO DE CONTRATOS" 
                active={vistaActual === "historico_contratos"} 
                onClick={() => navegarConPermiso("historico_contratos")} 
              />

              <SidebarItem 
                icon={<Users size={18}/>} 
                label="USUARIOS / ROLES" 
                active={vistaActual === "usuarios"} 
                onClick={() => navegarConPermiso("usuarios")} 
              />
            </div>
          </nav>
        </div>

        {/* FOOTER PERFIL USUARIO */}
        <div className="mt-auto p-6 bg-[#0B1222]/50 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-600/20">
              {usuarioActivo?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden text-left">
              <p className="text-xs font-bold truncate text-white">{usuarioActivo?.nombre}</p>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{usuarioActivo?.rol}</p>
            </div>
            <button onClick={handleLogoutConfirmation} className="text-slate-500 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY - AGREGAR ESTO */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-h-screen lg:ml-72 transition-all duration-300">
        
        {/* Header Superior */}
        <header className="h-20 flex items-center justify-between px-6 md:px-12 bg-[#050B18]/80 backdrop-blur-xl sticky top-0 z-30 border-b border-white/5">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
              {vistaActual === 'inicio' ? 'Resumen Operativo' : 
               vistaActual === 'condominio' ? 'Gestión de Unidades' : vistaActual.toUpperCase().replace('_', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             {/* AGREGAR ESTE BOTÓN AQUÍ */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:bg-white/5 rounded-xl"
              >
                <Menu size={24} />
              </button>   

             <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 gap-3 text-slate-400">
                <Search size={16} />
                <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-xs w-40" />
             </div>
             <button className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-400">
                <Activity size={18} />
             </button>
          </div>
        </header>

        {/* ÁREA DE TRABAJO */}
        <div className="flex-1 p-4 md:p-10">
          
          {/* VISTA INICIO: Muestra las 8 tarjetas dinámicas */}
          {vistaActual === "inicio" && condoDashboardData && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="mb-10 bg-[#0C1327] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="flex items-center gap-6 relative z-10">
                  <div>
                    <h3 className="text-2xl font-bold italic uppercase tracking-tighter text-white">
                      Bienvenido a VORDIA
                    </h3>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                      Hola <span className="text-blue-400 font-bold uppercase tracking-widest">{usuarioActivo?.nombre}</span>, el sistema está listo para operar. Seleccione una opción en el menú lateral.
                    </p>
                  </div>
                </div>
               </div>
               <DashboardCards dashboardData={condoDashboardData} onRefresh={cargarDatos} />
            </div>
          )}

          {/* VISTA CONDOMINIO: Muestra la lista/cuadrícula de unidades */}
          {vistaActual === "condominio" && (
             <div className="animate-in fade-in duration-500">
                <CondominioDashboard empresaId={empresaId} usuario={usuarioActivo} />
             </div>
          )}

          {/* OTRAS VISTAS (Mantenidas) */}
          {vistaActual === "actividades" && <ActividadesVista empresaId={empresaId} />}
          {vistaActual === "facturacion" && <FacturacionVista />}
          {vistaActual === "administracion" && <AdministracionPage empresaId={empresaId} usuario={usuarioActivo} />}
          {vistaActual === "configuracion" && <ConfiguracionPage empresaId={empresaId} />}
          {vistaActual === "gastos" && <GastosPage empresaId={empresaId} />}
          {vistaActual === "historico_contratos" && <HistoricoContratosPage empresaId={empresaId} />}
          {vistaActual === "usuarios" && (
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-[#0C1327] p-8 rounded-[2rem] border border-white/5">
                 <h2 className="text-2xl font-bold italic uppercase tracking-tighter">Usuarios y Roles</h2>
                 <Button onClick={() => setIsModalRegistroOpen(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold">Registrar Usuario</Button>
               </div>
               <div className="bg-[#0C1327] rounded-[2rem] border border-white/5 overflow-hidden">
                 {/* Aquí va tu tabla de usuarios con el mismo estilo */}
               </div>
               <div className="mt-8">
                  <PermisosGranularesMatriz usuarios={usuariosAdmin} usuarioSeleccionadoId={usuarioPermisosId} onSelectUsuario={(id) => setUsuarioPermisosId(id)} />
               </div>
            </div>
          )}
        </div>

        <footer className="w-full py-10 px-12 flex justify-end items-center no-print">
          <div className="relative group">
            {/* Efecto de resplandor azul detrás del logo (opcional, para el look premium) */}
            <div className="absolute inset-0 bg-blue-600/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <img 
              src="/images/VORDIA HORIZONTAL.png" 
              alt="VORDIA Logo" 
              className="h-9 w-auto object-contain relative z-10 transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </footer>
      </main>

      {/* MODALES */}
      <RegistroUsuarioModal isOpen={isModalRegistroOpen} onClose={() => setIsModalRegistroOpen(false)} empresaId={empresaId} rubro={usuarioActivo?.rubro || ""} />
      <EditarUsuarioModal isOpen={isModalEdicionOpen} onClose={() => setIsModalEdicionOpen(false)} usuario={usuarioAEditar} onRefresh={cargarListaUsuariosAdmin} empresaId={empresaId} />
      <ModalAccesoRestringido isOpen={alertaRestriccion.visible} onClose={() => setAlertaRestriccion({ ...alertaRestriccion, visible: false })} mensaje={alertaRestriccion.mensaje} permisoNombre={alertaRestriccion.permisoNombre} />
    </div>
  );
}

// Sub-componente SidebarItem (Estilo Vordia Premium)
function SidebarItem({ icon, label, active = false, onClick }: { icon: ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-300 group ${
        active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold' 
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>
        {icon}
      </div>
      <span className="text-xs uppercase italic tracking-tighter">{label}</span>
    </button>
  );
}