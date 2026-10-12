import type { Metadata } from "next";
import { VORDIA_SITIO } from "@/lib/vordiaEntornos";

export const metadata: Metadata = {
  metadataBase: new URL(VORDIA_SITIO),
};

export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
