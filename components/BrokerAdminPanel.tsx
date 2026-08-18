"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Info, User, Calendar, MapPin } from "lucide-react";
import { Propiedad } from "@/types/propiedad";

interface Props {
  propiedades: Propiedad[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export function BrokerAdminPanel({ propiedades, onApprove, onReject }: Props) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER DEL PANEL */}
      <div className="bg-card p-6 rounded-3xl shadow-xl border-l-8 border-red-600 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
            Panel de Aprobaciones
          </h2>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest italic flex items-center gap-2">
            <Info className="w-3 h-3 text-red-500"/> Revisión de captaciones manuales generadas por agentes
          </p>
        </div>
        <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100">
            <span className="text-red-700 font-black text-xl">{propiedades.length}</span>
            <span className="text-red-400 text-[10px] font-bold uppercase ml-2 italic">Pendientes</span>
        </div>
      </div>

      {/* TABLA DE PROPIEDADES */}
      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted uppercase text-[10px] font-black tracking-widest">
            <TableRow>
              <TableHead className="pl-8"><Calendar className="w-3 h-3 inline mr-1"/> Fecha</TableHead>
              <TableHead><User className="w-3 h-3 inline mr-1"/> Agente Solicitante</TableHead>
              <TableHead>Título de Propiedad</TableHead>
              <TableHead><MapPin className="w-3 h-3 inline mr-1"/> Ubicación</TableHead>
              <TableHead className="text-right pr-8">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propiedades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-24 text-muted-foreground font-bold italic">
                  No hay solicitudes de captación pendientes en este momento.
                </TableCell>
              </TableRow>
            ) : (
              propiedades.map((p) => (
                <TableRow key={p.propiedadId} className="hover:bg-red-50/30 transition-colors group">
                  <TableCell className="pl-8 text-muted-foreground font-medium">
                    {new Date(p.fechaFirmaContrato || Date.now()).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"/>
                        <span className="font-bold uppercase text-foreground text-xs tracking-tight">
                            {p.agenteId || "Agente OIMA"}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-blue-700 uppercase text-xs">
                    {p.titulo}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground italic">
                    {p.latitud.toFixed(5)}, {p.longitud.toFixed(5)}
                  </TableCell>
                  <TableCell className="text-right pr-8 space-x-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold"
                        onClick={() => onReject(p.propiedadId)}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Rechazar
                    </Button>
                    <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white font-black italic shadow-md px-6"
                        onClick={() => onApprove(p.propiedadId)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> APROBAR
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
