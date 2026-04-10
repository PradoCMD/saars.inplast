import { FiAlertTriangle, FiCalendar, FiLayers, FiPackage, FiShield } from 'react-icons/fi'
import CommandDeck from '../components/CommandDeck'
import StatePanel from '../components/StatePanel'
import { getForecastOrigin } from '../lib/operationalLanguage'

const numberFormat = new Intl.NumberFormat('pt-BR')

function groupRomaneios(items) {
  const lanes = {
    missing: { id: 'missing', title: 'Sem previsão', tone: 'high', items: [] },
    today: { id: 'today', title: 'Hoje', tone: 'warning', items: [] },
    upcoming: { id: 'upcoming', title: 'Próximos dias', tone: 'info', items: [] },
    scheduled: { id: 'scheduled', title: 'Programados', tone: 'ok', items: [] },
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  items.forEach((item) => {
    const previsao = item.previsao_saida_at ? new Date(item.previsao_saida_at) : null

    if (!previsao || Number.isNaN(previsao.getTime())) {
      lanes.missing.items.push(item)
      return
    }

    const forecastDay = new Date(previsao)
    forecastDay.setHours(0, 0, 0, 0)
    const diffDays = Math.round((forecastDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

    if (diffDays <= 0) {
      lanes.today.items.push(item)
      return
    }

    if (diffDays <= 2) {
      lanes.upcoming.items.push(item)
      return
    }

    lanes.scheduled.items.push(item)
  })

  return Object.values(lanes)
}

function filterBySearch(items, searchQuery) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const haystack = [
      item.romaneio,
      item.empresa,
      item.previsao_saida_status,
      item.criterio_previsao,
      item.produto,
      ...(item.items || []).map((detail) => `${detail.sku} ${detail.produto}`),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

function formatDate(value) {
  if (!value) return 'Sem previsão'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function KanbanBoard({ resourceState, scopeLabel, searchQuery, canManageDates, onNavigate }) {
  if (resourceState.status === 'loading') {
    return (
      <StatePanel
        kind="loading"
        title="Montando o kanban logístico"
        message="Buscando romaneios autorizados e os produtos críticos usados para compor a fila."
      />
    )
  }

  if (resourceState.status === 'company') {
    return (
      <StatePanel
        kind="company"
        title="Este kanban precisa de uma empresa ativa"
        message="O backend exige `company_code` para o recorte multiempresa. Selecione uma empresa acima para continuar."
      />
    )
  }

  if (resourceState.status === 'permission') {
    return (
      <StatePanel
        kind="permission"
        title="Sem permissão para consultar o kanban"
        message={resourceState.error?.message || 'Sua sessão não foi autorizada a ler esta fila logística.'}
      />
    )
  }

  if (resourceState.status === 'error') {
    return (
      <StatePanel
        kind="error"
        title="Falha ao carregar o kanban logístico"
        message={resourceState.error?.message || 'Não foi possível consultar produtos e romaneios desta empresa.'}
      />
    )
  }

  const payload = resourceState.data || { romaneios: [], products: [] }
  const romaneios = filterBySearch(payload.romaneios || [], searchQuery)
  const products = filterBySearch(payload.products || [], searchQuery)
  const lanes = groupRomaneios(romaneios)
  const missingLane = lanes.find((lane) => lane.id === 'missing')
  const todayLane = lanes.find((lane) => lane.id === 'today')
  const forecastSummary = romaneios.reduce((summary, item) => {
    const origin = getForecastOrigin(item.previsao_saida_status, item.criterio_previsao)
    summary[origin.key] += 1
    return summary
  }, { manual: 0, automatic: 0, missing: 0 })
  const summaryCards = [
    {
      label: 'Carteira visível',
      value: `${romaneios.length} romaneios`,
      detail: 'Leitura oficial autorizada por empresa e sessão.',
      tone: 'info',
    },
    {
      label: 'Sem previsão',
      value: `${missingLane?.items.length || 0}`,
      detail: 'Itens que continuam pedindo ação manual ou definição de data.',
      tone: missingLane?.items.length ? 'warning' : 'ok',
    },
    {
      label: 'Saída imediata',
      value: `${todayLane?.items.length || 0}`,
      detail: 'Cargas para hoje ou já vencidas no recorte atual.',
      tone: todayLane?.items.length ? 'high' : 'ok',
    },
    {
      label: 'Produtos sob pressão',
      value: `${products.length}`,
      detail: canManageDates ? 'Seu papel gere a operação fora do quadro, sem drag-and-drop fake.' : 'Seu papel segue em leitura segura neste quadro.',
      tone: canManageDates ? 'info' : 'warning',
    },
  ]
  const originCards = [
    {
      label: 'Previsão automática',
      value: `${forecastSummary.automatic}`,
      detail: 'Origem ligada a estoque, heurística ou cálculo oficial do backend.',
      tone: forecastSummary.automatic ? 'info' : 'ok',
    },
    {
      label: 'Previsão manual',
      value: `${forecastSummary.manual}`,
      detail: 'Datas informadas pelo PCP, ainda exibidas sem fingir mutação no quadro.',
      tone: forecastSummary.manual ? 'warning' : 'ok',
    },
    {
      label: 'Sem previsão',
      value: `${forecastSummary.missing}`,
      detail: 'Romaneios que continuam sem critério confiável de saída.',
      tone: forecastSummary.missing ? 'high' : 'ok',
    },
  ]
  const hasFilter = Boolean(String(searchQuery || '').trim())
  const continuityItems = [
    {
      label: 'Próximo detalhe',
      value: forecastSummary.missing
        ? `${forecastSummary.missing} exigem leitura oficial`
        : 'Detalhe oficial disponível',
      detail: forecastSummary.missing
        ? 'Abra Romaneios para validar header, itens e eventos dos romaneios que seguem sem previsão confiável.'
        : 'Romaneios aprofunda a mesma linguagem de previsão e exceção já exposta no quadro.',
      tone: forecastSummary.missing ? 'high' : 'info',
      actionLabel: 'Abrir romaneios',
      actionHint: 'Detalhe oficial do backend',
      onAction: () => onNavigate?.('romaneios'),
    },
    {
      label: 'Contexto da empresa',
      value: scopeLabel,
      detail: 'Volte ao Cockpit para revisar cobertura, gargalos e pressão imediata com a mesma empresa ativa.',
      tone: 'info',
      actionLabel: 'Abrir cockpit',
      actionHint: 'Leitura contextual por empresa',
      onAction: () => onNavigate?.('cockpit'),
    },
    {
      label: 'Risco transversal',
      value: forecastSummary.missing ? 'Confirmar origem da exceção' : 'Governança disponível',
      detail: 'Abra Governança quando a exceção do quadro puder vir de frescor degradado, bloqueio de fonte ou alerta central.',
      tone: forecastSummary.missing ? 'warning' : 'info',
      actionLabel: 'Abrir governança',
      actionHint: 'Integridade transversal do shell',
      onAction: () => onNavigate?.('fontes'),
    },
  ]

  return (
    <div className="kanban-page animate-in">
      <section className="kanban-hero">
        <div>
          <span className="kanban-kicker">Kanban logístico seguro</span>
          <h2>Fila oficial por empresa, com origem da previsão explícita e protocolo read-only preservado.</h2>
          <p>
            O quadro continua fiel ao contrato autenticado. Em vez de simular movimentações, ele agora deixa
            mais claro quando a previsão é automática, quando é manual e quando o romaneio segue sem data
            confiável de saída.
          </p>
        </div>

        <div className="kanban-hero-side">
          <div>
            <small>Escopo ativo</small>
            <strong>{scopeLabel}</strong>
          </div>
          <div>
            <small>Protocolo</small>
            <strong>{canManageDates ? 'Gestão fora do quadro' : 'Somente leitura'}</strong>
          </div>
        </div>
      </section>

      <section className="kanban-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`metric-card tone-${card.tone}`}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <span>{card.detail}</span>
          </article>
        ))}
      </section>

      <section className="kanban-origin-strip" aria-label="Origem da previsão">
        {originCards.map((card) => (
          <article key={card.label} className={`kanban-origin-card tone-${card.tone}`}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="kanban-board">
        {lanes.map((lane) => (
          <article key={lane.id} className={`kanban-lane tone-${lane.tone}`}>
            <header className="kanban-lane-header">
              <div>
                <small>Carteira</small>
                <h3>{lane.title}</h3>
              </div>
              <span className="kanban-lane-count">{lane.items.length}</span>
            </header>

            <div className="kanban-lane-body">
              {lane.items.length ? lane.items.map((item) => {
                const forecastOrigin = getForecastOrigin(item.previsao_saida_status, item.criterio_previsao)
                return (
                  <article key={item.romaneio} className="kanban-card">
                    <div className="kanban-card-head">
                      <div>
                        <small>{item.empresa || scopeLabel}</small>
                        <strong>{item.romaneio}</strong>
                      </div>
                      <span className={`tag ${String(item.previsao_saida_status || '').includes('sem') ? 'high' : 'ok'}`}>
                        {item.previsao_saida_status || 'sem status'}
                      </span>
                    </div>

                    <div className="kanban-card-meta">
                      <span><FiPackage /> {numberFormat.format(item.quantidade_total || 0)} un</span>
                      <span><FiCalendar /> {formatDate(item.previsao_saida_at)}</span>
                    </div>

                    <div className="kanban-card-origin">
                      <span className={`tag ${forecastOrigin.tone}`}>{forecastOrigin.label}</span>
                      <span className="kanban-origin-copy">{forecastOrigin.detail}</span>
                    </div>

                    <div className="kanban-card-footer">
                      <span>{item.criterio_previsao || 'Sem critério informado'}</span>
                      {(item.items || []).length ? <span>{item.items.length} SKUs no romaneio</span> : null}
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary kanban-card-action"
                      onClick={() => onNavigate?.('romaneios', {
                        romaneio: item.romaneio,
                        originView: 'romaneios-kanban',
                      })}
                    >
                      Abrir detalhe oficial
                    </button>
                  </article>
                )
              }) : (
                <StatePanel
                  kind="empty"
                  title={hasFilter ? 'Sem romaneios nesta coluna para este filtro' : 'Sem romaneios nesta coluna'}
                  message={hasFilter
                    ? 'O filtro atual não encontrou itens autorizados para este estágio do fluxo.'
                    : 'Nenhum item autorizado entrou neste estágio da fila oficial.'}
                  compact
                />
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="kanban-insights-grid">
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3>Produtos sob pressão</h3>
              <span>Itens críticos que explicam a pressão do quadro logístico atual.</span>
            </div>
            <span className="tag warning">{products.length} itens</span>
          </div>

          <div className="critical-list">
            {products.length ? products.map((item) => (
              <article key={item.sku} className="critical-card">
                <div className="critical-card-head">
                  <div>
                    <small>{item.sku}</small>
                    <strong>{item.produto}</strong>
                  </div>
                  <span className={`tag ${String(item.criticidade || '').toLowerCase().includes('alta') ? 'high' : 'warning'}`}>
                    {item.criticidade || 'Monitorar'}
                  </span>
                </div>
                <div className="critical-stats">
                  <span>Saldo {numberFormat.format(item.saldo || 0)}</span>
                  <span>Necessidade {numberFormat.format(item.necessidade_romaneios || 0)}</span>
                  <span>Ação {item.acao || 'Monitorar'}</span>
                </div>
              </article>
            )) : (
              <StatePanel
                kind="empty"
                title={hasFilter ? 'Nenhum produto crítico neste filtro' : 'Nenhum produto crítico visível'}
                message={hasFilter
                  ? 'O filtro atual não encontrou produtos sob pressão.'
                  : 'A leitura autorizada não retornou itens de pressão para este recorte.'}
                compact
              />
            )}
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3>Painel de exceções</h3>
              <span>Fila oficial, origem da previsão e limites honestos do quadro logístico.</span>
            </div>
            <span className="tag info">Fonte oficial</span>
          </div>

          <div className="kanban-protocol-list">
            <article className="signal-card">
              <div>
                <small>Fonte de verdade</small>
                <strong>Fila oficial read-only</strong>
              </div>
              <span><FiShield /> O quadro continua observando a carteira oficial por empresa, sem drag fictício nem mutação local.</span>
            </article>

            <article className="signal-card">
              <div>
                <small>Origem da previsão</small>
                <strong>{forecastSummary.manual} manual / {forecastSummary.automatic} automática</strong>
              </div>
              <span><FiLayers /> Cada card agora mostra se a previsão veio de cálculo oficial, ajuste manual ou se continua sem previsão.</span>
            </article>

            <article className="signal-card">
              <div>
                <small>Exceção imediata</small>
                <strong>{forecastSummary.missing} sem previsão</strong>
              </div>
              <span><FiAlertTriangle /> Os romaneios sem previsão seguem como exceção explícita da fila, sem virar silêncio visual nem ação fake.</span>
            </article>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3>Continuidade operacional</h3>
              <span>Trilhos diretos para sair da fila e aprofundar contexto, detalhe e integridade.</span>
            </div>
            <span className="tag info">Drilldown</span>
          </div>

          <CommandDeck items={continuityItems} />
        </div>
      </section>
    </div>
  )
}

export default KanbanBoard
