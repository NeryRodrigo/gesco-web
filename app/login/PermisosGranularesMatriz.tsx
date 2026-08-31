"use client";


import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, Lock, Unlock, CheckCircle2, XCircle, AlertTriangle, 
  User, Mail, Sparkles, Layers, Settings, Check, X, Info, HelpCircle, 
  Filter, Play, RefreshCw, Send, ShieldAlert, KeyRound 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";
import {
  cachePermisosLocal,
  isRolAdministrador,
  permisoCoincideConModulosAsignados,
  type NombreModuloMatriz,
} from "@/lib/permisosAcceso";

export interface UsuarioAdmin {
  usuarioId: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  requiereCambioPass: boolean;
  iniciales: string;
  modulosIds: number[];
  permisosIds?: string[];
}

export interface PermisoGranular {
  id: string;
  modulo: "Panel" | "Condominio Agus" | "Fontana" | "Actividades" | "Facturación" | "Administración" | "Configuración";
  nombre: string;
  descripcion: string;
}

export const LISTA_PERMISOS: PermisoGranular[] = [
  // Panel (Dashboard Fontana)
  { id: "panel_ver_dashboard", modulo: "Panel", nombre: "Ver Tarjetas del Panel / Dashboard", descripcion: "Acceso al panel principal de indicadores, métricas y vista Fontana" },
  { id: "panel_consultar_ande", modulo: "Panel", nombre: "Consultar Saldos y Corte ANDE", descripcion: "Consulta online de medidores, saldos pendientes y avisos de corte NIS en el Panel" },
  { id: "panel_factura_pdf", modulo: "Panel", nombre: "Descargar Factura PDF de ANDE", descripcion: "Descarga oficial en PDF de facturas de medidores ANDE dentro del Panel" },
  { id: "panel_actualizar", modulo: "Panel", nombre: "Actualizar Sincronización del Panel", descripcion: "Permiso para refrescar y resincronizar en vivo los datos del Panel" },

  // Condominio Agus
  { id: "condo_ver_panel", modulo: "Condominio Agus", nombre: "Ver Panel de Unidades y Dúplex", descripcion: "Acceso a la vista principal de inmuebles, estado de ocupación y contratos" },
  { id: "condo_consultar_ande", modulo: "Condominio Agus", nombre: "Consultar Saldos y Corte ANDE", descripcion: "Consulta online de deudas, consumo histórico y avisos de desconexión NIS" },
  { id: "condo_registrar_pago", modulo: "Condominio Agus", nombre: "Registrar Cobro de Alquiler / Cuota", descripcion: "Permiso para asentar cobros mensuales y emitir comprobantes de ingreso" },
  { id: "condo_morosidad", modulo: "Condominio Agus", nombre: "Gestión de Morosidad y Avisos", descripcion: "Ver listado de inquilinos en mora y generar notificaciones de reclamo" },
  { id: "condo_recibos", modulo: "Condominio Agus", nombre: "Imprimir Recibos de Dinero", descripcion: "Generación e impresión oficial de recibos membretados en PDF" },

  // Fontana (hostel / habitaciones)
  { id: "fontana_ver", modulo: "Fontana", nombre: "Ver módulo Fontana (hostel / habitaciones)", descripcion: "Acceso a alojamientos diarios, semanales y mensuales, calendario y fichas de huéspedes" },
  { id: "fontana_gestionar", modulo: "Fontana", nombre: "Crear / editar / eliminar habitaciones Fontana", descripcion: "Alta y mantenimiento de hasta 3 alojamientos y reservas asociadas" },
  // Actividades
  { id: "act_ver", modulo: "Actividades", nombre: "Ver Tablero de Tareas", descripcion: "Visualización general de tareas operativas y mantenimiento del condominio" },
  { id: "act_crear", modulo: "Actividades", nombre: "Crear y Asignar Actividades", descripcion: "Capacidad para registrar nuevas tareas y asignarlas a colaboradores" },
  { id: "act_editar", modulo: "Actividades", nombre: "Cambiar Estado y Prioridad", descripcion: "Actualizar avance (Pendiente, En Proceso, Finalizado) de las actividades" },
  { id: "act_eliminar", modulo: "Actividades", nombre: "Eliminar Registros de Actividades", descripcion: "Permiso crítico para borrar tareas del historial operativo" },

  // Facturación
  { id: "fact_ver", modulo: "Facturación", nombre: "Ver Historial de Facturación", descripcion: "Acceso al archivo histórico de facturas emitidas, pagadas y pendientes" },
  { id: "fact_crear", modulo: "Facturación", nombre: "Emitir Nueva Factura Legal", descripcion: "Generación de facturas comerciales con cálculo automático de IVA (10% / 5%)" },
  { id: "fact_anular", modulo: "Facturación", nombre: "Anular Comprobantes Fiscales", descripcion: "Autorización para anular facturas erróneas o canceladas por clientes" },
  { id: "fact_enviar_email", modulo: "Facturación", nombre: "Enviar Comprobante por Correo (SMTP)", descripcion: "Envío automatizado de facturas vía e-mail mediante servidor SMTP o Gmail" },
  { id: "fact_descargar_pdf", modulo: "Facturación", nombre: 'Descargar Comprobante PDF', descripcion: "Descarga e impresión de facturas en formato estándar y ticket fiscal" },

  // Administración
  { id: "admin_ver_reportes", modulo: "Administración", nombre: "Ver Balances y Reportes Financieros", descripcion: "Acceso a indicadores de rentabilidad, ingresos netos y gráficos comerciales" },
  { id: "admin_tesoreria", modulo: "Administración", nombre: "Gestión de Tesorería y Flujo de Caja", descripcion: "Control de cuentas bancarias, ingresos generales y egresos operativos" },
  { id: "admin_caja", modulo: "Administración", nombre: "Apertura y Cierre Diaria de Caja", descripcion: "Asentamiento de arqueos diarios y cierre formal del turno comercial" },
  { id: "admin_gastos", modulo: "Administración", nombre: "Registrar Gastos y Proveedores", descripcion: "Ingreso de facturas de compra y gastos operativos del condominio" },

  // Configuración
  { id: "conf_ver", modulo: "Configuración", nombre: "Ver Parámetros Generales", descripcion: "Visualizar datos fiscales de la empresa, monedas y parámetros de sistema" },
  { id: "conf_usuarios", modulo: "Configuración", nombre: "Gestión de Colaboradores y Roles", descripcion: "Crear, modificar roles y deshabilitar usuarios dentro del ecosistema OIMA" },
  { id: "conf_smtp", modulo: "Configuración", nombre: "Configurar Servidor Correo / Gmail SMTP", descripcion: "Modificar credenciales, host, puerto y contraseña de aplicación para emails" },
  { id: "conf_logs", modulo: "Configuración", nombre: "Auditoría de Seguridad y Logs", descripcion: "Acceso al historial inmutable de accesos, cambios y trazabilidad del ERP" }
];

