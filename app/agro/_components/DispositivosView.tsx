"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Radio, Wifi, BatteryLow, Fence, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  agroAlertas, agroAnimalesFull, agroDispositivos, agroResolverAlerta, agroSimularUbicacion, agroZonas,
  type AgroAlerta, type AgroAnimalFull, type AgroDispositivo, type AgroZona,
} from "@/lib/agroApi";
import type { AgroCtx } from "./context";
import { BatteryBar, BTN_GHOST, Empty, Kpi, Pill, Section, fmtNum, hace } from "./ui";

export default function DispositivosView({ ctx }: { ctx: AgroCtx }) {
  const [disp, setDisp] = useState<AgroDispositivo[] | null>(null);
  const [zonas, setZonas] = useState<AgroZona[]>([]);
  const [alertas, setAlertas] = useState<AgroAlerta[]>([]);
  const [collares, setCollares] = useState<AgroAnimalFull[]>([]);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      agroDispositivos(ctx.empresaId).catch(() => []),
      agroZonas(ctx.empresaId).catch(() => []),
      agroAlertas(ctx.empresaId).catch(() => []),
      agroAnimalesFull(ctx.empresaId).catch(() => []),
    ]).then(([d, z, a, an]) => {
      if (!vivo) return;
      setDisp(d);
      setZonas(z);
      setAlertas(a.filter((x) => ["FueraZona", "BateriaBaja", "SinSenal", "Camara"].includes(x.tipo)));
      setCollares(an.filter((x) => x.collarId && x.etapa !== "Vendido" && x.etapa !== "Baja"));
    });
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  if (!disp) return <div className="h-96 rounded-2xl bg-white/[0.04] animate-pulse" />;

  const online = disp.filter((d) => d.estado === "Online").length;
  const bateria = disp.filter((d) => d.bateriaPct != null && d.bateriaPct < 25).length;
  const fuera = collares.filter((c) => c.estado === "FueraZona").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Dispositivos" value={fmtNum(disp.length)} hint="Collares, RFID, balanzas, cámaras" icon={<Radio size={15} />} />
        <Kpi label="Online" value={`${online}/${disp.length}`} hint={disp.length ? `${Math.round((online / disp.length) * 100)}% operativos` : undefined} icon={<Wifi size={15} />} tone={online === disp.length ? "ok" : "warn"} />
        <Kpi label="Batería baja" value={fmtNum(bateria)} hint="Menos de 25%" icon={<BatteryLow size={15} />} tone={bateria ? "warn" : "neutral"} />
        <Kpi label="Fuera de zona" value={fmtNum(fuera)} hint="Según collar GPS" icon={<MapPin size={15} />} tone={fuera ? "danger" : "neutral"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Section title="Inventario" icon={<Radio size={15} />}>
          {disp.length ? (
            <div className="space-y-2">
              {disp.map((d) => (
                <div key={d.dispositivoId} className="rounded-xl border border-white/[0.06] bg-[#07110d] px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{d.codigo}</p>
                    <p className="text-[12px] text-white/40">
                      {d.tipo}
                      {d.animalCodigo ? ` · animal #${d.animalCodigo}` : ""}
                      {d.ultimoPingAt ? ` · ${hace(d.ultimoPingAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {d.bateriaPct != null ? <BatteryBar pct={d.bateriaPct} /> : null}
                    <Pill tone={d.estado === "Online" ? "ok" : "warn"}>{d.estado}</Pill>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Sin dispositivos cargados.</Empty>
          )}
        </Section>

        <div className="space-y-4">
          <Section title="Cerca virtual" icon={<Fence size={15} />}>
            <p className="text-[12px] text-white/45 mb-3">El collar GPS valida si un animal sale del perímetro permitido.</p>
            <div className="space-y-2">
              {zonas.map((z) => (
                <div key={z.zonaId} className="rounded-xl border border-white/[0.06] bg-[#07110d] px-4 py-3 flex justify-between gap-2 items-start">
                  <div>
                    <p className="text-sm font-semibold">{z.nombre}</p>
                    <p className="text-[12px] text-white/40 mt-0.5">
                      Radio {fmtNum(z.radioMetros)} m{z.latCentro != null ? ` · ${z.latCentro}, ${z.lngCentro}` : ""}
                    </p>
                  </div>
                  <Pill tone={z.tipo === "Prohibida" ? "danger" : "ok"}>{z.tipo}</Pill>
                </div>
              ))}
              {!zonas.length && <Empty>Sin zonas definidas.</Empty>}
            </div>
          </Section>

          <Section title="Alertas de hardware" icon={<MapPin size={15} />}>
            {alertas.length ? (
              <div className="space-y-2">
                {alertas.map((a) => (
                  <div key={a.alertaId} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#07110d] px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm">{a.titulo}</p>
                      <p className="text-[11px] text-white/40">{hace(a.fechaAlerta)}{a.detalle ? ` · ${a.detalle}` : ""}</p>
                    </div>
                    <Button
                      size="sm"
                      className={BTN_GHOST}
                      onClick={async () => {
                        await agroResolverAlerta(ctx.empresaId, a.alertaId);
                        toast.success("Alerta resuelta");
                        ctx.refrescar();
                      }}
                    >
                      <CheckCircle2 size={13} /> Resolver
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40">Sin alertas de hardware.</p>
            )}
          </Section>

          {collares.length ? (
            <Section title="Prueba de collar (demo)" icon={<Radio size={15} />}>
              <p className="text-[12px] text-white/45 mb-3">Simula un evento GPS fuera de zona hasta que el hardware real esté conectado.</p>
              <div className="flex flex-wrap gap-2">
                {collares.slice(0, 8).map((c) => (
                  <Button
                    key={c.animalId}
                    size="sm"
                    className="rounded-xl border border-rose-400/25 bg-rose-500/5 text-rose-200 hover:bg-rose-500/15 h-9"
                    onClick={async () => {
                      await agroSimularUbicacion({ empresaId: ctx.empresaId, animalId: c.animalId, lat: -23.4411, lng: -58.4452, bateriaPct: 18, generarAlertaFueraZona: true });
                      toast.success(`Simulado: #${c.codigoInterno} fuera de zona`);
                      ctx.refrescar();
                    }}
                  >
                    #{c.codigoInterno}
                  </Button>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
