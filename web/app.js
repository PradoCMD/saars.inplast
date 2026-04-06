const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR");
const APP_TIMEZONE = "America/Sao_Paulo";
const APP_FIXED_OFFSET = "-03:00";
const appDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const appDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const appTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const appIsoPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const state = {
  romaneioSelecionado: null,
  romaneiosApi: [],
  romaneiosLocais: [],
  romaneiosFiltro: "",
  romaneioSelectionMode: false,
  selectedRomaneios: [],
  estoqueFiltro: "",
  estoqueBusca: "",
  globalSearch: "",
  currentView: "cockpit",
  sidebarCollapsed: false,
  kanbanStatusFilter: "todos",
  kanbanViewMode: "board",
  kanbanSelecionado: null,
  kanbanInspectorCollapsed: true,
  kanbanDetailsExpanded: false,
  programmingActionFilter: "",
  hourlySelections: {
    montagem: { resourceId: "montagem-01", focusSku: "" },
    producao: { resourceId: "producao-01", focusSku: "" },
    extrusao: { resourceId: "extrusao-01", focusSku: "" },
  },
  hourlyPanels: {
    montagem: { sidebarCollapsed: false, tableCollapsed: false },
    producao: { sidebarCollapsed: false, tableCollapsed: false },
    extrusao: { sidebarCollapsed: false, tableCollapsed: false },
  },
  apontamentoScreen: "resumo",
  apontamentoSelecionado: "Máquina 1",
  apontamentoFilaSelecionada: null,
  apontamentoOperatorMode: false,
  apontamentoLogs: [],
  datasets: {
    kanban: { products: [], romaneios: [] },
    programming: [],
    assembly: [],
    production: [],
    extrusion: [],
    painel: [],
  },
  integrations: [],
  stockMovements: [],
  productionRules: { items: [], resourceCatalog: [], bySku: new Map(), byDescription: new Map() },
  currentUser: null,
  users: [],
  mrpRunning: false,
  lastOverviewSnapshotAt: null,
};

const LOCAL_ROMANEIOS_STORAGE_KEY = "pcp_local_romaneios_v2";
const LEGACY_LOCAL_ROMANEIOS_STORAGE_KEYS = ["pcp_local_romaneios_v1"];
const APONTAMENTO_LOGS_STORAGE_KEY = "pcp_apontamento_logs_v1";
const APP_USERS_STORAGE_KEY = "pcp_app_users_v1";
const APP_SESSION_STORAGE_KEY = "pcp_app_session_v1";
const APP_SIDEBAR_STORAGE_KEY = "pcp_sidebar_collapsed_v1";
const APP_APONTAMENTO_MODE_STORAGE_KEY = "pcp_apontamento_operator_mode_v1";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ROOT_USER = {
  id: "user-root",
  username: "root",
  full_name: "Administrador Root",
  role: "root",
  password: "root@123",
  active: true,
  created_at: "2026-04-01T00:00:00.000Z",
};

const HORA_HORA_INTERVALS = [
  ["05:20", "06:00"],
  ["06:00", "07:00"],
  ["07:00", "08:00"],
  ["08:00", "09:00"],
  ["09:00", "10:00"],
  ["10:00", "11:00"],
  ["11:00", "12:00"],
  ["12:00", "13:00"],
  ["13:00", "13:40"],
  ["13:40", "15:00"],
  ["15:00", "16:00"],
  ["16:00", "17:00"],
  ["17:00", "18:00"],
  ["18:00", "19:00"],
  ["19:00", "20:00"],
  ["20:00", "21:00"],
  ["21:00", "22:00"],
  ["22:00", "23:00"],
].map(([start, end], index) => ({
  id: `slot-${index + 1}`,
  start,
  end,
}));

const PARADAS_PLANEJADAS = [
  { code: "P1", label: "Cafe", minutes: 10 },
  { code: "P2", label: "Ginastica laboral", minutes: 10 },
  { code: "P3", label: "Refeicao", minutes: 40 },
  { code: "P4", label: "Revezamento de setores", minutes: 10 },
  { code: "P5", label: "Treinamentos", minutes: 20 },
  { code: "P6", label: "Reunioes", minutes: 15 },
];

const PARADAS_NAO_PLANEJADAS = [
  { code: "N1", label: "Setup" },
  { code: "N2", label: "Manutencao corretiva" },
  { code: "N3", label: "Manutencao de ferramenta / molde" },
  { code: "N4", label: "Regulagem de processo" },
  { code: "N5", label: "Falta de material" },
  { code: "N6", label: "Problema de qualidade" },
  { code: "N7", label: "Retrabalho" },
  { code: "N8", label: "Falta de energia" },
  { code: "N9", label: "Falta de plano de producao" },
  { code: "N10", label: "Realocacao de mao de obra" },
];

const HOURLY_MODULE_CONFIG = {
  montagem: {
    moduleKey: "montagem",
    action: "montar",
    datasetKey: "assembly",
    tableId: "assembly-table",
    heroId: "assembly-hour-hero",
    gridId: "assembly-hour-grid",
    resourceSwitcherId: "assembly-resource-switcher",
    focusId: "assembly-focus-card",
    queueId: "assembly-queue-list",
    scheduleId: "assembly-schedule-list",
    legendId: "assembly-legend",
    statusId: "assembly-hourly-status",
    shellId: "assembly-hourly-shell",
    bottomPanelId: "assembly-bottom-panel",
    toggleSidebarId: "assembly-toggle-sidebar",
    toggleTableId: "assembly-toggle-table",
    title: "Montagem",
    queueCopy: "Carregue a esteira com base na fila de acabados pendentes e nas prioridades do romaneio.",
    resources: [
      { id: "montagem-01", label: "Esteira 01", lineCode: "LINHA-01", workstationCode: "POSTO-A", machineLabel: "Maquina 1", operators: 2 },
      { id: "montagem-02", label: "Esteira 02", lineCode: "LINHA-02", workstationCode: "POSTO-B", machineLabel: "Maquina 2", operators: 2 },
    ],
  },
  producao: {
    moduleKey: "producao",
    action: "produzir",
    datasetKey: "production",
    tableId: "production-table",
    heroId: "production-hour-hero",
    gridId: "production-hour-grid",
    resourceSwitcherId: "production-resource-switcher",
    focusId: "production-focus-card",
    queueId: "production-queue-list",
    scheduleId: "production-schedule-list",
    legendId: "production-legend",
    statusId: "production-hourly-status",
    shellId: "production-hourly-shell",
    bottomPanelId: "production-bottom-panel",
    toggleSidebarId: "production-toggle-sidebar",
    toggleTableId: "production-toggle-table",
    title: "Injetoras",
    queueCopy: "Distribua a carteira das injetoras pelas seis máquinas e use as regras do H-H para orientar a próxima programação do turno.",
    resources: Array.from({ length: 6 }, (_, index) => ({
      id: `producao-${String(index + 1).padStart(2, "0")}`,
      label: `Injetora ${String(index + 1).padStart(2, "0")}`,
      lineCode: `INJ-${String(index + 1).padStart(2, "0")}`,
      aliases: [`INJ-${String(index + 1).padStart(2, "0")}`, `MAQ-${String(index + 1).padStart(2, "0")}`, `PROD-${String(index + 1).padStart(2, "0")}`],
      workstationCode: `MAQ-0${index + 1}`,
      machineLabel: `Injetora ${index + 1}`,
      operators: 1,
    })),
  },
  extrusao: {
    moduleKey: "extrusao",
    action: "produzir",
    datasetKey: "extrusion",
    tableId: "extrusion-table",
    heroId: "extrusion-hour-hero",
    gridId: "extrusion-hour-grid",
    resourceSwitcherId: "extrusion-resource-switcher",
    focusId: "extrusion-focus-card",
    queueId: "extrusion-queue-list",
    scheduleId: "extrusion-schedule-list",
    legendId: "extrusion-legend",
    statusId: "extrusion-hourly-status",
    shellId: "extrusion-hourly-shell",
    bottomPanelId: "extrusion-bottom-panel",
    toggleSidebarId: "extrusion-toggle-sidebar",
    toggleTableId: "extrusion-toggle-table",
    title: "Extrusão",
    queueCopy: "Distribua a carteira de extrusão pelas três linhas e use a disponibilidade do turno como trava para o próximo carregamento.",
    resources: Array.from({ length: 3 }, (_, index) => ({
      id: `extrusao-${String(index + 1).padStart(2, "0")}`,
      label: `Extrusora ${String(index + 1).padStart(2, "0")}`,
      lineCode: `EXTR-${String(index + 1).padStart(2, "0")}`,
      aliases: [`EXTR-${String(index + 1).padStart(2, "0")}`, `LINHA-EXTR-${String(index + 1).padStart(2, "0")}`],
      workstationCode: `EXTR-MAQ-${String(index + 1).padStart(2, "0")}`,
      machineLabel: `Extrusora ${index + 1}`,
      operators: 1,
    })),
  },
};

function formatDateTime(value) {
  return formatDateTimeWithFallback(value, "Sem previsao");
}

function parseDateValue(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T12:00:00${APP_FIXED_OFFSET}`);
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function getAppTimeParts(value) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return null;
  }
  return appIsoPartsFormatter.formatToParts(parsed).reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});
}

function buildAppIsoFromLocalText(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    return `${text}:00${APP_FIXED_OFFSET}`;
  }
  return text;
}

function formatDateTimeWithFallback(value, fallback) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return fallback;
  }
  return appDateTimeFormatter.format(parsed);
}

function formatDateWithFallback(value, fallback) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return fallback;
  }
  return appDateFormatter.format(parsed);
}

function formatTimeWithFallback(value, fallback) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return fallback;
  }
  return appTimeFormatter.format(parsed);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sumBy(items, getValue) {
  return items.reduce((total, item) => total + (Number(getValue(item)) || 0), 0);
}

function startOfToday() {
  const parts = getAppTimeParts(new Date());
  if (!parts) {
    return new Date();
  }
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00${APP_FIXED_OFFSET}`);
}

function parseIsoDate(value) {
  return parseDateValue(value);
}

function formatStatusLabel(value) {
  if (!value) {
    return "Sem previsao";
  }
  return String(value).replace(/_/g, " ");
}

function formatProductType(value) {
  const mapping = {
    materia_prima: "Matéria-prima",
    intermediario: "Intermediário",
    acabado: "Acabado",
    componente: "Componente",
  };
  return mapping[String(value || "").toLowerCase()] || (value || "Não informado");
}

function statusClass(value) {
  const normalized = (value || "").toString().toLowerCase();
  const mapping = {
    alta: "alta",
    media: "media",
    baixa: "baixa",
    high: "high",
    medium: "medium",
    low: "low",
    warning: "warning",
    ok: "ok",
    estoque: "ok",
    programado: "info",
    previsao_informada: "info",
    heuristica: "warning",
    heuristica_processo: "warning",
    sem_previsao: "missing",
    pcp_manual: "info",
    fonte: "ok",
    pending: "info",
    inactive: "info",
  };
  return mapping[normalized] || "info";
}

function emptyState(message) {
  return el(`<div class="detail-empty">${message}</div>`);
}

const apontamentoMachines = [
  {
    maquina: "Máquina 1",
    produto: "Sobretampa Poli Neo 05",
    pecasRestantes: 1854,
    produzidoHora: 116,
    somaTurno: 864,
    lote: 5500,
    previstoTermino: "2026-03-28T04:43:00-03:00",
    status: "Produzindo",
    tone: "ok",
  },
  {
    maquina: "Máquina 2",
    produto: "CP Mono Equatorial",
    pecasRestantes: 2382,
    produzidoHora: 0,
    somaTurno: 263,
    lote: 3400,
    previstoTermino: "2026-03-28T03:41:00-03:00",
    status: "Parada",
    tone: "warning",
  },
  {
    maquina: "Máquina 3",
    produto: "Linha de apoio",
    pecasRestantes: 2212,
    produzidoHora: 0,
    somaTurno: 567,
    lote: 4000,
    previstoTermino: "",
    status: "Parada",
    tone: "high",
  },
];

const apontamentoRows = [
  {
    faixa: "05:20 às 06:00",
    maquina: "MÁQ 1",
    pecas: 116,
    refugos: 2,
    paradaInicio: "-",
    paradaFim: "-",
    motivo: "Produção contínua",
  },
  {
    faixa: "06:00 às 07:00",
    maquina: "MÁQ 2",
    pecas: 0,
    refugos: 0,
    paradaInicio: "06:10",
    paradaFim: "06:42",
    motivo: "Aguardando material / falha humana",
  },
  {
    faixa: "07:00 às 08:00",
    maquina: "MÁQ 4",
    pecas: 124,
    refugos: 4,
    paradaInicio: "-",
    paradaFim: "-",
    motivo: "Rechupe e peça manchada",
  },
  {
    faixa: "08:00 às 09:00",
    maquina: "MÁQ 1",
    pecas: 141,
    refugos: 1,
    paradaInicio: "-",
    paradaFim: "-",
    motivo: "Meta atendida",
  },
];

const apontamentoFlows = [
  {
    etapa: "Inicialização da OP",
    titulo: "Liberar OP e atividade com rastreio do operador",
    detalhe: "Confirma a ordem, grava hora inicial, operador responsável e máquina em uso sem depender da planilha.",
  },
  {
    etapa: "Paradas e perdas",
    titulo: "Registrar motivo, faixa horária e impacto no turno",
    detalhe: "Substitui os lançamentos manuais de parada, falha humana e perda por um fluxo operacional único.",
  },
  {
    etapa: "Apontamento de produção",
    titulo: "Apontar peças, refugo, PA e consumo de MP",
    detalhe: "Consolida peças produzidas, refugos e consumo por hora ou por atividade para alimentar o PCP em tempo real.",
  },
  {
    etapa: "Fechamento",
    titulo: "Finalizar a atividade e recalcular previsão de término",
    detalhe: "Fecha o lote, recalcula restante, status da máquina e próxima necessidade operacional.",
  },
];

const apontamentoLosses = [
  {
    motivo: "Aguardando material",
    impacto: "Parada",
    detalhe: "Motivo mais recorrente da planilha de acompanhamento. Deve disparar alerta para suprimentos e programação.",
  },
  {
    motivo: "Peça incompleta / deformada",
    impacto: "Refugo",
    detalhe: "Perda típica por turno e candidata a dashboard de qualidade por máquina.",
  },
  {
    motivo: "Rechupe / peça manchada",
    impacto: "Qualidade",
    detalhe: "Pode virar indicador automático de desvio por molde, resina e operador.",
  },
];

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function matchesSearch(values, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function getGlobalSearchQuery() {
  return String(state.globalSearch || "").trim().toLowerCase();
}

function formatRomaneioCode(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "Sem romaneio";
  }
  if (!/\d/.test(text)) {
    return text;
  }
  return /^rm[\s-]/i.test(text) ? text.toUpperCase() : `RM ${text}`;
}

function normalizeRomaneioIdentity(value) {
  const text = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\.PDF$/i, "")
    .trim();

  if (!text) {
    return "";
  }

  const explicitMatch = text.match(/ROMANEIO(?:\s+NOTA)?\s*[-_ ]*\s*(\d+)/i) || text.match(/(\d+)/);
  return explicitMatch ? explicitMatch[1] : text.replace(/[^A-Z0-9]/g, "");
}

function inferRomaneioDocumentKind(value) {
  const text = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return text.includes("ROMANEIO") && text.includes("NOTA") ? "romaneio_nota" : "romaneio";
}

function isComplementaryRomaneioUpload(left, right) {
  const leftIdentity = left?.romaneio_identity || normalizeRomaneioIdentity(left?.romaneio || left?.pdf_name || "");
  const rightIdentity = right?.romaneio_identity || normalizeRomaneioIdentity(right?.romaneio || right?.pdf_name || "");
  if (!leftIdentity || !rightIdentity || leftIdentity !== rightIdentity) {
    return false;
  }
  const kinds = new Set([left?.document_kind || "romaneio", right?.document_kind || "romaneio"]);
  return kinds.has("romaneio") && kinds.has("romaneio_nota");
}

function resolveRomaneioQuantity(item) {
  const direct = Number(item?.quantidade_total ?? item?.quantity_total);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  if (Array.isArray(item?.items)) {
    return sumBy(item.items, (line) => Number(line?.quantity_total ?? line?.quantidade ?? 0));
  }
  return Number(item?.quantidade_total ?? item?.quantity_total ?? 0) || 0;
}

function refreshHorizontalScroller(shell) {
  if (!shell) {
    return;
  }
  const viewport = shell.querySelector(".x-scroll-viewport");
  const leftButton = shell.querySelector('[data-scroll-dir="left"]');
  const rightButton = shell.querySelector('[data-scroll-dir="right"]');
  if (!viewport || !leftButton || !rightButton) {
    return;
  }

  const hasOverflow = viewport.scrollWidth > viewport.clientWidth + 12;
  const atStart = viewport.scrollLeft <= 6;
  const atEnd = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 6;
  const isKanbanShell = shell.classList.contains("x-scroll-shell--kanban");

  shell.classList.toggle("is-scrollable", hasOverflow);
  leftButton.disabled = !hasOverflow || atStart;
  rightButton.disabled = !hasOverflow || atEnd;

  if (isKanbanShell) {
    const rect = shell.getBoundingClientRect();
    const inView = rect.bottom > 120 && rect.top < window.innerHeight - 80;
    const topPosition = Math.min(Math.max(window.innerHeight / 2, rect.top + 84), rect.bottom - 84);
    const leftPosition = Math.max(rect.left + 12, 16);
    const rightInset = Math.max(window.innerWidth - rect.right + 12, 16);

    shell.classList.toggle("nav-in-view", inView);
    leftButton.style.top = `${topPosition}px`;
    rightButton.style.top = `${topPosition}px`;
    leftButton.style.left = `${leftPosition}px`;
    rightButton.style.right = `${rightInset}px`;
  }
}

function ensureHorizontalScroller(node, shellClass = "") {
  if (!node) {
    return null;
  }

  const existingViewport = node.parentElement;
  if (existingViewport?.classList.contains("x-scroll-viewport") && existingViewport.parentElement?.classList.contains("x-scroll-shell")) {
    const existingShell = existingViewport.parentElement;
    if (shellClass) {
      existingShell.classList.add(shellClass);
    }
    node.classList.add("x-scroll-track");
    refreshHorizontalScroller(existingShell);
    return existingShell;
  }

  const parent = node.parentNode;
  if (!parent) {
    return null;
  }

  const shell = document.createElement("div");
  shell.className = "x-scroll-shell";
  if (shellClass) {
    shell.classList.add(shellClass);
  }

  const leftButton = document.createElement("button");
  leftButton.type = "button";
  leftButton.className = "x-scroll-nav x-scroll-nav--left";
  leftButton.dataset.scrollDir = "left";
  leftButton.setAttribute("aria-label", "Rolar para a esquerda");
  leftButton.textContent = "‹";

  const rightButton = document.createElement("button");
  rightButton.type = "button";
  rightButton.className = "x-scroll-nav x-scroll-nav--right";
  rightButton.dataset.scrollDir = "right";
  rightButton.setAttribute("aria-label", "Rolar para a direita");
  rightButton.textContent = "›";

  const viewport = document.createElement("div");
  viewport.className = "x-scroll-viewport";

  parent.insertBefore(shell, node);
  shell.appendChild(leftButton);
  shell.appendChild(viewport);
  shell.appendChild(rightButton);
  viewport.appendChild(node);
  node.classList.add("x-scroll-track");

  const scrollStep = () => Math.max(viewport.clientWidth * 0.82, 240);
  let hoverTimer = null;

  const stopAutoScroll = () => {
    if (hoverTimer) {
      window.clearInterval(hoverTimer);
      hoverTimer = null;
    }
  };

  const startAutoScroll = (direction) => {
    stopAutoScroll();
    hoverTimer = window.setInterval(() => {
      const previous = viewport.scrollLeft;
      viewport.scrollLeft += direction * Math.max(viewport.clientWidth * 0.12, 42);
      refreshHorizontalScroller(shell);
      if (viewport.scrollLeft === previous) {
        stopAutoScroll();
      }
    }, 40);
  };

  leftButton.addEventListener("click", () => {
    viewport.scrollBy({ left: -scrollStep(), behavior: "smooth" });
  });

  rightButton.addEventListener("click", () => {
    viewport.scrollBy({ left: scrollStep(), behavior: "smooth" });
  });

  viewport.addEventListener("scroll", () => refreshHorizontalScroller(shell), { passive: true });
  leftButton.addEventListener("mouseenter", () => startAutoScroll(-1));
  rightButton.addEventListener("mouseenter", () => startAutoScroll(1));
  leftButton.addEventListener("mouseleave", stopAutoScroll);
  rightButton.addEventListener("mouseleave", stopAutoScroll);
  leftButton.addEventListener("blur", stopAutoScroll);
  rightButton.addEventListener("blur", stopAutoScroll);
  window.requestAnimationFrame(() => refreshHorizontalScroller(shell));
  return shell;
}

function applyHorizontalScrollEnhancements(root = document) {
  root.querySelectorAll(".modern-table").forEach((table) => ensureHorizontalScroller(table, "x-scroll-shell--table"));
  ensureHorizontalScroller(document.getElementById("kanban-board"), "x-scroll-shell--kanban");
  refreshHorizontalScrollers(root);
}

function refreshHorizontalScrollers(root = document) {
  root.querySelectorAll(".x-scroll-shell").forEach((shell) => refreshHorizontalScroller(shell));
}

