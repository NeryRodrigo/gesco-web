"use client";

import { API_BASE } from "@/lib/api";

import React, { useMemo, useState } from "react";
import { formatDuplex, formatFechaLarga } from "@/lib/utils";
import {
  Wallet,
  Printer,
  Mail,
  ArrowUpRight,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FacturaReporte } from "./FacturaReporte";
import { numberToWords } from "@/lib/numberToWords";
import {
  ReimpresionMasivaImprimible,
  cobroToReimpresionItem,
  type ReimpresionMasivaPrintData,
} from "./ReimpresionMasivaImprimible";

interface PagoCompleto {
  pagoId: number;
  montoPagado: number;
  fechaPago: string;
  metodoPago: string;
  facturaEmitida: boolean;
  tipoPago?: string;
  numeroFactura?: string;
  responsableCobro?: string;
  mesPagado: number;
  anioPagado: number;
  contrato: {
    unidad: { codigoUnidad: string; nombreCondominio: string };
    inquilino: { razonSocial: string; email: string; cedula: string };
    serviciosIncluidos?: string;
  };
}

type TipoDocFilter = "todos" | "facturas" | "recibos";
type AlcancePrint = "filtrados" | "seleccionados";
type ModoPrint = "listado" | "cola";

export function FacturacionVista() {
  const [loadingEmail, setLoadingEmail] = useState<number | null>(null);
  const [cobros, setCobros] = useState<PagoCompleto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pagoToAnular, setPagoToAnular] = useState<number | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [selectedFacturaData, setSelectedFacturaData] = useState<any | null>(null);
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [groupBy, setGroupBy] = useState<"none" | "condominio">("none");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterCondominio, setFilterCondominio] = useState("");
  const [filterDuplex, setFilterDuplex] = useState("");
  const [tipoDocFilter, setTipoDocFilter] = useState<TipoDocFilter>("todos");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [isReimpresionOpen, setIsReimpresionOpen] = useState(false);
  const [printModo, setPrintModo] = useState<ModoPrint>("listado");
  const [printAlcance, setPrintAlcance] = useState<AlcancePrint>("filtrados");
  const [isPrintingMasiva, setIsPrintingMasiva] = useState(false);
  const [printData, setPrintData] = useState<ReimpresionMasivaPrintData | null>(null);

  React.useEffect(() => {
    fetchCobros();
    fetchDashboard();
  }, []);

  const fetchCobros = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/pagos?t=${Date.now()}`);
      if (resp.ok) setCobros(await resp.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/Dashboard/condominio/7?t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setDashboardSummary(data.summary);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const condominiosOptions = useMemo(() => {
    const set = new Set<string>();
    cobros.forEach((c) => {
      const name = c.contrato?.unidad?.nombreCondominio?.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [cobros]);

  const duplexOptions = useMemo(() => {
    const set = new Set<string>();
    cobros.forEach((c) => {
      if (filterCondominio && c.contrato?.unidad?.nombreCondominio !== filterCondominio) return;
      const code = c.contrato?.unidad?.codigoUnidad?.trim();
      if (code) set.add(code);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [cobros, filterCondominio]);

  const parseDay = (iso: string, end = false) => {
    const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    if (end) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d;
  };

  const filteredCobros = useMemo(() => {
    const val = searchFilter.toLowerCase().trim();
    return cobros.filter((c) => {
      if (val) {
        const hay =
          (c.contrato?.inquilino?.razonSocial?.toLowerCase() || "").includes(val) ||
          (c.contrato?.unidad?.codigoUnidad?.toLowerCase() || "").includes(val) ||
          (c.contrato?.unidad?.nombreCondominio?.toLowerCase() || "").includes(val) ||
          (c.numeroFactura?.toLowerCase() || "").includes(val);
        if (!hay) return false;
      }

      if (filterDesde) {
        const desde = parseDay(filterDesde);
        const fecha = c.fechaPago ? parseDay(c.fechaPago) : null;
        if (desde && fecha && fecha < desde) return false;
      }
      if (filterHasta) {
        const hasta = parseDay(filterHasta, true);
        const fecha = c.fechaPago ? parseDay(c.fechaPago) : null;
        if (hasta && fecha && fecha > hasta) return false;
      }
      if (filterCondominio && c.contrato?.unidad?.nombreCondominio !== filterCondominio) return false;
      if (filterDuplex && c.contrato?.unidad?.codigoUnidad !== filterDuplex) return false;
      if (tipoDocFilter === "facturas" && !c.facturaEmitida) return false;
      if (tipoDocFilter === "recibos" && c.facturaEmitida) return false;
      return true;
    });
  }, [
    cobros,
    searchFilter,
    filterDesde,
    filterHasta,
    filterCondominio,
    filterDuplex,
    tipoDocFilter,
  ]);

  const cobrosAgrupados = useMemo(() => {
    if (groupBy !== "condominio") return null;
    const map = new Map<string, PagoCompleto[]>();
    filteredCobros.forEach((c) => {
      const key = c.contrato?.unidad?.nombreCondominio?.trim() || "Sin condominio";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [filteredCobros, groupBy]);

  const todayStr = new Date().toISOString().split("T")[0];
  const totalHoy = cobros
    .filter((c) => c.fechaPago && c.fechaPago.split("T")[0] === todayStr)
    .reduce((acc, c) => acc + c.montoPagado, 0);

  const allFilteredSelected =
    filteredCobros.length > 0 && filteredCobros.every((c) => selectedIds.has(c.pagoId));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) filteredCobros.forEach((c) => next.add(c.pagoId));
      else filteredCobros.forEach((c) => next.delete(c.pagoId));
      return next;
    });
  };

  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAnularCobro = (id: number) => {
    setPagoToAnular(id);
    setIsConfirmOpen(true);
  };

  const confirmAnularCobro = async () => {
    if (!pagoToAnular) return;
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/pago/${pagoToAnular}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        toast.success("Cobro Anulado");
        fetchCobros();
        fetchDashboard();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(pagoToAnular);
          return next;
        });
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsConfirmOpen(false);
      setPagoToAnular(null);
    }
  };

  const handleEnviarEmail = (id: number, email: string) => {
    if (!email || email === "S/E") {
      toast.error("Inquilino sin correo.");
      return;
    }
    setLoadingEmail(id);
    setTimeout(() => {
      toast.success("Enviado con éxito");
      setLoadingEmail(null);
    }, 1500);
  };

  const handleOpenFactura = (c: PagoCompleto) => {
    const total = c.montoPagado || 0;
    setSelectedFacturaData({
      numero: c.numeroFactura ?? `001-001 ${String(c.pagoId).padStart(7, "0")}`,
      rucEmpresa: "3389403-5",
      nombreEmpresa: "Marcelo David Ortigoza Maidana",
      actividadesEmpresa:
        "ACTIVIDADES PROFESIONALES, CIENTÍFICAS Y TÉCNICAS - OTROS ALOJAMIENTOS.\nACTIVIDADES DE SERVICIOS DE ARQUITECTURA E INGENIERÍA.\nINTERMEDIACIÓN EN LA COMPRA, VENTA Y ARRENDAMIENTO DE INMUEBLES.",
      direccionEmpresa: "Merlo de Portugal y Capitán Pedro Mayor Echauri",
      celEmpresa: "(0994) 254 655",
      ciudadEmpresa: "Luque - Paraguay",
      fecha: c.fechaPago ? formatFechaLarga(c.fechaPago) : "",
      tipoDocumento: c.facturaEmitida ? "FACTURA" : "RECIBO",
      rucInquilino: c.contrato?.inquilino?.cedula ?? "",
      nombreInquilino: c.contrato?.inquilino?.razonSocial ?? "",
      direccionInquilino: c.contrato?.unidad?.codigoUnidad ?? "",
      items: [
        {
          cantidad: 1,
          descripcion: `Alquiler ${c.mesPagado ?? ""}/${c.anioPagado ?? ""}`,
          precioUnitario: total,
          iva10: total,
        },
      ],
      total,
      totalIva10: Math.round(total / 11),
      totalLetras: numberToWords(total) ?? "",
      pagoId: c.pagoId,
    });
    setIsFacturaModalOpen(true);
  };

  const filtrosResumen = useMemo(() => {
    const parts: string[] = [];
    if (filterDesde || filterHasta) {
      parts.push(`Cobro ${filterDesde || "—"} → ${filterHasta || "—"}`);
    }
    if (filterCondominio) parts.push(`Condo: ${filterCondominio}`);
    if (filterDuplex) parts.push(`Dúplex: ${formatDuplex(filterDuplex)}`);
    if (tipoDocFilter === "facturas") parts.push("Solo facturas");
    if (tipoDocFilter === "recibos") parts.push("Solo recibos");
    if (searchFilter.trim()) parts.push(`Búsqueda: “${searchFilter.trim()}”`);
    return parts.length ? parts.join(" · ") : "Sin filtros adicionales (todos los cobros visibles)";
  }, [
    filterDesde,
    filterHasta,
    filterCondominio,
    filterDuplex,
    tipoDocFilter,
    searchFilter,
  ]);

  const itemsParaImprimir = (): PagoCompleto[] => {
    if (printAlcance === "seleccionados") {
      return filteredCobros.filter((c) => selectedIds.has(c.pagoId));
    }
    return filteredCobros;
  };

  const ejecutarReimpresion = () => {
    const items = itemsParaImprimir();
    if (items.length === 0) {
      toast.error(
        printAlcance === "seleccionados"
          ? "Seleccioná al menos un cobro en la tabla."
          : "No hay cobros con los filtros actuales."
      );
      return;
    }
    const payload: ReimpresionMasivaPrintData = {
      fechaEmision: new Date().toLocaleString("es-PY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      modo: printModo,
      filtrosResumen:
        printAlcance === "seleccionados"
          ? `${filtrosResumen} · Selección: ${items.length} ítem(s)`
          : filtrosResumen,
      items: items.map(cobroToReimpresionItem),
    };
    setPrintData(payload);
    setIsPrintingMasiva(true);
    setIsReimpresionOpen(false);
    toast.info(
      printModo === "listado"
        ? `Generando listado PDF (${items.length})…`
        : `Generando cola PDF de ${items.length} comprobante(s)…`
    );
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingMasiva(false);
        setPrintData(null);
      }, 900);
    }, 450);
  };

  const clearFilters = () => {
    setFilterDesde("");
    setFilterHasta("");
    setFilterCondominio("");
    setFilterDuplex("");
    setTipoDocFilter("todos");
    setSearchFilter("");
  };

  const hasActiveFilters =
    !!(filterDesde || filterHasta || filterCondominio || filterDuplex || searchFilter) ||
    tipoDocFilter !== "todos";

  const renderCobroRow = (cobro: PagoCompleto) => (
    <tr
      key={cobro.pagoId}
      className="hover:bg-secondary/35 border-b border-border/50 group transition-all"
    >
      <td className="pl-4 py-4 w-10">
        <Checkbox
          checked={selectedIds.has(cobro.pagoId)}
          onCheckedChange={(v) => toggleSelectOne(cobro.pagoId, v === true)}
          aria-label={`Seleccionar cobro ${cobro.pagoId}`}
        />
      </td>
      <td className="pl-2 py-5">
        <span className="font-black uppercase italic text-xs text-foreground">
          {formatDuplex(cobro.contrato?.unidad?.codigoUnidad)}
        </span>
        <p className="text-[9px] text-muted-foreground uppercase">
          {cobro.contrato?.unidad?.nombreCondominio}
        </p>
        <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
          Gs. {(cobro.montoPagado || 0).toLocaleString("es-PY")}
        </p>
      </td>
      <td>
        <p className="font-black uppercase italic text-xs text-foreground/80">
          {cobro.contrato?.inquilino?.razonSocial}
        </p>
        <p className="text-[9px] font-bold text-primary underline">
          {cobro.contrato?.inquilino?.email || "S/E"}
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          {cobro.fechaPago
            ? new Date(cobro.fechaPago).toLocaleDateString("es-PY")
            : "—"}{" "}
          · {cobro.mesPagado}/{cobro.anioPagado}
        </p>
      </td>
      <td className="text-center">
        <Badge
          className={`${
            cobro.facturaEmitida ? "bg-blue-600" : "bg-emerald-500"
          } text-white font-black italic text-[9px] uppercase px-3 py-1 rounded-lg`}
        >
          {cobro.facturaEmitida ? "FACTURA" : "RECIBO"}
        </Badge>
        {cobro.numeroFactura && (
          <p className="text-[8px] font-black text-emerald-600 mt-1">Nº {cobro.numeroFactura}</p>
        )}
      </td>
      <td className="text-right pr-8">
        <div className="flex justify-end items-center gap-1.5">
          <Button
            onClick={() => handleOpenFactura(cobro)}
            variant="ghost"
            size="icon"
            title="Reimprimir"
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            onClick={() =>
              handleEnviarEmail(cobro.pagoId, cobro.contrato?.inquilino?.email)
            }
            disabled={loadingEmail === cobro.pagoId}
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-xl transition-all ${
              loadingEmail === cobro.pagoId
                ? "bg-blue-600 text-white"
                : "hover:bg-blue-600 hover:text-white"
            }`}
          >
            {loadingEmail === cobro.pagoId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={() => handleAnularCobro(cobro.pagoId)}
            variant="ghost"
            size="icon"
            className="hover:bg-red-50 hover:text-red-500"
          >
            <ArrowUpRight className="w-4 h-4 rotate-45" />
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="no-print space-y-8">
        <div className="bg-card p-8 rounded-[2.5rem] shadow-sm border border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-primary-foreground">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-4xl font-black italic text-foreground tracking-tighter uppercase leading-none">
                Centro de <span className="text-primary">Cobranzas</span>
              </h2>
              <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">
                Gestión de Pagos e Impresión Legal
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setPrintAlcance("seleccionados");
                  setPrintModo("cola");
                  setIsReimpresionOpen(true);
                }}
                className="h-12 rounded-xl font-black italic px-5"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir {selectedIds.size} seleccionados
              </Button>
            )}
            <Button
              onClick={() => {
                setPrintAlcance(selectedIds.size > 0 ? "seleccionados" : "filtrados");
                setIsReimpresionOpen(true);
              }}
              className="h-12 rounded-xl bg-primary text-primary-foreground font-black italic px-8 shadow-xl"
            >
              REIMPRESIÓN MASIVA
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none rounded-3xl bg-emerald-500 text-white p-6 shadow-lg shadow-emerald-500/10">
            <p className="text-[10px] font-black uppercase opacity-70">Cobrado Hoy</p>
            <h3 className="text-3xl font-black mt-1 italic tracking-tighter">
              Gs. {totalHoy.toLocaleString()}
            </h3>
          </Card>
          <Card className="border-none rounded-3xl bg-card p-6 border border-border shadow-sm">
            <p className="text-[10px] font-black uppercase text-muted-foreground">
              Pendiente de Facturar
            </p>
            <h3 className="text-3xl font-black mt-1 italic tracking-tighter">
              Gs. {(dashboardSummary?.faltaCobrar || 0).toLocaleString()}
            </h3>
          </Card>
          <Card className="border-none rounded-3xl bg-primary text-white p-6 shadow-lg shadow-primary/20">
            <p className="text-[10px] font-black uppercase opacity-70">Siguiente Correlativo</p>
            <h3 className="text-2xl font-black mt-1 italic tracking-tighter">001-001-0000046</h3>
          </Card>
        </div>

        {/* Filtros de reimpresión */}
        <Card className="border border-border rounded-[2rem] bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Cobro desde
              </label>
              <Input
                type="date"
                value={filterDesde}
                onChange={(e) => setFilterDesde(e.target.value)}
                className="h-10 rounded-xl bg-secondary border-none font-bold w-[150px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Cobro hasta
              </label>
              <Input
                type="date"
                value={filterHasta}
                onChange={(e) => setFilterHasta(e.target.value)}
                className="h-10 rounded-xl bg-secondary border-none font-bold w-[150px]"
              />
            </div>
            <div className="space-y-1 min-w-[180px]">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Condominio
              </label>
              <Select
                value={filterCondominio || "__all__"}
                onValueChange={(v) => {
                  setFilterCondominio(v === "__all__" ? "" : v);
                  setFilterDuplex("");
                }}
              >
                <SelectTrigger className="h-10 w-full min-w-[180px] rounded-xl border-border bg-secondary font-bold text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border z-[220]">
                  <SelectItem value="__all__">Todos</SelectItem>
                  {condominiosOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[140px]">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Dúplex
              </label>
              <Select
                value={filterDuplex || "__all__"}
                onValueChange={(v) => setFilterDuplex(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-10 w-full min-w-[140px] rounded-xl border-border bg-secondary font-bold text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border z-[220]">
                  <SelectItem value="__all__">Todos</SelectItem>
                  {duplexOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {formatDuplex(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Tipo doc.
              </label>
              <div className="flex gap-1 bg-secondary p-1 rounded-xl">
                {(
                  [
                    ["todos", "Todos"],
                    ["facturas", "Facturas"],
                    ["recibos", "Recibos"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTipoDocFilter(id)}
                    className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${
                      tipoDocFilter === id
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:bg-card"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-10 text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Limpiar
              </Button>
            )}
            <div className="ml-auto text-right">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Visibles
              </p>
              <p className="text-lg font-black italic text-foreground">
                {filteredCobros.length}
                <span className="text-xs text-muted-foreground font-bold ml-1">
                  / {cobros.length}
                </span>
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl shadow-primary/5 rounded-[2.5rem] overflow-hidden bg-card">
          <CardHeader className="p-6 sm:p-8 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase italic tracking-widest">
                Historial de Cobranzas
              </CardTitle>
              {selectedIds.size > 0 && (
                <Badge className="bg-primary/10 text-primary border-none font-bold text-[10px]">
                  {selectedIds.size} seleccionados
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">
                  Agrupar por:
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGroupBy((g) => (g === "none" ? "condominio" : "none"))}
                  className={`h-9 rounded-full text-[10px] font-black uppercase px-4 ${
                    groupBy === "condominio"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground"
                  }`}
                >
                  {groupBy === "condominio" ? "Condominio ✓" : "Ninguno"}
                </Button>
              </div>
              <Input
                placeholder="Buscar recibo, inquilino o condo..."
                className="w-full sm:w-64 rounded-full bg-secondary border-none font-bold"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </CardHeader>
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="pl-4 w-10">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={(v) => toggleSelectAll(v === true)}
                    aria-label="Seleccionar todos los visibles"
                  />
                </TableHead>
                <TableHead className="pl-2 text-[10px] font-black uppercase">
                  Unidad / Condo
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase">Inquilino</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase">
                  Estado Legal
                </TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase">
                  Acciones OIMA
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingData ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest"
                  >
                    Cargando cobranzas...
                  </td>
                </tr>
              ) : filteredCobros.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest"
                  >
                    Sin cobros para mostrar
                  </td>
                </tr>
              ) : groupBy === "none" ? (
                filteredCobros.map(renderCobroRow)
              ) : (
                cobrosAgrupados?.map(([condoName, items]) => {
                  const isExpanded = expandedGroups[condoName] !== false;
                  const subtotal = items.reduce((acc, c) => acc + (c.montoPagado || 0), 0);
                  return (
                    <React.Fragment key={condoName}>
                      <tr className="bg-muted/80 border-b border-border">
                        <td colSpan={5} className="px-6 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedGroups((prev) => ({
                                ...prev,
                                [condoName]: !(prev[condoName] !== false),
                              }))
                            }
                            className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left"
                          >
                            <span className="text-xs font-black uppercase italic tracking-wide text-foreground flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              {condoName}
                              <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold">
                                {items.length} COBRO{items.length === 1 ? "" : "S"}
                              </Badge>
                            </span>
                            <span className="text-[10px] font-black text-muted-foreground uppercase sm:pr-2">
                              Subtotal:{" "}
                              <span className="text-foreground">
                                Gs. {subtotal.toLocaleString("es-PY")}
                              </span>
                            </span>
                          </button>
                        </td>
                      </tr>
                      {isExpanded && items.map(renderCobroRow)}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden bg-card text-center">
          <DialogHeader className="p-8 bg-red-500/10 flex flex-col items-center gap-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
            <DialogTitle className="text-2xl font-black italic uppercase text-red-600">
              ¿Anular Cobro?
            </DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase text-muted-foreground">
              Esta acción habilitará la cuota de nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 bg-muted flex sm:flex-row gap-3">
            <DialogClose asChild>
              <Button variant="ghost" className="flex-1">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={confirmAnularCobro}
              className="flex-1 bg-red-600 text-white font-black italic"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFacturaModalOpen} onOpenChange={setIsFacturaModalOpen}>
        <DialogContent className="sm:max-w-[1150px] max-h-[95vh] overflow-y-auto p-6 bg-muted rounded-[2.5rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>Impresión de Factura</DialogTitle>
            <DialogDescription>Generación de comprobante legal.</DialogDescription>
          </DialogHeader>
          {selectedFacturaData && (
            <FacturaReporte facturaData={selectedFacturaData} onSaved={fetchCobros} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal reimpresión masiva */}
      <Dialog open={isReimpresionOpen} onOpenChange={setIsReimpresionOpen}>
        <DialogContent className="sm:max-w-[520px] border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden bg-card">
          <DialogHeader className="p-6 sm:p-8 border-b border-border bg-muted/40">
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
              Reimpresión masiva
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
              PDF con membrete Fontana e isotipo Vordia
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Formato
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintModo("listado")}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    printModo === "listado"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <p className="font-black italic text-sm uppercase">Listado plano</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                    Una tabla con todos los cobros (caja / archivo).
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModo("cola")}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    printModo === "cola"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <p className="font-black italic text-sm uppercase">Cola PDF unificada</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                    Un comprobante por página, mismo PDF.
                  </p>
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Alcance
              </p>
              <div className="flex flex-col gap-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                    printAlcance === "filtrados" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="alcance"
                    checked={printAlcance === "filtrados"}
                    onChange={() => setPrintAlcance("filtrados")}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-black italic text-sm uppercase block">
                      Filtrados actuales ({filteredCobros.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {filtrosResumen}
                    </span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                    printAlcance === "seleccionados"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="alcance"
                    checked={printAlcance === "seleccionados"}
                    onChange={() => setPrintAlcance("seleccionados")}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-black italic text-sm uppercase block">
                      Solo seleccionados ({selectedIds.size})
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      Usá los checkboxes de la tabla.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted flex flex-col sm:flex-row gap-3">
            <DialogClose asChild>
              <Button variant="ghost" className="flex-1 h-11 font-bold rounded-xl">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={ejecutarReimpresion}
              className="flex-1 h-11 bg-primary text-primary-foreground font-black italic rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPrintingMasiva && printData && <ReimpresionMasivaImprimible data={printData} />}
    </div>
  );
}
