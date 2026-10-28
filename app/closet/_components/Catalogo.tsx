"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarHeart, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { btqApi, fechaCorta, isoDia, type ClosetCatalogo } from "@/lib/boutiqueApi";
import { Chip, SELECT_CORTO, SERIF, TEXTO_SUAVE } from "@/components/boutique/BoutiqueUI";
import { TarjetaPrenda } from "./ClosetUI";

const CLAVES = ["q", "modo", "fecha", "talle", "categoria", "ocasion", "color", "ciudad", "precioMax", "orden"] as const;
type Clave = (typeof CLAVES)[number];
const PRECIOS = [200_000, 400_000, 700_000, 1_000_000, 1_500_000];

/** Catálogo con filtros en la URL (se puede compartir el link exacto). `boutique` lo limita a una vidriera. */
export function Catalogo({ boutique, titulo }: { boutique?: string; titulo?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [datos, setDatos] = useState<ClosetCatalogo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const [masFiltros, setMasFiltros] = useState(false);

  const filtros = useMemo(() => Object.fromEntries(CLAVES.map((k) => [k, params.get(k) ?? ""])) as Record<Clave, string>, [params]);
  const consulta = useMemo(() => {
    const q = new URLSearchParams();
    CLAVES.forEach((k) => filtros[k] && q.set(k, filtros[k]));
    if (boutique) q.set("boutique", boutique);
    return q.toString();
  }, [filtros, boutique]);

  const poner = (k: Clave, v: string) => {
    const q = new URLSearchParams(params.toString());
    if (v) q.set(k, v);
    else q.delete(k);
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    btqApi<ClosetCatalogo>(`/api/public/closet/prendas?${consulta}`)
      .then((d) => {
        if (!vivo) return;
        setDatos(d);
        setError("");
      })
      .catch((e) => vivo && setError(e instanceof Error ? e.message : "No se pudo cargar"))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [consulta]);

  // Búsqueda por texto con una pausa corta mientras escribe
  useEffect(() => {
    if (texto === filtros.q) return;
    const t = setTimeout(() => poner("q", texto.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const f = datos?.facetas;
  const activos = CLAVES.filter((k) => k !== "orden" && k !== "q" && filtros[k]);
  const etiqueta = (k: Clave) =>
    k === "fecha" ? `Evento ${fechaCorta(filtros.fecha)}` : k === "precioMax" ? `Hasta Gs. ${Number(filtros.precioMax).toLocaleString("es-PY")}` : k === "modo" ? (filtros.modo === "alquilar" ? "Para alquilar" : "Para comprar") : k === "talle" ? `Talle ${filtros.talle}` : filtros[k];

  return (
    <section id="catalogo" className="scroll-mt-20">
      {/* Barra de búsqueda */}
      <div className="sticky top-[61px] z-30 -mx-4 border-b border-[#F0E2F7] bg-[#FFF6FB]/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[#EBDDF5] bg-white p-1 text-[13px]">
            {[["", "Todo"], ["comprar", "Comprar"], ["alquilar", "Alquilar"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => poner("modo", v)} className={`rounded-full px-3.5 py-1.5 ${filtros.modo === v ? "bg-[#2B1B3D] text-white" : "text-[#4A3466]"}`}>{l}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-full border border-[#EBDDF5] bg-white px-3.5 py-1.5 text-[13px]">
            <CalendarHeart size={15} className="text-[#D63384]" />
            <span className="hidden text-[#7A6690] sm:inline">Mi evento es el</span>
            <input type="date" aria-label="Fecha de tu evento" min={isoDia(new Date())} value={filtros.fecha} onChange={(e) => poner("fecha", e.target.value)} className="bg-transparent text-[#2B1B3D] focus:outline-none" />
          </label>
          <div className="relative min-w-[180px] flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B3A3C4]" />
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Vestido largo verde, blazer, satén…" className="w-full rounded-full border border-[#EBDDF5] bg-white py-2 pl-10 pr-3 text-[13.5px] focus:border-[#B58BE0] focus:outline-none" />
          </div>
          <button type="button" onClick={() => setMasFiltros((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] ${masFiltros ? "border-[#2B1B3D] bg-[#2B1B3D] text-white" : "border-[#EBDDF5] bg-white text-[#4A3466]"}`}>
            <SlidersHorizontal size={14} /> Filtros{activos.length ? ` · ${activos.length}` : ""}
          </button>
        </div>

        {f && (
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            <span className={`shrink-0 self-center pr-1 text-[11.5px] font-semibold uppercase tracking-wider ${TEXTO_SUAVE}`}>Talle</span>
            {f.talles.map((t) => <Chip key={t} activo={filtros.talle === t} onClick={() => poner("talle", filtros.talle === t ? "" : t)}>{t}</Chip>)}
          </div>
        )}

        {masFiltros && f && (
          <div className="mt-3 space-y-3 rounded-3xl border border-[#EBDDF5] bg-white/90 p-3.5">
            <div className="flex flex-wrap gap-2">
              <select className={SELECT_CORTO} value={filtros.categoria} onChange={(e) => poner("categoria", e.target.value)} aria-label="Categoría">
                <option value="">Todas las prendas</option>
                {f.categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className={SELECT_CORTO} value={filtros.ocasion} onChange={(e) => poner("ocasion", e.target.value)} aria-label="Ocasión">
                <option value="">Cualquier ocasión</option>
                {f.ocasiones.map((c) => <option key={c}>{c}</option>)}
              </select>
              {!boutique && (
                <select className={SELECT_CORTO} value={filtros.ciudad} onChange={(e) => poner("ciudad", e.target.value)} aria-label="Ciudad">
                  <option value="">Todo Gran Asunción</option>
                  {f.ciudades.map((c) => <option key={c}>{c}</option>)}
                </select>
              )}
              <select className={SELECT_CORTO} value={filtros.precioMax} onChange={(e) => poner("precioMax", e.target.value)} aria-label="Precio máximo">
                <option value="">Cualquier precio</option>
                {PRECIOS.map((p) => <option key={p} value={p}>Hasta Gs. {p.toLocaleString("es-PY")}</option>)}
              </select>
              <select className={SELECT_CORTO} value={filtros.orden} onChange={(e) => poner("orden", e.target.value)} aria-label="Ordenar">
                <option value="">Lo más nuevo</option>
                <option value="populares">Lo más mirado</option>
                <option value="precio">Menor precio</option>
                <option value="precio-desc">Mayor precio</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11.5px] font-semibold uppercase tracking-wider ${TEXTO_SUAVE}`}>Color</span>
              {f.colores.map((c) => (
                <button
                  key={c.nombre}
                  type="button"
                  title={c.nombre}
                  aria-label={`Color ${c.nombre}`}
                  aria-pressed={filtros.color === c.nombre}
                  onClick={() => poner("color", filtros.color === c.nombre ? "" : c.nombre)}
                  className={`h-7 w-7 rounded-full border-2 shadow transition hover:scale-110 ${filtros.color === c.nombre ? "border-[#2B1B3D] ring-2 ring-[#C77DD8]" : "border-white"}`}
                  style={{ background: c.hex ?? "#ccc" }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`${SERIF} text-[24px] font-semibold`}>
          {titulo ?? (filtros.fecha ? "Libre para tu fecha" : "Todo lo que hay hoy")}
          {datos && <span className={`ml-2 text-[14px] font-normal ${TEXTO_SUAVE}`}>{datos.total} prenda{datos.total === 1 ? "" : "s"}</span>}
        </h2>
        {activos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activos.map((k) => (
              <button key={k} type="button" onClick={() => poner(k, "")} className="inline-flex items-center gap-1 rounded-full bg-[#2B1B3D] px-2.5 py-1 text-[12px] text-white">
                {etiqueta(k)} <X size={12} />
              </button>
            ))}
            <button type="button" onClick={() => { setTexto(""); router.replace(pathname, { scroll: false }); }} className={`text-[12px] underline ${TEXTO_SUAVE}`}>Limpiar</button>
          </div>
        )}
      </div>
      {filtros.fecha && (
        <p className={`mt-1 text-[12.5px] ${TEXTO_SUAVE}`}>Para alquilar, la retirás el día antes de tu evento. Solo ves lo que no está alquilado por otra clienta esas fechas.</p>
      )}

      {error ? (
        <p className="mt-6 rounded-3xl bg-white/70 p-6 text-center text-[14px]">{error}</p>
      ) : !datos ? (
        <p className={`mt-10 flex items-center justify-center gap-2 text-[14px] ${TEXTO_SUAVE}`}><Loader2 size={16} className="animate-spin" /> Buscando en las boutiques…</p>
      ) : datos.total === 0 ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-[#DCC8F0] bg-white/60 p-10 text-center">
          <p className={`${SERIF} text-[20px] font-semibold`}>Nada con esos filtros… por ahora</p>
          <p className={`mt-1 text-[13px] ${TEXTO_SUAVE}`}>Probá otro talle o color, o sacá la fecha del evento.</p>
        </div>
      ) : (
        <div className={`mt-4 grid grid-cols-2 gap-x-3 gap-y-6 transition-opacity sm:grid-cols-3 lg:grid-cols-4 sm:gap-x-5 ${cargando ? "opacity-60" : ""}`}>
          {datos.prendas.map((p) => <TarjetaPrenda key={p.prendaId} p={p} fecha={filtros.fecha || undefined} />)}
        </div>
      )}
    </section>
  );
}
