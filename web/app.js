const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR");

const state = {
  romaneioSelecionado: null,
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

  document.getElementById("snapshot-at").textContent = formatDateTimeWithFallback(
    data.snapshot_at,
    "Sem snapshot validado",
  );

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

function renderKanban(data) {
  kanbanState = data;
  redesenharKanban();
}

function redesenharKanban() {
  const wrapper = document.getElementById("kanban-wrapper");
  wrapper.innerHTML = "";

  const board = el(`<div class="kanban-board"></div>`);
  wrapper.appendChild(board);
  
  // Copia o estoque de cada produto dinamicamente
  const stock = {};
  if (kanbanState.products) {
    kanbanState.products.forEach(p => {
      stock[p.sku] = Number(p.estoque_atual) || 0;
    });
  }

  const columnsMap = {};
  if (kanbanState.romaneios) {
    kanbanState.romaneios.forEach(r => {
      // Usa a data de previsao_saida_at ou data_evento como fallback
      let rawDate = r.previsao_saida_at || r.data_evento;
      let d = rawDate ? rawDate.split('T')[0] : 'Sem Data';
      if (!columnsMap[d]) columnsMap[d] = [];
      columnsMap[d].push(r);
    });
  }

  const dates = Object.keys(columnsMap).sort();
  if (!dates.length) {
    wrapper.appendChild(emptyState("Nenhum romaneio ativo para a matriz logística."));
    return;
  }

  dates.forEach(dateLabel => {
    let headerText = 'Sem Previsão';
    if (dateLabel !== 'Sem Data') {
      const parts = dateLabel.split('-');
      headerText = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const col = el(`
      <div class="kanban-col" data-date="${dateLabel}">
        <div class="kanban-header">
          <strong>${headerText}</strong>
          <span class="pill">${columnsMap[dateLabel].length} ROMS</span>
        </div>
      </div>
    `);

    col.addEventListener("dragover", e => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", e => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const code = e.dataTransfer.getData("text/plain");
      const targetDate = col.dataset.date === 'Sem Data' ? null : col.dataset.date + 'T12:00:00-03:00';
      
      const romaneio = kanbanState.romaneios.find(r => r.romaneio === code);
      if (romaneio) {
        romaneio.previsao_saida_at = targetDate;
        redesenharKanban(); // recalculate entire timeline!
      }
    });

    columnsMap[dateLabel].forEach(r => {
      const card = el(`
        <div class="kanban-card" draggable="true" title="Arraste para mudar a data">
          <small>${r.empresa}</small>
          <strong>RM ${r.romaneio}</strong>
        </div>
      `);
      
      card.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", r.romaneio);
      });

      // Build mini table
      const table = el(`<table class="kanban-table"><thead><tr><th>SKU</th><th>QTD</th><th>SALDO INT</th></tr></thead><tbody></tbody></table>`);
      const tbody = table.querySelector('tbody');
      
      let hasItems = false;
      if (r.items) {
        r.items.forEach(item => {
          const sku = item.sku;
          const qty = Number(item.quantidade) || 0;
          
          stock[sku] = (stock[sku] || 0) - qty;
          const endStock = stock[sku];
          const cssClass = endStock < 0 ? "negative" : "positive";
          
          tbody.appendChild(el(`
            <tr>
              <td title="${item.produto}">${sku}</td>
              <td>${number.format(qty)}</td>
              <td class="${cssClass}">${number.format(endStock)}</td>
            </tr>
          `));
          hasItems = true;
        });
      }
      
      if(hasItems) card.appendChild(table);
      col.appendChild(card);
    });

    board.appendChild(col);
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
  renderMrpTable("production-table", production.items);
  renderPurchases(purchases.items);
  renderRecycling(recycling.items);
  renderCosts(costs.items);
  renderSources(sources.items);
  renderPainel(painel.items);

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
  document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
  
  const targetModule = document.getElementById(targetId);
  if (targetModule) targetModule.classList.add('active');
  
  const navLink = document.querySelector(`.nav a[href="#${targetId}"]`);
  if (navLink) navLink.classList.add('active');
  
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => switchTab(window.location.hash));
switchTab(window.location.hash);

carregarTudo().catch((error) => {
  document.getElementById("mrp-status").textContent = "Erro de conexão: " + error.message;
});
