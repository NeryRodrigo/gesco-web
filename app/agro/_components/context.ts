import type { AgroConfiguracion, AgroLoteFull, AgroModulo } from "@/lib/agroApi";

/** Lo que cada vista del módulo necesita del shell. */
export type AgroCtx = {
  empresaId: number;
  config: AgroConfiguracion;
  lotes: AgroLoteFull[];
  /** Incrementa cuando hay que recargar datos (alta, pesaje, etc.). */
  version: number;
  refrescar: () => void;
  irA: (vista: VistaAgro, opts?: { animalId?: number }) => void;
  tiene: (m: AgroModulo) => boolean;
  /** ¿La vista está habilitada por la licencia? */
  nav: (vista: VistaAgro) => boolean;
};

export type VistaAgro =
  | "ejecutivo"
  | "ganado"
  | "reproduccion"
  | "cria"
  | "recria"
  | "feed"
  | "sanidad"
  | "alimentacion"
  | "lotes"
  | "trazabilidad"
  | "dispositivos"
  | "inventario"
  | "finanzas"
  | "reportes"
  | "operacion";
