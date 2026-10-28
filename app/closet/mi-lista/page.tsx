"use client";

import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { DEGRADE, SERIF, TEXTO_SUAVE } from "@/components/boutique/estilos";
import { TarjetaPrenda, useFavoritas } from "../_components/ClosetUI";

/** Mi lista: las prendas que la clienta guardó con el corazón (quedan en este navegador). */
export default function MiListaPage() {
  const { lista } = useFavoritas();
  const origen = typeof window === "undefined" ? "" : window.location.origin;
  const texto = `Mirá mi lista de VORDIA Closet 💜\n${lista.slice(0, 10).map((p) => `• ${p.nombre} (${p.boutique.nombre}): ${origen}/closet/prenda/${p.prendaId}`).join("\n")}`;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`${SERIF} text-[36px] font-semibold`}>Mi lista</h1>
          <p className={`text-[13.5px] ${TEXTO_SUAVE}`}>Lo que guardaste con el corazón. Mandásela a tu amiga o a tu mamá para que te ayude a elegir.</p>
        </div>
        {lista.length > 0 && (
          <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-full ${DEGRADE} px-4 py-2.5 text-[13.5px] font-semibold text-white`}>
            <MessageCircle size={16} /> Compartir por WhatsApp
          </a>
        )}
      </div>
      {lista.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-[#DCC8F0] bg-white/60 p-10 text-center">
          <Heart size={30} className="mx-auto text-[#E0548F]" />
          <p className={`${SERIF} mt-2 text-[20px] font-semibold`}>Todavía no guardaste nada</p>
          <p className={`mt-1 text-[13px] ${TEXTO_SUAVE}`}>Tocá el corazón de las prendas que te gusten.</p>
          <Link href="/closet" className={`mt-4 inline-flex rounded-full ${DEGRADE} px-5 py-3 text-[14px] font-semibold text-white`}>Explorar</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 sm:gap-x-5">
          {lista.map((p) => <TarjetaPrenda key={p.prendaId} p={p} />)}
        </div>
      )}
    </main>
  );
}