function toDatetimeLocalValue(value) {
  const parts = getAppTimeParts(value);
  if (!parts) {
    return "";
  }
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function addHoursToIso(value, hours) {
  const parsed = parseIsoDate(value) || new Date();
  parsed.setHours(parsed.getHours() + hours);
  return parsed.toISOString();
}

function machineCodeFromLabel(value) {
  const match = String(value || "").match(/(\d+)/);
  return match ? `MÁQ ${match[1]}` : String(value || "").toUpperCase();
}

function minutesFromClock(value) {
  const [hour = "0", minute = "0"] = String(value || "0:00").split(":");
  return (Number(hour) || 0) * 60 + (Number(minute) || 0);
}

function durationBetweenClocks(start, end) {
  return Math.max(minutesFromClock(end) - minutesFromClock(start), 0);
}

function buildLocalIsoForClock(clockValue, baseDate = new Date()) {
  const parts = getAppTimeParts(baseDate);
  const [hour = "0", minute = "0"] = String(clockValue || "0:00").split(":");
  if (!parts) {
    return `${new Date().toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${APP_FIXED_OFFSET}`;
  }
  return `${parts.year}-${parts.month}-${parts.day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${APP_FIXED_OFFSET}`;
}

function normalizeRomaneioLookupCode(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const rmMatch = text.match(/RM[\s-]*0*([0-9]+)/i);
  if (rmMatch) {
    return rmMatch[1];
  }
  if (/^\d+$/.test(text)) {
    return text.replace(/^0+/, "") || "0";
  }
  return text;
}

function normalizeSkuLookup(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeSkuDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function deriveWorkstationFromResourceCode(value) {
  const match = String(value || "").match(/(\d{1,2})$/);
  if (!match) {
    return "";
  }
  return `MAQ-${String(match[1]).padStart(2, "0")}`;
}

function buildProductionRulesState(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const resourceCatalog = Array.isArray(payload?.resource_catalog) ? payload.resource_catalog : [];
  const bySku = new Map();
  const byDescription = new Map();

  items.forEach((item) => {
    const skuKey = normalizeSkuLookup(item.sku);
    const digitKey = normalizeSkuDigits(item.sku);
    if (skuKey) {
      bySku.set(skuKey, item);
    }
    if (digitKey) {
      bySku.set(digitKey, item);
    }
    if (item.descricao) {
      byDescription.set(normalizeSkuLookup(item.descricao), item);
    }
  });

  return { items, resourceCatalog, bySku, byDescription };
}

function getProductionModuleKeyForItem(item) {
  const resourceHints = [
    item?.assembly_line_code,
    item?.workstation_code,
    item?.notes,
    item?.machine_hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (resourceHints.includes("EXTR-")) {
    return "extrusao";
  }
  if (resourceHints.includes("INJ-") || resourceHints.includes("MAQ-")) {
    return "producao";
  }
  return getProductionRule(item) ? "producao" : "extrusao";
}

function splitProductionDatasets(items) {
  const productionItems = Array.isArray(items) ? items : [];
  return {
    injetoras: productionItems.filter((item) => getProductionModuleKeyForItem(item) === "producao"),
    extrusao: productionItems.filter((item) => getProductionModuleKeyForItem(item) === "extrusao"),
  };
}

function getProductionRule(input) {
  const sku = typeof input === "string" ? input : input?.sku;
  const description = typeof input === "object" ? input?.produto || input?.descricao : "";
  const exact = normalizeSkuLookup(sku);
  const digits = normalizeSkuDigits(sku);
  return (
    state.productionRules.bySku.get(exact)
    || state.productionRules.bySku.get(digits)
    || state.productionRules.byDescription.get(normalizeSkuLookup(description))
    || null
  );
}

function chooseLeastLoadedResource(resources, action) {
  const loadByCode = new Map();
  (state.datasets.programming || [])
    .filter((entry) => String(entry.action || "").toLowerCase() === String(action || "").toLowerCase())
    .forEach((entry) => {
      const code = normalizeSkuLookup(entry.assembly_line_code || entry.workstation_code);
      if (!code) {
        return;
      }
      loadByCode.set(code, (loadByCode.get(code) || 0) + 1);
    });

  return [...resources].sort((left, right) => {
    const leftCodes = [left.code || left.lineCode, ...(left.aliases || [])].map(normalizeSkuLookup);
    const rightCodes = [right.code || right.lineCode, ...(right.aliases || [])].map(normalizeSkuLookup);
    const leftLoad = Math.min(...leftCodes.map((code) => loadByCode.get(code) || 0));
    const rightLoad = Math.min(...rightCodes.map((code) => loadByCode.get(code) || 0));
    return leftLoad - rightLoad || (Number(left.recommendationRank || 0) - Number(right.recommendationRank || 0)) || normalizeSkuLookup(left.label || left.code).localeCompare(normalizeSkuLookup(right.label || right.code));
  })[0] || resources[0] || null;
}

function getRecommendedResourceOptions(item, action, moduleKey = null) {
  if (action === "produzir") {
    const rule = getProductionRule(item);
    if (rule?.resource_options?.length) {
      return [...rule.resource_options]
        .filter((option) => option.can_run || option.cycle_seconds)
        .sort((left, right) => {
          const leftScore = [left.can_run ? 0 : 1, left.cycle_seconds || 999999, -(left.pieces_per_hour || 0), left.code];
          const rightScore = [right.can_run ? 0 : 1, right.cycle_seconds || 999999, -(right.pieces_per_hour || 0), right.code];
          return leftScore < rightScore ? -1 : leftScore > rightScore ? 1 : 0;
        })
        .map((option, index) => ({
          ...option,
          recommendationRank: index,
          workstationCode: deriveWorkstationFromResourceCode(option.code),
          aliases: (state.productionRules.resourceCatalog.find((entry) => entry.code === option.code)?.aliases) || [option.code],
        }));
    }
    const resolvedModuleKey = moduleKey || getProductionModuleKeyForItem(item);
    return HOURLY_MODULE_CONFIG[resolvedModuleKey].resources.map((resource, index) => ({
      code: resource.lineCode,
      label: resource.label,
      workstationCode: resource.workstationCode,
      aliases: resource.aliases || [resource.lineCode],
      recommendationRank: index,
      pieces_per_hour: 0,
      cycle_seconds: 0,
      can_run: true,
    }));
  }

  return HOURLY_MODULE_CONFIG.montagem.resources.map((resource, index) => ({
    code: resource.lineCode,
    label: resource.label,
    workstationCode: resource.workstationCode,
    aliases: [resource.lineCode],
    recommendationRank: index,
    pieces_per_hour: 0,
    cycle_seconds: 0,
    can_run: true,
  }));
}

function getSuggestedProgrammingContext(item, action = "montar", moduleKey = null) {
  const options = getRecommendedResourceOptions(item, action, moduleKey);
  const primary = chooseLeastLoadedResource(options, action) || options[0] || {};
  const rule = action === "produzir" ? getProductionRule(item) : null;
  const noteParts = [];

  if (action === "produzir" && primary.code) {
    noteParts.push(`Recurso sugerido ${primary.code}`);
  }
  if (rule?.molde) {
    noteParts.push(`Molde ${rule.molde}`);
  }
  if (rule?.pecas_hora) {
    noteParts.push(`${number.format(rule.pecas_hora)} pç/h`);
  }
  if (rule?.material_prima) {
    noteParts.push(rule.material_prima);
  }

  return {
    assembly_line_code: primary.code || "",
    workstation_code: primary.workstationCode || deriveWorkstationFromResourceCode(primary.code),
    notes: noteParts.join(" · "),
    resourceOptions: options,
    rule,
  };
}

function getOperationalStockForItem(item) {
  const sku = normalizeSkuLookup(item?.sku);
  const baseStock = Number(item?.estoque_atual || item?.stock_available || 0);
  const delta = (state.stockMovements || []).reduce((total, movement) => {
    if (normalizeSkuLookup(movement.sku) !== sku) {
      return total;
    }
    return total + (movement.movement_type === "saida" ? -Number(movement.quantity || 0) : Number(movement.quantity || 0));
  }, 0);
  return baseStock + delta;
}

function getHourlyModuleDefinition(moduleKey) {
  return HOURLY_MODULE_CONFIG[moduleKey];
}

function getHourlySelection(moduleKey) {
  if (!state.hourlySelections[moduleKey]) {
    state.hourlySelections[moduleKey] = { resourceId: "", focusSku: "" };
  }
  return state.hourlySelections[moduleKey];
}

function getHourlyPanelState(moduleKey) {
  if (!state.hourlyPanels[moduleKey]) {
    state.hourlyPanels[moduleKey] = { sidebarCollapsed: false, tableCollapsed: false };
  }
  return state.hourlyPanels[moduleKey];
}

function toggleHourlyPanel(moduleKey, panelKey) {
  const panelState = getHourlyPanelState(moduleKey);
  panelState[panelKey] = !panelState[panelKey];
  renderHourlyModule(moduleKey);
}

function syncHourlyModuleChrome(moduleKey) {
  const definition = getHourlyModuleDefinition(moduleKey);
  const shell = document.getElementById(definition.shellId);
  const bottomPanel = document.getElementById(definition.bottomPanelId);
  const sidebarToggle = document.getElementById(definition.toggleSidebarId);
  const tableToggle = document.getElementById(definition.toggleTableId);
  const panelState = getHourlyPanelState(moduleKey);

  shell?.classList.toggle("sidebar-collapsed", panelState.sidebarCollapsed);
  bottomPanel?.classList.toggle("is-collapsed", panelState.tableCollapsed);

  if (sidebarToggle) {
    sidebarToggle.textContent = panelState.sidebarCollapsed ? "Mostrar painel" : "Recolher painel";
    sidebarToggle.className = `btn ${panelState.sidebarCollapsed ? "btn-primary" : "btn-secondary"} btn-xs`;
  }

  if (tableToggle) {
    tableToggle.textContent = panelState.tableCollapsed ? "Mostrar fila" : "Recolher fila";
    tableToggle.className = `btn ${panelState.tableCollapsed ? "btn-primary" : "btn-secondary"} btn-xs`;
  }
}

function getHourlyResource(moduleKey) {
  const definition = getHourlyModuleDefinition(moduleKey);
  const selection = getHourlySelection(moduleKey);
  return definition.resources.find((resource) => resource.id === selection.resourceId) || definition.resources[0];
}

function matchesHourlyResource(entry, resource) {
  const stack = [
    entry.assembly_line_code,
    entry.workstation_code,
    entry.machine_code,
    entry.maquina,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [
    resource.lineCode,
    ...(resource.aliases || []),
    resource.workstationCode,
    machineCodeFromLabel(resource.machineLabel),
    resource.label,
  ].some((value) => stack.includes(String(value || "").toLowerCase()));
}

function getHourlyLogsForResource(resource) {
  const codes = new Set([
    machineCodeFromLabel(resource.machineLabel),
    machineCodeFromLabel(resource.label),
    String(resource.workstationCode || "").toUpperCase(),
  ]);
  return (state.apontamentoLogs || []).filter((entry) => codes.has(String(entry.machine_code || "").toUpperCase()));
}

function calculateStopDuration(entry) {
  const start = minutesFromClock(entry.stop_start);
  const end = minutesFromClock(entry.stop_end);
  if (!start && !end) {
    return 0;
  }
  return Math.max(end - start, 0);
}

function getHourlyIntervalDefaults(interval) {
  const key = `${interval.start}-${interval.end}`;
  const mapping = {
    "08:00-09:00": [{ code: "P1", minutes: 10 }],
    "12:00-13:00": [{ code: "P3", minutes: 40 }],
    "17:00-18:00": [{ code: "P1", minutes: 10 }],
  };
  return mapping[key] || [];
}

function getIntervalIndexForIso(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return -1;
  }
  const minute = parsed.getHours() * 60 + parsed.getMinutes();
  return HORA_HORA_INTERVALS.findIndex((interval) => {
    const start = minutesFromClock(interval.start);
    const end = minutesFromClock(interval.end);
    return minute >= start && minute < end;
  });
}

function getCoveredIntervalIndexes(entry) {
  const start = parseIsoDate(entry.planned_start_at);
  const end = parseIsoDate(entry.available_at);
  if (!start || !end) {
    const fallback = getIntervalIndexForIso(entry.planned_start_at);
    return fallback >= 0 ? [fallback] : [];
  }

  const indexes = [];
  HORA_HORA_INTERVALS.forEach((interval, index) => {
    const slotStart = minutesFromClock(interval.start);
    const slotEnd = minutesFromClock(interval.end);
    const entryStart = start.getHours() * 60 + start.getMinutes();
    const entryEnd = end.getHours() * 60 + end.getMinutes();
    if (entryStart < slotEnd && entryEnd > slotStart) {
      indexes.push(index);
    }
  });
  return indexes.length ? indexes : [getIntervalIndexForIso(entry.planned_start_at)].filter((index) => index >= 0);
}

function getHourlyModuleContext(moduleKey) {
  const definition = getHourlyModuleDefinition(moduleKey);
  const selection = getHourlySelection(moduleKey);
  const resource = getHourlyResource(moduleKey);
  const queueItems = ((state.datasets[definition.datasetKey] || []).filter((item) =>
    matchesSearch([item.sku, item.produto, item.product_type, item.criticidade], getGlobalSearchQuery()),
  )).sort((left, right) => (Number(right.net_required) || 0) - (Number(left.net_required) || 0));

  const programmingItems = (state.datasets.programming || [])
    .filter((entry) => String(entry.action || "").toLowerCase() === definition.action)
    .filter((entry) => matchesHourlyResource(entry, resource))
    .sort((left, right) => new Date(left.planned_start_at || 0) - new Date(right.planned_start_at || 0));

  if (selection.focusSku && !queueItems.some((item) => item.sku === selection.focusSku)) {
    selection.focusSku = "";
  }

  const focusItem = queueItems.find((item) => item.sku === selection.focusSku) || queueItems[0] || null;
  if (!selection.focusSku && focusItem) {
    selection.focusSku = focusItem.sku;
  }

  const logs = getHourlyLogsForResource(resource);
  const realizedPieces = sumBy(logs, (entry) => entry.pieces);
  const scrapPieces = sumBy(logs, (entry) => entry.scrap);
  const reworkPieces = sumBy(logs.filter((entry) => /retrabalho/i.test(String(entry.reason || ""))), (entry) => entry.pieces);
  const plannedStopMinutes = sumBy(HORA_HORA_INTERVALS, (interval) => sumBy(getHourlyIntervalDefaults(interval), (stop) => stop.minutes));
  const productiveMinutes = sumBy(HORA_HORA_INTERVALS, (interval) => durationBetweenClocks(interval.start, interval.end)) - plannedStopMinutes;
  const stoppedMinutes = sumBy(logs.filter((entry) => String(entry.event_type || "").toLowerCase() === "parada"), calculateStopDuration);
  const availability = productiveMinutes > 0 ? clamp((productiveMinutes - stoppedMinutes) / productiveMinutes, 0, 1) : 0;
  const objectivePieces = sumBy(programmingItems, (entry) => entry.quantity_planned) || Number(focusItem?.net_required || 0);
  const operatorsReal = Math.max(resource.operators, new Set(logs.map((entry) => entry.operator).filter(Boolean)).size || 0);
  const queueTotal = sumBy(queueItems, (item) => item.net_required);

  return {
    moduleKey,
    definition,
    selection,
    resource,
    queueItems,
    programmingItems,
    focusItem,
    logs,
    realizedPieces,
    scrapPieces,
    reworkPieces,
    productiveMinutes,
    stoppedMinutes,
    availability,
    objectivePieces,
    operatorsReal,
    queueTotal,
    operatorKey: state.currentUser?.full_name || "Equipe do turno",
  };
}

function renderHourlyResourceSwitcher(context) {
  const container = document.getElementById(context.definition.resourceSwitcherId);
  if (!container) {
    return;
  }
  container.innerHTML = context.definition.resources.map((resource) => `
    <button
      type="button"
      class="hourly-resource-pill ${resource.id === context.resource.id ? "active" : ""}"
      data-hourly-module="${context.definition.datasetKey}"
      data-resource-id="${resource.id}"
    >
      <small>${context.definition.title}</small>
      <strong>${resource.label}</strong>
      <span>${resource.lineCode}${resource.aliases?.[1] ? ` · ${resource.aliases[1]}` : ""} · ${resource.workstationCode}</span>
    </button>
  `).join("");

  container.querySelectorAll("[data-resource-id]").forEach((button) => {
    button.addEventListener("click", () => {
      context.selection.resourceId = button.getAttribute("data-resource-id") || context.resource.id;
      renderHourlyModule(context.moduleKey);
    });
  });
}

function renderHourlyHero(context) {
  const wrapper = document.getElementById(context.definition.heroId);
  if (!wrapper) {
    return;
  }
  wrapper.innerHTML = `
    <article class="hourly-hero-copy">
      <small class="hourly-kicker">H-H padrão do turno ${helpTip(context.definition.queueCopy)}</small>
      <strong>${context.resource.label}</strong>
      <div class="hourly-hero-meta">
        <span>Operador-chave: ${context.operatorKey}</span>
        <span>${context.operatorsReal} operador(es)</span>
        <span>${number.format(context.queueTotal)} peças na carteira</span>
      </div>
    </article>
    <section class="hourly-kpi-grid">
      <div class="hourly-kpi">
        <small>Objetivo do recurso</small>
        <strong>${number.format(context.objectivePieces)}</strong>
        <span>Qtde de peças do turno corrente</span>
      </div>
      <div class="hourly-kpi">
        <small>Realizado</small>
        <strong>${number.format(context.realizedPieces)}</strong>
        <span>Peças já apontadas nesse recurso</span>
      </div>
      <div class="hourly-kpi">
        <small>Disponibilidade</small>
        <strong>${Math.round(context.availability * 100)}%</strong>
        <span>${context.productiveMinutes} min produtivos · ${context.stoppedMinutes} min de parada</span>
      </div>
      <div class="hourly-kpi">
        <small>Retrabalho</small>
        <strong>${number.format(context.reworkPieces)}</strong>
        <span>Eventos com motivo de retrabalho</span>
      </div>
      <div class="hourly-kpi">
        <small>Sucata</small>
        <strong>${number.format(context.scrapPieces)}</strong>
        <span>Perda registrada no apontamento</span>
      </div>
      <div class="hourly-kpi">
        <small>Programações</small>
        <strong>${number.format(context.programmingItems.length)}</strong>
        <span>Slots já carregados em ${context.resource.label}</span>
      </div>
    </section>
  `;
}

function buildHourlyGridRows(context) {
  const intervalRows = HORA_HORA_INTERVALS.map((interval, index) => {
    const entry = context.programmingItems.find((programming) => getCoveredIntervalIndexes(programming).includes(index)) || null;
    const distributedIndexes = entry ? getCoveredIntervalIndexes(entry) : [];
    const rowObjective = entry ? Math.round((Number(entry.quantity_planned) || 0) / Math.max(distributedIndexes.length, 1)) : 0;
    const intervalLogs = context.logs.filter((log) => {
      const stopStart = log.stop_start || "";
      if (stopStart) {
        const minute = minutesFromClock(stopStart);
        return minute >= minutesFromClock(interval.start) && minute < minutesFromClock(interval.end);
      }
      const created = parseIsoDate(log.created_at);
      if (!created) {
        return false;
      }
      const minute = created.getHours() * 60 + created.getMinutes();
      return minute >= minutesFromClock(interval.start) && minute < minutesFromClock(interval.end);
    });
    const defaults = getHourlyIntervalDefaults(interval);
    return {
      interval,
      index,
      entry,
      defaults,
      rowObjective,
      rowRealized: sumBy(intervalLogs, (log) => log.pieces),
      rowScrap: sumBy(intervalLogs, (log) => log.scrap),
      rowRework: sumBy(intervalLogs.filter((log) => /retrabalho/i.test(String(log.reason || ""))), (log) => log.pieces),
      rowStatus: entry ? "Programado" : "Livre",
    };
  });
  return intervalRows;
}

function renderHourlyGrid(context) {
  const wrapper = document.getElementById(context.definition.gridId);
  if (!wrapper) {
    return;
  }
  const rows = buildHourlyGridRows(context);
  const firstSuggestedIndex = rows.findIndex((row) => !row.entry);
  wrapper.innerHTML = `
    <section class="hourly-grid-card">
      <div class="panel-header compact">
        <div>
          <div class="title-with-help">
            <h3>Faixas do recurso</h3>
            ${helpTip("Estrutura inspirada na aba H-H PADRÃO: intervalo, paradas, disponibilidade, operadores, produto e objetivo da faixa.")}
          </div>
        </div>
        <span class="status-badge info">${context.resource.lineCode}</span>
      </div>
      <table class="modern-table hourly-grid-table">
        <thead>
          <tr>
            <th>Intervalo</th>
            <th>Parada 1</th>
            <th>Tempo 1</th>
            <th>Parada 2</th>
            <th>Tempo 2</th>
            <th>Dispon.</th>
            <th>Oper.</th>
            <th>Cód. produto</th>
            <th>Objetivo</th>
            <th>Realizado</th>
            <th>Retrabalho</th>
            <th>Sucata</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>
                <div class="hourly-interval">
                  <strong>${row.interval.start} - ${row.interval.end}</strong>
                  <span>${durationBetweenClocks(row.interval.start, row.interval.end)} min</span>
                </div>
              </td>
              <td>${row.defaults[0]?.code || "—"}</td>
              <td>${row.defaults[0]?.minutes || "—"}</td>
              <td>${row.defaults[1]?.code || "—"}</td>
              <td>${row.defaults[1]?.minutes || "—"}</td>
              <td>${Math.round(context.availability * 100)}%</td>
              <td>${context.operatorsReal}</td>
              <td>${row.entry?.sku || (context.focusItem && row.index === firstSuggestedIndex ? context.focusItem.sku : "—")}</td>
              <td>${number.format(row.rowObjective || (context.focusItem && row.index === firstSuggestedIndex ? Number(context.focusItem.net_required || 0) : 0))}</td>
              <td>${number.format(row.rowRealized)}</td>
              <td>${number.format(row.rowRework)}</td>
              <td>${number.format(row.rowScrap)}</td>
              <td><span class="hourly-status-chip ${row.entry ? "ready" : "idle"}">${row.rowStatus}</span></td>
              <td>
                <div class="kanban-inline-actions">
                  <button type="button" class="btn btn-secondary btn-xs" data-hourly-prefill="${context.moduleKey}" data-slot-index="${row.index}">
                    ${row.entry ? "Ajustar" : "Pre-programar"}
                  </button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;

  wrapper.querySelectorAll("[data-hourly-prefill]").forEach((button) => {
    button.addEventListener("click", () => {
      const moduleKey = button.getAttribute("data-hourly-prefill");
      const slotIndex = Number(button.getAttribute("data-slot-index"));
      prefillHourlySlot(moduleKey, slotIndex);
    });
  });
}

function renderHourlySidebar(context) {
  const focus = document.getElementById(context.definition.focusId);
  const queue = document.getElementById(context.definition.queueId);
  const schedule = document.getElementById(context.definition.scheduleId);
  const legend = document.getElementById(context.definition.legendId);
  if (!focus || !queue || !schedule || !legend) {
    return;
  }

  if (!context.focusItem) {
    focus.innerHTML = `<div class="hourly-focus-empty">Sem item priorizado para ${context.resource.label}. Assim que a fila carregar, este recurso poderá programar a próxima atividade.</div>`;
  } else {
    const rule = context.definition.action === "produzir" ? getProductionRule(context.focusItem) : null;
    const machineHints = getRecommendedResourceOptions(context.focusItem, context.definition.action, context.moduleKey).slice(0, 3);
    focus.innerHTML = `
      <small>Item líder do recurso</small>
      <strong>${context.focusItem.sku} · ${context.focusItem.produto}</strong>
      <span>${formatProductType(context.focusItem.product_type)} · criticidade ${String(context.focusItem.criticidade || "").toLowerCase()}</span>
      <div class="hourly-focus-meta">
        <div>
          <small>Necessidade</small>
          <strong>${number.format(context.focusItem.net_required || 0)}</strong>
        </div>
        <div>
          <small>Estoque atual</small>
          <strong>${number.format(getOperationalStockForItem(context.focusItem))}</strong>
        </div>
      </div>
      ${machineHints.length ? `
        <div class="hourly-focus-machine-hints">
          ${machineHints.map((option) => `<span class="tag info">${option.code}${option.pieces_per_hour ? ` · ${number.format(option.pieces_per_hour)} pç/h` : ""}</span>`).join("")}
        </div>
      ` : ""}
      ${rule ? `<em class="hourly-focus-rule">${rule.material_prima || "MP"} · ${rule.cavidades || 0} cav. · ciclo ${number.format(rule.media_ciclo || 0)} s</em>` : ""}
      <div class="hourly-focus-actions">
        <button type="button" class="btn btn-primary btn-sm" id="${context.definition.focusId}-quick-save">Programar líder agora</button>
        <button type="button" class="btn btn-secondary btn-sm" id="${context.definition.focusId}-open-form">Abrir Programação</button>
      </div>
    `;
    focus.querySelector(`#${context.definition.focusId}-quick-save`)?.addEventListener("click", () => saveHourlyLeader(context.moduleKey));
    focus.querySelector(`#${context.definition.focusId}-open-form`)?.addEventListener("click", () => prefillHourlySlot(context.moduleKey));
  }

  queue.innerHTML = context.queueItems.slice(0, 6).map((item) => `
    <article class="hourly-queue-card ${item.sku === context.focusItem?.sku ? "active" : ""}" data-hourly-focus="${context.moduleKey}" data-sku="${item.sku}" title="Selecionar ${item.sku}">
      <small>Fila priorizada</small>
      <strong>${item.sku} · ${item.produto}</strong>
      <span>${formatProductType(item.product_type)} · ${number.format(item.net_required || 0)} peças pendentes</span>
      <div class="hourly-queue-meta">
        <div>
          <small>Estoque</small>
          <strong>${number.format(getOperationalStockForItem(item))}</strong>
        </div>
        <div>
          <small>Custo estimado</small>
          <strong>${money.format(item.estimated_total_cost || 0)}</strong>
        </div>
      </div>
      <div class="hourly-queue-actions">
        <button type="button" class="btn btn-secondary btn-xs" data-hourly-program="${context.moduleKey}" data-sku="${item.sku}">Pre-programar</button>
      </div>
    </article>
  `).join("") || `<div class="hourly-focus-empty">Sem itens críticos nesta carteira com os filtros atuais.</div>`;

  queue.querySelectorAll("[data-hourly-focus]").forEach((card) => {
    card.addEventListener("click", () => {
      const moduleKey = card.getAttribute("data-hourly-focus");
      getHourlySelection(moduleKey).focusSku = card.getAttribute("data-sku") || "";
      renderHourlyModule(moduleKey);
    });
  });
  queue.querySelectorAll("[data-hourly-program]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const moduleKey = button.getAttribute("data-hourly-program");
      getHourlySelection(moduleKey).focusSku = button.getAttribute("data-sku") || "";
      prefillHourlySlot(moduleKey);
    });
  });

  schedule.innerHTML = `
    <div class="panel-header compact">
      <div>
        <div class="title-with-help">
          <h3>Agenda do recurso</h3>
          ${helpTip(`Programações já lançadas para ${context.resource.label}.`)}
        </div>
      </div>
      <span class="status-badge info">${number.format(context.programmingItems.length)}</span>
    </div>
    ${context.programmingItems.length ? context.programmingItems.map((entry) => `
      <article class="hourly-schedule-card" data-hourly-entry="${context.moduleKey}" data-entry-sku="${entry.sku}" title="Editar programação de ${entry.sku}">
        <small>${entry.workstation_code || entry.assembly_line_code || context.resource.lineCode}</small>
        <strong>${entry.sku} · ${entry.produto}</strong>
        <span>${formatDateTimeWithFallback(entry.planned_start_at, "Sem início")} → ${formatDateTimeWithFallback(entry.available_at, "Sem disponibilidade")}</span>
        <div class="hourly-schedule-meta">
          <div>
            <small>Quantidade</small>
            <strong>${number.format(entry.quantity_planned || 0)}</strong>
          </div>
          <div>
            <small>Referência</small>
            <strong>${entry.romaneio_reference || "Sem RM"}</strong>
          </div>
        </div>
      </article>
    `).join("") : `<div class="hourly-focus-empty">Sem programação gravada neste recurso. Use o item líder para gerar o primeiro slot.</div>`}
  `;
  schedule.querySelectorAll("[data-hourly-entry]").forEach((card) => {
    card.addEventListener("click", () => {
      const moduleKey = card.getAttribute("data-hourly-entry");
      getHourlySelection(moduleKey).focusSku = card.getAttribute("data-entry-sku") || "";
      prefillHourlySlot(moduleKey);
    });
  });

  legend.innerHTML = `
    <div class="panel-header compact">
      <div>
        <div class="title-with-help">
          <h3>Legenda H-H</h3>
          ${helpTip("Códigos da H-H PADRÃO usados para paradas planejadas e causas não planejadas.")}
        </div>
      </div>
    </div>
    <div class="hourly-legend-grid">
      ${PARADAS_PLANEJADAS.map((item) => `
        <article class="hourly-legend-card">
          <small>${item.code}</small>
          <strong>${item.label}</strong>
          <span>${item.minutes} min padrão</span>
        </article>
      `).join("")}
      ${PARADAS_NAO_PLANEJADAS.slice(0, 4).map((item) => `
        <article class="hourly-legend-card">
          <small>${item.code}</small>
          <strong>${item.label}</strong>
          <span>Parada não planejada</span>
        </article>
      `).join("")}
    </div>
  `;
}

function renderHourlyModule(moduleKey) {
  const context = getHourlyModuleContext(moduleKey);
  syncHourlyModuleChrome(moduleKey);
  renderHourlyResourceSwitcher(context);
  renderHourlyHero(context);
  renderHourlyGrid(context);
  renderHourlySidebar(context);
  applyHorizontalScrollEnhancements();
}

async function saveHourlyLeader(moduleKey) {
  const context = getHourlyModuleContext(moduleKey);
  if (!context.focusItem) {
    setElementStatus(context.definition.statusId, "Nenhum item líder disponível para programar neste recurso.", "error");
    return;
  }
  const slot = HORA_HORA_INTERVALS.find((interval, index) => {
    return !context.programmingItems.some((entry) => getCoveredIntervalIndexes(entry).includes(index));
  }) || HORA_HORA_INTERVALS[0];

  const payload = buildProgrammingSuggestion(
    { ...context.focusItem, action: context.definition.action },
    context.definition.action,
    {
      planned_start_at: buildLocalIsoForClock(slot.start),
      available_at: buildLocalIsoForClock(slot.end),
      assembly_line_code: context.resource.lineCode,
      workstation_code: context.resource.workstationCode,
      notes: `Programado via H-H PADRÃO em ${context.resource.label}.`,
    },
  );

  try {
    await postJson("/api/pcp/programming-entries", payload);
    setElementStatus(context.definition.statusId, `Programação criada em ${context.resource.label} para ${context.focusItem.sku}.`, "success");
    await carregarTudo();
  } catch (error) {
    setElementStatus(context.definition.statusId, error.message, "error");
  }
}

function prefillHourlySlot(moduleKey, slotIndex = 0) {
  const context = getHourlyModuleContext(moduleKey);
  if (!context.focusItem) {
    setElementStatus(context.definition.statusId, "Selecione um item da carteira antes de programar.", "error");
    return;
  }
  const slot = HORA_HORA_INTERVALS[slotIndex] || HORA_HORA_INTERVALS[0];
  prefillProgrammingForm(
    { ...context.focusItem, action: context.definition.action },
    {
      planned_start_at: buildLocalIsoForClock(slot.start),
      available_at: buildLocalIsoForClock(slot.end),
      assembly_line_code: context.resource.lineCode,
      workstation_code: context.resource.workstationCode,
      notes: `Pré-programado a partir do H-H PADRÃO em ${context.resource.label}.`,
      switchTab: true,
    },
  );
}

function loadApontamentoLogs() {
  return safeJsonParse(window.localStorage.getItem(APONTAMENTO_LOGS_STORAGE_KEY) || "[]", [])
    .filter(Boolean)
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .slice(0, 60);
}

function saveApontamentoLogs(items) {
  const sanitized = (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .slice(0, 60);
  state.apontamentoLogs = sanitized;
  window.localStorage.setItem(APONTAMENTO_LOGS_STORAGE_KEY, JSON.stringify(sanitized));
}

function ensureUsersStorage() {
  const stored = safeJsonParse(window.localStorage.getItem(APP_USERS_STORAGE_KEY) || "null", null);
  const users = Array.isArray(stored) ? stored.filter(Boolean) : [];
  const hasRoot = users.some((item) => String(item.username || "").toLowerCase() === "root");
  if (!hasRoot) {
    users.unshift({ ...DEFAULT_ROOT_USER });
  }
  window.localStorage.setItem(APP_USERS_STORAGE_KEY, JSON.stringify(users));
  state.users = users;
  return users;
}

function saveUsers(items) {
  const sanitized = (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item) => ({
      ...item,
      username: String(item.username || "").trim(),
      full_name: String(item.full_name || "").trim(),
      role: String(item.role || "operator").trim(),
      active: item.active !== false,
    }));
  state.users = sanitized;
  window.localStorage.setItem(APP_USERS_STORAGE_KEY, JSON.stringify(sanitized));
}

function mergeUsersWithDefault(items) {
  const users = Array.isArray(items) ? items.filter(Boolean) : [];
  const hasRoot = users.some((item) => String(item.username || "").toLowerCase() === "root");
  return hasRoot ? users : [{ ...DEFAULT_ROOT_USER }, ...users];
}

async function carregarUsuariosBackend(silent = false) {
  try {
    const payload = await api("/api/pcp/users");
    saveUsers(mergeUsersWithDefault(payload.items || []));
    return state.users;
  } catch (error) {
    if (!silent) {
      setElementStatus("user-status", error.message, "error");
    }
    return state.users;
  }
}

function loadSession() {
  const session = safeJsonParse(window.localStorage.getItem(APP_SESSION_STORAGE_KEY) || "null", null);
  if (!session?.user_id && !session?.username) {
    return null;
  }
  const user = state.users.find((item) => (
    (session.user_id && item.id === session.user_id) ||
    (session.username && item.username === session.username)
  ) && item.active);
  if (!user) {
    window.localStorage.removeItem(APP_SESSION_STORAGE_KEY);
    return null;
  }
  return {
    user_id: user.id,
    username: user.username,
  };
}

