import { Fraunces } from "next/font/google";

/** Tipografía con serifa para títulos de VORDIA BOUTIQUE y VORDIA CLOSET (editorial, de revista de moda). */
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