export function verificarPermisoGranular(permisoId: string, email?: string): { permitido: boolean; mensaje?: string; permisoNombre?: string } {
  let targetEmail = (email || (typeof window !== "undefined" ? (localStorage.getItem("VORDIA_active_user_email") || localStorage.getItem("VORDIA_last_tested_email")) : "") || "").toLowerCase().trim();

  const permObj = LISTA_PERMISOS.find(p => p.id === permisoId);
  const moduloName = permObj ? permObj.modulo : "Sistema";
  const accionName = permObj ? permObj.nombre : permisoId;

  if (typeof window === "undefined") {
    return { permitido: true };
  }

  // Sesión actual: ADMIN siempre puede (excepto que probemos otro email en la matriz)
  try {
    const rawSession = localStorage.getItem("VORDIA_auth_session");
    if (rawSession) {
      const session = JSON.parse(rawSession);
      const sessionUser = session?.user;
      const sessionEmail = String(sessionUser?.email || "").toLowerCase().trim();
      if ((!targetEmail || targetEmail === sessionEmail) && isRolAdministrador(sessionUser)) {
        return { permitido: true };
      }
    }
  } catch { /* ignore */ }

  // Gestión de usuarios: solo administradores
  if (permisoId === "conf_usuarios") {
    try {
      const rawSession = localStorage.getItem("VORDIA_auth_session");
      const session = rawSession ? JSON.parse(rawSession) : null;
      if (isRolAdministrador(session?.user)) return { permitido: true };
    } catch { /* ignore */ }
    return {
      permitido: false,
      mensaje: `🚫 Acceso Restringido en ${moduloName}: Solo usuarios con rol Administrador pueden gestionar Usuarios / Roles.`,
      permisoNombre: accionName
    };
  }

  if (!targetEmail) targetEmail = "rody.moran.py@gmail.com";

  const key = `VORDIA_permisos_${targetEmail}`;
  let saved = localStorage.getItem(key);
  if (!saved) {
    saved = localStorage.getItem("VORDIA_permisos_current");
  }

  if (!saved) {
    // Sin matriz: permitir (compat), salvo conf_usuarios ya bloqueado arriba
    return { permitido: true };
  }

  try {
    const permisos: string[] = JSON.parse(saved);
    let isAllowed = permisos.includes(permisoId);

    // Si cualquiera de los dos (panel_consultar_ande o condo_consultar_ande) fue denegado, se bloquea
    if (permisoId === "panel_consultar_ande" || permisoId === "condo_consultar_ande") {
      isAllowed = permisos.includes("panel_consultar_ande") && permisos.includes("condo_consultar_ande");
    }

    // Migración: Fontana hereda de Condominio Agus si aún no está en la matriz guardada
    if (permisoId === "fontana_ver" && !permisos.includes("fontana_ver")) {
      isAllowed = permisos.includes("condo_ver_panel") || permisos.includes("fontana_gestionar");
    }
    if (permisoId === "fontana_gestionar" && !permisos.includes("fontana_gestionar")) {
      isAllowed = permisos.includes("condo_ver_panel") || permisos.includes("fontana_ver");
    }

    if (isAllowed) {
      return { permitido: true };
    }

    return {
      permitido: false,
      mensaje: `🚫 Acceso Restringido en ${moduloName}: No cuentas con el permiso para '${accionName}'. Este comportamiento ha sido denegado para tu perfil.`,
      permisoNombre: accionName
    };
  } catch {
    return { permitido: true };
  }
}

