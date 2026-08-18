"use client";


import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Bed, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  CreditCard,
  LogOut,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// --- Tipos Simulados (Hasta que conectemos la API) ---
interface Habitacion {
  id: number;
  nombre: string;
  tipo: string;
  estado: "Disponible" | "Ocupada" | "Limpieza" | "Mantenimiento";
}

interface Reserva {
  id: number;
  habitacionId: number;
  huesped: string;
  checkIn: Date;
  checkOut: Date;
  estado: "Confirmada" | "CheckIn" | "Pendiente";
}

const HABITACIONES: Habitacion[] = [
  { id: 1, nombre: "101 - Suite King", tipo: "Privada", estado: "Ocupada" },
  { id: 2, nombre: "102 - Doble Twin", tipo: "Privada", estado: "Disponible" },
  { id: 3, nombre: "201 - Dorm. Mixto (8)", tipo: "Compartida", estado: "Ocupada" },
  { id: 4, nombre: "202 - Dorm. Femenino (6)", tipo: "Compartida", estado: "Limpieza" },
  { id: 5, nombre: "301 - Suite Balcón", tipo: "Privada", estado: "Mantenimiento" },
];

const RESERVAS: Reserva[] = [
  { id: 1, habitacionId: 1, huesped: "Juan Perez", checkIn: new Date(2026, 3, 28), checkOut: new Date(2026, 4, 2), estado: "CheckIn" },
  { id: 2, habitacionId: 3, huesped: "Maria Garcia", checkIn: new Date(2026, 3, 30), checkOut: new Date(2026, 4, 5), estado: "CheckIn" },
  { id: 3, habitacionId: 2, huesped: "Carlos Lopez", checkIn: new Date(2026, 4, 3), checkOut: new Date(2026, 4, 7), estado: "Confirmada" },
];

