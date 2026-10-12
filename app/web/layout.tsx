import type { Metadata } from "next";
import { VORDIA_SITIO } from "@/lib/vordiaEntornos";

const TITLE = "VORDIA | Software de gestión empresarial en Paraguay";
const DESCRIPTION =
  "VORDIA conecta personas, procesos, información y decisiones en plataformas especializadas para cada sector. Una sola operación.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "VORDIA",
  metadataBase: new URL(VORDIA_SITIO),
  alternates: { canonical: VORDIA_SITIO },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: VORDIA_SITIO,
    siteName: "VORDIA",
    locale: "es_PY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "VORDIA",
      url: VORDIA_SITIO,
      logo: `${VORDIA_SITIO}/images/web/lockup-wordmark.png`,
      areaServed: "PY",
      sameAs: [
        "https://www.linkedin.com/in/vordia-py-4ab885439/",
        "https://www.instagram.com/vordia.py/",
        "https://www.youtube.com/channel/UCkvRt8wEcA7P9ufYWLJRGgQ",
        "https://www.tiktok.com/@vordia.py",
      ],
    },
    {
      "@type": "WebSite",
      name: "VORDIA",
      url: VORDIA_SITIO,
      inLanguage: "es-PY",
    },
  ],
};

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {children}
    </>
  );
}
