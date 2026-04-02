const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR");

const state = {
  romaneioSelecionado: null,
  romaneiosApi: [],
  romaneiosLocais: [],
  romaneiosFiltro: "",
  estoqueFiltro: "",
  estoqueBusca: "",
  globalSearch: "",
  currentView: "cockpit",
  sidebarCollapsed: false,
  kanbanStatusFilter: "todos",
  kanbanViewMode: "board",
  kanbanSelecionado: null,
  programmingActionFilter: "",
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
    painel: [],
  },
  currentUser: null,
  users: [],
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

function formatDateTime(value) {
  return formatDateTimeWithFallback(value, "Sem previsao");
}

function formatDateTimeWithFallback(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toLocaleString("pt-BR");
}

function formatDateWithFallback(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toLocaleDateString("pt-BR");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sumBy(items, getValue) {
  return items.reduce((total, item) => total + (Number(getValue(item)) || 0), 0);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIsoDate(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
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
  return /ROMANEIO\s+NOTA/.test(text) ? "romaneio_nota" : "romaneio";
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

function toDatetimeLocalValue(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
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
  return state.romaneiosApi.find((item) => String(item.romaneio) === String(code)) || null;
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
    throw new Error(data.detail || `Falha ao enviar dados para ${path}`);
  }
  return data;
}

function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
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

  const date = new Date(`${dateKey}T12:00:00`);
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

  const items = buildRomaneiosCollection();

  if (!items.length) {
    wrapper.appendChild(emptyState("Nenhum romaneio recebido ou homologado ate o momento."));
  } else {
    items.forEach((item) => {
      const isLocal = item.source_type !== "api";
      const isSelected = state.romaneioSelecionado === item.selection_code;
      const secondaryLine = isLocal
        ? `${number.format(resolveRomaneioQuantity(item))} unidades | ${item.pdf_name || "Romaneio digitado"}${item.pedido ? ` | Pedido ${item.pedido}` : ""}`
        : `${number.format(resolveRomaneioQuantity(item))} unidades | Saida ${formatDateTime(item.previsao_saida_at)}`;
      const row = el(`
        <article class="romaneio-row ${isLocal ? "local" : ""} ${isSelected ? "selected" : ""}">
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
          <em>${new Date(item.received_at).toLocaleString("pt-BR")} | ${item.status}</em>
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

function renderProgramming(items) {
  const tbody = document.getElementById("programming-table");
  const board = document.getElementById("programming-board");
  const shortcuts = document.getElementById("programming-shortcuts");
  if (!tbody || !board || !shortcuts) {
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
  ]
    .filter((item) => matchesSearch([item.sku, item.produto, item.product_type], searchQuery))
    .sort((left, right) => (Number(right.net_required) || 0) - (Number(left.net_required) || 0))
    .slice(0, 6);

  shortcuts.innerHTML = "";
  if (!quickCandidates.length) {
    shortcuts.appendChild(emptyState("Nenhum atalho crítico para programação com os filtros atuais."));
  } else {
    quickCandidates.forEach((item) => {
      const card = el(`
        <article class="programming-shortcut-card">
          <small>${item.suggestedAction === "montar" ? "Fila de esteiras" : "Fila de extrusoras"}</small>
          <strong>${item.sku}</strong>
          <span>${item.produto}</span>
          <em>${number.format(item.net_required || 0)} un pendentes · estoque ${number.format(item.stock_available || 0)}</em>
          <button type="button" class="btn btn-secondary btn-xs">Programar</button>
        </article>
      `);
      card.querySelector("button").addEventListener("click", () => {
        prefillProgrammingForm(
          { ...item, action: item.suggestedAction },
          {
            assembly_line_code: item.suggestedAction === "montar" ? "LINHA-01" : "EXTR-01",
            workstation_code: item.suggestedAction === "montar" ? "POSTO-A" : "MAQ-01",
            switchTab: true,
          },
        );
      });
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
      row.addEventListener("click", () => prefillProgrammingForm(item, { switchTab: true }));
      row.querySelector('[data-action="edit"]').addEventListener("click", (event) => {
        event.stopPropagation();
        prefillProgrammingForm(item, { switchTab: true });
      });
      tbody.appendChild(row);
    });
  }

  const lanes = [
    { key: "montar", label: "Montagem", subtitle: "Esteiras e postos finais" },
    { key: "produzir", label: "Produção", subtitle: "Extrusoras e intermediários" },
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
          <article class="programming-entry-card">
            <small>${item.sku}</small>
            <strong>${item.produto}</strong>
            <span>${number.format(item.quantity_planned || 0)} un · ${item.assembly_line_code || item.workstation_code || "Sem recurso"}</span>
            <em>Disponível ${formatDateTimeWithFallback(item.available_at, "sem previsão")}</em>
          </article>
        `);
        card.addEventListener("click", () => prefillProgrammingForm(item, { switchTab: true }));
        laneBody.appendChild(card);
      });
    }

    board.appendChild(laneEl);
  });
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
  const filtered = (Array.isArray(items) ? items : []).filter((item) =>
    matchesSearch([item.sku, item.produto, item.product_type], getGlobalSearchQuery()),
  );

  tbody.innerHTML = "";
  if (!filtered.length) {
    tbody.appendChild(el(`<tr><td colspan="6" class="muted">Sem itens nesta fila com os dados atuais.</td></tr>`));
  } else {
    filtered.forEach((item, index) => {
      const lineCode = action === "montar" ? `LINHA-${String((index % 2) + 1).padStart(2, "0")}` : `EXTR-${String((index % 6) + 1).padStart(2, "0")}`;
      const workstationCode = action === "montar" ? `POSTO-${String.fromCharCode(65 + (index % 4))}` : `MAQ-0${(index % 6) + 1}`;
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
          <td>${number.format(item.stock_available)}</td>
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
            assembly_line_code: lineCode,
            workstation_code: workstationCode,
            switchTab: true,
          },
        );
      });
      row.querySelector('[data-action="program"]').addEventListener("click", (event) => {
        event.stopPropagation();
        prefillProgrammingForm(
          { ...item, action },
          {
            assembly_line_code: lineCode,
            workstation_code: workstationCode,
            switchTab: true,
          },
        );
      });
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
    estoque: sumBy(filtered, (item) => item.estoque_atual || 0),
    disponiveis: filtered.filter((item) => Number(item.estoque_atual || 0) > 0).length,
    criticos: filtered.filter((item) => Number(item.estoque_atual || 0) <= 0).length,
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
    const stock = Number(item.estoque_atual || 0);
    const tone = stock <= 0 ? "high" : stock < 50 ? "warning" : "ok";
    const label = stock <= 0 ? "Sem saldo" : stock < 50 ? "Baixo" : "Disponível";
    tbody.appendChild(
      el(`
        <tr class="interactive-row">
          <td><strong>${item.sku}</strong></td>
          <td>${item.produto}</td>
          <td>${formatProductType(item.tipo || item.product_type)}</td>
          <td class="${stock <= 0 ? "text-warning" : ""}">${number.format(stock)}</td>
          <td><span class="tag ${tone}">${label}</span></td>
        </tr>
      `),
    );
  });
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
      payload[key] = new Date(text).toISOString();
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
      machine_hint: item.workstation_code || item.assembly_line_code || "Máquina 1",
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
      machine_hint: `Extrusora ${index + 1}`,
      notes: "Sugestão automática da fila de produção.",
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

