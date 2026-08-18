"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Briefcase, CalendarClock, DollarSign, Search, Edit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Empleado {
  empleadoId: number;
  nombreCompleto: string;
  documento: string;
  cargo: string;
  salarioBase: number;
  fechaIngreso: string;
  ips: boolean;
  bonificacionFamiliar: number;
}

export function RRHHPage({ empresaId }: { empresaId: number }) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [empleadoEditingId, setEmpleadoEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    empresaId: empresaId,
    nombreCompleto: "",
    documento: "",
    cargo: "",
    salarioBase: 0,
    fechaIngreso: new Date().toISOString().split("T")[0],
    ips: true,
    bonificacionFamiliar: 0
  });

  const cargarEmpleados = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/empleados/${empresaId}`);
      if (res.ok) {
        const data = await res.json();
        setEmpleados(data);
      }
    } catch (error) {
      toast.error("Error", { description: "Problema al cargar empleados." });
    } finally {
      setLoading(false);
    }
  };

  const calcularAguinaldo = (salario: number, meses: number) => {
    return (salario * meses) / 12;
  };

  const exportarMTESS = () => {
    if (empleados.length === 0) return toast.error("No hay empleados registrados.");
    
    // Encabezados oficiales del MTESS
    const headers = [
      "Nro. Orden", "Documento Identidad", "Nombres y Apellidos", "Cargo", 
      "Fecha Ingreso", "Aporta IPS", "Salario Base (Gs)", "Aporte IPS Empleado 9% (Gs)", 
      "Aporte IPS Patronal 16.5% (Gs)", "Bonificacion Familiar (Gs)", "Aguinaldo Proporcional (Gs)", "Neto Recibido (Gs)"
    ];
    
    const rows = empleados.map((e, index) => {
      const ipsEmpleado = e.ips ? e.salarioBase * 0.09 : 0;
      const ipsPatronal = e.ips ? e.salarioBase * 0.165 : 0;
      const aguinaldo = calcularAguinaldo(e.salarioBase, 12);
      const totalNeto = e.salarioBase - ipsEmpleado + (e.bonificacionFamiliar || 0);
      
      return [
        index + 1,
        e.documento,
        e.nombreCompleto,
        e.cargo,
        new Date(e.fechaIngreso).toLocaleDateString('es-PY'),
        e.ips ? "SI" : "NO",
        e.salarioBase,
        ipsEmpleado.toFixed(0),
        ipsPatronal.toFixed(0),
        e.bonificacionFamiliar || 0,
        aguinaldo.toFixed(0),
        totalNeto.toFixed(0)
      ];
    });
    
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Planilla_MTESS_OIMA_Empresa_${empresaId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Planilla MTESS Generada", { 
      description: `Se descargó Planilla_MTESS_OIMA_Empresa_${empresaId}.csv con éxito para el portal del MTESS.` 
    });
  };

  const exportarLibroSueldos = () => {
    if (empleados.length === 0) return toast.error("No hay empleados registrados.");
    
    const headers = [
      "Periodo Liquidacion", "Documento Identidad", "Nombres y Apellidos", "Cargo", "Salario Base (Gs)", 
      "Descuento IPS 9% (Gs)", "Bonificacion Familiar (Gs)", "Neto Cobrado (Gs)", "Firma del Trabajador"
    ];
    
    const rows = empleados.map((e) => {
      const ipsEmpleado = e.ips ? e.salarioBase * 0.09 : 0;
      const net = e.salarioBase - ipsEmpleado + (e.bonificacionFamiliar || 0);
      const mesAnio = new Date().toLocaleDateString('es-PY', { month: '2-digit', year: 'numeric' });
      
      return [
        mesAnio,
        e.documento,
        e.nombreCompleto,
        e.cargo,
        e.salarioBase,
        ipsEmpleado.toFixed(0),
        e.bonificacionFamiliar || 0,
        net.toFixed(0),
        "_______________________"
      ];
    });
    
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Libro_Sueldos_OIMA_Empresa_${empresaId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Libro de Sueldos Generado", { 
      description: `Se descargó el Libro_Sueldos_OIMA_Empresa_${empresaId}.csv oficial del Ministerio de Trabajo.` 
    });
  };

  useEffect(() => {
    cargarEmpleados();
  }, [empresaId]);

  const handleSave = async () => {
    try {
      const url = isEditMode 
        ? `${API_BASE}/api/empleados/${empleadoEditingId}`
        : `${API_BASE}/api/empleados`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, empresaId })
      });
      if (res.ok) {
        toast.success("Éxito", { description: isEditMode ? "Empleado actualizado." : "Empleado registrado." });
        setIsModalOpen(false);
        setFormData({ 
          empresaId, 
          nombreCompleto: "", 
          documento: "", 
          cargo: "", 
          salarioBase: 0, 
          fechaIngreso: new Date().toISOString().split("T")[0],
          ips: true,
          bonificacionFamiliar: 0
        });
        setIsEditMode(false);
        setEmpleadoEditingId(null);
        cargarEmpleados();
      }
    } catch (error) {
      toast.error("Error", { description: "Problema al guardar." });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas dar de baja a este empleado?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/empleados/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Eliminado", { description: "Empleado dado de baja." });
        cargarEmpleados();
      } else {
        toast.error("Error al eliminar");
      }
    } catch (e) { toast.error("Error de conexión"); }
  };

  const openEditModal = (emp: Empleado) => {
    setFormData({
      empresaId: empresaId,
      nombreCompleto: emp.nombreCompleto,
      documento: emp.documento,
      cargo: emp.cargo,
      salarioBase: emp.salarioBase,
      fechaIngreso: emp.fechaIngreso.split("T")[0],
      ips: emp.ips,
      bonificacionFamiliar: emp.bonificacionFamiliar
    });
    setEmpleadoEditingId(emp.empleadoId);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setFormData({ 
      empresaId, 
      nombreCompleto: "", 
      documento: "", 
      cargo: "", 
      salarioBase: 0, 
      fechaIngreso: new Date().toISOString().split("T")[0],
      ips: true,
      bonificacionFamiliar: 0
    });
    setIsEditMode(false);
    setEmpleadoEditingId(null);
    setIsModalOpen(true);
  };

  const filtrados = empleados.filter(e => 
    e.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
  };

  const totalNomina = empleados.reduce((acc, e) => acc + e.salarioBase, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic text-foreground tracking-tight">Recursos Humanos</h2>
          <p className="text-sm text-muted-foreground font-medium">Gestión de nómina, asistencias y personal.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md font-bold" onClick={openNewModal}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-black italic text-xl text-primary">{isEditMode ? "Editar Empleado" : "Registrar Empleado"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Nombre Completo *</label>
                <Input value={formData.nombreCompleto} onChange={e => setFormData({...formData, nombreCompleto: e.target.value})} placeholder="Ej. Juan Pérez" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Documento (CI)</label>
                  <Input value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} placeholder="Ej. 1234567" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Fecha de Ingreso</label>
                  <Input type="date" value={formData.fechaIngreso} onChange={e => setFormData({...formData, fechaIngreso: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Cargo *</label>
                <Input value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} placeholder="Ej. Cajero, Vendedor" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Salario Base (Gs.) *</label>
                <Input type="number" value={formData.salarioBase} onChange={e => setFormData({...formData, salarioBase: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="ips-check"
                    checked={formData.ips} 
                    onChange={e => setFormData({...formData, ips: e.target.checked})}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="ips-check" className="text-xs font-bold text-foreground">Aporta IPS (9%)</label>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Bonif. Familiar</label>
                  <Input type="number" value={formData.bonificacionFamiliar} onChange={e => setFormData({...formData, bonificacionFamiliar: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-primary text-white">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden relative">
          <CardContent className="p-6">
            <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-1">Total Empleados</p>
            <h3 className="text-3xl font-black text-foreground">{empleados.length}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nómina Base</p>
              <h3 className="text-2xl font-black text-foreground">{new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(empleados.reduce((acc, curr) => acc + curr.salarioBase, 0))}</h3>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Legislación MTESS / IPS</p>
            <h3 className="text-lg font-bold mt-1">Reportes de Cumplimiento</h3>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" className="bg-card/10 border-white/20 text-white hover:bg-card/20" onClick={exportarMTESS}>
              Planilla MTESS
            </Button>
            <Button size="sm" variant="outline" className="bg-card/10 border-white/20 text-white hover:bg-card/20" onClick={exportarLibroSueldos}>
              Libro Sueldos
            </Button>
          </div>
        </Card>
      </div>
      
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card mt-6">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar empleado o cargo..." 
              className="pl-9 bg-muted border-none rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Empleado</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Documento</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Cargo</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Salario Base</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay empleados registrados.</TableCell></TableRow>
            ) : (
              filtrados.map((emp) => (
                <TableRow key={emp.empleadoId} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {emp.nombreCompleto.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-foreground">{emp.nombreCompleto}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{emp.documento}</TableCell>
                  <TableCell className="font-medium text-muted-foreground">{emp.cargo}</TableCell>
                  <TableCell className="text-right font-black text-emerald-600">{formatCurrency(emp.salarioBase)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" onClick={() => openEditModal(emp)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 ml-1" onClick={() => handleDelete(emp.empleadoId)}>
                      <Trash2 className="h-4 w-4" />
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

