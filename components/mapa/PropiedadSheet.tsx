import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge"; // Si no tienes este componente, usa un div con clases
import { Trash2, Save, Building, MapPin, DollarSign, Calendar, Info, FileText, Upload, User as UserIcon } from "lucide-react";
import { Propiedad } from "../../types/propiedad";

interface Props {
  propiedad: Propiedad | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (prop: Propiedad) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function PropiedadSheet({ propiedad, isOpen, onClose, onSave, onDelete }: Props) {
  const [formData, setFormData] = useState<Propiedad | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setFormData(propiedad);
    setIsEditing(false);
  }, [propiedad]);

  if (!formData) return null;

  const handleChange = (field: keyof Propiedad, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const formatToInputDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch { return ""; }
  };

  const formatToDisplayDate = (dateStr?: string) => {
    if (!dateStr || dateStr.startsWith("01/01/0001")) return "Pendiente";
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Helper para mostrar campos de texto o inputs según el estado
  const Field = ({ label, icon: Icon, value, field, type = "text", className = "" }: any) => (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" /> {label}
      </Label>
      {isEditing ? (
        <Input
          type={type}
          value={value}
          onChange={(e) => handleChange(field, type === "number" ? Number(e.target.value) : e.target.value)}
          className="h-9 focus-visible:ring-blue-500"
        />
      ) : (
        <p className="text-sm font-medium text-foreground min-h-[20px] px-1">
          {/* QUITAMOS EL "Gs." Y DEJAMOS SOLO EL FORMATO DE MILES */}
          {type === "number" && field.includes("precio") 
            ? Number(value).toLocaleString('es-PY') 
            : value || "---"}
        </p>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto flex flex-col gap-0 p-0">
        
        {/* HEADER CON ESTILO */}
        <div className="p-6 border-b bg-muted/50">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-2 py-0.5 font-mono">
              MLSID: {formData.mlsid}
            </Badge>
          </div>
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Building className="h-6 w-6 text-blue-600" />
              Detalle de Propiedad
            </SheetTitle>
            <SheetDescription className="text-muted-foreground italic">
              Información técnica y administrativa de la captación
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* SECCIÓN: TÍTULO PRINCIPAL */}
          <div className="space-y-3">
             <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
               <Info className="w-3.5 h-3.5" /> Título del anuncio
             </Label>
             {isEditing ? (
               <Input 
                value={formData.titulo} 
                onChange={(e) => handleChange('titulo', e.target.value)}
                className="font-medium"
               />
             ) : (
               <h3 className="text-lg font-semibold text-foreground leading-tight">
                 {formData.titulo}
               </h3>
             )}
          </div>

          <Separator className="opacity-50" />

          {/* GRID DE DATOS CLAVE */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <Field 
              label="Precio de Venta" 
              icon={DollarSign} 
              value={formData.precioVentaGs} 
              field="precioVentaGs" 
              type="number"
              className={!isEditing ? "text-blue-700" : ""}
            />
            <Field 
              label="Ciudad" 
              icon={MapPin} 
              value={formData.ciudad} 
              field="ciudad" 
            />
          </div>

          {/* SECCIÓN DE FECHAS CON CONTENEDOR DIFERENCIADO */}
          <div className="bg-muted rounded-xl p-4 border border-border grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Vencimiento
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formatToInputDate(formData.fechaCaducidad)}
                  onChange={(e) => handleChange('fechaCaducidad', e.target.value)}
                  className="h-8 text-xs"
                />
              ) : (
                <span className="text-sm font-bold text-orange-600">
                  {formatToDisplayDate(formData.fechaCaducidad)}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Firma Contrato
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formatToInputDate(formData.fechaFirmaContrato)}
                  onChange={(e) => handleChange('fechaFirmaContrato', e.target.value)}
                  className="h-8 text-xs"
                />
              ) : (
                <span className="text-sm font-bold text-foreground">
                  {formatToDisplayDate(formData.fechaFirmaContrato)}
                </span>
              )}
            </div>
          </div>

          <Separator className="opacity-50" />
          
          {/* SECCIÓN AGENTE */}
          <div className="space-y-3">
             <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
               <UserIcon className="w-3.5 h-3.5" /> Agente Encargado
             </Label>
             <div className="flex items-center gap-3 bg-muted p-3 rounded-xl border border-border">
               <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-200 overflow-hidden flex items-center justify-center">
                 {formData.fotoAgenteUrl ? (
                   <img src={formData.fotoAgenteUrl} alt={formData.agenteCreadorNombre} className="w-full h-full object-cover" />
                 ) : (
                   <UserIcon className="h-5 w-5 text-blue-400" />
                 )}
               </div>
               <div>
                 <p className="text-sm font-bold text-foreground">{formData.agenteCreadorNombre || "Agente No Asignado"}</p>
                 <p className="text-[10px] text-muted-foreground font-mono">ID: {formData.agenteId}</p>
               </div>
             </div>
          </div>

          <Separator className="opacity-50" />

          {/* SECCIÓN DOCUMENTOS REMAX */}
          <div className="space-y-4 pb-4">
             <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
               <FileText className="w-3.5 h-3.5 text-blue-600" /> Documentos REMAX
             </Label>
             <div className="bg-muted p-4 rounded-2xl border border-border space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Propietario / Captación</p>
                <div className="space-y-2">
                  {["Título de Propiedad (Escritura)", "ACM", "Fotos de la propiedad", "Exclusividad", "Cédula", "Impuesto inmobiliario al día"].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-card p-2 px-3 rounded-lg border border-border shadow-sm">
                      <span className="text-xs font-semibold text-foreground truncate flex-1">{doc}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-600">
                        <Upload className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* FOOTER FIJO Y LIMPIO */}
        <SheetFooter className="p-6 border-t bg-card sticky bottom-0">
          <div className="flex w-full items-center justify-between gap-4">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={() => { onSave(formData); setIsEditing(false); }} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" /> Guardar
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(formData.propiedadId)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                </Button>
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8"
                >
                  Editar Propiedad
                </Button>
              </>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );}