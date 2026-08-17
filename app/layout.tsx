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

// --- AGREGAR ESTO PARA MÓVILES ---
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050B18",
};

export const metadata: Metadata = {
  title: "VORDIA Dashboard",
  applicationName: "Vordia",
  description: "Sistema operativo de gestión inteligente",
  // Acceso directo en celular: nombre corto + icono desde public/images
  appleWebApp: {
    capable: true,
    title: "Vordia",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/images/ISOTIPO.png",
    shortcut: "/images/ISOTIPO.png",
    apple: "/images/ISOTIPO.png",
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
