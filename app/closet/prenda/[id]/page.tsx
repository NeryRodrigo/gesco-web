import { Suspense } from "react";
import { PrendaDetalle } from "../../_components/PrendaDetalle";

export default async function PrendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PrendaDetalle id={Number(id) || 0} />
    </Suspense>
  );
}
