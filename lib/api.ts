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

const JWT_KEY = "VORDIA_jwt";

/** Arma URL absoluta: apiUrl("/api/Dashboard/condominio/7") */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export function getAuthToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(JWT_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null | undefined) {
  try {
    if (typeof window === "undefined") return;
    if (token) localStorage.setItem(JWT_KEY, token);
    else localStorage.removeItem(JWT_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

/** fetch hacia la API con Bearer automático */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith("http") ? input : apiUrl(input);
  const headers = new Headers(init?.headers || {});
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}

/**
 * Parchea window.fetch para inyectar JWT en llamadas a API_BASE.
 * Así no hay que reescribir cada fetch del proyecto.
 */
export function installAuthFetch() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __vordiaAuthFetch?: boolean };
  if (w.__vordiaAuthFetch) return;
  w.__vordiaAuthFetch = true;

  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    let url = "";
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.href;
    else if (typeof Request !== "undefined" && input instanceof Request) url = input.url;

    const isApi =
      url.startsWith(API_BASE) ||
      url.startsWith("/api/") ||
      (API_BASE && url.includes("/api/"));

    if (isApi && url.startsWith(API_BASE)) {
      const headers = new Headers(init?.headers || {});
      if (typeof Request !== "undefined" && input instanceof Request) {
        input.headers.forEach((v, k) => {
          if (!headers.has(k)) headers.set(k, v);
        });
      }
      const token = getAuthToken();
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      if (typeof Request !== "undefined" && input instanceof Request) {
        return original(new Request(input, { headers, ...init }), undefined);
      }
      return original(input, { ...init, headers });
    }
    return original(input, init);
  };
}