function persistSession(user) {
  state.currentUser = user;
  if (user) {
    window.localStorage.setItem(
      APP_SESSION_STORAGE_KEY,
      JSON.stringify({
        user_id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      }),
    );
  } else {
    window.localStorage.removeItem(APP_SESSION_STORAGE_KEY);
  }
}

function loadSidebarPreference() {
  return window.localStorage.getItem(APP_SIDEBAR_STORAGE_KEY) === "1";
}

function saveSidebarPreference(value) {
  window.localStorage.setItem(APP_SIDEBAR_STORAGE_KEY, value ? "1" : "0");
}

function loadOperatorModePreference() {
  return window.localStorage.getItem(APP_APONTAMENTO_MODE_STORAGE_KEY) === "1";
}

function saveOperatorModePreference(value) {
  window.localStorage.setItem(APP_APONTAMENTO_MODE_STORAGE_KEY, value ? "1" : "0");
}

function applyShellState() {
  const shell = document.getElementById("app-shell");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const collapsed = state.sidebarCollapsed || (state.apontamentoOperatorMode && state.currentView === "apontamento");
  const operatorFocus = state.apontamentoOperatorMode && state.currentView === "apontamento";

  shell?.classList.toggle("sidebar-collapsed", collapsed);
  shell?.classList.toggle("operator-focus", operatorFocus);

  if (sidebarToggle) {
    sidebarToggle.textContent = collapsed ? "☷" : "☰";
    sidebarToggle.setAttribute("aria-label", collapsed ? "Expandir painel lateral" : "Recolher painel lateral");
  }

  const operatorButton = document.getElementById("apontamento-operator-mode");
  const pill = document.getElementById("apontamento-session-pill");
  if (operatorButton) {
    operatorButton.textContent = state.apontamentoOperatorMode ? "Sair do modo operador" : "Entrar em modo operador";
  }
  if (pill) {
    pill.textContent = state.apontamentoOperatorMode ? "Modo operador" : "Modo gestor";
    pill.className = `status-badge ${state.apontamentoOperatorMode ? "ready" : "info"}`;
  }
}

function toggleSidebar(forceValue) {
  state.sidebarCollapsed = typeof forceValue === "boolean" ? forceValue : !state.sidebarCollapsed;
  saveSidebarPreference(state.sidebarCollapsed);
  applyShellState();
}

function setApontamentoOperatorMode(nextValue) {
  state.apontamentoOperatorMode = Boolean(nextValue);
  saveOperatorModePreference(state.apontamentoOperatorMode);
  if (state.apontamentoOperatorMode) {
    state.apontamentoScreen = "fila";
    window.location.hash = "#apontamento";
    switchTab("#apontamento");
  } else {
    applyShellState();
    renderApontamento();
  }
}

function getCurrentUserInitials() {
  const base = state.currentUser?.full_name || state.currentUser?.username || "IP";
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isRecentDate(value, maxAgeDays) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return false;
  }
  return (Date.now() - parsed.getTime()) <= maxAgeDays * DAY_MS;
}

function sanitizeLocalRomaneios(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter(Boolean)
    .filter((item) => {
      if (item.source_type === "manual") {
        return true;
      }
      if (item.source_type === "pdf") {
        return isRecentDate(item.created_at, 3);
      }
      return false;
    })
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .slice(0, 40);
}

