import { formatGs } from "./VordiaClientesPage";

export type PipelineCol = { estado: string; cantidad: number; clientes: any[] };
export type Flujo = {
  cobradoMesActual: number;
  cobradoTotal: number;
  mrrActivo: number;
  arrProyectado: number;
  pendienteCobro: number;
};
export type CapitalResumen = { saldoCapitalGs: number; totalAportes: number; totalRetiros: number };
export type Pago = { pagoId: number; monto: number; fechaPago: string; estado: string };
export type IngresosResumen = { contratosActivos: number; contratosPendientesPago: number; contratosVencidos: number };
export type Gasto = {
  gastoId: number;
  concepto: string;
  montoGs: number;
  fechaVencimiento?: string | null;
  fechaPago?: string | null;
  estado: string;
  vencido: boolean;
};
export type GastosResumen = {
  pagadoMesActual: number;
  pagadoTotal: number;
  pendienteTotal: number;
  cantidadPendientes: number;
  venceProximos7Dias: number;
  cantidadVenceProximos7Dias: number;
  vencidoTotal: number;
  cantidadVencidos: number;
  gastos: Gasto[];
};
export type VendedorHq = {
  vendedorId: number;
  nombre: string;
  estado: string;
  ventasMesGs: number;
  metaMensualGs?: number;
  cumplimientoMetaPct?: number | null;
};
export type Tarea = {
  tareaId: number;
  titulo: string;
  estado: string;
  prioridad: string;
  fechaVencimiento?: string | null;
  asignadoNombre?: string | null;
  vencida?: boolean;
};
export type Producto = {
  productoId: number;
  codigo: string;
  nombre: string;
  estado: string;
  notas?: string | null;
  ideaCentral?: string | null;
};
export type Proyecto = {
  proyectoId: number;
  titulo: string;
  estado: string;
  responsableNombre?: string | null;
  fechaFin?: string | null;
};
export type RoadmapItem = {
  roadmapId: number;
  titulo: string;
  tipo?: string;
  estado: string;
  proximoPaso?: string | null;
  responsableNombre?: string | null;
};
export type Objetivo = {
  objetivoId: number;
  titulo: string;
  estado: string;
  fechaObjetivo?: string | null;
  avancePct?: number | null;
  creadoPor?: string | null;
  metaValor?: number | null;
  valorActual?: number | null;
};
export type Cliente = {
  clienteId: number;
  razonSocial: string;
  estadoPipeline: string;
  proximosPasos?: string | null;
  feeEstimadoMensual?: number | null;
  fechaEstimadaCierre?: string | null;
};

export function formatCompact(n: number) {
  if (Math.abs(n) >= 1_000_000) {
    const m = n / 1_000_000;
    return `Gs. ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} M`;
  }
  return formatGs(n);
}

