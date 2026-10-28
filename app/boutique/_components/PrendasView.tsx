"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, EyeOff, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import {
  btqApi, CATEGORIAS, COLORES_SUGERIDOS, gs, OCASIONES, TALLES_COMUNES, type BtqPrendaFila, type Modalidad,
} from "@/lib/boutiqueApi";
import { PrendaArte } from "@/components/boutique/PrendaArte";
import { BOTON, BOTON_PRIMARIO, Campo, CAMPO, Chip, Modal, SELECT_CORTO, SERIF, TEXTO_SUAVE, Vacio } from "@/components/boutique/BoutiqueUI";
import type { ContextoBoutique } from "./BoutiqueApp";

/** Foto de una prenda propia: se pide con la sesión (sirve aunque la prenda no esté publicada). */
export function FotoAdmin({ empresaId, fotoId, categoria, color, className = "" }: { empresaId: number; fotoId?: number; categoria: string; color?: string | null; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!fotoId) return;
    let vivo = true;
    let creada: string | null = null;
    fetch(`${API_BASE}/api/Boutique/fotos/${fotoId}?empresaId=${empresaId}`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!vivo || !b) return;
        creada = URL.createObjectURL(b);
        setUrl(creada);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [empresaId, fotoId]);
  if (!fotoId || !url) return <PrendaArte categoria={categoria} color={color} className={`h-full w-full ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={`h-full w-full object-cover ${className}`} />;
}

export function PrendasView({ ctx }: { ctx: ContextoBoutique }) {
  const [buscar, setBuscar] = useState("");
  const [categoria, setCategoria] = useState("");
  const [editando, setEditando] = useState<BtqPrendaFila | "nueva" | null>(null);

  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return ctx.prendas.filter(
      (p) => (!categoria || p.prenda.categoria === categoria) && (!q || `${p.prenda.nombre} ${p.variantes.map((v) => v.color).join(" ")}`.toLowerCase().includes(q)),
    );
  }, [ctx.prendas, buscar, categoria]);

  const totalUnidades = ctx.prendas.reduce((s, p) => s + p.stock, 0);
  const categorias = CATEGORIAS.filter((c) => ctx.prendas.some((p) => p.prenda.categoria === c));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`${SERIF} text-[28px] font-semibold`}>Prendas y stock</h1>
          <p className={`text-[13px] ${TEXTO_SUAVE}`}>{ctx.prendas.length} prendas · {totalUnidades} unidades. Lo que vendés en la tienda se descuenta del marketplace al instante.</p>
        </div>
        <button type="button" onClick={() => setEditando("nueva")} className={BOTON_PRIMARIO}><Plus size={16} /> Nueva prenda</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B3A3C4]" />
          <input className={`${CAMPO} pl-10`} placeholder="Buscar por nombre o color" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <Chip activo={!categoria} onClick={() => setCategoria("")}>Todas</Chip>
          {categorias.map((c) => <Chip key={c} activo={categoria === c} onClick={() => setCategoria(c)}>{c}</Chip>)}
        </div>
      </div>

      {ctx.prendas.length === 0 ? (
        <Vacio titulo="Todavía no cargaste prendas" texto="Cargá la prenda una vez con todos sus talles y colores: el stock queda separado por cada combinación." accion={<button type="button" onClick={() => setEditando("nueva")} className={BOTON_PRIMARIO}><Plus size={15} /> Nueva prenda</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {lista.map((p) => (
            <button key={p.prenda.prendaId} type="button" onClick={() => setEditando(p)} className="group overflow-hidden rounded-3xl border border-[#EBDDF5] bg-white/85 text-left shadow-[0_14px_40px_-28px_rgba(142,108,207,0.6)] transition hover:-translate-y-0.5">
              <div className="relative aspect-[4/5] overflow-hidden">
                <FotoAdmin empresaId={ctx.empresaId} fotoId={p.fotos[0]} categoria={p.prenda.categoria} color={p.prenda.colorHex} className="transition duration-500 group-hover:scale-[1.03]" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#4A3466]">{p.prenda.modalidad === "Ambos" ? "Venta y alquiler" : p.prenda.modalidad}</span>
                {!p.prenda.publicada && <span className="absolute right-2 top-2 rounded-full bg-[#2B1B3D]/80 p-1 text-white" title="No se muestra en el marketplace"><EyeOff size={13} /></span>}
                {p.stock === 0 && <span className="absolute inset-x-0 bottom-0 bg-[#B0135E]/85 py-1 text-center text-[11.5px] font-semibold text-white">Sin stock</span>}
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-1 text-[13.5px] font-semibold">{p.prenda.nombre}</p>
                <p className="text-[12.5px] tabular-nums text-[#6A4BC4]">
                  {p.prenda.precioVenta > 0 && gs(p.prenda.precioVenta)}
                  {p.prenda.precioVenta > 0 && p.prenda.precioAlquiler > 0 && " · "}
                  {p.prenda.precioAlquiler > 0 && `Alq. ${gs(p.prenda.precioAlquiler)}`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(p.variantes.map((v) => v.talle))).map((t) => {
                    const st = p.variantes.filter((v) => v.talle === t).reduce((s, v) => s + v.stock, 0);
                    return <span key={t} className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${st === 0 ? "bg-slate-100 text-slate-400 line-through" : "bg-[#F4EEFF] text-[#5B3DB0]"}`}>{t} {st > 0 && <span className="font-normal">×{st}</span>}</span>;
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {editando && <PrendaForm ctx={ctx} fila={editando === "nueva" ? null : editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

type VarianteForm = { varianteId?: number; talle: string; color: string; colorHex?: string | null; stock: number; bustoCm?: number | null; cinturaCm?: number | null; caderaCm?: number | null; largoCm?: number | null };

function PrendaForm({ ctx, fila, onClose }: { ctx: ContextoBoutique; fila: BtqPrendaFila | null; onClose: () => void }) {
  const p = fila?.prenda;
  const [nombre, setNombre] = useState(p?.nombre ?? "");
  const [categoria, setCategoria] = useState(p?.categoria ?? "Vestidos");
  const [ocasiones, setOcasiones] = useState<string[]>(p?.ocasiones?.split(",").map((o) => o.trim()).filter(Boolean) ?? []);
  const [modalidad, setModalidad] = useState<Modalidad>(p?.modalidad ?? "Venta");
  const [precioVenta, setPrecioVenta] = useState(p?.precioVenta ? String(p.precioVenta) : "");
  const [precioAnterior, setPrecioAnterior] = useState(p?.precioAnterior ? String(p.precioAnterior) : "");
  const [precioAlquiler, setPrecioAlquiler] = useState(p?.precioAlquiler ? String(p.precioAlquiler) : "");
  const [garantia, setGarantia] = useState(p?.garantia ? String(p.garantia) : "");
  const [dias, setDias] = useState(String(p?.diasAlquiler ?? 4));
  const [material, setMaterial] = useState(p?.material ?? "");
  const [descripcion, setDescripcion] = useState(p?.descripcion ?? "");
  const [publicada, setPublicada] = useState(p?.publicada ?? true);
  const [variantes, setVariantes] = useState<VarianteForm[]>(fila?.variantes.map((v) => ({ ...v })) ?? []);
  const [fotos, setFotos] = useState<number[]>(fila?.fotos ?? []);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [nuevoTalle, setNuevoTalle] = useState("");
  const inputFoto = useRef<HTMLInputElement>(null);

  const talles = Array.from(new Set(variantes.map((v) => v.talle)));
  const colores = Array.from(new Map(variantes.map((v) => [v.color, v.colorHex])).entries());

  const agregarTalle = (t: string) => {
    const talle = t.trim().toUpperCase() === "ÚNICO" ? "Único" : t.trim().toUpperCase();
    if (!talle || talles.includes(talle)) return;
    const cols = colores.length ? colores : [];
    setVariantes((vs) => [...vs, ...cols.map(([c, hex]) => ({ talle, color: c, colorHex: hex, stock: 1 }))]);
    if (!cols.length) setVariantes((vs) => [...vs, { talle, color: "", stock: 1 }]);
  };
  const agregarColor = (c: { nombre: string; hex: string }) => {
    if (colores.some(([n]) => n === c.nombre)) return;
    setVariantes((vs) => {
      const sinColor = vs.filter((v) => v.color === "");
      if (sinColor.length) return vs.map((v) => (v.color === "" ? { ...v, color: c.nombre, colorHex: c.hex } : v));
      const ts = Array.from(new Set(vs.map((v) => v.talle)));
      return [...vs, ...(ts.length ? ts : ["M"]).map((t) => ({ talle: t, color: c.nombre, colorHex: c.hex, stock: 1 }))];
    });
  };
  const quitarTalle = (t: string) => setVariantes((vs) => vs.filter((v) => v.talle !== t));
  const quitarColor = (c: string) => setVariantes((vs) => vs.filter((v) => v.color !== c));
  const cambiarStock = (talle: string, color: string, stock: number) =>
    setVariantes((vs) => vs.map((v) => (v.talle === talle && v.color === color ? { ...v, stock: Math.max(0, stock) } : v)));

  const guardar = async () => {
    const validas = variantes.filter((v) => v.color);
    if (!validas.length) {
      toast.error("Agregá al menos un talle y un color");
      return;
    }
    setGuardando(true);
    try {
      const body = {
        nombre, categoria, ocasiones: ocasiones.join(", "), modalidad, material, descripcion, publicada,
        precioVenta: Number(precioVenta) || 0, precioAnterior: Number(precioAnterior) || null, precioAlquiler: Number(precioAlquiler) || 0,
        garantia: Number(garantia) || 0, diasAlquiler: Number(dias) || 4, colorHex: validas[0].colorHex, variantes: validas,
      };
      await btqApi(p ? `/api/Boutique/prendas/${p.prendaId}?empresaId=${ctx.empresaId}` : `/api/Boutique/prendas?empresaId=${ctx.empresaId}`, {
        method: p ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      toast.success(p ? "Prenda actualizada" : "Prenda cargada: ya está en tu vidriera");
      ctx.recargar();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const subirFotos = async (archivos: FileList | null) => {
    if (!archivos?.length || !p) return;
    setSubiendo(true);
    for (const a of Array.from(archivos)) {
      const fd = new FormData();
      fd.append("archivo", a);
      try {
        const r = await btqApi<{ fotoId: number }>(`/api/Boutique/prendas/${p.prendaId}/fotos?empresaId=${ctx.empresaId}`, { method: "POST", body: fd });
        setFotos((f) => [...f, r.fotoId]);
      } catch (e) {
        toast.error(`${a.name}: ${e instanceof Error ? e.message : "no se pudo subir"}`);
      }
    }
    setSubiendo(false);
    ctx.recargar();
  };

  const borrarFoto = async (fotoId: number) => {
    try {
      await btqApi(`/api/Boutique/fotos/${fotoId}?empresaId=${ctx.empresaId}`, { method: "DELETE" });
      setFotos((f) => f.filter((x) => x !== fotoId));
      ctx.recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar");
    }
  };

  const eliminar = async () => {
    if (!p || !confirm(`¿Quitar "${p.nombre}" de tu boutique? Las ventas y alquileres anteriores se conservan.`)) return;
    try {
      await btqApi(`/api/Boutique/prendas/${p.prendaId}?empresaId=${ctx.empresaId}`, { method: "DELETE" });
      toast.success("Prenda quitada");
      ctx.recargar();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo quitar");
    }
  };

  return (
    <Modal titulo={p ? "Editar prenda" : "Nueva prenda"} onClose={onClose} ancho="sm:max-w-3xl">
      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        {/* Fotos */}
        <div className="space-y-2">
          <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-[#EBDDF5]">
            <FotoAdmin empresaId={ctx.empresaId} fotoId={fotos[0]} categoria={categoria} color={variantes[0]?.colorHex} />
          </div>
          {fotos.length > 1 && (
            <div className="grid grid-cols-4 gap-1.5">
              {fotos.slice(1).map((f) => (
                <div key={f} className="relative aspect-square overflow-hidden rounded-xl">
                  <FotoAdmin empresaId={ctx.empresaId} fotoId={f} categoria={categoria} />
                  <button type="button" onClick={() => borrarFoto(f)} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5" aria-label="Borrar foto"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
          {p ? (
            <>
              <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" className="hidden" onChange={(e) => subirFotos(e.target.files)} />
              <button type="button" onClick={() => inputFoto.current?.click()} disabled={subiendo} className={`${BOTON} w-full`}>
                {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {fotos.length ? "Agregar fotos" : "Sacar o subir fotos"}
              </button>
              {fotos[0] && <button type="button" onClick={() => borrarFoto(fotos[0])} className={`w-full text-[12px] ${TEXTO_SUAVE} hover:text-[#B0135E]`}>Quitar foto principal</button>}
            </>
          ) : (
            <p className={`text-[12px] ${TEXTO_SUAVE}`}>Guardá la prenda y después le agregás las fotos. Mientras tanto se muestra este dibujo en su color.</p>
          )}
        </div>

        {/* Datos */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
            <Campo label="Nombre"><input className={CAMPO} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Vestido Aurora de satén" /></Campo>
            <Campo label="Categoría">
              <select className={CAMPO} value={categoria} onChange={(e) => setCategoria(e.target.value)}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select>
            </Campo>
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-[#4A3466]">¿Para qué ocasiones?</span>
            <div className="flex flex-wrap gap-1.5">
              {OCASIONES.map((o) => (
                <Chip key={o} activo={ocasiones.includes(o)} onClick={() => setOcasiones((os) => (os.includes(o) ? os.filter((x) => x !== o) : [...os, o]))}>{o}</Chip>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-[#4A3466]">¿Se vende, se alquila o las dos?</span>
            <div className="flex flex-wrap gap-1.5">
              {(["Venta", "Alquiler", "Ambos"] as Modalidad[]).map((m) => (
                <Chip key={m} activo={modalidad === m} onClick={() => setModalidad(m)}>{m === "Ambos" ? "Venta y alquiler" : m}</Chip>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {modalidad !== "Alquiler" && (
              <>
                <Campo label="Precio de venta (Gs.)"><input className={CAMPO} inputMode="numeric" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value.replace(/\D/g, ""))} placeholder="590000" /></Campo>
                <Campo label="Precio antes (opcional)" ayuda="Si está en oferta: se muestra tachado"><input className={CAMPO} inputMode="numeric" value={precioAnterior} onChange={(e) => setPrecioAnterior(e.target.value.replace(/\D/g, ""))} /></Campo>
              </>
            )}
            {modalidad !== "Venta" && (
              <>
                <Campo label="Precio de alquiler (Gs.)" ayuda={`Por ${dias} días (retira el día antes del evento)`}><input className={CAMPO} inputMode="numeric" value={precioAlquiler} onChange={(e) => setPrecioAlquiler(e.target.value.replace(/\D/g, ""))} placeholder="320000" /></Campo>
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Garantía (Gs.)"><input className={CAMPO} inputMode="numeric" value={garantia} onChange={(e) => setGarantia(e.target.value.replace(/\D/g, ""))} /></Campo>
                  <Campo label="Días"><input className={CAMPO} inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))} /></Campo>
                </div>
              </>
            )}
          </div>

          {/* Talles × colores */}
          <div className="rounded-3xl border border-[#EBDDF5] bg-white p-3.5">
            <p className="text-[12px] font-semibold text-[#4A3466]">Talles, colores y stock</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {TALLES_COMUNES.filter((t) => !talles.includes(t)).map((t) => (
                <button key={t} type="button" onClick={() => agregarTalle(t)} className="rounded-full border border-dashed border-[#DCC8F0] px-2.5 py-1 text-[12px] text-[#7A6690] hover:border-[#B58BE0]">+ {t}</button>
              ))}
              <input className={`${SELECT_CORTO} w-24`} placeholder="Otro: 38" value={nuevoTalle} onChange={(e) => setNuevoTalle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarTalle(nuevoTalle); setNuevoTalle(""); } }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COLORES_SUGERIDOS.filter((c) => !colores.some(([n]) => n === c.nombre)).map((c) => (
                <button key={c.nombre} type="button" onClick={() => agregarColor(c)} title={c.nombre} className="h-6 w-6 rounded-full border-2 border-white shadow ring-1 ring-[#E6D6F2] hover:scale-110" style={{ background: c.hex }} aria-label={`Agregar color ${c.nombre}`} />
              ))}
            </div>
            {talles.length > 0 && colores.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr>
                      <th className="p-1 text-left font-medium text-[#7A6690]">Color \ Talle</th>
                      {talles.map((t) => (
                        <th key={t} className="p-1 font-semibold">
                          <span className="inline-flex items-center gap-1">{t}<button type="button" onClick={() => quitarTalle(t)} aria-label={`Quitar talle ${t}`} className="text-[#B3A3C4] hover:text-[#B0135E]"><X size={11} /></button></span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {colores.filter(([c]) => c).map(([c, hex]) => (
                      <tr key={c}>
                        <td className="p-1">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: hex ?? "#ccc" }} />{c}<button type="button" onClick={() => quitarColor(c)} aria-label={`Quitar color ${c}`} className="text-[#B3A3C4] hover:text-[#B0135E]"><X size={11} /></button></span>
                        </td>
                        {talles.map((t) => {
                          const v = variantes.find((x) => x.talle === t && x.color === c);
                          return (
                            <td key={t} className="p-1 text-center">
                              {v ? (
                                <input aria-label={`Stock ${c} ${t}`} className="w-14 rounded-xl border border-[#E6D6F2] px-1.5 py-1 text-center tabular-nums focus:border-[#B58BE0] focus:outline-none" inputMode="numeric" value={v.stock} onChange={(e) => cambiarStock(t, c, Number(e.target.value.replace(/\D/g, "")) || 0)} />
                              ) : (
                                <button type="button" onClick={() => setVariantes((vs) => [...vs, { talle: t, color: c, colorHex: hex, stock: 1 }])} className="text-[#B3A3C4]">+</button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(!talles.length || !colores.some(([c]) => c)) && <p className={`mt-2 text-[12px] ${TEXTO_SUAVE}`}>Tocá los talles que tenés y después los colores: se arma la grilla para cargar el stock.</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Material"><input className={CAMPO} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Satén de seda con forro" /></Campo>
            <label className="flex items-center gap-2 self-end rounded-2xl border border-[#E6D6F2] bg-white px-3.5 py-2.5 text-[13px]">
              <input type="checkbox" checked={publicada} onChange={(e) => setPublicada(e.target.checked)} className="h-4 w-4 accent-[#C77DD8]" />
              Mostrar en el marketplace VORDIA CLOSET
            </label>
          </div>
          <Campo label="Descripción" ayuda="Cómo cae, qué la hace especial, si se ajusta">
            <textarea className={`${CAMPO} min-h-[80px]`} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Campo>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {p ? <button type="button" onClick={eliminar} className={`${BOTON} text-[#B0135E]`}><Trash2 size={14} /> Quitar</button> : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={BOTON}>Cancelar</button>
              <button type="button" onClick={guardar} disabled={guardando || !nombre.trim()} className={BOTON_PRIMARIO}>
                {guardando ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />} {p ? "Guardar cambios" : "Cargar prenda"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
