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
};

const LOCAL_ROMANEIOS_STORAGE_KEY = "pcp_local_romaneios_v2";
const LEGACY_LOCAL_ROMANEIOS_STORAGE_KEYS = ["pcp_local_romaneios_v1"];

const DAY_MS = 24 * 60 * 60 * 1000;

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
    source_type: item.source_type || "manual",
    previsao_saida_status: item.previsao_saida_status || (item.source_type === "pdf" ? "arquivo_local" : "manual"),
    status_evento: item.status_evento || (item.source_type === "pdf" ? "pdf_local" : "manual_local"),
    quantidade_total: Number(item.quantidade_total) || 0,
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

function setElementStatus(id, message, tone) {
  const target = document.getElementById(id);
  if (!target) return;
  target.textContent = message || "";
  target.classList.remove("success", "error");
  if (tone) target.classList.add(tone);
}

function inferRomaneioCodeFromFilename(filename) {
  const base = String(filename || "").replace(/\.pdf$/i, "").trim();
  return base || `ROM-${Date.now()}`;
}

function createPdfRomaneioEntry(file) {
  const nowIso = new Date().toISOString();
  return {
    local_id: `local-pdf-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    source_type: "pdf",
    romaneio: inferRomaneioCodeFromFilename(file.name),
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
  return {
    local_id: `local-manual-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    source_type: "manual",
    romaneio: payload.romaneio,
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
    throw new Error(`Falha ao carregar ${path}`);
  }
  return response.json();
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
      title: `${nextDelivery.romaneio} é o próximo compromisso da fila`,
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
              <strong>${item.romaneio}</strong>
            </div>
            <span class="tag ${item.source_type === "pdf" ? "warning" : "info"}">${item.source_type}</span>
          </div>
          <div class="staged-meta">
            ${item.pdf_name ? `${item.pdf_name} · ${formatFileSize(item.pdf_size)}` : `${item.empresa || "INPLAST"}${item.pedido ? ` · Pedido ${item.pedido}` : ""}`}
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
        ? `${item.pdf_name || "Romaneio digitado"}${item.pedido ? ` | Pedido ${item.pedido}` : ""}`
        : `${number.format(item.quantidade_total)} unidades | Saida ${formatDateTime(item.previsao_saida_at)}`;
      const row = el(`
        <button class="romaneio-row ${isLocal ? "local" : ""} ${isSelected ? "selected" : ""}">
          <div>
            <small>${item.empresa}</small>
            <strong>${item.romaneio}</strong>
            <span class="muted">${secondaryLine}</span>
          </div>
          <div>
            <span class="tag ${statusClass(item.previsao_saida_status)}">${formatStatusLabel(item.previsao_saida_status)}</span>
          </div>
        </button>
      `);
      row.addEventListener("click", () => carregarRomaneio(item.selection_code));
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
        <span class="detail-pill">${header.status_evento || "processado"}</span>
        <div class="detail-grid">
          <div class="detail-card">
            <small>Romaneio</small>
            <strong>${header.romaneio || "N/D"}</strong>
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
        <span class="detail-pill">${entry.source_type === "pdf" ? "pdf_local" : "manual_local"}</span>
        <div class="detail-grid">
          <div class="detail-card">
            <small>Romaneio</small>
            <strong>${entry.romaneio}</strong>
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
  tbody.innerHTML = "";
  if (!items.length) {
    tbody.appendChild(el(`<tr><td colspan="7" class="muted">Sem programacoes informadas ate o momento.</td></tr>`));
    return;
  }

  items.forEach((item) => {
    tbody.appendChild(
      el(`
        <tr>
          <td><b>${item.sku}</b><br /><span class="muted">${item.produto}</span></td>
          <td>${item.action}</td>
          <td>${formatDateTimeWithFallback(item.planned_start_at, "Nao informado")}</td>
          <td>${formatDateTime(item.available_at)}</td>
          <td>${number.format(item.quantity_planned)}</td>
          <td>${item.assembly_line_code || "-"}</td>
          <td><span class="tag ${statusClass(item.planning_origin)}">${item.planning_origin}</span></td>
        </tr>
      `),
    );
  });
}

