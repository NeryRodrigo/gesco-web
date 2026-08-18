"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart, TrendingUp, Activity } from "lucide-react";

export function BIPage({ empresaId }: { empresaId: number }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic text-foreground tracking-tight">Inteligencia de Negocios (BI)</h2>
          <p className="text-sm text-muted-foreground font-medium">Análisis predictivo y reportes de rentabilidad.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-2xl overflow-hidden relative">
          <CardContent className="p-6">
            <div className="bg-slate-800 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-1">Margen Neto Promedio</p>
            <h3 className="text-3xl font-black">24.5%</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden relative">
          <CardContent className="p-6">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-1">Crecimiento YoY</p>
            <h3 className="text-3xl font-black text-foreground">+12%</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-card rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <h4 className="font-black text-xl text-foreground tracking-tight">Crecimiento de Ventas vs Egresos</h4>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1 mb-8">Análisis Comparativo (Últimos 6 meses)</p>
          </div>

          <div className="flex items-end gap-4 h-[250px] w-full px-2 border-b border-border pb-2">
            {[40, 65, 45, 80, 55, 95].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                <div className="w-full bg-muted rounded-t-lg flex items-end justify-center relative overflow-hidden group-hover:bg-muted transition-colors h-[200px]">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg shadow-inner absolute bottom-0 transition-all duration-1000 ease-in-out"
                    style={{ height: `${val}%` }}
                  />
                  <div
                    className="w-1/2 bg-gradient-to-t from-red-400 to-red-300 rounded-t-lg shadow-inner absolute bottom-0 left-0 transition-all duration-1000 ease-in-out"
                    style={{ height: `${val * 0.6}%` }}
                  />
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-black text-emerald-600 transition-opacity bg-card px-2 rounded-full shadow-sm">
                    {val}M
                  </span>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Mes {idx + 1}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-6 mt-6 justify-center">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-muted-foreground">Ingresos</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-xs font-bold text-muted-foreground">Egresos</span></div>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-slate-900 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden text-center">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

          <Activity className="w-20 h-20 text-primary mb-6 animate-pulse" />
          <h4 className="font-black text-2xl text-white tracking-tight">Proyección de Demanda (IA)</h4>
          <p className="text-muted-foreground text-sm mt-3 max-w-sm leading-relaxed">
            Nuestro modelo de **Machine Learning** sugiere que las ventas de productos en categoría "Bebidas" aumentarán un <span className="text-emerald-400 font-bold">18%</span> en los próximos 15 días.
          </p>
          <Button className="mt-8 bg-card text-foreground hover:bg-muted rounded-xl font-bold h-12 px-6">
            Ajustar Stock Recomendado
          </Button>
        </Card>
      </div>
    </div>
  );
}
