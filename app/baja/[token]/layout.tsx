import type { Metadata } from "next";

// Link personal de baja: no debe indexarse
export const metadata: Metadata = {
  title: "Baja de correos · VORDIA",
  robots: { index: false, follow: false },
};

export default function BajaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
