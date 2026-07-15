"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Save, User, Loader2, Hash } from "lucide-react"; // Agregué Hash para el icono
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Agente {
  personaId?: number;
  PersonaId?: number;
  razonSocial?: string;
  RazonSocial?: string;
}

export interface CaptacionFormData {
  mlsid: string;
  titulo: string;
  precioVentaGs: number;
  ciudad: string;
  latitud: number;
  longitud: number;
  agenteId: number;
  superficieLoteM2: number;
  areaConstruccionM2: number;
  nroAmbientes: number;
  nroDormitorios: number;
  nroBanos: number;
  tieneJardin: boolean;
  aptoOficina: boolean;
  descripcionRemax: string;
  esAprobada: boolean;
  sync: boolean;
  fechaFirmaContrato: string;
  fechaCaducidad: string;
  imagenUrl: string;
  fotoAgenteUrl: string;
  agenteCreadorNombre?: string;
}

interface NuevaCaptacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CaptacionFormData) => void;
  empresaId?: number;
  mlsidSugerido?: string;
}

// 1. Agregamos mlsidSugerido a las props
export function NuevaCaptacionModal({ isOpen, onClose, onSave, empresaId, mlsidSugerido }: NuevaCaptacionModalProps) {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    mlsid: "", // 2. Agregamos el campo al estado
    titulo: "",
    precioVentaGs: 0,
    ciudad: "Asunción",
    latitud: -25.2865,
    longitud: -57.647,
    agenteId: 0,
    superficieLoteM2: 0,
    areaConstruccionM2: 0,
    nroAmbientes: 0,
    nroDormitorios: 0,
    nroBanos: 0,
    tieneJardin: false,
    aptoOficina: false,
    descripcionRemax: "Captación manual",
    esAprobada: false,
    sync: false,
    fechaFirmaContrato: "",
    fechaCaducidad: "",
    imagenUrl: "",
    fotoAgenteUrl: ""
  });

  // 3. Nuevo useEffect para cargar el MLSID sugerido cuando el modal se abre
  useEffect(() => {
    if (isOpen && mlsidSugerido) {
      setFormData(prev => ({ ...prev, mlsid: mlsidSugerido }));
    }
  }, [isOpen, mlsidSugerido]);

  useEffect(() => {
    if (typeof window !== "undefined") {
        delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: string })._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }

    if (isOpen) {
        setLoading(true);
        // Nota: Aquí usas empresaId = 6 fijo, podrías usar la prop si viniera de afuera
        fetch(`http://localhost:5034/api/Migration/agentes/6`)
        .then(async (res) => {
            if (!res.ok) throw new Error("Error agentes");
            return res.json();
        })
        .then((data) => setAgentes(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  function MapPicker() {
    useMapEvents({
      click(e) {
        setFormData({ ...formData, latitud: e.latlng.lat, longitud: e.latlng.lng });
      },
    });
    return <Marker position={[formData.latitud, formData.longitud]} icon={icon} />;
  }

  const handleSave = () => {
    if (formData.agenteId === 0) {
      alert("Por favor selecciona un Agente");
      return;
    }
    
    const agenteSel = agentes.find(a => (a.personaId || a.PersonaId) === formData.agenteId);
    
    onSave({
      ...formData,
      agenteCreadorNombre: agenteSel?.razonSocial || agenteSel?.RazonSocial || "Agente Desconocido"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="h-[400px] md:h-auto z-10 relative">
             <MapContainer center={[formData.latitud, formData.longitud]} zoom={13} className="h-full w-full">
               <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
               <MapPicker />
             </MapContainer>
          </div>

          <div className="p-8 space-y-5 bg-card overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black italic uppercase flex items-center gap-2 tracking-tighter">
                <MapPin className="text-orange-600 w-5 h-5" /> Generar Captación
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              
              {/* CAMPO MLSID AGREGADO */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase flex items-center gap-1 text-blue-600">
                  <Hash className="w-3 h-3"/> MLSID (Correlativo Sugerido)
                </Label>
                <Input 
                  value={formData.mlsid} 
                  onChange={(e) => setFormData({...formData, mlsid: e.target.value})} 
                  className="font-mono font-bold bg-blue-50/50 border-blue-100"
                  placeholder="000000000-0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase flex items-center gap-1">
                  <User className="w-3 h-3"/> Asignar Agente
                </Label>
                
                {loading ? (
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <Loader2 className="w-3 h-3 animate-spin"/> Cargando lista...
                    </div>
                ) : (
                    <select 
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-bold"
                      value={formData.agenteId}
                      onChange={(e) => setFormData({...formData, agenteId: Number(e.target.value)})}
                    >
                      <option value={0}>Seleccione un agente...</option>
                      {agentes.map((a, idx) => (
                        <option key={idx} value={a.personaId || a.PersonaId}>
                          {a.razonSocial || a.RazonSocial}
                        </option>
                      ))}
                    </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase">Fecha Firma Contrato</Label>
                  <Input type="date" value={formData.fechaFirmaContrato} onChange={(e) => setFormData({...formData, fechaFirmaContrato: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase">Fecha Vencimiento</Label>
                  <Input type="date" value={formData.fechaCaducidad} onChange={(e) => setFormData({...formData, fechaCaducidad: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase">Foto Propiedad (URL)</Label>
                  <Input value={formData.imagenUrl} onChange={(e) => setFormData({...formData, imagenUrl: e.target.value})} placeholder="URL de la imagen" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase">Foto Agente (URL)</Label>
                  <Input value={formData.fotoAgenteUrl} onChange={(e) => setFormData({...formData, fotoAgenteUrl: e.target.value})} placeholder="URL del agente" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase">Título del Anuncio</Label>
                <Input value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="Ej: Residencia en Villa Morra..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase">Precio Gs.</Label>
                  <Input type="number" value={formData.precioVentaGs} onChange={(e) => setFormData({...formData, precioVentaGs: Number(e.target.value)})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase">Ciudad</Label>
                  <Input value={formData.ciudad} onChange={(e) => setFormData({...formData, ciudad: e.target.value})} />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t flex flex-row items-center justify-between gap-3">
              <Button variant="ghost" onClick={onClose} className="font-bold text-muted-foreground">CANCELAR</Button>
              <Button className="bg-slate-900 text-white font-black italic shadow-lg px-8 hover:bg-slate-800 transition-all active:scale-95" onClick={handleSave}>
                <Save className="mr-2 w-4 h-4" /> ENVIAR A REVISIÓN
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
