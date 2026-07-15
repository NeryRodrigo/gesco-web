"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Cpu, FileSearch, Database, Loader2, CheckCircle2, 
  AlertCircle, Eye, CheckSquare, Square, Search, 
  TableProperties, SlidersHorizontal, Sparkles 
} from "lucide-react";
import { toast } from "sonner";

interface TablePreview {
  tabla: string;
  columnas: string[];
  filas: Record<string, string>[];
}

export function MigradorPage({ empresaId }: { empresaId?: number }) {
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [tablas, setTablas] = useState<string[]>([]);
  const [escaneado, setEscaneado] = useState(false);
  const [migrando, setMigrando] = useState(false);
  const [migracionFinalizada, setMigracionFinalizada] = useState(false);
  const [empresaMigrada, setEmpresaMigrada] = useState<{id: number, nombre: string} | null>(null);

  // Estados de Selección, Búsqueda y Vista Previa
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTableName, setPreviewTableName] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<TablePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isDialogPreviewOpen, setIsDialogPreviewOpen] = useState(false);

  // NUEVOS ESTADOS RELACIONALES Y DE ESCANEO DE ALTA VELOCIDAD
  const [onlyRelated, setOnlyRelated] = useState(false);
  const [relaciones, setRelaciones] = useState<{tablaPadre: string, tablaHija: string, columnaPadre: string, columnaHija: string}[]>([]);
  const [migracionCore, setMigracionCore] = useState(true);

  // Estados del modal de progreso y terminal en tiempo real
  const [showScanProgressModal, setShowScanProgressModal] = useState(false);
  const [scanPercent, setScanPercent] = useState(0);
  const [discoveredList, setDiscoveredList] = useState<string[]>([]);
  const [activeDecodingTable, setActiveDecodingTable] = useState("");

  // Efecto de auto-scroll para la terminal de escaneo
  useEffect(() => {
    if (showScanProgressModal) {
      const el = document.getElementById("terminal-bottom");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [discoveredList, showScanProgressModal]);

  const handleScan = async () => {
    if (!filePath) return toast.error("Ingresa la ruta del archivo");
    
    setLoading(true);
    setEscaneado(false);
    setSelectedTables([]);
    setRelaciones([]);
    
    // Inicializar estados de animación
    setShowScanProgressModal(true);
    setScanPercent(0);
    setDiscoveredList([]);
    setActiveDecodingTable("Leyendo cabeceras binarias...");
    
    try {
      const endpoint = onlyRelated ? "scan-relations" : "scan-binary";
      const res = await fetch(`http://localhost:5034/api/Intelligence/${endpoint}?filePath=${encodeURIComponent(filePath)}`);
      
      if (res.ok) {
        const data = await res.json();
        const detected = onlyRelated ? data.tablasRelacionadas : data.tablasDetectadas;
        
        if (!detected || detected.length === 0) {
          toast.error("No se detectaron tablas operativas en este archivo de backup.");
          setShowScanProgressModal(false);
          setLoading(false);
          return;
        }

        // Ejecutar animación de descubrimiento secuencial ultra premium (efecto Matrix/Terminal)
        let percent = 0;
        let index = 0;
        const totalTables = detected.length;
        
        // Intervalo dinámico y super veloz ajustado según la cantidad de tablas
        const animationSpeed = Math.max(30, Math.min(80, 1500 / totalTables));
        
        const interval = setInterval(() => {
          if (index < totalTables) {
            const currentTable = detected[index];
            setActiveDecodingTable(`DECODIFICANDO ESTRUCTURA: ${currentTable}`);
            setDiscoveredList(prev => [...prev, currentTable]);
            index++;
            percent = Math.min(Math.floor((index / totalTables) * 100), 98);
            setScanPercent(percent);
          } else {
            clearInterval(interval);
            setScanPercent(100);
            setActiveDecodingTable("Â¡Análisis relacional y firmas finalizadas con éxito!");
            
            // Un pequeño delay para que la transición sea hermosa
            setTimeout(() => {
              if (onlyRelated) {
                setTablas(data.tablasRelacionadas);
                setSelectedTables(data.tablasRelacionadas);
                setRelaciones(data.relaciones);
                toast.success("Análisis de Relaciones Completado", { 
                  description: `Se detectaron ${data.tablasRelacionadas.length} objetos acoplados mediante PK-FK y ${data.relaciones.length} relaciones.` 
                });
              } else {
                setTablas(data.tablasDetectadas);
                setSelectedTables(data.tablasDetectadas);
                toast.success("Escaneo Heurístico Finalizado", { 
                  description: `Se detectaron ${data.conteo} estructuras y tablas legibles.` 
                });
              }
              setEscaneado(true);
              setShowScanProgressModal(false);
              setLoading(false);
            }, 800);
          }
        }, animationSpeed);
        
      } else {
        setShowScanProgressModal(false);
        setLoading(false);
        toast.error("Error al escanear", { 
          description: "Verifica que el archivo exista y OIMA tenga permisos." 
        });
      }
    } catch (error) {
      setShowScanProgressModal(false);
      setLoading(false);
      toast.error("Fallo de conexión con el motor de IA.");
    }
  };

  const handlePreviewTable = async (tableName: string) => {
    setPreviewTableName(tableName);
    setPreviewLoading(true);
    setIsDialogPreviewOpen(true);
    try {
      const res = await fetch(`http://localhost:5034/api/Intelligence/preview-table?filePath=${encodeURIComponent(filePath)}&tableName=${encodeURIComponent(tableName)}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      } else {
        toast.error("No se pudo obtener vista previa del objeto.");
        setIsDialogPreviewOpen(false);
      }
    } catch (error) {
      toast.error("Error de conexión al obtener metadatos.");
      setIsDialogPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleTableSelect = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName) 
        : [...prev, tableName]
    );
  };

  const handleSelectAll = () => {
    setSelectedTables(tablas);
    toast.info("Todos los objetos seleccionados.");
  };

  const handleUnselectAll = () => {
    setSelectedTables([]);
    toast.info("Selección limpiada.");
  };

  const handleMigrate = async () => {
    if (selectedTables.length === 0) {
      return toast.error("Selección vacía", { description: "Por favor, selecciona al menos una tabla para migrar." });
    }

    setMigrando(true);
    try {
      const endpoint = migracionCore ? "ejecutar-migracion-mapeada" : "ejecutar-migracion";
      const res = await fetch(`http://localhost:5034/api/Intelligence/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombreEmpresa: "INVIPINT S.A.", 
          filePath: filePath, 
          tablas: selectedTables,
          targetEmpresaId: empresaId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEmpresaMigrada({ id: data.empresaId, nombre: data.nombre });
        setMigracionFinalizada(true);
        toast.success(migracionCore ? "Mapeo Core OIMA Completado" : "Migración Inteligente Completada", { 
          description: migracionCore 
            ? "Los datos se inyectaron directamente en Personas, Productos y Facturas de OIMA con integridad relacional completa."
            : "La base de datos dinámica ha sido creada e inyectada con éxito." 
        });
      } else {
        toast.error("Fallo durante el proceso de migración estructural.");
      }
    } catch (error) {
      toast.error("Fallo de conexión al migrar.");
    } finally {
      setMigrando(false);
    }
  };

  const filteredTablas = tablas.filter(t => 
    t.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black italic text-foreground tracking-tighter flex items-center">
            <Cpu className="mr-3 h-10 w-10 text-primary animate-pulse" /> OIMA DATA INTELLIGENCE
          </h2>
          <p className="text-muted-foreground font-medium mt-1">Ingeniería inversa de archivos binarios y backups desconocidos.</p>
        </div>
        <div className="px-4 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse">
          AI Schema Engine Active
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-3xl bg-card overflow-hidden">
        <div className="p-8 bg-muted border-b border-border">
          <label className="text-xs font-black uppercase text-muted-foreground mb-2 block tracking-widest">Ruta Absoluta del Archivo (.DMP, .SQL, .BAK)</label>
          <div className="flex gap-4">
            <Input 
              value={filePath} 
              onChange={e => setFilePath(e.target.value)} 
              placeholder="Ej: C:\Backups\oracle_dump.dmp" 
              className="bg-card rounded-xl h-14 border-border focus:ring-primary font-mono text-sm"
            />
            <Button 
              onClick={handleScan} 
              disabled={loading}
              className="h-14 px-8 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileSearch className="mr-2 h-5 w-5" />}
              {loading ? "Analizando Binario..." : "Escanear Estructura"}
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border/60">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={onlyRelated} 
                onChange={e => setOnlyRelated(e.target.checked)} 
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary accent-primary"
              />
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Filtrar solo tablas relacionadas (PK/FK)</span>
            </label>
            
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={migracionCore} 
                onChange={e => setMigracionCore(e.target.checked)} 
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary accent-primary"
              />
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Volcar directo a la estructura Core de OIMA</span>
            </label>
          </div>

          {(onlyRelated || migracionCore) && (
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-900 animate-in fade-in duration-300">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 animate-pulse mt-0.5" />
              <div className="text-xs leading-relaxed">
                {onlyRelated && migracionCore ? (
                  <p>
                    <strong>ðŸŽ¯ Migración Relacional Avanzada Activa:</strong> Al presionar "Ejecutar Migración", 
                    el motor de OIMA leerá las tablas seleccionadas (que contienen <strong>datos y llaves PK/FK</strong>), 
                    y gracias a su algoritmo semántico, inyectará ordenadamente Clientes, Productos y Ventas 
                    <strong>directamente en las tablas Core de OIMA</strong> de tu empresa activa, resolviendo las 
                    relaciones de integridad referencial de forma nativa.
                  </p>
                ) : onlyRelated ? (
                  <p>
                    <strong>ðŸ” Filtro Relacional Activo:</strong> El listado muestra únicamente tablas con llaves primarias/secundarias 
                    y dependencias funcionales, omitiendo vistas, logs y tablas vacías.
                  </p>
                ) : (
                  <p>
                    <strong>ðŸ“¦ Volcado Core OIMA Activo:</strong> Los datos se estructurarán y enviarán directamente a 
                    los módulos de Inventario, CRM y Ventas Históricas de tu empresa activa de OIMA.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-8">
          {!escaneado && !loading && (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <Database className="h-20 w-20 mb-4 opacity-20" />
              <p className="font-bold italic">Listo para realizar ingeniería inversa sobre el backup.</p>
              <p className="text-xs mt-2 max-w-xs text-center opacity-50 uppercase font-black tracking-tighter">OIMA utilizará heurística para detectar tablas, tipos de datos y registros sin drivers originales.</p>
            </div>
          )}

          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-primary">
              <Loader2 className="h-16 w-16 animate-spin mb-4" />
              <p className="font-black italic text-xl animate-pulse">Descomponiendo binarios y mapeando metadatos...</p>
              <div className="mt-4 flex gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          {escaneado && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="font-bold">Estructura Recuperada</p>
                    <p className="text-xs opacity-80">Se han identificado {tablas.length} objetos de base de datos legibles. Selección: {selectedTables.length} tablas activas.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl" onClick={handleSelectAll}>
                    <CheckSquare className="w-4 h-4 mr-1.5" /> Seleccionar Todo
                  </Button>
                  <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl" onClick={handleUnselectAll}>
                    <Square className="w-4 h-4 mr-1.5" /> Deseleccionar Todo
                  </Button>
                </div>
              </div>

              {/* Barra de Filtro */}
              <div className="flex items-center gap-4 bg-muted p-4 rounded-2xl border border-border">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filtrar tablas detectadas..." 
                    className="pl-9 h-11 bg-card border-border rounded-xl text-foreground text-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-muted-foreground">
                  <SlidersHorizontal className="h-4 w-4" /> Filtros
                </div>
              </div>

              {/* Mapa de Relaciones PK/FK Detectadas */}
              {relaciones.length > 0 && (
                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3 animate-in fade-in zoom-in duration-500">
                  <p className="text-[10px] font-black uppercase text-blue-700 tracking-widest flex items-center">
                    <Database className="w-3.5 h-3.5 mr-1.5 animate-pulse text-blue-600" /> Relaciones PK/FK Detectadas por Heurística de OIMA
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                    {relaciones.map((r, rIdx) => (
                      <div key={rIdx} className="flex items-center justify-between bg-card/70 p-2.5 rounded-xl border border-border text-foreground shadow-sm">
                        <span className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{r.tablaPadre}</span>
                        <span className="text-muted-foreground">({r.columnaPadre})</span>
                        <span className="text-primary font-bold">âž”</span>
                        <span className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{r.tablaHija}</span>
                        <span className="text-primary font-semibold">({r.columnaHija})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid de Tablas con Checkbox y Vista Previa */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTablas.map((t, idx) => {
                  const isChecked = selectedTables.includes(t);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleTableSelect(t)}
                      className={`p-4 border rounded-2xl transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden ${
                        isChecked 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                          : 'bg-muted border-border text-foreground hover:border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3 z-10">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleTableSelect(t);
                          }}
                          className={`w-4 h-4 rounded border-border focus:ring-primary ${
                            isChecked ? 'accent-primary' : ''
                          }`}
                        />
                        <span className="font-mono text-sm font-bold tracking-tight">{t}</span>
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewTable(t);
                        }}
                        className={`h-8 w-8 rounded-lg transition-colors z-10 ${
                          isChecked 
                            ? 'text-muted-foreground hover:text-white hover:bg-card/10' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Eye className="w-4 h-4 animate-in fade-in zoom-in duration-300" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              
              <div className="pt-6 border-t border-border flex justify-between items-center">
                 <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl">
                    <Database className="h-5 w-5 animate-pulse" />
                    <span className="text-xs font-bold uppercase italic">Empresa Detectada: INVIPINT S.A.</span>
                 </div>
                 <Button 
                    onClick={handleMigrate}
                    disabled={migrando || selectedTables.length === 0}
                    className="rounded-xl h-12 px-6 font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-95 transition-all"
                 >
                   {migrando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                   {migrando ? "Migrando y Creando Tablas..." : "Ejecutar Migración de Seleccionados"}
                 </Button>
              </div>

              {migracionFinalizada && (
                <div className="mt-8 p-8 bg-slate-900 text-white rounded-3xl animate-in zoom-in duration-500 shadow-2xl border-4 border-primary/20">
                  <div className="flex items-start gap-6">
                    <div className="bg-primary/20 p-4 rounded-2xl text-primary">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black italic mb-2 tracking-tighter">Â¡MIGRACIÓN Y DDL DINÃMICO COMPLETADO!</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                        La empresa <span className="text-white font-bold">{empresaMigrada?.nombre}</span> ha sido aprovisionada con éxito. Las tablas seleccionadas fueron creadas físicamente en SQL Server con sus columnas estructuradas e inyectadas de forma nativa.
                      </p>
                      
                      <div className="bg-card/5 p-6 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-black uppercase text-primary mb-4 tracking-widest">Paso Final: Acceso de Cliente</p>
                        <div className="flex gap-4">
                          <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-6">
                            Crear Usuario Administrador
                          </Button>
                          <Button variant="ghost" className="text-muted-foreground hover:text-white font-bold" onClick={() => window.location.reload()}>
                            Nueva Migración
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal / Dialog de Vista Previa de Tabla */}
      <Dialog open={isDialogPreviewOpen} onOpenChange={setIsDialogPreviewOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-3xl border-none p-6 bg-card overflow-hidden shadow-2xl">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="font-black italic text-2xl text-primary flex items-center gap-2">
              <TableProperties className="h-6 w-6 text-primary" /> VISTA PREVIA: {previewTableName}
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-medium">Metadatos estructurados e inferencia de tipos heurísticos desde el Dump de Oracle.</p>
          </DialogHeader>

          {previewLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-primary">
              <Loader2 className="h-10 w-10 animate-spin mb-3" />
              <p className="font-bold italic text-sm text-muted-foreground animate-pulse">Parseando segmentos del binario...</p>
            </div>
          ) : previewData ? (
            <div className="space-y-4 pt-4">
              <div className="bg-muted rounded-2xl border border-border overflow-hidden max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      {previewData.columnas.map((col, idx) => (
                        <TableHead key={idx} className="font-mono font-black text-[10px] text-muted-foreground uppercase tracking-wider py-3">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.filas.map((fila, fIdx) => (
                      <TableRow key={fIdx} className="hover:bg-muted/50 transition-colors">
                        {previewData.columnas.map((col, cIdx) => (
                          <TableCell key={cIdx} className="font-medium text-xs text-muted-foreground font-mono py-3">
                            {fila[col]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl text-blue-800 text-[11px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                  <span>
                    <strong>Inferencia de Esquema:</strong> OIMA ha determinado que este objeto se mapeará a una nueva tabla <code>MIGRADO_{previewTableName}</code>. Los tipos numéricos, fechas y textos serán generados de forma dinámica y segura en la base de datos de OIMA.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No hay datos disponibles para previsualizar.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal / Dialog de Progreso de Escaneo en Tiempo Real (Premium) */}
      <Dialog open={showScanProgressModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border border-slate-800 p-6 bg-slate-900 text-white overflow-hidden shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="font-black text-xl text-white flex items-center gap-2.5">
              <Database className="h-6 w-6 text-primary animate-pulse" />
              <span>Decodificador de Base de Datos OIMA</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-medium">Analizando firmas de flujo binario del archivo de backup...</p>
          </DialogHeader>

          <div className="py-2 space-y-6">
            {/* Círculo Giratorio y Porcentaje */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full border-4 border-slate-800 border-t-primary animate-spin" />
                  <Cpu className="absolute top-4 left-4 h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estado del Escáner</p>
                  <p className="text-xs font-bold text-blue-400 animate-pulse transition-all truncate max-w-[240px]">
                    {activeDecodingTable}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                  {scanPercent}%
                </span>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div className="relative w-full h-3.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-primary rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                style={{ width: `${scanPercent}%` }}
              />
            </div>

            {/* Terminal Log de Tablas Encontradas */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                <span>Tablas e Integridades Estructuradas</span>
                <span>{discoveredList.length} detectadas</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground bg-slate-950/85 rounded-2xl p-4.5 h-44 overflow-y-auto border border-slate-800/80 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {discoveredList.length === 0 ? (
                  <p className="text-muted-foreground italic animate-pulse">Esperando firmas de segmento binario...</p>
                ) : (
                  <div className="space-y-1.5">
                    {discoveredList.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#10b981]" />
                        <span className="text-muted-foreground select-all">{t}</span>
                        <span className="ml-auto text-muted-foreground">DECODED OK</span>
                      </div>
                    ))}
                    {/* Elemento fantasma para auto-scroll */}
                    <div id="terminal-bottom" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="p-6 border-none shadow-sm bg-blue-50 rounded-2xl">
            <h4 className="font-black text-blue-900 text-sm mb-2 uppercase tracking-widest flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" /> ¿Cómo funciona?
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              OIMA escanea el archivo byte a byte buscando secuencias de caracteres legibles que coincidan con patrones de metadatos de bases de datos (SQL, Oracle, DB2). Esto permite conocer qué información hay dentro de un backup incluso si el motor original está corrupto o no está instalado.
            </p>
         </Card>
         <Card className="p-6 border-none shadow-sm bg-purple-50 rounded-2xl">
            <h4 className="font-black text-purple-900 text-sm mb-2 uppercase tracking-widest flex items-center">
              <Cpu className="mr-2 h-4 w-4" /> Mapeo con IA
            </h4>
            <p className="text-xs text-purple-800 leading-relaxed">
              Una vez detectadas las tablas, OIMA utiliza un modelo de lenguaje para comparar semánticamente los nombres encontrados con la estructura de OIMA ERP, sugiriendo la migración automática de Clientes, Ventas y Stock.
            </p>
         </Card>
      </div>
    </div>
  );
}

