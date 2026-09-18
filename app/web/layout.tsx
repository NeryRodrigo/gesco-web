import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VORDIA — Tecnología para la gestión empresarial",
  description:
    "VORDIA desarrolla plataformas especializadas que conectan procesos, información y decisiones para que cada área de una empresa avance con mayor coordinación y visibilidad.",
  applicationName: "VORDIA",
  metadataBase: new URL("https://vordia.com.py"),
  openGraph: {
    title: "Muchas partes. Una sola operación.",
    description:
      "Tecnología para la gestión empresarial. Ecosistema B2B: HABITAT, STAY, DINE, RETAIL, BOUTIQUE, OPS y AGRO.",
    url: "https://vordia.com.py",
    siteName: "VORDIA",
    locale: "es_PY",
    type: "website",
  },
};

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
