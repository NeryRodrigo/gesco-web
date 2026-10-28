"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, BookOpenCheck, Camera, CheckCircle2, ClipboardCheck, FileUp, Inbox, LayoutDashboard, Link2, Loader2, LogOut,
  MessageCircle, Pencil, Plus, QrCode, Sparkles, Trash2, Users, Download,
} from "lucide-react";
import { API_BASE, installAuthFetch } from "@/lib/api";
import { loadVordiaSession } from "@/lib/utils";
import { leerQrDeImagen } from "@/lib/qrImagen";
import {
  contaApi, contaDescargar, fechaCorta, gsConta, periodoDe, periodoTexto, TIPOS_COMPROBANTE,
  type ContaCliente, type ContaComprobante, type ContaPanelCliente, type ContaResultadoCarga,
} from "@/lib/contaApi";
import { BOTON, BOTON_PRIMARIO, CAMPO, SELECT_CORTO, EstadoChip, Kpi, linkPortal, linkWhatsapp, Modal, Semaforo, Tarjeta } from "./ContaUI";
import { ComprobanteForm } from "./ComprobanteForm";

type Vista = "panel" | "bandeja" | "clientes" | "libros";
const NAV: { id: Vista; label: string; icon: React.ReactNode }[] = [
  { id: "panel", label: "Panel del estudio", icon: <LayoutDashboard size={16} /> },
  { id: "bandeja", label: "Bandeja de comprobantes", icon: <Inbox size={16} /> },
  { id: "clientes", label: "Clientes (RUC)", icon: <Users size={16} /> },
  { id: "libros", label: "Libros, IVA y RG90", icon: <BookOpenCheck size={16} /> },
];

function periodosRecientes(): number[] {
  const hoy = new Date();
  return Array.from({ length: 6 }, (_, i) => periodoDe(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)));
}

function resumenCarga(r: ContaResultadoCarga) {
  const partes = [`${r.cargados} cargado${r.cargados === 1 ? "" : "s"}`];
  if (r.observados) partes.push(`${r.observados} con observaciones`);
  if (r.duplicados) partes.push(`${r.duplicados} ya estaba${r.duplicados === 1 ? "" : "n"} cargado${r.duplicados === 1 ? "" : "s"}`);
  return partes.join(" · ");
}

/** Mensaje para pedirle al cliente las facturas del mes con su link privado. */
function mensajePedido(p: { razonSocial: string; tokenPortal: string }, periodo: number) {
  return `Hola, para cerrar la contabilidad de ${periodoTexto(periodo)} de ${p.razonSocial} mandame las facturas desde este link: ${linkPortal(p.tokenPortal)}\nSolo le sacás foto al QR de cada factura y listo. ¡Gracias!`;
}

/**
 * VORDIA CONTA. Pantalla completa para usuarios de un estudio contable (rubro CONTA);
 * con `embebido` se muestra dentro de VORDIA HQ (demo para el equipo).
 */
