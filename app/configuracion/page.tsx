"use client";


import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  Hash,
  FileSignature,
  FileBadge,
  Loader2,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { ConfiguracionModal, ConfiguracionTimbrado } from "./ConfiguracionModal";
import { API_BASE } from "@/lib/api";

interface ConfiguracionPageProps {
  empresaId?: number;
}

export default function ConfiguracionPage({ empresaId }: ConfiguracionPageProps) {
  const activeEmpresaId = empresaId || 11; // Invipint por defecto (Rubro RETAIL)
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionTimbrado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ConfiguracionTimbrado | null>(null);

  // Estados para Plantillas de Documentos Legales
  const [plantillasList, setPlantillasList] = useState<any[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [isCreatingPlantilla, setIsCreatingPlantilla] = useState(false);
  const [uploadingPlantillaId, setUploadingPlantillaId] = useState<number | null>(null);
  const [newPlantillaForm, setNewPlantillaForm] = useState({
    nombre: "",
    tipo: "PRINCIPAL",
    descripcion: "",
    variablesSoportadas: "{Locatario}, {Codeudor}, {MontoAlquiler}, {Duplex}"
  });

  // Estados para Multas (Mora)
  const [montoMulta, setMontoMulta] = useState(0);
  const [tipoAplicacion, setTipoAplicacion] = useState("FinMesAtrasado");
  const [diasGracia, setDiasGracia] = useState(5);
  const [savingMulta, setSavingMulta] = useState(false);

  const cargarConfiguraciones = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/Configuraciones/empresa/${activeEmpresaId}`);
      if (resp.ok) {
        const data = await resp.json();
        setConfiguraciones(data);
      } else {
        toast.error("Error al cargar configuraciones");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const cargarMulta = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/ConfiguracionMultas/empresa/${activeEmpresaId}`);
      if (resp.ok) {
        const data = await resp.json();
        setMontoMulta(data.montoMulta);
        setTipoAplicacion(data.tipoAplicacion);
        setDiasGracia(data.diasGracia);
      }
    } catch (error) {
      console.error("Error al cargar configuración de multas:", error);
    }
  };

  const fetchPlantillas = async () => {
    setLoadingPlantillas(true);
    try {
      const res = await fetch(`${API_BASE}/api/Plantillas`);
      if (res.ok) {
        const data = await res.json();
        setPlantillasList(data);
      }
    } catch (error) {
      console.error("Error al cargar plantillas:", error);
    } finally {
      setLoadingPlantillas(false);
    }
  };

  useEffect(() => {
    cargarConfiguraciones();
    cargarMulta();
    fetchPlantillas();
  }, []);

  const handleCreatePlantilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlantillaForm.nombre.trim()) {
      toast.error("El nombre del documento es obligatorio");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/Plantillas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlantillaForm)
      });
      if (res.ok) {
        toast.success("Nueva plantilla creada");
        setIsCreatingPlantilla(false);
        setNewPlantillaForm({
          nombre: "",
          tipo: "PRINCIPAL",
          descripcion: "",
          variablesSoportadas: "{Locatario}, {Codeudor}, {MontoAlquiler}, {Duplex}"
        });
        fetchPlantillas();
      } else {
        toast.error("Error al crear la plantilla");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleUploadDocx = async (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      toast.error("El archivo debe ser un formato Word (.docx)");
      return;
    }
    setUploadingPlantillaId(id);
    const formData = new FormData();
    formData.append("archivo", file);
    try {
      const res = await fetch(`${API_BASE}/api/Plantillas/${id}/upload`, {
        method: "PUT",
        body: formData
      });
      if (res.ok) {
        toast.success("Formato de documento cargado con éxito");
        fetchPlantillas();
      } else {
        toast.error("Error al subir formato .docx");
      }
    } catch (error) {
      toast.error("Error al subir archivo");
    } finally {
      setUploadingPlantillaId(null);
    }
  };

  const handleDeletePlantilla = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta plantilla de documento?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/Plantillas/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Plantilla eliminada");
        fetchPlantillas();
      } else {
        toast.error("No se pudo eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleSave = async (data: Partial<ConfiguracionTimbrado>) => {
    try {
      const isEdit = !!data.timbradoId;
      const url = isEdit 
        ? `${API_BASE}/api/Configuraciones/${data.timbradoId}`
        : `${API_BASE}/api/Configuraciones`;
      
      const resp = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, fechaCarga: data.fechaCarga || new Date().toISOString() })
      });

      if (resp.ok) {
        toast.success(isEdit ? "Timbrado actualizado" : "Timbrado creado con éxito");
        setIsModalOpen(false);
        cargarConfiguraciones();
      } else {
        const err = await resp.text();
        toast.error("Error al guardar: " + err);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este timbrado?")) return;
    try {
      const resp = await fetch(`${API_BASE}/api/Configuraciones/${id}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        toast.success("Timbrado eliminado");
        cargarConfiguraciones();
      } else {
        toast.error("No se pudo eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleSaveMulta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMulta(true);
    try {
      const resp = await fetch(`${API_BASE}/api/ConfiguracionMultas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: activeEmpresaId,
          montoMulta,
          tipoAplicacion,
          diasGracia
        })
      });
      if (resp.ok) {
        toast.success("Configuración de multas moratorias guardada con éxito");
      } else {
        toast.error("Error al guardar la configuración de multas");
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor");
    } finally {
      setSavingMulta(false);
    }
  };

  const openNewModal = () => {
    setSelectedConfig(null);
    setIsModalOpen(true);
  };

  const openEditModal = (conf: ConfiguracionTimbrado) => {
    setSelectedConfig(conf);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-0 p-4 md:p-8 font-sans bg-transparent">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-[#0C1327] p-6 rounded-3xl shadow-sm border border-white/5">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Settings className="text-white w-6 h-6" />
              </div>
              Panel de <span className="text-blue-400">Configuración</span>
            </h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Gestión de Timbrados y Facturación</p>
          </div>
          <Button 
            onClick={openNewModal}
            className="bg-blue-600 text-white font-black italic rounded-xl px-6 hover:scale-105 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="mr-2 w-4 h-4" /> NUEVO TIMBRADO
          </Button>
        </div>

        {/* TIMBRADO TABLE */}
        <Card className="border border-white/5 shadow-xl bg-[#0C1327] rounded-3xl overflow-hidden">
          <CardHeader className="bg-[#0C1327] border-b border-white/5 p-6">
            <CardTitle className="text-lg font-black uppercase italic text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> Registro de Timbrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground font-bold">Cargando timbrados...</div>
            ) : configuraciones.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-bold">No hay timbrados registrados. Crea uno nuevo.</div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground pl-6">Empresa / RUC</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground">Timbrado NÂ°</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground">Rango (Desde - Hasta)</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground">Vencimiento</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground text-center">Estado</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-muted-foreground text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configuraciones.map((conf) => (
                    <TableRow key={conf.timbradoId} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="pl-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted p-2 rounded-lg text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-black text-foreground uppercase italic text-sm">Empresa #{conf.empresaId}</p>
                            <p className="text-[10px] font-bold text-muted-foreground">{conf.ruc}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Hash className="w-3 h-3 text-blue-500" />
                          <span className="font-black text-foreground">{conf.numeroTimbrado}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-muted-foreground text-xs">
                          {conf.numeroDesde.toString().padStart(7, '0')} - {conf.numeroHasta.toString().padStart(7, '0')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(conf.validezHasta).toLocaleDateString('es-PY')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`font-black italic text-[9px] uppercase px-3 py-1 rounded-lg
                          ${conf.estaActivo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {conf.estaActivo ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : <AlertCircle className="w-3 h-3 mr-1 inline" />}
                          {conf.estaActivo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(conf)}
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(conf.timbradoId)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* CONFIGURACIÓN DE MULTAS MORATORIAS */}
        <Card className="border border-white/5 shadow-sm rounded-3xl overflow-hidden bg-[#0C1327]">
          <CardHeader className="bg-[#0C1327] border-b border-white/5 p-6">
            <CardTitle className="text-lg font-black uppercase italic text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" /> Configuración de Multas Moratorias (Mora)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveMulta} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Monto de Multa (Gs.)</label>
                  <Input 
                    type="number" 
                    value={montoMulta} 
                    onChange={(e) => setMontoMulta(Number(e.target.value))}
                    className="h-12 rounded-xl font-bold border-white/10 bg-[#0A1631] text-white" 
                    min="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Regla de Aplicación</label>
                  <select
                    value={tipoAplicacion}
                    onChange={(e) => setTipoAplicacion(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl font-bold border border-white/10 bg-[#0A1631] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="FinMesAtrasado">Al Fin del Mes Atrasado</option>
                    <option value="CincoDias">Pasando Días de Gracia</option>
                  </select>
                </div>
                {tipoAplicacion === "CincoDias" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Días de Gracia</label>
                    <Input 
                      type="number" 
                      value={diasGracia} 
                      onChange={(e) => setDiasGracia(Number(e.target.value))}
                      className="h-12 rounded-xl font-bold border-white/10 bg-[#0A1631] text-white"
                      min="1"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={savingMulta}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl px-6 h-12 shadow-lg shadow-blue-600/20"
                >
                  {savingMulta ? "Guardando..." : "GUARDAR CONFIGURACIÓN"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* HEADER PLANTILLAS DE CONTRATOS Y LEGALES */}
        <div className="flex justify-between items-center bg-[#0C1327] p-6 rounded-3xl shadow-sm border border-white/5 mt-12">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl">
                <FileSignature className="text-white w-6 h-6" />
              </div>
              Plantillas de <span className="text-blue-400">Contrato</span>
            </h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Formatos predefinidos para la generación automática</p>
          </div>
          <Button 
            onClick={() => setIsCreatingPlantilla(true)}
            className="bg-blue-600 text-white font-black italic rounded-xl px-6 hover:scale-105 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="mr-2 w-4 h-4" /> NUEVA PLANTILLA
          </Button>
        </div>

        {/* PLANTILLAS TABLE */}
        <Card className="border border-white/5 shadow-xl bg-[#0C1327] rounded-3xl overflow-hidden">
          <CardHeader className="bg-[#0C1327] border-b border-white/5 p-6">
            <CardTitle className="text-lg font-black uppercase italic text-white flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-blue-400" /> Documentos Legales y Contratos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/80">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-black text-muted-foreground uppercase text-[10px] tracking-wider py-4 pl-8">Documento</TableHead>
                  <TableHead className="font-black text-muted-foreground uppercase text-[10px] tracking-wider py-4">Tipo</TableHead>
                  <TableHead className="font-black text-muted-foreground uppercase text-[10px] tracking-wider py-4">Variables Soportadas</TableHead>
                  <TableHead className="font-black text-muted-foreground uppercase text-[10px] tracking-wider py-4 text-right pr-8">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPlantillas ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-bold uppercase text-xs">Cargando plantillas...</TableCell></TableRow>
                ) : plantillasList.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-bold uppercase text-xs">No hay plantillas registradas</TableCell></TableRow>
                ) : (
                  plantillasList.map((p) => (
                    <TableRow key={p.plantillaId} className="border-white/5 hover:bg-white/5">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-foreground uppercase text-sm">{p.nombre}</p>
                          {p.archivoUrl && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] gap-1 px-2 py-0.5 font-bold">
                              <FileCheck className="w-3 h-3" /> LISTO (.DOCX)
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold">{p.descripcion || "Formato estándar"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-bold uppercase text-[9px] ${
                          p.tipo === 'PRINCIPAL' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          p.tipo === 'GARANTÍA' || p.tipo === 'GARANTIA' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          {p.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {p.variablesSoportadas || "{Locatario}, {Codeudor}, {MontoAlquiler}, {Duplex}"}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-1 items-center">
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              accept=".docx" 
                              className="hidden" 
                              disabled={uploadingPlantillaId === p.plantillaId}
                              onChange={(e) => handleUploadDocx(e, p.plantillaId)}
                            />
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${uploadingPlantillaId === p.plantillaId ? 'animate-pulse' : ''}`} title="Subir / Reemplazar formato Word (.docx)">
                              {uploadingPlantillaId === p.plantillaId ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <Edit2 className="w-4 h-4" />}
                            </span>
                          </label>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeletePlantilla(p.plantillaId)}
                            title="Eliminar plantilla"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* INFO CARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-600/20 flex items-center gap-6">
            <div className="bg-card/20 p-4 rounded-2xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black italic uppercase text-xl mb-1 text-white">Facturación Automática</h3>
              <p className="text-blue-100 text-sm font-medium">
                Al registrar un pago, el sistema generará automáticamente la factura legal usando el timbrado activo y la enviará por correo.
              </p>
            </div>
          </div>

          <div className="bg-[#0C1327] p-8 rounded-3xl border border-white/5 shadow-sm flex items-center gap-6">
            <div className="bg-[#0A1631] p-4 rounded-2xl text-slate-400">
              <Hash className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black italic uppercase text-xl mb-1 text-white">Siguiente Número</h3>
              <p className="text-slate-400 text-sm font-medium">
                Verifique que el rango de números esté correctamente cargado y coincida con el de la SET.
              </p>
            </div>
          </div>
        </div>

      </div>

      <ConfiguracionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        configuracion={selectedConfig}
        empresaId={activeEmpresaId}
      />

      {/* MODAL CREAR NUEVA PLANTILLA */}
      {isCreatingPlantilla && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black italic uppercase text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Nueva Plantilla de Documento
              </h3>
              <button onClick={() => setIsCreatingPlantilla(false)} className="text-muted-foreground hover:text-muted-foreground font-bold">✕</button>
            </div>
            <form onSubmit={handleCreatePlantilla} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Nombre del Documento</label>
                <Input 
                  placeholder="ej. ANEXO DE CONDICIONES ESPECIALES"
                  value={newPlantillaForm.nombre}
                  onChange={(e) => setNewPlantillaForm({...newPlantillaForm, nombre: e.target.value})}
                  className="rounded-xl border-border font-bold uppercase text-xs h-11"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Tipo de Documento</label>
                <select 
                  value={newPlantillaForm.tipo}
                  onChange={(e) => setNewPlantillaForm({...newPlantillaForm, tipo: e.target.value})}
                  className="w-full h-11 rounded-xl border border-border bg-card px-3 font-bold uppercase text-xs text-foreground outline-none"
                >
                  <option value="PRINCIPAL">Principal</option>
                  <option value="GARANTÍA">Garantía</option>
                  <option value="ANEXO">Anexo</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Descripción / Subtítulo</label>
                <Input 
                  placeholder="ej. Formato adicional para inquilino"
                  value={newPlantillaForm.descripcion}
                  onChange={(e) => setNewPlantillaForm({...newPlantillaForm, descripcion: e.target.value})}
                  className="rounded-xl border-border font-bold text-xs h-11"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Variables Soportadas</label>
                <Input 
                  value={newPlantillaForm.variablesSoportadas}
                  onChange={(e) => setNewPlantillaForm({...newPlantillaForm, variablesSoportadas: e.target.value})}
                  className="rounded-xl border-border font-mono text-xs h-11 text-muted-foreground"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreatingPlantilla(false)} className="rounded-xl font-bold uppercase text-xs">Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black italic rounded-xl px-6 uppercase text-xs shadow-md">Crear Documento</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