function loadLocalRomaneios() {
  const current = safeJsonParse(window.localStorage.getItem(LOCAL_ROMANEIOS_STORAGE_KEY) || "null", null);
  if (Array.isArray(current)) {
    return sanitizeLocalRomaneios(current);
  }

  const migrated = [];
  LEGACY_LOCAL_ROMANEIOS_STORAGE_KEYS.forEach((storageKey) => {
    const legacyItems = safeJsonParse(window.localStorage.getItem(storageKey) || "[]", []);
    if (Array.isArray(legacyItems)) {
      legacyItems.forEach((item) => {
        if (item?.source_type === "manual") {
          migrated.push(item);
        }
      });
    }
    window.localStorage.removeItem(storageKey);
  });

  const sanitized = sanitizeLocalRomaneios(migrated);
  window.localStorage.setItem(LOCAL_ROMANEIOS_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

function saveLocalRomaneios(items) {
  const sanitized = sanitizeLocalRomaneios(items);
  state.romaneiosLocais = sanitized;
  window.localStorage.setItem(LOCAL_ROMANEIOS_STORAGE_KEY, JSON.stringify(sanitized));
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeLocalRomaneio(item) {
  return {
    ...item,
    selection_code: item.local_id,
    romaneio_identity: item.romaneio_identity || normalizeRomaneioIdentity(item.romaneio || item.pdf_name || ""),
    document_kind: item.document_kind || inferRomaneioDocumentKind(item.pdf_name || item.romaneio),
    source_type: item.source_type || "manual",
    previsao_saida_status: item.previsao_saida_status || (item.source_type === "pdf" ? "arquivo_local" : "manual"),
    status_evento: item.status_evento || (item.source_type === "pdf" ? "pdf_local" : "manual_local"),
    quantidade_total: resolveRomaneioQuantity(item),
    itens: Number(item.itens) || 0,
  };
}

function buildRomaneiosCollection() {
  const localItems = state.romaneiosLocais
    .map(normalizeLocalRomaneio)
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));

  const apiItems = state.romaneiosApi.map((item) => ({
    ...item,
    selection_code: String(item.romaneio),
    romaneio_identity: normalizeRomaneioIdentity(item.romaneio),
    document_kind: item.document_kind || "romaneio",
    quantidade_total: resolveRomaneioQuantity(item),
    source_type: "api",
  }));

  const merged = [...localItems, ...apiItems];
  const query = state.romaneiosFiltro.trim().toLowerCase();

  if (!query) {
    return merged;
  }

  return merged.filter((item) => {
    const haystack = [
      item.romaneio,
      item.empresa,
      item.pedido,
      item.pdf_name,
      item.observacao,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

function findLocalRomaneioBySelectionCode(code) {
  return state.romaneiosLocais.find((item) => item.local_id === code) || null;
}

function findApiRomaneioBySelectionCode(code) {
  const identity = normalizeRomaneioIdentity(code);
  return state.romaneiosApi.find((item) => (
    String(item.romaneio) === String(code)
    || (identity && normalizeRomaneioIdentity(item.romaneio) === identity)
  )) || null;
}

function isRomaneioSelected(code) {
  return state.selectedRomaneios.includes(String(code));
}

function syncRomaneioSelectionState() {
  const availableCodes = new Set(buildRomaneiosCollection().map((item) => String(item.selection_code)));
  state.selectedRomaneios = state.selectedRomaneios.filter((code) => availableCodes.has(String(code)));
  if (!state.romaneioSelectionMode) {
    state.selectedRomaneios = [];
  }
}

function renderRomaneioSelectionToolbar() {
  syncRomaneioSelectionState();
  const toggleButton = document.getElementById("romaneios-selection-toggle");
  const selectAllButton = document.getElementById("romaneios-select-all");
  const deleteButton = document.getElementById("romaneios-delete-selected");
  const counter = document.getElementById("romaneios-selection-counter");
  const filteredItems = buildRomaneiosCollection();
  const selectedCount = state.selectedRomaneios.length;

  if (toggleButton) {
    toggleButton.textContent = state.romaneioSelectionMode ? "Cancelar seleção" : "Selecionar itens";
    toggleButton.className = `btn ${state.romaneioSelectionMode ? "btn-primary" : "btn-secondary"} btn-xs`;
  }
  if (selectAllButton) {
    selectAllButton.disabled = !state.romaneioSelectionMode || !filteredItems.length;
    const allSelected = filteredItems.length > 0 && filteredItems.every((item) => isRomaneioSelected(item.selection_code));
    selectAllButton.textContent = allSelected ? "Limpar todos" : "Marcar todos";
  }
  if (deleteButton) {
    deleteButton.disabled = !state.romaneioSelectionMode || !selectedCount;
  }
  if (counter) {
    counter.textContent = state.romaneioSelectionMode
      ? `${number.format(selectedCount)} selecionado(s)`
      : "Seleção desativada";
  }
}

function toggleRomaneioSelectionMode() {
  state.romaneioSelectionMode = !state.romaneioSelectionMode;
  if (!state.romaneioSelectionMode) {
    state.selectedRomaneios = [];
  }
  renderRomaneioSelectionToolbar();
  renderRomaneios();
}

function toggleRomaneioSelection(code) {
  const nextCode = String(code);
  if (isRomaneioSelected(nextCode)) {
    state.selectedRomaneios = state.selectedRomaneios.filter((item) => item !== nextCode);
  } else {
    state.selectedRomaneios = [...state.selectedRomaneios, nextCode];
  }
  renderRomaneioSelectionToolbar();
  renderRomaneios();
}

function toggleAllRomaneiosSelection() {
  const items = buildRomaneiosCollection();
  const allSelected = items.length > 0 && items.every((item) => isRomaneioSelected(item.selection_code));
  state.selectedRomaneios = allSelected ? [] : items.map((item) => String(item.selection_code));
  renderRomaneioSelectionToolbar();
  renderRomaneios();
}

function buildExistingRomaneioIdentityMap() {
  const lookup = new Map();
  buildRomaneiosCollection().forEach((item) => {
    const identity = item.romaneio_identity || normalizeRomaneioIdentity(item.romaneio || item.pdf_name || "");
    if (identity && !lookup.has(identity)) {
      lookup.set(identity, item);
    }
  });
  return lookup;
}

function replaceLocalRomaneios(entriesToUpsert, identitiesToRemove = []) {
  const removeSet = new Set(
    identitiesToRemove
      .map((item) => normalizeRomaneioIdentity(item))
      .filter(Boolean),
  );
  const upsertKeys = new Set(
    entriesToUpsert.map((item) => {
      const identity = item.romaneio_identity || normalizeRomaneioIdentity(item.romaneio || item.pdf_name || "");
      const kind = item.document_kind || inferRomaneioDocumentKind(item.pdf_name || item.romaneio);
      return `${identity}|${kind}`;
    }),
  );
  const nextItems = state.romaneiosLocais.filter((item) => {
    const identity = item.romaneio_identity || normalizeRomaneioIdentity(item.romaneio || item.pdf_name || "");
    const kind = item.document_kind || inferRomaneioDocumentKind(item.pdf_name || item.romaneio);
    if (!removeSet.has(identity)) {
      return true;
    }
    return !upsertKeys.has(`${identity}|${kind}`);
  });
  saveLocalRomaneios([...entriesToUpsert, ...nextItems]);
}

function setElementStatus(id, message, tone) {
  const target = document.getElementById(id);
  if (!target) return;
  target.textContent = message || "";
  target.classList.remove("success", "error");
  if (tone) target.classList.add(tone);
}

function updateMrpStatus(message, tone = "ready", title = "") {
  const badge = document.getElementById("mrp-status");
  if (!badge) return;
  badge.textContent = message || "Pronto";
  badge.className = `status-badge ${tone || "ready"}`.trim();
  if (title) {
    badge.setAttribute("title", title);
  } else {
    badge.removeAttribute("title");
  }
}

function setMrpButtonBusy(isBusy) {
  const button = document.getElementById("run-mrp");
  if (!button) return;
  const label = button.querySelector(".mrp-label");
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = label ? label.textContent.trim() : "Recalcular MRP";
  }
  button.disabled = Boolean(isBusy);
  button.setAttribute("aria-busy", isBusy ? "true" : "false");
  if (label) {
    label.textContent = isBusy ? "Recalculando..." : button.dataset.defaultLabel;
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForMrpSnapshot(previousSnapshot) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await sleep(2000);
    try {
      const overview = await api("/api/pcp/overview");
      const nextSnapshot = overview?.snapshot_at || null;
      if (nextSnapshot && nextSnapshot !== previousSnapshot) {
        state.lastOverviewSnapshotAt = nextSnapshot;
        return {
          completed: true,
          snapshotAt: nextSnapshot,
        };
      }
    } catch (error) {
      // Ignore polling errors here; the main reload will surface them if needed.
    }
  }
  return {
    completed: false,
    snapshotAt: previousSnapshot || null,
  };
}

function renderAuthState() {
  const authScreen = document.getElementById("auth-screen");
  const appShell = document.getElementById("app-shell");
  const roleBadge = document.getElementById("current-user-role");
  const nameBadge = document.getElementById("current-user-name");
  const avatar = document.getElementById("current-user-avatar");
  const sessionBadge = document.getElementById("users-session-badge");
  const logoutButton = document.getElementById("logout-button");

  if (state.currentUser) {
    authScreen?.classList.add("hidden");
    appShell?.classList.remove("locked");
    if (roleBadge) roleBadge.textContent = String(state.currentUser.role || "operator").toUpperCase();
    if (nameBadge) nameBadge.textContent = state.currentUser.full_name || state.currentUser.username;
    if (avatar) avatar.textContent = getCurrentUserInitials();
    if (sessionBadge) sessionBadge.textContent = `${state.currentUser.username} · ${state.currentUser.role}`;
    if (logoutButton) logoutButton.disabled = false;
  } else {
    authScreen?.classList.remove("hidden");
    appShell?.classList.add("locked");
    if (roleBadge) roleBadge.textContent = "Sem sessão";
    if (nameBadge) nameBadge.textContent = "Faça login";
    if (avatar) avatar.textContent = "IP";
    if (sessionBadge) sessionBadge.textContent = "Sem sessão";
    if (logoutButton) logoutButton.disabled = true;
  }
}

function renderUsersModule() {
  const summary = document.getElementById("users-summary");
  const list = document.getElementById("users-list");
  const form = document.getElementById("user-form");
  if (!summary || !list || !form) {
    return;
  }

  const users = ensureUsersStorage();
  const canManageUsers = !!state.currentUser && ["root", "manager"].includes(state.currentUser.role);
  Array.from(form.elements).forEach((field) => {
    field.disabled = !canManageUsers;
  });
  setElementStatus(
    "user-status",
    canManageUsers ? "Administre acessos e redefina senhas por aqui." : "Faça login como root ou gestor para alterar usuários.",
    canManageUsers ? "success" : "error",
  );
  summary.innerHTML = "";
  [
    ["Usuários", number.format(users.length)],
    ["Ativos", number.format(users.filter((item) => item.active).length)],
    ["Administradores", number.format(users.filter((item) => ["root", "manager"].includes(item.role)).length)],
  ].forEach(([label, value]) => {
    summary.appendChild(
      el(`
        <div class="mini-card">
          <small>${label}</small>
          <strong>${value}</strong>
        </div>
      `),
    );
  });

  list.innerHTML = "";
  users
    .slice()
    .sort((left, right) => {
      if (left.role === "root") return -1;
      if (right.role === "root") return 1;
      return String(left.full_name || left.username).localeCompare(String(right.full_name || right.username), "pt-BR");
    })
    .forEach((user) => {
      const card = el(`
        <article class="user-card ${user.active ? "" : "inactive"}">
          <div>
            <small>${user.username}</small>
            <strong>${user.full_name}</strong>
            <span>${user.role} · ${user.active ? "Ativo" : "Inativo"}</span>
          </div>
          <div class="user-card-actions">
            <button type="button" class="btn btn-secondary btn-xs" data-action="edit" ${canManageUsers ? "" : "disabled"}>Editar</button>
            <button type="button" class="btn btn-secondary btn-xs" data-action="toggle" ${canManageUsers ? "" : "disabled"}>${user.active ? "Desativar" : "Ativar"}</button>
          </div>
        </article>
      `);

      card.querySelector('[data-action="edit"]').addEventListener("click", () => {
        if (!canManageUsers) {
          setElementStatus("user-status", "Faça login como root ou gestor para alterar usuários.", "error");
          return;
        }
        const form = document.getElementById("user-form");
        if (!form) return;
        form.dataset.editingUserId = user.id;
        form.elements.namedItem("username").value = user.username || "";
        form.elements.namedItem("full_name").value = user.full_name || "";
        form.elements.namedItem("role").value = user.role || "operator";
        form.elements.namedItem("active").value = user.active ? "true" : "false";
        form.elements.namedItem("password").value = user.password || "";
        setElementStatus("user-status", `Editando usuário ${user.username}.`, "success");
        window.location.hash = "#usuarios";
        switchTab("#usuarios");
      });

      card.querySelector('[data-action="toggle"]').addEventListener("click", async () => {
        if (!canManageUsers) {
          setElementStatus("user-status", "Faça login como root ou gestor para alterar usuários.", "error");
          return;
        }
        if (user.username === "root" && user.active) {
          setElementStatus("user-status", "O usuário root não pode ser desativado.", "error");
          return;
        }
        try {
          const nextUser = {
            ...user,
            active: !user.active,
            updated_at: new Date().toISOString(),
          };
          const response = await postJson("/api/pcp/users/save", nextUser);
          saveUsers(mergeUsersWithDefault(response.items || []));
          if (state.currentUser?.id === user.id && !nextUser.active) {
            persistSession(null);
          } else if (state.currentUser?.id === user.id) {
            persistSession(nextUser);
          }
          renderAuthState();
          renderUsersModule();
          setElementStatus("user-status", `Usuário ${user.username} ${nextUser.active ? "ativado" : "desativado"} com sucesso.`, "success");
        } catch (error) {
          setElementStatus("user-status", error.message, "error");
        }
      });

      list.appendChild(card);
    });
}

function inferRomaneioCodeFromFilename(filename) {
  const normalized = normalizeRomaneioIdentity(filename);
  return normalized || String(filename || "").replace(/\.pdf$/i, "").trim() || `ROM-${Date.now()}`;
}

function createPdfRomaneioEntry(file) {
  const nowIso = new Date().toISOString();
  const romaneio = inferRomaneioCodeFromFilename(file.name);
  return {
    local_id: `local-pdf-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    source_type: "pdf",
    romaneio,
    romaneio_identity: normalizeRomaneioIdentity(romaneio),
    document_kind: inferRomaneioDocumentKind(file.name),
    empresa: "INPLAST",
    pedido: "",
    quantidade_total: 0,
    previsao_saida_at: "",
    previsao_saida_status: "arquivo_local",
    status_evento: "pdf_local",
    observacao: "PDF aguardando conferência e ingestão.",
    pdf_name: file.name,
    pdf_size: file.size,
    itens: 0,
    created_at: nowIso,
  };
}

function createManualRomaneioEntry(payload) {
  const romaneio = String(payload.romaneio || "").trim();
  return {
    local_id: `local-manual-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    source_type: "manual",
    romaneio,
    romaneio_identity: normalizeRomaneioIdentity(romaneio),
    document_kind: "manual",
    empresa: payload.empresa || "INPLAST",
    pedido: payload.pedido || "",
    quantidade_total: Number(payload.quantidade_total) || 0,
    previsao_saida_at: payload.previsao_saida_at || "",
    previsao_saida_status: "manual",
    status_evento: "manual_local",
    observacao: payload.observacao || "",
    itens: 0,
    created_at: new Date().toISOString(),
  };
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Falha ao ler o arquivo ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function api(path) {
  const response = await fetch(path);
  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data.detail || data.error || "";
    } catch (error) {
      detail = "";
    }
    throw new Error(detail ? `Falha ao carregar ${path}: ${detail}` : `Falha ao carregar ${path}`);
  }
  return response.json();
}

async function safeApi(path, fallback, warnings) {
  try {
    return await api(path);
  } catch (error) {
    if (Array.isArray(warnings)) {
      warnings.push({ path, message: error.message });
    }
    return fallback;
  }
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.error || data.message || `Falha ao enviar dados para ${path}`);
  }
  return data;
}

function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function escapeHtmlAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function helpTip(text, label = "i") {
  const tooltip = escapeHtmlAttr(text);
  return `<span class="help-tip" tabindex="0" data-tooltip="${tooltip}" aria-label="${tooltip}">${label}</span>`;
}

function renderOverview(data) {
  const totals = data.totals || {};
  const cards = [
    ["Estoque util", number.format(totals.estoque_atual || 0), "Base consolidada para atendimento imediato", "ok"],
    ["Carteira romaneios", number.format(totals.necessidade_romaneios || 0), "Volume demandado pelo ERP", "info"],
    ["Montagem", number.format(totals.necessidade_montagem || 0), "Acabados ainda dependentes de montagem", "warning"],
    ["Produção", number.format(totals.necessidade_producao || 0), "Intermediários necessários para liberar carteira", "warning"],
    ["Compras", number.format(totals.necessidade_compra || 0), "MP e componentes que ainda exigem suprimento", "high"],
    ["Sem previsão", number.format(totals.romaneios_sem_previsao || 0), "Romaneios que pedem atuação manual", "missing"],
    ["Custo estimado", money.format(totals.custo_estimado_total || 0), "Impacto financeiro projetado da rodada", "info"],
  ];

  const wrapper = document.getElementById("overview-cards");
  if (!wrapper) {
    return;
  }
  wrapper.innerHTML = "";
  cards.forEach(([label, value, hint, tone]) => {
    wrapper.appendChild(
      el(`
        <div class="stat-card" data-tone="${tone}">
          <small>${label}</small>
          <strong>${value}</strong>
          <em>${hint}</em>
        </div>
      `),
    );
  });

  const snapshotTarget = document.getElementById("snapshot-at");
  if (snapshotTarget) {
    snapshotTarget.textContent = formatDateTimeWithFallback(
      data.snapshot_at,
      "Sem snapshot validado",
    );
  }
  state.lastOverviewSnapshotAt = data?.snapshot_at || null;

  const heroSignals = document.getElementById("hero-signals");
  if (heroSignals) {
    heroSignals.innerHTML = "";
  }
  const demanda = Number(totals.necessidade_romaneios) || 0;
  const estoque = Number(totals.estoque_atual) || 0;
  const coberturaImediata = demanda > 0 ? Math.round((Math.min(estoque, demanda) / demanda) * 100) : 100;
  if (heroSignals) {
    [
      ["Cobertura", `${coberturaImediata}%`, "Atendimento direto com base no saldo atual"],
      ["Pressão compra", number.format(totals.necessidade_compra || 0), "Volume que ainda exige suprimento"],
      ["Romaneios sem ETA", number.format(totals.romaneios_sem_previsao || 0), "Carteira sem saída confiável"],
      ["Custo projetado", money.format(totals.custo_estimado_total || 0), "Leitura financeira da rodada"],
    ].forEach(([label, value, hint]) => {
      heroSignals.appendChild(
        el(`
          <div class="hero-signal-card">
            <small>${label}</small>
            <strong>${value}</strong>
            <span>${hint}</span>
          </div>
        `),
      );
    });
  }

  const coverageMeter = document.getElementById("coverage-meter");
  const coberturaAtual = Math.min(estoque, demanda);
  const gap = Math.max(demanda - estoque, 0);
  const coberturaPct = demanda > 0 ? clamp((coberturaAtual / demanda) * 100, 0, 100) : 100;
  const gapPct = demanda > 0 ? clamp((gap / demanda) * 100, 0, 100) : 0;
  if (coverageMeter) {
    coverageMeter.innerHTML = `
      <div class="coverage-meter-head">
        <strong>${Math.round(coberturaPct)}%</strong>
        <span>${number.format(coberturaAtual)} de ${number.format(demanda)} unidades cobertas no saldo atual</span>
      </div>
      <div class="coverage-bar">
        <span class="coverage-fill ok" style="width:${coberturaPct}%"></span>
        ${gap > 0 ? `<span class="coverage-fill gap" style="width:${gapPct}%"></span>` : ""}
      </div>
      <div class="coverage-legend">
        <div>
          <small>Coberto agora</small>
          <strong>${number.format(coberturaAtual)}</strong>
        </div>
        <div>
          <small>Gap imediato</small>
          <strong>${number.format(gap)}</strong>
        </div>
      </div>
    `;
  }

  const critical = document.getElementById("critical-list");
  if (!critical) {
    return;
  }
  critical.innerHTML = "";
  if (!data.top_criticos.length) {
    critical.appendChild(emptyState("Nenhum item critico identificado com as cargas atuais."));
  } else {
    data.top_criticos.forEach((item) => {
      critical.appendChild(
        el(`
          <div class="list-card">
            <div class="item-row">
              <div>
                <small>${item.sku}</small>
                <strong>${item.produto}</strong>
              </div>
              <span class="tag ${item.criticidade.toLowerCase()}">${item.criticidade}</span>
            </div>
            <em>Saldo ${number.format(item.saldo)} | Acao ${item.acao}</em>
          </div>
        `),
      );
    });
  }
}

function renderBarChart(containerId, rows, formatter = (value) => number.format(value), emptyMessage = "Sem dados suficientes para o gráfico.") {
  const wrapper = document.getElementById(containerId);
  if (!wrapper) {
    return;
  }
  wrapper.innerHTML = "";
  if (!rows.length) {
    wrapper.appendChild(emptyState(emptyMessage));
    return;
  }

  const maxValue = Math.max(...rows.map((row) => Number(row.value) || 0), 1);
  rows.forEach((row) => {
    const width = clamp(((Number(row.value) || 0) / maxValue) * 100, 8, 100);
    wrapper.appendChild(
      el(`
        <div class="report-bar-row">
          <div class="report-bar-copy">
            <strong>${row.label}</strong>
            <span>${row.meta || ""}</span>
          </div>
          <div class="report-bar-track">
            <span class="report-bar-fill ${row.tone || "info"}" style="width:${width}%"></span>
          </div>
          <div class="report-bar-value">${formatter(Number(row.value) || 0)}</div>
        </div>
      `),
    );
  });
}

function describeTimelineBucket(dateKey) {
  if (dateKey === "__sem_previsao__") {
    return {
      label: "Sem previsão",
      subtitle: "Ação manual",
      tone: "missing",
    };
  }

  const date = new Date(`${dateKey}T12:00:00${APP_FIXED_OFFSET}`);
  const diffDays = Math.round((date.getTime() - startOfToday().getTime()) / DAY_MS);
  if (diffDays < 0) {
    return {
      label: formatDateWithFallback(dateKey, "Atrasado"),
      subtitle: `Atrasado ${Math.abs(diffDays)}d`,
      tone: "high",
    };
  }
  if (diffDays === 0) {
    return {
      label: "Hoje",
      subtitle: formatDateWithFallback(dateKey, "Hoje"),
      tone: "warning",
    };
  }
  if (diffDays === 1) {
    return {
      label: "Amanhã",
      subtitle: formatDateWithFallback(dateKey, "Amanhã"),
      tone: "info",
    };
  }
  return {
    label: formatDateWithFallback(dateKey, "Programado"),
    subtitle: `D+${diffDays}`,
    tone: "ok",
  };
}

function renderTimelineChart(containerId, romaneios) {
  const wrapper = document.getElementById(containerId);
  if (!wrapper) {
    return;
  }
  wrapper.innerHTML = "";
  if (!romaneios.length) {
    wrapper.appendChild(emptyState("Sem romaneios suficientes para montar o calendário logístico."));
    return;
  }

  const grouped = new Map();
  romaneios.forEach((item) => {
    const key = item.previsao_saida_at ? String(item.previsao_saida_at).split("T")[0] : "__sem_previsao__";
    const current = grouped.get(key) || { count: 0, units: 0 };
    current.count += 1;
    current.units += Number(item.quantidade_total) || 0;
    grouped.set(key, current);
  });

  const buckets = Array.from(grouped.entries())
    .sort(([left], [right]) => {
      if (left === "__sem_previsao__") return 1;
      if (right === "__sem_previsao__") return -1;
      return left.localeCompare(right);
    })
    .slice(0, 7)
    .map(([key, value]) => ({
      key,
      ...describeTimelineBucket(key),
      count: value.count,
      units: value.units,
    }));

  const maxUnits = Math.max(...buckets.map((bucket) => bucket.units), 1);
  const bars = el(`<div class="timeline-bars"></div>`);
  buckets.forEach((bucket) => {
    const height = clamp((bucket.units / maxUnits) * 100, 12, 100);
    bars.appendChild(
      el(`
        <div class="timeline-bar-card ${bucket.tone}">
          <div class="timeline-bar-track">
            <span class="timeline-bar-fill" style="height:${height}%"></span>
          </div>
          <strong>${bucket.label}</strong>
          <small>${bucket.subtitle}</small>
          <span>${bucket.count} rom. | ${number.format(bucket.units)} un</span>
        </div>
      `),
    );
  });
  wrapper.appendChild(bars);
}

function renderInsights(payload) {
  const wrapper = document.getElementById("report-insights");
  if (!wrapper) {
    return;
  }
  wrapper.innerHTML = "";

  const overview = payload.overview || {};
  const romaneios = (payload.romaneios || {}).items || [];
  const painel = payload.painel || [];
  const alerts = payload.alerts || [];

  const topCritical = overview.top_criticos?.[0] || null;
  const semPrevisao = romaneios.filter((item) => item.previsao_saida_status === "sem_previsao");
  const nextDelivery = romaneios
    .filter((item) => item.previsao_saida_at)
    .sort((left, right) => String(left.previsao_saida_at).localeCompare(String(right.previsao_saida_at)))[0];
  const actionTotals = Object.entries(
    painel.reduce((acc, item) => {
      const key = item.acao || "Analisar";
      acc[key] = (acc[key] || 0) + (Number(item.necessidade_romaneios) || 0);
      return acc;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

  const insights = [];
  if (topCritical) {
    insights.push({
      label: "Gargalo principal",
      title: `${topCritical.sku} puxa ${topCritical.acao}`,
      detail: `Saldo ${number.format(topCritical.saldo)} e necessidade de ${number.format(topCritical.necessidade_romaneios)} unidades.`,
    });
  }
  if (actionTotals.length) {
    insights.push({
      label: "Fila dominante",
      title: `${actionTotals[0][0]} concentra a maior carteira`,
      detail: `${number.format(actionTotals[0][1])} unidades dependem dessa frente para liberar romaneios.`,
    });
  }
  if (semPrevisao.length) {
    insights.push({
      label: "Tratativa logística",
      title: `${semPrevisao.length} romaneio(s) seguem sem previsão final`,
      detail: "A recomendação é tratar fornecedor, programação ou priorização manual antes da próxima janela de saída.",
    });
  }
  if (nextDelivery) {
    insights.push({
      label: "Próxima saída",
      title: `${formatRomaneioCode(nextDelivery.romaneio)} é o próximo compromisso da fila`,
      detail: `${formatDateTimeWithFallback(nextDelivery.previsao_saida_at, "Sem data")} com ${number.format(nextDelivery.quantidade_total)} unidades.`,
    });
  }
  if (alerts.length) {
    insights.push({
      label: "Risco operacional",
      title: `${alerts.length} alerta(s) ativos exigem monitoramento`,
      detail: "O painel já cruza falta de previsão, saldo negativo e desatualização de fontes.",
    });
  }

  if (!insights.length) {
    wrapper.appendChild(emptyState("Sem leituras adicionais para destacar nesta rodada."));
    return;
  }

  insights.slice(0, 5).forEach((item) => {
    wrapper.appendChild(
      el(`
        <div class="insight-card">
          <small>${item.label}</small>
          <strong>${item.title}</strong>
          <em>${item.detail}</em>
        </div>
      `),
    );
  });
}

function renderCockpitReports(payload) {
  const overview = payload.overview || { totals: {} };
  const romaneios = (payload.romaneios || {}).items || [];
  const painel = payload.painel || [];

  const statusStats = Object.entries(
    romaneios.reduce((acc, item) => {
      const key = item.previsao_saida_status || "sem_previsao";
      if (!acc[key]) {
        acc[key] = { count: 0, units: 0 };
      }
      acc[key].count += 1;
      acc[key].units += Number(item.quantidade_total) || 0;
      return acc;
    }, {}),
  )
    .sort((left, right) => right[1].units - left[1].units)
    .map(([key, value]) => ({
      label: formatStatusLabel(key),
      meta: `${value.count} romaneio(s)`,
      value: value.units,
      tone: statusClass(key),
    }));

  const actionStats = Object.entries(
    painel.reduce((acc, item) => {
      const key = item.acao || "Analisar";
      acc[key] = (acc[key] || 0) + (Number(item.necessidade_romaneios) || 0);
      return acc;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .map(([key, value]) => ({
      label: key,
      meta: "Volume da carteira associado a esta ação",
      value,
      tone: key === "Comprar" ? "high" : key === "Produzir" ? "warning" : key === "Montar" ? "info" : "ok",
    }));

  renderBarChart(
    "status-distribution-chart",
    statusStats,
    (value) => `${number.format(value)} un`,
    "Sem romaneios com dados de status para montar o relatório.",
  );
  renderBarChart(
    "action-demand-chart",
    actionStats,
    (value) => `${number.format(value)} un`,
    "Sem carteira consolidada para distribuir por ação.",
  );
  renderTimelineChart("timeline-chart", romaneios);
  renderInsights({
    overview,
    romaneios: payload.romaneios,
    painel,
    alerts: payload.alerts || [],
  });
}

function renderAlerts(data) {
  const wrapper = document.getElementById("alerts-list");
  if (!wrapper) {
    return;
  }
  wrapper.innerHTML = "";
  if (!data.items.length) {
    wrapper.appendChild(emptyState("Nenhum alerta critico com as fontes ativas neste momento."));
  } else {
    data.items.forEach((item) => {
      wrapper.appendChild(
        el(`
          <div class="list-card">
            <div class="item-row">
              <div>
                <small>${item.type}</small>
                <strong>${item.message}</strong>
              </div>
              <span class="tag ${item.severity.toLowerCase()}">${item.severity}</span>
            </div>
          </div>
        `),
      );
    });
  }
}

function renderRomaneioIntakeSummary() {
  const wrapper = document.getElementById("romaneio-intake-summary");
  if (!wrapper) return;

  const stagedPdfs = state.romaneiosLocais.filter((item) => item.source_type === "pdf").length;
  const stagedManual = state.romaneiosLocais.filter((item) => item.source_type === "manual").length;

  wrapper.innerHTML = "";
  [
    ["Locais", number.format(state.romaneiosLocais.length)],
    ["PDFs", number.format(stagedPdfs)],
    ["Manuais", number.format(stagedManual)],
  ].forEach(([label, value]) => {
    wrapper.appendChild(
      el(`
        <div class="mini-card">
          <small>${label}</small>
          <strong>${value}</strong>
        </div>
      `),
    );
  });
}

function renderStagedRomaneios() {
  const wrapper = document.getElementById("romaneios-staged-list");
  if (!wrapper) return;

  wrapper.innerHTML = "";

  if (!state.romaneiosLocais.length) {
    wrapper.appendChild(el(`<div class="staged-empty">Nenhum romaneio local adicionado ainda. Use o formulário ou selecione PDFs do seu computador.</div>`));
    return;
  }

  state.romaneiosLocais
    .slice()
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .forEach((item) => {
      const selectionCode = item.local_id;
      const card = el(`
        <div class="staged-card">
          <div class="staged-card-head">
            <div>
              <small>${item.source_type === "pdf" ? "PDF local" : "Cadastro manual"}</small>
              <strong>${formatRomaneioCode(item.romaneio)}</strong>
            </div>
            <span class="tag ${item.source_type === "pdf" ? "warning" : "info"}">${item.source_type}</span>
          </div>
          <div class="staged-meta">
            ${item.pdf_name ? `${item.pdf_name} · ${formatFileSize(item.pdf_size)}` : `${item.empresa || "INPLAST"}${item.pedido ? ` · Pedido ${item.pedido}` : ""}`}
          </div>
          <div class="staged-meta">
            ${number.format(resolveRomaneioQuantity(item))} unidades · ${item.itens || 0} itens
          </div>
          <div class="staged-meta">
            ${item.previsao_saida_at ? `Saída ${formatDateTime(item.previsao_saida_at)}` : "Sem previsão definida"} · ${formatDateTimeWithFallback(item.created_at, "Agora")}
          </div>
          <div class="dropzone-actions">
            <button type="button" class="btn btn-secondary" data-action="open">Abrir detalhe</button>
            <button type="button" class="btn btn-secondary" data-action="remove">Remover</button>
          </div>
        </div>
      `);

      card.querySelector('[data-action="open"]').addEventListener("click", () => carregarRomaneio(selectionCode));
      card.querySelector('[data-action="remove"]').addEventListener("click", () => removerRomaneioLocal(selectionCode));
      wrapper.appendChild(card);
    });
}

function renderRomaneios() {
  const wrapper = document.getElementById("romaneios-list");
  wrapper.innerHTML = "";
  renderRomaneioSelectionToolbar();

  const items = buildRomaneiosCollection();

  if (!items.length) {
    wrapper.appendChild(emptyState("Nenhum romaneio recebido ou homologado ate o momento."));
  } else {
    items.forEach((item) => {
      const isLocal = item.source_type !== "api";
      const isSelected = state.romaneioSelecionado === item.selection_code;
      const isMarked = isRomaneioSelected(item.selection_code);
      const secondaryLine = isLocal
        ? `${number.format(resolveRomaneioQuantity(item))} unidades | ${item.pdf_name || "Romaneio digitado"}${item.pedido ? ` | Pedido ${item.pedido}` : ""}`
        : `${number.format(resolveRomaneioQuantity(item))} unidades | Saida ${formatDateTime(item.previsao_saida_at)}`;
      const row = el(`
        <article class="romaneio-row ${isLocal ? "local" : ""} ${isSelected ? "selected" : ""}">
          ${state.romaneioSelectionMode ? `
            <label class="romaneio-select-cell">
              <input type="checkbox" ${isMarked ? "checked" : ""} data-action="select" />
            </label>
          ` : ""}
          <div>
            <small>${item.empresa}</small>
            <strong>${formatRomaneioCode(item.romaneio)}</strong>
            <span class="muted">${secondaryLine}</span>
          </div>
          <div class="romaneio-row-actions">
            <span class="tag ${statusClass(item.previsao_saida_status)}">${formatStatusLabel(item.previsao_saida_status)}</span>
            <button type="button" class="btn btn-secondary btn-xs" data-action="open">Abrir</button>
            <button type="button" class="btn btn-secondary btn-xs" data-action="delete">${isLocal ? "Remover" : "Excluir"}</button>
          </div>
        </article>
      `);
      row.addEventListener("click", () => carregarRomaneio(item.selection_code));
      row.querySelector('[data-action="select"]')?.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleRomaneioSelection(item.selection_code);
      });
      row.querySelector('[data-action="open"]').addEventListener("click", (event) => {
        event.stopPropagation();
        carregarRomaneio(item.selection_code);
      });
      row.querySelector('[data-action="delete"]').addEventListener("click", (event) => {
        event.stopPropagation();
        excluirRomaneio(item.selection_code).catch((error) => {
          setElementStatus("romaneio-dropzone-status", error.message, "error");
        });
      });
      wrapper.appendChild(row);
    });
  }
}

function renderRomaneioDetail(data) {
  const wrapper = document.getElementById("romaneio-detail");
  wrapper.innerHTML = "";

  const header = data.header || {};
  wrapper.appendChild(
    el(`
      <div class="detail-section">
        <div class="detail-toolbar">
          <span class="detail-pill">${header.status_evento || "processado"}</span>
          <div class="kanban-inline-actions">
            <button type="button" class="btn btn-secondary btn-xs" id="romaneio-detail-delete">Excluir romaneio</button>
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-card">
            <small>Romaneio</small>
            <strong>${formatRomaneioCode(header.romaneio || "N/D")}</strong>
            <em>${header.empresa || "Sem empresa informada"}</em>
          </div>
          <div class="detail-card">
            <small>Recebido em</small>
            <strong>${formatDateTime(header.data_evento)}</strong>
            <em>${number.format(header.quantidade_total)} unidades em ${header.itens} itens</em>
          </div>
          <div class="detail-card">
            <small>Previsao de saida</small>
            <strong>${formatDateTime(header.previsao_saida_at)}</strong>
            <em>${header.criterio_previsao || "Sem criterio informado"}</em>
          </div>
          <div class="detail-card">
            <small>Status da previsao</small>
            <strong>${header.previsao_saida_status || "Sem previsao"}</strong>
            <em>${header.previsao_saida_observacao || ""}</em>
          </div>
        </div>
      </div>
    `),
  );
  wrapper.querySelector("#romaneio-detail-delete")?.addEventListener("click", () => {
    excluirRomaneio(header.romaneio).catch((error) => {
      setElementStatus("romaneio-dropzone-status", error.message, "error");
    });
  });

  const items = el(`<div class="detail-list"></div>`);
  (data.items || []).forEach((item) => {
    items.appendChild(
      el(`
        <div class="detail-card">
          <small>${item.sku}</small>
          <strong>${item.produto}</strong>
          <em>${number.format(item.quantidade)} unidades | ${item.impacto}</em>
          <em>${number.format(item.quantidade_atendida_estoque || 0)} do estoque | pendente ${number.format(item.quantidade_pendente || 0)}</em>
          <em>Disponivel em ${formatDateTime(item.previsao_disponibilidade_at)} | ${item.modo_atendimento || "-"}</em>
          <span class="tag ${statusClass(item.previsao_disponibilidade_status)}">${item.previsao_disponibilidade_status || "sem_previsao"}</span>
        </div>
      `),
    );
  });
  wrapper.appendChild(items.childElementCount ? items : emptyState("Sem itens detalhados para este romaneio."));

  const events = el(`<div class="detail-list"></div>`);
  (data.events || []).forEach((item) => {
    events.appendChild(
      el(`
        <div class="detail-card">
          <small>${item.event_type}</small>
          <strong>${item.event_id}</strong>
          <em>${formatDateTimeWithFallback(item.received_at, "Sem recebimento")} | ${item.status}</em>
        </div>
      `),
    );
  });
  wrapper.appendChild(events.childElementCount ? events : emptyState("Sem eventos adicionais registrados para este romaneio."));
}

function renderLocalRomaneioDetail(entry) {
  const wrapper = document.getElementById("romaneio-detail");
  wrapper.innerHTML = "";

  wrapper.appendChild(
    el(`
      <div class="detail-section">
        <div class="detail-toolbar">
          <span class="detail-pill">${entry.source_type === "pdf" ? "pdf_local" : "manual_local"}</span>
          <div class="kanban-inline-actions">
            <button type="button" class="btn btn-secondary btn-xs" id="romaneio-local-delete">Remover da fila</button>
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-card">
            <small>Romaneio</small>
            <strong>${formatRomaneioCode(entry.romaneio)}</strong>
            <em>${entry.empresa || "INPLAST"}</em>
          </div>
          <div class="detail-card">
            <small>Origem</small>
            <strong>${entry.source_type === "pdf" ? "Arquivo local" : "Cadastro manual"}</strong>
            <em>${formatDateTimeWithFallback(entry.created_at, "Agora")}</em>
          </div>
          <div class="detail-card">
            <small>Pedido / Quantidade</small>
            <strong>${entry.pedido || "Sem pedido informado"}</strong>
            <em>${number.format(entry.quantidade_total || 0)} unidades</em>
          </div>
          <div class="detail-card">
            <small>Arquivo / Status</small>
            <strong>${entry.pdf_name || "Sem PDF vinculado"}</strong>
            <em>${entry.pdf_name ? formatFileSize(entry.pdf_size) : formatStatusLabel(entry.previsao_saida_status)}</em>
          </div>
        </div>
      </div>
    `),
  );
  wrapper.querySelector("#romaneio-local-delete")?.addEventListener("click", () => removerRomaneioLocal(entry.local_id));

  wrapper.appendChild(
    entry.observacao
      ? el(`
          <div class="detail-card">
            <small>Observação</small>
            <strong>${entry.observacao}</strong>
            <em>Romaneio salvo localmente no navegador até a integração final do upload.</em>
          </div>
        `)
      : emptyState("Esse romaneio local ainda não possui observações ou itens vinculados.")
  );
}

function renderStructures(data) {
  const summary = document.getElementById("structure-summary");
  summary.innerHTML = "";
  [
    ["Pais", number.format(data.summary.parent_items || 0)],
    ["Componentes", number.format(data.summary.component_links || 0)],
    ["Ajustes PCP", number.format(data.summary.manual_overrides || 0)],
    ["Linhas", number.format(data.summary.lines_configured || 0)],
  ].forEach(([label, value]) => {
    summary.appendChild(
      el(`
        <div class="mini-card">
          <small>${label}</small>
          <strong>${value}</strong>
        </div>
      `),
    );
  });

  const tbody = document.getElementById("structure-table");
  tbody.innerHTML = "";
  if (!data.items.length) {
    tbody.appendChild(el(`<tr><td colspan="6" class="muted">Sem estruturas homologadas com os filtros atuais.</td></tr>`));
    return;
  }

  data.items.slice(0, 80).forEach((item) => {
    const status = item.is_blocked ? "Bloqueado" : item.has_manual_override ? "Ajustado" : "Base";
    tbody.appendChild(
      el(`
        <tr>
          <td><b>${item.parent_sku}</b><br /><span class="muted">${item.parent_product}</span></td>
          <td><b>${item.component_sku}</b><br /><span class="muted">${item.component_product}</span></td>
          <td>${item.source_scope}<br /><span class="muted">${item.process_stage}</span></td>
          <td>${number.format(item.quantity_per)}<br /><span class="muted">scrap ${number.format(item.scrap_pct || 0)}%</span></td>
          <td>${item.assembly_line_code || "-"}<br /><span class="muted">${item.workstation_code || "Sem posto"}</span></td>
          <td><span class="tag ${item.is_blocked ? "high" : item.has_manual_override ? "info" : "ok"}">${status}</span></td>
        </tr>
      `),
    );
  });
}

function renderProgrammingRecommendation(item, quickCandidates = []) {
  const container = document.getElementById("programming-recommendation");
  if (!container) {
    return;
  }

  const action = String(item?.action || item?.suggestedAction || document.getElementById("programming-form")?.elements?.namedItem("action")?.value || "montar").toLowerCase();
  const moduleKey = action === "produzir" ? getProductionModuleKeyForItem(item || {}) : "montagem";
  const suggestion = getSuggestedProgrammingContext(item || {}, action, moduleKey);
  const options = suggestion.resourceOptions || [];
  const rule = suggestion.rule;

  if (!item || (!item.sku && !quickCandidates.length)) {
    container.innerHTML = `<div class="programming-recommendation-empty">Selecione um item da fila, do MRP ou da carteira programada para ver o melhor recurso sugerido.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="programming-recommendation-card">
      <div class="programming-recommendation-copy">
        <small>${action === "produzir" ? "Otimização de produção" : action === "montar" ? "Otimização de montagem" : "Planejamento operacional"}</small>
        <strong>${item.sku || "Sem SKU"} · ${item.produto || item.descricao || "Item em preparação"}</strong>
        <span>${rule ? `${rule.material_prima || "MP"} · ${rule.cavidades || 0} cavidades · molde ${rule.molde || "não informado"}` : "Sem regra específica da planilha para este SKU. Aplicando sugestão operacional da carteira."}</span>
      </div>
      <div class="programming-recommendation-metrics">
        <div class="mini-card">
          <small>Recurso líder</small>
          <strong>${suggestion.assembly_line_code || "A definir"}</strong>
        </div>
        <div class="mini-card">
          <small>Máquina</small>
          <strong>${suggestion.workstation_code || "A definir"}</strong>
        </div>
        <div class="mini-card">
          <small>Capacidade</small>
          <strong>${number.format(options[0]?.pieces_per_hour || rule?.pecas_hora || 0)}</strong>
        </div>
      </div>
      <div class="programming-recommendation-options">
        ${(options.length ? options : []).slice(0, 4).map((option) => `
          <button type="button" class="resource-suggestion-chip" data-programming-resource="${option.code}" data-programming-workstation="${option.workstationCode || deriveWorkstationFromResourceCode(option.code)}">
            <strong>${option.code}</strong>
            <span>${option.pieces_per_hour ? `${number.format(option.pieces_per_hour)} pç/h` : "recurso disponível"}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  container.querySelectorAll("[data-programming-resource]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = document.getElementById("programming-form");
      if (!form) {
        return;
      }
      const lineField = form.elements.namedItem("assembly_line_code");
      const workstationField = form.elements.namedItem("workstation_code");
      const notesField = form.elements.namedItem("notes");
      if (lineField) lineField.value = button.getAttribute("data-programming-resource") || "";
      if (workstationField) workstationField.value = button.getAttribute("data-programming-workstation") || "";
      if (notesField && !String(notesField.value || "").includes("Recurso sugerido")) {
        notesField.value = [String(notesField.value || "").trim(), `Recurso sugerido ${button.getAttribute("data-programming-resource") || ""}`].filter(Boolean).join(" · ");
      }
      setElementStatus("programming-status", `Recurso ${button.getAttribute("data-programming-resource")} aplicado na programação.`, "success");
    });
  });
}

function renderProgramming(items) {
  const tbody = document.getElementById("programming-table");
  const board = document.getElementById("programming-board");
  const shortcuts = document.getElementById("programming-shortcuts");
  const summary = document.getElementById("programming-summary");
  if (!tbody || !board || !shortcuts || !summary) {
    return;
  }

  const searchQuery = getGlobalSearchQuery();
  const filtered = (Array.isArray(items) ? items : []).filter((item) => {
    if (state.programmingActionFilter && String(item.action || "") !== state.programmingActionFilter) {
      return false;
    }
    return matchesSearch(
      [item.sku, item.produto, item.action, item.assembly_line_code, item.workstation_code, item.notes],
      searchQuery,
    );
  });

  const quickCandidates = [
    ...(state.datasets.assembly || []).map((item) => ({ ...item, suggestedAction: "montar" })),
    ...(state.datasets.production || []).map((item) => ({ ...item, suggestedAction: "produzir" })),
    ...(state.datasets.extrusion || []).map((item) => ({ ...item, suggestedAction: "produzir" })),
  ]
    .filter((item) => matchesSearch([item.sku, item.produto, item.product_type], searchQuery))
    .sort((left, right) => (Number(right.net_required) || 0) - (Number(left.net_required) || 0))
    .slice(0, 6);

  const totals = {
    itens: filtered.length,
    montagem: filtered.filter((item) => item.action === "montar").length,
    producao: filtered.filter((item) => item.action === "produzir").length,
    compras: filtered.filter((item) => item.action === "comprar").length,
    quantidade: sumBy(filtered, (item) => item.quantity_planned || 0),
  };

  summary.innerHTML = "";
  [
    ["Agenda", number.format(totals.itens)],
    ["Montagem", number.format(totals.montagem)],
    ["Produção", number.format(totals.producao)],
    ["Compras", number.format(totals.compras)],
    ["Qtd programada", number.format(totals.quantidade)],
  ].forEach(([label, value]) => {
    summary.appendChild(
      el(`
        <div class="mini-card">
          <small>${label}</small>
          <strong>${value}</strong>
        </div>
      `),
    );
  });

  shortcuts.innerHTML = "";
  if (!quickCandidates.length) {
    shortcuts.appendChild(emptyState("Nenhum atalho crítico para programação com os filtros atuais."));
  } else {
    quickCandidates.forEach((item) => {
      const card = el(`
        <article class="programming-shortcut-card" title="Pré-preencher programação de ${item.sku}">
          <small>${item.suggestedAction === "montar" ? "Fila de esteiras" : getProductionModuleKeyForItem(item) === "extrusao" ? "Fila de extrusão" : "Fila de injetoras"}</small>
          <strong>${item.sku}</strong>
          <span>${item.produto}</span>
          <em>${number.format(item.net_required || 0)} un pend. · est. ${number.format(getOperationalStockForItem(item))}</em>
          <button type="button" class="btn btn-secondary btn-xs">Programar</button>
        </article>
      `);
      card.querySelector("button").addEventListener("click", () => {
        const suggestion = getSuggestedProgrammingContext(item, item.suggestedAction, item.suggestedAction === "produzir" ? getProductionModuleKeyForItem(item) : "montagem");
        prefillProgrammingForm(
          { ...item, action: item.suggestedAction },
          {
            assembly_line_code: suggestion.assembly_line_code,
            workstation_code: suggestion.workstation_code,
            notes: suggestion.notes,
            switchTab: true,
          },
        );
        renderProgrammingRecommendation({ ...item, action: item.suggestedAction }, quickCandidates);
      });
      card.addEventListener("mouseenter", () => renderProgrammingRecommendation({ ...item, action: item.suggestedAction }, quickCandidates));
      shortcuts.appendChild(card);
    });
  }

  tbody.innerHTML = "";
  if (!filtered.length) {
    tbody.appendChild(el(`<tr><td colspan="7" class="muted">Sem programações registradas com os filtros atuais.</td></tr>`));
  } else {
    filtered.forEach((item) => {
      const row = el(`
        <tr class="interactive-row">
          <td><b>${item.sku}</b><br /><span class="muted">${item.produto}</span></td>
          <td>${item.action}</td>
          <td>${formatDateTimeWithFallback(item.planned_start_at, "Não informado")}</td>
          <td>${formatDateTimeWithFallback(item.available_at, "Sem disponibilidade")}</td>
          <td>${number.format(item.quantity_planned || 0)}</td>
          <td>${item.assembly_line_code || item.workstation_code || "-"}</td>
          <td>
            <div class="kanban-inline-actions">
              <span class="tag ${statusClass(item.planning_origin || item.planning_status)}">${item.planning_status || item.planning_origin || "programado"}</span>
              <button type="button" class="btn btn-secondary btn-xs" data-action="edit">Editar</button>
            </div>
          </td>
        </tr>
      `);
      row.addEventListener("click", () => {
        const suggestion = getSuggestedProgrammingContext(item, item.action, item.action === "produzir" ? getProductionModuleKeyForItem(item) : "montagem");
        prefillProgrammingForm(item, { ...suggestion, switchTab: true });
        renderProgrammingRecommendation(item, quickCandidates);
      });
      row.querySelector('[data-action="edit"]').addEventListener("click", (event) => {
        event.stopPropagation();
        const suggestion = getSuggestedProgrammingContext(item, item.action, item.action === "produzir" ? getProductionModuleKeyForItem(item) : "montagem");
        prefillProgrammingForm(item, { ...suggestion, switchTab: true });
        renderProgrammingRecommendation(item, quickCandidates);
      });
      tbody.appendChild(row);
    });
  }

  const lanes = [
    { key: "montar", label: "Montagem", subtitle: "Esteiras e postos finais" },
    { key: "produzir", label: "Produção", subtitle: "Injetoras e extrusão" },
    { key: "comprar", label: "Compras", subtitle: "Itens que bloqueiam a carteira" },
    { key: "analisar", label: "Acompanhar", subtitle: "Ajustes e exceções" },
  ];

  board.innerHTML = "";
  lanes.forEach((lane) => {
    const laneItems = filtered.filter((item) => {
      if (lane.key === "analisar") {
        return !["montar", "produzir", "comprar"].includes(String(item.action || ""));
      }
      return String(item.action || "") === lane.key;
    });

    const laneEl = el(`
      <section class="programming-lane">
        <header class="programming-lane-header">
          <div>
            <h3>${lane.label}</h3>
            <span>${lane.subtitle}</span>
          </div>
          <strong>${laneItems.length}</strong>
        </header>
        <div class="programming-lane-body"></div>
      </section>
    `);

    const laneBody = laneEl.querySelector(".programming-lane-body");
    if (!laneItems.length) {
      laneBody.appendChild(emptyState(`Sem itens em ${lane.label.toLowerCase()}.`));
    } else {
      laneItems.slice(0, 12).forEach((item) => {
        const card = el(`
          <article class="programming-entry-card" title="Editar programação de ${item.sku}">
            <small>${item.sku}</small>
            <strong>${item.produto}</strong>
            <span>${number.format(item.quantity_planned || 0)} un · ${item.assembly_line_code || item.workstation_code || "Sem recurso"}</span>
            <em>Disponível ${formatDateTimeWithFallback(item.available_at, "sem previsão")}</em>
          </article>
        `);
        card.addEventListener("click", () => {
          prefillProgrammingForm(
            item,
            {
              ...getSuggestedProgrammingContext(item, item.action, item.action === "produzir" ? getProductionModuleKeyForItem(item) : "montagem"),
              switchTab: true,
            },
          );
          renderProgrammingRecommendation(item, quickCandidates);
        });
        laneBody.appendChild(card);
      });
    }

    board.appendChild(laneEl);
  });

  const form = document.getElementById("programming-form");
  const currentSku = normalizeSkuLookup(form?.elements?.namedItem("sku")?.value || "");
  const draftMatch = quickCandidates.find((entry) => normalizeSkuLookup(entry.sku) === currentSku)
    || filtered.find((entry) => normalizeSkuLookup(entry.sku) === currentSku)
    || quickCandidates[0]
    || filtered[0]
    || null;
  renderProgrammingRecommendation(draftMatch, quickCandidates);
}

function renderApontamento() {
  const queueList = document.getElementById("apontamento-queue");
  const stagePanel = document.getElementById("apontamento-stage-panel");
  const stageStatus = document.getElementById("apontamento-stage-status");
  const queueCount = document.getElementById("apontamento-queue-count");
  const screenTabs = document.getElementById("apontamento-screen-tabs");
  const machineGrid = document.getElementById("apontamento-machine-grid");
  const hourTable = document.getElementById("apontamento-hour-table");
  const flowList = document.getElementById("apontamento-flow-list");
  const lossList = document.getElementById("apontamento-loss-list");
  const operatorPanel = document.getElementById("apontamento-operator-panel");
  const logList = document.getElementById("apontamento-log-list");
  const form = document.getElementById("apontamento-form");

  if (!queueList || !stagePanel || !stageStatus || !queueCount || !screenTabs || !machineGrid || !hourTable || !flowList || !lossList || !operatorPanel || !logList || !form) {
    return;
  }

  const machines = buildApontamentoMachines();
  const searchQuery = getGlobalSearchQuery();
  if (!machines.length) {
    return;
  }
  if (!state.apontamentoSelecionado || !machines.some((item) => item.maquina === state.apontamentoSelecionado)) {
    state.apontamentoSelecionado = machines[0].maquina;
  }
  const selectedMachine = machines.find((item) => item.maquina === state.apontamentoSelecionado) || machines[0];
  const queueItems = buildApontamentoQueue().filter((item) =>
    matchesSearch([item.sku, item.produto, item.op_code, item.machine_hint, item.status], searchQuery),
  );
  if (!state.apontamentoFilaSelecionada || !queueItems.some((item) => item.queue_key === state.apontamentoFilaSelecionada)) {
    state.apontamentoFilaSelecionada = queueItems[0]?.queue_key || null;
  }
  const selectedQueueItem = queueItems.find((item) => item.queue_key === state.apontamentoFilaSelecionada) || null;

  const screens = [
    { key: "resumo", label: "Resumo" },
    { key: "fila", label: "Fila do turno" },
    { key: "paradas", label: "Paradas e perdas" },
    { key: "historico", label: "Histórico" },
  ];
  if (!screens.some((item) => item.key === state.apontamentoScreen)) {
    state.apontamentoScreen = "resumo";
  }

  const machineField = form.elements.namedItem("maquina");
  if (machineField) {
    machineField.innerHTML = machines
      .map((item) => `<option value="${item.maquina}">${item.maquina} · ${item.produto}</option>`)
      .join("");
    machineField.value = selectedMachine.maquina;
  }
  const operatorField = form.elements.namedItem("operator");
  if (operatorField && !operatorField.value && state.currentUser) {
    operatorField.value = state.currentUser.full_name || state.currentUser.username;
  }
  const opField = form.elements.namedItem("op_code");
  if (opField && selectedQueueItem) {
    opField.value = selectedQueueItem.op_code;
  }

  screenTabs.innerHTML = "";
  screens.forEach((screen) => {
    const button = el(`
      <button type="button" class="btn ${screen.key === state.apontamentoScreen ? "btn-primary" : "btn-secondary"} btn-xs">
        ${screen.label}
      </button>
    `);
    button.addEventListener("click", () => {
      state.apontamentoScreen = screen.key;
      renderApontamento();
    });
    screenTabs.appendChild(button);
  });
  stageStatus.textContent = screens.find((item) => item.key === state.apontamentoScreen)?.label || "Resumo";
  queueCount.textContent = number.format(queueItems.length);

  queueList.innerHTML = "";
  if (!queueItems.length) {
    queueList.appendChild(emptyState("Nenhuma programação pronta para o turno com os filtros atuais."));
  } else {
    queueItems.forEach((item) => {
      const card = el(`
        <article class="aponta-queue-card ${item.queue_key === state.apontamentoFilaSelecionada ? "selected" : ""}">
          <small>${formatStatusLabel(item.status)} · ${formatDateTimeWithFallback(item.planned_start_at, "Agora")}</small>
          <strong>${item.op_code}</strong>
          <span>${item.sku} · ${item.produto}</span>
          <em>${number.format(item.quantity_planned || 0)} un · ${item.machine_hint}</em>
          <button type="button" class="btn btn-secondary btn-xs">Assumir</button>
        </article>
      `);
      card.addEventListener("click", () => {
        state.apontamentoFilaSelecionada = item.queue_key;
        renderApontamento();
      });
      card.querySelector("button").addEventListener("click", (event) => {
        event.stopPropagation();
        state.apontamentoFilaSelecionada = item.queue_key;
        prefillApontamentoForm({
          maquina: selectedMachine.maquina,
          op_code: item.op_code,
          event_type: "iniciar",
          screen: "resumo",
          reason: item.notes || "",
        });
      });
      queueList.appendChild(card);
    });
  }

  machineGrid.innerHTML = "";
  machines
    .filter((item) => matchesSearch([item.maquina, item.produto, item.status], searchQuery))
    .forEach((item) => {
      const card = el(`
        <article class="aponta-machine-card ${item.maquina === selectedMachine.maquina ? "selected" : ""}">
          <header>
            <div>
              <small>${item.maquina}</small>
              <strong>${item.produto}</strong>
            </div>
            <span class="tag ${item.tone}">${item.status}</span>
          </header>
          <div class="aponta-machine-stats">
            <div>
              <span>Restante</span>
              <b>${number.format(item.pecasRestantes)} peças</b>
            </div>
            <div>
              <span>Produzido/hora</span>
              <b>${number.format(item.produzidoHora)}</b>
            </div>
            <div>
              <span>Soma no turno</span>
              <b>${number.format(item.somaTurno)}</b>
            </div>
            <div>
              <span>Lote</span>
              <b>${number.format(item.lote)}</b>
            </div>
          </div>
          <em>Previsão inicial de término: ${formatDateTimeWithFallback(item.previstoTermino, "Sem previsão confiável")}</em>
        </article>
      `);
      card.addEventListener("click", () => {
        state.apontamentoSelecionado = item.maquina;
        renderApontamento();
      });
      machineGrid.appendChild(card);
    });

  const machineLogs = state.apontamentoLogs
    .filter((entry) => entry.machine_code === machineCodeFromLabel(selectedMachine.maquina))
    .slice(0, 10);

  hourTable.innerHTML = "";
  buildApontamentoTableRows()
    .filter((item) => matchesSearch([item.maquina, item.motivo], searchQuery))
    .filter((item) => item.maquina === machineCodeFromLabel(selectedMachine.maquina) || item.maquina === selectedMachine.maquina)
    .slice(0, 18)
    .forEach((item) => {
      hourTable.appendChild(
        el(`
          <tr>
            <td>${item.faixa}</td>
            <td><strong>${item.maquina}</strong></td>
            <td>${number.format(item.pecas)}</td>
            <td>${number.format(item.refugos)}</td>
            <td>${item.paradaInicio === "-" ? "Sem parada" : `${item.paradaInicio} → ${item.paradaFim}`}</td>
            <td>${item.motivo}</td>
          </tr>
        `),
      );
    });

  operatorPanel.innerHTML = `
    <div class="aponta-operator-card">
      <small>Máquina selecionada</small>
      <strong>${selectedMachine.maquina}</strong>
      <span>${selectedMachine.produto}</span>
    </div>
    <div class="aponta-operator-card">
      <small>OP atual</small>
      <strong>${selectedQueueItem?.op_code || "Sem OP assumida"}</strong>
      <span>${selectedQueueItem ? `${number.format(selectedQueueItem.quantity_planned || 0)} un planejadas` : "Escolha uma atividade na fila"}</span>
    </div>
    <div class="aponta-operator-card">
      <small>Status</small>
      <strong>${selectedMachine.status}</strong>
      <span>${number.format(selectedMachine.pecasRestantes || 0)} peças restantes</span>
    </div>
    <div class="aponta-action-row">
      <button type="button" class="btn btn-primary btn-xs" data-event="iniciar">Iniciar OP</button>
      <button type="button" class="btn btn-secondary btn-xs" data-event="apontar">Apontar produção</button>
      <button type="button" class="btn btn-secondary btn-xs" data-event="parada">Registrar parada</button>
      <button type="button" class="btn btn-secondary btn-xs" data-event="finalizar">Finalizar atividade</button>
    </div>
  `;
  operatorPanel.querySelectorAll("[data-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const eventType = button.getAttribute("data-event");
      prefillApontamentoForm({
        maquina: selectedMachine.maquina,
        op_code: selectedQueueItem?.op_code || "",
        event_type: eventType,
        screen: apontaScreenFromEvent(eventType),
        reason: eventType === "parada" ? "Informe o motivo da parada." : "",
      });
    });
  });

  if (state.apontamentoScreen === "fila") {
    stagePanel.innerHTML = `
      <div class="aponta-stage-copy">
        <small>Fila do turno</small>
        <strong>${queueItems.length ? "Atividades prontas para execução" : "Sem atividade pronta"}</strong>
        <span>Assuma uma programação, confira o recurso sugerido e dispare a execução da OP.</span>
      </div>
      <div class="aponta-stage-list">
        ${(queueItems.length
          ? queueItems.map((item) => `
              <div class="aponta-stage-row ${item.queue_key === state.apontamentoFilaSelecionada ? "selected" : ""}">
                <strong>${item.op_code}</strong>
                <span>${item.sku} · ${item.produto}</span>
                <em>${number.format(item.quantity_planned || 0)} un · ${item.machine_hint}</em>
              </div>
            `).join("")
          : `<div class="detail-empty">Nenhuma atividade programada para a fila atual.</div>`)}
      </div>
    `;
  } else if (state.apontamentoScreen === "paradas") {
    stagePanel.innerHTML = `
      <div class="aponta-stage-copy">
        <small>Paradas e perdas</small>
        <strong>Motivos operacionais do turno</strong>
        <span>Use esta tela para abrir a parada, apontar motivo e medir o impacto antes da retomada.</span>
      </div>
      <div class="aponta-stage-list">
        ${apontamentoLosses.map((item) => `
          <div class="aponta-stage-row">
            <strong>${item.motivo}</strong>
            <span>${item.impacto}</span>
            <em>${item.detalhe}</em>
          </div>
        `).join("")}
      </div>
    `;
  } else if (state.apontamentoScreen === "historico") {
    stagePanel.innerHTML = `
      <div class="aponta-stage-copy">
        <small>Histórico operacional</small>
        <strong>${selectedMachine.maquina}</strong>
        <span>Últimos registros de produção, parada e fechamento desta máquina.</span>
      </div>
      <div class="aponta-stage-list">
        ${(machineLogs.length
          ? machineLogs.map((entry) => `
              <div class="aponta-stage-row">
                <strong>${formatStatusLabel(entry.event_type)}</strong>
                <span>${entry.operator} · ${entry.op_code || "Sem OP"}</span>
                <em>${formatDateTimeWithFallback(entry.created_at, "Agora")} · ${entry.reason || "Sem observação"}</em>
              </div>
            `).join("")
          : `<div class="detail-empty">Nenhum registro operacional para esta máquina ainda.</div>`)}
      </div>
    `;
  } else {
    stagePanel.innerHTML = `
      <div class="aponta-stage-copy">
        <small>Execução ativa</small>
        <strong>${selectedQueueItem?.op_code || "Sem OP selecionada"}</strong>
        <span>${selectedQueueItem ? `${selectedQueueItem.sku} · ${selectedQueueItem.produto}` : "Assuma uma atividade na fila para iniciar o apontamento."}</span>
      </div>
      <div class="aponta-stage-metrics">
        <div class="mini-card">
          <small>Quantidade planejada</small>
          <strong>${number.format(selectedQueueItem?.quantity_planned || 0)}</strong>
        </div>
        <div class="mini-card">
          <small>Produção no turno</small>
          <strong>${number.format(selectedMachine.somaTurno || 0)}</strong>
        </div>
        <div class="mini-card">
          <small>Refugo acumulado</small>
          <strong>${number.format(selectedMachine.totalScrap || 0)}</strong>
        </div>
        <div class="mini-card">
          <small>Disponível em</small>
          <strong>${formatDateTimeWithFallback(selectedQueueItem?.available_at, "Sem disponibilidade")}</strong>
        </div>
      </div>
      <div class="aponta-stage-list">
        <div class="aponta-stage-row selected">
          <strong>Recurso sugerido</strong>
          <span>${selectedQueueItem?.machine_hint || selectedMachine.maquina}</span>
          <em>${selectedQueueItem?.notes || "Sem observação operacional para esta OP."}</em>
        </div>
        <div class="aponta-stage-row">
          <strong>Próxima ação</strong>
          <span>${selectedMachine.status === "Parada" ? "Registrar motivo e continuidade" : "Apontar produção ou finalizar atividade"}</span>
          <em>Use os botões rápidos para abrir o evento correto no tablet.</em>
        </div>
      </div>
    `;
  }

  flowList.innerHTML = "";
  apontamentoFlows.forEach((item) => {
    flowList.appendChild(
      el(`
        <div class="aponta-flow-card">
          <small>${item.etapa}</small>
          <strong>${item.titulo}</strong>
          <span>${item.detalhe}</span>
        </div>
      `),
    );
  });

  lossList.innerHTML = "";
  apontamentoLosses.forEach((item) => {
    lossList.appendChild(
      el(`
        <div class="aponta-loss-card">
          <small>${item.impacto}</small>
          <strong>${item.motivo}</strong>
          <span>${item.detalhe}</span>
        </div>
      `),
    );
  });

  logList.innerHTML = "";
  if (!machineLogs.length) {
    logList.appendChild(emptyState("Sem registros lançados para esta máquina ainda."));
  } else {
    machineLogs.forEach((entry) => {
      logList.appendChild(
        el(`
          <article class="aponta-log-card">
            <small>${entry.machine_code} · ${entry.event_type}</small>
            <strong>${entry.operator}</strong>
            <span>${number.format(entry.pieces || 0)} peças · ${number.format(entry.scrap || 0)} refugo(s)</span>
            <em>${entry.reason || "Sem observação"} · ${formatDateTimeWithFallback(entry.created_at, "Agora")}</em>
          </article>
        `),
      );
    });
  }
}

function renderMrpTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  if (!tbody) {
    return;
  }
  const action = targetId === "assembly-table" ? "montar" : "produzir";
  const moduleKey = targetId === "assembly-table" ? "montagem" : targetId === "extrusion-table" ? "extrusao" : "producao";
  const filtered = (Array.isArray(items) ? items : []).filter((item) =>
    matchesSearch([item.sku, item.produto, item.product_type], getGlobalSearchQuery()),
  );

  tbody.innerHTML = "";
  if (!filtered.length) {
    tbody.appendChild(el(`<tr><td colspan="6" class="muted">Sem itens nesta fila com os dados atuais.</td></tr>`));
  } else {
    filtered.forEach((item, index) => {
      const suggestion = getSuggestedProgrammingContext(item, action, moduleKey);
      const row = el(`
        <tr class="interactive-row">
          <td>
            <div class="cell">
              <div>
                <b>${item.sku}</b>
                <span>${item.product_type}</span>
              </div>
            </div>
          </td>
          <td>${item.produto}</td>
          <td>${number.format(item.net_required)}</td>
          <td>${number.format(getOperationalStockForItem(item))}</td>
          <td>${money.format(item.estimated_total_cost)}</td>
          <td>
            <div class="kanban-inline-actions">
              <span class="tag ${item.criticidade.toLowerCase()}">${item.criticidade}</span>
              <button type="button" class="btn btn-secondary btn-xs" data-action="program">Programar</button>
            </div>
          </td>
        </tr>
      `);
      row.addEventListener("click", () => {
        prefillProgrammingForm(
          { ...item, action },
          {
            assembly_line_code: suggestion.assembly_line_code,
            workstation_code: suggestion.workstation_code,
            notes: suggestion.notes,
            switchTab: true,
          },
        );
        renderProgrammingRecommendation({ ...item, action });
      });
      row.querySelector('[data-action="program"]').addEventListener("click", (event) => {
        event.stopPropagation();
        prefillProgrammingForm(
          { ...item, action },
          {
            assembly_line_code: suggestion.assembly_line_code,
            workstation_code: suggestion.workstation_code,
            notes: suggestion.notes,
            switchTab: true,
          },
        );
        renderProgrammingRecommendation({ ...item, action });
      });
      row.addEventListener("mouseenter", () => renderProgrammingRecommendation({ ...item, action }));
      tbody.appendChild(row);
    });
  }
}

function renderPurchases(items) {
  const tbody = document.getElementById("purchase-table");
  tbody.innerHTML = "";
  if (!items.length) {
    tbody.appendChild(el(`<tr><td colspan="5" class="muted">Sem compras calculadas com os dados atuais.</td></tr>`));
  } else {
    items.forEach((item) => {
      tbody.appendChild(
        el(`
          <tr>
            <td><b>${item.sku}</b></td>
            <td>${item.produto}</td>
            <td>${item.product_type}</td>
            <td>${number.format(item.net_required)}</td>
            <td>${money.format(item.estimated_total_cost)}</td>
          </tr>
        `),
      );
    });
  }
}

function renderRecycling(items) {
  const wrapper = document.getElementById("recycling-list");
  wrapper.innerHTML = "";
  if (!items.length) {
    wrapper.appendChild(emptyState("Sem projecoes de reciclagem para a rodada atual."));
  } else {
    items.forEach((item) => {
      wrapper.appendChild(
        el(`
          <div class="list-card">
            <div class="item-row">
              <div>
                <small>${item.produced_sku}</small>
                <strong>${item.produced_description}</strong>
              </div>
              <span class="tag ok">${number.format(item.projected_recycled_raw_material_qty)} kg</span>
            </div>
            <em>Residuo ${item.residue_sku}: ${number.format(item.projected_residue_qty)} kg | Servico ${money.format(item.projected_recycling_service_cost)}</em>
          </div>
        `),
      );
    });
  }
}

function renderCosts(items) {
  const wrapper = document.getElementById("cost-list");
  wrapper.innerHTML = "";
  if (!items.length) {
    wrapper.appendChild(emptyState("Sem custos calculados enquanto nao houver rodada de MRP com dados carregados."));
  } else {
    items.forEach((item) => {
      wrapper.appendChild(
        el(`
          <div class="cost-card">
            <small>${item.category}</small>
            <strong>${money.format(item.estimated_total_cost)}</strong>
            <em>${item.label}</em>
          </div>
        `),
      );
    });
  }
}

function renderSources(items) {
  const wrapper = document.getElementById("sources-list");
  const summary = document.getElementById("sources-summary");
  if (!wrapper || !summary) {
    return;
  }
  wrapper.innerHTML = "";
  summary.innerHTML = "";
  const filtered = (Array.isArray(items) ? items : []).filter((item) =>
    matchesSearch(
      [item.source_code, item.source_name, item.source_area, item.contract_status, item.freshness_status],
      getGlobalSearchQuery(),
    ),
  );
  if (!filtered.length) {
    wrapper.appendChild(emptyState("Nenhuma fonte cadastrada para exibicao."));
    return;
  }

  const groups = [
    {
      key: "active",
      label: "Ativas",
      helper: "Fontes que entram no cálculo e podem ser sincronizadas agora.",
      items: filtered.filter((item) => item.contract_status === "known" && item.is_active),
    },
    {
      key: "pending",
      label: "Pendentes",
      helper: "Integrações mapeadas, mas ainda não homologadas para o cálculo oficial.",
      items: filtered.filter((item) => item.contract_status === "pending"),
    },
    {
      key: "inactive",
      label: "Desativadas",
      helper: "Fontes fora da rotina ativa. Não significam erro operacional por si só.",
      items: filtered.filter((item) => item.contract_status !== "pending" && !item.is_active),
    },
  ];

  [
    ["Ativas", groups[0].items.length],
    ["Pendentes", groups[1].items.length],
    ["Desativadas", groups[2].items.length],
  ].forEach(([label, value]) => {
    summary.appendChild(
      el(`
        <div class="mini-card">
          <small>${label}</small>
          <strong>${number.format(value)}</strong>
        </div>
      `),
    );
  });

  groups.forEach((group) => {
    const section = el(`
      <section class="source-group-card">
        <div class="panel-header compact">
          <div>
            <h3>${group.label}</h3>
            <span class="section-copy">${group.helper}</span>
          </div>
          <span class="status-badge info">${group.items.length}</span>
        </div>
        <div class="source-group-body"></div>
      </section>
    `);

    const body = section.querySelector(".source-group-body");
    if (!group.items.length) {
      body.appendChild(emptyState(`Nenhuma fonte em ${group.label.toLowerCase()}.`));
    } else {
      group.items.forEach((item) => {
        const cssStatusClass = statusClass(item.freshness_status);
        const canSync = item.is_active && item.contract_status === "known";
        const card = el(`
          <div class="source-card">
            <div class="source-card-copy">
              <small>${item.source_area} · ${item.source_code}</small>
              <strong>${item.source_name}</strong>
              <em>${item.last_success_at ? `Última carga ${formatDateTimeWithFallback(item.last_success_at, "Sem carga validada")}` : "Sem carga validada ainda"}</em>
              <span class="muted">${item.contract_status === "pending" ? "Contrato pendente de implantação" : item.is_active ? "Fonte operacional ativa" : "Fonte desativada para a rotina"}</span>
            </div>
            <div class="source-card-actions">
              <span class="tag ${cssStatusClass}">${item.freshness_status}</span>
              ${canSync ? `<button type="button" class="btn btn-secondary btn-xs" data-source-code="${item.source_code}">Sincronizar</button>` : ""}
            </div>
          </div>
        `);

        const button = card.querySelector("button[data-source-code]");
        if (button) {
          button.addEventListener("click", async () => {
            await syncSources([item.source_code]);
          });
        }

        body.appendChild(card);
      });
    }

    wrapper.appendChild(section);
  });
}

function resetIntegrationForm() {
  const form = document.getElementById("integration-form");
  if (!form) {
    return;
  }
  form.reset();
  delete form.dataset.editingIntegrationId;
  if (form.elements.namedItem("integration_type")) {
    form.elements.namedItem("integration_type").value = "n8n_webhook_romaneios";
  }
  if (form.elements.namedItem("method")) {
    form.elements.namedItem("method").value = "POST";
  }
  if (form.elements.namedItem("auth_type")) {
    form.elements.namedItem("auth_type").value = "none";
  }
  if (form.elements.namedItem("active")) {
    form.elements.namedItem("active").value = "true";
  }
  if (form.elements.namedItem("extra_headers_json")) {
    form.elements.namedItem("extra_headers_json").value = "{}";
  }
  if (form.elements.namedItem("request_body_json")) {
    form.elements.namedItem("request_body_json").value = "{}";
  }
}

function populateIntegrationForm(item) {
  const form = document.getElementById("integration-form");
  if (!form || !item) {
    return;
  }
  form.dataset.editingIntegrationId = item.id || "";
  [
    "id",
    "name",
    "integration_type",
    "webhook_url",
    "method",
    "auth_type",
    "auth_value",
    "extra_headers_json",
    "request_body_json",
  ].forEach((field) => {
    if (form.elements.namedItem(field)) {
      form.elements.namedItem(field).value = item[field] ?? "";
    }
  });
  if (form.elements.namedItem("active")) {
    form.elements.namedItem("active").value = String(item.active ? "true" : "false");
  }
}