function renderKanbanInspector(model, data) {
  const wrapper = document.getElementById("kanban-inspector");
  const label = document.getElementById("kanban-selected-label");
  if (!wrapper || !label) {
    return;
  }

  wrapper.innerHTML = "";
  const cards = flattenKanbanCards(model);
  if (!cards.length) {
    label.textContent = "Sem seleção";
    label.className = "status-badge info";
    wrapper.appendChild(emptyState("Nenhum romaneio atende aos filtros atuais do workbench logístico."));
    return;
  }

  const selectedCard =
    cards.find((card) => String(card.romaneio) === String(state.kanbanSelecionado)) ||
    cards[0];
  state.kanbanSelecionado = selectedCard.romaneio;
  label.textContent = formatRomaneioCode(selectedCard.romaneio);
  label.className = `status-badge ${selectedCard.statusTone}`;

  const productMap = Object.fromEntries((Array.isArray(data.products) ? data.products : []).map((item) => [item.sku, item]));
  const selectedIndex = cards.findIndex((card) => String(card.romaneio) === String(selectedCard.romaneio));
  const cumulativeDemand = {};
  cards.slice(0, selectedIndex + 1).forEach((card) => {
    (card.items || []).forEach((item) => {
      cumulativeDemand[item.sku] = (cumulativeDemand[item.sku] || 0) + (Number(item.quantidade) || 0);
    });
  });

  const selectedItems = (selectedCard.items || []).map((item) => {
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
    };
  }).sort((left, right) => right.pendente - left.pendente);

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

  const inspector = el(`
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

  inspector.querySelector("#kanban-workbench-select")?.addEventListener("change", (event) => {
    state.kanbanSelecionado = event.target.value || selectedCard.romaneio;
    renderKanban(kanbanState);
  });

  inspector.querySelector("#kanban-open-detail").addEventListener("click", async () => {
    window.location.hash = "#romaneios";
    await carregarRomaneio(selectedCard.romaneio);
  });

  inspector.querySelector("#kanban-program-item").addEventListener("click", () => {
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
        notes: `Atendimento puxado do workbench logístico para ${formatRomaneioCode(selectedCard.romaneio)}.`,
      },
      {
        assembly_line_code: baseAction === "montar" ? "LINHA-01" : "EXTR-01",
        workstation_code: baseAction === "montar" ? "POSTO-A" : "MAQ-01",
        switchTab: true,
      },
    );
  });

  inspector.querySelector("#kanban-save-date").addEventListener("click", async () => {
    const field = inspector.querySelector("#kanban-manual-date");
    const value = field?.value ? new Date(field.value).toISOString() : null;
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

  inspector.querySelector("#kanban-clear-date").addEventListener("click", async () => {
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
  }
  renderKanbanSummary(model);
  renderKanbanInspector(model, data);

  const wrapper = document.getElementById("kanban-board"); // Updated ID
  if (!wrapper) return;
  wrapper.innerHTML = "";

  if (!model.columns.length) {
    wrapper.appendChild(emptyState("Nenhum romaneio ativo para a matriz logística."));
    return;
  }

  model.columns.forEach((column) => {
    const col = el(`
      <div class="kanban-lane">
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
        renderKanban(kanbanState);
      });

      card.querySelector('[data-action="inspect"]').addEventListener("click", async (event) => {
        event.stopPropagation();
        state.kanbanSelecionado = cardData.romaneio;
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

async function excluirRomaneio(code) {
  const localEntry = findLocalRomaneioBySelectionCode(code);
  if (localEntry) {
    const confirmedLocal = window.confirm(`Deseja remover o romaneio local ${formatRomaneioCode(localEntry.romaneio)} da fila?`);
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

  const confirmed = window.confirm(
    `Deseja excluir o romaneio ${formatRomaneioCode(romaneio.romaneio)}? A carteira e os itens desse romaneio serão substituídos pela exclusão no sistema.`,
  );
  if (!confirmed) {
    return;
  }

  setElementStatus("romaneio-dropzone-status", `Excluindo ${formatRomaneioCode(romaneio.romaneio)}...`);
  await postJson("/api/pcp/romaneios/delete", {
    romaneio: romaneio.romaneio,
    empresa: romaneio.empresa,
    deleted_by: state.currentUser?.username || "app",
    reason: "Operador confirmou exclusão do romaneio",
  });
  state.romaneioSelecionado = null;
  await carregarTudo();
  setElementStatus("romaneio-dropzone-status", `Romaneio ${formatRomaneioCode(romaneio.romaneio)} excluído com sucesso.`, "success");
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
  renderFactorySimulation(state.datasets.assembly, "assembly-lanes", 2);
  renderMrpTable("production-table", state.datasets.production);
  renderFactorySimulation(state.datasets.production, "production-lanes", 6);
  renderUsersModule();
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
  const response = await fetch("/api/pcp/runs/mrp", { method: "POST" });
  const payload = await response.json();
  const runId = payload.run_id ?? "n/d";
  const queuedAt = formatDateTimeWithFallback(payload.queued_at, "agora");
  document.getElementById("mrp-status").textContent = `MRP enfileirado. Run ${runId} as ${queuedAt}.`;
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
      time_range: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
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
    painel,
    users,
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
    safeApi("/api/pcp/painel", { items: [] }, warnings),
    safeApi("/api/pcp/users", { items: state.users || [] }, warnings),
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
  saveUsers(mergeUsersWithDefault(users.items || []));
  refreshRomaneiosWorkspace();
  renderKanban(kanban);
  renderStructures(structures);
  renderProgramming(state.datasets.programming);
  renderApontamento();
  renderMrpTable("assembly-table", state.datasets.assembly);
  renderFactorySimulation(state.datasets.assembly, "assembly-lanes", 2);
  renderMrpTable("production-table", state.datasets.production);
  renderFactorySimulation(state.datasets.production, "production-lanes", 6);
  renderPurchases(purchases.items);
  renderRecycling(recycling.items);
  renderCosts(costs.items);
  renderSources(sources.items);
  renderPainel(painel.items);
  renderEstoqueAtual(state.datasets.painel);
  renderUsersModule();
  renderCockpitReports({
    overview,
    romaneios,
    kanban,
    painel: painel.items,
    alerts: alerts.items,
  });

  const mrpStatus = document.getElementById("mrp-status");
  if (mrpStatus) {
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
document.getElementById("apontamento-form")?.addEventListener("submit", salvarApontamento);
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
document.getElementById("kanban-status-filter")?.addEventListener("change", (event) => {
  state.kanbanStatusFilter = event.target.value || "todos";
  renderKanban(state.datasets.kanban);
});
document.getElementById("kanban-view-mode")?.addEventListener("change", (event) => {
  state.kanbanViewMode = event.target.value || "board";
  renderKanban(state.datasets.kanban);
});
document.getElementById("kanban-reset-filters")?.addEventListener("click", () => {
  state.kanbanStatusFilter = "todos";
  const field = document.getElementById("kanban-status-filter");
  if (field) field.value = "todos";
  renderKanban(state.datasets.kanban);
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
document.getElementById("apontamento-operator-mode")?.addEventListener("click", () => {
  setApontamentoOperatorMode(!state.apontamentoOperatorMode);
});
document.getElementById("sync-all-sources")?.addEventListener("click", () => {
  syncSources().catch((error) => {
    setElementStatus("sources-status", error.message, "error");
  });
});
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
