"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Tras guardar OK: el padre puede relanzar la consulta de saldos. */
  onSuccess: () => void;
  apiBase: string;
};

export function AndeLoginCredencialesModal({ isOpen, onClose, onSuccess, apiBase }: Props) {
  const [documento, setDocumento] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documento.trim() || !password) {
      toast.error("Ingresá documento y contraseña de Mi Cuenta ANDE.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/credenciales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documento: documento.trim(),
          password,
          tipoDocumento: "TD001",
        }),
      });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error(body?.mensaje || `Error HTTP ${res.status}`);
      }
      toast.success(body?.mensaje || "Sesión ANDE configurada.");
      setPassword("");
      onClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "No se pudo iniciar sesión en ANDE");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o && !saving) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md w-[95vw] bg-card border border-border rounded-[1.5rem] text-foreground p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black italic tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Iniciar sesión ANDE
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Ingresá tu usuario y contraseña de Mi Cuenta ANDE. Se usan solo mientras estés
          logueado en Gesco (consultas de saldo y PDF). Al cerrar sesión se borran y se
          pedirán de nuevo la próxima vez.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Documento (C.I.)
            </label>
            <Input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Nº de cédula"
              autoComplete="username"
              disabled={saving}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña Mi Cuenta ANDE"
              autoComplete="current-password"
              disabled={saving}
              className="mt-1 rounded-xl"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={onClose}
              className="rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black italic uppercase text-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Validando…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
