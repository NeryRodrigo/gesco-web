"use client";

import { API_BASE, installAuthFetch } from "@/lib/api";
import { loadVordiaSession } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  agroConfiguracion,
  agroContextoAgrofield,
  agroLotesFull,
  agroPing,
  type AgroConfiguracion,
  type AgroLoteFull,
  type AgroModulo,
} from "@/lib/agroApi";
import type { AgroCtx, VistaAgro } from "./context";
import { agroNav, navDisponible, useAgroNav } from "./navStore";
import DashboardView from "./DashboardView";
import GanadoView from "./GanadoView";
import FeedView from "./FeedView";
import HatoView from "./HatoView";
import SanidadView from "./SanidadView";
import AlimentacionView from "./AlimentacionView";
import LotesView from "./LotesView";
import TrazabilidadView from "./TrazabilidadView";
import DispositivosView from "./DispositivosView";
import InventarioView from "./InventarioView";
import FinanzasView from "./FinanzasView";
import ReportesView from "./ReportesView";
import OperacionView from "./OperacionView";

/**
 * VORDIA Agro. Con `embebido` el menú vive en el panel lateral del shell (AgroSidebarNav);
 * sola (ruta /agro) muestra el menú como pestañas arriba.
 */
export default function AgroApp({ embebido = false }: { embebido?: boolean }) {
  const [empresaId, setEmpresaId] = useState(0);
  const [contextoListo, setContextoListo] = useState(false);
  const [config, setConfig] = useState<AgroConfiguracion | null>(null);
  const [lotes, setLotes] = useState<AgroLoteFull[]>([]);
  const [apiOk, setApiOk] = useState(true);
  const [version, setVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [nombre, setNombre] = useState("");
  const { vista, animalFoco, items } = useAgroNav();

  // Resolver empresa (la de la sesión AGRO o Agrofield para usuarios de HQ)
  useEffect(() => {
    installAuthFetch();
    const s = loadVordiaSession();
    const sessionEmp = Number(s?.user?.empresaId || s?.user?.EmpresaId || 0) || 0;
    const rubro = String(s?.user?.rubro || s?.user?.Rubro || "").toUpperCase();

    (async () => {
      try {
        if (rubro === "AGRO" && sessionEmp) {
          setEmpresaId(sessionEmp);
        } else {
          const ctx = await agroContextoAgrofield();
          setEmpresaId(ctx.empresaId);
          if (!ctx.tieneDatos) toast.error("Agrofield sin datos", { description: "Ejecutá Seed_Agrofield_Empresa.sql en GESCO_DB" });
        }
      } catch {
        if (sessionEmp) setEmpresaId(sessionEmp);
        else toast.error("No está la empresa Agrofield", { description: "En GESCO_DB debe existir Empresas.RazonSocial = Agrofield" });
      } finally {
        setContextoListo(true);
      }
    })();
  }, []);

  const cargarBase = useCallback(async (empId: number) => {
    try {
      const [p, c, l] = await Promise.all([
        agroPing().catch(() => null),
        agroConfiguracion(empId),
        agroLotesFull(empId).catch(() => [] as AgroLoteFull[]),
      ]);
      setApiOk(!!p);
      setConfig(c);
      setLotes(l);
      setActualizado(new Date());
    } catch (e: unknown) {
      setApiOk(false);
      toast.error("No se pudo cargar VORDIA Agro", {
        description: e instanceof Error ? e.message : `¿API en ${API_BASE}? ¿Corriste Upgrade_Vordia_Agro_Modulos.sql?`,
      });
    }
  }, []);

  useEffect(() => {
    if (empresaId) void cargarBase(empresaId);
  }, [empresaId, cargarBase]);

  // Publica el menú habilitado por la licencia (lo usa el panel lateral del shell)
  const disponibles = useMemo(() => navDisponible(config), [config]);
  useEffect(() => {
    if (disponibles.length) agroNav.publicar(disponibles);
  }, [disponibles]);

  const tiene = useCallback((m: AgroModulo) => !!config?.modulosActivos.includes(m), [config]);
  const irA = useCallback((v: VistaAgro, opts?: { animalId?: number }) => agroNav.irA(v, opts?.animalId), []);

  const refrescar = useCallback(() => {
    setVersion((v) => v + 1);
    if (empresaId) void cargarBase(empresaId);
  }, [empresaId, cargarBase]);

  const actualizarTodo = () => {
    setSyncing(true);
    refrescar();
    setTimeout(() => setSyncing(false), 600);
  };

  const ctx: AgroCtx | null = config
    ? { empresaId, config, lotes, version, refrescar, irA, tiene, nav: (v: VistaAgro) => items.some((n) => n.id === v) }
    : null;
  const actual = items.find((n) => n.id === vista);

  return (
    <div className="relative text-white pb-10 animate-in fade-in duration-300">
      {/* Encabezado de las vistas internas (el dashboard trae el suyo) */}
      {vista !== "ejecutivo" && (
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div aria-hidden className="pointer-events-none absolute -top-10 right-0 h-48 w-[26rem] max-w-full rounded-full bg-emerald-500/[0.07] blur-3xl" />
          <div className="relative min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/90">
              VORDIA Agro{config ? ` · ${config.paquete}` : ""}
            </p>
            <h1 className="mt-1.5 text-[1.5rem] sm:text-[1.7rem] font-semibold tracking-tight text-white truncate">{actual?.titulo ?? "VORDIA Agro"}</h1>
            {nombre ? <p className="mt-1 text-sm text-white/45 truncate">{nombre}</p> : null}
          </div>
          <div className="relative flex items-center gap-3 shrink-0">
            {actualizado && (
              <p className="hidden sm:block text-[11px] text-white/35">
                Actualizado {actualizado.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <Button
              onClick={actualizarTodo}
              disabled={syncing || !empresaId}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 px-4 shadow-lg shadow-emerald-600/20"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              Actualizar
            </Button>
          </div>
        </div>
      )}

      {!apiOk && (
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          No hay conexión con el módulo Agro. Revisá que la API esté en marcha y que se hayan ejecutado los scripts de VORDIA Agro.
        </div>
      )}

      {/* Sin shell: el menú va como pestañas */}
      {!embebido && items.length > 0 && (
        <nav className="mb-6 -mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-full sm:min-w-0 gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] mx-1">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => irA(n.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[12px] font-semibold tracking-wide transition ${
                  vista === n.id ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25" : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {!ctx || !vista ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[104px] rounded-2xl bg-white/[0.04] border border-white/[0.05] animate-pulse" />
          ))}
          {contextoListo && !empresaId ? <p className="text-sm text-white/40 col-span-full">Sin empresa Agro configurada.</p> : null}
        </div>
      ) : (
        <>
          {vista === "ejecutivo" && <DashboardView ctx={ctx} onActualizar={actualizarTodo} syncing={syncing} />}
          {vista === "ganado" && <GanadoView ctx={ctx} />}
          {vista === "reproduccion" && <HatoView ctx={ctx} modo="reproduccion" />}
          {vista === "cria" && <HatoView ctx={ctx} modo="cria" />}
          {vista === "recria" && <HatoView ctx={ctx} modo="recria" />}
          {vista === "feed" && <FeedView ctx={ctx} onNombre={setNombre} />}
          {vista === "sanidad" && <SanidadView ctx={ctx} />}
          {vista === "alimentacion" && <AlimentacionView ctx={ctx} />}
          {vista === "lotes" && <LotesView ctx={ctx} />}
          {vista === "trazabilidad" && <TrazabilidadView key={animalFoco ?? "buscar"} ctx={ctx} animalInicial={animalFoco} />}
          {vista === "dispositivos" && <DispositivosView ctx={ctx} />}
          {vista === "inventario" && <InventarioView ctx={ctx} />}
          {vista === "finanzas" && <FinanzasView ctx={ctx} />}
          {vista === "reportes" && <ReportesView ctx={ctx} />}
          {vista === "operacion" && <OperacionView ctx={ctx} onGuardado={(c) => setConfig(c)} />}
        </>
      )}
    </div>
  );
}
