"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Cake, Loader2, MessageCircle, Plus, Search, Sparkles } from "lucide-react";
import { btqApi, isoDia, linkWhatsapp, TALLES_COMUNES, type BtqClienta } from "@/lib/boutiqueApi";
import { BOTON, BOTON_PRIMARIO, Campo, CAMPO, Chip, Modal, SERIF, Tarjeta, TEXTO_SUAVE, Vacio } from "@/components/boutique/BoutiqueUI";
import type { ContextoBoutique } from "./BoutiqueApp";

export function ClientasView({ ctx }: { ctx: ContextoBoutique }) {
  const [clientas, setClientas] = useState<BtqClienta[] | null>(null);
  const [buscar, setBuscar] = useState("");
  const [talle, setTalle] = useState("");
  const [editando, setEditando] = useState<BtqClienta | "nueva" | null>(null);

  useEffect(() => {
    let vivo = true;
    btqApi<BtqClienta[]>(`/api/Boutique/clientas?empresaId=${ctx.empresaId}`)
      .then((c) => vivo && setClientas(c))
      .catch((e) => vivo && toast.error(e instanceof Error ? e.message : "No se pudieron cargar las clientas"));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  const mes = new Date().getMonth();
  const cumpleMes = (clientas ?? []).filter((c) => c.cumpleanos && new Date(c.cumpleanos).getUTCMonth() === mes);
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (clientas ?? []).filter((c) => (!talle || c.talle === talle) && (!q || `${c.nombre} ${c.whatsapp ?? ""}`.toLowerCase().includes(q)));
  }, [clientas, buscar, talle]);
  const tienda = ctx.perfil?.nombreComercial ?? "la boutique";
  const vidriera = ctx.perfil?.slug ? `${typeof window === "undefined" ? "" : window.location.origin}/closet/${ctx.perfil.slug}` : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`${SERIF} text-[28px] font-semibold`}>Clientas</h1>
          <p className={`text-[13px] ${TEXTO_SUAVE}`}>Se guardan solas cuando venden, apartan, alquilan o piden una prueba. Filtrá por talle para avisarles lo nuevo.</p>
        </div>
        <button type="button" onClick={() => setEditando("nueva")} className={BOTON_PRIMARIO}><Plus size={16} /> Nueva clienta</button>
      </div>

      {cumpleMes.length > 0 && (
        <Tarjeta className="bg-[image:var(--btq-tinte-fuerte)]">
          <p className={`${SERIF} flex items-center gap-2 text-[18px] font-semibold`}><Cake size={18} className="text-[color:var(--btq-rosa)]" /> Cumplen años este mes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {cumpleMes.map((c) => (
              <a key={c.clientaId} target="_blank" rel="noreferrer" className={BOTON} href={linkWhatsapp(c.whatsapp, `¡Feliz cumpleaños, ${c.nombre.split(" ")[0]}! 🎉 En ${tienda} te regalamos 10% de descuento en tu próxima compra este mes. ¡Te esperamos! 💜`)}>
                <MessageCircle size={13} /> {c.nombre} · {new Date(c.cumpleanos!).getUTCDate()}
              </a>
            ))}
          </div>
        </Tarjeta>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--btq-tenue)]" />
          <input className={`${CAMPO} pl-10`} placeholder="Buscar por nombre o número" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <Chip activo={!talle} onClick={() => setTalle("")}>Todos los talles</Chip>
          {TALLES_COMUNES.slice(0, 6).map((t) => <Chip key={t} activo={talle === t} onClick={() => setTalle(t)}>{t}</Chip>)}
        </div>
      </div>

      {talle && lista.length > 0 && vidriera && (
        <p className={`rounded-2xl bg-[color:var(--btq-card)] px-4 py-2.5 text-[13px] ${TEXTO_SUAVE}`}>
          <Sparkles size={14} className="mr-1 inline text-[color:var(--btq-acento)]" /> Tocá “Avisar” para mandarle a cada clienta talle {talle} el link de tu vidriera filtrado en su talle.
        </p>
      )}

      {clientas === null ? (
        <p className={`flex items-center gap-2 text-[13px] ${TEXTO_SUAVE}`}><Loader2 size={14} className="animate-spin" /> Cargando…</p>
      ) : lista.length === 0 ? (
        <Vacio titulo="Sin clientas para mostrar" texto="Cuando vendas con nombre y WhatsApp, o te pidan una prueba desde el marketplace, aparecen acá." />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((c) => (
            <div key={c.clientaId} className="rounded-3xl border border-[color:var(--btq-borde)] bg-[color:var(--btq-card)] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => setEditando(c)} className="min-w-0 text-left">
                  <p className="truncate text-[14px] font-semibold">{c.nombre}</p>
                  <p className={`text-[12px] ${TEXTO_SUAVE}`}>{c.whatsapp ?? "Sin WhatsApp"}</p>
                </button>
                {c.talle && <span className="rounded-full bg-[color:var(--btq-lila-bg)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--btq-lila)]">{c.talle}</span>}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`text-[11.5px] ${TEXTO_SUAVE}`}>{c.origen === "Marketplace" ? "Llegó por VORDIA CLOSET" : c.origen === "Caja" ? "Clienta de la tienda" : "Cargada a mano"}</span>
                {c.whatsapp && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-[color:var(--btq-activo-bg)] px-2.5 py-1 text-[11.5px] text-white"
                    href={linkWhatsapp(c.whatsapp, talle && vidriera
                      ? `¡Hola ${c.nombre.split(" ")[0]}! Llegaron prendas nuevas en tu talle (${talle}) a ${tienda} 💜 Miralas acá: ${vidriera}?talle=${encodeURIComponent(talle)}`
                      : `¡Hola ${c.nombre.split(" ")[0]}! Te escribimos de ${tienda} 💜`)}
                  >
                    <MessageCircle size={12} /> {talle ? "Avisar" : "Escribir"}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && <ClientaForm ctx={ctx} clienta={editando === "nueva" ? null : editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function ClientaForm({ ctx, clienta, onClose }: { ctx: ContextoBoutique; clienta: BtqClienta | null; onClose: () => void }) {
  const [nombre, setNombre] = useState(clienta?.nombre ?? "");
  const [whatsapp, setWhatsapp] = useState(clienta?.whatsapp ?? "");
  const [email, setEmail] = useState(clienta?.email ?? "");
  const [talle, setTalle] = useState(clienta?.talle ?? "");
  const [cumple, setCumple] = useState(clienta?.cumpleanos ? isoDia(new Date(clienta.cumpleanos.slice(0, 10) + "T12:00:00")) : "");
  const [notas, setNotas] = useState(clienta?.notas ?? "");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      await btqApi(clienta ? `/api/Boutique/clientas/${clienta.clientaId}?empresaId=${ctx.empresaId}` : `/api/Boutique/clientas?empresaId=${ctx.empresaId}`, {
        method: clienta ? "PUT" : "POST",
        body: JSON.stringify({ nombre, whatsapp: whatsapp || null, email: email || null, talle: talle || null, cumpleanos: cumple || null, notas: notas || null }),
      });
      toast.success("Clienta guardada");
      ctx.recargar();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={clienta ? clienta.nombre : "Nueva clienta"} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Campo label="Nombre"><input className={CAMPO} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo label="WhatsApp"><input className={CAMPO} inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></Campo>
          <Campo label="Correo"><input className={CAMPO} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
          <Campo label="Cumpleaños"><input className={CAMPO} type="date" value={cumple} onChange={(e) => setCumple(e.target.value)} /></Campo>
        </div>
        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-[color:var(--btq-ink2)]">Talle</span>
          <div className="flex flex-wrap gap-1.5">{TALLES_COMUNES.map((t) => <Chip key={t} activo={talle === t} onClick={() => setTalle(talle === t ? "" : t)}>{t}</Chip>)}</div>
        </div>
        <Campo label="Notas" ayuda="Gustos, colores que le quedan, medidas, ajustes">
          <textarea className={`${CAMPO} min-h-[70px]`} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Campo>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BOTON}>Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando || !nombre.trim()} className={BOTON_PRIMARIO}>{guardando && <Loader2 size={14} className="animate-spin" />} Guardar</button>
        </div>
      </div>
    </Modal>
  );
}
