"use client";
import React, { useState } from "react";
import { ContratoImprimible, descargarContratoDoc } from "./ContratoImprimible";
import { ConfirmActionModal, ConfirmActionModalProps } from "@/components/ui/confirm-action-modal";
import { verificarPermisoGranular, ModalAccesoRestringido } from "@/app/login/PermisosGranularesMatriz";
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
  Phone
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
import { Button } from "@/components/ui/button";
import { ComprobantePreviewModal } from "./ComprobantePreviewModal";
import { GenerarEditarContratoModal } from "./GenerarEditarContratoModal";

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

/** Cobro (PagosRecibo / facturación) o gasto de unidad (GastosMantenimiento). */
interface FilaServicioMantenimiento {
  id: string;
  fechaMs: number;
  fechaLabel: string;
  periodoLabel: string;
  monto: number;
  origen: "cobro" | "gasto";
  gasto?: GastoServicio;
  pago?: Pago;
}

interface Contrato {
  [key: string]: string | number | Persona | Pago[] | undefined | null;
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
}

interface DetalleUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidad: Unidad | null;
  onUpdate?: () => void;
}

interface EditItem {
    label: string;
    value: string | number | null;
    key: string;
    parent?: string;
    type?: string;
    highlight?: string;
    icon?: React.ElementType;
}

