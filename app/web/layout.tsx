import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vordia — Mente operativa",
  description:
    "El sistema operativo con el que empresas paraguayas ven, deciden y cobran. Un ecosistema: HQ, Habitat, Stay, Dine, Retail y Agro.",
  applicationName: "Vordia",
  metadataBase: new URL("https://vordia.com.py"),
  openGraph: {
    title: "Vordia — Mente operativa",
    description: "Un sistema. Seis negocios. Una sola operación.",
    url: "https://vordia.com.py",
    siteName: "Vordia",
    locale: "es_PY",
    type: "website",
  },
};

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return children;
}
