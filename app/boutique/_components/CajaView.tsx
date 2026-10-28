"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MessageCircle, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import {
  btqApi, fechaCorta, gs, linkWhatsapp, MEDIOS_PAGO, type BtqClienta, type BtqPrendaFila, type BtqVariante, type BtqVenta,
} from "@/lib/boutiqueApi";
import { BOTON, BOTON_PRIMARIO, Campo, CAMPO, Chip, Estado, Modal, SERIF, Tarjeta, TEXTO_SUAVE } from "@/components/boutique/BoutiqueUI";
import type { ContextoBoutique } from "./BoutiqueApp";
import { FotoAdmin } from "./PrendasView";

type Item = { variante: BtqVariante; prenda: BtqPrendaFila; cantidad: number };

export function CajaView({ ctx }: { ctx: ContextoBoutique }) {
  const [buscar, setBuscar] = useState("");
  const [elegida, setElegida] = useState<BtqPrendaFila | null>(null);
  const [bolsa, setBolsa] = useState<Item[]>([]);
  const [clientas, setClientas] = useState<BtqClienta[]>([]);
  const [clientaNombre, setClientaNombre] = useState("");
  const [clientaWhatsapp, setClientaWhatsapp] = useState("");
  const [medio, setMedio] = useState("Efectivo");
  const [canal, setCanal] = useState("Tienda");
  const [apartado, setApartado] = useState(false);
  const [sena, setSena] = useState("");
  const [diasApartado, setDiasApartado] = useState("3");
  const [enviando, setEnviando] = useState(false);
  const [hecha, setHecha] = useState<{ total: number; pagado: number; apartado: boolean; nombre: string; whatsapp: string; detalle: string } | null>(null);
  const [ventas, setVentas] = useState<BtqVenta[]>([]);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      btqApi<BtqClienta[]>(`/api/Boutique/clientas?empresaId=${ctx.empresaId}`),
      btqApi<BtqVenta[]>(`/api/Boutique/ventas?empresaId=${ctx.empresaId}&dias=7`),
    ])
      .then(([c, v]) => {
        if (!vivo) return;
        setClientas(c);
        setVentas(v);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [ctx.empresaId, ctx.version]);

  const vendibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return ctx.prendas.filter((p) => p.prenda.modalidad !== "Alquiler" && (!q || p.prenda.nombre.toLowerCase().includes(q)));
  }, [ctx.prendas, buscar]);

  const total = bolsa.reduce((s, i) => s + i.prenda.prenda.precioVenta * i.cantidad, 0);
  const enBolsa = (varianteId: number) => bolsa.find((i) => i.variante.varianteId === varianteId)?.cantidad ?? 0;

  const agregar = (prenda: BtqPrendaFila, variante: BtqVariante) => {
    if (enBolsa(variante.varianteId) >= variante.stock) {
      toast.error(`No hay más stock de ${variante.talle} ${variante.color}`);
      return;
    }
    setBolsa((b) => (b.some((i) => i.variante.varianteId === variante.varianteId)
      ? b.map((i) => (i.variante.varianteId === variante.varianteId ? { ...i, cantidad: i.cantidad + 1 } : i))
      : [...b, { prenda, variante, cantidad: 1 }]));
    setElegida(null);
  };

  const elegirClienta = (nombre: string) => {
    setClientaNombre(nombre);
    const c = clientas.find((x) => x.nombre === nombre);
    if (c?.whatsapp) setClientaWhatsapp(c.whatsapp);
  };

  const cobrar = async () => {
    setEnviando(true);
    try {
      const v = await btqApi<{ total: number; pagado: number }>(`/api/Boutique/ventas?empresaId=${ctx.empresaId}`, {
        method: "POST",
        body: JSON.stringify({
          items: bolsa.map((i) => ({ varianteId: i.variante.varianteId, cantidad: i.cantidad })),
          clientaId: clientas.find((c) => c.nombre === clientaNombre)?.clientaId,
          clientaNombre: clientaNombre || null, clientaWhatsapp: clientaWhatsapp || null,
          medioPago: medio, canal, apartado, sena: Number(sena) || 0, diasApartado: Number(diasApartado) || 3,
        }),
      });
      setHecha({
        total: v.total, pagado: v.pagado, apartado, nombre: clientaNombre, whatsapp: clientaWhatsapp,
        detalle: bolsa.map((i) => `${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.prenda.prenda.nombre} (${i.variante.talle}, ${i.variante.color})`).join(", "),
      });
      setBolsa([]);
      setClientaNombre("");
      setClientaWhatsapp("");
      setApartado(false);
      setSena("");
      ctx.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar");
    } finally {
      setEnviando(false);
    }
  };

  const cerrarApartado = async (ventaId: number, pagar: boolean) => {
    if (!pagar && !confirm("¿Liberar el apartado? La prenda vuelve al stock (la seña la devolvés o la retenés según tu política).")) return;
    try {
      await btqApi(`/api/Boutique/ventas/${ventaId}/apartado?empresaId=${ctx.empresaId}`, { method: "POST", body: JSON.stringify({ pagar, medioPago: medio }) });
      toast.success(pagar ? "Saldo cobrado: venta completa" : "Apartado liberado, la prenda volvió al stock");
      ctx.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  };

  const apartados = ventas.filter((v) => v.venta.estado === "Apartada");
  const recientes = ventas.filter((v) => v.venta.estado !== "Apartada").slice(0, 12);
  const tienda = ctx.perfil?.nombreComercial ?? "la boutique";

  return (
    <div className="space-y-5">
      <div>
        <h1 className={`${SERIF} text-[28px] font-semibold`}>Vender</h1>
        <p className={`text-[13px] ${TEXTO_SUAVE}`}>Tocá la prenda, elegí talle y color, y cobrá. Si la clienta deja una seña, marcala como apartado.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--btq-tenue)]" />
            <input className={`${CAMPO} pl-10`} placeholder="Buscar prenda" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {vendibles.map((p) => (
              <button key={p.prenda.prendaId} type="button" disabled={p.stock === 0} onClick={() => setElegida(p)} className="flex items-center gap-2.5 rounded-2xl border border-[color:var(--btq-borde)] bg-[color:var(--btq-card)] p-2 text-left transition hover:border-[color:var(--btq-foco)] disabled:opacity-45">
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-xl"><FotoAdmin empresaId={ctx.empresaId} fotoId={p.fotos[0]} categoria={p.prenda.categoria} color={p.prenda.colorHex} /></div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[12.5px] font-semibold leading-tight">{p.prenda.nombre}</p>
                  <p className="text-[12px] tabular-nums text-[color:var(--btq-lila)]">{gs(p.prenda.precioVenta)}</p>
                  <p className={`text-[11px] ${TEXTO_SUAVE}`}>{p.stock ? `${p.stock} en stock` : "Sin stock"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Tarjeta className="h-fit lg:sticky lg:top-6">
          <p className={`${SERIF} flex items-center gap-2 text-[19px] font-semibold`}><ShoppingBag size={18} className="text-[color:var(--btq-acento)]" /> Bolsa</p>
          {bolsa.length === 0 ? (
            <p className={`mt-2 text-[13px] ${TEXTO_SUAVE}`}>Vacía. Tocá una prenda para agregarla.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[color:var(--btq-borde)]">
              {bolsa.map((i) => (
                <li key={i.variante.varianteId} className="flex items-center gap-2 py-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ background: i.variante.colorHex ?? "#ccc" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{i.prenda.prenda.nombre}</p>
                    <p className={`text-[11.5px] ${TEXTO_SUAVE}`}>{i.variante.talle} · {i.variante.color}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Uno menos" onClick={() => setBolsa((b) => b.flatMap((x) => (x === i ? (x.cantidad > 1 ? [{ ...x, cantidad: x.cantidad - 1 }] : []) : [x])))} className="rounded-full border border-[color:var(--btq-borde)] p-1"><Minus size={11} /></button>
                    <span className="w-5 text-center text-[13px] tabular-nums">{i.cantidad}</span>
                    <button type="button" aria-label="Uno más" onClick={() => agregar(i.prenda, i.variante)} className="rounded-full border border-[color:var(--btq-borde)] p-1"><Plus size={11} /></button>
                  </div>
                  <span className="w-24 text-right text-[13px] tabular-nums">{gs(i.prenda.prenda.precioVenta * i.cantidad)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-baseline justify-between border-t border-[color:var(--btq-borde)] pt-3">
            <span className={`text-[13px] ${TEXTO_SUAVE}`}>Total</span>
            <span className={`${SERIF} text-[26px] font-semibold tabular-nums`}>{gs(total)}</span>
          </div>

          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Clienta">
                <input className={CAMPO} list="clientas-boutique" value={clientaNombre} onChange={(e) => elegirClienta(e.target.value)} placeholder="Nombre" />
                <datalist id="clientas-boutique">{clientas.map((c) => <option key={c.clientaId} value={c.nombre} />)}</datalist>
              </Campo>
              <Campo label="WhatsApp"><input className={CAMPO} inputMode="tel" value={clientaWhatsapp} onChange={(e) => setClientaWhatsapp(e.target.value)} placeholder="0981…" /></Campo>
            </div>
            <div className="flex flex-wrap gap-1.5">{MEDIOS_PAGO.map((m) => <Chip key={m} activo={medio === m} onClick={() => setMedio(m)}>{m}</Chip>)}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[12px] ${TEXTO_SUAVE}`}>Vino por:</span>
              {["Tienda", "WhatsApp", "Instagram", "Marketplace"].map((c) => <Chip key={c} activo={canal === c} onClick={() => setCanal(c)}>{c}</Chip>)}
            </div>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={apartado} onChange={(e) => setApartado(e.target.checked)} className="h-4 w-4 accent-[color:var(--btq-acento)]" />
              Apartado con seña (la prenda queda reservada)
            </label>
            {apartado && (
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Seña (Gs.)"><input className={CAMPO} inputMode="numeric" value={sena} onChange={(e) => setSena(e.target.value.replace(/\D/g, ""))} placeholder={String(Math.round(total * 0.3))} /></Campo>
                <Campo label="La guardo por (días)"><input className={CAMPO} inputMode="numeric" value={diasApartado} onChange={(e) => setDiasApartado(e.target.value.replace(/\D/g, ""))} /></Campo>
              </div>
            )}
            <button type="button" onClick={cobrar} disabled={!bolsa.length || enviando || (apartado && (!clientaNombre || !Number(sena)))} className={`${BOTON_PRIMARIO} w-full py-3 text-[14px]`}>
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {apartado ? `Apartar con seña de ${gs(Number(sena) || 0)}` : `Cobrar ${gs(total)}`}
            </button>
          </div>
        </Tarjeta>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <p className={`${SERIF} text-[19px] font-semibold`}>Apartados</p>
          <ul className="mt-2 space-y-2">
            {apartados.length === 0 && <li className={`text-[13px] ${TEXTO_SUAVE}`}>No hay prendas apartadas.</li>}
            {apartados.map((v) => {
              const vencido = v.venta.venceApartado && new Date(v.venta.venceApartado) < new Date(new Date().toDateString());
              return (
                <li key={v.venta.ventaId} className={`rounded-2xl px-3.5 py-2.5 ${vencido ? "bg-[color:var(--btq-rosa-bg)]" : "bg-[color:var(--btq-tinte)]"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-[13.5px] font-semibold">{v.clienta ?? "Clienta"}</p>
                    <p className="text-[12px] tabular-nums">Saldo <b>{gs(v.venta.total - v.venta.pagado)}</b> de {gs(v.venta.total)}</p>
                  </div>
                  <p className={`text-[12px] ${TEXTO_SUAVE}`}>{v.items.map((i) => i.descripcion).join(", ")} · {vencido ? "venció" : "vence"} el {v.venta.venceApartado ? fechaCorta(v.venta.venceApartado) : "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => cerrarApartado(v.venta.ventaId, true)} className={BOTON_PRIMARIO}>Cobrar saldo</button>
                    <button type="button" onClick={() => cerrarApartado(v.venta.ventaId, false)} className={BOTON}><Trash2 size={13} /> Liberar</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
        <Tarjeta>
          <p className={`${SERIF} text-[19px] font-semibold`}>Últimas ventas</p>
          <ul className="mt-2 divide-y divide-[color:var(--btq-borde)]">
            {recientes.length === 0 && <li className={`py-2 text-[13px] ${TEXTO_SUAVE}`}>Sin ventas en los últimos 7 días.</li>}
            {recientes.map((v) => (
              <li key={v.venta.ventaId} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px]">{v.items.map((i) => i.descripcion).join(", ")}</p>
                  <p className={`text-[11.5px] ${TEXTO_SUAVE}`}>{fechaCorta(v.venta.fecha)} · {v.clienta ?? "Sin nombre"} · {v.venta.medioPago ?? ""} · {v.venta.canal}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-semibold tabular-nums">{gs(v.venta.total)}</p>
                  <Estado estado={v.venta.estado} />
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      {elegida && (
        <Modal titulo={elegida.prenda.nombre} onClose={() => setElegida(null)}>
          <p className={`mb-3 text-[13px] ${TEXTO_SUAVE}`}>Elegí talle y color</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {elegida.variantes.map((v) => (
              <button key={v.varianteId} type="button" disabled={v.stock - enBolsa(v.varianteId) <= 0} onClick={() => agregar(elegida, v)} className="flex items-center gap-2 rounded-2xl border border-[color:var(--btq-borde)] bg-[color:var(--btq-card)] px-3 py-2.5 text-left hover:border-[color:var(--btq-foco)] disabled:opacity-40">
                <span className="h-5 w-5 shrink-0 rounded-full border border-black/10" style={{ background: v.colorHex ?? "#ccc" }} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{v.talle}</span>
                  <span className={`block truncate text-[11.5px] ${TEXTO_SUAVE}`}>{v.color} · {v.stock - enBolsa(v.varianteId)} disp.</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {hecha && (
        <Modal titulo={hecha.apartado ? "¡Prenda apartada!" : "¡Venta registrada!"} onClose={() => setHecha(null)}>
          <div className="space-y-3 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[color:var(--btq-lila-bg)] text-[color:var(--btq-lila)]"><CheckCircle2 size={32} /></div>
            <p className="text-[14px]">{hecha.detalle}</p>
            <p className={`${SERIF} text-[26px] font-semibold`}>{gs(hecha.pagado)}</p>
            {hecha.apartado && <p className={`text-[13px] ${TEXTO_SUAVE}`}>Saldo pendiente: {gs(hecha.total - hecha.pagado)}</p>}
            <p className={`text-[12.5px] ${TEXTO_SUAVE}`}>El stock ya se descontó también en el marketplace.</p>
            {hecha.whatsapp && (
              <a
                className={`${BOTON_PRIMARIO} w-full`}
                target="_blank"
                rel="noreferrer"
                href={linkWhatsapp(hecha.whatsapp, hecha.apartado
                  ? `¡Hola ${hecha.nombre.split(" ")[0]}! Te guardamos ${hecha.detalle} en ${tienda}. Seña: ${gs(hecha.pagado)}. Saldo: ${gs(hecha.total - hecha.pagado)}. ¡Te esperamos! 💜`
                  : `¡Gracias por tu compra en ${tienda}, ${hecha.nombre.split(" ")[0]}! ${hecha.detalle} · Total ${gs(hecha.total)}. Cualquier ajuste, escribinos. 💜`)}
              >
                <MessageCircle size={15} /> Mandarle el comprobante por WhatsApp
              </a>
            )}
            <button type="button" onClick={() => setHecha(null)} className={`${BOTON} w-full`}>Nueva venta</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
