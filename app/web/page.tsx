import { VordiaInstitucional } from "../web-institucional/VordiaInstitucional";

/** Ruta pública /web — no modificar el rediseño en VordiaInstitucional. */
export default async function VordiaWebPage({
  searchParams,
}: {
  searchParams: Promise<{ entorno?: string }>;
}) {
  const { entorno } = await searchParams;
  return <VordiaInstitucional entornoInicial={entorno} />;
}
