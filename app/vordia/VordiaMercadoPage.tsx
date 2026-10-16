"use client";

import { API_BASE } from "@/lib/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Radar, RefreshCw, Plus, Flame, Inbox, Handshake, Trophy, Sparkles, ExternalLink, Users, Lightbulb,
  X, Settings2, Trash2, Search, Landmark, Globe, Rss, PenLine, ChevronDown, ChevronUp, CalendarClock,
  ShieldCheck, ShieldAlert, Building2, Bookmark, ClipboardPaste, MapPin, Phone, BadgeCheck,
  MessageCircle, Mail, FileSignature, Copy, Send, CheckCircle2, Link2, Wallet,
} from "lucide-react";

/* ───────────── Tipos ───────────── */

type Necesidad = {
  necesidadId: number;
  fuente: string;
  titulo: string;
  descripcion?: string | null;
  url?: string | null;
  solicitante?: string | null;
  pais?: string | null;
  presupuestoMin?: number | null;
  presupuestoMax?: number | null;
  moneda?: string | null;
  fechaPublicacion?: string | null;
  fechaCierre?: string | null;
  habilidades?: string | null;
  vertical?: string | null;
  categoria?: string | null;
  productoSugerido?: string | null;
  puntaje: number;
  motivoPuntaje?: string | null;
  confianza: number;
  confianzaMotivo?: string | null;
  competidores?: number | null;
  alcance?: string | null;
  estado: string;
  responsableNombre?: string | null;
  contactoNombre?: string | null;
  contactoEmail?: string | null;
  contactoTelefono?: string | null;
  contactoOrigen?: string | null;
  precioSetupSugeridoUsd: number;
  precioMensualSugeridoUsd: number;
  kitSugerido?: string | null;
  notas?: string | null;
  clienteId?: number | null;
  roadmapId?: number | null;
  fechaCaptura: string;
};

type Pedido = {
  pedidoId: number;
  necesidadId?: number | null;
  necesidadTitulo?: string | null;
  token: string;
  numero: string;
  clienteNombre: string;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  producto: string;
  incluye?: string | null;
  moneda: string;
  precioSetup: number;
  precioMensual: number;
  plazoDias: number;
  validoHasta: string;
  condicionesPago?: string | null;
  estado: string;
  fechaEnvio?: string | null;
  fechaVisto?: string | null;
  fechaRespuesta?: string | null;
  respuestaNombre?: string | null;
  respuestaComentario?: string | null;
  fechaPago?: string | null;
  fechaCreacion: string;
};

type Contacto = {
  contactoId: number;
  canal: string;
  destino?: string | null;
  asunto?: string | null;
  mensaje?: string | null;
  resultado: string;
  detalle?: string | null;
  usuarioNombre?: string | null;
  fecha: string;
};

type Oportunidad = {
  categoria: string;
  vertical: string;
  cantidad: number;
  calientesAltas: number;
  presupuestoMedianoUsd?: number | null;
  productoVordia: string;
  productoRapido: string;
  ejemplos: string[];
  roadmapId?: number | null;
  precioSetupUsd: number;
  precioMensualUsd: number;
  mrr10ClientesUsd: number;
};

type Conteo = { clave: string; cantidad: number; puntajePromedio: number };

type Resumen = {
  total: number;
  nuevas7d: number;
  calientes: number;
  enGestion: number;
  ganadas: number;
  convertidasCrm: number;
  confiables: number;
  ultimaSync?: string | null;
  porFuente: Conteo[];
  porVertical: Conteo[];
  porAlcance: Conteo[];
  oportunidades: Oportunidad[];
};

type Fuente = {
  fuenteId: number;
  tipo: string;
  nombre: string;
  consulta?: string | null;
  activa: boolean;
  ultimaSync?: string | null;
  ultimoResultado?: string | null;
};

type Props = {
  empresaId: number;
  usuario: { id?: number; nombre?: string } | null;
  onNavigate?: (vista: string) => void;
};

const ESTADOS = ["Nueva", "Evaluando", "Contactada", "Propuesta", "Ganada", "Descartada"] as const;

const VERTICALES: Record<string, string> = {
  HABITAT: "HABITAT",
  STAY: "STAY",
  DINE: "DINE",
  RETAIL: "RETAIL",
  BOUTIQUE: "BOUTIQUE",
  OPS: "OPS",
  AGRO: "AGRO",
  HQ: "HQ",
  A_MEDIDA: "A medida",
};

const CARD = "rounded-[1.5rem] border border-white/5 bg-[#0C1327]";
const FIELD = "bg-[#050B18] border-white/10 text-white placeholder:text-slate-500 rounded-xl";
const SELECT = "bg-[#050B18] border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-sm";

/* ───────────── Helpers ───────────── */

function hace(iso?: string | null) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(min)) return "";
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d < 31 ? `hace ${d} d` : new Date(iso).toLocaleDateString("es-PY", { day: "numeric", month: "short" });
}

function fecha(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("es-PY", { day: "numeric", month: "short" }) : "";
}

