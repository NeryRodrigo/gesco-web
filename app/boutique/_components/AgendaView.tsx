"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Check, Loader2, MessageCircle, X } from "lucide-react";
import {
  btqApi, fechaCorta, fechaHora, gs, isoDia, linkWhatsapp, type BtqAlquiler, type BtqPrendaFila, type BtqPrueba,
} from "@/lib/boutiqueApi";
import { BOTON, BOTON_PRIMARIO, Campo, CAMPO, Chip, Estado, Modal, SERIF, Tarjeta, TEXTO_SUAVE } from "@/components/boutique/BoutiqueUI";
import type { ContextoBoutique } from "./BoutiqueApp";

const DIAS_LINEA = 21;
const dia = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);
const hoy0 = () => new Date(`${isoDia(new Date())}T12:00:00`);
const difDias = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86_400_000);

export function AgendaView({ ctx }: { ctx: ContextoBoutique }) {
  const [alquileres, setAlquileres] = useState<BtqAlquiler[]>([]);
  const [pruebas, setPruebas] = useState<BtqPrueba[]>([]);
  const [nuevo, setNuevo] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      btqApi<BtqAlquiler[]>(`/api/Boutique/alquileres?empresaId=${ctx.empresaId}`),
      btqApi<BtqPrueba[]>(`/api/Boutique/pruebas?empresaId=${ctx.empresaId}`),
    ])
      .then(([a, p]) => {
        if (!vivo) return;
        setAlquileres(a);
        setPruebas(p);
      })
      .catch((e) => vivo && toast.error(e instanceof Error ? e.message : "No se pudo cargar la agenda"));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  const estadoAlquiler = async (id: number, estado: string) => {
    try {
      await btqApi(`/api/Boutique/alquileres/${id}/estado?empresaId=${ctx.empresaId}`, { method: "POST", body: JSON.stringify({ estado }) });
      toast.success(estado === "Retirado" ? "Marcado como retirado" : estado === "Devuelto" ? "¡Volvió! Ya está libre para otra clienta" : "Alquiler cancelado");
      ctx.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  };
  const estadoPrueba = async (id: number, estado: string) => {
    try {
      await btqApi(`/api/Boutique/pruebas/${id}/estado?empresaId=${ctx.empresaId}`, { method: "POST", body: JSON.stringify({ estado }) });
      ctx.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  };

  const hoy = hoy0();
  const activos = alquileres.filter((a) => a.alquiler.estado === "Reservado" || a.alquiler.estado === "Retirado");
  const enLaCalle = activos.filter((a) => a.alquiler.estado === "Retirado");
  const porRetirar = activos.filter((a) => a.alquiler.estado === "Reservado");
  const enLinea = activos.filter((a) => difDias(dia(a.alquiler.hasta), hoy) >= 0 && difDias(dia(a.alquiler.desde), hoy) < DIAS_LINEA);
  const proximasPruebas = pruebas.filter((p) => p.prueba.estado === "Pedida" || p.prueba.estado === "Confirmada");
  const pasadas = pruebas.filter((p) => !(p.prueba.estado === "Pedida" || p.prueba.estado === "Confirmada")).slice(-8).reverse();
  const tienda = ctx.perfil?.nombreComercial ?? "la boutique";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`${SERIF} text-[28px] font-semibold`}>Alquileres y pruebas</h1>
          <p className={`text-[13px] ${TEXTO_SUAVE}`}>Cada pieza se bloquea por fecha: nunca se alquila dos veces el mismo vestido para el mismo fin de semana.</p>
        </div>
        <button type="button" onClick={() => setNuevo(true)} className={BOTON_PRIMARIO}><CalendarPlus size={16} /> Nuevo alquiler</button>
      </div>

      {/* Línea de tiempo de las próximas 3 semanas */}
      <Tarjeta className="overflow-hidden">
        <p className={`${SERIF} text-[19px] font-semibold`}>Próximas 3 semanas</p>
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid" style={{ gridTemplateColumns: `200px repeat(${DIAS_LINEA}, 1fr)` }}>
              <div />
              {Array.from({ length: DIAS_LINEA }, (_, i) => {
                const d = new Date(hoy.getTime() + i * 86_400_000);
                const finde = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div key={i} className={`py-1 text-center text-[10.5px] ${i === 0 ? "font-bold text-[#B0135E]" : finde ? "text-[#6A4BC4]" : TEXTO_SUAVE}`}>
                    {d.toLocaleDateString("es-PY", { weekday: "narrow" })}<br />{d.getDate()}
                  </div>
                );
              })}
            </div>
            {enLinea.length === 0 && <p className={`py-4 text-[13px] ${TEXTO_SUAVE}`}>No hay alquileres en estas fechas.</p>}
            {enLinea.map((a) => {
              const ini = Math.max(0, difDias(dia(a.alquiler.desde), hoy));
              const fin = Math.min(DIAS_LINEA - 1, difDias(dia(a.alquiler.hasta), hoy));
              return (
                <div key={a.alquiler.alquilerId} className="grid items-center border-t border-[#F4EAFB] py-1.5" style={{ gridTemplateColumns: `200px repeat(${DIAS_LINEA}, 1fr)` }}>
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-[12.5px] font-semibold">{a.prenda}</p>
                    <p className={`truncate text-[11px] ${TEXTO_SUAVE}`}>{a.talle} · {a.color} · {a.alquiler.clientaNombre}</p>
                  </div>
                  <div
                    className={`h-7 rounded-full px-2 text-[11px] font-semibold leading-7 text-white shadow ${a.alquiler.estado === "Retirado" ? "bg-[#6A4BC4]" : "bg-[linear-gradient(120deg,#EC6FA8,#C77DD8)]"}`}
                    style={{ gridColumn: `${ini + 2} / ${fin + 3}` }}
                    title={`${fechaCorta(a.alquiler.desde)} al ${fechaCorta(a.alquiler.hasta)}`}
                  >
                    <span className="block truncate">{a.alquiler.estado === "Retirado" ? "En la calle" : "Reservado"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <p className={`${SERIF} text-[19px] font-semibold`}>Para retirar</p>
          <ul className="mt-2 space-y-2">
            {porRetirar.length === 0 && <li className={`text-[13px] ${TEXTO_SUAVE}`}>Nada reservado.</li>}
            {porRetirar.map((a) => (
              <li key={a.alquiler.alquilerId} className="rounded-2xl bg-[#FFF7FB] px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-[13.5px] font-semibold">{a.alquiler.clientaNombre}</p>
                  <p className={`text-[12px] ${TEXTO_SUAVE}`}>{fechaCorta(a.alquiler.desde)} → {fechaCorta(a.alquiler.hasta)}</p>
                </div>
                <p className={`text-[12px] ${TEXTO_SUAVE}`}>{a.prenda} · {a.talle} · {a.color} · Alquiler {gs(a.alquiler.precio)} · Seña {gs(a.alquiler.sena)} · Garantía {gs(a.alquiler.garantia)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => estadoAlquiler(a.alquiler.alquilerId, "Retirado")} className={BOTON_PRIMARIO}><Check size={13} /> Retiró</button>
                  {a.alquiler.clientaWhatsapp && (
                    <a className={BOTON} target="_blank" rel="noreferrer" href={linkWhatsapp(a.alquiler.clientaWhatsapp, `¡Hola ${a.alquiler.clientaNombre.split(" ")[0]}! Te recordamos que tu ${a.prenda} está listo para retirar el ${fechaCorta(a.alquiler.desde)} en ${tienda}. Traé la garantía de ${gs(a.alquiler.garantia)}. 💜`)}>
                      <MessageCircle size={13} /> Recordar
                    </a>
                  )}
                  <button type="button" onClick={() => estadoAlquiler(a.alquiler.alquilerId, "Cancelado")} className={BOTON}><X size={13} /> Cancelar</button>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta>
          <p className={`${SERIF} text-[19px] font-semibold`}>En la calle</p>
          <ul className="mt-2 space-y-2">
            {enLaCalle.length === 0 && <li className={`text-[13px] ${TEXTO_SUAVE}`}>Todas las piezas están en la boutique.</li>}
            {enLaCalle.map((a) => {
              const atraso = difDias(hoy, dia(a.alquiler.hasta));
              return (
                <li key={a.alquiler.alquilerId} className={`rounded-2xl px-3.5 py-2.5 ${atraso > 0 ? "bg-[#FFE3F0]" : "bg-[#F4EEFF]"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-[13.5px] font-semibold">{a.alquiler.clientaNombre}</p>
                    <p className="text-[12px] font-semibold">{atraso > 0 ? `${atraso} día${atraso === 1 ? "" : "s"} de atraso` : `Vuelve el ${fechaCorta(a.alquiler.hasta)}`}</p>
                  </div>
                  <p className={`text-[12px] ${TEXTO_SUAVE}`}>{a.prenda} · {a.talle} · {a.color} · devolver garantía {gs(a.alquiler.garantia)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => estadoAlquiler(a.alquiler.alquilerId, "Devuelto")} className={BOTON_PRIMARIO}><Check size={13} /> Devolvió</button>
                    {a.alquiler.clientaWhatsapp && (
                      <a className={BOTON} target="_blank" rel="noreferrer" href={linkWhatsapp(a.alquiler.clientaWhatsapp, `¡Hola ${a.alquiler.clientaNombre.split(" ")[0]}! ¿Cómo te fue en tu evento? Te recordamos devolver el ${a.prenda} el ${fechaCorta(a.alquiler.hasta)} en ${tienda}. ¡Gracias! 💜`)}>
                        <MessageCircle size={13} /> Recordar
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      </div>

      <Tarjeta>
        <p className={`${SERIF} text-[19px] font-semibold`}>Pruebas agendadas</p>
        <p className={`text-[12px] ${TEXTO_SUAVE}`}>Las pide la clienta desde VORDIA CLOSET. Confirmale por WhatsApp y marcá si vino: así sabés cuántas pruebas terminan en venta.</p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {proximasPruebas.length === 0 && <li className={`text-[13px] ${TEXTO_SUAVE}`}>No hay pruebas pendientes.</li>}
          {proximasPruebas.map((p) => (
            <li key={p.prueba.pruebaId} className="rounded-2xl border border-[#EBDDF5] bg-white px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-semibold">{p.prueba.nombre}</p>
                <Estado estado={p.prueba.estado} />
              </div>
              <p className="text-[12.5px]">{fechaHora(p.prueba.fechaHora)}</p>
              <p className={`text-[12px] ${TEXTO_SUAVE}`}>
                {p.prenda}{p.variante ? ` · ${p.variante}` : ""}{p.prueba.fechaEvento ? ` · evento el ${fechaCorta(p.prueba.fechaEvento)}` : ""}
              </p>
              {p.prueba.mensaje && <p className="mt-1 rounded-xl bg-[#FFF7FB] px-2.5 py-1.5 text-[12px] italic">“{p.prueba.mensaje}”</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.prueba.estado === "Pedida" && (
                  <a
                    className={BOTON_PRIMARIO}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => estadoPrueba(p.prueba.pruebaId, "Confirmada")}
                    href={linkWhatsapp(p.prueba.whatsapp, `¡Hola ${p.prueba.nombre.split(" ")[0]}! Te confirmamos tu prueba de ${p.prenda} el ${fechaHora(p.prueba.fechaHora)} en ${tienda}${ctx.perfil?.direccion ? ` (${ctx.perfil.direccion})` : ""}. ¡Te esperamos! 💜`)}
                  >
                    <MessageCircle size={13} /> Confirmar
                  </a>
                )}
                <button type="button" onClick={() => estadoPrueba(p.prueba.pruebaId, "Vino")} className={BOTON}><Check size={13} /> Vino</button>
                <button type="button" onClick={() => estadoPrueba(p.prueba.pruebaId, "NoVino")} className={BOTON}>No vino</button>
                <button type="button" onClick={() => estadoPrueba(p.prueba.pruebaId, "Cancelada")} className={BOTON}><X size={13} /></button>
              </div>
            </li>
          ))}
        </ul>
        {pasadas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {pasadas.map((p) => <Chip key={p.prueba.pruebaId}>{p.prueba.nombre.split(" ")[0]} · {p.prenda} · {p.prueba.estado === "NoVino" ? "no vino" : p.prueba.estado.toLowerCase()}</Chip>)}
          </div>
        )}
      </Tarjeta>

      {nuevo && <NuevoAlquiler ctx={ctx} onClose={() => setNuevo(false)} />}
    </div>
  );
}

function NuevoAlquiler({ ctx, onClose }: { ctx: ContextoBoutique; onClose: () => void }) {
  const alquilables = useMemo(() => ctx.prendas.filter((p) => p.prenda.modalidad !== "Venta"), [ctx.prendas]);
  const [prenda, setPrenda] = useState<BtqPrendaFila | null>(alquilables[0] ?? null);
  const [varianteId, setVarianteId] = useState<number | null>(null);
  const [desde, setDesde] = useState(() => isoDia(new Date(Date.now() + 3 * 86_400_000)));
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sena, setSena] = useState("");
  const [libres, setLibres] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const dias = prenda?.prenda.diasAlquiler ?? 4;
  const hasta = isoDia(new Date(new Date(`${desde}T12:00:00`).getTime() + (dias - 1) * 86_400_000));

  useEffect(() => {
    if (!varianteId) return;
    let vivo = true;
    btqApi<{ libres: number }>(`/api/Boutique/alquileres/libres?empresaId=${ctx.empresaId}&varianteId=${varianteId}&desde=${desde}&hasta=${hasta}`)
      .then((r) => vivo && setLibres(r.libres))
      .catch(() => vivo && setLibres(null));
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, varianteId, desde, hasta]);

  const guardar = async () => {
    if (!varianteId) return;
    setGuardando(true);
    try {
      await btqApi(`/api/Boutique/alquileres?empresaId=${ctx.empresaId}`, {
        method: "POST",
        body: JSON.stringify({ varianteId, clientaNombre: nombre, clientaWhatsapp: whatsapp || null, desde, sena: Number(sena) || 0 }),
      });
      toast.success("Alquiler reservado: la pieza queda bloqueada en esas fechas, también en el marketplace");
      ctx.recargar();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo reservar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Nuevo alquiler" onClose={onClose}>
      {alquilables.length === 0 ? (
        <p className={`text-[13px] ${TEXTO_SUAVE}`}>No tenés prendas para alquilar. Editá una prenda y marcala como “Alquiler” o “Venta y alquiler”.</p>
      ) : (
        <div className="space-y-3">
          <Campo label="Prenda">
            <select className={CAMPO} value={prenda?.prenda.prendaId ?? ""} onChange={(e) => { setPrenda(alquilables.find((p) => p.prenda.prendaId === Number(e.target.value)) ?? null); setVarianteId(null); setLibres(null); }}>
              {alquilables.map((p) => <option key={p.prenda.prendaId} value={p.prenda.prendaId}>{p.prenda.nombre} · {gs(p.prenda.precioAlquiler)}</option>)}
            </select>
          </Campo>
          {prenda && (
            <div className="flex flex-wrap gap-1.5">
              {prenda.variantes.map((v) => (
                <Chip key={v.varianteId} color={v.colorHex} activo={varianteId === v.varianteId} onClick={() => setVarianteId(v.varianteId)}>{v.talle} · {v.color}</Chip>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Retira el" ayuda="Normalmente el día antes del evento"><input type="date" className={CAMPO} value={desde} min={isoDia(new Date())} onChange={(e) => setDesde(e.target.value)} /></Campo>
            <Campo label="Devuelve el" ayuda={`${dias} días de alquiler`}><input className={CAMPO} value={fechaCorta(hasta)} readOnly /></Campo>
          </div>
          {varianteId && libres !== null && (
            <p className={`rounded-2xl px-3.5 py-2 text-[13px] font-medium ${libres > 0 ? "bg-[#F4EEFF] text-[#5B3DB0]" : "bg-[#FFE3F0] text-[#B0135E]"}`}>
              {libres > 0 ? `✓ Libre en esas fechas (${libres} pieza${libres === 1 ? "" : "s"})` : "✗ Ocupada en esas fechas: probá otro talle, color o fecha"}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Clienta"><input className={CAMPO} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
            <Campo label="WhatsApp"><input className={CAMPO} inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></Campo>
          </div>
          <Campo label="Seña (Gs.)" ayuda={prenda ? `Alquiler ${gs(prenda.prenda.precioAlquiler)} · garantía al retirar ${gs(prenda.prenda.garantia)}` : undefined}>
            <input className={CAMPO} inputMode="numeric" value={sena} onChange={(e) => setSena(e.target.value.replace(/\D/g, ""))} />
          </Campo>
          <button type="button" onClick={guardar} disabled={guardando || !varianteId || !nombre.trim() || libres === 0} className={`${BOTON_PRIMARIO} w-full py-3`}>
            {guardando ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />} Reservar
          </button>
        </div>
      )}
    </Modal>
  );
}
