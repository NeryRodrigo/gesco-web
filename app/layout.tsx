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
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "VORDIA Dashboard",
  description: "Sistema operativo de gestión inteligente",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body className={`${montserrat.variable} ${syncopate.variable} font-sans bg-background text-foreground antialiased min-h-screen overflow-x-hidden`} suppressHydrationWarning>
        {children}
        <Toaster position="top-right" richColors closeButton theme="dark" />
      </body>
    </html>
  );
}