function renderIntegrations(items) {
  const summary = document.getElementById("integrations-summary");
  const list = document.getElementById("integrations-list");
  if (!summary || !list) {
    return;
  }

  const integrations = Array.isArray(items) ? items : [];
  summary.innerHTML = "";
  list.innerHTML = "";

  const activeCount = integrations.filter((item) => item.active).length;
  const lastSync = integrations
    .map((item) => item.last_synced_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  [
    ["Ativas", number.format(activeCount)],
    ["Cadastradas", number.format(integrations.length)],
    ["Último refresh", formatDateTimeWithFallback(lastSync, "Sem execução")],
  ].forEach(([label, value]) => {
    summary.appendChild(
      el(`
        <div class="mini-card">
          <small>${label}</small>
          <strong>${value}</strong>
        </div>
      `),
    );
  });

  if (!integrations.length) {
    list.appendChild(emptyState("Nenhuma integração cadastrada. Configure o webhook do n8n para atualizar os romaneios."));
    resetIntegrationForm();
    return;
  }

  integrations.forEach((item) => {
    const statusTone = item.last_status === "error" ? "high" : item.active ? "ok" : "missing";
    const card = el(`
      <div class="source-card integration-card">
        <div class="source-card-copy">
          <small>${item.integration_type}</small>
          <strong>${item.name}</strong>
          <em>${item.webhook_url || "Webhook ainda não configurado"}</em>
          <span class="muted">${item.last_error || (item.last_synced_at ? `Último refresh ${formatDateTimeWithFallback(item.last_synced_at, "agora")}` : "Sem refresh executado")}</span>
        </div>
        <div class="source-card-actions">
          <span class="tag ${statusTone}">${item.active ? (item.last_status || "ativa") : "inativa"}</span>
          <button type="button" class="btn btn-secondary btn-xs" data-action="edit">Editar</button>
          <button type="button" class="btn btn-secondary btn-xs" data-action="run">Atualizar</button>
        </div>
      </div>
    `);
    card.querySelector('[data-action="edit"]')?.addEventListener("click", () => {
      populateIntegrationForm(item);
      setElementStatus("integration-status", `Editando ${item.name}.`);
    });
    card.querySelector('[data-action="run"]')?.addEventListener("click", () => {
      atualizarRomaneiosViaWebhook(item.id).catch((error) => {
        setElementStatus("integration-status", error.message, "error");
      });
    });
    list.appendChild(card);
  });

  const currentForm = document.getElementById("integration-form");
  const editingId = currentForm?.dataset.editingIntegrationId || "";
  if (!editingId) {
    populateIntegrationForm(integrations[0]);
  }
}

function renderPainel(items) {
  const tbody = document.getElementById("painel-table");
  tbody.innerHTML = "";
  if (!items.length) {
    tbody.appendChild(el(`<tr><td colspan="5" class="muted">Painel sem itens porque ainda nao ha cargas operacionais validadas.</td></tr>`));
  } else {
    items.forEach((item) => {
      tbody.appendChild(
        el(`
          <tr>
            <td><b>${item.sku}</b></td>
            <td>${item.produto}</td>
            <td>${item.tipo}</td>
            <td>${number.format(item.saldo)}</td>
            <td>${item.acao}</td>
          </tr>
        `),
      );
    });
  }
}

function renderEstoqueAtual(items) {
  const tbody = document.getElementById("stock-table");
  const summary = document.getElementById("stock-summary");
  if (!tbody || !summary) {
    return;
  }

  const searchQuery = String(state.estoqueBusca || "").trim().toLowerCase();
  const typeFilter = String(state.estoqueFiltro || "").trim().toLowerCase();
  const filtered = (Array.isArray(items) ? items : []).filter((item) => {
    if (typeFilter && String(item.tipo || item.product_type || "").toLowerCase() !== typeFilter) {
      return false;
    }
    return matchesSearch([item.sku, item.produto, item.tipo, item.product_type], searchQuery);
  });

  const totals = {
    skus: filtered.length,
    estoque: sumBy(filtered, (item) => getOperationalStockForItem(item)),
    disponiveis: filtered.filter((item) => getOperationalStockForItem(item) > 0).length,
    criticos: filtered.filter((item) => getOperationalStockForItem(item) <= 0).length,
  };

  summary.innerHTML = "";
  [
    ["SKUs", number.format(totals.skus)],
    ["Estoque atual", number.format(totals.estoque)],
    ["Com saldo disponível", number.format(totals.disponiveis)],
    ["Itens críticos", number.format(totals.criticos)],
  ].forEach(([label, value]) => {
    summary.appendChild(
      el(`
        <div class="mini-card">
          <small>${label}</small>
          <strong>${value}</strong>
        </div>
      `),
    );
  });

  tbody.innerHTML = "";
  if (!filtered.length) {
    tbody.appendChild(
      el(`<tr><td colspan="5" class="muted">Nenhum item do estoque atual atende aos filtros informados.</td></tr>`),
    );
    return;
  }

  filtered.forEach((item) => {
    const stock = getOperationalStockForItem(item);
    const tone = stock <= 0 ? "high" : stock < 50 ? "warning" : "ok";
    const label = stock <= 0 ? "Sem saldo" : stock < 50 ? "Baixo" : "Disponível";
    const row = el(`
      <tr class="interactive-row">
        <td><strong>${item.sku}</strong></td>
        <td>${item.produto}</td>
        <td>${formatProductType(item.tipo || item.product_type)}</td>
        <td class="${stock <= 0 ? "text-warning" : ""}">${number.format(stock)}</td>
        <td><span class="tag ${tone}">${label}</span></td>
      </tr>
    `);
    row.addEventListener("click", () => prefillStockMovementForm(item));
    tbody.appendChild(row);
  });
}

function prefillStockMovementForm(item = {}) {
  const form = document.getElementById("stock-movement-form");
  if (!form) {
    return;
  }
  const values = {
    sku: item.sku || "",
    produto: item.produto || "",
    product_type: (item.tipo || item.product_type || "").toLowerCase(),
    movement_type: "entrada",
    quantity: "",
    document_ref: "",
    responsavel: state.currentUser?.full_name || "",
    observacao: item.sku ? `Ajuste operacional para ${item.sku}.` : "",
  };
  Object.entries(values).forEach(([fieldName, value]) => {
    const field = form.elements.namedItem(fieldName);
    if (field) {
      field.value = value;
    }
  });
  setElementStatus("stock-movement-status", item.sku ? `Movimentação preparada para ${item.sku}.` : "Formulário pronto.", "success");
}

function renderStockMovements() {
  const tbody = document.getElementById("stock-movement-table");
  const summary = document.getElementById("stock-movement-summary");
  if (!tbody || !summary) {
    return;
  }

  const items = Array.isArray(state.stockMovements) ? state.stockMovements : [];
  const totals = {
    entradas: sumBy(items.filter((item) => item.movement_type === "entrada"), (item) => item.quantity || 0),
    saidas: sumBy(items.filter((item) => item.movement_type === "saida"), (item) => item.quantity || 0),
    movimentos: items.length,
  };

  summary.innerHTML = "";
  [
    ["Entradas", number.format(totals.entradas)],
    ["Saídas", number.format(totals.saidas)],
    ["Movimentos", number.format(totals.movimentos)],
  ].forEach(([label, value]) => {
    summary.appendChild(
      el(`
        <div class="mini-card">
          <small>${label}</small>
          <strong>${value}</strong>
        </div>
      `),
    );
  });

  tbody.innerHTML = "";
  if (!items.length) {
    tbody.appendChild(el(`<tr><td colspan="6" class="muted">Nenhuma movimentação registrada pelo almoxarifado ainda.</td></tr>`));
    return;
  }

  items.slice(0, 14).forEach((item) => {
    const row = el(`
      <tr class="interactive-row">
        <td>${formatDateTimeWithFallback(item.created_at, "Agora")}</td>
        <td><strong>${item.sku}</strong><br /><span class="muted">${item.produto || "Produto não informado"}</span></td>
        <td><span class="tag ${item.movement_type === "saida" ? "warning" : "ok"}">${item.movement_type === "saida" ? "Saída" : "Entrada"}</span></td>
        <td>${number.format(item.quantity || 0)}</td>
        <td>${item.document_ref || "-"}</td>
        <td>${item.responsavel || "-"}</td>
      </tr>
    `);
    row.addEventListener("click", () => prefillStockMovementForm(item));
    tbody.appendChild(row);
  });
}

async function salvarStockMovement(event) {
  event.preventDefault();
  try {
    const form = event.currentTarget;
    const payload = payloadFromForm(form);
    if (!payload.sku || !payload.quantity) {
      setElementStatus("stock-movement-status", "Informe SKU e quantidade para registrar o movimento.", "error");
      return;
    }
    if (!payload.responsavel && state.currentUser) {
      payload.responsavel = state.currentUser.full_name || state.currentUser.username;
    }
    const response = await postJson("/api/pcp/stock-movements/save", payload);
    state.stockMovements = Array.isArray(response.items) ? response.items : state.stockMovements;
    renderEstoqueAtual(state.datasets.painel);
    renderStockMovements();
    prefillStockMovementForm(response.movement || {});
    setElementStatus("stock-movement-status", `Movimentação de ${payload.sku} registrada com sucesso.`, "success");
  } catch (error) {
    setElementStatus("stock-movement-status", error.message, "error");
  }
}

async function salvarIntegracao(event) {
  event.preventDefault();
  try {
    if (!state.currentUser || !["root", "manager"].includes(state.currentUser.role)) {
      setElementStatus("integration-status", "Apenas administradores podem alterar integrações.", "error");
      return;
    }

    const form = event.currentTarget;
    const payload = payloadFromForm(form);
    if (!payload.name || !payload.webhook_url) {
      setElementStatus("integration-status", "Informe nome e webhook da integração.", "error");
      return;
    }
    payload.id = form.dataset.editingIntegrationId || payload.id || "";
    payload.active = String(payload.active || "true") === "true";
    const response = await postJson("/api/pcp/integrations/save", payload);
    state.integrations = Array.isArray(response.items) ? response.items : state.integrations;
    renderIntegrations(state.integrations);
    populateIntegrationForm(response.integration || payload);
    setElementStatus("integration-status", `Integração ${payload.name} salva com sucesso.`, "success");
  } catch (error) {
    setElementStatus("integration-status", error.message, "error");
  }
}

async function atualizarRomaneiosViaWebhook(integrationId = "") {
  const statusIds = ["romaneio-refresh-status", "integration-status", "romaneio-dropzone-status"];
  statusIds.forEach((id) => setElementStatus(id, "Atualizando romaneios via integração..."));
  try {
    const response = await postJson("/api/pcp/romaneios/refresh", integrationId ? { integration_id: integrationId } : {});
    if (Array.isArray(response.refreshed_romaneios) && response.refreshed_romaneios.length) {
      state.romaneioSelecionado = String(response.refreshed_romaneios[0]);
    }
    await carregarTudo();
    const refreshStatus = String(response.status || "").toLowerCase();
    if (["accepted", "queued", "started", "processing", "running"].includes(refreshStatus)) {
      const acceptedMessage = response.message || "Atualização aceita. O n8n seguirá processando em segundo plano.";
      statusIds.forEach((id) => setElementStatus(id, acceptedMessage, "success"));
      return response;
    }
    const successCount = Number(response.count || response.received_records || 0);
    const errorCount = Array.isArray(response.errors) ? response.errors.length : 0;
    const message = errorCount
      ? `${successCount} romaneio(s) processados e ${errorCount} com erro.`
      : `${successCount} romaneio(s) atualizados pelo webhook.`;
    statusIds.forEach((id) => setElementStatus(id, message, errorCount ? "error" : "success"));
    return response;
  } catch (error) {
    statusIds.forEach((id) => setElementStatus(id, error.message, "error"));
    throw error;
  }
}

function payloadFromForm(form) {
  const formData = new FormData(form);
  const payload = {};
  for (const [key, value] of formData.entries()) {
    const text = String(value).trim();
    if (!text) {
      continue;
    }
    if (form.elements.namedItem(key)?.type === "number") {
      payload[key] = Number(text);
      continue;
    }
    if (form.elements.namedItem(key)?.type === "datetime-local") {
      payload[key] = buildAppIsoFromLocalText(text);
      continue;
    }
    payload[key] = text;
  }
  return payload;
}

function buildProgrammingSuggestion(item, action, context = {}) {
  const baseTime = context.baseTime || new Date().toISOString();
  const plannedStart = context.planned_start_at || baseTime;
  return {
    sku: item.sku || "",
    produto: item.produto || "",
    action,
    product_type: item.product_type || item.tipo || (action === "produzir" ? "intermediario" : "acabado"),
    planned_start_at: plannedStart,
    available_at: context.available_at || addHoursToIso(plannedStart, action === "produzir" ? 8 : 4),
    quantity_planned: Math.max(
      Number(item.quantity_planned) || 0,
      Number(item.net_required) || 0,
      Number(item.quantidade_pendente) || 0,
      Number(item.quantidade) || 0,
    ),
    assembly_line_code: context.assembly_line_code || "",
    workstation_code: context.workstation_code || "",
    romaneio_reference: context.romaneio_reference || item.romaneio || "",
    notes: context.notes || item.notes || item.criterio_previsao || "",
  };
}

function prefillProgrammingForm(payload, options = {}) {
  const form = document.getElementById("programming-form");
  if (!form) {
    return;
  }

  const suggestion = buildProgrammingSuggestion(payload, payload.action || "montar", options);
  [
    "sku",
    "produto",
    "action",
    "product_type",
    "quantity_planned",
    "assembly_line_code",
    "workstation_code",
    "romaneio_reference",
    "notes",
  ].forEach((fieldName) => {
    const field = form.elements.namedItem(fieldName);
    if (field) {
      field.value = suggestion[fieldName] ?? "";
    }
  });

  const plannedField = form.elements.namedItem("planned_start_at");
  if (plannedField) {
    plannedField.value = toDatetimeLocalValue(suggestion.planned_start_at);
  }

  const availableField = form.elements.namedItem("available_at");
  if (availableField) {
    availableField.value = toDatetimeLocalValue(suggestion.available_at);
  }

  setElementStatus("programming-status", "Programação pré-preenchida a partir da fila operacional.", "success");
  renderProgrammingRecommendation({ ...payload, ...suggestion });

  if (options.switchTab !== false) {
    window.location.hash = "#programacao";
    switchTab("#programacao");
  }
}

function buildApontamentoQueue() {
  const queue = (state.datasets.programming || [])
    .filter((item) => ["montar", "produzir"].includes(String(item.action || "").toLowerCase()))
    .sort((left, right) => new Date(left.planned_start_at || 0) - new Date(right.planned_start_at || 0))
    .map((item, index) => ({
      queue_key: item.schedule_key || `${item.sku}-${item.planned_start_at || index}`,
      sku: item.sku,
      produto: item.produto,
      action: item.action,
      product_type: item.product_type,
      quantity_planned: Number(item.quantity_planned || 0),
      planned_start_at: item.planned_start_at,
      available_at: item.available_at,
      op_code: item.romaneio_reference || item.schedule_key || `OP-${item.sku}`,
      machine_hint: item.workstation_code || item.assembly_line_code || getSuggestedProgrammingContext(item, item.action, item.action === "produzir" ? getProductionModuleKeyForItem(item) : "montagem").assembly_line_code || "Máquina 1",
      notes: item.notes || "",
      status: item.planning_status || "programado",
    }));

  if (queue.length) {
    return queue;
  }

  return [
    ...(state.datasets.assembly || []).slice(0, 4).map((item, index) => ({
      queue_key: `assembly-${item.sku}-${index}`,
      sku: item.sku,
      produto: item.produto,
      action: "montar",
      product_type: item.product_type || "acabado",
      quantity_planned: Number(item.net_required || 0),
      planned_start_at: new Date().toISOString(),
      available_at: addHoursToIso(new Date().toISOString(), 4),
      op_code: `OP-${item.sku}`,
      machine_hint: `Esteira ${index + 1}`,
      notes: "Sugestão automática da fila de montagem.",
      status: "sugerido",
    })),
    ...(state.datasets.production || []).slice(0, 4).map((item, index) => ({
      queue_key: `production-${item.sku}-${index}`,
      sku: item.sku,
      produto: item.produto,
      action: "produzir",
      product_type: item.product_type || "intermediario",
      quantity_planned: Number(item.net_required || 0),
      planned_start_at: new Date().toISOString(),
      available_at: addHoursToIso(new Date().toISOString(), 8),
      op_code: `OP-${item.sku}`,
      machine_hint: getSuggestedProgrammingContext(item, "produzir", "producao").assembly_line_code || `Injetora ${index + 1}`,
      notes: "Sugestão automática da fila de injetoras.",
      status: "sugerido",
    })),
  ];
}

function buildApontamentoMachines() {
  return apontamentoMachines.map((machine) => {
    const code = machineCodeFromLabel(machine.maquina);
    const logs = state.apontamentoLogs.filter((entry) => entry.machine_code === code);
    const totalPieces = sumBy(logs, (entry) => entry.pieces || 0);
    const totalScrap = sumBy(logs, (entry) => entry.scrap || 0);
    const latest = logs[0] || null;

    let status = machine.status;
    let tone = machine.tone;
    if (latest) {
      if (latest.event_type === "parada") {
        status = "Parada";
        tone = "warning";
      } else if (latest.event_type === "finalizar") {
        status = "Finalizada";
        tone = "info";
      } else {
        status = "Produzindo";
        tone = "ok";
      }
    }

    return {
      ...machine,
      machineCode: code,
      pecasRestantes: Math.max((Number(machine.pecasRestantes) || 0) - totalPieces, 0),
      produzidoHora: latest ? Number(latest.pieces || 0) : machine.produzidoHora,
      somaTurno: (Number(machine.somaTurno) || 0) + totalPieces,
      totalScrap,
      status,
      tone,
      latest,
    };
  });
}

function buildApontamentoTableRows() {
  const logRows = state.apontamentoLogs.map((entry) => ({
    faixa: entry.time_range || formatDateTimeWithFallback(entry.created_at, "Agora"),
    maquina: entry.machine_code,
    pecas: Number(entry.pieces) || 0,
    refugos: Number(entry.scrap) || 0,
    paradaInicio: entry.stop_start || "-",
    paradaFim: entry.stop_end || "-",
    motivo: entry.reason || `${entry.event_type} por ${entry.operator}`,
    created_at: entry.created_at,
  }));

  return [...logRows, ...apontamentoRows].slice(0, 18);
}

function prefillApontamentoForm(payload) {
  const form = document.getElementById("apontamento-form");
  if (!form) {
    return;
  }

  if (payload.maquina && form.elements.namedItem("maquina")) {
    form.elements.namedItem("maquina").value = payload.maquina;
  }
  if (payload.event_type && form.elements.namedItem("event_type")) {
    form.elements.namedItem("event_type").value = payload.event_type;
  }
  if (payload.op_code && form.elements.namedItem("op_code")) {
    form.elements.namedItem("op_code").value = payload.op_code;
  }
  if (payload.reason && form.elements.namedItem("reason")) {
    form.elements.namedItem("reason").value = payload.reason;
  }
  if (payload.maquina) {
    state.apontamentoSelecionado = payload.maquina;
  }
  if (payload.screen) {
    state.apontamentoScreen = payload.screen;
  }
  renderApontamento();
  setElementStatus("apontamento-status", "Painel de apontamento pré-preenchido para a máquina selecionada.", "success");
}

function apontaScreenFromEvent(eventType) {
  const normalized = String(eventType || "").toLowerCase();
  if (normalized === "parada") {
    return "paradas";
  }
  if (normalized === "finalizar" || normalized === "apontar") {
    return "historico";
  }
  return "resumo";
}

let kanbanState = { products: [], romaneios: [] };

function kanbanStatusPriority(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "sem_previsao") return 0;
  if (normalized === "heuristica") return 1;
  if (normalized === "programado") return 2;
  if (normalized === "estoque") return 3;
  return 4;
}

function buildKanbanModel(data) {
  const products = Array.isArray(data.products) ? data.products : [];
  const searchQuery = getGlobalSearchQuery();
  const romaneios = (Array.isArray(data.romaneios) ? data.romaneios : []).filter((romaneio) => {
    if (state.kanbanStatusFilter !== "todos" && String(romaneio.previsao_saida_status || "") !== state.kanbanStatusFilter) {
      return false;
    }

    return matchesSearch(
      [
        romaneio.romaneio,
        romaneio.empresa,
        romaneio.criterio_previsao,
        romaneio.previsao_saida_status,
        ...(Array.isArray(romaneio.items)
          ? romaneio.items.flatMap((item) => [item.sku, item.produto, item.modo_atendimento, item.impacto])
          : []),
      ],
      searchQuery,
    );
  });
  const runningStock = {};
  products.forEach((product) => {
    runningStock[product.sku] = Number(product.estoque_atual) || 0;
  });

  const grouped = new Map();
  romaneios.forEach((romaneio) => {
    const key = romaneio.previsao_saida_at ? String(romaneio.previsao_saida_at).split("T")[0] : "__sem_previsao__";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(romaneio);
  });

  const keys = Array.from(grouped.keys()).sort((left, right) => {
    if (left === "__sem_previsao__") return 1;
    if (right === "__sem_previsao__") return -1;
    return left.localeCompare(right);
  });

  const summary = {
    count: romaneios.length,
    units: 0,
    withoutForecast: 0,
    riskCards: 0,
    deficitUnits: 0,
    nextDate: null,
  };

  const columns = keys.map((key) => {
    const descriptor = describeTimelineBucket(key);
    const columnItems = grouped
      .get(key)
      .slice()
      .sort((left, right) => {
        const priorityDelta = kanbanStatusPriority(left.previsao_saida_status) - kanbanStatusPriority(right.previsao_saida_status);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return (Number(right.quantidade_total) || 0) - (Number(left.quantidade_total) || 0);
      });

    const cards = columnItems.map((romaneio) => {
      const items = Array.isArray(romaneio.items) ? romaneio.items : [];
      let deficit = 0;
      let riskItems = 0;
      const previewItems = [];

      items.forEach((item) => {
        const sku = item.sku || "N/D";
        const qty = Number(item.quantidade) || 0;
        const currentStock = Number(runningStock[sku]) || 0;
        const uncovered = Math.max(qty - Math.max(currentStock, 0), 0);
        const endStock = currentStock - qty;
        runningStock[sku] = endStock;
        if (uncovered > 0) {
          deficit += uncovered;
          riskItems += 1;
        }
        if (previewItems.length < 5) {
          previewItems.push({
            sku,
            produto: item.produto || item.descricao || sku,
            quantity: qty,
            endStock,
          });
        }
      });

      const quantityTotal = Number(romaneio.quantidade_total) || sumBy(items, (item) => item.quantidade);
      const coveragePct = quantityTotal > 0 ? clamp(Math.round(((quantityTotal - deficit) / quantityTotal) * 100), 0, 100) : 100;
      const tone = deficit > 0 ? "high" : statusClass(romaneio.previsao_saida_status);
      const statusTone = deficit > 0 ? "warning" : statusClass(romaneio.previsao_saida_status);

      summary.units += quantityTotal;
      summary.deficitUnits += deficit;
      if (!romaneio.previsao_saida_at) {
        summary.withoutForecast += 1;
      }
      if (deficit > 0) {
        summary.riskCards += 1;
      }
      if (romaneio.previsao_saida_at && (!summary.nextDate || romaneio.previsao_saida_at < summary.nextDate)) {
        summary.nextDate = romaneio.previsao_saida_at;
      }

      return {
        romaneio: romaneio.romaneio,
        empresa: romaneio.empresa || "N/D",
        valueTotal: Number(romaneio.valor_total) || 0,
        statusLabel: formatStatusLabel(romaneio.previsao_saida_status),
        statusTone,
        quantityTotal,
        itemCount: items.length,
        deficit,
        coveragePct,
        tone,
        riskItems,
        criteria: romaneio.criterio_previsao || "Sem critério informado",
        previsao_saida_at: romaneio.previsao_saida_at,
        data_evento: romaneio.data_evento,
        itemsPreview: previewItems,
        hiddenItems: Math.max(items.length - previewItems.length, 0),
        items,
        raw: romaneio,
      };
    });

    return {
      key,
      ...descriptor,
      count: cards.length,
      totalUnits: sumBy(cards, (card) => card.quantityTotal),
      riskCards: cards.filter((card) => card.deficit > 0).length,
      cards,
    };
  });

  return { columns, summary };
}

function flattenKanbanCards(model) {
  return model.columns.flatMap((column) =>
    column.cards.map((card) => ({
      ...card,
      columnKey: column.key,
      columnLabel: column.label,
    })),
  );
}

function renderKanbanSummary(model) {
  const wrapper = document.getElementById("kanban-summary");
  if (!wrapper) {
    return;
  }
  wrapper.innerHTML = "";

  const highlights = [
    ["Carteira ativa", `${model.summary.count} romaneio(s)`, `${number.format(model.summary.units)} unidades em trânsito`],
    ["Sem previsão", number.format(model.summary.withoutForecast), "Cargas que ainda precisam de data final"],
    ["Em risco de saldo", number.format(model.summary.riskCards), `${number.format(model.summary.deficitUnits)} unidades sem cobertura imediata`],
    [
      "Próxima saída",
      model.summary.nextDate ? formatDateWithFallback(model.summary.nextDate, "Sem previsão") : "Sem data",
      model.summary.nextDate ? formatDateTimeWithFallback(model.summary.nextDate, "Sem data") : "Nenhum compromisso confirmado",
    ],
  ];

  const grid = el(`<div class="kanban-summary-grid"></div>`);
  highlights.forEach(([label, value, hint]) => {
    grid.appendChild(
      el(`
        <div class="kanban-summary-card">
          <small>${label}</small>
          <strong>${value}</strong>
          <span>${hint}</span>
        </div>
      `),
    );
  });

  const priority = model.columns
    .flatMap((column) => column.cards)
    .filter((card) => card.deficit > 0)
    .sort((left, right) => right.deficit - left.deficit)
    .slice(0, 3);

  const priorityBox = el(`<div class="kanban-priority-box"></div>`);
  if (!priority.length) {
    priorityBox.appendChild(
      el(`
        <div class="kanban-priority-empty">
          Nenhum romaneio ficou em risco imediato de saldo na simulação atual.
        </div>
      `),
    );
  } else {
    priority.forEach((card) => {
      priorityBox.appendChild(
        el(`
          <div class="kanban-priority-card">
            <small>Prioridade logística</small>
            <strong>${formatRomaneioCode(card.romaneio)}</strong>
            <span>${number.format(card.deficit)} un sem cobertura imediata | ${card.riskItems} SKU(s) pressionando o saldo</span>
          </div>
        `),
      );
    });
  }

  wrapper.appendChild(grid);
  wrapper.appendChild(priorityBox);
}

function resolveSelectedKanbanCard(model) {
  const cards = flattenKanbanCards(model);
  if (!cards.length) {
    return { cards: [], selectedCard: null };
  }

  const selectedCard =
    cards.find((card) => String(card.romaneio) === String(state.kanbanSelecionado)) ||
    cards[0];
  state.kanbanSelecionado = selectedCard.romaneio;
  return { cards, selectedCard };
}

function renderKanbanQuickbar(model) {
  const wrapper = document.getElementById("kanban-quickbar");
  const button = document.getElementById("kanban-sem-previsao-shortcut");
  const copy = document.getElementById("kanban-shortcut-copy");
  if (!wrapper || !button || !copy) {
    return;
  }

  const semPrevisaoColumn = model.columns.find((column) => column.key === "__sem_previsao__");
  const count = Number(semPrevisaoColumn?.count || 0);
  button.disabled = count <= 0;
  button.textContent = count > 0 ? `Ir para Sem previsão (${count})` : "Sem previsão em dia";
  copy.textContent =
    count > 0
      ? `${count} romaneio(s) aguardam data final e ficam destacados em vermelho no board.`
      : "Nenhum romaneio está sem previsão no momento.";
  wrapper.classList.toggle("is-empty", count <= 0);
}

function focusKanbanColumn(columnKey) {
  const board = document.getElementById("kanban-board");
  const lane = board?.querySelector(`[data-column-key="${columnKey}"]`);
  if (!board || !lane) {
    return;
  }

  const viewport = board.parentElement?.classList.contains("x-scroll-viewport") ? board.parentElement : board;
  const targetLeft = Math.max(lane.offsetLeft - Math.max((viewport.clientWidth - lane.offsetWidth) / 2, 24), 0);
  viewport.scrollTo({ left: targetLeft, behavior: "smooth" });
  lane.classList.add("kanban-lane--focus");
  window.setTimeout(() => lane.classList.remove("kanban-lane--focus"), 1500);
}

function resolveKanbanInspectorContext(model, data) {
  const { cards, selectedCard } = resolveSelectedKanbanCard(model);
  if (!cards.length || !selectedCard) {
    return null;
  }

  const productMap = Object.fromEntries((Array.isArray(data.products) ? data.products : []).map((item) => [item.sku, item]));
  const selectedIndex = cards.findIndex((card) => String(card.romaneio) === String(selectedCard.romaneio));
  const cumulativeDemand = {};
  cards.slice(0, selectedIndex + 1).forEach((card) => {
    (card.items || []).forEach((item) => {
      cumulativeDemand[item.sku] = (cumulativeDemand[item.sku] || 0) + (Number(item.quantidade) || 0);
    });
  });

  const selectedItems = (selectedCard.items || [])
    .map((item) => {
      const product = productMap[item.sku] || {};
      const estoqueAtual = Number(product.estoque_atual ?? item.quantidade_atendida_estoque ?? 0) || 0;
      const demanda = Number(item.quantidade) || 0;
      const pendente = Number(item.quantidade_pendente ?? Math.max(demanda - estoqueAtual, 0)) || 0;
      return {
        sku: item.sku || "-",
        produto: item.produto || item.descricao || item.sku || "-",
        estoqueAtual,
        demanda,
        pendente,
        saldoApos: estoqueAtual - demanda,
        atendimento: product.acao || item.modo_atendimento || item.impacto || "Analisar",
        disponibilidade: item.previsao_disponibilidade_at,
        tipo: product.tipo || item.tipo_produto || "",
      };
    })
    .sort((left, right) => right.pendente - left.pendente);

  const untilRows = selectedItems
    .map((item) => ({
      ...item,
      demandaAteRomaneio: cumulativeDemand[item.sku] || item.demanda,
      saldoAteRomaneio: item.estoqueAtual - (cumulativeDemand[item.sku] || item.demanda),
    }))
    .sort((left, right) => left.saldoAteRomaneio - right.saldoAteRomaneio);

  const generalRows = (Array.isArray(data.products) ? data.products : [])
    .filter((item) => {
      if ((Number(item.saldo) || 0) < 0) return true;
      return (Number(item.necessidade_romaneios) || 0) > (Number(item.estoque_atual) || 0);
    })
    .filter((item) => matchesSearch([item.sku, item.produto, item.acao, item.tipo], getGlobalSearchQuery()))
    .sort((left, right) => (Number(left.saldo) || 0) - (Number(right.saldo) || 0))
    .slice(0, 8);

  const primaryDemand = selectedItems.find((item) => item.pendente > 0) || selectedItems[0] || null;
  const manualDateValue = selectedCard.previsao_saida_at ? toDatetimeLocalValue(selectedCard.previsao_saida_at) : "";
  const romaneioOptions = cards
    .map(
      (card) => `
        <option value="${card.romaneio}" ${String(card.romaneio) === String(selectedCard.romaneio) ? "selected" : ""}>
          ${formatRomaneioCode(card.romaneio)} · ${card.empresa} · ${number.format(card.quantityTotal)} un
        </option>
      `,
    )
    .join("");

  return {
    cards,
    selectedCard,
    selectedItems,
    untilRows,
    generalRows,
    primaryDemand,
    manualDateValue,
    romaneioOptions,
    productMap,
  };
}

