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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, 
  FileText, 
  Calendar, 
  DollarSign, 
  Car, 
  Users, 
  Save,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Plus
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { avisarCampoFaltante, campoPorId } from "./validacionProceso";

export interface ContratoData {
  unidadId: number;
  inquilino: {
    nombreCompleto: string;
    cedula: string;
    telefono: string;
    correo: string;
  };
  contrato: {
    fechaIngreso: string;
    fechaInicio: string;
    fechaFin: string;
    montoMensual: number;
    garantia: number;
  };
  adicionales: {
    cantidadOcupantes: number;
    vehiculo: string;
    observaciones: string;
    serviciosIncluidos: string[]; // ["Agua", "Luz", "Basura"]
  };
}

interface NuevoContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidadId: number;
  codigoUnidad: string;
  nombreCondominio: string;
  unidadesDisponibles?: { id: number; code: string; condo: string }[];
  onSave: (data: ContratoData) => void;
}

export function NuevoContratoModal({ 
  isOpen, 
  onClose, 
  unidadId, 
  codigoUnidad, 
  nombreCondominio,
  unidadesDisponibles = [],
  onSave 
}: NuevoContratoModalProps) {
  
  const [formData, setFormData] = useState({
    unidadId: unidadId,
    inquilino: {
      nombreCompleto: "",
      cedula: "",
      telefono: "",
      correo: ""
    },
    contrato: {
      fechaIngreso: "",
      fechaInicio: "",
      fechaFin: "",
      montoMensual: 0,
      garantia: 0
    },
    adicionales: {
      cantidadOcupantes: 1,
      vehiculo: "",
      observaciones: "",
      serviciosIncluidos: [] as string[]
    }
  });

  const [currentUnit, setCurrentUnit] = useState({
    id: unidadId,
    code: codigoUnidad,
    condo: nombreCondominio
  });

  const handleUnitChange = (id: string) => {
    const unit = unidadesDisponibles.find(u => u.id === parseInt(id));
    if (unit) {
      setCurrentUnit(unit);
      setFormData({ ...formData, unidadId: unit.id });
    }
  };

  const handleSave = () => {
    if (!formData.inquilino.nombreCompleto.trim()) {
      avisarCampoFaltante("Falta el nombre del inquilino.", campoPorId("nuevo-contrato-nombre"));
      return;
    }
    if (!formData.inquilino.cedula.trim()) {
      avisarCampoFaltante("Falta la cédula o RUC.", campoPorId("nuevo-contrato-cedula"));
      return;
    }
    if (!formData.contrato.fechaInicio) {
      avisarCampoFaltante("Falta la fecha de inicio del contrato.", campoPorId("nuevo-contrato-inicio"));
      return;
    }
    if (!formData.contrato.montoMensual || formData.contrato.montoMensual <= 0) {
      avisarCampoFaltante("El alquiler mensual tiene que ser mayor a 0.", campoPorId("nuevo-contrato-monto"));
      return;
    }

    onSave(formData);
    toast.success("Contrato registrado con éxito");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        {/* Accesibilidad: Título para lectores de pantalla */}
        <DialogHeader className="sr-only">
          <DialogTitle>Registrar Nuevo Contrato - {currentUnit.code}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          
          {/* SIDEBAR INFO */}
          <div className="md:w-1/3 bg-secondary p-8 text-foreground flex flex-col justify-between border-r border-border">
            <div>
              <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20 text-primary-foreground">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-2">
                Nuevo <span className="text-primary text-3xl">Contrato</span>
              </h2>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Alquiler de Dúplex</p>
              
              <div className="mt-12 space-y-4">
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Ubicación</p>
                  
                  {unidadesDisponibles.length > 0 ? (
                    <Select onValueChange={handleUnitChange} defaultValue={unidadId.toString()}>
                      <SelectTrigger className="w-full bg-card border-border rounded-xl h-12">
                        <div className="flex items-center gap-3 text-left">
                          <Building2 className="w-5 h-5 text-primary" />
                          <div className="overflow-hidden">
                            <p className="font-black italic uppercase text-xs text-foreground truncate">{currentUnit.condo}</p>
                            <p className="text-[10px] font-bold text-muted-foreground">Dúplex {currentUnit.code}</p>
                          </div>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border z-[220]">
                        {unidadesDisponibles.map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()} className="text-[11px] font-bold uppercase">
                            {u.condo} - {u.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-black italic uppercase text-sm text-foreground">{currentUnit.condo}</p>
                        <p className="text-xs font-bold text-muted-foreground">Dúplex {currentUnit.code}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-50">OIMA PROPERTY MGMT v1.0</p>
            </div>
          </div>

          {/* FORM AREA */}
          <div className="flex-1 bg-card p-8 overflow-y-auto">
            <div className="space-y-8">
              
              {/* SECCION 1: INQUILINO */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4" /> Datos del Inquilino
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Nombre Completo</Label>
                    <Input 
                      id="nuevo-contrato-nombre"
                      placeholder="Ej: Juan Pérez" 
                      className="rounded-xl border-border bg-muted font-bold focus:bg-card transition-all"
                      value={formData.inquilino.nombreCompleto}
                      onChange={(e) => setFormData({...formData, inquilino: {...formData.inquilino, nombreCompleto: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Cédula / RUC</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="nuevo-contrato-cedula"
                        placeholder="0.000.000" 
                        className="pl-10 rounded-xl border-border bg-muted font-bold"
                        value={formData.inquilino.cedula}
                        onChange={(e) => setFormData({...formData, inquilino: {...formData.inquilino, cedula: e.target.value}})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="0981 000 000" 
                        className="pl-10 rounded-xl border-border bg-muted font-bold"
                        value={formData.inquilino.telefono}
                        onChange={(e) => setFormData({...formData, inquilino: {...formData.inquilino, telefono: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCION 2: CONTRATO */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Vigencia y Montos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Inicio Contrato</Label>
                    <Input 
                      id="nuevo-contrato-inicio"
                      type="date" 
                      className="rounded-xl border-border bg-muted font-bold"
                      value={formData.contrato.fechaInicio}
                      onChange={(e) => setFormData({...formData, contrato: {...formData.contrato, fechaInicio: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Fin Contrato</Label>
                    <Input 
                      type="date" 
                      className="rounded-xl border-border bg-muted font-bold"
                      value={formData.contrato.fechaFin}
                      onChange={(e) => setFormData({...formData, contrato: {...formData.contrato, fechaFin: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Alquiler Mensual (Gs)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                      <Input 
                        id="nuevo-contrato-monto"
                        type="number" 
                        className="pl-10 rounded-xl border-border bg-blue-50/30 text-blue-700 font-black text-lg"
                        value={formData.contrato.montoMensual}
                        onChange={(e) => setFormData({...formData, contrato: {...formData.contrato, montoMensual: Number(e.target.value)}})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Garantía / Depósito (Gs)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-10 rounded-xl border-border bg-muted font-bold"
                        value={formData.contrato.garantia}
                        onChange={(e) => setFormData({...formData, contrato: {...formData.contrato, garantia: Number(e.target.value)}})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCION 3: ADICIONALES */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Información Adicional
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Cant. Ocupantes</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        className="pl-10 rounded-xl border-border bg-muted font-bold"
                        value={formData.adicionales.cantidadOcupantes}
                        onChange={(e) => setFormData({...formData, adicionales: {...formData.adicionales, cantidadOcupantes: Number(e.target.value)}})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Vehículo (Marca/Chapa)</Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Ej: Toyota Hilux - ABC 123" 
                        className="pl-10 rounded-xl border-border bg-muted font-bold"
                        value={formData.adicionales.vehiculo}
                        onChange={(e) => setFormData({...formData, adicionales: {...formData.adicionales, vehiculo: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-12 pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
              <Button variant="ghost" onClick={onClose} className="font-bold text-muted-foreground hover:text-muted-foreground">
                CANCELAR
              </Button>
              <Button 
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-2xl px-10 shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                <Save className="mr-2 w-4 h-4" /> GUARDAR CONTRATO
              </Button>
            </DialogFooter>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
