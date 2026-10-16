import type { Metadata } from "next";

// Link privado de un pedido: no debe indexarse
export const metadata: Metadata = {
  title: "Tu pedido · Vordia",
  robots: { index: false, follow: false },
};

export default function PedidoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
