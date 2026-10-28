"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarHeart, MapPin, Ruler, Shirt, Sparkles, Store } from "lucide-react";
import { btqApi, isoDia, type ClosetBoutiqueLista, type ClosetCatalogo } from "@/lib/boutiqueApi";
import { FotoPrenda } from "@/components/boutique/PrendaArte";
import { DEGRADE, SERIF, TEXTO_SUAVE } from "@/components/boutique/estilos";
import { AvisoDemo, useMedidas } from "./ClosetUI";
import { Catalogo } from "./Catalogo";
import { MedidasModal } from "./MedidasModal";

const OCASIONES: { nombre: string; desde: string; hasta: string }[] = [
  { nombre: "Casamiento", desde: "#F7C6DA", hasta: "#C9A7EB" },
  { nombre: "15 años", desde: "#BFE0F7", hasta: "#D9C6F5" },
  { nombre: "Gala", desde: "#2B1B3D", hasta: "#6A4BC4" },
  { nombre: "Madrina", desde: "#F2DDB8", hasta: "#E8A7BD" },
  { nombre: "Civil", desde: "#FFFFFF", hasta: "#EADCF8" },
  { nombre: "Graduación", desde: "#F4A6C9", hasta: "#9B7BE0" },
  { nombre: "Oficina", desde: "#D9E4D6", hasta: "#C9B8E8" },
  { nombre: "Casual", desde: "#FBE3D3", hasta: "#F4A6C9" },
];

