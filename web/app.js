const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR");

const state = {
  romaneioSelecionado: null,
};

function formatDateTime(value) {
  if (!value) {
    return "Sem previsao";
  }
  return new Date(value).toLocaleString("pt-BR");
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
  };
  return mapping[normalized] || "info";
}

async function api(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path}`);
  }
  return response.json();
}

function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function renderOverview(data) {
  const totals = data.totals;
  const cards = [
    ["Estoque atual", number.format(totals.estoque_atual), "Base consolidada do estoque util"],
    ["Necessidade romaneios", number.format(totals.necessidade_romaneios), "Demanda recebida do ERP"],
    ["Necessidade montagem", number.format(totals.necessidade_montagem), "Acabados a montar"],
    ["Necessidade producao", number.format(totals.necessidade_producao), "Intermediarios a produzir"],
    ["Necessidade compra", number.format(totals.necessidade_compra), "MP e componentes comprados"],
    ["Romaneios sem previsao", number.format(totals.romaneios_sem_previsao || 0), "Exigem tratativa operacional"],
    ["Custo total", money.format(totals.custo_estimado_total), "Estimativa da rodada atual"],
  ];

  const wrapper = document.getElementById("overview-cards");
  wrapper.innerHTML = "";
  cards.forEach(([label, value, hint]) => {
    wrapper.appendChild(
      el(`
        <div class="stat-card">
          <small>${label}</small>
          <strong>${value}</strong>
          <em>${hint}</em>
        </div>
      `),
    );
  });

  document.getElementById("snapshot-at").textContent = new Date(data.snapshot_at).toLocaleString("pt-BR");

  const critical = document.getElementById("critical-list");
  critical.innerHTML = "";
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

function renderAlerts(data) {
  const wrapper = document.getElementById("alerts-list");
  wrapper.innerHTML = "";
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

function renderRomaneios(data) {
  const wrapper = document.getElementById("romaneios-list");
  wrapper.innerHTML = "";
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

function renderMrpTable(targetId, items) {
  const tbody = document.getElementById(targetId);
  tbody.innerHTML = "";
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

function renderPurchases(items) {
  const tbody = document.getElementById("purchase-table");
  tbody.innerHTML = "";
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

function renderRecycling(items) {
  const wrapper = document.getElementById("recycling-list");
  wrapper.innerHTML = "";
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

function renderCosts(items) {
  const wrapper = document.getElementById("cost-list");
  wrapper.innerHTML = "";
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

function renderSources(items) {
  const wrapper = document.getElementById("sources-list");
  wrapper.innerHTML = "";
  items.forEach((item) => {
    const statusClass = item.freshness_status.toLowerCase();
    wrapper.appendChild(
      el(`
        <div class="list-card">
          <div class="source-row">
            <div>
              <small>${item.source_area}</small>
              <strong>${item.source_name}</strong>
              <em>${item.last_success_at ? new Date(item.last_success_at).toLocaleString("pt-BR") : "Sem carga validada"}</em>
            </div>
            <span class="tag ${statusClass}">${item.freshness_status}</span>
          </div>
        </div>
      `),
    );
  });
}

function renderPainel(items) {
  const tbody = document.getElementById("painel-table");
  tbody.innerHTML = "";
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

async function carregarRomaneio(code) {
  state.romaneioSelecionado = code;
  const detail = await api(`/api/pcp/romaneios/${code}`);
  renderRomaneioDetail(detail);
}

async function dispararMrp() {
  const response = await fetch("/api/pcp/runs/mrp", { method: "POST" });
  const payload = await response.json();
  document.getElementById("mrp-status").textContent =
    `MRP enfileirado. Run ${payload.run_id} as ${new Date(payload.queued_at).toLocaleString("pt-BR")}.`;
}

async function carregarTudo() {
  const [
    overview,
    alerts,
    romaneios,
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
  renderMrpTable("assembly-table", assembly.items);
  renderMrpTable("production-table", production.items);
  renderPurchases(purchases.items);
  renderRecycling(recycling.items);
  renderCosts(costs.items);
  renderSources(sources.items);
  renderPainel(painel.items);

  if (!state.romaneioSelecionado && romaneios.items.length) {
    await carregarRomaneio(romaneios.items[0].romaneio);
  }
}

document.getElementById("run-mrp").addEventListener("click", dispararMrp);
document.getElementById("reload-all").addEventListener("click", carregarTudo);

carregarTudo().catch((error) => {
  document.getElementById("mrp-status").textContent = error.message;
});
