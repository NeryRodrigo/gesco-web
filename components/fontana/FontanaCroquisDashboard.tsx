"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Habitacion, Reserva } from "@/types/hostel";
import { parseFontanaDetalles } from "@/types/hostel";
import {
  FONTANA_PLANOS,
  FONTANA_PROPIEDADES_PLANO,
  listHabSlotsConPlanta,
  slotKey,
  type FontanaPlanta,
  type FontanaPropiedadPlano,
  type FontanaSlotDef,
} from "@/lib/fontanaPlanos";
import {
  FONTANA_ESTADO_META,
  buildHabRuntime,
  resolveNumeroHab,
  resolvePlantaHab,
  type FontanaHabRuntime,
} from "@/lib/fontanaEstados";
import { sameLugar } from "@/lib/fontanaLugares";

type Props = {
  habitaciones: Habitacion[];
  reservas: Reserva[];
  onAbrirHabitacion: (h: Habitacion) => void;
  onCrearDesdeSlot: (args: {
    propiedad: FontanaPropiedadPlano;
    planta: FontanaPlanta;
    numero: number;
    capacidad: number;
    modalidad: "DIARIA" | "MENSUAL";
  }) => void;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseFechaLocal(iso: string): Date {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function mapHabitacionesASlots(
  propiedad: FontanaPropiedadPlano,
  habitaciones: Habitacion[]
): Map<string, Habitacion> {
  const layout = FONTANA_PLANOS[propiedad];
  const slots = listHabSlotsConPlanta(layout);
  const map = new Map<string, Habitacion>();
  const delLugar = habitaciones.filter((h) =>
    sameLugar(parseFontanaDetalles(h.detallesJson).nombreLugar, propiedad)
  );
  const used = new Set<number>();

  for (const h of delLugar) {
    const planta = resolvePlantaHab(h);
    const numero = resolveNumeroHab(h);
    if (!planta || !numero) continue;
    const key = slotKey(propiedad, planta, numero);
    if (map.has(key)) continue;
    map.set(key, h);
    used.add(h.habitacionId);
  }

  for (const h of delLugar) {
    if (used.has(h.habitacionId)) continue;
    const numero = resolveNumeroHab(h);
    if (!numero) continue;
    for (const planta of ["PB", "PA"] as FontanaPlanta[]) {
      const key = slotKey(propiedad, planta, numero);
      const exists = slots.some((s) => s.planta === planta && s.slot.numero === numero);
      if (!exists || map.has(key)) continue;
      map.set(key, h);
      used.add(h.habitacionId);
      break;
    }
  }

  return map;
}

/** Celda habitación idéntica al croquis: HAB. XX + ocupación/capacidad */
function HabCell({
  runtime,
  onClick,
}: {
  runtime: FontanaHabRuntime;
  onClick: () => void;
}) {
  const meta = FONTANA_ESTADO_META[runtime.estado];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${runtime.etiquetaCorta} · ${runtime.ocupadas}/${runtime.capacidad} · ${runtime.estadoLabel}`}
      className={`relative flex h-full min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-md border border-white/25 px-1 py-1.5 text-center shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 touch-manipulation ${meta.className}`}
    >
      <span className="text-[9px] sm:text-[10px] font-black tracking-wide leading-none">
        {runtime.etiquetaCorta}
      </span>
      <span className="text-[11px] sm:text-xs font-black tabular-nums leading-none">
        {runtime.ocupadas}/{runtime.capacidad}
      </span>
      {/* Indicador de puerta (esquina) */}
      <span
        className="pointer-events-none absolute bottom-0.5 right-0.5 h-2 w-2 rounded-[1px] border border-white/50 bg-white/10"
        aria-hidden
      />
    </button>
  );
}

function StaticCell({ slot }: { slot: FontanaSlotDef }) {
  if (slot.kind === "acceso") {
    return (
      <div className="flex h-full min-h-[2rem] w-full flex-col items-center justify-center gap-0.5 text-slate-300">
        <span className="text-[10px] leading-none">↑</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-center leading-tight">
          Acceso principal
        </span>
      </div>
    );
  }
  if (slot.kind === "pasillo") {
    return (
      <div className="flex h-full min-h-[3.25rem] w-full items-center justify-center border border-dashed border-white/15 bg-white/[0.03] rounded-md">
        <span
          className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Pasillo
        </span>
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-[3.25rem] w-full items-center justify-center rounded-md border border-white/10 bg-[#0a1020] px-1.5 py-2 text-center">
      <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 whitespace-pre-line leading-tight">
        {slot.label}
      </span>
    </div>
  );
}

function PlantaCroquis({
  propiedad,
  planta,
  layoutSlots,
  cols,
  rows,
  slotMap,
  reservas,
  fecha,
  onHabClick,
}: {
  propiedad: FontanaPropiedadPlano;
  planta: FontanaPlanta;
  layoutSlots: FontanaSlotDef[];
  cols: number;
  rows: number;
  slotMap: Map<string, Habitacion>;
  reservas: Reserva[];
  fecha: Date;
  onHabClick: (
    propiedad: FontanaPropiedadPlano,
    runtime: FontanaHabRuntime,
    slot: FontanaSlotDef
  ) => void;
}) {
  return (
    <div
      className="grid gap-1 p-2 sm:p-2.5 rounded-lg border border-white/20 bg-[#080d18]"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(2.85rem, auto))`,
      }}
    >
      {layoutSlots.map((slot) => {
        const style: React.CSSProperties = {
          gridRow: `${slot.row} / span ${slot.rowSpan || 1}`,
          gridColumn: `${slot.col} / span ${slot.colSpan || 1}`,
        };
        if (slot.kind !== "hab" || !slot.numero) {
          return (
            <div key={slot.id} style={style}>
              <StaticCell slot={slot} />
            </div>
          );
        }
        const key = slotKey(propiedad, planta, slot.numero);
        const hab = slotMap.get(key) || null;
        const runtime = buildHabRuntime({
          habitacion: hab,
          planta,
          numero: slot.numero,
          modalidadDefault: slot.modalidadDefault || "DIARIA",
          capacidadDefault: slot.capacidadDefault || 2,
          reservas,
          fecha,
        });
        return (
          <div key={slot.id} style={style}>
            <HabCell
              runtime={runtime}
              onClick={() => onHabClick(propiedad, runtime, slot)}
            />
          </div>
        );
      })}
    </div>
  );
}

