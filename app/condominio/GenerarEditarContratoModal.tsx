"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  FileText,
  Calendar,
  DollarSign,
  Car,
  Users,
  Save,
  Phone,
  Mail,
  Download,
  Printer,
  FileCheck,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { ContratoImprimible, descargarContratoDoc } from "./ContratoImprimible";

interface GenerarEditarContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidad: any;
  contractData: any;
  onSaved: () => void;
}

export function GenerarEditarContratoModal({
  isOpen,
  onClose,
  unidad,
  contractData,
  onSaved
}: GenerarEditarContratoModalProps) {
  const [loadingSave, setLoadingSave] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [plantillasList, setPlantillasList] = useState<any[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showWhatsAppPreviewModal, setShowWhatsAppPreviewModal] = useState(false);

  // Form state
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [montoMensual, setMontoMensual] = useState<number>(0);
  const [garantia, setGarantia] = useState<number>(0);
  const [cantidadOcupantes, setCantidadOcupantes] = useState<number>(1);
  const [vehiculo, setVehiculo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [serviciosIncluidos, setServiciosIncluidos] = useState<string>("");

  // Helper para convertir fechas a formato YYYY-MM-DD para input[type=date]
  const toDateInput = (val?: string) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val.substring(0, 10);
      return d.toISOString().substring(0, 10);
    } catch {
      return val.substring(0, 10);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (contractData) {
        setNombreCompleto(contractData.inquilino?.razonSocial || contractData.inquilino?.nombre || "");
        setCedula(contractData.inquilino?.documento || contractData.inquilino?.cedula || "");
        setTelefono(contractData.inquilino?.telefono || "");
        setEmail(contractData.inquilino?.email || "");
        setFechaIngreso(toDateInput(contractData.fechaIngreso));
        setFechaInicio(toDateInput(contractData.fechaInicioContrato));
        setFechaFin(toDateInput(contractData.fechaFinContrato));
        setMontoMensual(Number(contractData.montoMensualAlquiler || 0));
        setGarantia(Number(contractData.depositoGarantia || 0));
        setCantidadOcupantes(Number(contractData.cantidadOcupantes || 1));
        setVehiculo(contractData.vehiculoInfo || "");
        setObservaciones(contractData.observaciones || "");
        const sInc = contractData.serviciosIncluidos;
        setServiciosIncluidos(Array.isArray(sInc) ? sInc.join(", ") : (sInc || ""));
      }

      // Cargar plantillas de contrato
      fetch("http://localhost:5034/api/Plantillas")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setPlantillasList(data);
            if (data.length > 0 && selectedPlantillaId === 0) {
              setSelectedPlantillaId(data[0].plantillaId);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, contractData]);

  const saveContractChanges = async (): Promise<boolean> => {
    if (!contractData) {
      toast.error("No se encontró contrato activo para esta unidad.");
      return false;
    }

    if (!nombreCompleto.trim() || !cedula.trim()) {
      toast.error("El nombre del inquilino y la cédula/RUC son obligatorios.");
      return false;
    }

    setLoadingSave(true);
    try {
      const resp = await fetch("http://localhost:5034/api/Contratos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoId: contractData.contratoId,
          inquilinoId: contractData.inquilinoId,
          empresaId: contractData.inquilino?.empresaId || 7,
          unidadId: contractData.unidadId || unidad?.id || 0,
          nombreCompleto: nombreCompleto.trim(),
          cedula: cedula.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          fechaIngreso: fechaIngreso || contractData.fechaIngreso,
          fechaInicio: fechaInicio || contractData.fechaInicioContrato,
          fechaFin: fechaFin || contractData.fechaFinContrato,
          montoMensual: Number(montoMensual || 0),
          garantia: Number(garantia || 0),
          cantidadOcupantes: Number(cantidadOcupantes || 1),
          vehiculo: vehiculo.trim(),
          observaciones: observaciones.trim(),
          serviciosIncluidos: typeof serviciosIncluidos === "string" ? (serviciosIncluidos.trim() || null) : Array.isArray(serviciosIncluidos) ? (serviciosIncluidos as any).join(", ") : null
        })
      });

      if (resp.ok) {
        toast.success("¡Contrato actualizado correctamente con los nuevos datos!");
        onSaved();
        return true;
      } else {
        const errText = await resp.text();
        console.error("Error API Contratos:", errText);
        toast.error("No se pudieron guardar los cambios en el servidor.");
        return false;
      }
    } catch (err) {
      console.error("Error al guardar contrato:", err);
      toast.error("Error de red al conectar con el servidor.");
      return false;
    } finally {
      setLoadingSave(false);
    }
  };

  const handleSoloGuardar = async () => {
    const success = await saveContractChanges();
    if (success) {
      onClose();
    }
  };

  const handleGuardarYDescargarWord = async () => {
    const success = await saveContractChanges();
    if (!success) return;

    if (!selectedPlantillaId || selectedPlantillaId === 0) {
      toast.error("Por favor selecciona una plantilla Word (.DOCX) de contrato para descargar.");
      return;
    }

    setIsGeneratingDoc(true);
    try {
      const loc = encodeURIComponent(nombreCompleto.trim() || "Sin Nombre");
      const dup = encodeURIComponent(unidad.code || "");
      const mon = Number(montoMensual || 0);
      const cId = contractData?.contratoId || 0;

      const response = await fetch(
        `http://localhost:5034/api/Plantillas/generar-doc?plantillaId=${selectedPlantillaId}&locatario=${loc}&duplex=${dup}&montoAlquiler=${mon}&contratoId=${cId}`
      );

      if (!response.ok) {
        throw new Error("No se pudo generar el documento en el servidor.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Contrato_${unidad.code}_${nombreCompleto.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Documento legal de contrato .DOCX generado y descargado exitosamente");
      onClose();
    } catch (e) {
      console.error("Error generando Word:", e);
      toast.error("Error generando el documento Word.");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleGuardarEImprimir = async () => {
    const success = await saveContractChanges();
    if (success) {
      setTimeout(() => {
        window.print();
      }, 250);
    }
  };

  const handleCompartirWhatsApp = async () => {
    const phoneRaw = telefono || contractData?.inquilino?.telefono || "";
    if (!phoneRaw || phoneRaw === "N/A" || phoneRaw.trim().length < 6) {
      toast.warning("⚠️ No hay un número de celular/WhatsApp registrado para este inquilino. Cárgalo primero en el campo Teléfono.");
      return;
    }

    await saveContractChanges();
    setShowWhatsAppPreviewModal(true);
  };

  const liveContractData = {
    ...contractData,
    nombreCompleto,
    cedula,
    inquilino: {
      ...contractData?.inquilino,
      razonSocial: nombreCompleto,
      nombre: nombreCompleto,
      documento: cedula,
      cedula,
      telefono,
      email
    },
    fechaInicioContrato: fechaInicio,
    fechaFinContrato: fechaFin,
    montoMensualAlquiler: montoMensual,
    depositoGarantia: garantia,
    cantidadOcupantes,
    vehiculoInfo: vehiculo,
    observaciones,
    serviciosIncluidos
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[760px] p-0 rounded-[2rem] bg-card border-none shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 px-8 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black italic tracking-tight text-white flex items-center gap-2">
                Generar y Editar Contrato — Unidad {unidad.code}
              </DialogTitle>
              <p className="text-xs font-medium text-muted-foreground">
                Edita los datos del contrato o inquilino antes de generar el documento legal actualizado
              </p>
            </div>
          </div>
        </div>

        {/* PESTAÑAS SWITCHER */}
        <div className="px-8 pt-4 flex items-center gap-2 border-b border-border bg-muted/50">
          <Button
            type="button"
            variant={activeTab === "edit" ? "default" : "outline"}
            onClick={() => setActiveTab("edit")}
            className={`text-xs font-black rounded-xl h-9 px-4 ${activeTab === "edit" ? "bg-slate-900 text-white" : "text-muted-foreground bg-card"}`}
          >
            ✏️ Editar Formulario
          </Button>
          <Button
            type="button"
            variant={activeTab === "preview" ? "default" : "outline"}
            onClick={() => setActiveTab("preview")}
            className={`text-xs font-black rounded-xl h-9 px-4 ${activeTab === "preview" ? "bg-slate-900 text-white" : "text-muted-foreground bg-card"}`}
          >
            📄 Vista Previa Contrato Legal
          </Button>
        </div>

        {/* CONTENIDO EDITABLE O VISTA PREVIA */}
        {activeTab === "edit" ? (
          <div className="p-8 space-y-7 overflow-y-auto max-h-[64vh]">
            {/* SECCIÓN 1: DATOS DEL INQUILINO */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 border-b border-border pb-2">
              <User className="w-4 h-4" /> 1. Datos del Locatario / Inquilino
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Razón Social / Nombre Completo *
                </Label>
                <Input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="rounded-xl border-border font-bold"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Cédula / RUC *
                </Label>
                <Input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="rounded-xl border-border font-bold"
                  placeholder="Ej. 4.567.890"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Teléfono / Celular
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="pl-10 rounded-xl border-border font-medium"
                    placeholder="Ej. 0981 123 456"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 rounded-xl border-border font-medium"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: FECHAS Y MONTOS DEL CONTRATO */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 border-b border-border pb-2">
              <Calendar className="w-4 h-4" /> 2. Plazos y Montos del Contrato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Fecha Ingreso
                </Label>
                <Input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="rounded-xl border-border font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Inicio Contrato
                </Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="rounded-xl border-border font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Fin Contrato
                </Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="rounded-xl border-border font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Alquiler Mensual (Gs)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  <Input
                    type="number"
                    value={montoMensual}
                    onChange={(e) => setMontoMensual(Number(e.target.value))}
                    className="pl-10 rounded-xl border-border bg-emerald-50/40 text-emerald-700 font-black text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Depósito de Garantía (Gs)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={garantia}
                    onChange={(e) => setGarantia(Number(e.target.value))}
                    className="pl-10 rounded-xl border-border font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: INFORMACIÓN ADICIONAL */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 border-b border-border pb-2">
              <Users className="w-4 h-4" /> 3. Información Adicional
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Cantidad de Ocupantes
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={cantidadOcupantes}
                  onChange={(e) => setCantidadOcupantes(Number(e.target.value))}
                  className="rounded-xl border-border font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Vehículo / Patente
                </Label>
                <div className="relative">
                  <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={vehiculo}
                    onChange={(e) => setVehiculo(e.target.value)}
                    className="pl-10 rounded-xl border-border font-medium"
                    placeholder="Ej. Kia Rio Gris - ABC 123"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">
                Observaciones o Cláusulas Particulares
              </Label>
              <Input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="rounded-xl border-border font-medium"
                placeholder="Observaciones del contrato..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">
                Servicios Incluidos en el Alquiler
              </Label>
              <Input
                type="text"
                value={serviciosIncluidos}
                onChange={(e) => setServiciosIncluidos(e.target.value)}
                className="rounded-xl border-border font-medium"
                placeholder="Ej. Agua, Luz, Expensas..."
              />
            </div>
          </div>

          {/* SECCIÓN 4: PLANTILLA DE CONTRATO WORD */}
          <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/70 space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-600" /> Plantilla de Documento Legal Oficial (.DOCX)
            </h4>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={selectedPlantillaId}
                onChange={(e) => setSelectedPlantillaId(Number(e.target.value))}
                className="bg-card border border-amber-300 text-foreground text-xs rounded-xl px-3.5 py-3 font-bold uppercase outline-none focus:border-amber-500 flex-1"
              >
                <option value={0}>— Seleccionar Plantilla Word —</option>
                {plantillasList.map((p: any) => (
                  <option key={p.plantillaId} value={p.plantillaId}>
                    {p.nombre} ({p.tipo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[64vh] bg-muted">
            <ContratoImprimible
              contractData={liveContractData}
              dataUnidad={unidad}
              localNisAnde={unidad?.nisAnde || ""}
              isPreview={true}
            />
          </div>
        )}

        {/* ELEMENTO IMPRIMIBLE LEGAL (Oculto en pantalla, se imprime a página completa) */}
        <ContratoImprimible
          contractData={liveContractData}
          dataUnidad={unidad}
          localNisAnde={unidad?.nisAnde || ""}
          isPreview={false}
        />

        {/* FOOTER */}
        <DialogFooter className="bg-muted p-6 px-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loadingSave || isGeneratingDoc}
            className="rounded-xl font-bold text-xs uppercase"
          >
            Cancelar
          </Button>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleSoloGuardar}
              disabled={loadingSave || isGeneratingDoc}
              variant="outline"
              className="border-border text-foreground hover:bg-muted font-black text-xs uppercase rounded-xl px-4 h-11"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {loadingSave ? "Guardando..." : "Guardar Cambios"}
            </Button>

            <Button
              onClick={handleGuardarEImprimir}
              disabled={loadingSave || isGeneratingDoc}
              variant="outline"
              className="bg-card border-blue-200 text-blue-700 hover:bg-blue-50 font-black text-xs uppercase rounded-xl px-4 h-11"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Guardar e Imprimir
            </Button>

            <Button
              onClick={handleCompartirWhatsApp}
              disabled={loadingSave || isGeneratingDoc}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl px-4 h-11 shadow-lg shadow-emerald-500/20"
            >
              <Phone className="w-4 h-4 mr-1.5" />
              Compartir por WhatsApp
            </Button>

            <Button
              onClick={handleGuardarYDescargarWord}
              disabled={loadingSave || isGeneratingDoc}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase rounded-xl px-5 h-11 shadow-lg shadow-amber-500/20"
            >
              <Download className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {isGeneratingDoc ? "Generando..." : "Guardar y Descargar Word"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* MODAL DE VISTA PREVIA Y COMPARTIR POR WHATSAPP */}
      {showWhatsAppPreviewModal && (
        <Dialog open={showWhatsAppPreviewModal} onOpenChange={setShowWhatsAppPreviewModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6 rounded-2xl bg-card">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-foreground flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">📲</span>
                Vista Previa del Contrato — Enviar por WhatsApp
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto border border-border rounded-xl p-4 bg-muted my-2">
              <ContratoImprimible
                contractData={liveContractData}
                dataUnidad={unidad}
                isPreview={true}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  descargarContratoDoc(liveContractData, unidad);
                  toast.success("📄 Archivo del contrato legal .DOC descargado en tu equipo.");
                }}
                className="h-11 px-5 font-bold text-xs uppercase rounded-xl border-border"
              >
                📥 Descargar Archivo (.DOC)
              </Button>

              <Button
                onClick={() => {
                  descargarContratoDoc(liveContractData, unidad);
                  const phoneRaw = telefono || contractData?.inquilino?.telefono || "";
                  let phoneClean = phoneRaw.replace(/\D/g, "");
                  if (phoneClean.startsWith("0")) {
                    phoneClean = "595" + phoneClean.substring(1);
                  } else if (phoneClean.length === 9 && phoneClean.startsWith("9")) {
                    phoneClean = "595" + phoneClean;
                  }
                  const texto = encodeURIComponent(`Hola ${nombreCompleto || "Cliente"}, le compartimos su Contrato de Locación del Dúplex ${unidad?.code || ""}.`);
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
                El archivo del contrato fue descargado en tu equipo y abrimos el chat de WhatsApp del cliente ({telefono || contractData?.inquilino?.telefono}). Solo adjunta el archivo descargado en la conversación.
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
    </Dialog>
  );
}
