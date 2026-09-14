"use client";

import { API_BASE } from "@/lib/api";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Mail, User, Activity, CheckCircle2, KeyRound, Eye, EyeOff, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export function EditarUsuarioModal({
  isOpen,
  onClose,
  usuario,
  onRefresh,
  empresaId,
  canChangePassword = false,
}: any) {
  const [loading, setLoading] = useState(false);
  const [modulosDisponibles, setModulosDisponibles] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<{ empresaId: number; razonSocial: string; rubro?: string }[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    rol: "",
    estado: "",
    empresaId: 0,
    modulosIds: [] as number[],
    nuevaPassword: "",
    confirmarPassword: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE}/api/Auth/empresas`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setEmpresas(Array.isArray(data) ? data : []))
        .catch(() => setEmpresas([]));
    }
    if (isOpen && empresaId) {
      fetch(`${API_BASE}/api/Usuario/modulos-por-empresa/${empresaId}`)
        .then((res) => res.json())
        .then((data) => setModulosDisponibles(data))
        .catch(() => toast.error("Error al obtener módulos"));
    }
  }, [isOpen, empresaId]);

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado,
        empresaId: usuario.empresaId || empresaId || 0,
        modulosIds: usuario.modulosIds || [],
        nuevaPassword: "",
        confirmarPassword: "",
      });
      setShowPass(false);
    }
  }, [usuario, isOpen, empresaId]);

  const handleToggleModulo = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      modulosIds: prev.modulosIds.includes(id)
        ? prev.modulosIds.filter((mid) => mid !== id)
        : [...prev.modulosIds, id],
    }));
  };

  const handleUpdate = async () => {
    if (canChangePassword && formData.nuevaPassword) {
      if (formData.nuevaPassword.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres");
        return;
      }
      if (formData.nuevaPassword !== formData.confirmarPassword) {
        toast.error("Las contraseñas no coinciden");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/Usuario/actualizar-completo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol,
          estado: formData.estado,
          empresaId: formData.empresaId,
          modulosIds: formData.modulosIds,
          usuarioId: usuario.usuarioId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Error", { description: err.mensaje || "No se pudo actualizar" });
        return;
      }

      if (canChangePassword && formData.nuevaPassword) {
        const passRes = await fetch(`${API_BASE}/api/Auth/update-password`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuarioId: usuario.usuarioId,
            nuevaPassword: formData.nuevaPassword,
          }),
        });
        if (!passRes.ok) {
          toast.error("Datos guardados, pero falló el cambio de contraseña");
          onRefresh?.();
          return;
        }
        toast.success("Usuario y contraseña actualizados");
      } else {
        toast.success("Usuario sincronizado correctamente");
      }

      onRefresh?.();
      onClose();
    } catch {
      toast.error("Fallo de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full bg-card rounded-[1.75rem] sm:rounded-[2.5rem] p-5 sm:p-8 border-none shadow-2xl overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-foreground">
            Editar Perfil
          </DialogTitle>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
            Panel de Configuración de Acceso Central
          </p>
        </DialogHeader>

        <div className="space-y-5 py-4 sm:py-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre del Colaborador</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="rounded-2xl border-border bg-muted pl-12 h-12 sm:h-14 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Correo Electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="rounded-2xl border-border bg-muted pl-12 h-12 sm:h-14 font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Entorno de trabajo autorizado
            </Label>
            <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
              {empresas.map((emp) => {
                const marcado = formData.empresaId === emp.empresaId;
                return (
                  <button
                    key={emp.empresaId}
                    type="button"
                    onClick={() => setFormData({ ...formData, empresaId: emp.empresaId })}
                    className={`flex items-center gap-3 text-left rounded-2xl border p-3 transition-all ${
                      marcado ? "bg-blue-50 border-blue-200" : "bg-muted border-transparent hover:border-border"
                    }`}
                  >
                    <Checkbox checked={marcado} className="rounded-full border-blue-200 data-[state=checked]:bg-blue-600" />
                    <span className={`text-xs font-black uppercase italic ${marcado ? "text-blue-700" : "text-muted-foreground"}`}>
                      {emp.razonSocial}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground ml-1">
              El marcado es el entorno actual. Al guardar queda fijo para el login.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Rol Asignado</Label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                className="w-full rounded-2xl border-border bg-muted h-12 sm:h-14 px-4 font-black italic uppercase text-xs outline-none focus:ring-2 focus:ring-blue-500"
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
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full rounded-2xl border-border bg-muted h-12 sm:h-14 px-4 font-black italic uppercase text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="BLOQUEADO">BLOQUEADO</option>
              </select>
            </div>
          </div>

          {canChangePassword && (
            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <Label className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
                  Actualizar contraseña (solo adminfontana)
                </Label>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={formData.nuevaPassword}
                    onChange={(e) => setFormData({ ...formData, nuevaPassword: e.target.value })}
                    placeholder="Dejar vacío para no cambiar"
                    className="rounded-2xl border-border bg-muted pr-12 h-12 font-bold"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
                    aria-label={showPass ? "Ocultar" : "Mostrar"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Confirmar contraseña</Label>
                <Input
                  type={showPass ? "text" : "password"}
                  value={formData.confirmarPassword}
                  onChange={(e) => setFormData({ ...formData, confirmarPassword: e.target.value })}
                  className="rounded-2xl border-border bg-muted h-12 font-bold"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 mb-3 block italic">
              Módulos de Empresa Habilitados
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {modulosDisponibles.map((mod) => (
                <div
                  key={mod.moduloId}
                  onClick={() => handleToggleModulo(mod.moduloId)}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                    formData.modulosIds.includes(mod.moduloId)
                      ? "bg-blue-50 border-blue-200"
                      : "bg-muted border-transparent hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        formData.modulosIds.includes(mod.moduloId)
                          ? "bg-blue-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-xs font-black uppercase italic truncate ${
                        formData.modulosIds.includes(mod.moduloId) ? "text-blue-700" : "text-muted-foreground"
                      }`}
                    >
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
            className="bg-slate-900 hover:bg-blue-600 text-white font-black italic rounded-2xl w-full h-12 sm:h-14 shadow-xl transition-all active:scale-95 flex items-center gap-2 group"
          >
            {loading ? (
              <Activity className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                GUARDAR CAMBIOS
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
