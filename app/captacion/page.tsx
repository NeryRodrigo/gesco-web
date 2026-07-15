"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Save, Camera, Ruler, Home as HomeIcon, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CaptacionPropiedad() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    empresaId: 6,
    agenteId: 1, // Esto vendrá del login después
    titulo: "",
    ciudad: "",
    precioVentaGs: 0,
    superficieLoteM2: 0,
    areaConstruccionM2: 0,
    nroAmbientes: 0,
    nroDormitorios: 0,
    nroBanos: 0,
    latitud: 0,
    longitud: 0,
    tieneJardin: false,
    aptoOficina: false,
    descripcionRemax: "",
    fechaFirmaContrato: "",
    fechaCaducidad: "",
    imagenUrl: "",
    fotoAgenteUrl: "",
    mlsid: ""
  });

  const capturarGPS = () => {
    if (!navigator.geolocation) return alert("GPS no soportado");
    setLoading(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm({ ...form, latitud: pos.coords.latitude, longitud: pos.coords.longitude });
      setLoading(false);
      alert("ðŸ“ Ubicación capturada con precisión OIMA");
    });
  };

  const handleSave = async () => {
    const res = await fetch("http://localhost:5034/api/Migration/guardar-propiedad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      alert("Â¡Oima! Propiedad captada y subida al mapa.");
      router.push("/");
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen p-4 pb-20 font-sans">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header estilo App Móvil */}
        <div className="flex items-center justify-between text-white py-4">
           <Button variant="ghost" onClick={() => router.back()} className="text-white">â†</Button>
           <h1 className="text-xl font-black italic tracking-tighter">OIMA <span className="text-blue-500">CAPTACIÓN</span></h1>
           <div className="w-10"></div>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-card">
          <CardHeader className="bg-blue-600 text-white pb-8">
            <CardTitle className="text-lg flex items-center justify-center">
               <HomeIcon className="mr-2 h-5 w-5"/> Datos de la Propiedad
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 -mt-6 bg-card rounded-t-3xl space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Título / Identificador</label>
              <Input placeholder="Ej: Dúplex Moderno en CDE" className="rounded-xl border-border bg-muted" 
                onChange={(e) => setForm({...form, titulo: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Precio (Gs.)</label>
                  <Input type="number" className="font-bold text-blue-600" 
                    onChange={(e) => setForm({...form, precioVentaGs: Number(e.target.value)})} />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Ciudad</label>
                  <Input placeholder="Asunción" className="font-bold" 
                    onChange={(e) => setForm({...form, ciudad: e.target.value})} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1 border-r pr-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Superficie Lote</p>
                  <div className="flex items-center">
                    <Ruler className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input type="number" placeholder="m2" className="border-none p-0 h-auto font-black" 
                      onChange={(e) => setForm({...form, superficieLoteM2: Number(e.target.value)})} />
                  </div>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Construcción</p>
                  <Input type="number" placeholder="m2" className="border-none p-0 h-auto font-black" 
                    onChange={(e) => setForm({...form, areaConstruccionM2: Number(e.target.value)})} />
               </div>
            </div>

            {/* BOTÓN GPS - El "Showroom" de la demo */}
            <div className="bg-blue-50 p-4 rounded-2xl flex items-center justify-between border border-blue-100">
               <div>
                  <p className="text-xs font-bold text-blue-700">Geolocalización</p>
                  <p className="text-[10px] text-blue-400 font-mono italic">
                    {form.latitud !== 0 ? `${form.latitud.toFixed(4)}, ${form.longitud.toFixed(4)}` : "Ubicación pendiente..."}
                  </p>
               </div>
               <Button onClick={capturarGPS} disabled={loading} className="bg-blue-600 hover:bg-blue-700 rounded-full h-12 w-12 p-0 shadow-lg">
                  <MapPin className={loading ? "animate-bounce" : ""} />
               </Button>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-muted-foreground">Descripción (Web RE/MAX)</label>
               <textarea className="w-full text-sm p-3 bg-muted rounded-xl border-none h-24 focus:ring-2 focus:ring-blue-500" 
                 placeholder="Copia la descripción aquí..." 
                 onChange={(e) => setForm({...form, descripcionRemax: e.target.value})}></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-muted-foreground">Firma Contrato</label>
                   <Input type="date" className="font-bold text-foreground" 
                     onChange={(e) => setForm({...form, fechaFirmaContrato: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-muted-foreground">Vencimiento</label>
                   <Input type="date" className="font-bold text-foreground" 
                     onChange={(e) => setForm({...form, fechaCaducidad: e.target.value})} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Foto Propiedad (URL)</label>
                  <Input placeholder="URL..." className="font-bold text-foreground" 
                    onChange={(e) => setForm({...form, imagenUrl: e.target.value})} />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Foto Agente (URL)</label>
                  <Input placeholder="URL..." className="font-bold text-foreground" 
                    onChange={(e) => setForm({...form, fotoAgenteUrl: e.target.value})} />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-muted-foreground">Agente ID / MLSID</label>
               <div className="grid grid-cols-2 gap-4">
                 <Input type="number" placeholder="ID Agente" className="font-bold" 
                   onChange={(e) => setForm({...form, agenteId: Number(e.target.value)})} />
                 <Input placeholder="MLSID" className="font-bold" 
                   onChange={(e) => setForm({...form, mlsid: e.target.value})} />
               </div>
            </div>

            <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg font-black rounded-2xl shadow-xl transition-all">
              <CheckCircle2 className="mr-2" /> GUARDAR CAPTACIÓN
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Menú inferior persistente solo para mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 flex justify-around text-muted-foreground">
          <Camera className="h-6 w-6" />
          <MapPin className="h-6 w-6 text-blue-600" />
          <Save className="h-6 w-6" />
      </div>
    </div>
  );
}
