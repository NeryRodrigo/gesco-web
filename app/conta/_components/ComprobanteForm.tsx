"use client";

import { useState } from "react";
import { toast } from "sonner";
import { contaApi, TIPOS_COMPROBANTE, type ContaCliente, type ContaComprobante, type ContaComprobanteRequest } from "@/lib/contaApi";
import { BOTON, BOTON_PRIMARIO, CAMPO, Modal } from "./ContaUI";

const numero = (s: string) => Number(s.replace(/\D/g, "")) || 0;
const miles = (n: number) => (n ? n.toLocaleString("es-PY") : "");

/** Alta o corrección de un comprobante (los preimpresos se cargan a mano; los electrónicos se corrigen solo si hace falta). */
export function ComprobanteForm({
  empresaId, clientes, inicial, clienteInicial, onClose, onGuardado,
}: {
  empresaId: number; clientes: ContaCliente[]; inicial?: ContaComprobante | null; clienteInicial?: number;
  onClose: () => void; onGuardado: () => void;
}) {
  const [f, setF] = useState<ContaComprobanteRequest>(() => ({
    clienteId: inicial?.clienteId ?? clienteInicial ?? clientes[0]?.clienteId ?? 0,
    tipo: inicial?.tipo ?? "Compra",
    tipoComprobante: inicial?.tipoComprobante ?? 109,
    timbrado: inicial?.timbrado ?? "",
    numero: inicial?.numero ?? "",
    fecha: (inicial?.fecha ?? new Date().toISOString()).slice(0, 10),
    credito: inicial?.credito ?? false,
    contraparteTipoId: inicial?.contraparteTipoId ?? 11,
    contraparte: inicial ? (inicial.contraparteDv ? `${inicial.contraparteDoc}-${inicial.contraparteDv}` : inicial.contraparteDoc) : "",
    contraparteNombre: inicial?.contraparteNombre ?? "",
    gravado10: inicial?.gravado10 ?? 0,
    gravado5: inicial?.gravado5 ?? 0,
    exento: inicial?.exento ?? 0,
    numeroAsociado: inicial?.numeroAsociado ?? "",
    timbradoAsociado: inicial?.timbradoAsociado ?? "",
  }));
  const [guardando, setGuardando] = useState(false);
  const total = f.gravado10 + f.gravado5 + f.exento;
  const set = <K extends keyof ContaComprobanteRequest>(k: K, v: ContaComprobanteRequest[K]) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const x = await contaApi<ContaComprobante>(
        inicial ? `/api/Conta/comprobantes/${inicial.comprobanteId}?empresaId=${empresaId}` : `/api/Conta/comprobantes?empresaId=${empresaId}`,
        { method: inicial ? "PUT" : "POST", body: JSON.stringify(f) },
      );
      if (x.estado === "Observado") toast.warning("Guardado con observaciones", { description: x.observaciones ?? undefined });
      else toast.success("Comprobante guardado y validado");
      onGuardado();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={inicial ? `Corregir ${inicial.numero}` : "Cargar comprobante preimpreso"} onClose={onClose}>
      <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] text-slate-400 sm:col-span-2">Cliente
          <select className={CAMPO} value={f.clienteId} disabled={!!inicial} onChange={(e) => set("clienteId", Number(e.target.value))}>
            {clientes.map((c) => <option key={c.clienteId} value={c.clienteId}>{c.razonSocial} · {c.ruc}-{c.dv}</option>)}
          </select>
        </label>
        <label className="text-[12px] text-slate-400">Libro
          <select className={CAMPO} value={f.tipo} onChange={(e) => set("tipo", e.target.value as "Compra" | "Venta")}>
            <option value="Compra">Compra</option><option value="Venta">Venta</option>
          </select>
        </label>
        <label className="text-[12px] text-slate-400">Comprobante
          <select className={CAMPO} value={f.tipoComprobante} onChange={(e) => set("tipoComprobante", Number(e.target.value))}>
            {Object.entries(TIPOS_COMPROBANTE).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
          </select>
        </label>
        <label className="text-[12px] text-slate-400">Fecha
          <input type="date" className={CAMPO} value={f.fecha} onChange={(e) => set("fecha", e.target.value)} required />
        </label>
        <label className="text-[12px] text-slate-400">Condición
          <select className={CAMPO} value={f.credito ? "2" : "1"} onChange={(e) => set("credito", e.target.value === "2")}>
            <option value="1">Contado</option><option value="2">Crédito</option>
          </select>
        </label>
        <label className="text-[12px] text-slate-400">Timbrado (8 dígitos)
          <input className={CAMPO} inputMode="numeric" maxLength={8} value={f.timbrado} onChange={(e) => set("timbrado", e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="text-[12px] text-slate-400">Número (001-001-0000001)
          <input className={CAMPO} value={f.numero} onChange={(e) => set("numero", e.target.value)} placeholder="001-001-0000001" />
        </label>
        <label className="text-[12px] text-slate-400">{f.tipo === "Compra" ? "RUC del proveedor" : "RUC o documento del cliente"}
          <input className={CAMPO} value={f.contraparte} onChange={(e) => set("contraparte", e.target.value)} placeholder="80012345-6" required />
        </label>
        <label className="text-[12px] text-slate-400">Razón social (opcional si tiene RUC)
          <input className={CAMPO} value={f.contraparteNombre ?? ""} onChange={(e) => set("contraparteNombre", e.target.value)} />
        </label>
        {(["gravado10", "gravado5", "exento"] as const).map((k) => (
          <label key={k} className="text-[12px] text-slate-400">{k === "gravado10" ? "Gravado 10% (IVA incluido)" : k === "gravado5" ? "Gravado 5% (IVA incluido)" : "Exento"}
            <input className={CAMPO} inputMode="numeric" value={miles(f[k])} onChange={(e) => set(k, numero(e.target.value))} placeholder="0" />
          </label>
        ))}
        <div className="flex items-end text-[13px] text-slate-300">
          Total <b className="ml-2 tabular-nums text-white">Gs {total.toLocaleString("es-PY")}</b>
          <span className="ml-3 text-[11px] text-slate-500">IVA {Math.round(f.gravado10 / 11 + f.gravado5 / 21).toLocaleString("es-PY")}</span>
        </div>
        {(f.tipoComprobante === 110 || f.tipoComprobante === 111) && (
          <>
            <label className="text-[12px] text-slate-400">Factura asociada
              <input className={CAMPO} value={f.numeroAsociado ?? ""} onChange={(e) => set("numeroAsociado", e.target.value)} placeholder="001-001-0000001" />
            </label>
            <label className="text-[12px] text-slate-400">Timbrado de la factura asociada
              <input className={CAMPO} value={f.timbradoAsociado ?? ""} onChange={(e) => set("timbradoAsociado", e.target.value.replace(/\D/g, ""))} />
            </label>
          </>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className={BOTON}>Cancelar</button>
          <button disabled={guardando || !f.clienteId} className={BOTON_PRIMARIO}>Guardar y validar</button>
        </div>
      </form>
    </Modal>
  );
}
