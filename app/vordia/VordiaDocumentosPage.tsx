"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  Upload,
  Link2,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  Download,
  AlertTriangle,
  Clock,
  HardDrive,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

type Documento = {
  documentoId: number;
  clienteId?: number | null;
  clienteNombre?: string | null;
  titulo: string;
  categoria: string;
  nombreArchivo?: string | null;
  url: string;
  esEnlaceExterno: boolean;
  extension?: string | null;
  tamanoBytes: number;
  tamanoTexto: string;
  fechaVencimiento?: string | null;
  diasParaVencer?: number | null;
  estadoVencimiento: "sin_vencimiento" | "vigente" | "por_vencer" | "vencido";
  notas?: string | null;
  subidoPor?: string | null;
  fechaCreacion: string;
};

type Resumen = {
  total: number;
  porVencer: number;
  vencidos: number;
  sinVencimiento: number;
  tamanoTotalMb: number;
  porCategoria: { categoria: string; cantidad: number }[];
};

type ClienteCombo = { clienteId: number; razonSocial: string };

type Props = { empresaId: number; usuarioNombre?: string };

const CATEGORIAS = ["Contrato", "Propuesta", "Acta", "Legal", "Factura", "Tecnico", "Otro"];

const emptyForm = {
  titulo: "",
  categoria: "Contrato",
  clienteId: "",
  fechaVencimiento: "",
  notas: "",
  url: "",
};

function badgeVencimiento(estado: Documento["estadoVencimiento"]) {
  if (estado === "vencido") return "bg-red-500/20 text-red-300 border-red-500/30";
  if (estado === "por_vencer") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (estado === "vigente") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  return "bg-white/5 text-slate-400 border-white/10";
}

function textoVencimiento(d: Documento) {
  if (d.fechaVencimiento == null || d.diasParaVencer == null) return "Sin vencimiento";
  const fecha = new Date(d.fechaVencimiento).toLocaleDateString("es-PY");
  if (d.diasParaVencer < 0) return `Vencido el ${fecha}`;
  if (d.diasParaVencer === 0) return `Vence hoy (${fecha})`;
  return `Vence en ${d.diasParaVencer} días (${fecha})`;
}