function syncKanbanInspectorHeader(viewMode, selectedCard) {
  const title = document.getElementById("kanban-inspector-title");
  const copy = document.getElementById("kanban-inspector-copy");
  const label = document.getElementById("kanban-selected-label");
  const toggles = Array.from(document.querySelectorAll("[data-kanban-inspector-toggle]"));

  if (!title || !copy || !label || !toggles.length) {
    return;
  }

  const isBoardMode = viewMode === "board";
  const isCollapsed = isBoardMode && state.kanbanInspectorCollapsed;
  toggles.forEach((toggle) => {
    toggle.hidden = !isBoardMode;
    toggle.textContent = isCollapsed ? "Estender detalhes" : "Recolher detalhes";
    toggle.className = `btn ${isCollapsed ? "btn-primary" : "btn-secondary"} ${toggle.classList.contains("btn-xs") ? "btn-xs" : ""}`.trim();
    toggle.setAttribute("aria-label", isCollapsed ? "Estender detalhes do romaneio" : "Recolher detalhes do romaneio");
  });

  if (!selectedCard) {
    title.textContent = viewMode === "workbench" ? "Workbench Logístico" : "Detalhes do Romaneio";
    copy.textContent =
      viewMode === "workbench"
        ? "Selecione um romaneio de referência para consultar cobertura, saldo até o romaneio e necessidade geral."
        : "Selecione um romaneio no Kanban para visualizar carteira, produtos e programação.";
    label.textContent = "Sem romaneio selecionado";
    label.className = "status-badge info";
    return;
  }

  if (viewMode === "workbench") {
    title.textContent = "Workbench Logístico";
    copy.textContent = "Espelha as visões da planilha: consulta por romaneio, até o romaneio e necessidade geral.";
  } else {
    title.textContent = "Detalhes do Romaneio";
    copy.textContent = "Leitura operacional do romaneio selecionado, com produtos, cobertura, pendências e ações rápidas.";
  }

  label.textContent = formatRomaneioCode(selectedCard.romaneio);
  label.className = `status-badge ${selectedCard.statusTone}`;
}

function bindKanbanInspectorActions(inspector, context) {
  const { selectedCard, primaryDemand, productMap } = context;

  inspector.querySelector("[data-kanban-detail-toggle]")?.addEventListener("click", () => {
    state.kanbanDetailsExpanded = !state.kanbanDetailsExpanded;
    renderKanban(kanbanState);
  });

  inspector.querySelector("#kanban-workbench-select")?.addEventListener("change", (event) => {
    state.kanbanSelecionado = event.target.value || selectedCard.romaneio;
    renderKanban(kanbanState);
  });

  inspector.querySelector("#kanban-open-detail")?.addEventListener("click", async () => {
    window.location.hash = "#romaneios";
    await carregarRomaneio(selectedCard.romaneio);
  });

  inspector.querySelector("#kanban-program-item")?.addEventListener("click", () => {
    if (!primaryDemand) {
      setElementStatus("kanban-inspector-status", "Esse romaneio ainda não tem item pendente para programar.", "error");
      return;
    }
    const baseAction = /produzir/i.test(primaryDemand.atendimento) ? "produzir" : "montar";
    prefillProgrammingForm(
      {
        sku: primaryDemand.sku,
        produto: primaryDemand.produto,
        action: baseAction,
        product_type: (productMap[primaryDemand.sku] || {}).tipo || (baseAction === "produzir" ? "intermediario" : "acabado"),
        quantity_planned: primaryDemand.pendente || primaryDemand.demanda,
        romaneio: selectedCard.romaneio,
        notes: `Atendimento puxado do kanban logístico para ${formatRomaneioCode(selectedCard.romaneio)}.`,
      },
      {
        assembly_line_code: baseAction === "montar" ? "LINHA-01" : "EXTR-01",
        workstation_code: baseAction === "montar" ? "POSTO-A" : "MAQ-01",
        switchTab: true,
      },
    );
  });

  inspector.querySelector("#kanban-save-date")?.addEventListener("click", async () => {
    const field = inspector.querySelector("#kanban-manual-date");
    const value = field?.value ? buildAppIsoFromLocalText(field.value) : null;
    try {
      await postJson("/api/pcp/romaneios-kanban/update-date", {
        romaneio: selectedCard.romaneio,
        empresa: selectedCard.raw.empresa || "",
        previsao_saida_at: value,
        reason: "pcp_manual",
      });
      setElementStatus("kanban-inspector-status", "Previsão manual salva no romaneio.", "success");
      await carregarTudo();
    } catch (error) {
      setElementStatus("kanban-inspector-status", error.message, "error");
    }
  });

  inspector.querySelector("#kanban-clear-date")?.addEventListener("click", async () => {
    try {
      await postJson("/api/pcp/romaneios-kanban/update-date", {
        romaneio: selectedCard.romaneio,
        empresa: selectedCard.raw.empresa || "",
        previsao_saida_at: null,
        reason: "sem_previsao",
      });
      setElementStatus("kanban-inspector-status", "Romaneio voltou para a coluna sem previsão.", "success");
      await carregarTudo();
    } catch (error) {
      setElementStatus("kanban-inspector-status", error.message, "error");
    }
  });
}

function buildKanbanBoardInspector(context) {
  const { selectedCard, selectedItems, manualDateValue } = context;
  const raw = selectedCard.raw || {};
  const pendingTotal = sumBy(selectedItems, (item) => item.pendente);
  const pedidos = raw.pedido || raw.pedidos || "Sem pedido consolidado";
  const fileLabel = Array.isArray(raw.file_names) && raw.file_names.length ? raw.file_names.join(", ") : "Sem arquivo associado";
  const detailToggleLabel = state.kanbanDetailsExpanded ? "Ocultar detalhes" : "Mostrar detalhes";

  return el(`
    <div class="kanban-detail-stack">
      <section class="kanban-detail-hero">
        <div class="kanban-detail-hero-head">
          <div>
            <small>Romaneio selecionado</small>
            <strong>${formatRomaneioCode(selectedCard.romaneio)}</strong>
            <span>${selectedCard.empresa} · ${selectedCard.columnLabel}</span>
          </div>
          <span class="tag ${selectedCard.statusTone}">${selectedCard.statusLabel}</span>
        </div>
      </section>

      <section class="kanban-detail-section">
        <div class="kanban-detail-actions">
          <label class="input-group">
            <span>Data manual de saída</span>
            <input id="kanban-manual-date" type="datetime-local" class="modern-input" value="${manualDateValue}" />
          </label>
          <div class="kanban-detail-actions-row">
            <button type="button" id="kanban-save-date" class="btn btn-primary">Salvar data</button>
            <button type="button" id="kanban-clear-date" class="btn btn-secondary">Sem previsão</button>
            <button type="button" id="kanban-open-detail" class="btn btn-secondary">Abrir romaneio</button>
            <button type="button" id="kanban-program-item" class="btn btn-secondary">Programar item crítico</button>
          </div>
          <span id="kanban-inspector-status" class="status-msg"></span>
        </div>
      </section>

      <section class="kanban-detail-section kanban-detail-table">
        <div class="kanban-product-summary">
          <div>
            <small>Produtos do romaneio</small>
            <strong>${selectedItems.length} SKU(s) listados</strong>
          </div>
          <span>${number.format(pendingTotal)} un pendentes de cobertura imediata</span>
        </div>
        ${
          selectedItems.length
            ? `
              <table class="modern-table dense-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Produto</th>
                    <th>RM</th>
                    <th>Estoque</th>
                    <th>Pendente</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedItems
                    .map(
                      (item) => `
                        <tr>
                          <td><b>${item.sku}</b><br /><span class="muted">${formatProductType(item.tipo)}</span></td>
                          <td>${item.produto}</td>
                          <td>${number.format(item.demanda)}</td>
                          <td>${number.format(item.estoqueAtual)}</td>
                          <td><span class="tag ${item.pendente > 0 ? "high" : "ok"}">${number.format(item.pendente)}</span></td>
                          <td>${item.atendimento}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
            : `<div class="kanban-detail-empty">Esse romaneio ainda não tem itens detalhados consolidados.</div>`
        }
      </section>

      <section class="kanban-detail-section kanban-detail-collapsible ${state.kanbanDetailsExpanded ? "expanded" : ""}">
        <button type="button" class="kanban-collapse-toggle" data-kanban-detail-toggle>
          <div>
            <small>Detalhes operacionais</small>
            <strong>Pedidos, cobertura, origem e valor</strong>
          </div>
          <span>${detailToggleLabel}</span>
        </button>
        <div class="kanban-collapse-body" ${state.kanbanDetailsExpanded ? "" : "hidden"}>
          <div class="kanban-detail-metrics">
            <div>
              <small>Quantidade</small>
              <strong>${number.format(selectedCard.quantityTotal)} un</strong>
            </div>
            <div>
              <small>SKU(s)</small>
              <strong>${number.format(selectedCard.itemCount)}</strong>
            </div>
            <div>
              <small>Cobertura</small>
              <strong>${selectedCard.coveragePct}%</strong>
            </div>
            <div>
              <small>Déficit</small>
              <strong>${number.format(selectedCard.deficit)}</strong>
            </div>
          </div>
          <div class="kanban-detail-meta">
            <div>
              <small>Pedidos vinculados</small>
              <strong>${pedidos}</strong>
            </div>
            <div>
              <small>Previsão atual</small>
              <strong>${formatDateTimeWithFallback(selectedCard.previsao_saida_at || selectedCard.data_evento, "Sem previsão")}</strong>
            </div>
            <div>
              <small>Critério / Origem</small>
              <strong>${selectedCard.criteria}</strong>
              <small>${raw.document_kind === "romaneio_nota" ? "Complemento via romaneio nota" : fileLabel}</small>
            </div>
            <div>
              <small>Valor estimado</small>
              <strong>${money.format(selectedCard.valueTotal || 0)}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  `);
}

function buildKanbanWorkbenchInspector(context) {
  const { selectedCard, selectedItems, untilRows, generalRows, manualDateValue, romaneioOptions } = context;

  return el(`
    <div class="kanban-inspector-stack">
      <section class="kanban-workbench-card">
        <div class="kanban-workbench-head">
          <div>
            <small>Workbench logístico</small>
            <strong>${formatRomaneioCode(selectedCard.romaneio)}</strong>
            <span>Leitura operacional no formato da planilha: consulta por romaneio, saldo até o romaneio e necessidade geral.</span>
          </div>
          <span class="tag ${selectedCard.statusTone}">${selectedCard.statusLabel}</span>
        </div>
        <div class="kanban-workbench-toolbar">
          <label class="input-group">
            <span>Romaneio de referência</span>
            <select id="kanban-workbench-select" class="modern-input">
              ${romaneioOptions}
            </select>
          </label>
          <div class="kanban-workbench-reference">
            <small>Carteira selecionada</small>
            <strong>${selectedCard.empresa}</strong>
            <span>${number.format(selectedCard.quantityTotal)} unidades · ${selectedCard.itemCount} SKU(s)</span>
          </div>
        </div>
        <div class="kanban-workbench-metrics">
          <div>
            <small>Cobertura simulada</small>
            <strong>${selectedCard.coveragePct}%</strong>
          </div>
          <div>
            <small>Déficit imediato</small>
            <strong>${number.format(selectedCard.deficit)}</strong>
          </div>
          <div>
            <small>Critério</small>
            <strong>${selectedCard.criteria}</strong>
          </div>
        </div>
        <div class="kanban-workbench-actions">
          <label class="input-group">
            <span>Data manual de saída</span>
            <input id="kanban-manual-date" type="datetime-local" class="modern-input" value="${manualDateValue}" />
          </label>
          <div class="kanban-inline-actions">
            <button type="button" id="kanban-save-date" class="btn btn-primary">Salvar data</button>
            <button type="button" id="kanban-clear-date" class="btn btn-secondary">Sem previsão</button>
            <button type="button" id="kanban-open-detail" class="btn btn-secondary">Abrir romaneio</button>
            <button type="button" id="kanban-program-item" class="btn btn-secondary">Planejar atendimento</button>
          </div>
          <span id="kanban-inspector-status" class="status-msg"></span>
        </div>
      </section>

      <section class="kanban-table-card">
        <div class="panel-header compact">
          <h3>Consulta por Romaneio</h3>
          <span class="section-copy">Mesma visão da planilha: estoque, demanda e pendência do romaneio selecionado.</span>
        </div>
        <table class="modern-table dense-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Estoque</th>
              <th>RM</th>
              <th>Pendente</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${
              selectedItems.length
                ? selectedItems
                    .slice(0, 10)
                    .map(
                      (item) => `
                        <tr>
                          <td><b>${item.sku}</b><br /><span class="muted">${item.produto}</span></td>
                          <td>${number.format(item.estoqueAtual)}</td>
                          <td>${number.format(item.demanda)}</td>
                          <td><span class="tag ${item.pendente > 0 ? "high" : "ok"}">${number.format(item.pendente)}</span></td>
                          <td>${item.atendimento}</td>
                        </tr>
                      `,
                    )
                    .join("")
                : `<tr><td colspan="5" class="muted">Sem itens detalhados para este romaneio.</td></tr>`
            }
          </tbody>
        </table>
      </section>

      <section class="kanban-table-card">
        <div class="panel-header compact">
          <h3>Até o Romaneio</h3>
          <span class="section-copy">Saldo projetado acumulando toda a carteira até ${formatRomaneioCode(selectedCard.romaneio)}.</span>
        </div>
        <table class="modern-table dense-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Estoque</th>
              <th>Até RM</th>
              <th>Saldo</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${
              untilRows.length
                ? untilRows
                    .slice(0, 10)
                    .map(
                      (item) => `
                        <tr>
                          <td><b>${item.sku}</b><br /><span class="muted">${item.produto}</span></td>
                          <td>${number.format(item.estoqueAtual)}</td>
                          <td>${number.format(item.demandaAteRomaneio)}</td>
                          <td><span class="tag ${item.saldoAteRomaneio < 0 ? "high" : "ok"}">${number.format(item.saldoAteRomaneio)}</span></td>
                          <td>${item.atendimento}</td>
                        </tr>
                      `,
                    )
                    .join("")
                : `<tr><td colspan="5" class="muted">Sem cálculo acumulado para este romaneio.</td></tr>`
            }
          </tbody>
        </table>
      </section>

      <section class="kanban-table-card">
        <div class="panel-header compact">
          <h3>Necessidade Geral</h3>
          <span class="section-copy">Itens com saldo negativo na carteira ativa, priorizados para MRP e programação.</span>
        </div>
        <table class="modern-table dense-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Saldo</th>
              <th>Necessidade</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${
              generalRows.length
                ? generalRows
                    .map(
                      (item) => `
                        <tr>
                          <td><b>${item.sku}</b><br /><span class="muted">${item.produto}</span></td>
                          <td><span class="tag ${(Number(item.saldo) || 0) < 0 ? "high" : "ok"}">${number.format(item.saldo)}</span></td>
                          <td>${number.format(item.necessidade_romaneios || 0)}</td>
                          <td>${item.acao || "Analisar"}</td>
                        </tr>
                      `,
                    )
                    .join("")
                : `<tr><td colspan="4" class="muted">Nenhum SKU crítico com os filtros atuais.</td></tr>`
            }
          </tbody>
        </table>
      </section>
    </div>
  `);
}

function renderKanbanInspector(model, data, viewMode) {
  const wrapper = document.getElementById("kanban-inspector");
  if (!wrapper) {
    return;
  }

  wrapper.innerHTML = "";
  const context = resolveKanbanInspectorContext(model, data);
  if (!context) {
    syncKanbanInspectorHeader(viewMode, null);
    wrapper.appendChild(emptyState("Nenhum romaneio atende aos filtros atuais da carteira logística."));
    return;
  }

  syncKanbanInspectorHeader(viewMode, context.selectedCard);
  const inspector = viewMode === "workbench" ? buildKanbanWorkbenchInspector(context) : buildKanbanBoardInspector(context);
  bindKanbanInspectorActions(inspector, context);
  wrapper.appendChild(inspector);
}

function renderKanban(data) {
  kanbanState = data;
  const model = buildKanbanModel(data);
  const layout = document.getElementById("kanban-layout");
  const viewMode = ["board", "workbench"].includes(state.kanbanViewMode) ? state.kanbanViewMode : "board";
  const viewField = document.getElementById("kanban-view-mode");
  if (viewField && viewField.value !== viewMode) {
    viewField.value = viewMode;
  }
  if (layout) {
    layout.classList.remove("mode-board", "mode-workbench");
    layout.classList.add(`mode-${viewMode}`);
    layout.classList.toggle("inspector-collapsed", viewMode === "board" && state.kanbanInspectorCollapsed);
  }
  renderKanbanSummary(model);
  renderKanbanQuickbar(model);
  renderKanbanInspector(model, data, viewMode);

  const wrapper = document.getElementById("kanban-board"); // Updated ID
  if (!wrapper) return;
  wrapper.innerHTML = "";

  if (!model.columns.length) {
    wrapper.appendChild(emptyState("Nenhum romaneio ativo para a matriz logística."));
    applyHorizontalScrollEnhancements();
    return;
  }

  model.columns.forEach((column) => {
    const laneClassName = `kanban-lane${column.key === "__sem_previsao__" ? " kanban-lane--sem-previsao" : ""}`;
    const col = el(`
      <div class="${laneClassName}" data-column-key="${column.key}">
        <div class="kanban-lane-header">
           <div style="display: flex; flex-direction: column;">
             <h3>${column.label}</h3>
             <span style="font-size: 0.70rem; color: var(--text-muted);">${column.subtitle}</span>
           </div>
           <span class="kanban-lane-count">${column.count}</span>
        </div>
        <div class="kanban-lane-body" data-date="${column.key}"></div>
      </div>
    `);

    const colBody = col.querySelector('.kanban-lane-body');

    column.cards.forEach((cardData) => {
      const card = el(`
        <div class="kanban-card" data-romaneio="${cardData.romaneio}" title="Arraste para mudar a data">
          <div class="k-card-top">
            <span class="k-sku">${formatRomaneioCode(cardData.romaneio)}</span>
            <span class="k-qty">${number.format(cardData.quantityTotal)} un</span>
          </div>
          <div class="k-title">${cardData.empresa}</div>
          <div class="k-card-meta">
            <span class="tag ${cardData.statusTone}">${cardData.statusLabel}</span>
            <span>${cardData.itemCount} SKU(s)</span>
          </div>
          <div class="k-coverage-track">
            <span class="k-coverage-fill ${cardData.deficit > 0 ? "high" : "ok"}" style="width:${cardData.coveragePct}%"></span>
          </div>
          <div class="k-coverage-copy">${cardData.coveragePct}% coberto agora · déficit ${number.format(cardData.deficit)}</div>
          <div class="k-card-bottom">
            <div class="k-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${formatDateWithFallback(cardData.previsao_saida_at || cardData.data_evento, "Sem data")}
            </div>
            <div class="k-priority ${cardData.statusTone}"></div>
          </div>
          <div class="k-card-actions">
            <button type="button" class="btn btn-secondary" data-action="inspect">Consultar</button>
            <button type="button" class="btn btn-secondary" data-action="plan">Programar</button>
          </div>
        </div>
      `);
      
      card.addEventListener("click", () => {
        state.kanbanSelecionado = cardData.romaneio;
        state.kanbanInspectorCollapsed = false;
        renderKanban(kanbanState);
      });

      card.querySelector('[data-action="inspect"]').addEventListener("click", async (event) => {
        event.stopPropagation();
        state.kanbanSelecionado = cardData.romaneio;
        state.kanbanInspectorCollapsed = false;
        renderKanban(kanbanState);
      });

      card.querySelector('[data-action="plan"]').addEventListener("click", (event) => {
        event.stopPropagation();
        const rawItem = (cardData.items || []).find((item) => Number(item.quantidade_pendente || 0) > 0) || (cardData.items || [])[0];
        if (!rawItem) {
          return;
        }
        const action = /produzir/i.test(rawItem.modo_atendimento || rawItem.impacto || "") ? "produzir" : "montar";
        prefillProgrammingForm(
          {
            sku: rawItem.sku,
            produto: rawItem.produto || rawItem.descricao,
            action,
            quantity_planned: rawItem.quantidade_pendente || rawItem.quantidade,
            romaneio: cardData.romaneio,
            notes: `Atendimento puxado do card ${formatRomaneioCode(cardData.romaneio)}.`,
          },
          {
            assembly_line_code: action === "produzir" ? "EXTR-01" : "LINHA-01",
            workstation_code: action === "produzir" ? "MAQ-01" : "POSTO-A",
            switchTab: true,
          },
        );
      });
      
      colBody.appendChild(card);
    });

    wrapper.appendChild(col);

    // Initialize drag and drop via SortableJS (imported in index.html)
    if (window.Sortable) {
       Sortable.create(colBody, {
           group: 'kanban',
           animation: 150,
           ghostClass: 'sortable-ghost',
           dragClass: 'sortable-drag',
           onEnd: function (evt) {
               const itemEl = evt.item;
               const targetCol = evt.to;
               const code = itemEl.getAttribute('data-romaneio');
               const targetDateRaw = targetCol.getAttribute('data-date');
               const targetDate = targetDateRaw === "__sem_previsao__" ? null : `${targetDateRaw}T12:00:00-03:00`;
               
               const romaneio = kanbanState.romaneios.find((item) => String(item.romaneio) === String(code));
               if (!romaneio) return;
               romaneio.previsao_saida_at = targetDate;
               state.kanbanSelecionado = code;
               
               // Render natively will drop DOM state, so don't call renderKanban(kanbanState) immediately to avoid jitter
               // Just ping the server.
               postJson("/api/pcp/romaneios-kanban/update-date", {
                 romaneio: code,
                 previsao_saida_at: targetDate,
               }).then(() => renderKanban(kanbanState))
                 .catch((error) => console.error("Falha ao sincronizar", error));
           }
       });
    }
  });

  applyHorizontalScrollEnhancements();
}

async function carregarRomaneio(code) {
  state.romaneioSelecionado = code;
  renderRomaneios();

  const localEntry = findLocalRomaneioBySelectionCode(code);
  if (localEntry) {
    renderLocalRomaneioDetail(localEntry);
    return;
  }

  try {
    const detail = await api(`/api/pcp/romaneios/${code}`);
    renderRomaneioDetail(detail);
  } catch (error) {
    const wrapper = document.getElementById("romaneio-detail");
    wrapper.innerHTML = "";
    wrapper.appendChild(emptyState(`Falha ao carregar o romaneio ${code}. ${error.message}`));
  }
}

function refreshRomaneiosWorkspace() {
  const merged = buildRomaneiosCollection();
  if (state.romaneioSelecionado && !merged.some((item) => item.selection_code === state.romaneioSelecionado)) {
    state.romaneioSelecionado = null;
  }
  syncRomaneioSelectionState();
  renderRomaneioIntakeSummary();
  renderStagedRomaneios();
  renderRomaneios();
}

function removerRomaneioLocal(localId) {
  const nextItems = state.romaneiosLocais.filter((item) => item.local_id !== localId);
  saveLocalRomaneios(nextItems);
  if (state.romaneioSelecionado === localId) {
    state.romaneioSelecionado = null;
    const detail = document.getElementById("romaneio-detail");
    detail.innerHTML = "";
    detail.appendChild(emptyState("Romaneio local removido da fila. Selecione outro romaneio para ver os detalhes."));
  }
  setElementStatus("romaneio-dropzone-status", "Romaneio local removido da fila.", "success");
  refreshRomaneiosWorkspace();
}

async function excluirRomaneio(code, options = {}) {
  const { skipConfirm = false, skipReload = false, silent = false } = options;
  const localEntry = findLocalRomaneioBySelectionCode(code);
  if (localEntry) {
    const confirmedLocal = skipConfirm || window.confirm(`Deseja remover o romaneio local ${formatRomaneioCode(localEntry.romaneio)} da fila?`);
    if (!confirmedLocal) {
      return;
    }
    removerRomaneioLocal(localEntry.local_id);
    return;
  }

  const romaneio = findApiRomaneioBySelectionCode(code);
  if (!romaneio) {
    throw new Error("Romaneio não encontrado para exclusão.");
  }

  const confirmed = skipConfirm || window.confirm(
    `Deseja excluir o romaneio ${formatRomaneioCode(romaneio.romaneio)}? A carteira e os itens desse romaneio serão substituídos pela exclusão no sistema.`,
  );
  if (!confirmed) {
    return;
  }

  if (!silent) {
    setElementStatus("romaneio-dropzone-status", `Excluindo ${formatRomaneioCode(romaneio.romaneio)}...`);
  }
  await postJson("/api/pcp/romaneios/delete", {
    romaneio: romaneio.romaneio,
    empresa: romaneio.empresa,
    deleted_by: state.currentUser?.username || "app",
    reason: "Operador confirmou exclusão do romaneio",
  });
  state.romaneioSelecionado = null;
  if (!skipReload) {
    await carregarTudo();
  }
  if (!silent) {
    setElementStatus("romaneio-dropzone-status", `Romaneio ${formatRomaneioCode(romaneio.romaneio)} excluído com sucesso.`, "success");
  }
}

async function excluirRomaneiosSelecionados() {
  const selectedItems = buildRomaneiosCollection().filter((item) => isRomaneioSelected(item.selection_code));
  if (!selectedItems.length) {
    setElementStatus("romaneio-dropzone-status", "Selecione pelo menos um romaneio para excluir.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Deseja excluir ${selectedItems.length} romaneio(s) selecionado(s)? Os romaneios locais serão removidos da fila e os romaneios do sistema serão zerados no backend.`,
  );
  if (!confirmed) {
    return;
  }

  setElementStatus("romaneio-dropzone-status", `Excluindo ${selectedItems.length} romaneio(s) selecionado(s)...`);

  const localIds = new Set(
    selectedItems
      .filter((item) => item.source_type !== "api")
      .map((item) => item.selection_code),
  );
  if (localIds.size) {
    saveLocalRomaneios(state.romaneiosLocais.filter((item) => !localIds.has(item.local_id)));
  }

  const apiItems = selectedItems.filter((item) => item.source_type === "api");
  for (const item of apiItems) {
    await excluirRomaneio(item.selection_code, { skipConfirm: true, skipReload: true, silent: true });
  }

  state.selectedRomaneios = [];
  state.romaneioSelectionMode = false;

  if (apiItems.length) {
    await carregarTudo();
  } else {
    refreshRomaneiosWorkspace();
  }

  setElementStatus("romaneio-dropzone-status", `${selectedItems.length} romaneio(s) tratado(s) com sucesso.`, "success");
}

function confirmRomaneioReplacement(entry) {
  const identity = entry.romaneio_identity || normalizeRomaneioIdentity(entry.romaneio || entry.pdf_name || "");
  if (!identity) {
    return true;
  }
  const existing = buildExistingRomaneioIdentityMap().get(identity);
  if (!existing) {
    return true;
  }
  if (isComplementaryRomaneioUpload(existing, entry) || entry.document_kind === "romaneio_nota") {
    return true;
  }
  return window.confirm(
    `Deseja substituir o romaneio ${formatRomaneioCode(identity)} pelo novo arquivo/cadastro? Isso atualizará apenas os itens desse romaneio ou romaneio nota.`,
  );
}

function appendRomaneiosLocais(entries, messageTargetId, successMessage) {
  if (!entries.length) {
    return;
  }
  replaceLocalRomaneios(entries, entries.map((entry) => entry.romaneio_identity));
  refreshRomaneiosWorkspace();
  setElementStatus(messageTargetId, successMessage, "success");
  carregarRomaneio(entries[0].local_id).catch((error) => {
    console.error("Falha ao abrir romaneio local", error);
  });
}

async function uploadRomaneioPdfFiles(fileEntries) {
  if (!fileEntries.length) {
    return;
  }

  setElementStatus("romaneio-dropzone-status", `Enviando ${fileEntries.length} PDF(s) para o sistema...`);

  try {
    const filesPayload = await Promise.all(
      fileEntries.map(async ({ file }) => ({
        name: file.name,
        content_base64: await readFileAsBase64(file),
      })),
    );

    const response = await postJson("/api/pcp/romaneios/upload", { files: filesPayload });
    const successfulFiles = new Set(
      (response.processed_files || (response.results || []).flatMap((item) => item.file_names || (item.file_name ? [item.file_name] : [])))
        .filter(Boolean),
    );
    const failedFiles = new Map((response.errors || []).map((item) => [item.file_name, item.error]));

    const nextLocalItems = state.romaneiosLocais
      .map((item) => (
        failedFiles.has(item.pdf_name)
          ? { ...item, observacao: `Falha ao importar: ${failedFiles.get(item.pdf_name)}` }
          : item
      ))
      .filter((item) => !successfulFiles.has(item.pdf_name));

    saveLocalRomaneios(nextLocalItems);

    if (successfulFiles.size) {
      const firstRomaneio = (response.results || []).find((item) => item.romaneio)?.romaneio;
      if (firstRomaneio) {
        state.romaneioSelecionado = String(firstRomaneio);
      }
      await carregarTudo();
    } else {
      refreshRomaneiosWorkspace();
    }

    const errorCount = (response.errors || []).length;
    setElementStatus(
      "romaneio-dropzone-status",
      errorCount
        ? `${successfulFiles.size} PDF(s) importados e ${errorCount} com erro.`
        : `${successfulFiles.size} PDF(s) importados para o sistema.`,
      errorCount ? "error" : "success",
    );
  } catch (error) {
    setElementStatus("romaneio-dropzone-status", error.message, "error");
  }
}

function handleRomaneioPdfFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => /\.pdf$/i.test(file.name));
  const approvedEntries = [];
  const approvedFiles = [];

  files.forEach((file) => {
    const entry = createPdfRomaneioEntry(file);
    const sameKindIndex = approvedEntries.findIndex(
      (item) => item.romaneio_identity === entry.romaneio_identity && item.document_kind === entry.document_kind,
    );
    if (sameKindIndex >= 0) {
      const confirmed = window.confirm(
        `Foram selecionados dois PDFs do mesmo tipo para ${formatRomaneioCode(entry.romaneio_identity)}. Deseja manter o arquivo mais recente e substituir o anterior da seleção?`,
      );
      if (!confirmed) {
        return;
      }
      approvedEntries.splice(sameKindIndex, 1);
      approvedFiles.splice(sameKindIndex, 1);
    }
    if (!confirmRomaneioReplacement(entry)) {
      return;
    }
    approvedEntries.push(entry);
    approvedFiles.push(file);
  });

  if (!approvedEntries.length) {
    setElementStatus(
      "romaneio-dropzone-status",
      files.length ? "Nenhum PDF foi enviado porque a substituição foi cancelada." : "Nenhum PDF válido foi selecionado.",
      "error",
    );
    return;
  }

  replaceLocalRomaneios(approvedEntries, approvedEntries.map((entry) => entry.romaneio_identity));
  refreshRomaneiosWorkspace();
  setElementStatus("romaneio-dropzone-status", `${approvedEntries.length} PDF(s) adicionados. Iniciando importação...`);
  uploadRomaneioPdfFiles(approvedEntries.map((entry, index) => ({ entry, file: approvedFiles[index] }))).catch((error) => {
    setElementStatus("romaneio-dropzone-status", error.message, "error");
  });
}

