"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { API_BASE, clearAuthToken } from "@/lib/api";
import { clearVordiaSession } from "@/lib/utils";

const EPOCH_KEY = "VORDIA_session_epoch";
const POLL_MS = 45_000;
/** Páginas que abren clientes sin sesión (ej. link de un pedido): no se avisa ni se recarga. */
const RUTAS_PUBLICAS = ["/pedido/"];

type VersionPayload = {
  sessionEpoch?: string;
};

/**
 * Detecta reinicio/deploy del API (nuevo sessionEpoch).
 * Limpia JWT + sesión local, avisa y recarga para entrar con el sistema nuevo.
 */
export function VersionSessionWatcher() {
  const notifyingRef = useRef(false);

  useEffect(() => {
    if (RUTAS_PUBLICAS.some((r) => window.location.pathname.startsWith(r))) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const applyNewEpochAndReload = (epoch: string) => {
      try {
        localStorage.setItem(EPOCH_KEY, epoch);
      } catch {
        /* ignore */
      }
      clearAuthToken();
      clearVordiaSession();
      window.location.reload();
    };

    const check = async () => {
      if (cancelled || notifyingRef.current) return;
      try {
        const res = await fetch(`${API_BASE}/api/System/version?t=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as VersionPayload;
        const epoch = String(data.sessionEpoch || "").trim();
        if (!epoch) return;

        let prev: string | null = null;
        try {
          prev = localStorage.getItem(EPOCH_KEY);
        } catch {
          prev = null;
        }

        if (!prev) {
          try {
            localStorage.setItem(EPOCH_KEY, epoch);
          } catch {
            /* ignore */
          }
          return;
        }

        if (prev === epoch) return;

        notifyingRef.current = true;
        clearAuthToken();
        clearVordiaSession();

        toast.warning("El sistema se actualizó", {
          id: "vordia-version-reload",
          description:
            "Se cerraron las sesiones anteriores. Recargá para continuar con la versión nueva.",
          duration: Infinity,
          closeButton: true,
          action: {
            label: "Recargar",
            onClick: () => applyNewEpochAndReload(epoch),
          },
        });

        // Recarga automática si no pulsan el botón (móvil / tablet)
        window.setTimeout(() => {
          if (cancelled) return;
          applyNewEpochAndReload(epoch);
        }, 10_000);
      } catch {
        /* red / API caído — reintentar en el próximo poll */
      }
    };

    void check();
    timer = setInterval(() => void check(), POLL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onFocus = () => void check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
