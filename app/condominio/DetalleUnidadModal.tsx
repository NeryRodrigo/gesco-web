"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ContratoImprimible, descargarContratoDoc, descargarContratoPDF, resolveCodeudor } from "./ContratoImprimible";
import { PagareImprimible } from "./PagareImprimible";
import {
  ExpedienteUnidadImprimible,
  type ExpedienteUnidadPrintData,
  type ExpedienteSeccionesPrint,
} from "./ExpedienteUnidadImprimible";
import {
  HistorialPagosImprimible,
  type HistorialPagosPrintData,
} from "./HistorialPagosImprimible";
import { ConfirmActionModal, ConfirmActionModalProps } from "@/components/ui/confirm-action-modal";
import { verificarPermisoGranular, ModalAccesoRestringido } from "@/app/login/PermisosGranularesMatriz";
import { formatFechaCorta, formatConceptoCobro, formatConceptoPeriodo, formatUnidadComprobante, toApiDateTime } from "@/lib/utils";
import { sharePdfViaWhatsApp, prepareWhatsAppShareWindow } from "@/lib/whatsappShare";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, 
  Home, 
  DollarSign, 
  AlertCircle, 
  AlertTriangle,
  ExternalLink,
  FileText, 
  Calendar, 
  Users, 
  Printer, 
  Download,
  Info,
  Car,
  Pencil,
  Save,
  Zap,
  Droplets,
  Trash2,
  X,
  Plus,
  UploadCloud,
  Receipt,
  History,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Phone,
  Eye,
  CheckSquare,
  Square
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import { avisarCampoFaltante, campoFicha, campoPorId } from "./validacionProceso";
import { Button } from "@/components/ui/button";
import { ComprobantePreviewModal } from "./ComprobantePreviewModal";
import { GenerarEditarContratoModal } from "./GenerarEditarContratoModal";
import { VistaPreviaDocumentosModal, type DatosPlantillaPreview } from "./VistaPreviaDocumentosModal";
import { API_BASE } from "@/lib/api";

interface Unidad {
  id: number;
  code: string;
  condo: string;
  tenant: string | null;
  status: string;
  nisAnde?: string | null;
  medidorAgua?: string | null;
  observaciones?: string | null;
}

interface GastoServicio {
  gastoId: number;
  unidadId: number;
  tipoServicio: string;
  identificadorServicio?: string | null;
  nroComprobante?: string | null;
  mesReferencia?: number | null;
  anioReferencia?: number | null;
  metodoPago?: string | null;
  monto: number;
  fecha: string;
  proveedor?: string | null;
}

type ServicioTipoCard = "Luz" | "Agua" | "Basura";

interface Persona {
  [key: string]: string | number | undefined | null;
  personaId: number;
  razonSocial: string;
  documento: string;
  telefono: string;
  email: string;
}

interface Pago {
  pagoId?: number;
  contratoId: number;
  tipoPago: string;
  mesPagado: number;
  anioPagado: number;
  fechaPago: string;
  montoPagado: number;
  metodoPago: string;
  saldoPendiente: number;
  mora: number;
  facturaEmitida: boolean;
  numeroFactura?: string;
  notas?: string;
  nroComprobante?: string;
  banco?: string;
}

interface Installment {
  mes: number;
  anio: number;
  mesNombre: string;
  monto: number;
  pagado: number;
  estado: string;
  fechaVencimiento: Date;
  pago?: any;
}

/** Cobro (PagosRecibo / facturación), gasto de unidad o factura consultada en ANDE. */
interface FilaServicioMantenimiento {
  id: string;
  fechaMs: number;
  fechaLabel: string;
  periodoLabel: string;
  monto: number;
  origen: "cobro" | "gasto" | "ande";
  estadoAnde?: string;
  gasto?: GastoServicio;
  pago?: Pago;
}

interface AndeFacturaItemUi {
  monto: number;
  estado: string;
  emision: string;
  vencimiento: string;
  consumoKw?: number | null;
}

interface AndeConsultaUi {
  nis: string;
  titular: string;
  saldoDeuda: number;
  estadoPago: string;
  fechaConsulta: string;
  observaciones: string;
  facturas: AndeFacturaItemUi[];
}

interface Contrato {
  [key: string]: string | number | boolean | Persona | Pago[] | undefined | null;
  contratoId: number;
  inquilinoId: number;
  inquilino: Persona;
  fechaIngreso: string;
  fechaInicioContrato: string;
  fechaFinContrato: string;
  montoMensualAlquiler: number;
  depositoGarantia: number;
  cantidadOcupantes: number;
  vehiculoInfo: string;
  observaciones: string;
  serviciosIncluidos?: string; // Viene como string separado por comas o JSON string
  pagos: Pago[];
  estaActivo?: boolean;
}

/** Marca en notas del pago: al anular desalojo se borran estos cobros y vuelven las cuotas al historial. */
const MARCA_COBRO_RESTANTE_DESALOJO = "[DESALOJO_COBRO_RESTANTE]";

function normalizeContratoApi(raw: any): Contrato | null {
  if (!raw || typeof raw !== "object") return null;
  const contratoId = Number(raw.contratoId ?? raw.ContratoId ?? 0);
  if (!Number.isFinite(contratoId) || contratoId <= 0) return null;
  const inquilinoRaw = raw.inquilino ?? raw.Inquilino ?? {};
  const pagosRaw = raw.pagos ?? raw.Pagos ?? [];
  return {
    ...raw,
    contratoId,
    inquilinoId: Number(raw.inquilinoId ?? raw.InquilinoId ?? inquilinoRaw?.personaId ?? inquilinoRaw?.PersonaId ?? 0),
    unidadId: Number(raw.unidadId ?? raw.UnidadId ?? 0),
    fechaIngreso: raw.fechaIngreso ?? raw.FechaIngreso ?? "",
    fechaInicioContrato: raw.fechaInicioContrato ?? raw.FechaInicioContrato ?? "",
    fechaFinContrato: raw.fechaFinContrato ?? raw.FechaFinContrato ?? "",
    montoMensualAlquiler: Number(raw.montoMensualAlquiler ?? raw.MontoMensualAlquiler ?? 0),
    depositoGarantia: Number(raw.depositoGarantia ?? raw.DepositoGarantia ?? 0),
    cantidadOcupantes: Number(raw.cantidadOcupantes ?? raw.CantidadOcupantes ?? 1),
    vehiculoInfo: raw.vehiculoInfo ?? raw.VehiculoInfo ?? "",
    observaciones: raw.observaciones ?? raw.Observaciones ?? "",
    serviciosIncluidos: raw.serviciosIncluidos ?? raw.ServiciosIncluidos ?? "",
    estaActivo: raw.estaActivo ?? raw.EstaActivo,
    pagos: Array.isArray(pagosRaw)
      ? pagosRaw.map((p: any) => ({
          ...p,
          pagoId: p.pagoId ?? p.PagoId,
          contratoId: p.contratoId ?? p.ContratoId ?? contratoId,
          tipoPago: p.tipoPago ?? p.TipoPago,
          mesPagado: Number(p.mesPagado ?? p.MesPagado ?? 0),
          anioPagado: Number(p.anioPagado ?? p.AnioPagado ?? 0),
          fechaPago: p.fechaPago ?? p.FechaPago,
          montoPagado: Number(p.montoPagado ?? p.MontoPagado ?? 0),
          metodoPago: p.metodoPago ?? p.MetodoPago,
          notas: p.notas ?? p.Notas,
        }))
      : [],
    inquilino: {
      ...inquilinoRaw,
      personaId: Number(inquilinoRaw.personaId ?? inquilinoRaw.PersonaId ?? 0),
      razonSocial: inquilinoRaw.razonSocial ?? inquilinoRaw.RazonSocial ?? "",
      documento: inquilinoRaw.documento ?? inquilinoRaw.Documento ?? "",
      telefono: inquilinoRaw.telefono ?? inquilinoRaw.Telefono ?? "",
      email: inquilinoRaw.email ?? inquilinoRaw.Email ?? "",
      empresaId: inquilinoRaw.empresaId ?? inquilinoRaw.EmpresaId,
    },
  } as Contrato;
}

type DetalleUnidadTab = "ficha" | "pagos" | "gastos" | "documentos" | "historico" | "comprobantes";

interface DetalleUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidad: Unidad | null;
  onUpdate?: (patch?: Partial<Unidad>) => void;
  /** Tab inicial al abrir (ej. "pagos" = Historial de pagos). */
  initialTab?: DetalleUnidadTab;
  empresaId?: number;
  usuario?: { id?: number; nombre?: string } | null;
  /** Borrador de ficha incompleta a restaurar al abrir. */
  initialDraft?: { modo?: string; payloadJson: string } | null;
  /** Avisa al Dashboard para refrescar el listado de fichas incompletas. */
  onDraftsChanged?: () => void;
}

