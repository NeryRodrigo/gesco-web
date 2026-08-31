/**
 * Croquis esquemáticos Fontana 1 / 2 / 3 (maqueta operativa).
 * Numeración y capacidades son referenciales; administración puede ajustar por habitación.
 */

export type FontanaPlanta = "PB" | "PA";
export type FontanaModalidad = "DIARIA" | "MENSUAL";
export type FontanaPropiedadPlano = "Fontana 1" | "Fontana 2" | "Fontana 3";

export type FontanaSlotKind = "hab" | "pasillo" | "comun" | "acceso";

export type FontanaSlotDef = {
  /** Clave estable: F1-PB-01 */
  id: string;
  kind: FontanaSlotKind;
  /** Número de habitación (01..11). Solo kind=hab */
  numero?: number;
  label: string;
  /** Capacidad referencial de plazas/camas */
  capacidadDefault?: number;
  modalidadDefault?: FontanaModalidad;
  /** CSS grid: row start / col start / row span / col span */
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
};

export type FontanaPlantaLayout = {
  planta: FontanaPlanta;
  label: string;
  cols: number;
  rows: number;
  slots: FontanaSlotDef[];
};

export type FontanaPropiedadLayout = {
  propiedad: FontanaPropiedadPlano;
  distribucion: "MIXTA" | "MENSUAL";
  descripcion: string;
  /** Cupo físico total (ambas plantas) */
  cupoTotal: number;
  plantas: FontanaPlantaLayout[];
};

function hab(
  propiedadKey: string,
  planta: FontanaPlanta,
  numero: number,
  row: number,
  col: number,
  modalidad: FontanaModalidad,
  capacidad = 2,
  opts?: { rowSpan?: number; colSpan?: number }
): FontanaSlotDef {
  const n = String(numero).padStart(2, "0");
  return {
    id: `${propiedadKey}-${planta}-${n}`,
    kind: "hab",
    numero,
    label: `HAB. ${n}`,
    capacidadDefault: capacidad,
    modalidadDefault: modalidad,
    row,
    col,
    rowSpan: opts?.rowSpan,
    colSpan: opts?.colSpan,
  };
}

function staticSlot(
  id: string,
  kind: Exclude<FontanaSlotKind, "hab">,
  label: string,
  row: number,
  col: number,
  opts?: { rowSpan?: number; colSpan?: number }
): FontanaSlotDef {
  return { id, kind, label, row, col, rowSpan: opts?.rowSpan, colSpan: opts?.colSpan };
}

/** Fontana 1 — pasillo central, 8 hab por planta (16 total), mixta */
function layoutFontana1Planta(planta: FontanaPlanta): FontanaPlantaLayout {
  const pk = "F1";
  const mix = (n: number): FontanaModalidad => (n <= 4 ? "DIARIA" : "MENSUAL");
  const slots: FontanaSlotDef[] = [
    hab(pk, planta, 1, 1, 1, mix(1)),
    hab(pk, planta, 2, 2, 1, mix(2)),
    hab(pk, planta, 3, 3, 1, mix(3)),
    hab(pk, planta, 4, 4, 1, mix(4)),
    staticSlot(`${pk}-${planta}-PAS`, "pasillo", "PASILLO", 1, 2, { rowSpan: 4 }),
    hab(pk, planta, 5, 1, 3, mix(5)),
    hab(pk, planta, 6, 2, 3, mix(6)),
    hab(pk, planta, 7, 3, 3, mix(7)),
    hab(pk, planta, 8, 4, 3, mix(8)),
  ];
  if (planta === "PB") {
    slots.push(staticSlot(`${pk}-PB-ACC`, "acceso", "↑ ACCESO PRINCIPAL", 5, 2));
  }
  return {
    planta,
    label: planta === "PB" ? "PLANTA BAJA" : "PLANTA ALTA",
    cols: 3,
    rows: planta === "PB" ? 5 : 4,
    slots,
  };
}

/** Fontana 2 — área central cocina/sala, 11 hab/planta (22), 100% mensual */
function layoutFontana2Planta(planta: FontanaPlanta): FontanaPlantaLayout {
  const pk = "F2";
  const m: FontanaModalidad = "MENSUAL";
  const slots: FontanaSlotDef[] = [
    hab(pk, planta, 1, 1, 1, m, 2),
    hab(pk, planta, 2, 2, 1, m, 2),
    hab(pk, planta, 3, 3, 1, m, 2),
    hab(pk, planta, 4, 4, 1, m, 2),
    staticSlot(`${pk}-${planta}-CEN`, "comun", "ÁREA CENTRAL\nCocina / Sala\n(No se gestiona)", 1, 2, {
      rowSpan: 4,
      colSpan: 1,
    }),
    // Derecha arriba → abajo: 05, 06, 07, 08 (igual al croquis de referencia)
    hab(pk, planta, 5, 1, 3, m, 2),
    hab(pk, planta, 6, 2, 3, m, 2),
    hab(pk, planta, 7, 3, 3, m, 2),
    hab(pk, planta, 8, 4, 3, m, 2),
    hab(pk, planta, 9, 5, 1, m, 2),
    hab(pk, planta, 10, 5, 2, m, 2),
    hab(pk, planta, 11, 5, 3, m, 2),
  ];
  if (planta === "PB") {
    slots.push(staticSlot(`${pk}-PB-ACC`, "acceso", "↑ ACCESO PRINCIPAL", 6, 2));
  }
  return {
    planta,
    label: planta === "PB" ? "PLANTA BAJA" : "PLANTA ALTA",
    cols: 3,
    rows: planta === "PB" ? 6 : 5,
    slots,
  };
}

