"use client";

import { API_BASE } from "@/lib/api";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ShieldCheck, UserPlus, KeyRound } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
  rubro: string;
}

export function RegistroUsuarioModal({ isOpen, onClose, empresaId, rubro }: Props) {
  const [loading, setLoading] = useState(false);
  const [modulos, setModulos] = useState<any[]>([]);
    const [formData, setFormData] = useState({
      nombre: "",
      email: "",
      password: "", // Contraseña temporal
      rol: "AGENTE",
      modulosIds: [] as number[]
    });
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(empresaId.toString());

    // Cargar empresas
    useEffect(() => {
        if (isOpen) {
            fetch(`${API_BASE}/api/Auth/empresas`)
                .then(res => res.json())
                .then(data => setEmpresas(data))
                .catch(() => toast.error("Error al obtener catálogo de Empresas"));
        }
    }, [isOpen]);

  // Cargar módulos disponibles según la empresa seleccionada
  useEffect(() => {
        if (isOpen && selectedEmpresaId) {
            fetch(`${API_BASE}/api/Usuario/modulos-por-empresa/${selectedEmpresaId}`)
                .then(res => res.json())
                .then(data => {
                    setModulos(data); 
                })
                .catch(() => toast.error("Error al obtener catálogo de OIMA"));
        }
    }, [isOpen, selectedEmpresaId]);

  const handleToggleModulo = (id: number) => {
    setFormData(prev => ({
        ...prev,
        modulosIds: prev.modulosIds.includes(id) 
            ? prev.modulosIds.filter(mid => mid !== id) 
            : [...prev.modulosIds, id]
    }));
  };

  const handleRegister = async () => {
    if (!formData.nombre || !formData.email || !formData.password) {
        toast.error("Faltan datos", { description: "Completa todos los campos obligatorios." });
        return;
    }

    setLoading(true);
    try {
        const response = await fetch(`${API_BASE}/api/Auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...formData,
                empresaId: parseInt(selectedEmpresaId)
            }),
        });

        if (response.ok) {
            toast.success("Usuario Registrado", {
                description: `Se ha creado la cuenta para ${formData.nombre} con acceso restringido.`
            });
            onClose();
            // Reset form
            setFormData({ nombre: "", email: "", password: "", rol: "AGENTE", modulosIds: [] });
        } else {
            const error = await response.json();
            toast.error("Error al registrar", { description: error.mensaje });
        }
    } catch (error) {
        toast.error("Fallo de conexión");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card rounded-[2rem] border-none shadow-2xl p-8">
        <DialogHeader>
          <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Registrar Colaborador</DialogTitle>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Configuración de acceso para {rubro}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Empresa</Label>
            <Select value={selectedEmpresaId} onValueChange={(v) => setSelectedEmpresaId(v)}>
                <SelectTrigger className="rounded-xl border-border bg-muted font-bold">
                    <SelectValue placeholder="Selecciona una Empresa" />
                </SelectTrigger>
                <SelectContent>
                    {empresas.map((emp) => (
                        <SelectItem key={emp.empresaId} value={emp.empresaId.toString()}>{emp.razonSocial}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre Completo</Label>
            <Input 
                placeholder="Ej. Karen Insfrán" 
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className="rounded-xl border-border bg-muted font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Correo Corporativo</Label>
            <Input 
                type="email" 
                placeholder="karen@remax.com.py" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="rounded-xl border-border bg-muted font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pass Temporal</Label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="â€¢â€¢â€¢â€¢" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="rounded-xl border-border bg-muted pl-9 font-bold"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Rol</Label>
                <Select value={formData.rol} onValueChange={(v) => setFormData({...formData, rol: v})}>
                    <SelectTrigger className="rounded-xl border-border bg-muted font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AGENTE">AGENTE</SelectItem>
                        <SelectItem value="BROKER">BROKER</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-3 block">Módulos Permitidos</Label>
            <div className="grid grid-cols-2 gap-3">
              {modulos.map((mod) => (
                <div key={mod.moduloId} className="flex items-center space-x-2 bg-muted p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                  <Checkbox 
                    id={`mod-${mod.moduloId}`} 
                    checked={formData.modulosIds.includes(mod.moduloId)}
                    onCheckedChange={() => handleToggleModulo(mod.moduloId)}
                  />
                  <label htmlFor={`mod-${mod.moduloId}`} className="text-xs font-bold uppercase text-muted-foreground cursor-pointer select-none">
                    {mod.nombreModulo}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="ghost" onClick={onClose} className="font-bold text-muted-foreground uppercase text-xs">Cancelar</Button>
          <Button 
            disabled={loading}
            onClick={handleRegister}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl px-8 h-12 shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "REGISTRAR EN OIMA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
