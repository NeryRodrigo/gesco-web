"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Copy, ExternalLink, Loader2, MessageCircle, Save } from "lucide-react";
import { btqApi, CIUDADES, linkWhatsapp, origenWeb, type BtqPerfil } from "@/lib/boutiqueApi";
import { BOTON_PRIMARIO, Campo, CAMPO, DEGRADE, SERIF, Tarjeta, TEXTO_SUAVE } from "@/components/boutique/BoutiqueUI";
import type { ContextoBoutique } from "./BoutiqueApp";

const ESTILOS = ["Fiesta y gala", "Casual y urbano", "Novias y 15 años", "Talles grandes", "Diseño de autora", "Accesorios", "Lencería", "Deportiva"];

export function VidrieraView({ ctx }: { ctx: ContextoBoutique }) {
  const p = ctx.perfil;
  const [f, setF] = useState({
    nombreComercial: p?.nombreComercial ?? "", slug: p?.slug ?? "", descripcion: p?.descripcion ?? "", ciudad: p?.ciudad ?? "Asunción",
    barrio: p?.barrio ?? "", direccion: p?.direccion ?? "", whatsapp: p?.whatsapp ?? "", instagram: p?.instagram ?? "", horario: p?.horario ?? "",
    estilo: p?.estilo ?? "Fiesta y gala", publicada: p?.publicada ?? true,
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const link = p?.slug ? `${origenWeb()}/closet/${p.slug}` : "";

  const guardar = async () => {
    setGuardando(true);
    try {
      await btqApi<BtqPerfil>(`/api/Boutique/perfil?empresaId=${ctx.empresaId}`, { method: "PUT", body: JSON.stringify(f) });
      toast.success("Vidriera guardada");
      ctx.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className={`${SERIF} text-[28px] font-semibold`}>Mi vidriera</h1>
        <p className={`text-[13px] ${TEXTO_SUAVE}`}>Tu página dentro de VORDIA CLOSET, el marketplace de boutiques de Asunción y Gran Asunción. Se arma sola con tus prendas y tu stock real.</p>
      </div>

      {link && (
        <div className={`${DEGRADE} rounded-[28px] p-5 text-white shadow-[0_20px_50px_-25px_rgba(214,51,132,0.8)]`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/80">Tu link para Instagram y WhatsApp</p>
          <p className={`${SERIF} mt-1 break-all text-[20px] font-semibold`}>{link.replace(/^https?:\/\//, "")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { navigator.clipboard?.writeText(link); toast.success("Link copiado: pegalo en la bio de Instagram"); }} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[#B0135E]"><Copy size={14} /> Copiar</button>
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/60 px-3.5 py-2 text-[13px] font-semibold"><ExternalLink size={14} /> Ver como clienta</a>
            <a href={linkWhatsapp("", `Mirá lo nuevo de ${p?.nombreComercial} 💜 ${link}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/60 px-3.5 py-2 text-[13px] font-semibold"><MessageCircle size={14} /> Compartir en estados</a>
          </div>
        </div>
      )}

      <Tarjeta>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nombre de la boutique"><input className={CAMPO} value={f.nombreComercial} onChange={(e) => set("nombreComercial", e.target.value)} /></Campo>
          <Campo label="Dirección de tu vidriera" ayuda={`vordia.com.py/closet/${f.slug || "tu-boutique"}`}>
            <input className={CAMPO} value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="se arma con el nombre" />
          </Campo>
          <Campo label="Ciudad">
            <select className={CAMPO} value={f.ciudad} onChange={(e) => set("ciudad", e.target.value)}>{CIUDADES.map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
          <Campo label="Barrio"><input className={CAMPO} value={f.barrio} onChange={(e) => set("barrio", e.target.value)} placeholder="Villa Morra" /></Campo>
          <Campo label="Dirección" ayuda="Para las pruebas en la boutique"><input className={CAMPO} value={f.direccion} onChange={(e) => set("direccion", e.target.value)} /></Campo>
          <Campo label="Horario"><input className={CAMPO} value={f.horario} onChange={(e) => set("horario", e.target.value)} placeholder="Lun a Sáb 9:00 a 19:00" /></Campo>
          <Campo label="WhatsApp de la boutique"><input className={CAMPO} inputMode="tel" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Campo>
          <Campo label="Instagram"><input className={CAMPO} value={f.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@tuboutique" /></Campo>
          <Campo label="Estilo">
            <select className={CAMPO} value={f.estilo} onChange={(e) => set("estilo", e.target.value)}>{ESTILOS.map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
          <label className="flex items-center gap-2 self-end rounded-2xl border border-[#E6D6F2] bg-white px-3.5 py-2.5 text-[13px]">
            <input type="checkbox" checked={f.publicada} onChange={(e) => set("publicada", e.target.checked)} className="h-4 w-4 accent-[#C77DD8]" />
            Mostrar mi boutique en VORDIA CLOSET
          </label>
        </div>
        <div className="mt-3">
          <Campo label="Cómo te presentás" ayuda="Dos líneas: qué vendés y por qué elegirte">
            <textarea className={`${CAMPO} min-h-[80px]`} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
          </Campo>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className={`flex items-center gap-1.5 text-[12.5px] ${TEXTO_SUAVE}`}>
            <BadgeCheck size={15} className={p?.verificada ? "text-[#6A4BC4]" : "text-[#C9B8DA]"} />
            {p?.verificada ? "Boutique verificada por VORDIA" : "La insignia de verificada la da VORDIA tras confirmar tu local y RUC"}
          </p>
          <button type="button" onClick={guardar} disabled={guardando || !f.nombreComercial.trim()} className={BOTON_PRIMARIO}>
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar vidriera
          </button>
        </div>
      </Tarjeta>
      {!p && <p className={`text-[12.5px] ${TEXTO_SUAVE}`}>Guardá estos datos para que tu boutique aparezca en el marketplace.</p>}
    </div>
  );
}