const normalizeNisValue = (raw?: string | null): string => {
  if (raw == null) return "";
  let s = String(raw).trim();
  while (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  // Evita guardar basura tipo undefined/null literales
  if (!s || s === "N/A" || s === "SIN NIS" || s === "null" || s === "undefined") return "";
  return s;
};

interface EditItem {
    label: string;
    value: string | number | null;
    key: string;
    parent?: string;
    type?: string;
    highlight?: string;
    icon?: React.ElementType;
}

const formatCodigoFicha = (codigo?: string) => {
  if (!codigo) return "";
  return codigo.replace(/\b(?:Dúplex|Duplex|D)\s*-?\s*(\d+)\b/gi, (_, num) => {
    const n = parseInt(num, 10);
    return `DUPLEX-${n < 10 ? "0" + n : n}`;
  });
};

export function DetalleUnidadModal({
  isOpen,
  onClose,
  unidad,
  onUpdate,
  initialTab = "ficha",
  empresaId: empresaIdProp,
  usuario,
  initialDraft,
  onDraftsChanged,
}: DetalleUnidadModalProps) {
  const [activeTab, setActiveTab] = useState<DetalleUnidadTab>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [showRenewedPreviewModal, setShowRenewedPreviewModal] = useState(false);
  const [historicoContratos, setHistoricoContratos] = useState<any[]>([]);
  const [isContratando, setIsContratando] = useState(false);
  const [isPrintingPagare, setIsPrintingPagare] = useState(false);
  const [isPrintingExpediente, setIsPrintingExpediente] = useState(false);
  const [expedientePrintData, setExpedientePrintData] = useState<ExpedienteUnidadPrintData | null>(null);
  const [showExpedienteSeccionesModal, setShowExpedienteSeccionesModal] = useState(false);
  const [expedienteSecciones, setExpedienteSecciones] = useState<ExpedienteSeccionesPrint>({
    historialPagos: true,
    mantenimiento: false,
    comprobantes: true,
  });
  const [isPreparingExpediente, setIsPreparingExpediente] = useState(false);
  const [isPrintingHistorial, setIsPrintingHistorial] = useState(false);
  const [historialPrintData, setHistorialPrintData] = useState<HistorialPagosPrintData | null>(null);
  const [isGenerarContratoModalOpen, setIsGenerarContratoModalOpen] = useState(false);
  const [localNisAnde, setLocalNisAnde] = useState("");
  const [localCodigoUnidad, setLocalCodigoUnidad] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filesUploaded, setFilesUploaded] = useState<Record<string, boolean>>({});
  const [alertaRestriccion, setAlertaRestriccion] = useState<{
    visible: boolean;
    mensaje?: string;
    permisoNombre?: string;
  }>({ visible: false });
  
  // Estado para Generación de Documentos Word (Plantillas)
  const [plantillasList, setPlantillasList] = useState<any[]>([]);
  const [selectedPlantillaIds, setSelectedPlantillaIds] = useState<number[]>([]);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isVistaPreviaDocsOpen, setIsVistaPreviaDocsOpen] = useState(false);

  const [isPreviewComprobanteOpen, setIsPreviewComprobanteOpen] = useState(false);
  const [comprobantePagoData, setComprobantePagoData] = useState<any>(null);

  const [isPrintingContract, setIsPrintingContract] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<Omit<ConfirmActionModalProps, "isOpen" | "onClose"> | null>(null);
  const [isConfirmActionLoading, setIsConfirmActionLoading] = useState(false);

  const handlePrintContract = () => {
    setIsPrintingContract(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingContract(false);
      }, 500);
    }, 150);
  };

  const handlePrintPagare = () => {
    setIsPrintingPagare(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingPagare(false);
      }, 500);
    }, 150);
  };

  React.useEffect(() => {
    // Plantillas solo en Documentos (no en cada apertura de ficha)
    if (!isOpen || activeTab !== "documentos") return;
    if (plantillasList.length > 0) return;
    fetch(`${API_BASE}/api/Plantillas`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setPlantillasList(list);
        setSelectedPlantillaIds(list.map((p: any) => Number(p.plantillaId)).filter(Boolean));
      })
      .catch(() => {});
  }, [isOpen, activeTab, plantillasList.length]);

  const openedUnidadRef = useRef<number | null>(null);
  const FICHA_SAVE_BTN_ID = "ficha-btn-guardar-cambios";
  const [showSaveOnCloseConfirm, setShowSaveOnCloseConfirm] = useState(false);
  const [savingIncompleteOnClose, setSavingIncompleteOnClose] = useState(false);
  const closingConfirmRef = useRef(false);
  const draftAppliedRef = useRef<number | null>(null);

  const resolveEmpresaId = () =>
    Number(empresaIdProp || contractData?.inquilino?.empresaId || 7);

  const isFichaCompleta = (data: Contrato | null | undefined) => {
    if (!data) return false;
    const nombre = String(data.inquilino?.razonSocial || "").trim();
    const doc = String(data.inquilino?.documento || "").trim();
    const inicio = data.fechaInicioContrato;
    const fin = data.fechaFinContrato;
    const monto = Number(data.montoMensualAlquiler || 0);
    return Boolean(nombre && doc && inicio && fin && monto > 0);
  };

  const buildDraftPayload = () => ({
    contractData,
    localNisAnde,
    localCodigoUnidad,
    modo: isContratando ? "contratar" : isRenewing ? "renovar" : "edit",
  });

  const upsertFichaIncompleta = async () => {
    if (!unidad?.id) return false;
    const payload = buildDraftPayload();
    const nombre =
      String(contractData?.inquilino?.razonSocial || unidad.tenant || "").trim() || "Sin nombre";
    try {
      const res = await fetch(`${API_BASE}/api/FichasIncompletas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: resolveEmpresaId(),
          unidadId: unidad.id,
          codigoUnidad: localCodigoUnidad || unidad.code || "",
          nombreCondominio: unidad.condo || "",
          nombreInquilino: nombre,
          modo: payload.modo,
          payloadJson: JSON.stringify(payload),
          usuarioId: usuario?.id ?? null,
          usuarioNombre: usuario?.nombre ?? null,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        toast.error("No se pudo guardar la ficha incompleta", {
          description: t?.slice(0, 180) || `Error ${res.status}`,
        });
        return false;
      }
      onDraftsChanged?.();
      return true;
    } catch {
      toast.error("Error de red al guardar ficha incompleta");
      return false;
    }
  };

  const clearFichaIncompleta = async () => {
    if (!unidad?.id) return;
    try {
      await fetch(
        `${API_BASE}/api/FichasIncompletas/unidad/${unidad.id}?empresaId=${resolveEmpresaId()}`,
        { method: "DELETE" }
      );
      onDraftsChanged?.();
    } catch {
      /* ignore */
    }
  };

  const applyDraftPayload = (raw: string, modo?: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.contractData) setContractData(parsed.contractData);
      if (parsed?.localNisAnde != null) setLocalNisAnde(normalizeNisValue(parsed.localNisAnde));
      if (parsed?.localCodigoUnidad) setLocalCodigoUnidad(String(parsed.localCodigoUnidad));
      const m = String(modo || parsed?.modo || "edit").toLowerCase();
      setIsEditing(m === "edit" || m === "renovar");
      setIsContratando(m === "contratar");
      setIsRenewing(m === "renovar");
      setActiveTab("ficha");
      toast.info("Ficha incompleta restaurada", {
        description: "Completá los datos y tocá Guardar cambios.",
      });
    } catch {
      toast.error("No se pudo restaurar el borrador de la ficha");
    }
  };

  const discardEditingAndClose = () => {
    setIsEditing(false);
    setIsContratando(false);
    setIsRenewing(false);
    closingConfirmRef.current = false;
    setShowSaveOnCloseConfirm(false);
    setSavingIncompleteOnClose(false);
    onClose();
  };

  const requestCloseFicha = () => {
    if (showSaveOnCloseConfirm || savingIncompleteOnClose) return;
    const hasPending = isEditing || isContratando || isRenewing;
    if (!hasPending) {
      discardEditingAndClose();
      return;
    }
    // Modal propio (no toast): el Dialog de la ficha bloquea clics del Sonner
    setShowSaveOnCloseConfirm(true);
  };

  const handleConfirmSaveIncomplete = async () => {
    if (savingIncompleteOnClose) return;
    setSavingIncompleteOnClose(true);
    try {
      const ok = await upsertFichaIncompleta();
      if (ok) {
        toast.success("Ficha incompleta guardada", {
          description: "La vas a ver en el listado del Dashboard.",
        });
        discardEditingAndClose();
      }
    } finally {
      setSavingIncompleteOnClose(false);
    }
  };

  const handleDiscardAndClose = () => {
    toast.message("Cambios descartados");
    discardEditingAndClose();
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) requestCloseFicha();
  };

  const focusSaveChangesButton = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(FICHA_SAVE_BTN_ID) as HTMLButtonElement | null;
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        el.focus({ preventScroll: true });
        // Pulso visual para que el usuario vea dónde guardar
        el.classList.add("ring-2", "ring-emerald-400", "ring-offset-2");
        setTimeout(() => el.classList.remove("ring-2", "ring-emerald-400", "ring-offset-2"), 1800);
      }, 100);
    });
  };

  const convertirNumeroALetras = (num: number): string => {
      const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
      const decenas = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
      const decenas2 = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
      const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

      const leerCentenas = (n: number):string => {
          if (n === 100) return "CIEN";
          if (n < 10) return unidades[n];
          if (n < 20) return decenas[n - 10];
          if (n < 100) {
              let d = Math.floor(n / 10);
              let u = n % 10;
              return decenas2[d] + (u > 0 ? " Y " + unidades[u] : "");
          }
          let c = Math.floor(n / 100);
          let resto = n % 100;
          return centenas[c] + (resto > 0 ? " " + leerCentenas(resto) : "");
      };

      const leerMiles = (n: number):string => {
          let mil = Math.floor(n / 1000);
          let resto = n % 1000;
          let str = "";
          if (mil === 1) str = "MIL";
          else if (mil > 1) str = leerCentenas(mil) + " MIL";
          return str + (resto > 0 ? " " + leerCentenas(resto) : "");
      };

      const leerMillones = (n: number):string => {
          let millon = Math.floor(n / 1000000);
          let resto = n % 1000000;
          let str = "";
          if (millon === 1) str = "UN MILLÓN";
          else if (millon > 1) str = leerCentenas(millon) + " MILLONES";
          return str + (resto > 0 ? " " + leerMiles(resto) : "");
      };

      if (num === 0) return "CERO";
      if (num < 1000) return leerCentenas(num);
      if (num < 1000000) return leerMiles(num);
      return leerMillones(num);
  };

  const buildDatosPlantillaPreview = (): DatosPlantillaPreview | null => {
      if (!contractData?.contratoId) return null;

      const montoAlquiler = Number(contractData?.montoMensualAlquiler || 0);
      const montoGarantia = Number(contractData?.depositoGarantia || 0);
      const montoLetras = convertirNumeroALetras(montoGarantia);
      const hoy = new Date();

      const codigoOriginal = unidad?.code || "";
      const matchDigitos = codigoOriginal.match(/\d+/);
      const soloDigito = matchDigitos ? matchDigitos[0] : codigoOriginal;

      const fmtGs = (n: number) =>
          n > 0 ? new Intl.NumberFormat("es-PY").format(n) : "";

      const fechaInicio = contractData?.fechaInicioContrato
          ? formatFechaCorta(contractData.fechaInicioContrato)
          : "";
      const fechaFin = contractData?.fechaFinContrato
          ? formatFechaCorta(contractData.fechaFinContrato)
          : "";

      let duracionMeses = "";
      if (contractData?.fechaInicioContrato && contractData?.fechaFinContrato) {
          const ini = new Date(contractData.fechaInicioContrato);
          const fin = new Date(contractData.fechaFinContrato);
          if (!Number.isNaN(ini.getTime()) && !Number.isNaN(fin.getTime())) {
              const meses =
                  (fin.getFullYear() - ini.getFullYear()) * 12 +
                  (fin.getMonth() - ini.getMonth());
              duracionMeses = String(meses > 0 ? meses : 12);
          }
      }

      const codeudor = resolveCodeudor(contractData);
      return {
          FechaFirma: hoy.toLocaleDateString("es-PY"),
          DiaEntrega: hoy.getDate().toString(),
          MesEntrega: hoy.toLocaleDateString("es-PY", { month: "long" }),
          AnioEntrega: hoy.getFullYear().toString(),
          Duplex: soloDigito,
          Condominio: unidad?.condo || "",
          NisAnde: `${localNisAnde || unidad?.nisAnde || ""}`,
          MontoAlquiler: fmtGs(montoAlquiler),
          MontoGarantia: fmtGs(montoGarantia),
          MontoPagare: fmtGs(montoGarantia),
          MontoPagareLetras: montoGarantia > 0 ? `GUARANÍES ${montoLetras}` : "",
          FechaInicio: fechaInicio,
          FechaFin: fechaFin,
          DuracionMeses: duracionMeses,
          Locatario: `${(contractData?.inquilino?.razonSocial || unidad?.tenant || "").toUpperCase()}`,
          CedulaLocatario: `${contractData?.inquilino?.documento || ""}`,
          DomicilioLocatario: `${((contractData as any)?.domicilioLocatario || unidad?.condo || "Luque, Paraguay").toUpperCase()}`,
          TelefonoLocatario: `${contractData?.inquilino?.telefono || ""}`,
          Codeudor: `${(codeudor.nombre || (contractData as any)?.codeudorNombre || "").toUpperCase()}`,
          CedulaCodeudor: `${codeudor.cedula || (contractData as any)?.codeudorCedula || ""}`,
          DomicilioCodeudor: `${(codeudor.direccion || (contractData as any)?.codeudorDireccion || "").toUpperCase()}`,
          TelefonoCodeudor: `${codeudor.telefono || (contractData as any)?.codeudorTelefono || ""}`,
      } as DatosPlantillaPreview;
  };

  const togglePlantillaId = (id: number) => {
      setSelectedPlantillaIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
  };

  const seleccionarTodasPlantillas = () => {
      setSelectedPlantillaIds(plantillasList.map((p: any) => Number(p.plantillaId)).filter(Boolean));
  };

  const deseleccionarTodasPlantillas = () => setSelectedPlantillaIds([]);

  /** Si hay edición/contratación sin guardar, no permitir generar docs; enfoca Guardar cambios. */
  const ensureFichaGuardadaAntesDeDocumentos = (): boolean => {
    if (!isEditing && !isContratando && !isRenewing) return true;
    toast.warning("Guardá los cambios primero", {
      description:
        "Tenés cambios sin guardar en la ficha. Guardá los cambios para luego generar contratos o documentos.",
      duration: 5000,
    });
    setActiveTab("ficha");
    focusSaveChangesButton();
    return false;
  };

  const openGenerarContratoModal = () => {
    if (!ensureFichaGuardadaAntesDeDocumentos()) return;
    setIsGenerarContratoModalOpen(true);
  };

  const handleAbrirVistaPreviaDocs = () => {
      if (!ensureFichaGuardadaAntesDeDocumentos()) return;
      if (selectedPlantillaIds.length === 0) {
          toast.error("Seleccioná al menos una plantilla.");
          return;
      }
      if (!contractData?.contratoId) {
          toast.error("No hay contrato activo", {
              description: "Registre o seleccione un inquilino con contrato para autocompletar el documento."
          });
          return;
      }
      setIsVistaPreviaDocsOpen(true);
  };

  const handleConfirmarGenerarZip = async () => {
      if (!ensureFichaGuardadaAntesDeDocumentos()) return;
      const datos = buildDatosPlantillaPreview();
      if (!datos || !contractData?.contratoId) {
          toast.error("No hay contrato activo");
          return;
      }
      if (selectedPlantillaIds.length === 0) {
          toast.error("Seleccioná al menos una plantilla.");
          return;
      }

      setIsGeneratingDoc(true);
      try {
          const params = new URLSearchParams();
          Object.entries(datos).forEach(([k, v]) => {
              if (v != null && String(v).length > 0) params.set(k, String(v));
          });
          params.set("ids", selectedPlantillaIds.join(","));

          const url = `${API_BASE}/api/Plantillas/generar-zip/${contractData.contratoId}?${params.toString()}`;
          const response = await fetch(url);
          if (!response.ok) {
              const errText = await response.text().catch(() => "");
              throw new Error(errText || "No se pudo generar el ZIP");
          }

          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const nombreInquilino = (datos.Locatario || "Inquilino").replace(/\s+/g, "_");
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `Documentos_Alquiler_${nombreInquilino}.zip`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);

          setIsVistaPreviaDocsOpen(false);
          toast.success(`¡${selectedPlantillaIds.length} documento(s) generado(s)!`, {
              description: "ZIP con plantillas Word oficiales y datos autocompletados."
          });
      } catch (e: any) {
          console.error(e);
          toast.error("Error al generar los documentos", {
              description: e?.message || "Verifique que la API esté en marcha y las plantillas en wwwroot/plantillas."
          });
      } finally {
          setIsGeneratingDoc(false);
      }
  };

  // Estados para OCR / Escaneo de Contrato
  const [isScanning, setIsScanning] = useState(false);
  const [ocrData, setOcrData] = useState<{
    nombreCompleto: string;
    cedula: string;
    telefono: string;
    email: string;
    montoMensual: number;
    fechaInicio: string;
    fechaFin: string;
    garantia: number;
  } | null>(null);
  const [showOcrPreview, setShowOcrPreview] = useState(false);
  const [filterDesde, setFilterDesde] = useState<string>("");
  const [filterHasta, setFilterHasta] = useState<string>("");
  const [filterContratoDesde, setFilterContratoDesde] = useState<string>("");
  const [filterContratoHasta, setFilterContratoHasta] = useState<string>("");
  const [historialFilterErrors, setHistorialFilterErrors] = useState<{
    pagoDesde?: string;
    pagoHasta?: string;
    contratoDesde?: string;
    contratoHasta?: string;
  }>({});
  const refPagoDesde = React.useRef<HTMLInputElement>(null);
  const refPagoHasta = React.useRef<HTMLInputElement>(null);
  const refContratoDesde = React.useRef<HTMLInputElement>(null);
  const refContratoHasta = React.useRef<HTMLInputElement>(null);
  const refFiltrosHistorial = React.useRef<HTMLDivElement>(null);
  const [sortColumn, setSortColumn] = useState<"fechaVencimiento" | "concepto" | "periodo" | "monto" | "pagado" | "estado">("fechaVencimiento");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: "fechaVencimiento" | "concepto" | "periodo" | "monto" | "pagado" | "estado") => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const [confirmAnularContrato, setConfirmAnularContrato] = useState<{ contratoId: number; nombre: string } | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showWhatsAppPreviewModal, setShowWhatsAppPreviewModal] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [whatsAppResultMsg, setWhatsAppResultMsg] = useState("");

  const handleCompartirWhatsAppFicha = () => {
    const phoneRaw = contractData?.inquilino?.telefono || "";
    const phone = phoneRaw.replace(/\D/g, "");
    if (!phoneRaw || phoneRaw === "N/A" || phone.length < 6) {
      toast.warning("Falta el número de WhatsApp", {
        description:
          "Cargá el celular del inquilino en «Editar ficha» o en «Generar contrato» antes de compartir el PDF.",
      });
      return;
    }

    setShowWhatsAppPreviewModal(true);
  };

  const handleEnviarPdfWhatsAppFicha = async () => {
    const phoneRaw = contractData?.inquilino?.telefono || "";
    const phone = phoneRaw.replace(/\D/g, "");
    if (!phoneRaw || phone.length < 6) {
      toast.warning("Falta el número de WhatsApp", {
        description: "Cargá el teléfono del inquilino en la ficha y reintentá.",
      });
      return;
    }

    const waWindow = prepareWhatsAppShareWindow();
    setIsSharingWhatsApp(true);
    const loading = toast.loading(
      /iPhone|iPad|Android/i.test(navigator.userAgent)
        ? "Generando PDF para WhatsApp…"
        : "Generando PDF y abriendo WhatsApp Web…"
    );
    try {
      const file = await descargarContratoPDF(contractData, dataUnidad, true);
      if (!file) {
        try {
          waWindow?.close();
        } catch {
          /* ignore */
        }
        toast.dismiss(loading);
        toast.error("No se pudo generar el PDF del contrato.");
        return;
      }
      const nombre =
        contractData?.inquilino?.razonSocial ||
        contractData?.inquilino?.nombre ||
        "Cliente";
      const texto = `Hola ${nombre}, le compartimos su Contrato de Locación del Dúplex ${unidad?.code || ""}. Adjuntamos el PDF del documento.`;
      const result = await sharePdfViaWhatsApp({
        file,
        fileName: file.name,
        phoneRaw,
        text: texto,
        preOpenedWindow: waWindow,
      });
      toast.dismiss(loading);
      if (result.mode === "native-share" && result.message.includes("cancelado")) {
        toast.info(result.message);
        return;
      }
      toast.success(result.message);
      setWhatsAppResultMsg(result.message);
      setShowWhatsAppPreviewModal(false);
      setShowWhatsAppModal(true);
    } catch (e: any) {
      console.error(e);
      try {
        waWindow?.close();
      } catch {
        /* ignore */
      }
      toast.dismiss(loading);
      toast.error(e?.message || "Error al generar o compartir el PDF.");
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append("file", file);

    setIsScanning(true);
    toast.info("Escaneando contrato con motor OCR Inteligente...");

    try {
      const resp = await fetch(`${API_BASE}/api/Documentos/scan-contract`, {
        method: "POST",
        body: formData
      });

      if (resp.ok) {
        const data = await resp.json();
        setOcrData(data);
        setShowOcrPreview(true);
        toast.success("¡Contrato escaneado con éxito!");
      } else {
        toast.error("Error al procesar el contrato");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión con el motor OCR");
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyOcr = () => {
    if (!ocrData) return;

    setContractData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        montoMensualAlquiler: ocrData.montoMensual,
        fechaInicioContrato: ocrData.fechaInicio,
        fechaFinContrato: ocrData.fechaFin,
        depositoGarantia: ocrData.garantia,
        inquilino: {
          ...prev.inquilino,
          razonSocial: ocrData.nombreCompleto,
          documento: ocrData.cedula,
          telefono: ocrData.telefono,
          email: ocrData.email
        }
      };
    });

    setShowOcrPreview(false);
    toast.success("Datos autocompletados en la ficha.");
  };
  
  const [contractData, setContractData] = useState<Contrato | null>(null);
  const contratoIdRef = useRef<number>(0);
  const isRegisteringPaymentRef = useRef(false);
  const pendingDesalojoTrasCobroRef = useRef(false);
  const [pendingDesalojoTrasCobro, setPendingDesalojoTrasCobro] = useState(false);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [tempUrls, setTempUrls] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  const fetchDocuments = async (contratoId: number) => {
    try {
      const resp = await fetch(`${API_BASE}/api/Documentos/contrato/${contratoId}?t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        const urls: Record<string, string> = {};
        data.forEach((doc: any) => {
          urls[doc.tipoDocumento] = doc.url || "";
        });
        setDocumentUrls(urls);
        setTempUrls(urls);
      }
    } catch (e) {
      console.error("Error fetching documents", e);
    }
  };

  const handleSaveDocument = async (tipoDocumento: string) => {
    if (!contractData?.contratoId) {
      toast.error("Debe existir un contrato activo.");
      return;
    }

    const file = selectedFiles[tipoDocumento];
    const url = tempUrls[tipoDocumento] || "";

    if (file) {
      const formData = new FormData();
      formData.append("contratoId", contractData.contratoId.toString());
      formData.append("tipoDocumento", tipoDocumento);
      formData.append("file", file);

      try {
        const resp = await fetch(`${API_BASE}/api/Documentos/upload`, {
          method: "POST",
          body: formData
        });

        if (resp.ok) {
          toast.success("Archivo guardado exitosamente en el servidor.");
          setSelectedFiles(prev => {
            const next = { ...prev };
            delete next[tipoDocumento];
            return next;
          });
          fetchDocuments(contractData.contratoId);
        } else {
          toast.error("Error al subir archivo.");
        }
      } catch (e) {
        toast.error("Error de red.");
      }
    } else if (url.trim() !== "") {
      try {
        const resp = await fetch(`${API_BASE}/api/Documentos/save-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contratoId: contractData.contratoId,
            tipoDocumento,
            url
          })
        });
        if (resp.ok) {
          toast.success("Enlace guardado con éxito.");
          fetchDocuments(contractData.contratoId);
        } else {
          toast.error("Error al guardar enlace.");
        }
      } catch (e) {
        toast.error("Error de red.");
      }
    } else {
      toast.error("Ingrese una URL o seleccione un archivo antes de guardar.");
    }
  };

  React.useEffect(() => {
    if (isOpen && activeTab === "documentos" && contractData?.contratoId) {
      fetchDocuments(contractData.contratoId);
    }
  }, [isOpen, activeTab, contractData?.contratoId]);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    monto: 0,
    metodo: "Efectivo",
    fecha: new Date().toISOString().split('T')[0],
    notas: "",
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    /** Periodos multi-mes: [{ mes, anio }, ...] */
    mesesSeleccionados: [] as { mes: number; anio: number }[],
    nroComprobante: "",
    banco: "",
    tipoComprobante: "recibo" as "recibo" | "factura"
  });

  // Gastos de servicios (Luz, Agua, Basura) â€” persistidos en GastosMantenimiento
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceModalMode, setServiceModalMode] = useState<"create" | "edit">("create");
  const [editingGastoId, setEditingGastoId] = useState<number | null>(null);
  const [serviceType, setServiceType] = useState<"Luz" | "Agua" | "Basura">("Luz");
  const [gastosServicios, setGastosServicios] = useState<GastoServicio[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [andeLuzConsulta, setAndeLuzConsulta] = useState<AndeConsultaUi | null>(null);
  const [loadingAndeLuz, setLoadingAndeLuz] = useState(false);
  /** Edición de filas origen "Cobro" (PagosRecibo). */
  const [isCobroServicioModalOpen, setIsCobroServicioModalOpen] = useState(false);
  const [editingPagoServicioId, setEditingPagoServicioId] = useState<number | null>(null);
  const [editingPagoSnapshot, setEditingPagoSnapshot] = useState<Pago | null>(null);
  const [cobroServicioTipo, setCobroServicioTipo] = useState<"Luz" | "Agua" | "Basura">("Luz");
  const [cobroServicioForm, setCobroServicioForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    monto: 0,
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    metodoPago: "Efectivo",
    nroComprobante: "",
    banco: "",
    notas: "",
  });
  
  // Desalojo State
  const [isDesalojarModalOpen, setIsDesalojarModalOpen] = useState(false);
  const [deudaTotalDesalojo, setDeudaTotalDesalojo] = useState(0);
  const [desalojoForm, setDesalojoForm] = useState({
      cantCuotas: 5,
      montoInteresDiario: 0,
      observaciones: "Acuerdo de desalojo"
  });
  const [serviceForm, setServiceForm] = useState({
    identificador: "",
    nroComprobante: "",
    fecha: new Date().toISOString().split('T')[0],
    monto: 0,
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    metodoPago: "Efectivo",
  });

  const BANCOS_PARAGUAY = [
    "Itaú Paraguay",
    "Banco Continental",
    "Sudameris Bank",
    "Banco Atlas",
    "GNB Paraguay",
    "Banco BASA",
    "Visión Banco",
    "Banco Familiar",
    "BNF (Fomento)",
    "Ueno Bank",
    "Banco Regional",
    "Bancop",
    "Interfisa Banco",
    "Zeta Banco"
  ];

  const fetchHistoricoContratos = async () => {
    if (!unidad?.id) return;
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/unidad/${unidad?.id}/historico?t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setHistoricoContratos(Array.isArray(data) ? data : []);
      } else {
        setHistoricoContratos([]);
      }
    } catch (error) {
      console.error("Error fetching historico", error);
    }
  };

  React.useEffect(() => {
    if (isOpen && unidad?.id) {
      const changedUnit = openedUnidadRef.current !== unidad.id;
      const justOpened = openedUnidadRef.current === null;
      openedUnidadRef.current = unidad.id;
      if (changedUnit || justOpened) {
        if (changedUnit) {
          setHistoricoContratos([]);
          setFilterDesde("");
          setFilterHasta("");
          setFilterContratoDesde("");
          setFilterContratoHasta("");
          setAndeLuzConsulta(null);
          draftAppliedRef.current = null;
        }
        setActiveTab(initialTab || "ficha");
        setLocalNisAnde(normalizeNisValue(unidad?.nisAnde));
        setLocalCodigoUnidad(unidad?.code || "");
      }
      void (async () => {
        await fetchContract();
        // Restaurar borrador incompleto (después del contrato base)
        if (
          initialDraft?.payloadJson &&
          draftAppliedRef.current !== unidad.id
        ) {
          draftAppliedRef.current = unidad.id;
          applyDraftPayload(initialDraft.payloadJson, initialDraft.modo);
          return;
        }
        try {
          const r = await fetch(`${API_BASE}/api/UnidadesCondominio/${unidad.id}?t=${Date.now()}`);
          if (!r.ok) return;
          const data = await r.json();
          const nis = normalizeNisValue(data?.nisAnde ?? data?.NisAnde);
          const codigo = String(data?.codigoUnidad ?? data?.CodigoUnidad ?? unidad.code ?? "");
          setLocalNisAnde(nis);
          if (codigo) setLocalCodigoUnidad(codigo);
        } catch {
          /* ignore */
        }
      })();
    } else if (!isOpen) {
      openedUnidadRef.current = null;
      draftAppliedRef.current = null;
      closingConfirmRef.current = false;
      setIsEditing(false);
      setIsRenewing(false);
      setIsContratando(false);
    }
    // No depender de nisAnde/code: al guardar disparaba refetch y ralentizaba el móvil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, unidad?.id, initialTab, initialDraft?.payloadJson]);

  const fetchContract = async (): Promise<Contrato | null> => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/Contratos/unidad/${unidad?.id}?t=${Date.now()}`);
      if (resp.ok) {
        const raw = await resp.json();
        const data = normalizeContratoApi(raw);
        if (data) {
          setContractData(data);
          contratoIdRef.current = data.contratoId;
          return data;
        }
        // Respuesta OK pero sin id usable: no borrar ficha si hay cobro en curso
        if (!(isRegisteringPaymentRef.current && contratoIdRef.current)) {
          setContractData(null);
        }
        return null;
      } else if (resp.status === 404) {
        if (!(isRegisteringPaymentRef.current && contratoIdRef.current)) {
          setContractData(null);
          contratoIdRef.current = 0;
        }
        return null;
      } else {
        if (!(isRegisteringPaymentRef.current && contratoIdRef.current)) {
          setContractData(null);
        }
        toast.error("No se pudo cargar el contrato de la unidad", {
          description: `Código ${resp.status}. Podés reintentar cerrando y abriendo la ficha.`,
        });
        return null;
      }
    } catch (error) {
      console.error("Error fetching contract", error);
      if (!(isRegisteringPaymentRef.current && contratoIdRef.current)) {
        setContractData(null);
      }
      toast.error("Error de red al cargar la ficha", {
        description: "Revisá la conexión e intentá de nuevo.",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  React.useEffect(() => {
    if (!isOpen || !unidad?.id || unidad.id <= 0) return;
    if (activeTab !== "comprobantes" && activeTab !== "historico") return;
    void fetchHistoricoContratos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, unidad?.id, activeTab]);

  const persistUnidadCampos = async (): Promise<{ ok: boolean; nis: string; codigo: string; error?: string }> => {
    const nis = normalizeNisValue(localNisAnde);
    const codigo = (localCodigoUnidad || unidad?.code || "").trim();
    if (!unidad?.id) return { ok: false, nis, codigo, error: "Sin unidadId" };
    try {
      const getRes = await fetch(`${API_BASE}/api/UnidadesCondominio/${unidad.id}?t=${Date.now()}`);
      if (!getRes.ok) {
        const t = await getRes.text().catch(() => "");
        return { ok: false, nis, codigo, error: `GET ${getRes.status}: ${t || "unidad no encontrada"}` };
      }
      const current = await getRes.json();
      const payload = {
        empresaId: current.empresaId ?? current.EmpresaId ?? 0,
        nombreCondominio: current.nombreCondominio ?? current.NombreCondominio ?? unidad.condo ?? "",
        codigoUnidad: codigo || current.codigoUnidad || current.CodigoUnidad || "",
        estado: current.estado ?? current.Estado ?? unidad.status ?? "Ocupado",
        nisAnde: nis || null,
        medidorAgua: current.medidorAgua ?? current.MedidorAgua ?? null,
        observaciones: current.observaciones ?? current.Observaciones ?? null,
      };
      const putRes = await fetch(`${API_BASE}/api/UnidadesCondominio/${unidad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!putRes.ok) {
        const t = await putRes.text().catch(() => "");
        return { ok: false, nis, codigo, error: `PUT ${putRes.status}: ${t || "error al guardar"}` };
      }
      const saved = await putRes.json().catch(() => null);
      const savedNis = normalizeNisValue(saved?.nisAnde ?? saved?.NisAnde ?? nis);
      const savedCodigo = String(saved?.codigoUnidad ?? saved?.CodigoUnidad ?? codigo);
      setLocalNisAnde(savedNis);
      if (savedCodigo) setLocalCodigoUnidad(savedCodigo);
      return { ok: true, nis: savedNis, codigo: savedCodigo };
    } catch (e: any) {
      return { ok: false, nis, codigo, error: e?.message || "Error de red" };
    }
  };

  React.useEffect(() => {
    setAndeLuzConsulta(null);
  }, [localNisAnde]);

  const fetchGastosServicios = React.useCallback(async () => {
    if (!unidad?.id || unidad.id <= 0) return;
    setLoadingGastos(true);
    try {
      const r = await fetch(
        `${API_BASE}/api/GastosMantenimiento/unidad/${unidad.id}/servicios?t=${Date.now()}`
      );
      if (r.ok) {
        const data = (await r.json()) as GastoServicio[];
        setGastosServicios(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("fetchGastosServicios", e);
    } finally {
      setLoadingGastos(false);
    }
  }, [unidad?.id]);

  React.useEffect(() => {
    if (!isOpen || !unidad?.id || unidad.id <= 0 || activeTab !== "gastos") return;
    void fetchGastosServicios();
  }, [isOpen, unidad?.id, activeTab, fetchGastosServicios]);

  const refreshContratoYHistorial = React.useCallback(async () => {
    await fetchContract();
    if (onUpdate) onUpdate();
  }, [unidad?.id, onUpdate]);

  React.useEffect(() => {
    if (!contractData?.fechaInicioContrato) return;
    const toInputDate = (v: string) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    setFilterContratoDesde(toInputDate(contractData.fechaInicioContrato));
    setFilterContratoHasta(
      contractData.fechaFinContrato ? toInputDate(contractData.fechaFinContrato) : ""
    );
  }, [contractData?.contratoId]);

  const handleRenovarContrato = async () => {
    if (!contractData) return;
    try {
      setIsLoading(true);
      if (deudaTotalDesalojo > 0) {
        const bodyMora = {
          inquilinoId: contractData.inquilinoId,
          unidadId: unidad?.id,
          montoTotal: deudaTotalDesalojo,
          cantidadCuotas: desalojoForm.cantCuotas || 1,
          observaciones: desalojoForm.observaciones || "Saldo deudor transferido a morosidad por renovación de contrato.",
          montoInteresDiario: desalojoForm.montoInteresDiario || 0
        };
        const resMora = await fetch(`${API_BASE}/api/Morosidad`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyMora)
        });
        if (!resMora.ok) {
            toast.error("Advertencia: No se pudo registrar la morosidad automática.");
        } else {
            toast.info("La deuda pendiente del periodo anterior fue transferida a morosidades.");
        }
      }

      if ((normalizeNisValue(localNisAnde) !== normalizeNisValue(unidad?.nisAnde) || localCodigoUnidad !== unidad?.code) && unidad?.id) {
          const saved = await persistUnidadCampos();
          if (!saved.ok) toast.error("No se pudo guardar el NIS / código de unidad", { description: saved.error });
          else if (onUpdate) onUpdate({ nisAnde: saved.nis, code: saved.codigo });
      }

      const resp = await fetch(`${API_BASE}/api/Contratos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoId: contractData.contratoId,
          inquilinoId: contractData.inquilinoId,
          empresaId: contractData.inquilino?.empresaId || 7,
          unidadId: contractData.unidadId || unidad?.id || 0,
          nombreCompleto: contractData.inquilino.razonSocial,
          cedula: contractData.inquilino.documento,
          telefono: contractData.inquilino.telefono,
          email: contractData.inquilino.email,
          fechaIngreso: toApiDateTime(contractData.fechaIngreso, contractData.fechaInicioContrato),
          fechaInicio: toApiDateTime(contractData.fechaInicioContrato, contractData.fechaIngreso),
          fechaFin: toApiDateTime(contractData.fechaFinContrato),
          montoMensual: Number(contractData.montoMensualAlquiler || 0),
          garantia: Number(contractData.depositoGarantia || 0),
          cantidadOcupantes: Number(contractData.cantidadOcupantes || 1),
          vehiculo: contractData.vehiculoInfo,
          observaciones: contractData.observaciones,
          serviciosIncluidos: contractData.serviciosIncluidos
        })
      });

      if (resp.ok) {
        toast.success("¡Contrato renovado con éxito! Generando vista previa en PDF...");
        await fetchContract();
        await fetchHistoricoContratos();
        if (onUpdate) onUpdate();
        setShowRenewedPreviewModal(true);
      } else {
        const errText = await resp.text();
        toast.error("Error al renovar contrato: " + errText);
      }
    } catch (error) {
      toast.error("Error de red al intentar renovar el contrato");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      // Siempre persiste NIS/código al guardar la ficha (no depender solo del prop del dashboard)
      if (unidad?.id) {
        const saved = await persistUnidadCampos();
        if (!saved.ok) {
          toast.error("No se pudo guardar el NIS / código de la unidad", {
            description: saved.error || "Revisá que la API esté en marcha.",
          });
          return;
        }
        if (onUpdate) onUpdate({ nisAnde: saved.nis, code: saved.codigo });
      }

      // Sin contrato solo se guarda la unidad (NIS)
      if (!contractData) {
        toast.success("NIS actualizado correctamente");
        setIsEditing(false);
        await clearFichaIncompleta();
        return;
      }

      const resp = await fetch(`${API_BASE}/api/Contratos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoId: contractData.contratoId,
          inquilinoId: contractData.inquilinoId,
          empresaId: contractData.inquilino?.empresaId || 7,
          unidadId: contractData.unidadId || unidad?.id || 0,
          nombreCompleto: contractData.inquilino.razonSocial,
          cedula: contractData.inquilino.documento,
          telefono: contractData.inquilino.telefono,
          email: contractData.inquilino.email,
          fechaIngreso: toApiDateTime(contractData.fechaIngreso, contractData.fechaInicioContrato),
          fechaInicio: toApiDateTime(contractData.fechaInicioContrato, contractData.fechaIngreso),
          fechaFin: toApiDateTime(contractData.fechaFinContrato),
          montoMensual: Number(contractData.montoMensualAlquiler || 0),
          garantia: Number(contractData.depositoGarantia || 0),
          cantidadOcupantes: Number(contractData.cantidadOcupantes || 1),
          vehiculo: contractData.vehiculoInfo,
          observaciones: contractData.observaciones,
          serviciosIncluidos: contractData.serviciosIncluidos
        })
      });

      if (resp.ok) {
        toast.success("Datos actualizados correctamente");
        setIsEditing(false);
        fetchContract();
        if (onUpdate) onUpdate({ nisAnde: normalizeNisValue(localNisAnde), code: localCodigoUnidad });
        if (isFichaCompleta(contractData)) {
          await clearFichaIncompleta();
        } else {
          await upsertFichaIncompleta();
          toast.message("Sigue como ficha incompleta", {
            description: "Completá nombre, cédula, fechas y monto para sacarla del listado.",
          });
        }
      } else {
        const errText = await resp.text();
        console.error("Error API:", errText);
        toast.error("El servidor rechazó los datos.", {
          description: errText?.slice(0, 280) || "Revisá fechas y campos obligatorios.",
        });
      }
    } catch (error) {
      toast.error("Error de red al actualizar");
    }
  };

  const handleStartContratar = () => {
    setContractData({
        contratoId: 0,
        inquilinoId: 0,
        inquilino: {
            personaId: 0,
            razonSocial: "",
            documento: "",
            telefono: "",
            email: "",
            empresaId: 7
        },
        unidadId: unidad?.id || 0,
        fechaIngreso: new Date().toISOString(),
        fechaInicioContrato: new Date().toISOString().split('T')[0],
        fechaFinContrato: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        observaciones: "Nuevo contrato",
        montoMensualAlquiler: 0,
        depositoGarantia: 0,
        cantidadOcupantes: 1,
        vehiculoInfo: "",
        serviciosIncluidos: "",
        pagos: []
    } as unknown as Contrato);
    setIsContratando(true);
    setActiveTab("ficha");
  };

  const handleContratar = async () => {
    if (!contractData) return;
    setActiveTab("ficha");
    const nombre = String(contractData.inquilino?.razonSocial || "").trim();
    const doc = String(contractData.inquilino?.documento || "").trim();
    const inicio = contractData.fechaInicioContrato;
    const fin = contractData.fechaFinContrato;
    const monto = Number(contractData.montoMensualAlquiler || 0);
    if (!nombre) {
      avisarCampoFaltante("Falta el nombre del inquilino.", campoFicha("nombre"));
      return;
    }
    if (!doc) {
      avisarCampoFaltante("Falta la cédula o RUC.", campoFicha("documento"));
      return;
    }
    if (!inicio) {
      avisarCampoFaltante("Falta la fecha de inicio del contrato.", campoFicha("fechaInicioContrato"));
      return;
    }
    if (!fin) {
      avisarCampoFaltante("Falta la fecha de fin del contrato.", campoFicha("fechaFinContrato"));
      return;
    }
    if (monto <= 0) {
      avisarCampoFaltante("El alquiler mensual tiene que ser mayor a 0.", campoFicha("montoMensualAlquiler"));
      return;
    }
    try {
      if (normalizeNisValue(localNisAnde) !== normalizeNisValue(unidad?.nisAnde) && unidad?.id) {
          const saved = await persistUnidadCampos();
          if (!saved.ok) toast.error("No se pudo guardar el NIS", { description: saved.error });
          else if (onUpdate) onUpdate({ nisAnde: saved.nis });
      }
      
      const resp = await fetch(`${API_BASE}/api/Contratos`, {
        method: "POST", // O PUT si la API soporta upsert
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoId: 0,
          inquilinoId: 0,
          empresaId: 7,
          unidadId: contractData.unidadId || unidad?.id || 0,
          nombreCompleto: contractData.inquilino?.razonSocial || "",
          cedula: contractData.inquilino?.documento || "",
          telefono: contractData.inquilino?.telefono || "",
          email: contractData.inquilino?.email || "",
          fechaIngreso: toApiDateTime(contractData.fechaIngreso, contractData.fechaInicioContrato),
          fechaInicio: toApiDateTime(contractData.fechaInicioContrato, contractData.fechaIngreso),
          fechaFin: toApiDateTime(contractData.fechaFinContrato),
          montoMensual: Number(contractData.montoMensualAlquiler || 0),
          garantia: Number(contractData.depositoGarantia || 0),
          cantidadOcupantes: Number(contractData.cantidadOcupantes || 1),
          vehiculo: contractData.vehiculoInfo || "",
          observaciones: contractData.observaciones || "",
          serviciosIncluidos: contractData.serviciosIncluidos || ""
        })
      });

      if (resp.ok) {
        toast.success("Inquilino Contratado Correctamente");
        setIsContratando(false);
        fetchContract();
        if (onUpdate) onUpdate();
        if (isFichaCompleta(contractData)) await clearFichaIncompleta();
        else {
          await upsertFichaIncompleta();
          toast.message("Quedó como ficha incompleta", {
            description: "Completá los datos faltantes desde el Dashboard.",
          });
        }
      } else {
        const errText = await resp.text().catch(() => "");
        toast.error("Error al registrar el contrato.", {
          description: errText?.slice(0, 280) || undefined,
        });
      }
    } catch (error) {
      toast.error("Error de red al contratar");
    }
  };


  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  // Mapeo de datos para la UI - Manejamos posibles discrepancias de nombres entre backend y frontend
  // Mapeo de datos para la UI
  const dataInquilino = {
    nombre: contractData?.inquilino?.razonSocial || unidad?.tenant || "Disponible",
    cedula: contractData?.inquilino?.documento || "N/A",
    telefono: contractData?.inquilino?.telefono || "N/A",
    correo: contractData?.inquilino?.email || "N/A",
    fechaIngreso: contractData?.fechaIngreso ? new Date(contractData.fechaIngreso).toLocaleDateString() : "N/A",
    fechaInicioContrato: contractData?.fechaInicioContrato ? new Date(contractData.fechaInicioContrato).toLocaleDateString() : "N/A",
    fechaFinContrato: contractData?.fechaFinContrato ? new Date(contractData.fechaFinContrato).toLocaleDateString() : "N/A",
    montoMensual: contractData?.montoMensualAlquiler || 0,
    garantia: contractData?.depositoGarantia || 0,
    ocupantes: contractData?.cantidadOcupantes || 0,
    vehiculo: contractData?.vehiculoInfo || "N/A",
    observaciones: contractData?.observaciones || "Sin observaciones.",
    serviciosIncluidos: contractData?.serviciosIncluidos ? contractData.serviciosIncluidos.split(',') : []
  };

  const handleToggleService = (servicio: string) => {
    if (!contractData) return;
    
    const current = dataInquilino.serviciosIncluidos;
    const isAdding = !current.includes(servicio);
    const next = isAdding 
      ? [...current, servicio]
      : current.filter(s => s !== servicio);
    
    // Ajuste sugerido de precios
    const COSTOS: Record<string, number> = {
        "Agua": 80000,
        "Basura": 50000,
        "Luz": 300000
    };

    const factor = isAdding ? 1 : -1;
    const ajuste = COSTOS[servicio] || 0;
    const nuevoMonto = contractData.montoMensualAlquiler + (ajuste * factor);

    setContractData({
        ...contractData,
        serviciosIncluidos: next.join(','),
        montoMensualAlquiler: nuevoMonto
    });

    toast.info(`${servicio} ${isAdding ? 'incluido' : 'excluido'}. Monto ajustado: Gs. ${nuevoMonto.toLocaleString()}`);
  };

  const handleRegisterPayment = async () => {
    let contrato = contractData;
    if (!contrato?.contratoId) {
      contrato = await fetchContract();
    }
    if (!contrato?.contratoId && contratoIdRef.current) {
      // Último recurso: reutilizar id conocido si el refetch falló en medio del cobro
      contrato = { ...(contrato || contractData || ({} as Contrato)), contratoId: contratoIdRef.current };
    }
    if (!contrato?.contratoId) {
      toast.error("Error: No se ha cargado la información del contrato. Reintente en un momento.");
      return;
    }
    contratoIdRef.current = contrato.contratoId;

    const periodos =
      paymentForm.mesesSeleccionados.length > 0
        ? [...paymentForm.mesesSeleccionados].sort(
            (a, b) => a.anio - b.anio || a.mes - b.mes
          )
        : [{ mes: paymentForm.mes, anio: paymentForm.anio }];

    if (periodos.length === 0) {
      avisarCampoFaltante("Seleccioná al menos un mes a cobrar.", campoPorId("ficha-cobro-meses"));
      return;
    }
    if (paymentForm.monto <= 0) {
      avisarCampoFaltante("El monto a cobrar tiene que ser mayor a 0.", campoPorId("ficha-cobro-monto"));
      return;
    }

    try {
      setIsLoading(true);
      const n = periodos.length;
      const base = Math.floor(paymentForm.monto / n);
      const resto = paymentForm.monto - base * n;
      const descPlural = formatConceptoCobro(
        periodos.map((p) => ({ tipoPago: "Alquiler", mes: p.mes, anio: p.anio }))
      );
      const notaBase = pendingDesalojoTrasCobroRef.current
        ? [MARCA_COBRO_RESTANTE_DESALOJO, paymentForm.notas, "Cobro restante previo a desalojo"]
            .filter(Boolean)
            .join(" | ")
        : paymentForm.notas;

      const pagosPayload = periodos.map((p, idx) => ({
        contratoId: contrato!.contratoId,
        tipoPago: "Alquiler",
        mesPagado: p.mes,
        anioPagado: p.anio,
        montoPagado: base + (idx === 0 ? resto : 0),
        metodoPago: paymentForm.metodo,
        fechaPago: paymentForm.fecha,
        notas:
          idx === 0
            ? [notaBase, descPlural].filter(Boolean).join(" | ")
            : notaBase || `Parte de: ${descPlural}`,
        nroComprobante: paymentForm.nroComprobante,
        banco: paymentForm.banco,
        saldoPendiente: 0,
        mora: 0,
        facturaEmitida: paymentForm.tipoComprobante === "factura",
      }));

      const resp = await fetch(`${API_BASE}/api/Contratos/pagos-consolidados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pagosPayload),
      });

      if (resp.ok) {
        let createdPagos: any[] = [];
        try {
          createdPagos = await resp.json();
        } catch {
          /* ignore */
        }
        const firstPago = Array.isArray(createdPagos) && createdPagos[0] ? createdPagos[0] : null;
        toast.success(
          periodos.length > 1
            ? `Cobro de ${periodos.length} meses registrado`
            : `Cobro de ${paymentForm.metodo} registrado con éxito`
        );
        setIsRegisteringPayment(false);
        isRegisteringPaymentRef.current = false;

        const itemsComprobante = periodos.map((p, idx) => ({
          cantidad: 1,
          descripcion: formatConceptoPeriodo("Alquiler", p.mes, p.anio),
          precioUnitario: base + (idx === 0 ? resto : 0),
          iva10: base + (idx === 0 ? resto : 0),
        }));

        const relatedPagoIds = Array.isArray(createdPagos)
          ? createdPagos
              .map((p: any) => Number(p?.pagoId ?? p?.PagoId))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          : [];

        setComprobantePagoData({
          pagoId: firstPago?.pagoId || firstPago?.PagoId || relatedPagoIds[0] || Date.now(),
          tipoPago: "Alquiler",
          mesPagado: firstPago?.mesPagado || firstPago?.MesPagado || periodos[0].mes,
          anioPagado: firstPago?.anioPagado || firstPago?.AnioPagado || periodos[0].anio,
          montoPagado: paymentForm.monto,
          metodoPago: paymentForm.metodo,
          fechaPago: paymentForm.fecha,
          facturaEmitida: paymentForm.tipoComprobante === "factura",
          numeroFactura: firstPago?.numeroFactura ?? firstPago?.NumeroFactura,
          relatedPagoIds,
          comprobanteUrl: JSON.stringify({
            descripcion: `${descPlural} - ${formatUnidadComprobante(dataUnidad.codigo)}`,
            concepto: descPlural,
            items: itemsComprobante,
          }),
          inquilinoNombre:
            contrato?.inquilino?.razonSocial ||
            contrato?.inquilino?.nombre ||
            dataInquilino.nombre ||
            "Cliente",
          inquilinoEmail: contrato?.inquilino?.email || dataInquilino?.correo || "",
          inquilinoDocumento:
            contrato?.inquilino?.ruc ||
            contrato?.inquilino?.cedula ||
            contrato?.inquilino?.documento ||
            dataInquilino.cedula ||
            "Sin Documento",
          unidadCodigo: dataUnidad.codigo || "",
          condominioNombre: dataUnidad.condominio || "Condominio",
          items: itemsComprobante,
        });
        setIsPreviewComprobanteOpen(true);

        setPaymentForm((prev) => ({
          ...prev,
          notas: "",
          nroComprobante: "",
          banco: "",
          mesesSeleccionados: [],
        }));

        const debeDesalojar = pendingDesalojoTrasCobroRef.current;
        pendingDesalojoTrasCobroRef.current = false;
        setPendingDesalojoTrasCobro(false);

        if (debeDesalojar) {
          const resDesalojo = await fetch(`${API_BASE}/api/Contratos/${contrato.contratoId}/desalojar`, {
            method: "POST",
          });
          if (resDesalojo.ok) {
            toast.success("Cobro restante registrado y unidad desalojada. Sin deuda en morosidades.");
            setIsDesalojarModalOpen(false);
            await fetchHistoricoContratos();
            if (onUpdate) onUpdate();
            onClose();
            return;
          }
          toast.error("Cobro OK, pero falló el desalojo. Reintentá desalojar desde la ficha.");
        }

        await refreshContratoYHistorial();
        setActiveTab("pagos");
      } else {
        // Fallback: un solo pago si el endpoint consolidado no existe
        const respOne = await fetch(`${API_BASE}/api/Contratos/pago`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pagosPayload[0]),
        });
        if (!respOne.ok) {
          const errorText = await resp.text();
          toast.error("Error al registrar: " + errorText);
          return;
        }
        toast.success("Cobro registrado (modo simple)");
        setIsRegisteringPayment(false);
        isRegisteringPaymentRef.current = false;
        const debeDesalojar = pendingDesalojoTrasCobroRef.current;
        pendingDesalojoTrasCobroRef.current = false;
        setPendingDesalojoTrasCobro(false);
        if (debeDesalojar) {
          const resDesalojo = await fetch(`${API_BASE}/api/Contratos/${contrato.contratoId}/desalojar`, {
            method: "POST",
          });
          if (resDesalojo.ok) {
            toast.success("Cobro restante registrado y unidad desalojada.");
            setIsDesalojarModalOpen(false);
            await fetchHistoricoContratos();
            if (onUpdate) onUpdate();
            onClose();
            return;
          }
        }
        await refreshContratoYHistorial();
        setActiveTab("pagos");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Error de conexión al registrar el cobro");
    } finally {
      setIsLoading(false);
    }
  };

  const proveedorPorTipo = (t: "Luz" | "Agua" | "Basura") =>
    t === "Luz" ? "ANDE" : t === "Agua" ? "ESSAP" : "Municipalidad";

  const openCreateServicio = (tipo: "Luz" | "Agua" | "Basura") => {
    setServiceModalMode("create");
    setEditingGastoId(null);
    setServiceType(tipo);
    setServiceForm({
      identificador:
        tipo === "Luz"
          ? (localNisAnde || unidad?.nisAnde || "")
          : tipo === "Agua"
            ? (unidad?.medidorAgua ?? "")
            : "Servicio Municipal",
      nroComprobante: "",
      fecha: new Date().toISOString().split("T")[0],
      monto: tipo === "Agua" ? 80000 : 0,
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      metodoPago: "Efectivo",
    });
    setIsServiceModalOpen(true);
  };

  const openEditServicio = (g: GastoServicio) => {
    const tipo = g.tipoServicio as "Luz" | "Agua" | "Basura";
    setServiceModalMode("edit");
    setEditingGastoId(g.gastoId);
    setServiceType(tipo);
    setServiceForm({
      identificador: g.identificadorServicio ?? "",
      nroComprobante: g.nroComprobante ?? "",
      fecha: g.fecha ? g.fecha.split("T")[0] : new Date().toISOString().split("T")[0],
      monto: g.monto,
      mes: g.mesReferencia ?? new Date().getMonth() + 1,
      anio: g.anioReferencia ?? new Date().getFullYear(),
      metodoPago: g.metodoPago ?? "Efectivo",
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveServicio = async () => {
    if (!unidad?.id || unidad.id <= 0) {
      toast.error("Unidad inválida (sincronizá la estructura en el panel).");
      return;
    }

    try {
      setIsLoading(true);
      const body = {
        unidadId: unidad.id,
        tipoServicio: serviceType,
        identificadorServicio: serviceForm.identificador || null,
        nroComprobante: serviceForm.nroComprobante || null,
        mesReferencia: serviceForm.mes,
        anioReferencia: serviceForm.anio,
        metodoPago: serviceForm.metodoPago,
        monto: serviceForm.monto,
        fecha: serviceForm.fecha,
        proveedor: proveedorPorTipo(serviceType),
      };

      const url =
        serviceModalMode === "edit" && editingGastoId
          ? `${API_BASE}/api/GastosMantenimiento/servicios/${editingGastoId}`
          : `${API_BASE}/api/GastosMantenimiento/servicios`;
      const method = serviceModalMode === "edit" && editingGastoId ? "PUT" : "POST";

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        toast.success(
          serviceModalMode === "edit"
            ? `Gasto de ${serviceType} actualizado`
            : `Gasto de ${serviceType} registrado`
        );
        setIsServiceModalOpen(false);
        await fetchGastosServicios();
        await fetchContract();
        if (onUpdate) onUpdate();
      } else {
        const err = await resp.text();
        toast.error(err || "Error al guardar el gasto");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsultarAnde = async (nisOverride?: string) => {
    const nis = (nisOverride || serviceForm.identificador || localNisAnde || unidad?.nisAnde || "").trim();
    if (!nis || nis === "—" || nis === "N/A" || nis === "SIN NIS") {
      toast.error("Ingresá un número de NIS válido primero.");
      return;
    }

    toast.info("Consultando saldo en ANDE (sesión JWT)…");
    setIsLoading(true);
    setLoadingAndeLuz(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const resp = await fetch(
        `${API_BASE}/api/Ande/jwt/consultar/${encodeURIComponent(nis)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({} as any));
        throw new Error(errBody?.mensaje || "No se pudo consultar ANDE.");
      }

      const data = await resp.json();
      const facturas: AndeFacturaItemUi[] = Array.isArray(data.facturas)
        ? data.facturas.map((f: any) => ({
            monto: Number(f.monto) || 0,
            estado: String(f.estado || ""),
            emision: String(f.emision || ""),
            vencimiento: String(f.vencimiento || ""),
            consumoKw: f.consumoKw ?? null,
          }))
        : [];

      setAndeLuzConsulta({
        nis: String(data.nis || nis),
        titular: String(data.titular || ""),
        saldoDeuda: Number(data.saldoDeuda) || 0,
        estadoPago: String(data.estadoPago || ""),
        fechaConsulta: String(data.fechaConsulta || new Date().toISOString()),
        observaciones: String(data.observaciones || ""),
        facturas,
      });

      // Si el modal de cargar recibo está abierto, rellenar monto con deuda o última factura
      const pendiente = facturas.find((f) => /pendiente/i.test(f.estado));
      const ultima = pendiente || facturas[0];
      if (ultima) {
        setServiceForm((prev) => ({
          ...prev,
          identificador: nis,
          monto: pendiente ? pendiente.monto : Number(data.saldoDeuda) || ultima.monto,
        }));
      } else {
        setServiceForm((prev) => ({ ...prev, identificador: nis, monto: Number(data.saldoDeuda) || 0 }));
      }

      if (Number(data.saldoDeuda) > 0) {
        toast.error(
          `Pendiente ANDE: ${new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(Number(data.saldoDeuda))}`
        );
      } else {
        toast.success(data.estadoPago ? `ANDE: ${data.estadoPago}` : "Consulta ANDE OK — al día.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        toast.error("La consulta a ANDE tardó demasiado. Reintentá.");
      } else {
        toast.error(err?.message || "Error al consultar ANDE.");
      }
    } finally {
      setIsLoading(false);
      setLoadingAndeLuz(false);
    }
  };


  const handleDeleteServicio = (gastoId: number) => {
    setConfirmModalData({
      title: "¿Eliminar Registro de Gasto?",
      description: "Estás por eliminar este gasto de mantenimiento o servicio asignado a la unidad.",
      details: [
        "El registro de gasto se eliminará de forma permanente.",
        "Se actualizarán los totales y el saldo de la unidad."
      ],
      confirmText: "Sí, Eliminar Gasto",
      variant: "danger",
      onConfirm: async () => {
        setIsConfirmActionLoading(true);
        try {
          const resp = await fetch(
            `${API_BASE}/api/GastosMantenimiento/servicios/${gastoId}`,
            { method: "DELETE" }
          );
          if (resp.ok) {
            toast.success("Gasto eliminado correctamente");
            await fetchGastosServicios();
            await fetchContract();
            if (onUpdate) onUpdate();
          } else toast.error("No se pudo eliminar el gasto");
        } catch {
          toast.error("Error de conexión al eliminar gasto");
        } finally {
          setIsConfirmActionLoading(false);
          setConfirmModalData(null);
        }
      }
    });
  };

  const normalizarTipoServicio = (tipo: string): "Luz" | "Agua" | "Basura" | null => {
    const t = (tipo || "").trim();
    if (t === "Luz" || t.toLowerCase() === "luz") return "Luz";
    if (t === "Agua" || t.toLowerCase() === "agua") return "Agua";
    if (t === "Basura" || t.toLowerCase() === "basura") return "Basura";
    return null;
  };

  const openEditPagoServicio = (p: Pago) => {
    const pid = p.pagoId;
    if (pid == null || Number.isNaN(Number(pid))) {
      toast.error("Este cobro no tiene identificador válido para editar.");
      return;
    }
    const tipo = normalizarTipoServicio(p.tipoPago);
    if (!tipo) {
      toast.error("Solo se pueden editar cobros de Luz, Agua o Basura desde aquí.");
      return;
    }
    setEditingPagoServicioId(pid);
    setEditingPagoSnapshot(p);
    setCobroServicioTipo(tipo);
    setCobroServicioForm({
      fecha: p.fechaPago ? p.fechaPago.split("T")[0] : new Date().toISOString().split("T")[0],
      monto: p.montoPagado,
      mes: p.mesPagado,
      anio: p.anioPagado,
      metodoPago: p.metodoPago || "Efectivo",
      nroComprobante: p.nroComprobante ?? "",
      banco: p.banco ?? "",
      notas: p.notas ?? "",
    });
    setIsCobroServicioModalOpen(true);
  };

  const handleSaveCobroServicio = async () => {
    if (!contractData || editingPagoServicioId == null || !editingPagoSnapshot) {
      toast.error("No hay datos de cobro para guardar.");
      return;
    }
    try {
      setIsLoading(true);
      const body = {
        pagoId: editingPagoServicioId,
        contratoId: contractData.contratoId,
        tipoPago: cobroServicioTipo,
        mesPagado: cobroServicioForm.mes,
        anioPagado: cobroServicioForm.anio,
        fechaPago: cobroServicioForm.fecha,
        montoPagado: cobroServicioForm.monto,
        metodoPago: cobroServicioForm.metodoPago,
        saldoPendiente: editingPagoSnapshot.saldoPendiente ?? 0,
        mora: editingPagoSnapshot.mora ?? 0,
        facturaEmitida: editingPagoSnapshot.facturaEmitida ?? false,
        numeroFactura: editingPagoSnapshot.numeroFactura ?? null,
        nroComprobante: cobroServicioForm.nroComprobante || null,
        banco: cobroServicioForm.banco || null,
        notas: cobroServicioForm.notas || null,
      };
      const resp = await fetch(
        `${API_BASE}/api/Contratos/pago/${editingPagoServicioId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (resp.ok) {
        toast.success("Cobro actualizado");
        setIsCobroServicioModalOpen(false);
        setEditingPagoServicioId(null);
        setEditingPagoSnapshot(null);
        await fetchContract();
        await fetchGastosServicios();
        if (onUpdate) onUpdate();
      } else {
        const err = await resp.text();
        toast.error(err || "No se pudo actualizar el cobro");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePagoServicio = (pagoId: number) => {
    setConfirmModalData({
      title: "¿Eliminar Cobro del Historial?",
      description: "Estás por eliminar este registro de cobro del historial del contrato/servicio.",
      details: [
        "El cobro se eliminará de forma permanente del historial de pagos.",
        "El saldo y el estado de la cuota correspondiente se recalcularán al instante."
      ],
      confirmText: "Sí, Eliminar Cobro",
      variant: "danger",
      onConfirm: async () => {
        setIsConfirmActionLoading(true);
        try {
          const resp = await fetch(`${API_BASE}/api/Contratos/pago/${pagoId}`, {
            method: "DELETE",
          });
          if (resp.ok) {
            toast.success("Cobro eliminado correctamente");
            await fetchContract();
            await fetchGastosServicios();
            if (onUpdate) onUpdate();
          } else toast.error("No se pudo eliminar el cobro");
        } catch {
          toast.error("Error de conexión al eliminar cobro");
        } finally {
          setIsConfirmActionLoading(false);
          setConfirmModalData(null);
        }
      }
    });
  };

    // Generar cuotas basadas en el contrato (memo: no recalcular en cada render móvil)
    const generateInstallments = () => {
      if (!contractData) return [];
      
      const installments: Installment[] = [];
      const start = new Date(contractData.fechaInicioContrato);
      const end = new Date(contractData.fechaFinContrato);
      const now = new Date();
      
      // Primer vencimiento es un mes después del inicio
      const currentVenc = new Date(start);
      currentVenc.setMonth(currentVenc.getMonth() + 1);
      
      // 1. Generamos todas las cuotas primero
      const tempInstallments: { mes: number, anio: number, fecha: Date }[] = [];
      
      let mesCounter = start.getMonth() + 1;
      let anioCounter = start.getFullYear();

      while (currentVenc < end) {
        tempInstallments.push({ 
          mes: mesCounter, 
          anio: anioCounter, 
          fecha: new Date(currentVenc) 
        });
        
        mesCounter++;
        if (mesCounter > 12) {
          mesCounter = 1;
          anioCounter++;
        }
        currentVenc.setMonth(currentVenc.getMonth() + 1);
      }
      
      // Última cuota (fecha fin)
      if (end > start) {
        tempInstallments.push({ 
          mes: mesCounter, 
          anio: anioCounter, 
          fecha: new Date(end) 
        });
      }

      // 2. Mapeamos y distribuimos los pagos reales
      // Ordenamos las cuotas de más antigua a más reciente para repartir los pagos
      tempInstallments.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

      // Creamos una copia de los pagos para ir "consumiéndolos"
      // SOLO consideramos los pagos de tipo Alquiler (o los que no tienen tipo, por compatibilidad hacia atrás)
      const pagosDisponibles = [...(contractData.pagos || [])].filter(p => !p.tipoPago || p.tipoPago === "Alquiler");

      tempInstallments.forEach(ti => {
        // Buscamos si hay un pago específico para este mes/año que aún no hayamos usado
        const pagoIdx = pagosDisponibles.findIndex(p => p.mesPagado === ti.mes && p.anioPagado === ti.anio);
        let pagado = 0;
        let pagoEncontrado: any = null;
        
        if (pagoIdx !== -1) {
          pagado = pagosDisponibles[pagoIdx].montoPagado;
          pagoEncontrado = pagosDisponibles[pagoIdx];
          pagosDisponibles.splice(pagoIdx, 1); // Lo quitamos de la lista para que no se use en la siguiente cuota del mismo mes
        }

        let estado = "Pendiente";
        if (pagado >= contractData.montoMensualAlquiler) {
          estado = "Pagado";
        } else if (now > ti.fecha) {
          estado = "Atrasado";
        }

        const dateForMonth = new Date(2000, ti.mes - 1, 1);

        installments.push({
          mes: ti.mes,
          anio: ti.anio,
          mesNombre: dateForMonth.toLocaleString('es-ES', { month: 'long' }),
          monto: contractData.montoMensualAlquiler,
          pagado: pagado,
          estado,
          fechaVencimiento: ti.fecha,
          pago: pagoEncontrado
        });
      });

      // Pagos de alquiler que no calzaron con el cronograma (p.ej. mes adelantado): igual aparecen en historial
      pagosDisponibles.forEach((p) => {
        if (!p.mesPagado || !p.anioPagado) return;
        const dateForMonth = new Date(2000, p.mesPagado - 1, 1);
        const venc = p.fechaPago ? new Date(p.fechaPago) : new Date(p.anioPagado, p.mesPagado, 1);
        installments.push({
          mes: p.mesPagado,
          anio: p.anioPagado,
          mesNombre: dateForMonth.toLocaleString("es-ES", { month: "long" }),
          monto: contractData.montoMensualAlquiler,
          pagado: p.montoPagado || 0,
          estado: "Pagado",
          fechaVencimiento: venc,
          pago: p,
        });
      });
      
      return installments.sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime());
    };

  const installments = useMemo(() => generateInstallments(), [
    contractData?.contratoId,
    contractData?.fechaInicioContrato,
    contractData?.fechaFinContrato,
    contractData?.montoMensualAlquiler,
    contractData?.pagos,
  ]);
  const nowLimit = useMemo(() => new Date(), [contractData?.contratoId, (contractData?.pagos || []).length]);
  const mesActual = nowLimit.getMonth() + 1;
  const anioActual = nowLimit.getFullYear();

  const parseFiltroFecha = (iso: string, endOfDay = false) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    if (endOfDay) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d;
  };

  const filteredInstallments = useMemo(() => {
    const contratoInactivo = contractData?.estaActivo === false;
    return installments.filter(row => {
      // Desalojo sin cobro: cuotas no pagadas salen del historial (viven en Morosidades)
      if (contratoInactivo && row.estado !== "Pagado" && !(row.pagado > 0)) {
        return false;
      }
      // Mostrar hasta el mes actual; si ya hay cobro (pagado), mostrar aunque el periodo sea futuro
      const tieneCobro = row.pagado > 0 || row.estado === "Pagado";
      if (
        !tieneCobro &&
        (row.anio > anioActual || (row.anio === anioActual && row.mes > mesActual))
      ) {
        return false;
      }
      // Filtros de fecha: no ocultar cuotas ya cobradas (p.ej. mes adelantado recién facturado)
      if (tieneCobro) return true;
      let pass = true;
      // Filtro por fechas de pago (vencimiento de cuota)
      if (filterDesde) {
        const desde = parseFiltroFecha(filterDesde);
        if (desde && row.fechaVencimiento < desde) pass = false;
      }
      if (filterHasta) {
        const hasta = parseFiltroFecha(filterHasta, true);
        if (hasta && row.fechaVencimiento > hasta) pass = false;
      }
      // Filtro por vigencia de contrato (cuotas cuyo periodo cae en el rango)
      if (filterContratoDesde) {
        const cDesde = parseFiltroFecha(filterContratoDesde);
        if (cDesde && row.fechaVencimiento < cDesde) pass = false;
      }
      if (filterContratoHasta) {
        const cHasta = parseFiltroFecha(filterContratoHasta, true);
        if (cHasta && row.fechaVencimiento > cHasta) pass = false;
      }
      return pass;
  }).sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case "fechaVencimiento":
          comparison = a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime();
          break;
        case "concepto":
          comparison = "Alquiler Mensual".localeCompare("Alquiler Mensual");
          break;
        case "periodo":
          comparison = (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes);
          break;
        case "monto":
          comparison = a.monto - b.monto;
          break;
        case "pagado":
          comparison = a.pagado - b.pagado;
          break;
        case "estado":
          comparison = a.estado.localeCompare(b.estado);
          break;
        default:
          comparison = a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime();
      }
      if (comparison === 0 && sortColumn !== "fechaVencimiento") {
        comparison = a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
  });
  }, [installments, anioActual, mesActual, filterDesde, filterHasta, filterContratoDesde, filterContratoHasta, sortColumn, sortDirection, contractData?.estaActivo]);

  const calcularDeudaAtrasada = () => {
    return installments.reduce((acc, curr) => {
      if (curr.estado === "Atrasado") {
        return acc + (curr.monto - curr.pagado);
      }
      return acc;
    }, 0);
  };

  const handleConfirmarDesalojo = async (opts?: { pasarAMorosidad?: boolean }) => {
    if (!contractData?.contratoId) {
      toast.error("No hay contrato activo para desalojar.");
      return;
    }
    const pasarAMorosidad = opts?.pasarAMorosidad !== false;
    try {
      setIsLoading(true);

      // Si hay deuda y se eligió no cobrar ahora → transferir a morosidad
      if (deudaTotalDesalojo > 0 && pasarAMorosidad) {
        const cuotasPendientes = installments.filter((i) => i.estado !== "Pagado" && i.pagado < i.monto);
        const detalleCuotas = cuotasPendientes
          .map((i) => `${i.mesNombre} ${i.anio}`)
          .join(", ");
        const bodyMora = {
          inquilinoId: contractData.inquilinoId,
          unidadId: unidad?.id,
          montoTotal: deudaTotalDesalojo,
          cantidadCuotas: desalojoForm.cantCuotas,
          observaciones:
            `${desalojoForm.observaciones || "Acuerdo de desalojo"} | Cuotas transferidas desde historial: ${detalleCuotas || "saldo pendiente"}`,
          montoInteresDiario: desalojoForm.montoInteresDiario
        };
        const resMora = await fetch(`${API_BASE}/api/Morosidad`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyMora)
        });
        if (!resMora.ok) {
            toast.error("Error al registrar morosidad");
            setIsLoading(false);
            return;
        }
      }

      const resDesalojo = await fetch(`${API_BASE}/api/Contratos/${contractData.contratoId}/desalojar`, {
          method: "POST"
      });

      if (resDesalojo.ok) {
          toast.success(
            deudaTotalDesalojo > 0 && pasarAMorosidad
              ? "Unidad desalojada. Cuotas pendientes pasaron a Morosidades (ya no figuran en historial de pagos)."
              : "Unidad desalojada. Datos guardados en Histórico."
          );
          setIsDesalojarModalOpen(false);
          pendingDesalojoTrasCobroRef.current = false;
          setPendingDesalojoTrasCobro(false);
          await fetchHistoricoContratos();
          if (onUpdate) onUpdate();
          onClose();
      } else {
          toast.error("Error al desalojar unidad");
      }
    } catch(err) {
       console.error(err);
       toast.error("Error de conexión");
    } finally {
       setIsLoading(false);
    }
  };

  const abrirCobroRestanteDesalojo = () => {
    if (!contractData?.contratoId) {
      toast.error("No se ha cargado el contrato. Esperá un momento y reintentá.");
      return;
    }
    const pendientes = installments.filter((i) => i.estado !== "Pagado");
    const list = (pendientes.length ? pendientes : installments).map((i) => ({
      mes: i.mes,
      anio: i.anio,
    }));
    const total = list.reduce((acc, p) => {
      const inst = installments.find((x) => x.mes === p.mes && x.anio === p.anio);
      return acc + (inst ? Math.max(0, inst.monto - inst.pagado) : 0);
    }, 0);
    setPaymentForm((prev) => ({
      ...prev,
      mesesSeleccionados: list.length ? list : prev.mesesSeleccionados,
      mes: list[0]?.mes || prev.mes,
      anio: list[0]?.anio || prev.anio,
      monto: total || deudaTotalDesalojo || prev.monto,
      notas: "Cobro restante previo a desalojo",
    }));
    pendingDesalojoTrasCobroRef.current = true;
    setPendingDesalojoTrasCobro(true);
    isRegisteringPaymentRef.current = true;
    setIsRegisteringPayment(true);
    setIsDesalojarModalOpen(false);
  };

  const dataUnidad = {
    codigo: localCodigoUnidad || unidad?.code || "N/A",
    condominio: unidad?.condo || "Agus",
    estado: unidad?.status || "Ocupado",
    nisAnde: (localNisAnde || unidad?.nisAnde || "").trim() || "—",
    medidorAgua: unidad?.medidorAgua?.trim() || "—",
    observaciones: unidad?.observaciones?.trim() || "Sin observaciones cargadas.",
  };

  const gastosLuz = useMemo(
    () => gastosServicios.filter((g) => g.tipoServicio === "Luz"),
    [gastosServicios]
  );
  const gastosAgua = useMemo(
    () => gastosServicios.filter((g) => g.tipoServicio === "Agua"),
    [gastosServicios]
  );
  const gastosBasura = useMemo(
    () => gastosServicios.filter((g) => g.tipoServicio === "Basura"),
    [gastosServicios]
  );

  const pagosContrato = contractData?.pagos ?? [];

  const pagoCoincideTipo = (p: Pago, tipo: ServicioTipoCard) => {
    const t = (p.tipoPago || "").trim();
    return t === tipo || t.toLowerCase() === tipo.toLowerCase();
  };

  const periodoDesdeFechaAnde = (raw: string) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return `${d.getMonth() + 1}/${d.getFullYear()}`;
    const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return `${Number(m[2])}/${m[3]}`;
    const iso = raw.match(/(\d{4})-(\d{2})/);
    if (iso) return `${Number(iso[2])}/${iso[1]}`;
    return raw;
  };

  /** Igual que en facturación: cobros con concepto Luz/Agua/Basura + gastos de unidad en GastosMantenimiento. */
  const combinarFilasServicio = (tipo: ServicioTipoCard, gastosTipo: GastoServicio[]): FilaServicioMantenimiento[] => {
    const nisActual = dataUnidad.nisAnde;
    const fromGasto: FilaServicioMantenimiento[] = gastosTipo
      .filter((g) => {
        if (tipo !== "Luz") return true;
        const id = (g.identificadorServicio || "").trim();
        if (!id || !nisActual || nisActual === "—") return true;
        return id === nisActual;
      })
      .map((g) => ({
        id: `gasto-${g.gastoId}`,
        fechaMs: new Date(g.fecha).getTime(),
        fechaLabel: new Date(g.fecha).toLocaleString("es-PY", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        periodoLabel:
          g.mesReferencia && g.anioReferencia ? `${g.mesReferencia}/${g.anioReferencia}` : "—",
        monto: g.monto,
        origen: "gasto" as const,
        gasto: g,
      }));
    const fromCobro: FilaServicioMantenimiento[] = pagosContrato
      .filter((p) => pagoCoincideTipo(p, tipo))
      .map((p, idx) => ({
        id: `pago-${p.pagoId ?? `noid`}-${idx}-${p.fechaPago}-${p.mesPagado}-${p.anioPagado}`,
        fechaMs: new Date(p.fechaPago).getTime(),
        fechaLabel: new Date(p.fechaPago).toLocaleString("es-PY", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        periodoLabel: `${p.mesPagado}/${p.anioPagado}`,
        monto: p.montoPagado,
        origen: "cobro" as const,
        pago: p,
      }));
    return [...fromGasto, ...fromCobro].sort((a, b) => b.fechaMs - a.fechaMs);
  };

  const filasLuzSistema = combinarFilasServicio("Luz", gastosLuz);
  const filasAndeLuz: FilaServicioMantenimiento[] = (andeLuzConsulta?.facturas || []).map((f, idx) => {
    const fechaRaw = f.emision || f.vencimiento || andeLuzConsulta?.fechaConsulta || "";
    const d = new Date(fechaRaw);
    const fechaMs = Number.isNaN(d.getTime()) ? Date.now() - idx : d.getTime();
    return {
      id: `ande-${idx}-${f.monto}-${f.emision}-${f.vencimiento}`,
      fechaMs,
      fechaLabel: Number.isNaN(d.getTime())
        ? fechaRaw || "—"
        : d.toLocaleString("es-PY", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
      periodoLabel: periodoDesdeFechaAnde(f.emision || f.vencimiento),
      monto: f.monto,
      origen: "ande" as const,
      estadoAnde: f.estado,
    };
  }).sort((a, b) => b.fechaMs - a.fechaMs);

  // Prioridad: facturas reales ANDE; si aún no consultó, historial del sistema (cobros/gastos del NIS)
  const filasLuz = filasAndeLuz.length > 0 ? filasAndeLuz : filasLuzSistema;
  const filasAgua = combinarFilasServicio("Agua", gastosAgua);
  const filasBasura = combinarFilasServicio("Basura", gastosBasura);

  const mapFilaMantenimiento = (
    row: FilaServicioMantenimiento,
    servicio: string
  ): ExpedienteUnidadPrintData["mantenimiento"][number] => ({
    fecha: formatFechaCorta(row.fechaLabel) || row.fechaLabel,
    periodo: row.periodoLabel,
    origen:
      row.origen === "ande"
        ? `${servicio} · ANDE`
        : row.origen === "cobro"
          ? `${servicio} · Cobro`
          : `${servicio} · Gasto`,
    monto: row.monto,
    estado:
      row.origen === "ande"
        ? /pendiente/i.test(row.estadoAnde || "")
          ? "Pendiente"
          : /pagad|cobrad/i.test(row.estadoAnde || "")
            ? "Pagado"
            : row.estadoAnde || "—"
        : "Registrado",
  });

  const handleOpenExpedientePdfModal = () => {
    setExpedienteSecciones({
      historialPagos: true,
      mantenimiento: false,
      comprobantes: true,
    });
    setShowExpedienteSeccionesModal(true);
  };

  const handleExportExpedientePdf = async (secciones: ExpedienteSeccionesPrint) => {
    if (!secciones.historialPagos && !secciones.comprobantes) {
      toast.error("Seleccioná al menos una sección para imprimir.");
      return;
    }

    setIsPreparingExpediente(true);
    try {
      toast.info("Preparando expediente PDF…");
      if (unidad?.id && unidad.id > 0) {
        await fetchGastosServicios();
      }

      const historialPagos = secciones.historialPagos
        ? installments.map((row) => ({
            fecha: formatFechaCorta(row.fechaVencimiento),
            periodo: `${row.mesNombre} ${row.anio}`,
            concepto: "Alquiler mensual",
            monto: row.monto,
            estado: row.estado,
            metodo: row.pago?.metodoPago,
          }))
        : [];

      const mantenimiento = secciones.mantenimiento
        ? [
            ...filasLuz.map((r) => mapFilaMantenimiento(r, "Luz")),
            ...filasAgua.map((r) => mapFilaMantenimiento(r, "Agua")),
            ...filasBasura.map((r) => mapFilaMantenimiento(r, "Basura")),
          ]
        : [];

      const comprobantes: ExpedienteUnidadPrintData["comprobantes"] = [];
      if (secciones.comprobantes) {
        const pushPagos = (c: Contrato | any) => {
          if (!c?.pagos?.length) return;
          for (const p of c.pagos as Pago[]) {
            comprobantes.push({
              tipo: p.facturaEmitida ? "Factura" : "Recibo",
              fecha: formatFechaCorta(p.fechaPago),
              numero: p.numeroFactura || p.nroComprobante || `Pago #${p.pagoId ?? "—"}`,
              periodo: `${String(p.mesPagado).padStart(2, "0")}/${p.anioPagado}`,
              monto: p.montoPagado,
            });
          }
        };
        if (contractData) pushPagos(contractData);
        (historicoContratos || []).forEach(pushPagos);
        comprobantes.sort((a, b) => {
          const da = a.fecha.split("/").reverse().join("-");
          const db = b.fecha.split("/").reverse().join("-");
          return db.localeCompare(da);
        });
      }

      const ahora = new Date();
      const hora = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;

      const payload: ExpedienteUnidadPrintData = {
        fechaEmision: `${formatFechaCorta(ahora)} ${hora}`,
        condominio: dataUnidad.condominio,
        duplex: formatCodigoFicha(dataUnidad.codigo),
        nisAnde: dataUnidad.nisAnde,
        estadoUnidad: dataUnidad.estado,
        inquilino: {
          nombre: dataInquilino.nombre,
          cedula: dataInquilino.cedula,
          telefono: dataInquilino.telefono,
          correo: dataInquilino.correo,
          fechaIngreso: formatFechaCorta(contractData?.fechaIngreso) || dataInquilino.fechaIngreso,
          contratoInicio:
            formatFechaCorta(contractData?.fechaInicioContrato) || dataInquilino.fechaInicioContrato,
          contratoFin:
            formatFechaCorta(contractData?.fechaFinContrato) || dataInquilino.fechaFinContrato,
          alquiler: dataInquilino.montoMensual,
          garantia: dataInquilino.garantia,
          ocupantes: dataInquilino.ocupantes,
          vehiculo: dataInquilino.vehiculo,
          servicios: dataInquilino.serviciosIncluidos,
          observaciones: dataInquilino.observaciones,
        },
        historialPagos,
        mantenimiento,
        comprobantes,
        secciones,
      };

      setShowExpedienteSeccionesModal(false);
      setExpedientePrintData(payload);
      setIsPrintingExpediente(true);
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setIsPrintingExpediente(false);
          setExpedientePrintData(null);
        }, 800);
      }, 400);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el expediente PDF.");
    } finally {
      setIsPreparingExpediente(false);
    }
  };

  const handlePrintHistorialPagos = () => {
    const errors: {
      pagoDesde?: string;
      pagoHasta?: string;
      contratoDesde?: string;
      contratoHasta?: string;
    } = {};

    if (!filterDesde) errors.pagoDesde = "Completá «Pago desde» para filtrar el historial.";
    if (!filterHasta) errors.pagoHasta = "Completá «Pago hasta» para filtrar el historial.";
    if (filterDesde && filterHasta && filterDesde > filterHasta) {
      errors.pagoHasta = "«Pago hasta» debe ser igual o posterior a «Pago desde».";
    }

    // Si se usa filtro de contrato, exigir el par completo y rango válido
    if (filterContratoDesde || filterContratoHasta) {
      if (!filterContratoDesde) {
        errors.contratoDesde = "Completá «Contrato inicio» o limpiá el filtro de contrato.";
      }
      if (!filterContratoHasta) {
        errors.contratoHasta = "Completá «Contrato fin» o limpiá el filtro de contrato.";
      }
      if (filterContratoDesde && filterContratoHasta && filterContratoDesde > filterContratoHasta) {
        errors.contratoHasta = "«Contrato fin» debe ser igual o posterior a «Contrato inicio».";
      }
    }

    if (Object.keys(errors).length > 0) {
      setHistorialFilterErrors(errors);
      const firstMsg =
        errors.pagoDesde ||
        errors.pagoHasta ||
        errors.contratoDesde ||
        errors.contratoHasta ||
        "Revisá los filtros de fechas.";
      toast.error("Faltan filtros para imprimir el historial", {
        description: firstMsg,
        duration: 4500,
      });
      refFiltrosHistorial.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        if (errors.pagoDesde) refPagoDesde.current?.focus();
        else if (errors.pagoHasta) refPagoHasta.current?.focus();
        else if (errors.contratoDesde) refContratoDesde.current?.focus();
        else if (errors.contratoHasta) refContratoHasta.current?.focus();
      }, 280);
      return;
    }

    setHistorialFilterErrors({});

    if (filteredInstallments.length === 0) {
      toast.error("No hay cuotas con esos filtros", {
        description: "Ampliá el rango de fechas o limpiá filtros e intentá de nuevo.",
      });
      refFiltrosHistorial.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      refPagoDesde.current?.focus();
      return;
    }

    const payload: HistorialPagosPrintData = {
      fechaEmision: new Date().toLocaleString("es-PY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      condominio: dataUnidad.condominio,
      duplex: formatCodigoFicha(dataUnidad.codigo),
      filtroPagoDesde: filterDesde || undefined,
      filtroPagoHasta: filterHasta || undefined,
      filtroContratoDesde: filterContratoDesde || undefined,
      filtroContratoHasta: filterContratoHasta || undefined,
      inquilino: {
        nombre: dataInquilino.nombre,
        cedula: dataInquilino.cedula,
        telefono: dataInquilino.telefono,
        correo: dataInquilino.correo,
        contratoInicio: dataInquilino.fechaInicioContrato,
        contratoFin: dataInquilino.fechaFinContrato,
        alquiler: dataInquilino.montoMensual,
      },
      filas: filteredInstallments.map((row) => ({
        fechaVencimiento: row.fechaVencimiento.toLocaleDateString("es-PY"),
        concepto: "Alquiler mensual",
        periodo: `${row.mesNombre} ${row.anio}`,
        monto: row.monto,
        pagado: row.pagado,
        estado: row.estado,
        metodo: row.pago?.metodoPago,
      })),
    };
    setHistorialPrintData(payload);
    setIsPrintingHistorial(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingHistorial(false);
        setHistorialPrintData(null);
      }, 800);
    }, 400);
  };

  const renderTablaFilasServicio = (filas: FilaServicioMantenimiento[]) => {
    if ((loadingGastos || loadingAndeLuz) && filas.length === 0) {
      return (
        <p className="text-[10px] text-muted-foreground font-bold italic py-2">Cargando registros...</p>
      );
    }
    if (filas.length === 0) {
      return (
        <p className="text-[10px] text-muted-foreground font-bold italic py-2">
          Sin montos de este NIS. Pulsá &quot;Consultar ANDE&quot; o cargá un recibo.
        </p>
      );
    }
    return (
      <div className="mt-3 rounded-xl border border-border overflow-hidden max-h-56 overflow-y-auto">
        <Table>
          <TableHeader className="bg-muted/80 sticky top-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[8px] font-black uppercase text-muted-foreground h-8 px-2">Origen</TableHead>
              <TableHead className="text-[8px] font-black uppercase text-muted-foreground h-8 px-2">Fecha</TableHead>
              <TableHead className="text-[8px] font-black uppercase text-muted-foreground h-8 px-2">Periodo</TableHead>
              <TableHead className="text-[8px] font-black uppercase text-muted-foreground h-8 px-2 text-right">Monto</TableHead>
              <TableHead className="text-[8px] font-black uppercase text-muted-foreground h-8 px-2 text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((row) => {
              const pendiente = row.origen === "ande" && /pendiente/i.test(row.estadoAnde || "");
              const pagado = row.origen === "ande" && /pagad|cobrad/i.test(row.estadoAnde || "");
              return (
                <TableRow key={row.id} className="border-slate-50">
                  <TableCell className="px-2 py-2">
                    <Badge
                      variant="outline"
                      className={`text-[7px] font-black uppercase border-none px-1.5 py-0 ${
                        row.origen === "ande"
                          ? "bg-blue-50 text-blue-700"
                          : row.origen === "cobro"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.origen === "ande" ? "ANDE" : row.origen === "cobro" ? "Cobro" : "Gasto unidad"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[9px] font-bold text-muted-foreground px-2 py-2">{row.fechaLabel}</TableCell>
                  <TableCell className="text-[9px] font-bold text-muted-foreground px-2 py-2">{row.periodoLabel}</TableCell>
                  <TableCell className="text-[9px] font-black text-foreground text-right px-2 py-2">
                    {formatCurrency(row.monto)}
                  </TableCell>
                  <TableCell className="px-2 py-2 text-center">
                    {row.origen === "ande" ? (
                      <span
                        className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                          pendiente
                            ? "bg-amber-100 text-amber-800"
                            : pagado
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pendiente ? "Pendiente" : pagado ? "Pagado" : row.estadoAnde || "—"}
                      </span>
                    ) : (
                      <span className="text-[7px] font-bold text-muted-foreground">Registrado</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        data-scroll="internal"
        className="flex max-h-[min(94vh,920px)] w-[min(96vw,1320px)] max-w-[1320px] flex-col gap-0 overflow-hidden border-none p-0 shadow-2xl rounded-[2rem] bg-card sm:max-w-[1320px]"
      >
        {/* Accesibilidad: Título para lectores de pantalla */}
        <DialogHeader className="sr-only">
          <DialogTitle>Detalle de la Unidad {unidad?.code}</DialogTitle>
        </DialogHeader>

        {/* relative solo en wrapper interno: no pisar fixed/centrado del Dialog */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Confirmación Sí/No dentro de la ficha (evita toast/Sonner bloqueado por el Dialog) */}
        {showSaveOnCloseConfirm && (
          <div
            className="absolute inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ficha-save-close-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-[420px] rounded-[1.75rem] border border-border bg-card p-6 sm:p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="ficha-save-close-title"
                    className="text-lg font-black italic uppercase tracking-tighter text-foreground"
                  >
                    ¿Desea guardar los cambios?
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    <span className="font-bold text-foreground">Sí:</span> guarda una ficha incompleta para continuar después.
                    {" "}
                    <span className="font-bold text-foreground">No:</span> descarta lo editado en esta sesión.
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-6">
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingIncompleteOnClose}
                  onClick={handleDiscardAndClose}
                  className="h-11 rounded-xl font-bold"
                >
                  No
                </Button>
                <Button
                  type="button"
                  disabled={savingIncompleteOnClose}
                  onClick={() => void handleConfirmSaveIncomplete()}
                  className="h-11 rounded-xl font-black italic bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {savingIncompleteOnClose ? "Guardando…" : "Sí, guardar incompleta"}
                </Button>
              </div>
            </div>
          </div>
        )}

          
          {/* HEADER PREMIUM (INQUILINO) */}
          <div className="bg-secondary p-4 sm:p-6 lg:p-8 text-foreground relative shrink-0 border-b border-border">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
            
            <div className="flex flex-col gap-4 xl:flex-row xl:justify-between xl:items-start relative z-10 min-w-0">
              <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0 flex-1 xl:pr-4">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center font-black text-2xl sm:text-3xl shadow-xl shadow-primary/20 shrink-0">
                  {(dataInquilino.nombre || "D").substring(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-primary/10 text-primary font-black italic rounded-lg px-2 py-0.5 text-[10px] uppercase tracking-wider border-none">
                      Ficha de Inquilino
                    </Badge>
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Unidad {formatCodigoFicha(dataUnidad.codigo)}</span>
                  </div>
                  {(isEditing || isContratando) ? (
                    <Input 
                        data-ficha-campo="nombre"
                        value={contractData?.inquilino?.razonSocial || ""}
                        onChange={(e) => setContractData(prev => prev ? { ...prev, inquilino: { ...prev.inquilino, razonSocial: e.target.value } } : null)}
                        placeholder="NOMBRE DEL INQUILINO"
                        className="bg-card/50 border-white text-xl sm:text-2xl font-black italic uppercase tracking-tighter h-11 w-full max-w-xl text-foreground placeholder:text-muted-foreground"
                    />
                  ) : (
                    <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-[2rem] font-black italic uppercase tracking-tighter leading-snug text-foreground break-words">
                        {dataInquilino.nombre}
                    </h2>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> {dataInquilino.fechaIngreso}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                        <Users className="w-3.5 h-3.5 text-primary" /> {dataInquilino.ocupantes} Ocupantes
                    </div>
                    
                    {/* ALERTAS OIMA DINÃMICAS */}
                    {!isEditing && contractData && (
                        <div className="flex flex-wrap gap-2">
                            {(() => {
                                try {
                                const hoy = new Date();
                                const fin = new Date(contractData.fechaFinContrato);
                                const nextPending = installments.slice().reverse().find(i => i.estado !== "Pagado");
                                const proximoVencimiento = nextPending ? nextPending.fechaVencimiento : (installments[0]?.fechaVencimiento || null);
                                const diasParaFin = Number.isNaN(fin.getTime())
                                  ? null
                                  : (fin.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
                                
                                return (
                                    <>
                                        {proximoVencimiento && hoy > proximoVencimiento && nextPending?.estado === "Atrasado" ? (
                                            <Badge className="bg-red-100 text-red-700 border-none font-black text-[8px] uppercase px-2 shadow-sm">
                                                Alquiler Vencido (Desde {proximoVencimiento.toLocaleDateString()})
                                            </Badge>
                                        ) : proximoVencimiento ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[8px] uppercase px-2 shadow-sm">
                                                Al Día (Próx. Venc: {proximoVencimiento.toLocaleDateString()})
                                            </Badge>
                                        ) : null}
                                        
                                        {diasParaFin != null && diasParaFin > 0 && diasParaFin < 30 && (
                                            <Badge className="bg-orange-100 text-orange-700 border-none font-black text-[8px] uppercase px-2 shadow-sm">
                                                Contrato expira en {Math.round(diasParaFin)} días
                                            </Badge>
                                        )}
                                    </>
                                );
                                } catch {
                                  return null;
                                }
                            })()}
                        </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTONES: 2 filas fijas para no tapar el nombre del inquilino */}
              <div className="flex flex-col gap-2 w-full lg:w-auto lg:max-w-[34rem] shrink-0">
                {isRenewing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => { setIsRenewing(false); setIsEditing(false); }} className="bg-card border-border text-muted-foreground font-bold rounded-xl px-3 h-10 text-[10px] sm:text-xs">
                        <X className="w-4 h-4 mr-1.5 shrink-0" /> CANCELAR
                    </Button>
                    <Button id={FICHA_SAVE_BTN_ID} onClick={handleRenovarContrato} className="bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl px-3 h-10 shadow-lg shadow-blue-500/20 text-[10px] sm:text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400">
                        <Save className="w-4 h-4 mr-1.5 shrink-0" /> RENOVAR
                    </Button>
                  </div>
                ) : isContratando ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setIsContratando(false)} className="bg-card border-border text-muted-foreground font-bold rounded-xl px-3 h-10 text-[10px] sm:text-xs col-span-2 sm:col-span-1">
                        <X className="w-4 h-4 mr-1.5 shrink-0" /> CANCELAR
                    </Button>
                    <Button onClick={handlePrintContract} className="bg-primary text-primary-foreground font-black italic rounded-xl px-3 h-10 shadow-lg shadow-primary/20 text-[10px] sm:text-xs">
                        <Printer className="w-4 h-4 mr-1.5 shrink-0" /> IMPR. CONTRATO
                    </Button>
                    <Button id={FICHA_SAVE_BTN_ID} onClick={handleContratar} className="bg-emerald-600 text-white font-black italic rounded-xl px-3 h-10 shadow-lg shadow-emerald-200 text-[10px] sm:text-xs col-span-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400">
                        <Save className="w-4 h-4 mr-1.5 shrink-0" /> GUARDAR CONTRATO
                    </Button>
                  </div>
                ) : isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        void fetchContract();
                      }}
                      className="bg-card border-border text-muted-foreground font-bold rounded-xl px-3 h-10 text-[10px] sm:text-xs"
                    >
                        <X className="w-4 h-4 mr-1.5 shrink-0" /> CANCELAR
                    </Button>
                    <Button
                      id={FICHA_SAVE_BTN_ID}
                      onClick={handleUpdate}
                      className="bg-emerald-600 text-white font-black italic rounded-xl px-3 h-10 shadow-lg shadow-emerald-200 text-[10px] sm:text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400"
                    >
                        <Save className="w-4 h-4 mr-1.5 shrink-0" /> GUARDAR CAMBIOS
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Fila 1 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {contractData && dataUnidad.estado !== "Disponible" ? (
                        <>
                          <Button onClick={openGenerarContratoModal} variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 font-black italic rounded-xl px-2.5 h-10 hover:bg-amber-100 shadow-sm text-[9px] sm:text-[10px]">
                              <FileText className="w-3.5 h-3.5 mr-1 shrink-0" /> GENERAR CONTRATO
                          </Button>
                          <Button onClick={handleCompartirWhatsAppFicha} variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-black italic rounded-xl px-2.5 h-10 hover:bg-emerald-100 shadow-sm text-[9px] sm:text-[10px]">
                              <Phone className="w-3.5 h-3.5 mr-1 shrink-0" /> WHATSAPP
                          </Button>
                          <Button onClick={() => setIsEditing(true)} variant="outline" className="bg-card border-border text-foreground font-bold rounded-xl px-2.5 h-10 hover:bg-muted text-[9px] sm:text-[10px] col-span-2 sm:col-span-1">
                              <Pencil className="w-3.5 h-3.5 mr-1 shrink-0" /> EDITAR FICHA
                          </Button>
                        </>
                      ) : (
                        <Button 
                            onClick={handleStartContratar} 
                            className="bg-emerald-600 text-white font-black italic rounded-xl px-3 h-10 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-[10px] sm:text-xs col-span-2 sm:col-span-3"
                        >
                            <Plus className="w-4 h-4 mr-1.5 shrink-0" /> CONTRATAR
                        </Button>
                      )}
                    </div>
                    {/* Fila 2 */}
                    <div className="grid grid-cols-2 gap-2">
                      {contractData && dataUnidad.estado !== "Disponible" && (
                        <Button 
                            onClick={() => {
                                const deuda = calcularDeudaAtrasada();
                                setDeudaTotalDesalojo(deuda);
                                setIsDesalojarModalOpen(true);
                            }}
                            className="bg-red-600 text-white font-black italic rounded-xl px-2.5 h-10 hover:bg-red-700 shadow-lg shadow-red-500/20 text-[9px] sm:text-[10px]"
                        >
                            <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" /> DESALOJAR
                        </Button>
                      )}
                      <Button
                        onClick={handleOpenExpedientePdfModal}
                        className={`bg-primary text-primary-foreground font-black italic rounded-xl px-2.5 h-10 shadow-lg shadow-primary/20 text-[9px] sm:text-[10px] ${
                          !(contractData && dataUnidad.estado !== "Disponible") ? "col-span-2" : ""
                        }`}
                      >
                          <Download className="w-3.5 h-3.5 mr-1 shrink-0" /> EXP. PDF
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* TABS SELECTOR */}
            <div className="mobile-tabs-scroll mt-8 sm:mt-10 border-b border-white/5 gap-5 sm:gap-8">
              {([
                { id: "ficha", label: "Ficha Detallada", icon: Info },
                { id: "pagos", label: "Historial Pagos", icon: DollarSign },
                { id: "documentos", label: "Documentos", icon: FileText },
                { id: "comprobantes", label: "Facturas y Recibos", icon: Receipt }
              ] as const).map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 sm:pb-4 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <tab.icon className="w-3 h-3 shrink-0" />
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 bg-muted">
            
            {activeTab === "ficha" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* COLUMNA IZQUIERDA: DATOS INQUILINO */}
                <div className="md:col-span-7 space-y-8">
                    <section className="bg-card p-8 rounded-[2rem] shadow-sm border border-border">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <h3 className="font-black italic uppercase text-foreground tracking-tighter">Información del Inquilino</h3>
                            </div>
                            {(isEditing || isContratando) && (
                              <div>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  id="scan-contract-file-modal" 
                                  accept=".pdf,image/*"
                                  onChange={handleFileScan}
                                  disabled={isScanning}
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  className="h-10 px-4 rounded-xl border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50 text-blue-600 font-bold text-xs flex items-center gap-2"
                                  onClick={() => document.getElementById("scan-contract-file-modal")?.click()}
                                  disabled={isScanning}
                                >
                                  <UploadCloud className="w-4 h-4" /> 
                                  {isScanning ? "Procesando..." : "Escanear Contrato"}
                                </Button>
                              </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                            {([
                                { label: "Cédula", value: dataInquilino.cedula, key: "documento", parent: "inquilino" },
                                { label: "Teléfono", value: dataInquilino.telefono, key: "telefono", parent: "inquilino" },
                                { label: "Correo Electrónico", value: dataInquilino.correo, key: "email", parent: "inquilino" },
                                { label: "Monto Alquiler", value: dataInquilino.montoMensual, key: "montoMensualAlquiler", type: "text", highlight: "text-blue-600" },
                                { label: "Depósito / Garantía", value: dataInquilino.garantia, key: "depositoGarantia", type: "text" },
                                { label: "Vehículo", value: dataInquilino.vehiculo, key: "vehiculoInfo", icon: Car },
                                { label: "Contrato Inicio", value: contractData?.fechaInicioContrato ? formatFechaCorta(contractData.fechaInicioContrato) : "", key: "fechaInicioContrato", type: "date" },
                                { label: "Contrato Fin", value: contractData?.fechaFinContrato ? formatFechaCorta(contractData.fechaFinContrato) : "", key: "fechaFinContrato", type: "date", highlight: "text-orange-600" },
                            ] as EditItem[]).map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{item.label}</p>
                                    <div className="flex items-center gap-2">
                                        {item.icon && <item.icon className="w-3 h-3 text-muted-foreground" />}
                                        {(isEditing || isContratando) ? (
                                            <Input 
                                                data-ficha-campo={item.key}
                                                type={item.type || "text"}
                                                inputMode={(item.label.includes("Monto") || item.label.includes("Garantía")) ? "numeric" : undefined}
                                                value={
                                                    item.type === "date" 
                                                    ? (((item.parent ? (contractData?.[item.parent] as Persona)?.[item.key] : (contractData as Record<string, unknown>)?.[item.key]) as string)?.split('T')[0] ?? "")
                                                    : (((item.parent ? (contractData?.[item.parent] as Persona)?.[item.key] : (contractData as Record<string, unknown>)?.[item.key]) ?? "") as string | number)
                                                }
                                                onChange={(e) => {
                                                    let val: string | number = e.target.value;
                                                    //const val = item.type === "number" ? Number(e.target.value) : e.target.value;
                                                    // LÓGICA DE LIBERTAD PARA CAMPOS NUMÉRICOS
                                                    if (item.label.includes("Monto") || item.label.includes("Garantía")) {
                                                        // Limpiamos todo lo que no sea número
                                                        const cleanVal = val.replace(/\D/g, "");
                                                        // Guardamos como número para la base de datos
                                                        val = cleanVal === "" ? 0 : Number(cleanVal);
                                                    }
                                                    setContractData(prev => {
                                                        if (!prev) return null;
                                                        if (item.parent === "inquilino") {
                                                            return {
                                                                ...prev,
                                                                inquilino: { ...prev.inquilino, [item.key]: val }
                                                            };
                                                        }
                                                        return { ...prev, [item.key]: val };
                                                    });
                                                }}
                                                className="h-8 rounded-lg border-border font-bold text-xs"
                                            />
                                        ) : (
                                            <p className={`text-sm font-black italic ${item.type === "date" ? "normal-case" : "uppercase"} ${item.highlight || 'text-foreground'}`}>
                                                {/*item.type === "number" ? formatCurrency(item.value as number) : (item.value || "N/A")*/
                                                  (item.label.includes("Monto") || item.label.includes("Garantía")) ? formatCurrency(item.value as number) : (item.value || "N/A")
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50">
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-2">Observaciones</p>
                                {(isEditing || isContratando) ? (
                                    <textarea 
                                        className="w-full rounded-2xl border-border bg-muted p-4 text-xs font-bold text-muted-foreground italic min-h-[100px] focus:bg-card outline-none"
                                        value={contractData?.observaciones || ""}
                                        onChange={(e) => setContractData(prev => prev ? { ...prev, observaciones: e.target.value } : null)}
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">{dataInquilino.observaciones || "Sin observaciones"}</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* COLUMNA DERECHA: DATOS UNIDAD */}
                <div className="md:col-span-5 space-y-8">
                    <section className="bg-card p-8 rounded-[2.5rem] shadow-xl shadow-primary/5 relative overflow-hidden border border-border">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                        
                        <div className="flex items-center gap-2 mb-8">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <Home className="w-5 h-5" />
                            </div>
                            <h3 className="font-black italic uppercase text-foreground tracking-tighter">Detalles de la Unidad</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-border pb-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Código Dúplex</p>
                                    {(isEditing || isContratando) ? (
                                      <Input
                                        value={localCodigoUnidad}
                                        onChange={(e) => setLocalCodigoUnidad(e.target.value)}
                                        className="h-10 text-xl font-black italic text-primary max-w-[220px]"
                                      />
                                    ) : (
                                      <p className="text-3xl font-black italic text-primary">{formatCodigoFicha(dataUnidad.codigo)}</p>
                                    )}
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Estado Actual</p>
                                    <Badge className={`${
                                        dataUnidad.estado === 'Disponible' ? 'bg-emerald-500' : 
                                        dataUnidad.estado === 'Reparacion' ? 'bg-orange-500' : 'bg-primary'
                                    } text-white font-black italic text-[10px] uppercase rounded-lg border-none`}>
                                        {dataUnidad.estado}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-secondary p-4 rounded-2xl flex items-center justify-between border border-border">
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-4 h-4 text-orange-400" />
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">NIS ANDE</p>
                                    </div>
                                    {(isEditing || isContratando) ? (
                                        <Input 
                                            value={localNisAnde} 
                                            onChange={(e) => setLocalNisAnde(normalizeNisValue(e.target.value))} 
                                            className="h-8 w-32 text-right font-black italic text-foreground"
                                            inputMode="numeric"
                                            placeholder="Ej. 3070876"
                                        />
                                    ) : (
                                        <p className="text-sm font-black italic text-foreground">{normalizeNisValue(localNisAnde) || "—"}</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-secondary p-5 rounded-3xl border border-border">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
                                    <Info className="w-3 h-3" /> Notas de la Unidad
                                </p>
                                <p className="text-xs font-bold text-muted-foreground italic leading-relaxed">{dataUnidad.observaciones}</p>
                            </div>
                        </div>
                    </section>
                </div>

              </div>
            )}

            {activeTab === "pagos" && (
                <div className="animate-in fade-in duration-500 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-card p-4 sm:p-6 rounded-[2rem] shadow-sm border border-border">
                        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                            <div className="bg-blue-50 p-3 sm:p-4 rounded-2xl text-blue-600 shrink-0">
                                <DollarSign className="w-7 h-7 sm:w-8 sm:h-8" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-foreground">Control de Pagos</h3>
                                <p className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">Historial completo del inquilino</p>
                            </div>
                        </div>
                        <div className="flex flex-col xs:flex-row flex-wrap gap-2 w-full sm:w-auto">
                            <Button 
                                onClick={handlePrintHistorialPagos}
                                variant="outline"
                                className="bg-card text-foreground border-border font-black italic rounded-xl px-4 h-12 hover:bg-muted transition-all flex items-center justify-center w-full sm:w-auto min-h-11 touch-manipulation"
                            >
                                <Printer className="w-4 h-4 mr-2" /> IMPRIMIR HISTORIAL
                            </Button>
                            <Button
                                onClick={() => {
                                    const verif = verificarPermisoGranular("condo_registrar_pago");
                                    if (!verif.permitido) {
                                        setAlertaRestriccion({
                                            visible: true,
                                            mensaje: verif.mensaje,
                                            permisoNombre: verif.permisoNombre || "Registrar Cobro de Alquiler / Cuota"
                                        });
                                        return;
                                    }
                                    const nextDue = installments.find(i => i.estado !== "Pagado") || installments[0];
                                    const mes0 = nextDue?.mes || new Date().getMonth() + 1;
                                    const anio0 = nextDue?.anio || new Date().getFullYear();
                                    setPaymentForm(prev => ({
                                        ...prev,
                                        monto: nextDue ? (nextDue.monto - nextDue.pagado) : contractData?.montoMensualAlquiler || 0,
                                        mes: mes0,
                                        anio: anio0,
                                        mesesSeleccionados: [{ mes: mes0, anio: anio0 }],
                                    }));
                                    pendingDesalojoTrasCobroRef.current = false;
                                    setPendingDesalojoTrasCobro(false);
                                    isRegisteringPaymentRef.current = true;
                                    setIsRegisteringPayment(true);
                                }}
                                className="bg-slate-900 text-white font-black italic rounded-xl px-6 sm:px-8 h-12 shadow-xl hover:scale-105 transition-all w-full sm:w-auto min-h-11 touch-manipulation"
                            >
                               REGISTRAR COBRO
                            </Button>
                        </div>
                    </div>

                    <div
                      ref={refFiltrosHistorial}
                      className={`flex flex-wrap gap-4 items-end bg-card p-4 rounded-[2rem] border shadow-sm print:hidden transition-colors ${
                        Object.keys(historialFilterErrors).length > 0
                          ? "border-red-400 ring-2 ring-red-400/40"
                          : "border-border"
                      }`}
                    >
                        <div className="flex flex-wrap gap-3 items-end pr-0 sm:pr-4 sm:border-r border-border w-full sm:w-auto">
                          <p className="w-full text-[9px] font-black uppercase tracking-widest text-primary mb-0">
                            Filtro pagos <span className="text-red-500 normal-case tracking-normal">(obligatorio para imprimir)</span>
                          </p>
                          <div className="space-y-1 min-w-[140px] flex-1 sm:flex-none">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pago desde *</label>
                              <Input 
                                  ref={refPagoDesde}
                                  type="date" 
                                  value={filterDesde} 
                                  onChange={(e) => {
                                    setFilterDesde(e.target.value);
                                    setHistorialFilterErrors((prev) => ({ ...prev, pagoDesde: undefined }));
                                  }} 
                                  aria-invalid={!!historialFilterErrors.pagoDesde}
                                  className={`bg-muted border-none rounded-xl h-11 font-bold touch-manipulation ${
                                    historialFilterErrors.pagoDesde ? "ring-2 ring-red-500 bg-red-50" : ""
                                  }`}
                              />
                              {historialFilterErrors.pagoDesde && (
                                <p className="text-[10px] font-bold text-red-600 leading-snug">{historialFilterErrors.pagoDesde}</p>
                              )}
                          </div>
                          <div className="space-y-1 min-w-[140px] flex-1 sm:flex-none">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pago hasta *</label>
                              <Input 
                                  ref={refPagoHasta}
                                  type="date" 
                                  value={filterHasta} 
                                  onChange={(e) => {
                                    setFilterHasta(e.target.value);
                                    setHistorialFilterErrors((prev) => ({ ...prev, pagoHasta: undefined }));
                                  }} 
                                  aria-invalid={!!historialFilterErrors.pagoHasta}
                                  className={`bg-muted border-none rounded-xl h-11 font-bold touch-manipulation ${
                                    historialFilterErrors.pagoHasta ? "ring-2 ring-red-500 bg-red-50" : ""
                                  }`}
                              />
                              {historialFilterErrors.pagoHasta && (
                                <p className="text-[10px] font-bold text-red-600 leading-snug">{historialFilterErrors.pagoHasta}</p>
                              )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 items-end w-full sm:w-auto">
                          <p className="w-full text-[9px] font-black uppercase tracking-widest text-amber-600 mb-0">Filtro contrato (opcional)</p>
                          <div className="space-y-1 min-w-[140px] flex-1 sm:flex-none">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Contrato inicio</label>
                              <Input 
                                  ref={refContratoDesde}
                                  type="date" 
                                  value={filterContratoDesde} 
                                  onChange={(e) => {
                                    setFilterContratoDesde(e.target.value);
                                    setHistorialFilterErrors((prev) => ({ ...prev, contratoDesde: undefined }));
                                  }} 
                                  aria-invalid={!!historialFilterErrors.contratoDesde}
                                  className={`bg-muted border-none rounded-xl h-11 font-bold touch-manipulation ${
                                    historialFilterErrors.contratoDesde ? "ring-2 ring-red-500 bg-red-50" : ""
                                  }`}
                              />
                              {historialFilterErrors.contratoDesde && (
                                <p className="text-[10px] font-bold text-red-600 leading-snug">{historialFilterErrors.contratoDesde}</p>
                              )}
                          </div>
                          <div className="space-y-1 min-w-[140px] flex-1 sm:flex-none">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Contrato fin</label>
                              <Input 
                                  ref={refContratoHasta}
                                  type="date" 
                                  value={filterContratoHasta} 
                                  onChange={(e) => {
                                    setFilterContratoHasta(e.target.value);
                                    setHistorialFilterErrors((prev) => ({ ...prev, contratoHasta: undefined }));
                                  }} 
                                  aria-invalid={!!historialFilterErrors.contratoHasta}
                                  className={`bg-muted border-none rounded-xl h-11 font-bold touch-manipulation ${
                                    historialFilterErrors.contratoHasta ? "ring-2 ring-red-500 bg-red-50" : ""
                                  }`}
                              />
                              {historialFilterErrors.contratoHasta && (
                                <p className="text-[10px] font-bold text-red-600 leading-snug">{historialFilterErrors.contratoHasta}</p>
                              )}
                          </div>
                        </div>
                        {(filterDesde || filterHasta || filterContratoDesde || filterContratoHasta) && (
                            <Button 
                                variant="ghost" 
                                onClick={() => {
                                  setFilterDesde("");
                                  setFilterHasta("");
                                  setFilterContratoDesde("");
                                  setFilterContratoHasta("");
                                  setHistorialFilterErrors({});
                                }}
                                className="h-11 text-xs font-bold text-muted-foreground uppercase tracking-widest w-full sm:w-auto"
                            >
                                Limpiar Filtros
                            </Button>
                        )}
                    </div>

                    <div className="bg-card rounded-[2rem] shadow-sm border border-border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-transparent border-slate-50">
                                    <TableHead className="px-8 py-4">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("fechaVencimiento")}
                                            className="flex items-center gap-1.5 font-black text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors group select-none"
                                        >
                                            <span>Fecha Venc.</span>
                                            {sortColumn === "fechaVencimiento" ? (
                                                sortDirection === "asc" ? (
                                                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                ) : (
                                                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                                            )}
                                        </button>
                                    </TableHead>
                                    <TableHead className="py-4">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("concepto")}
                                            className="flex items-center gap-1.5 font-black text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors group select-none"
                                        >
                                            <span>Concepto</span>
                                            {sortColumn === "concepto" ? (
                                                sortDirection === "asc" ? (
                                                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                ) : (
                                                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                                            )}
                                        </button>
                                    </TableHead>
                                    <TableHead className="py-4">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("periodo")}
                                            className="flex items-center gap-1.5 font-black text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors group select-none"
                                        >
                                            <span>Periodo</span>
                                            {sortColumn === "periodo" ? (
                                                sortDirection === "asc" ? (
                                                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                ) : (
                                                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                                            )}
                                        </button>
                                    </TableHead>
                                    <TableHead className="py-4">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("monto")}
                                            className="flex items-center justify-end gap-1.5 font-black text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors group select-none w-full text-right"
                                        >
                                            <span>Monto Cuota</span>
                                            {sortColumn === "monto" ? (
                                                sortDirection === "asc" ? (
                                                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                ) : (
                                                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                                            )}
                                        </button>
                                    </TableHead>
                                    <TableHead className="py-4">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("pagado")}
                                            className="flex items-center justify-end gap-1.5 font-black text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors group select-none w-full text-right"
                                        >
                                            <span>Pagado</span>
                                            {sortColumn === "pagado" ? (
                                                sortDirection === "asc" ? (
                                                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                ) : (
                                                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                                            )}
                                        </button>
                                    </TableHead>
                                    <TableHead className="py-4">
                                        <button
                                            type="button"
                                            onClick={() => handleSort("estado")}
                                            className="flex items-center justify-center gap-1.5 font-black text-[10px] uppercase text-muted-foreground hover:text-foreground transition-colors group select-none w-full text-center"
                                        >
                                            <span>Estado</span>
                                            {sortColumn === "estado" ? (
                                                sortDirection === "asc" ? (
                                                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                ) : (
                                                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                                            )}
                                        </button>
                                    </TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground text-right pr-8 py-5">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInstallments.map((row, i) => (
                                    <TableRow key={`${row.anio}-${row.mes}-${row.fechaVencimiento.getDate()}`} className="border-slate-50 hover:bg-muted/50 transition-colors">
                                        <TableCell className="px-8 py-4 font-bold text-muted-foreground text-xs">
                                            {row.fechaVencimiento.toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="font-black text-foreground italic uppercase text-xs tracking-tighter">
                                            Alquiler Mensual
                                        </TableCell>
                                        <TableCell className="font-bold text-muted-foreground text-[10px] uppercase">
                                            {row.mesNombre} {row.anio}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-foreground italic">
                                            {formatCurrency(row.monto)}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-emerald-600 italic">
                                            {formatCurrency(row.pagado)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`${
                                                row.estado === 'Pagado' ? 'bg-emerald-50 text-emerald-600' :
                                                row.estado === 'Atrasado' ? 'bg-red-50 text-red-600' :
                                                'bg-blue-50 text-blue-600'
                                            } border-none font-black italic text-[9px] uppercase rounded-md`}>
                                                {row.estado}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            {row.estado === 'Pagado' && (
                                                <div className="flex items-center justify-end gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                                                    title="Reimprimir Recibo/Factura"
                                                    onClick={() => {
                                                        const pData = row.pago || {};
                                                        setComprobantePagoData({
                                                          pagoId: pData.pagoId || Date.now(),
                                                          tipoPago: pData.tipoPago || "Alquiler",
                                                          mesPagado: row.mes,
                                                          anioPagado: row.anio,
                                                          montoPagado: row.monto || pData.montoPagado || 0,
                                                          metodoPago: pData.metodoPago || "Efectivo",
                                                          fechaPago: pData.fechaPago || new Date().toISOString(),
                                                          facturaEmitida: pData.facturaEmitida || false,
                                                          numeroFactura: pData.numeroFactura,
                                                          comprobanteUrl: pData.comprobanteUrl,
                                                          inquilinoNombre: contractData?.inquilino?.razonSocial || contractData?.inquilino?.nombre || dataInquilino.nombre || "Cliente",
                                                          inquilinoEmail: contractData?.inquilino?.email || dataInquilino?.correo || "",
                                                          inquilinoDocumento: contractData?.inquilino?.ruc || contractData?.inquilino?.cedula || dataInquilino.cedula || "Sin Documento",
                                                          unidadCodigo: dataUnidad.codigo || "",
                                                          condominioNombre: dataUnidad.condominio || "Condominio"
                                                        });
                                                        setIsPreviewComprobanteOpen(true);
                                                    }}
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </Button>
                                                {row.pago && row.pago.pagoId && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                    title="Anular cobro/factura y restablecer alquiler a pendiente"
                                                    onClick={() => {
                                                        setConfirmModalData({
                                                            title: "¿Anular Cobro / Factura?",
                                                            description: `Estás por anular el cobro y la factura correspondiente al mes de ${row.mesNombre}.`,
                                                            details: [
                                                                "El registro de pago se eliminará del historial permanentemente.",
                                                                "El alquiler volverá automáticamente al estado PENDIENTE DE PAGO.",
                                                                "El saldo y los montos en la ficha se actualizarán al instante."
                                                            ],
                                                            confirmText: "Sí, Anular Factura",
                                                            variant: "danger",
                                                            onConfirm: async () => {
                                                                setIsConfirmActionLoading(true);
                                                                try {
                                                                    const resp = await fetch(`${API_BASE}/api/Contratos/pago/${row.pago.pagoId}`, { method: "DELETE" });
                                                                    if (resp.ok) {
                                                                        toast.success("Factura/cobro anulado correctamente. El alquiler volvió a estar pendiente.");
                                                                        await fetchContract();
                                                                        if (onUpdate) onUpdate();
                                                                    } else {
                                                                        toast.error("Error al anular cobro en el servidor.");
                                                                    }
                                                                } catch (err) {
                                                                    toast.error("Error de conexión al anular cobro.");
                                                                } finally {
                                                                    setIsConfirmActionLoading(false);
                                                                    setConfirmModalData(null);
                                                                }
                                                            }
                                                        });
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                                )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredInstallments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground font-bold italic">
                                            No hay cuotas generadas para este contrato.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {activeTab === "documentos" && (
                <div className="animate-in fade-in duration-500 space-y-8">
                    {/* Sección de Generación Automática de Plantillas Word */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 rounded-[2rem] shadow-xl text-white border border-slate-700/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-amber-500/20 p-3.5 rounded-2xl text-amber-400 border border-amber-500/30">
                                    <FileText className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Generar Contrato / Documento Legal (.DOCX)</h3>
                                        <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 border-none">OFICIAL</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-[11px] font-medium">Seleccioná una o varias plantillas, revisá la vista previa con los datos de <strong className="text-amber-300 font-bold">{contractData?.inquilino?.razonSocial || contractData?.inquilino?.nombre || unidad?.tenant || "este inquilino"}</strong> (Dúplex <strong className="text-amber-300 font-bold">{unidad?.code}</strong>) y recién ahí se generan los <strong className="text-white">.docx</strong> oficiales en un ZIP.</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 w-full lg:w-[min(100%,420px)]">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Plantillas ({selectedPlantillaIds.length}/{plantillasList.length})
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={seleccionarTodasPlantillas}
                                            className="text-[9px] font-black uppercase text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                                        >
                                            <CheckSquare className="w-3 h-3" /> Todas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={deseleccionarTodasPlantillas}
                                            className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                                        >
                                            <Square className="w-3 h-3" /> Ninguna
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-slate-800/90 border border-slate-600 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-700/80">
                                    {plantillasList.map((p: any) => {
                                        const id = Number(p.plantillaId);
                                        const checked = selectedPlantillaIds.includes(id);
                                        return (
                                            <label
                                                key={id}
                                                className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                                    checked ? "bg-amber-500/10" : "hover:bg-slate-700/40"
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => togglePlantillaId(id)}
                                                    className="mt-0.5 border-slate-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-slate-950"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block text-[11px] font-bold uppercase text-white leading-tight">
                                                        {p.nombre}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                        {p.tipo || "DOC"}
                                                    </span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                    {plantillasList.length === 0 && (
                                        <p className="text-[10px] text-slate-400 p-4 text-center font-bold uppercase">
                                            No hay plantillas cargadas
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                    <Button 
                                        onClick={handleAbrirVistaPreviaDocs}
                                        disabled={selectedPlantillaIds.length === 0 || isGeneratingDoc}
                                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-6 py-6 rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/20 whitespace-nowrap transition-all hover:scale-105 active:scale-95 flex-1"
                                    >
                                        <Eye className="w-4 h-4 mr-2 stroke-[2.5]" />
                                        {isGeneratingDoc ? "Generando..." : "Vista previa y generar"}
                                    </Button>
                                    <Button 
                                        onClick={openGenerarContratoModal}
                                        className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-5 py-6 rounded-xl uppercase tracking-wider shadow-lg whitespace-nowrap transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Editar Datos
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card p-8 rounded-[2rem] shadow-sm border border-border">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground">Expediente Digital de Inquilino</h3>
                                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Documentación legal: enlaces externos (Google Drive / GCS) o subida física</p>
                            </div>
                        </div>

                        {!contractData ? (
                            <div className="bg-muted border border-border rounded-3xl p-8 text-center text-muted-foreground max-w-md mx-auto space-y-4">
                                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                                <h4 className="font-black italic uppercase text-foreground text-xs">Sin Contrato Activo</h4>
                                <p className="text-[10px] font-bold uppercase leading-relaxed text-muted-foreground">
                                    No hay un contrato de alquiler activo registrado para este dúplex. Debe registrar un contrato de inquilino para poder gestionar el expediente digital.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {[
                                    { id: "contrato_firmado", label: "Contrato firmado" },
                                    { id: "pagare_firmado", label: "Pagaré firmado" },
                                    { id: "cedula_locatario", label: "Copia de cédula del locatario" },
                                    { id: "cedula_codeudor", label: "Copia de cédula del codeudor" },
                                    { id: "comprobante_ingreso", label: "Comprobantes de ingresos" },
                                    { id: "inventario_firmado", label: "Inventario firmado" },
                                    { id: "fotos_entrega", label: "Fotografías de entrega" },
                                    { id: "video_entrega", label: "Video de entrega" },
                                    { id: "comprobante_deposito", label: "Comprobante del depósito de garantía" }
                                ].map((doc) => {
                                    const hasLink = !!documentUrls[doc.id];
                                    return (
                                        <div 
                                            key={doc.id} 
                                            className={`flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                                                hasLink 
                                                    ? "bg-emerald-50/40 border-emerald-200/50 text-emerald-800" 
                                                    : selectedFiles[doc.id]
                                                        ? "bg-amber-50/30 border-amber-200/40 text-foreground animate-pulse"
                                                        : "bg-rose-50/20 border-rose-200/40 text-foreground"
                                            }`}
                                        >
                                            <div className="sm:max-w-[250px] w-full shrink-0">
                                                <h4 className="font-black italic uppercase text-foreground text-[11px] leading-tight mb-1">{doc.label}</h4>
                                                {hasLink ? (
                                                    <Badge className="bg-emerald-500 text-white font-bold text-[8px] border-none uppercase px-2 py-0">Enlazado</Badge>
                                                ) : selectedFiles[doc.id] ? (
                                                    <Badge className="bg-amber-500 text-white font-bold text-[8px] border-none uppercase px-2 py-0">Por Guardar</Badge>
                                                ) : (
                                                    <Badge className="bg-rose-500 text-white font-bold text-[8px] border-none uppercase px-2 py-0">Pendiente</Badge>
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                                                <Input 
                                                    value={tempUrls[doc.id] || ""}
                                                    onChange={(e) => setTempUrls(prev => ({ ...prev, [doc.id]: e.target.value }))}
                                                    placeholder="Pegar enlace compartible de Google Drive / GCS..."
                                                    className="flex-1 bg-card border-border h-10 text-xs rounded-xl"
                                                />
                                                <div className="flex gap-2 items-center justify-end">
                                                    <input 
                                                        type="file" 
                                                        id={`file-upload-${doc.id}`} 
                                                        className="hidden" 
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                setSelectedFiles(prev => ({ ...prev, [doc.id]: e.target.files![0] }));
                                                                toast.success(`Archivo "${e.target.files[0].name}" listo. Haz clic en Guardar.`);
                                                            }
                                                        }}
                                                    />
                                                    <Button 
                                                        variant="outline"
                                                        onClick={() => document.getElementById(`file-upload-${doc.id}`)?.click()}
                                                        className={`h-10 text-[10px] font-bold uppercase rounded-xl border-border bg-card ${selectedFiles[doc.id] ? 'border-amber-400 text-amber-700 bg-amber-50/30' : 'text-muted-foreground hover:bg-muted'} shrink-0`}
                                                    >
                                                        {selectedFiles[doc.id] ? `📎 ${selectedFiles[doc.id].name.substring(0, 15)}...` : "Subir Archivo"}
                                                    </Button>
                                                    
                                                    <Button 
                                                        onClick={() => handleSaveDocument(doc.id)}
                                                        className="h-10 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase px-4 shrink-0 hover:bg-slate-800"
                                                    >
                                                        Guardar
                                                    </Button>
                                                    {hasLink && (
                                                        <Button 
                                                            variant="outline"
                                                            onClick={() => {
                                                                const finalUrl = documentUrls[doc.id].startsWith("/documents/") 
                                                                    ? `${API_BASE}${documentUrls[doc.id]}` 
                                                                    : documentUrls[doc.id];
                                                                window.open(finalUrl, '_blank');
                                                            }}
                                                            className="h-10 w-10 p-0 rounded-xl border-border bg-card text-blue-600 hover:text-blue-700 shrink-0"
                                                            title="Ver Documento"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "historico" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground">Histórico de Inquilinos y Contratos</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Registro de todos los inquilinos y contratos pasados de la unidad {formatCodigoFicha(dataUnidad.codigo)}</p>
                  </div>
                </div>

                {historicoContratos.length === 0 ? (
                  <div className="bg-card p-12 rounded-[2rem] border border-border text-center space-y-3 shadow-sm">
                    <History className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="text-sm font-bold text-muted-foreground">No hay contratos históricos registrados en esta unidad.</p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">Cuando se desaloja un inquilino o finaliza un contrato sin renovarse, todos sus datos y su historial pasan automáticamente a esta sección.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {historicoContratos.map((hc: any) => (
                      <div key={hc.contratoId} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                        <div className="space-y-3 flex-1 w-full">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                            <div className="flex items-center gap-3">
                              <span className="bg-muted text-foreground text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                Contrato #{hc.contratoId}
                              </span>
                              <h4 className="font-black italic text-lg text-foreground">{hc.inquilino?.razonSocial || "Inquilino"}</h4>
                              <span className="text-xs font-bold text-muted-foreground">CI/RUC: {hc.inquilino?.documento || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-muted text-muted-foreground font-bold text-[10px] uppercase">
                                Finalizado / Desalojado
                              </Badge>
                              <button
                                onClick={() => setConfirmAnularContrato({
                                  contratoId: hc.contratoId,
                                  nombre: hc.inquilino?.razonSocial || "Inquilino"
                                })}
                                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 text-[10px] font-black uppercase px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm"
                                title="Revertir desalojo y devolver todo al estado anterior"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Anular Desalojo
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                            <div>
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Teléfono / Email</p>
                              <p className="text-xs font-bold text-foreground">{hc.inquilino?.telefono || "N/A"}</p>
                              <p className="text-[11px] text-muted-foreground">{hc.inquilino?.email || ""}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Ingreso</p>
                              <p className="text-xs font-bold text-foreground">{hc.fechaIngreso ? new Date(hc.fechaIngreso).toLocaleDateString() : "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Inicio — Fin Contrato</p>
                              <p className="text-xs font-bold text-foreground">
                                {hc.fechaInicioContrato ? new Date(hc.fechaInicioContrato).toLocaleDateString() : "-"} — {hc.fechaFinContrato ? new Date(hc.fechaFinContrato).toLocaleDateString() : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Alquiler / Garantía</p>
                              <p className="text-xs font-bold text-emerald-600">Gs. {Number(hc.montoMensualAlquiler || 0).toLocaleString()}</p>
                              <p className="text-[11px] text-muted-foreground">Gar: Gs. {Number(hc.depositoGarantia || 0).toLocaleString()}</p>
                            </div>
                          </div>
                          {(hc.observaciones || hc.vehiculoInfo) && (
                            <div className="pt-2 border-t border-slate-50 flex flex-col sm:flex-row gap-4 text-xs text-muted-foreground">
                              {hc.vehiculoInfo && (
                                <p><strong className="font-bold text-foreground">Vehículo:</strong> {hc.vehiculoInfo}</p>
                              )}
                              {hc.observaciones && (
                                <p className="italic"><strong className="font-bold text-foreground not-italic">Observaciones:</strong> {hc.observaciones}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "comprobantes" && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="flex justify-between items-center bg-card p-6 rounded-[2rem] shadow-sm border border-border">
                  <div className="flex items-center gap-6">
                    <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                      <Receipt className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground">Facturación y Recibos</h3>
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Listado de comprobantes emitidos agrupados por cliente</p>
                    </div>
                  </div>
                </div>

                {(() => {
                  const allClientsData: { nombre: string, facturas: Pago[], recibos: Pago[] }[] = [];
                  
                  const processContract = (c: Contrato | any) => {
                    if (!c || !c.pagos || c.pagos.length === 0) return;
                    const clienteNombre = c.inquilino?.razonSocial || c.inquilino?.nombre || "Cliente Desconocido";
                    const facturas = c.pagos.filter((p: Pago) => p.facturaEmitida);
                    const recibos = c.pagos.filter((p: Pago) => !p.facturaEmitida);
                    
                    if (facturas.length > 0 || recibos.length > 0) {
                      allClientsData.push({ nombre: clienteNombre, facturas, recibos });
                    }
                  };

                  if (contractData) processContract(contractData);
                  if (historicoContratos) {
                    historicoContratos.forEach(processContract);
                  }

                  if (allClientsData.length === 0) {
                    return (
                      <div className="bg-card p-12 rounded-[2rem] border border-border text-center shadow-sm">
                        <Receipt className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h4 className="text-lg font-black italic uppercase text-foreground">Sin Comprobantes</h4>
                        <p className="text-sm font-bold text-muted-foreground">No hay pagos ni comprobantes registrados para esta unidad.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-8">
                      {allClientsData.map((clientData, idx) => (
                        <div key={idx} className="bg-card rounded-[2rem] shadow-sm border border-border overflow-hidden">
                          <div className="bg-secondary/50 p-4 border-b border-border flex items-center gap-3">
                            <div className="bg-primary/10 text-primary p-2 rounded-xl">
                              <User className="w-5 h-5" />
                            </div>
                            <h4 className="font-black italic uppercase text-lg tracking-tighter text-foreground">{clientData.nombre}</h4>
                          </div>

                          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* FACTURAS */}
                            <div>
                              <h5 className="font-black uppercase text-muted-foreground text-xs tracking-widest mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-500" /> Facturas Emitidas ({clientData.facturas.length})
                              </h5>
                              {clientData.facturas.length === 0 ? (
                                <p className="text-[10px] font-bold text-muted-foreground italic">No hay facturas emitidas para este cliente.</p>
                              ) : (
                                <div className="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                                  <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0">
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[9px] font-black uppercase py-2">Fecha</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase py-2">Nro</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase py-2 text-right">Monto</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase py-2 text-center">Acc.</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {clientData.facturas.sort((a,b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime()).map(pago => (
                                        <TableRow key={pago.pagoId || Math.random()}>
                                          <TableCell className="text-[10px] font-bold text-muted-foreground py-2">
                                            {new Date(pago.fechaPago).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell className="text-[10px] font-black italic py-2">
                                            {pago.numeroFactura || pago.nroComprobante || "-"}
                                          </TableCell>
                                          <TableCell className="text-[10px] font-black italic text-right py-2 text-emerald-600">
                                            {formatCurrency(pago.montoPagado)}
                                          </TableCell>
                                          <TableCell className="py-1 text-center">
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md"
                                                onClick={() => {
                                                  setComprobantePagoData({
                                                    pagoId: pago.pagoId || Date.now(),
                                                    tipoPago: pago.tipoPago || "Alquiler",
                                                    mesPagado: pago.mesPagado,
                                                    anioPagado: pago.anioPagado,
                                                    montoPagado: pago.montoPagado,
                                                    metodoPago: pago.metodoPago || "Efectivo",
                                                    fechaPago: pago.fechaPago,
                                                    facturaEmitida: pago.facturaEmitida,
                                                    numeroFactura: pago.numeroFactura,
                                                    comprobanteUrl: (pago as any).comprobanteUrl,
                                                    inquilinoNombre: clientData.nombre,
                                                    inquilinoEmail: "",
                                                    inquilinoDocumento: "",
                                                    unidadCodigo: dataUnidad.codigo || "",
                                                    condominioNombre: dataUnidad.condominio || "Condominio"
                                                  });
                                                  setIsPreviewComprobanteOpen(true);
                                                }}
                                              >
                                                <Printer className="w-3 h-3" />
                                              </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>

                            {/* RECIBOS */}
                            <div>
                              <h5 className="font-black uppercase text-muted-foreground text-xs tracking-widest mb-4 flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-blue-500" /> Recibos Emitidos ({clientData.recibos.length})
                              </h5>
                              {clientData.recibos.length === 0 ? (
                                <p className="text-[10px] font-bold text-muted-foreground italic">No hay recibos emitidos para este cliente.</p>
                              ) : (
                                <div className="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                                  <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0">
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[9px] font-black uppercase py-2">Fecha</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase py-2">Método</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase py-2 text-right">Monto</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase py-2 text-center">Acc.</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {clientData.recibos.sort((a,b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime()).map(pago => (
                                        <TableRow key={pago.pagoId || Math.random()}>
                                          <TableCell className="text-[10px] font-bold text-muted-foreground py-2">
                                            {new Date(pago.fechaPago).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell className="text-[10px] font-black italic py-2">
                                            {pago.metodoPago || "-"}
                                          </TableCell>
                                          <TableCell className="text-[10px] font-black italic text-right py-2 text-blue-600">
                                            {formatCurrency(pago.montoPagado)}
                                          </TableCell>
                                          <TableCell className="py-1 text-center">
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md"
                                                onClick={() => {
                                                  setComprobantePagoData({
                                                    pagoId: pago.pagoId || Date.now(),
                                                    tipoPago: pago.tipoPago || "Alquiler",
                                                    mesPagado: pago.mesPagado,
                                                    anioPagado: pago.anioPagado,
                                                    montoPagado: pago.montoPagado,
                                                    metodoPago: pago.metodoPago || "Efectivo",
                                                    fechaPago: pago.fechaPago,
                                                    facturaEmitida: pago.facturaEmitida,
                                                    numeroFactura: pago.numeroFactura,
                                                    comprobanteUrl: (pago as any).comprobanteUrl,
                                                    inquilinoNombre: clientData.nombre,
                                                    inquilinoEmail: "",
                                                    inquilinoDocumento: "",
                                                    unidadCodigo: dataUnidad.codigo || "",
                                                    condominioNombre: dataUnidad.condominio || "Condominio"
                                                  });
                                                  setIsPreviewComprobanteOpen(true);
                                                }}
                                              >
                                                <Printer className="w-3 h-3" />
                                              </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>

          <DialogFooter className="p-8 pt-4 border-t border-border bg-card flex items-center justify-between shrink-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Expediente VORDIA Condominios v2.0</p>
            <div className="flex gap-3">
                <Button onClick={requestCloseFicha} variant="ghost" className="font-black italic text-xs text-muted-foreground uppercase tracking-widest">SALIR</Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>

      {/* MODAL DE REGISTRO DE COBRO */}
      <Dialog
        open={isRegisteringPayment}
        onOpenChange={(open) => {
          setIsRegisteringPayment(open);
          isRegisteringPaymentRef.current = open;
          if (!open) {
            pendingDesalojoTrasCobroRef.current = false;
            setPendingDesalojoTrasCobro(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] w-[calc(100vw-1.5rem)] p-5 sm:p-8 rounded-[2rem] bg-card border-none shadow-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Registrar Cobro - Unidad {formatCodigoFicha(dataUnidad.codigo)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                    <DollarSign className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground">Registrar Cobro</h3>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Unidad {formatCodigoFicha(dataUnidad.codigo)}</p>
                </div>
            </div>

            {pendingDesalojoTrasCobro && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900 leading-snug">
                Cobro restante previo a desalojo. Al confirmar se registra el pago y se desaloja la unidad (sin pasar a morosidad).
              </div>
            )}

            {!contractData?.contratoId && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 leading-snug flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                No se ha cargado la información del contrato. Cerrá y reabrí la ficha, o reintentá en un momento.
              </div>
            )}

            <div className="space-y-4">
                <div id="ficha-cobro-meses" className="space-y-2">
                        </label>
                        <button
                          type="button"
                          className="text-[9px] font-black uppercase text-primary hover:underline"
                          onClick={() => {
                            const pendientes = installments.filter((i) => i.estado !== "Pagado");
                            const list = (pendientes.length ? pendientes : installments).map((i) => ({
                              mes: i.mes,
                              anio: i.anio,
                            }));
                            const total = list.reduce((acc, p) => {
                              const inst = installments.find((x) => x.mes === p.mes && x.anio === p.anio);
                              return acc + (inst ? Math.max(0, inst.monto - inst.pagado) : 0);
                            }, 0);
                            setPaymentForm((prev) => ({
                              ...prev,
                              mesesSeleccionados: list,
                              mes: list[0]?.mes || prev.mes,
                              anio: list[0]?.anio || prev.anio,
                              monto: total || prev.monto,
                            }));
                          }}
                        >
                          Seleccionar pendientes
                        </button>
                    </div>
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-muted/40 p-2 space-y-1 custom-scrollbar">
                      {installments.map((i) => {
                        const selected = paymentForm.mesesSeleccionados.some(
                          (p) => p.mes === i.mes && p.anio === i.anio
                        );
                        const pendiente = Math.max(0, i.monto - i.pagado);
                        return (
                          <button
                            key={`${i.anio}-${i.mes}-${i.fechaVencimiento.getDate()}`}
                            type="button"
                            onClick={() => {
                              setPaymentForm((prev) => {
                                const exists = prev.mesesSeleccionados.some(
                                  (p) => p.mes === i.mes && p.anio === i.anio
                                );
                                let next = exists
                                  ? prev.mesesSeleccionados.filter(
                                      (p) => !(p.mes === i.mes && p.anio === i.anio)
                                    )
                                  : [...prev.mesesSeleccionados, { mes: i.mes, anio: i.anio }];
                                if (next.length === 0) {
                                  next = [{ mes: i.mes, anio: i.anio }];
                                }
                                next = [...next].sort((a, b) => a.anio - b.anio || a.mes - b.mes);
                                const total = next.reduce((acc, p) => {
                                  const inst = installments.find(
                                    (x) => x.mes === p.mes && x.anio === p.anio
                                  );
                                  return acc + (inst ? Math.max(0, inst.monto - inst.pagado) : 0);
                                }, 0);
                                return {
                                  ...prev,
                                  mesesSeleccionados: next,
                                  mes: next[0].mes,
                                  anio: next[0].anio,
                                  monto: total > 0 ? total : prev.monto,
                                };
                              });
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                              selected
                                ? "bg-primary text-white shadow-sm"
                                : "bg-card text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="text-xs font-bold uppercase">
                              {i.mesNombre} {i.anio}
                              <span className={`ml-2 text-[9px] font-black ${selected ? "text-white/70" : "text-muted-foreground"}`}>
                                ({i.estado})
                              </span>
                            </span>
                            <span className={`text-[10px] font-black ${selected ? "text-white" : "text-primary"}`}>
                              Gs. {pendiente.toLocaleString("es-PY")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {paymentForm.mesesSeleccionados.length > 1 && (
                      <p className="text-[10px] font-medium text-muted-foreground leading-snug">
                        {formatConceptoCobro(
                          paymentForm.mesesSeleccionados.map((p) => ({
                            tipoPago: "Alquiler",
                            mes: p.mes,
                            anio: p.anio,
                          }))
                        )}
                      </p>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Monto a Cobrar (total)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground">Gs.</span>
                        <Input 
                            id="ficha-cobro-monto"
                            type="number"
                            value={paymentForm.monto}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, monto: Number(e.target.value) }))}
                            className="bg-muted border-none rounded-xl h-14 pl-12 font-black text-xl text-primary"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fecha de Pago</label>
                        <Input 
                            type="date"
                            value={paymentForm.fecha}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, fecha: e.target.value }))}
                            className="bg-muted border-none rounded-xl h-11 font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Método</label>
                        <select 
                            value={paymentForm.metodo}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, metodo: e.target.value }))}
                            className="w-full bg-muted border-none rounded-xl p-3 text-sm font-bold text-foreground focus:ring-2 ring-primary"
                        >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia Bancaria</option>
                            <option value="Giro">Giro / Billetera</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                </div>

                {/* CAMPOS DINÃMICOS PARA TRANSFERENCIA */}
                {paymentForm.metodo === "Transferencia" && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nro. Comprobante / Ref</label>
                          <Input 
                              placeholder="Ej: 882312"
                              value={paymentForm.nroComprobante}
                              onChange={(e) => setPaymentForm(prev => ({ ...prev, nroComprobante: e.target.value }))}
                              className="bg-muted border-none rounded-xl h-11 font-bold text-foreground"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Banco Emisor</label>
                          <select 
                              value={paymentForm.banco}
                              onChange={(e) => setPaymentForm(prev => ({ ...prev, banco: e.target.value }))}
                              className="w-full bg-muted border-none rounded-xl p-3 text-sm font-bold text-foreground focus:ring-2 ring-primary h-11"
                          >
                              <option value="">Seleccione Banco</option>
                              {BANCOS_PARAGUAY.map(b => (
                                  <option key={b} value={b}>{b}</option>
                              ))}
                          </select>
                      </div>
                  </div>
                )}

                {/* SELECTOR RECIBO O FACTURA */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tipo de Comprobante a Emitir</label>
                    <div className="grid grid-cols-2 gap-3 bg-muted p-1.5 rounded-2xl border border-border/60">
                        <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, tipoComprobante: "recibo" }))}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${
                                (paymentForm as any).tipoComprobante === "recibo"
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted"
                            }`}
                        >
                            <Receipt className="w-4 h-4" /> Recibo de Dinero
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, tipoComprobante: "factura" }))}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${
                                (paymentForm as any).tipoComprobante === "factura"
                                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                                    : "text-muted-foreground hover:bg-muted"
                            }`}
                        >
                            <FileText className="w-4 h-4" /> Factura Legal
                        </button>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Notas / Observaciones</label>
                    <textarea 
                        value={paymentForm.notas}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, notas: e.target.value }))}
                        className="w-full bg-muted border-none rounded-2xl p-4 text-xs font-bold text-muted-foreground italic min-h-[80px] focus:ring-2 ring-primary outline-none"
                        placeholder="Ej: Pago parcial, adelantado..."
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsRegisteringPayment(false)} className="flex-1 font-black italic text-xs text-muted-foreground uppercase tracking-widest">CANCELAR</Button>
                <Button onClick={handleRegisterPayment} className="flex-1 bg-emerald-600 text-white font-black italic rounded-xl px-6 shadow-lg shadow-emerald-200 hover:scale-105 transition-all h-12">
                    <Save className="w-4 h-4 mr-2" /> REGISTRAR COBRO
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* MODAL DE REGISTRO DE GASTOS DE SERVICIOS (LUZ, AGUA, BASURA) */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 rounded-[2.5rem] bg-card border-none shadow-2xl overflow-hidden">
          <div className={`p-8 ${
            serviceType === 'Luz' ? 'bg-orange-500' : 
            serviceType === 'Agua' ? 'bg-blue-500' : 'bg-slate-800'
          } text-white relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 flex items-center gap-4">
                <div className="bg-card/20 p-3 rounded-2xl backdrop-blur-md">
                    {serviceType === 'Luz' ? <Zap className="w-6 h-6" /> : 
                     serviceType === 'Agua' ? <Droplets className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                </div>
                <div>
                    <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">
                      {serviceModalMode === "edit" ? "Editar" : "Registrar"} {serviceType}
                    </DialogTitle>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Unidad {formatCodigoFicha(dataUnidad.codigo)}</p>
                </div>
            </div>
          </div>

          <div className="p-8 space-y-5">
            {serviceType !== 'Basura' && (
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                        {serviceType === 'Luz' ? 'NIS (ANDE)' : 'ISSAN (Agua)'}
                    </label>
                    <div className="flex gap-2">
                        <Input 
                            value={serviceForm.identificador}
                            onChange={(e) => setServiceForm(prev => ({ ...prev, identificador: e.target.value }))}
                            className="bg-muted border-none rounded-xl h-11 font-black italic text-foreground flex-1"
                        />
                        {serviceType === 'Luz' && (
                            <Button 
                                type="button"
                                onClick={() => handleConsultarAnde()}
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[9px] h-11 px-6 rounded-xl border-none shadow-md shadow-blue-200 transition-all hover:scale-105"
                            >
                                CONSULTAR ANDE
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nro. Comprobante / Factura</label>
                <Input 
                    placeholder="Ej: 001-002-00345"
                    value={serviceForm.nroComprobante}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, nroComprobante: e.target.value }))}
                    className="bg-muted border-none rounded-xl h-11 font-bold text-foreground"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fecha Recibo</label>
                    <Input 
                        type="date"
                        value={serviceForm.fecha}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, fecha: e.target.value }))}
                        className="bg-muted border-none rounded-xl h-11 font-bold"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mes ref.</label>
                    <select 
                        value={serviceForm.mes}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, mes: Number(e.target.value) }))}
                        className="w-full bg-muted border-none rounded-xl p-3 text-sm font-bold text-foreground focus:ring-2 ring-primary h-11"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(0, i).toLocaleString('es-ES', { month: 'long' }).toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Año ref.</label>
                    <Input
                        type="number"
                        value={serviceForm.anio}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, anio: Number(e.target.value) }))}
                        className="bg-muted border-none rounded-xl h-11 font-bold"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Método</label>
                    <select
                        value={serviceForm.metodoPago}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, metodoPago: e.target.value }))}
                        className="w-full bg-muted border-none rounded-xl p-3 text-sm font-bold text-foreground focus:ring-2 ring-primary h-11"
                    >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Giro">Giro</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Monto Pagado</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground">Gs.</span>
                    <Input 
                        type="number"
                        value={serviceForm.monto}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, monto: Number(e.target.value) }))}
                        className={`bg-muted border-none rounded-xl h-14 pl-12 font-black text-xl ${
                            serviceType === 'Luz' ? 'text-orange-500' : 
                            serviceType === 'Agua' ? 'text-blue-500' : 'text-foreground'
                        }`}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsServiceModalOpen(false)} className="flex-1 font-black italic text-xs text-muted-foreground uppercase tracking-widest">CANCELAR</Button>
                <Button 
                    onClick={() => void handleSaveServicio()}
                    className={`flex-1 text-white font-black italic rounded-2xl px-6 shadow-lg transition-all h-12 hover:scale-105 ${
                        serviceType === 'Luz' ? 'bg-orange-500 shadow-orange-200' : 
                        serviceType === 'Agua' ? 'bg-blue-500 shadow-blue-200' : 'bg-slate-800 shadow-slate-200'
                    }`}>
                    <Save className="w-4 h-4 mr-2" /> {serviceModalMode === "edit" ? "GUARDAR" : "CARGAR GASTO"}
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar cobro Luz / Agua / Basura (PagosRecibo) */}
      <Dialog
        open={isCobroServicioModalOpen}
        onOpenChange={(open) => {
          setIsCobroServicioModalOpen(open);
          if (!open) {
            setEditingPagoServicioId(null);
            setEditingPagoSnapshot(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none bg-card p-0 shadow-2xl">
          <div className="bg-amber-500 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-card/10 -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="rounded-2xl bg-card/20 p-3 backdrop-blur-md">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">
                  Editar cobro Ã‚Â· {cobroServicioTipo}
                </DialogTitle>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  Unidad {formatCodigoFicha(dataUnidad.codigo)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Fecha de pago
                </label>
                <Input
                  type="date"
                  value={cobroServicioForm.fecha}
                  onChange={(e) =>
                    setCobroServicioForm((prev) => ({ ...prev, fecha: e.target.value }))
                  }
                  className="h-11 rounded-xl border-none bg-muted font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Mes / Año pagado
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={cobroServicioForm.mes}
                    onChange={(e) =>
                      setCobroServicioForm((prev) => ({
                        ...prev,
                        mes: Number(e.target.value),
                      }))
                    }
                    className="h-11 flex-1 rounded-xl border-none bg-muted font-bold"
                  />
                  <Input
                    type="number"
                    value={cobroServicioForm.anio}
                    onChange={(e) =>
                      setCobroServicioForm((prev) => ({
                        ...prev,
                        anio: Number(e.target.value),
                      }))
                    }
                    className="h-11 w-24 rounded-xl border-none bg-muted font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Monto (Gs.)
              </label>
              <Input
                type="number"
                value={cobroServicioForm.monto}
                onChange={(e) =>
                  setCobroServicioForm((prev) => ({
                    ...prev,
                    monto: Number(e.target.value),
                  }))
                }
                className="h-12 rounded-xl border-none bg-muted font-black text-lg text-amber-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Método
              </label>
              <select
                value={cobroServicioForm.metodoPago}
                onChange={(e) =>
                  setCobroServicioForm((prev) => ({
                    ...prev,
                    metodoPago: e.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border-none bg-muted p-3 text-sm font-bold text-foreground focus:ring-2 ring-primary"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Giro">Giro</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {cobroServicioForm.metodoPago === "Transferencia" && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Nro. comprobante
                  </label>
                  <Input
                    value={cobroServicioForm.nroComprobante}
                    onChange={(e) =>
                      setCobroServicioForm((prev) => ({
                        ...prev,
                        nroComprobante: e.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border-none bg-muted font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Banco
                  </label>
                  <select
                    value={cobroServicioForm.banco}
                    onChange={(e) =>
                      setCobroServicioForm((prev) => ({ ...prev, banco: e.target.value }))
                    }
                    className="h-11 w-full rounded-xl border-none bg-muted p-3 text-xs font-bold text-foreground"
                  >
                    <option value="">Seleccione</option>
                    {BANCOS_PARAGUAY.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Notas
              </label>
              <textarea
                value={cobroServicioForm.notas}
                onChange={(e) =>
                  setCobroServicioForm((prev) => ({ ...prev, notas: e.target.value }))
                }
                className="min-h-[72px] w-full rounded-2xl border-none bg-muted p-3 text-xs font-bold text-muted-foreground outline-none focus:ring-2 ring-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                className="flex-1 font-black italic text-xs uppercase tracking-widest text-muted-foreground"
                onClick={() => setIsCobroServicioModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-2xl bg-amber-500 font-black italic text-white shadow-lg shadow-amber-200 hover:bg-amber-600"
                onClick={() => void handleSaveCobroServicio()}
              >
                <Save className="mr-2 h-4 w-4" /> Guardar cobro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmacion Desalojo / Morosidad */}
      <Dialog open={isDesalojarModalOpen} onOpenChange={setIsDesalojarModalOpen}>
         <DialogContent className="sm:max-w-[650px] w-[95vw] bg-card border border-border shadow-2xl rounded-[2.5rem] p-6 sm:p-8 z-[70] max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Confirmar Desalojo</DialogTitle>
            <div className="flex flex-col gap-6">
               <div className="flex items-center gap-4 border-b border-border pb-4">
                  <div className="bg-red-50 text-red-600 p-3.5 rounded-2xl shrink-0 shadow-sm">
                     <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                     <h3 className="font-black italic uppercase text-foreground tracking-tighter text-xl sm:text-2xl">Confirmar Desalojo o Renovación</h3>
                     <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Selecciona el flujo deseado. Atención: Acción Irreversible</p>
                  </div>
               </div>

               {deudaTotalDesalojo > 0 ? (
                  <div className="space-y-5">
                      <div className="bg-red-50 p-5 rounded-2xl border border-red-200 text-center shadow-inner">
                          <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Deuda Pendiente Detectada</p>
                          <p className="text-3xl sm:text-4xl font-black italic text-red-600 mt-1">Gs. {deudaTotalDesalojo.toLocaleString()}</p>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground leading-relaxed text-center px-2">
                          Podés <strong>cobrar el saldo restante ahora</strong> y desalojar sin mora, o <strong>pasar las cuotas a Morosidades</strong> (salen del historial de pagos). Si más adelante anulás el desalojo: sin cobrar se restablece el historial; si ya cobraste el restante, ese cobro se anula y el historial vuelve como estaba.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Cant. Cuotas Mora</label>
                              <Input 
                                 type="number" 
                                 className="bg-muted font-bold h-11 rounded-xl" 
                                 value={desalojoForm.cantCuotas}
                                 onChange={e => setDesalojoForm({...desalojoForm, cantCuotas: Number(e.target.value)})}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Interés Diario (Gs)</label>
                              <Input 
                                 type="number" 
                                 className="bg-muted font-bold h-11 rounded-xl" 
                                 value={desalojoForm.montoInteresDiario}
                                 onChange={e => setDesalojoForm({...desalojoForm, montoInteresDiario: Number(e.target.value)})}
                              />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Observaciones Jurídicas</label>
                          <textarea 
                              className="w-full bg-muted rounded-xl p-3 text-xs font-bold border border-border outline-none focus:border-red-300 min-h-[70px] resize-none"
                              value={desalojoForm.observaciones}
                              onChange={e => setDesalojoForm({...desalojoForm, observaciones: e.target.value})}
                          />
                      </div>
                  </div>
               ) : (
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-center space-y-2 shadow-sm">
                     <p className="text-[12px] font-black uppercase text-emerald-700 tracking-widest">Inquilino al Día</p>
                     <p className="text-xs font-bold text-emerald-600 leading-relaxed">
                         No se registran deudas en este contrato. Puedes renovar el contrato o proceder al desalojo para finalizarlo sin cargos moratorios.
                     </p>
                  </div>
               )}

               <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" className="w-full rounded-xl font-bold h-11 text-muted-foreground hover:bg-muted" onClick={() => setIsDesalojarModalOpen(false)}>
                     CANCELAR
                  </Button>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <Button 
                         className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl shadow-lg shadow-blue-500/20 h-12 hover:scale-105 transition-all"
                         onClick={() => {
                            setIsDesalojarModalOpen(false);
                            setActiveTab("ficha");
                            setIsEditing(true);
                            setIsRenewing(true);
                         }}
                         disabled={isLoading}
                      >
                         RENOVAR CONTRATO
                      </Button>
                      {deudaTotalDesalojo > 0 && (
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black italic rounded-xl shadow-lg shadow-emerald-500/20 h-12 hover:scale-105 transition-all"
                          onClick={abrirCobroRestanteDesalojo}
                          disabled={isLoading}
                        >
                          COBRAR RESTANTE Y DESALOJAR
                        </Button>
                      )}
                      <Button 
                         className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black italic rounded-xl shadow-lg shadow-red-500/20 h-12 hover:scale-105 transition-all"
                         onClick={() => handleConfirmarDesalojo({ pasarAMorosidad: deudaTotalDesalojo > 0 })}
                         disabled={isLoading}
                      >
                         {isLoading
                           ? "PROCESANDO..."
                           : deudaTotalDesalojo > 0
                             ? "PASAR A MOROSIDAD Y DESALOJAR"
                             : "CONFIRMAR DESALOJO"}
                      </Button>
                  </div>
               </div>
            </div>
         </DialogContent>
      </Dialog>

      {/* MODAL PREVISUALIZACION DE DATOS OCR EXTRAIDOS */}
      <Dialog open={showOcrPreview} onOpenChange={setShowOcrPreview}>
        <DialogContent className="sm:max-w-md bg-card border border-border shadow-2xl rounded-[2rem] p-6 z-[60]">
          <DialogHeader className="sr-only">
            <DialogTitle>Previsualización de Datos Extraídos por OCR</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 border-b border-border pb-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black italic uppercase text-foreground tracking-tighter text-xl">Datos Contrato Extraídos</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Motor OCR Inteligente VORDIA</p>
              </div>
            </div>

            {ocrData && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Verifica los datos detectados:</p>
                
                <div className="bg-muted p-4 rounded-xl space-y-2.5 font-bold text-xs text-foreground">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inquilino (Razón Social):</span>
                    <span className="text-foreground uppercase italic font-black">{ocrData.nombreCompleto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cédula / RUC:</span>
                    <span className="text-foreground">{ocrData.cedula}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="text-foreground">{ocrData.telefono}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground">{ocrData.email}</span>
                  </div>
                  <div className="flex justify-between border-t border-border/60 pt-2.5">
                    <span className="text-muted-foreground">Monto Alquiler:</span>
                    <span className="text-blue-600 font-black italic">{formatCurrency(ocrData.montoMensual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inicio Contrato:</span>
                    <span className="text-foreground">{new Date(ocrData.fechaInicio).toLocaleDateString('es-PY')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin Contrato:</span>
                    <span className="text-foreground">{new Date(ocrData.fechaFin).toLocaleDateString('es-PY')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Button variant="outline" className="flex-1 rounded-xl font-bold h-12" onClick={() => setShowOcrPreview(false)}>
                DESCARTAR
              </Button>
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black italic rounded-xl shadow-lg shadow-emerald-500/20 h-12"
                onClick={handleApplyOcr}
              >
                APLICAR Y AUTOCOMPLETAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {isPrintingContract && <ContratoImprimible contractData={contractData} dataUnidad={dataUnidad} localNisAnde={localNisAnde} />}
      {isPrintingPagare && (
        <PagareImprimible 
            contractData={contractData} 
            dataUnidad={dataUnidad} 
        />
      )}
      {showExpedienteSeccionesModal && (
        <Dialog open={showExpedienteSeccionesModal} onOpenChange={setShowExpedienteSeccionesModal}>
          <DialogContent className="sm:max-w-[440px] rounded-2xl bg-card border-border p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Expediente PDF — Secciones
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Elegí qué incluir en la impresión. Siempre se imprimen los datos generales del inquilino.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {(
                [
                  {
                    key: "historialPagos" as const,
                    label: "Historial de pagos",
                    desc: "Cuotas de alquiler y estado de cobro",
                  },
                  {
                    key: "comprobantes" as const,
                    label: "Facturas y recibos",
                    desc: "Comprobantes emitidos de la unidad",
                  },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    expedienteSecciones[item.key]
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={expedienteSecciones[item.key]}
                    onCheckedChange={(v) =>
                      setExpedienteSecciones((prev) => ({
                        ...prev,
                        [item.key]: !!v,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-black uppercase tracking-tight text-foreground">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      {item.desc}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 text-[10px] font-bold uppercase text-muted-foreground"
                onClick={() =>
                  setExpedienteSecciones({
                    historialPagos: true,
                    mantenimiento: false,
                    comprobantes: true,
                  })
                }
              >
                Seleccionar todo
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 rounded-xl font-bold text-xs uppercase"
                  onClick={() => setShowExpedienteSeccionesModal(false)}
                  disabled={isPreparingExpediente}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="h-10 px-5 rounded-xl font-black text-xs uppercase bg-primary text-primary-foreground"
                  disabled={isPreparingExpediente}
                  onClick={() => handleExportExpedientePdf(expedienteSecciones)}
                >
                  {isPreparingExpediente ? "Preparando…" : "Imprimir PDF"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isPrintingExpediente && expedientePrintData && (
        <ExpedienteUnidadImprimible data={expedientePrintData} />
      )}
      {isPrintingHistorial && historialPrintData && (
        <HistorialPagosImprimible data={historialPrintData} />
      )}
      <ComprobantePreviewModal
        isOpen={isPreviewComprobanteOpen}
        onClose={() => setIsPreviewComprobanteOpen(false)}
        pagoData={comprobantePagoData}
        onSaved={async () => {
          await refreshContratoYHistorial();
          setActiveTab("pagos");
        }}
      />

      {/* MODAL VISTA PREVIA CONTRATO RENOVADO */}
      <Dialog open={showRenewedPreviewModal} onOpenChange={(val) => {
          if (!val) {
              setShowRenewedPreviewModal(false);
              setIsRenewing(false);
              setIsEditing(false);
          }
      }}>
        <DialogContent className="max-w-[950px] bg-muted border border-border shadow-2xl rounded-[2.5rem] p-0 z-[70] overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista Previa Contrato Renovado</DialogTitle>
          </DialogHeader>
          <div className="bg-card p-6 sm:p-8 border-b border-border flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-foreground">Vista Previa — Contrato Renovado</h3>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Revisa el documento legal actualizado y genera el PDF para compartir con el inquilino</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 font-black italic text-xs px-4 py-1.5 uppercase tracking-wider rounded-full shadow-sm">
              ¡Renovado al Día!
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
             <ContratoImprimible contractData={contractData} dataUnidad={dataUnidad} localNisAnde={localNisAnde} isPreview={true} />
          </div>

          <div className="p-6 sm:p-8 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
             <Button variant="outline" className="w-full sm:w-auto font-bold rounded-xl h-12 px-6 text-muted-foreground hover:bg-muted" onClick={() => {
                 setShowRenewedPreviewModal(false);
                 setIsRenewing(false);
                 setIsEditing(false);
             }}>
                 CERRAR / OMITIR
             </Button>
             <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl px-8 h-12 shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2" onClick={() => {
                 handlePrintContract();
                 setShowRenewedPreviewModal(false);
                 setIsRenewing(false);
                 setIsEditing(false);
                 toast.success("¡Renovación completada y contrato en PDF generado exitosamente!");
             }}>
                 <FileText className="w-5 h-5" /> IMPRIMIR O GUARDAR EN PDF Y FINALIZAR
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMACIÓN PARA ANULAR DESALOJO */}
      <Dialog open={!!confirmAnularContrato} onOpenChange={(open) => !open && setConfirmAnularContrato(null)}>
        <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-[2.5rem] p-8 overflow-hidden bg-card z-[99999]">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-inner">
              <RotateCcw className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-foreground">
                ¿Anular Desalojo / Restablecer?
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground max-w-sm mx-auto">
                Estás por revertir el desalojo o finalización del contrato de <span className="text-red-600 font-black">{confirmAnularContrato?.nombre}</span>.
              </DialogDescription>
            </div>
            <div className="bg-muted border border-border rounded-2xl p-4 text-left w-full space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2 font-bold text-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Restablecerá el contrato y al inquilino como <span className="text-emerald-600 font-black">ACTIVOS</span>.
              </p>
              <p className="flex items-center gap-2 font-bold text-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> La unidad volverá al estado <span className="text-blue-600 font-black">OCUPADO</span>.
              </p>
              <p className="flex items-center gap-2 font-bold text-foreground">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> Si había cuotas en morosidad sin cobrar, vuelven al <span className="text-foreground font-black">historial de pagos</span>.
              </p>
              <p className="flex items-center gap-2 font-bold text-foreground">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Si se cobró el restante al desalojar, ese cobro se <span className="text-red-600 font-black">anula</span> y el historial queda como antes.
              </p>
            </div>
            <div className="flex w-full gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setConfirmAnularContrato(null)} 
                className="flex-1 rounded-xl font-bold uppercase text-xs h-12 border-border text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={async () => {
                  if (!confirmAnularContrato) return;
                  try {
                    setIsLoading(true);
                    const res = await fetch(`${API_BASE}/api/Contratos/${confirmAnularContrato.contratoId}/anular-desalojo`, { method: "POST" });
                    if (res.ok) {
                      toast.success("Desalojo anulado. Contrato activo; morosidades pendientes y cobros restantes del desalojo revertidos.");
                      await fetchHistoricoContratos();
                      setConfirmAnularContrato(null);
                      if (onUpdate) onUpdate();
                      onClose();
                    } else {
                      toast.error("Error al anular el desalojo");
                    }
                  } catch (e) {
                    console.error(e);
                    toast.error("Error de conexión");
                  } finally {
                    setIsLoading(false);
                  }
                }} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black italic uppercase text-xs h-12 shadow-xl shadow-red-500/20"
              >
                Confirmar y Restablecer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PERSONALIZADO DE CONFIRMACIÓN DE ACCIONES */}
      {confirmModalData && (
        <ConfirmActionModal
          isOpen={true}
          onClose={() => setConfirmModalData(null)}
          onConfirm={confirmModalData.onConfirm}
          title={confirmModalData.title}
          description={confirmModalData.description}
          details={confirmModalData.details}
          confirmText={confirmModalData.confirmText}
          cancelText={confirmModalData.cancelText}
          variant={confirmModalData.variant}
          isLoading={isConfirmActionLoading}
        />
      )}
      {/* MODAL PARA GENERAR Y EDITAR DATOS DEL CONTRATO */}
      {isGenerarContratoModalOpen && (
        <GenerarEditarContratoModal
          isOpen={isGenerarContratoModalOpen}
          onClose={() => setIsGenerarContratoModalOpen(false)}
          unidad={unidad}
          contractData={contractData}
          onSaved={() => {
            fetchContract();
            if (onUpdate) onUpdate();
          }}
        />
      )}

      {isVistaPreviaDocsOpen && (() => {
        const datosPrev = buildDatosPlantillaPreview();
        const seleccionadas = plantillasList.filter((p: any) =>
          selectedPlantillaIds.includes(Number(p.plantillaId))
        );
        if (!datosPrev) return null;
        return (
          <VistaPreviaDocumentosModal
            isOpen={isVistaPreviaDocsOpen}
            onClose={() => setIsVistaPreviaDocsOpen(false)}
            plantillas={seleccionadas}
            datos={datosPrev}
            contractData={contractData}
            unidad={{ ...unidad, codigo: unidad?.code, code: unidad?.code, nisAnde: localNisAnde || unidad?.nisAnde }}
            isGenerating={isGeneratingDoc}
            onConfirmGenerate={handleConfirmarGenerarZip}
          />
        );
      })()}

      {/* MODAL DE VISTA PREVIA Y COMPARTIR POR WHATSAPP */}
      {showWhatsAppPreviewModal && (
        <Dialog open={showWhatsAppPreviewModal} onOpenChange={setShowWhatsAppPreviewModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6 rounded-2xl bg-card">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-foreground flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">📲</span>
                Vista Previa del Contrato — Enviar por WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Se genera el PDF del contrato. En celular puede ir directo a WhatsApp. En PC: se descarga el PDF y se abre el chat en WhatsApp Web; solo falta adjuntarlo con el clip 📎 (WhatsApp no permite adjuntar archivos solo desde el navegador).
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto border border-border rounded-xl p-4 bg-muted my-2">
              <ContratoImprimible
                contractData={contractData}
                dataUnidad={dataUnidad}
                localNisAnde={localNisAnde}
                isPreview={true}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  descargarContratoDoc(contractData, dataUnidad);
                  toast.success("📄 Archivo del contrato legal .DOC descargado en tu equipo.");
                }}
                className="h-11 px-5 font-bold text-xs uppercase rounded-xl border-border"
                disabled={isSharingWhatsApp}
              >
                📥 Descargar Archivo (.DOC)
              </Button>

              <Button
                onClick={handleEnviarPdfWhatsAppFicha}
                disabled={isSharingWhatsApp}
                className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-600/20"
              >
                {isSharingWhatsApp ? "Generando PDF…" : "📲 Descargar y Abrir WhatsApp"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE ÉXITO: ¡CONTRATO GENERADO ENVIADO! */}
      {showWhatsAppModal && (
        <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
          <DialogContent className="sm:max-w-[420px] p-7 rounded-[2rem] bg-card border-none shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-foreground">
                ¡Contrato Generado Enviado!
              </DialogTitle>
              <p className="text-xs font-medium text-muted-foreground mt-2 leading-relaxed">
                {whatsAppResultMsg ||
                  `PDF del contrato listo. Chat abierto para ${contractData?.inquilino?.telefono || "el cliente"}. Si estás en PC, adjuntá el PDF descargado con el clip 📎.`}
              </p>
            </div>
            <Button
              onClick={() => setShowWhatsAppModal(false)}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-emerald-600/20"
            >
              Aceptar
            </Button>
          </DialogContent>
        </Dialog>
      )}
      {/* MODAL DE RESTRICCIÓN DE SEGURIDAD VORDIA */}
      <ModalAccesoRestringido
        isOpen={alertaRestriccion.visible}
        onClose={() => setAlertaRestriccion({ visible: false })}
        mensaje={alertaRestriccion.mensaje}
        permisoNombre={alertaRestriccion.permisoNombre}
      />
    </Dialog>
  );
}


