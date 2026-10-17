"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Beef, Scale, Venus, Mars, Syringe, Search, Download, Plus, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agroAnimalesFull, agroCrearAnimal, type AgroAnimalFull, type AgroEtapa } from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BTN_GHOST, BTN_PRIMARY, CARD, ETAPA_LABEL, Empty, FIELD, Kpi, Pill, SELECT, fmtKg, fmtNum } from "./ui";
import { descargarCsv } from "./csv";

const ETAPAS: AgroEtapa[] = ["Reproductor", "Cria", "Recria", "Engorde", "Terminado", "Vendido", "Baja"];

/** Todo el rodeo en una tabla: buscar, filtrar, exportar y dar de alta. */
export default function GanadoView({ ctx }: { ctx: AgroCtx }) {
  const [animales, setAnimales] = useState<AgroAnimalFull[] | null>(null);
  const [q, setQ] = useState("");
  const [etapa, setEtapa] = useState("activos");
  const [lote, setLote] = useState("");
  const [estado, setEstado] = useState("");
  const [alta, setAlta] = useState(false);
  const [limite, setLimite] = useState(80);

  useEffect(() => {
    let vivo = true;
    agroAnimalesFull(ctx.empresaId)
      .then((r) => vivo && setAnimales(r))
      .catch(() => vivo && setAnimales([]));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  const activos = useMemo(() => (animales ?? []).filter((a) => a.etapa !== "Vendido" && a.etapa !== "Baja"), [animales]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^#/, "");
    return (animales ?? []).filter(
      (a) =>
        (etapa === "activos" ? a.etapa !== "Vendido" && a.etapa !== "Baja" : !etapa || a.etapa === etapa) &&
        (!lote || String(a.loteId ?? "") === lote) &&
        (!estado || a.estado === estado) &&
        (!t || [a.codigoInterno, a.rfidTag, a.categoria, a.raza, a.loteCodigo, a.madreCodigo].some((v) => (v ?? "").toLowerCase().includes(t))),
    );
  }, [animales, q, etapa, lote, estado]);

  if (!animales) return <div className="h-96 rounded-2xl bg-white/[0.04] animate-pulse" />;

  const kgTotal = activos.reduce((s, a) => s + (a.pesoActualKg ?? 0), 0);
  const hembras = activos.filter((a) => a.sexo === "H").length;

  const exportar = () =>
    descargarCsv(
      `rodeo-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Caravana", "RFID", "Categoría", "Sexo", "Raza", "Etapa", "Lote", "Estado", "Peso actual (kg)", "Peso ingreso (kg)", "GPD (kg/d)", "Nacimiento", "Madre", "Padre"],
      lista.map((a) => [
        a.codigoInterno, a.rfidTag, a.categoria, a.sexo, a.raza, ETAPA_LABEL[a.etapa] ?? a.etapa, a.loteCodigo, a.estado,
        a.pesoActualKg, a.pesoIngresoKg, a.gpdKg, a.fechaNacimiento?.slice(0, 10), a.madreCodigo, a.padreCodigo,
      ]),
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Cabezas activas" value={fmtNum(activos.length)} hint={`${fmtNum(animales.length - activos.length)} vendidos o bajas`} icon={<Beef size={15} />} tone="ok" />
        <Kpi label="Kg en pie" value={fmtNum(kgTotal)} hint={activos.length ? `${fmtKg(kgTotal / activos.length, 0)} promedio` : undefined} icon={<Scale size={15} />} />
        <Kpi label="Hembras" value={fmtNum(hembras)} icon={<Venus size={15} />} />
        <Kpi label="Machos" value={fmtNum(activos.length - hembras)} icon={<Mars size={15} />} />
        <Kpi
          label="En tratamiento"
          value={fmtNum(activos.filter((a) => a.estado === "Tratamiento").length)}
          hint={`${activos.filter((a) => a.retiroSanitarioHasta).length} en retiro sanitario`}
          icon={<Syringe size={15} />}
          tone={activos.some((a) => a.estado === "Tratamiento") ? "warn" : "neutral"}
        />
      </div>

      <section className={`${CARD} p-4 sm:p-5`}>
        <div className="flex flex-col xl:flex-row gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caravana, RFID, raza, madre…" className={`${FIELD} pl-9`} inputMode="search" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 xl:w-[520px]">
            <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className={SELECT}>
              <option value="activos">Todos los activos</option>
              <option value="">Incluir vendidos y bajas</option>
              {ETAPAS.map((e) => (
                <option key={e} value={e}>
                  {ETAPA_LABEL[e]}
                </option>
              ))}
            </select>
            <select value={lote} onChange={(e) => setLote(e.target.value)} className={SELECT}>
              <option value="">Todos los lotes</option>
              {ctx.lotes.map((l) => (
                <option key={l.loteId} value={l.loteId}>
                  {l.codigo}
                </option>
              ))}
            </select>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={SELECT}>
              <option value="">Cualquier estado</option>
              <option value="Activo">Activo</option>
              <option value="Tratamiento">En tratamiento</option>
              <option value="FueraZona">Fuera de zona</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportar} className={`${BTN_GHOST} h-11`}>
              <Download size={14} /> CSV
            </Button>
            <Button onClick={() => setAlta(true)} className={`${BTN_PRIMARY} px-4`}>
              <Plus size={14} /> Animal
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-white/40 mb-2">{fmtNum(lista.length)} animales</p>
        {lista.length === 0 ? (
          <Empty>Sin animales con estos filtros.</Empty>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
                  <th className="px-2 py-2 font-medium">Caravana</th>
                  <th className="px-2 py-2 font-medium">Categoría</th>
                  <th className="px-2 py-2 font-medium">Raza</th>
                  <th className="px-2 py-2 font-medium">Etapa</th>
                  <th className="px-2 py-2 font-medium">Lote</th>
                  <th className="px-2 py-2 font-medium text-right">Peso</th>
                  <th className="px-2 py-2 font-medium text-right">GPD</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {lista.slice(0, limite).map((a) => (
                  <tr key={a.animalId} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-2 py-2 font-semibold text-white">#{a.codigoInterno}</td>
                    <td className="px-2 py-2 text-white/75">
                      {a.categoria} {a.sexo === "H" ? "♀" : a.sexo === "M" ? "♂" : ""}
                    </td>
                    <td className="px-2 py-2 text-white/60">{a.raza ?? "—"}</td>
                    <td className="px-2 py-2 text-emerald-300/90">{ETAPA_LABEL[a.etapa] ?? a.etapa}</td>
                    <td className="px-2 py-2 text-white/75">{a.loteCodigo ?? "—"}</td>
                    <td className="px-2 py-2 text-right text-white">{fmtKg(a.pesoActualKg, 0)}</td>
                    <td className={`px-2 py-2 text-right ${a.gpdKg != null && a.etapa === "Engorde" && a.gpdKg < ctx.config.gpdMinimoKg ? "text-rose-300" : "text-white/75"}`}>
                      {a.etapa === "Reproductor" ? "—" : fmtNum(a.gpdKg, 2)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {a.estado === "Tratamiento" ? <Pill tone="warn">Tratamiento</Pill> : a.estado === "FueraZona" ? <Pill tone="danger">Fuera de zona</Pill> : a.estado === "Activo" ? <Pill tone="ok">Activo</Pill> : <Pill>{a.estado}</Pill>}
                        {a.retiroSanitarioHasta ? <Pill tone="warn">Retiro</Pill> : null}
                        {a.listoParaVenta ? <Pill tone="ok">Listo</Pill> : null}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      {ctx.nav("trazabilidad") ? (
                        <button type="button" onClick={() => ctx.irA("trazabilidad", { animalId: a.animalId })} className="inline-flex items-center gap-1 text-[12px] text-white/60 hover:text-white">
                          <ScanLine size={13} /> Ficha
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lista.length > limite && (
          <button type="button" onClick={() => setLimite((l) => l + 120)} className="mt-3 text-[12px] text-emerald-300 hover:underline">
            Ver más ({fmtNum(lista.length - limite)} restantes)
          </button>
        )}
      </section>

      {alta ? <AltaAnimal ctx={ctx} onClose={() => setAlta(false)} /> : null}
    </div>
  );
}

function AltaAnimal({ ctx, onClose }: { ctx: AgroCtx; onClose: () => void }) {
  const [f, setF] = useState({ codigo: "", rfid: "", categoria: "Novillo", sexo: "M", raza: "Brangus", etapa: "Engorde", loteId: "", peso: "" });
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!f.codigo.trim()) return void toast.error("La caravana es obligatoria");
    try {
      setGuardando(true);
      const hoy = new Date().toISOString().slice(0, 10);
      const peso = f.peso ? Number(f.peso) : null;
      await agroCrearAnimal({
        empresaId: ctx.empresaId,
        establecimientoId: ctx.lotes[0]?.establecimientoId,
        codigoInterno: f.codigo.trim(),
        rfidTag: f.rfid.trim() || `RFID-${f.codigo.trim()}`,
        categoria: f.categoria,
        sexo: f.sexo,
        raza: f.raza || null,
        etapa: f.etapa,
        loteId: f.loteId ? Number(f.loteId) : null,
        fechaIngreso: hoy,
        fechaNacimiento: f.etapa === "Cria" ? hoy : null,
        pesoIngresoKg: peso,
        pesoActualKg: peso,
        estado: "Activo",
      });
      toast.success(`#${f.codigo} dado de alta`);
      ctx.refrescar();
      onClose();
    } catch (e) {
      toast.error("No se pudo registrar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div className={`${CARD} bg-[#0b1511] w-full sm:max-w-lg p-5 rounded-b-none sm:rounded-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Alta de animal</h3>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="Caravana *" className={FIELD} />
            <Input value={f.rfid} onChange={(e) => setF({ ...f, rfid: e.target.value })} placeholder="RFID (opcional)" className={FIELD} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value, sexo: ["Vaca", "Vaquilla", "Ternera"].includes(e.target.value) ? "H" : "M" })} className={SELECT}>
              {["Novillo", "Novillito", "Torito", "Toro", "Vaca", "Vaquilla", "Ternero", "Ternera"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={f.sexo} onChange={(e) => setF({ ...f, sexo: e.target.value })} className={SELECT}>
              <option value="M">Macho</option>
              <option value="H">Hembra</option>
            </select>
            <Input value={f.raza} onChange={(e) => setF({ ...f, raza: e.target.value })} placeholder="Raza" className={FIELD} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <select value={f.etapa} onChange={(e) => setF({ ...f, etapa: e.target.value })} className={SELECT}>
              {(["Reproductor", "Cria", "Recria", "Engorde"] as AgroEtapa[]).map((e) => (
                <option key={e} value={e}>
                  {ETAPA_LABEL[e]}
                </option>
              ))}
            </select>
            <select value={f.loteId} onChange={(e) => setF({ ...f, loteId: e.target.value })} className={SELECT}>
              <option value="">Sin lote</option>
              {ctx.lotes.map((l) => (
                <option key={l.loteId} value={l.loteId}>
                  {l.codigo}
                </option>
              ))}
            </select>
            <Input type="number" inputMode="decimal" value={f.peso} onChange={(e) => setF({ ...f, peso: e.target.value })} placeholder="Peso kg" className={FIELD} />
          </div>
          <Button className={`${BTN_PRIMARY} w-full`} disabled={guardando} onClick={() => void guardar()}>
            <Plus size={14} /> Registrar animal
          </Button>
        </div>
      </div>
    </div>
  );
}
