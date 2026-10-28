"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import { BadgeCheck, Heart, MapPin, Sparkles } from "lucide-react";
import { gs, type ClosetTarjeta } from "@/lib/boutiqueApi";
import { FotoPrenda } from "@/components/boutique/PrendaArte";
import { DEGRADE, SERIF, TEXTO_SUAVE } from "@/components/boutique/BoutiqueUI";

// ───────── Favoritas y medidas: se guardan en este navegador (sin cuenta) ─────────

const CLAVE_FAV = "vordia_closet_favoritas";
const CLAVE_MEDIDAS = "vordia_closet_medidas";
const EVENTO = "vordia-closet-cambio";

function leer<T>(clave: string, defecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : defecto;
  } catch {
    return defecto;
  }
}
function escribir(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* modo privado: no se guarda */
  }
  window.dispatchEvent(new Event(EVENTO));
}
function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}
const leerCrudo = (clave: string) => () => {
  try {
    return localStorage.getItem(clave) ?? "";
  } catch {
    return "";
  }
};

export function useFavoritas() {
  const crudo = useSyncExternalStore(suscribir, leerCrudo(CLAVE_FAV), () => "");
  const lista: ClosetTarjeta[] = (() => {
    try {
      return crudo ? (JSON.parse(crudo) as ClosetTarjeta[]) : [];
    } catch {
      return [];
    }
  })();
  const es = useCallback((id: number) => lista.some((p) => p.prendaId === id), [lista]);
  const alternar = useCallback((p: ClosetTarjeta) => {
    const actual = leer<ClosetTarjeta[]>(CLAVE_FAV, []);
    escribir(CLAVE_FAV, actual.some((x) => x.prendaId === p.prendaId) ? actual.filter((x) => x.prendaId !== p.prendaId) : [p, ...actual].slice(0, 60));
  }, []);
  return { lista, es, alternar };
}

export type Medidas = { busto?: number; cintura?: number; cadera?: number };

export function useMedidas() {
  const crudo = useSyncExternalStore(suscribir, leerCrudo(CLAVE_MEDIDAS), () => "");
  let medidas: Medidas = {};
  try {
    medidas = crudo ? (JSON.parse(crudo) as Medidas) : {};
  } catch {
    medidas = {};
  }
  const guardar = useCallback((m: Medidas) => escribir(CLAVE_MEDIDAS, m), []);
  return { medidas, guardar, tiene: Boolean(medidas.busto || medidas.cintura || medidas.cadera) };
}

/** El talle cuyas medidas reales están más cerca de las de la clienta (holgura mínima de 0 a 4 cm). */
export function talleIdeal(variantes: { talle: string; busto?: number | null; cintura?: number | null; cadera?: number | null }[], m: Medidas) {
  let mejor: { talle: string; puntaje: number } | null = null;
  for (const v of variantes) {
    const pares: [number | null | undefined, number | undefined][] = [[v.busto, m.busto], [v.cintura, m.cintura], [v.cadera, m.cadera]];
    const usados = pares.filter(([a, b]) => a && b) as [number, number][];
    if (!usados.length) continue;
    // Más chica que el cuerpo pesa el doble que más grande (se puede ajustar, no agrandar)
    const puntaje = usados.reduce((s, [prenda, cuerpo]) => s + (prenda < cuerpo ? (cuerpo - prenda) * 2 : Math.max(0, prenda - cuerpo - 4)), 0) / usados.length;
    if (!mejor || puntaje < mejor.puntaje) mejor = { talle: v.talle, puntaje };
  }
  return mejor && mejor.puntaje <= 8 ? mejor.talle : null;
}

// ───────── Encabezado y pie ─────────

