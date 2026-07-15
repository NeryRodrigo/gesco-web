"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ConfiguracionTimbrado {
  timbradoId: number;
  empresaId: number;
  ruc: string;
  numeroTimbrado: string;
  validezDesde: string;
  validezHasta: string;
  numeroDesde: number;
  numeroHasta: number;
  ultimoNumeroUsado: number;
  fechaCarga: string;
  estaActivo: boolean;
}

interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ConfiguracionTimbrado>) => void;
  configuracion?: ConfiguracionTimbrado | null;
  empresaId: number;
}

export function ConfiguracionModal({ isOpen, onClose, onSave, configuracion, empresaId }: ConfiguracionModalProps) {
  const [formData, setFormData] = useState<Partial<ConfiguracionTimbrado>>({
    empresaId: empresaId,
    ruc: "",
    numeroTimbrado: "",
    validezDesde: "",
    validezHasta: "",
    numeroDesde: 1,
    numeroHasta: 1000,
    ultimoNumeroUsado: 0,
    estaActivo: true,
  });

  useEffect(() => {
    if (configuracion) {
      setFormData({
        ...configuracion,
        validezDesde: configuracion.validezDesde.split('T')[0],
        validezHasta: configuracion.validezHasta.split('T')[0],
      });
    } else {
      setFormData({
        empresaId: empresaId,
        ruc: "",
        numeroTimbrado: "",
        validezDesde: "",
        validezHasta: "",
        numeroDesde: 1,
        numeroHasta: 1000,
        ultimoNumeroUsado: 0,
        estaActivo: true,
      });
    }
  }, [configuracion, isOpen, empresaId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (type === "number" ? Number(value) : value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-[2rem] p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
            {configuracion ? "Editar Timbrado" : "Nuevo Timbrado"}
          </DialogTitle>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Complete los datos para la facturación
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">RUC</Label>
              <Input 
                name="ruc" 
                value={formData.ruc} 
                onChange={handleChange} 
                required 
                className="rounded-xl bg-muted border-none font-bold"
                placeholder="Ej. 80012345-0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">N° Timbrado</Label>
              <Input 
                name="numeroTimbrado" 
                value={formData.numeroTimbrado} 
                onChange={handleChange} 
                required 
                className="rounded-xl bg-muted border-none font-bold"
                placeholder="Ej. 15894236"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Validez Desde</Label>
              <Input 
                type="date"
                name="validezDesde" 
                value={formData.validezDesde} 
                onChange={handleChange} 
                required 
                className="rounded-xl bg-muted border-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Validez Hasta</Label>
              <Input 
                type="date"
                name="validezHasta" 
                value={formData.validezHasta} 
                onChange={handleChange} 
                required 
                className="rounded-xl bg-muted border-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Número Desde</Label>
              <Input 
                type="number"
                name="numeroDesde" 
                value={formData.numeroDesde} 
                onChange={handleChange} 
                required 
                className="rounded-xl bg-muted border-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Número Hasta</Label>
              <Input 
                type="number"
                name="numeroHasta" 
                value={formData.numeroHasta} 
                onChange={handleChange} 
                required 
                className="rounded-xl bg-muted border-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Último N° Usado</Label>
              <Input 
                type="number"
                name="ultimoNumeroUsado" 
                value={formData.ultimoNumeroUsado} 
                onChange={handleChange} 
                className="rounded-xl bg-muted border-none font-bold"
              />
            </div>
            <div className="flex items-center space-x-2 mt-6">
              <input 
                type="checkbox" 
                id="estaActivo" 
                name="estaActivo" 
                checked={formData.estaActivo} 
                onChange={handleChange} 
                className="w-5 h-5 rounded text-blue-600 border-border"
              />
              <Label htmlFor="estaActivo" className="text-xs font-black uppercase text-foreground">
                Timbrado Activo
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="rounded-xl font-bold uppercase text-xs"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="rounded-xl bg-blue-600 hover:bg-blue-700 font-black italic uppercase text-xs px-8"
            >
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