export default function HostelDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // Mayo 1, 2026
  const [daysToShow, setDaysToShow] = useState(14);
  const [timelineDays, setTimelineDays] = useState<Date[]>([]);

  useEffect(() => {
    const days = [];
    for (let i = -2; i < daysToShow - 2; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    setTimelineDays(days);
  }, [currentDate, daysToShow]);

  const getDayName = (date: Date) => {
    return date.toLocaleDateString("es-PY", { weekday: "short" }).toUpperCase();
  };

  const isToday = (date: Date) => {
    const today = new Date(2026, 4, 1);
    return date.toDateString() === today.toDateString();
  };

  const getReservationForRoomAndDay = (roomId: number, date: Date) => {
    return RESERVAS.find(r => 
      r.habitacionId === roomId && 
      date >= new Date(r.checkIn.setHours(0,0,0,0)) && 
      date < new Date(r.checkOut.setHours(0,0,0,0))
    );
  };

  const handleCheckout = (reserva: Reserva) => {
    toast.success(`Iniciando Checkout para ${reserva.huesped}`, {
      description: "Calculando balance de cuenta y estado de habitación...",
      action: {
        label: "Ir a Cobro",
        onClick: () => console.log("Navegar a cobro")
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-foreground font-sans p-4 md:p-8">
      {/* HEADER */}
      <div className="max-w-[1600px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-3xl shadow-sm border border-border">
          <div>
            <h1 className="text-3xl font-black tracking-tighter italic uppercase text-foreground flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-200">
                <Calendar className="text-white w-6 h-6" />
              </div>
              OIMA <span className="text-orange-500">HOSTEL</span> PMS
            </h1>
            <p className="text-muted-foreground font-medium mt-1">Gestión Dinámica de Reservas y Disponibilidad</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-6 mr-8 px-6 border-r border-border">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ocupación</p>
                <p className="text-xl font-black text-foreground italic">85%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Check-ins Hoy</p>
                <p className="text-xl font-black text-blue-600 italic">12</p>
              </div>
            </div>
            <Button className="bg-slate-900 text-white font-black italic rounded-xl px-6 hover:scale-105 transition-transform">
              <Plus className="mr-2 w-4 h-4" /> NUEVA RESERVA
            </Button>
          </div>
        </div>

        {/* TAPE CHART / TIMELINE */}
        <div className="bg-card rounded-3xl shadow-xl shadow-slate-200/50 border border-border overflow-hidden flex flex-col">
          {/* Timeline Toolbar */}
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-muted/30">
            <div className="flex items-center gap-4">
              <h2 className="font-black text-lg text-foreground uppercase italic">Mapa de Ocupación</h2>
              <div className="flex items-center bg-card border border-border rounded-lg p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                }}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="px-4 text-sm font-bold text-muted-foreground">
                  {currentDate.toLocaleDateString("es-PY", { month: "long", year: "numeric" }).toUpperCase()}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                }}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase text-[9px] px-2 py-1">Check-in</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase text-[9px] px-2 py-1">Confirmada</Badge>
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-bold uppercase text-[9px] px-2 py-1">Limpieza</Badge>
            </div>
          </div>

          {/* Grid Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Timeline Header (Days) */}
              <div className="flex border-b border-border">
                <div className="w-[280px] bg-muted/50 p-4 font-black text-[10px] uppercase text-muted-foreground border-r border-border sticky left-0 z-20 backdrop-blur-md">
                  Habitación / Tipo
                </div>
                {timelineDays.map((date, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 min-w-[80px] py-3 text-center border-r border-slate-50 transition-colors ${isToday(date) ? 'bg-orange-50/50' : ''}`}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground">{getDayName(date)}</p>
                    <p className={`text-lg font-black ${isToday(date) ? 'text-orange-600' : 'text-foreground'}`}>{date.getDate()}</p>
                    {isToday(date) && <div className="h-1 w-1 bg-orange-600 rounded-full mx-auto mt-1 animate-pulse" />}
                  </div>
                ))}
              </div>

              {/* Grid Rows (Rooms) */}
              <div className="divide-y divide-slate-50">
                {HABITACIONES.map((habitacion) => (
                  <div key={habitacion.id} className="flex group hover:bg-muted/30 transition-colors">
                    {/* Room Info Sticky Column */}
                    <div className="w-[280px] p-4 border-r border-border sticky left-0 z-10 bg-card group-hover:bg-muted/80 transition-colors flex items-center justify-between">
                      <div>
                        <p className="font-black text-foreground text-sm italic uppercase tracking-tighter">{habitacion.nombre}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{habitacion.tipo}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {habitacion.estado === "Disponible" && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" title="Disponible" />}
                        {habitacion.estado === "Limpieza" && <span title="Limpieza en curso"><Clock className="w-4 h-4 text-muted-foreground" /></span>}
                        {habitacion.estado === "Mantenimiento" && <span title="Mantenimiento"><AlertCircle className="w-4 h-4 text-red-300" /></span>}
                      </div>
                    </div>

                    {/* Timeline Grid Cells */}
                    {timelineDays.map((date, i) => {
                      const reserva = getReservationForRoomAndDay(habitacion.id, date);
                      const isCheckInDay = reserva && date.toDateString() === reserva.checkIn.toDateString();
                      
                      return (
                        <div key={i} className={`flex-1 min-w-[80px] h-20 border-r border-slate-50 relative ${isToday(date) ? 'bg-orange-50/20' : ''}`}>
                          {reserva && (
                            <div 
                              className={`absolute inset-y-2 left-0 right-[-1px] z-10 p-2 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex flex-col justify-center overflow-hidden
                                ${reserva.estado === 'CheckIn' 
                                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-200/50' 
                                  : 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-200/50'}`}
                              onClick={() => {
                                if (reserva.estado === "CheckIn" && isToday(new Date(reserva.checkOut))) {
                                  handleCheckout(reserva);
                                } else {
                                  toast.info(`Reserva de ${reserva.huesped}`);
                                }
                              }}
                            >
                              {isCheckInDay && (
                                <>
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <User className="w-3 h-3 opacity-80" />
                                    <p className="text-[10px] font-black uppercase truncate tracking-tighter">
                                      {reserva.huesped}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {reserva.estado === "CheckIn" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                    <p className="text-[8px] font-bold opacity-90 uppercase">
                                      {reserva.estado === "CheckIn" ? "Alojado" : "Esperando"}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS / STATUS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
            <div className="bg-emerald-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <Bed className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Habitaciones Libres</p>
              <p className="text-2xl font-black text-foreground italic">24 <span className="text-xs text-muted-foreground font-bold not-italic">/ 45</span></p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
            <div className="bg-orange-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <LogOut className="text-orange-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Salidas Pendientes</p>
              <p className="text-2xl font-black text-foreground italic">08</p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto text-orange-600 font-black text-[10px] uppercase tracking-tighter">Ver Todas</Button>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
            <div className="bg-blue-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <CreditCard className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ingresos Proyectados</p>
              <p className="text-2xl font-black text-foreground italic">Gs. 4.250.000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
