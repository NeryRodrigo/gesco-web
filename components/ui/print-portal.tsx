"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function PrintPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="hidden print:block absolute inset-0 bg-card z-[99999] print-portal-content">
      {children}
    </div>,
    document.body
  );
}
