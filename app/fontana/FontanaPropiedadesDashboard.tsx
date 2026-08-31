"use client";

import React, { useMemo } from "react";
import { Building2, Bed, Plus, LayoutGrid, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Habitacion, parseFontanaDetalles } from "@/types/hostel";
import { formatNombreHabitacionLugar, sameLugar } from "@/lib/fontanaLugares";

type HabEnLugar = {
  habitacion: Habitacion;
  etiqueta: string;
  numero: number;
  activa: boolean;
};

type PropiedadGrupo = {
  lugar: string;
  habitaciones: HabEnLugar[];
};

type Props = {
  lugares: string[];
  habitaciones: Habitacion[];
  etiquetaPorHabitacionId: Map<number, string>;
  onCrearHabitacion: () => void;
  onAbrirHabitacion: (h: Habitacion) => void;
  canCreate: boolean;
};

function habitacionActiva(h: Habitacion): boolean {
  const d = parseFontanaDetalles(h.detallesJson);
  if (h.estado === "Ocupada") return true;
  if (d.estadoInquilino === "Activo" || d.estadoInquilino === "Moroso" || d.estadoInquilino === "Pendiente")
    return true;
  return h.estado !== "Mantenimiento";
}

export function FontanaPropiedadesDashboard({
  lugares,
  habitaciones,
  etiquetaPorHabitacionId,
  onCrearHabitacion,
  onAbrirHabitacion,
  canCreate,
}: Props) {
  const propiedades = useMemo((): PropiedadGrupo[] => {
    const keys = new Map<string, string>(); // lower -> display
    for (const l of lugares) {
      const t = l.trim();
      if (t) keys.set(t.toLowerCase(), t);
    }
    for (const h of habitaciones) {
      const lugar = (parseFontanaDetalles(h.detallesJson).nombreLugar || "").trim();
      if (lugar && !keys.has(lugar.toLowerCase())) keys.set(lugar.toLowerCase(), lugar);
    }

    const groups: PropiedadGrupo[] = [];
    for (const [, lugar] of [...keys.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"))) {
      const list = habitaciones
        .filter((h) => sameLugar(parseFontanaDetalles(h.detallesJson).nombreLugar, lugar))
        .sort((a, b) => a.habitacionId - b.habitacionId)
        .map((h, idx) => ({
          habitacion: h,
          numero: idx + 1,
          etiqueta:
            etiquetaPorHabitacionId.get(h.habitacionId) ||
            formatNombreHabitacionLugar(idx + 1, lugar),
          activa: habitacionActiva(h),
        }));
      groups.push({ lugar, habitaciones: list });
    }
    return groups;
  }, [lugares, habitaciones, etiquetaPorHabitacionId]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-400">
      {/* PROPIEDADES */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-amber-400 shrink-0" />
              Propiedades
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Lista por lugar (Fontana 1/2/3, Quinta…). El croquis operativo está en la pestaña Croquis.
            </p>
          </div>
          <Button
            onClick={onCrearHabitacion}
            disabled={!canCreate}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black italic rounded-xl min-h-11 w-full sm:w-auto touch-manipulation"
          >
            <Plus className="w-4 h-4 mr-2" /> Crear habitación
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {propiedades.map((p) => (
            <Card
              key={p.lugar}
              className="bg-[#0C1327] border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-colors"
            >
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black uppercase tracking-wide text-white truncate">
                      {p.lugar}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      {p.habitaciones.length}{" "}
                      {p.habitaciones.length === 1 ? "habitación" : "habitaciones"}
                    </p>
                  </div>
                </div>

                {p.habitaciones.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-2">
                    Sin habitaciones cargadas en este lugar.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {p.habitaciones.map((item) => (
                      <li key={item.habitacion.habitacionId}>
                        <button
                          type="button"
                          onClick={() => onAbrirHabitacion(item.habitacion)}
                          className="w-full flex items-center gap-2 rounded-xl bg-white/[0.03] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/25 px-3 py-2.5 text-left transition-colors touch-manipulation min-h-11"
                        >
                          <Bed className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                          <span className="flex-1 min-w-0 text-[11px] sm:text-xs font-bold text-slate-200 truncate">
                            {item.etiqueta}
                          </span>
                          <Badge
                            className={`text-[8px] font-black uppercase border-none shrink-0 ${
                              item.activa
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-slate-500/20 text-slate-400"
                            }`}
                          >
                            {item.activa ? "Activa" : "Libre"}
                          </Badge>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ESTRUCTURA JERÁRQUICA */}
      <section className="bg-[#0C1327]/80 border border-white/5 rounded-[1.5rem] p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-black italic uppercase tracking-widest text-white">
            Estructura jerárquica del sistema
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            Propiedad → Habitación · formato Fontana X - Habitación N
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" /> Propiedad
          </span>
          <span className="flex items-center gap-1.5">
            <Bed className="w-3.5 h-3.5 text-amber-400" /> Habitación
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Activa
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4 overflow-x-auto">
          <div className="min-w-[280px] space-y-3">
            <div className="inline-flex items-center gap-2 rounded-xl bg-blue-500/15 border border-blue-500/25 px-3 py-2 text-[11px] font-black uppercase text-blue-200">
              <Building2 className="w-4 h-4" />
              Fontana · Hospedaje
              <span className="text-[9px] font-bold text-blue-300/70 normal-case tracking-normal">
                — Todas las propiedades
              </span>
            </div>

            <div className="pl-2 sm:pl-4 border-l border-white/10 space-y-4 ml-2">
              {propiedades.map((p) => (
                <div key={`tree-${p.lugar}`} className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[10px] font-black uppercase text-white">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    {p.lugar}
                  </div>
                  <div className="pl-3 sm:pl-5 flex flex-wrap gap-2">
                    {p.habitaciones.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic">Sin habitaciones</span>
                    ) : (
                      p.habitaciones.map((item) => (
                        <button
                          key={item.habitacion.habitacionId}
                          type="button"
                          onClick={() => onAbrirHabitacion(item.habitacion)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C1327] border border-white/10 hover:border-amber-500/40 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 touch-manipulation"
                        >
                          <Bed className="w-3 h-3 text-amber-400" />
                          {item.etiqueta}
                          {item.activa && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 sm:p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/90">
            Cómo funciona
          </p>
          <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal list-inside font-medium">
            <li>Seleccionás una propiedad (ej. Fontana 1).</li>
            <li>
              Se listan las habitaciones como <strong className="text-slate-200">Fontana 1 - Habitación 1</strong>, etc.
            </li>
            <li>Desde cada habitación gestionás huésped, cobros, calendario y documentos.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
