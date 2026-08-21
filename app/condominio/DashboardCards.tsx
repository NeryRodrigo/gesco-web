"use client";

import { API_BASE } from "@/lib/api";

import React, { useMemo, useState, useDeferredValue, useEffect, startTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, CheckCircle2, Wallet, Clock, Calendar, AlertTriangle, Filter, Zap, Check, X, RefreshCw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { ConsultarEstadoAndeModal } from "./ConsultarEstadoAndeModal";
import { AndeDesgloseFacturasModal, abrirFacturaPdf } from "./AndeDesgloseFacturasModal";
import { AndeLoginCredencialesModal } from "./AndeLoginCredencialesModal";
import { MorosidadesMainModal } from "./MorosidadesMainModal";
import { verificarPermisoGranular, ModalAccesoRestringido } from "@/app/login/PermisosGranularesMatriz";
import { formatDuplex, formatFechaCorta } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);
};

/** Formato compacto para tarjetas en pantallas chicas (celular / iPad). */
const formatMetricDisplay = (value: string | number, isCurrency: boolean) => {
  if (typeof value === "string") return value;
  if (!isCurrency) return String(value);
  const n = Number(value) || 0;
  if (n >= 1_000_000_000) {
    return `Gs. ${(n / 1_000_000_000).toLocaleString("es-PY", { maximumFractionDigits: 1 })} mil M`;
  }
  if (n >= 1_000_000) {
    return `Gs. ${(n / 1_000_000).toLocaleString("es-PY", { maximumFractionDigits: 1 })} M`;
  }
  if (n >= 1_000) {
    return `Gs. ${Math.round(n).toLocaleString("es-PY")}`;
  }
  return `Gs. ${Math.round(n)}`;
};

const ANDE_API = `${API_BASE}/api/Ande`;

type AndeFacturaLive = {
  monto: number;
  estado: string;
  emision: string;
  vencimiento: string;
  fechaPago?: string;
  consumoKw?: number | null;
  secNis?: string | null;
  secRec?: string | null;
  fechaFacturacion?: string | null;
  facturaElectronica?: boolean;
};

type AndeConsultaLive = {
  nis: string;
  titular?: string;
  saldoDeuda: number;
  consumoKw: number;
  facturasPendientes: number;
  estadoPago: string;
  vencimiento: string;
  observaciones?: string;
  esSimulado?: boolean;
  facturas?: AndeFacturaLive[];
};

type AndeRowView = {
  hasNis: boolean;
  consulted: boolean;
  error?: string;
  facturaEmitida: boolean;
  /** Sin factura del mes actual: se muestra última emitida en rojo a la espera. */
  esperandoMesActual: boolean;
  isPagado: boolean;
  isVencido: boolean;
  vencimientoLabel: string;
  fechaPagoLabel: string | null;
  consumoKw: number;
  monto: number;
  montoHint?: string | null;
  puedePdf: boolean;
};

const soloDigitosNis = (nis?: string | null) => (nis || "").replace(/\D/g, "");

const parseFechaAnde = (raw?: string | null): Date | null => {
  if (!raw || !String(raw).trim()) return null;
  const s = String(raw).trim();
  const d1 = new Date(s);
  if (!Number.isNaN(d1.getTime()) && /^\d{4}/.test(s)) return d1;
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1;
    let yyyy = parseInt(m[3], 10);
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(yyyy, mm, dd);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d2 = new Date(s);
  return Number.isNaN(d2.getTime()) ? null : d2;
};

