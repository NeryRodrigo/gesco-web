"use client";

import { API_BASE, installAuthFetch, getAuthToken, clearAuthToken } from "@/lib/api";
import { useEffect, useState, useMemo, ReactNode } from "react";
import { 
  AlertTriangle, LayoutDashboard, ChevronRight, MapPin, Edit, Trash2, ArrowLeft, 
  ExternalLink, Save, X, DollarSign, Ruler, ShieldCheck, XCircle, 
  Search, Filter, Sparkles, User, Building2, Wallet, LogOut, 
  Activity, Users, FileText, Cpu, Lock, History, Settings, List, CheckSquare, Menu, Bed
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
import { DetalleUnidadModal } from "./condominio/DetalleUnidadModal";
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
import { FontanaPage } from "./fontana/FontanaPage";
import {
  VordiaResumenOperativo,
} from "./vordia/VordiaInternoShell";
import { VordiaClientesPage } from "./vordia/VordiaClientesPage";
import { VordiaPipelinePage } from "./vordia/VordiaPipelinePage";
import { VordiaContratosPage } from "./vordia/VordiaContratosPage";
import { VordiaIngresosPage } from "./vordia/VordiaIngresosPage";
import { VordiaTareasPage } from "./vordia/VordiaTareasPage";
import { VordiaFlujoCajaPage } from "./vordia/VordiaFlujoCajaPage";
import { VordiaConfiguracionPage } from "./vordia/VordiaConfiguracionPage";
import AuthScreen from "./login/Registro";
import { RegistroUsuarioModal } from "./login/RegistroUsuarioModal";
import { EditarUsuarioModal } from "./login/EditarUsuarioModal";
import { verificarPermisoGranular, ModalAccesoRestringido, PermisosGranularesMatriz } from "./login/PermisosGranularesMatriz";
import {
  saveVordiaSession,
  loadVordiaSession,
  clearVordiaSession,
  isAdminFontana,
} from "@/lib/utils";

type Vista =
  | "inicio"
  | "inmobiliaria"
  | "administracion"
  | "usuarios"
  | "condominio"
  | "fontana"
  | "facturacion"
  | "configuracion"
  | "gastos"
  | "historico_contratos"
  | "aprobacion"
  | "consolidado"
  | "inventario"
  | "caja"
  | "compras"
  | "finanzas"
  | "crm"
  | "rrhh"
  | "analytics"
  | "produccion"
  | "contabilidad"
  | "migrador"
  | "actividades"
  | "vordia_clientes"
  | "vordia_pipeline"
  | "vordia_contratos"
  | "vordia_ingresos"
  | "vordia_tareas"
  | "vordia_caja";

export default function OimaDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState<any>(null);
  const [vistaActual, setVistaActual] = useState<Vista>("inicio"); // Por defecto al Dashboard de 8 tarjetas
  const [sessionReady, setSessionReady] = useState(false);
  const [modulosUsuario, setModulosUsuario] = useState<any[]>([]);
  const [usuariosAdmin, setUsuariosAdmin] = useState<any[]>([]);
  const [isModalRegistroOpen, setIsModalRegistroOpen] = useState(false);
  const [isModalEdicionOpen, setIsModalEdicionOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState<any>(null);
  const [usuarioPermisosId, setUsuarioPermisosId] = useState<number | null>(null);
  const [condoDashboardData, setCondoDashboardData] = useState<any>(null);
  const [alertaRestriccion, setAlertaRestriccion] = useState({ visible: false, mensaje: '', permisoNombre: '' });
  const [fichaUnidad, setFichaUnidad] = useState<{
    id: number;
    code: string;
    condo: string;
    tenant: string | null;
    status: string;
    nisAnde?: string | null;
  } | null>(null);
  const [fichaTab, setFichaTab] = useState<"ficha" | "pagos">("ficha");
  const [isFichaOpen, setIsFichaOpen] = useState(false);

  const empresaId = usuarioActivo?.empresaId || 7;
  const isUsuarioVordia = String(usuarioActivo?.rubro || "").toUpperCase() === "VORDIA";
  const isUsuarioCondominio = !isUsuarioVordia; // Fontana/Agus vs Vordia Interno
  const canManagePasswords = isAdminFontana(usuarioActivo) || isUsuarioVordia;

  // Restaurar sesión al montar (Chrome device mode / resize no debe cerrar sesión)
  useEffect(() => {
    installAuthFetch();
    const saved = loadVordiaSession();
    const token = getAuthToken();
    if (saved?.user && token) {
      setUsuarioActivo(saved.user);
      setIsAuthenticated(true);
      if (saved.vista) setVistaActual(saved.vista as Vista);
    } else if (saved?.user && !token) {
      // Sesión UI sin JWT (tras deploy de seguridad): pedir login de nuevo
      clearVordiaSession();
      clearAuthToken();
    }
    setSessionReady(true);
  }, []);

  // Persistir sesión y vista al cambiar
  useEffect(() => {
    if (!sessionReady) return;
    if (isAuthenticated && usuarioActivo) {
      saveVordiaSession({ user: usuarioActivo, vista: vistaActual });
    }
  }, [sessionReady, isAuthenticated, usuarioActivo, vistaActual]);

  const isUsuarioInmobiliaria = useMemo(() => {
    return usuarioActivo?.rubro === "INMOBILIARIA";
  }, [usuarioActivo]);

  const isUsuarioRetail = useMemo(() => {
    return usuarioActivo?.rubro === "RETAIL";
  }, [usuarioActivo]);

  // Vordia Interno: no mezclar vistas de Fontana/Agus
  useEffect(() => {
    if (!isUsuarioVordia) return;
    const vistasAgus = new Set([
      "condominio", "fontana", "actividades", "facturacion",
      "administracion", "gastos", "historico_contratos",
    ]);
    if (vistasAgus.has(vistaActual)) setVistaActual("inicio");
  }, [isUsuarioVordia, vistaActual]);

  const navegarConPermiso = (nuevaVista: Vista) => {
    const mapaPermisos: Record<string, string> = {
      condominio: "condo_ver_panel",
      fontana: "fontana_ver",
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
    if (!usuarioActivo || isUsuarioVordia) return;
    try {
      const resC = await fetch(`${API_BASE}/api/Dashboard/condominio/${empresaId}`);
      if (resC.ok) setCondoDashboardData(await resC.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isAuthenticated && usuarioActivo) {
      cargarDatos();
      fetch(`${API_BASE}/api/Auth/modulos/${usuarioActivo.id}`)
        .then(res => res.json())
        .then(data => setModulosUsuario(data))
        .catch(console.error);
        
      if (vistaActual === "usuarios") cargarListaUsuariosAdmin();
    }
  }, [isAuthenticated, usuarioActivo, vistaActual, isUsuarioVordia]);

  const cargarListaUsuariosAdmin = async () => {
    const res = await fetch(`${API_BASE}/api/Usuario/lista/${empresaId}`);
    if (res.ok) setUsuariosAdmin(await res.json());
  };

  const limpiarSesionAnde = async () => {
    try {
      await fetch(`${API_BASE}/api/Ande/credenciales`, { method: "DELETE" });
    } catch {
      /* best-effort: no bloquear logout Gesco */
    }
  };

  const handleLogoutConfirmation = () => {
    toast.warning("¿Deseas finalizar tu sesión?", {
      description: "Se cerrará el acceso seguro al ecosistema VORDIA y la sesión ANDE.",
      duration: Infinity,
      action: {
        label: "Cerrar Sesión",
        onClick: async () => {
          await limpiarSesionAnde();
          try {
            sessionStorage.removeItem("vordia.andeLiveByNis");
            sessionStorage.removeItem("vordia.andeSyncAt");
          } catch { /* ignore */ }
          clearVordiaSession();
          clearAuthToken();
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

  if (!sessionReady) {
    return (
      <div className="min-h-dvh bg-[#050B18] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
        Cargando sesión…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLoginSuccess={(user) => {
          setUsuarioActivo(user);
          setIsAuthenticated(true);
          saveVordiaSession({ user, vista: "inicio" });
        }}
      />
    );
  }

  return (
    <div className="flex min-h-dvh bg-[#050B18] text-white font-sans overflow-x-hidden">
      
      {/* SIDEBAR — drawer en móvil; ancho fijo w-72 en escritorio (como antes) */}
      <aside
        className={`
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        flex w-[min(18rem,88vw)] lg:w-72 lg:max-w-none bg-[#080E1E] flex-col border-r border-white/5
        fixed inset-y-0 left-0 z-50 h-full
        transition-transform duration-200 ease-out will-change-transform
        max-lg:pt-[env(safe-area-inset-top)] max-lg:pb-[env(safe-area-inset-bottom)]
        `}
        aria-label="Menú de navegación"
      >

        <button 
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-slate-500 hover:text-white p-2.5 rounded-xl hover:bg-white/5"
          aria-label="Cerrar menú"
        >
          <X size={22} />
        </button>

        <div className="p-6 lg:p-8 flex flex-col items-center">
          
          <div className="mb-6 lg:mb-12 w-full flex justify-start lg:justify-center cursor-pointer" onClick={() => { setVistaActual("inicio"); setIsMobileMenuOpen(false); }}>
            {isUsuarioVordia ? (
              <div className="flex items-center gap-3 w-full justify-start lg:justify-center">
                <img
                  src="/images/ISOTIPO.png"
                  alt="Vordia"
                  className="h-10 w-10 object-contain drop-shadow-[0_0_20px_rgba(0,123,255,0.35)]"
                />
                <span className="text-xl font-black tracking-[0.2em] text-white uppercase">
                  Vordia
                </span>
              </div>
            ) : isUsuarioCondominio ? (
              <img
                src="/fontanas.png"
                alt="Fontana Di Luque"
                className="w-40 lg:w-44 h-auto object-contain drop-shadow-[0_0_25px_rgba(234,179,8,0.25)] transition-transform duration-500 hover:scale-105"
              />
            ) : isUsuarioInmobiliaria ? (
              <img src="/remax-logo.png" alt="REMAX" className="h-12 w-auto object-contain shrink-0" />
            ) : (
              <div className="text-xl font-black italic text-amber-400 tracking-tighter uppercase text-center bg-white/5 py-3 px-6 rounded-2xl border border-white/5 w-full">
                {usuarioActivo?.rubro} ERP
              </div>
            )}
          </div>

          <nav className="w-full space-y-1 overflow-y-auto max-h-[calc(100dvh-280px)] lg:max-h-[calc(100vh-320px)] custom-scrollbar overscroll-contain">
            <p className="text-[10px] font-black uppercase text-[#007bff] tracking-[0.2em] mb-4 lg:mb-6 ml-2">
              {isUsuarioVordia ? "Módulos de Gestión" : "Módulo de gestión"}
            </p>
            
            <div className="space-y-1.5">
              {isUsuarioVordia ? (
                <>
                  <SidebarItem
                    icon={<LayoutDashboard size={18}/>}
                    label="Dashboard"
                    active={vistaActual === "inicio"}
                    onClick={() => { setVistaActual("inicio"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<Users size={18}/>}
                    label="Clientes"
                    active={vistaActual === "vordia_clientes"}
                    onClick={() => { setVistaActual("vordia_clientes"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<List size={18}/>}
                    label="Pipeline"
                    active={vistaActual === "vordia_pipeline"}
                    onClick={() => { setVistaActual("vordia_pipeline"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<FileText size={18}/>}
                    label="Contratos y fees"
                    active={vistaActual === "vordia_contratos"}
                    onClick={() => { setVistaActual("vordia_contratos"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<DollarSign size={18}/>}
                    label="Ingresos y pagos"
                    active={vistaActual === "vordia_ingresos"}
                    onClick={() => { setVistaActual("vordia_ingresos"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<Wallet size={18}/>}
                    label="Flujo de caja"
                    active={vistaActual === "vordia_caja"}
                    onClick={() => { setVistaActual("vordia_caja"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<CheckSquare size={18}/>}
                    label="Tareas"
                    active={vistaActual === "vordia_tareas"}
                    onClick={() => { setVistaActual("vordia_tareas"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<Settings size={18}/>}
                    label="Configuración"
                    active={vistaActual === "configuracion"}
                    onClick={() => { setVistaActual("configuracion"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<ShieldCheck size={18}/>}
                    label="Usuarios / Roles"
                    active={vistaActual === "usuarios"}
                    onClick={() => { setVistaActual("usuarios"); setIsMobileMenuOpen(false); }}
                  />
                </>
              ) : (
                <>
              <SidebarItem 
                icon={<LayoutDashboard size={18}/>} 
                label="Condominio Agus" 
                active={vistaActual === "condominio"} 
                onClick={() => navegarConPermiso("condominio")} 
              />

              <SidebarItem 
                icon={<Bed size={18}/>} 
                label="Fontana" 
                active={vistaActual === "fontana"} 
                onClick={() => navegarConPermiso("fontana")} 
              />

              <SidebarItem 
                icon={<Activity size={18}/>} 
                label="Actividades" 
                active={vistaActual === "actividades"} 
                onClick={() => navegarConPermiso("actividades")} 
              />

              <SidebarItem 
                icon={<Wallet size={18}/>} 
                label="Facturación" 
                active={vistaActual === "facturacion"} 
                onClick={() => navegarConPermiso("facturacion")} 
              />

              <SidebarItem 
                icon={<FileText size={18}/>} 
                label="Administración" 
                active={vistaActual === "administracion"} 
                onClick={() => navegarConPermiso("administracion")} 
              />

              <SidebarItem 
                icon={<ShieldCheck size={18}/>} 
                label="Configuración" 
                active={vistaActual === "configuracion"} 
                onClick={() => navegarConPermiso("configuracion")} 
              />

              <SidebarItem 
                icon={<DollarSign size={18}/>} 
                label="Gastos del condominio" 
                active={vistaActual === "gastos"} 
                onClick={() => navegarConPermiso("gastos")} 
              />

              <SidebarItem 
                icon={<History size={18}/>} 
                label="Histórico de contratos" 
                active={vistaActual === "historico_contratos"} 
                onClick={() => navegarConPermiso("historico_contratos")} 
              />

              <SidebarItem 
                icon={<Users size={18}/>} 
                label="Usuarios / Roles" 
                active={vistaActual === "usuarios"} 
                onClick={() => navegarConPermiso("usuarios")} 
              />
                </>
              )}
            </div>
          </nav>
        </div>

        <div className="mt-auto p-5 lg:p-6 bg-[#0B1222]/50 border-t border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-600/20 shrink-0">
              {usuarioActivo?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden text-left min-w-0">
              <p className="text-xs font-bold truncate text-white">{usuarioActivo?.nombre}</p>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest truncate">{usuarioActivo?.rol}</p>
            </div>
            <button type="button" onClick={handleLogoutConfirmation} className="text-slate-500 hover:text-red-400 transition-colors p-2 shrink-0" aria-label="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/55 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      <main className="flex-1 flex flex-col min-h-screen lg:ml-72 transition-all duration-200 w-full overflow-x-hidden">
      
        <header className="vordia-app-header h-16 lg:h-20 flex items-center justify-between gap-3 px-4 lg:px-12 bg-[#050B18]/90 lg:bg-[#050B18]/80 backdrop-blur-sm lg:backdrop-blur-xl sticky top-0 z-30 border-b border-white/5 max-lg:h-auto max-lg:min-h-[4.5rem] max-lg:pt-[max(0.9rem,env(safe-area-inset-top))] max-lg:pb-3">
          
          <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="vordia-menu-btn lg:hidden text-white bg-white/10 border border-white/15 rounded-2xl flex-shrink-0 flex items-center justify-center touch-manipulation active:scale-95 active:bg-white/20"
              aria-label="Abrir menú"
            >
              <Menu size={28} strokeWidth={2.5} />
            </button>   

            <h2 className="mobile-title lg:text-2xl font-semibold text-white tracking-tight truncate capitalize lg:normal-case">
              {vistaActual === "inicio"
                ? "Resumen operativo"
                : vistaActual === "condominio"
                  ? "Gestión de unidades"
                  : vistaActual === "fontana"
                    ? "Fontana · Hospedaje"
                    : vistaActual === "vordia_clientes"
                      ? "Clientes"
                      : vistaActual === "vordia_pipeline"
                        ? "Pipeline comercial"
                        : vistaActual === "vordia_contratos"
                          ? "Contratos y fees"
                          : vistaActual === "vordia_ingresos"
                            ? "Ingresos y pagos"
                            : vistaActual === "vordia_tareas"
                              ? "Tareas"
                              : vistaActual === "vordia_caja"
                                ? "Flujo de caja"
                              : vistaActual.replace(/_/g, " ")}
            </h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 gap-3 text-slate-400">
                <Search size={16} />
                <input type="text" placeholder="Buscar…" className="bg-transparent border-none outline-none text-xs w-40" />
            </div>
            <button type="button" className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-400" aria-label="Actividad">
                <Activity size={18} />
            </button>
          </div>

        </header>

        <div className="flex-1 p-3 sm:p-4 lg:p-6 pb-2 min-w-0 max-w-full overflow-x-hidden">
          
          {vistaActual === "inicio" && isUsuarioVordia && (
            <VordiaResumenOperativo nombreUsuario={usuarioActivo?.nombre} empresaId={empresaId} />
          )}

          {vistaActual === "inicio" && !isUsuarioVordia && condoDashboardData && (
            <div className="flex flex-col animate-in fade-in duration-300">
              {/* Saludo arriba (móvil y PC): sin logo Vordia */}
              <div className="mb-2.5 bg-[#0C1327] px-5 py-9 min-h-[8rem] rounded-[1.75rem] border border-white/5 shadow-2xl flex items-center">
                <p className="text-slate-300 text-sm lg:text-base font-medium leading-relaxed">
                  Hola{" "}
                  <span className="text-blue-400 font-bold uppercase tracking-widest">
                    {usuarioActivo?.nombre}
                  </span>
                  , el sistema está listo para operar. Elegí una opción en el menú.
                </p>
              </div>

              {/* 8 tarjetas */}
              <div className="mb-1">
                <DashboardCards
                  dashboardData={condoDashboardData}
                  onRefresh={cargarDatos}
                  onOpenFicha={(unidad, tab) => {
                    setFichaUnidad(unidad);
                    setFichaTab(tab === "pagos" ? "pagos" : "ficha");
                    setIsFichaOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {vistaActual === "vordia_clientes" && isUsuarioVordia && (
            <VordiaClientesPage empresaId={empresaId} usuario={usuarioActivo} />
          )}

          {vistaActual === "vordia_pipeline" && isUsuarioVordia && (
            <VordiaPipelinePage empresaId={empresaId} usuario={usuarioActivo} />
          )}

          {vistaActual === "vordia_contratos" && isUsuarioVordia && (
            <VordiaContratosPage empresaId={empresaId} usuario={usuarioActivo} />
          )}

          {vistaActual === "vordia_ingresos" && isUsuarioVordia && (
            <VordiaIngresosPage empresaId={empresaId} usuario={usuarioActivo} />
          )}

          {vistaActual === "vordia_caja" && isUsuarioVordia && (
            <VordiaFlujoCajaPage empresaId={empresaId} />
          )}

          {vistaActual === "vordia_tareas" && isUsuarioVordia && (
            <VordiaTareasPage empresaId={empresaId} usuario={usuarioActivo} />
          )}

          {vistaActual === "condominio" && !isUsuarioVordia && (
             <div className="animate-in fade-in duration-500">
                <CondominioDashboard empresaId={empresaId} usuario={usuarioActivo} />
             </div>
          )}

          {vistaActual === "fontana" && !isUsuarioVordia && (
            <div className="animate-in fade-in duration-500 w-full min-w-0 max-w-full overflow-x-hidden">
              <FontanaPage empresaId={empresaId} usuario={usuarioActivo} />
            </div>
          )}

          {vistaActual === "actividades" && !isUsuarioVordia && <ActividadesVista empresaId={empresaId} />}
          {vistaActual === "facturacion" && !isUsuarioVordia && <FacturacionVista />}
          {vistaActual === "administracion" && !isUsuarioVordia && (
            <div className="relative w-full min-w-0 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 bg-[#0C1327]/50 p-3 sm:p-4">
              <AdministracionPage empresaId={empresaId} usuario={usuarioActivo} />
            </div>
          )}
          {vistaActual === "configuracion" && isUsuarioVordia && (
            <VordiaConfiguracionPage
              empresaId={empresaId}
              usuario={usuarioActivo}
              onNavigate={(vista) => setVistaActual(vista as Vista)}
            />
          )}
          {vistaActual === "configuracion" && !isUsuarioVordia && <ConfiguracionPage empresaId={empresaId} />}
          {vistaActual === "gastos" && !isUsuarioVordia && <GastosPage empresaId={empresaId} />}
          {vistaActual === "historico_contratos" && !isUsuarioVordia && <HistoricoContratosPage empresaId={empresaId} />}
          {vistaActual === "usuarios" && (
            <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-[#0C1327] p-5 sm:p-8 rounded-[1.75rem] sm:rounded-[2rem] border border-white/5">
                 <h2 className="text-xl sm:text-2xl font-bold italic uppercase tracking-tighter">Usuarios y roles</h2>
                 <Button onClick={() => setIsModalRegistroOpen(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold w-full sm:w-auto">Registrar usuario</Button>
               </div>
               <div className="mt-4 sm:mt-8 w-full max-w-full min-w-0">
                  <PermisosGranularesMatriz
                    usuarios={usuariosAdmin}
                    usuarioSeleccionadoId={usuarioPermisosId}
                    onSelectUsuario={(id) => setUsuarioPermisosId(id)}
                    canManagePasswords={canManagePasswords}
                    onEditUsuario={(u) => {
                      setUsuarioAEditar(u);
                      setIsModalEdicionOpen(true);
                    }}
                  />
               </div>
            </div>
          )}
        </div>

        <footer className="w-full pt-3 px-4 lg:px-12 flex justify-end items-center no-print min-h-[5.25rem] pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-600/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <img 
              src="/images/VORDIA HORIZONTAL.png" 
              alt="Vordia" 
              className="h-8 lg:h-9 w-auto max-w-[170px] lg:max-w-[180px] object-contain relative z-10 transition-transform duration-500 group-hover:scale-105 shrink-0"
            />
          </div>
        </footer>
      </main>

      <RegistroUsuarioModal isOpen={isModalRegistroOpen} onClose={() => setIsModalRegistroOpen(false)} empresaId={empresaId} rubro={usuarioActivo?.rubro || ""} />
      <EditarUsuarioModal
        isOpen={isModalEdicionOpen}
        onClose={() => setIsModalEdicionOpen(false)}
        usuario={usuarioAEditar}
        onRefresh={cargarListaUsuariosAdmin}
        empresaId={empresaId}
        canChangePassword={canManagePasswords}
      />
      <ModalAccesoRestringido isOpen={alertaRestriccion.visible} onClose={() => setAlertaRestriccion({ ...alertaRestriccion, visible: false })} mensaje={alertaRestriccion.mensaje} permisoNombre={alertaRestriccion.permisoNombre} />
      <DetalleUnidadModal
        isOpen={isFichaOpen}
        onClose={() => {
          setIsFichaOpen(false);
          setFichaUnidad(null);
        }}
        unidad={fichaUnidad}
        initialTab={fichaTab}
        onUpdate={async (patch) => {
          if (patch && fichaUnidad) {
            setFichaUnidad({
              ...fichaUnidad,
              ...(patch.nisAnde !== undefined ? { nisAnde: patch.nisAnde } : {}),
              ...(patch.code !== undefined ? { code: patch.code } : {}),
            });
          }
          await cargarDatos();
        }}
      />
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
        ? 'bg-[#007bff] text-white shadow-lg shadow-[#007bff]/30 font-bold' 
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>
        {icon}
      </div>
      <span className={`text-[11px] sm:text-xs uppercase italic tracking-tight text-left leading-snug ${active ? 'text-white' : ''}`}>{label}</span>
    </button>
  );
}
