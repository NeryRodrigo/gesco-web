"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Edit, Trash2, Calendar, User, 
  CheckCircle, Clock, PlayCircle, Eye, AlertCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Actividad {
  actividadId: number;
  empresaId: number;
  fecha: string;
  titulo: string;
  descripcion: string;
  responsableId: number | null;
  responsableNombre: string;
  estado: string; // "en Proceso", "Disponible", "Cerrado"
}

export function ActividadesVista({ empresaId }: { empresaId: number }) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal Estados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<Actividad | null>(null);
  
  // Form Estados
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("Disponible");
  const [responsable, setResponsable] = useState("");

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const respAct = await fetch(`http://localhost:5034/api/Actividades?empresaId=${empresaId}`);
      if (respAct.ok) {
        const data = await respAct.json();
        setActividades(data);
      }
    } catch (error) {
      console.error("Error al cargar datos de actividades:", error);
      toast.error("Error al conectar con el servidor backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId > 0) {
      cargarDatos();
    }
  }, [empresaId]);

  const openCreateModal = () => {
    setEditingAct(null);
    setTitulo("");
    setDescripcion("");
    setFecha(new Date().toISOString().substring(0, 10));
    setEstado("Disponible");
    setResponsable("");
    setIsModalOpen(true);
  };

  const openEditModal = (act: Actividad) => {
    setEditingAct(act);
    setTitulo(act.titulo);
    setDescripcion(act.descripcion);
    setFecha(act.fecha ? act.fecha.substring(0, 10) : "");
    setEstado(act.estado);
    setResponsable(act.responsableNombre || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.warning("El título es obligatorio");
      return;
    }

    const payload = {
      actividadId: editingAct ? editingAct.actividadId : 0,
      empresaId: empresaId,
      fecha: new Date(fecha).toISOString(),
      titulo: titulo,
      descripcion: descripcion,
      responsableId: null,
      responsableNombre: responsable.trim(),
      estado: estado
    };

    try {
      const url = "http://localhost:5034/api/Actividades" + (editingAct ? `/${editingAct.actividadId}` : "");
      const method = editingAct ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingAct ? "Actividad actualizada correctamente" : "Actividad creada correctamente");
        setIsModalOpen(false);
        cargarDatos();
      } else {
        const errText = await response.text();
        toast.error("Error del servidor: " + errText);
      }
    } catch (error) {
      toast.error("Error al conectar con el servidor backend");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta actividad?")) return;
    try {
      const response = await fetch(`http://localhost:5034/api/Actividades/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        toast.success("Actividad eliminada correctamente");
        cargarDatos();
      } else {
        toast.error("No se pudo eliminar la actividad");
      }
    } catch (error) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const getEstadoBadge = (est: string) => {
    switch (est) {
      case "en Proceso":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black italic rounded-lg text-[9px] uppercase tracking-wider py-1 px-2.5"><Clock className="w-3 h-3 mr-1 inline" /> En Proceso</Badge>;
      case "Cerrado":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black italic rounded-lg text-[9px] uppercase tracking-wider py-1 px-2.5"><CheckCircle className="w-3 h-3 mr-1 inline" /> Cerrado</Badge>;
      case "Disponible":
      default:
        return <Badge className="bg-muted0 hover:bg-slate-600 text-white font-black italic rounded-lg text-[9px] uppercase tracking-wider py-1 px-2.5"><PlayCircle className="w-3 h-3 mr-1 inline" /> Disponible</Badge>;
    }
  };

  const filteredActividades = actividades.filter(act => 
    act.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.responsableNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.estado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      {/* PANEL HEADER */}
      <div className="bg-card p-8 rounded-[2rem] shadow-sm border border-border flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-primary p-4 rounded-3xl shadow-xl shadow-primary/20 text-white">
            <Calendar className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary leading-none">Actividades</h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-1">Planificación y Seguimiento del Personal</p>
          </div>
        </div>
        <Button 
          onClick={openCreateModal}
          className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black italic text-xs tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva Actividad
        </Button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar actividades por título, descripción, responsable o estado..." 
            className="w-full pl-16 pr-6 py-5 bg-[#F8F9FA] rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all text-foreground"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* DATATABLE */}
      <Card className="border border-border/50 shadow-sm rounded-[2rem] overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted uppercase text-[10px] font-black tracking-widest text-muted-foreground border-b border-border/40">
                  <th className="pl-8 py-5">Fecha</th>
                  <th className="py-5">Actividad</th>
                  <th className="py-5">Responsable</th>
                  <th className="py-5 text-center">Estado</th>
                  <th className="pr-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-foreground">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Cargando actividades...</p>
                    </td>
                  </tr>
                ) : filteredActividades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-muted-foreground font-bold italic">
                      No se encontraron actividades registradas.
                    </td>
                  </tr>
                ) : (
                  filteredActividades.map((act) => (
                    <tr key={act.actividadId} className="hover:bg-muted/50 transition-colors group">
                      <td className="pl-8 py-5 font-bold text-muted-foreground text-xs">
                        {new Date(act.fecha).toLocaleDateString("es-PY", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-5">
                        <p className="font-black uppercase italic text-sm text-foreground tracking-tight">{act.titulo}</p>
                        <p className="text-xs text-muted-foreground max-w-lg truncate">{act.descripcion}</p>
                      </td>
                      <td className="py-5">
                        {act.responsableNombre ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-black text-xs shrink-0">
                              {act.responsableNombre.substring(0, 1).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs uppercase text-foreground">{act.responsableNombre}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase italic">Sin Asignar</span>
                        )}
                      </td>
                      <td className="py-5 text-center">
                        {getEstadoBadge(act.estado)}
                      </td>
                      <td className="pr-8 py-5 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            onClick={() => openEditModal(act)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                            onClick={() => handleDelete(act.actividadId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CRUD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-8 text-white relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-muted-foreground hover:text-white rounded-full p-1.5 hover:bg-card/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">
                {editingAct ? "Editar Actividad" : "Crear Actividad"}
              </h3>
              <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider mt-1">
                Completa los datos de la actividad planificada
              </p>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Título</label>
                <Input 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Mantenimiento de Acondicionadores"
                  className="h-12 rounded-xl font-bold border-border bg-[#F8F9FA] text-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Descripción</label>
                <textarea 
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles sobre las tareas a realizar..."
                  className="w-full p-4 rounded-xl font-bold border border-border bg-[#F8F9FA] h-24 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="h-12 pl-12 rounded-xl font-bold border-border bg-[#F8F9FA] text-foreground"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl font-bold border border-border bg-[#F8F9FA] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="en Proceso">En Proceso</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Responsable Asignado</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Escribir nombre del responsable..." 
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    className="w-full h-12 pl-12 rounded-xl font-bold border border-border bg-[#F8F9FA] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="font-bold text-muted-foreground hover:text-foreground h-12 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black italic px-8 h-12 rounded-xl shadow-lg"
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
