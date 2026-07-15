"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, User, ArrowRight, Loader2, Eye, EyeOff, Building2, KeyRound, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';
import { useEffect } from "react";
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
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false); // Nuevo estado para cambio forzado
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  
  // Guardamos los datos del usuario temporalmente mientras cambia su clave
  const [tempUserData, setTempUserData] = useState<Usuario | null>(null);

  // Estados para Login con Google
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("rody.moran.py@gmail.com");
  const [googleNombre, setGoogleNombre] = useState("Rody Moran");
  const [googleLoading, setGoogleLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    newPassword: "", // Para el cambio forzado
    confirmPassword: "", // Para validación
    empresaId: 6,
    rol: "AGENTE",
    modulosIds: []
  });

  // Cargar empresas al inicio
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Si está en modo "Reset", llamamos al endpoint de actualización
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
                // VERIFICACIÓN CLAVE: ¿Es su primer ingreso?
                if (data.requiereCambioPass) {
                    toast.info("Primer Ingreso Detectado", {
                        description: "Por seguridad, debes configurar una contraseña nueva."
                    });
                    setTempUserData(data);
                    setIsResetting(true); // Activamos el formulario de cambio
                } else {
                    toast.success(`¡Bienvenido a GESCO, ${data.nombre}!`);
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
    if (!tempUserData) {
        toast.error("Error de Sesión", { description: "No se encontraron datos temporales del usuario." });
        return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
        toast.error("Error de validación", { description: "Las contraseñas no coinciden." });
        setLoading(false);
        return;
    }

    try {
        const url = `http://localhost:5034/api/Auth/update-password`;
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: tempUserData.id,
                nuevaPassword: formData.newPassword
            }),
        });

        if (response.ok) {
            toast.success("Seguridad Actualizada", { description: "Contraseña cambiada con éxito." });
            // Ahora sí, entramos al sistema
            onLoginSuccess({ ...tempUserData, requiereCambioPass: false });
        } else {
            toast.error("Error al actualizar");
        }
    } catch (error) {
        toast.error("Fallo de comunicación");
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleEmail || !googleEmail.includes("@")) {
      toast.error("Por favor ingresa un correo de Google válido (@gmail.com)");
      return;
    }

    setGoogleLoading(true);
    try {
      const response = await fetch("http://localhost:5034/api/Auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail.trim(),
          nombre: googleNombre.trim() || googleEmail.split('@')[0],
          googleId: "google-oauth-" + Date.now()
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`¡Autenticación con Google exitosa, bienvenido ${data.nombre}!`);
        setShowGoogleModal(false);
        onLoginSuccess(data);
      } else {
        const err = await response.json();
        toast.error(err.mensaje || "Error al iniciar sesión con Google");
      }
    } catch (err) {
      console.error("Error google login:", err);
      toast.error("Fallo al conectar con el servidor para autenticación Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />

      <Card className="w-full max-w-[450px] bg-card border-border p-10 shadow-2xl shadow-primary/5 rounded-[2.5rem] z-10 border animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black italic text-foreground tracking-tighter transition-all">
            Gesco<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-[0.3em] mt-2 italic">
            {isResetting ? "Actualización Obligatoria de Seguridad" : isLogin ? "Acceso Seguro al Ecosistema" : "Registro de Nuevo Usuario"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* VISTA DE CAMBIO DE CONTRASEÑA (NUEVA) */}
          {isResetting ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl mb-4">
                    <p className="text-primary text-[10px] font-bold uppercase text-center">
                        Estás usando una clave temporal. Crea una definitiva.
                    </p>
                </div>
                
                <div className="space-y-2">
                    <Label className="text-foreground text-[10px] uppercase font-bold ml-1">Nueva Contraseña</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            className="bg-secondary border-border text-foreground pl-12 h-14 rounded-2xl"
                            onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-foreground text-[10px] uppercase font-bold ml-1">Confirmar Contraseña</Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="password"
                            placeholder="Repite tu contraseña"
                            className="bg-secondary border-border text-foreground pl-12 h-14 rounded-2xl"
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            required
                        />
                    </div>
                </div>
            </div>
          ) : (
            <>
              {/* SELECTOR DE EMPRESA (NUEVO) */}
              <div className="space-y-2 animate-in fade-in duration-700">
                <Label className="text-foreground text-[10px] uppercase font-bold ml-1 flex items-center gap-2">
                   Entorno de Trabajo <Building2 className="w-3 h-3 text-primary" />
                </Label>
                <Select 
                    value={formData.empresaId.toString()} 
                    onValueChange={(v) => setFormData({...formData, empresaId: parseInt(v)})}
                >
                    <SelectTrigger className="w-full bg-secondary border-border text-foreground h-14 rounded-2xl focus:ring-primary transition-all font-bold">
                        <SelectValue placeholder="Seleccione Empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground rounded-xl">
                        {empresas.map((emp) => (
                            <SelectItem key={emp.empresaId} value={emp.empresaId.toString()} className="hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground">
                                {emp.razonSocial}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              {/* VISTA NORMAL DE LOGIN / REGISTRO */}
              {!isLogin && (
                <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                    <Label className="text-foreground text-[10px] uppercase font-bold ml-1">Nombre Completo</Label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Juan Pérez" 
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                            className="bg-secondary border-border text-foreground pl-12 h-14 rounded-2xl"
                            required
                        />
                    </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-foreground text-[10px] uppercase font-bold ml-1">Correo Corporativo</Label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="bg-secondary border-border text-foreground pl-12 h-14 rounded-2xl focus:border-primary transition-all"
                        required
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-[10px] uppercase font-bold ml-1">Contraseña {isLogin && "Temporal"}</Label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type={showPass ? "text" : "password"} 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="bg-secondary border-border text-foreground pl-12 h-14 rounded-2xl focus:border-primary"
                        required
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
              </div>
            </>
          )}

          <Button 
            disabled={loading}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black italic text-base shadow-xl shadow-primary/20 transition-all active:scale-95 mt-4"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <>{isResetting ? "GUARDAR Y ENTRAR" : isLogin ? "INICIAR SESIÓN" : "CREAR CUENTA AHORA"} <ArrowRight className="ml-2 h-5 w-5" /></>
            )}
          </Button>
        </form>

        {!isResetting && (
          <div className="mt-5 pt-2">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase font-black tracking-widest">O continúa con</span>
              <div className="flex-grow border-t border-border"></div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGoogleModal(true)}
              className="w-full h-13 mt-3 bg-secondary/50 hover:bg-secondary border-border text-foreground rounded-2xl font-black italic text-sm transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>CUENTA DE GOOGLE (GMAIL)</span>
            </Button>
          </div>
        )}

        {!isResetting && (
            <div className="mt-6 text-center border-t border-border pt-5">
                <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-muted-foreground text-xs font-bold hover:text-foreground transition-colors uppercase tracking-[0.2em]"
                >
                {isLogin ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Accede aquí"}
                </button>
            </div>
        )}
      </Card>

      <footer className="absolute bottom-8 flex items-center gap-3 opacity-20 select-none">
        <ShieldCheck className="text-foreground h-4 w-4" />
        <span className="text-foreground text-[8px] uppercase font-bold tracking-[0.5em]">
          Gesco Biometric & Encryption Protection
        </span>
      </footer>

      {/* MODAL DE INICIO DE SESIÓN CON GOOGLE */}
      <Dialog open={showGoogleModal} onOpenChange={setShowGoogleModal}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-card border-border text-foreground shadow-2xl z-[100]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black italic flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Autenticación de Google (OAuth)</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGoogleSubmit} className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground font-medium">
              Inicia sesión de forma instantánea sin contraseña. El sistema vinculará o creará tu perfil con tu cuenta de Gmail.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider">
                Cuenta de Gmail
              </Label>
              <Input
                type="email"
                placeholder="ejemplo@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full bg-secondary border-border rounded-xl p-3 font-semibold text-sm focus:ring-2 ring-primary outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider">
                Nombre y Apellido
              </Label>
              <Input
                type="text"
                placeholder="Tu Nombre"
                value={googleNombre}
                onChange={(e) => setGoogleNombre(e.target.value)}
                className="w-full bg-secondary border-border rounded-xl p-3 font-semibold text-sm focus:ring-2 ring-primary outline-none"
                required
              />
            </div>
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGoogleModal(false)}
                disabled={googleLoading}
                className="flex-1 rounded-xl font-bold border-border"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={googleLoading}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black italic rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acceder con Google"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
