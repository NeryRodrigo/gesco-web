import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VORDIA — Web institucional (preview)",
  robots: { index: false, follow: false },
};

export default function WebInstitucionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
