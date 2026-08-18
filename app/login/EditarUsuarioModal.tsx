"use client";

import { API_BASE } from "@/lib/api";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Mail, User, Activity, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export function EditarUsuarioModal({ isOpen, onClose, usuario, onRefresh, empresaId }: any) {
  const [loading, setLoading] = useState(false);
  const [modulosDisponibles, setModulosDisponibles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    rol: "",
    estado: "",
    modulosIds: [] as number[]
  });

  // Cargar catálogos
  useEffect(() => {
    if (isOpen && empresaId) {
        fetch(`${API_BASE}/api/Usuario/modulos-por-empresa/${empresaId}`)
            .then(res => res.json())
            .then(data => setModulosDisponibles(data))
            .catch(() => toast.error("Error al obtener módulos de OIMA"));
    }
  }, [isOpen, empresaId]);

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado,
        modulosIds: usuario.modulosIds || []
      });
    }
  }, [usuario]);

  const handleToggleModulo = (id: number) => {
    setFormData(prev => ({
        ...prev,
        modulosIds: prev.modulosIds.includes(id) 
            ? prev.modulosIds.filter(mid => mid !== id) 
            : [...prev.modulosIds, id]
    }));
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
        const res = await fetch(`${API_BASE}/api/Usuario/actualizar-completo`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, usuarioId: usuario.usuarioId })
        });

        if (res.ok) {
            toast.success("OIMA Sincronizado", { description: "Datos y permisos actualizados correctamente." });
            onRefresh();
            onClose();
        } else {
            const err = await res.json();
            toast.error("Error", { description: err.mensaje });
        }
    } catch (e) {
        toast.error("Fallo de conexión con el servidor");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card rounded-[2.5rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
            Editar Perfil
          </DialogTitle>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
            Panel de Configuración de Acceso Central
          </p>
        </DialogHeader>

        <div className="space-y-5 py-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre del Colaborador</Label>
            <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    value={formData.nombre} 
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                    className="rounded-2xl border-border bg-muted pl-12 h-14 font-bold"
                />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Correo Electrónico</Label>
            <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className="rounded-2xl border-border bg-muted pl-12 h-14 font-bold"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Rol Asignado</Label>
                <select 
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value})}
                    className="w-full rounded-2xl border-border bg-muted h-14 px-4 font-black italic uppercase text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="ADMIN">ADMIN</option>
                    <option value="BROKER">BROKER</option>
                    <option value="AGENTE">AGENTE</option>
                    <option value="VISUALIZADOR">VISUALIZADOR</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Estado de Cuenta</Label>
                <select 
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    className="w-full rounded-2xl border-border bg-muted h-14 px-4 font-black italic uppercase text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                    <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
              </div>
          </div>

          {/* SECCIÓN DE MÓDULOS */}
          <div className="pt-4 border-t border-border">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-3 block italic">Módulos de Empresa Habilitados</Label>
            <div className="grid grid-cols-1 gap-2">
              {modulosDisponibles.map((mod) => (
                <div 
                    key={mod.moduloId} 
                    onClick={() => handleToggleModulo(mod.moduloId)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                        formData.modulosIds.includes(mod.moduloId) 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-muted border-transparent hover:border-border'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${formData.modulosIds.includes(mod.moduloId) ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Shield className="h-4 w-4" />
                    </div>
                    <span className={`text-xs font-black uppercase italic ${formData.modulosIds.includes(mod.moduloId) ? 'text-blue-700' : 'text-muted-foreground'}`}>
                        {mod.nombreModulo}
                    </span>
                  </div>
                  <Checkbox 
                    checked={formData.modulosIds.includes(mod.moduloId)}
                    className="rounded-full border-blue-200 data-[state=checked]:bg-blue-600"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button 
            disabled={loading}
            onClick={handleUpdate} 
            className="bg-slate-900 hover:bg-blue-600 text-white font-black italic rounded-2xl w-full h-14 shadow-xl transition-all active:scale-95 flex items-center gap-2 group"
          >
             {loading ? <Activity className="h-5 w-5 animate-spin" /> : (
                 <>
                    <CheckCircle2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    SINCRONIZAR ACCESOS OIMA
                 </>
             )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