function renderApontamento() {
  const machineGrid = document.getElementById("apontamento-machine-grid");
  const hourTable = document.getElementById("apontamento-hour-table");
  const flowList = document.getElementById("apontamento-flow-list");
  const lossList = document.getElementById("apontamento-loss-list");

  if (!machineGrid || !hourTable || !flowList || !lossList) {
    return;
  }

  machineGrid.innerHTML = "";
  apontamentoMachines.forEach((item) => {
    machineGrid.appendChild(
      el(`
        <article class="aponta-machine-card">
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
      `),
    );
  });

  hourTable.innerHTML = "";
  apontamentoRows.forEach((item) => {
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
}

function renderMrpTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  tbody.innerHTML = "";
  if (!items.length) {
    tbody.appendChild(el(`<tr><td colspan="6" class="muted">Sem itens nesta fila com os dados atuais.</td></tr>`));
  } else {
    items.forEach((item) => {
      tbody.appendChild(
        el(`
          <tr>
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
            <td><span class="tag ${item.criticidade.toLowerCase()}">${item.criticidade}</span></td>
          </tr>
        `),
      );
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
  wrapper.innerHTML = "";
  if (!items.length) {
    wrapper.appendChild(emptyState("Nenhuma fonte cadastrada para exibicao."));
  } else {
    items.forEach((item) => {
      const cssStatusClass = statusClass(item.freshness_status);
      wrapper.appendChild(
        el(`
          <div class="list-card">
            <div class="source-row">
              <div>
                <small>${item.source_area}</small>
                <strong>${item.source_name}</strong>
                <em>${item.last_success_at ? formatDateTimeWithFallback(item.last_success_at, "Sem carga validada") : "Sem carga validada"}</em>
              </div>
              <span class="tag ${cssStatusClass}">${item.freshness_status}</span>
            </div>
          </div>
        `),
      );
    });
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
  const romaneios = Array.isArray(data.romaneios) ? data.romaneios : [];
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
            <strong>RM ${card.romaneio}</strong>
            <span>${number.format(card.deficit)} un sem cobertura imediata | ${card.riskItems} SKU(s) pressionando o saldo</span>
          </div>
        `),
      );
    });
  }

  wrapper.appendChild(grid);
  wrapper.appendChild(priorityBox);
}

function renderKanban(data) {
  kanbanState = data;
  const model = buildKanbanModel(data);
  renderKanbanSummary(model);

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
            <span class="k-sku">RM ${cardData.romaneio}</span>
            <span class="k-qty">${number.format(cardData.quantityTotal)} un</span>
          </div>
          <div class="k-title">${cardData.empresa}</div>
          <div class="k-card-bottom">
            <div class="k-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${formatDateWithFallback(cardData.previsao_saida_at || cardData.data_evento, "Sem data")}
            </div>
            <div class="k-priority ${cardData.statusTone}"></div>
          </div>
        </div>
      `);
      
      card.addEventListener("click", async () => {
        window.location.hash = "#romaneios";
        try {
          await carregarRomaneio(cardData.romaneio);
        } catch (error) {
          console.error("Falha ao carregar romaneio do kanban", error);
        }
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

function appendRomaneiosLocais(entries, messageTargetId, successMessage) {
  if (!entries.length) {
    return;
  }
  saveLocalRomaneios([...entries, ...state.romaneiosLocais]);
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
    const successfulFiles = new Set((response.results || []).map((item) => item.file_name).filter(Boolean));
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
  const entries = files.map(createPdfRomaneioEntry);

  if (!entries.length) {
    setElementStatus("romaneio-dropzone-status", "Nenhum PDF válido foi selecionado.", "error");
    return;
  }

  saveLocalRomaneios([...entries, ...state.romaneiosLocais]);
  refreshRomaneiosWorkspace();
  setElementStatus("romaneio-dropzone-status", `${entries.length} PDF(s) adicionados. Iniciando importação...`);
  uploadRomaneioPdfFiles(entries.map((entry, index) => ({ entry, file: files[index] }))).catch((error) => {
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
    await carregarTudo();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
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

  const lanesData = Array.from({ length: numLanes }, (_, i) => ({
      id: i,
      label: containerId.includes('assembly') ? `Esteira M-${i+1}` : `Extrusora E-${i+1}`,
      machineStatus: 'Ativa',
      items: [],
      currentMinute: 0
  }));

  const sortedItems = [...items].sort((a,b) => (b.net_required || 0) - (a.net_required || 0));
  
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
          track.appendChild(blockEl);
      });
      container.appendChild(laneEl);
  });
}

async function carregarTudo() {
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
  ] = await Promise.all([
    api("/api/pcp/overview"),
    api("/api/pcp/alerts"),
    api("/api/pcp/romaneios"),
    api("/api/pcp/romaneios-kanban"),
    api("/api/pcp/structures"),
    api("/api/pcp/programming"),
    api("/api/pcp/assembly"),
    api("/api/pcp/production"),
    api("/api/pcp/purchases"),
    api("/api/pcp/recycling"),
    api("/api/pcp/costs"),
    api("/api/pcp/sources"),
    api("/api/pcp/painel"),
  ]);

  renderOverview(overview);
  renderAlerts(alerts);
  state.romaneiosApi = Array.isArray(romaneios.items) ? romaneios.items : [];
  refreshRomaneiosWorkspace();
  renderKanban(kanban);
  renderStructures(structures);
  renderProgramming(programming.items);
  renderApontamento();
  renderMrpTable("assembly-table", assembly.items);
  renderFactorySimulation(assembly.items, "assembly-lanes", 2);
  renderMrpTable("production-table", production.items);
  renderFactorySimulation(production.items, "production-lanes", 6);
  renderPurchases(purchases.items);
  renderRecycling(recycling.items);
  renderCosts(costs.items);
  renderSources(sources.items);
  renderPainel(painel.items);
  renderCockpitReports({
    overview,
    romaneios,
    kanban,
    painel: painel.items,
    alerts: alerts.items,
  });

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
configurarRomaneioIntake();

function switchTab(hash) {
  const targetId = hash.replace('#', '') || 'cockpit';
  
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
  
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => switchTab(window.location.hash));
switchTab(window.location.hash);

carregarTudo().catch((error) => {
  document.getElementById("mrp-status").textContent = "Erro de conexão: " + error.message;
});
