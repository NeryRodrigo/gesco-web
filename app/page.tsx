"use client";

import { API_BASE, installAuthFetch, getAuthToken, clearAuthToken } from "@/lib/api";
import { useEffect, useState, useMemo, ReactNode } from "react";
import { 
  AlertTriangle, LayoutDashboard, ChevronRight, MapPin, Edit, Trash2, ArrowLeft, 
  ExternalLink, Save, X, DollarSign, Ruler, ShieldCheck, XCircle, 
  Search, Filter, Sparkles, User, Building2, Wallet, LogOut, 
  Activity, Users, FileText, Cpu, Lock, History, Settings, List, CheckSquare, Menu, Bed,
  Package, FolderKanban, Truck, BarChart3, CreditCard, LineChart, Sprout, Bell, CalendarDays, ChevronDown
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
import { VordiaHqInicio } from "./vordia/VordiaHqInicio";
import { VordiaHqSidebarNav, VordiaHqEcosistemaWidget, VORDIA_HQ_TITULOS } from "./vordia/VordiaHqNav";
import { VordiaClientesPage } from "./vordia/VordiaClientesPage";
import { VordiaPipelinePage } from "./vordia/VordiaPipelinePage";
import { VordiaContratosPage } from "./vordia/VordiaContratosPage";
import { VordiaIngresosPage } from "./vordia/VordiaIngresosPage";
import { VordiaTareasPage } from "./vordia/VordiaTareasPage";
import { VordiaFinanzasHqPage } from "./vordia/VordiaFinanzasHqPage";
import { VordiaObjetivosPage } from "./vordia/VordiaObjetivosPage";
import { VordiaReportesHqPage } from "./vordia/VordiaReportesHqPage";
import { VordiaProductosPage } from "./vordia/VordiaProductosPage";
import { VordiaProveedoresPage } from "./vordia/VordiaProveedoresPage";
import { VordiaDocumentosPage } from "./vordia/VordiaDocumentosPage";
import { VordiaAutomatizacionesPage } from "./vordia/VordiaAutomatizacionesPage";
import { VordiaPropuestasPage } from "./vordia/VordiaPropuestasPage";
import { VordiaVendedoresPage } from "./vordia/VordiaVendedoresPage";
import { VordiaCuentasPagarPage } from "./vordia/VordiaCuentasPagarPage";
import { VordiaProyectosPage } from "./vordia/VordiaProyectosPage";
import { VordiaConfiguracionPage } from "./vordia/VordiaConfiguracionPage";
import { VordiaRoadmapPage } from "./vordia/VordiaRoadmapPage";
import AgroPage from "./agro/page";
import AuthScreen from "./login/Registro";
import { RegistroUsuarioModal } from "./login/RegistroUsuarioModal";
import { EditarUsuarioModal } from "./login/EditarUsuarioModal";
import { verificarPermisoGranular, ModalAccesoRestringido, PermisosGranularesMatriz, LISTA_PERMISOS } from "./login/PermisosGranularesMatriz";
import {
  saveVordiaSession,
  loadVordiaSession,
  clearVordiaSession,
  isAdminFontana,
} from "@/lib/utils";
import {
  cachePermisosLocal,
  isRolAdministrador,
  puedeVerVistaSidebar,
} from "@/lib/permisosAcceso";

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
  | "vordia_propuestas"
  | "vordia_vendedores"
  | "vordia_alianzas"
  | "vordia_pipeline"
  | "vordia_contratos"
  | "vordia_ingresos"
  | "vordia_tareas"
  | "vordia_caja"
  | "vordia_capital"
  | "vordia_objetivos"
  | "vordia_productos"
  | "vordia_proyectos"
  | "vordia_finanzas_resumen"
  | "vordia_cxc"
  | "vordia_gastos"
  | "vordia_cxp"
  | "vordia_proyecciones"
  | "vordia_proveedores"
  | "vordia_documentos"
  | "vordia_automatizaciones"
  | "vordia_roadmap"
  | "vordia_reportes";

export default function OimaDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState<any>(null);
  const [vistaActual, setVistaActual] = useState<Vista>("inicio"); // Por defecto al Dashboard de 8 tarjetas
  // Pila de pantallas visitadas para el botón "Volver". Solo se apila la
  // navegación que hace el usuario, no las redirecciones por permisos.
  const [historialVistas, setHistorialVistas] = useState<Vista[]>([]);
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
  const [fichaDraft, setFichaDraft] = useState<{ modo?: string; payloadJson: string } | null>(null);
  const [fichasIncKey, setFichasIncKey] = useState(0);

  const empresaId = usuarioActivo?.empresaId || 7;
  const rubroUpper = String(usuarioActivo?.rubro || "").toUpperCase();
  const isUsuarioVordia = rubroUpper === "VORDIA";
  const isUsuarioAgro = rubroUpper === "AGRO";
  const isUsuarioCondominio = !isUsuarioVordia && !isUsuarioAgro; // Fontana/Agus
  const canManagePasswords = isAdminFontana(usuarioActivo) || isUsuarioVordia || isUsuarioAgro || isRolAdministrador(usuarioActivo);
  const esAdminSistema = isRolAdministrador(usuarioActivo);

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

  // Agrofield: solo entorno AGRO (sin Habitat ni HQ)
  useEffect(() => {
    if (!isUsuarioAgro) return;
    if (vistaActual !== "inicio" && vistaActual !== "configuracion" && vistaActual !== "usuarios") {
      setVistaActual("inicio");
    }
  }, [isUsuarioAgro, vistaActual]);

  // Solo ADMIN ve Usuarios/Roles; empleados solo módulos asignados
  useEffect(() => {
    if (!usuarioActivo) return;
    if (vistaActual === "usuarios" && !esAdminSistema) {
      setVistaActual("inicio");
      toast.error("Solo administradores pueden acceder a Usuarios / Roles");
      return;
    }
    if (
      !isUsuarioVordia &&
      !isUsuarioAgro &&
      vistaActual !== "inicio" &&
      !puedeVerVistaSidebar(vistaActual, usuarioActivo, modulosUsuario)
    ) {
      setVistaActual("inicio");
    }
  }, [usuarioActivo, vistaActual, modulosUsuario, esAdminSistema, isUsuarioVordia, isUsuarioAgro]);

  const sincronizarPermisosSesion = async (user: any) => {
    if (!user?.id && !user?.Id) return;
    const uid = user.id ?? user.Id;
    const email = String(user.email || user.Email || "").toLowerCase().trim();
    try {
      const fromLogin: string[] | undefined = user.permisosIds || user.PermisosIds;
      if (Array.isArray(fromLogin) && fromLogin.length > 0 && email) {
        cachePermisosLocal(email, fromLogin);
        return;
      }
      const r = await fetch(`${API_BASE}/api/Usuario/${uid}/permisos`);
      if (r.ok) {
        const data = await r.json();
        const perms: string[] = Array.isArray(data?.permisosIds) ? data.permisosIds : [];
        if (email) {
          if (perms.length > 0) cachePermisosLocal(email, perms);
          else if (isRolAdministrador(user)) cachePermisosLocal(email, LISTA_PERMISOS.map((p) => p.id));
        }
      } else if (email && isRolAdministrador(user)) {
        cachePermisosLocal(email, LISTA_PERMISOS.map((p) => p.id));
      }
    } catch {
      if (email && isRolAdministrador(user)) {
        cachePermisosLocal(email, LISTA_PERMISOS.map((p) => p.id));
      }
    }
  };

  const navegarConPermiso = (nuevaVista: Vista) => {
    if (nuevaVista === "usuarios" && !esAdminSistema) {
      setAlertaRestriccion({
        visible: true,
        mensaje: "Solo usuarios con rol Administrador pueden ver Usuarios / Roles.",
        permisoNombre: "Gestión de Colaboradores y Roles",
      });
      return;
    }
    if (!puedeVerVistaSidebar(nuevaVista, usuarioActivo, modulosUsuario)) {
      setAlertaRestriccion({
        visible: true,
        mensaje: "No tenés este módulo asignado. Pedile al administrador que te habilite el acceso.",
        permisoNombre: String(nuevaVista),
      });
      return;
    }

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
    irA(nuevaVista);
    setIsMobileMenuOpen(false);
  };

  const irA = (nueva: Vista) => {
    if (nueva === vistaActual) return;
    setHistorialVistas((h) => [...h, vistaActual].slice(-25));
    setVistaActual(nueva);
  };

  const volver = () => {
    if (!historialVistas.length) return;
    setVistaActual(historialVistas[historialVistas.length - 1]);
    setHistorialVistas((h) => h.slice(0, -1));
  };

  const tituloDeVista = (v: string) => {
    if (isUsuarioVordia && VORDIA_HQ_TITULOS[v]) return VORDIA_HQ_TITULOS[v];
    if (v === "inicio") return isUsuarioAgro ? "Agrofield · Confinamiento" : "Inicio";
    if (v === "condominio") return "Gestión de unidades";
    if (v === "fontana") return "Fontana · Condominio Agus";
    return v.replace(/_/g, " ");
  };

  const cargarDatos = async () => {
    if (!usuarioActivo || isUsuarioVordia || isUsuarioAgro) return;
    try {
      const resC = await fetch(`${API_BASE}/api/Dashboard/condominio/${empresaId}`);
      if (resC.ok) setCondoDashboardData(await resC.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isAuthenticated && usuarioActivo) {
      cargarDatos();
      void sincronizarPermisosSesion(usuarioActivo);
      fetch(`${API_BASE}/api/Auth/modulos/${usuarioActivo.id}`)
        .then(res => res.json())
        .then(data => setModulosUsuario(Array.isArray(data) ? data : []))
        .catch(console.error);
        
      if (vistaActual === "usuarios") cargarListaUsuariosAdmin();
    }
  }, [isAuthenticated, usuarioActivo, vistaActual, isUsuarioVordia]);

  const cargarListaUsuariosAdmin = async () => {
    const res = await fetch(`${API_BASE}/api/Usuario/lista-completa`);
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
          setHistorialVistas([]);
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
          void sincronizarPermisosSesion(user);
        }}
      />
    );
  }

  return (
    <div className={`flex min-h-dvh bg-[#050B18] text-white font-sans overflow-x-hidden ${isUsuarioVordia ? "vordia-hq" : ""}`}>
      
      {/* SIDEBAR — drawer en móvil; pie fijo para que Cerrar sesión no quede debajo */}
      <aside
        className={`
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        flex w-[min(18rem,88vw)] lg:w-72 lg:max-w-none bg-[#080E1E] flex-col border-r border-white/5
        fixed inset-y-0 left-0 z-50 h-dvh max-h-dvh overflow-hidden
        transition-transform duration-200 ease-out will-change-transform
        max-lg:pt-[env(safe-area-inset-top)] max-lg:pb-[env(safe-area-inset-bottom)]
        `}
        aria-label="Menú de navegación"
      >

        <button 
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 z-10 text-slate-500 hover:text-white p-2.5 rounded-xl hover:bg-white/5"
          aria-label="Cerrar menú"
        >
          <X size={22} />
        </button>

        <div className="shrink-0 px-6 pt-6 pb-3 lg:px-8 lg:pt-8 lg:pb-6 flex flex-col items-center">
          
          <div className={`${isUsuarioVordia ? "mb-3 lg:mb-9" : "mb-4 lg:mb-12"} w-full flex justify-start lg:justify-center cursor-pointer`} onClick={() => { irA("inicio"); setIsMobileMenuOpen(false); }}>
            {isUsuarioVordia ? (
              <div
                role="img"
                aria-label="Vordia HQ"
                className="w-[140px] lg:w-[204px] mx-auto flex flex-col items-center transition-transform duration-500 hover:scale-[1.03]"
              >
                <img
                  src="/images/vordia-hq-isotipo.png"
                  alt=""
                  className="w-[62%] h-auto object-contain drop-shadow-[0_0_28px_rgba(0,123,255,0.4)]"
                />
                <img
                  src="/images/vordia-hq-vordia.png"
                  alt=""
                  className="w-full h-auto object-contain mt-[6%]"
                />
                <img
                  src="/images/vordia-hq-hq.png"
                  alt=""
                  className="w-[22%] h-auto object-contain mt-[5%]"
                />
              </div>
            ) : isUsuarioAgro ? (
              <div className="flex items-center gap-3 w-full justify-start">
                <div className="h-9 w-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sprout size={18} />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-black tracking-[0.28em] text-emerald-400 uppercase">Vordia Agro</p>
                  <p className="text-sm font-bold tracking-[0.08em] text-white uppercase">Agrofield</p>
                </div>
              </div>
            ) : isUsuarioCondominio ? (
              <img
                src="/fontana-png.png"
                alt="Fontana Di Luque"
                className="w-[7.5rem] lg:w-[9.5rem] h-auto object-contain drop-shadow-[0_0_25px_rgba(234,179,8,0.25)] transition-transform duration-500 hover:scale-105"
              />
            ) : isUsuarioInmobiliaria ? (
              <img src="/remax-logo.png" alt="REMAX" className="h-12 w-auto object-contain shrink-0" />
            ) : (
              <div className="text-xl font-black italic text-amber-400 tracking-tighter uppercase text-center bg-white/5 py-3 px-6 rounded-2xl border border-white/5 w-full">
                {usuarioActivo?.rubro} ERP
              </div>
            )}
          </div>
        </div>

          <nav className="flex-1 min-h-0 w-full space-y-1 overflow-y-auto overflow-x-hidden px-6 lg:px-8 custom-scrollbar overscroll-contain">
            {!isUsuarioVordia && (
              <p className="text-[10px] font-black uppercase text-[#007bff] tracking-[0.2em] mb-4 lg:mb-6 ml-2">
                {isUsuarioAgro ? "Agrofield" : "Módulo de gestión"}
              </p>
            )}
            
            <div className="space-y-1.5">
              {isUsuarioVordia ? (
                <VordiaHqSidebarNav
                  vistaActual={vistaActual}
                  showUsuariosRoles={esAdminSistema}
                  onNavigate={(v) => {
                    if (v === "usuarios" && !esAdminSistema) {
                      setAlertaRestriccion({
                        visible: true,
                        mensaje: "Solo administradores pueden ver Usuarios / Roles.",
                        permisoNombre: "Usuarios / Roles",
                      });
                      return;
                    }
                    irA(v as Vista);
                    setIsMobileMenuOpen(false);
                  }}
                />
              ) : isUsuarioAgro ? (
                <>
                  <SidebarItem
                    icon={<Sprout size={18} />}
                    label="Confinamiento"
                    active={vistaActual === "inicio"}
                    onClick={() => { irA("inicio"); setIsMobileMenuOpen(false); }}
                  />
                  <SidebarItem
                    icon={<Settings size={18} />}
                    label="Configuración"
                    active={vistaActual === "configuracion"}
                    onClick={() => { irA("configuracion"); setIsMobileMenuOpen(false); }}
                  />
                  {esAdminSistema && (
                    <SidebarItem
                      icon={<Users size={18} />}
                      label="Usuarios / Roles"
                      active={vistaActual === "usuarios"}
                      onClick={() => { irA("usuarios"); setIsMobileMenuOpen(false); }}
                    />
                  )}
                </>
              ) : (
                <>
              {puedeVerVistaSidebar("condominio", usuarioActivo, modulosUsuario) && (
              <SidebarItem 
                icon={<LayoutDashboard size={18}/>} 
                label="Condominio Agus" 
                active={vistaActual === "condominio"} 
                onClick={() => navegarConPermiso("condominio")} 
              />
              )}

              {puedeVerVistaSidebar("fontana", usuarioActivo, modulosUsuario) && (
              <SidebarItem 
                icon={<Bed size={18}/>} 
                label="Fontana" 
                active={vistaActual === "fontana"} 
                onClick={() => navegarConPermiso("fontana")} 
              />
              )}

              {puedeVerVistaSidebar("actividades", usuarioActivo, modulosUsuario) && (
              <SidebarItem 
                icon={<Activity size={18}/>} 
                label="Actividades" 
                active={vistaActual === "actividades"} 
                onClick={() => navegarConPermiso("actividades")} 
              />
              )}

              {puedeVerVistaSidebar("facturacion", usuarioActivo, modulosUsuario) && (
              <SidebarItem 
                icon={<Wallet size={18}/>} 
                label="Facturación" 
                active={vistaActual === "facturacion"} 
                onClick={() => navegarConPermiso("facturacion")} 
              />
              )}

              {puedeVerVistaSidebar("administracion", usuarioActivo, modulosUsuario) && (
              <SidebarItem 
                icon={<FileText size={18}/>} 
                label="Administración" 
                active={vistaActual === "administracion"} 
                onClick={() => navegarConPermiso("administracion")} 
              />
              )}

              {puedeVerVistaSidebar("configuracion", usuarioActivo, modulosUsuario) && (
              <SidebarItem 
                icon={<ShieldCheck size={18}/>} 
                label="Configuración" 
                active={vistaActual === "configuracion"} 
                onClick={() => navegarConPermiso("configuracion")} 
              />
              )}

              {puedeVerVistaSidebar("gastos", usuarioActivo, modulosUsuario) && (
              <SidebarItem 
                icon={<DollarSign size={18}/>} 
                label="Gastos del condominio" 
                active={vistaActual === "gastos"} 
                onClick={() => navegarConPermiso("gastos")} 
              />
              )}

              {puedeVerVistaSidebar("historico_contratos", usuarioActivo, modulosUsuario) && (
              <SidebarItem 
                icon={<History size={18}/>} 
                label="Histórico de contratos" 
                active={vistaActual === "historico_contratos"} 
                onClick={() => navegarConPermiso("historico_contratos")} 
              />
              )}

              {esAdminSistema && (
              <SidebarItem 
                icon={<Users size={18}/>} 
                label="Usuarios / Roles" 
                active={vistaActual === "usuarios"} 
                onClick={() => navegarConPermiso("usuarios")} 
              />
              )}
                </>
              )}
            </div>
          </nav>

        <div className="shrink-0 p-4 lg:p-6 bg-[#0B1222]/50 border-t border-white/5 space-y-3">
          {isUsuarioVordia && (
            <div className="hidden lg:block">
              <VordiaHqEcosistemaWidget />
            </div>
          )}
          {isUsuarioVordia && (
            <div className="flex items-center justify-between px-0.5">
              <p className="text-[10px] font-semibold tracking-wide text-slate-500">VORDIA HQ</p>
              <p className="text-[10px] text-slate-600">v1.0.0</p>
            </div>
          )}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-600/20 shrink-0">
              {usuarioActivo?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden text-left min-w-0">
              <p className="text-xs font-bold truncate text-white">{usuarioActivo?.nombre}</p>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest truncate">
                {isUsuarioVordia ? (usuarioActivo?.rol || "Dirección") : usuarioActivo?.rol}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogoutConfirmation}
              className="hidden lg:inline-flex text-slate-500 hover:text-red-400 transition-colors p-2 shrink-0"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogoutConfirmation}
            className="lg:hidden w-full flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 active:scale-[0.98] touch-manipulation"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
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

            {historialVistas.length > 0 && (
              <button
                type="button"
                onClick={volver}
                title={`Volver a ${tituloDeVista(historialVistas[historialVistas.length - 1])}`}
                aria-label={`Volver a ${tituloDeVista(historialVistas[historialVistas.length - 1])}`}
                className="shrink-0 flex items-center gap-2 h-10 rounded-xl border border-white/10 bg-white/5 px-2.5 lg:px-3 text-slate-300 hover:text-white hover:border-white/25 transition"
              >
                <ArrowLeft size={17} />
                <span className="hidden lg:block text-xs font-semibold max-w-[11rem] truncate">
                  {tituloDeVista(historialVistas[historialVistas.length - 1])}
                </span>
              </button>
            )}

            {isUsuarioVordia && vistaActual === "inicio" ? (
              <div className="min-w-0">
                <h2 className="text-[20px] lg:text-[24px] font-semibold text-white tracking-tight leading-none">
                  Dashboard Ejecutivo
                </h2>
                <p className="mt-1.5 text-[11px] text-slate-400 truncate">
                  {new Date().toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  <span className="mx-2 text-white/20">|</span>
                  Bienvenido de nuevo
                </p>
              </div>
            ) : (
            <h2 className={`mobile-title lg:text-2xl font-semibold text-white tracking-tight truncate capitalize lg:normal-case ${isUsuarioVordia ? "max-lg:text-[1.05rem]" : ""}`}>
              {isUsuarioVordia && VORDIA_HQ_TITULOS[vistaActual]
                ? VORDIA_HQ_TITULOS[vistaActual]
                : isUsuarioAgro
                  ? (vistaActual === "inicio" ? "Agrofield · Confinamiento" : vistaActual === "configuracion" ? "Configuración" : vistaActual)
                  : vistaActual === "inicio"
                    ? "Resumen operativo"
                    : vistaActual === "condominio"
                      ? "Gestión de unidades"
                      : vistaActual === "fontana"
                        ? "Fontana · Condominio Agus"
                        : vistaActual.replace(/_/g, " ")}
            </h2>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {isUsuarioVordia && (
              <div className="hidden lg:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-300">
                <CalendarDays size={14} className="text-slate-400" />
                <span>
                  {new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("es-PY", { day: "numeric", month: "short", year: "numeric" })}
                  {" - "}
                  {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("es-PY", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <ChevronDown size={14} className="text-slate-500" />
              </div>
            )}
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 gap-3 text-slate-400">
                <Search size={16} />
                <input
                  type="text"
                  placeholder={isUsuarioVordia ? "Buscar en VORDIA HQ…" : "Buscar…"}
                  className="bg-transparent border-none outline-none text-xs w-40"
                />
            </div>
            {isUsuarioVordia ? (
              <>
                <button type="button" className="relative h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-400" aria-label="Notificaciones">
                  <Bell size={18} />
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[#FF4D5A] text-[9px] font-bold text-white flex items-center justify-center">3</span>
                </button>
                <div className="hidden sm:flex items-center gap-2 pl-1">
                  <div className="h-9 w-9 rounded-full bg-[#1687FF] flex items-center justify-center text-xs font-bold text-white">
                    {(usuarioActivo?.nombre || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="leading-tight mr-1">
                    <p className="text-[12px] font-semibold text-white">{usuarioActivo?.rol || "Admin"}</p>
                    <p className="text-[10px] text-slate-400">VORDIA HQ</p>
                  </div>
                  <ChevronDown size={14} className="text-slate-500" />
                </div>
              </>
            ) : (
              <button type="button" className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-400" aria-label="Actividad">
                <Activity size={18} />
              </button>
            )}
          </div>

        </header>

        <div className={`flex-1 p-3 sm:p-4 lg:p-6 pb-2 min-w-0 max-w-full overflow-x-hidden ${isUsuarioVordia ? "vordia-hq-content" : ""}`}>
          
          {vistaActual === "inicio" && isUsuarioVordia && (
            <VordiaHqInicio
              nombreUsuario={usuarioActivo?.nombre}
              empresaId={empresaId}
              onNavigate={(v) => irA(v as Vista)}
            />
          )}

          {vistaActual === "inicio" && isUsuarioAgro && (
            <div className="-m-3 sm:-m-4 lg:-m-6">
              <AgroPage />
            </div>
          )}

          {vistaActual === "inicio" && !isUsuarioVordia && !isUsuarioAgro && condoDashboardData && (
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
                  empresaId={empresaId}
                  fichasIncompletasRefreshKey={fichasIncKey}
                  onOpenFicha={(unidad, tab, draft) => {
                    setFichaUnidad(unidad);
                    setFichaTab(tab === "pagos" ? "pagos" : "ficha");
                    setFichaDraft(draft || null);
                    setIsFichaOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {vistaActual === "vordia_clientes" && isUsuarioVordia && (
            <VordiaClientesPage empresaId={empresaId} usuario={usuarioActivo} />
          )}

          {vistaActual === "vordia_propuestas" && isUsuarioVordia && (
            <VordiaPropuestasPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} />
          )}

          {vistaActual === "vordia_vendedores" && isUsuarioVordia && (
            <VordiaVendedoresPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} />
          )}

          {vistaActual === "vordia_alianzas" && isUsuarioVordia && (
            <VordiaRoadmapPage empresaId={empresaId} usuario={usuarioActivo} tipoInicial="Alianza" />
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
            <VordiaFinanzasHqPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} tabInicial="flujo" />
          )}

          {vistaActual === "vordia_capital" && isUsuarioVordia && (
            <VordiaFinanzasHqPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} tabInicial="capital" />
          )}

          {vistaActual === "vordia_tareas" && isUsuarioVordia && (
            <VordiaTareasPage empresaId={empresaId} usuario={usuarioActivo} />
          )}

          {vistaActual === "vordia_objetivos" && isUsuarioVordia && (
            <VordiaObjetivosPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} />
          )}

          {vistaActual === "vordia_finanzas_resumen" && isUsuarioVordia && (
            <VordiaReportesHqPage
              empresaId={empresaId}
              onNavigate={(v) => irA(v as Vista)}
            />
          )}

          {vistaActual === "vordia_productos" && isUsuarioVordia && (
            <VordiaProductosPage
              empresaId={empresaId}
              onNavigate={(v) => irA(v as Vista)}
            />
          )}
          {vistaActual === "vordia_proyectos" && isUsuarioVordia && (
            <VordiaProyectosPage empresaId={empresaId} usuario={usuarioActivo} />
          )}
          {vistaActual === "vordia_cxc" && isUsuarioVordia && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
                Cuentas por cobrar = contratos activos con pago pendiente o vencido. Gestioná cobros desde aquí o desde Ingresos.
              </div>
              <VordiaContratosPage empresaId={empresaId} usuario={usuarioActivo} />
            </div>
          )}
          {vistaActual === "vordia_gastos" && isUsuarioVordia && (
            <VordiaFinanzasHqPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} tabInicial="empleados" />
          )}
          {vistaActual === "vordia_cxp" && isUsuarioVordia && (
            <VordiaCuentasPagarPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} />
          )}
          {vistaActual === "vordia_proyecciones" && isUsuarioVordia && (
            <VordiaFinanzasHqPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} tabInicial="flujo" />
          )}
          {vistaActual === "vordia_proveedores" && isUsuarioVordia && (
            <VordiaProveedoresPage empresaId={empresaId} />
          )}
          {vistaActual === "vordia_documentos" && isUsuarioVordia && (
            <VordiaDocumentosPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} />
          )}
          {vistaActual === "vordia_automatizaciones" && isUsuarioVordia && (
            <VordiaAutomatizacionesPage empresaId={empresaId} usuarioNombre={usuarioActivo?.nombre} />
          )}
          {vistaActual === "vordia_reportes" && isUsuarioVordia && (
            <VordiaReportesHqPage
              empresaId={empresaId}
              onNavigate={(v) => irA(v as Vista)}
            />
          )}
          {vistaActual === "vordia_roadmap" && isUsuarioVordia && (
            <VordiaRoadmapPage empresaId={empresaId} usuario={usuarioActivo} />
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
              onNavigate={(vista) => irA(vista as Vista)}
            />
          )}
          {vistaActual === "configuracion" && !isUsuarioVordia && <ConfiguracionPage empresaId={empresaId} />}
          {vistaActual === "gastos" && !isUsuarioVordia && <GastosPage empresaId={empresaId} />}
          {vistaActual === "historico_contratos" && !isUsuarioVordia && <HistoricoContratosPage empresaId={empresaId} />}
          {vistaActual === "usuarios" && esAdminSistema && (
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
                    onRefresh={cargarListaUsuariosAdmin}
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
          setFichaDraft(null);
        }}
        unidad={fichaUnidad}
        initialTab={fichaTab}
        empresaId={empresaId}
        usuario={usuarioActivo}
        initialDraft={fichaDraft}
        onDraftsChanged={() => setFichasIncKey((k) => k + 1)}
        onUpdate={async (patch) => {
          if (patch && fichaUnidad) {
            setFichaUnidad({
              ...fichaUnidad,
              ...(patch.nisAnde !== undefined ? { nisAnde: patch.nisAnde } : {}),
              ...(patch.code !== undefined ? { code: patch.code } : {}),
            });
          }
          await cargarDatos();
          setFichasIncKey((k) => k + 1);
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
