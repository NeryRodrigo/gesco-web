"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Clock, Instagram, MapPin, MessageCircle } from "lucide-react";
import { btqApi, linkWhatsapp, type ClosetBoutique } from "@/lib/boutiqueApi";
import { DEGRADE, SERIF, TEXTO_SUAVE } from "@/components/boutique/estilos";
import { Catalogo } from "./Catalogo";

/** Vidriera de una boutique: su presentación y su catálogo con stock real. */
export function VidrieraBoutique({ slug }: { slug: string }) {
  const [b, setB] = useState<ClosetBoutique | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    btqApi<ClosetBoutique>(`/api/public/closet/boutiques/${encodeURIComponent(slug)}`)
      .then((r) => vivo && setB(r))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [slug]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className={`${SERIF} text-[26px] font-semibold`}>No encontramos esa boutique</p>
        <Link href="/closet" className={`mt-5 inline-flex rounded-full ${DEGRADE} px-5 py-3 text-[14px] font-semibold text-white`}>Ver todas las boutiques</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
      <Link href="/closet#boutiques" className={`inline-flex items-center gap-1.5 text-[13px] ${TEXTO_SUAVE} hover:text-[#2B1B3D]`}><ArrowLeft size={15} /> Todas las boutiques</Link>
      <section className={`relative mt-3 overflow-hidden rounded-[32px] ${DEGRADE} p-6 text-white sm:p-8`}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" />
        {b ? (
          <div className="relative grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/80">{b.estilo}{b.demo ? " · boutique de ejemplo" : ""}</p>
              <h1 className={`${SERIF} mt-1 flex items-center gap-2 text-[38px] font-semibold leading-tight sm:text-[50px]`}>{b.nombre} {b.verificada && <BadgeCheck size={30} />}</h1>
              {b.descripcion && <p className="mt-2 max-w-xl text-[15px] text-white/90">{b.descripcion}</p>}
            </div>
            <div className="space-y-1.5 text-[13.5px]">
              <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> {b.direccion ?? `${b.barrio ?? ""}, ${b.ciudad ?? ""}`}</p>
              {b.horario && <p className="flex items-start gap-2"><Clock size={16} className="mt-0.5 shrink-0" /> {b.horario}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                {b.whatsapp && (
                  <a href={linkWhatsapp(b.whatsapp, `¡Hola ${b.nombre}! Vi su vidriera en VORDIA Closet 💜`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#B0135E]">
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                )}
                {b.instagram && (
                  <a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/60 px-4 py-2 text-[13px] font-semibold">
                    <Instagram size={15} /> @{b.instagram}
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-32" />
        )}
      </section>
      <div className="mt-6">
        <Catalogo boutique={slug} titulo={b ? `Lo que hay en ${b.nombre}` : "Prendas"} />
      </div>
    </main>
  );
}