export default function ContaApp({ embebido = false, onLogout }: { embebido?: boolean; onLogout?: () => void }) {
  const [empresaId, setEmpresaId] = useState(0);
  const [estudio, setEstudio] = useState("");
  // La sesión ya está en el navegador cuando se monta (la app CONTA se muestra después del login)
  const [sesion] = useState(() => loadVordiaSession()?.user ?? {});
  const usuario = String(sesion.nombre ?? sesion.Nombre ?? "");
  const [vista, setVista] = useState<Vista>("panel");
  const [periodo, setPeriodo] = useState(() => periodoDe(new Date()));
  const [clientes, setClientes] = useState<ContaCliente[]>([]);
  const [panel, setPanel] = useState<ContaPanelCliente[] | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  // Empresa del estudio: la de la sesión (rubro CONTA) o el estudio demo para usuarios de HQ
  useEffect(() => {
    installAuthFetch();
    const rubro = String(sesion.rubro ?? sesion.Rubro ?? "").toUpperCase();
    const propia = Number(sesion.empresaId ?? sesion.EmpresaId ?? 0);
    (async () => {
      try {
        const empresas: { empresaId?: number; EmpresaId?: number; razonSocial?: string; RazonSocial?: string; rubro?: string; Rubro?: string }[] =
          await fetch(`${API_BASE}/api/Auth/empresas`).then((r) => r.json());
        const norm = empresas.map((e) => ({ id: Number(e.empresaId ?? e.EmpresaId), nombre: String(e.razonSocial ?? e.RazonSocial ?? ""), rubro: String(e.rubro ?? e.Rubro ?? "").toUpperCase() }));
        const elegida = rubro === "CONTA" ? norm.find((e) => e.id === propia) : norm.find((e) => e.rubro === "CONTA");
        if (!elegida) {
          toast.error("No hay un estudio contable configurado (rubro CONTA)");
          return;
        }
        setEmpresaId(elegida.id);
        setEstudio(elegida.nombre);
      } catch {
        toast.error("No se pudo conectar con el servidor");
      }
    })();
  }, [sesion]);

  useEffect(() => {
    if (!empresaId) return;
    let vivo = true;
    Promise.all([
      contaApi<ContaCliente[]>(`/api/Conta/clientes?empresaId=${empresaId}`),
      contaApi<{ periodo: number; clientes: ContaPanelCliente[] }>(`/api/Conta/panel?empresaId=${empresaId}&periodo=${periodo}`),
    ])
      .then(([c, p]) => {
        if (!vivo) return;
        setClientes(c);
        setPanel(p.clientes);
      })
      .catch((e) => vivo && toast.error(e instanceof Error ? e.message : "No se pudieron cargar los datos"));
    return () => {
      vivo = false;
    };
  }, [empresaId, periodo, version]);

  const contenido = !empresaId ? (
    <p className="p-6 text-[13px] text-slate-400">Conectando con el estudio…</p>
  ) : vista === "panel" ? (
    <PanelView empresaId={empresaId} periodo={periodo} panel={panel} clientes={clientes} onIr={setVista} onCambio={recargar} />
  ) : vista === "bandeja" ? (
    <BandejaView empresaId={empresaId} periodo={periodo} clientes={clientes} version={version} onCambio={recargar} />
  ) : vista === "clientes" ? (
    <ClientesView empresaId={empresaId} clientes={clientes} periodo={periodo} onCambio={recargar} />
  ) : (
    <LibrosView empresaId={empresaId} periodo={periodo} clientes={clientes} panel={panel} />
  );

  const selectorPeriodo = (
    <select className={SELECT_CORTO} value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))} aria-label="Período">
      {periodosRecientes().map((p) => <option key={p} value={p}>{periodoTexto(p)}</option>)}
    </select>
  );

  if (embebido) {
    return (
      <div className="vordia-hq-page space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">VORDIA CONTA <span className="text-[13px] font-normal text-slate-400">· {estudio}</span></h1>
            <p className="text-[13px] text-slate-400">Vista de demostración para el equipo de VORDIA.</p>
          </div>
          {selectorPeriodo}
        </div>
        <div className="flex flex-wrap gap-2">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => setVista(n.id)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] ${vista === n.id ? "border-teal-400 bg-teal-500/15 text-teal-100" : "border-white/10 text-slate-300 hover:bg-white/5"}`}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        {contenido}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-[#050B18] text-white">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-[#070D1C] p-4 lg:flex">
        <div className="mb-8 px-2">
          <p className="text-[19px] font-black tracking-[0.18em]">VORDIA</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-300">Conta</p>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => setVista(n.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] ${vista === n.id ? "bg-teal-500/15 text-teal-100" : "text-slate-300 hover:bg-white/5"}`}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-white/5 pt-4">
          <p className="px-2 text-[12px] text-slate-400">{usuario}<span className="block truncate text-[11px] text-slate-500">{estudio}</span></p>
          {onLogout && (
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-slate-400 hover:bg-white/5 hover:text-white">
              <LogOut size={15} /> Cerrar sesión
            </button>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-teal-300 lg:hidden">VORDIA CONTA</p>
            <h1 className="text-[22px] font-bold">{NAV.find((n) => n.id === vista)?.label}</h1>
            <p className="text-[12.5px] text-slate-400">{estudio}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectorPeriodo}
            {onLogout && <button type="button" onClick={onLogout} className={`${BOTON} lg:hidden`} aria-label="Cerrar sesión"><LogOut size={14} /></button>}
          </div>
        </header>
        <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => setVista(n.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] ${vista === n.id ? "border-teal-400 bg-teal-500/15 text-teal-100" : "border-white/10 text-slate-300"}`}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        {contenido}
      </main>
    </div>
  );
}

// ───────────────────────────── Panel ─────────────────────────────

function PanelView({ empresaId, periodo, panel, clientes, onIr, onCambio }: {
  empresaId: number; periodo: number; panel: ContaPanelCliente[] | null; clientes: ContaCliente[]; onIr: (v: Vista) => void; onCambio: () => void;
}) {
  const [cargandoDemo, setCargandoDemo] = useState(false);
  if (panel == null) return <p className="text-[13px] text-slate-400">Cargando…</p>;

  if (clientes.length === 0) {
    return (
      <Tarjeta className="space-y-4 text-center">
        <Sparkles className="mx-auto text-teal-300" size={36} />
        <h2 className="text-lg font-semibold">Tu estudio todavía no tiene clientes</h2>
        <p className="mx-auto max-w-lg text-[13px] text-slate-400">Cargá tus clientes con su RUC, o probá VORDIA CONTA con un estudio de ejemplo: 6 clientes y sus facturas de compra y venta de este mes y el anterior.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={BOTON} onClick={() => onIr("clientes")}><Plus size={14} /> Cargar mi primer cliente</button>
          <button type="button" disabled={cargandoDemo} className={BOTON_PRIMARIO} onClick={async () => {
            setCargandoDemo(true);
            try {
              const r = await contaApi<{ comprobantes: number }>(`/api/Conta/demo?empresaId=${empresaId}`, { method: "POST" });
              toast.success(`Estudio de ejemplo listo: ${r.comprobantes} comprobantes`);
              onCambio();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo cargar la demo");
            } finally {
              setCargandoDemo(false);
            }
          }}>
            {cargandoDemo ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Cargar estudio de ejemplo
          </button>
        </div>
      </Tarjeta>
    );
  }

  const observados = panel.reduce((s, p) => s + p.observados, 0);
  const listos = panel.filter((p) => p.semaforo === "verde").length;
  const saldo = panel.reduce((s, p) => s + Math.max(0, p.ivaSaldo), 0);
  const tareas = panel.filter((p) => p.accion && p.semaforo !== "verde").slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Clientes" valor={String(panel.length)} nota={periodoTexto(periodo)} />
        <Kpi label="Listos para presentar" valor={`${listos}/${panel.length}`} tono="bien" nota="Sin observaciones" />
        <Kpi label="Comprobantes observados" valor={String(observados)} tono={observados ? "alerta" : "normal"} nota="La validación automática los detectó" />
        <Kpi label="IVA estimado a pagar" valor={gsConta(saldo)} nota="Débito menos crédito de todos los clientes" />
      </div>

      {tareas.length > 0 && (
        <Tarjeta>
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold"><ClipboardCheck size={16} className="text-teal-300" /> Lo que hay que hacer primero</h2>
          <ul className="space-y-2">
            {tareas.map((p) => (
              <li key={p.clienteId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#050B18] px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2.5 text-[13px]"><Semaforo valor={p.semaforo} /><b className="truncate">{p.razonSocial}</b><span className="text-slate-400">{p.accion}</span></span>
                <span className="flex gap-2">
                  {p.observados > 0 && <button type="button" className={BOTON} onClick={() => onIr("bandeja")}>Revisar</button>}
                  {p.ventas + p.compras === 0 && (
                    <a className={BOTON} href={linkWhatsapp(p.contactoWhatsapp, mensajePedido(p, periodo))} target="_blank" rel="noreferrer"><MessageCircle size={13} /> Pedir por WhatsApp</a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Cliente</th><th className="px-3 py-3 text-right">Ventas</th><th className="px-3 py-3 text-right">Compras</th>
              <th className="px-3 py-3 text-right">IVA débito</th><th className="px-3 py-3 text-right">IVA crédito</th><th className="px-3 py-3 text-right">Saldo IVA</th>
              <th className="px-3 py-3 text-left">Vence</th><th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {panel.map((p) => (
              <tr key={p.clienteId} className="border-t border-white/5">
                <td className="px-4 py-3"><span className="flex items-center gap-2.5"><Semaforo valor={p.semaforo} /><span><b className="font-semibold">{p.razonSocial}</b><span className="block text-[11.5px] text-slate-500">RUC {p.ruc}{p.observados ? ` · ${p.observados} observado${p.observados === 1 ? "" : "s"}` : ""}</span></span></span></td>
                <td className="px-3 py-3 text-right tabular-nums">{p.ventas}</td>
                <td className="px-3 py-3 text-right tabular-nums">{p.compras}</td>
                <td className="px-3 py-3 text-right tabular-nums">{gsConta(p.ivaDebito)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{gsConta(p.ivaCredito)}</td>
                <td className={`px-3 py-3 text-right font-semibold tabular-nums ${p.ivaSaldo > 0 ? "text-amber-200" : "text-teal-200"}`}>{p.ivaSaldo >= 0 ? gsConta(p.ivaSaldo) : `A favor ${gsConta(-p.ivaSaldo)}`}</td>
                <td className="px-3 py-3"><span className={p.diasParaVencer < 0 ? "text-slate-500" : p.diasParaVencer <= 5 ? "text-rose-300" : "text-slate-300"}>{fechaCorta(p.vencimiento)}</span><span className="block text-[11px] text-slate-500">{p.diasParaVencer >= 0 ? `en ${p.diasParaVencer} días` : "vencido"}</span></td>
                <td className="px-3 py-3 text-right">
                  <a className="text-[12px] font-semibold text-teal-300 hover:underline" href={linkWhatsapp(p.contactoWhatsapp, mensajePedido(p, periodo))} target="_blank" rel="noreferrer">Pedir facturas</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>
      <p className="text-[11.5px] text-slate-500">Vencimientos según el calendario perpetuo de la DNIT por último dígito del RUC (si cae en fin de semana pasa al día hábil siguiente). Verificá feriados. El IVA es una estimación con los comprobantes cargados, sin saldos a favor de meses anteriores.</p>
    </div>
  );
}

// ───────────────────────────── Bandeja ─────────────────────────────

function BandejaView({ empresaId, periodo, clientes, version, onCambio }: {
  empresaId: number; periodo: number; clientes: ContaCliente[]; version: number; onCambio: () => void;
}) {
  const [lista, setLista] = useState<ContaComprobante[] | null>(null);
  const [filtroCliente, setFiltroCliente] = useState<number | "">("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [qrTexto, setQrTexto] = useState("");
  const [cargando, setCargando] = useState("");
  const [ultimo, setUltimo] = useState<ContaResultadoCarga | null>(null);
  const [form, setForm] = useState<{ inicial?: ContaComprobante | null } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputXml = useRef<HTMLInputElement>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  const nombreCliente = useMemo(() => new Map(clientes.map((c) => [c.clienteId, c.razonSocial])), [clientes]);

  useEffect(() => {
    let vivo = true;
    const q = new URLSearchParams({ empresaId: String(empresaId), periodo: String(periodo) });
    if (filtroCliente) q.set("clienteId", String(filtroCliente));
    if (filtroEstado) q.set("estado", filtroEstado);
    contaApi<ContaComprobante[]>(`/api/Conta/comprobantes?${q}`).then((r) => vivo && setLista(r)).catch(() => vivo && setLista([]));
    return () => {
      vivo = false;
    };
  }, [empresaId, periodo, filtroCliente, filtroEstado, version]);

  const mostrar = (r: ContaResultadoCarga) => {
    setUltimo(r);
    if (r.cargados) toast.success(resumenCarga(r));
    else if (r.duplicados) toast.info("Esos comprobantes ya estaban cargados");
    else toast.error(r.mensajes[0] ?? "No se cargó ningún comprobante");
    onCambio();
  };

  const subirXml = async (archivos: FileList | File[]) => {
    const fd = new FormData();
    Array.from(archivos).forEach((f) => fd.append("archivos", f));
    setCargando("xml");
    try {
      mostrar(await contaApi<ContaResultadoCarga>(`/api/Conta/xml?empresaId=${empresaId}`, { method: "POST", body: fd }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron leer los XML");
    } finally {
      setCargando("");
    }
  };

  const enviarQr = async (texto: string) => {
    setCargando("qr");
    try {
      mostrar(await contaApi<ContaResultadoCarga>(`/api/Conta/qr?empresaId=${empresaId}`, { method: "POST", body: JSON.stringify({ texto }) }));
      setQrTexto("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el QR");
    } finally {
      setCargando("");
    }
  };

  const fotos = async (archivos: FileList) => {
    for (const f of Array.from(archivos)) {
      const texto = await leerQrDeImagen(f);
      if (texto) await enviarQr(texto);
      else toast.error(`${f.name}: no se encontró un QR. Probá con una foto más cerca y enfocada.`);
    }
  };

  const accion = async (x: ContaComprobante, tipo: "aprobar" | "eliminar") => {
    try {
      if (tipo === "aprobar") await contaApi(`/api/Conta/comprobantes/${x.comprobanteId}/aprobar?empresaId=${empresaId}`, { method: "POST" });
      else await contaApi(`/api/Conta/comprobantes/${x.comprobanteId}?empresaId=${empresaId}`, { method: "DELETE" });
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar");
    }
  };

  const observados = (lista ?? []).filter((x) => x.estado === "Observado");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastrando(false); if (e.dataTransfer.files.length) void subirXml(e.dataTransfer.files); }}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center ${arrastrando ? "border-teal-400 bg-teal-500/10" : "border-white/10 bg-[#0C1327]"}`}
        >
          <FileUp className="text-teal-300" size={26} />
          <p className="text-[13.5px] font-semibold">Arrastrá XML del SIFEN o un ZIP</p>
          <p className="text-[12px] text-slate-400">Se leen completos: desglose 10%, 5% y exento exacto.</p>
          <button type="button" className={BOTON} disabled={cargando === "xml"} onClick={() => inputXml.current?.click()}>
            {cargando === "xml" ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />} Elegir archivos
          </button>
          <input ref={inputXml} type="file" accept=".xml,.zip" multiple hidden onChange={(e) => e.target.files && void subirXml(e.target.files)} />
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0C1327] p-5">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold"><QrCode size={16} className="text-teal-300" /> QR de factura electrónica</p>
          <p className="text-[12px] text-slate-400">Subí fotos de facturas: el QR se lee en el navegador y trae CDC, RUC, fecha, total e IVA.</p>
          <button type="button" className={BOTON} disabled={cargando === "qr"} onClick={() => inputFoto.current?.click()}>
            {cargando === "qr" ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />} Fotos de facturas
          </button>
          <input ref={inputFoto} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void fotos(e.target.files)} />
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (qrTexto.trim()) void enviarQr(qrTexto.trim()); }}>
            <input className={CAMPO} placeholder="…o pegá el link del QR" value={qrTexto} onChange={(e) => setQrTexto(e.target.value)} />
            <button className={BOTON} disabled={!qrTexto.trim()}>Leer</button>
          </form>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0C1327] p-5">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold"><Pencil size={15} className="text-teal-300" /> Preimpresas y tickets</p>
          <p className="text-[12px] text-slate-400">Carga rápida con validación de RUC, IVA y formato. Son las que van en el archivo RG90.</p>
          <button type="button" className={BOTON} onClick={() => setForm({})} disabled={clientes.length === 0}><Plus size={13} /> Cargar comprobante</button>
          <p className="mt-auto text-[11.5px] text-slate-500">Tus clientes también pueden mandarlas desde su celular con el link privado (Clientes → Link para el cliente).</p>
        </div>
      </div>

      {ultimo && ultimo.mensajes.length > 0 && (
        <Tarjeta className="border-amber-500/20">
          <p className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-amber-200"><AlertTriangle size={14} /> Avisos de la última carga</p>
          <ul className="list-disc space-y-0.5 pl-5 text-[12.5px] text-slate-300">{ultimo.mensajes.slice(0, 8).map((m) => <li key={m}>{m}</li>)}</ul>
        </Tarjeta>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select className={SELECT_CORTO} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value ? Number(e.target.value) : "")} aria-label="Cliente">
          <option value="">Todos los clientes</option>
          {clientes.map((c) => <option key={c.clienteId} value={c.clienteId}>{c.razonSocial}</option>)}
        </select>
        <select className={SELECT_CORTO} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option><option value="Observado">Observados</option><option value="Aprobado">Aprobados</option>
        </select>
        <span className="text-[12.5px] text-slate-400">{lista?.length ?? 0} comprobantes de {periodoTexto(periodo)}{observados.length ? ` · ${observados.length} para revisar` : ""}</span>
      </div>

      <Tarjeta className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[900px] text-[12.5px]">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Comprobante</th><th className="px-3 py-3 text-left">Cliente</th><th className="px-3 py-3 text-left">Contraparte</th>
              <th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3 text-right">IVA</th><th className="px-3 py-3 text-left">Estado</th><th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista == null && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Cargando…</td></tr>}
            {lista?.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Sin comprobantes en este período. Arrastrá XML, subí fotos de QR o mandá el link a tus clientes.</td></tr>}
            {lista?.map((x) => (
              <tr key={x.comprobanteId} className={`border-t border-white/5 align-top ${x.estado === "Observado" ? "bg-amber-500/[0.04]" : ""}`}>
                <td className="px-4 py-2.5">
                  <span className="font-medium">{x.tipo} · {TIPOS_COMPROBANTE[x.tipoComprobante] ?? x.tipoComprobante}</span>
                  <span className="block text-[11.5px] text-slate-500">{x.numero} · {fechaCorta(x.fecha)} · {x.electronico ? "Electrónica" : `Timbrado ${x.timbrado}`} · {x.origen}</span>
                </td>
                <td className="px-3 py-2.5">{nombreCliente.get(x.clienteId) ?? "—"}</td>
                <td className="px-3 py-2.5">{x.contraparteNombre || "—"}<span className="block text-[11.5px] text-slate-500">{x.contraparteDv ? `${x.contraparteDoc}-${x.contraparteDv}` : x.contraparteDoc}</span></td>
                <td className="px-3 py-2.5 text-right tabular-nums">{gsConta(x.total)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{gsConta(x.iva10 + x.iva5)}</td>
                <td className="px-3 py-2.5"><EstadoChip estado={x.estado} />{x.observaciones && <span className="mt-1 block max-w-[280px] text-[11.5px] text-amber-200/80">{x.observaciones}</span>}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  {x.estado === "Observado" && <button type="button" className="mr-2 text-[12px] font-semibold text-teal-300 hover:underline" onClick={() => void accion(x, "aprobar")}>Aprobar igual</button>}
                  <button type="button" className="mr-2 text-slate-400 hover:text-white" onClick={() => setForm({ inicial: x })} aria-label="Corregir"><Pencil size={13} /></button>
                  <button type="button" className="text-slate-500 hover:text-rose-300" onClick={() => void accion(x, "eliminar")} aria-label="Eliminar"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>

      {form && <ComprobanteForm empresaId={empresaId} clientes={clientes} inicial={form.inicial} clienteInicial={filtroCliente || undefined} onClose={() => setForm(null)} onGuardado={onCambio} />}
    </div>
  );
}

// ───────────────────────────── Clientes ─────────────────────────────

const CLIENTE_VACIO = { razonSocial: "", ruc: "", regimen: "IRE General", obligacionIva: true, obligacionIre: true, obligacionIrp: false, contactoNombre: "", contactoWhatsapp: "", contactoEmail: "" };

function ClientesView({ empresaId, clientes, periodo, onCambio }: { empresaId: number; clientes: ContaCliente[]; periodo: number; onCambio: () => void }) {
  const [form, setForm] = useState<(typeof CLIENTE_VACIO & { id?: number }) | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    try {
      await contaApi(form.id ? `/api/Conta/clientes/${form.id}?empresaId=${empresaId}` : `/api/Conta/clientes?empresaId=${empresaId}`, { method: form.id ? "PUT" : "POST", body: JSON.stringify(form) });
      toast.success("Cliente guardado");
      setForm(null);
      onCambio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Link copiado");
    } catch {
      toast.info(texto);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" className={BOTON_PRIMARIO} onClick={() => setForm({ ...CLIENTE_VACIO })}><Plus size={14} /> Nuevo cliente</button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {clientes.map((c) => (
          <Tarjeta key={c.clienteId} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="truncate font-semibold">{c.razonSocial}</p><p className="text-[12px] text-slate-400">RUC {c.ruc}-{c.dv} · {c.regimen ?? "Sin régimen"}</p></div>
              <button type="button" className="text-slate-400 hover:text-white" aria-label="Editar" onClick={() => setForm({
                id: c.clienteId, razonSocial: c.razonSocial, ruc: `${c.ruc}-${c.dv}`, regimen: c.regimen ?? "", obligacionIva: c.obligacionIva, obligacionIre: c.obligacionIre,
                obligacionIrp: c.obligacionIrp, contactoNombre: c.contactoNombre ?? "", contactoWhatsapp: c.contactoWhatsapp ?? "", contactoEmail: c.contactoEmail ?? "",
              })}><Pencil size={14} /></button>
            </div>
            <p className="text-[12px] text-slate-500">Obligaciones: {[c.obligacionIva && "IVA", c.obligacionIre && "IRE", c.obligacionIrp && "IRP-RSP"].filter(Boolean).join(" · ")}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={BOTON} onClick={() => void copiar(linkPortal(c.tokenPortal))}><Link2 size={13} /> Link para el cliente</button>
              <a className={BOTON} href={linkWhatsapp(c.contactoWhatsapp, mensajePedido(c, periodo))} target="_blank" rel="noreferrer"><MessageCircle size={13} /> Enviar por WhatsApp</a>
            </div>
          </Tarjeta>
        ))}
      </div>
      {form && (
        <Modal titulo={form.id ? "Editar cliente" : "Nuevo cliente"} onClose={() => setForm(null)}>
          <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-slate-400 sm:col-span-2">Razón social<input className={CAMPO} value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} required /></label>
            <label className="text-[12px] text-slate-400">RUC con dígito verificador<input className={CAMPO} value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} placeholder="80012345-6" required /></label>
            <label className="text-[12px] text-slate-400">Régimen
              <select className={CAMPO} value={form.regimen} onChange={(e) => setForm({ ...form, regimen: e.target.value })}>
                {["IRE General", "IRE Simple", "IRE Resimple", "IRP", "IVA General"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <fieldset className="flex flex-wrap gap-4 text-[13px] text-slate-300 sm:col-span-2">
              <legend className="mb-1 text-[12px] text-slate-400">Obligaciones (se imputan por defecto en cada comprobante)</legend>
              {(["obligacionIva", "obligacionIre", "obligacionIrp"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2"><input type="checkbox" className="accent-teal-400" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />{k === "obligacionIva" ? "IVA" : k === "obligacionIre" ? "IRE" : "IRP-RSP"}</label>
              ))}
            </fieldset>
            <label className="text-[12px] text-slate-400">Contacto<input className={CAMPO} value={form.contactoNombre} onChange={(e) => setForm({ ...form, contactoNombre: e.target.value })} /></label>
            <label className="text-[12px] text-slate-400">WhatsApp<input className={CAMPO} value={form.contactoWhatsapp} onChange={(e) => setForm({ ...form, contactoWhatsapp: e.target.value })} placeholder="0981 123 456" /></label>
            <label className="text-[12px] text-slate-400 sm:col-span-2">Correo<input type="email" className={CAMPO} value={form.contactoEmail} onChange={(e) => setForm({ ...form, contactoEmail: e.target.value })} /></label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className={BOTON} onClick={() => setForm(null)}>Cancelar</button>
              <button className={BOTON_PRIMARIO} disabled={guardando}>Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────────── Libros y RG90 ─────────────────────────────

function LibrosView({ empresaId, periodo, clientes, panel }: { empresaId: number; periodo: number; clientes: ContaCliente[]; panel: ContaPanelCliente[] | null }) {
  const [clienteId, setClienteId] = useState<number>(clientes[0]?.clienteId ?? 0);
  const [generando, setGenerando] = useState("");
  const [rg90, setRg90] = useState<Record<string, string> | null>(null);
  const fila = panel?.find((p) => p.clienteId === clienteId);

  const descargar = async (clave: string, path: string) => {
    setGenerando(clave);
    try {
      const extra = await contaDescargar(path);
      if (clave === "rg90") {
        setRg90(extra);
        toast.success(`Archivo RG90 generado con ${extra.filas ?? "?"} comprobantes`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar");
    } finally {
      setGenerando("");
    }
  };

  if (clientes.length === 0) return <p className="text-[13px] text-slate-400">Primero cargá clientes.</p>;
  const base = `empresaId=${empresaId}&clienteId=${clienteId}&periodo=${periodo}`;

  return (
    <div className="space-y-4">
      <select className={`${SELECT_CORTO} sm:max-w-md`} value={clienteId} onChange={(e) => { setClienteId(Number(e.target.value)); setRg90(null); }} aria-label="Cliente">
        {clientes.map((c) => <option key={c.clienteId} value={c.clienteId}>{c.razonSocial} · {c.ruc}-{c.dv}</option>)}
      </select>
      {fila && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="IVA débito (ventas)" valor={gsConta(fila.ivaDebito)} nota={`${fila.ventas} comprobantes`} />
          <Kpi label="IVA crédito (compras)" valor={gsConta(fila.ivaCredito)} nota={`${fila.compras} comprobantes`} />
          <Kpi label={fila.ivaSaldo >= 0 ? "IVA estimado a pagar" : "Saldo a favor"} valor={gsConta(Math.abs(fila.ivaSaldo))} tono={fila.ivaSaldo > 0 ? "alerta" : "bien"} />
          <Kpi label="Vencimiento" valor={fechaCorta(fila.vencimiento)} nota={fila.diasParaVencer >= 0 ? `en ${fila.diasParaVencer} días` : "vencido"} tono={fila.diasParaVencer >= 0 && fila.diasParaVencer <= 5 ? "alerta" : "normal"} />
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <Tarjeta className="space-y-3">
          <h2 className="text-[14px] font-semibold">Libros de compras y ventas</h2>
          <p className="text-[12.5px] text-slate-400">Para revisar en Excel: todos los comprobantes del período, con desglose de IVA, CDC y observaciones.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BOTON} disabled={!!generando} onClick={() => void descargar("lc", `/api/Conta/libro?${base}&tipo=Compra`)}><Download size={13} /> Libro de compras</button>
            <button type="button" className={BOTON} disabled={!!generando} onClick={() => void descargar("lv", `/api/Conta/libro?${base}&tipo=Venta`)}><Download size={13} /> Libro de ventas</button>
          </div>
        </Tarjeta>
        <Tarjeta className="space-y-3 border-teal-500/25">
          <h2 className="text-[14px] font-semibold">Archivo RG90 para Marangatu</h2>
          <p className="text-[12.5px] text-slate-400">
            Formato oficial de la DNIT: TXT con tabulaciones, sin encabezado, en ZIP con el nombre RUC_REG_MMAAAA. Incluye solo los comprobantes <b className="text-slate-200">preimpresos aprobados</b>: los electrónicos ya están en Marangatu y la DNIT pide no repetirlos.
          </p>
          <button type="button" className={BOTON_PRIMARIO} disabled={!!generando} onClick={() => void descargar("rg90", `/api/Conta/rg90?${base}`)}>
            {generando === "rg90" ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Generar RG90 de {periodoTexto(periodo)}
          </button>
          {rg90 && (
            <p className="flex items-start gap-2 rounded-xl bg-teal-500/10 px-3 py-2 text-[12.5px] text-teal-100">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              {rg90.filas} comprobantes en el archivo · {rg90.electronicos} electrónicos excluidos (ya en Marangatu){Number(rg90.sinaprobar) > 0 ? ` · ${rg90.sinaprobar} observados sin incluir: revisalos en la bandeja` : ""}.
            </p>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
