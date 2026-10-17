"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroGuardarConfiguracion, type AgroConfiguracion, type AgroModulo } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BTN_PRIMARY, CARD, FIELD, Section } from "./ui";

const SISTEMAS: { id: string; titulo: string; desc: string; modulos: AgroModulo[] }[] = [
  { id: "Cria", titulo: "Cría", desc: "Rodeo de madres, pariciones y venta de terneros.", modulos: ["CRIA", "HEALTH", "TRACE"] },
  { id: "Recria", titulo: "Recría", desc: "Compra de terneros destetados y crecimiento a pasto.", modulos: ["RECRIA", "HEALTH", "TRACE"] },
  { id: "Engorde", titulo: "Engorde a pasto", desc: "Recría y terminación sobre pasturas con suplemento.", modulos: ["RECRIA", "FEED", "HEALTH", "TRACE"] },
  { id: "Confinamiento", titulo: "Confinamiento / Feedlot", desc: "Terminación intensiva a corral con ración.", modulos: ["FEED", "HEALTH", "TRACE", "CONNECT"] },
  { id: "CicloCompleto", titulo: "Ciclo completo", desc: "De la reproducción a la venta del animal terminado.", modulos: ["CRIA", "RECRIA", "FEED", "HEALTH", "TRACE", "FINANCE", "CONNECT"] },
];

const MODULOS: { id: AgroModulo; nombre: string; desc: string }[] = [
  { id: "CRIA", nombre: "VORDIA Cría", desc: "Reproducción, servicio, preñez, parición, terneros, destete e indicadores reproductivos." },
  { id: "RECRIA", nombre: "VORDIA Recría", desc: "Pesajes, GPD, lotes, pasturas, suplementación, objetivos de crecimiento." },
  { id: "FEED", nombre: "VORDIA Feed", desc: "Engorde / confinamiento: raciones, consumo, conversión, corrales, costo por kg y proyección de venta." },
  { id: "HEALTH", nombre: "VORDIA Health", desc: "Vacunas, medicamentos, tratamientos, retiro sanitario, calendario y alertas." },
  { id: "TRACE", nombre: "VORDIA Trace", desc: "Identificación individual, movimientos, genealogía, historial y auditoría." },
  { id: "FINANCE", nombre: "VORDIA Finance", desc: "Costos por cabeza y por lote, inventario valorizado, márgenes y rentabilidad." },
  { id: "CONNECT", nombre: "VORDIA Connect", desc: "RFID, balanzas, collares GPS, gateways, cámaras y sensores." },
];

function paqueteSugerido(sistema: string, mods: AgroModulo[]) {
  if (sistema === "CicloCompleto" || mods.length >= 6) return "Enterprise";
  return mods.length <= 2 ? "Essential" : "Professional";
}

