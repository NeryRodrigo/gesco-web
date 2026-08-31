"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bed,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  User,
  Phone,
  MapPin,
  Wallet,
  History,
  MessageSquare,
  Image as ImageIcon,
  LogOut,
  CheckCircle2,
  Receipt,
  Clock,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";
import { formatDuplex, formatFechaCorta } from "@/lib/utils";
import {
  loadFontanaLugares,
  addFontanaLugar,
  mergeLugares,
  LUGARES_FONTANA_DEFAULT,
  loadFontanaCupos,
  saveFontanaCupos,
  sameLugar,
  cupoDefaultParaLugar,
  HABITACIONES_DUPLEX_AGUS,
  formatNombreHabitacionLugar,
  nextNumeroHabitacionEnLugar,
  extractNumeroHabitacion,
  type FontanaCupoLugar,
} from "@/lib/fontanaLugares";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ComprobantePreviewModal } from "@/app/condominio/ComprobantePreviewModal";
import { FontanaPropiedadesDashboard } from "./FontanaPropiedadesDashboard";
import { FontanaCroquisDashboard } from "@/components/fontana/FontanaCroquisDashboard";
import { FontanaFinanzasPage } from "@/components/fontana/FontanaFinanzasPage";
import { FontanaPersonalPage } from "@/components/fontana/FontanaPersonalPage";
import { FontanaReportesPage } from "@/components/fontana/FontanaReportesPage";
import {
  isFontanaPropiedadPlano,
  resolveFontanaPropiedadPlano,
  type FontanaPlanta,
  type FontanaPropiedadPlano,
} from "@/lib/fontanaPlanos";
import { addFontanaMovimiento } from "@/lib/fontanaFinanzas";
import {
  Habitacion,
  Reserva,
  FontanaDetalles,
  FontanaServicioExtra,
  TipoAlquilerFontana,
  EstadoInquilinoFontana,
  parseFontanaDetalles,
  stringifyFontanaDetalles,
} from "@/types/hostel";

type FichaTab = "reserva" | "pagos" | "atrasados" | "deudas" | "reclamos" | "documentos";
type FontanaVista =
  | "croquis"
  | "propiedades"
  | "hospedaje"
  | "finanzas"
  | "personal"
  | "reportes";

interface DuplexUnidad {
  unidadId: number;
  codigoUnidad: string;
  nombreCondominio?: string;
  estado: string;
}

interface FontanaPageProps {
  empresaId: number;
  usuario?: { id?: number; nombre?: string } | null;
}

const TIPOS_ALQUILER: TipoAlquilerFontana[] = [
  "Dúplex",
  "Habitación",
  "Hostel",
  "Mensualero",
  "Diario",
  "Semanal",
];

const ESTADOS_INQ: EstadoInquilinoFontana[] = ["Activo", "Pendiente", "Retirado", "Moroso"];

/** Parsea "HH:mm" → minutos desde medianoche */
function horaAMinutos(hora?: string | null, fallback = "14:00"): number {
  const raw = (hora && /^\d{1,2}:\d{2}/.test(hora) ? hora : fallback).slice(0, 5);
  const [hh, mm] = raw.split(":").map((n) => Number(n) || 0);
  return Math.min(23 * 60 + 59, Math.max(0, hh * 60 + mm));
}

