"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, CheckCircle2, Wallet, Clock, Calendar, AlertTriangle, Filter, Zap, Check, X, RefreshCw } from "lucide-react";
import { ConsultarEstadoAndeModal } from "./ConsultarEstadoAndeModal";
import { verificarPermisoGranular, ModalAccesoRestringido } from "@/app/login/PermisosGranularesMatriz";
import { formatDuplex } from "@/lib/utils";

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
};

export function DashboardCards({ dashboardData, onRefresh }: { dashboardData: any, onRefresh?: () => Promise<void> | void }) {
  const [detailView, setDetailView] = useState<"none" | "ocupados" | "disponibles" | "objetivos" | "cobrados" | "faltaCobrar" | "vencimientos" | "morosos" | "andeNIS">("none");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAndeModalOpen, setIsAndeModalOpen] = useState(false);
  const [selectedNisForModal, setSelectedNisForModal] = useState("");
  const [alertaRestriccion, setAlertaRestriccion] = useState<{
    visible: boolean;
    mensaje?: string;
    permisoNombre?: string;
  }>({ visible: false });

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
      setDetailView(view);
      setColFilters({});
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

    if (detailView === "ocupados") {
      list = dashboardData.ocupados;
      title = "Listado de Dúplex Ocupados";
      color = "text-primary bg-primary/5";
      total = list.reduce((acc: any, curr: any) => acc + curr.monto, 0);
    } else if (detailView === "disponibles") {
      list = dashboardData.disponibles;
      title = "Listado de Dúplex Disponibles";
      color = "text-emerald-700 bg-emerald-50";
      total = 0;
    } else if (detailView === "objetivos") {
      list = dashboardData.objetivosMes;
      title = "Objetivos del Mes (Proyección)";
      color = "text-indigo-700 bg-indigo-50";
      total = list.reduce((acc: any, curr: any) => acc + curr.monto, 0);
    } else if (detailView === "cobrados") {
      list = dashboardData.cobrados;
      title = "Listado de Cobros del Mes";
      color = "text-emerald-700 bg-emerald-50";
      total = list.reduce((acc: any, curr: any) => acc + curr.monto, 0);
    } else if (detailView === "faltaCobrar") {
      list = dashboardData.faltaCobrar;
      title = "Listado de Pendientes de Cobro";
      color = "text-amber-700 bg-amber-50";
      total = list.reduce((acc: any, curr: any) => acc + (curr.montoRestante || 0), 0);
    } else if (detailView === "vencimientos") {
      list = dashboardData.vencimientos;
      title = "Listado de Próximos Vencimientos";
      color = "text-orange-700 bg-orange-50";
      total = list.reduce((acc: any, curr: any) => acc + curr.monto, 0);
    } else if (detailView === "morosos") {
      list = dashboardData.morosos;
      title = "Listado de Morosos (Desalojados)";
      color = "text-red-700 bg-red-50";
      total = list.reduce((acc: any, curr: any) => acc + curr.monto, 0);
    } else if (detailView === "andeNIS") {
      list = dashboardData.ocupados;
      title = "Consulta de Medidores ANDE";
      color = "text-blue-700 bg-blue-50";
    }

    const filteredList = (list || []).filter((item: any) => {
      if (colFilters.duplex) {
        const str = `${item.duplex || ""} ${item.condominio || ""}`.toLowerCase();
        if (!str.includes(colFilters.duplex.toLowerCase())) return false;
      }
      if (colFilters.inquilino) {
        const str = `${item.inquilino || ""}`.toLowerCase();
        if (!str.includes(colFilters.inquilino.toLowerCase())) return false;
      }
      if (colFilters.docNis) {
        const str = `${item.cedula || ""} ${item.nisAnde || ""}`.toLowerCase();
        if (!str.includes(colFilters.docNis.toLowerCase())) return false;
      }
      if (colFilters.nis) {
        const str = `${item.nisAnde || ""}`.toLowerCase();
        if (!str.includes(colFilters.nis.toLowerCase())) return false;
      }
      if (colFilters.vencimiento) {
        if (detailView === "andeNIS") {
          const day = (parseInt((item.nisAnde || "0").slice(-2)) % 15) + 10;
          const dateStr = item.andeFechaVencimiento ? new Date(item.andeFechaVencimiento).toLocaleDateString() : `${day}/7/2026`;
          if (!dateStr.toLowerCase().includes(colFilters.vencimiento.toLowerCase())) return false;
        } else {
          const dateStr = item.fecha ? new Date(item.fecha).toLocaleDateString() : "";
          if (!dateStr.toLowerCase().includes(colFilters.vencimiento.toLowerCase())) return false;
        }
      }
      if (colFilters.fechaPago) {
        const isPagado = item.andePagadoEsteMes;
        const dateStr = isPagado && item.andeFechaPago ? new Date(item.andeFechaPago).toLocaleDateString() : (isPagado ? "17/06/2026" : "");
        if (!dateStr.toLowerCase().includes(colFilters.fechaPago.toLowerCase())) return false;
      }
      if (colFilters.estadoPago) {
        const isPagado = item.andePagadoEsteMes;
        const str = isPagado ? "al dia al día pagado sin deuda" : "pendiente activa no pagado emitido factura emitida prox proxima próxima emisión";
        if (!str.includes(colFilters.estadoPago.toLowerCase())) return false;
      }
      if (colFilters.consumo) {
        const isPagado = item.andePagadoEsteMes;
        const montoFactura = item.andeMontoDeuda || 0;
        const montoReal = item.andeMontoDeuda ? item.andeMontoDeuda : (isPagado ? ((parseInt((item.nisAnde || "0").slice(-2)) * 2500) + 85000) : montoFactura);
        const kWConsumo = item.andeConsumoKw || Math.round((montoReal - 85000) / 450);
        const str = `${kWConsumo} kw`.toLowerCase();
        if (!str.includes(colFilters.consumo.toLowerCase())) return false;
      }
      if (colFilters.monto) {
        const isPagado = item.andePagadoEsteMes;
        const montoFactura = item.andeMontoDeuda || 0;
        const montoReal = item.andeMontoDeuda ? item.andeMontoDeuda : (isPagado ? ((parseInt((item.nisAnde || "0").slice(-2)) * 2500) + 85000) : montoFactura);
        const val = item.montoRestante || (detailView === "andeNIS" ? montoReal : item.monto) || 0;
        if (!val.toString().includes(colFilters.monto) && !val.toLocaleString().includes(colFilters.monto)) return false;
      }
      if (colFilters.factura) {
        const str = `${item.factura || item.numeroFactura || item.estadoFactura || ""}`.toLowerCase();
        if (!str.includes(colFilters.factura.toLowerCase())) return false;
      }
      if (colFilters.interes) {
        const val = item.interesAcumulado || 0;
        if (!val.toString().includes(colFilters.interes) && !val.toLocaleString().includes(colFilters.interes)) return false;
      }
      return true;
    });

    if (detailView === "ocupados" || detailView === "objetivos" || detailView === "cobrados" || detailView === "vencimientos" || detailView === "morosos") {
      total = filteredList.reduce((acc: any, curr: any) => acc + (curr.monto || 0), 0);
    } else if (detailView === "faltaCobrar") {
      total = filteredList.reduce((acc: any, curr: any) => acc + (curr.montoRestante || 0), 0);
    } else if (detailView === "andeNIS") {
      total = filteredList.reduce((acc: any, curr: any) => {
        const isPagado = curr.andePagadoEsteMes;
        const montoFactura = curr.andeMontoDeuda || 0;
        const montoReal = curr.andeMontoDeuda ? curr.andeMontoDeuda : (isPagado ? ((parseInt((curr.nisAnde || "0").slice(-2)) * 2500) + 85000) : montoFactura);
        return acc + (isPagado ? 0 : montoReal);
      }, 0);
    } else if (detailView === "disponibles") {
      total = 0;
    }

    return (
      <Card className="border-none shadow-2xl rounded-[2rem] bg-card overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 mb-12 mt-4">
        <CardHeader className={`${color} p-8 flex flex-row items-center justify-between`}>
          <div>
            <CardTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              {title}
              <Badge className="bg-black/10 text-current border-none text-xs px-2.5 py-0.5">
                {filteredList.length} registro{filteredList.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Detalle de operaciones por unidad · Filtrado por columna</p>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(colFilters).some(k => colFilters[k]) && (
              <button 
                onClick={() => setColFilters({})} 
                className="bg-card/80 hover:bg-card text-foreground text-[10px] font-black uppercase px-3 py-2 rounded-full border border-black/10 shadow-sm transition-all flex items-center gap-1.5"
                title="Limpiar todos los filtros de columna"
              >
                <X className="w-3.5 h-3.5 text-red-500" /> Limpiar Filtros
              </button>
            )}
            <button
              onClick={() => {
                const verif = verificarPermisoGranular("panel_consultar_ande");
                if (!verif.permitido) {
                  setAlertaRestriccion({
                    visible: true,
                    mensaje: verif.mensaje || "🚫 Acceso Restringido en Módulo de Panel: No cuentas con el permiso para 'Consultar Saldos y Corte ANDE'. Este comportamiento ha sido denegado para tu perfil.",
                    permisoNombre: "Panel • Consultar Saldos y Corte ANDE"
                  });
                  return;
                }
                setSelectedNisForModal("");
                setIsAndeModalOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black italic uppercase px-4 py-2 rounded-full shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer mr-1"
              title="Consultar saldos y estado de corte en línea con la ANDE"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-current animate-pulse" />
              <span>CONSULTAR SALDOS ANDE</span>
            </button>
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
              onClick={() => { setDetailView("none"); setColFilters({}); }} 
              className="p-2 rounded-full hover:bg-black/10 transition-colors ml-2 bg-black/5"
              title="Cerrar vista de detalle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead className="bg-muted text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
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
                    <th className="px-8 py-4 text-right">Interés Acum.</th>
                  )}
                  {detailView === "cobrados" && (
                    <>
                      <th className="px-8 py-4 text-center">Factura</th>
                      <th className="px-8 py-4 text-center">Fecha Pago</th>
                    </>
                  )}
                  {detailView === "vencimientos" && (
                    <>
                      <th className="px-8 py-4 text-center">Fecha Vencimiento</th>
                    </>
                  )}
                </tr>
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
                          placeholder="🔍 Factura..."
                          value={colFilters.factura || ""}
                          onChange={(e) => setColFilters({ ...colFilters, factura: e.target.value })}
                          className="w-full bg-card border border-border rounded-md px-2 py-1 text-[10px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-center"
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
                    <td colSpan={10} className="px-8 py-12 text-center text-muted-foreground font-bold text-sm">
                      No se encontraron registros que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-muted/50 transition-colors h-[56px]"
                  >
                    <td className="px-8 py-4">
                      <p className="font-black italic uppercase text-foreground text-sm tracking-tighter">{formatDuplex(item.duplex)}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.condominio}</p>
                    </td>
                    <td className="px-8 py-4">
                      <p className={`font-bold text-sm ${detailView === 'disponibles' ? 'text-emerald-500' : 'text-muted-foreground'}`}>{item.inquilino}</p>
                      {detailView === "ocupados" && item.ocupantes && (
                        <p className="text-[10px] text-muted-foreground">{item.ocupantes} ocupantes</p>
                      )}
                    </td>
                    {detailView === "ocupados" && (
                      <td className="px-8 py-4 text-center">
                        <p className="text-xs font-bold text-muted-foreground">{item.cedula}</p>
                        <p className="text-[10px] text-muted-foreground">NIS: {item.nisAnde}</p>
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
                      if (!item.nisAnde || item.nisAnde === "N/A" || item.nisAnde === "SIN NIS") {
                        return (
                          <>
                            <td className="px-8 py-4 text-center">
                              <Badge className="bg-muted text-muted-foreground font-black px-3 border-none uppercase tracking-widest">-</Badge>
                            </td>
                            <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                            <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                            <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                            <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                            <td className="px-8 py-4 text-center"><span className="text-muted-foreground">-</span></td>
                            <td className="px-8 py-4 text-right"><p className="font-black italic text-muted-foreground">-</p></td>
                            <td className="px-8 py-4 text-right"></td>
                          </>
                        );
                      }
                      
                      const day = (parseInt(item.nisAnde.slice(-2)) % 15) + 10;
                      const date = item.andeFechaVencimiento ? new Date(item.andeFechaVencimiento) : (() => {
                        const d = new Date();
                        d.setDate(day);
                        return d;
                      })();
                      const isPagado = item.andePagadoEsteMes;
                      const isVencido = new Date() > date && !isPagado;
                      const montoFactura = item.andeMontoDeuda || 0;
                      const montoReal = item.andeMontoDeuda ? item.andeMontoDeuda : (isPagado ? ((parseInt(item.nisAnde.slice(-2)) * 2500) + 85000) : montoFactura);
                      const kWConsumo = item.andeConsumoKw || Math.round((montoReal - 85000) / 450);
                      
                      return (
                        <>
                          <td className="px-8 py-4 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <Badge className="bg-muted text-muted-foreground font-black px-3 border-none uppercase tracking-widest">{item.nisAnde}</Badge>
                              {item.andeFacturaEmitida ? (
                                <Badge className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 border border-emerald-200 uppercase tracking-tighter">FACTURA EMITIDA</Badge>
                              ) : (
                                <Badge className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 border border-amber-200 uppercase tracking-tighter" title="La factura de este mes aún no ha sido emitida por la ANDE">PRÓX. EMISIÓN</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <p className={`text-[10px] font-bold ${isVencido ? 'text-red-500 bg-red-50 py-1 px-2 rounded-md inline-block' : 'text-muted-foreground'}`}>
                                {date.toLocaleDateString('es-PY')}
                            </p>
                          </td>
                          <td className="px-8 py-4 text-center">
                            {isPagado && item.andeFechaPago ? (
                              <p className="text-[10px] font-bold text-muted-foreground bg-muted py-1 px-2 rounded-md inline-block">
                                {new Date(item.andeFechaPago).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            ) : (
                              <span className="text-muted-foreground font-bold text-[10px]">—</span>
                            )}
                          </td>
                          <td className="px-8 py-4 text-center">
                            {isPagado ? (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-1 text-emerald-500 font-bold text-xs"><Check className="w-4 h-4"/> Al Día</div>
                                <span className="text-[9px] text-muted-foreground font-medium">Sin Deuda ANDE</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-1 text-red-500 font-bold text-xs"><X className="w-4 h-4"/> Pendiente</div>
                                <span className="text-[9px] text-red-400 font-medium">Factura Activa</span>
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <p className="font-bold text-[10px] text-muted-foreground">{kWConsumo} kW</p>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <p className={`font-black italic ${isPagado ? 'text-emerald-500' : 'text-red-600'}`}>
                              Gs. {montoReal.toLocaleString()}
                            </p>
                            {isPagado && (
                                <p className="text-[9px] font-bold text-emerald-400 mt-1">Abonado (Gs. 0)</p>
                            )}
                          </td>
                          <td className="px-8 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                 {(isPagado || item.andeFacturaEmitida) && (
                                    <button
                                      onClick={() => {
                                        const verif = verificarPermisoGranular("panel_factura_pdf");
                                        if (!verif.permitido) {
                                          setAlertaRestriccion({
                                            visible: true,
                                            mensaje: verif.mensaje || "🚫 Acceso Restringido en Módulo de Panel: No cuentas con el permiso para 'Descargar Factura PDF de ANDE'. Este comportamiento ha sido denegado para tu perfil.",
                                            permisoNombre: "Panel • Descargar Factura PDF de ANDE"
                                          });
                                          return;
                                        }
                                        window.open(`http://localhost:5034/api/Ande/factura-pdf/${item.nisAnde}?inquilino=${encodeURIComponent(item.inquilino || "")}&duplex=${encodeURIComponent(item.duplex || "")}`, '_blank');
                                      }}
                                      className="bg-yellow-400 text-black border border-yellow-500 shadow-sm text-[9px] font-black italic px-3 py-2 rounded-lg hover:scale-105 hover:bg-yellow-500 transition-all">
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
                        <p className={`font-black italic ${detailView === 'morosos' ? 'text-red-600' : detailView === 'faltaCobrar' ? 'text-amber-600' : detailView === 'disponibles' ? 'text-muted-foreground' : 'text-blue-600'}`}>
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
                          <Badge className={`${item.facturaEmitida ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'} border-none font-black italic text-[9px] uppercase`}>
                            {item.estadoFactura}
                          </Badge>
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
                        <p className="text-xs font-bold text-red-500 uppercase bg-red-50 py-1 px-3 rounded-lg inline-block">
                          {item.fecha ? new Date(item.fecha).toLocaleDateString('es-PY') : '-'}
                        </p>
                      </td>
                    )}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          <div className="bg-muted p-6 flex justify-between items-center text-foreground border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest font-sans">
              {detailView === 'andeNIS' ? 'Total Facturas Activas Pendientes' : 'Totalización del Listado'}
            </p>
            <h3 className="text-2xl font-black italic tracking-tighter">{formatCurrency(total)}</h3>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
        {[
          { id: "ocupados", label: "Ocupados", value: stats.occupied, icon: Users, color: "text-primary", bg: "bg-primary/10", suffix: " Dúplex" },
          { id: "disponibles", label: "Disponibles", value: stats.available, icon: Home, color: "text-emerald-400", bg: "bg-emerald-400/10", suffix: " Dúplex" },
          { id: "objetivos", label: "Objetivos Mes", value: formatCurrency(stats.objective), icon: CheckCircle2, color: "text-indigo-400", bg: "bg-indigo-400/10", suffix: "" },
          { id: "cobrados", label: "Cobrado Mes", value: formatCurrency(stats.collected), icon: Wallet, color: "text-emerald-400", bg: "bg-emerald-400/10", suffix: "" },
          { id: "faltaCobrar", label: "Falta Cobrar", value: formatCurrency(stats.pending), icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", suffix: "" },
          { id: "vencimientos", label: "Vencimientos", value: dashboardData?.vencimientos?.length || 0, icon: Calendar, color: "text-orange-400", bg: "bg-orange-400/10", suffix: " Contratos" },
          { id: "morosos", label: "Morosos (Desalojados)", value: formatCurrency(stats.debtors), icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", suffix: "" },
          { id: "andeNIS", label: "ANDE NIS", value: stats.occupied, icon: Zap, color: "text-blue-400", bg: "bg-blue-400/10", suffix: " Medidores" }
        ].map((metric, i) => (
          <Card 
            key={i} 
            onClick={() => toggleDetail(metric.id)}
            className={`border border-border shadow-sm transition-all duration-200 hover:shadow-xl hover:shadow-primary/5 cursor-pointer ${detailView === metric.id ? 'ring-1 ring-primary scale-102' : 'hover:-translate-y-1'} rounded-2xl bg-card overflow-hidden group`}
          >
            <CardContent className="p-4 md:p-5 relative flex flex-col items-center text-center justify-center min-h-[140px]">
              <div className={`w-12 h-12 rounded-xl ${metric.bg} ${metric.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <metric.icon className="w-5 h-5 stroke-[2px]" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 font-sans">
                {metric.label}
              </p>
              <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                {metric.value}
                <span className="text-sm font-sans text-muted-foreground ml-1">{metric.suffix}</span>
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {renderDetailList()}
      
      <ConsultarEstadoAndeModal
        isOpen={isAndeModalOpen}
        onClose={() => setIsAndeModalOpen(false)}
        defaultNis={selectedNisForModal}
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