export default function OperacionView({ ctx, onGuardado }: { ctx: AgroCtx; onGuardado: (c: AgroConfiguracion) => void }) {
  const c = ctx.config;
  const [sistema, setSistema] = useState(c.sistemaProductivo);
  const [mods, setMods] = useState<AgroModulo[]>(c.modulosActivos);
  const [p, setP] = useState({
    pesoObjetivoKg: String(c.pesoObjetivoKg),
    pesoObjetivoRecriaKg: String(c.pesoObjetivoRecriaKg),
    gpdMinimoKg: String(c.gpdMinimoKg),
    precioKgGs: String(c.precioKgGs),
    costoRacionKgGs: String(c.costoRacionKgGs),
    gpdObjetivoKg: String(c.gpdObjetivoKg ?? 1.4),
    conversionObjetivo: String(c.conversionObjetivo ?? 8),
  });
  const [guardando, setGuardando] = useState(false);

  const paquete = paqueteSugerido(sistema, mods);
  const toggle = (m: AgroModulo) => setMods((xs) => (xs.includes(m) ? xs.filter((x) => x !== m) : [...xs, m]));

  const guardar = async () => {
    if (!mods.length) return void toast.error("Activá al menos un módulo");
    try {
      setGuardando(true);
      const r = await agroGuardarConfiguracion({
        empresaId: ctx.empresaId,
        sistemaProductivo: sistema,
        modulosActivos: mods,
        paquete,
        pesoObjetivoKg: Number(p.pesoObjetivoKg) || undefined,
        pesoObjetivoRecriaKg: Number(p.pesoObjetivoRecriaKg) || undefined,
        gpdMinimoKg: Number(p.gpdMinimoKg) || undefined,
        precioKgGs: Number(p.precioKgGs) || undefined,
        costoRacionKgGs: Number(p.costoRacionKgGs) || undefined,
        gpdObjetivoKg: Number(p.gpdObjetivoKg) || undefined,
        conversionObjetivo: Number(p.conversionObjetivo) || undefined,
      });
      onGuardado(r);
      ctx.refrescar();
      toast.success("Operación actualizada", { description: `${r.paquete} · ${r.modulosActivos.length} módulos activos` });
    } catch (e: unknown) {
      toast.error("No se pudo guardar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <Section title="1 · Sistema productivo">
        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {SISTEMAS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSistema(s.id);
                setMods(s.modulos);
              }}
              className={`text-left rounded-xl border p-4 transition ${
                sistema === s.id ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/[0.06] bg-[#07110d] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{s.titulo}</p>
                {sistema === s.id ? <Check size={15} className="text-emerald-300" /> : null}
              </div>
              <p className="text-[12px] text-white/45 mt-1 leading-snug">{s.desc}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/35 mt-3">Al elegir un sistema se activan sus módulos recomendados. Después podés activar o desactivar cada uno.</p>
      </Section>

      <Section
        title="2 · Módulos contratados"
        right={
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
            Paquete {paquete}
          </span>
        }
      >
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className={`${CARD} p-4 border-emerald-500/20`}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">VORDIA Agro Base</p>
              <Lock size={13} className="text-white/40" />
            </div>
            <p className="text-[12px] text-white/45 mt-1 leading-snug">Plataforma, usuarios, establecimientos, animales, lotes, dashboard, tareas y reportes esenciales. Siempre incluido.</p>
          </div>
          {MODULOS.map((m) => {
            const on = mods.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={`text-left rounded-xl border p-4 transition ${on ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/[0.06] bg-[#07110d] hover:border-white/20"}`}
                aria-pressed={on}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm">{m.nombre}</p>
                  <span
                    className={`h-5 w-9 rounded-full p-0.5 transition ${on ? "bg-emerald-500" : "bg-white/15"}`}
                    aria-hidden
                  >
                    <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
                  </span>
                </div>
                <p className="text-[12px] text-white/45 mt-1 leading-snug">{m.desc}</p>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-white/35 mt-3">
          Essential: administración básica · Professional: operación + producción + sanidad + trazabilidad · Enterprise: ciclo completo, multi-establecimiento, integraciones y hardware.
        </p>
      </Section>

      <Section title="3 · Parámetros productivos y económicos">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Campo label="Peso objetivo de faena (kg)" value={p.pesoObjetivoKg} onChange={(v) => setP({ ...p, pesoObjetivoKg: v })} />
          <Campo label="Peso objetivo de recría (kg)" value={p.pesoObjetivoRecriaKg} onChange={(v) => setP({ ...p, pesoObjetivoRecriaKg: v })} />
          <Campo label="GPD mínimo aceptable (kg/día)" value={p.gpdMinimoKg} onChange={(v) => setP({ ...p, gpdMinimoKg: v })} step="0.05" />
          <Campo label="GPD objetivo engorde (kg/día)" value={p.gpdObjetivoKg} onChange={(v) => setP({ ...p, gpdObjetivoKg: v })} step="0.05" />
          <Campo label="Conversión objetivo (kg alimento / kg)" value={p.conversionObjetivo} onChange={(v) => setP({ ...p, conversionObjetivo: v })} step="0.1" />
          <Campo label="Precio kg vivo (Gs.)" value={p.precioKgGs} onChange={(v) => setP({ ...p, precioKgGs: v })} />
          <Campo label="Costo ración por kg (Gs.)" value={p.costoRacionKgGs} onChange={(v) => setP({ ...p, costoRacionKgGs: v })} />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button className={`${BTN_PRIMARY} px-6`} disabled={guardando} onClick={() => void guardar()}>
          <Save size={14} /> Guardar operación
        </Button>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, step }: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/45">{label}</span>
      <Input type="number" inputMode="decimal" step={step} value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD} mt-1`} />
    </label>
  );
}
