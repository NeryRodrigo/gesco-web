"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PiggyBank, Users, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatGs, formatFecha } from "./VordiaClientesPage";
import { VordiaFlujoCajaPage } from "./VordiaFlujoCajaPage";

type Props = { empresaId: number; usuarioNombre?: string; tabInicial?: "flujo" | "capital" | "empleados" };

type CapitalResumen = {
  saldoCapitalGs: number;
  totalAportes: number;
  totalRetiros: number;
  movimientos: {
    capitalId: number;
    tipo: string;
    montoGs: number;
    fecha: string;
    concepto: string;
    notas?: string | null;
  }[];
};

type EmpleadosResumen = {
  cantidadActivos: number;
  nominaMensualGs: number;
  empleados: {
    empleadoHqId: number;
    nombre: string;
    rolCargo: string;
    email?: string | null;
    salarioMensualGs: number;
    estado: string;
    fechaIngreso?: string | null;
  }[];
};

export function VordiaFinanzasHqPage({ empresaId, usuarioNombre, tabInicial = "flujo" }: Props) {
  const [tab, setTab] = useState<"flujo" | "capital" | "empleados">(tabInicial);
  const [capital, setCapital] = useState<CapitalResumen | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadosResumen | null>(null);
  const [capForm, setCapForm] = useState({ tipo: "Aporte", montoGs: 0, concepto: "", notas: "", fecha: new Date().toISOString().slice(0, 10) });
  const [empForm, setEmpForm] = useState({
    nombre: "",
    rolCargo: "",
    email: "",
    salarioMensualGs: 0,
    fechaIngreso: new Date().toISOString().slice(0, 10),
    estado: "Activo",
  });

  const cargarCapital = async () => {
    const r = await fetch(`${API_BASE}/api/Crm/capital?empresaId=${empresaId}`);
    if (r.ok) setCapital(await r.json());
    else toast.error("No se pudo cargar capital (¿ejecutaste el SQL HQ?)");
  };

  const cargarEmpleados = async () => {
    const r = await fetch(`${API_BASE}/api/Crm/empleados-hq?empresaId=${empresaId}`);
    if (r.ok) setEmpleados(await r.json());
    else toast.error("No se pudo cargar empleados HQ");
  };

  useEffect(() => {
    setTab(tabInicial);
  }, [tabInicial]);

  useEffect(() => {
    if (!empresaId) return;
    if (tab === "capital") void cargarCapital();
    if (tab === "empleados") void cargarEmpleados();
  }, [empresaId, tab]);

  const registrarCapital = async () => {
    if (!capForm.montoGs || !capForm.concepto.trim()) {
      toast.error("Monto y concepto son obligatorios");
      return;
    }
    const r = await fetch(`${API_BASE}/api/Crm/capital`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId,
        tipo: capForm.tipo,
        montoGs: Number(capForm.montoGs),
        concepto: capForm.concepto,
        notas: capForm.notas || null,
        fecha: capForm.fecha,
        usuarioNombre: usuarioNombre || null,
      }),
    });
    if (r.ok) {
      toast.success("Movimiento de capital registrado");
      setCapForm({ tipo: "Aporte", montoGs: 0, concepto: "", notas: "", fecha: new Date().toISOString().slice(0, 10) });
      cargarCapital();
    } else toast.error("No se pudo registrar");
  };

  const borrarCapital = async (id: number) => {
    const r = await fetch(`${API_BASE}/api/Crm/capital/${id}?empresaId=${empresaId}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Movimiento anulado");
      cargarCapital();
    }
  };

  const guardarEmpleado = async () => {
    if (!empForm.nombre.trim()) {
      toast.error("Nombre obligatorio");
      return;
    }
    const r = await fetch(`${API_BASE}/api/Crm/empleados-hq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId, ...empForm, salarioMensualGs: Number(empForm.salarioMensualGs) }),
    });
    if (r.ok) {
      toast.success("Empleado registrado");
      setEmpForm({
        nombre: "",
        rolCargo: "",
        email: "",
        salarioMensualGs: 0,
        fechaIngreso: new Date().toISOString().slice(0, 10),
        estado: "Activo",
      });
      cargarEmpleados();
    } else toast.error("No se pudo guardar empleado");
  };

  const borrarEmpleado = async (id: number) => {
    const r = await fetch(`${API_BASE}/api/Crm/empleados-hq/${id}?empresaId=${empresaId}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Empleado desactivado");
      cargarEmpleados();
    }
  };

  const tabs = [
    { id: "flujo" as const, label: "Flujo & socios", icon: Wallet },
    { id: "capital" as const, label: "Capital", icon: PiggyBank },
    { id: "empleados" as const, label: "Empleados", icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide border transition ${
              tab === t.id
                ? "bg-[#007bff] border-[#007bff] text-white"
                : "bg-[#0C1327] border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "flujo" && <VordiaFlujoCajaPage empresaId={empresaId} />}

      {tab === "capital" && (
        <div className="vordia-hq-page space-y-4 animate-in fade-in">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Saldo capital</p>
              <p className="text-xl font-black text-emerald-300 mt-1">{formatGs(capital?.saldoCapitalGs)}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Aportes</p>
              <p className="text-xl font-black text-sky-300 mt-1">{formatGs(capital?.totalAportes)}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Retiros</p>
              <p className="text-xl font-black text-rose-300 mt-1">{formatGs(capital?.totalRetiros)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Registrar movimiento de capital</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <select
                value={capForm.tipo}
                onChange={(e) => setCapForm({ ...capForm, tipo: e.target.value })}
                className="h-10 rounded-xl bg-[#050B18] border border-white/10 px-3 text-sm"
              >
                <option>Aporte</option>
                <option>Retiro</option>
                <option>Ajuste</option>
                <option>Valuacion</option>
              </select>
              <Input type="date" value={capForm.fecha} onChange={(e) => setCapForm({ ...capForm, fecha: e.target.value })} className="bg-[#050B18] border-white/10 rounded-xl" />
              <Input type="number" placeholder="Monto Gs" value={capForm.montoGs || ""} onChange={(e) => setCapForm({ ...capForm, montoGs: Number(e.target.value) })} className="bg-[#050B18] border-white/10 rounded-xl" />
              <Input placeholder="Concepto *" value={capForm.concepto} onChange={(e) => setCapForm({ ...capForm, concepto: e.target.value })} className="bg-[#050B18] border-white/10 rounded-xl" />
            </div>
            <Input placeholder="Notas (opcional)" value={capForm.notas} onChange={(e) => setCapForm({ ...capForm, notas: e.target.value })} className="bg-[#050B18] border-white/10 rounded-xl" />
            <Button onClick={() => void registrarCapital()} className="bg-[#007bff] rounded-xl font-bold gap-2">
              <Plus size={14} /> Registrar capital
            </Button>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Concepto</th>
                  <th className="px-3 py-2">Monto</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(capital?.movimientos || []).map((m) => (
                  <tr key={m.capitalId} className="border-t border-white/5">
                    <td className="px-3 py-2 text-slate-400">{formatFecha(m.fecha)}</td>
                    <td className="px-3 py-2 font-bold">{m.tipo}</td>
                    <td className="px-3 py-2">{m.concepto}</td>
                    <td className={`px-3 py-2 tabular-nums font-bold ${m.tipo === "Retiro" ? "text-rose-300" : "text-emerald-300"}`}>
                      {m.tipo === "Retiro" ? "-" : "+"}
                      {formatGs(m.montoGs)}
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => void borrarCapital(m.capitalId)} className="text-slate-600 hover:text-rose-400">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!capital?.movimientos?.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-600">
                      Todavía no hay movimientos. Registrá el aporte inicial de capital.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "empleados" && (
        <div className="vordia-hq-page space-y-4 animate-in fade-in">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Activos</p>
              <p className="text-xl font-black text-white mt-1">{empleados?.cantidadActivos ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4">
              <p className="text-[10px] uppercase text-slate-500 font-bold">Nómina mensual</p>
              <p className="text-xl font-black text-amber-300 mt-1">{formatGs(empleados?.nominaMensualGs)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0C1327] p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Alta / administración de empleado</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <Input placeholder="Nombre *" value={empForm.nombre} onChange={(e) => setEmpForm({ ...empForm, nombre: e.target.value })} className="bg-[#050B18] border-white/10 rounded-xl" />
              <Input placeholder="Cargo / rol" value={empForm.rolCargo} onChange={(e) => setEmpForm({ ...empForm, rolCargo: e.target.value })} className="bg-[#050B18] border-white/10 rounded-xl" />
              <Input placeholder="Email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} className="bg-[#050B18] border-white/10 rounded-xl" />
              <Input type="number" placeholder="Salario mensual Gs" value={empForm.salarioMensualGs || ""} onChange={(e) => setEmpForm({ ...empForm, salarioMensualGs: Number(e.target.value) })} className="bg-[#050B18] border-white/10 rounded-xl" />
              <Input type="date" value={empForm.fechaIngreso} onChange={(e) => setEmpForm({ ...empForm, fechaIngreso: e.target.value })} className="bg-[#050B18] border-white/10 rounded-xl" />
              <select value={empForm.estado} onChange={(e) => setEmpForm({ ...empForm, estado: e.target.value })} className="h-10 rounded-xl bg-[#050B18] border border-white/10 px-3 text-sm">
                <option>Activo</option>
                <option>Inactivo</option>
                <option>Licencia</option>
              </select>
            </div>
            <Button onClick={() => void guardarEmpleado()} className="bg-[#007bff] rounded-xl font-bold gap-2">
              <Plus size={14} /> Guardar empleado
            </Button>
          </div>

          <div className="space-y-2">
            {(empleados?.empleados || []).map((e) => (
              <div key={e.empleadoHqId} className="rounded-xl border border-white/5 bg-[#0C1327] p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{e.nombre}</p>
                  <p className="text-[11px] text-slate-400">
                    {e.rolCargo} · {e.estado} · {formatGs(e.salarioMensualGs)}/mes
                  </p>
                </div>
                <button type="button" onClick={() => void borrarEmpleado(e.empleadoHqId)} className="text-slate-600 hover:text-rose-400 p-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!empleados?.empleados?.length && (
              <p className="text-center text-slate-600 text-xs py-6">Sin empleados. Cargá al equipo para ver la nómina en finanzas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