export function VordiaDocumentosPage({ empresaId, usuarioNombre }: Props) {
  const [items, setItems] = useState<Documento[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [clientes, setClientes] = useState<ClienteCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [categoria, setCategoria] = useState("");
  const [soloPorVencer, setSoloPorVencer] = useState(false);

  const [modal, setModal] = useState<"archivo" | "enlace" | "editar" | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ empresaId: String(empresaId) });
      if (categoria) params.set("categoria", categoria);
      if (soloPorVencer) params.set("porVencer", "true");

      const [dRes, rRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/api/Crm/documentos?${params}`),
        fetch(`${API_BASE}/api/Crm/documentos/resumen?empresaId=${empresaId}`),
        fetch(`${API_BASE}/api/Crm/clientes?empresaId=${empresaId}`),
      ]);

      if (!dRes.ok) {
        const err = await dRes.json().catch(() => null);
        if (dRes.status === 401) throw new Error("Sesión vencida: volvé a iniciar sesión.");
        throw new Error(err?.mensaje || `El servidor respondió ${dRes.status}.`);
      }
      setItems(await dRes.json());
      if (rRes.ok) setResumen(await rRes.json());
      if (cRes.ok) setClientes(await cRes.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar los documentos (¿ejecutaste el script SQL?)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) void cargar();
  }, [empresaId, categoria, soloPorVencer]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (d) =>
        d.titulo.toLowerCase().includes(q) ||
        d.categoria.toLowerCase().includes(q) ||
        (d.clienteNombre || "").toLowerCase().includes(q) ||
        (d.notas || "").toLowerCase().includes(q)
    );
  }, [items, filtro]);

  const abrirModal = (tipo: "archivo" | "enlace") => {
    setEditId(null);
    setArchivo(null);
    setForm({ ...emptyForm });
    setModal(tipo);
  };

  const abrirEditar = (d: Documento) => {
    setEditId(d.documentoId);
    setForm({
      titulo: d.titulo,
      categoria: d.categoria,
      clienteId: d.clienteId ? String(d.clienteId) : "",
      fechaVencimiento: d.fechaVencimiento ? d.fechaVencimiento.substring(0, 10) : "",
      notas: d.notas || "",
      url: d.url,
    });
    setModal("editar");
  };

  const subirArchivo = async () => {
    if (!archivo) {
      toast.error("Elegí un archivo");
      return;
    }
    const fd = new FormData();
    fd.append("empresaId", String(empresaId));
    fd.append("titulo", form.titulo.trim() || archivo.name);
    fd.append("categoria", form.categoria);
    if (form.clienteId) fd.append("clienteId", form.clienteId);
    if (form.fechaVencimiento) fd.append("fechaVencimiento", form.fechaVencimiento);
    if (form.notas.trim()) fd.append("notas", form.notas.trim());
    if (usuarioNombre) fd.append("subidoPor", usuarioNombre);
    fd.append("archivo", archivo);

    setGuardando(true);
    try {
      const r = await fetch(`${API_BASE}/api/Crm/documentos/upload`, { method: "POST", body: fd });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        throw new Error(err?.mensaje || "No se pudo subir el archivo");
      }
      toast.success("Documento subido");
      setModal(null);
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo");
    } finally {
      setGuardando(false);
    }
  };

  const guardarEnlace = async () => {
    if (!form.titulo.trim() || !form.url.trim()) {
      toast.error("Título y enlace son obligatorios");
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch(`${API_BASE}/api/Crm/documentos/enlace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          titulo: form.titulo.trim(),
          categoria: form.categoria,
          url: form.url.trim(),
          clienteId: form.clienteId ? Number(form.clienteId) : null,
          fechaVencimiento: form.fechaVencimiento || null,
          notas: form.notas.trim() || null,
          subidoPor: usuarioNombre || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        throw new Error(err?.mensaje || "No se pudo guardar el enlace");
      }
      toast.success("Enlace guardado");
      setModal(null);
      void cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el enlace");
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async () => {
    if (!editId || !form.titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch(`${API_BASE}/api/Crm/documentos/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          titulo: form.titulo.trim(),
          categoria: form.categoria,
          clienteId: form.clienteId ? Number(form.clienteId) : null,
          fechaVencimiento: form.fechaVencimiento || null,
          notas: form.notas.trim() || null,
        }),
      });
      if (!r.ok) throw new Error();
      toast.success("Documento actualizado");
      setModal(null);
      void cargar();
    } catch {
      toast.error("No se pudo actualizar el documento");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (d: Documento) => {
    if (!confirm(`¿Quitar "${d.titulo}" del repositorio?`)) return;
    const r = await fetch(`${API_BASE}/api/Crm/documentos/${d.documentoId}?empresaId=${empresaId}`, {
      method: "DELETE",
    });
    if (r.ok) {
      toast.success("Documento quitado");
      void cargar();
    } else toast.error("No se pudo quitar el documento");
  };

  /** Los archivos no son públicos: se piden con la sesión y se abren desde el navegador. */
  const abrirDocumento = async (d: Documento) => {
    if (d.esEnlaceExterno) {
      window.open(d.url, "_blank", "noopener");
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/Crm/documentos/${d.documentoId}/archivo?empresaId=${empresaId}`);
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        throw new Error(err?.mensaje || "No se pudo abrir el archivo");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el archivo");
    }
  };

  const tituloModal =
    modal === "archivo" ? "Subir documento" : modal === "enlace" ? "Guardar enlace" : "Editar documento";

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-[1.5rem] border border-white/5 bg-[#0C1327] p-4 lg:p-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderOpen size={18} className="text-[#5eb0ff]" /> Documentos
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Contratos, propuestas, actas y archivos por cliente. Los que vencen alimentan las automatizaciones.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => abrirModal("enlace")}
            variant="ghost"
            className="rounded-xl font-bold gap-2 text-slate-300 border border-white/10"
          >
            <Link2 size={16} /> Enlace
          </Button>
          <Button onClick={() => abrirModal("archivo")} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
            <Upload size={16} /> Subir archivo
          </Button>
        </div>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/5 bg-[#0C1327] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500 font-bold">
              <FileText size={13} /> Documentos
            </div>
            <p className="text-2xl font-bold text-white mt-1">{resumen.total}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0C1327] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-amber-400/80 font-bold">
              <Clock size={13} /> Por vencer
            </div>
            <p className="text-2xl font-bold text-amber-300 mt-1">{resumen.porVencer}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0C1327] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-red-400/80 font-bold">
              <AlertTriangle size={13} /> Vencidos
            </div>
            <p className="text-2xl font-bold text-red-300 mt-1">{resumen.vencidos}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0C1327] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500 font-bold">
              <HardDrive size={13} /> Espacio
            </div>
            <p className="text-2xl font-bold text-white mt-1">{resumen.tamanoTotalMb} MB</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por título, cliente, nota…"
          className="bg-[#0C1327] border-white/10 text-white rounded-xl max-w-md"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="bg-[#0C1327] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSoloPorVencer((v) => !v)}
          className={`rounded-xl px-3 py-2 text-sm font-bold border transition-colors ${
            soloPorVencer
              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
              : "bg-[#0C1327] text-slate-400 border-white/10 hover:text-white"
          }`}
        >
          Solo por vencer
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm p-4">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {filtrados.map((d) => (
            <div
              key={d.documentoId}
              className="rounded-xl border border-white/5 bg-[#0C1327] p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{d.titulo}</p>
                  <span className="text-[10px] font-bold uppercase text-slate-500">{d.categoria}</span>
                  {d.esEnlaceExterno && (
                    <span className="text-[10px] font-black uppercase tracking-wide text-[#5eb0ff]">Enlace</span>
                  )}
                  <span className={`text-[10px] font-bold rounded-full border px-2 py-0.5 ${badgeVencimiento(d.estadoVencimiento)}`}>
                    {textoVencimiento(d)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {[
                    d.clienteNombre,
                    d.nombreArchivo,
                    d.esEnlaceExterno ? null : d.tamanoTexto,
                    d.subidoPor ? `subió ${d.subidoPor}` : null,
                    new Date(d.fechaCreacion).toLocaleDateString("es-PY"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {d.notas && <p className="text-[11px] text-slate-500 mt-1 truncate">{d.notas}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => void abrirDocumento(d)}
                  title={d.esEnlaceExterno ? "Abrir enlace" : "Abrir archivo"}
                  className="p-2 rounded-lg text-slate-500 hover:text-[#5eb0ff]"
                >
                  {d.esEnlaceExterno ? <ExternalLink size={14} /> : <Download size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => abrirEditar(d)}
                  title="Editar ficha"
                  className="p-2 rounded-lg text-slate-500 hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void eliminar(d)}
                  title="Quitar"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!filtrados.length && (
            <p className="text-center text-slate-600 text-sm py-10">
              Sin documentos todavía. Subí el primer contrato o acta para tener todo en un solo lugar.
            </p>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1327] p-5 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{tituloModal}</h3>
              <button type="button" onClick={() => setModal(null)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {modal === "archivo" && (
              <>
                <input
                  type="file"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  className="w-full bg-[#050B18] border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#007bff] file:px-3 file:py-1.5 file:text-white file:font-bold"
                />
                <p className="text-[11px] text-slate-500">
                  Hasta 20 MB. Se aceptan PDF, imágenes, Word, Excel, PowerPoint, texto y ZIP.
                </p>
              </>
            )}

            {modal === "enlace" && (
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://… (Drive, Dropbox, sitio) *"
                className="bg-[#050B18] border-white/10 text-white rounded-xl"
              />
            )}

            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder={modal === "archivo" ? "Título (si lo dejás vacío se usa el nombre del archivo)" : "Título *"}
              className="bg-[#050B18] border-white/10 text-white rounded-xl"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={form.clienteId}
                onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                className="bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Sin cliente (documento propio)</option>
                {clientes.map((c) => (
                  <option key={c.clienteId} value={c.clienteId}>
                    {c.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">
                Vence el (opcional)
              </label>
              <Input
                type="date"
                value={form.fechaVencimiento}
                onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                className="bg-[#050B18] border-white/10 text-white rounded-xl mt-1"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Si lo completás, la automatización de documentos por vencer puede avisarte antes.
              </p>
            </div>

            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Notas"
              rows={2}
              className="w-full bg-[#050B18] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(null)} className="rounded-xl text-slate-400">
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (modal === "archivo") void subirArchivo();
                  else if (modal === "enlace") void guardarEnlace();
                  else void guardarEdicion();
                }}
                disabled={guardando}
                className="bg-[#007bff] rounded-xl font-bold"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
