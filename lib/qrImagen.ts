import jsQR from "jsqr";

/**
 * Lee el QR de una foto de factura (KuDE) en el navegador, sin enviar la imagen a ningún servidor.
 * Prueba en varios tamaños porque las fotos de celular suelen ser muy grandes o estar movidas.
 */
export async function leerQrDeImagen(archivo: File): Promise<string | null> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("No se pudo abrir la imagen"));
      i.src = url;
    });
    for (const maximo of [1600, 1100, 2400, 800]) {
      const escala = Math.min(1, maximo / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * escala));
      const h = Math.max(1, Math.round(img.height * escala));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      const datos = ctx.getImageData(0, 0, w, h);
      const r = jsQR(datos.data, w, h, { inversionAttempts: "attemptBoth" });
      if (r?.data) return r.data;
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
