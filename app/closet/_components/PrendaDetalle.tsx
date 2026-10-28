"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, CalendarCheck, CalendarHeart, CheckCircle2, Clock, Heart, Instagram, Loader2, MapPin, MessageCircle, Ruler, Share2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { btqApi, fechaCorta, gs, isoDia, linkWhatsapp, origenWeb, type ClosetDetalle } from "@/lib/boutiqueApi";
import { FotoPrenda } from "@/components/boutique/PrendaArte";
import { Campo, CAMPO, Modal } from "@/components/boutique/BoutiqueUI";
import { DEGRADE, SERIF, TEXTO_SUAVE } from "@/components/boutique/estilos";
import { TarjetaPrenda, talleIdeal, useFavoritas, useMedidas } from "./ClosetUI";
import { MedidasModal } from "./MedidasModal";

const HORAS = Array.from({ length: 21 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

export function PrendaDetalle({ id }: { id: number }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fecha = params.get("fecha") ?? "";
  const [d, setD] = useState<ClosetDetalle | null>(null);
  const [error, setError] = useState("");
  const [foto, setFoto] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [talle, setTalle] = useState<string | null>(null);
  const [modo, setModo] = useState<"comprar" | "alquilar" | null>(null);
  const [prueba, setPrueba] = useState(false);
  const [medidasAbierto, setMedidasAbierto] = useState(false);
  const { es, alternar } = useFavoritas();
  const { medidas, tiene } = useMedidas();

  useEffect(() => {
    let vivo = true;
    btqApi<ClosetDetalle>(`/api/public/closet/prendas/${id}${fecha ? `?fecha=${fecha}` : ""}`)
      .then((r) => vivo && setD(r))
      .catch((e) => vivo && setError(e instanceof Error && e.message !== "Error 404" ? e.message : "Esta prenda ya no está publicada"));
    return () => {
      vivo = false;
    };
  }, [id, fecha]);

  const colores = useMemo(() => Array.from(new Map((d?.variantes ?? []).map((v) => [v.color, v.colorHex])).entries()), [d]);
  const colorActivo = color ?? colores.find(([c]) => d?.variantes.some((v) => v.color === c && v.disponible))?.[0] ?? colores[0]?.[0] ?? null;
  const delColor = (d?.variantes ?? []).filter((v) => v.color === colorActivo);
  const elegida = delColor.find((v) => v.talle === talle && v.disponible) ?? null;
  const ideal = tiene && d ? talleIdeal(delColor.map((v) => ({ talle: v.talle, busto: v.busto, cintura: v.cintura, cadera: v.cadera })), medidas) : null;
  const tieneMedidas = delColor.some((v) => v.busto || v.cintura || v.cadera);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className={`${SERIF} text-[26px] font-semibold`}>{error}</p>
        <Link href="/closet" className={`mt-5 inline-flex rounded-full ${DEGRADE} px-5 py-3 text-[14px] font-semibold text-white`}>Ver otras prendas</Link>
      </main>
    );
  }
  if (!d) {
    return <p className={`flex items-center justify-center gap-2 py-24 text-[14px] ${TEXTO_SUAVE}`}><Loader2 size={16} className="animate-spin" /> Abriendo…</p>;
  }

  const p = d.prenda;
  const b = d.boutique;
  const modoActivo = modo ?? (p.modalidad === "Alquiler" || (p.modalidad === "Ambos" && fecha) ? "alquilar" : "comprar");
  const fav = es(p.prendaId);
  const link = `${origenWeb()}/closet/prenda/${p.prendaId}`;
  const ponerFecha = (v: string) => {
    const q = new URLSearchParams(params.toString());
    if (v) q.set("fecha", v);
    else q.delete("fecha");
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };
  const compartir = async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.nombre, text: `Mirá este ${p.nombre.toLowerCase()} en ${b.nombre}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        toast.success("Link copiado");
      }
    } catch {
      /* canceló */
    }
  };
  const mensajeWa = `¡Hola ${b.nombre}! Vi en VORDIA Closet ${p.nombre}${elegida ? ` talle ${elegida.talle} en ${elegida.color}` : ""}${modoActivo === "alquilar" && fecha ? ` para alquilar, mi evento es el ${fechaCorta(fecha)}` : ""}. ¿Está disponible? ${link}`;
  const fotos = d.fotos.length ? d.fotos : [0];

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
      <Link href={`/closet${fecha ? `?fecha=${fecha}` : ""}#catalogo`} className={`inline-flex items-center gap-1.5 text-[13px] ${TEXTO_SUAVE} hover:text-[#2B1B3D]`}><ArrowLeft size={15} /> Volver al closet</Link>
      {b.demo && <p className="mt-2 rounded-2xl bg-white/60 px-3 py-2 text-[12px] text-[#9A86AE]">Esta es una boutique de <b>ejemplo</b> para mostrar cómo funciona VORDIA Closet.</p>}

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Galería */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-[#F7EEFC] shadow-[0_30px_70px_-40px_rgba(107,63,160,0.9)]">
            <FotoPrenda fotoId={fotos[foto] || null} categoria={p.categoria} color={delColor[0]?.colorHex ?? p.colorHex} alt={p.nombre} />
            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <button type="button" onClick={() => alternar(p)} aria-label={fav ? "Quitar de mi lista" : "Guardar en mi lista"} aria-pressed={fav} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow backdrop-blur">
                <Heart size={19} className={fav ? "fill-[#E0548F] text-[#E0548F]" : ""} />
              </button>
              <button type="button" onClick={compartir} aria-label="Compartir" className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow backdrop-blur"><Share2 size={18} /></button>
            </div>
          </div>
          {d.fotos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {d.fotos.map((f, i) => (
                <button key={f} type="button" onClick={() => setFoto(i)} className={`h-20 w-16 shrink-0 overflow-hidden rounded-2xl border-2 ${i === foto ? "border-[#C77DD8]" : "border-transparent"}`} aria-label={`Foto ${i + 1}`}>
                  <FotoPrenda fotoId={f} categoria={p.categoria} color={p.colorHex} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div>
          <Link href={`/closet/${b.slug}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6A4BC4]">
            {b.verificada && <BadgeCheck size={15} />} {b.nombre} · {b.ciudad}
          </Link>
          <h1 className={`${SERIF} mt-1 text-[34px] font-semibold leading-tight sm:text-[40px]`}>{p.nombre}</h1>
          {p.ocasiones && <p className={`mt-1 text-[13px] ${TEXTO_SUAVE}`}>Ideal para {p.ocasiones.toLowerCase().replace(/, ([^,]*)$/, " y $1")}</p>}

          {p.modalidad === "Ambos" && (
            <div className="mt-5 inline-flex rounded-full border border-[#EBDDF5] bg-white p-1 text-[13.5px]">
              {(["comprar", "alquilar"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setModo(m)} className={`rounded-full px-4 py-2 ${modoActivo === m ? "bg-[#2B1B3D] text-white" : "text-[#4A3466]"}`}>{m === "comprar" ? "Comprar" : "Alquilar"}</button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            {modoActivo === "comprar" ? (
              <>
                <span className={`${SERIF} text-[32px] font-semibold tabular-nums`}>{gs(p.precioVenta)}</span>
                {p.precioAnterior ? <span className="text-[16px] text-[#A08BB5] line-through">{gs(p.precioAnterior)}</span> : null}
              </>
            ) : (
              <>
                <span className={`${SERIF} text-[32px] font-semibold tabular-nums`}>{gs(p.precioAlquiler)}</span>
                <span className={`text-[13.5px] ${TEXTO_SUAVE}`}>por {p.diasAlquiler} días{d.garantia ? ` · garantía ${gs(d.garantia)} (se devuelve)` : ""}</span>
              </>
            )}
          </div>

          {modoActivo === "alquilar" && (
            <div className="mt-4 rounded-[24px] border border-[#EBDDF5] bg-white/80 p-4">
              <label className="flex flex-wrap items-center gap-3">
                <CalendarHeart size={20} className="text-[#D63384]" />
                <span className="text-[13.5px] font-semibold">¿Cuándo es tu evento?</span>
                <input type="date" min={isoDia(new Date())} value={fecha} onChange={(e) => ponerFecha(e.target.value)} className="rounded-full border border-[#EBDDF5] px-3 py-1.5 text-[13.5px] focus:outline-none" />
              </label>
              {d.bloque ? (
                <p className="mt-2 text-[13px] text-[#5B3DB0]"><CalendarCheck size={14} className="mr-1 inline" /> La retirás el <b>{fechaCorta(d.bloque.desde)}</b> y la devolvés el <b>{fechaCorta(d.bloque.hasta)}</b>. Abajo ves los talles libres esas fechas.</p>
              ) : (
                <p className={`mt-2 text-[12.5px] ${TEXTO_SUAVE}`}>Poné la fecha y te mostramos qué talles están libres (no alquilados por otra clienta).</p>
              )}
            </div>
          )}

          {/* Color */}
          <div className="mt-5">
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-[#4A3466]">Color · <span className="font-normal normal-case tracking-normal">{colorActivo}</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {colores.map(([c, hex]) => {
                const hay = d.variantes.some((v) => v.color === c && v.disponible);
                return (
                  <button key={c} type="button" onClick={() => { setColor(c); setTalle(null); }} title={c} aria-label={`Color ${c}`} aria-pressed={colorActivo === c}
                    className={`relative h-10 w-10 rounded-full border-2 shadow transition ${colorActivo === c ? "border-[#2B1B3D] ring-2 ring-[#C77DD8] ring-offset-2" : "border-white"} ${hay ? "" : "opacity-40"}`}
                    style={{ background: hex ?? "#ccc" }}
                  />
                );
              })}
            </div>
          </div>

          {/* Talle */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-[#4A3466]">Talle</p>
              {tieneMedidas && (
                <button type="button" onClick={() => setMedidasAbierto(true)} className="inline-flex items-center gap-1 text-[12.5px] text-[#6A4BC4] underline-offset-2 hover:underline">
                  <Ruler size={14} /> {tiene ? "Cambiar mis medidas" : "¿Cuál es mi talle?"}
                </button>
              )}
            </div>
            {ideal && (
              <p className="mt-2 rounded-2xl bg-[linear-gradient(120deg,#FFE6F2,#EFE5FF)] px-3.5 py-2 text-[13px]">
                <Sparkles size={14} className="mr-1 inline text-[#D63384]" /> Según tus medidas, te queda mejor el <b>{ideal}</b>.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {delColor.map((v) => (
                <button key={v.varianteId} type="button" disabled={!v.disponible} onClick={() => setTalle(v.talle)} aria-pressed={talle === v.talle}
                  className={`relative min-w-[54px] rounded-2xl border px-3.5 py-2.5 text-[14px] font-semibold transition ${
                    talle === v.talle ? "border-[#2B1B3D] bg-[#2B1B3D] text-white" : v.disponible ? "border-[#E6D6F2] bg-white hover:border-[#B58BE0]" : "border-dashed border-[#E6D6F2] text-[#C4B5D3] line-through"
                  } ${ideal === v.talle && talle !== v.talle ? "ring-2 ring-[#EC6FA8]" : ""}`}
                >
                  {v.talle}
                  {v.ultima && v.disponible && modoActivo === "comprar" && <span className="absolute -right-1.5 -top-2 rounded-full bg-[#D63384] px-1.5 text-[9.5px] font-bold text-white">última</span>}
                </button>
              ))}
            </div>
            {elegida && (elegida.busto || elegida.cintura || elegida.cadera || elegida.largo) && (
              <p className={`mt-2 text-[12.5px] ${TEXTO_SUAVE}`}>
                Medidas reales del {elegida.talle}: {[elegida.busto && `busto ${elegida.busto}`, elegida.cintura && `cintura ${elegida.cintura}`, elegida.cadera && `cadera ${elegida.cadera}`, elegida.largo && `largo ${elegida.largo}`].filter(Boolean).join(" · ")} cm
              </p>
            )}
            {!delColor.some((v) => v.disponible) && <p className="mt-2 text-[13px] text-[#B0135E]">{fecha ? "Este color no está libre para tu fecha. Probá otro color o fecha." : "Este color se agotó."}</p>}
          </div>

          {/* Acciones */}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setPrueba(true)} className={`inline-flex items-center justify-center gap-2 rounded-full ${DEGRADE} px-5 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_16px_34px_-16px_rgba(214,51,132,0.9)]`}>
              <CalendarCheck size={17} /> Reservar mi prueba
            </button>
            {b.whatsapp && (
              <a href={linkWhatsapp(b.whatsapp, mensajeWa)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2B1B3D] bg-white px-5 py-3.5 text-[14.5px] font-semibold">
                <MessageCircle size={17} /> Consultar por WhatsApp
              </a>
            )}
          </div>
          <p className={`mt-2 text-[12px] ${TEXTO_SUAVE}`}>Sin registrarte. La boutique te confirma el turno por WhatsApp.</p>

          {(d.descripcion || d.material) && (
            <div className="mt-6 border-t border-[#EBDDF5] pt-5">
              {d.descripcion && <p className="text-[14.5px] leading-relaxed">{d.descripcion}</p>}
              {d.material && <p className={`mt-2 text-[13px] ${TEXTO_SUAVE}`}>Material: {d.material}</p>}
            </div>
          )}

          {/* Boutique */}
          <div className="mt-6 rounded-[26px] border border-[#EBDDF5] bg-white/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/closet/${b.slug}`} className={`${SERIF} flex items-center gap-1.5 text-[19px] font-semibold`}>{b.nombre} {b.verificada && <BadgeCheck size={17} className="text-[#6A4BC4]" />}</Link>
              {b.instagram && <a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-[#C77DD8]"><Instagram size={19} /></a>}
            </div>
            {b.descripcion && <p className={`mt-1 text-[13px] ${TEXTO_SUAVE}`}>{b.descripcion}</p>}
            <p className="mt-2 flex items-start gap-1.5 text-[13px]"><MapPin size={15} className="mt-0.5 shrink-0 text-[#C77DD8]" /> {b.direccion ?? `${b.barrio ?? ""} ${b.ciudad ?? ""}`}</p>
            {b.horario && <p className="mt-1 flex items-start gap-1.5 text-[13px]"><Clock size={15} className="mt-0.5 shrink-0 text-[#C77DD8]" /> {b.horario}</p>}
          </div>
        </div>
      </div>

      {d.masDeLaBoutique.length > 0 && (
        <section className="mt-14">
          <h2 className={`${SERIF} text-[26px] font-semibold`}>Más de {b.nombre}</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-5">
            {d.masDeLaBoutique.map((x) => <TarjetaPrenda key={x.prendaId} p={x} fecha={fecha || undefined} />)}
          </div>
        </section>
      )}

      {prueba && <PruebaModal d={d} varianteId={elegida?.varianteId ?? null} talle={elegida ? `${elegida.talle} · ${elegida.color}` : null} fechaEvento={fecha} onClose={() => setPrueba(false)} />}
      {medidasAbierto && <MedidasModal onClose={() => setMedidasAbierto(false)} />}
    </main>
  );
}

function PruebaModal({ d, varianteId, talle, fechaEvento, onClose }: { d: ClosetDetalle; varianteId: number | null; talle: string | null; fechaEvento: string; onClose: () => void }) {
  const manana = isoDia(new Date(Date.now() + 86_400_000));
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dia, setDia] = useState(manana);
  const [hora, setHora] = useState("10:00");
  const [evento, setEvento] = useState(fechaEvento);
  const [mensaje, setMensaje] = useState("");
  const [web, setWeb] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const b = d.boutique;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await btqApi(`/api/public/closet/pruebas`, {
        method: "POST",
        body: JSON.stringify({ prendaId: d.prenda.prendaId, varianteId, nombre, whatsapp, fechaHora: `${dia}T${hora}:00`, fechaEvento: evento || null, mensaje: mensaje || null, web }),
      });
      setListo(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reservar");
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <Modal titulo="¡Tu prueba está pedida!" onClose={onClose} ancho="sm:max-w-md">
        <div className="space-y-3 text-center">
          <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${DEGRADE} text-white`}><CheckCircle2 size={30} /></div>
          <p className="text-[14.5px]">
            <b>{b.nombre}</b> te va a escribir por WhatsApp para confirmar tu prueba de <b>{d.prenda.nombre}</b> el {fechaCorta(dia)} a las {hora}.
          </p>
          {b.whatsapp && (
            <a className={`inline-flex w-full items-center justify-center gap-2 rounded-full ${DEGRADE} px-5 py-3 text-[14px] font-semibold text-white`} target="_blank" rel="noreferrer"
              href={linkWhatsapp(b.whatsapp, `¡Hola! Soy ${nombre}, pedí una prueba de ${d.prenda.nombre}${talle ? ` (${talle})` : ""} para el ${fechaCorta(dia)} a las ${hora} desde VORDIA Closet. 💜`)}>
              <MessageCircle size={16} /> Escribirles ahora (opcional)
            </a>
          )}
          <button type="button" onClick={onClose} className={`w-full text-[13px] ${TEXTO_SUAVE}`}>Seguir mirando</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Reservá tu prueba" onClose={onClose} ancho="sm:max-w-md">
      <form onSubmit={enviar} className="space-y-3">
        <p className={`text-[13px] ${TEXTO_SUAVE}`}>{d.prenda.nombre}{talle ? ` · ${talle}` : ""} en {b.nombre}{b.direccion ? ` (${b.direccion})` : ""}.</p>
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Tu nombre"><input required className={CAMPO} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" /></Campo>
          <Campo label="Tu WhatsApp"><input required className={CAMPO} inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="0981…" autoComplete="tel" /></Campo>
          <Campo label="Día"><input required type="date" min={manana} className={CAMPO} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
          <Campo label="Hora">
            <select className={CAMPO} value={hora} onChange={(e) => setHora(e.target.value)}>{HORAS.map((h) => <option key={h}>{h}</option>)}</select>
          </Campo>
        </div>
        <Campo label="Fecha de tu evento (opcional)"><input type="date" min={manana} className={CAMPO} value={evento} onChange={(e) => setEvento(e.target.value)} /></Campo>
        <Campo label="¿Algo que deban saber? (opcional)"><textarea className={`${CAMPO} min-h-[64px]`} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej.: necesito ajustarlo, voy con mi mamá…" /></Campo>
        {/* Campo trampa para robots: las personas no lo ven */}
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" value={web} onChange={(e) => setWeb(e.target.value)} name="web" />
        <p className={`text-[11.5px] ${TEXTO_SUAVE}`}>
          Tu nombre y WhatsApp se comparten solo con {b.nombre} para coordinar la prueba. Ver <Link href="/privacidad" className="underline">privacidad</Link>.
        </p>
        <button type="submit" disabled={enviando} className={`inline-flex w-full items-center justify-center gap-2 rounded-full ${DEGRADE} px-5 py-3.5 text-[14.5px] font-semibold text-white disabled:opacity-60`}>
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />} Pedir mi prueba
        </button>
      </form>
    </Modal>
  );
}
