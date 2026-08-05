"use client";

import React, { useState, useEffect } from "react";
import { AdministracionVista } from "./AdministracionVista";
import { DetalleUnidadModal } from "./DetalleUnidadModal";
import { toast } from "sonner";

interface Contrato {
  contratoId: number;
  estaActivo: boolean;
  montoMensualAlquiler: number;
  fechaInicioContrato: string;
  fechaFinContrato: string;
  inquilino: {
    razonSocial: string;
    cedula: string;
    telefono: string;
    email: string;
  };
  pagos: any[];
  observaciones?: string;
}

interface Unidad {
  unidadId: number;
  codigoUnidad: string;
  nombreCondominio: string;
  estado: string;
  contratos?: Contrato[];
}

export function AdministracionPage({ empresaId, usuario }: { empresaId: number, usuario: any }) {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);

  const cargarUnidades = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`http://localhost:5034/api/UnidadesCondominio/empresa/${empresaId}`);
      if (resp.ok) {
        const data = await resp.json();
        setUnidades(data);
      }
    } catch (error) {
      console.error("Error cargando unidades para administración", error);
      toast.error("Error al cargar datos de administración");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId > 0) cargarUnidades();
  }, [empresaId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Cargando Administración...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 
          Agregamos este contenedor con min-w-[1400px] 
          Esto obliga a que la planilla ocupe su espacio real y aparezca el scroll horizontal en el celular 
      */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[1400px] lg:min-w-full">
          <AdministracionVista 
            unidades={unidades} 
            empresaId={empresaId}
            onTenantClick={(unit, tenantName) => {
              setSelectedUnit({
                id: unit.unidadId,
                code: unit.codigoUnidad,
                condo: unit.nombreCondominio,
                tenant: tenantName,
                status: unit.estado
              });
              setIsDetalleModalOpen(true);
            }} 
          />
        </div>
      </div>

      <DetalleUnidadModal 
        isOpen={isDetalleModalOpen}
        onClose={() => setIsDetalleModalOpen(false)}
        unidad={selectedUnit}
        onUpdate={() => cargarUnidades()}
      />
    </div>
  );
}

