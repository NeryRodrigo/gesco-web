"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ShieldCheck, Lock, Mail, User, ArrowRight, Loader2, 
  Eye, EyeOff, Building2, KeyRound, Info 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Usuario {
  id: number;
  nombre: string;
  rol: string;
  empresaId: number;
  requiereCambioPass: boolean;
  rubro: string;
}

interface Empresa {
  empresaId: number;
  razonSocial: string;
}

export default function AuthScreen({ onLoginSuccess }: { onLoginSuccess: (user: Usuario) => void }) {
  // --- ESTADOS LÓGICOS ---
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [tempUserData, setTempUserData] = useState<Usuario | null>(null);

  // Estados Google
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("rody.moran.py@gmail.com");
  const [googleNombre, setGoogleNombre] = useState("Rody Moran");
  const [googleLoading, setGoogleLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    empresaId: 6,
    rol: "AGENTE",
    modulosIds: []
  });

  // --- CARGA DE EMPRESAS (API) ---
  useEffect(() => {
    fetch("http://localhost:5034/api/Auth/empresas")
        .then(res => res.json())
        .then(data => {
            setEmpresas(data);
            if (data.length > 0 && !formData.empresaId) {
                setFormData(prev => ({ ...prev, empresaId: data[0].empresaId }));
            }
        })
        .catch(() => toast.error("Error al conectar con el servidor central"));
  }, []);

  // --- HANDLERS DE SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isResetting) {
        handleUpdatePassword();
        return;
    }

    const endpoint = isLogin ? "login" : "register";
    const url = `http://localhost:5034/api/Auth/${endpoint}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(isLogin ? 
                { email: formData.email, password: formData.password } : 
                formData
            ),
        });

        if (response.ok) {
            const data = await response.json();
            if (isLogin) {
                if (data.requiereCambioPass) {
                    toast.info("Primer Ingreso Detectado", { description: "Configura una contraseña nueva." });
                    setTempUserData(data);
                    setIsResetting(true);
                } else {
                    toast.success(`¡Bienvenido, ${data.nombre}!`);
                    onLoginSuccess(data);
                }
            } else {
                toast.success('Cuenta creada con éxito');
                setIsLogin(true);
            }
        } else {
            const errorData = await response.json();
            toast.error('Acceso Denegado', { description: errorData.mensaje });
        }
    } catch (error) {
        toast.error('Error de Conexión');
    } finally {
        setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!tempUserData) return;
    if (formData.newPassword !== formData.confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        setLoading(false);
        return;
    }

    try {
        const response = await fetch(`http://localhost:5034/api/Auth/update-password`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: tempUserData.id, nuevaPassword: formData.newPassword }),
        });

        if (response.ok) {
            toast.success("Seguridad Actualizada");
            onLoginSuccess({ ...tempUserData, requiereCambioPass: false });
        } else {
            toast.error("Error al actualizar");
        }
    } catch (error) { toast.error("Fallo de comunicación"); } finally { setLoading(false); }
  };

  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGoogleLoading(true);
    try {
      const response = await fetch("http://localhost:5034/api/Auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: googleEmail.trim(), nombre: googleNombre.trim(), googleId: "google-" + Date.now() })
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Bienvenido ${data.nombre}`);
        setShowGoogleModal(false);
        onLoginSuccess(data);
      } else { toast.error("Error Google Login"); }
    } catch (err) { toast.error("Error de servidor Google"); } finally { setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#010409] relative overflow-x-hidden overflow-y-auto p-4 md:p-6 font-sans selection:bg-blue-500/30">
      
      {/* RAYOS AZULES DE FONDO */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <radialGradient id="rayGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M-20,50 Q20,10 50,50 T120,50" fill="none" stroke="url(#rayGrad)" strokeWidth="0.2" className="animate-pulse" />
          <path d="M-20,30 Q30,-10 60,30 T120,30" fill="none" stroke="url(#rayGrad)" strokeWidth="0.1" />
          <path d="M-20,70 Q25,110 55,70 T120,70" fill="none" stroke="url(#rayGrad)" strokeWidth="0.15" />
        </svg>
      </div>

      {/* TARJETA RESPONSIVA */}
      <div className="relative z-10 w-full max-w-[440px] group animate-in fade-in zoom-in duration-700">
        <div className="absolute -inset-[1px] bg-blue-500/20 rounded-[2.6rem] md:rounded-[3rem] blur-xl opacity-60"></div>
        
        <Card className="relative w-full bg-[#050a14]/85 backdrop-blur-[40px] border-white/[0.08] p-6 md:p-10 shadow-2xl rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border">
          
          <div className="text-center mb-8 md:mb-12">
            <div className="flex flex-col items-center justify-center">
              <img src="/images/ISOTIPO.png" className="h-16 md:h-20 object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]" />
              <h1 className="text-white text-3xl sm:text-4xl md:text-[32px] font-light tracking-[0.4em] md:tracking-[0.55em] leading-none mt-4 md:mt-6 uppercase">VORDIA</h1>
            </div>
            <p className="text-blue-200/40 text-[8.5px] md:text-[9.5px] uppercase font-bold tracking-[0.25em] md:tracking-[0.35em] mt-5">Acceso Seguro al Ecosistema</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            
            {isResetting ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
                    <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Nueva Contraseña Obligatoria</p>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Contraseña Nueva</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <Input type="password" placeholder="Mínimo 8 caracteres" className="bg-[#0f172a]/80 border-white/5 text-white pl-12 h-13 rounded-xl" onChange={(e) => setFormData({...formData, newPassword: e.target.value})} required />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Confirmar</Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <Input type="password" placeholder="Repite contraseña" className="bg-[#0f172a]/80 border-white/5 text-white pl-12 h-13 rounded-xl" onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required />
                    </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1 flex items-center gap-2">Entorno de Trabajo <Info className="w-3 h-3 text-gray-600" /></Label>
                  <Select value={formData.empresaId.toString()} onValueChange={(v) => setFormData({...formData, empresaId: parseInt(v)})}>
                    <SelectTrigger className="w-full bg-[#0a1120]/60 border-white/[0.05] text-gray-400 h-13 rounded-xl focus:ring-1 focus:ring-blue-500/30 transition-all px-4 font-bold">
                        <div className="flex items-center gap-3"><Building2 className="w-4 h-4 text-gray-600 shrink-0" /><SelectValue placeholder="Seleccioná tu entorno" /></div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0c1421] border-white/10 text-white">
                        {empresas.map((emp) => (
                            <SelectItem key={emp.empresaId} value={emp.empresaId.toString()}>{emp.razonSocial}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isLogin && (
                    <div className="space-y-1.5 animate-in fade-in duration-300">
                        <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Nombre Completo</Label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-500" />
                            <Input placeholder="Tu nombre" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="bg-[#0a1120]/60 border-white/[0.05] text-white pl-12 h-13 rounded-xl" required />
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Correo Corporativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-500" />
                    <Input type="email" placeholder="nombre@empresa.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-[#0a1120]/60 border-white/[0.05] text-white pl-12 h-13 rounded-xl placeholder:text-gray-700" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-500" />
                    <Input type={showPass ? "text" : "password"} placeholder="Tu contraseña" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="bg-[#0a1120]/60 border-white/[0.05] text-white pl-12 h-13 rounded-xl placeholder:text-gray-700" required />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                      {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <Button disabled={loading} className="w-full h-13 md:h-14 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white rounded-xl font-bold text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(37,99,235,0.2)] mt-4 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{isResetting ? "Guardar y Entrar" : isLogin ? "Iniciar Sesión" : "Registrarme"} <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          {!isResetting && (
            <div className="mt-8 md:mt-10 space-y-6 md:space-y-8 text-center">
              <div className="relative flex items-center"><div className="flex-grow border-t border-white/[0.06]"></div><span className="flex-shrink mx-4 text-[9px] text-gray-600 uppercase font-bold tracking-[0.3em]">O continuá con</span><div className="flex-grow border-t border-white/[0.06]"></div></div>
              
              <Button type="button" variant="outline" onClick={() => setShowGoogleModal(true)} className="w-full h-12 md:h-13 bg-transparent hover:bg-white/[0.02] border-white/10 text-white rounded-xl font-bold text-[10px] md:text-[11px] tracking-[0.2em] gap-4 transition-all uppercase">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
                Continuar con Google
              </Button>

              <div className="space-y-5 pt-2">
                  {/*
                  <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">
                    {isLogin ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Accede aquí"}
                  </button>
                  */}
                  <div className="flex flex-col items-center gap-4 border-t border-white/5 pt-5 opacity-40">
                    <p className="text-gray-400 text-[10px] md:text-[11px] font-bold tracking-[0.1em] md:tracking-[0.2em] uppercase opacity-90">¿Tu empresa aún no está en Vordia? <button className="text-blue-500 ml-1" onClick={() => setIsLogin(!isLogin)}>Solicitar Acceso</button></p>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="text-blue-500 h-4 w-4" />
                      <span className="text-gray-300 text-[8px] md:text-[9px] uppercase font-bold tracking-[0.3em]">Acceso cifrado y datos protegidos</span>
                    </div>
                  </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* MODAL GOOGLE (ESTILO OSCURO) */}
      <Dialog open={showGoogleModal} onOpenChange={setShowGoogleModal}>
        <DialogContent className="max-w-md p-8 rounded-[2.5rem] bg-[#0c1421] border-white/10 text-white shadow-2xl z-[100] outline-none">
          <DialogHeader><DialogTitle className="text-lg font-black italic flex items-center gap-3"><Mail className="text-blue-500" /> Autenticación Google</DialogTitle></DialogHeader>
          <form onSubmit={handleGoogleSubmit} className="space-y-5 pt-4">
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Cuenta Gmail</Label><Input type="email" value={googleEmail} onChange={(e) => setGoogleEmail(e.target.value)} className="bg-secondary border-white/10 rounded-xl" required /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Nombre</Label><Input type="text" value={googleNombre} onChange={(e) => setGoogleNombre(e.target.value)} className="bg-secondary border-white/10 rounded-xl" required /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowGoogleModal(false)} className="flex-1 rounded-xl font-bold">Cancelar</Button>
              <Button type="submit" disabled={googleLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black italic">{googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acceder"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}