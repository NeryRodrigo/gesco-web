/**
 * Base URL del backend Gesco.API.
 * Local:  http://localhost:5034   (archivo .env.local)
 * Server: https://vordia.duckdns.org  (.env.local o .env.production.local en el servidor)
 *
 * No commitear .env.local — cada entorno tiene el suyo.
 */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5034"
).replace(/\/$/, "");

/** Arma URL absoluta: apiUrl("/api/Dashboard/condominio/7") */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
