import { Suspense } from "react";
import { VidrieraBoutique } from "../_components/VidrieraBoutique";

export default async function BoutiquePage({ params }: { params: Promise<{ boutique: string }> }) {
  const { boutique } = await params;
  return (
    <Suspense>
      <VidrieraBoutique slug={boutique} />
    </Suspense>
  );
}
