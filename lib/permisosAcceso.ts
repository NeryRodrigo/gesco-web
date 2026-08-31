/**
 * Acceso por rol / módulos / permisos granulares (Fontana · Agus).
 */

import { isAdminFontana } from "@/lib/utils";

export type VistaModuloAgus =
  | "condominio"
  | "fontana"
  | "actividades"
  | "facturacion"
  | "administracion"
  | "configuracion"
  | "gastos"
  | "historico_contratos"
  | "usuarios"
  | "inicio";

export type NombreModuloMatriz =
  | "Panel"
  | "Condominio Agus"
  | "Fontana"
  | "Actividades"
  | "Facturación"
  | "Administración"
  | "Configuración";

export function isRolAdministrador(user?: {
  rol?: string;
  nombre?: string;
  email?: string;
} | null): boolean {
  if (!user) return false;
  const rol = String(user.rol || "").toUpperCase().trim();
  if (rol === "ADMIN" || rol === "SUPERADMIN" || rol === "ADMINISTRADOR") return true;
  const e = String(user.email || "").toLowerCase().trim();
  if (e === "rody.moran.py@gmail.com" || e.includes("rody.moran")) return true;
  return isAdminFontana(user);
}

/** Mapea un registro de módulo BD → vista del sidebar. */
export function vistaDesdeModulo(m: {
  nombreModulo?: string;
  NombreModulo?: string;
  rutaFrontend?: string;
  RutaFrontend?: string;
}): VistaModuloAgus | null {
  const nombre = String(m.nombreModulo ?? m.NombreModulo ?? "").toLowerCase();
  const ruta = String(m.rutaFrontend ?? m.RutaFrontend ?? "")
    .toLowerCase()
    .replace(/^\//, "")
    .replace(/-/g, "_");

  const blob = `${nombre} ${ruta}`;

  if (ruta === "condominio" || blob.includes("condo") || blob.includes("agus") || blob.includes("dúplex") || blob.includes("duplex"))
    return "condominio";
  if (ruta === "fontana" || blob.includes("fontana") || blob.includes("hostel") || blob.includes("habitacion"))
    return "fontana";
  if (ruta === "actividades" || blob.includes("activ")) return "actividades";
  if (ruta === "facturacion" || blob.includes("factur")) return "facturacion";
  if (ruta === "administracion" || (blob.includes("admin") && !blob.includes("usuario")))
    return "administracion";
  if (ruta === "configuracion" || blob.includes("config")) return "configuracion";
  if (ruta === "gastos" || blob.includes("gasto")) return "gastos";
  if (ruta === "historico_contratos" || blob.includes("histor")) return "historico_contratos";
  if (ruta === "usuarios" || blob.includes("usuario") || blob.includes("rol")) return "usuarios";
  if (ruta === "inicio" || blob.includes("panel") || blob.includes("dashboard")) return "inicio";
  return null;
}

export function moduloAsignado(m: any): boolean {
  if (!m) return false;
  if (typeof m.isAsignado === "boolean") return m.isAsignado;
  if (typeof m.IsAsignado === "boolean") return m.IsAsignado;
  return false;
}

/**
 * ¿El usuario puede ver esta vista en el menú?
 * - ADMIN: todo
 * - No admin: solo módulos con IsAsignado; Usuarios/Roles nunca
 */
export function puedeVerVistaSidebar(
  vista: string,
  user: { rol?: string; nombre?: string; email?: string } | null,
  modulosUsuario: any[]
): boolean {
  if (vista === "usuarios") return isRolAdministrador(user);
  if (isRolAdministrador(user)) return true;

  const lista = Array.isArray(modulosUsuario) ? modulosUsuario : [];
  const tieneFlagAsignado = lista.some(
    (m) => typeof m?.isAsignado === "boolean" || typeof m?.IsAsignado === "boolean"
  );

  // API vieja sin IsAsignado: no ocultar (compat)
  if (!tieneFlagAsignado) return true;

  const asignados = lista.filter(moduloAsignado);
  if (asignados.length === 0) return false;

  if (vista === "gastos" || vista === "historico_contratos") {
    return asignados.some((m) => {
      const v = vistaDesdeModulo(m);
      return v === vista || v === "condominio" || v === "administracion";
    });
  }

  return asignados.some((m) => vistaDesdeModulo(m) === vista);
}

const MATRIZ_MODULO_KEYS: Record<NombreModuloMatriz, string[]> = {
  Panel: ["panel", "dashboard", "inicio"],
  "Condominio Agus": ["condo", "agus", "duplex", "dúplex"],
  Fontana: ["fontana", "hostel"],
  Actividades: ["activ"],
  Facturación: ["factur"],
  Administración: ["admin"],
  Configuración: ["config", "usuario", "rol"],
};

export function permisoCoincideConModulosAsignados(
  moduloMatriz: NombreModuloMatriz,
  modulosIds: number[],
  catalogoModulos: {
    moduloId?: number;
    ModuloId?: number;
    nombreModulo?: string;
    NombreModulo?: string;
    rutaFrontend?: string;
    RutaFrontend?: string;
  }[]
): boolean {
  if (!modulosIds?.length) return false;
  const keys = MATRIZ_MODULO_KEYS[moduloMatriz] || [];
  const asignados = catalogoModulos.filter((m) => {
    const id = Number(m.moduloId ?? m.ModuloId ?? 0);
    return modulosIds.includes(id);
  });
  return asignados.some((m) => {
    const blob = `${m.nombreModulo ?? m.NombreModulo ?? ""} ${m.rutaFrontend ?? m.RutaFrontend ?? ""}`.toLowerCase();
    return keys.some((k) => blob.includes(k));
  });
}

export function cachePermisosLocal(email: string, permisosIds: string[]) {
  if (typeof window === "undefined" || !email) return;
  const key = `VORDIA_permisos_${email.toLowerCase().trim()}`;
  localStorage.setItem(key, JSON.stringify(permisosIds));
  localStorage.setItem("VORDIA_active_user_email", email.toLowerCase().trim());
  localStorage.setItem("VORDIA_permisos_current", JSON.stringify(permisosIds));
}
