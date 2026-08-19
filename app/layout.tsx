import type { Metadata, Viewport } from "next";
import { Montserrat, Syncopate } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const syncopate = Syncopate({
  variable: "--font-syncopate",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050B18",
};

export const metadata: Metadata = {
  title: "Vordia",
  applicationName: "Vordia",
  description: "Sistema operativo de gestión inteligente",
  appleWebApp: {
    capable: true,
    title: "Vordia",
    statusBarStyle: "black-translucent",
  },
  // Pestaña: favicon chico. Install/PWA: SOLO vordia-* full-bleed (nunca favicon-isotipo transparente).
  icons: {
    icon: [
      { url: "/icons/favicon-32.png?v=20260819f", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png?v=20260819f", sizes: "48x48", type: "image/png" },
      { url: "/icons/vordia-192.png?v=20260819f", sizes: "192x192", type: "image/png" },
      { url: "/icons/vordia-512.png?v=20260819f", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/vordia-192.png?v=20260819f",
    apple: [
      { url: "/icons/vordia-180.png?v=20260819f", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body className={`${montserrat.variable} ${syncopate.variable} font-sans bg-background text-foreground antialiased min-h-screen overflow-x-hidden`} suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors closeButton theme="dark" />
      </body>
    </html>
  );
}
