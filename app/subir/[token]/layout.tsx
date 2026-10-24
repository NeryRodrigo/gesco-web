import type { Metadata } from "next";

// Link privado del cliente de un estudio contable: no debe indexarse
export const metadata: Metadata = {
  title: "Enviar facturas · VORDIA CONTA",
  robots: { index: false, follow: false },
};

export default function SubirLayout({ children }: { children: React.ReactNode }) {
  return children;
}