export function ClosetInicio() {
  const router = useRouter();
  const [muestra, setMuestra] = useState<ClosetCatalogo | null>(null);
  const [boutiques, setBoutiques] = useState<ClosetBoutiqueLista[]>([]);
  const [fecha, setFecha] = useState("");
  const [medidasAbierto, setMedidasAbierto] = useState(false);
  const { tiene } = useMedidas();

  useEffect(() => {
    let vivo = true;
    btqApi<ClosetCatalogo>("/api/public/closet/prendas?orden=populares").then((d) => vivo && setMuestra(d)).catch(() => {});
    btqApi<ClosetBoutiqueLista[]>("/api/public/closet/boutiques").then((b) => vivo && setBoutiques(b)).catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const destacadas = muestra?.prendas.slice(0, 5) ?? [];
  const hayDemo = boutiques.some((b) => b.demo);
  const irFecha = () => router.push(`/closet?fecha=${fecha}#catalogo`);

  return (
    <main>
      {hayDemo && <AvisoDemo />}

      {/* Portada editorial */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#F7B5D3] opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#C9A7EB] opacity-50 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-16 lg:pt-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#EBDDF5] bg-white/70 px-3 py-1 text-[12px] font-medium text-[#6A4BC4]">
              <Sparkles size={13} /> {muestra ? `${muestra.total} prendas${hayDemo ? "" : " reales"} · ${muestra.boutiques} boutiques` : "Boutiques de Asunción y Gran Asunción"}
            </p>
            <h1 className={`${SERIF} mt-4 text-[44px] font-semibold leading-[0.98] tracking-tight sm:text-[64px]`}>
              Todas las boutiques,
              <br />
              <span className="bg-[linear-gradient(100deg,#D63384,#9B7BE0)] bg-clip-text italic text-transparent">un solo vestidor.</span>
            </h1>
            <p className={`mt-4 max-w-lg text-[16px] leading-relaxed ${TEXTO_SUAVE}`}>
              Decinos la fecha de tu evento y te mostramos solo lo que está libre, en tu talle y cerca tuyo. Comprá o alquilá, y reservá tu prueba en la boutique sin vueltas.
            </p>

            <div className="mt-6 flex max-w-lg flex-col gap-2 rounded-[28px] border border-[#EBDDF5] bg-white/90 p-2 shadow-[0_24px_60px_-30px_rgba(107,63,160,0.6)] sm:flex-row sm:items-center">
              <label className="flex flex-1 items-center gap-2.5 px-3 py-1.5">
                <CalendarHeart size={20} className="shrink-0 text-[#D63384]" />
                <span className="flex flex-col">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${TEXTO_SUAVE}`}>¿Cuándo es tu evento?</span>
                  <input type="date" min={isoDia(new Date())} value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-transparent text-[15px] font-medium focus:outline-none" aria-label="Fecha de tu evento" />
                </span>
              </label>
              <button type="button" onClick={irFecha} className={`inline-flex items-center justify-center gap-2 rounded-full ${DEGRADE} px-5 py-3.5 text-[14px] font-semibold text-white`}>
                {fecha ? "Ver lo que está libre" : "Ver todo"} <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#4A3466]">
              <span className="inline-flex items-center gap-1.5"><Shirt size={15} className="text-[#C77DD8]" /> Stock real, al instante</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={15} className="text-[#C77DD8]" /> Asunción y Gran Asunción</span>
              <button type="button" onClick={() => setMedidasAbierto(true)} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
                <Ruler size={15} className="text-[#C77DD8]" /> {tiene ? "Tus medidas están guardadas" : "Decime mi talle en cada prenda"}
              </button>
            </div>
          </div>

          {/* Mosaico con las prendas más miradas */}
          <div className="relative mx-auto grid h-[420px] w-full max-w-[520px] grid-cols-3 grid-rows-6 gap-3 sm:h-[520px]">
            {[0, 1, 2, 3, 4].map((i) => {
              const p = destacadas[i];
              const pos = ["col-span-2 row-span-4", "row-span-3", "row-span-3", "row-span-2", "col-span-1 row-span-2"][i];
              return (
                <Link
                  key={i}
                  href={p ? `/closet/prenda/${p.prendaId}` : "#catalogo"}
                  className={`${pos} group relative overflow-hidden rounded-[26px] bg-white/60 shadow-[0_20px_50px_-30px_rgba(107,63,160,0.8)] ${i === 1 ? "rotate-[1.5deg]" : i === 3 ? "-rotate-[1.5deg]" : ""}`}
                >
                  {p ? (
                    <>
                      <FotoPrenda fotoId={p.fotos[0]} categoria={p.categoria} color={p.colorHex} alt={p.nombre} className="transition duration-700 group-hover:scale-105" />
                      {i === 0 && (
                        <span className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/90 px-3 py-2 backdrop-blur">
                          <span className="block truncate text-[13px] font-semibold">{p.nombre}</span>
                          <span className={`block truncate text-[11.5px] ${TEXTO_SUAVE}`}>{p.boutique.nombre} · {p.boutique.ciudad}</span>
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="block h-full w-full animate-pulse bg-[linear-gradient(160deg,#FCE7F1,#EEE3FF)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ocasiones */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
          {OCASIONES.map((o) => (
            <Link key={o.nombre} href={`/closet?ocasion=${encodeURIComponent(o.nombre)}#catalogo`} className="group flex w-[84px] shrink-0 flex-col items-center gap-1.5">
              <span className="rounded-full bg-[linear-gradient(135deg,#EC6FA8,#9B7BE0)] p-[2.5px] transition group-hover:scale-105">
                <span className="block h-[74px] w-[74px] rounded-full border-[3px] border-[#FFF6FB]" style={{ background: `linear-gradient(140deg, ${o.desde}, ${o.hasta})` }} />
              </span>
              <span className="text-center text-[12px] font-medium">{o.nombre}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto mt-8 grid max-w-7xl gap-3 px-4 sm:grid-cols-3 sm:px-6">
        {[
          { n: "1", t: "Elegí tu fecha y tu talle", d: "Ves solo lo que está libre ese día y en tu medida, de todas las boutiques a la vez." },
          { n: "2", t: "Reservá tu prueba", d: "Elegís día y hora; la boutique te confirma por WhatsApp. Sin registrarte." },
          { n: "3", t: "Comprala o alquilala", d: "Si es alquiler, la retirás el día antes del evento y la devolvés después." },
        ].map((x) => (
          <div key={x.n} className="rounded-[26px] border border-[#EBDDF5] bg-white/70 p-5">
            <span className={`${SERIF} text-[34px] italic text-[#C77DD8]`}>{x.n}</span>
            <p className="mt-1 text-[15px] font-semibold">{x.t}</p>
            <p className={`mt-1 text-[13px] ${TEXTO_SUAVE}`}>{x.d}</p>
          </div>
        ))}
      </section>

      <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <Catalogo />
      </div>

      {/* Boutiques */}
      {boutiques.length > 0 && (
        <section id="boutiques" className="mx-auto mt-16 max-w-7xl scroll-mt-20 px-4 sm:px-6">
          <h2 className={`${SERIF} text-[30px] font-semibold`}>Las boutiques</h2>
          <p className={`text-[13.5px] ${TEXTO_SUAVE}`}>Cada una con su estilo. Entrá a su vidriera o pasá por el local.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boutiques.map((b) => (
              <Link key={b.slug} href={`/closet/${b.slug}`} className="group flex items-center gap-4 rounded-[26px] border border-[#EBDDF5] bg-white/75 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-30px_rgba(107,63,160,0.8)]">
                <span className="grid h-16 w-16 shrink-0 grid-cols-2 overflow-hidden rounded-2xl">
                  {[0, 1, 2, 3].map((i) => <span key={i} style={{ background: b.paleta[i] ?? b.paleta[0] ?? "#E9DBFF" }} />)}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className={`${SERIF} truncate text-[18px] font-semibold`}>{b.nombre}</span>
                    {b.verificada && <BadgeCheck size={16} className="shrink-0 text-[#6A4BC4]" />}
                  </span>
                  <span className={`block text-[12.5px] ${TEXTO_SUAVE}`}>{b.estilo} · {b.barrio ? `${b.barrio}, ` : ""}{b.ciudad}</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-[#6A4BC4]">{b.prendas} prendas {b.demo && <span className="font-normal text-[#A08BB5]">· ejemplo</span>}</span>
                </span>
              </Link>
            ))}
            <Link href="/sitio/boutique" className={`flex items-center gap-4 rounded-[26px] ${DEGRADE} p-4 text-white`}>
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20"><Store size={26} /></span>
              <span>
                <span className={`${SERIF} block text-[18px] font-semibold`}>Tu boutique acá</span>
                <span className="block text-[12.5px] text-white/85">Sumate con VORDIA BOUTIQUE y vendé también online</span>
              </span>
            </Link>
          </div>
        </section>
      )}

      {medidasAbierto && <MedidasModal onClose={() => setMedidasAbierto(false)} />}
    </main>
  );
}
