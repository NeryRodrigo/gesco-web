export function numberToWords(num: number): string {
  if (num === 0) return "CERO GUARANÍES";

  const units = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const tens = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const teens = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const hundreds = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  function getSection(n: number): string {
    let output = "";
    if (n >= 100) {
      if (n === 100) {
        output += "CIEN ";
      } else {
        output += hundreds[Math.floor(n / 100)] + " ";
      }
      n %= 100;
    }

    if (n >= 10 && n <= 19) {
      output += teens[n - 10] + " ";
    } else if (n >= 20) {
      const u = n % 10;
      const d = Math.floor(n / 10);
      if (d === 2) {
        if (u === 0) output += "VEINTE ";
        else if (u === 1) output += "VEINTIÚN ";
        else output += "VEINTI" + units[u] + " ";
      } else {
        output += tens[d];
        if (u > 0) {
          if (u === 1) output += " Y UN ";
          else output += " Y " + units[u] + " ";
        } else {
          output += " ";
        }
      }
    } else if (n > 0) {
      if (n === 1) output += "UN ";
      else output += units[n] + " ";
    }
    return output;
  }

  let temp = num;
  let words = "";

  // Millions
  if (temp >= 1000000) {
    const mill = Math.floor(temp / 1000000);
    if (mill === 1) {
      words += "UN MILLÓN ";
    } else {
      words += getSection(mill) + "MILLONES ";
    }
    temp %= 1000000;
  }

  // Thousands
  if (temp >= 1000) {
    const thou = Math.floor(temp / 1000);
    if (thou === 1) {
      words += "MIL ";
    } else {
      words += getSection(thou) + "MIL ";
    }
    temp %= 1000;
  }

  // Hundreds & rest
  if (temp > 0) {
    words += getSection(temp);
  }

  words = words.trim() + " GUARANÍES";
  return words.toUpperCase();
}
