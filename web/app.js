const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR");

const state = {
  romaneioSelecionado: null,
};

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

  document.getElementById("snapshot-at").textContent = formatDateTimeWithFallback(
    data.snapshot_at,
    "Sem snapshot validado",
  );

  const heroSignals = document.getElementById("hero-signals");
  heroSignals.innerHTML = "";
  const demanda = Number(totals.necessidade_romaneios) || 0;
  const estoque = Number(totals.estoque_atual) || 0;
  const coberturaImediata = demanda > 0 ? Math.round((Math.min(estoque, demanda) / demanda) * 100) : 100;
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

  const coverageMeter = document.getElementById("coverage-meter");
  const coberturaAtual = Math.min(estoque, demanda);
  const gap = Math.max(demanda - estoque, 0);
  const coberturaPct = demanda > 0 ? clamp((coberturaAtual / demanda) * 100, 0, 100) : 100;
  const gapPct = demanda > 0 ? clamp((gap / demanda) * 100, 0, 100) : 0;
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

  const critical = document.getElementById("critical-list");
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

function renderRomaneios(data) {
  const wrapper = document.getElementById("romaneios-list");
  wrapper.innerHTML = "";
  if (!data.items.length) {
    wrapper.appendChild(emptyState("Nenhum romaneio recebido ou homologado ate o momento."));
  } else {
    data.items.forEach((item) => {
      const row = el(`
        <button class="romaneio-row">
          <div>
            <small>${item.empresa}</small>
            <strong>${item.romaneio}</strong>
            <span class="muted">${number.format(item.quantidade_total)} unidades | Saida ${formatDateTime(item.previsao_saida_at)}</span>
          </div>
          <div>
            <span class="tag ${statusClass(item.previsao_saida_status)}">${item.previsao_saida_status}</span>
          </div>
        </button>
      `);
      row.addEventListener("click", () => carregarRomaneio(item.romaneio));
      wrapper.appendChild(row);
    });
  }
}

function renderRomaneioDetail(data) {
  const wrapper = document.getElementById("romaneio-detail");
  wrapper.innerHTML = "";

  const header = data.header;
  wrapper.appendChild(
    el(`
      <div class="detail-section">
        <span class="detail-pill">${header.status_evento}</span>
        <div class="detail-grid">
          <div class="detail-card">
            <small>Romaneio</small>
            <strong>${header.romaneio}</strong>
            <em>${header.empresa}</em>
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
  data.items.forEach((item) => {
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
  wrapper.appendChild(items);

  const events = el(`<div class="detail-list"></div>`);
  data.events.forEach((item) => {
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
  wrapper.appendChild(events);
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
  const detail = await api(`/api/pcp/romaneios/${code}`);
  renderRomaneioDetail(detail);
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
  renderRomaneios(romaneios);
  renderKanban(kanban);
  renderStructures(structures);
  renderProgramming(programming.items);
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

  if (!state.romaneioSelecionado && romaneios.items.length) {
    await carregarRomaneio(romaneios.items[0].romaneio);
  } else if (!romaneios.items.length) {
    document.getElementById("romaneio-detail").innerHTML = "";
    document.getElementById("romaneio-detail").appendChild(
      emptyState("Nenhum romaneio disponivel para detalhamento neste momento."),
    );
  }
}

document.getElementById("run-mrp").addEventListener("click", dispararMrp);
document.getElementById("reload-all").addEventListener("click", carregarTudo);
document.getElementById("structure-form").addEventListener("submit", salvarEstrutura);
document.getElementById("programming-form").addEventListener("submit", salvarProgramacao);

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
