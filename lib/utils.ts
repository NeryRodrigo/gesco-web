import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuplex(text?: string | null): string {
  if (!text) return "";
  return text.replace(/\b(?:Dúplex|Duplex|D)\s*-?\s*(\d+)\b/gi, (_, num) => {
    const n = parseInt(num, 10);
    return `Dúplex ${n < 10 ? "0" + n : n}`;
  });
}