export function ClosetHeader() {
  const { lista } = useFavoritas();
  return (
    <header className="sticky top-0 z-40 border-b border-[#F0E2F7]/80 bg-[#FFF6FB]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/closet" className="flex items-center gap-2">
          <span className={`grid h-9 w-9 place-items-center rounded-2xl ${DEGRADE} text-white shadow-md`}><Sparkles size={17} /></span>
          <span className="leading-none">
            <span className={`${SERIF} block text-[19px] font-semibold tracking-tight`}>VORDIA <span className="italic">Closet</span></span>
            <span className={`block text-[10px] uppercase tracking-[0.22em] ${TEXTO_SUAVE}`}>Boutiques de Gran Asunción</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1.5 text-[13px]">
          <Link href="/closet#boutiques" className="hidden rounded-full px-3 py-2 text-[#4A3466] hover:bg-white sm:inline-block">Boutiques</Link>
          <Link href="/closet/mi-lista" className="relative inline-flex items-center gap-1.5 rounded-full border border-[#EBDDF5] bg-white/80 px-3 py-2 text-[#4A3466]">
            <Heart size={15} className={lista.length ? "fill-[#E0548F] text-[#E0548F]" : ""} />
            <span className="hidden sm:inline">Mi lista</span>
            {lista.length > 0 && <span className="rounded-full bg-[#2B1B3D] px-1.5 text-[10.5px] text-white">{lista.length}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function ClosetFooter() {
  return (
    <footer className="mt-16 border-t border-[#F0E2F7] bg-white/50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className={`${SERIF} text-[22px] font-semibold`}>¿Tenés una boutique?</p>
          <p className={`mt-1 max-w-md text-[13.5px] ${TEXTO_SUAVE}`}>
            Con VORDIA BOUTIQUE manejás tu stock por talle y color, la caja, los apartados y los alquileres, y tus prendas aparecen acá solas, siempre con el stock real.
          </p>
          <Link href="/sitio/boutique" className={`mt-4 inline-flex items-center gap-1.5 rounded-full ${DEGRADE} px-4 py-2.5 text-[13px] font-semibold text-white`}>
            <Sparkles size={15} /> Quiero sumar mi boutique
          </Link>
        </div>
        <div className={`text-[12.5px] ${TEXTO_SUAVE}`}>
          <p>Las prendas, precios y stock los publica cada boutique. Las pruebas, pagos y entregas se coordinan directamente con ella.</p>
          <p className="mt-3 flex flex-wrap gap-3">
            <Link href="/privacidad" className="underline-offset-2 hover:underline">Privacidad</Link>
            <Link href="/terminos" className="underline-offset-2 hover:underline">Términos</Link>
            <span>Hecho en Paraguay por VORDIA</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ───────── Tarjeta de prenda ─────────

export function TarjetaPrenda({ p, fecha }: { p: ClosetTarjeta; fecha?: string }) {
  const { es, alternar } = useFavoritas();
  const fav = es(p.prendaId);
  const href = `/closet/prenda/${p.prendaId}${fecha ? `?fecha=${fecha}` : ""}`;
  const descuento = p.precioAnterior && p.precioVenta ? Math.round((1 - p.precioVenta / p.precioAnterior) * 100) : 0;

  return (
    <article className="group relative">
      <Link href={href} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[26px] bg-[#F7EEFC] shadow-[0_18px_40px_-28px_rgba(107,63,160,0.7)]">
          <FotoPrenda fotoId={p.fotos[0]} categoria={p.categoria} color={p.colorHex} alt={p.nombre} className="transition duration-700 group-hover:scale-[1.04]" />
          {p.fotos[1] && (
            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
              <FotoPrenda fotoId={p.fotos[1]} categoria={p.categoria} color={p.colorHex} alt="" />
            </div>
          )}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
            {p.modalidad !== "Venta" && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#6A4BC4] backdrop-blur">Se alquila</span>}
            {descuento > 0 && <span className="rounded-full bg-[#D63384] px-2.5 py-1 text-[10.5px] font-bold text-white">−{descuento}%</span>}
            {p.nuevo && !descuento && <span className="rounded-full bg-[#2B1B3D]/85 px-2.5 py-1 text-[10.5px] font-semibold text-white">Nuevo</span>}
          </div>
          {p.unidades === 1 && <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold text-[#B0135E]">¡Última!</span>}
          <div className="absolute bottom-2.5 right-2.5 flex -space-x-1.5">
            {p.colores.slice(0, 4).map((c) => <span key={c.nombre} title={c.nombre} className="h-4 w-4 rounded-full border-2 border-white shadow" style={{ background: c.hex ?? "#ccc" }} />)}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => alternar(p)}
        aria-label={fav ? "Quitar de mi lista" : "Guardar en mi lista"}
        aria-pressed={fav}
        className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow backdrop-blur transition hover:scale-110"
      >
        <Heart size={17} className={fav ? "fill-[#E0548F] text-[#E0548F]" : "text-[#4A3466]"} />
      </button>
      <Link href={href} className="mt-2.5 block px-0.5">
        <p className="line-clamp-1 text-[14px] font-semibold">{p.nombre}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[13px] tabular-nums">
          {p.precioVenta > 0 && <span className="font-semibold">{gs(p.precioVenta)}</span>}
          {p.precioAnterior ? <span className="text-[11.5px] text-[#A08BB5] line-through">{gs(p.precioAnterior)}</span> : null}
          {p.precioAlquiler > 0 && <span className="text-[#6A4BC4]">{p.precioVenta > 0 ? "o alquilá " : "Alquiler "}{gs(p.precioAlquiler)}</span>}
        </p>
        <p className="mt-1 flex flex-wrap gap-1">
          {p.talles.slice(0, 6).map((t) => <span key={t} className="rounded-md border border-[#EBDDF5] px-1.5 text-[10.5px] text-[#4A3466]">{t}</span>)}
        </p>
        <p className={`mt-1 flex items-center gap-1 text-[11.5px] ${TEXTO_SUAVE}`}>
          {p.boutique.verificada && <BadgeCheck size={13} className="text-[#6A4BC4]" />}
          <span className="truncate">{p.boutique.nombre}</span>
          <span>·</span>
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{p.boutique.ciudad}</span>
        </p>
      </Link>
    </article>
  );
}

export function AvisoDemo() {
  return (
    <p className="mx-auto max-w-7xl px-4 pt-3 text-center text-[11.5px] text-[#9A86AE] sm:px-6">
      Algunas boutiques se muestran como <b>ejemplo</b> mientras se suman las boutiques reales de Gran Asunción.
    </p>
  );
}
