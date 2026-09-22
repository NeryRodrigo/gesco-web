import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VORDIA — Tecnología para la gestión empresarial en Paraguay",
  description:
    "VORDIA desarrolla plataformas especializadas que conectan procesos, información y decisiones. Ecosistema B2B en Paraguay: HABITAT, STAY, DINE, RETAIL, BOUTIQUE, OPS y AGRO.",
  applicationName: "VORDIA",
  metadataBase: new URL("https://www.vordia.com.py"),
  alternates: { canonical: "https://www.vordia.com.py/" },
  keywords: [
    "VORDIA",
    "software empresarial Paraguay",
    "gestión de condominios",
    "sistema hotelero",
    "software para restaurantes",
    "ERP Paraguay",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Muchas partes. Una sola operación.",
    description:
      "Tecnología para la gestión empresarial. Ecosistema B2B: HABITAT, STAY, DINE, RETAIL, BOUTIQUE, OPS y AGRO.",
    url: "https://www.vordia.com.py",
    siteName: "VORDIA",
    locale: "es_PY",
    type: "website",
    images: [{ url: "/images/web/vordia-4k.png", alt: "VORDIA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VORDIA — Tecnología para la gestión empresarial",
    description: "Muchas partes. Una sola operación.",
    images: ["/images/web/vordia-4k.png"],
  },
};

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
