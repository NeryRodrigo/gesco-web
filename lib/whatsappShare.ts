/**
 * Utilidades para compartir PDF por WhatsApp (PC + móvil).
 *
 * Realidad técnica:
 * - WhatsApp Web / Desktop NO permiten adjuntar un archivo vía URL ni API pública del navegador.
 * - Lo máximo posible en PC: descargar el PDF + abrir el chat del número en WhatsApp Web
 *   (si ya tenés la sesión abierta, se enfoca ese chat con el mensaje listo).
 * - En móvil (Web Share API): el PDF sí puede ir adjunto al sheet nativo de WhatsApp.
 */

export function normalizarTelefonoPy(phoneRaw: string): string {
  let phone = (phoneRaw || "").replace(/\D/g, "");
  if (!phone) return "";
  if (phone.startsWith("0")) phone = "595" + phone.substring(1);
  else if (phone.length === 9 && phone.startsWith("9")) phone = "595" + phone;
  else if (!phone.startsWith("595") && phone.length >= 9) phone = "595" + phone.replace(/^0+/, "");
  return phone;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function canShareFiles(): boolean {
  try {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function"
    );
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function buildWhatsAppUrl(phoneRaw: string, text: string, preferWeb = !isMobileDevice()): string {
  const phone = normalizarTelefonoPy(phoneRaw);
  const encodedText = encodeURIComponent(text);
  if (preferWeb) {
    return phone
      ? `https://web.whatsapp.com/send?phone=${phone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;
  }
  return phone
    ? `https://wa.me/${phone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

/**
 * Abrí esto en el mismo click del usuario (antes de await) para que el navegador
 * no bloquee el popup al terminar de generar el PDF.
 */
export function prepareWhatsAppShareWindow(): Window | null {
  if (typeof window === "undefined") return null;
  // En móvil el share nativo no necesita ventana; en PC sí.
  if (isMobileDevice() && canShareFiles()) return null;
  try {
    const w = window.open("about:blank", "_blank");
    if (w) {
      try {
        w.document.write(
          "<!doctype html><title>WhatsApp…</title><body style='font-family:system-ui;padding:24px;color:#0f172a'>Preparando PDF y abriendo WhatsApp Web…</body>"
        );
      } catch {
        /* ignore cross-write */
      }
    }
    return w;
  } catch {
    return null;
  }
}

export type SharePdfWhatsAppResult = {
  mode: "native-share" | "download-and-open" | "open-only";
  message: string;
};

/**
 * Comparte un PDF con el contacto de WhatsApp registrado.
 * Pasá `preOpenedWindow` (desde prepareWhatsAppShareWindow) en el click del botón.
 */
export async function sharePdfViaWhatsApp(opts: {
  file: File | Blob;
  fileName: string;
  phoneRaw: string;
  text: string;
  preOpenedWindow?: Window | null;
}): Promise<SharePdfWhatsAppResult> {
  const phone = normalizarTelefonoPy(opts.phoneRaw);
  if (!phone || phone.length < 10) {
    try {
      opts.preOpenedWindow?.close();
    } catch {
      /* ignore */
    }
    throw new Error(
      "Falta el número de celular/WhatsApp del inquilino. Cargalo en la ficha (Editar) o en Generar Contrato y reintentá."
    );
  }

  const file =
    opts.file instanceof File
      ? opts.file
      : new File([opts.file], opts.fileName, { type: "application/pdf" });

  const waUrl = buildWhatsAppUrl(phone, opts.text, !isMobileDevice());

  // 1) Móvil / Web Share con archivos (mejor experiencia: PDF listo para enviar)
  if (isMobileDevice() && canShareFiles()) {
    try {
      const payload = { files: [file], title: opts.fileName, text: opts.text };
      if (navigator.canShare?.(payload)) {
        try {
          opts.preOpenedWindow?.close();
        } catch {
          /* ignore */
        }
        await navigator.share(payload);
        return {
          mode: "native-share",
          message:
            "Elegí WhatsApp: el PDF ya va listo para enviar al contacto.",
        };
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        try {
          opts.preOpenedWindow?.close();
        } catch {
          /* ignore */
        }
        return {
          mode: "native-share",
          message: "Compartir cancelado.",
        };
      }
      // sigue al fallback (descarga + wa.me)
    }
  }

  // 2) PC / fallback móvil: descargar PDF + abrir chat WhatsApp
  downloadBlob(file, opts.fileName);

  const popup = opts.preOpenedWindow;
  if (popup && !popup.closed) {
    try {
      popup.location.href = waUrl;
    } catch {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  } else {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return {
    mode: "download-and-open",
    message: isMobileDevice()
      ? `PDF descargado y chat abierto (+${phone}). En WhatsApp tocá el clip 📎 y elegí el PDF desde Descargas.`
      : `PDF descargado y chat abierto en WhatsApp Web (+${phone}). Tocá el clip 📎 y elegí el PDF de Descargas.`,
  };
}

export async function openWhatsAppChat(phoneRaw: string, text: string) {
  const url = buildWhatsAppUrl(phoneRaw, text, !isMobileDevice());
  window.open(url, "_blank", "noopener,noreferrer");
}
