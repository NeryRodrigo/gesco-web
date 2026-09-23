import type { Metadata } from "next";

const TITLE = "VORDIA | Software de gestión empresarial en Paraguay";
const DESCRIPTION =
  "VORDIA conecta personas, procesos, información y decisiones en plataformas especializadas para cada sector. Una sola operación.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "VORDIA",
  metadataBase: new URL("https://www.vordia.com.py"),
  alternates: { canonical: "https://www.vordia.com.py/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.vordia.com.py",
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
      url: "https://www.vordia.com.py",
      logo: "https://www.vordia.com.py/images/web/lockup-wordmark.png",
      areaServed: "PY",
    },
    {
      "@type": "WebSite",
      name: "VORDIA",
      url: "https://www.vordia.com.py",
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