function formatMinutos(min: number): string {
  if (min >= 24 * 60) return "24:00";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Une fecha (YYYY-MM-DD) + hora (HH:mm) en Date local */
function combineFechaHora(fecha?: string | null, hora?: string | null, fallbackHora = "14:00"): Date | null {
  if (!fecha) return null;
  // Si ya viene con hora ISO
  if (fecha.includes("T")) {
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return null;
    if (hora && /^\d{1,2}:\d{2}/.test(hora)) {
      const mins = horaAMinutos(hora, fallbackHora);
      d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    }
    return d;
  }
  const mins = horaAMinutos(hora, fallbackHora);
  const d = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

function toApiDateTime(fecha?: string | null, hora?: string | null, fallbackHora = "14:00"): string | null {
  const d = combineFechaHora(fecha, hora, fallbackHora);
  if (!d) return null;
  // Local ISO sin Z para que el backend guarde la hora local
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da}T${hh}:${mm}:00`;
}

function formatFechaHoraCorta(fecha?: string | null, hora?: string | null): string {
  const fechaTxt = formatFechaCorta(fecha);
  if (!fechaTxt) return "—";
  if (hora && /^\d{1,2}:\d{2}/.test(hora)) return `${fechaTxt} ${hora.slice(0, 5)}`;
  if (fecha && fecha.includes("T")) {
    const d = new Date(fecha);
    if (!Number.isNaN(d.getTime())) {
      return `${fechaTxt} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
  return fechaTxt;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const emptyForm = (): FontanaDetalles & { nombreHabitacion: string } => ({
  nombreHabitacion: "",
  nombreLugar: LUGARES_FONTANA_DEFAULT[0],
  numeroHabitacion: undefined,
  planta: undefined,
  modalidad: undefined,
  plazasOcupadas: undefined,
  cantidadHabitaciones: 1,
  precioAcordado: 0,
  nombreApellido: "",
  cedula: "",
  telefono: "",
  contactoEmergencia: "",
  tipoAlquiler: "Habitación",
  fechaIngreso: new Date().toISOString().slice(0, 10),
  fechaSalida: "",
  horaIngreso: "14:00",
  horaSalida: "12:00",
  monto: 0,
  garantia: 0,
  estadoInquilino: "Activo",
  observaciones: "",
  unidadDuplexId: null,
  unidadCodigo: null,
  nombreCondominio: null,
  reservaId: null,
  habitacionDuplexInterna: null,
  serviciosExtras: [],
  pagos: [],
  reclamos: [],
  documentos: [],
});

function habitacionOcupaPlaza(h: Habitacion): boolean {
  const d = parseFontanaDetalles(h.detallesJson);
  if (h.estado === "Ocupada") return true;
  if (d.estadoInquilino === "Activo" || d.estadoInquilino === "Moroso" || d.estadoInquilino === "Pendiente")
    return true;
  return false;
}

/** Evita que el menú contextual quede fuera de pantalla (móvil / iPad). */
function clampCtxMenu(x: number, y: number, menuW = 228, menuH = 168) {
  if (typeof window === "undefined") return { x, y };
  const pad = 10;
  const maxX = Math.max(pad, window.innerWidth - menuW - pad);
  const maxY = Math.max(pad, window.innerHeight - menuH - pad);
  return {
    x: Math.min(Math.max(pad, x), maxX),
    y: Math.min(Math.max(pad, y), maxY),
  };
}

export function FontanaPage({ empresaId, usuario }: FontanaPageProps) {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [duplexUnidades, setDuplexUnidades] = useState<DuplexUnidad[]>([]);
  const [lugares, setLugares] = useState<string[]>([...LUGARES_FONTANA_DEFAULT]);
  const [cupos, setCupos] = useState<Record<string, FontanaCupoLugar>>({});
  const [cuposOpen, setCuposOpen] = useState(false);
  const [nuevoLugarOpen, setNuevoLugarOpen] = useState(false);
  const [nuevoLugarNombre, setNuevoLugarNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fichaTab, setFichaTab] = useState<FichaTab>("reserva");
  const [fontanaVista, setFontanaVista] = useState<FontanaVista>("croquis");
  const [finanzasTick, setFinanzasTick] = useState(0);
  const [desocupando, setDesocupando] = useState(false);
  const [comprobanteOpen, setComprobanteOpen] = useState(false);
  const [comprobantePagoData, setComprobantePagoData] = useState<any>(null);
  const [comprobanteHabitacionId, setComprobanteHabitacionId] = useState<number | null>(null);
  const [comprobanteKind, setComprobanteKind] = useState<"garantia" | "alojamiento" | null>(null);
  const [pendingDesocuparAfterFactura, setPendingDesocuparAfterFactura] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; habitacionId: number | null } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [calendarStart, setCalendarStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  /** Día enfocado para la franja horaria (hora:minuto) */
  const [calendarFocusDay, setCalendarFocusDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [nuevoReclamo, setNuevoReclamo] = useState("");
  const [servicioOpen, setServicioOpen] = useState(false);
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: "", monto: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCtxAt = useCallback((clientX: number, clientY: number, habitacionId: number | null) => {
    const { x, y } = clampCtxMenu(clientX, clientY);
    setCtxMenu({ x, y, habitacionId });
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onCardTouchStart = useCallback(
    (e: React.TouchEvent, habitacionId: number | null) => {
      clearLongPress();
      const t = e.touches[0];
      if (!t) return;
      const { clientX, clientY } = t;
      longPressTimer.current = setTimeout(() => {
        openCtxAt(clientX, clientY, habitacionId);
      }, 480);
    },
    [clearLongPress, openCtxAt]
  );
  const selected = habitaciones.find((h) => h.habitacionId === selectedId) || null;
  const selectedDetalles = useMemo(
    () => (selected ? parseFontanaDetalles(selected.detallesJson) : {}),
    [selected]
  );

  const cargar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const [hRes, rRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/api/Habitaciones/empresa/${empresaId}`),
        fetch(`${API_BASE}/api/Reservas/empresa/${empresaId}`),
        fetch(`${API_BASE}/api/UnidadesCondominio/empresa/${empresaId}`),
      ]);
      let habitacionesData: Habitacion[] = [];
      if (hRes.ok) {
        habitacionesData = await hRes.json();
        setHabitaciones(habitacionesData);
      }
      if (rRes.ok) setReservas(await rRes.json());
      if (uRes.ok) {
        const units = await uRes.json();
        // Incluye dúplex ocupados y libres: aunque la unidad esté ocupada,
        // puede haber habitaciones internas disponibles para realquilar.
        const duplexes = (Array.isArray(units) ? units : [])
          .filter((u: any) =>
            /duplex|dúplex|d\s*-?\s*\d+/i.test(String(u.codigoUnidad || ""))
          )
          .map((u: any) => ({
            unidadId: u.unidadId,
            codigoUnidad: u.codigoUnidad,
            nombreCondominio: u.nombreCondominio || u.condominio || "",
            estado: u.estado || "Disponible",
          }))
          .sort((a: DuplexUnidad, b: DuplexUnidad) => {
            const c = String(a.nombreCondominio || "").localeCompare(String(b.nombreCondominio || ""));
            if (c !== 0) return c;
            return String(a.codigoUnidad).localeCompare(String(b.codigoUnidad));
          });
        setDuplexUnidades(duplexes);
      }

      // Catálogo de lugares: defaults + guardados + ya usados en habitaciones
      const usados = habitacionesData
        .map((h) => parseFontanaDetalles(h.detallesJson).nombreLugar)
        .filter(Boolean) as string[];
      setLugares(mergeLugares(loadFontanaLugares(empresaId), usados));
      setCupos(loadFontanaCupos(empresaId));
    } catch {
      toast.error("No se pudo cargar Fontana");
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(calendarStart);
    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarStart]);

  const reservasSelected = useMemo(() => {
    if (!selectedId) return [];
    // Incluye CheckOut para ver el bloque horario histórico en el calendario
    return reservas.filter((r) => r.habitacionId === selectedId && r.estado !== "Cancelada");
  }, [reservas, selectedId]);

  /** Intervalos check-in/out con hora para la habitación seleccionada */
  const ocupacionesTimed = useMemo(() => {
    const fromReservas = reservasSelected.map((r) => {
      const start = new Date(r.fechaCheckIn);
      const end = new Date(r.fechaCheckOut);
      return {
        id: `r-${r.reservaId}`,
        label: r.huesped?.razonSocial || "Reserva",
        estado: r.estado,
        start,
        end,
      };
    });
    if (fromReservas.length > 0) return fromReservas;

    // Fallback: datos de la ficha si aún no hay reserva API
    const start = combineFechaHora(
      selectedDetalles.fechaIngreso,
      selectedDetalles.horaIngreso,
      "14:00"
    );
    const end = combineFechaHora(
      selectedDetalles.fechaSalida || selectedDetalles.fechaIngreso,
      selectedDetalles.horaSalida,
      "12:00"
    );
    if (!start || !end || end <= start) return [];
    return [
      {
        id: "detalles",
        label: selectedDetalles.nombreApellido || "Huésped",
        estado: selectedDetalles.estadoInquilino || "Activo",
        start,
        end,
      },
    ];
  }, [reservasSelected, selectedDetalles]);

  // Al elegir habitación, enfocar el día de ingreso (o hoy)
  useEffect(() => {
    if (!selectedId) return;
    const base =
      combineFechaHora(selectedDetalles.fechaIngreso, selectedDetalles.horaIngreso, "14:00") ||
      new Date();
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    setCalendarFocusDay(d);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    setCalendarStart(monthStart);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPorLugar = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of habitaciones) {
      const lugar = parseFontanaDetalles(h.detallesJson).nombreLugar || "";
      if (!lugar) continue;
      const key = lugares.find((l) => sameLugar(l, lugar)) || lugar;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [habitaciones, lugares]);

  const ocupadasPorLugar = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of habitaciones) {
      if (!habitacionOcupaPlaza(h)) continue;
      const lugar = parseFontanaDetalles(h.detallesJson).nombreLugar || "";
      if (!lugar) continue;
      const key = lugares.find((l) => sameLugar(l, lugar)) || lugar;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [habitaciones, lugares]);

  /** Lugares disponibles para NUEVA carga (con cupo libre y habilitados) */
  const lugaresDisponiblesAlta = useMemo(() => {
    return lugares.filter((l) => {
      const cfg = cupos[l] || { cupo: cupoDefaultParaLugar(l), habilitado: true };
      if (!cfg.habilitado) return false;
      // Fontana 1/2/3: cupo = habitaciones físicas totales del croquis
      const usadas = isFontanaPropiedadPlano(l)
        ? totalPorLugar[l] || 0
        : ocupadasPorLugar[l] || 0;
      return usadas < cfg.cupo;
    });
  }, [lugares, cupos, ocupadasPorLugar, totalPorLugar]);

  /** Etiqueta visible: Fontana X · PB · Hab. 01 (o secuencia si no hay croquis) */
  const etiquetaPorHabitacionId = useMemo(() => {
    const map = new Map<number, string>();
    const byLugar = new Map<string, Habitacion[]>();
    for (const h of habitaciones) {
      const d = parseFontanaDetalles(h.detallesJson);
      const lugar = (d.nombreLugar || "Fontana").trim() || "Fontana";
      const key = lugar.toLowerCase();
      if (!byLugar.has(key)) byLugar.set(key, []);
      byLugar.get(key)!.push(h);
    }
    for (const [, list] of byLugar) {
      const sorted = [...list].sort((a, b) => a.habitacionId - b.habitacionId);
      const lugarLabel =
        parseFontanaDetalles(sorted[0]?.detallesJson).nombreLugar?.trim() || "Fontana";
      sorted.forEach((h, idx) => {
        const d = parseFontanaDetalles(h.detallesJson);
        if (d.numeroHabitacion && d.numeroHabitacion > 0) {
          const n = String(d.numeroHabitacion).padStart(2, "0");
          const pl = d.planta ? ` · ${d.planta}` : "";
          map.set(h.habitacionId, `${lugarLabel}${pl} · Hab. ${n}`);
        } else {
          map.set(h.habitacionId, formatNombreHabitacionLugar(idx + 1, lugarLabel));
        }
      });
    }
    return map;
  }, [habitaciones]);

  const openCreate = () => {
    setCtxMenu(null);
    if (lugaresDisponiblesAlta.length === 0) {
      toast.error("No hay lugares con cupo libre", {
        description: "Desocupá una plaza o aumentá el cupo en «Gestionar cupos».",
      });
      return;
    }
    setEditingId(null);
    const lugarInicial = lugaresDisponiblesAlta[0] || "";
    const items = habitaciones.map((h) => ({
      nombre: h.nombre,
      nombreLugar: parseFontanaDetalles(h.detallesJson).nombreLugar,
    }));
    const num = nextNumeroHabitacionEnLugar(items, lugarInicial);
    setForm({
      ...emptyForm(),
      nombreLugar: lugarInicial,
      nombreHabitacion: formatNombreHabitacionLugar(num, lugarInicial),
      numeroHabitacion: num,
    });
    setFormOpen(true);
  };

  const openCreateDesdeSlot = (args: {
    propiedad: FontanaPropiedadPlano;
    planta: FontanaPlanta;
    numero: number;
    capacidad: number;
    modalidad: "DIARIA" | "MENSUAL";
  }) => {
    const cfg = cupos[args.propiedad] || {
      cupo: cupoDefaultParaLugar(args.propiedad),
      habilitado: true,
    };
    const usadas = totalPorLugar[args.propiedad] || 0;
    if (!cfg.habilitado) {
      toast.error(`«${args.propiedad}» está deshabilitada`);
      return;
    }
    if (usadas >= cfg.cupo) {
      toast.error(`«${args.propiedad}» ya llegó al cupo (${cfg.cupo})`, {
        description: "Aumentá el cupo en «Gestionar cupos» si necesitás más altas.",
      });
      return;
    }
    const n = String(args.numero).padStart(2, "0");
    const tipoAlquiler: TipoAlquilerFontana =
      args.modalidad === "MENSUAL" ? "Mensualero" : "Diario";
    setEditingId(null);
    setForm({
      ...emptyForm(),
      nombreLugar: args.propiedad,
      planta: args.planta,
      numeroHabitacion: args.numero,
      modalidad: args.modalidad,
      cantidadHabitaciones: args.capacidad,
      plazasOcupadas: 0,
      tipoAlquiler,
      estadoInquilino: "Retirado",
      nombreHabitacion: `${args.propiedad} · ${args.planta} · Hab. ${n}`,
      nombreApellido: "Disponible",
    });
    setFormOpen(true);
    toast.message("Alta desde croquis", {
      description: `${args.propiedad} · ${args.planta} · HAB. ${n} · ${args.modalidad}`,
    });
  };

  const openEdit = (h: Habitacion) => {
    setCtxMenu(null);
    const d = parseFontanaDetalles(h.detallesJson);
    const extractHora = (iso?: string | null) => {
      if (!iso || !iso.includes("T")) return undefined;
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) return undefined;
      return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    };
    const resActiva = reservas.find(
      (r) =>
        r.habitacionId === h.habitacionId &&
        r.estado !== "Cancelada" &&
        r.estado !== "CheckOut"
    );
    setEditingId(h.habitacionId);
    setForm({
      ...emptyForm(),
      ...d,
      nombreHabitacion: h.nombre,
      monto: d.monto ?? h.precioBasePorNocheGs,
      precioAcordado: d.precioAcordado ?? h.precioBasePorNocheGs,
      tipoAlquiler: (d.tipoAlquiler as TipoAlquilerFontana) || (h.tipo as TipoAlquilerFontana) || "Habitación",
      fechaIngreso: (d.fechaIngreso || resActiva?.fechaCheckIn || "").slice(0, 10),
      fechaSalida: (d.fechaSalida || resActiva?.fechaCheckOut || "").slice(0, 10) || "",
      horaIngreso:
        d.horaIngreso ||
        extractHora(resActiva?.fechaCheckIn) ||
        extractHora(d.fechaIngreso) ||
        "14:00",
      horaSalida:
        d.horaSalida ||
        extractHora(resActiva?.fechaCheckOut) ||
        extractHora(d.fechaSalida) ||
        "12:00",
    });
    setFormOpen(true);
  };

  const ejecutarEliminarHabitacion = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/Habitaciones/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje || err.detalle || `Error ${res.status}`);
      }
      toast.success("Habitación eliminada");
      if (selectedId === id) setSelectedId(null);
      await cargar();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  };

  const handleDelete = (id: number) => {
    setCtxMenu(null);
    toast.warning("¿Eliminar esta habitación?", {
      description: "Se cancelarán también sus reservas asociadas.",
      duration: Infinity,
      action: {
        label: "Eliminar",
        onClick: () => {
          void ejecutarEliminarHabitacion(id);
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => toast.dismiss(),
      },
    });
  };

  const abrirComprobanteGarantia = (h: Habitacion, d: FontanaDetalles) => {
    const monto = Number(d.garantia) || 0;
    if (monto <= 0) {
      toast.error("No hay garantía cargada para emitir comprobante");
      return;
    }
    const now = new Date();
    const desc =
      d.garantiaComprobante?.descripcion ||
      `Garantía de alojamiento — ${d.nombreLugar || "Fontana"} / ${
        etiquetaPorHabitacionId.get(h.habitacionId) || h.nombre
      }`;
    setComprobanteKind("garantia");
    setPendingDesocuparAfterFactura(false);
    setComprobanteHabitacionId(h.habitacionId);
    setComprobantePagoData({
      pagoId: 0,
      localOnly: true,
      forceTipoEmision: "recibo",
      tipoPago: "Garantía",
      mesPagado: now.getMonth() + 1,
      anioPagado: now.getFullYear(),
      montoPagado: monto,
      metodoPago: "Efectivo",
      fechaPago: d.fechaIngreso || now.toISOString(),
      facturaEmitida: false,
      numeroFactura: d.garantiaComprobante?.numeroFactura,
      comprobanteUrl: JSON.stringify({
        descripcion: desc,
        concepto: desc,
        nombreInquilino: d.nombreApellido,
        rucInquilino: d.cedula || "N/D",
        ...(d.garantiaComprobante?.metadata || {}),
      }),
      inquilinoNombre: d.nombreApellido || "Huésped",
      inquilinoDocumento: d.cedula || "Sin Documento",
      unidadCodigo: h.nombre,
      condominioNombre: d.nombreLugar || "Fontana",
      items: [
        {
          cantidad: 1,
          descripcion: desc,
          precioUnitario: monto,
          exenta: monto, // Recibo de garantía: sin IVA
        },
      ],
    });
    setComprobanteOpen(true);
  };

  const abrirComprobanteAlojamiento = (h: Habitacion, d: FontanaDetalles, luegoDesocupar: boolean) => {
    const montoAloj = Number(d.monto) || Number(d.precioAcordado) || h.precioBasePorNocheGs || 0;
    const servicios = (d.serviciosExtras || []).filter((s) => (Number(s.monto) || 0) > 0);
    const totalServicios = servicios.reduce((a, s) => a + (Number(s.monto) || 0), 0);
    const montoTotal = montoAloj + totalServicios;
    if (montoTotal <= 0) {
      toast.error("No hay monto de alojamiento ni servicios para facturar");
      return;
    }
    const now = new Date();
    const descAloj =
      d.alojamientoComprobante?.descripcion ||
      `Servicio de alojamiento (${d.tipoAlquiler || h.tipo}) — ${d.nombreLugar || "Fontana"} / ${
        etiquetaPorHabitacionId.get(h.habitacionId) || h.nombre
      }`;
    const items: Array<{
      cantidad: number;
      descripcion: string;
      precioUnitario: number;
      iva10: number;
    }> = [];
    if (montoAloj > 0) {
      items.push({
        cantidad: 1,
        descripcion: descAloj,
        precioUnitario: montoAloj,
        iva10: montoAloj,
      });
    }
    for (const s of servicios) {
      const m = Number(s.monto) || 0;
      items.push({
        cantidad: 1,
        descripcion: s.nombre,
        precioUnitario: m,
        iva10: m,
      });
    }
    const descFactura =
      servicios.length > 0
        ? `${descAloj}${montoAloj > 0 ? "" : ""} + ${servicios.length} servicio(s) extra`
        : descAloj;
    setComprobanteKind("alojamiento");
    setPendingDesocuparAfterFactura(luegoDesocupar);
    setComprobanteHabitacionId(h.habitacionId);
    setComprobantePagoData({
      pagoId: 0,
      localOnly: true,
      forceTipoEmision: "factura",
      tipoPago: "Alojamiento",
      mesPagado: now.getMonth() + 1,
      anioPagado: now.getFullYear(),
      montoPagado: montoTotal,
      metodoPago: "Efectivo",
      fechaPago: now.toISOString(),
      facturaEmitida: true,
      numeroFactura: d.alojamientoComprobante?.numeroFactura,
      comprobanteUrl: JSON.stringify({
        descripcion: descFactura,
        concepto: descFactura,
        nombreInquilino: d.nombreApellido,
        rucInquilino: d.cedula || "N/D",
        ...(d.alojamientoComprobante?.metadata || {}),
      }),
      inquilinoNombre: d.nombreApellido || "Huésped",
      inquilinoDocumento: d.cedula || "Sin Documento",
      unidadCodigo: h.nombre,
      condominioNombre: d.nombreLugar || "Fontana",
      items,
    });
    setComprobanteOpen(true);
  };

  const agregarServicioExtra = async () => {
    if (!selected) return;
    const nombre = nuevoServicio.nombre.trim();
    const monto = Number(nuevoServicio.monto) || 0;
    if (!nombre) {
      toast.error("Indicá el nombre del servicio");
      return;
    }
    if (monto <= 0) {
      toast.error("Indicá el monto del servicio");
      return;
    }
    const item: FontanaServicioExtra = {
      id: crypto.randomUUID(),
      nombre,
      monto,
      fecha: new Date().toISOString().slice(0, 10),
    };
    await persistDetalles({
      ...selectedDetalles,
      serviciosExtras: [...(selectedDetalles.serviciosExtras || []), item],
    });
    setNuevoServicio({ nombre: "", monto: 0 });
    setServicioOpen(false);
    toast.success(`Servicio «${nombre}» agregado — se facturará al desocupar`);
  };

  const eliminarServicioExtra = async (id: string) => {
    if (!selected) return;
    await persistDetalles({
      ...selectedDetalles,
      serviciosExtras: (selectedDetalles.serviciosExtras || []).filter((s) => s.id !== id),
    });
    toast.success("Servicio eliminado");
  };

  const guardarHabitacion = async () => {
    if (!form.nombreLugar?.trim()) {
      toast.error("Seleccioná o creá el nombre del lugar");
      return;
    }
    if (!form.nombreHabitacion.trim() && !form.nombreLugar?.trim()) {
      toast.error("Indicá el nombre del lugar / habitación");
      return;
    }
    if (!form.nombreApellido?.trim()) {
      toast.error("Indicá nombre y apellido del inquilino / huésped");
      return;
    }
    setSaving(true);
    try {
      // Validar cupo del lugar al crear
      if (!editingId && form.nombreLugar) {
        const cfg = cupos[form.nombreLugar] || {
          cupo: cupoDefaultParaLugar(form.nombreLugar),
          habilitado: true,
        };
        if (!cfg.habilitado) {
          toast.error(`El lugar «${form.nombreLugar}» está deshabilitado`);
          setSaving(false);
          return;
        }
        const usadas = isFontanaPropiedadPlano(form.nombreLugar)
          ? totalPorLugar[form.nombreLugar] || 0
          : ocupadasPorLugar[form.nombreLugar] || 0;
        if (usadas >= cfg.cupo) {
          toast.error(`«${form.nombreLugar}» ya está en su cupo máximo (${cfg.cupo})`);
          setSaving(false);
          return;
        }
      }

      // Dúplex Agus: habitaciones internas solo si el dúplex está libre
      if (form.unidadDuplexId) {
        const duplex = duplexUnidades.find((d) => d.unidadId === form.unidadDuplexId);
        const ocupadoDuplex = duplex && String(duplex.estado).toLowerCase() === "ocupado";
        if (ocupadoDuplex) {
          toast.error("Ese dúplex está ocupado por contrato — no se puede alquilar habitación interna");
          setSaving(false);
          return;
        }
        if (!form.habitacionDuplexInterna) {
          toast.error("Seleccioná Habitación 1, 2 o 3 del dúplex Agus");
          setSaving(false);
          return;
        }
      }

      let huespedId = form.huespedId || null;
      if (!huespedId) {
        const pRes = await fetch(`${API_BASE}/api/contactos/clientes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresaId,
            razonSocial: form.nombreApellido.trim(),
            documento: form.cedula || "S/D",
            telefono: form.telefono || null,
            email: null,
            esCliente: true,
            esProveedor: false,
          }),
        });
        if (pRes.ok) {
          const persona = await pRes.json();
          huespedId = persona.personaId ?? persona.PersonaId ?? null;
        }
      }

      const duplex = duplexUnidades.find((d) => d.unidadId === form.unidadDuplexId);
      const lugar =
        form.nombreLugar?.trim() ||
        duplex?.nombreCondominio ||
        "Fontana";

      // Nombre: prioriza croquis (planta + número) si está definido
      let nombreHab = (form.nombreHabitacion || "").trim();
      if (form.numeroHabitacion && form.numeroHabitacion > 0) {
        const n = String(form.numeroHabitacion).padStart(2, "0");
        const pl = form.planta ? ` · ${form.planta}` : "";
        nombreHab = `${lugar}${pl} · Hab. ${n}`;
      } else if (!editingId) {
        const items = habitaciones.map((h) => ({
          nombre: h.nombre,
          nombreLugar: parseFontanaDetalles(h.detallesJson).nombreLugar,
        }));
        const num = nextNumeroHabitacionEnLugar(items, lugar);
        nombreHab = formatNombreHabitacionLugar(num, lugar);
      } else {
        const etiqueta = etiquetaPorHabitacionId.get(editingId);
        if (etiqueta) nombreHab = etiqueta;
        else if (lugar) {
          const n = extractNumeroHabitacion(nombreHab) || 1;
          nombreHab = formatNombreHabitacionLugar(n, lugar);
        }
      }

      // Al crear: solo registrar cobro de garantía (el alojamiento se factura al desocupar)
      const pagosIniciales: FontanaDetalles["pagos"] = [...(form.pagos || [])];
      if (!editingId) {
        const fechaPago = form.fechaIngreso || new Date().toISOString().slice(0, 10);
        const garantia = Number(form.garantia) || 0;
        if (garantia > 0) {
          pagosIniciales.push({
            id: crypto.randomUUID(),
            fecha: fechaPago,
            concepto: "Garantía (recibo sin IVA)",
            monto: garantia,
            estado: "Pagado",
          });
        }
      }

      const capacidad = Number(form.cantidadHabitaciones) || 1;
      const modalidad =
        form.modalidad ||
        (String(form.tipoAlquiler || "").toLowerCase().includes("mensual")
          ? "MENSUAL"
          : form.tipoAlquiler === "Diario" || form.tipoAlquiler === "Semanal"
            ? "DIARIA"
            : form.modalidad);

      let plazasOcupadas = form.plazasOcupadas;
      if (
        form.estadoInquilino === "Activo" ||
        form.estadoInquilino === "Moroso"
      ) {
        if (plazasOcupadas == null || Number(plazasOcupadas) <= 0) {
          plazasOcupadas = capacidad;
        }
      } else if (form.estadoInquilino === "Retirado") {
        plazasOcupadas = 0;
      }

      const detalles: FontanaDetalles = {
        nombreLugar: lugar,
        numeroHabitacion: form.numeroHabitacion || undefined,
        planta: form.planta || undefined,
        modalidad: modalidad || undefined,
        plazasOcupadas:
          plazasOcupadas == null ? undefined : Math.max(0, Number(plazasOcupadas) || 0),
        cantidadHabitaciones: capacidad,
        precioAcordado: Number(form.precioAcordado) || Number(form.monto) || 0,
        nombreApellido: form.nombreApellido,
        cedula: form.cedula,
        telefono: form.telefono,
        contactoEmergencia: form.contactoEmergencia,
        tipoAlquiler: form.tipoAlquiler,
        fechaIngreso: form.fechaIngreso,
        fechaSalida: form.fechaSalida || undefined,
        horaIngreso: form.horaIngreso || "14:00",
        horaSalida: form.horaSalida || "12:00",
        monto: Number(form.monto) || 0,
        garantia: Number(form.garantia) || 0,
        estadoInquilino: form.estadoInquilino,
        observaciones: form.observaciones,
        unidadDuplexId: form.unidadDuplexId ?? null,
        unidadCodigo: duplex ? duplex.codigoUnidad : form.unidadCodigo ?? null,
        nombreCondominio: duplex?.nombreCondominio || form.nombreCondominio || lugar,
        huespedId,
        reservaId: form.reservaId ?? null,
        habitacionDuplexInterna: form.habitacionDuplexInterna ?? null,
        serviciosExtras: form.serviciosExtras || [],
        pagos: pagosIniciales,
        reclamos: form.reclamos || [],
        documentos: form.documentos || [],
      };

      const estadoHab =
        form.estadoInquilino === "Activo"
          ? "Ocupada"
          : form.estadoInquilino === "Pendiente"
            ? "Disponible"
            : form.estadoInquilino === "Retirado"
              ? "Disponible"
              : "Ocupada";

      const payload = {
        empresaId,
        nombre: nombreHab,
        tipo: form.tipoAlquiler || "Habitación",
        capacidadCamas: Number(form.cantidadHabitaciones) || 1,
        precioBasePorNocheGs: Number(form.monto) || Number(form.precioAcordado) || 0,
        estado: estadoHab,
        detallesJson: stringifyFontanaDetalles(detalles),
      };

      let habitacionId = editingId;
      if (editingId) {
        const res = await fetch(`${API_BASE}/api/Habitaciones/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, habitacionId: editingId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.mensaje || `Error al actualizar (${res.status})`);
        }
      } else {
        const res = await fetch(`${API_BASE}/api/Habitaciones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.mensaje || `Error al crear habitación (${res.status})`);
        }
        const created = await res.json();
        habitacionId = created.habitacionId ?? created.HabitacionId;
      }

      // Reserva en calendario si hay fechas e huésped
      let reservaIdCreada: number | null = detalles.reservaId ?? null;
      if (habitacionId && huespedId && form.fechaIngreso) {
        const checkOutDate =
          form.fechaSalida ||
          (() => {
            const d = new Date(form.fechaIngreso!);
            d.setDate(
              d.getDate() +
                (form.tipoAlquiler === "Mensualero" ? 30 : form.tipoAlquiler === "Semanal" ? 7 : 1)
            );
            return d.toISOString().slice(0, 10);
          })();

        const existing = reservas.find(
          (r) =>
            r.habitacionId === habitacionId &&
            r.estado !== "Cancelada" &&
            r.estado !== "CheckOut"
        );
        const montoTotal = Number(form.monto) || Number(form.precioAcordado) || 0;
        const montoPagado =
          (Number(form.garantia) || 0) + (Number(form.monto) || Number(form.precioAcordado) || 0);
        const fechaCheckIn =
          toApiDateTime(form.fechaIngreso, form.horaIngreso || "14:00", "14:00") || form.fechaIngreso;
        const fechaCheckOut =
          toApiDateTime(checkOutDate, form.horaSalida || "12:00", "12:00") || checkOutDate;
        const reservaBody = {
          empresaId,
          habitacionId,
          huespedId,
          usuarioId: usuario?.id || null,
          fechaCheckIn,
          fechaCheckOut,
          estado: form.estadoInquilino === "Pendiente" ? "Pendiente" : "Confirmada",
          montoTotalGs: montoTotal,
          montoPagadoGs: Math.min(montoPagado, montoTotal || montoPagado),
          origenReserva: "Fontana",
          notasAdicionales: form.observaciones || "",
        };
        if (existing) {
          await fetch(`${API_BASE}/api/Reservas/${existing.reservaId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...reservaBody, reservaId: existing.reservaId }),
          });
          reservaIdCreada = existing.reservaId;
        } else {
          const rRes = await fetch(`${API_BASE}/api/Reservas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reservaBody),
          });
          if (rRes.ok) {
            const rCreated = await rRes.json();
            reservaIdCreada = rCreated.reservaId ?? rCreated.ReservaId ?? null;
          }
        }

        if (reservaIdCreada) {
          await fetch(`${API_BASE}/api/Habitaciones/${habitacionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              habitacionId,
              detallesJson: stringifyFontanaDetalles({ ...detalles, reservaId: reservaIdCreada }),
            }),
          });
        }
      }

      setFormOpen(false);
      await cargar();
      if (habitacionId) {
        setSelectedId(habitacionId);
        setFichaTab("reserva");
      }

      // Automatización PDF v1: pago de hospedaje/garantía → ingreso en Finanzas
      const propFin = resolveFontanaPropiedadPlano(lugar);
      if (propFin && !editingId) {
        const garantiaMontoFin = Number(form.garantia) || 0;
        if (garantiaMontoFin > 0) {
          addFontanaMovimiento(empresaId, {
            tipo: "ingreso",
            propiedad: propFin,
            categoria: "Otros ingresos",
            concepto: `Garantía · ${nombreHab}`,
            monto: garantiaMontoFin,
            fecha: (form.fechaIngreso || new Date().toISOString().slice(0, 10)).slice(0, 10),
            metodoPago: "Efectivo",
            origen: `garantia:hab:${habitacionId}`,
          })
            .then(() => setFinanzasTick((t) => t + 1))
            .catch(() => {
              /* no bloquear alta de habitación */
            });
        }
      }

      // Si hay garantía: abrir recibo (sin IVA) de inmediato
      const garantiaMonto = Number(form.garantia) || 0;
      if (habitacionId && garantiaMonto > 0 && !editingId) {
        const hFake: Habitacion = {
          habitacionId,
          empresaId,
          nombre: payload.nombre,
          tipo: payload.tipo,
          capacidadCamas: payload.capacidadCamas,
          precioBasePorNocheGs: payload.precioBasePorNocheGs,
          estado: payload.estado as Habitacion["estado"],
          detallesJson: stringifyFontanaDetalles(detalles),
        };
        toast.success("Habitación creada. Emití el RECIBO de garantía (sin IVA).");
        setTimeout(() => abrirComprobanteGarantia(hFake, detalles), 400);
      } else {
        toast.success(editingId ? "Habitación actualizada" : "Habitación creada");
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const persistDetalles = async (next: FontanaDetalles) => {
    if (!selected) return;
    const res = await fetch(`${API_BASE}/api/Habitaciones/${selected.habitacionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...selected,
        detallesJson: stringifyFontanaDetalles(next),
      }),
    });
    if (!res.ok) {
      toast.error("No se pudo guardar");
      return;
    }
    await cargar();
  };

  const reservaActiva = useMemo(() => {
    if (!selectedId) return null;
    const byId = selectedDetalles.reservaId
      ? reservas.find((r) => r.reservaId === selectedDetalles.reservaId)
      : null;
    if (byId && byId.estado !== "Cancelada" && byId.estado !== "CheckOut") return byId;
    return (
      reservas.find(
        (r) =>
          r.habitacionId === selectedId &&
          r.estado !== "Cancelada" &&
          r.estado !== "CheckOut"
      ) || null
    );
  }, [reservas, selectedId, selectedDetalles.reservaId]);

  const totalPagadoFicha = useMemo(
    () =>
      (selectedDetalles.pagos || [])
        .filter((p) => p.estado === "Pagado")
        .reduce((a, p) => a + (p.monto || 0), 0),
    [selectedDetalles.pagos]
  );

  const ejecutarDesocupar = async (detallesBase?: FontanaDetalles) => {
    if (!selected) return;
    setDesocupando(true);
    try {
      const activas = reservas.filter(
        (r) =>
          r.habitacionId === selected.habitacionId &&
          r.estado !== "Cancelada" &&
          r.estado !== "CheckOut"
      );
      for (const r of activas) {
        const res = await fetch(`${API_BASE}/api/Reservas/${r.reservaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...r,
            estado: "CheckOut",
            fechaCheckOut: new Date().toISOString(),
            habitacion: undefined,
            huesped: undefined,
            empresa: undefined,
            usuario: undefined,
          }),
        });
        if (!res.ok) throw new Error("No se pudo cerrar la reserva");
      }

      // Usar detalles frescos (p.ej. tras emitir factura) para no pisar el historial de pagos
      const base =
        detallesBase ||
        parseFontanaDetalles(
          habitaciones.find((x) => x.habitacionId === selected.habitacionId)?.detallesJson ||
            selected.detallesJson
        );

      const nextDetalles: FontanaDetalles = {
        ...base,
        estadoInquilino: "Retirado",
        fechaSalida: new Date().toISOString().slice(0, 10),
        reservaId: null,
        observaciones: [
          base.observaciones,
          `Desocupado ${new Date().toLocaleDateString("es-PY")}`,
        ]
          .filter(Boolean)
          .join(" | "),
      };

      const resHab = await fetch(`${API_BASE}/api/Habitaciones/${selected.habitacionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selected,
          estado: "Disponible",
          detallesJson: stringifyFontanaDetalles(nextDetalles),
        }),
      });
      if (!resHab.ok) throw new Error("No se pudo liberar la habitación");

      toast.success("Habitación desocupada y disponible");
      await cargar();
      setFichaTab("pagos");
    } catch (e: any) {
      toast.error(e?.message || "Error al desocupar");
    } finally {
      setDesocupando(false);
    }
  };

  const desocuparHabitacion = () => {
    if (!selected) return;
    const montoAloj =
      Number(selectedDetalles.monto) ||
      Number(selectedDetalles.precioAcordado) ||
      selected.precioBasePorNocheGs ||
      0;
    const nServ = (selectedDetalles.serviciosExtras || []).length;
    const totalServ = (selectedDetalles.serviciosExtras || []).reduce(
      (a, s) => a + (Number(s.monto) || 0),
      0
    );
    const hayFactura = montoAloj + totalServ > 0;
    toast.warning("¿Desocupar habitación?", {
      description: hayFactura
        ? `Primero se emitirá la FACTURA (alojamiento${nServ > 0 ? ` + ${nServ} servicio(s)` : ""} con IVA). Al guardar/imprimir, la habitación quedará disponible.`
        : "Se cancelará la reserva y la habitación quedará disponible.",
      duration: Infinity,
      action: {
        label: hayFactura ? "Facturar y desocupar" : "Desocupar",
        onClick: () => {
          if (hayFactura) {
            abrirComprobanteAlojamiento(selected, selectedDetalles, true);
          } else {
            void ejecutarDesocupar();
          }
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => toast.dismiss(),
      },
    });
  };

  const addReclamo = async () => {
    if (!nuevoReclamo.trim()) return;
    const reclamos = [
      ...(selectedDetalles.reclamos || []),
      { id: crypto.randomUUID(), fecha: new Date().toISOString(), texto: nuevoReclamo.trim() },
    ];
    await persistDetalles({ ...selectedDetalles, reclamos });
    setNuevoReclamo("");
    toast.success("Aviso / reclamo guardado");
  };

  const dayCovered = (day: Date, start: Date, end: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return start < dayEnd && end > dayStart;
  };

  const bloquesHoraFocus = useMemo(() => {
    const dayStart = new Date(calendarFocusDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayMs = 24 * 60 * 60 * 1000;

    return ocupacionesTimed
      .filter((o) => o.start < dayEnd && o.end > dayStart)
      .map((o) => {
        const from = o.start > dayStart ? o.start : dayStart;
        const to = o.end < dayEnd ? o.end : dayEnd;
        const leftPct = ((from.getTime() - dayStart.getTime()) / dayMs) * 100;
        const widthPct = Math.max(0.8, ((to.getTime() - from.getTime()) / dayMs) * 100);
        return {
          ...o,
          leftPct,
          widthPct,
          fromLabel: formatMinutos(from.getHours() * 60 + from.getMinutes()),
          toLabel: formatMinutos(
            to.getTime() >= dayEnd.getTime()
              ? 24 * 60
              : to.getHours() * 60 + to.getMinutes()
          ),
        };
      });
  }, [calendarFocusDay, ocupacionesTimed]);

  return (
    <div
      className="fontana-page space-y-4 sm:space-y-6 animate-in fade-in duration-500 w-full min-w-0 max-w-full pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      onContextMenu={(e) => {
        // Click derecho en área vacía → crear
        if ((e.target as HTMLElement).closest("[data-fontana-card]")) return;
        e.preventDefault();
        openCtxAt(e.clientX, e.clientY, null);
      }}
    >
      {/* Módulo Fontana dentro del entorno Condominio Agus / Fontana Di Luque */}
      <div className="bg-[#0C1327] border border-amber-500/20 rounded-[1.5rem] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/90">
              Condominio Agus · Módulo Fontana
            </p>
            <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-white mt-1">
              Fontana · Alojamiento operativo
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Croquis · propiedades · hospedaje · finanzas · personal · reportes
            </p>
          </div>
        </div>
      </div>

      {/* Tabs módulo Fontana */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-[#0C1327] border border-white/5 w-full">
        {(
          [
            ["croquis", "Croquis"],
            ["propiedades", "Propiedades"],
            ["hospedaje", "Hospedaje"],
            ["finanzas", "Finanzas"],
            ["personal", "Personal"],
            ["reportes", "Reportes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFontanaVista(id)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider min-h-11 touch-manipulation transition-colors ${
              fontanaVista === id
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {fontanaVista === "croquis" && (
        <FontanaCroquisDashboard
          habitaciones={habitaciones}
          reservas={reservas}
          onAbrirHabitacion={(h) => {
            setSelectedId(h.habitacionId);
            setFontanaVista("hospedaje");
          }}
          onCrearDesdeSlot={openCreateDesdeSlot}
        />
      )}

      {fontanaVista === "propiedades" && (
        <FontanaPropiedadesDashboard
          lugares={lugares}
          habitaciones={habitaciones}
          etiquetaPorHabitacionId={etiquetaPorHabitacionId}
          canCreate={lugaresDisponiblesAlta.length > 0}
          onCrearHabitacion={openCreate}
          onAbrirHabitacion={(h) => {
            setSelectedId(h.habitacionId);
            setFontanaVista("hospedaje");
          }}
        />
      )}

      {fontanaVista === "finanzas" && (
        <FontanaFinanzasPage
          empresaId={empresaId}
          habitaciones={habitaciones}
          reservas={reservas}
        />
      )}

      {fontanaVista === "personal" && (
        <FontanaPersonalPage
          empresaId={empresaId}
          onFinanzasChanged={() => setFinanzasTick((t) => t + 1)}
        />
      )}

      {fontanaVista === "reportes" && (
        <FontanaReportesPage
          empresaId={empresaId}
          habitaciones={habitaciones}
          reservas={reservas}
          refreshKey={finanzasTick}
        />
      )}

      {fontanaVista === "hospedaje" && (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-[#0C1327] p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[1.75rem] border border-white/5">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3 mobile-title">
            <span className="bg-amber-500/20 text-amber-400 p-2 rounded-xl shrink-0">
              <Bed className="w-5 h-5" />
            </span>
            Fontana
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1 leading-snug">
            Módulo Fontana (Agus) · cupos · dúplex Agus ocasional · en móvil: mantener pulsado la tarjeta
          </p>
        </div>
        <div className="flex flex-col xs:flex-row sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => {
              setCupos(loadFontanaCupos(empresaId));
              setCuposOpen(true);
            }}
            className="rounded-xl border-white/10 text-slate-200 w-full sm:w-auto min-h-11 touch-manipulation"
          >
            <Settings className="w-4 h-4 mr-2" /> Cupos
          </Button>
          <Button
            onClick={openCreate}
            disabled={lugaresDisponiblesAlta.length === 0}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black italic rounded-xl w-full sm:w-auto min-h-11 touch-manipulation"
          >
            <Plus className="w-4 h-4 mr-2" /> Crear habitación
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cargando Fontana…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 xl:gap-6">
          {habitaciones.length === 0 && (
            <div
              className="col-span-full bg-[#0C1327]/60 border-2 border-dashed border-white/10 rounded-3xl p-12 text-center cursor-context-menu"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu(null);
                openCtxAt(e.clientX, e.clientY, null);
              }}
            >
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Sin habitaciones aún
              </p>
              <p className="text-xs text-slate-500 mt-2">
                En móvil: mantener pulsado · o usá el botón «Crear habitación»
              </p>
            </div>
          )}

          {habitaciones.map((h) => {
            const d = parseFontanaDetalles(h.detallesJson);
            const ocupada = h.estado === "Ocupada" || d.estadoInquilino === "Activo" || d.estadoInquilino === "Moroso";
            return (
              <Card
                key={h.habitacionId}
                data-fontana-card
                onClick={() => setSelectedId(h.habitacionId)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openCtxAt(e.clientX, e.clientY, h.habitacionId);
                }}
                onTouchStart={(e) => onCardTouchStart(e, h.habitacionId)}
                onTouchEnd={clearLongPress}
                onTouchMove={clearLongPress}
                onTouchCancel={clearLongPress}
                className={`group cursor-pointer transition-all duration-300 border rounded-2xl overflow-hidden hover:shadow-xl bg-[#0C1327] touch-manipulation select-none ${
                  selectedId === h.habitacionId
                    ? "border-amber-500/60 shadow-lg shadow-amber-500/10"
                    : "border-white/5 hover:border-amber-500/30"
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:gap-4">
                    <div
                      className={`w-full 2xl:w-auto px-3 min-w-0 2xl:min-w-14 h-11 2xl:h-14 shrink-0 rounded-xl flex items-center justify-between 2xl:justify-center font-black italic text-sm tracking-tight ${
                        ocupada ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      <span className="truncate">
                        {etiquetaPorHabitacionId.get(h.habitacionId) || h.nombre}
                      </span>
                      <span className="2xl:hidden text-[9px] font-bold uppercase font-sans ml-2">
                        {d.estadoInquilino || h.estado}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-[13px] font-heading font-bold uppercase break-words ${
                          d.nombreApellido ? "text-white" : "text-slate-500"
                        }`}
                      >
                        {d.nombreApellido || "SIN HUÉSPED"}
                      </h4>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                        {d.tipoAlquiler || h.tipo}
                        {d.unidadCodigo ? ` · ${formatDuplex(d.unidadCodigo)}` : ""}
                        {d.habitacionDuplexInterna
                          ? ` · Hab interna ${d.habitacionDuplexInterna}`
                          : ""}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-black text-slate-400 italic">
                          Gs. {(d.monto ?? h.precioBasePorNocheGs).toLocaleString("es-PY")}
                        </span>
                        <Badge
                          className={`text-[8px] font-black uppercase border-none ${
                            ocupada ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {d.estadoInquilino || h.estado}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {lugaresDisponiblesAlta.length > 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="min-h-[88px] rounded-2xl border-2 border-dashed border-white/10 bg-[#0C1327]/40 text-slate-500 hover:text-amber-400 hover:border-amber-500/40 font-black italic text-xs uppercase tracking-widest transition-colors"
            >
              + Nueva habitación (cupos libres)
            </button>
          )}
        </div>
      )}

      {/* Dúplex del condominio: ocupados y libres (habitaciones internas) */}
      <div className="bg-[#0C1327]/70 border border-white/5 rounded-2xl p-3 sm:p-5 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-start gap-2 leading-relaxed">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Dúplex Agus libres — alquiler ocasional de Hab 1 (suite), Hab 2 (frente suite) y Hab 3 (frente baño); solo si el dúplex no tiene inquilino de contrato
          </span>
        </p>
        {duplexUnidades.length === 0 ? (
          <p className="text-xs text-slate-500">No hay dúplex cargados en condominio.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(
              duplexUnidades.reduce<Record<string, DuplexUnidad[]>>((acc, d) => {
                const key = d.nombreCondominio || "Sin condominio";
                (acc[key] ||= []).push(d);
                return acc;
              }, {})
            ).map(([condo, list]) => (
              <div key={condo}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  {condo}
                </p>
                <div className="flex flex-wrap gap-2">
                  {list.map((d) => {
                    const ocupado = String(d.estado).toLowerCase() === "ocupado";
                    return (
                      <Badge
                        key={d.unidadId}
                        className={`font-bold text-[10px] px-3 py-2 border touch-manipulation ${
                          ocupado
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                        }`}
                        title={ocupado ? "Unidad ocupada por contrato" : "Unidad libre — disponible para habitaciones Fontana"}
                      >
                        {formatDuplex(d.codigoUnidad)}
                        <span className="ml-1.5 opacity-70">{ocupado ? "· ocupado" : "· libre"}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ficha + calendario al seleccionar tarjeta */}
      {selected && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-400 min-w-0">
          <div className="bg-[#0C1327] border border-white/5 rounded-[1.25rem] sm:rounded-[1.5rem] p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6">
              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                    {(selectedDetalles.nombreApellido || selected.nombre).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black italic uppercase text-white truncate">
                      {selectedDetalles.nombreApellido || "Huésped"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider break-words">
                      {etiquetaPorHabitacionId.get(selected.habitacionId) || selected.nombre} · CI{" "}
                      {selectedDetalles.cedula || "—"} · {selectedDetalles.telefono || "Sin tel."}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-slate-500 uppercase font-bold">Ingreso</p>
                    <p className="text-white font-black mt-1">
                      {formatFechaHoraCorta(
                        selectedDetalles.fechaIngreso,
                        selectedDetalles.horaIngreso
                      )}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-slate-500 uppercase font-bold">Salida</p>
                    <p className="text-white font-black mt-1">
                      {formatFechaHoraCorta(
                        selectedDetalles.fechaSalida,
                        selectedDetalles.horaSalida
                      )}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-slate-500 uppercase font-bold">Monto</p>
                    <p className="text-amber-400 font-black mt-1">
                      Gs. {(selectedDetalles.monto ?? 0).toLocaleString("es-PY")}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-slate-500 uppercase font-bold">Garantía</p>
                    <p className="text-white font-black mt-1">
                      Gs. {(selectedDetalles.garantia ?? 0).toLocaleString("es-PY")}
                    </p>
                  </div>
                </div>
                {(selectedDetalles.serviciosExtras || []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Servicios extras (se facturan al desocupar)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(selectedDetalles.serviciosExtras || []).map((s) => (
                        <div
                          key={s.id}
                          className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-amber-300 truncate">
                              {s.nombre}
                            </p>
                            <p className="text-sm font-black text-white mt-0.5">
                              Gs. {(s.monto || 0).toLocaleString("es-PY")}
                            </p>
                          </div>
                          {!selectedDetalles.alojamientoComprobante && (
                            <button
                              type="button"
                              title="Quitar servicio"
                              className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => void eliminarServicioExtra(s.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Total servicios:{" "}
                      <strong className="text-amber-400">
                        Gs.{" "}
                        {(selectedDetalles.serviciosExtras || [])
                          .reduce((a, s) => a + (Number(s.monto) || 0), 0)
                          .toLocaleString("es-PY")}
                      </strong>
                    </p>
                  </div>
                )}
                {selectedDetalles.observaciones && (
                  <p className="text-xs text-slate-400 border-l-2 border-amber-500/40 pl-3">
                    {selectedDetalles.observaciones}
                  </p>
                )}
                {selectedDetalles.contactoEmergencia && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-2">
                    <Phone className="w-3 h-3" /> Emergencia: {selectedDetalles.contactoEmergencia}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end fontana-actions">
                <Button variant="outline" size="sm" className="rounded-xl border-white/10 min-h-10 touch-manipulation flex-1 sm:flex-none" onClick={() => openEdit(selected)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black min-h-10 touch-manipulation flex-1 sm:flex-none"
                  onClick={() => {
                    setNuevoServicio({ nombre: "", monto: 0 });
                    setServicioOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Crear servicio
                </Button>
                {(Number(selectedDetalles.garantia) || 0) > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                    onClick={() => abrirComprobanteGarantia(selected, selectedDetalles)}
                  >
                    <Receipt className="w-3.5 h-3.5 mr-1" />
                    {selectedDetalles.garantiaComprobante
                      ? "Reimprimir recibo garantía"
                      : "Recibo garantía"}
                  </Button>
                )}
                {(Number(selectedDetalles.monto) || 0) > 0 &&
                  selectedDetalles.alojamientoComprobante && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                    onClick={() => abrirComprobanteAlojamiento(selected, selectedDetalles, false)}
                  >
                    <Receipt className="w-3.5 h-3.5 mr-1" />
                    Reimprimir factura alojamiento
                  </Button>
                )}
                {(selected.estado === "Ocupada" ||
                  selectedDetalles.estadoInquilino === "Activo" ||
                  selectedDetalles.estadoInquilino === "Moroso" ||
                  !!reservaActiva) && (
                  <Button
                    size="sm"
                    disabled={desocupando}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black"
                    onClick={desocuparHabitacion}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    {desocupando ? "Liberando…" : "Desocupar"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-red-500/30 text-red-400"
                  onClick={() => handleDelete(selected.habitacionId)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                </Button>
              </div>
            </div>

            {/* Tabs ficha */}
            <div className="mobile-tabs-scroll mt-5 sm:mt-6 border-b border-white/5 pb-2 gap-1">
              {(
                [
                  ["reserva", "Reserva / cobros", Calendar],
                  ["pagos", "Historial pagos", History],
                  ["atrasados", "Pagos atrasados", AlertTriangle],
                  ["deudas", "Deudas pendientes", Wallet],
                  ["reclamos", "Reclamos / avisos", MessageSquare],
                  ["documentos", "Documentos / fotos", ImageIcon],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFichaTab(id)}
                  className={`px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors touch-manipulation min-h-10 ${
                    fichaTab === id ? "bg-amber-500/20 text-amber-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-[120px]">
              {fichaTab === "reserva" && (
                <div className="space-y-4">
                  {reservaActiva ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase text-amber-400/80">Estado reserva</p>
                        <p className="text-sm font-black text-amber-300 mt-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> {reservaActiva.estado}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase text-slate-500">Check-in → out</p>
                        <p className="text-xs font-bold text-white mt-1">
                          {formatFechaHoraCorta(reservaActiva.fechaCheckIn)} →{" "}
                          {formatFechaHoraCorta(reservaActiva.fechaCheckOut)}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase text-slate-500">Total reserva</p>
                        <p className="text-sm font-black text-white mt-1">
                          Gs. {(reservaActiva.montoTotalGs || 0).toLocaleString("es-PY")}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase text-slate-500">Pagado (reserva)</p>
                        <p className="text-sm font-black text-emerald-400 mt-1">
                          Gs. {(reservaActiva.montoPagadoGs || 0).toLocaleString("es-PY")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {selected.estado === "Disponible" || selectedDetalles.estadoInquilino === "Retirado"
                        ? "Sin reserva activa — habitación disponible."
                        : "No hay reserva activa vinculada. Editá y guardá con fechas de ingreso para generar una."}
                    </p>
                  )}

                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Monitoreo de cobros de esta ocupación
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className="text-slate-400">
                        Registrados:{" "}
                        <strong className="text-emerald-400">
                          Gs. {totalPagadoFicha.toLocaleString("es-PY")}
                        </strong>
                      </span>
                      <span className="text-slate-400">
                        Acordado:{" "}
                        <strong className="text-amber-400">
                          Gs. {(selectedDetalles.monto ?? 0).toLocaleString("es-PY")}
                        </strong>
                      </span>
                      <span className="text-slate-400">
                        Garantía:{" "}
                        <strong className="text-white">
                          Gs. {(selectedDetalles.garantia ?? 0).toLocaleString("es-PY")}
                        </strong>
                        {selectedDetalles.garantiaComprobante && (
                          <span className="ml-2 text-emerald-400">
                            ·{" "}
                            {selectedDetalles.garantiaComprobante.facturaEmitida
                              ? `Factura ${selectedDetalles.garantiaComprobante.numeroFactura || ""}`
                              : "Recibo emitido"}
                          </span>
                        )}
                      </span>
                      {(selectedDetalles.serviciosExtras || []).length > 0 && (
                        <span className="text-slate-400">
                          Servicios:{" "}
                          <strong className="text-amber-300">
                            Gs.{" "}
                            {(selectedDetalles.serviciosExtras || [])
                              .reduce((a, s) => a + (Number(s.monto) || 0), 0)
                              .toLocaleString("es-PY")}
                          </strong>
                        </span>
                      )}
                    </div>
                    {(selectedDetalles.pagos || []).length > 0 ? (
                      <ul className="space-y-1.5 mt-2">
                        {(selectedDetalles.pagos || []).slice(0, 8).map((p) => (
                          <li
                            key={p.id}
                            className="flex justify-between text-[11px] bg-black/20 rounded-lg px-2.5 py-1.5 text-slate-300"
                          >
                            <span>
                              {formatFechaCorta(p.fecha)} · {p.concepto}
                            </span>
                            <span
                              className={
                                p.estado === "Pagado" ? "text-emerald-400 font-bold" : "text-amber-300 font-bold"
                              }
                            >
                              Gs. {p.monto.toLocaleString("es-PY")} · {p.estado}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-500">Aún no hay pagos en el historial.</p>
                    )}
                  </div>

                  {(selected.estado === "Ocupada" || !!reservaActiva) && (
                    <p className="text-[10px] text-slate-500">
                      Al terminar la estadía usá <strong className="text-emerald-400">Desocupar</strong>: se
                      factura el alojamiento y los servicios extras (con IVA) y luego se libera la habitación.
                    </p>
                  )}
                </div>
              )}

              {fichaTab === "pagos" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Historial automático — garantía (recibo) y factura al desocupar
                  </p>
                  {(selectedDetalles.pagos || []).length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Sin pagos registrados. Al emitir el recibo de garantía o la factura al desocupar, aparecen acá.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {(selectedDetalles.pagos || []).map((p) => (
                        <li
                          key={p.id}
                          className="flex justify-between gap-3 text-xs bg-white/5 rounded-xl px-3 py-2.5 text-slate-300"
                        >
                          <span className="min-w-0">
                            {formatFechaCorta(p.fecha)} · {p.concepto}
                          </span>
                          <span
                            className={`shrink-0 font-black ${
                              p.estado === "Pagado" ? "text-emerald-400" : "text-amber-300"
                            }`}
                          >
                            Gs. {p.monto.toLocaleString("es-PY")}
                            {p.estado ? ` · ${p.estado}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {fichaTab === "atrasados" && (
                <div className="space-y-2">
                  {(selectedDetalles.pagos || []).filter((p) => p.estado === "Atrasado").length === 0 ? (
                    <p className="text-xs text-slate-500">No hay pagos atrasados marcados.</p>
                  ) : (
                    (selectedDetalles.pagos || [])
                      .filter((p) => p.estado === "Atrasado")
                      .map((p) => (
                        <div key={p.id} className="text-xs text-red-300 bg-red-500/10 rounded-xl px-3 py-2">
                          {formatFechaCorta(p.fecha)} · {p.concepto} · Gs. {p.monto.toLocaleString("es-PY")}
                        </div>
                      ))
                  )}
                </div>
              )}
              {fichaTab === "deudas" && (
                <div className="text-xs text-slate-400 space-y-2">
                  <p>
                    Estado:{" "}
                    <span className="text-white font-bold">{selectedDetalles.estadoInquilino || "—"}</span>
                  </p>
                  <p>
                    Monto acordado:{" "}
                    <span className="text-amber-400 font-black">
                      Gs. {(selectedDetalles.monto ?? 0).toLocaleString("es-PY")}
                    </span>
                  </p>
                  <p>
                    Pagado (historial):{" "}
                    <span className="text-emerald-400 font-black">
                      Gs.{" "}
                      {(selectedDetalles.pagos || [])
                        .filter((p) => p.estado === "Pagado")
                        .reduce((a, p) => a + p.monto, 0)
                        .toLocaleString("es-PY")}
                    </span>
                  </p>
                  {selectedDetalles.estadoInquilino === "Moroso" && (
                    <p className="text-red-400 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Marcado como moroso
                    </p>
                  )}
                </div>
              )}
              {fichaTab === "reclamos" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nuevo reclamo o aviso…"
                      value={nuevoReclamo}
                      onChange={(e) => setNuevoReclamo(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Button onClick={addReclamo} className="bg-amber-500 text-slate-950 font-bold rounded-xl shrink-0">
                      Guardar
                    </Button>
                  </div>
                  {(selectedDetalles.reclamos || []).length === 0 ? (
                    <p className="text-xs text-slate-500">Sin reclamos ni avisos.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(selectedDetalles.reclamos || []).map((r) => (
                        <li key={r.id} className="text-xs bg-white/5 rounded-xl px-3 py-2 text-slate-300">
                          <span className="text-slate-500">{formatFechaCorta(r.fecha)} · </span>
                          {r.texto}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {fichaTab === "documentos" && (
                <div className="text-xs text-slate-500 space-y-2">
                  <p className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Podés anotar referencias de documentos/fotos en observaciones o subirlos luego desde Documentos del
                    contrato.
                  </p>
                  {(selectedDetalles.documentos || []).length === 0 ? (
                    <p>Sin documentos vinculados aún.</p>
                  ) : (
                    (selectedDetalles.documentos || []).map((doc) => (
                      <div key={doc.id} className="bg-white/5 rounded-xl px-3 py-2 text-slate-300">
                        {doc.nombre} · {formatFechaCorta(doc.fecha)}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Calendario cronometrado (día + hora:minuto) */}
          <div className="bg-[#0C1327] border border-white/5 rounded-[1.5rem] overflow-hidden">
            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h4 className="font-black italic uppercase text-white flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-amber-400" />
                Calendario · {etiquetaPorHabitacionId.get(selected.habitacionId) || selected.nombre}
                <span className="text-[9px] font-bold text-slate-500 normal-case tracking-normal not-italic flex items-center gap-1 ml-1">
                  <Clock className="w-3 h-3" /> hora y minuto
                </span>
              </h4>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 w-fit">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300"
                  onClick={() => {
                    const d = new Date(calendarStart);
                    d.setDate(d.getDate() - 14);
                    setCalendarStart(d);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 text-[10px] font-bold text-slate-400 uppercase">
                  {calendarStart.toLocaleDateString("es-PY", { month: "long", year: "numeric" })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-300"
                  onClick={() => {
                    const d = new Date(calendarStart);
                    d.setDate(d.getDate() + 14);
                    setCalendarStart(d);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div
              className="overflow-x-auto mobile-scroll-x overscroll-x-contain"
              data-mobile-scroll="x"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="min-w-[640px] sm:min-w-[720px] p-3 space-y-4">
                <div className="grid grid-cols-[100px_repeat(28,minmax(28px,1fr))] gap-0.5 mb-1">
                  <div />
                  {timelineDays.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={`text-center text-[8px] font-bold uppercase py-1 ${
                        sameDay(day, calendarFocusDay) ? "text-amber-300" : "text-slate-500"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[100px_repeat(28,minmax(28px,1fr))] gap-0.5 items-stretch">
                  <div className="text-[9px] font-black uppercase text-slate-400 flex items-center pr-2">
                    Días
                  </div>
                  {timelineDays.map((day) => {
                    const hits = ocupacionesTimed.filter((o) => dayCovered(day, o.start, o.end));
                    const hit = hits[0];
                    const focused = sameDay(day, calendarFocusDay);
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        title={
                          hit
                            ? `${hit.label} · ${formatMinutos(hit.start.getHours() * 60 + hit.start.getMinutes())} → ${formatMinutos(hit.end.getHours() * 60 + hit.end.getMinutes())}`
                            : "Disponible — click para ver horas"
                        }
                        onClick={() => {
                          const d = new Date(day);
                          d.setHours(0, 0, 0, 0);
                          setCalendarFocusDay(d);
                        }}
                        className={`h-9 rounded-md border transition-all ${
                          hit
                            ? "bg-amber-500/40 border-amber-500/50 hover:bg-amber-500/55"
                            : "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-400/40"
                        } ${focused ? "ring-2 ring-amber-400/70 ring-offset-1 ring-offset-[#0C1327]" : ""}`}
                      />
                    );
                  })}
                </div>

                {/* Franja horaria del día seleccionado */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/90 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {calendarFocusDay.toLocaleDateString("es-PY", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">
                      Click un día arriba · escala 00:00 → 24:00
                    </p>
                  </div>

                  <div className="relative">
                    <div className="grid grid-cols-12 gap-0 mb-1">
                      {Array.from({ length: 12 }, (_, i) => i * 2).map((h) => (
                        <div
                          key={h}
                          className="text-[8px] font-bold text-slate-500 tabular-nums"
                        >
                          {String(h).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                    <div className="relative h-14 rounded-lg bg-emerald-500/10 border border-emerald-500/20 overflow-hidden">
                      {/* marcas cada hora */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {Array.from({ length: 24 }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 border-r border-white/5 last:border-r-0"
                          />
                        ))}
                      </div>
                      {bloquesHoraFocus.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase text-emerald-400/70">
                          Libre todo el día
                        </div>
                      ) : (
                        bloquesHoraFocus.map((b) => (
                          <div
                            key={b.id}
                            title={`${b.label}: ${b.fromLabel} → ${b.toLabel} (${b.estado})`}
                            className="absolute top-1.5 bottom-1.5 rounded-md bg-amber-500/80 border border-amber-300/50 shadow-lg shadow-amber-500/20 flex items-center px-2 overflow-hidden"
                            style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
                          >
                            <span className="text-[9px] font-black text-slate-950 truncate whitespace-nowrap">
                              {b.fromLabel} → {b.toLabel}
                              {b.widthPct > 12 ? ` · ${b.label}` : ""}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {bloquesHoraFocus.length > 0 && (
                    <ul className="space-y-1">
                      {bloquesHoraFocus.map((b) => (
                        <li
                          key={`det-${b.id}`}
                          className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-300 bg-white/5 rounded-lg px-2.5 py-1.5"
                        >
                          <span className="font-bold text-white">{b.label}</span>
                          <span className="text-amber-300 font-black tabular-nums">
                            {b.fromLabel} → {b.toLabel}
                            <span className="text-slate-500 font-bold ml-2">{b.estado}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-[9px] font-bold uppercase text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500/50" /> Reservado / ocupado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/20" /> Disponible
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400/80">
                    <Clock className="w-3 h-3" /> El bloque muestra desde / hasta en HH:mm
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Menú contextual */}
      {ctxMenu && (
        <div
          className="fixed z-[200] min-w-[200px] max-w-[min(280px,calc(100vw-1.25rem))] rounded-xl border border-white/10 bg-[#0B1222] shadow-2xl py-1 overflow-hidden touch-manipulation"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-4 py-3.5 text-xs font-bold text-slate-200 hover:bg-amber-500/20 active:bg-amber-500/25 flex items-center gap-2 min-h-11"
            onClick={openCreate}
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" /> Crear habitación
          </button>
          {ctxMenu.habitacionId != null && (
            <>
              <button
                type="button"
                className="w-full text-left px-4 py-3.5 text-xs font-bold text-slate-200 hover:bg-white/5 active:bg-white/10 flex items-center gap-2 min-h-11"
                onClick={() => {
                  const h = habitaciones.find((x) => x.habitacionId === ctxMenu.habitacionId);
                  if (h) openEdit(h);
                }}
              >
                <Pencil className="w-3.5 h-3.5" /> Actualizar habitación
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-3.5 text-xs font-bold text-red-400 hover:bg-red-500/10 active:bg-red-500/15 flex items-center gap-2 min-h-11"
                onClick={() => handleDelete(ctxMenu.habitacionId!)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar habitación
              </button>
            </>
          )}
        </div>
      )}

      {/* Modal crear / editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="fontana-dialog w-[calc(100%-0.75rem)] max-w-2xl max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem))] overflow-y-auto overscroll-contain bg-[#0C1327] border-white/10 text-white rounded-2xl p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter pr-8 text-sm sm:text-base">
              {editingId ? "Actualizar habitación" : "Crear habitación"} — Fontana
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <Field label="Nombre del lugar">
              <div className="flex gap-2 items-center">
                <select
                  value={
                    form.nombreLugar &&
                    (editingId || lugaresDisponiblesAlta.includes(form.nombreLugar) || lugares.includes(form.nombreLugar))
                      ? form.nombreLugar
                      : form.nombreLugar
                        ? "__custom__"
                        : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom__") return;
                    setForm((f) => {
                      if (editingId) return { ...f, nombreLugar: v };
                      const items = habitaciones.map((h) => ({
                        nombre: h.nombre,
                        nombreLugar: parseFontanaDetalles(h.detallesJson).nombreLugar,
                      }));
                      const num = nextNumeroHabitacionEnLugar(items, v);
                      return {
                        ...f,
                        nombreLugar: v,
                        nombreHabitacion: formatNombreHabitacionLugar(num, v),
                      };
                    });
                  }}
                  className="flex-1 h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm min-w-0"
                >
                  <option value="" className="bg-slate-900">
                    — Seleccionar lugar —
                  </option>
                  {(editingId
                    ? lugares
                    : lugaresDisponiblesAlta.length
                      ? lugaresDisponiblesAlta
                      : lugares
                  ).map((l) => {
                    const cfg = cupos[l] || { cupo: cupoDefaultParaLugar(l), habilitado: true };
                    const ocup = ocupadasPorLugar[l] || 0;
                    return (
                      <option key={l} value={l} className="bg-slate-900">
                        {l} ({ocup}/{cfg.cupo})
                      </option>
                    );
                  })}
                  {form.nombreLugar &&
                    !lugares.includes(form.nombreLugar) &&
                    !lugaresDisponiblesAlta.includes(form.nombreLugar) && (
                      <option value="__custom__" className="bg-slate-900">
                        {form.nombreLugar} (actual)
                      </option>
                    )}
                </select>
                <Button
                  type="button"
                  size="icon"
                  title="Crear nombre de lugar"
                  className="h-10 w-10 shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950"
                  onClick={() => {
                    setNuevoLugarNombre("");
                    setNuevoLugarOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {!editingId && lugaresDisponiblesAlta.length === 0 && (
                <p className="text-[10px] text-amber-400 mt-1">
                  Todos los lugares están en cupo. Gestioná cupos o desocupá una plaza.
                </p>
              )}
            </Field>
            <Field label="Nombre habitación (automático)">
              <Input
                value={form.nombreHabitacion}
                readOnly={!editingId}
                onChange={(e) => setForm((f) => ({ ...f, nombreHabitacion: e.target.value }))}
                placeholder="Fontana 1 - Habitación 1"
                className={`bg-white/5 border-white/10 ${!editingId ? "opacity-90 cursor-default" : ""}`}
                title={!editingId ? "Se asigna solo según el lugar (Fontana X - Habitación N)" : undefined}
              />
              {!editingId && (
                <p className="text-[9px] text-slate-500 mt-1">
                  Formato fijo: {form.nombreLugar || "lugar"} - Habitación N
                </p>
              )}
            </Field>
            <Field label="Capacidad (plazas / camas)">
              <Input
                type="number"
                min={1}
                value={form.cantidadHabitaciones || 1}
                onChange={(e) => setForm((f) => ({ ...f, cantidadHabitaciones: Number(e.target.value) }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Nº croquis">
              <Input
                type="number"
                min={1}
                max={11}
                value={form.numeroHabitacion || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    numeroHabitacion: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="1..11"
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Planta">
              <select
                value={form.planta || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    planta: (e.target.value || undefined) as FontanaDetalles["planta"],
                  }))
                }
                className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white"
              >
                <option value="">Sin planta</option>
                <option value="PB">Planta Baja (PB)</option>
                <option value="PA">Planta Alta (PA)</option>
              </select>
            </Field>
            <Field label="Modalidad mapa">
              <select
                value={form.modalidad || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    modalidad: (e.target.value || undefined) as FontanaDetalles["modalidad"],
                  }))
                }
                className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white"
              >
                <option value="">Según tipo alquiler</option>
                <option value="DIARIA">DIARIA</option>
                <option value="MENSUAL">MENSUAL</option>
              </select>
            </Field>
            <Field label="Plazas ocupadas">
              <Input
                type="number"
                min={0}
                max={Math.max(1, Number(form.cantidadHabitaciones) || 1)}
                value={form.plazasOcupadas ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    plazasOcupadas: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                placeholder="ej. 2 de 4"
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Precio acordado (Gs.)">
              <Input
                type="number"
                value={form.precioAcordado || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    precioAcordado: Number(e.target.value),
                    monto: Number(e.target.value),
                  }))
                }
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Nombre y apellido">
              <Input
                value={form.nombreApellido || ""}
                onChange={(e) => setForm((f) => ({ ...f, nombreApellido: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Número de cédula">
              <Input
                value={form.cedula || ""}
                onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={form.telefono || ""}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Contacto de emergencia">
              <Input
                value={form.contactoEmergencia || ""}
                onChange={(e) => setForm((f) => ({ ...f, contactoEmergencia: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Tipo de alquiler">
              <select
                value={form.tipoAlquiler}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipoAlquiler: e.target.value as TipoAlquilerFontana }))
                }
                className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
              >
                {TIPOS_ALQUILER.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dúplex Agus (solo libres — alquiler ocasional)">
              <select
                value={form.unidadDuplexId ?? ""}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const d = duplexUnidades.find((x) => x.unidadId === id);
                  setForm((f) => ({
                    ...f,
                    unidadDuplexId: id,
                    unidadCodigo: d?.codigoUnidad ?? null,
                    nombreCondominio: d?.nombreCondominio ?? null,
                    habitacionDuplexInterna: id ? f.habitacionDuplexInterna || "1" : null,
                    tipoAlquiler: id ? "Habitación" : f.tipoAlquiler,
                  }));
                }}
                className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
              >
                <option value="" className="bg-slate-900">
                  — Ninguno / solo lugar Fontana —
                </option>
                {duplexUnidades
                  .filter((d) => String(d.estado).toLowerCase() !== "ocupado")
                  .map((d) => {
                    const condo = d.nombreCondominio ? `${d.nombreCondominio} · ` : "";
                    return (
                      <option key={d.unidadId} value={d.unidadId} className="bg-slate-900">
                        {condo}
                        {formatDuplex(d.codigoUnidad)} (libre — 3 hab.)
                      </option>
                    );
                  })}
              </select>
              <p className="text-[9px] text-slate-500 mt-1">
                Solo dúplex sin inquilino de contrato. Cada dúplex: Hab 1 suite, Hab 2 frente suite, Hab 3 frente baño.
              </p>
            </Field>
            {!!form.unidadDuplexId && (
              <Field label="Habitación interna del dúplex">
                <select
                  value={form.habitacionDuplexInterna || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      habitacionDuplexInterna: (e.target.value || null) as "1" | "2" | "3" | null,
                      nombreHabitacion:
                        f.nombreHabitacion ||
                        HABITACIONES_DUPLEX_AGUS.find((h) => h.id === e.target.value)?.label ||
                        f.nombreHabitacion,
                    }))
                  }
                  className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
                >
                  <option value="" className="bg-slate-900">
                    — Elegir —
                  </option>
                  {HABITACIONES_DUPLEX_AGUS.map((h) => (
                    <option key={h.id} value={h.id} className="bg-slate-900">
                      {h.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Fecha de ingreso">
              <Input
                type="date"
                value={form.fechaIngreso || ""}
                onChange={(e) => setForm((f) => ({ ...f, fechaIngreso: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Hora de ingreso">
              <Input
                type="time"
                value={form.horaIngreso || "14:00"}
                onChange={(e) => setForm((f) => ({ ...f, horaIngreso: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Fecha de salida (si corresponde)">
              <Input
                type="date"
                value={form.fechaSalida || ""}
                onChange={(e) => setForm((f) => ({ ...f, fechaSalida: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Hora de salida">
              <Input
                type="time"
                value={form.horaSalida || "12:00"}
                onChange={(e) => setForm((f) => ({ ...f, horaSalida: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Monto mensual o diario (Gs.)">
              <Input
                type="number"
                value={form.monto || ""}
                onChange={(e) => setForm((f) => ({ ...f, monto: Number(e.target.value) }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Garantía pagada (Gs.)">
              <Input
                type="number"
                value={form.garantia || ""}
                onChange={(e) => setForm((f) => ({ ...f, garantia: Number(e.target.value) }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.estadoInquilino}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estadoInquilino: e.target.value as EstadoInquilinoFontana }))
                }
                className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-sm"
              >
                {ESTADOS_INQ.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Observaciones">
                <textarea
                  value={form.observaciones || ""}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4 sticky bottom-0 bg-[#0C1327] pt-3 pb-1 z-10">
            <Button variant="outline" className="border-white/10 w-full sm:w-auto min-h-11 touch-manipulation" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={saving}
              onClick={guardarHabitacion}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black w-full sm:w-auto min-h-11 touch-manipulation"
            >
              {saving ? "Guardando…" : editingId ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crear nombre de lugar */}
      <Dialog open={nuevoLugarOpen} onOpenChange={setNuevoLugarOpen}>
        <DialogContent className="fontana-dialog max-w-sm w-[calc(100%-0.75rem)] bg-[#0C1327] border-white/10 text-white rounded-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-sm">
              Nuevo lugar Fontana
            </DialogTitle>
          </DialogHeader>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">
            Ej. Fontana 1, Quinta, Ña Carmen…
          </p>
          <Input
            autoFocus
            placeholder="Nombre del lugar"
            value={nuevoLugarNombre}
            onChange={(e) => setNuevoLugarNombre(e.target.value)}
            className="bg-white/5 border-white/10 mt-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const nombre = nuevoLugarNombre.trim();
                if (!nombre) return;
                const next = addFontanaLugar(empresaId, nombre);
                setLugares(next);
                setForm((f) => ({ ...f, nombreLugar: nombre }));
                setNuevoLugarOpen(false);
                toast.success(`Lugar «${nombre}» creado`);
              }
            }}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" className="border-white/10" onClick={() => setNuevoLugarOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-500 text-slate-950 font-black"
              onClick={() => {
                const nombre = nuevoLugarNombre.trim();
                if (!nombre) {
                  toast.error("Escribí el nombre del lugar");
                  return;
                }
                const next = addFontanaLugar(empresaId, nombre);
                setLugares(next);
                setForm((f) => ({ ...f, nombreLugar: nombre }));
                setNuevoLugarOpen(false);
                toast.success(`Lugar «${nombre}» creado`);
              }}
            >
              Crear lugar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crear servicio extra */}
      <Dialog open={servicioOpen} onOpenChange={setServicioOpen}>
        <DialogContent className="fontana-dialog max-w-sm w-[calc(100%-0.75rem)] bg-[#0C1327] border-white/10 text-white rounded-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-sm">
              + Crear servicio
            </DialogTitle>
          </DialogHeader>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">
            Se mostrará debajo de garantía y se incluirá en la factura al desocupar.
          </p>
          <div className="space-y-3 mt-2">
            <Field label="Servicio">
              <Input
                autoFocus
                placeholder="Ej. Lavandería, Minibar, Limpieza…"
                value={nuevoServicio.nombre}
                onChange={(e) => setNuevoServicio((s) => ({ ...s, nombre: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Monto (Gs.)">
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={nuevoServicio.monto || ""}
                onChange={(e) =>
                  setNuevoServicio((s) => ({ ...s, monto: Number(e.target.value) || 0 }))
                }
                className="bg-white/5 border-white/10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void agregarServicioExtra();
                  }
                }}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" className="border-white/10" onClick={() => setServicioOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
              onClick={() => void agregarServicioExtra()}
            >
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gestionar cupos por lugar */}
      <Dialog open={cuposOpen} onOpenChange={setCuposOpen}>
        <DialogContent className="fontana-dialog max-w-lg w-[calc(100%-0.75rem)] max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem))] overflow-y-auto overscroll-contain bg-[#0C1327] border-white/10 text-white rounded-2xl p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-sm">
              Habilitar / deshabilitar cupos Fontana
            </DialogTitle>
          </DialogHeader>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">
            Fontana 1: 16 · Fontana 2: 22 · Fontana 3: 16 · Quinta / Quincho / Ña Carmen: 1 (ampliable). No se puede bajar el cupo bajo habitaciones ya cargadas.
          </p>
          <div className="space-y-2 mt-3">
            {lugares.map((l) => {
              const cfg = cupos[l] || { cupo: cupoDefaultParaLugar(l), habilitado: true };
              const ocup = ocupadasPorLugar[l] || 0;
              return (
                <div
                  key={l}
                  className="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase text-white">{l}</p>
                    <p className="text-[10px] text-slate-500">
                      Ocupadas: {ocup} · Cupo: {cfg.cupo}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-300">
                    <input
                      type="checkbox"
                      checked={cfg.habilitado}
                      onChange={(e) => {
                        const next = {
                          ...cupos,
                          [l]: { ...cfg, habilitado: e.target.checked },
                        };
                        setCupos(next);
                        saveFontanaCupos(empresaId, next);
                      }}
                    />
                    Hab.
                  </label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-white/10"
                      disabled={cfg.cupo <= ocup}
                      title={
                        cfg.cupo <= ocup
                          ? "No se puede disminuir: hay plazas ocupadas"
                          : "Disminuir cupo"
                      }
                      onClick={() => {
                        if (cfg.cupo <= ocup) {
                          toast.error("No se puede disminuir el cupo mientras haya habitaciones ocupadas");
                          return;
                        }
                        const next = {
                          ...cupos,
                          [l]: { ...cfg, cupo: Math.max(ocup, cfg.cupo - 1) },
                        };
                        setCupos(next);
                        saveFontanaCupos(empresaId, next);
                      }}
                    >
                      −
                    </Button>
                    <span className="w-8 text-center font-black text-amber-300">{cfg.cupo}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-white/10"
                      onClick={() => {
                        const next = {
                          ...cupos,
                          [l]: { ...cfg, cupo: cfg.cupo + 1, habilitado: true },
                        };
                        setCupos(next);
                        saveFontanaCupos(empresaId, next);
                      }}
                    >
                      +
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end mt-4">
            <Button className="bg-amber-500 text-slate-950 font-black" onClick={() => setCuposOpen(false)}>
              Listo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ComprobantePreviewModal
        isOpen={comprobanteOpen}
        onClose={() => {
          const habiaPendiente = pendingDesocuparAfterFactura;
          setComprobanteOpen(false);
          setComprobantePagoData(null);
          setComprobanteHabitacionId(null);
          setComprobanteKind(null);
          setPendingDesocuparAfterFactura(false);
          if (habiaPendiente) {
            toast.message("Desocupación cancelada", {
              description: "Emití la factura de alojamiento para completar la desocupación.",
            });
          }
        }}
        pagoData={comprobantePagoData}
        onSaved={async (payload) => {
          if (!comprobanteHabitacionId || !payload) return;
          const h = habitaciones.find((x) => x.habitacionId === comprobanteHabitacionId);
          const base = h
            ? parseFontanaDetalles(h.detallesJson)
            : selectedId === comprobanteHabitacionId
              ? selectedDetalles
              : {};
          const kind = comprobanteKind;
          const debeDesocupar = pendingDesocuparAfterFactura && kind === "alojamiento";

          let next: FontanaDetalles = { ...base };
          if (kind === "garantia") {
            next = {
              ...next,
              garantiaComprobante: {
                facturaEmitida: payload.facturaEmitida,
                numeroFactura: payload.numeroFactura,
                descripcion: payload.descripcion,
                fecha: new Date().toISOString(),
                metadata: payload.metadata,
              },
            };
            const tieneGarantiaPago = (next.pagos || []).some((p) =>
              /garant/i.test(p.concepto || "")
            );
            if (!tieneGarantiaPago && (Number(next.garantia) || 0) > 0) {
              next.pagos = [
                ...(next.pagos || []),
                {
                  id: crypto.randomUUID(),
                  fecha: new Date().toISOString().slice(0, 10),
                  concepto: "Garantía (recibo sin IVA)",
                  monto: Number(next.garantia),
                  estado: "Pagado",
                },
              ];
            }
          } else if (kind === "alojamiento") {
            const montoAloj = Number(next.monto) || Number(next.precioAcordado) || 0;
            const servicios = (next.serviciosExtras || []).filter((s) => (Number(s.monto) || 0) > 0);
            const totalServicios = servicios.reduce((a, s) => a + (Number(s.monto) || 0), 0);
            const montoFactura =
              Number(comprobantePagoData?.montoPagado) || montoAloj + totalServicios;
            const nro = (payload.numeroFactura || "").trim();
            next = {
              ...next,
              alojamientoComprobante: {
                facturaEmitida: true,
                numeroFactura: payload.numeroFactura,
                descripcion: payload.descripcion,
                fecha: new Date().toISOString(),
                monto: montoFactura,
                metadata: payload.metadata,
              },
            };
            // Evitar duplicar líneas si se reimprime/guarda de nuevo
            const yaEnHistorial = (next.pagos || []).some(
              (p) =>
                /factura\s*c\/?\s*IVA/i.test(p.concepto || "") &&
                (!nro || (p.concepto || "").includes(nro))
            );
            if (!yaEnHistorial) {
              const fechaPago = new Date().toISOString().slice(0, 10);
              next.pagos = [
                ...(next.pagos || []),
                ...(montoAloj > 0
                  ? [
                      {
                        id: crypto.randomUUID(),
                        fecha: fechaPago,
                        concepto: `Servicio de alojamiento (factura c/IVA)${nro ? ` ${nro}` : ""}`,
                        monto: montoAloj,
                        estado: "Pagado" as const,
                      },
                    ]
                  : []),
                ...servicios.map((s) => ({
                  id: crypto.randomUUID(),
                  fecha: fechaPago,
                  concepto: `${s.nombre} (factura c/IVA)${nro ? ` ${nro}` : ""}`,
                  monto: Number(s.monto) || 0,
                  estado: "Pagado" as const,
                })),
              ];
            }
          }

          const res = await fetch(`${API_BASE}/api/Habitaciones/${comprobanteHabitacionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(h || selected),
              habitacionId: comprobanteHabitacionId,
              detallesJson: stringifyFontanaDetalles(next),
            }),
          });
          if (res.ok) await cargar();

          // Automatización: factura alojamiento → ingreso Finanzas
          if (res.ok && kind === "alojamiento") {
            const propFin = resolveFontanaPropiedadPlano(next.nombreLugar);
            const montoFactura =
              Number(comprobantePagoData?.montoPagado) ||
              (Number(next.monto) || Number(next.precioAcordado) || 0) +
                (next.serviciosExtras || []).reduce((a, s) => a + (Number(s.monto) || 0), 0);
            if (propFin && montoFactura > 0) {
              const cat = String(next.tipoAlquiler || "")
                .toLowerCase()
                .includes("mensual")
                ? "Mensualidades"
                : "Hospedaje diario";
              addFontanaMovimiento(empresaId, {
                tipo: "ingreso",
                propiedad: propFin,
                categoria: cat,
                concepto: `Alojamiento · ${(h || selected)?.nombre || next.nombreLugar}`,
                monto: montoFactura,
                fecha: new Date().toISOString().slice(0, 10),
                metodoPago: "Efectivo",
                origen: `alojamiento:hab:${comprobanteHabitacionId}`,
              })
                .then(() => setFinanzasTick((t) => t + 1))
                .catch(() => {
                  /* ignore */
                });
            }
          }

          setPendingDesocuparAfterFactura(false);
          setComprobanteKind(null);
          setFichaTab("pagos");
          if (debeDesocupar) {
            // Pasar `next` para no pisar el historial recién guardado
            await ejecutarDesocupar(next);
          }
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default FontanaPage;