function configurarRomaneioIntake() {
  state.romaneiosLocais = loadLocalRomaneios();
  refreshRomaneiosWorkspace();

  const dropzone = document.getElementById("romaneios-dropzone");
  const input = document.getElementById("romaneios-pdf-input");
  const button = document.getElementById("romaneios-pdf-button");
  const manualForm = document.getElementById("romaneio-manual-form");
  const filterInput = document.getElementById("romaneios-filter-input");

  if (!dropzone || !input || !button || !manualForm || !filterInput) {
    return;
  }

  const openPicker = () => input.click();

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openPicker();
  });

  dropzone.addEventListener("click", openPicker);
  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    handleRomaneioPdfFiles(event.dataTransfer?.files || []);
  });

  input.addEventListener("change", (event) => {
    handleRomaneioPdfFiles(event.target.files || []);
    input.value = "";
  });

  manualForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const payload = payloadFromForm(manualForm);
      if (!payload.romaneio) {
        throw new Error("Informe o código do romaneio.");
      }
      const entry = createManualRomaneioEntry(payload);
      if (!confirmRomaneioReplacement(entry)) {
        setElementStatus("romaneio-manual-status", "Substituição cancelada pelo operador.", "error");
        return;
      }
      appendRomaneiosLocais([entry], "romaneio-manual-status", "Romaneio manual salvo na fila local.");
      manualForm.reset();
      manualForm.elements.empresa.value = "INPLAST";
    } catch (error) {
      setElementStatus("romaneio-manual-status", error.message, "error");
    }
  });

  filterInput.addEventListener("input", (event) => {
    state.romaneiosFiltro = event.target.value || "";
    renderRomaneios();
  });
}

function rerenderOperationalViews() {
  refreshRomaneiosWorkspace();
  renderKanban(state.datasets.kanban);
  renderProgramming(state.datasets.programming);
  renderApontamento();
  renderEstoqueAtual(state.datasets.painel);
  renderMrpTable("assembly-table", state.datasets.assembly);
  renderHourlyModule("montagem");
  renderMrpTable("production-table", state.datasets.production);
  renderHourlyModule("producao");
  renderIntegrations(state.integrations);
  renderUsersModule();
  applyHorizontalScrollEnhancements();
}

async function syncSources(sourceCodes = []) {
  const label = sourceCodes.length ? `Sincronizando ${sourceCodes.length} fonte(s)...` : "Sincronizando fontes ativas...";
  setElementStatus("sources-status", label);
  try {
    const response = await postJson("/api/pcp/sources/sync", sourceCodes.length ? { source_codes: sourceCodes } : {});
    const okCount = Array.isArray(response.results) ? response.results.length : 0;
    const errorCount = Array.isArray(response.errors) ? response.errors.length : 0;
    setElementStatus(
      "sources-status",
      errorCount ? `${okCount} fonte(s) sincronizadas e ${errorCount} com erro.` : `${okCount} fonte(s) sincronizadas com sucesso.`,
      errorCount ? "error" : "success",
    );
    await carregarTudo();
  } catch (error) {
    setElementStatus("sources-status", error.message, "error");
  }
}

function resetUserForm() {
  const form = document.getElementById("user-form");
  if (!form) {
    return;
  }
  form.reset();
  delete form.dataset.editingUserId;
  if (form.elements.namedItem("role")) {
    form.elements.namedItem("role").value = "operator";
  }
  if (form.elements.namedItem("active")) {
    form.elements.namedItem("active").value = "true";
  }
}

async function salvarUsuario(event) {
  event.preventDefault();
  try {
    if (!state.currentUser || !["root", "manager"].includes(state.currentUser.role)) {
      setElementStatus("user-status", "Apenas administradores podem gerenciar usuários.", "error");
      return;
    }

    const form = event.currentTarget;
    const payload = payloadFromForm(form);
    if (!payload.username || !payload.full_name || !payload.password) {
      setElementStatus("user-status", "Preencha usuário, nome e senha.", "error");
      return;
    }

    const editingUserId = form.dataset.editingUserId || "";
    const users = ensureUsersStorage();
    const exists = users.find((item) => String(item.username).toLowerCase() === String(payload.username).toLowerCase());
    if (exists && exists.id !== editingUserId) {
      setElementStatus("user-status", "Já existe um usuário com esse login.", "error");
      return;
    }

    const nextUser = {
      id: editingUserId || `user-${Date.now()}`,
      username: String(payload.username).trim().toLowerCase(),
      full_name: String(payload.full_name).trim(),
      role: payload.role || "operator",
      active: String(payload.active || "true") === "true",
      password: String(payload.password).trim(),
      created_at: editingUserId ? (users.find((item) => item.id === editingUserId)?.created_at || new Date().toISOString()) : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextUsers = editingUserId
      ? users.map((item) => (item.id === editingUserId ? nextUser : item))
      : [nextUser, ...users];

    const response = await postJson("/api/pcp/users/save", nextUser);
    saveUsers(mergeUsersWithDefault(response.items || nextUsers));
    await carregarUsuariosBackend(true);
    if (state.currentUser?.id === nextUser.id) {
      persistSession(nextUser);
      renderAuthState();
    }
    renderUsersModule();
    resetUserForm();
    setElementStatus("user-status", `Usuário ${nextUser.username} salvo com sucesso.`, "success");
  } catch (error) {
    setElementStatus("user-status", error.message, "error");
  }
}

async function autenticarUsuario(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = payloadFromForm(form);
  const username = String(payload.username || "").trim().toLowerCase();

  await carregarUsuariosBackend(true);

  let response;
  try {
    response = await postJson("/api/pcp/auth/login", {
      username,
      password: String(payload.password || ""),
    });
  } catch (error) {
    setElementStatus("login-status", "Usuário ou senha inválidos.", "error");
    return;
  }

  const user = response.user;
  persistSession(user);
  renderAuthState();
  renderUsersModule();
  setElementStatus("login-status", "", "");
  carregarTudo().catch((error) => {
    document.getElementById("mrp-status").textContent = "Erro de conexão: " + error.message;
  });
}

function logoutUsuario() {
  persistSession(null);
  renderAuthState();
  switchTab("#cockpit");
}

async function dispararMrp() {
  if (state.mrpRunning) {
    return;
  }

  state.mrpRunning = true;
  setMrpButtonBusy(true);
  updateMrpStatus(
    "Recalculando planejamento...",
    "info",
    "Atualizando filas de montagem, produção e compras com base no estoque, nos romaneios e nas estruturas.",
  );

  try {
    const previousSnapshot = state.lastOverviewSnapshotAt;
    const payload = await postJson("/api/pcp/runs/mrp", {});
    const runId = payload.run_id ?? "n/d";
    const queuedAt = formatDateTimeWithFallback(payload.queued_at, "agora");
    const syncResult = await waitForMrpSnapshot(previousSnapshot);
    await carregarTudo();

    if (syncResult.completed) {
      updateMrpStatus(
        `Planejamento atualizado às ${formatDateTimeWithFallback(syncResult.snapshotAt, queuedAt)}.`,
        "ready",
        `Rodada ${runId} concluída e refletida no snapshot operacional.`,
      );
      return;
    }

    updateMrpStatus(
      payload.message || `Recálculo solicitado às ${queuedAt}.`,
      "info",
      `Rodada ${runId} aberta. Os painéis serão atualizados quando o banco concluir o processamento.`,
    );
  } catch (error) {
    updateMrpStatus(
      error.message || "Falha ao recalcular o planejamento.",
      "error",
      "Não foi possível acionar a rotina de MRP.",
    );
  } finally {
    state.mrpRunning = false;
    setMrpButtonBusy(false);
  }
}

async function salvarEstrutura(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById("structure-status");
  try {
    const payload = payloadFromForm(form);
    const response = await postJson("/api/pcp/structure-overrides", payload);
    status.classList.remove("error");
    status.textContent = `Estrutura salva. Override ${response.override_id || "n/d"}.`;
    form.reset();
    await dispararMrp();
    await carregarTudo();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

async function salvarProgramacao(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById("programming-status");
  try {
    const payload = payloadFromForm(form);
    const response = await postJson("/api/pcp/programming-entries", payload);
    status.classList.remove("error");
    status.textContent = `Programacao salva. Entrada ${response.entry_id || "n/d"}.`;
    form.reset();
    state.programmingActionFilter = "";
    await carregarTudo();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

function salvarApontamento(event) {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const payload = payloadFromForm(form);
    if (!payload.maquina || !payload.operator || !payload.event_type) {
      throw new Error("Máquina, operador e tipo do evento são obrigatórios.");
    }

    const machineCode = machineCodeFromLabel(payload.maquina);
    const entry = {
      id: `log-${Date.now()}`,
      created_at: new Date().toISOString(),
      machine_code: machineCode,
      operator: payload.operator,
      event_type: payload.event_type,
      op_code: payload.op_code || "",
      pieces: Number(payload.pieces) || 0,
      scrap: Number(payload.scrap) || 0,
      stop_start: payload.stop_start || "",
      stop_end: payload.stop_end || "",
      reason: payload.reason || "",
      time_range: formatTimeWithFallback(new Date().toISOString(), "--:--"),
    };

    saveApontamentoLogs([entry, ...state.apontamentoLogs]);
    state.apontamentoSelecionado = payload.maquina;
    state.apontamentoScreen = payload.event_type === "parada" ? "paradas" : "historico";
    renderApontamento();
    setElementStatus("apontamento-status", "Apontamento registrado no diário operacional.", "success");
    const currentMachine = payload.maquina;
    form.reset();
    if (form.elements.namedItem("maquina")) {
      form.elements.namedItem("maquina").value = currentMachine;
    }
  } catch (error) {
    setElementStatus("apontamento-status", error.message, "error");
  }
}

function renderFactorySimulation(items, containerId, numLanes) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  
  const parent = container.parentElement;
  let ruler = parent.querySelector('.timeline-ruler');
  if (ruler && !ruler.innerHTML.trim()) {
      for (let hour = 6; hour <= 22; hour++) {
          ruler.appendChild(el(`<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`));
      }
  }

  const startHour = 6;
  const endHour = 22;
  const totalMinutes = (endHour - startHour) * 60;
  const action = containerId.includes("assembly") ? "montar" : "produzir";

  const lanesData = Array.from({ length: numLanes }, (_, i) => ({
      id: i,
      label: containerId.includes('assembly') ? `Esteira M-${i+1}` : `Extrusora E-${i+1}`,
      machineStatus: 'Ativa',
      items: [],
      currentMinute: 0
  }));

  const sortedItems = [...items]
      .filter((item) => matchesSearch([item.sku, item.produto, item.product_type], getGlobalSearchQuery()))
      .sort((a,b) => (b.net_required || 0) - (a.net_required || 0));
  
  sortedItems.forEach(item => {
      const targetLane = lanesData.reduce((prev, curr) => (prev.currentMinute < curr.currentMinute) ? prev : curr);
      const qty = item.net_required || 0;
      if (qty <= 0) return;
      
      const durationMinutes = Math.min(Math.round(qty * 0.2), totalMinutes - targetLane.currentMinute);
      if (durationMinutes > 0 && targetLane.currentMinute < totalMinutes) {
          targetLane.items.push({
              startMin: targetLane.currentMinute,
              duration: durationMinutes,
              item
          });
          targetLane.currentMinute += durationMinutes + 15;
      }
  });

  lanesData.forEach(lane => {
      const laneEl = el(`
          <div class="machine-lane">
             <div class="machine-label">
                 <strong>${lane.label}</strong>
                 <span>${lane.machineStatus}</span>
             </div>
             <div class="machine-track"></div>
          </div>
      `);
      const track = laneEl.querySelector('.machine-track');
      
      lane.items.forEach(block => {
          const leftPct = (block.startMin / totalMinutes) * 100;
          const widthPct = (block.duration / totalMinutes) * 100;
          
          const blockEl = el(`
              <div class="sim-block" style="left: ${leftPct}%; width: ${widthPct}%;" title="${block.item.produto} (Qtd: ${number.format(block.item.net_required)})">
                 <strong>${block.item.sku}</strong>
                 <small>${number.format(block.item.net_required)} un</small>
              </div>
          `);
          blockEl.addEventListener("click", () => {
              prefillProgrammingForm(
                { ...block.item, action },
                {
                  assembly_line_code: action === "montar" ? `LINHA-${String(lane.id + 1).padStart(2, "0")}` : `EXTR-${String(lane.id + 1).padStart(2, "0")}`,
                  workstation_code: action === "montar" ? `POSTO-${String.fromCharCode(65 + lane.id)}` : `MAQ-0${lane.id + 1}`,
                  switchTab: true,
                },
              );
          });
          track.appendChild(blockEl);
      });
      container.appendChild(laneEl);
  });
}

async function carregarTudo() {
  const warnings = [];
  const [
    overview,
    alerts,
    romaneios,
    kanban,
    structures,
    programming,
    assembly,
    production,
    purchases,
    recycling,
    costs,
    sources,
    integrations,
    painel,
    users,
    stockMovements,
    productionRules,
  ] = await Promise.all([
    safeApi("/api/pcp/overview", { totals: {}, top_criticos: [] }, warnings),
    safeApi("/api/pcp/alerts", { items: [] }, warnings),
    safeApi("/api/pcp/romaneios", { items: [] }, warnings),
    safeApi("/api/pcp/romaneios-kanban", { products: [], romaneios: [] }, warnings),
    safeApi("/api/pcp/structures", { summary: {}, items: [] }, warnings),
    safeApi("/api/pcp/programming", { items: [] }, warnings),
    safeApi("/api/pcp/assembly", { items: [] }, warnings),
    safeApi("/api/pcp/production", { items: [] }, warnings),
    safeApi("/api/pcp/purchases", { items: [] }, warnings),
    safeApi("/api/pcp/recycling", { items: [] }, warnings),
    safeApi("/api/pcp/costs", { items: [] }, warnings),
    safeApi("/api/pcp/sources", { items: [] }, warnings),
    safeApi("/api/pcp/integrations", { items: [] }, warnings),
    safeApi("/api/pcp/painel", { items: [] }, warnings),
    safeApi("/api/pcp/users", { items: state.users || [] }, warnings),
    safeApi("/api/pcp/stock-movements", { items: [], summary: {} }, warnings),
    safeApi("/api/pcp/production-rules", { items: [], resource_catalog: [] }, warnings),
  ]);

  renderOverview(overview);
  renderAlerts(alerts);
  state.romaneiosApi = Array.isArray(romaneios.items) ? romaneios.items : [];
  state.datasets.kanban = {
    products: Array.isArray(kanban.products) ? kanban.products : [],
    romaneios: Array.isArray(kanban.romaneios) ? kanban.romaneios : [],
  };
  state.datasets.programming = Array.isArray(programming.items) ? programming.items : [];
  state.datasets.assembly = Array.isArray(assembly.items) ? assembly.items : [];
  state.datasets.production = Array.isArray(production.items) ? production.items : [];
  state.datasets.painel = Array.isArray(painel.items) ? painel.items : [];
  state.integrations = Array.isArray(integrations.items) ? integrations.items : [];
  state.stockMovements = Array.isArray(stockMovements.items) ? stockMovements.items : [];
  state.productionRules = buildProductionRulesState(productionRules);
  saveUsers(mergeUsersWithDefault(users.items || []));
  refreshRomaneiosWorkspace();
  renderKanban(kanban);
  renderStructures(structures);
  renderProgramming(state.datasets.programming);
  renderApontamento();
  renderMrpTable("assembly-table", state.datasets.assembly);
  renderHourlyModule("montagem");
  renderMrpTable("production-table", state.datasets.production);
  renderHourlyModule("producao");
  renderPurchases(purchases.items);
  renderRecycling(recycling.items);
  renderCosts(costs.items);
  renderSources(sources.items);
  renderIntegrations(state.integrations);
  renderPainel(painel.items);
  renderEstoqueAtual(state.datasets.painel);
  renderStockMovements();
  renderUsersModule();
  renderCockpitReports({
    overview,
    romaneios,
    kanban,
    painel: painel.items,
    alerts: alerts.items,
  });
  applyHorizontalScrollEnhancements();

  const mrpStatus = document.getElementById("mrp-status");
  if (mrpStatus && !state.mrpRunning) {
    if (warnings.length) {
      mrpStatus.textContent = `Carga parcial: ${warnings.length} rota(s) com falha`;
      mrpStatus.className = "status-badge warning";
      mrpStatus.title = warnings.map((item) => `${item.path} · ${item.message}`).join("\n");
    } else {
      mrpStatus.textContent = "Pronto";
      mrpStatus.className = "status-badge ready";
      mrpStatus.removeAttribute("title");
    }
  }

  const mergedRomaneios = buildRomaneiosCollection();
  if (!state.romaneioSelecionado && mergedRomaneios.length) {
    await carregarRomaneio(mergedRomaneios[0].selection_code);
  } else if (!mergedRomaneios.length) {
    document.getElementById("romaneio-detail").innerHTML = "";
    document.getElementById("romaneio-detail").appendChild(
      emptyState("Nenhum romaneio disponivel para detalhamento neste momento."),
    );
  }
}

document.getElementById("run-mrp")?.addEventListener("click", dispararMrp);
document.getElementById("reload-all")?.addEventListener("click", carregarTudo);
document.getElementById("structure-form")?.addEventListener("submit", salvarEstrutura);
document.getElementById("programming-form")?.addEventListener("submit", salvarProgramacao);
document.getElementById("programming-form")?.addEventListener("input", () => renderProgrammingRecommendation({
  sku: document.getElementById("programming-form")?.elements?.namedItem("sku")?.value || "",
  produto: document.getElementById("programming-form")?.elements?.namedItem("produto")?.value || "",
  action: document.getElementById("programming-form")?.elements?.namedItem("action")?.value || "montar",
}));
document.getElementById("programming-form")?.addEventListener("change", () => renderProgrammingRecommendation({
  sku: document.getElementById("programming-form")?.elements?.namedItem("sku")?.value || "",
  produto: document.getElementById("programming-form")?.elements?.namedItem("produto")?.value || "",
  action: document.getElementById("programming-form")?.elements?.namedItem("action")?.value || "montar",
}));
document.getElementById("apontamento-form")?.addEventListener("submit", salvarApontamento);
document.getElementById("stock-movement-form")?.addEventListener("submit", salvarStockMovement);
document.getElementById("apontamento-form")?.elements.namedItem("maquina")?.addEventListener("change", (event) => {
  state.apontamentoSelecionado = event.target.value || state.apontamentoSelecionado;
  renderApontamento();
});
document.getElementById("apontamento-form")?.elements.namedItem("event_type")?.addEventListener("change", (event) => {
  state.apontamentoScreen = apontaScreenFromEvent(event.target.value);
  renderApontamento();
});
document.getElementById("programming-reset")?.addEventListener("click", () => {
  document.getElementById("programming-form")?.reset();
  setElementStatus("programming-status", "Formulário de programação limpo.", "success");
});
document.getElementById("apontamento-reset")?.addEventListener("click", () => {
  document.getElementById("apontamento-form")?.reset();
  if (state.apontamentoSelecionado && document.getElementById("apontamento-form")?.elements.namedItem("maquina")) {
    document.getElementById("apontamento-form").elements.namedItem("maquina").value = state.apontamentoSelecionado;
  }
  state.apontamentoScreen = "resumo";
  renderApontamento();
  setElementStatus("apontamento-status", "Formulário de apontamento limpo.", "success");
});
document.getElementById("global-search-input")?.addEventListener("input", (event) => {
  state.globalSearch = event.target.value || "";
  rerenderOperationalViews();
});
document.getElementById("stock-search-input")?.addEventListener("input", (event) => {
  state.estoqueBusca = event.target.value || "";
  renderEstoqueAtual(state.datasets.painel);
});
document.getElementById("stock-type-filter")?.addEventListener("change", (event) => {
  state.estoqueFiltro = event.target.value || "";
  renderEstoqueAtual(state.datasets.painel);
});
document.getElementById("stock-movement-reset")?.addEventListener("click", () => {
  document.getElementById("stock-movement-form")?.reset();
  prefillStockMovementForm();
});
document.getElementById("kanban-status-filter")?.addEventListener("change", (event) => {
  state.kanbanStatusFilter = event.target.value || "todos";
  renderKanban(state.datasets.kanban);
});
document.getElementById("kanban-view-mode")?.addEventListener("change", (event) => {
  state.kanbanViewMode = event.target.value || "board";
  if (state.kanbanViewMode === "workbench") {
    state.kanbanInspectorCollapsed = false;
  }
  renderKanban(state.datasets.kanban);
});
document.querySelectorAll("[data-kanban-inspector-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    if (state.kanbanViewMode !== "board") {
      return;
    }
    state.kanbanInspectorCollapsed = !state.kanbanInspectorCollapsed;
    renderKanban(state.datasets.kanban);
  });
});
document.getElementById("kanban-reset-filters")?.addEventListener("click", () => {
  state.kanbanStatusFilter = "todos";
  const field = document.getElementById("kanban-status-filter");
  if (field) field.value = "todos";
  renderKanban(state.datasets.kanban);
});
document.getElementById("kanban-sem-previsao-shortcut")?.addEventListener("click", () => {
  focusKanbanColumn("__sem_previsao__");
});
document.getElementById("programming-action-filter")?.addEventListener("change", (event) => {
  state.programmingActionFilter = event.target.value || "";
  renderProgramming(state.datasets.programming);
});
document.getElementById("user-form")?.addEventListener("submit", salvarUsuario);
document.getElementById("user-form-reset")?.addEventListener("click", resetUserForm);
document.getElementById("login-form")?.addEventListener("submit", autenticarUsuario);
document.getElementById("logout-button")?.addEventListener("click", logoutUsuario);
document.getElementById("sidebar-toggle")?.addEventListener("click", () => toggleSidebar());
document.getElementById("assembly-toggle-sidebar")?.addEventListener("click", () => toggleHourlyPanel("montagem", "sidebarCollapsed"));
document.getElementById("assembly-toggle-table")?.addEventListener("click", () => toggleHourlyPanel("montagem", "tableCollapsed"));
document.getElementById("production-toggle-sidebar")?.addEventListener("click", () => toggleHourlyPanel("producao", "sidebarCollapsed"));
document.getElementById("production-toggle-table")?.addEventListener("click", () => toggleHourlyPanel("producao", "tableCollapsed"));
document.getElementById("apontamento-operator-mode")?.addEventListener("click", () => {
  setApontamentoOperatorMode(!state.apontamentoOperatorMode);
});
document.getElementById("sync-all-sources")?.addEventListener("click", () => {
  syncSources().catch((error) => {
    setElementStatus("sources-status", error.message, "error");
  });
});
document.getElementById("refresh-romaneios")?.addEventListener("click", () => {
  atualizarRomaneiosViaWebhook().catch(() => {});
});
document.getElementById("open-integracoes")?.addEventListener("click", () => {
  switchTab("#integracoes");
});
document.getElementById("integration-run-now")?.addEventListener("click", () => {
  atualizarRomaneiosViaWebhook().catch(() => {});
});
document.getElementById("integration-form")?.addEventListener("submit", salvarIntegracao);
document.getElementById("integration-form-reset")?.addEventListener("click", () => {
  resetIntegrationForm();
  setElementStatus("integration-status", "Formulário de integração limpo.", "success");
});
window.addEventListener("resize", () => {
  refreshHorizontalScrollers();
});
window.addEventListener("scroll", () => {
  refreshHorizontalScrollers();
}, { passive: true });
configurarRomaneioIntake();
ensureUsersStorage();
state.sidebarCollapsed = loadSidebarPreference();
state.apontamentoOperatorMode = loadOperatorModePreference();
state.apontamentoLogs = loadApontamentoLogs();
bootstrapSessionAndData().catch((error) => {
  setElementStatus("login-status", error.message, "error");
  renderAuthState();
  renderUsersModule();
});

function switchTab(hash) {
  const targetId = hash.replace('#', '') || 'cockpit';
  state.currentView = targetId;
  
  document.querySelectorAll('.view-module').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.main-nav .nav-item').forEach(a => a.classList.remove('active'));
  
  const targetModule = document.getElementById(targetId);
  if (targetModule) targetModule.classList.add('active');
  
  const navLink = document.querySelector(`.main-nav .nav-item[href="#${targetId}"]`);
  if (navLink) {
    navLink.classList.add('active');
    document.getElementById('view-title').textContent = navLink.textContent.trim();
  } else {
    document.getElementById('view-title').textContent = 'Cockpit Executivo';
  }

  applyShellState();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => switchTab(window.location.hash));
switchTab(window.location.hash);
async function bootstrapSessionAndData() {
  applyShellState();
  await carregarUsuariosBackend(true);
  const session = loadSession();
  const user = session
    ? state.users.find((item) => (
      (session.user_id && item.id === session.user_id)
      || (session.username && item.username === session.username)
    )) || null
    : null;
  persistSession(user);
  renderAuthState();
  renderUsersModule();

  if (state.currentUser) {
    await carregarTudo();
  }
}