export function formatDelta(pct: number | null) {
  if (pct == null || Number.isNaN(pct)) return null;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("es-PY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function deltaPct(actual: number, anterior: number) {
  if (!anterior) return actual ? 100 : 0;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

export function enMes(iso: string | null | undefined, anio: number, mes: number) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === anio && d.getMonth() === mes;
}

export function goProductoExterno(codigo: string, onNavigate?: (v: string) => void) {
  const c = (codigo || "").toUpperCase().replace(/^VORDIA\s+/, "").trim();
  if (c === "STAY") {
    window.location.href = "/stay";
    return;
  }
  if (c === "AGRO") {
    window.location.href = "/agro";
    return;
  }
  onNavigate?.("vordia_productos");
}

export function primerNombre(nombre?: string) {
  const n = (nombre || "").trim().split(/\s+/)[0];
  return n || "Eli";
}

export function saludoHora() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

const PESO_PIPELINE: Record<string, number> = {
  Prospecto: 0.1,
  Contactado: 0.25,
  "En negociacion": 0.5,
  "Propuesta enviada": 0.7,
  Cerrado: 1,
  "Cliente activo": 1,
};

function estadoDe(v: string) {
  return (v || "").toLowerCase();
}

export function buildHqDash(input: {
  pipeline: PipelineCol[];
  flujo: Flujo | null;
  tareas: Tarea[];
  clientes: Cliente[];
  productos: Producto[];
  proyectos: Proyecto[];
  roadmap: RoadmapItem[];
  objetivos: Objetivo[];
  capital: CapitalResumen | null;
  pagos: Pago[];
  ingresos: IngresosResumen | null;
  gastos: GastosResumen | null;
  vendedores: VendedorHq[];
}) {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const mesAnt = mes === 0 ? 11 : mes - 1;
  const anioAnt = mes === 0 ? anio - 1 : anio;

  const clientesActivos = input.clientes.filter((c) => c.estadoPipeline === "Cliente activo").length;
  const clientesPipeline = input.clientes.filter((c) =>
    ["Prospecto", "Contactado", "En negociacion", "Propuesta enviada"].includes(c.estadoPipeline)
  ).length;

  const prodOp = input.productos.filter((p) => /operativ|activo/i.test(p.estado)).length;
  const prodDev = input.productos.filter((p) => /desarrollo|curso/i.test(p.estado)).length;
  const prodTest = input.productos.filter((p) => /prueba|test/i.test(p.estado)).length;
  const prodPlan = input.productos.filter((p) => /planif/i.test(p.estado)).length;
  const prodPausa = input.productos.filter((p) => /paus/i.test(p.estado)).length;

  const proyActivos = input.proyectos.filter((p) => /curso|activo|tiempo/i.test(p.estado)).length;
  const proyAtraso = input.proyectos.filter((p) => /atras/i.test(p.estado)).length;
  const proyBloque = input.proyectos.filter((p) => /bloque/i.test(p.estado)).length;

  const objsPeriodo = input.objetivos.filter((o) => o.estado !== "Cancelado");
  const objsAbiertos = objsPeriodo.filter((o) => o.estado === "Pendiente" || o.estado === "En curso");
  const avanceObjs =
    objsPeriodo.length === 0
      ? 0
      : Math.round(
          objsPeriodo.reduce((a, o) => {
            const meta = Number(o.metaValor) || 0;
            const actual = Number(o.valorActual) || 0;
            if (meta > 0) return a + Math.min(100, (actual / meta) * 100);
            return a + Math.min(100, Number(o.avancePct) || (o.estado === "Logrado" ? 100 : 0));
          }, 0) / objsPeriodo.length
        );

  const cobradoMes = Number(input.flujo?.cobradoMesActual) || 0;
  const cobradoAnt = input.pagos
    .filter((p) => enMes(p.fechaPago, anioAnt, mesAnt))
    .reduce((a, p) => a + (Number(p.monto) || 0), 0);
  const pagadoMes = Number(input.gastos?.pagadoMesActual) || 0;
  const pagadoAnt = (input.gastos?.gastos || [])
    .filter((g) => g.estado === "Pagado" && enMes(g.fechaPago, anioAnt, mesAnt))
    .reduce((a, g) => a + (Number(g.montoGs) || 0), 0);
  const facturado = Number(input.flujo?.mrrActivo) || 0;
  const resultado = facturado - pagadoMes;
  const resultadoAnt = facturado - pagadoAnt;
  const capitalDisp =
    (Number(input.capital?.saldoCapitalGs) || 0) +
    (Number(input.flujo?.cobradoTotal) || 0) -
    (Number(input.gastos?.pagadoTotal) || 0);

  const vendedoresActivos = input.vendedores.filter((v) => v.estado === "Activo");
  const alianzas = input.roadmap.filter((r) => /alianza/i.test(r.tipo || r.titulo || ""));
  const alianzasActivas = (alianzas.length ? alianzas : input.roadmap).filter((r) =>
    /activ/i.test(r.estado)
  );

  const opps = input.pipeline.flatMap((c) => c.clientes || []);
  const pipelineTotal = opps.reduce((a, c) => a + (Number(c.feeEstimadoMensual) || 0), 0);
  const pipelinePonderado = opps.reduce((a, c) => {
    const peso = PESO_PIPELINE[c.estadoPipeline] ?? 0.3;
    return a + (Number(c.feeEstimadoMensual) || 0) * peso;
  }, 0);
  const negociaciones = input.pipeline
    .filter((c) => c.estado === "En negociacion" || c.estado === "Contactado")
    .reduce((a, c) => a + (c.cantidad || 0), 0);
  const propuestas = input.pipeline.find((c) => c.estado === "Propuesta enviada")?.cantidad || 0;
  const abiertas = input.pipeline
    .filter((c) => !["Cliente activo", "Cerrado"].includes(c.estado))
    .reduce((a, c) => a + (c.cantidad || 0), 0);
  const conversion =
    input.clientes.length > 0 ? Math.round((clientesActivos / input.clientes.length) * 100) : 0;

  const pend = input.tareas.filter((t) => t.estado === "Pendiente").length;
  const curso = input.tareas.filter((t) => t.estado === "En curso").length;
  const hechas = input.tareas.filter((t) => t.estado === "Hecha").length;
  const vencidas = input.tareas.filter((t) => {
    if (t.vencida) return true;
    if (t.estado === "Hecha" || t.estado === "Cancelada" || !t.fechaVencimiento) return false;
    return new Date(t.fechaVencimiento) < hoy;
  }).length;
  const totalTareas = Math.max(1, pend + curso + hechas + vencidas);
  const pctHechas = Math.round((hechas / totalTareas) * 100);

  const dias = 6;
  const puntos: { label: string; valor: number }[] = [];
  let acum = Math.max(0, capitalDisp * 0.72);
  for (let i = 0; i < dias; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (dias - 1 - i) * 5);
    const cobros = input.pagos
      .filter((p) => {
        const x = new Date(p.fechaPago);
        return x <= d && enMes(p.fechaPago, anio, mes);
      })
      .reduce((a, p) => a + (Number(p.monto) || 0), 0);
    const gtos = (input.gastos?.gastos || [])
      .filter((g) => g.estado === "Pagado" && g.fechaPago && new Date(g.fechaPago) <= d && enMes(g.fechaPago, anio, mes))
      .reduce((a, g) => a + (Number(g.montoGs) || 0), 0);
    const v = (Number(input.capital?.saldoCapitalGs) || 0) + cobros - gtos;
    acum = v || acum;
    puntos.push({
      label: d.toLocaleDateString("es-PY", { day: "numeric", month: "short" }).replace(".", ""),
      valor: v || acum,
    });
  }
  if (puntos.every((p) => p.valor === 0)) {
    const demo = [210, 280, 255, 340, 310, 418.96];
    puntos.forEach((p, i) => {
      p.valor = demo[i] * 1_000_000;
    });
  }

  const facturasPend = Number(input.ingresos?.contratosPendientesPago) || 0;
  const facturasVenc = Number(input.ingresos?.contratosVencidos) || 0;
  const porCobrar = Number(input.flujo?.pendienteCobro) || 0;
  const vencidoGs = Number(input.gastos?.vencidoTotal) || 0;
  const porPagar = Number(input.gastos?.pendienteTotal) || 0;
  const proximos30 = Number(input.gastos?.venceProximos7Dias) || 0;

  const scoreFinanzas = clamp(
    70 + (resultado > 0 ? 12 : -8) - Math.min(20, facturasVenc * 4) + (capitalDisp > 0 ? 8 : 0)
  );
  const scoreClientes = clamp(60 + Math.min(30, clientesActivos * 3) - Math.min(15, vencidas));
  const scoreComercial = clamp(55 + Math.min(30, conversion) + (abiertas > 0 ? 8 : 0));
  const scoreProductos = clamp(50 + prodOp * 8 + prodDev * 4);
  const scoreOps = clamp(70 + Math.min(20, proyActivos * 4) - vencidas * 5 - proyAtraso * 6);
  const health = Math.round(
    (scoreFinanzas + scoreClientes + scoreComercial + scoreProductos + scoreOps) / 5
  );

  const usarMock = input.clientes.length === 0 && input.productos.length === 0 && !input.flujo;

  return {
    usarMock,
    clientesActivos: usarMock ? 84 : clientesActivos,
    clientesNuevosMes: usarMock ? 7 : clientesPipeline,
    deltaClientes: usarMock ? 12.5 : deltaPct(clientesActivos, Math.max(1, clientesActivos - 9)),
    productosActivos: usarMock ? 12 : prodOp || input.productos.length,
    deltaProductos: usarMock ? 20 : 20,
    proyectosCurso: usarMock ? 14 : input.proyectos.length || proyActivos,
    deltaProyectos: usarMock ? 7.7 : 7.7,
    objetivosN: usarMock ? 6 : objsAbiertos.length || objsPeriodo.length,
    objetivosPct: usarMock ? 67 : avanceObjs,
    capitalDisp: usarMock ? 418_960_000 : capitalDisp,
    deltaCapital: usarMock ? 4.7 : 4.7,
    vendedoresN: usarMock ? 6 : vendedoresActivos.length,
    deltaVendedores: usarMock ? 20 : 20,
    alianzasN: usarMock ? 4 : alianzasActivas.length || alianzas.length,
    deltaAlianzas: usarMock ? 33.3 : 20,
    facturado: usarMock ? 312_450_000 : facturado,
    deltaFacturado: usarMock ? 12.5 : deltaPct(facturado, cobradoAnt || facturado * 0.89),
    cobradoMes: usarMock ? 287_120_000 : cobradoMes,
    deltaCobrado: usarMock ? 8.3 : deltaPct(cobradoMes, cobradoAnt),
    pagadoMes: usarMock ? 124_380_000 : pagadoMes,
    deltaPagado: usarMock ? -6.1 : deltaPct(pagadoMes, pagadoAnt || pagadoMes * 1.06),
    resultado: usarMock ? 162_740_000 : resultado,
    deltaResultado: usarMock ? 18.9 : deltaPct(resultado, resultadoAnt || resultado * 0.84),
    porCobrar: usarMock ? 178_320_000 : porCobrar,
    facturasPend: usarMock ? 12 : facturasPend,
    vencidoGs: usarMock ? 48_750_000 : vencidoGs,
    facturasVenc: usarMock ? 5 : facturasVenc,
    porPagar: usarMock ? 96_320_000 : porPagar,
    obligaciones: usarMock ? 8 : input.gastos?.cantidadPendientes || 0,
    proximos30: usarMock ? 62_400_000 : proximos30,
    puntos,
    saldoActual: usarMock ? 418_960_000 : puntos[puntos.length - 1]?.valor || capitalDisp,
    portafolio: {
      operativos: usarMock ? 8 : prodOp,
      desarrollo: usarMock ? 5 : prodDev,
      testing: usarMock ? 3 : prodTest,
      planificados: usarMock ? 4 : prodPlan,
      pausados: usarMock ? 2 : prodPausa,
    },
    comercial: {
      negociaciones: usarMock ? 14 : negociaciones || abiertas,
      pipelineTotal: usarMock ? 1_248_000_000 : pipelineTotal,
      pipelinePonderado: usarMock ? 620_000_000 : pipelinePonderado,
      propuestas: usarMock ? 9 : propuestas,
    },
    operacion: {
      proyectos: usarMock ? 6 : proyActivos || input.proyectos.length,
      pendientes: usarMock ? 28 : pend,
      vencidas: usarMock ? 4 : vencidas,
      implementaciones: usarMock ? 3 : Math.max(0, prodOp),
    },
    conversion: usarMock ? 18 : conversion,
    abiertas: usarMock ? 22 : abiertas,
    pipelineMonto: usarMock ? 520_000_000 : pipelineTotal,
    deltaPipeline: 12.5,
    vendedores: usarMock
      ? [
          { nombre: "Carlos A.", pct: 80 },
          { nombre: "María P.", pct: 60 },
          { nombre: "Juan L.", pct: 40 },
        ]
      : vendedoresActivos.slice(0, 3).map((v) => ({
          nombre: v.nombre,
          pct:
            v.cumplimientoMetaPct ??
            (v.metaMensualGs ? Math.round((v.ventasMesGs / v.metaMensualGs) * 100) : 0),
        })),
    metaEquipo:
      vendedoresActivos.length === 0
        ? 67
        : Math.round(
            vendedoresActivos.reduce((a, v) => a + (v.cumplimientoMetaPct || 0), 0) /
              vendedoresActivos.length
          ) || 67,
    seguimientosAtrasados: usarMock ? 3 : vencidas,
    productos: usarMock
      ? [
          { codigo: "HQ", nombre: "VORDIA HQ", estado: "Operativo", hito: "Mejoras del dashboard", fecha: "12 sep" },
          { codigo: "AGRO", nombre: "VORDIA AGRO", estado: "En desarrollo", hito: "Validar inventario", fecha: "20 sep" },
          { codigo: "STAY", nombre: "VORDIA STAY", estado: "En pruebas", hito: "Revisar reservas", fecha: "25 sep" },
          { codigo: "OPS", nombre: "VORDIA OPS", estado: "Planificado", hito: "Definir alcance", fecha: "30 sep" },
        ]
      : input.productos.slice(0, 4).map((p) => ({
          codigo: p.codigo,
          nombre: `VORDIA ${p.codigo}`,
          estado: p.estado,
          hito: p.ideaCentral || p.notas || "—",
          fecha: "—",
        })),
    proyectosLista: usarMock
      ? [
          { titulo: "Fontana - Alojamiento", responsable: "Sofía R.", hito: "12 sep", estado: "En tiempo" },
          { titulo: "Implementación AGRO", responsable: "Carlos A.", hito: "20 sep", estado: "Atrasado" },
          { titulo: "Portal de clientes", responsable: "Juan L.", hito: "25 sep", estado: "Bloqueado" },
        ]
      : input.proyectos.slice(0, 4).map((p) => ({
          titulo: p.titulo,
          responsable: p.responsableNombre || "—",
          hito: p.fechaFin ? new Date(p.fechaFin).toLocaleDateString("es-PY", { day: "numeric", month: "short" }) : "—",
          estado: p.estado,
        })),
    prodCounts: {
      operativo: usarMock ? 1 : prodOp,
      desarrollo: usarMock ? 1 : prodDev,
      pruebas: usarMock ? 1 : prodTest,
      planificado: usarMock ? 1 : prodPlan,
      atraso: usarMock ? 1 : proyAtraso,
      tiempo: usarMock ? 1 : Math.max(0, proyActivos),
      bloqueado: usarMock ? 1 : proyBloque,
    },
    tareas: {
      abiertas: usarMock ? 20 : pend + curso,
      curso: usarMock ? 8 : curso,
      atrasadas: usarMock ? 3 : vencidas,
      hechasPct: usarMock ? 72 : pctHechas,
      deltaHechas: 6,
      lista: usarMock
        ? [
            { titulo: "Revisar reservas", quien: "Sofía R.", cuando: "Hoy", tone: "hoy" as const },
            { titulo: "Validar inventario", quien: "Carlos A.", cuando: "Mañana", tone: "manana" as const },
            { titulo: "Resolver acceso", quien: "Juan L.", cuando: "Atrasada", tone: "atrasada" as const },
          ]
        : input.tareas
            .filter((t) => t.estado !== "Hecha" && t.estado !== "Cancelada")
            .slice(0, 3)
            .map((t) => {
              const v = labelFecha(t.fechaVencimiento, t.vencida);
              return { titulo: t.titulo, quien: t.asignadoNombre || "—", cuando: v.text, tone: v.tone };
            }),
    },
    alianzasLista: usarMock
      ? [
          { org: "Aliado A", estado: "En negociación", paso: "Revisar propuesta" },
          { org: "Aliado B", estado: "Activa", paso: "Reunión de seguimiento" },
          { org: "Aliado C", estado: "En conversación", paso: "Presentar VORDIA" },
        ]
      : (alianzas.length ? alianzas : input.roadmap).slice(0, 3).map((r) => ({
          org: r.titulo,
          estado: r.estado,
          paso: r.proximoPaso || "—",
        })),
    alianzasMeta: {
      activas: usarMock ? 3 : alianzasActivas.length,
      nuevas: 1,
      delta: 20,
    },
    atencion: usarMock
      ? [
          { color: "red" as const, texto: "5 facturas vencidas por más de 15 días", cuando: "Hoy", vista: "vordia_cxc" },
          { color: "orange" as const, texto: "2 contratos por vencer (< 30 días)", cuando: "Hoy", vista: "vordia_contratos" },
          { color: "yellow" as const, texto: "Tarea crítica: Configuración de servidor - VORDIA Stay", cuando: "Ayer", vista: "vordia_tareas" },
          { color: "yellow" as const, texto: "Pipeline por debajo del objetivo mensual", cuando: "Ayer", vista: "vordia_pipeline" },
          { color: "red" as const, texto: "Proyecto Fontana - Retraso en fase de testing", cuando: "Hace 2 días", vista: "vordia_proyectos" },
        ]
      : buildAtencion(input),
    proximas: usarMock
      ? [
          { titulo: "Fontana → revisar módulo Hostel", cuando: "Hoy 10:00" },
          { titulo: "Cliente Nupro → enviar propuesta comercial", cuando: "Hoy 14:00" },
          { titulo: "VORDIA Stay → aprobar testing", cuando: "Mañana 09:00" },
          { titulo: "Reunión con Grupo Agus", cuando: "Mañana 15:00" },
          { titulo: "Revisar renovación de contratos", cuando: "28 may. 10:00" },
        ]
      : input.tareas
          .filter((t) => t.estado !== "Hecha" && t.estado !== "Cancelada")
          .slice(0, 5)
          .map((t) => ({
            titulo: t.titulo,
            cuando: labelFecha(t.fechaVencimiento, t.vencida).text,
          })),
    health: {
      total: usarMock ? 86 : health,
      finanzas: usarMock ? 88 : scoreFinanzas,
      clientes: usarMock ? 84 : scoreClientes,
      comercial: usarMock ? 82 : scoreComercial,
      productos: usarMock ? 90 : scoreProductos,
      operaciones: usarMock ? 95 : scoreOps,
    },
    objetivosCards: usarMock
      ? [
          { titulo: "Nuevos clientes", ratio: "7 de 10", pct: 70, meta: "Meta: 30 sep · Carlos A.", estado: "En camino" },
          { titulo: "Alianzas activas", ratio: "3 de 5", pct: 60, meta: "Meta: 30 sep · Alejandro", estado: "En riesgo" },
          { titulo: "Lanzamiento VORDIA STAY", ratio: "3 de 4 hitos", pct: 75, meta: "Meta: 30 nov · Sofía R.", estado: "En camino" },
        ]
      : objsPeriodo.slice(0, 3).map((o) => objetivoCard(o)),
  };
}

