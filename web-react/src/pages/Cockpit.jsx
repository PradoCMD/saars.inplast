import {
  FiAlertTriangle,
  FiClock,
  FiLayers,
  FiPackage,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi'
import StatePanel from '../components/StatePanel'

const numberFormat = new Intl.NumberFormat('pt-BR')
const moneyFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

function formatDateTime(value) {
  if (!value) return 'Sem snapshot'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getCriticalTone(level) {
  const normalized = String(level || '').toLowerCase()
  if (normalized.includes('alta')) return 'high'
  if (normalized.includes('media')) return 'warning'
  return 'ok'
}

function filterBySearch(items, searchQuery) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const haystack = [item.sku, item.produto, item.acao, item.criticidade]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

function filterSourceItems(items, searchQuery) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const haystack = [item.source_name, item.source_code, item.source_area, item.freshness_status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

function filterAlertItems(items, searchQuery) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const haystack = [item.type, item.severity, item.message, ...Object.values(item.context || {})]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

function getSourceTone(status) {
  const normalized = String(status || '').toLowerCase()
  if (['missing', 'error'].includes(normalized)) return 'high'
  if (['warning', 'stale', 'partial'].includes(normalized)) return 'warning'
  if (normalized === 'ok') return 'ok'
  return 'info'
}

function getSourceLabel(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'ok') return 'Saudável'
  if (['warning', 'stale'].includes(normalized)) return 'Stale'
  if (normalized === 'partial') return 'Parcial'
  if (normalized === 'missing') return 'Sem carga válida'
  if (normalized === 'error') return 'Falha'
  return 'Sem classificação'
}

function getAlertTone(severity) {
  const normalized = String(severity || '').toLowerCase()
  if (normalized.includes('high') || normalized.includes('critical')) return 'high'
  if (normalized.includes('warning') || normalized.includes('medium')) return 'warning'
  return 'info'
}

function getAlertLabel(severity) {
  const normalized = String(severity || '').toLowerCase()
  if (normalized.includes('high') || normalized.includes('critical')) return 'Alta severidade'
  if (normalized.includes('warning')) return 'Atenção'
  if (normalized.includes('medium')) return 'Média'
  return 'Informativo'
}

function formatAreaLabel(value) {
  return String(value || 'sem_area').replaceAll('_', ' ').trim()
}

function sortSourceItems(items) {
  return [...items].sort((left, right) => {
    const sourceOrder = { missing: 0, error: 0, warning: 1, stale: 1, partial: 2, ok: 3 }
    const orderDiff = (sourceOrder[String(left.freshness_status || '').toLowerCase()] ?? 99) -
      (sourceOrder[String(right.freshness_status || '').toLowerCase()] ?? 99)
    if (orderDiff !== 0) return orderDiff
    return String(right.last_success_at || '').localeCompare(String(left.last_success_at || ''))
  })
}

function buildSourceSummary(items) {
  return items.reduce((summary, item) => {
    const status = String(item.freshness_status || '').toLowerCase()
    if (status === 'ok') summary.ok += 1
    else if (['warning', 'stale', 'partial'].includes(status)) summary.attention += 1
    else if (['missing', 'error'].includes(status)) summary.blocked += 1
    return summary
  }, { ok: 0, attention: 0, blocked: 0 })
}

function Cockpit({ overviewState, kanbanState, sourcesState, alertsState, scopeLabel, searchQuery, stale, snapshotAt }) {
  if (overviewState.status === 'loading') {
    return (
      <StatePanel
        kind="loading"
        title="Carregando cockpit operacional"
        message="Buscando snapshot do overview, gargalos críticos e fila logística autorizada para esta sessão."
      />
    )
  }

  if (overviewState.status === 'company') {
    return (
      <StatePanel
        kind="company"
        title="Empresa obrigatória para este cockpit"
        message="Seu usuário possui múltiplas empresas. Escolha o recorte acima antes de carregar indicadores agregados."
      />
    )
  }

  if (overviewState.status === 'permission') {
    return (
      <StatePanel
        kind="permission"
        title="Seu papel não pode abrir o cockpit agregado"
        message={overviewState.error?.message || 'O backend negou a leitura do overview para a sessão atual.'}
      />
    )
  }

  if (overviewState.status === 'error') {
    return (
      <StatePanel
        kind="error"
        title="Falha ao carregar os indicadores do cockpit"
        message={overviewState.error?.message || 'Não foi possível ler o snapshot operacional atual.'}
      />
    )
  }

  const overview = overviewState.data || {}
  const rawTotals = overview.totals || {}
  const criticalItems = filterBySearch(overview.top_criticos || [], searchQuery)
  const kanbanItems = filterBySearch(kanbanState.data?.romaneios || [], searchQuery).slice(0, 4)
  const sourceItems = sortSourceItems(filterSourceItems(sourcesState.data?.items || [], searchQuery)).slice(0, 4)
  const alertItems = filterAlertItems(alertsState.data?.items || [], searchQuery).slice(0, 4)
  const sourceSummary = buildSourceSummary(sourcesState.data?.items || [])
  const highAlertCount = (alertsState.data?.items || []).filter((item) => getAlertTone(item.severity) === 'high').length
  const coverageBase = Number(rawTotals.necessidade_romaneios || 0)
  const coverageValue = coverageBase > 0
    ? Math.min(100, Math.round(((Number(rawTotals.estoque_atual || 0) / coverageBase) * 100)))
    : 100
  const missingForecastCount = Number(rawTotals.romaneios_sem_previsao || 0)
  const nextCritical = (overview.top_criticos || [])[0] || null
  const hasFilter = Boolean(String(searchQuery || '').trim())
  const integrationTone = sourceSummary.blocked || highAlertCount
    ? 'high'
    : sourceSummary.attention || alertItems.length
      ? 'warning'
      : 'ok'
  const pressureTone = missingForecastCount
    ? 'high'
    : nextCritical
      ? getCriticalTone(nextCritical.criticidade)
      : 'ok'

  const heroTitle = missingForecastCount
    ? `Ação imediata em ${missingForecastCount} romaneios sem previsão confiável.`
    : nextCritical
      ? `${nextCritical.produto} concentra a principal pressão operacional agora.`
      : 'Fluxo estabilizado com leitura clara de risco, frescor e integridade.'

  const heroDescription = stale
    ? 'O shell continua utilizável porque expõe o último snapshot válido, mas a primeira dobra agora deixa explícito que a decisão precisa de cautela até a próxima atualização oficial.'
    : 'A primeira dobra foi organizada para conduzir a decisão: escopo, snapshot, pressão imediata, gargalos e fila observada aparecem com prioridade operacional, não como cards equivalentes.'

  const alertStripItems = [
    {
      label: stale ? 'Snapshot stale but usable' : 'Snapshot recente',
      detail: stale
        ? `A leitura usa o último snapshot válido em ${formatDateTime(snapshotAt)}.`
        : `Snapshot oficial atualizado em ${formatDateTime(snapshotAt)}.`,
      tone: stale ? 'warning' : 'ok',
      icon: FiClock,
    },
    {
      label: integrationTone === 'high' ? 'Integrações em risco' : integrationTone === 'warning' ? 'Integrações em atenção' : 'Integrações estáveis',
      detail: sourceSummary.blocked
        ? `${sourceSummary.blocked} fontes bloqueadas e ${highAlertCount} alertas altos exigem verificação.`
        : sourceSummary.attention
          ? `${sourceSummary.attention} fontes degradadas seguem visíveis sem mascarar fallback.`
          : 'Sem bloqueio de fonte ou alerta central relevante neste recorte.',
      tone: integrationTone,
      icon: integrationTone === 'high' ? FiAlertTriangle : FiShield,
    },
    {
      label: pressureTone === 'high' ? 'Risco imediato' : pressureTone === 'warning' ? 'Pressão moderada' : 'Pressão controlada',
      detail: missingForecastCount
        ? `${missingForecastCount} romaneios seguem sem previsão e pedem ação manual.`
        : nextCritical
          ? `${nextCritical.sku} puxa a ação ${nextCritical.acao || 'Monitorar agora'}.`
          : 'Nenhum gargalo com urgência alta apareceu no snapshot atual.',
      tone: pressureTone,
      icon: FiTrendingUp,
    },
  ]

  const stats = [
    {
      label: 'Cobertura imediata',
      value: `${coverageValue}%`,
      hint: scopeLabel,
      tone: coverageValue >= 90 ? 'ok' : coverageValue >= 70 ? 'warning' : 'high',
    },
    {
      label: 'Demanda romaneios',
      value: numberFormat.format(rawTotals.necessidade_romaneios || 0),
      hint: 'Total puxado do ERP',
      tone: 'info',
    },
    {
      label: 'Fila de montagem',
      value: numberFormat.format(rawTotals.necessidade_montagem || 0),
      hint: 'Carga em esteiras',
      tone: rawTotals.necessidade_montagem ? 'warning' : 'ok',
    },
    {
      label: 'Fila de produção',
      value: numberFormat.format(rawTotals.necessidade_producao || 0),
      hint: 'Carga em extrusoras',
      tone: rawTotals.necessidade_producao ? 'warning' : 'ok',
    },
    {
      label: 'Custo estimado',
      value: moneyFormat.format(rawTotals.custo_estimado_total || 0),
      hint: 'Pressão total do cenário',
      tone: 'info',
    },
    {
      label: 'Sem previsão',
      value: numberFormat.format(missingForecastCount),
      hint: 'Ação manual imediata',
      tone: missingForecastCount ? 'high' : 'ok',
    },
  ]

  return (
    <div className="cockpit-page animate-in">
      <section className="cockpit-alert-strip" aria-label="Sinais operacionais do cockpit">
        {alertStripItems.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className={`cockpit-alert-card tone-${item.tone}`}>
              <div className="cockpit-alert-card-head">
                <span><Icon /></span>
                <strong>{item.label}</strong>
              </div>
              <p>{item.detail}</p>
            </article>
          )
        })}
      </section>

      <section className="cockpit-hero">
        <div className="cockpit-hero-main">
          <div className="cockpit-kicker">Orquestração do PCP</div>
          <h2>{heroTitle}</h2>
          <p>{heroDescription}</p>

          <div className="cockpit-hero-meta">
            <span>
              <FiTrendingUp />
              Escopo: <strong>{scopeLabel}</strong>
            </span>
            <span>
              <FiClock />
              Snapshot base: <strong>{formatDateTime(snapshotAt)}</strong>
            </span>
            <span className={stale ? 'text-warning' : 'text-ok'}>
              <FiAlertTriangle />
              {stale ? 'Stale but usable' : 'Dados recentes'}
            </span>
          </div>
        </div>

        <aside className="cockpit-coverage-card">
          <small>Atendimento imediato</small>
          <strong>{coverageValue}%</strong>
          <p>
            {numberFormat.format(rawTotals.estoque_atual || 0)} disponíveis para cobrir{' '}
            {numberFormat.format(rawTotals.necessidade_romaneios || 0)} unidades demandadas.
          </p>
          <div className="coverage-bar">
            <span className="coverage-fill" style={{ width: `${coverageValue}%` }} />
          </div>
          <div className="cockpit-coverage-notes">
            <span className={`tag ${stale ? 'warning' : 'ok'}`}>{stale ? 'Último snapshot válido' : 'Snapshot recente'}</span>
            <span className={`tag ${integrationTone}`}>{integrationTone === 'high' ? 'Integração em risco' : integrationTone === 'warning' ? 'Integração em atenção' : 'Integração estável'}</span>
          </div>
        </aside>
      </section>

      <section className="metrics-grid">
        {stats.map((stat) => (
          <article key={stat.label} className={`metric-card tone-${stat.tone}`}>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
            <span>{stat.hint}</span>
          </article>
        ))}
      </section>

      <section className="cockpit-grid">
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3>Radar de gargalos</h3>
              <span>Itens com necessidade imediata, filtrados pelo snapshot oficial desta sessão.</span>
            </div>
            <span className={`tag ${criticalItems.length ? 'warning' : 'ok'}`}>{criticalItems.length} itens</span>
          </div>

          <div className="critical-list">
            {criticalItems.length ? criticalItems.map((item) => (
              <article key={item.sku} className="critical-card">
                <div className="critical-card-head">
                  <div>
                    <small>{item.sku}</small>
                    <strong>{item.produto}</strong>
                  </div>
                  <span className={`tag ${getCriticalTone(item.criticidade)}`}>{item.criticidade}</span>
                </div>
                <div className="critical-stats">
                  <span>Saldo {numberFormat.format(item.saldo || 0)}</span>
                  <span>Demanda {numberFormat.format(item.necessidade_romaneios || 0)}</span>
                  <span>Ação {item.acao}</span>
                </div>
              </article>
            )) : (
              <StatePanel
                kind="empty"
                title={hasFilter ? 'Nenhum gargalo encontrado neste filtro' : 'Sem gargalos operacionais no snapshot'}
                message={hasFilter
                  ? 'O filtro atual não encontrou itens críticos para este recorte.'
                  : 'O snapshot atual não trouxe itens críticos puxando ação imediata.'}
                compact
              />
            )}
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3>Fila logística observada</h3>
              <span>Leitura fiel do kanban autorizado, sem mutação local e sem esconder contexto.</span>
            </div>
            <span className={`tag ${kanbanItems.length ? 'info' : 'ok'}`}>{kanbanItems.length} romaneios</span>
          </div>

          <div className="signal-list">
            {kanbanState.status === 'company' ? (
              <StatePanel
                kind="company"
                title="Kanban depende de empresa ativa"
                message="Escolha a empresa acima para visualizar a carteira logística agregada."
                compact
              />
            ) : null}

            {kanbanState.status === 'error' ? (
              <StatePanel
                kind="error"
                title="Falha ao carregar o kanban"
                message={kanbanState.error?.message}
                compact
              />
            ) : null}

            {kanbanState.status === 'ready' && kanbanItems.length ? kanbanItems.map((item) => (
              <article key={item.romaneio} className="signal-card">
                <div>
                  <small>{item.empresa || scopeLabel}</small>
                  <strong>{item.romaneio}</strong>
                </div>
                <div className="signal-card-meta">
                  <span><FiPackage /> {numberFormat.format(item.quantidade_total || 0)} un</span>
                  <span className={`tag ${String(item.previsao_saida_status || '').includes('sem') ? 'high' : 'ok'}`}>
                    {item.previsao_saida_status || 'sem status'}
                  </span>
                </div>
              </article>
            )) : null}

            {kanbanState.status === 'ready' && !kanbanItems.length ? (
              <StatePanel
                kind="empty"
                title={hasFilter ? 'Nenhum romaneio encontrado neste filtro' : 'Sem romaneios visíveis neste recorte'}
                message={hasFilter
                  ? 'O filtro atual não encontrou romaneios na fila observada.'
                  : 'A carteira logística está vazia para a empresa ativa ou o snapshot não retornou romaneios.'}
                compact
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="cockpit-grid cockpit-grid-secondary">
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3>Snapshot integrity</h3>
              <span>Saúde das fontes que sustentam a leitura central do cockpit.</span>
            </div>
            <span className={`tag ${integrationTone}`}>{sourceSummary.blocked ? 'Fallback em risco' : stale || sourceSummary.attention ? 'Stale but usable' : 'Estável'}</span>
          </div>

          <div className="source-health-list">
            {sourcesState.status === 'loading' && !sourcesState.data ? (
              <StatePanel
                kind="loading"
                title="Atualizando saúde das fontes"
                message="Buscando o frescor das integrações usadas pelo cockpit."
                compact
              />
            ) : null}

            {sourcesState.status === 'permission' ? (
              <StatePanel
                kind="permission"
                title="Fontes indisponíveis para este papel"
                message={sourcesState.error?.message || 'O backend negou a leitura das fontes para esta sessão.'}
                compact
              />
            ) : null}

            {sourcesState.status === 'error' ? (
              <StatePanel
                kind="error"
                title="Falha ao carregar fontes"
                message={sourcesState.error?.message || 'Não foi possível ler o estado atual das integrações.'}
                compact
              />
            ) : null}

            {sourcesState.status !== 'loading' && sourcesState.status !== 'permission' && sourcesState.status !== 'error' && sourceItems.length ? sourceItems.map((item) => {
              const tone = getSourceTone(item.freshness_status)
              const tagTone = tone === 'high' && String(item.freshness_status || '').toLowerCase() === 'missing' ? 'missing' : tone

              return (
                <article key={item.source_code} className={`source-card tone-${tone}`}>
                  <div className="source-card-head">
                    <div>
                      <small>{formatAreaLabel(item.source_area)}</small>
                      <strong>{item.source_name || item.source_code}</strong>
                      <p>{item.source_code}</p>
                    </div>
                    <span className={`tag ${tagTone}`}>{getSourceLabel(item.freshness_status)}</span>
                  </div>
                  <div className="source-card-meta">
                    <span>
                      <FiClock />
                      Último sucesso: {formatDateTime(item.last_success_at)}
                    </span>
                  </div>
                </article>
              )
            }) : null}

            {sourcesState.status !== 'loading' && sourcesState.status !== 'permission' && sourcesState.status !== 'error' && !sourceItems.length ? (
              <StatePanel
                kind="empty"
                title={hasFilter ? 'Nenhuma fonte encontrada neste filtro' : 'Sem fontes visíveis no cockpit'}
                message={hasFilter
                  ? 'O filtro atual não encontrou fontes nem estados de frescor correspondentes.'
                  : 'O backend não retornou fontes monitoradas para o cockpit atual.'}
                compact
              />
            ) : null}
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3>Alertas centrais</h3>
              <span>Sinais de integração e qualidade que devem influenciar a decisão imediata.</span>
            </div>
            <span className={`tag ${highAlertCount ? 'high' : alertItems.length ? 'warning' : 'ok'}`}>
              {highAlertCount ? `${highAlertCount} altas` : `${alertItems.length} visíveis`}
            </span>
          </div>

          <div className="alerts-list">
            {alertsState.status === 'loading' && !alertsState.data ? (
              <StatePanel
                kind="loading"
                title="Atualizando alertas"
                message="Buscando sinais centrais ligados ao panorama atual."
                compact
              />
            ) : null}

            {alertsState.status === 'permission' ? (
              <StatePanel
                kind="permission"
                title="Alertas indisponíveis para este papel"
                message={alertsState.error?.message || 'O backend negou a leitura dos alertas desta sessão.'}
                compact
              />
            ) : null}

            {alertsState.status === 'error' ? (
              <StatePanel
                kind="error"
                title="Falha ao carregar alertas"
                message={alertsState.error?.message || 'Não foi possível ler os alertas centrais do backend.'}
                compact
              />
            ) : null}

            {alertsState.status !== 'loading' && alertsState.status !== 'permission' && alertsState.status !== 'error' && alertItems.length ? alertItems.map((item, index) => (
              <article key={`${item.type}-${item.message}-${index}`} className={`alert-card tone-${getAlertTone(item.severity)}`}>
                <div className="alert-card-head">
                  <strong>{item.message}</strong>
                  <span className={`tag ${getAlertTone(item.severity)}`}>{getAlertLabel(item.severity)}</span>
                </div>
                <small>{String(item.type || 'alerta').toUpperCase()}</small>
                {item.context ? (
                  <p>
                    {Object.entries(item.context)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' · ')}
                  </p>
                ) : null}
              </article>
            )) : null}

            {alertsState.status !== 'loading' && alertsState.status !== 'permission' && alertsState.status !== 'error' && !alertItems.length ? (
              <StatePanel
                kind="empty"
                title={hasFilter ? 'Nenhum alerta encontrado neste filtro' : 'Sem alertas centrais neste recorte'}
                message={hasFilter
                  ? 'O filtro atual não encontrou alertas ou sinais centrais correspondentes.'
                  : 'Não há alertas ativos no snapshot atual para este recorte.'}
                compact
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Cockpit
