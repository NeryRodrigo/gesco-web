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
import { API_BASE, setAuthToken, installAuthFetch } from "@/lib/api";
import { empresaPorSlug, normalizarEmpresa, slugEmpresa, type EmpresaLogin } from "@/lib/vordiaEntornos";

interface Usuario {
  id: number;
  nombre: string;
  rol: string;
  empresaId: number;
  requiereCambioPass: boolean;
  rubro: string;
}

function slugDesdeUrl() {
  if (typeof window === "undefined") return "";
  const q = new URLSearchParams(window.location.search).get("empresa");
  if (q) return slugEmpresa(q);
  const seg = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
  return seg ? slugEmpresa(seg) : "";
}

export default function AuthScreen({ onLoginSuccess }: { onLoginSuccess: (user: Usuario) => void }) {
  // --- ESTADOS ---
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [empresas, setEmpresas] = useState<EmpresaLogin[]>([]);
  const [tempUserData, setTempUserData] = useState<Usuario | null>(null);

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("rody.moran.py@gmail.com");
  const [googleNombre, setGoogleNombre] = useState("Rody Moran");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    empresaId: 0,
    rol: "AGENTE",
    modulosIds: []
  });

  const API_URL = `${API_BASE}`;

  useEffect(() => {
    installAuthFetch();
  }, []);

  // --- CARGA DE EMPRESAS ---
  useEffect(() => {
    fetch(`${API_URL}/api/Auth/empresas`)
        .then(res => res.json())
        .then(data => {
            const lista = (Array.isArray(data) ? data : [])
              .map((raw) => normalizarEmpresa(raw as Record<string, unknown>))
              .filter((e): e is EmpresaLogin => e != null);
            setEmpresas(lista);
            const porUrl = empresaPorSlug(lista, slugDesdeUrl());
            const elegida = porUrl ?? lista[0];
            if (elegida) setFormData(prev => ({ ...prev, empresaId: elegida.empresaId }));
        })
        .catch(() => toast.error("Error al conectar con el servidor"));
  }, []);

  const persistToken = (data: any) => {
    if (data?.token) setAuthToken(data.token);
  };

  // --- LÓGICA DE LOGIN / REGISTRO ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    if (isResetting) {
        handleUpdatePassword();
        return;
    }

    if (!formData.empresaId) {
        setLoginError("Seleccioná un entorno de trabajo");
        setLoading(false);
        return;
    }

    const endpoint = isLogin ? "login" : "register";
    const url = `${API_URL}/api/Auth/${endpoint}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(isLogin ? 
                { email: formData.email.trim(), password: formData.password, empresaId: formData.empresaId } : 
                formData
            ),
        });

        if (response.ok) {
            const data = await response.json();
            if (isLogin) {
                persistToken(data);
                if (data.requiereCambioPass) {
                    toast.info("Configurá tu nueva contraseña");
                    setTempUserData(data);
                    setIsResetting(true);
                } else {
                    toast.success(`¡Bienvenido, ${data.nombre}!`);
                    onLoginSuccess(data);
                }
            } else {
                toast.success('Cuenta creada');
                setIsLogin(true);
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData.mensaje || "Usuario y/o entorno de trabajo no configurado, intente con otro usuario";
            setLoginError(msg);
            toast.error(msg);
        }
    } catch (error) { toast.error('Error de Conexión'); } finally { setLoading(false); }
  };

  // --- LÓGICA CAMBIO PASSWORD (PRIMER INGRESO) ---
  const handleUpdatePassword = async () => {
    if (!tempUserData) return;
    if (formData.newPassword !== formData.confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        setLoading(false);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/Auth/update-password`, {
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

  // --- LÓGICA GOOGLE ---
  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGoogleLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/Auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: googleEmail.trim(), nombre: googleNombre.trim(), googleId: "google-" + Date.now() })
      });
      if (response.ok) {
        const data = await response.json();
        persistToken(data);
        toast.success(`Bienvenido ${data.nombre}`);
        setShowGoogleModal(false);
        onLoginSuccess(data);
      } else { toast.error("Error Google Login"); }
    } catch (err) { toast.error("Error de servidor Google"); } finally { setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#000205] relative overflow-hidden font-sans">
      
      {/* RAYOS ELÉCTRICOS DE FONDO */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Mantenemos solo el resplandor central para que la tarjeta siga resaltando */}
		<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_#002B7F_0%,_transparent_65%)] opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-[560px] px-6 py-10">
        <div className="absolute inset-0 bg-blue-600/20 blur-[130px] rounded-full scale-95" />

        <Card className="relative w-full bg-[#050B18]/85 backdrop-blur-[60px] border-white/10 p-10 md:p-16 shadow-[0_0_100px_-20px_rgba(0,82,255,0.8)] rounded-[4rem] border overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

          {/* SECCIÓN LOGO IDÉNTICA */}
          <div className="text-center mb-12">
            <div className="flex flex-col items-center justify-center">
              <img src="/images/VORDIA.png" className="h-44 md:h-52 object-contain drop-shadow-[0_0_45px_rgba(59,130,246,0.9)]" />
              <p className="text-[#4DA6FF] text-[10px] md:text-[11px] uppercase font-bold tracking-[0.35em] mt-10">Acceso Seguro al <span className="text-[#4DA6FF]">Ecosistema</span></p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            
            {isResetting ? (
              /* VISTA RESET PASSWORD */
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
                    <p className="text-blue-400 text-[11px] font-bold uppercase tracking-widest">Nueva Contraseña Obligatoria</p>
                </div>
                <div className="space-y-2">
                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Contraseña Nueva</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <Input type="password" placeholder="Mínimo 8 caracteres" className="bg-[#0f172a]/60 border-white/10 text-white pl-14 h-14 rounded-2xl" onChange={(e) => setFormData({...formData, newPassword: e.target.value})} required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Confirmar</Label>
                    <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <Input type="password" placeholder="Repetí contraseña" className="bg-[#0f172a]/60 border-white/10 text-white pl-14 h-14 rounded-2xl" onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required />
                    </div>
                </div>
              </div>
            ) : (
              /* VISTA LOGIN / REGISTRO */
              <>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1 flex items-center gap-2">Entorno de Trabajo <Info className="w-3 h-3 opacity-30" /></Label>
                  <Select value={formData.empresaId ? String(formData.empresaId) : undefined} onValueChange={(v) => setFormData({...formData, empresaId: parseInt(v)})}>
                    <SelectTrigger className="w-full bg-[#0a1120]/60 border-white/[0.1] text-white h-14 rounded-2xl px-5 font-bold">
                        <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-gray-500" /><SelectValue placeholder="Seleccioná tu entorno" /></div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0c1421] border-white/10 text-white">
                        {empresas.map((emp) => (
                            <SelectItem key={emp.empresaId} value={emp.empresaId.toString()}>{emp.razonSocial}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isLogin && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                        <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Nombre Completo</Label>
                        <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <Input placeholder="Tu nombre" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="bg-[#0a1120]/60 border-white/[0.1] text-white pl-14 h-14 rounded-2xl" required />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                  <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Correo Corporativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input type="email" placeholder="nombre@empresa.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-[#0a1120]/60 border-white/[0.1] text-white pl-14 h-14 rounded-2xl placeholder:text-gray-700" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input type={showPass ? "text" : "password"} placeholder="Tu contraseña" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="bg-[#0a1120]/60 border-white/[0.1] text-white pl-14 h-14 rounded-2xl placeholder:text-gray-700" required />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {loginError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center">
                <p className="text-[12px] font-semibold text-red-300 leading-relaxed">{loginError}</p>
              </div>
            )}

            <Button disabled={loading} className="w-full h-15 bg-gradient-to-r from-[#0052FF] to-[#003BCC] hover:opacity-90 text-white rounded-2xl font-bold text-sm tracking-[0.2em] shadow-[0_10px_30px_rgba(0,82,255,0.3)] mt-4 flex items-center justify-center gap-3 transition-all uppercase">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{isResetting ? "Guardar y Entrar" : isLogin ? "Iniciar Sesión" : "Registrarme"} <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          {!isResetting && (
            <div className="mt-10 space-y-8 text-center">
              <div className="relative flex items-center"><div className="flex-grow border-t border-white/5"></div><span className="flex-shrink mx-6 text-[9px] text-gray-600 uppercase font-bold tracking-[0.3em]">O continuá con</span><div className="flex-grow border-t border-white/5"></div></div>
              
              <Button type="button" variant="outline" onClick={() => setShowGoogleModal(true)} className="w-full h-14 bg-transparent hover:bg-white/[0.02] border-white/10 text-white rounded-2xl font-bold text-[11px] tracking-[0.2em] gap-5 uppercase">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Continuar con Google
              </Button>

              <div className="flex flex-col items-center gap-6 pt-4">
                  <p className="text-gray-500 text-[11px] font-bold tracking-[0.1em] uppercase">
                    ¿Tu empresa aún no está en Vordia? <button className="text-[#0052FF] font-black ml-1" onClick={() => setIsLogin(!isLogin)}>{isLogin ? "SOLICITAR ACCESO" : "VOLVER AL LOGIN"}</button>
                  </p>
                  <div className="flex items-center gap-3 opacity-70 border-t border-white/5 pt-8 w-full justify-center">
                    <ShieldCheck className="text-[#0052FF]" size={22} />
                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.25em]">Acceso cifrado y datos protegidos</span>
                  </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* MODAL GOOGLE */}
      <Dialog open={showGoogleModal} onOpenChange={setShowGoogleModal}>
        <DialogContent className="max-w-md p-8 rounded-[2.5rem] bg-[#0c1421] border-white/10 text-white shadow-2xl z-[100]">
          <DialogHeader><DialogTitle className="text-lg font-black italic flex items-center gap-3"><Mail className="text-blue-500" /> Autenticación Google</DialogTitle></DialogHeader>
          <form onSubmit={handleGoogleSubmit} className="space-y-5 pt-4">
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</Label><Input type="email" value={googleEmail} onChange={(e) => setGoogleEmail(e.target.value)} className="bg-secondary border-white/10 h-12 rounded-xl" required /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre</Label><Input type="text" value={googleNombre} onChange={(e) => setGoogleNombre(e.target.value)} className="bg-secondary border-white/10 h-12 rounded-xl" required /></div>
            <Button type="submit" disabled={googleLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-black uppercase">{googleLoading ? "..." : "Acceder"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