export function DetalleUnidadModal({ isOpen, onClose, unidad, onUpdate }: DetalleUnidadModalProps) {
  const [activeTab, setActiveTab] = useState<"ficha" | "pagos" | "gastos" | "documentos" | "historico">("ficha");
  const [isEditing, setIsEditing] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [showRenewedPreviewModal, setShowRenewedPreviewModal] = useState(false);
  const [historicoContratos, setHistoricoContratos] = useState<any[]>([]);
  const [isContratando, setIsContratando] = useState(false);
  const [isGenerarContratoModalOpen, setIsGenerarContratoModalOpen] = useState(false);
  const [localNisAnde, setLocalNisAnde] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filesUploaded, setFilesUploaded] = useState<Record<string, boolean>>({});
  const [alertaRestriccion, setAlertaRestriccion] = useState<{
    visible: boolean;
    mensaje?: string;
    permisoNombre?: string;
  }>({ visible: false });
  
  // Estado para Generación de Documentos Word (Plantillas)
  const [plantillasList, setPlantillasList] = useState<any[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<number>(0);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

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

  React.useEffect(() => {
    if (isOpen) {
      fetch("http://localhost:5034/api/Plantillas")
        .then(r => r.ok ? r.json() : [])
        .then(data => setPlantillasList(data))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleDescargarWord = async () => {
    if (!selectedPlantillaId || selectedPlantillaId === 0) {
      toast.error("Seleccione una plantilla de documento primero.");
      return;
    }
    setIsGeneratingDoc(true);
    try {
      const loc = encodeURIComponent((contractData?.inquilino?.razonSocial || contractData?.inquilino?.nombre || unidad?.tenant || "Sin Nombre") as string);
      const dup = encodeURIComponent(unidad?.code || "");
      const mon = contractData?.montoMensualAlquiler || 0;
      const cId = contractData?.contratoId || 0;

      const url = `http://localhost:5034/api/Plantillas/generar/${selectedPlantillaId}?contratoId=${cId}&locatario=${loc}&duplex=${dup}&monto=${mon}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        toast.error("Error al generar documento Word");
        return;
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const selectedObj = plantillasList.find((p: any) => p.plantillaId === Number(selectedPlantillaId));
      a.download = `${selectedObj?.nombre || "Documento"}_${unidad?.code || "Duplex"}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Documento Word (.docx) generado y descargado con éxito");
    } catch (e) {
      toast.error("Error de conexión al generar el documento");
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

  const handleCompartirWhatsAppFicha = () => {
    const phoneRaw = contractData?.inquilino?.telefono || "";
    if (!phoneRaw || phoneRaw === "N/A" || phoneRaw.trim().length < 6) {
      toast.warning("⚠️ No hay un número de celular/WhatsApp cargado en la ficha. Cárgalo en 'Editar Ficha' o en 'Generar Contrato'.");
      return;
    }

    setShowWhatsAppPreviewModal(true);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append("file", file);

    setIsScanning(true);
    toast.info("Escaneando contrato con motor OCR Inteligente...");

    try {
      const resp = await fetch("http://localhost:5034/api/Documentos/scan-contract", {
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
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [tempUrls, setTempUrls] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  const fetchDocuments = async (contratoId: number) => {
    try {
      const resp = await fetch(`http://localhost:5034/api/Documentos/contrato/${contratoId}?t=${Date.now()}`);
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
        const resp = await fetch("http://localhost:5034/api/Documentos/upload", {
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
        const resp = await fetch("http://localhost:5034/api/Documentos/save-url", {
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
      const resp = await fetch(`http://localhost:5034/api/Contratos/unidad/${unidad?.id}/historico?t=${Date.now()}`);
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
      fetchContract();
      fetchHistoricoContratos();
      setLocalNisAnde(unidad?.nisAnde || "");
    } else {
      setIsEditing(false);
      setIsRenewing(false);
      setIsContratando(false);
    }
  }, [isOpen, unidad?.id, unidad?.nisAnde]);

  const fetchGastosServicios = React.useCallback(async () => {
    if (!unidad?.id || unidad.id <= 0) return;
    setLoadingGastos(true);
    try {
      const r = await fetch(
        `http://localhost:5034/api/GastosMantenimiento/unidad/${unidad.id}/servicios?t=${Date.now()}`
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

  const fetchContract = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`http://localhost:5034/api/Contratos/unidad/${unidad?.id}?t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setContractData(data);
      } else {
        setContractData(null);
      }
    } catch (error) {
      console.error("Error fetching contract", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen || !unidad?.id || unidad.id <= 0) return;
    void fetchContract();
    void fetchHistoricoContratos();
  }, [isOpen, unidad?.id, activeTab]);

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
        const resMora = await fetch("http://localhost:5034/api/Morosidad", {
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

      if (localNisAnde !== unidad?.nisAnde && unidad?.id) {
          await fetch(`http://localhost:5034/api/UnidadesCondominio/${unidad.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  ...unidad,
                  nisAnde: localNisAnde
              })
          });
      }

      const resp = await fetch(`http://localhost:5034/api/Contratos`, {
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
          fechaIngreso: contractData.fechaIngreso,
          fechaInicio: contractData.fechaInicioContrato,
          fechaFin: contractData.fechaFinContrato,
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
    if (!contractData) return;
    try {
      if (localNisAnde !== unidad?.nisAnde && unidad?.id) {
          const respUnidad = await fetch(`http://localhost:5034/api/UnidadesCondominio/${unidad.id}`);
          if (respUnidad.ok) {
              const unidadData = await respUnidad.json();
              unidadData.nisAnde = localNisAnde;
              await fetch(`http://localhost:5034/api/UnidadesCondominio/${unidad.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(unidadData)
              });
          }
      }

      const resp = await fetch(`http://localhost:5034/api/Contratos`, {
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
          fechaIngreso: contractData.fechaIngreso,
          fechaInicio: contractData.fechaInicioContrato,
          fechaFin: contractData.fechaFinContrato,
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
        if (onUpdate) onUpdate();
      } else {
        const errText = await resp.text();
        console.error("Error API:", errText);
        toast.error("El servidor rechazó los datos. Revisa que todos los campos obligatorios estén llenos.");
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
    try {
      if (localNisAnde !== unidad?.nisAnde && unidad?.id) {
          const respUnidad = await fetch(`http://localhost:5034/api/UnidadesCondominio/${unidad.id}`);
          if (respUnidad.ok) {
              const unidadData = await respUnidad.json();
              unidadData.nisAnde = localNisAnde;
              await fetch(`http://localhost:5034/api/UnidadesCondominio/${unidad.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(unidadData)
              });
          }
      }
      
      const resp = await fetch(`http://localhost:5034/api/Contratos`, {
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
          fechaIngreso: contractData.fechaIngreso,
          fechaInicio: contractData.fechaInicioContrato,
          fechaFin: contractData.fechaFinContrato,
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
      } else {
        toast.error("Error al registrar el contrato.");
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
    if (!contractData) {
      toast.error("Error: No se ha cargado la información del contrato. Reintente en un momento.");
      return;
    }

    try {
      setIsLoading(true);
      const resp = await fetch(`http://localhost:5034/api/Contratos/pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoId: contractData.contratoId,
          tipoPago: "Alquiler",
          mesPagado: paymentForm.mes,
          anioPagado: paymentForm.anio,
          montoPagado: paymentForm.monto,
          metodoPago: paymentForm.metodo,
          fechaPago: paymentForm.fecha,
          notas: paymentForm.notas,
          nroComprobante: paymentForm.nroComprobante,
          banco: paymentForm.banco,
          saldoPendiente: 0,
          mora: 0,
          facturaEmitida: (paymentForm as any).tipoComprobante === "factura"
        })
      });

      if (resp.ok) {
        let createdPago: any = {};
        try { createdPago = await resp.json(); } catch(e) {}
        toast.success(`Cobro de ${paymentForm.metodo} registrado con éxito`);
        setIsRegisteringPayment(false);

        // Abrir modal de vista previa y edición de comprobante
        setComprobantePagoData({
          pagoId: createdPago.pagoId || Date.now(),
          tipoPago: createdPago.tipoPago || "Alquiler",
          mesPagado: createdPago.mesPagado || paymentForm.mes,
          anioPagado: createdPago.anioPagado || paymentForm.anio,
          montoPagado: createdPago.montoPagado || paymentForm.monto,
          metodoPago: createdPago.metodoPago || paymentForm.metodo,
          fechaPago: createdPago.fechaPago || paymentForm.fecha,
          facturaEmitida: (paymentForm as any).tipoComprobante === "factura",
          numeroFactura: createdPago.numeroFactura,
          comprobanteUrl: createdPago.comprobanteUrl,
          inquilinoNombre: contractData?.inquilino?.razonSocial || contractData?.inquilino?.nombre || dataInquilino.nombre || "Cliente",
          inquilinoDocumento: contractData?.inquilino?.ruc || contractData?.inquilino?.cedula || dataInquilino.cedula || "Sin Documento",
          unidadCodigo: dataUnidad.codigo || "",
          condominioNombre: dataUnidad.condominio || "Condominio"
        });
        setIsPreviewComprobanteOpen(true);
        
        // Limpiar formulario
        setPaymentForm(prev => ({
          ...prev,
          notas: "",
          nroComprobante: "",
          banco: ""
        }));

        await fetchContract();
        if (onUpdate) onUpdate();
      } else {
        const errorText = await resp.text();
        toast.error("Error al registrar: " + errorText);
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
          ? (unidad?.nisAnde ?? "")
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
          ? `http://localhost:5034/api/GastosMantenimiento/servicios/${editingGastoId}`
          : `http://localhost:5034/api/GastosMantenimiento/servicios`;
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

  const handleConsultarAnde = async () => {
    const nis = serviceForm.identificador;
    if (!nis) {
      toast.error("Ingresa un número de NIS válido primero.");
      return;
    }
    toast.info("Consultando deuda en la red ANDE...");
    setIsLoading(true);
    
    // Simular tiempo de carga
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);

    // Lógica de simulación de deuda
    const nisNum = parseInt(nis.slice(-2) || "0") || 0;
    const day = (nisNum % 15) + 10;
    const date = new Date();
    date.setDate(day);
    const isVencido = new Date() > date && Math.random() > 0.3; // 70% de que la vencida esté impaga
    
    if (isVencido) {
        // Hay deuda
        const montoSimulado = (nisNum * 2500) + 85000;
        setServiceForm(prev => ({ ...prev, monto: montoSimulado }));
        toast.error(`Factura pendiente de pago. Monto: ${new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(montoSimulado)}`);
    } else {
        // Al día
        setServiceForm(prev => ({ ...prev, monto: 0 }));
        toast.success("El NIS se encuentra al día (Sin deuda pendiente).");
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
            `http://localhost:5034/api/GastosMantenimiento/servicios/${gastoId}`,
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
        `http://localhost:5034/api/Contratos/pago/${editingPagoServicioId}`,
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
          const resp = await fetch(`http://localhost:5034/api/Contratos/pago/${pagoId}`, {
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

    // Generar cuotas basadas en el contrato
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
      
      return installments.sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime());
    };

  const installments = generateInstallments();
  const filteredInstallments = installments.filter(row => {
      let pass = true;
      if (filterDesde && new Date(row.fechaVencimiento) < new Date(filterDesde)) pass = false;
      if (filterHasta && new Date(row.fechaVencimiento) > new Date(filterHasta)) pass = false;
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

  const calcularDeudaAtrasada = () => {
    return installments.reduce((acc, curr) => {
      if (curr.estado === "Atrasado") {
        return acc + (curr.monto - curr.pagado);
      }
      return acc;
    }, 0);
  };

  const handleConfirmarDesalojo = async () => {
    if (!contractData) return;
    try {
      setIsLoading(true);

      // Si hay deuda, registrar la morosidad primero
      if (deudaTotalDesalojo > 0) {
        const bodyMora = {
          inquilinoId: contractData.inquilinoId,
          unidadId: unidad?.id,
          montoTotal: deudaTotalDesalojo,
          cantidadCuotas: desalojoForm.cantCuotas,
          observaciones: desalojoForm.observaciones,
          montoInteresDiario: desalojoForm.montoInteresDiario
        };
        const resMora = await fetch("http://localhost:5034/api/Morosidad", {
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

      // Desalojar / terminar contrato
      const resDesalojo = await fetch(`http://localhost:5034/api/Contratos/${contractData.contratoId}/desalojar`, {
          method: "POST"
      });

      if (resDesalojo.ok) {
          toast.success(deudaTotalDesalojo > 0 ? "Expediente creado y unidad desalojada. Datos pasados a Histórico." : "Unidad desalojada sin deudas. Datos guardados en Histórico.");
          setIsDesalojarModalOpen(false);
          await fetchHistoricoContratos();
          if (onUpdate) onUpdate();
          onClose(); // cerramos el modal actual porque ya está disponible
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

  const dataUnidad = {
    codigo: unidad?.code || "N/A",
    condominio: unidad?.condo || "Aguz",
    estado: unidad?.status || "Ocupado",
    nisAnde: unidad?.nisAnde?.trim() || "â€”",
    medidorAgua: unidad?.medidorAgua?.trim() || "â€”",
    observaciones: unidad?.observaciones?.trim() || "Sin observaciones cargadas.",
  };

  const gastosLuz = gastosServicios.filter((g) => g.tipoServicio === "Luz");
  const gastosAgua = gastosServicios.filter((g) => g.tipoServicio === "Agua");
  const gastosBasura = gastosServicios.filter((g) => g.tipoServicio === "Basura");

  const pagosContrato = contractData?.pagos ?? [];

  const pagoCoincideTipo = (p: Pago, tipo: ServicioTipoCard) => {
    const t = (p.tipoPago || "").trim();
    return t === tipo || t.toLowerCase() === tipo.toLowerCase();
  };

  /** Igual que en facturación: cobros con concepto Luz/Agua/Basura + gastos de unidad en GastosMantenimiento. */
  const combinarFilasServicio = (tipo: ServicioTipoCard, gastosTipo: GastoServicio[]): FilaServicioMantenimiento[] => {
    const fromGasto: FilaServicioMantenimiento[] = gastosTipo.map((g) => {
      let montoReal = g.monto;
      if (montoReal === 0 && tipo === "Luz" && dataUnidad?.nisAnde && dataUnidad.nisAnde !== "N/A" && dataUnidad.nisAnde !== "SIN NIS" && dataUnidad.nisAnde !== "â€”") {
          const nisNum = parseInt(dataUnidad.nisAnde.slice(-2)) || 0;
          montoReal = 85000 + (nisNum * 2500);
      }
      return {
          id: `gasto-${g.gastoId}`,
          fechaMs: new Date(g.fecha).getTime(),
          fechaLabel: new Date(g.fecha).toLocaleString("es-PY", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          periodoLabel: g.mesReferencia && g.anioReferencia ? `${g.mesReferencia}/${g.anioReferencia}` : "â€”",
          monto: montoReal,
          origen: "gasto",
          gasto: g,
      };
    });
    const fromCobro: FilaServicioMantenimiento[] = pagosContrato
      .filter((p) => pagoCoincideTipo(p, tipo))
      .map((p, idx) => ({
        id: `pago-${p.pagoId ?? `noid`}-${idx}-${p.fechaPago}-${p.mesPagado}-${p.anioPagado}`,
        fechaMs: new Date(p.fechaPago).getTime(),
        fechaLabel: new Date(p.fechaPago).toLocaleString("es-PY", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        periodoLabel: `${p.mesPagado}/${p.anioPagado}`,
        monto: p.montoPagado,
        origen: "cobro",
        pago: p,
      }));
    return [...fromGasto, ...fromCobro].sort((a, b) => b.fechaMs - a.fechaMs);
  };

  const filasLuz = combinarFilasServicio("Luz", gastosLuz);
  const filasAgua = combinarFilasServicio("Agua", gastosAgua);
  const filasBasura = combinarFilasServicio("Basura", gastosBasura);

  const renderTablaFilasServicio = (filas: FilaServicioMantenimiento[]) => {
    if (loadingGastos && filas.length === 0) {
      return (
        <p className="text-[10px] text-muted-foreground font-bold italic py-2">Cargando registros...</p>
      );
    }
    if (filas.length === 0) {
      return (
        <p className="text-[10px] text-muted-foreground font-bold italic py-2">
          Sin cobros de este concepto ni gastos cargados en la unidad.
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
                <TableHead className="text-[8px] font-black uppercase text-muted-foreground h-8 px-2 w-[80px] text-center">Acc.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((row) => (
              <TableRow key={row.id} className="border-slate-50">
                <TableCell className="px-2 py-2">
                  <Badge
                    variant="outline"
                    className={`text-[7px] font-black uppercase border-none px-1.5 py-0 ${
                      row.origen === "cobro"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.origen === "cobro" ? "Cobro" : "Gasto unidad"}
                  </Badge>
                </TableCell>
                <TableCell className="text-[9px] font-bold text-muted-foreground px-2 py-2">{row.fechaLabel}</TableCell>
                <TableCell className="text-[9px] font-bold text-muted-foreground px-2 py-2">{row.periodoLabel}</TableCell>
                <TableCell className="text-[9px] font-black text-foreground text-right px-2 py-2">
                  {formatCurrency(row.monto)}
                </TableCell>
                <TableCell className="px-1 py-1">
                  {row.origen === "gasto" && row.gasto ? (
                    <div className="flex justify-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted"
                        title="Editar gasto de unidad"
                        onClick={() => openEditServicio(row.gasto!)}
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                        title="Eliminar gasto"
                        onClick={() => void handleDeleteServicio(row.gasto!.gastoId)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : row.origen === "cobro" && row.pago && row.pago.pagoId != null ? (
                    <div className="flex justify-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-amber-50"
                        title="Editar cobro"
                        onClick={() => openEditPagoServicio(row.pago!)}
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-700" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                        title="Eliminar cobro"
                        onClick={() => void handleDeletePagoServicio(row.pago!.pagoId!)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-amber-900/70" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[8px] font-bold text-muted-foreground block text-center px-1">â€”</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[94vh] w-[min(96vw,1320px)] max-w-[1320px] flex-col gap-0 overflow-hidden border-none p-0 shadow-2xl rounded-[2rem] bg-card sm:max-w-[1320px]">
        {/* Accesibilidad: Título para lectores de pantalla */}
        <DialogHeader className="sr-only">
          <DialogTitle>Detalle de la Unidad {unidad?.code}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 max-h-[min(94vh,920px)] flex-1 flex-col overflow-hidden">
          
          {/* HEADER PREMIUM (INQUILINO) */}
          <div className="bg-secondary p-8 text-foreground relative overflow-hidden shrink-0 border-b border-border">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center font-black text-3xl shadow-xl shadow-primary/20">
                  {dataInquilino.nombre.substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary/10 text-primary font-black italic rounded-lg px-2 py-0.5 text-[10px] uppercase tracking-wider border-none">
                      Ficha de Inquilino
                    </Badge>
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Unidad {dataUnidad.codigo}</span>
                  </div>
                  {(isEditing || isContratando) ? (
                    <Input 
                        value={contractData?.inquilino?.razonSocial || ""}
                        onChange={(e) => setContractData(prev => prev ? { ...prev, inquilino: { ...prev.inquilino, razonSocial: e.target.value } } : null)}
                        placeholder="NOMBRE DEL INQUILINO"
                        className="bg-card/50 border-white text-2xl font-black italic uppercase tracking-tighter h-12 w-96 text-foreground placeholder:text-muted-foreground"
                    />
                  ) : (
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-foreground">
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
                        <div className="flex gap-2">
                            {(() => {
                                const hoy = new Date();
                                const inicio = new Date(contractData.fechaInicioContrato);
                                const fin = new Date(contractData.fechaFinContrato);
                                
                                // Próximo vencimiento es la primera cuota no pagada
                                const nextPending = installments.slice().reverse().find(i => i.estado !== "Pagado");
                                const proximoVencimiento = nextPending ? nextPending.fechaVencimiento : (installments[0]?.fechaVencimiento || new Date());
                                
                                const diasParaFin = (fin.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
                                
                                return (
                                    <>
                                        {hoy > proximoVencimiento && nextPending?.estado === "Atrasado" ? (
                                            <Badge className="bg-red-100 text-red-700 border-none font-black text-[8px] uppercase px-2 shadow-sm">
                                                Alquiler Vencido (Desde {proximoVencimiento.toLocaleDateString()})
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[8px] uppercase px-2 shadow-sm">
                                                Al Día (Próx. Venc: {proximoVencimiento.toLocaleDateString()})
                                            </Badge>
                                        )}
                                        
                                        {diasParaFin > 0 && diasParaFin < 30 && (
                                            <Badge className="bg-orange-100 text-orange-700 border-none font-black text-[8px] uppercase px-2 shadow-sm">
                                                Contrato expira en {Math.round(diasParaFin)} días
                                            </Badge>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BARRA DE BOTONES SUPERIOR SEGUN ESTADO DEL MODAL */}
              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                {/* 1. ESTADO: EDITANDO (FICHA DETALLADA) */}
                {isRenewing ? (
                  <>
                    <Button variant="outline" onClick={() => { setIsRenewing(false); setIsEditing(false); }} className="bg-card border-border text-muted-foreground font-bold rounded-xl px-4 h-11">
                        <X className="w-4 h-4 mr-2" /> CANCELAR
                    </Button>
                    <Button onClick={handleRenovarContrato} className="bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl px-6 shadow-lg shadow-blue-500/20 hover:scale-105 transition-all h-11">
                        <Save className="w-4 h-4 mr-2" /> RENOVAR
                    </Button>
                  </>
                ) : contractData && !isContratando && (
                    <>
                        {isEditing ? (
                            <>
                                <Button variant="outline" onClick={() => setIsEditing(false)} className="bg-card border-border text-muted-foreground font-bold rounded-xl px-4 h-11">
                                    <X className="w-4 h-4 mr-2" /> CANCELAR
                                </Button>
                                <Button onClick={handleUpdate} className="bg-emerald-600 text-white font-black italic rounded-xl px-6 shadow-lg shadow-emerald-200 hover:scale-105 transition-all h-11">
                                    <Save className="w-4 h-4 mr-2" /> GUARDAR
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={() => setIsGenerarContratoModalOpen(true)} variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 font-black italic rounded-xl px-4 h-11 hover:bg-amber-100 shadow-sm">
                                    <FileText className="w-4 h-4 mr-2" /> GENERAR CONTRATO
                                </Button>
                                <Button onClick={handleCompartirWhatsAppFicha} variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-black italic rounded-xl px-4 h-11 hover:bg-emerald-100 shadow-sm">
                                    <Phone className="w-4 h-4 mr-2" /> COMPARTIR WHATSAPP
                                </Button>
                                <Button onClick={() => setIsEditing(true)} variant="outline" className="bg-card border-border text-foreground font-bold rounded-xl px-4 h-11 hover:bg-muted">
                                    <Pencil className="w-4 h-4 mr-2" /> EDITAR FICHA
                                </Button>
                                <Button 
                                    onClick={() => {
                                        const deuda = calcularDeudaAtrasada();
                                        setDeudaTotalDesalojo(deuda);
                                        setIsDesalojarModalOpen(true);
                                    }}
                                    className="bg-red-600 text-white font-black italic rounded-xl px-4 h-11 hover:bg-red-700 hover:scale-105 transition-all shadow-lg shadow-red-500/20"
                                >
                                    <AlertCircle className="w-4 h-4 mr-2" /> DESALOJAR
                                </Button>
                            </>
                        )}
                    </>
                )}
                {!isEditing && !isContratando && !isRenewing && (
                    <>
                        {(!contractData || dataUnidad.estado === "Disponible") && (
                            <Button 
                                onClick={handleStartContratar} 
                                className="bg-emerald-600 text-white font-black italic rounded-xl px-4 h-11 hover:bg-emerald-700 hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 mr-2"
                            >
                                <Plus className="w-4 h-4 mr-2" /> CONTRATAR
                            </Button>
                        )}
                        <Button className="bg-primary text-primary-foreground font-black italic rounded-xl px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-all h-11 ml-2">
                            <Download className="w-4 h-4 mr-2" /> EXP. PDF
                        </Button>
                    </>
                )}
                {isContratando && (
                    <>
                        <Button variant="outline" onClick={() => setIsContratando(false)} className="bg-card border-border text-muted-foreground font-bold rounded-xl px-4 h-11">
                            <X className="w-4 h-4 mr-2" /> CANCELAR
                        </Button>
                        <Button onClick={handlePrintContract} className="bg-primary text-primary-foreground font-black italic rounded-xl px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-all h-11 mx-2">
                            <Printer className="w-4 h-4 mr-2" /> IMPR. CONTRATO
                        </Button>
                        <Button onClick={handleContratar} className="bg-emerald-600 text-white font-black italic rounded-xl px-6 shadow-lg shadow-emerald-200 hover:scale-105 transition-all h-11">
                            <Save className="w-4 h-4 mr-2" /> GUARDAR CONTRATO
                        </Button>
                    </>
                )}
              </div>
            </div>

            {/* TABS SELECTOR */}
            <div className="flex gap-8 mt-10 border-b border-white/5">
              {([
                { id: "ficha", label: "Ficha Detallada", icon: Info },
                { id: "pagos", label: "Historial Pagos", icon: DollarSign },
                { id: "gastos", label: "Mantenimiento", icon: AlertCircle },
                { id: "documentos", label: "Documentos", icon: FileText }
              ] as const).map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-8 bg-muted">
            
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
                                { label: "Monto Alquiler", value: dataInquilino.montoMensual, key: "montoMensualAlquiler", type: "number", highlight: "text-blue-600" },
                                { label: "Depósito / Garantía", value: dataInquilino.garantia, key: "depositoGarantia", type: "number" },
                                { label: "Vehículo", value: dataInquilino.vehiculo, key: "vehiculoInfo", icon: Car },
                                { label: "Contrato Inicio", value: contractData?.fechaInicioContrato ? new Date(contractData.fechaInicioContrato).toISOString().split('T')[0] : "", key: "fechaInicioContrato", type: "date" },
                                { label: "Contrato Fin", value: contractData?.fechaFinContrato ? new Date(contractData.fechaFinContrato).toISOString().split('T')[0] : "", key: "fechaFinContrato", type: "date", highlight: "text-orange-600" },
                            ] as EditItem[]).map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{item.label}</p>
                                    <div className="flex items-center gap-2">
                                        {item.icon && <item.icon className="w-3 h-3 text-muted-foreground" />}
                                        {(isEditing || isContratando) ? (
                                            <Input 
                                                type={item.type || "text"}
                                                value={
                                                    item.type === "date" 
                                                    ? (((item.parent ? (contractData?.[item.parent] as Persona)?.[item.key] : (contractData as Record<string, unknown>)?.[item.key]) as string)?.split('T')[0] ?? "")
                                                    : (((item.parent ? (contractData?.[item.parent] as Persona)?.[item.key] : (contractData as Record<string, unknown>)?.[item.key]) ?? "") as string | number)
                                                }
                                                onChange={(e) => {
                                                    const val = item.type === "number" ? Number(e.target.value) : e.target.value;
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
                                            <p className={`text-sm font-black italic uppercase ${item.highlight || 'text-foreground'}`}>
                                                {item.type === "number" ? formatCurrency(item.value as number) : (item.value || "N/A")}
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
                                    <p className="text-3xl font-black italic text-primary">{dataUnidad.codigo}</p>
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
                                            onChange={(e) => setLocalNisAnde(e.target.value)} 
                                            className="h-8 w-32 text-right font-black italic text-foreground"
                                        />
                                    ) : (
                                        <p className="text-sm font-black italic text-foreground">{localNisAnde}</p>
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
                    <div className="flex justify-between items-center bg-card p-6 rounded-[2rem] shadow-sm border border-border">
                        <div className="flex items-center gap-6">
                            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground">Control de Pagos</h3>
                                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Historial completo del inquilino</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                onClick={() => {
                                    setTimeout(() => window.print(), 100);
                                }}
                                variant="outline"
                                className="bg-card text-foreground border-border font-black italic rounded-xl px-4 h-12 hover:bg-muted transition-all hidden md:flex items-center"
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
                                    setPaymentForm(prev => ({
                                        ...prev,
                                        monto: nextDue ? (nextDue.monto - nextDue.pagado) : contractData?.montoMensualAlquiler || 0,
                                        mes: nextDue?.mes || new Date().getMonth() + 1,
                                        anio: nextDue?.anio || new Date().getFullYear()
                                    }));
                                    setIsRegisteringPayment(true);
                                }}
                                className="bg-slate-900 text-white font-black italic rounded-xl px-8 h-12 shadow-xl hover:scale-105 transition-all"
                            >
                               REGISTRAR COBRO
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-4 items-end bg-card p-4 rounded-[2rem] border border-border shadow-sm print:hidden">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Desde</label>
                            <Input 
                                type="date" 
                                value={filterDesde} 
                                onChange={(e) => setFilterDesde(e.target.value)} 
                                className="bg-muted border-none rounded-xl h-10 font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Hasta</label>
                            <Input 
                                type="date" 
                                value={filterHasta} 
                                onChange={(e) => setFilterHasta(e.target.value)} 
                                className="bg-muted border-none rounded-xl h-10 font-bold"
                            />
                        </div>
                        {(filterDesde || filterHasta) && (
                            <Button 
                                variant="ghost" 
                                onClick={() => { setFilterDesde(""); setFilterHasta(""); }}
                                className="h-10 text-xs font-bold text-muted-foreground uppercase tracking-widest"
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
                                                                    const resp = await fetch(`http://localhost:5034/api/Contratos/pago/${row.pago.pagoId}`, { method: "DELETE" });
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

            {activeTab === "gastos" && (
                <div className="animate-in fade-in duration-500 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <section className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-orange-50 p-2 rounded-xl">
                                    <Zap className="w-5 h-5 text-orange-500" />
                                </div>
                                <h3 className="font-black italic uppercase tracking-tighter text-foreground">Historial de Luz Abonada (ANDE)</h3>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-black italic uppercase text-foreground text-sm">Gasto de Luz (ANDE)</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-orange-100 text-orange-600 border-none font-black text-[8px] uppercase px-3 py-1">NIS: {dataUnidad.nisAnde}</Badge>
                                    <Button 
                                        variant="default"
                                        size="sm"
                                        className="h-6 text-[8px] bg-blue-600 text-white font-black hover:bg-blue-700 border-none uppercase tracking-widest px-3"
                                        onClick={() => {
                                            if(!dataUnidad.nisAnde) {
                                                toast.error("El inquilino no tiene un número de NIS registrado.");
                                                return;
                                            }
                                            toast.info("Conectando con la red ANDE / Infonet...");
                                            setTimeout(() => toast.success("Consulta Exitosa. Al día - Monto Factura actual: Gs. 0"), 2000);
                                        }}
                                    >
                                        Consultar ANDE
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {dataInquilino.serviciosIncluidos.includes("Luz") ? (
                                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Incluido en Alquiler</p>
                                        <p className="text-[9px] font-bold text-emerald-500 italic mt-1">El monto mensual cubre este servicio.</p>
                                    </div>
                                ) : (
                                    <>
                                        {(() => {
                                            const ultimo = filasLuz[0];
                                            return (
                                                <>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-muted-foreground font-bold uppercase">Último registro</span>
                                                        <span className="font-black text-foreground">
                                                          {ultimo ? ultimo.fechaLabel : "Sin registros"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-muted-foreground font-bold uppercase">Monto</span>
                                                        <span className="font-black text-blue-600">
                                                          {ultimo ? formatCurrency(ultimo.monto) : "Gs. 0"}
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        {renderTablaFilasServicio(filasLuz)}
                                        <Button
                                            onClick={() => openCreateServicio("Luz")}
                                            variant="outline"
                                            className="w-full border-dashed border-border text-[10px] font-black uppercase py-3 h-auto hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all rounded-xl"
                                        >
                                            Cargar Recibo Luz
                                        </Button>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="bg-card p-8 rounded-[2rem] border border-border shadow-sm flex items-center justify-center text-center py-10">
                        <div className="max-w-xs space-y-4">
                            <div className="bg-muted w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black italic uppercase text-foreground text-[12px] tracking-tighter">Mantenimiento Correctivo</h4>
                                <p className="text-muted-foreground text-[10px] font-bold italic mt-1">No hay incidencias de infraestructura reportadas.</p>
                            </div>
                            <Button className="bg-slate-900 text-white font-black italic rounded-xl px-6 h-10 text-[10px] uppercase">
                                REPORTAR INCIDENCIA
                            </Button>
                        </div>
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
                                    <p className="text-muted-foreground text-[11px] font-medium">Sustituye automáticamente las variables ({'{'}Locatario{'}'}, {'{'}Duplex{'}'}, {'{'}MontoAlquiler{'}'}) con los datos de <strong className="text-amber-300 font-bold">{contractData?.inquilino?.razonSocial || contractData?.inquilino?.nombre || unidad?.tenant || "este inquilino"}</strong> en el Dúplex <strong className="text-amber-300 font-bold">{unidad?.code}</strong>.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                                <select 
                                    value={selectedPlantillaId}
                                    onChange={(e) => setSelectedPlantillaId(Number(e.target.value))}
                                    className="bg-slate-800/90 border border-slate-600 text-white text-xs rounded-xl px-4 py-3 font-bold uppercase outline-none focus:border-amber-400 transition-all w-full sm:w-64"
                                >
                                    <option value={0}>— Seleccionar Plantilla Word —</option>
                                    {plantillasList.map((p: any) => (
                                        <option key={p.plantillaId} value={p.plantillaId}>{p.nombre} ({p.tipo})</option>
                                    ))}
                                </select>
                                <Button 
                                    onClick={handleDescargarWord}
                                    disabled={!selectedPlantillaId || selectedPlantillaId === 0 || isGeneratingDoc}
                                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-6 py-6 rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/20 whitespace-nowrap transition-all hover:scale-105 active:scale-95"
                                >
                                    <Download className="w-4 h-4 mr-2 stroke-[2.5]" />
                                    {isGeneratingDoc ? "Generando Word..." : "Descargar Word"}
                                </Button>
                                <Button 
                                    onClick={() => setIsGenerarContratoModalOpen(true)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-5 py-6 rounded-xl uppercase tracking-wider shadow-lg whitespace-nowrap transition-all hover:scale-105 active:scale-95"
                                >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar Datos y Generar Contrato
                                </Button>
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
                                                                    ? `http://localhost:5034${documentUrls[doc.id]}` 
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
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Registro de todos los inquilinos y contratos pasados de la unidad {dataUnidad.codigo}</p>
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

          </div>

          <DialogFooter className="p-8 pt-4 border-t border-border bg-card flex items-center justify-between shrink-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Expediente OIMA Condominios v2.0</p>
            <div className="flex gap-3">
                <Button onClick={onClose} variant="ghost" className="font-black italic text-xs text-muted-foreground uppercase tracking-widest">SALIR</Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>

      {/* MODAL DE REGISTRO DE COBRO */}
      <Dialog open={isRegisteringPayment} onOpenChange={setIsRegisteringPayment}>
        <DialogContent className="sm:max-w-[450px] p-8 rounded-[2rem] bg-card border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Registrar Cobro - Unidad {dataUnidad.codigo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                    <DollarSign className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground">Registrar Cobro</h3>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Unidad {dataUnidad.codigo}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mes a Cobrar</label>
                        <select 
                            value={paymentForm.mes}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, mes: Number(e.target.value) }))}
                            className="w-full bg-muted border-none rounded-xl p-3 text-sm font-bold text-foreground focus:ring-2 ring-primary"
                        >
                            {installments.map(i => (
                                <option key={`${i.anio}-${i.mes}-${i.fechaVencimiento.getDate()}`} value={i.mes}>{i.mesNombre} {i.anio} ({i.fechaVencimiento.getDate()})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Año</label>
                        <Input 
                            type="number"
                            value={paymentForm.anio}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, anio: Number(e.target.value) }))}
                            className="bg-muted border-none rounded-xl h-11 font-bold"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Monto a Cobrar</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground">Gs.</span>
                        <Input 
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
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Unidad {dataUnidad.codigo}</p>
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
                                onClick={handleConsultarAnde}
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
                  Unidad {dataUnidad.codigo}
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
                      <p className="text-xs font-bold text-muted-foreground leading-relaxed text-center px-4">
                          Al confirmar un <strong>Desalojo</strong> o una <strong>Renovación</strong>, el saldo pendiente se transferirá automáticamente a un <strong>Expediente de Mora</strong> configurado abajo:
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

               <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" className="w-full sm:w-32 rounded-xl font-bold h-12 text-muted-foreground hover:bg-muted shrink-0" onClick={() => setIsDesalojarModalOpen(false)}>
                     CANCELAR
                  </Button>
                  <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
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
                      <Button 
                         className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black italic rounded-xl shadow-lg shadow-red-500/20 h-12 hover:scale-105 transition-all"
                         onClick={handleConfirmarDesalojo}
                         disabled={isLoading}
                      >
                         {isLoading ? "PROCESANDO..." : "CONFIRMAR DESALOJO"}
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
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Motor OCR Inteligente Gesco</p>
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
      <ComprobantePreviewModal
        isOpen={isPreviewComprobanteOpen}
        onClose={() => setIsPreviewComprobanteOpen(false)}
        pagoData={comprobantePagoData}
        onSaved={() => {
          fetchContract();
          if (onUpdate) onUpdate();
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
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Se mantendrá intacta la ficha detallada y el historial de pagos tal como estaba antes.
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
                    const res = await fetch(`http://localhost:5034/api/Contratos/${confirmAnularContrato.contratoId}/anular-desalojo`, { method: "POST" });
                    if (res.ok) {
                      toast.success("Desalojo anulado. Contrato e inquilino restablecidos intactos como activos.");
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
                Verifica los datos del contrato antes de enviarlo. Al hacer clic en enviar, descargaremos el archivo en tu equipo para que lo adjuntes en el chat de WhatsApp.
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
              >
                📥 Descargar Archivo (.DOC)
              </Button>

              <Button
                onClick={() => {
                  descargarContratoDoc(contractData, dataUnidad);
                  const phoneRaw = contractData?.inquilino?.telefono || "";
                  let phoneClean = phoneRaw.replace(/\D/g, "");
                  if (phoneClean.startsWith("0")) {
                    phoneClean = "595" + phoneClean.substring(1);
                  } else if (phoneClean.length === 9 && phoneClean.startsWith("9")) {
                    phoneClean = "595" + phoneClean;
                  }
                  const nombre = contractData?.inquilino?.razonSocial || contractData?.inquilino?.nombre || "Cliente";
                  const texto = encodeURIComponent(`Hola ${nombre}, le compartimos su Contrato de Locación del Dúplex ${unidad?.code || ""}.`);
                  window.open(`https://wa.me/${phoneClean}?text=${texto}`, "_blank");
                  setShowWhatsAppPreviewModal(false);
                  setShowWhatsAppModal(true);
                }}
                className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-600/20"
              >
                📲 Descargar y Abrir WhatsApp
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
                El archivo del contrato fue descargado en tu equipo y abrimos el chat de WhatsApp del cliente ({contractData?.inquilino?.telefono}). Solo adjunta el archivo descargado en la conversación.
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
      {/* MODAL DE RESTRICCIÓN DE SEGURIDAD GESCO */}
      <ModalAccesoRestringido
        isOpen={alertaRestriccion.visible}
        onClose={() => setAlertaRestriccion({ visible: false })}
        mensaje={alertaRestriccion.mensaje}
        permisoNombre={alertaRestriccion.permisoNombre}
      />
    </Dialog>
  );
}

