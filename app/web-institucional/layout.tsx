import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VORDIA — Web institucional (preview)",
};

export default function WebInstitucionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