/** Fontana 3 — L-shape, 8 hab/planta (16), mixta */
function layoutFontana3Planta(planta: FontanaPlanta): FontanaPlantaLayout {
  const pk = "F3";
  const mix = (n: number): FontanaModalidad => (n <= 5 ? "DIARIA" : "MENSUAL");
  const slots: FontanaSlotDef[] = [
    hab(pk, planta, 1, 2, 1, mix(1)),
    hab(pk, planta, 2, 3, 1, mix(2)),
    hab(pk, planta, 3, 4, 1, mix(3)),
    hab(pk, planta, 4, 5, 1, mix(4)),
    hab(pk, planta, 5, 6, 1, mix(5)),
    hab(pk, planta, 6, 1, 1, mix(6)),
    hab(pk, planta, 7, 1, 2, mix(7)),
    hab(pk, planta, 8, 1, 3, mix(8)),
  ];
  if (planta === "PB") {
    slots.push(staticSlot(`${pk}-PB-ACC`, "acceso", "↑ ACCESO PRINCIPAL", 7, 1));
  }
  return {
    planta,
    label: planta === "PB" ? "PLANTA BAJA" : "PLANTA ALTA",
    cols: 3,
    rows: planta === "PB" ? 7 : 6,
    slots,
  };
}

export const FONTANA_PLANOS: Record<FontanaPropiedadPlano, FontanaPropiedadLayout> = {
  "Fontana 1": {
    propiedad: "Fontana 1",
    distribucion: "MIXTA",
    descripcion: "Distribución mixta · pasillo central · 8 hab. por planta",
    cupoTotal: 16,
    plantas: [layoutFontana1Planta("PA"), layoutFontana1Planta("PB")],
  },
  "Fontana 2": {
    propiedad: "Fontana 2",
    distribucion: "MENSUAL",
    descripcion: "100% mensualera · área central cocina/sala no gestionada · 11 hab. por planta",
    cupoTotal: 22,
    plantas: [layoutFontana2Planta("PA"), layoutFontana2Planta("PB")],
  },
  "Fontana 3": {
    propiedad: "Fontana 3",
    distribucion: "MIXTA",
    descripcion: "Distribución mixta · forma en L · 8 hab. por planta",
    cupoTotal: 16,
    plantas: [layoutFontana3Planta("PA"), layoutFontana3Planta("PB")],
  },
};

export const FONTANA_PROPIEDADES_PLANO: FontanaPropiedadPlano[] = [
  "Fontana 1",
  "Fontana 2",
  "Fontana 3",
];

export function isFontanaPropiedadPlano(nombre?: string | null): nombre is FontanaPropiedadPlano {
  const t = String(nombre || "").trim();
  return (FONTANA_PROPIEDADES_PLANO as string[]).some(
    (p) => p.toLowerCase() === t.toLowerCase()
  );
}

export function resolveFontanaPropiedadPlano(nombre?: string | null): FontanaPropiedadPlano | null {
  const t = String(nombre || "").trim().toLowerCase();
  return FONTANA_PROPIEDADES_PLANO.find((p) => p.toLowerCase() === t) || null;
}

export function slotKey(propiedad: string, planta: FontanaPlanta, numero: number) {
  return `${propiedad.trim().toLowerCase()}|${planta}|${numero}`;
}

export function listHabSlots(layout: FontanaPropiedadLayout): FontanaSlotDef[] {
  return layout.plantas.flatMap((p) =>
    p.slots.filter((s) => s.kind === "hab").map((s) => ({ ...s, /* keep */ }))
  );
}

/** Todos los slots habitación con planta explícita */
export function listHabSlotsConPlanta(layout: FontanaPropiedadLayout): {
  planta: FontanaPlanta;
  slot: FontanaSlotDef;
}[] {
  const out: { planta: FontanaPlanta; slot: FontanaSlotDef }[] = [];
  for (const planta of layout.plantas) {
    for (const slot of planta.slots) {
      if (slot.kind === "hab" && slot.numero) out.push({ planta: planta.planta, slot });
    }
  }
  return out;
}
