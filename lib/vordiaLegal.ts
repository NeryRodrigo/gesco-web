/**
 * Identificación del titular del sitio (Ley 4868/2013 de comercio electrónico y Decreto 1165/2014).
 * Completar razón social, RUC, domicilio y correo con los datos reales antes de publicar:
 * los campos vacíos no se muestran.
 */
export const VORDIA_LEGAL = {
  marca: "VORDIA",
  razonSocial: process.env.NEXT_PUBLIC_VORDIA_RAZON_SOCIAL ?? "",
  ruc: process.env.NEXT_PUBLIC_VORDIA_RUC ?? "",
  domicilio: process.env.NEXT_PUBLIC_VORDIA_DOMICILIO ?? "Asunción, Paraguay",
  email: process.env.NEXT_PUBLIC_VORDIA_EMAIL_LEGAL ?? "",
  sitio: "https://www.vordia.com.py",
  actualizado: "17 de octubre de 2026",
};

/** Texto de identificación para pie de página y documentos. */
export function identificacionVordia() {
  const l = VORDIA_LEGAL;
  return [l.razonSocial || l.marca, l.ruc ? `RUC ${l.ruc}` : null, l.domicilio].filter(Boolean).join(" · ");
}
