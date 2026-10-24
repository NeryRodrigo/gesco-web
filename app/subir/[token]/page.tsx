"use client";

import { use, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { leerQrDeImagen } from "@/lib/qrImagen";

type Info = { cliente: string; ruc: string; estudio: string; recibidosMes: number };
type Resultado = { cargados: number; aprobados: number; observados: number; duplicados: number; mensajes: string[] };
type Item = { id: number; nombre: string; estado: "leyendo" | "ok" | "revisar" | "duplicada" | "error"; detalle?: string };

/**
 * Portal del cliente de VORDIA CONTA: el dueño del negocio abre el link privado que le mandó su contador,
 * saca foto al QR de cada factura (o sube el XML) y queda cargada en el estudio. Sin cuenta ni contraseña.
 */
export default function SubirFacturasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const camara = useRef<HTMLInputElement>(null);
  const xml = useRef<HTMLInputElement>(null);
  const siguienteId = useRef(1);

  useEffect(() => {
    let vivo = true;
    fetch(`${API_BASE}/api/public/conta/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (r.ok) setInfo(d);
        else setError(d.mensaje || "El link no es válido.");
      })
      .catch(() => vivo && setError("No pudimos conectarnos. Probá de nuevo en unos minutos."));
    return () => {
      vivo = false;
    };
  }, [token]);

  const actualizar = (id: number, cambios: Partial<Item>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...cambios } : i)));

  const interpretar = (id: number, r: Resultado) => {
    if (r.cargados && r.observados) actualizar(id, { estado: "revisar", detalle: "Recibida: tu contador va a revisar un detalle." });
    else if (r.cargados) actualizar(id, { estado: "ok", detalle: "Recibida y verificada." });
    else if (r.duplicados) actualizar(id, { estado: "duplicada", detalle: "Ya la tenías enviada." });
    else actualizar(id, { estado: "error", detalle: r.mensajes[0] ?? "No se pudo cargar." });
    if (r.cargados) setInfo((i) => (i ? { ...i, recibidosMes: i.recibidosMes + r.cargados } : i));
  };

  const fotos = async (archivos: FileList) => {
    for (const f of Array.from(archivos)) {
      const id = siguienteId.current++;
      setItems((prev) => [{ id, nombre: f.name || "Foto", estado: "leyendo" }, ...prev]);
      const texto = await leerQrDeImagen(f);
      if (!texto) {
        actualizar(id, { estado: "error", detalle: "No encontramos el QR. Sacá la foto más cerca, con buena luz y sin mover." });
        continue;
      }
      try {
        const r = await fetch(`${API_BASE}/api/public/conta/${encodeURIComponent(token)}/qr`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) actualizar(id, { estado: "error", detalle: d.mensaje || "No se pudo enviar." });
        else interpretar(id, d);
      } catch {
        actualizar(id, { estado: "error", detalle: "Sin conexión. Probá de nuevo." });
      }
    }
  };

  const subirXml = async (archivos: FileList) => {
    const id = siguienteId.current++;
    setItems((prev) => [{ id, nombre: `${archivos.length} archivo${archivos.length === 1 ? "" : "s"} XML`, estado: "leyendo" }, ...prev]);
    const fd = new FormData();
    Array.from(archivos).forEach((f) => fd.append("archivos", f));
    try {
      const r = await fetch(`${API_BASE}/api/public/conta/${encodeURIComponent(token)}/xml`, { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) actualizar(id, { estado: "error", detalle: d.mensaje || "No se pudo enviar." });
      else interpretar(id, d);
    } catch {
      actualizar(id, { estado: "error", detalle: "Sin conexión. Probá de nuevo." });
    }
  };

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 text-center">
        <div className="max-w-sm space-y-2"><XCircle className="mx-auto text-rose-500" size={36} /><p className="text-[15px] text-slate-700">{error}</p></div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 pb-12 pt-8 text-slate-900">
      <div className="mx-auto max-w-md space-y-5">
        <header className="space-y-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-teal-700">{info?.estudio ?? "Cargando…"}</p>
          <h1 className="text-[26px] font-bold leading-tight">Mandá tus facturas a tu contador</h1>
          {info && <p className="text-[14px] text-slate-600">{info.cliente} · RUC {info.ruc}</p>}
        </header>

        <button
          type="button"
          onClick={() => camara.current?.click()}
          disabled={!info}
          className="flex w-full flex-col items-center gap-2 rounded-3xl bg-teal-600 px-5 py-8 text-white shadow-lg shadow-teal-600/25 active:scale-[0.99] disabled:opacity-60"
        >
          <Camera size={40} />
          <span className="text-[19px] font-bold">Sacar foto al QR de la factura</span>
          <span className="text-[13px] text-teal-50/90">Podés elegir varias fotos a la vez</span>
        </button>
        <input ref={camara} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => e.target.files && void fotos(e.target.files)} />

        <button type="button" onClick={() => xml.current?.click()} disabled={!info} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[15px] font-medium text-slate-700 disabled:opacity-60">
          <FileUp size={18} /> Tengo el archivo XML
        </button>
        <input ref={xml} type="file" accept=".xml,.zip" multiple hidden onChange={(e) => e.target.files && void subirXml(e.target.files)} />

        {info && <p className="text-center text-[13px] text-slate-500">Este mes ya enviaste {info.recibidosMes} factura{info.recibidosMes === 1 ? "" : "s"} desde este link.</p>}

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                {i.estado === "leyendo" ? <Loader2 className="mt-0.5 animate-spin text-slate-400" size={18} />
                  : i.estado === "ok" ? <CheckCircle2 className="mt-0.5 text-teal-600" size={18} />
                  : i.estado === "error" ? <XCircle className="mt-0.5 text-rose-500" size={18} />
                  : <AlertTriangle className="mt-0.5 text-amber-500" size={18} />}
                <span className="min-w-0 text-[14px]"><span className="block truncate font-medium">{i.nombre}</span><span className="text-slate-500">{i.estado === "leyendo" ? "Leyendo el QR…" : i.detalle}</span></span>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-2xl bg-white p-4 text-[13px] leading-relaxed text-slate-600">
          <b className="text-slate-800">¿Cómo funciona?</b> Las facturas electrónicas tienen un código QR. Al sacarle foto, leemos el número, el RUC, la fecha y los montos directo del QR, sin que tengas que escribir nada. La foto no se guarda: solo los datos de la factura.
        </div>
        <p className="text-center text-[11px] text-slate-400">Link privado de tu estudio contable · <a href="/privacidad" className="underline">Privacidad</a> · VORDIA CONTA</p>
      </div>
    </main>
  );
}