function diasPara(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function presupuesto(n: Necesidad) {
  if (!n.presupuestoMax) return null;
  const f = (v: number) => v.toLocaleString("es-PY", { maximumFractionDigits: 0 });
  return `${n.moneda ?? ""} ${n.presupuestoMin && n.presupuestoMin !== n.presupuestoMax ? `${f(n.presupuestoMin)}–` : ""}${f(n.presupuestoMax)}`.trim();
}

function puntajeTone(p: number) {
  if (p >= 70) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (p >= 40) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-white/5 text-slate-400 border-white/10";
}

function estadoTone(e: string) {
  switch (e) {
    case "Nueva": return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "Evaluando": return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "Contactada": return "bg-[#007bff]/20 text-[#5eb0ff] border-[#007bff]/35";
    case "Propuesta": return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "Ganada": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    default: return "bg-white/5 text-slate-500 border-white/10";
  }
}

function usd(v?: number | null) {
  return v == null ? "—" : `USD ${v.toLocaleString("es-PY", { maximumFractionDigits: 0 })}`;
}

function Confianza({ n }: { n: Necesidad }) {
  if (!n.confianza) return null;
  const alta = n.confianza >= 70;
  const media = n.confianza >= 45;
  const cls = alta
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : media
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`} title={n.confianzaMotivo ?? ""}>
      {alta ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
      {alta ? "Confiable" : media ? "Verificar" : "Riesgoso"} · {n.confianza}
    </span>
  );
}

const ALCANCE_LABEL: Record<string, string> = { Paraguay: "Paraguay", LatAm: "Latinoamérica", Internacional: "Internacional" };

/** Señales que marca el vendedor al cargar un pedido (mismas claves que MercadoService.SenalesManual). */
const SENALES: { id: string; label: string; positiva: boolean }[] = [
  { id: "empresa_formal", label: "Empresa formal / RUC", positiva: true },
  { id: "negocio_identificado", label: "Nombra su negocio", positiva: true },
  { id: "presupuesto_urgencia", label: "Menciona presupuesto o urgencia", positiva: true },
  { id: "presencia_web", label: "Tiene página, local o web", positiva: true },
  { id: "decisor", label: "Habla quien decide", positiva: true },
  { id: "perfil_dudoso", label: "Perfil nuevo o sin actividad", positiva: false },
  { id: "sin_pago", label: "Pide trabajar antes de pagar", positiva: false },
  { id: "solo_barato", label: "Busca gratis o lo más barato", positiva: false },
];

const CANALES = ["Workana", "Facebook", "Grupo de WhatsApp", "LinkedIn", "Upwork", "99Freelas", "Malt", "Instagram", "Marketplace", "Referido", "Llamada", "Otro"];

function canalDesdeHost(host: string) {
  const h = host.toLowerCase();
  if (h.includes("workana")) return "Workana";
  if (h.includes("facebook")) return "Facebook";
  if (h.includes("linkedin")) return "LinkedIn";
  if (h.includes("upwork")) return "Upwork";
  if (h.includes("99freelas")) return "99Freelas";
  if (h.includes("malt")) return "Malt";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("whatsapp")) return "Grupo de WhatsApp";
  return "Otro";
}

/** Marcador del navegador: copia el texto seleccionado + link de la página para pegarlo en Vordia. */
const BOOKMARKLET =
  "javascript:(()=>{const s=String(getSelection()).trim();const d={v:'vordia-pedido',t:(s.split('\n')[0]||document.title).slice(0,300),d:s||document.title,u:location.href,h:location.hostname};const j=JSON.stringify(d);navigator.clipboard.writeText(j).then(()=>alert('Pedido copiado. Pegalo en Vordia HQ > Necesidades del Mercado > Cargar pedido.'),()=>prompt('Copiá este texto y pegalo en Vordia:',j));})()";

/** Número para wa.me: solo dígitos, con 595 si es un celular paraguayo escrito como 09xx. */
const CODIGO_PAIS: Record<string, string> = {
  Paraguay: "595", Argentina: "54", Bolivia: "591", Brasil: "55", Chile: "56", Colombia: "57", Ecuador: "593",
  Guyana: "592", Perú: "51", Surinam: "597", Uruguay: "598", Venezuela: "58", "Reino Unido": "44",
};

/** Primer número de un texto como "(021) 496-170 - 0981 123 456": prioriza el celular si hay varios. */
function elegirNumero(tel: string) {
  const partes = tel.split(/[/,;]| - | y /).map((x) => x.replace(/\D/g, "")).filter((x) => x.length >= 6);
  return partes.find((x) => /^(09|5959|07|447)/.test(x)) ?? partes[0] ?? "";
}

/** Número internacional para wa.me y tel:, con el código del país del pedido. */
function numeroWhatsApp(tel?: string | null, alcance?: string | null, pais?: string | null) {
  let d = elegirNumero(tel ?? "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  const cc = CODIGO_PAIS[pais ?? ""] ?? (alcance === "Paraguay" ? "595" : "");
  if (cc && d.startsWith(cc) && d.length > cc.length + 7) return d;
  if (cc === "595" && d.length <= 7) d = "21" + d; // fijo de Asunción publicado sin característica
  if (d.startsWith("0")) d = d.slice(1);
  return cc ? cc + d : d;
}

/** ¿Parece un celular (con WhatsApp)? Si no, conviene llamar o escribir por correo. */
function esCelular(internacional: string) {
  return /^(5959\d{8}|549\d{10}|591[67]\d{7}|55\d{2}9\d{8}|569\d{8}|573\d{9}|5939\d{8}|519\d{8}|5989\d{7}|584\d{9}|447\d{9})$/.test(internacional);
}

function abrirWhatsApp(numero: string, texto: string) {
  const base = numero ? `https://wa.me/${numero}` : "https://wa.me/";
  window.open(`${base}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
}

async function copiar(texto: string, aviso = "Copiado") {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("No se pudo copiar; seleccioná el texto a mano.");
  }
}

function linkPedido(token: string) {
  return `${typeof window !== "undefined" ? window.location.origin : "https://www.vordia.com.py"}/pedido/${token}`;
}

function quePide(n: Necesidad) {
  const t = n.titulo.replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 87)}…` : t;
}

function esIngles(n: Necesidad) {
  return n.alcance === "Internacional" && ["Freelancer", "BancoMundial", "ContractsFinder"].includes(n.fuente);
}

const LICITACION = ["DNCP", "SECOP", "BancoMundial", "PNCP", "ContractsFinder", "SEACE", "ARCE", "PNUD", "MercadoPublico"];

function plantillas(n: Necesidad, nombre: string, vendedor: string) {
  const hola = nombre ? `Hola ${nombre.split(" ")[0]}!` : "Hola!";
  const producto = n.productoSugerido ?? "una solución sobre la plataforma Vordia";
  const kit = n.kitSugerido ?? "";
  const desde = `USD ${n.precioSetupSugeridoUsd.toLocaleString("es-PY")} de implementación + USD ${n.precioMensualSugeridoUsd.toLocaleString("es-PY")}/mes`;
  const whatsapp =
    `${hola} Soy ${vendedor} de Vordia. Vi que estás buscando: "${quePide(n)}".\n\n` +
    `Ya tenemos ${producto} funcionando. ${kit}\n\n` +
    `¿Te muestro una demo de 15 minutos hoy o mañana? Así ves si se ajusta a lo que necesitás.`;
  const asunto = `${n.categoria ?? "Tu sistema"}: propuesta lista para implementar`;
  const correo =
    `${hola}\n\nSoy ${vendedor}, de Vordia. Vi tu pedido "${quePide(n)}" y creo que podemos resolverlo rápido.\n\n` +
    `Tenemos ${producto} ya funcionando, así que no arrancamos de cero:\n${kit}\n\n` +
    `Inversión de referencia: desde ${desde}, con soporte incluido.\n\n` +
    `Si te parece, coordinamos una demo de 15 minutos esta semana y te paso una propuesta cerrada el mismo día.\n\n` +
    `Saludos,\n${vendedor}\nVordia · vordia.com.py`;
  const plataforma = esIngles(n)
    ? `Hi! We are Vordia, a software company with a ready-to-use platform for this kind of project, so we don't start from scratch.\n\n` +
      `What we propose for "${quePide(n)}":\n- ${kit}\n- Delivery in short iterations with a working demo from week 1.\n- Support and maintenance included.\n\n` +
      `Reference investment: from USD ${n.precioSetupSugeridoUsd.toLocaleString("en-US")} + USD ${n.precioMensualSugeridoUsd.toLocaleString("en-US")}/month.\n` +
      `Happy to do a 15-minute call to confirm scope and send a fixed-price proposal the same day.`
    : `Hola! Somos Vordia, empresa de software con una plataforma ya funcionando para este tipo de proyecto, así que no empezamos de cero.\n\n` +
      `Lo que proponemos para "${quePide(n)}":\n- ${kit}\n- Entregas cortas, con demo funcionando desde la primera semana.\n- Soporte y mantenimiento incluidos.\n\n` +
      `Inversión de referencia: desde ${desde}.\n` +
      `Podemos hacer una llamada de 15 minutos para confirmar el alcance y enviar la propuesta cerrada el mismo día.`;
  if (LICITACION.includes(n.fuente)) {
    // Licitación: el contacto es la unidad de compras; se escribe como consulta formal sobre el llamado
    if (esIngles(n)) {
      const saludo = nombre || "procurement team";
      return {
        whatsapp: `Hello ${saludo}, this is ${vendedor} from Vordia (software company). We are interested in the tender "${quePide(n)}" and would like to confirm the submission requirements and deadline. Could you tell us the best way to send our questions? Thank you!`,
        asunto: `Enquiry about the tender: ${quePide(n)}`,
        correo:
          `Dear ${saludo},\n\nMy name is ${vendedor} and I represent Vordia, a software company with a ready-to-deploy management platform.\n\n` +
          `We are interested in bidding for "${quePide(n)}" and would appreciate your help with:\n` +
          `1. Confirmation of the deadline and the submission channel.\n2. Whether foreign suppliers and remote delivery are accepted.\n3. Any clarification document or technical annex available.\n\n` +
          `Our solution: ${kit}\n\nThank you in advance. We remain at your disposal for a short call.\n\nKind regards,\n${vendedor}\nVordia · vordia.com.py`,
        plataforma,
      };
    }
    const saludo = nombre || "equipo de la Unidad de Contrataciones";
    return {
      whatsapp: `Buen día ${saludo}, le saluda ${vendedor} de Vordia (empresa de software). Nos interesa participar en el llamado "${quePide(n)}". ¿Podría confirmarnos el canal para enviar consultas y el plazo de presentación? Muchas gracias.`,
      asunto: `Consulta sobre el llamado: ${quePide(n)}`,
      correo:
        `Estimado/a ${saludo}:\n\nMi nombre es ${vendedor} y represento a Vordia, empresa de software con una plataforma de gestión lista para implementar.\n\n` +
        `Nos interesa participar en el llamado "${quePide(n)}" y quisiéramos confirmar:\n` +
        `1. Plazo y canal de presentación de ofertas.\n2. Si existe adenda, aclaración o anexo técnico publicado.\n3. El contacto para consultas técnicas.\n\n` +
        `Nuestra propuesta de base: ${producto}. ${kit}\n\nQuedamos atentos y agradecemos de antemano su respuesta.\n\nAtentamente,\n${vendedor}\nVordia · vordia.com.py`,
      plataforma,
    };
  }
  return { whatsapp, asunto, correo, plataforma };
}

function mensajePedido(p: Pedido, vendedor: string) {
  const f = (v: number) => v.toLocaleString("es-PY", { maximumFractionDigits: 0 });
  const hola = p.clienteNombre ? `Hola ${p.clienteNombre.split(" ")[0]}!` : "Hola!";
  return (
    `${hola} Te paso el pedido ${p.numero} de Vordia:\n\n` +
    `• ${p.producto}\n` +
    `• ${p.moneda} ${f(p.precioSetup)} de implementación${p.precioMensual ? ` + ${p.moneda} ${f(p.precioMensual)}/mes` : ""}\n` +
    `• Listo en ${p.plazoDias} días\n\n` +
    `Podés verlo y aceptarlo con un clic acá:\n${linkPedido(p.token)}\n\n` +
    `Válido hasta el ${new Date(p.validoHasta).toLocaleDateString("es-PY")}. Cualquier duda, respondeme por acá.\n${vendedor}`
  );
}

const PEDIDO_TONE: Record<string, string> = {
  Borrador: "bg-white/5 text-slate-400 border-white/10",
  Enviado: "bg-[#007bff]/20 text-[#5eb0ff] border-[#007bff]/35",
  Visto: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Aceptado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Pagado: "bg-emerald-500/25 text-emerald-200 border-emerald-400/40",
  Rechazado: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Vencido: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function FuenteIcon({ fuente }: { fuente: string }) {
  if (LICITACION.includes(fuente) && fuente !== "BancoMundial") return <Landmark size={12} />;
  if (fuente === "BancoMundial") return <Building2 size={12} />;
  if (fuente === "Freelancer") return <Globe size={12} />;
  if (fuente === "RSS") return <Rss size={12} />;
  return <PenLine size={12} />;
}

const FUENTE_LABEL: Record<string, string> = {
  DNCP: "Licitación DNCP",
  SECOP: "Licitación Colombia",
  BancoMundial: "Banco Mundial",
  PNCP: "Licitação Brasil",
  ContractsFinder: "Licitación Reino Unido",
  SEACE: "Licitación Perú",
  ARCE: "Licitación Uruguay",
  MercadoPublico: "Licitación Chile",
  PNUD: "PNUD · Naciones Unidas",
  Freelancer: "Freelancer.com",
  RSS: "Alerta RSS",
  Manual: "Carga manual",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.mensaje || msg;
    } catch {
      /* sin cuerpo */
    }
    throw new Error(msg);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

/* ───────────── Página ───────────── */

export function VordiaMercadoPage({ empresaId, usuario, onNavigate }: Props) {
  const [items, setItems] = useState<Necesidad[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("Activas");
  const [filtroVertical, setFiltroVertical] = useState("");
  const [filtroFuente, setFiltroFuente] = useState("");
  const [minPuntaje, setMinPuntaje] = useState("40");
  const [filtroAlcance, setFiltroAlcance] = useState("");
  const [minConfianza, setMinConfianza] = useState("");
  const [conContacto, setConContacto] = useState(false);
  const [q, setQ] = useState("");
  const [qAplicada, setQAplicada] = useState("");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [fuentesOpen, setFuentesOpen] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [contactar, setContactar] = useState<Necesidad | null>(null);
  const [armarPedido, setArmarPedido] = useState<Necesidad | null>(null);
  const vendedor = usuario?.nombre?.split(" ")[0] ?? "el equipo";

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ empresaId: String(empresaId) });
      if (filtroEstado) params.set("estado", filtroEstado);
      if (filtroVertical) params.set("vertical", filtroVertical);
      if (filtroFuente) params.set("fuente", filtroFuente);
      if (minPuntaje) params.set("minPuntaje", minPuntaje);
      if (filtroAlcance) params.set("alcance", filtroAlcance);
      if (minConfianza) params.set("minConfianza", minConfianza);
      if (conContacto) params.set("conContacto", "true");
      if (qAplicada) params.set("q", qAplicada);
      const [lista, res, peds] = await Promise.all([
        api<Necesidad[]>(`/api/Mercado/necesidades?${params}`),
        api<Resumen>(`/api/Mercado/resumen?empresaId=${empresaId}`),
        api<Pedido[]>(`/api/Mercado/pedidos?empresaId=${empresaId}`).catch(() => [] as Pedido[]),
      ]);
      setItems(lista);
      setResumen(res);
      setPedidos(peds);
    } catch (e) {
      toast.error("No se pudieron cargar las necesidades", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [empresaId, filtroEstado, filtroVertical, filtroFuente, minPuntaje, filtroAlcance, minConfianza, conContacto, qAplicada]);

  useEffect(() => {
    if (empresaId) void cargar();
  }, [empresaId, cargar]);

  const buscarAhora = async () => {
    try {
      setBuscando(true);
      const r = await api<{ nuevas: number; revisadas: number; fuentes: { nombre: string; ok: boolean; mensaje?: string }[] }>(
        `/api/Mercado/sincronizar?empresaId=${empresaId}`,
        { method: "POST" },
      );
      const errores = r.fuentes.filter((f) => !f.ok);
      toast.success(r.nuevas ? `${r.nuevas} pedidos nuevos detectados` : "Sin pedidos nuevos por ahora", {
        description: `${r.revisadas} revisados en ${r.fuentes.length} fuentes${errores.length ? ` · ${errores.length} con error` : ""}`,
      });
      await cargar();
    } catch (e) {
      toast.error("No se pudo buscar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBuscando(false);
    }
  };

  const actualizar = async (n: Necesidad, cambios: { estado?: string; notas?: string }) => {
    try {
      const upd = await api<Necesidad>(`/api/Mercado/necesidades/${n.necesidadId}`, {
        method: "PATCH",
        body: JSON.stringify({ empresaId, ...cambios, responsableNombre: n.responsableNombre ?? usuario?.nombre }),
      });
      setItems((xs) => xs.map((x) => (x.necesidadId === upd.necesidadId ? upd : x)));
      if (cambios.estado) toast.success(`→ ${cambios.estado}`);
    } catch (e) {
      toast.error("No se pudo actualizar", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const aCrm = async (n: Necesidad) => {
    try {
      const r = await api<{ clienteId?: number; mensaje: string }>(`/api/Mercado/necesidades/${n.necesidadId}/crm`, {
        method: "POST",
        body: JSON.stringify({ empresaId, usuarioNombre: usuario?.nombre }),
      });
      toast.success(r.mensaje, {
        action: onNavigate ? { label: "Ver CRM", onClick: () => onNavigate("vordia_pipeline") } : undefined,
      });
      await cargar();
    } catch (e) {
      toast.error("No se pudo pasar al CRM", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const aProducto = async (n: Necesidad) => {
    try {
      const r = await api<{ mensaje: string }>(`/api/Mercado/necesidades/${n.necesidadId}/producto`, {
        method: "POST",
        body: JSON.stringify({ empresaId, usuarioNombre: usuario?.nombre }),
      });
      toast.success(r.mensaje, {
        action: onNavigate ? { label: "Ver Roadmap", onClick: () => onNavigate("vordia_roadmap") } : undefined,
      });
      await cargar();
    } catch (e) {
      toast.error("No se pudo crear la idea", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const oportunidadAProducto = async (o: Oportunidad) => {
    try {
      const r = await api<{ mensaje: string }>(`/api/Mercado/oportunidades/producto`, {
        method: "POST",
        body: JSON.stringify({ empresaId, categoria: o.categoria, usuarioNombre: usuario?.nombre }),
      });
      toast.success(r.mensaje, {
        action: onNavigate ? { label: "Ver Roadmap", onClick: () => onNavigate("vordia_roadmap") } : undefined,
      });
      await cargar();
    } catch (e) {
      toast.error("No se pudo crear el producto", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const estadoPedido = async (p: Pedido, estado: string, canal?: string) => {
    try {
      const upd = await api<Pedido>(`/api/Mercado/pedidos/${p.pedidoId}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ empresaId, estado, canal, usuarioNombre: usuario?.nombre }),
      });
      setPedidos((xs) => xs.map((x) => (x.pedidoId === upd.pedidoId ? upd : x)));
      if (estado === "Pagado") toast.success(`Pedido ${p.numero} cobrado 🎉`);
      if (estado === "Pagado") void cargar();
    } catch (e) {
      toast.error("No se pudo actualizar el pedido", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const enviarPedidoWhatsApp = (p: Pedido) => {
    abrirWhatsApp(numeroWhatsApp(p.clienteTelefono), mensajePedido(p, vendedor));
    void estadoPedido(p, "Enviado", "WhatsApp");
  };

  const kpis = useMemo(
    () => [
      { l: "Pedidos detectados", v: resumen?.total ?? 0, icon: <Inbox size={14} />, hint: `${resumen?.nuevas7d ?? 0} nuevos en 7 días` },
      { l: "Calientes", v: resumen?.calientes ?? 0, icon: <Flame size={14} />, hint: "Puntaje ≥ 70 sin gestionar", hot: true },
      { l: "Confiables", v: resumen?.confiables ?? 0, icon: <ShieldCheck size={14} />, hint: "Comprador seguro y buen encaje", hot: true },
      { l: "En gestión", v: resumen?.enGestion ?? 0, icon: <Handshake size={14} />, hint: "Evaluando · contactada · propuesta" },
      { l: "Pasados al CRM", v: resumen?.convertidasCrm ?? 0, icon: <Users size={14} /> },
      { l: "Ganados", v: resumen?.ganadas ?? 0, icon: <Trophy size={14} /> },
    ],
    [resumen],
  );

  return (
    <div className="vordia-hq-page animate-in fade-in duration-300 space-y-4">
      {/* Encabezado */}
      <div className={`${CARD} flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between p-4 lg:p-5`}>
        <div className="min-w-0">
          <p className="text-sm text-white font-medium flex items-center gap-2">
            <Radar size={16} className="text-[#007bff] shrink-0" />
            Necesidades del Mercado
          </p>
          <p className="text-xs text-[#94a3b8] mt-1">
            Radar de pedidos reales de sistemas y aplicaciones en Paraguay, Latinoamérica y el mundo (licitaciones de Paraguay, Brasil, Colombia, Perú, Uruguay y Chile, PNUD para toda Sudamérica, Reino Unido, Banco Mundial, Freelancer.com, alertas RSS y captura desde Workana, Facebook o LinkedIn).
            {resumen?.ultimaSync ? ` Última búsqueda ${hace(resumen.ultimaSync)}.` : " Todavía no se buscó."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <Button onClick={() => setFuentesOpen(true)} variant="outline" className="rounded-xl border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white gap-2">
            <Settings2 size={15} /> Fuentes
          </Button>
          <Button onClick={() => setManualOpen(true)} variant="outline" className="rounded-xl border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white gap-2">
            <PenLine size={15} /> Cargar pedido
          </Button>
          <Button onClick={() => void buscarAhora()} disabled={buscando} className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
            <RefreshCw size={15} className={buscando ? "animate-spin" : ""} />
            {buscando ? "Buscando en internet…" : "Buscar ahora"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 lg:gap-3">
        {kpis.map((k) => (
          <div key={k.l} className={`rounded-2xl border p-3.5 min-w-0 ${k.hot && k.v > 0 ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-white/5 bg-[#0C1327]"}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{k.l}</p>
              <span className={k.hot && k.v > 0 ? "text-emerald-300" : "text-[#5eb0ff] opacity-80"}>{k.icon}</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">{k.v}</p>
            {k.hint ? <p className="text-[10px] text-slate-500 mt-0.5">{k.hint}</p> : null}
          </div>
        ))}
      </div>

      {pedidos.length > 0 && (
        <PanelPedidos
          pedidos={pedidos}
          onWhatsApp={enviarPedidoWhatsApp}
          onCopiar={(p) => {
            void copiar(mensajePedido(p, vendedor), "Mensaje con el link copiado");
            if (p.estado === "Borrador") void estadoPedido(p, "Enviado", "Plataforma");
          }}
          onPagado={(p) => void estadoPedido(p, "Pagado")}
        />
      )}

      {/* Productos rápidos */}
      {resumen && resumen.oportunidades.length > 0 && (
        <section className={`${CARD} p-4 lg:p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <p className="text-sm text-white font-medium flex items-center gap-2">
              <Sparkles size={16} className="text-amber-300" />
              Microapps que el mercado está pidiendo
            </p>
            <p className="text-[11px] text-slate-500">Pedidos repetidos de los últimos 60 días · construila una vez, cobrá implementación + mensualidad a muchos</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {resumen.oportunidades.map((o) => (
              <div key={o.categoria} className="rounded-2xl border border-white/5 bg-[#050B18] p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-snug">{o.categoria}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5eb0ff] shrink-0">{VERTICALES[o.vertical] ?? o.vertical}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                  <span><b className="text-white">{o.cantidad}</b> pedidos</span>
                  {o.calientesAltas ? <span className="text-emerald-300">{o.calientesAltas} calientes</span> : null}
                  {o.presupuestoMedianoUsd ? <span>mediana USD {o.presupuestoMedianoUsd.toLocaleString("es-PY")}</span> : null}
                </div>
                <p className="text-[12px] text-slate-300 mt-3 leading-relaxed">{o.productoRapido}</p>
                <p className="text-[11px] text-slate-500 mt-1">Base: {o.productoVordia}</p>
                <div className="mt-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2">
                  <p className="text-[11px] text-slate-400">Precio sugerido</p>
                  <p className="text-[13px] font-semibold text-white">
                    {usd(o.precioSetupUsd)} <span className="text-slate-400 font-normal">implementación</span> + {usd(o.precioMensualUsd)}<span className="text-slate-400 font-normal">/mes</span>
                  </p>
                  <p className="text-[11px] text-emerald-300 mt-0.5">10 clientes = {usd(o.mrr10ClientesUsd)}/mes recurrente</p>
                </div>
                <ul className="mt-2 space-y-0.5">
                  {o.ejemplos.slice(0, 2).map((e) => (
                    <li key={e} className="text-[11px] text-slate-500 truncate" title={e}>• {e}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-3">
                  {o.roadmapId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate?.("vordia_roadmap")}
                      className="w-full rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:text-white"
                    >
                      En el Roadmap ✓
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void oportunidadAProducto(o)} className="w-full rounded-xl bg-amber-500/90 hover:bg-amber-400 text-[#1a1203] font-bold gap-1.5">
                      <Lightbulb size={14} /> Crear producto rápido
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-2">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setQAplicada(q.trim());
          }}
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => setQAplicada(q.trim())} placeholder="Buscar en pedidos (ej. inventario, clínica, ministerio…)" className={`${FIELD} pl-9 h-10`} />
        </form>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
          <button
            type="button"
            onClick={() => setConContacto((v) => !v)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm ${
              conContacto ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-[#050B18] text-slate-300"
            }`}
          >
            <Phone size={14} /> Con contacto
          </button>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={SELECT}>
            <option value="Activas">Abiertas</option>
            <option value="Gestion">En gestión</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            <option value="">Todas</option>
          </select>
          <select value={minPuntaje} onChange={(e) => setMinPuntaje(e.target.value)} className={SELECT}>
            <option value="70">Calientes (≥ 70)</option>
            <option value="40">Relevantes (≥ 40)</option>
            <option value="">Todas</option>
          </select>
          <select value={filtroAlcance} onChange={(e) => setFiltroAlcance(e.target.value)} className={SELECT}>
            <option value="">Todo el mundo</option>
            {Object.entries(ALCANCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={minConfianza} onChange={(e) => setMinConfianza(e.target.value)} className={SELECT}>
            <option value="">Cualquier comprador</option>
            <option value="70">Solo confiables (≥ 70)</option>
            <option value="45">Confiables + verificar</option>
          </select>
          <select value={filtroFuente} onChange={(e) => setFiltroFuente(e.target.value)} className={SELECT}>
            <option value="">Todas las fuentes</option>
            {Object.entries(FUENTE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filtroVertical} onChange={(e) => setFiltroVertical(e.target.value)} className={SELECT}>
            <option value="">Todos los productos</option>
            {Object.entries(VERTICALES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Lista */}
      <section className={`${CARD} overflow-hidden`}>
        {loading ? (
          <p className="p-8 text-slate-500 text-sm">Cargando necesidades…</p>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Radar size={26} className="mx-auto text-[#007bff] mb-3" />
            <p className="text-sm text-white">No hay pedidos con estos filtros.</p>
            <p className="text-xs text-slate-500 mt-1">Probá “Buscar ahora”, bajá el puntaje mínimo o cargá un pedido que viste en Facebook o WhatsApp.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((n) => (
              <FilaNecesidad
                key={n.necesidadId}
                n={n}
                abierta={abierta === n.necesidadId}
                onToggle={() => setAbierta((a) => (a === n.necesidadId ? null : n.necesidadId))}
                onEstado={(estado) => void actualizar(n, { estado })}
                onNotas={(notas) => void actualizar(n, { notas })}
                onCrm={() => void aCrm(n)}
                onProducto={() => void aProducto(n)}
                onContactar={() => setContactar(n)}
                onPedido={() => setArmarPedido(n)}
              />
            ))}
          </div>
        )}
      </section>
      {!loading && items.length >= 300 ? <p className="text-[11px] text-slate-500">Se muestran los 300 pedidos con mejor puntaje. Ajustá los filtros para ver más.</p> : null}

      {manualOpen && (
        <ManualModal
          empresaId={empresaId}
          usuarioNombre={usuario?.nombre}
          onClose={() => setManualOpen(false)}
          onSaved={() => {
            setManualOpen(false);
            void cargar();
          }}
        />
      )}
      {fuentesOpen && <FuentesModal empresaId={empresaId} onClose={() => setFuentesOpen(false)} />}
      {contactar && (
        <ContactarModal
          empresaId={empresaId}
          n={contactar}
          usuarioNombre={usuario?.nombre}
          vendedor={vendedor}
          onClose={() => setContactar(null)}
          onCambio={(upd) => setItems((xs) => xs.map((x) => (x.necesidadId === upd.necesidadId ? { ...x, ...upd } : x)))}
          onPedido={() => {
            const n = contactar;
            setContactar(null);
            setArmarPedido(n);
          }}
        />
      )}
      {armarPedido && (
        <PedidoModal
          empresaId={empresaId}
          n={armarPedido}
          usuarioNombre={usuario?.nombre}
          vendedor={vendedor}
          onClose={() => setArmarPedido(null)}
          onCreado={() => void cargar()}
          onEstado={(p, estado, canal) => estadoPedido(p, estado, canal)}
        />
      )}
    </div>
  );
}

/* ───────────── Fila ───────────── */

function FilaNecesidad({
  n, abierta, onToggle, onEstado, onNotas, onCrm, onProducto, onContactar, onPedido,
}: {
  n: Necesidad;
  abierta: boolean;
  onToggle: () => void;
  onEstado: (e: string) => void;
  onNotas: (t: string) => void;
  onCrm: () => void;
  onProducto: () => void;
  onContactar: () => void;
  onPedido: () => void;
}) {
  const [notas, setNotas] = useState(n.notas ?? "");
  const cierre = diasPara(n.fechaCierre);
  const ppto = presupuesto(n);

  return (
    <div className="p-4 hover:bg-white/[0.015] transition">
      <div className="flex gap-3">
        <div className={`h-11 w-11 shrink-0 rounded-xl border flex flex-col items-center justify-center ${puntajeTone(n.puntaje)}`} title={n.motivoPuntaje ?? ""}>
          <span className="text-sm font-bold leading-none tabular-nums">{n.puntaje}</span>
          <span className="text-[8px] uppercase tracking-wider opacity-70 mt-0.5">pts</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <FuenteIcon fuente={n.fuente} /> {FUENTE_LABEL[n.fuente] ?? n.fuente}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${estadoTone(n.estado)}`}>{n.estado}</span>
            <Confianza n={n} />
            {n.categoria ? <span className="text-[10px] text-[#5eb0ff]">{n.categoria}</span> : null}
            {n.clienteId ? <span className="text-[10px] text-emerald-300">· en CRM</span> : null}
            {n.roadmapId ? <span className="text-[10px] text-amber-300">· en Roadmap</span> : null}
          </div>
          <button type="button" onClick={onToggle} className="text-left w-full">
            <p className="text-sm font-medium text-white leading-snug hover:text-[#5eb0ff]">{n.titulo}</p>
          </button>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500">
            {n.solicitante ? <span className="text-slate-400">{n.solicitante}</span> : null}
            {n.pais || n.alcance ? (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {n.pais ?? ALCANCE_LABEL[n.alcance ?? ""] ?? n.alcance}
              </span>
            ) : null}
            {ppto ? <span className="text-slate-300 font-medium">{ppto}</span> : null}
            {n.competidores != null ? (
              <span className={n.competidores > 50 ? "text-rose-300/80" : n.competidores <= 10 ? "text-emerald-300/80" : ""}>{n.competidores} propuestas</span>
            ) : null}
            <span>{hace(n.fechaPublicacion ?? n.fechaCaptura)}</span>
            {cierre != null && cierre >= 0 ? (
              <span className={`inline-flex items-center gap-1 ${cierre <= 3 ? "text-rose-300" : "text-amber-300/90"}`}>
                <CalendarClock size={11} /> cierra {cierre === 0 ? "hoy" : `en ${cierre} d`} ({fecha(n.fechaCierre)})
              </span>
            ) : null}
          </div>
          {n.motivoPuntaje ? <p className="text-[11px] text-slate-500 mt-1">{n.motivoPuntaje}</p> : null}
          {n.contactoEmail || n.contactoTelefono ? (
            <div className="mt-2 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1.5 text-[12px]">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-300" title={n.contactoOrigen ?? ""}>
                <BadgeCheck size={12} /> {n.contactoOrigen?.startsWith("Oficial") ? "Contacto oficial" : "Contacto"}
              </span>
              {n.contactoNombre ? <span className="text-slate-200">{n.contactoNombre}</span> : null}
              {n.contactoEmail ? (
                <a href={`mailto:${n.contactoEmail}`} className="text-[#5eb0ff] hover:underline">
                  {n.contactoEmail}
                </a>
              ) : null}
              {n.contactoTelefono ? (
                <a href={`tel:+${numeroWhatsApp(n.contactoTelefono, n.alcance, n.pais)}`} className="inline-flex items-center gap-1 text-slate-200 hover:text-white">
                  <Phone size={11} /> {n.contactoTelefono}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <button type="button" onClick={onToggle} className="self-start text-slate-500 hover:text-white p-1" aria-label={abierta ? "Ocultar detalle" : "Ver detalle"}>
          {abierta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {abierta && (
        <div className="mt-3 ml-0 sm:ml-14 space-y-3">
          {n.descripcion ? (
            <p className="text-[12px] text-slate-300 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto rounded-xl bg-[#050B18] border border-white/5 p-3">{n.descripcion}</p>
          ) : null}
          {n.confianzaMotivo ? (
            <p className="text-[12px] text-slate-300">
              <span className="text-slate-500">Confianza del comprador: </span>
              {n.confianzaMotivo}
            </p>
          ) : null}
          {n.habilidades ? <p className="text-[11px] text-slate-500">Requisitos: {n.habilidades}</p> : null}
          {n.productoSugerido ? (
            <p className="text-[12px] text-slate-300">
              <span className="text-slate-500">Cómo lo resolvemos rápido: </span>
              {n.productoSugerido}
            </p>
          ) : null}
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={() => notas !== (n.notas ?? "") && onNotas(notas)}
            placeholder="Notas internas (contacto, qué ofrecer, precio…)"
            rows={2}
            className="w-full bg-[#050B18] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#007bff]/50"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3 sm:ml-14">
        <Button size="sm" onClick={onContactar} className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[12px] gap-1.5">
          <MessageCircle size={13} /> Contactar
        </Button>
        <Button size="sm" onClick={onPedido} className="h-8 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[12px] gap-1.5">
          <FileSignature size={13} /> Armar pedido
        </Button>
        {n.url ? (
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-white/10 text-[12px] text-slate-300 hover:text-white hover:bg-white/5"
          >
            <ExternalLink size={13} /> Ver pedido
          </a>
        ) : null}
        <Button size="sm" onClick={onCrm} disabled={!!n.clienteId} className="h-8 rounded-xl bg-[#007bff] hover:bg-[#0069d9] text-[12px] gap-1.5">
          <Users size={13} /> {n.clienteId ? "Ya está en el CRM" : "Pasar al CRM"}
        </Button>
        <Button size="sm" onClick={onProducto} disabled={!!n.roadmapId} variant="outline" className="h-8 rounded-xl border-amber-500/30 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15 hover:text-white text-[12px] gap-1.5">
          <Lightbulb size={13} /> {n.roadmapId ? "En Roadmap" : "Producto rápido"}
        </Button>
        <select value={n.estado} onChange={(e) => onEstado(e.target.value)} className="!h-8 !py-0 bg-[#050B18] border border-white/10 text-slate-300 rounded-xl px-2 !text-[12px]" aria-label="Estado">
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        {n.estado !== "Descartada" ? (
          <button type="button" onClick={() => onEstado("Descartada")} className="h-8 px-2 text-[12px] text-slate-500 hover:text-rose-300">
            Descartar
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────── Pedidos enviados ───────────── */

function PanelPedidos({
  pedidos, onWhatsApp, onCopiar, onPagado,
}: {
  pedidos: Pedido[];
  onWhatsApp: (p: Pedido) => void;
  onCopiar: (p: Pedido) => void;
  onPagado: (p: Pedido) => void;
}) {
  const [verTodos, setVerTodos] = useState(false);
  const cerrados = pedidos.filter((p) => p.estado === "Aceptado" || p.estado === "Pagado");
  const abiertos = pedidos.filter((p) => ["Borrador", "Enviado", "Visto"].includes(p.estado));
  const porCobrar = pedidos.filter((p) => p.estado === "Aceptado").reduce((s, p) => s + p.precioSetup, 0);
  const mrr = cerrados.reduce((s, p) => s + p.precioMensual, 0);
  const lista = verTodos ? pedidos : pedidos.slice(0, 5);

  return (
    <section className={`${CARD} p-4 lg:p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm text-white font-medium flex items-center gap-2">
          <FileSignature size={16} className="text-emerald-300" /> Pedidos enviados
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span><b className="text-white">{abiertos.length}</b> esperando respuesta</span>
          <span><b className="text-emerald-300">{cerrados.length}</b> aceptados</span>
          <span>por cobrar <b className="text-white">{usd(porCobrar)}</b></span>
          <span className="inline-flex items-center gap-1"><Wallet size={12} /> recurrente <b className="text-emerald-300">{usd(mrr)}/mes</b></span>
        </div>
      </div>
      <div className="divide-y divide-white/5 rounded-xl border border-white/5">
        {lista.map((p) => (
          <div key={p.pedidoId} className="flex flex-col lg:flex-row lg:items-center gap-2 justify-between px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500">{p.numero}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PEDIDO_TONE[p.estado] ?? PEDIDO_TONE.Borrador}`}>{p.estado}</span>
                <span className="text-sm text-white truncate">{p.clienteNombre}</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {p.producto} · {usd(p.precioSetup)}{p.precioMensual ? ` + ${usd(p.precioMensual)}/mes` : ""}
                {p.fechaVisto && p.estado === "Visto" ? ` · lo abrió ${hace(p.fechaVisto)}` : ""}
                {p.respuestaComentario ? ` · “${p.respuestaComentario}”` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {["Borrador", "Enviado", "Visto", "Vencido"].includes(p.estado) && (
                <>
                  <Button size="sm" onClick={() => onWhatsApp(p)} className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] gap-1">
                    <MessageCircle size={12} /> {p.estado === "Borrador" ? "Enviar" : "Reenviar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onCopiar(p)} className="h-7 rounded-lg border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white text-[11px] gap-1">
                    <Copy size={12} /> Copiar
                  </Button>
                </>
              )}
              {p.estado === "Aceptado" && (
                <Button size="sm" onClick={() => onPagado(p)} className="h-7 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#04140c] font-bold text-[11px] gap-1">
                  <CheckCircle2 size={12} /> Marcar cobrado
                </Button>
              )}
              <a href={linkPedido(p.token)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] text-slate-400 hover:text-white">
                <Link2 size={12} /> Ver
              </a>
            </div>
          </div>
        ))}
      </div>
      {pedidos.length > 5 && (
        <button type="button" onClick={() => setVerTodos((v) => !v)} className="mt-2 text-[11px] text-[#5eb0ff] hover:underline">
          {verTodos ? "Ver menos" : `Ver los ${pedidos.length} pedidos`}
        </button>
      )}
    </section>
  );
}

/* ───────────── Contactar ───────────── */

function ContactarModal({
  empresaId, n, usuarioNombre, vendedor, onClose, onCambio, onPedido,
}: {
  empresaId: number;
  n: Necesidad;
  usuarioNombre?: string;
  vendedor: string;
  onClose: () => void;
  onCambio: (n: Partial<Necesidad> & { necesidadId: number }) => void;
  onPedido: () => void;
}) {
  const [canal, setCanal] = useState<"WhatsApp" | "Correo" | "Plataforma">(
    n.contactoEmail ? "Correo"
      : n.contactoTelefono && esCelular(numeroWhatsApp(n.contactoTelefono, n.alcance, n.pais)) ? "WhatsApp"
        : n.fuente === "Manual" ? "WhatsApp" : "Plataforma",
  );
  const [c, setC] = useState({ nombre: n.contactoNombre ?? "", email: n.contactoEmail ?? "", tel: n.contactoTelefono ?? "" });
  const base = useMemo(() => plantillas(n, c.nombre, vendedor), [n, c.nombre, vendedor]);
  const [textos, setTextos] = useState(base);
  const [historial, setHistorial] = useState<Contacto[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api<Contacto[]>(`/api/Mercado/necesidades/${n.necesidadId}/contactos?empresaId=${empresaId}`)
      .then((r) => vivo && setHistorial(r))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [empresaId, n.necesidadId]);

  const guardarContacto = async () => {
    if (c.nombre === (n.contactoNombre ?? "") && c.email === (n.contactoEmail ?? "") && c.tel === (n.contactoTelefono ?? "")) return;
    try {
      await api(`/api/Mercado/necesidades/${n.necesidadId}/contacto`, {
        method: "PUT",
        body: JSON.stringify({ empresaId, contactoNombre: c.nombre, contactoEmail: c.email, contactoTelefono: c.tel }),
      });
      onCambio({ necesidadId: n.necesidadId, contactoNombre: c.nombre, contactoEmail: c.email, contactoTelefono: c.tel });
    } catch {
      /* se reintenta al enviar */
    }
  };

  const registrar = async (canalUsado: string, destino: string, mensaje: string, asunto?: string) => {
    try {
      const reg = await api<Contacto>(`/api/Mercado/necesidades/${n.necesidadId}/contactos`, {
        method: "POST",
        body: JSON.stringify({ empresaId, canal: canalUsado, destino, mensaje, asunto, usuarioNombre }),
      });
      setHistorial((h) => [reg, ...h]);
      onCambio({ necesidadId: n.necesidadId, estado: ["Nueva", "Evaluando"].includes(n.estado) ? "Contactada" : n.estado });
    } catch {
      /* el contacto igual se hizo */
    }
  };

  const enviarWhatsApp = async () => {
    await guardarContacto();
    const num = numeroWhatsApp(c.tel, n.alcance, n.pais);
    abrirWhatsApp(num, textos.whatsapp);
    await registrar("WhatsApp", num || "(elegido en WhatsApp)", textos.whatsapp);
  };

  const enviarCorreo = async () => {
    if (!c.email.includes("@")) return void toast.error("Cargá el correo del cliente");
    await guardarContacto();
    try {
      setEnviando(true);
      const reg = await api<Contacto>(`/api/Mercado/necesidades/${n.necesidadId}/correo`, {
        method: "POST",
        body: JSON.stringify({ empresaId, para: c.email, asunto: textos.asunto, mensaje: textos.correo, usuarioNombre }),
      });
      setHistorial((h) => [reg, ...h]);
      onCambio({ necesidadId: n.necesidadId, estado: ["Nueva", "Evaluando"].includes(n.estado) ? "Contactada" : n.estado });
      toast.success(`Correo enviado a ${c.email}`);
    } catch (e) {
      toast.error("No se pudo enviar el correo", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setEnviando(false);
    }
  };

  const copiarPropuesta = async () => {
    await copiar(textos.plataforma, "Propuesta copiada: pegala en la plataforma");
    if (n.url) window.open(n.url, "_blank", "noopener,noreferrer");
    await registrar("Plataforma", n.url ?? FUENTE_LABEL[n.fuente] ?? n.fuente, textos.plataforma);
  };

  const area = "w-full bg-[#050B18] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#007bff]/50";

  return (
    <Modal title={`Contactar · ${quePide(n)}`} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-2.5 mb-3">
        <Input value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} onBlur={() => void guardarContacto()} placeholder="Nombre del contacto" className={FIELD} />
        <Input value={c.tel} onChange={(e) => setC({ ...c, tel: e.target.value })} onBlur={() => void guardarContacto()} placeholder="WhatsApp (ej. 0981 123 456)" className={FIELD} inputMode="tel" />
        <Input value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} onBlur={() => void guardarContacto()} placeholder="Correo" className={FIELD} inputMode="email" />
      </div>

      <div className="inline-flex w-full p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.06] mb-3">
        {(
          [
            ["WhatsApp", <MessageCircle key="w" size={14} />],
            ["Correo", <Mail key="c" size={14} />],
            ["Plataforma", <Globe key="p" size={14} />],
          ] as const
        ).map(([id, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setCanal(id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold ${canal === id ? "bg-[#007bff] text-white" : "text-slate-400"}`}
          >
            {icon} {id === "Plataforma" ? "Propuesta en la plataforma" : id}
          </button>
        ))}
      </div>

      {canal === "WhatsApp" && (
        <div className="space-y-2.5">
          <textarea value={textos.whatsapp} onChange={(e) => setTextos({ ...textos, whatsapp: e.target.value })} rows={7} className={area} />
          <Button onClick={() => void enviarWhatsApp()} className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold gap-2">
            <MessageCircle size={15} /> {c.tel ? `Abrir WhatsApp con ${c.tel}` : "Abrir WhatsApp y elegir el contacto"}
          </Button>
          {c.tel && !esCelular(numeroWhatsApp(c.tel, n.alcance, n.pais)) ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-[12px] text-amber-100">
              <span>Este número parece un teléfono fijo: puede no tener WhatsApp.</span>
              <a href={`tel:+${numeroWhatsApp(c.tel, n.alcance, n.pais)}`} className="inline-flex items-center gap-1 font-semibold text-white shrink-0">
                <Phone size={13} /> Llamar
              </a>
            </div>
          ) : null}
          <p className="text-[11px] text-slate-500">Se abre WhatsApp con el mensaje listo; solo tocás enviar. Queda registrado en el historial.</p>
        </div>
      )}

      {canal === "Correo" && (
        <div className="space-y-2.5">
          <Input value={textos.asunto} onChange={(e) => setTextos({ ...textos, asunto: e.target.value })} placeholder="Asunto" className={FIELD} />
          <textarea value={textos.correo} onChange={(e) => setTextos({ ...textos, correo: e.target.value })} rows={10} className={area} />
          <Button onClick={() => void enviarCorreo()} disabled={enviando} className="w-full bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
            <Send size={15} /> {enviando ? "Enviando…" : c.email ? `Enviar a ${c.email}` : "Cargá el correo arriba"}
          </Button>
        </div>
      )}

      {canal === "Plataforma" && (
        <div className="space-y-2.5">
          <p className="text-[12px] text-slate-400">
            {n.fuente === "DNCP" || n.fuente === "SECOP" || n.fuente === "BancoMundial"
              ? "En licitaciones se oferta por el portal oficial: copiá la presentación para tu nota de oferta y abrí el llamado."
              : "Freelancer, Workana y similares no permiten contacto externo: copiá la propuesta y pegala en la plataforma."}
          </p>
          <textarea value={textos.plataforma} onChange={(e) => setTextos({ ...textos, plataforma: e.target.value })} rows={10} className={area} />
          <Button onClick={() => void copiarPropuesta()} className="w-full bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
            <Copy size={15} /> Copiar propuesta{n.url ? " y abrir el pedido" : ""}
          </Button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-2.5">
        <p className="text-[12px] text-slate-300">¿Ya mostró interés? Mandale el pedido con precio y lo acepta con un clic.</p>
        <Button size="sm" onClick={onPedido} className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[12px] gap-1.5 shrink-0">
          <FileSignature size={13} /> Armar pedido
        </Button>
      </div>

      {historial.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Historial de contacto</p>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {historial.map((h) => (
              <li key={h.contactoId} className="text-[12px] text-slate-400 flex flex-wrap gap-x-2">
                <span className={h.resultado === "Error" ? "text-rose-300" : "text-slate-200"}>{h.canal}</span>
                <span>{h.destino}</span>
                <span className="text-slate-500">{hace(h.fecha)}{h.usuarioNombre ? ` · ${h.usuarioNombre}` : ""}</span>
                {h.resultado === "Error" ? <span className="text-rose-300">· {h.detalle}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

/* ───────────── Armar pedido ───────────── */

function PedidoModal({
  empresaId, n, usuarioNombre, vendedor, onClose, onCreado, onEstado,
}: {
  empresaId: number;
  n: Necesidad;
  usuarioNombre?: string;
  vendedor: string;
  onClose: () => void;
  onCreado: () => void;
  onEstado: (p: Pedido, estado: string, canal?: string) => Promise<void>;
}) {
  const [f, setF] = useState({
    cliente: n.contactoNombre || (n.solicitante && !n.solicitante.startsWith("Cliente en") ? n.solicitante : ""),
    email: n.contactoEmail ?? "",
    tel: n.contactoTelefono ?? "",
    producto: n.productoSugerido ?? n.categoria ?? "",
    incluye: [n.kitSugerido, "Capacitación inicial del equipo", "Soporte y actualizaciones incluidos en la mensualidad"].filter(Boolean).join("\n"),
    setup: String(n.precioSetupSugeridoUsd || ""),
    mensual: String(n.precioMensualSugeridoUsd || ""),
    plazo: "7",
    validez: "7",
    condiciones: "50% al aceptar y 50% al entregar. La mensualidad empieza a correr desde el segundo mes.",
  });
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!f.cliente.trim()) return void toast.error("Indicá a quién va el pedido");
    try {
      setGuardando(true);
      const p = await api<Pedido>("/api/Mercado/pedidos", {
        method: "POST",
        body: JSON.stringify({
          empresaId,
          necesidadId: n.necesidadId,
          clienteNombre: f.cliente,
          clienteEmail: f.email || null,
          clienteTelefono: f.tel || null,
          producto: f.producto,
          incluye: f.incluye,
          moneda: "USD",
          precioSetup: Number(f.setup) || 0,
          precioMensual: Number(f.mensual) || 0,
          plazoDias: Number(f.plazo) || 7,
          validezDias: Number(f.validez) || 7,
          condicionesPago: f.condiciones,
          usuarioNombre,
        }),
      });
      setPedido(p);
      onCreado();
      toast.success(`Pedido ${p.numero} listo para enviar`);
    } catch (e) {
      toast.error("No se pudo crear el pedido", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  const enviarCorreo = async (p: Pedido) => {
    if (!p.clienteEmail) return void toast.error("El pedido no tiene correo del cliente");
    try {
      await api(`/api/Mercado/necesidades/${n.necesidadId}/correo`, {
        method: "POST",
        body: JSON.stringify({
          empresaId,
          para: p.clienteEmail,
          asunto: `Pedido ${p.numero} · ${p.producto}`,
          mensaje: mensajePedido(p, vendedor),
          usuarioNombre,
          pedidoId: p.pedidoId,
        }),
      });
      toast.success(`Pedido enviado a ${p.clienteEmail}`);
      onCreado();
    } catch (e) {
      toast.error("No se pudo enviar el correo", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const area = "w-full bg-[#050B18] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#007bff]/50";
  const total12 = (Number(f.setup) || 0) + (Number(f.mensual) || 0) * 12;

  if (pedido) {
    const link = linkPedido(pedido.token);
    return (
      <Modal title={`Pedido ${pedido.numero} listo`} onClose={onClose}>
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5">
            <p className="text-sm text-white font-medium">{pedido.producto}</p>
            <p className="text-[12px] text-slate-300 mt-0.5">
              {usd(pedido.precioSetup)} implementación{pedido.precioMensual ? ` + ${usd(pedido.precioMensual)}/mes` : ""} · válido hasta {new Date(pedido.validoHasta).toLocaleDateString("es-PY")}
            </p>
          </div>
          <div className="flex gap-2">
            <Input readOnly value={link} className={`${FIELD} text-[12px]`} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" onClick={() => void copiar(link, "Link copiado")} className="rounded-xl border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white shrink-0">
              <Copy size={14} />
            </Button>
          </div>
          <Button
            onClick={() => {
              abrirWhatsApp(numeroWhatsApp(pedido.clienteTelefono, n.alcance, n.pais), mensajePedido(pedido, vendedor));
              void onEstado(pedido, "Enviado", "WhatsApp");
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold gap-2"
          >
            <MessageCircle size={15} /> Enviar por WhatsApp{pedido.clienteTelefono ? ` a ${pedido.clienteTelefono}` : ""}
          </Button>
          <Button onClick={() => void enviarCorreo(pedido)} disabled={!pedido.clienteEmail} className="w-full bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
            <Mail size={15} /> {pedido.clienteEmail ? `Enviar por correo a ${pedido.clienteEmail}` : "Sin correo del cliente"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void copiar(mensajePedido(pedido, vendedor), "Mensaje copiado: pegalo en la plataforma o chat");
              void onEstado(pedido, "Enviado", "Plataforma");
            }}
            className="w-full rounded-xl border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white gap-2"
          >
            <Copy size={15} /> Copiar mensaje con el link
          </Button>
          <p className="text-[11px] text-slate-500">
            El cliente abre el link, ve el detalle y toca “Acepto”. Te llega un aviso por correo y el pedido pasa a “Aceptado” en este panel.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Armar pedido rápido" onClose={onClose} wide>
      <div className="space-y-2.5">
        <div className="grid sm:grid-cols-3 gap-2.5">
          <Input value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} placeholder="Cliente / empresa *" className={FIELD} />
          <Input value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} placeholder="WhatsApp" className={FIELD} inputMode="tel" />
          <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Correo" className={FIELD} inputMode="email" />
        </div>
        <Input value={f.producto} onChange={(e) => setF({ ...f, producto: e.target.value })} placeholder="Producto *" className={FIELD} />
        <textarea value={f.incluye} onChange={(e) => setF({ ...f, incluye: e.target.value })} rows={4} placeholder="Qué incluye (una línea por ítem)" className={area} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <label className="block">
            <span className="text-[11px] text-slate-500">Implementación (USD)</span>
            <Input type="number" value={f.setup} onChange={(e) => setF({ ...f, setup: e.target.value })} className={`${FIELD} mt-1`} />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Mensualidad (USD)</span>
            <Input type="number" value={f.mensual} onChange={(e) => setF({ ...f, mensual: e.target.value })} className={`${FIELD} mt-1`} />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Entrega (días)</span>
            <Input type="number" value={f.plazo} onChange={(e) => setF({ ...f, plazo: e.target.value })} className={`${FIELD} mt-1`} />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Válido (días)</span>
            <Input type="number" value={f.validez} onChange={(e) => setF({ ...f, validez: e.target.value })} className={`${FIELD} mt-1`} />
          </label>
        </div>
        <textarea value={f.condiciones} onChange={(e) => setF({ ...f, condiciones: e.target.value })} rows={2} placeholder="Condiciones de pago" className={area} />
        <p className="text-[11px] text-slate-500">
          Precio sugerido según lo que paga el mercado por {n.categoria?.toLowerCase() ?? "este tipo de sistema"}. Primer año para el cliente:{" "}
          <span className="text-slate-300">{usd(total12)}</span>.
        </p>
        <Button onClick={() => void crear()} disabled={guardando} className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold gap-2">
          <FileSignature size={15} /> {guardando ? "Creando…" : "Crear pedido y obtener link"}
        </Button>
      </div>
    </Modal>
  );
}

/* ───────────── Carga manual ───────────── */

function ManualModal({ empresaId, usuarioNombre, onClose, onSaved }: { empresaId: number; usuarioNombre?: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ titulo: "", descripcion: "", canal: "Facebook", solicitante: "", url: "", presupuesto: "", moneda: "USD" });
  const [senales, setSenales] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const pegar = async () => {
    try {
      const txt = (await navigator.clipboard.readText()).trim();
      if (!txt) return void toast.error("El portapapeles está vacío");
      try {
        const d = JSON.parse(txt);
        if (d?.v === "vordia-pedido") {
          setF((x) => ({ ...x, titulo: String(d.t ?? "").slice(0, 300), descripcion: String(d.d ?? ""), url: String(d.u ?? ""), canal: canalDesdeHost(String(d.h ?? "")) }));
          toast.success("Pedido pegado desde la captura rápida");
          return;
        }
      } catch {
        /* texto común */
      }
      const [primera, ...resto] = txt.split("\n");
      setF((x) => ({ ...x, titulo: primera.slice(0, 300), descripcion: resto.join("\n").trim() || txt }));
    } catch {
      toast.error("El navegador no permitió leer el portapapeles", { description: "Pegá el texto a mano con Ctrl+V." });
    }
  };

  const guardar = async () => {
    if (!f.titulo.trim()) return void toast.error("Escribí qué está pidiendo");
    try {
      setGuardando(true);
      const n = await api<Necesidad>("/api/Mercado/necesidades", {
        method: "POST",
        body: JSON.stringify({
          empresaId,
          titulo: f.titulo,
          descripcion: f.descripcion || null,
          canal: f.canal,
          solicitante: f.solicitante || null,
          url: f.url || null,
          presupuestoMax: f.presupuesto ? Number(f.presupuesto) : null,
          moneda: f.moneda,
          responsableNombre: usuarioNombre,
          senales,
        }),
      });
      toast.success(`Pedido cargado · ${n.puntaje} pts · confianza ${n.confianza}`, { description: n.categoria ?? undefined });
      onSaved();
    } catch (e) {
      toast.error("No se pudo guardar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal title="Cargar pedido visto en redes o por contacto" onClose={onClose}>
      <div className="space-y-2.5">
        <Button type="button" onClick={() => void pegar()} variant="outline" className="w-full rounded-xl border-dashed border-[#007bff]/40 bg-[#007bff]/5 text-[#5eb0ff] hover:bg-[#007bff]/10 hover:text-white gap-2">
          <ClipboardPaste size={15} /> Pegar pedido copiado (Workana, Facebook, LinkedIn…)
        </Button>
        <Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="¿Qué pide? Ej.: “Busco sistema de turnos para mi clínica”" className={FIELD} />
        <textarea
          value={f.descripcion}
          onChange={(e) => setF({ ...f, descripcion: e.target.value })}
          placeholder="Detalle del pedido (pegá el texto de la publicación)"
          rows={4}
          className="w-full bg-[#050B18] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3 py-2 text-sm outline-none"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <select value={f.canal} onChange={(e) => setF({ ...f, canal: e.target.value })} className={SELECT}>
            {CANALES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Input value={f.solicitante} onChange={(e) => setF({ ...f, solicitante: e.target.value })} placeholder="Quién lo pide" className={FIELD} />
        </div>
        <Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="Link a la publicación (opcional)" className={FIELD} />
        <div className="grid grid-cols-[1fr_96px] gap-2.5">
          <Input type="number" value={f.presupuesto} onChange={(e) => setF({ ...f, presupuesto: e.target.value })} placeholder="Presupuesto (si lo mencionó)" className={FIELD} />
          <select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })} className={SELECT}>
            <option>USD</option>
            <option>PYG</option>
          </select>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#050B18] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2">¿Es un comprador confiable?</p>
          <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1.5">
            {SENALES.map((x) => (
              <label key={x.id} className={`flex items-center gap-2 text-[12px] ${x.positiva ? "text-slate-300" : "text-rose-200/80"}`}>
                <input
                  type="checkbox"
                  checked={senales.includes(x.id)}
                  onChange={(e) => setSenales((xs) => (e.target.checked ? [...xs, x.id] : xs.filter((y) => y !== x.id)))}
                  className={x.positiva ? "accent-emerald-500" : "accent-rose-500"}
                />
                {x.positiva ? "✓" : "⚠"} {x.label}
              </label>
            ))}
          </div>
        </div>
        <Button onClick={() => void guardar()} disabled={guardando} className="w-full bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2">
          <Plus size={15} /> Guardar y puntuar
        </Button>
      </div>
    </Modal>
  );
}

/* ───────────── Fuentes ───────────── */

function FuentesModal({ empresaId, onClose }: { empresaId: number; onClose: () => void }) {
  const [fuentes, setFuentes] = useState<Fuente[] | null>(null);
  const [nueva, setNueva] = useState({ tipo: "Freelancer", nombre: "", consulta: "" });
  const [version, setVersion] = useState(0);
  const cargar = () => setVersion((v) => v + 1);

  useEffect(() => {
    let vivo = true;
    api<Fuente[]>(`/api/Mercado/fuentes?empresaId=${empresaId}`)
      .then((r) => vivo && setFuentes(r))
      .catch(() => vivo && setFuentes([]));
    return () => {
      vivo = false;
    };
  }, [empresaId, version]);

  const guardar = async (body: Partial<Fuente> & { tipo: string; nombre: string }, id?: number) => {
    try {
      await api(`/api/Mercado/fuentes${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({ empresaId, activa: true, ...body }),
      });
      await cargar();
      return true;
    } catch (e) {
      toast.error("No se pudo guardar la fuente", { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  };

  const eliminar = async (f: Fuente) => {
    if (!confirm(`¿Quitar la fuente "${f.nombre}"? Los pedidos ya detectados se conservan.`)) return;
    await api(`/api/Mercado/fuentes/${f.fuenteId}?empresaId=${empresaId}`, { method: "DELETE" });
    await cargar();
  };

  return (
    <Modal title="Fuentes del radar" onClose={onClose} wide>
      <p className="text-[12px] text-slate-400 mb-3">
        El radar revisa estas fuentes automáticamente cada 6 horas (y cuando tocás “Buscar ahora”).
      </p>
      <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
        {(fuentes ?? []).map((f) => (
          <div key={f.fuenteId} className="flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-[#050B18] px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-white flex items-center gap-1.5">
                <FuenteIcon fuente={f.tipo} /> {f.nombre}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {f.tipo === "DNCP"
                  ? "Llamados abiertos de software y digitalización"
                  : f.tipo === "SECOP"
                    ? "Procesos publicados de software, plataformas y digitalización"
                    : f.tipo === "ARCE"
                      ? "Llamados vigentes de software, con correo del organismo"
                      : f.tipo === "PNUD"
                        ? "Llamados de TI del PNUD en los 12 países de Sudamérica"
                        : f.tipo === "MercadoPublico"
                          ? f.consulta ? "Ticket cargado" : "Falta el ticket gratuito de api.mercadopublico.cl"
                          : f.consulta}
              </p>
              {f.tipo === "MercadoPublico" && !f.consulta ? (
                <button
                  type="button"
                  onClick={() => {
                    const ticket = window.prompt("Pegá el ticket de la API de Mercado Público (lo pedís gratis en api.mercadopublico.cl):")?.trim();
                    if (ticket) void guardar({ tipo: f.tipo, nombre: f.nombre, consulta: ticket, activa: true }, f.fuenteId);
                  }}
                  className="mt-1 text-[11px] font-semibold text-[#5eb0ff] hover:underline"
                >
                  Cargar ticket y activar
                </button>
              ) : null}
              {f.ultimaSync ? <p className="text-[10px] text-slate-500 mt-0.5">{hace(f.ultimaSync)} · {f.ultimoResultado}</p> : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={f.activa}
                  onChange={(e) => void guardar({ tipo: f.tipo, nombre: f.nombre, consulta: f.consulta, activa: e.target.checked }, f.fuenteId)}
                  className="accent-[#007bff]"
                />
                Activa
              </label>
              <button type="button" onClick={() => void eliminar(f)} className="text-slate-500 hover:text-rose-300 p-1" aria-label="Quitar fuente">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {fuentes && fuentes.length === 0 ? <p className="text-sm text-slate-500">Sin fuentes. Agregá una abajo.</p> : null}
      </div>

      <div className="mt-4 rounded-xl border border-white/5 p-3.5 space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Agregar fuente</p>
        <div className="grid sm:grid-cols-[150px_1fr] gap-2.5">
          <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })} className={SELECT}>
            <option value="Freelancer">Freelancer.com</option>
            <option value="RSS">Alerta RSS</option>
            <option value="DNCP">Licitaciones DNCP (Paraguay)</option>
            <option value="SECOP">Licitaciones SECOP (Colombia)</option>
            <option value="BancoMundial">Banco Mundial</option>
            <option value="PNCP">Licitações Brasil (PNCP)</option>
            <option value="ContractsFinder">Licitaciones Reino Unido</option>
            <option value="SEACE">Licitaciones Perú (SEACE)</option>
            <option value="ARCE">Licitaciones Uruguay (ARCE)</option>
            <option value="MercadoPublico">Licitaciones Chile (Mercado Público)</option>
            <option value="PNUD">PNUD · Sudamérica</option>
          </select>
          <Input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Nombre (ej. Freelancer · clínicas)" className={FIELD} />
        </div>
        {!["DNCP", "SECOP", "ARCE", "PNUD"].includes(nueva.tipo) && (
          <Input
            value={nueva.consulta}
            onChange={(e) => setNueva({ ...nueva, consulta: e.target.value })}
            placeholder={
              nueva.tipo === "RSS"
                ? "URL del feed (https://www.google.com/alerts/feeds/…)"
                : nueva.tipo === "BancoMundial" || nueva.tipo === "ContractsFinder"
                  ? "Palabras en inglés (ej. software, digital platform)"
                  : nueva.tipo === "PNCP"
                    ? "Modalidad: 6 = pregão eletrônico, 8 = compra direta"
                  : nueva.tipo === "SEACE"
                    ? "Palabras separadas por coma (ej. software, sistema, aplicativo)"
                  : nueva.tipo === "MercadoPublico"
                    ? "Ticket de la API (gratis en api.mercadopublico.cl)"
                  : "Palabras clave; idioma opcional: “booking system|en”"
            }
            className={FIELD}
          />
        )}
        {nueva.tipo === "RSS" && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Tip: en google.com/alerts creá una alerta como <span className="text-slate-300">“busco sistema” Paraguay</span> o{" "}
            <span className="text-slate-300">“necesito una app”</span>, elegí “Enviar a: Feed RSS” y pegá acá el link del feed.
          </p>
        )}
        <Button
          onClick={async () => {
            const ok = await guardar({ tipo: nueva.tipo, nombre: nueva.nombre, consulta: nueva.consulta || null });
            if (ok) {
              toast.success("Fuente agregada");
              setNueva({ tipo: nueva.tipo, nombre: "", consulta: "" });
            }
          }}
          className="bg-[#007bff] hover:bg-[#0069d9] rounded-xl font-bold gap-2"
        >
          <Plus size={15} /> Agregar
        </Button>
      </div>

      <PortalesManuales />
      <CapturaRapida />
    </Modal>
  );
}

/** Portales sin datos abiertos: se revisan a mano y lo que sirva se carga con la captura rápida. */
const PORTALES_MANUALES = [
  { nombre: "Itaipú Binacional · compras", pais: "Paraguay", url: "https://compras.itaipu.gov.py/" },
  { nombre: "Workana · proyectos de programación", pais: "Paraguay y región", url: "https://www.workana.com/jobs?category=it-programming&language=es" },
  { nombre: "COMPR.AR · compras nacionales", pais: "Argentina", url: "https://comprar.gob.ar/" },
  { nombre: "SICOES · contrataciones estatales", pais: "Bolivia", url: "https://www.sicoes.gob.bo/" },
  { nombre: "SERCOP · compras públicas", pais: "Ecuador", url: "https://www.compraspublicas.gob.ec/" },
  { nombre: "BID · avisos de adquisiciones", pais: "Sudamérica", url: "https://www.iadb.org/es/como-trabajar-juntos/adquisiciones" },
];

function PortalesManuales() {
  return (
    <div className="mt-4 rounded-xl border border-white/5 p-3.5 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Portales para revisar a mano</p>
      <p className="text-[12px] text-slate-400 leading-relaxed">
        No publican datos abiertos o bloquean la lectura automática. Abrilos, y si ves un pedido de sistema usá la captura rápida de abajo.
      </p>
      <div className="grid sm:grid-cols-2 gap-1.5">
        {PORTALES_MANUALES.map((p) => (
          <a
            key={p.url}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-[#050B18] px-3 py-2 text-[12px] text-slate-200 hover:border-[#007bff]/40"
          >
            <span className="truncate">{p.nombre}</span>
            <span className="shrink-0 text-[10px] text-slate-500">{p.pais}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Marcador "Enviar a Vordia": Workana, Facebook, LinkedIn y otras páginas sin acceso público. */
function CapturaRapida() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // React bloquea href "javascript:" al renderizar; se asigna directo en el DOM
    ref.current?.setAttribute("href", BOOKMARKLET);
  }, []);
  return (
    <div className="mt-4 rounded-xl border border-[#007bff]/25 bg-[#007bff]/5 p-3.5 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#5eb0ff] flex items-center gap-1.5">
        <Bookmark size={13} /> Captura rápida para Workana, Facebook y LinkedIn
      </p>
      <p className="text-[12px] text-slate-400 leading-relaxed">
        Estas páginas no permiten lectura automática. Arrastrá este botón a la barra de favoritos de Chrome; cuando veas un pedido, seleccioná el texto,
        tocá el favorito y después usá <span className="text-slate-200">Cargar pedido → Pegar pedido copiado</span>.
      </p>
      <a
        ref={ref}
        onClick={(e) => {
          e.preventDefault();
          toast.info("Arrastralo a la barra de favoritos; no se usa desde acá.");
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#007bff] px-3 py-2 text-[12px] font-bold text-white cursor-grab"
      >
        <Bookmark size={13} /> Enviar a Vordia
      </a>
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className={`w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[92vh] overflow-y-auto rounded-t-[1.5rem] sm:rounded-[1.5rem] border border-white/10 bg-[#0C1327] p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm font-semibold text-white">{title}</p>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
