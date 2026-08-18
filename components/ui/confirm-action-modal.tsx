"use client";


import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

export interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  details = [],
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  isLoading = false,
}: ConfirmActionModalProps) {
  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <Trash2 className="w-8 h-8 text-red-600 animate-pulse" />;
      case "warning":
        return <AlertTriangle className="w-8 h-8 text-amber-600 animate-bounce" />;
      case "success":
        return <CheckCircle className="w-8 h-8 text-emerald-600" />;
      default:
        return <HelpCircle className="w-8 h-8 text-blue-600" />;
    }
  };

  const getBadgeStyle = () => {
    switch (variant) {
      case "danger":
        return "bg-red-100 border-red-200/60 text-red-600";
      case "warning":
        return "bg-amber-100 border-amber-200/60 text-amber-600";
      case "success":
        return "bg-emerald-100 border-emerald-200/60 text-emerald-600";
      default:
        return "bg-blue-100 border-blue-200/60 text-blue-600";
    }
  };

  const getButtonStyle = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 shadow-red-500/25";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 shadow-amber-500/25";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25";
      default:
        return "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25";
    }
  };

  const getBulletColor = () => {
    switch (variant) {
      case "danger":
        return "bg-red-500";
      case "warning":
        return "bg-amber-500";
      case "success":
        return "bg-emerald-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-[2.5rem] p-8 overflow-hidden bg-card z-[99999] animate-in fade-in-90 zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-16 h-16 rounded-full border flex items-center justify-center shadow-inner transition-all duration-300 ${getBadgeStyle()}`}>
            {getIcon()}
          </div>
          
          <div className="space-y-1.5">
            <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-foreground leading-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {description}
            </DialogDescription>
          </div>

          {details && details.length > 0 && (
            <div className="bg-muted border border-border rounded-2xl p-4 text-left w-full space-y-2.5 text-xs text-muted-foreground shadow-sm">
              {details.map((detail, idx) => (
                <p key={idx} className="flex items-start gap-2.5 font-bold text-foreground leading-snug">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${getBulletColor()}`} />
                  <span>{detail}</span>
                </p>
              ))}
            </div>
          )}

          <div className="flex w-full gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onClose}
              className="flex-1 rounded-xl font-bold uppercase text-xs h-12 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`flex-1 text-white rounded-xl font-black italic uppercase text-xs h-12 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${getButtonStyle()}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
