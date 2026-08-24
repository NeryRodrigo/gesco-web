"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { clearAuthToken, getAuthToken } from "@/lib/api";
import { clearVordiaSession } from "@/lib/utils";

/** Tiempo sin actividad antes de cerrar sesión (60 min). */
const IDLE_MS = 60 * 60 * 1000;
/** Aviso antes del cierre (2 min). */
const WARN_BEFORE_MS = 2 * 60 * 1000;
const TICK_MS = 15_000;
const WARN_TOAST_ID = "vordia-idle-warn";
const CLOSED_TOAST_ID = "vordia-idle-closed";

/**
 * Cierra la sesión tras inactividad prolongada (cualquier dispositivo).
 * Avisa 2 min antes con toast centrado (móvil/iPad) y permite «Seguir».
 */
export function IdleSessionWatcher() {
  const lastActivityRef = useRef(Date.now());
  const warnShownRef = useRef(false);
  const closingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    const bump = () => {
      if (closingRef.current) return;
      lastActivityRef.current = Date.now();
      if (warnShownRef.current) {
        warnShownRef.current = false;
        toast.dismiss(WARN_TOAST_ID);
      }
    };

    const forceLogout = () => {
      if (closingRef.current || cancelled) return;
      closingRef.current = true;
      warnShownRef.current = false;
      toast.dismiss(WARN_TOAST_ID);

      clearAuthToken();
      clearVordiaSession();

      toast.error("Sesión cerrada por inactividad", {
        id: CLOSED_TOAST_ID,
        description:
          "Por seguridad se cerró la sesión. Al entrar de nuevo vas a usar la versión actualizada del sistema.",
        duration: 5000,
      });

      window.setTimeout(() => {
        if (!cancelled) window.location.reload();
      }, 1800);
    };

    const showWarn = () => {
      if (warnShownRef.current || closingRef.current) return;
      warnShownRef.current = true;
      toast.warning("Tu sesión se cerrará por inactividad", {
        id: WARN_TOAST_ID,
        description:
          "Quedan unos 2 minutos sin uso. Tocá «Seguir» para mantener la sesión abierta.",
        duration: Infinity,
        closeButton: true,
        action: {
          label: "Seguir",
          onClick: () => bump(),
        },
      });
    };

    const tick = () => {
      if (cancelled || closingRef.current) return;
      if (!getAuthToken()) {
        warnShownRef.current = false;
        toast.dismiss(WARN_TOAST_ID);
        lastActivityRef.current = Date.now();
        return;
      }

      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_MS) {
        forceLogout();
        return;
      }
      if (idle >= IDLE_MS - WARN_BEFORE_MS) {
        showWarn();
      }
    };

    const onActivity = () => bump();
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
      "mousemove",
      "wheel",
    ];
    for (const ev of events) {
      window.addEventListener(ev, onActivity, opts);
    }
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "visible") bump();
      },
      opts
    );
    window.addEventListener("focus", onActivity, opts);

    bump();
    tickTimer = setInterval(tick, TICK_MS);

    return () => {
      cancelled = true;
      if (tickTimer) clearInterval(tickTimer);
      for (const ev of events) {
        window.removeEventListener(ev, onActivity, opts);
      }
      window.removeEventListener("focus", onActivity, opts);
    };
  }, []);

  return null;
}
