/**
 * Dígito verificador RUC Paraguay (algoritmo SET / módulo 11).
 * Entrada: número base sin dígito verificador (solo dígitos).
 */
export function digitoVerificadorRucPy(numeroBase: string, basemax = 11): number {
  const numero = String(numeroBase || "").replace(/\D/g, "");
  if (!numero) return 0;

  let vNumeroAl = "";
  for (let i = 0; i < numero.length; i++) {
    const code = numero.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      vNumeroAl += numero.charAt(i);
    } else {
      vNumeroAl += String(code);
    }
  }

  let k = 2;
  let total = 0;
  for (let i = vNumeroAl.length - 1; i >= 0; i--) {
    if (k > basemax) k = 2;
    total += Number(vNumeroAl.charAt(i)) * k;
    k += 1;
  }

  const resto = total % 11;
  return resto > 1 ? 11 - resto : 0;
}

/** Formatea entero con puntos de miles (es-PY): 1500000 → "1.500.000" */
export function formatMilesPy(value: number | string): string {
  const n = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));
  if (!n || Number.isNaN(n)) return "";
  return Math.trunc(n).toLocaleString("es-PY");
}

/** Parsea texto con puntos de miles a número entero */
export function parseMilesPy(texto: string): number {
  const digits = String(texto || "").replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}