function ColumnaFontana({
  propiedad,
  habitaciones,
  reservas,
  fecha,
  onHabClick,
}: {
  propiedad: FontanaPropiedadPlano;
  habitaciones: Habitacion[];
  reservas: Reserva[];
  fecha: Date;
  onHabClick: (
    propiedad: FontanaPropiedadPlano,
    runtime: FontanaHabRuntime,
    slot: FontanaSlotDef
  ) => void;
}) {
  const layout = FONTANA_PLANOS[propiedad];
  const slotMap = useMemo(
    () => mapHabitacionesASlots(propiedad, habitaciones),
    [propiedad, habitaciones]
  );
  const mixta = layout.distribucion === "MIXTA";

  return (
    <div className="min-w-0 flex flex-col gap-3">
      <div className="text-center space-y-0.5">
        <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-white">
          {propiedad}
        </h3>
        <p
          className={`text-[10px] font-bold uppercase tracking-wider ${
            mixta ? "text-sky-400" : "text-violet-400"
          }`}
        >
          Distribución – {layout.distribucion}
        </p>
      </div>

      {layout.plantas.map((pl) => (
        <div key={`${propiedad}-${pl.planta}`} className="space-y-1.5">
          <div className="inline-flex rounded border border-white/25 px-2 py-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-200">
              {pl.label}
            </span>
          </div>
          <PlantaCroquis
            propiedad={propiedad}
            planta={pl.planta}
            layoutSlots={pl.slots}
            cols={pl.cols}
            rows={pl.rows}
            slotMap={slotMap}
            reservas={reservas}
            fecha={fecha}
            onHabClick={onHabClick}
          />
        </div>
      ))}
    </div>
  );
}