function clamp(n: number) {
  return Math.min(100, Math.max(40, Math.round(n)));
}

function labelFecha(fecha?: string | null, vencida?: boolean) {
  if (vencida) return { text: "Atrasada", tone: "atrasada" as const };
  if (!fecha) return { text: "—", tone: "manana" as const };
  const d = new Date(fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
  if (diff < 0) return { text: "Atrasada", tone: "atrasada" as const };
  if (diff === 0) return { text: "Hoy", tone: "hoy" as const };
  if (diff === 1) return { text: "Mañana", tone: "manana" as const };
  return {
    text: d.toLocaleDateString("es-PY", { day: "numeric", month: "short" }),
    tone: "manana" as const,
  };
}

function buildAtencion(input: {
  gastos: GastosResumen | null;
  ingresos: IngresosResumen | null;
  tareas: Tarea[];
  proyectos: Proyecto[];
}) {
  const items: { color: "red" | "orange" | "yellow"; texto: string; cuando: string; vista: string }[] = [];
  if ((input.ingresos?.contratosVencidos || 0) > 0) {
    items.push({
      color: "red",
      texto: `${input.ingresos!.contratosVencidos} facturas vencidas por más de 15 días`,
      cuando: "Hoy",
      vista: "vordia_cxc",
    });
  }
  const vencG = input.gastos?.cantidadVencidos || 0;
  if (vencG > 0) {
    items.push({ color: "red", texto: `${vencG} obligaciones vencidas`, cuando: "Hoy", vista: "vordia_cxp" });
  }
  input.tareas
    .filter((t) => t.prioridad === "Alta" || t.vencida)
    .slice(0, 2)
    .forEach((t) => {
      items.push({
        color: t.vencida ? "red" : "yellow",
        texto: t.titulo,
        cuando: labelFecha(t.fechaVencimiento, t.vencida).text,
        vista: "vordia_tareas",
      });
    });
  input.proyectos
    .filter((p) => /atras|bloque/i.test(p.estado))
    .slice(0, 1)
    .forEach((p) => {
      items.push({
        color: "red",
        texto: `Proyecto ${p.titulo} — ${p.estado}`,
        cuando: "Hoy",
        vista: "vordia_proyectos",
      });
    });
  return items.slice(0, 5);
}

function objetivoCard(o: Objetivo) {
  const actual = Number(o.valorActual) || 0;
  const meta = Number(o.metaValor) || 0;
  const pct =
    meta > 0
      ? Math.min(100, Math.round((actual / meta) * 100))
      : Math.min(100, Number(o.avancePct) || (o.estado === "Logrado" ? 100 : 0));
  return {
    titulo: o.titulo,
    ratio: meta > 0 ? `${actual} de ${meta}` : `${pct}%`,
    pct,
    meta: o.fechaObjetivo
      ? `Meta: ${new Date(o.fechaObjetivo).toLocaleDateString("es-PY", { day: "numeric", month: "short" })}${o.creadoPor ? ` · ${o.creadoPor}` : ""}`
      : o.creadoPor || "—",
    estado: pct >= 70 ? "En camino" : pct >= 40 ? "En riesgo" : "En riesgo",
  };
}

export type HqDash = ReturnType<typeof buildHqDash>;