export function ModalAccesoRestringido({
  isOpen,
  onClose,
  mensaje,
  permisoNombre
}: {
  isOpen: boolean;
  onClose: () => void;
  mensaje?: string;
  permisoNombre?: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[94vw] sm:max-w-md bg-slate-900 text-white rounded-[2rem] p-6 border border-red-500/40 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-500/20 text-red-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-tight text-white">
                Acceso Denegado 🚫
              </DialogTitle>
              <p className="text-xs text-red-300 font-medium">
                VORDIA Security Engine v2.4
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-4 text-xs text-red-200 space-y-2 mt-2">
          <p className="font-bold text-white leading-relaxed">
            {mensaje || "El acceso a este comportamiento o funcionalidad ha sido denegado en tu perfil por el Administrador del Sistema."}
          </p>
          {permisoNombre && (
            <p className="text-amber-400 font-black uppercase tracking-wide">
              Comportamiento bloqueado: {permisoNombre}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <Button
            onClick={() => {
              toast.success("Solicitud de Permiso Enviada", {
                description: "Se notificó al Administrador para solicitar acceso a esta funcionalidad."
              });
              onClose();
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-10 rounded-xl"
          >
            📧 Solicitar Permiso al Admin
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-bold text-xs rounded-xl px-5 h-10"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  usuarios: UsuarioAdmin[];
  usuarioSeleccionadoId?: number | null;
  onSelectUsuario?: (id: number) => void;
  canManagePasswords?: boolean;
  onEditUsuario?: (usuario: UsuarioAdmin) => void;
}

export function PermisosGranularesMatriz({
  usuarios,
  usuarioSeleccionadoId,
  onSelectUsuario,
  canManagePasswords = false,
  onEditUsuario,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [permisosActivos, setPermisosActivos] = useState<string[]>([]);
  const [moduloFiltro, setModuloFiltro] = useState<string>("TODOS");
  const [permisoAProbar, setPermisoAProbar] = useState<PermisoGranular | null>(null);
  const [catalogoModulos, setCatalogoModulos] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (usuarioSeleccionadoId && usuarios.some(u => u.usuarioId === usuarioSeleccionadoId)) {
      setSelectedId(usuarioSeleccionadoId);
    } else if (usuarios && usuarios.length > 0 && !selectedId) {
      setSelectedId(usuarios[0].usuarioId);
    }
  }, [usuarioSeleccionadoId, usuarios]);

  const usuarioActual = usuarios.find(u => u.usuarioId === selectedId) || (usuarios.length > 0 ? usuarios[0] : null);

  useEffect(() => {
    if (!usuarioActual) return;
    let cancelled = false;
    (async () => {
      try {
        // Catálogo de módulos de la empresa (para cruzar comportamientos ↔ módulos asignados)
        const empId =
          (typeof window !== "undefined" &&
            (() => {
              try {
                return JSON.parse(localStorage.getItem("VORDIA_auth_session") || "{}")?.user?.empresaId;
              } catch {
                return null;
              }
            })()) ||
          7;
        const rMod = await fetch(`${API_BASE}/api/Usuario/modulos-por-empresa/${empId}`);
        if (rMod.ok) {
          const mods = await rMod.json();
          if (!cancelled) setCatalogoModulos(Array.isArray(mods) ? mods : []);
        }
      } catch { /* ignore */ }

      try {
        const r = await fetch(`${API_BASE}/api/Usuario/${usuarioActual.usuarioId}/permisos`);
        if (r.ok) {
          const data = await r.json();
          const fromApi: string[] = Array.isArray(data?.permisosIds) ? data.permisosIds : [];
          if (fromApi.length > 0) {
            if (!cancelled) {
              setPermisosActivos(fromApi);
              cachePermisosLocal(usuarioActual.email, fromApi);
            }
            return;
          }
        }
      } catch { /* fallback local */ }

      if (cancelled) return;
      // Fallback: API vacía / localStorage / default
      if (Array.isArray(usuarioActual.permisosIds) && usuarioActual.permisosIds.length > 0) {
        setPermisosActivos(usuarioActual.permisosIds);
        cachePermisosLocal(usuarioActual.email, usuarioActual.permisosIds);
        return;
      }
      const key = `VORDIA_permisos_${usuarioActual.email.toLowerCase().trim()}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setPermisosActivos(JSON.parse(saved));
          return;
        } catch { /* ignore */ }
      }
      const todos = LISTA_PERMISOS.map(p => p.id);
      setPermisosActivos(todos);
      cachePermisosLocal(usuarioActual.email, todos);
      // Persistimos default en API para que el empleado lo herede
      void fetch(`${API_BASE}/api/Usuario/${usuarioActual.usuarioId}/permisos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisosIds: todos }),
      }).catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [usuarioActual?.usuarioId]);

  const esSuperAdminEmail = usuarioActual?.email?.toLowerCase() === "rody.moran.py@gmail.com" || usuarioActual?.email?.toLowerCase() === "adminagus@oima.com.py";

  const persistirPermisos = async (nuevos: string[]) => {
    if (!usuarioActual) return;
    setPermisosActivos(nuevos);
    cachePermisosLocal(usuarioActual.email, nuevos);
    localStorage.setItem("VORDIA_last_tested_email", usuarioActual.email.toLowerCase().trim());
    setGuardando(true);
    try {
      const r = await fetch(`${API_BASE}/api/Usuario/${usuarioActual.usuarioId}/permisos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisosIds: nuevos }),
      });
      if (!r.ok) throw new Error(await r.text());
    } catch (e: any) {
      toast.error("No se pudo guardar en servidor", { description: e?.message || "Revisá la API / columna PermisosJson" });
    } finally {
      setGuardando(false);
    }
  };

  const togglePermiso = (id: string) => {
    if (!usuarioActual) return;

    const permObj = LISTA_PERMISOS.find(p => p.id === id);
    if (permObj && (usuarioActual.modulosIds?.length ?? 0) > 0 && catalogoModulos.length > 0) {
      const okModulo = permisoCoincideConModulosAsignados(
        permObj.modulo as NombreModuloMatriz,
        usuarioActual.modulosIds || [],
        catalogoModulos
      );
      if (!okModulo && !permisosActivos.includes(id)) {
        toast.error("Módulo no asignado", {
          description: `Primero asigná el módulo «${permObj.modulo}» al usuario (Editar / Contraseña → Módulos) para habilitar este comportamiento.`,
        });
        return;
      }
    }

    const nuevos = permisosActivos.includes(id)
      ? permisosActivos.filter(p => p !== id)
      : [...permisosActivos, id];

    void persistirPermisos(nuevos).then(() => {
      toast.success("Permiso Actualizado en Matriz", {
        description: `Se ha ${nuevos.includes(id) ? "habilitado ✅" : "restringido 🚫"} '${permObj?.nombre || id}' para ${usuarioActual.nombre}.`
      });
    });
  };

  const habilitarTodos = () => {
    if (!usuarioActual) return;
    let todos = LISTA_PERMISOS.map(p => p.id);
    if ((usuarioActual.modulosIds?.length ?? 0) > 0 && catalogoModulos.length > 0) {
      todos = LISTA_PERMISOS
        .filter(p =>
          permisoCoincideConModulosAsignados(
            p.modulo as NombreModuloMatriz,
            usuarioActual.modulosIds || [],
            catalogoModulos
          )
        )
        .map(p => p.id);
    }
    void persistirPermisos(todos).then(() => {
      toast.success("Acceso Total Asignado", {
        description: `Se han habilitado ${todos.length} comportamientos (según módulos asignados) para ${usuarioActual.nombre}.`
      });
    });
  };

  const revocarTodos = () => {
    if (!usuarioActual) return;
    void persistirPermisos([]).then(() => {
      toast.success("Accesos Revocados", {
        description: `Se revocaron todos los comportamientos de ${usuarioActual.nombre}.`
      });
    });
  };

  const restringirTodos = () => {
    revocarTodos();
  };

  const simularIntercepcion = (permiso: PermisoGranular) => {
    setPermisoAProbar(permiso);
  };

  const modulosDisponibles = ["TODOS", "Panel", "Condominio Agus", "Fontana", "Actividades", "Facturación", "Administración", "Configuración"];
  
  const permisosFiltrados = moduloFiltro === "TODOS" 
    ? LISTA_PERMISOS 
    : LISTA_PERMISOS.filter(p => p.modulo === moduloFiltro);

  if (!usuarioActual) {
    return (
      <div className="bg-slate-900 text-white p-8 rounded-3xl text-center border border-slate-800 shadow-xl">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3 animate-bounce" />
        <h3 className="text-lg font-black uppercase">No se ha seleccionado ningún usuario</h3>
        <p className="text-xs text-muted-foreground mt-1">Selecciona un colaborador de la tabla superior para administrar sus permisos granulares por módulo.</p>
      </div>
    );
  }

  const verifResultado = permisoAProbar ? verificarPermisoGranular(permisoAProbar.id, usuarioActual.email) : null;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white p-4 sm:p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-500 w-full max-w-full overflow-x-hidden">
      {/* Cabecera y Selector de Usuario */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20 shrink-0 border border-white/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg md:text-xl font-black italic uppercase tracking-tight text-white leading-snug">
                Matriz de Permisos y Comportamientos por Módulo
              </h3>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-blue-500/30">
                VORDIA Security Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Control exclusivo para Administradores. Asigna o restringe comportamientos operativos en tiempo real por usuario.
            </p>
          </div>
        </div>

        {/* Selector de Usuario */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60 w-full lg:w-auto lg:max-w-md min-w-0">
          <span className="text-[11px] font-black uppercase text-muted-foreground px-2 flex items-center gap-1.5 shrink-0">
            <User className="w-3.5 h-3.5 text-amber-400" /> Configurar Usuario:
          </span>
          <select
            value={usuarioActual.usuarioId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedId(id);
              if (onSelectUsuario) onSelectUsuario(id);
            }}
            className="bg-slate-900 text-white font-bold text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-inner w-full min-w-0 truncate"
          >
            {usuarios.map(u => (
              <option key={u.usuarioId} value={u.usuarioId} className="font-bold py-1">
                {u.nombre} ({u.email}) - {u.rol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjeta Resumen del Usuario Seleccionado */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 font-black flex items-center justify-center text-lg border border-blue-500/30 shadow-inner shrink-0">
            {usuarioActual.iniciales}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-black text-white uppercase italic">{usuarioActual.nombre}</h4>
              {usuarioActual.email?.toLowerCase().includes("gmail.com") && (
                <span className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-red-500/30 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Cuenta Gmail Vinculada
                </span>
              )}
              {esSuperAdminEmail && (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Superadmin / Propietario
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{usuarioActual.email} • <span className="text-amber-400 font-bold uppercase">Rol en Sistema: {usuarioActual.rol}</span></p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xl">
              Módulos asignados: {(usuarioActual.modulosIds || []).length}. Los comportamientos solo se habilitan si el usuario tiene el módulo correspondiente.
              {guardando ? " · Guardando en servidor…" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
          {canManagePasswords && onEditUsuario && (
            <Button
              onClick={() => onEditUsuario(usuarioActual)}
              size="sm"
              className="bg-amber-600/20 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/30 font-bold text-xs rounded-xl px-3.5 transition-all"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Editar / Contraseña
            </Button>
          )}
          <Button 
            onClick={habilitarTodos}
            size="sm"
            className="bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white border border-green-500/30 font-bold text-xs rounded-xl px-3.5 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Habilitar Todos
          </Button>
          <Button 
            onClick={restringirTodos}
            size="sm"
            className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 font-bold text-xs rounded-xl px-3.5 transition-all"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Revocar Todos
          </Button>
        </div>
      </div>

      {/* Pestañas / Filtro por Módulo */}
      <div className="mobile-tabs-scroll items-center gap-2 pb-2">
        <span className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-1 mr-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> Filtrar Módulo:
        </span>
        {modulosDisponibles.map(mod => {
          const count = mod === "TODOS" 
            ? LISTA_PERMISOS.length 
            : LISTA_PERMISOS.filter(p => p.modulo === mod).length;
          const autorizados = mod === "TODOS"
            ? permisosActivos.length
            : LISTA_PERMISOS.filter(p => p.modulo === mod && permisosActivos.includes(p.id)).length;

          return (
            <button
              key={mod}
              onClick={() => setModuloFiltro(mod)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
                moduloFiltro === mod 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30" 
                  : "bg-slate-800/80 text-muted-foreground hover:bg-slate-800 hover:text-white border border-slate-700/50"
              }`}
            >
              <span>{mod}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                moduloFiltro === mod ? "bg-blue-700 text-white" : "bg-slate-900 text-muted-foreground"
              }`}>
                {esSuperAdminEmail ? count : autorizados}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Datatable Granular de Comportamientos */}
      <div data-mobile-scroll="x" className="mobile-scroll-x rounded-2xl border border-slate-800 bg-slate-950/70 shadow-inner">
        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[900px]">
          <thead>
            <tr className="bg-slate-900/95 text-muted-foreground font-black uppercase text-[11px] tracking-wider border-b border-slate-800">
              <th className="py-4 px-5 whitespace-nowrap">Módulo del Sistema</th>
              <th className="py-4 px-5 whitespace-nowrap">Comportamiento / Opción Operativa</th>
              <th className="py-4 px-5 whitespace-nowrap">Descripción de la Funcionalidad</th>
              <th className="py-4 px-5 text-center whitespace-nowrap">Permiso</th>
              <th className="py-4 px-5 text-center whitespace-nowrap">Estado de Acceso</th>
              <th className="py-4 px-5 text-right whitespace-nowrap">Probar Intercepción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {permisosFiltrados.map((perm) => {
              const estaPermitido = permisosActivos.includes(perm.id);

              return (
                <tr key={perm.id} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="py-4 px-5">
                    <span className={`font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-md border whitespace-nowrap inline-block ${
                      perm.modulo === "Panel"
                        ? "bg-blue-950/80 text-blue-300 border-blue-500/40 shadow-sm"
                        : "bg-slate-800 text-amber-400 border-slate-700"
                    }`}>
                      {perm.modulo}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-black text-white group-hover:text-blue-300 transition-colors">
                    {perm.nombre}
                  </td>
                  <td className="py-4 px-5 text-muted-foreground text-xs max-w-xs">
                    {perm.descripcion}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => togglePermiso(perm.id)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer mx-auto ${
                        estaPermitido ? "bg-blue-600 justify-end" : "bg-slate-700 justify-start"
                      }`}
                      title="Haz clic para cambiar permiso y probar intercepción"
                    >
                      <div className={`bg-card w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        estaPermitido ? "scale-110" : ""
                      }`} />
                    </button>
                  </td>
                  <td className="py-4 px-5 text-center whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1.5 shadow-sm ${
                      estaPermitido 
                        ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                        : "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                    }`}>
                      {estaPermitido ? (
                        <><CheckCircle2 className="w-3 h-3 text-green-400" /> Permitido</>
                      ) : (
                        <><Lock className="w-3 h-3 text-red-400" /> Denegado</>
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => simularIntercepcion(perm)}
                      className="bg-slate-800/80 hover:bg-blue-600 hover:text-white text-muted-foreground text-[11px] font-bold rounded-xl px-3 py-1 transition-all border border-slate-700/60"
                      title="Haz clic para probar el mensaje o intercepción que verá el usuario"
                    >
                      <Play className="w-3 h-3 mr-1.5 text-amber-400" /> Probar Alerta
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL INTERACTIVO DE SIMULACIÓN DE INTERCEPCIÓN */}
      <Dialog open={!!permisoAProbar} onOpenChange={(val) => !val && setPermisoAProbar(null)}>
        <DialogContent className="w-[94vw] sm:max-w-xl bg-slate-900 text-white rounded-[2rem] p-6 sm:p-8 border border-slate-700 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                verifResultado?.permitido ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}>
                {verifResultado?.permitido ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight text-white">
                  {verifResultado?.permitido ? "Acceso Permitido ✅" : "Acceso Denegado / Interceptado 🚫"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium">
                  Comportamiento evaluado por VORDIA Security Engine en tiempo real
                </p>
              </div>
            </div>
          </DialogHeader>

          {permisoAProbar && (
            <div className="space-y-5 mt-3">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuario Evaluado:</span>
                  <span className="font-bold text-white">{usuarioActual.nombre} ({usuarioActual.email})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Módulo del Sistema:</span>
                  <span className="font-bold text-amber-400">{permisoAProbar.modulo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opción / Operación:</span>
                  <span className="font-bold text-white">{permisoAProbar.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado en Matriz:</span>
                  <span className={`font-black uppercase ${verifResultado?.permitido ? "text-green-400" : "text-red-400"}`}>
                    {verifResultado?.permitido ? "Habilitado" : "Denegado"}
                  </span>
                </div>
              </div>

              {verifResultado?.permitido ? (
                <div className="bg-green-950/60 border border-green-500/40 rounded-2xl p-4 text-xs text-green-200 space-y-1">
                  <p className="font-black uppercase tracking-wider text-green-400">✔ Operación Autorizada en Interfaz</p>
                  <p>Al hacer clic en <strong>{permisoAProbar.nombre}</strong>, la pantalla ejecutará la acción de forma directa sin restricciones.</p>
                </div>
              ) : (
                <div className="bg-red-950/80 border border-red-500/60 rounded-2xl p-4 text-xs text-red-200 space-y-3 shadow-lg shadow-red-950/50">
                  <div>
                    <p className="font-black uppercase tracking-wider text-red-400 mb-1">🚫 Alerta y restricción al intentar usar este comportamiento:</p>
                    <p className="font-semibold leading-relaxed bg-black/40 p-3 rounded-xl border border-red-500/30">
                      {verifResultado?.mensaje}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      toast.success("Solicitud Enviada al Administrador", {
                        description: `Se ha notificado al Administrador para solicitar acceso a '${permisoAProbar.nombre}'.`
                      });
                      setPermisoAProbar(null);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Simular Solicitud de Permiso por Correo
                  </Button>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPermisoAProbar(null)}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-bold text-xs rounded-xl px-6 h-10"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