const esEmisionMesActual = (raw?: string | null) => {
  const d = parseFechaAnde(raw);
  if (!d) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const esPendienteFactura = (estado?: string) => {
  const e = (estado || "").trim();
  if (!e) return true;
  if (/pagad|cobrad|al\s*d[ií]a/i.test(e)) return false;
  if (/pend|deud/i.test(e)) return true;
  const code = e.toUpperCase();
  if (/^ER[012]/.test(code) || code === "ER620") return true;
  if (/^ER3/.test(code)) return false;
  return false;
};

const esPagadaFactura = (estado?: string) => {
  const e = (estado || "").trim();
  if (/pend|deud/i.test(e)) return false;
  if (/pagad|cobrad|al\s*d[ií]a/i.test(e)) return true;
  const code = e.toUpperCase();
  if (/^ER3/.test(code)) return true;
  if (/^ER[012]/.test(code) || code === "ER620") return false;
  return /pagad|cobrad/i.test(e);
};

/** Mapea respuesta JWT ANDE → columnas de la grilla (sin datos simulados). */
const mapAndeLiveToRow = (live: AndeConsultaLive | undefined | null): AndeRowView => {
  if (!live) {
    return {
      hasNis: true,
      consulted: false,
      facturaEmitida: false,
      esperandoMesActual: false,
      isPagado: false,
      isVencido: false,
      vencimientoLabel: "—",
      fechaPagoLabel: null,
      consumoKw: 0,
      monto: 0,
      montoHint: null,
      puedePdf: false,
    };
  }

  const obs = live.observaciones || "";
  const fallida =
    !!live.esSimulado ||
    /fall[oó]|bloque[oó]|Radware|credenciales|inv[aá]lido|no existe|Error interpretando/i.test(obs);

  const facturas = live.facturas || [];
  const pendientes = facturas.filter((f) => esPendienteFactura(f.estado));
  const pagadas = facturas.filter((f) => esPagadaFactura(f.estado));
  const saldo = Number(live.saldoDeuda) || 0;
  const isPagado =
    saldo <= 0 &&
    pendientes.length === 0 &&
    !/PENDIENTE/i.test(live.estadoPago || "");

  const conMonto = (arr: AndeFacturaLive[]) =>
    arr.find((f) => Number(f.monto) > 0) || arr[0];

  const facturaRef = isPagado
    ? conMonto(pagadas) || conMonto(facturas)
    : conMonto(pendientes) || conMonto(facturas);

  const monto = isPagado
    ? Number(facturaRef?.monto) || 0
    : saldo > 0
      ? saldo
      : pendientes.reduce((a, f) => a + (Number(f.monto) || 0), 0) || Number(facturaRef?.monto) || 0;

  const emisionRef = facturaRef?.emision || "";
  const emitidaEsteMes =
    esEmisionMesActual(emisionRef) ||
    (!!pendientes.length && esEmisionMesActual(pendientes[0]?.emision));
  const esperandoMesActual = isPagado && monto > 0 && !emitidaEsteMes;

  const vencRaw =
    (!isPagado ? live.vencimiento : "") ||
    facturaRef?.vencimiento ||
    live.vencimiento ||
    "";
  const vencDate = parseFechaAnde(vencRaw);
  const consumo =
    Number(facturaRef?.consumoKw) ||
    Number(live.consumoKw) ||
    0;

  const facturaEmitida = emitidaEsteMes || (!isPagado && (pendientes.length > 0 || saldo > 0));

  const isVencido = !isPagado && !!vencDate && vencDate.getTime() < Date.now();

  let fechaPagoLabel: string | null = null;
  // Si está al día / última emitida en rojo: mostrar fecha de pago (o emisión como respaldo)
  if (isPagado || esperandoMesActual) {
    const pagoRaw = facturaRef?.fechaPago || facturaRef?.emision || "";
    if (pagoRaw) {
      const em = parseFechaAnde(pagoRaw);
      fechaPagoLabel = em
        ? em.toLocaleString("es-PY", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : pagoRaw;
    }
  }

  const montoHint = esperandoMesActual
    ? "Última emitida · a la espera del mes actual"
    : isPagado
      ? "Abonado (Gs. 0)"
      : null;

  return {
    hasNis: true,
    consulted: true,
    error: fallida ? obs || "Consulta ANDE incompleta" : undefined,
    facturaEmitida,
    esperandoMesActual,
    isPagado,
    isVencido,
    vencimientoLabel: vencDate ? vencDate.toLocaleDateString("es-PY") : vencRaw || "—",
    fechaPagoLabel,
    consumoKw: consumo,
    monto,
    montoHint,
    puedePdf: monto > 0 || facturaEmitida || !!facturaRef || !fallida,
  };
};

const ANDE_LIVE_CACHE_KEY = "vordia.andeLiveByNis";
const ANDE_SYNC_AT_KEY = "vordia.andeSyncAt";

function loadAndeLiveCache(): Record<string, AndeConsultaLive> {
  try {
    const raw = sessionStorage.getItem(ANDE_LIVE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAndeLiveCache(map: Record<string, AndeConsultaLive>, syncAt: string | null) {
  try {
    sessionStorage.setItem(ANDE_LIVE_CACHE_KEY, JSON.stringify(map));
    if (syncAt) sessionStorage.setItem(ANDE_SYNC_AT_KEY, syncAt);
  } catch {
    /* ignore quota */
  }
}

export type DashboardFichaTarget = {
  id: number;
  code: string;
  condo: string;
  tenant: string | null;
  status: string;
  nisAnde?: string | null;
};

export function DashboardCards({
  dashboardData,
  onRefresh,
  onOpenFicha,
}: {
  dashboardData: any;
  onRefresh?: () => Promise<void> | void;
  onOpenFicha?: (unidad: DashboardFichaTarget, tab?: "ficha" | "pagos") => void;
}) {
  const [detailView, setDetailView] = useState<"none" | "ocupados" | "disponibles" | "objetivos" | "cobrados" | "faltaCobrar" | "vencimientos" | "morosos" | "andeNIS">("none");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAndeModalOpen, setIsAndeModalOpen] = useState(false);
  const [selectedNisForModal, setSelectedNisForModal] = useState("");
  const [desgloseOpen, setDesgloseOpen] = useState(false);
  const [desgloseLoading, setDesgloseLoading] = useState(false);
  const [desgloseCtx, setDesgloseCtx] = useState<{
    nis: string;
    duplex?: string;
    inquilino?: string;
    titular?: string;
    saldoDeuda?: number;
    facturas: AndeFacturaLive[];
  } | null>(null);
  const [groupByDetail, setGroupByDetail] = useState<"none" | "condominio" | "comprobante">("condominio");
  /** Filtros diferidos: el tipeo no bloquea el render del listado en móviles. */
  const deferredColFilters = useDeferredValue(colFilters);
  /** Paginación progresiva: evita pintar cientos de filas de golpe en celular. */
  const LIST_PAGE_SIZE = 28;
  const [listPage, setListPage] = useState(1);

  useEffect(() => {
    setListPage(1);
  }, [detailView, deferredColFilters, groupByDetail]);
  const [isMorosidadesOpen, setIsMorosidadesOpen] = useState(false);
  const [expandedMorosoId, setExpandedMorosoId] = useState<number | null>(null);
  const [morosoCuotas, setMorosoCuotas] = useState<Record<number, any[]>>({});
  const [loadingMorosoId, setLoadingMorosoId] = useState<number | null>(null);
  /** Datos reales ANDE por NIS (JWT). Persisten en sessionStorage al salir de Inicio. */
  const [andeLiveByNis, setAndeLiveByNis] = useState<Record<string, AndeConsultaLive>>(() => loadAndeLiveCache());
  const [isAndeSyncing, setIsAndeSyncing] = useState(false);
  const [andeSyncAt, setAndeSyncAt] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ANDE_SYNC_AT_KEY);
    } catch {
      return null;
    }
  });
  const [andeLoginOpen, setAndeLoginOpen] = useState(false);
  const [alertaRestriccion, setAlertaRestriccion] = useState<{
    visible: boolean;
    mensaje?: string;
    permisoNombre?: string;
  }>({ visible: false });
  const andeAutoSyncDone = React.useRef(false);

  const resolveAndeRow = (item: any): AndeRowView => {
    const nisKey = soloDigitosNis(item?.nisAnde);
    if (!nisKey || item?.nisAnde === "N/A" || item?.nisAnde === "SIN NIS") {
      return {
        hasNis: false,
        consulted: false,
        facturaEmitida: false,
        esperandoMesActual: false,
        isPagado: false,
        isVencido: false,
        vencimientoLabel: "—",
        fechaPagoLabel: null,
        consumoKw: 0,
        monto: 0,
        montoHint: null,
        puedePdf: false,
      };
    }
    return mapAndeLiveToRow(andeLiveByNis[nisKey]);
  };

  /** Doble clic en NIS: desglose de comprobantes reales (como Últimos Comprobantes ANDE). */
  const openDesgloseNis = async (item: any) => {
    const nisKey = soloDigitosNis(item?.nisAnde);
    if (!nisKey) {
      toast.error("NIS inválido");
      return;
    }

    setDesgloseOpen(true);
    setDesgloseLoading(true);
    setDesgloseCtx({
      nis: nisKey,
      duplex: item.duplex,
      inquilino: item.inquilino,
      facturas: [],
    });

    try {
      let live = andeLiveByNis[nisKey];
      if (!live || !(live.facturas?.length)) {
        const res = await fetch(`${ANDE_API}/jwt/consultar/${encodeURIComponent(nisKey)}`);
        if (!res.ok) throw new Error("No se pudo consultar el NIS en ANDE");
        live = (await res.json()) as AndeConsultaLive;
        setAndeLiveByNis((prev) => ({ ...prev, [nisKey]: live! }));
      }

      const facturas = live.facturas || [];
      if (facturas.length < 2) {
        toast.message("Este NIS tiene menos de 2 comprobantes en ANDE", {
          description: facturas.length === 0 ? "Sin facturas para desglosar." : "Se muestra el único comprobante disponible.",
        });
      }

      setDesgloseCtx({
        nis: nisKey,
        duplex: item.duplex,
        inquilino: item.inquilino,
        titular: live.titular,
        saldoDeuda: live.saldoDeuda,
        facturas,
      });
    } catch (err: any) {
      toast.error(err?.message || "Error al cargar desglose ANDE");
      setDesgloseOpen(false);
    } finally {
      setDesgloseLoading(false);
    }
  };

  const syncAndeSaldosGrilla = async () => {
    const verif = verificarPermisoGranular("panel_consultar_ande");
    if (!verif.permitido) {
      setAlertaRestriccion({
        visible: true,
        mensaje: verif.mensaje || "🚫 Acceso Restringido en Módulo de Panel: No cuentas con el permiso para 'Consultar Saldos y Corte ANDE'. Este comportamiento ha sido denegado para tu perfil.",
        permisoNombre: "Panel • Consultar Saldos y Corte ANDE"
      });
      return;
    }

    const nisList = Array.from(
      new Set(
        (dashboardData?.ocupados || [])
          .map((u: any) => soloDigitosNis(u?.nisAnde))
          .filter((n: string) => n.length > 0)
      )
    );

    if (nisList.length === 0) {
      toast.error("No hay NIS ANDE cargados en los dúplex ocupados.");
      return;
    }

    setIsAndeSyncing(true);
    const toastId = toast.loading(`Consultando ANDE (${nisList.length} medidores)…`);
    try {
      // Si la instalación no tiene CI/clave ANDE, pedirlas en modal y persistir en appsettings.
      const estadoRes = await fetch(`${ANDE_API}/credenciales/estado`);
      const estado = await estadoRes.json().catch(() => ({} as any));
      if (!estadoRes.ok || !estado?.configurado) {
        toast.dismiss(toastId);
        setIsAndeSyncing(false);
        setAndeLoginOpen(true);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);
      const res = await fetch(`${ANDE_API}/jwt/consultar-lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nisList }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const body = await res.json().catch(() => ({} as any));
      if (res.status === 401 && body?.requiereCredenciales) {
        toast.dismiss(toastId);
        setIsAndeSyncing(false);
        setAndeLoginOpen(true);
        return;
      }
      if (!res.ok) {
        throw new Error(body?.mensaje || `Error HTTP ${res.status} al consultar lote ANDE`);
      }

      const map: Record<string, AndeConsultaLive> = {};
      for (const r of body.resultados || []) {
        const key = soloDigitosNis(r?.nis);
        if (key) map[key] = r as AndeConsultaLive;
      }
      setAndeLiveByNis(map);
      const syncLabel = new Date().toLocaleTimeString("es-PY");
      setAndeSyncAt(syncLabel);
      saveAndeLiveCache(map, syncLabel);

      const okCount = Object.values(map).filter(
        (r) => !r.esSimulado && !/fall[oó]|bloque[oó]|Radware|credenciales/i.test(r.observaciones || "")
      ).length;
      toast.success(`ANDE actualizado: ${okCount}/${nisList.length} NIS con datos reales`, { id: toastId });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        toast.error("La consulta lote a ANDE tardó demasiado. Reintentá.", { id: toastId });
      } else {
        toast.error(err?.message || "No se pudieron consultar los saldos ANDE", { id: toastId });
      }
    } finally {
      setIsAndeSyncing(false);
    }
  };

  // Al entrar a ANDE NIS: si hay credenciales y poco/nada en cache, reconsultar datos reales.
  React.useEffect(() => {
    if (detailView !== "andeNIS") {
      andeAutoSyncDone.current = false;
      return;
    }
    if (andeAutoSyncDone.current || isAndeSyncing) return;
    andeAutoSyncDone.current = true;
    const hasCache = Object.keys(andeLiveByNis).length > 0;
    void (async () => {
      try {
        const estadoRes = await fetch(`${ANDE_API}/credenciales/estado`);
        const estado = await estadoRes.json().catch(() => ({} as any));
        if (!estadoRes.ok || !estado?.configurado) {
          // Pedir login solo si no hay cache útil
          if (!hasCache) setAndeLoginOpen(true);
          return;
        }
        // Siempre refrescar al reentrar para datos reales (no solo cache vieja)
        await syncAndeSaldosGrilla();
      } catch {
        if (!hasCache) setAndeLoginOpen(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailView]);

  const openTenantFicha = (item: any, tab: "ficha" | "pagos" = "ficha") => {
    if (!onOpenFicha || !item?.unidadId) return;
    const esDisponible =
      detailView === "disponibles" ||
      String(item?.estado || item?.inquilino || "")
        .toLowerCase()
        .includes("disponible");
    onOpenFicha(
      {
        id: Number(item.unidadId),
        code: String(item.duplex || ""),
        condo: String(item.condominio || ""),
        tenant: esDisponible ? null : item.inquilino ?? null,
        status: esDisponible ? "Disponible" : "Ocupado",
        nisAnde: String(item.nisAnde ?? "")
          .trim()
          .replace(/^["']+|["']+$/g, "") || null,
      },
      tab
    );
  };

  // Si cambia un NIS en ocupados mientras estamos en ANDE NIS, reconsultar lote.
  const ocupadosNisFingerprint = useMemo(
    () =>
      (dashboardData?.ocupados || [])
        .map((u: any) => `${u.unidadId}:${soloDigitosNis(u?.nisAnde)}`)
        .sort()
        .join("|"),
    [dashboardData?.ocupados]
  );
  const prevOcupadosNisFp = React.useRef<string>("");
  React.useEffect(() => {
    if (detailView !== "andeNIS") {
      prevOcupadosNisFp.current = ocupadosNisFingerprint;
      return;
    }
    if (prevOcupadosNisFp.current && prevOcupadosNisFp.current !== ocupadosNisFingerprint) {
      void syncAndeSaldosGrilla();
    }
    prevOcupadosNisFp.current = ocupadosNisFingerprint;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocupadosNisFingerprint, detailView]);

  const loadMorosoCuotas = async (morosidadId: number) => {
    if (!morosidadId) return;
    setLoadingMorosoId(morosidadId);
    try {
      const resp = await fetch(`${API_BASE}/api/Morosidad/${morosidadId}?t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setMorosoCuotas(prev => ({ ...prev, [morosidadId]: data.cuotas || [] }));
      } else {
        toast.error("No se pudieron cargar las cuotas de morosidad");
      }
    } catch {
      toast.error("Error de red al cargar cuotas");
    } finally {
      setLoadingMorosoId(null);
    }
  };

  const handleMorosoClick = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = item.morosidadId;
    if (!id) return;
    if (e.detail === 2) {
      setExpandedMorosoId(null);
      return;
    }
    if (expandedMorosoId === id) {
      setExpandedMorosoId(null);
      return;
    }
    setExpandedMorosoId(id);
    if (!morosoCuotas[id]) {
      await loadMorosoCuotas(id);
    }
  };

  const toggleDetail = (view: any) => {
    if (detailView === view) {
      setDetailView("none");
    } else {
      const verif = verificarPermisoGranular("panel_ver_dashboard");
      if (!verif.permitido) {
        setAlertaRestriccion({
          visible: true,
          mensaje: verif.mensaje || "🚫 Acceso Restringido en Módulo de Panel: No cuentas con el permiso para 'Ver Tarjetas del Panel / Dashboard'. Este comportamiento ha sido denegado para tu perfil.",
          permisoNombre: "Panel • Ver Tarjetas del Panel / Dashboard"
        });
        return;
      }
      startTransition(() => {
        setDetailView(view);
        setColFilters({});
        setListPage(1);
        if (view !== "cobrados" && groupByDetail === "comprobante") {
          setGroupByDetail("condominio");
        }
      });
    }
  };

  if (!dashboardData) return null;

  const stats = {
    occupied: dashboardData.summary.totalOcupados || 0,
    available: dashboardData.summary.totalDisponibles || 0,
    objective: dashboardData.summary.objetivoMes || 0,
    collected: dashboardData.summary.cobradoMes || 0,
    pending: dashboardData.summary.faltaCobrar || 0,
    debtors: dashboardData.summary.totalMorosos || 0,
  };

  const renderDetailList = () => {
    if (detailView === "none") return null;

    let list: any[] = [];
    let title = "";
    let color = "";
    let total = 0;

    // ... (Tu lógica de asignación de list, title, color y total se mantiene exactamente igual)
    if (detailView === "ocupados") {
        list = dashboardData.ocupados;
        title = "Listado de Dúplex Ocupados";
        color = "text-blue-400 bg-[#0C1327]";
    } else if (detailView === "disponibles") {
        list = dashboardData.disponibles;
        title = "Listado de Dúplex Disponibles";
        color = "text-emerald-400 bg-[#0C1327]";
    } else if (detailView === "objetivos") {
        list = dashboardData.objetivosMes;
        title = "Objetivos del Mes (Proyección)";
        color = "text-indigo-400 bg-[#0C1327]";
    } else if (detailView === "cobrados") {
        list = dashboardData.cobrados;
        title = "Listado de Cobros del Mes";
        color = "text-emerald-400 bg-[#0C1327]";
    } else if (detailView === "faltaCobrar") {
        list = dashboardData.faltaCobrar;
        title = "Listado de Pendientes de Cobro";
        color = "text-amber-400 bg-[#0C1327]";
    } else if (detailView === "vencimientos") {
        list = dashboardData.vencimientos;
        title = "Listado de Finalización de Contratos";
        color = "text-orange-400 bg-[#0C1327]";
        // Ordenar por fecha de fin (más próximos primero)
        list = [...(list || [])].sort((a: any, b: any) => {
          const da = a.fecha ? new Date(a.fecha).getTime() : Number.MAX_SAFE_INTEGER;
          const db = b.fecha ? new Date(b.fecha).getTime() : Number.MAX_SAFE_INTEGER;
          return da - db;
        });
    } else if (detailView === "morosos") {
        list = dashboardData.morosos;
        title = "Listado de Morosos (Desalojados)";
        color = "text-red-400 bg-[#0C1327]";
    } else if (detailView === "andeNIS") {
        list = dashboardData.ocupados;
        title = "Consulta de Medidores ANDE";
        color = "text-blue-400 bg-[#0C1327]";
    }

    // ... (Tu lógica de filteredList se mantiene exactamente igual hasta el final del filtro)
    const filteredList = (list || []).filter((item: any) => {
        // ... (todo tu bloque de filtros actual)
        if (deferredColFilters.duplex) {
            const str = `${item.duplex || ""} ${item.condominio || ""}`.toLowerCase();
            if (!str.includes(deferredColFilters.duplex.toLowerCase())) return false;
        }
        if (deferredColFilters.inquilino) {
          const str = `${item.inquilino || ""}`.toLowerCase();
          if (!str.includes(deferredColFilters.inquilino.toLowerCase())) return false;
        }
        if (deferredColFilters.docNis) {
          const str = `${item.cedula || ""} ${item.nisAnde || ""}`.toLowerCase();
          if (!str.includes(deferredColFilters.docNis.toLowerCase())) return false;
        }
        if (deferredColFilters.nis) {
          const str = `${item.nisAnde || ""}`.toLowerCase();
          if (!str.includes(deferredColFilters.nis.toLowerCase())) return false;
        }
        if (deferredColFilters.vencimiento) {
          if (detailView === "andeNIS") {
            const ande = resolveAndeRow(item);
            const dateStr = ande.vencimientoLabel;
            if (!dateStr.toLowerCase().includes(deferredColFilters.vencimiento.toLowerCase())) return false;
          } else {
            const dateStr = item.fecha ? new Date(item.fecha).toLocaleDateString() : "";
            if (!dateStr.toLowerCase().includes(deferredColFilters.vencimiento.toLowerCase())) return false;
          }
        }
        if (deferredColFilters.fechaPago) {
          if (detailView === "andeNIS") {
            const ande = resolveAndeRow(item);
            const dateStr = ande.fechaPagoLabel || "";
            if (!dateStr.toLowerCase().includes(deferredColFilters.fechaPago.toLowerCase())) return false;
          } else {
            const isPagado = item.andePagadoEsteMes;
            const dateStr = isPagado && item.andeFechaPago ? new Date(item.andeFechaPago).toLocaleDateString() : "";
            if (!dateStr.toLowerCase().includes(deferredColFilters.fechaPago.toLowerCase())) return false;
          }
        }
        if (deferredColFilters.estadoPago) {
          if (detailView === "andeNIS") {
            const ande = resolveAndeRow(item);
            const str = ande.consulted
              ? (ande.isPagado ? "al dia al día pagado sin deuda" : "pendiente activa no pagado factura emitida")
              : "sin consultar";
            if (!str.includes(deferredColFilters.estadoPago.toLowerCase())) return false;
          } else {
            const isPagado = item.andePagadoEsteMes;
            const str = isPagado ? "al dia al día pagado sin deuda" : "pendiente activa no pagado emitido factura emitida prox proxima próxima emisión";
            if (!str.includes(deferredColFilters.estadoPago.toLowerCase())) return false;
          }
        }
        if (deferredColFilters.consumo) {
          if (detailView === "andeNIS") {
            const ande = resolveAndeRow(item);
            const str = `${ande.consumoKw} kw`.toLowerCase();
            if (!str.includes(deferredColFilters.consumo.toLowerCase())) return false;
          } else {
            const isPagado = item.andePagadoEsteMes;
            const montoFactura = item.andeMontoDeuda || 0;
            const montoReal = item.andeMontoDeuda ? item.andeMontoDeuda : (isPagado ? ((parseInt((item.nisAnde || "0").slice(-2)) * 2500) + 85000) : montoFactura);
            const kWConsumo = item.andeConsumoKw || Math.round((montoReal - 85000) / 450);
            const str = `${kWConsumo} kw`.toLowerCase();
            if (!str.includes(deferredColFilters.consumo.toLowerCase())) return false;
          }
        }
        if (deferredColFilters.monto) {
          if (detailView === "andeNIS") {
            const ande = resolveAndeRow(item);
            const val = ande.monto || 0;
            if (!val.toString().includes(deferredColFilters.monto) && !val.toLocaleString().includes(deferredColFilters.monto)) return false;
          } else {
            const isPagado = item.andePagadoEsteMes;
            const montoFactura = item.andeMontoDeuda || 0;
            const montoReal = montoFactura;
            const val = item.montoRestante || montoReal || item.monto || 0;
            if (!val.toString().includes(deferredColFilters.monto) && !val.toLocaleString().includes(deferredColFilters.monto)) return false;
          }
        }
        if (deferredColFilters.factura) {
          const f = deferredColFilters.factura.toLowerCase();
          if (detailView === "cobrados") {
            const tipo =
              item.facturaEmitida ||
              String(item.tipoComprobante || "").toLowerCase().includes("factura")
                ? "factura"
                : "recibo";
            const str = `${tipo} ${item.numeroFactura || item.factura || item.tipoComprobante || item.estadoFactura || ""}`.toLowerCase();
            if (!str.includes(f)) return false;
          } else {
            const str = `${item.factura || item.numeroFactura || item.estadoFactura || ""}`.toLowerCase();
            if (!str.includes(f)) return false;
          }
        }
        if (deferredColFilters.interes) {
          const val = item.interesAcumulado || 0;
          if (!val.toString().includes(deferredColFilters.interes) && !val.toLocaleString().includes(deferredColFilters.interes)) return false;
        }
        if (deferredColFilters.fecha) {
          const dateStr = item.fecha ? new Date(item.fecha).toLocaleDateString("es-PY") : "";
          if (!dateStr.toLowerCase().includes(deferredColFilters.fecha.toLowerCase())) return false;
        }
        return true;
    });

    const visibleLimit = listPage * LIST_PAGE_SIZE;
    const pagedList = filteredList.slice(0, visibleLimit);
    const hasMoreRows = filteredList.length > pagedList.length;

    // Recalcular total para el footer global
    if (detailView === "ocupados" || detailView === "objetivos" || detailView === "cobrados" || detailView === "vencimientos" || detailView === "morosos") {
        total = filteredList.reduce((acc: any, curr: any) => acc + (curr.monto || 0), 0);
    } else if (detailView === "faltaCobrar") {
        total = filteredList.reduce((acc: any, curr: any) => acc + (curr.montoRestante || 0), 0);
    } else if (detailView === "andeNIS") {
        total = filteredList.reduce((acc: any, curr: any) => {
          const ande = resolveAndeRow(curr);
          return acc + (ande.consulted && !ande.isPagado ? ande.monto : 0);
        }, 0);
    }

    // Agrupación: condominio (todos) o tipo comprobante (solo cobrados)
    // Se agrupa sobre la lista filtrada completa; la paginación limita filas visibles.
    const groups: Record<string, any[]> = {};
    if (groupByDetail === "condominio") {
        filteredList.forEach(item => {
            const key = item.condominio || "Sin Condominio";
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
    } else if (groupByDetail === "comprobante") {
        filteredList.forEach(item => {
            const esFactura =
              !!item.facturaEmitida ||
              String(item.tipoComprobante || "").toLowerCase().includes("factura");
            const key = esFactura ? "Facturas" : "Recibos";
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
    }

    const groupNamesSorted =
      groupByDetail === "none"
        ? []
        : Object.keys(groups).sort((a, b) => {
            if (groupByDetail === "comprobante") {
              if (a === "Facturas") return -1;
              if (b === "Facturas") return 1;
            }
            return a.localeCompare(b, "es");
          });

    /** Filas a pintar (paginadas) respetando orden de grupos. */
    const pagedGroups: { name: string; items: any[]; subtotal: number }[] = [];
    if (groupByDetail !== "none") {
      let budget = visibleLimit;
      for (const groupName of groupNamesSorted) {
        if (budget <= 0) break;
        const allItems = groups[groupName];
        const items = allItems.slice(0, budget);
        budget -= items.length;
        const groupSubtotal = allItems.reduce((acc, curr) => {
          if (detailView === "faltaCobrar") return acc + (curr.montoRestante || 0);
          if (detailView === "andeNIS") {
            const ande = resolveAndeRow(curr);
            return acc + (ande.consulted && !ande.isPagado ? ande.monto : 0);
          }
          return acc + (curr.monto || 0);
        }, 0);
        pagedGroups.push({ name: groupName, items, subtotal: groupSubtotal });
      }
    }

    // Función auxiliar para renderizar una fila (para no repetir código)
    const renderRow = (item: any, idx: any) => {
      const morosidadId = item.morosidadId as number | undefined;
      const isExpanded = detailView === "morosos" && morosidadId != null && expandedMorosoId === morosidadId;
      const cuotas = morosidadId ? (morosoCuotas[morosidadId] || []) : [];

      return (
      <React.Fragment key={idx}>
        <tr
          className={`hover:bg-white/5 transition-colors h-[56px] text-white ${
            detailView === "morosos" ||
            (detailView === "disponibles" && onOpenFicha && item.unidadId)
              ? "cursor-pointer"
              : ""
          }`}
          onClick={
            detailView === "morosos"
              ? (e) => handleMorosoClick(item, e)
              : detailView === "disponibles" && onOpenFicha && item.unidadId
                ? () => openTenantFicha(item, "ficha")
                : undefined
          }
          title={
            detailView === "morosos"
              ? "Clic: ver cuotas · Doble clic: cerrar"
              : detailView === "disponibles"
                ? "Abrir ficha del dúplex"
                : undefined
          }
        >
            <td className="px-8 py-4">
              <p className="font-black italic uppercase text-white text-sm tracking-tighter">{formatDuplex(item.duplex)}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{String(item.condominio || "").replace(/Aguz/gi, "Agus")}</p>
            </td>
            <td className="px-8 py-4">
              <div className="flex items-center gap-2">
                {detailView === "morosos" && (
                  isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-red-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
                <div>
                  {(detailView === "ocupados" ||
                    detailView === "objetivos" ||
                    detailView === "cobrados" ||
                    detailView === "disponibles") &&
                  onOpenFicha &&
                  item.unidadId ? (
                    <button
                      type="button"
                      className={`font-bold text-sm text-left hover:underline hover:text-blue-400 transition-colors ${
                        detailView === "disponibles" ? "text-emerald-400" : "text-slate-100"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openTenantFicha(
                          item,
                          detailView === "cobrados" ? "pagos" : "ficha"
                        );
                      }}
                      title={
                        detailView === "cobrados"
                          ? "Abrir ficha · Historial de pagos"
                          : detailView === "disponibles"
                            ? "Abrir ficha del dúplex disponible"
                            : "Abrir ficha del inquilino"
                      }
                    >
                      {item.inquilino}
                    </button>
                  ) : (
                    <p className={`font-bold text-sm ${detailView === "disponibles" ? "text-emerald-400" : "text-slate-100"}`}>{item.inquilino}</p>
                  )}
                  {detailView === "ocupados" && item.ocupantes && (
                    <p className="text-[10px] text-slate-400">{item.ocupantes} ocupantes</p>
                  )}
                  {detailView === "morosos" && (
                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">
                      {loadingMorosoId === morosidadId ? "Cargando cuotas..." : isExpanded ? "Detalle de cuotas abierto" : "Clic para ver cuotas"}
                    </p>
                  )}
                </div>
              </div>
            </td>
            {/* ... (Aquí van TODAS las celdas <td> que ya tienes en tu código original, cópialas tal cual) ... */}
            {detailView === "ocupados" && (
                <td className="px-8 py-4 text-center">
                <p className="text-xs font-bold text-slate-300">{item.cedula}</p>
                <p className="text-[10px] text-slate-400">NIS: {item.nisAnde}</p>
                </td>
            )}
            {detailView === "faltaCobrar" && (
                <td className="px-8 py-4 text-center">
                <p className="text-xs font-bold text-muted-foreground">{item.cedula}</p>
                </td>
            )}
            {detailView === "disponibles" && (
                <td className="px-8 py-4 text-center">
                <p className="text-xs font-bold text-muted-foreground">NIS: {item.nisAnde}</p>
                </td>
            )}
            {detailView === "andeNIS" && (() => {
                const ande = resolveAndeRow(item);
                if (!ande.hasNis) {
                return (
                    <>
                    <td className="px-8 py-4 text-center">
                        <Badge className="bg-muted text-muted-foreground font-black px-3 border-none uppercase tracking-widest">-</Badge>
                    </td>
                    <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                    <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                    <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                    <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                    <td className="px-8 py-4 text-right"><p className="font-black italic text-muted-foreground">-</p></td>
                    <td className="px-8 py-4 text-right"></td>
                    </>
                );
                }

                if (!ande.consulted) {
                return (
                    <>
                    <td className="px-8 py-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <Badge className="bg-muted text-muted-foreground font-black px-3 border-none uppercase tracking-widest">{item.nisAnde}</Badge>
                        <Badge className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 border border-slate-200 uppercase tracking-tighter">
                          SIN CONSULTAR
                        </Badge>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center"><span className="text-muted-foreground text-[10px] font-bold">—</span></td>
                    <td className="px-8 py-4 text-center"><span className="text-muted-foreground font-bold text-[10px]">—</span></td>
                    <td className="px-8 py-4 text-center">
                      <span className="text-[9px] text-muted-foreground font-medium">Usá CONSULTAR SALDOS ANDE</span>
                    </td>
                    <td className="px-8 py-4 text-center"><span className="text-muted-foreground text-[10px]">—</span></td>
                    <td className="px-8 py-4 text-right"><p className="font-black italic text-muted-foreground">—</p></td>
                    <td className="px-8 py-4 text-right"></td>
                    </>
                );
                }

                const liveFacturas = andeLiveByNis[soloDigitosNis(item.nisAnde)]?.facturas || [];
                const cantFacturas = liveFacturas.length;
                const { isPagado, isVencido, monto, consumoKw, facturaEmitida, esperandoMesActual, montoHint, vencimientoLabel, fechaPagoLabel, puedePdf, error } = ande;
                const montoEnRojo = !isPagado || esperandoMesActual;
                
                return (
                <>
                    <td className="px-8 py-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                        <Badge
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            openDesgloseNis(item);
                          }}
                          title="Doble clic: ver desglose de comprobantes ANDE"
                          className="bg-muted text-muted-foreground font-black px-3 border-none uppercase tracking-widest cursor-pointer hover:ring-2 hover:ring-blue-400/60 select-none"
                        >
                          {item.nisAnde}
                        </Badge>
                        {error ? (
                        <Badge className="bg-red-50 text-red-600 text-[9px] font-bold px-2 py-0.5 border border-red-200 uppercase tracking-tighter" title={error}>ERROR ANDE</Badge>
                        ) : facturaEmitida ? (
                        <Badge className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 border border-emerald-200 uppercase tracking-tighter">FACTURA EMITIDA</Badge>
                        ) : (
                        <Badge className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 border border-amber-200 uppercase tracking-tighter" title="Aún no emitió la factura del mes actual; se muestra la última emitida">PRÓX. EMISIÓN</Badge>
                        )}
                        {cantFacturas >= 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDesgloseNis(item);
                            }}
                            className="text-[8px] font-black uppercase text-blue-500 hover:underline tracking-tighter"
                          >
                            {cantFacturas} comprobantes · ver desglose
                          </button>
                        )}
                    </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                    <p className={`text-[10px] font-bold ${isVencido ? 'text-red-500 bg-red-50 py-1 px-2 rounded-md inline-block' : 'text-muted-foreground'}`}>
                        {vencimientoLabel}
                    </p>
                    </td>
                    <td className="px-8 py-4 text-center">
                    {(isPagado || esperandoMesActual) && fechaPagoLabel ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground bg-muted py-1 px-2 rounded-md inline-block">
                          {fechaPagoLabel}
                          </p>
                          {esperandoMesActual && (
                            <span className="text-[8px] font-bold text-red-400 uppercase tracking-tighter">Pago última emitida</span>
                          )}
                        </div>
                    ) : (
                        <span className="text-muted-foreground font-bold text-[10px]">—</span>
                    )}
                    </td>
                    <td className="px-8 py-4 text-center">
                    {isPagado ? (
                        <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-500 font-bold text-xs"><Check className="w-4 h-4"/> Al Día</div>
                        <span className="text-[9px] text-muted-foreground font-medium">
                          {esperandoMesActual ? "Sin deuda · espera mes actual" : "Sin Deuda ANDE"}
                        </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center gap-1 text-red-500 font-bold text-xs"><X className="w-4 h-4"/> Pendiente</div>
                        <span className="text-[9px] text-red-400 font-medium">Factura Activa</span>
                        </div>
                    )}
                    </td>
                    <td className="px-8 py-4 text-center">
                    <p className="font-bold text-[10px] text-muted-foreground">{consumoKw} kW</p>
                    </td>
                    <td className="px-8 py-4 text-right">
                    <p className={`font-black italic ${montoEnRojo ? 'text-red-600' : 'text-emerald-500'}`}>
                        Gs. {monto.toLocaleString("es-PY")}
                    </p>
                    {montoHint && (
                        <p className={`text-[9px] font-bold mt-1 ${esperandoMesActual ? 'text-red-400' : 'text-emerald-400'}`}>
                          {montoHint}
                        </p>
                    )}
                    </td>
                    <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                            {puedePdf && (
                            <button
                                type="button"
                                onClick={(e) => {
                                e.stopPropagation();
                                const verif = verificarPermisoGranular("panel_factura_pdf");
                                if (!verif.permitido) {
                                    setAlertaRestriccion({
                                    visible: true,
                                    mensaje: verif.mensaje || "🚫 Acceso Restringido en Módulo de Panel: No cuentas con el permiso para 'Descargar Factura PDF de ANDE'. Este comportamiento ha sido denegado para tu perfil.",
                                    permisoNombre: "Panel • Descargar Factura PDF de ANDE"
                                    });
                                    return;
                                }
                                const live = andeLiveByNis[soloDigitosNis(item.nisAnde)];
                                const facts = live?.facturas || [];
                                const target =
                                  facts.find((f) => esPendienteFactura(f.estado) && f.secNis && f.secRec) ||
                                  facts.find((f) => f.secNis && f.secRec) ||
                                  facts[0];
                                if (!target?.secNis || !target?.secRec) {
                                  toast.warning(
                                    "No hay datos de factura en caché para este NIS. Tocá «Consultar Saldos ANDE» y reintentá FACTURA PDF."
                                  );
                                  return;
                                }
                                void abrirFacturaPdf(item.nisAnde, item.inquilino || "", item.duplex || "", {
                                  secNis: target.secNis,
                                  secRec: target.secRec,
                                  fFact: target.fechaFacturacion || target.emision,
                                  electronica: target.facturaElectronica !== false,
                                });
                                }}
                                className="bg-yellow-400 text-black border border-yellow-500 shadow-sm text-[9px] font-black italic px-3 py-2 rounded-lg hover:scale-105 hover:bg-yellow-500 transition-all max-md:hover:scale-100">
                                FACTURA PDF
                            </button>
                            )}
                        </div>
                    </td>
                </>
                );
            })()}
            {detailView !== "andeNIS" && (
                <td className="px-8 py-4 text-right">
                <p className={`font-black italic ${detailView === 'morosos' ? 'text-red-400' : detailView === 'faltaCobrar' ? 'text-amber-400' : detailView === 'disponibles' ? 'text-slate-400' : 'text-blue-400'}`}>
                    {detailView === 'faltaCobrar' ? formatCurrency(item.montoRestante || 0) : detailView === 'disponibles' ? 'A DEFINIR' : formatCurrency(item.monto)}
                </p>
                </td>
            )}
            {detailView === "morosos" && (
                <td className="px-8 py-4 text-right">
                <p className="font-black italic text-red-400">
                    {formatCurrency(item.interesAcumulado || 0)}
                </p>
                </td>
            )}
            {detailView === "cobrados" && (
                <>
                <td className="px-8 py-4 text-center">
                    {(() => {
                      const esFactura =
                        !!item.facturaEmitida ||
                        String(item.tipoComprobante || "").toLowerCase().includes("factura");
                      const nro = item.numeroFactura || item.nroComprobante || "";
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            className={`${
                              esFactura
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            } font-black italic text-[9px] uppercase`}
                          >
                            {esFactura ? "Factura" : "Recibo"}
                          </Badge>
                          {nro ? (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                              {nro}
                            </span>
                          ) : null}
                        </div>
                      );
                    })()}
                </td>
                <td className="px-8 py-4 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    {item.fecha ? new Date(item.fecha).toLocaleDateString('es-PY') : '-'}
                    </p>
                </td>
                </>
            )}
            {detailView === "vencimientos" && (
                <td className="px-8 py-4 text-center">
                {(() => {
                  if (!item.fecha) {
                    return <p className="text-xs font-bold text-muted-foreground">Sin fecha</p>;
                  }
                  const fin = new Date(item.fecha);
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  fin.setHours(0, 0, 0, 0);
                  const dias = Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                  const tone =
                    dias < 0
                      ? "text-red-600 bg-red-50"
                      : dias <= 30
                        ? "text-orange-600 bg-orange-50"
                        : dias <= 90
                          ? "text-amber-700 bg-amber-50"
                          : "text-slate-700 bg-slate-100";
                  const extra =
                    dias < 0
                      ? ` · Vencido hace ${Math.abs(dias)}d`
                      : dias === 0
                        ? " · Vence hoy"
                        : ` · ${dias}d`;
                  return (
                    <p className={`text-xs font-bold uppercase py-1 px-3 rounded-lg inline-block ${tone}`}>
                      {formatFechaCorta(item.fecha)}
                      <span className="normal-case font-semibold opacity-80">{extra}</span>
                    </p>
                  );
                })()}
                </td>
            )}
        </tr>
        {isExpanded && (
          <tr className="bg-red-50/40">
            <td colSpan={4} className="px-8 py-4">
              {loadingMorosoId === morosidadId ? (
                <p className="text-xs font-bold text-muted-foreground">Cargando cuotas del financiamiento...</p>
              ) : cuotas.length === 0 ? (
                <p className="text-xs font-bold text-muted-foreground">No hay cuotas registradas para esta morosidad.</p>
              ) : (
                <div className="rounded-xl border border-red-100 overflow-hidden bg-card">
                  <table className="w-full text-left">
                    <thead className="bg-red-100/60 text-[9px] font-black uppercase tracking-widest text-red-700">
                      <tr>
                        <th className="px-4 py-2">Cuota</th>
                        <th className="px-4 py-2">Vencimiento</th>
                        <th className="px-4 py-2 text-right">Monto</th>
                        <th className="px-4 py-2 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotas.map((c: any) => (
                        <tr key={c.cuotaId} className="border-t border-red-50 text-xs">
                          <td className="px-4 py-2 font-bold">#{c.numeroCuota}</td>
                          <td className="px-4 py-2">{c.fechaVencimiento ? formatFechaCorta(c.fechaVencimiento) : "-"}</td>
                          <td className="px-4 py-2 text-right font-black italic">{formatCurrency(c.monto || 0)}</td>
                          <td className="px-4 py-2 text-center">
                            <Badge className={`border-none font-black text-[9px] uppercase ${c.estaPagado ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                              {c.estaPagado ? "Pagada" : "Pendiente"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </td>
          </tr>
        )}
      </React.Fragment>
      );
    };

    return (
      <Card className="border border-white/5 shadow-2xl rounded-[2rem] bg-[#0C1327] overflow-hidden mb-12 mt-4 text-white">
        <CardHeader className={`${color} p-6 sm:p-8 flex flex-row items-center justify-between border-b border-white/5`}>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-inherit">
              {title}
              <Badge className="bg-white/10 text-white border-none text-xs px-2.5 py-0.5">
                {filteredList.length} registro{filteredList.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Detalle de operaciones por unidad · Filtrado por columna</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Agrupar: Condominio | Facturas/Recibos (en Cobrado) | Ninguno */}
            <div className="flex items-center gap-1 bg-card/50 p-1 rounded-full border border-black/5 mr-2 flex-wrap">
               <span className="text-[9px] font-black uppercase px-2 opacity-60">Agrupar:</span>
               <button 
                 type="button"
                 onClick={() => setGroupByDetail("condominio")}
                 className={`text-[10px] font-black uppercase px-3 py-2 rounded-full transition-all ${
                   groupByDetail === "condominio" 
                   ? "bg-primary text-white shadow-md" 
                   : "bg-card text-foreground hover:bg-muted"
                 }`}
               >
                 Condominio
               </button>
               {detailView === "cobrados" && (
                 <button
                   type="button"
                   onClick={() => setGroupByDetail("comprobante")}
                   className={`text-[10px] font-black uppercase px-3 py-2 rounded-full transition-all ${
                     groupByDetail === "comprobante"
                       ? "bg-emerald-600 text-white shadow-md"
                       : "bg-card text-foreground hover:bg-muted"
                   }`}
                 >
                   Facturas / Recibos
                 </button>
               )}
               <button
                 type="button"
                 onClick={() => setGroupByDetail("none")}
                 className={`text-[10px] font-black uppercase px-3 py-2 rounded-full transition-all ${
                   groupByDetail === "none"
                     ? "bg-slate-600 text-white shadow-md"
                     : "bg-card text-foreground hover:bg-muted"
                 }`}
               >
                 Ninguno
               </button>
            </div>

            {Object.keys(colFilters).some(k => colFilters[k]) && (
              <button 
                onClick={() => setColFilters({})} 
                className="bg-card/80 hover:bg-card text-foreground text-[10px] font-black uppercase px-3 py-2 rounded-full border border-black/10 shadow-sm transition-all flex items-center gap-1.5"
                title="Limpiar todos los filtros de columna"
              >
                <X className="w-3.5 h-3.5 text-red-500" /> Limpiar Filtros
              </button>
            )}

            {detailView === "morosos" && (
              <Button
                onClick={() => setIsMorosidadesOpen(true)}
                variant="destructive"
                className="h-9 rounded-full font-black italic text-[10px] uppercase px-4 shadow-md shadow-red-500/20"
              >
                Morosidades
              </Button>
            )}

            {detailView === "andeNIS" && (
              <button
                onClick={syncAndeSaldosGrilla}
                disabled={isAndeSyncing}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white text-xs font-black italic uppercase px-4 py-2 rounded-full shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer mr-1"
                title="Rellena la grilla con saldos reales ANDE (sesión JWT)"
              >
                {isAndeSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-300 fill-current animate-pulse" />
                )}
                <span>{isAndeSyncing ? "CONSULTANDO ANDE…" : "CONSULTAR SALDOS ANDE"}</span>
              </button>
            )}
            {detailView === "andeNIS" && andeSyncAt && (
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide mr-2">
                Última sync: {andeSyncAt}
              </span>
            )}
            {detailView === "andeNIS" && (
              <button
                onClick={() => {
                  setSelectedNisForModal("");
                  setIsAndeModalOpen(true);
                }}
                className="bg-card hover:bg-muted text-foreground text-[10px] font-black uppercase px-3 py-2 rounded-full border border-black/15 shadow-sm transition-all mr-1"
                title="Consulta puntual de un NIS"
              >
                NIS puntual
              </button>
            )}
            <button
              onClick={async () => {
                const verif = verificarPermisoGranular("panel_actualizar");
                if (!verif.permitido) {
                  setAlertaRestriccion({
                    visible: true,
                    mensaje: verif.mensaje || "🚫 Acceso Restringido en Módulo de Panel: No cuentas con el permiso para 'Actualizar Sincronización del Panel'. Este comportamiento ha sido denegado para tu perfil.",
                    permisoNombre: "Panel • Actualizar Sincronización del Panel"
                  });
                  return;
                }
                setIsRefreshing(true);
                if (onRefresh) {
                  await onRefresh();
                } else {
                  window.location.reload();
                }
                // Tras refrescar dashboard (p.ej. NIS editado), reconsultar ANDE si estamos en esa vista
                if (detailView === "andeNIS") {
                  andeAutoSyncDone.current = false;
                  await syncAndeSaldosGrilla();
                }
                setTimeout(() => setIsRefreshing(false), 800);
              }}
              disabled={isRefreshing}
              className="bg-card hover:bg-muted text-foreground text-xs font-black uppercase px-4 py-2 rounded-full border border-black/15 shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Actualizar y refrescar datos de la pantalla"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>
            <button 
              onClick={() => { setDetailView("none"); setColFilters({}); setGroupByDetail("condominio"); }} 
              className="p-2 rounded-full hover:bg-black/10 transition-colors ml-2 bg-black/5"
              title="Cerrar vista de detalle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto mobile-scroll-x custom-scrollbar" data-mobile-scroll="x">
            <table className="w-full min-w-[920px] text-left font-sans dashboard-detail-table">
              <thead className="bg-[#0A1631] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white border-b border-white/10">
                {/* ... (Tu TableHead se mantiene igual) ... */}
                <tr>
                  <th className="px-8 py-4">Dúplex / Condominio</th>
                  <th className="px-8 py-4">
                    {detailView === "disponibles" ? "Estado" : "Inquilino"}
                  </th>
                  {detailView === "ocupados" && (
                    <th className="px-8 py-4 text-center">Documento / NIS</th>
                  )}
                  {detailView === "faltaCobrar" && (
                    <th className="px-8 py-4 text-center">Documento</th>
                  )}
                  {detailView === "disponibles" && (
                    <th className="px-8 py-4 text-center">NIS</th>
                  )}
                  {detailView === "andeNIS" && (
                    <>
                      <th className="px-8 py-4 text-center">NIS ANDE</th>
                      <th className="px-8 py-4 text-center">Vencimiento</th>
                      <th className="px-8 py-4 text-center">Fecha de Pago</th>
                      <th className="px-8 py-4 text-center">Estado de Pago</th>
                      <th className="px-8 py-4 text-center">Consumo kW</th>
                    </>
                  )}
                  <th className="px-8 py-4 text-right">
                    {detailView === "faltaCobrar" ? "Monto Restante" : detailView === "morosos" ? "Monto Atrasado" : detailView === "andeNIS" ? "Monto Factura" : "Monto"}
                  </th>
                  {detailView === "andeNIS" && (
                    <th className="px-8 py-4 text-right"></th>
                  )}
                  {detailView === "morosos" && (
                    <th className="px-8 py-4 text-right">Interés Acum..</th>
                  )}
                  {detailView === "cobrados" && (
                    <>
                      <th className="px-8 py-4 text-center">Comprobante</th>
                      <th className="px-8 py-4 text-center">Fecha Pago</th>
                    </>
                  )}
                  {detailView === "vencimientos" && (
                    <>
                      <th className="px-8 py-4 text-center">Fecha de Finalización</th>
                    </>
                  )}
                </tr>
                {/* FILTROS DE COLUMNA */}
                <tr className="bg-background/50 border-b border-border">
                    <th className="px-4 py-2">
                        <input
                        type="text"
                        placeholder="🔍 Filtrar dúplex..."
                        value={colFilters.duplex || ""}
                        onChange={(e) => setColFilters({ ...colFilters, duplex: e.target.value })}
                        className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                    </th>
                    <th className="px-4 py-2">
                        <input
                        type="text"
                        placeholder={detailView === "disponibles" ? "🔍 Filtrar estado..." : "🔍 Filtrar inquilino..."}
                        value={colFilters.inquilino || ""}
                        onChange={(e) => setColFilters({ ...colFilters, inquilino: e.target.value })}
                        className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                    </th>
                    {detailView === "ocupados" && (
                        <th className="px-4 py-2">
                        <input
                            type="text"
                            placeholder="🔍 Doc / NIS..."
                            value={colFilters.docNis || ""}
                            onChange={(e) => setColFilters({ ...colFilters, docNis: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                        />
                        </th>
                    )}
                    {detailView === "faltaCobrar" && (
                        <th className="px-4 py-2">
                        <input
                            type="text"
                            placeholder="🔍 Documento..."
                            value={colFilters.docNis || ""}
                            onChange={(e) => setColFilters({ ...colFilters, docNis: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                        />
                        </th>
                    )}
                    {detailView === "disponibles" && (
                        <th className="px-4 py-2">
                        <input
                            type="text"
                            placeholder="🔍 NIS..."
                            value={colFilters.nis || ""}
                            onChange={(e) => setColFilters({ ...colFilters, nis: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                        />
                        </th>
                    )}
                    {detailView === "andeNIS" && (
                        <>
                        <th className="px-4 py-2">
                            <input
                            type="text"
                            placeholder="🔍 NIS..."
                            value={colFilters.nis || ""}
                            onChange={(e) => setColFilters({ ...colFilters, nis: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                            />
                        </th>
                        <th className="px-4 py-2">
                            <input
                            type="text"
                            placeholder="🔍 Vencimiento..."
                            value={colFilters.vencimiento || ""}
                            onChange={(e) => setColFilters({ ...colFilters, vencimiento: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                            />
                        </th>
                        <th className="px-4 py-2">
                            <input
                            type="text"
                            placeholder="🔍 Fecha pago..."
                            value={colFilters.fechaPago || ""}
                            onChange={(e) => setColFilters({ ...colFilters, fechaPago: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                            />
                        </th>
                        <th className="px-4 py-2">
                            <input
                            type="text"
                            placeholder="🔍 Al Día / Pend..."
                            value={colFilters.estadoPago || ""}
                            onChange={(e) => setColFilters({ ...colFilters, estadoPago: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                            />
                        </th>
                        <th className="px-4 py-2">
                            <input
                            type="text"
                            placeholder="🔍 Consumo..."
                            value={colFilters.consumo || ""}
                            onChange={(e) => setColFilters({ ...colFilters, consumo: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                            />
                        </th>
                        </>
                    )}
                    <th className="px-4 py-2">
                        <input
                        type="text"
                        placeholder="🔍 Monto..."
                        value={colFilters.monto || ""}
                        onChange={(e) => setColFilters({ ...colFilters, monto: e.target.value })}
                        className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-right"
                        />
                    </th>
                    {detailView === "andeNIS" && (
                        <th className="px-4 py-2 text-center">
                        <button
                            onClick={() => setColFilters({})}
                            className="bg-muted hover:bg-slate-300 text-foreground text-[9px] font-black uppercase px-2 py-1 rounded transition-colors w-full"
                            title="Limpiar todos los filtros"
                        >
                            Limpiar
                        </button>
                        </th>
                    )}
                    {detailView === "morosos" && (
                        <th className="px-4 py-2">
                        <input
                            type="text"
                            placeholder="🔍 Interés..."
                            value={colFilters.interes || ""}
                            onChange={(e) => setColFilters({ ...colFilters, interes: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-right"
                        />
                        </th>
                    )}
                    {detailView === "cobrados" && (
                        <>
                        <th className="px-4 py-2">
                            <input
                            type="text"
                            placeholder="🔍 Factura / Recibo..."
                            value={colFilters.factura || ""}
                            onChange={(e) => setColFilters({ ...colFilters, factura: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                            title="Ej: factura, recibo o número"
                            />
                        </th>
                        <th className="px-4 py-2">
                            <input
                            type="text"
                            placeholder="🔍 Fecha..."
                            value={colFilters.fecha || ""}
                            onChange={(e) => setColFilters({ ...colFilters, fecha: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                            />
                        </th>
                        </>
                    )}
                    {detailView === "vencimientos" && (
                        <th className="px-4 py-2">
                        <input
                            type="text"
                            placeholder="🔍 Vencimiento..."
                            value={colFilters.vencimiento || ""}
                            onChange={(e) => setColFilters({ ...colFilters, vencimiento: e.target.value })}
                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
                        />
                        </th>
                    )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-8 py-12 text-center text-slate-400 font-bold text-sm">
                      No se encontraron registros.
                    </td>
                  </tr>
                ) : groupByDetail === "none" ? (
                  pagedList.map((item, idx) => renderRow(item, idx))
                ) : (
                  pagedGroups.map(({ name: groupName, items: groupItems, subtotal: groupSubtotal }) => {
                    const isComprobanteGroup = groupByDetail === "comprobante";
                    const groupIconTone = isComprobanteGroup
                      ? groupName === "Facturas"
                        ? "text-emerald-400"
                        : "text-blue-400"
                      : "text-blue-400";
                    const groupBadgeTone = isComprobanteGroup
                      ? groupName === "Facturas"
                        ? "bg-emerald-600/20 text-emerald-300"
                        : "bg-blue-600/20 text-blue-300"
                      : "bg-blue-600/20 text-blue-300";

                    return (
                      <React.Fragment key={groupName}>
                        <tr className="bg-[#0A1631] border-y border-white/10">
                          <td colSpan={12} className="px-8 py-3">
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Home className={`w-4 h-4 ${groupIconTone}`} />
                                  <span className="text-sm sm:text-base font-black uppercase italic tracking-wider text-white">
                                    {isComprobanteGroup ? groupName : `CONDOMINIO: ${String(groupName).replace(/Aguz/gi, "Agus")}`}
                                  </span>
                                  <Badge className={`${groupBadgeTone} border-none text-[10px] font-bold`}>
                                    {groups[groupName]?.length || groupItems.length}{" "}
                                    {isComprobanteGroup ? "COBROS" : "UNIDADES"}
                                  </Badge>
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase">
                                  Subtotal Grupo: <span className="text-white">{formatCurrency(groupSubtotal)}</span>
                                </span>
                             </div>
                          </td>
                        </tr>
                        {groupItems.map((item, idx) => renderRow(item, `${groupName}-${idx}`))}
                      </React.Fragment>
                    );
                  })
                )}
                {hasMoreRows && (
                  <tr>
                    <td colSpan={12} className="px-8 py-5 text-center bg-[#0A1631]/80">
                      <button
                        type="button"
                        onClick={() => startTransition(() => setListPage((p) => p + 1))}
                        className="inline-flex items-center justify-center min-h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wide touch-manipulation active:scale-95"
                      >
                        Ver más ({pagedList.length} de {filteredList.length})
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-[#0A1631] p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-white border-t border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-widest font-sans text-slate-400">
              {detailView === 'andeNIS' ? 'Total facturas activas pendientes' : 'Totalización del listado'}
              {hasMoreRows ? ` · mostrando ${Math.min(visibleLimit, filteredList.length)}/${filteredList.length}` : ""}
            </p>
            <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter text-white">{formatCurrency(total)}</h3>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      
      {/* Misma presentación en móvil y PC: tarjetas horizontales compactas */}
      <div className="dashboard-metric-grid grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-4 mb-2 sm:mb-4">
        {[
          { id: "ocupados", label: "Ocupados", labelShort: "Ocupados", value: stats.occupied, icon: Users, color: "text-primary", bg: "bg-primary/10", suffix: " Dúplex", currency: false },
          { id: "disponibles", label: "Disponibles", labelShort: "Disponibles", value: stats.available === 0 ? "Completo" : stats.available, icon: Home, color: "text-emerald-400", bg: "bg-emerald-400/10", suffix: stats.available === 0 ? "" : " Dúplex", currency: false },
          { id: "objetivos", label: "Objetivos Mes", labelShort: "Objetivos", value: stats.objective, icon: CheckCircle2, color: "text-indigo-400", bg: "bg-indigo-400/10", suffix: "", currency: true },
          { id: "cobrados", label: "Cobrado Mes", labelShort: "Cobrado", value: stats.collected, icon: Wallet, color: "text-emerald-400", bg: "bg-emerald-400/10", suffix: "", currency: true },
          { id: "faltaCobrar", label: "Falta Cobrar", labelShort: "Falta cobrar", value: stats.pending, icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", suffix: "", currency: true },
          { id: "vencimientos", label: "Finalización Contratos", labelShort: "Vencimientos", value: dashboardData?.vencimientos?.length || 0, icon: Calendar, color: "text-orange-400", bg: "bg-orange-400/10", suffix: " Contratos", currency: false },
          { id: "morosos", label: "Morosos (Desalojados)", labelShort: "Morosos", value: stats.debtors, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", suffix: "", currency: true },
          { id: "andeNIS", label: "ANDE NIS", labelShort: "ANDE NIS", value: stats.occupied, icon: Zap, color: "text-blue-400", bg: "bg-blue-400/10", suffix: " Medidores", currency: false }
        ].map((metric, i) => {
          const fullTitle = metric.currency && typeof metric.value === "number"
            ? formatCurrency(metric.value)
            : `${metric.value}${metric.suffix || ""}`;
          const displayText = metric.currency && typeof metric.value === "number"
            ? formatMetricDisplay(metric.value, true)
            : String(metric.value);

          return (
          <Card 
            key={i} 
            onClick={() => toggleDetail(metric.id)}
            className={`border border-border shadow-sm transition-all duration-200 cursor-pointer ${detailView === metric.id ? 'ring-2 ring-primary' : ''} rounded-xl sm:rounded-2xl bg-card overflow-hidden group min-w-0`}
          >
            <CardContent className="p-2.5 lg:p-3 relative flex flex-row items-center gap-2 lg:gap-3 min-h-[64px] lg:min-h-[72px] min-w-0">
              <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg ${metric.bg} ${metric.color} flex items-center justify-center shrink-0`}>
                <metric.icon className="w-4 h-4 lg:w-[18px] lg:h-[18px] stroke-[2px]" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wide text-muted-foreground leading-tight truncate">
                  {metric.labelShort}
                </p>
                <h3
                  title={fullTitle}
                  className="mt-0.5 text-[0.95rem] lg:text-lg font-heading font-extrabold text-foreground leading-snug tabular-nums tracking-tight break-words"
                >
                  {displayText}
                </h3>
                {metric.suffix ? (
                  <span className="block text-[9px] lg:text-[10px] font-sans font-semibold text-muted-foreground">
                    {metric.suffix.trim()}
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
      
      {renderDetailList()}
      
      <ConsultarEstadoAndeModal
        isOpen={isAndeModalOpen}
        onClose={() => setIsAndeModalOpen(false)}
        defaultNis={selectedNisForModal}
      />

      <AndeLoginCredencialesModal
        isOpen={andeLoginOpen}
        onClose={() => setAndeLoginOpen(false)}
        apiBase={ANDE_API}
        onSuccess={() => {
          // Tras guardar CI/clave en appsettings, continuar con la grilla.
          void syncAndeSaldosGrilla();
        }}
      />

      <AndeDesgloseFacturasModal
        isOpen={desgloseOpen}
        onClose={() => {
          setDesgloseOpen(false);
          setDesgloseCtx(null);
        }}
        nis={desgloseCtx?.nis || ""}
        duplex={desgloseCtx?.duplex}
        inquilino={desgloseCtx?.inquilino}
        titular={desgloseCtx?.titular}
        saldoDeuda={desgloseCtx?.saldoDeuda}
        facturas={desgloseCtx?.facturas || []}
        loading={desgloseLoading}
      />

      <MorosidadesMainModal
        isOpen={isMorosidadesOpen}
        onClose={() => setIsMorosidadesOpen(false)}
      />

      <ModalAccesoRestringido
        isOpen={alertaRestriccion.visible}
        onClose={() => setAlertaRestriccion({ visible: false })}
        mensaje={alertaRestriccion.mensaje}
        permisoNombre={alertaRestriccion.permisoNombre}
      />
    </div>
  );
}

