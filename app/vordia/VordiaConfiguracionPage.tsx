"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings, Building2, Users, Percent, Layers, Workflow,
  Pencil, X, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatGs } from "./VordiaClientesPage";

type Socio = {
  socioId: number;
  nombre: string;
  email?: string | null;
  porcentaje: number;
};

type Props = {
  empresaId: number;
  usuario: { nombre?: string; email?: string; rubro?: string; rol?: string } | null;
  onNavigate?: (vista: string) => void;
};

const CIRCUITO = [
  { ruta: "inicio", label: "Dashboard" },
  { ruta: "vordia_clientes", label: "Clientes" },
  { ruta: "vordia_pipeline", label: "Pipeline" },
  { ruta: "vordia_productos", label: "Productos" },
  { ruta: "vordia_proyectos", label: "Proyectos" },
  { ruta: "vordia_objetivos", label: "Objetivos & reuniones" },
  { ruta: "vordia_contratos", label: "Contratos y fees" },
  { ruta: "vordia_ingresos", label: "Ingresos y pagos" },
  { ruta: "vordia_caja", label: "Flujo de caja" },
  { ruta: "vordia_capital", label: "Capital empresa" },
  { ruta: "vordia_gastos", label: "Empleados / nómina" },
  { ruta: "vordia_proveedores", label: "Proveedores" },
  { ruta: "vordia_tareas", label: "Tareas" },
  { ruta: "usuarios", label: "Usuarios / Roles" },
];

const PIPELINE = [
  "Prospecto",
  "Contactado",
  "En negociacion",
  "Propuesta enviada",
  "Cerrado",
  "Cliente activo",
];

