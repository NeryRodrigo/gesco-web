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
  Printer,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { ContratoImprimible, descargarContratoDoc, descargarContratoPDF, resolveCodeudor, serializeCodeudorEnObservaciones } from "./ContratoImprimible";
import { digitoVerificadorRucPy, formatMilesPy, parseMilesPy } from "@/lib/rucParaguay";
import { sharePdfViaWhatsApp, prepareWhatsAppShareWindow } from "@/lib/whatsappShare";
import { formatFechaCorta } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showWhatsAppPreviewModal, setShowWhatsAppPreviewModal] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [whatsAppResultMsg, setWhatsAppResultMsg] = useState("");

  // Form state
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<"CI" | "RUC">("CI");
  const [documentoNumero, setDocumentoNumero] = useState(""); // solo dígitos base (sin DV)
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
  const [codeudorNombre, setCodeudorNombre] = useState("");
  const [codeudorCedula, setCodeudorCedula] = useState("");
  const [codeudorDireccion, setCodeudorDireccion] = useState("");
  const [codeudorTelefono, setCodeudorTelefono] = useState("");

  const documentoCompleto =
    tipoDocumento === "RUC" && documentoNumero
      ? `${documentoNumero}-${digitoVerificadorRucPy(documentoNumero)}`
      : documentoNumero;

  const onChangeDocumentoNumero = (valor: string) => {
    if (tipoDocumento === "CI") {
      setDocumentoNumero(valor.replace(/\D/g, ""));
      return;
    }

    // RUC: el campo muestra BASE-DV; al editar solo importa la base (antes del guión).
    // Si el usuario escribe dígitos al final (tras el DV), se agregan a la base.
    const prevBase = documentoNumero;
    const prevDv = prevBase ? String(digitoVerificadorRucPy(prevBase)) : "";
    const digits = valor.replace(/\D/g, "");

    let base: string;
    if (valor.includes("-")) {
      const izquierda = valor.split("-")[0].replace(/\D/g, "");
      const derecha = valor.split("-").slice(1).join("").replace(/\D/g, "");
      if (derecha.length > 1) {
        base = izquierda + derecha.slice(1);
      } else if (
        prevBase &&
        digits.length === prevBase.length + 2 &&
        digits.startsWith(prevBase)
      ) {
        base = prevBase + digits.slice(-1);
      } else {
        base = izquierda;
      }
    } else if (prevBase && digits === prevBase) {
      // Borró el guión/DV → quitar último dígito de la base
      base = prevBase.slice(0, -1);
    } else if (
      prevBase &&
      prevDv &&
      digits === prevBase + prevDv
    ) {
      base = prevBase;
    } else if (
      prevBase &&
      digits.length === prevBase.length + 2 &&
      digits.startsWith(prevBase)
    ) {
      base = prevBase + digits.slice(-1);
    } else {
      base = digits;
    }

    setDocumentoNumero(base);
  };

  const onChangeTipoDocumento = (tipo: "CI" | "RUC") => {
    setTipoDocumento(tipo);
    // El número base se mantiene; el guión+DV solo aplica si es RUC
  };

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

  const GsIcon = ({ className }: { className?: string }) => (
    <span className={`flex items-center justify-center font-black italic text-[10px] leading-none select-none ${className}`}>
      Gs
    </span>
  );


  useEffect(() => {
    if (isOpen) {
      if (contractData) {
        setNombreCompleto(contractData.inquilino?.razonSocial || contractData.inquilino?.nombre || "");
        const docRaw = String(contractData.inquilino?.documento || contractData.inquilino?.cedula || "");
        const esRuc = docRaw.includes("-");
        setTipoDocumento(esRuc ? "RUC" : "CI");
        setDocumentoNumero(docRaw.includes("-") ? docRaw.split("-")[0].replace(/\D/g, "") : docRaw.replace(/\D/g, ""));
        setTelefono(contractData.inquilino?.telefono || "");
        setEmail(contractData.inquilino?.email || "");
        setFechaIngreso(toDateInput(contractData.fechaIngreso));
        setFechaInicio(toDateInput(contractData.fechaInicioContrato));
        setFechaFin(toDateInput(contractData.fechaFinContrato));
        setMontoMensual(Number(contractData.montoMensualAlquiler || 0));
        setGarantia(Number(contractData.depositoGarantia || 0));
        setCantidadOcupantes(Number(contractData.cantidadOcupantes || 1));
        setVehiculo(contractData.vehiculoInfo || "");
        const cod = resolveCodeudor(contractData);
        setCodeudorNombre(cod.nombre || contractData.codeudorNombre || "");
        setCodeudorCedula(cod.cedula || contractData.codeudorCedula || "");
        setCodeudorDireccion(cod.direccion || contractData.codeudorDireccion || "");
        setCodeudorTelefono(cod.telefono || contractData.codeudorTelefono || "");
        setObservaciones(cod.observacionesLimpias || "");
        const sInc = contractData.serviciosIncluidos;
        setServiciosIncluidos(Array.isArray(sInc) ? sInc.join(", ") : (sInc || ""));
      }
    }
  }, [isOpen, contractData]);

  const saveContractChanges = async (): Promise<boolean> => {
    if (!contractData) {
      toast.error("No se encontró contrato activo para esta unidad.");
      return false;
    }

    if (!nombreCompleto.trim() || !documentoCompleto.trim()) {
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
          cedula: documentoCompleto.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          fechaIngreso: fechaIngreso || contractData.fechaIngreso,
          fechaInicio: fechaInicio || contractData.fechaInicioContrato,
          fechaFin: fechaFin || contractData.fechaFinContrato,
          montoMensual: Number(montoMensual || 0),
          garantia: Number(garantia || 0),
          cantidadOcupantes: Number(cantidadOcupantes || 1),
          vehiculo: vehiculo.trim(),
          observaciones: serializeCodeudorEnObservaciones(observaciones.trim(), {
            nombre: codeudorNombre,
            cedula: codeudorCedula,
            direccion: codeudorDireccion,
            telefono: codeudorTelefono,
          }),
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

  const liveContractData = {
    ...contractData,
    nombreCompleto,
    cedula: documentoCompleto,
    fechaIngreso: fechaIngreso || contractData?.fechaIngreso,
    inquilino: {
      ...contractData?.inquilino,
      razonSocial: nombreCompleto,
      nombre: nombreCompleto,
      documento: documentoCompleto,
      cedula: documentoCompleto,
      telefono,
      email,
    },
    fechaInicioContrato: fechaInicio || contractData?.fechaInicioContrato,
    fechaFinContrato: fechaFin || contractData?.fechaFinContrato,
    montoMensualAlquiler: Number(montoMensual || 0),
    depositoGarantia: Number(garantia || 0),
    cantidadOcupantes: Number(cantidadOcupantes || 1),
    vehiculoInfo: vehiculo,
    observaciones,
    serviciosIncluidos,
    codeudorNombre,
    codeudorCedula,
    codeudorDireccion,
    codeudorTelefono,
  };

  // Fuerza re-render de vista previa / impresión al editar cualquier campo
  const previewKey = [
    nombreCompleto,
    documentoCompleto,
    telefono,
    email,
    fechaIngreso,
    fechaInicio,
    fechaFin,
    montoMensual,
    garantia,
    cantidadOcupantes,
    vehiculo,
    observaciones,
    serviciosIncluidos,
    codeudorNombre,
    codeudorCedula,
    codeudorDireccion,
    codeudorTelefono,
  ].join("|");

  const handleGuardarEImprimir = async () => {
    const success = await saveContractChanges();
    if (!success) return;

    // Mostrar primero la vista previa con los datos ya editados
    setActiveTab("preview");
    toast.success("Contrato actualizado. Mostrando vista previa para imprimir...");

    // Esperar a que pinte la preview y luego abrir el diálogo de impresión
    setTimeout(() => {
      window.print();
    }, 450);
  };

  const handleCompartirWhatsApp = async () => {
    const phoneRaw = telefono || contractData?.inquilino?.telefono || "";
    if (!phoneRaw || phoneRaw === "N/A" || phoneRaw.trim().length < 6) {
      toast.warning("⚠️ No hay un número de celular/WhatsApp registrado para este inquilino. Cárgalo primero en el campo Teléfono.");
      return;
    }

    await saveContractChanges();
    setActiveTab("preview");
    setShowWhatsAppPreviewModal(true);
  };

  const handleEnviarPdfWhatsApp = async () => {
    const phoneRaw = telefono || contractData?.inquilino?.telefono || "";
    if (!phoneRaw || phoneRaw.trim().length < 6) {
      toast.warning("No hay teléfono WhatsApp registrado.");
      return;
    }

    // Abrir ventana en el mismo click (evita bloqueo de popup tras generar el PDF)
    const waWindow = prepareWhatsAppShareWindow();

    setIsSharingWhatsApp(true);
    const loading = toast.loading("Generando PDF y abriendo WhatsApp Web…");
    try {
      const file = await descargarContratoPDF(liveContractData, unidad, true);
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

      const texto = `Hola ${nombreCompleto || "Cliente"}, le compartimos su Contrato de Locación del Dúplex ${unidad?.code || ""}. Adjuntamos el PDF del documento.`;
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
    } catch (e) {
      console.error(e);
      try {
        waWindow?.close();
      } catch {
        /* ignore */
      }
      toast.dismiss(loading);
      toast.error("Error al generar o compartir el PDF.");
    } finally {
      setIsSharingWhatsApp(false);
    }
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
                  Tipo de Documento *
                </Label>
                <Select
                  value={tipoDocumento}
                  onValueChange={(v) => onChangeTipoDocumento(v as "CI" | "RUC")}
                >
                  <SelectTrigger className="w-full rounded-xl border-border bg-card font-bold h-10 text-foreground">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border z-[220]">
                    <SelectItem value="CI">Cédula</SelectItem>
                    <SelectItem value="RUC">RUC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  {tipoDocumento === "RUC" ? "Número de RUC *" : "Número de Cédula *"}
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={documentoCompleto}
                  onChange={(e) => onChangeDocumentoNumero(e.target.value)}
                  className="rounded-xl border-border font-bold"
                  placeholder={tipoDocumento === "RUC" ? "Ej. 80004512-1" : "Ej. 4567890"}
                />
                {tipoDocumento === "RUC" && (
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Se completa solo con guión + dígito verificador (Paraguay).
                  </p>
                )}
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
                  {/*
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center border border-muted-foreground/30 rounded-md bg-muted/50">
                    <GsIcon className="text-muted-foreground" />
                  </div>    
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatMilesPy(montoMensual)}
                    onChange={(e) => setMontoMensual(parseMilesPy(e.target.value))}
                    className="pl-10 rounded-xl border-border font-bold"
                    placeholder="Ej. 1.500.000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Depósito de Garantía (Gs)
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center border border-muted-foreground/30 rounded-md bg-muted/50">
                    <GsIcon className="text-muted-foreground" />
                  </div>
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

          {/* SECCIÓN: CODEUDOR / GARANTE */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 border-b border-border pb-2">
              <Users className="w-4 h-4" /> 3. Codeudor / Garante (opcional)
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium">
              Si cargás nombre del codeudor, la cláusula décima sexta se autocompleta. Si lo dejás vacío, esa cláusula se omite y la décima séptima pasa a ser la décima sexta.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Nombre completo del Codeudor
                </Label>
                <Input
                  type="text"
                  value={codeudorNombre}
                  onChange={(e) => setCodeudorNombre(e.target.value)}
                  className="rounded-xl border-border font-bold"
                  placeholder="Ej. María López"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  C.I. / Documento
                </Label>
                <Input
                  type="text"
                  value={codeudorCedula}
                  onChange={(e) => setCodeudorCedula(e.target.value)}
                  className="rounded-xl border-border font-bold"
                  placeholder="Ej. 4.567.890"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Teléfono
                </Label>
                <Input
                  type="text"
                  value={codeudorTelefono}
                  onChange={(e) => setCodeudorTelefono(e.target.value)}
                  className="rounded-xl border-border font-bold"
                  placeholder="Ej. 0981 123 456"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Domicilio particular
                </Label>
                <Input
                  type="text"
                  value={codeudorDireccion}
                  onChange={(e) => setCodeudorDireccion(e.target.value)}
                  className="rounded-xl border-border font-bold"
                  placeholder="Ej. Calle X c/ Y, Luque"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: INFORMACIÓN ADICIONAL */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 border-b border-border pb-2">
              <Users className="w-4 h-4" /> 4. Información Adicional
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

        </div>
        ) : (
          <div className="p-8 overflow-y-auto max-h-[64vh] bg-[#0f172a] flex justify-center border-t border-white/5">
            <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-[800px] min-h-[1000px] rounded-sm ring-1 ring-black/10">
              <ContratoImprimible
                key={`preview-${previewKey}`}
                contractData={liveContractData}
                dataUnidad={unidad}
                localNisAnde={unidad?.nisAnde || ""}
                isPreview={true}
              />
            </div>
          </div>

        )}

        {/* ELEMENTO IMPRIMIBLE LEGAL (Oculto en pantalla, se imprime a página completa) */}
        <div className="hidden print:block bg-white text-black p-0 m-0">
          <ContratoImprimible
            key={`print-${previewKey}`}
            contractData={liveContractData}
            dataUnidad={unidad}
            localNisAnde={unidad?.nisAnde || ""}
            isPreview={false}
          />
        </div>
        {/* FOOTER */}
        <DialogFooter className="bg-muted p-6 px-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loadingSave}
            className="rounded-xl font-bold text-xs uppercase"
          >
            Cancelar
          </Button>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleSoloGuardar}
              disabled={loadingSave}
              variant="outline"
              className="border-border text-foreground hover:bg-muted font-black text-xs uppercase rounded-xl px-4 h-11"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {loadingSave ? "Guardando..." : "Guardar Cambios"}
            </Button>

            <Button
              onClick={handleGuardarEImprimir}
              disabled={loadingSave}
              variant="outline"
              className="bg-card border-blue-200 text-blue-700 hover:bg-blue-50 font-black text-xs uppercase rounded-xl px-4 h-11"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Guardar e Imprimir
            </Button>

            <Button
              onClick={handleCompartirWhatsApp}
              disabled={loadingSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl px-4 h-11 shadow-lg shadow-emerald-500/20"
            >
              <Phone className="w-4 h-4 mr-1.5" />
              Compartir por WhatsApp
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
              <p className="text-xs text-muted-foreground mt-1">
                En celular el PDF puede ir directo a WhatsApp. En PC: se descarga el PDF y se abre el chat del inquilino en WhatsApp Web (si ya estás logueado); solo falta adjuntarlo con el clip 📎 — WhatsApp no permite adjuntar archivos automáticamente desde el navegador.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl p-8 bg-[#0f172a] flex justify-center my-2">
              <div className="bg-white shadow-2xl w-full max-w-[700px] rounded-sm">
                <ContratoImprimible
                  key={`wa-${previewKey}`}
                  contractData={liveContractData}
                  dataUnidad={unidad}
                  localNisAnde={unidad?.nisAnde || ""}
                  isPreview={true}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  descargarContratoDoc(liveContractData, unidad);
                  toast.success("📄 Archivo del contrato legal .DOC descargado en tu equipo.");
                }}
                className="h-11 px-5 font-bold text-xs uppercase rounded-xl border-border"
                disabled={isSharingWhatsApp}
              >
                📥 Descargar Archivo (.DOC)
              </Button>

              <Button
                onClick={handleEnviarPdfWhatsApp}
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
                  `PDF del contrato listo. Chat abierto para ${telefono || contractData?.inquilino?.telefono || "el cliente"}. Si estás en PC, adjuntá el PDF descargado con el clip 📎.`}
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