const LEYENDA: { key: keyof typeof FONTANA_ESTADO_META; text: string }[] = [
  { key: "disponible", text: "Disponible (hay camas/lugares libres)" },
  { key: "parcial", text: "Parcialmente ocupada (hay libres)" },
  { key: "reservada", text: "Mensualero — ocupado" },
  { key: "completa", text: "Completa (sin libres)" },
  { key: "mensual", text: "Mensualero — ocupado mensual" },
  { key: "mantenimiento", text: "Fuera de servicio / Mantenimiento" },
];

/**
 * Croquis Fontana 1 / 2 / 3 — vista idéntica al mockup de referencia
 * (3 columnas, PA arriba / PB abajo, celdas HAB + ocupación).
 */
export function FontanaCroquisDashboard({
  habitaciones,
  reservas,
  onAbrirHabitacion,
  onCrearDesdeSlot,
}: Props) {
  const [fechaIso, setFechaIso] = useState(todayIso);
  const fecha = useMemo(() => parseFechaLocal(fechaIso), [fechaIso]);

  const handleHabClick = (
    propiedad: FontanaPropiedadPlano,
    runtime: FontanaHabRuntime,
    slot: FontanaSlotDef
  ) => {
    if (runtime.habitacion) {
      onAbrirHabitacion(runtime.habitacion);
      return;
    }
    onCrearDesdeSlot({
      propiedad,
      planta: runtime.planta,
      numero: runtime.numero,
      capacidad: slot.capacidadDefault || 2,
      modalidad: slot.modalidadDefault || "DIARIA",
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-400">
      {/* Barra compacta de fecha (operativa; no altera el croquis visual) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#0C1327] px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
          Ocupación al
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fechaIso}
            onChange={(e) => setFechaIso(e.target.value || todayIso())}
            className="h-9 w-auto bg-black/30 border-white/10 text-white text-xs rounded-lg"
          />
          {fechaIso !== todayIso() && (
            <Button
              type="button"
              variant="ghost"
              className="h-8 text-[10px] font-bold uppercase text-amber-400 px-2"
              onClick={() => setFechaIso(todayIso())}
            >
              HOY
            </Button>
          )}
        </div>
      </div>

      {/* Triptico idéntico al mockup */}
      <section className="rounded-2xl border border-white/10 bg-[#050910] p-3 sm:p-5 overflow-x-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5 min-w-[280px] lg:min-w-0">
          {FONTANA_PROPIEDADES_PLANO.map((p) => (
            <ColumnaFontana
              key={p}
              propiedad={p}
              habitaciones={habitaciones}
              reservas={reservas}
              fecha={fecha}
              onHabClick={handleHabClick}
            />
          ))}
        </div>
      </section>

      {/* Referencia de estados + notas (como en la imagen) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-white/5 bg-[#0C1327]/90 p-4 sm:p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
            Referencia de estados
          </p>
          <ul className="space-y-2">
            {LEYENDA.map((item) => (
              <li key={item.key} className="flex items-center gap-2.5 text-[11px] text-slate-300 font-medium">
                <span
                  className={`h-3.5 w-3.5 rounded-[3px] shrink-0 border border-white/20 ${FONTANA_ESTADO_META[item.key].chip}`}
                />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
            Notas
          </p>
          <ul className="space-y-1.5 text-[11px] text-slate-400 font-medium list-disc list-inside leading-relaxed">
            <li>Números y capacidades son referenciales.</li>
            <li>Fontana 2 es 100% mensualera.</li>
            <li>Área central (cocina/sala) no se gestiona.</li>
            <li>Cada habitación muestra ocupación / capacidad.</li>
            <li>Tocá una habitación para abrir ficha o darla de alta.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
