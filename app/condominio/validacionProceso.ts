import { toast } from "sonner";

/** Aviso claro + cursor en el campo que falta completar. */
export function avisarCampoFaltante(mensaje: string, campo?: HTMLElement | null) {
  toast.error(mensaje);
  if (!campo) return;
  campo.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    try {
      campo.focus({ preventScroll: true });
      if (
        campo instanceof HTMLInputElement ||
        campo instanceof HTMLTextAreaElement
      ) {
        campo.select();
      }
    } catch {
      /* el campo puede no ser focuseable */
    }
  }, 80);
}

export function campoPorId(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function campoFicha(nombre: string): HTMLElement | null {
  return document.querySelector(`[data-ficha-campo="${nombre}"]`);
}
