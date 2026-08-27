"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, Search, Edit, Trash2, Calendar, User,
  CheckCircle, Clock, PlayCircle, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

interface Actividad {
  actividadId: number;
  empresaId: number;
  fecha: string;
  titulo: string;
  descripcion: string;
  responsableId: number | null;
  responsableNombre: string;
  estado: string;
}

export function ActividadesVista({ empresaId }: { empresaId: number }) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<Actividad | null>(null);
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("Disponible");
  const [responsable, setResponsable] = useState("");

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const respAct = await fetch(`${API_BASE}/api/Actividades?empresaId=${empresaId}`);
      if (respAct.ok) {
        setActividades(await respAct.json());
      } else {
        toast.error("No se pudieron cargar las actividades", {
          description: `El servidor respondió ${respAct.status}.`,
        });
      }
    } catch {
      toast.error("Error al conectar con el servidor backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId > 0) cargarDatos();
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
    setTitulo(act.titulo || "");
    setDescripcion(act.descripcion || "");
    setFecha(act.fecha ? act.fecha.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setEstado(act.estado || "Disponible");
    setResponsable(act.responsableNombre || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!titulo.trim()) {
      toast.warning("El título es obligatorio");
      return;
    }
    if (!fecha) {
      toast.warning("La fecha es obligatoria");
      return;
    }
    const fechaDate = new Date(`${fecha}T12:00:00`);
    if (Number.isNaN(fechaDate.getTime())) {
      toast.warning("La fecha no es válida");
      return;
    }

    const payload = {
      actividadId: editingAct ? editingAct.actividadId : 0,
      empresaId,
      fecha: fechaDate.toISOString(),
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      responsableId: null as number | null,
      responsableNombre: responsable.trim(),
      estado,
    };

    try {
      setSaving(true);
      const url = `${API_BASE}/api/Actividades` + (editingAct ? `/${editingAct.actividadId}` : "");
      const method = editingAct ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingAct ? "Actividad actualizada correctamente" : "Actividad creada correctamente");
        setIsModalOpen(false);
        cargarDatos();
      } else {
        const errText = await response.text();
        toast.error("No se pudo guardar la actividad", {
          description: errText?.slice(0, 180) || `Error ${response.status}`,
        });
      }
    } catch {
      toast.error("Error al conectar con el servidor backend");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta actividad?")) return;
    try {
      const response = await fetch(`${API_BASE}/api/Actividades/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Actividad eliminada correctamente");
        cargarDatos();
      } else {
        toast.error("No se pudo eliminar la actividad");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    }
  };

  const getEstadoBadge = (est: string) => {
    switch (est) {
      case "en Proceso":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black italic rounded-lg text-[9px] uppercase tracking-wider py-1 px-2.5">
            <Clock className="w-3 h-3 mr-1 inline" /> En Proceso
          </Badge>
        );
      case "Cerrado":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black italic rounded-lg text-[9px] uppercase tracking-wider py-1 px-2.5">
            <CheckCircle className="w-3 h-3 mr-1 inline" /> Cerrado
          </Badge>
        );
      case "Disponible":
      default:
        return (
          <Badge className="bg-slate-500 hover:bg-slate-600 text-white font-black italic rounded-lg text-[9px] uppercase tracking-wider py-1 px-2.5">
            <PlayCircle className="w-3 h-3 mr-1 inline" /> Disponible
          </Badge>
        );
    }
  };

  const q = searchTerm.toLowerCase().trim();
  const filteredActividades = actividades.filter((act) => {
    if (!q) return true;
    return (
      (act.titulo || "").toLowerCase().includes(q) ||
      (act.descripcion || "").toLowerCase().includes(q) ||
      (act.responsableNombre || "").toLowerCase().includes(q) ||
      (act.estado || "").toLowerCase().includes(q)
    );
  });

  const formatFechaAct = (v: string) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="space-y-12">
      <div className="bg-card p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-border flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="bg-primary p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl shadow-primary/20 text-white shrink-0">
            <Calendar className="w-7 h-7 md:w-10 md:h-10" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-primary leading-none">Actividades</h1>
            <p className="text-muted-foreground text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1">
              Planificación y Seguimiento del Personal
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateModal}
          className="w-full md:w-auto h-12 md:h-14 px-6 md:px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black italic text-xs tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva Actividad
        </Button>
      </div>

      <div className="bg-card p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-border">
        <div className="relative">
          <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar actividades por título, descripción, responsable o estado..."
            className="w-full pl-12 md:pl-16 pr-4 md:pr-6 py-4 md:py-5 bg-[#F8F9FA] rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Cargando actividades...</p>
          </div>
        ) : filteredActividades.length === 0 ? (
          <Card className="border border-border/50 rounded-2xl bg-card p-8 text-center text-muted-foreground font-bold italic">
            No se encontraron actividades registradas.
          </Card>
        ) : (
          filteredActividades.map((act) => (
            <Card key={act.actividadId} className="border border-border/50 rounded-2xl bg-card overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black uppercase italic text-sm text-foreground tracking-tight break-words">{act.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1 break-words">{act.descripcion}</p>
                  </div>
                  {getEstadoBadge(act.estado)}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-muted-foreground">{formatFechaAct(act.fecha)}</span>
                  <span className="font-bold uppercase text-foreground truncate">{act.responsableNombre || "Sin Asignar"}</span>
                </div>
                <div className="flex justify-end gap-1 pt-1 border-t border-border/40">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEditModal(act)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-400" onClick={() => handleDelete(act.actividadId)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden md:block border border-border/50 shadow-sm rounded-[2rem] overflow-hidden bg-card">
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
                      <td className="pl-8 py-5 font-bold text-muted-foreground text-xs">{formatFechaAct(act.fecha)}</td>
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
                      <td className="py-5 text-center">{getEstadoBadge(act.estado)}</td>
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

      {/* Modal al estilo Ficha del Inquilino */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent
          data-scroll="internal"
          className="flex max-h-[min(92vh,820px)] w-[min(96vw,720px)] max-w-[720px] flex-col gap-0 overflow-hidden border-none p-0 shadow-2xl rounded-[2rem] bg-card sm:max-w-[720px]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{editingAct ? "Editar Actividad" : "Crear Actividad"}</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="bg-secondary p-5 sm:p-6 lg:p-8 text-foreground relative shrink-0 border-b border-border">
              <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full -mr-36 -mt-36 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex items-start gap-4 min-w-0">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
                  <Calendar className="w-7 h-7" />
                </div>
                <div className="min-w-0 flex-1 pr-8">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-primary/10 text-primary font-black italic rounded-lg px-2 py-0.5 text-[10px] uppercase tracking-wider border-none">
                      Actividades
                    </Badge>
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                      {editingAct ? "Edición" : "Nueva"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter leading-snug text-foreground">
                    {editingAct ? "Editar Actividad" : "Crear Actividad"}
                  </h2>
                  <p className="text-muted-foreground text-xs font-bold mt-1">
                    Planificación y seguimiento del personal · Condominio Agus
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 space-y-5">
                <div className="bg-card p-5 sm:p-6 rounded-[1.75rem] shadow-sm border border-border space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Título *</label>
                    <Input
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ej: Mantenimiento de acondicionadores"
                      className="h-12 rounded-xl font-bold border-border bg-muted/40"
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Descripción</label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Detalles sobre las tareas a realizar..."
                      className="w-full p-4 rounded-xl font-bold border border-border bg-muted/40 h-28 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
                      disabled={saving}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Fecha *</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                          className="h-12 pl-12 rounded-xl font-bold border-border bg-muted/40"
                          required
                          disabled={saving}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Estado</label>
                      <select
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl font-bold border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10"
                        disabled={saving}
                      >
                        <option value="Disponible">Disponible</option>
                        <option value="en Proceso">En Proceso</option>
                        <option value="Cerrado">Cerrado</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Responsable asignado</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Escribir nombre del responsable..."
                        value={responsable}
                        onChange={(e) => setResponsable(e.target.value)}
                        className="w-full h-12 pl-12 rounded-xl font-bold border-border bg-muted/40 text-sm"
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-sm p-4 sm:p-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={saving}
                  className="font-bold h-12 rounded-xl border-border"
                >
                  <X className="w-4 h-4 mr-1.5" /> Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black italic px-8 h-12 rounded-xl shadow-lg shadow-primary/20"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando…
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
