import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vordia.com.py"),
};

export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