export function VordiaConfiguracionPage({ empresaId, usuario, onNavigate }: Props) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [stats, setStats] = useState({
    clientes: 0,
    contratos: 0,
    mrr: 0,
    tareasAbiertas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editSocio, setEditSocio] = useState<Socio | null>(null);
  const [pct, setPct] = useState("");

  const cargar = async () => {
    try {
      setLoading(true);
      const [sRes, cRes, ctRes, tRes, fRes] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/socios?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/contratos?empresaId=${empresaId}&estado=Activo`),
        fetch(`${API_BASE}/api/Crm/tareas?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/flujo-caja?empresaId=${empresaId}`),
      ]);

      if (sRes.ok) setSocios(await sRes.json());
      const clientes = cRes.ok ? await cRes.json() : [];
      const contratos = ctRes.ok ? await ctRes.json() : [];
      const tareas = tRes.ok ? await tRes.json() : [];
      const flujo = fRes.ok ? await fRes.json() : null;

      setStats({
        clientes: clientes.length || 0,
        contratos: contratos.length || 0,
        mrr: flujo?.mrrActivo || 0,
        tareasAbiertas: (tareas || []).filter(
          (t: any) => t.estado === "Pendiente" || t.estado === "En curso"
        ).length,
      });
    } catch {
      toast.error("No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) cargar();
  }, [empresaId]);

  const sumaPct = socios.reduce((a, s) => a + Number(s.porcentaje), 0);

  const guardarSocio = async () => {
    if (!editSocio) return;
    const porcentaje = Number(pct);
    if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      toast.error("Porcentaje inválido (0–100)");
      return;
    }
    const res = await fetch(`${API_BASE}/api/Crm/socios/${editSocio.socioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        nombre: editSocio.nombre,
        email: editSocio.email,
        porcentaje,
      }),
    });
    if (res.ok) {
      toast.success("Porcentaje actualizado");
      setEditSocio(null);
      cargar();
    } else toast.error("No se pudo guardar");
  };

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5 lg:p-6 flex gap-3 items-start">
        <div className="h-11 w-11 rounded-2xl bg-[#007bff]/15 text-[#007bff] flex items-center justify-center shrink-0">
          <Settings size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">Configuración Vordia</h3>
          <p className="text-sm text-[#94a3b8] mt-1">
            Empresa, circuito de módulos, socios y parámetros operativos del CRM interno.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#007bff]">
            <Building2 size={16} />
            <p className="text-[11px] font-bold uppercase tracking-wider">Empresa</p>
          </div>
          <p className="text-xl font-semibold text-white">Vordia</p>
          <div className="text-xs text-[#94a3b8] space-y-1.5">
            <p>EmpresaId: <span className="text-white font-medium">{empresaId}</span></p>
            <p>Rubro: <span className="text-white font-medium">{usuario?.rubro || "VORDIA"}</span></p>
            <p>Moneda operativa: <span className="text-white font-medium">Guaraníes (Gs.)</span></p>
            <p>Sesión: <span className="text-white font-medium">{usuario?.nombre}</span> · {usuario?.rol}</p>
            <p className="truncate">{usuario?.email}</p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: "Clientes", v: String(stats.clientes) },
            { l: "Contratos activos", v: String(stats.contratos) },
            { l: "MRR", v: formatGs(stats.mrr) },
            { l: "Tareas abiertas", v: String(stats.tareasAbiertas) },
          ].map((k) => (
            <div key={k.l} className="rounded-[1.25rem] border border-white/5 bg-[#080E1E] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{k.l}</p>
              <p className="mt-2 text-lg font-semibold text-white truncate">{loading ? "…" : k.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={16} className="text-[#007bff]" />
            <h4 className="text-sm font-semibold text-white">Circuito de módulos</h4>
          </div>
          <div className="space-y-2">
            {CIRCUITO.map((m) => (
              <button
                key={m.ruta}
                type="button"
                onClick={() => onNavigate?.(m.ruta)}
                className="w-full flex items-center justify-between rounded-xl border border-white/5 bg-[#050B18]/60 px-3 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
              >
                <span className="text-sm text-white">{m.label}</span>
                <CheckCircle2 size={14} className="text-emerald-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Percent size={16} className="text-[#007bff]" />
                <h4 className="text-sm font-semibold text-white">Reparto de socios</h4>
              </div>
              <span className={`text-[10px] font-bold ${sumaPct === 100 ? "text-emerald-400" : "text-amber-300"}`}>
                Suma {sumaPct}%
              </span>
            </div>
            {sumaPct !== 100 && (
              <div className="px-5 py-2 text-[11px] text-amber-200 bg-amber-500/10 flex gap-2 items-center border-b border-amber-500/20">
                <AlertTriangle size={12} /> Ideal: 100% entre socios
              </div>
            )}
            <div className="divide-y divide-white/5">
              {socios.map((s) => (
                <div key={s.socioId} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.nombre}</p>
                    <p className="text-[11px] text-slate-500">{s.email || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#5eb0ff]">{s.porcentaje}%</span>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"
                      onClick={() => {
                        setEditSocio(s);
                        setPct(String(s.porcentaje));
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {socios.length === 0 && !loading && (
                <p className="p-5 text-sm text-slate-500">Sin socios cargados.</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-white/5">
              <Button
                variant="ghost"
                className="text-[#5eb0ff] hover:text-white text-xs"
                onClick={() => onNavigate?.("vordia_caja")}
              >
                Ver flujo de caja y montos →
              </Button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Workflow size={16} className="text-[#007bff]" />
              <h4 className="text-sm font-semibold text-white">Etapas del pipeline</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {PIPELINE.map((e, i) => (
                <span
                  key={e}
                  className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg border border-white/10 bg-[#050B18] text-slate-300"
                >
                  {i + 1}. {e}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Parametrización fija del CRM. Los cambios de etapa se registran en el historial del cliente.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/5 bg-[#080E1E] p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
          <Users size={16} className="text-[#007bff]" />
          Gestión de usuarios, roles y permisos granulares
        </div>
        <Button
          onClick={() => onNavigate?.("usuarios")}
          className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold w-full sm:w-auto shrink-0"
        >
          Ir a Usuarios / Roles
        </Button>
      </div>

      {editSocio && (
        <div className="vordia-modal fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setEditSocio(null)}>
          <div className="vordia-modal-panel w-full max-w-sm rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">% de {editSocio.nombre}</h3>
              <button type="button" onClick={() => setEditSocio(null)} className="vordia-icon-btn text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} className="bg-[#050B18] border-white/10 text-white rounded-xl" />
            <div className="vordia-modal-actions flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditSocio(null)} className="rounded-xl text-slate-400">Cancelar</Button>
              <Button onClick={guardarSocio} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold">Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
