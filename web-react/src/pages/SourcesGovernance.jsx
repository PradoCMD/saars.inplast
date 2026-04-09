import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiLock,
  FiRefreshCw,
  FiShield,
} from 'react-icons/fi'
import CommandDeck from '../components/CommandDeck'
import StatePanel from '../components/StatePanel'

const STATUS_PRIORITY = {
  missing: 0,
  error: 0,
  warning: 1,
  stale: 1,
  partial: 2,
  ok: 3,
}

const SNAPSHOT_STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000

function formatDateTime(value) {
  if (!value) return 'Sem snapshot válido'
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

function formatAreaLabel(value) {
  return String(value || 'sem_area')
    .replaceAll('_', ' ')
    .trim()
}

function isTimestampStale(value) {
  if (!value) return true
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return true
  return (Date.now() - date.getTime()) > SNAPSHOT_STALE_THRESHOLD_MS
}

function getSourceTone(status) {
  const normalized = String(status || '').toLowerCase()
  if (['missing', 'error'].includes(normalized)) return 'high'
  if (['warning', 'stale', 'partial'].includes(normalized)) return 'warning'
  if (normalized === 'ok') return 'ok'
  return 'info'
}

function getSourceStatusLabel(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'ok') return 'Saudável'
  if (['warning', 'stale'].includes(normalized)) return 'Stale'
  if (normalized === 'partial') return 'Parcial'
  if (normalized === 'missing') return 'Sem carga válida'
  if (normalized === 'error') return 'Erro'
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

function filterSources(items, searchQuery) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => (
    [item.source_name, item.source_code, item.source_area, item.freshness_status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  ))
}

function filterAlerts(items, searchQuery) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => (
    [item.type, item.severity, item.message, ...Object.values(item.context || {})]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  ))
}

function sortSources(items) {
  return [...items].sort((left, right) => {
    const priorityDiff = (STATUS_PRIORITY[String(left.freshness_status || '').toLowerCase()] ?? 99) -
      (STATUS_PRIORITY[String(right.freshness_status || '').toLowerCase()] ?? 99)
    if (priorityDiff !== 0) return priorityDiff
    return String(right.last_success_at || '').localeCompare(String(left.last_success_at || ''))
  })
}

function buildSummary(items) {
  return items.reduce((summary, item) => {
    const status = String(item.freshness_status || '').toLowerCase()
    if (status === 'ok') summary.ok += 1
    else if (['warning', 'stale', 'partial'].includes(status)) summary.attention += 1
    else if (['missing', 'error'].includes(status)) summary.blocked += 1
    return summary
  }, { ok: 0, attention: 0, blocked: 0 })
}

function buildSourceGroups(items) {
  const groups = [
    {
      id: 'blocked',
      title: 'Fontes bloqueadas',
      description: 'Fontes sem carga válida, missing ou erro explícito do contrato atual.',
      tone: 'high',
      items: [],
    },
    {
      id: 'attention',
      title: 'Fontes em atenção',
      description: 'Fontes com stale, warning ou partial que ainda deixam a operação em cautela.',
      tone: 'warning',
      items: [],
    },
    {
      id: 'healthy',
      title: 'Fontes saudáveis',
      description: 'Fontes estáveis na leitura atual, sem sinal de degradação relevante.',
      tone: 'ok',
      items: [],
    },
  ]

  items.forEach((item) => {
    const tone = getSourceTone(item.freshness_status)
    if (tone === 'high') groups[0].items.push(item)
    else if (tone === 'warning') groups[1].items.push(item)
    else groups[2].items.push(item)
  })

  return groups
}

function renderSourceCard(item, canSyncSources, onSyncSources, syncBusy) {
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
        <span className={`tag ${tagTone}`}>{getSourceStatusLabel(item.freshness_status)}</span>
      </div>

      <div className="source-card-meta">
        <span>
          <FiClock />
          Último snapshot válido: {formatDateTime(item.last_success_at)}
        </span>
        {canSyncSources ? (
          <button
            type="button"
            className="btn btn-secondary source-sync-button"
            onClick={() => onSyncSources(item.source_code)}
            disabled={syncBusy}
          >
            <FiRefreshCw className={syncBusy ? 'spin' : ''} />
            Sincronizar esta fonte
          </button>
        ) : (
          <span>
            <FiLock />
            Leitura segura por papel
          </span>
        )}
      </div>
    </article>
  )
}

function SourcesGovernance({
  resourceState,
  alertsState,
  scopeLabel,
  searchQuery,
  canSyncSources,
  onSyncSources,
  syncBusy,
}) {
  if (resourceState.status === 'loading' && !resourceState.data) {
    return (
      <StatePanel
        kind="loading"
        title="Carregando governança de fontes"
        message="Buscando saúde das integrações, último snapshot válido e alertas centrais do shell oficial."
      />
    )
  }

  if (resourceState.status === 'permission') {
    return (
      <StatePanel
        kind="permission"
        title="Seu papel não pode abrir a governança de fontes"
        message={resourceState.error?.message || 'O backend negou a leitura das fontes para a sessão atual.'}
      />
    )
  }

  if (resourceState.status === 'error') {
    return (
      <StatePanel
        kind="error"
        title="Falha ao carregar a governança de fontes"
        message={resourceState.error?.message || 'Não foi possível ler o estado atual das integrações monitoradas.'}
      />
    )
  }

  const allSources = Array.isArray(resourceState.data?.items) ? resourceState.data.items : []
  const allAlerts = Array.isArray(alertsState.data?.items) ? alertsState.data.items : []
  const sourceSummary = buildSummary(allSources)
  const filteredSources = sortSources(filterSources(allSources, searchQuery))
  const filteredAlerts = filterAlerts(allAlerts, searchQuery)
  const highAlertCount = allAlerts.filter((item) => getAlertTone(item.severity) === 'high').length
  const latestSuccess = sortSources(allSources.filter((item) => item.last_success_at))[0]?.last_success_at || ''
  const snapshotStale = isTimestampStale(latestSuccess)
  const groupedSources = buildSourceGroups(filteredSources)
  const degradedCount = sourceSummary.attention + sourceSummary.blocked
  const criticalTone = sourceSummary.blocked || highAlertCount
    ? 'high'
    : sourceSummary.attention || allAlerts.length || snapshotStale
      ? 'warning'
      : 'ok'
  const integrityCards = [
    {
      label: 'Último snapshot válido',
      value: formatDateTime(latestSuccess),
      detail: snapshotStale
        ? 'A leitura atual depende do último snapshot válido disponível.'
        : 'A leitura atual ainda está dentro da janela operacional esperada.',
      tone: snapshotStale ? 'warning' : 'ok',
      icon: FiClock,
    },
    {
      label: 'Modo de leitura',
      value: sourceSummary.blocked
        ? 'Fallback em risco'
        : sourceSummary.attention || snapshotStale
          ? 'Stale but usable'
          : 'Snapshot atual',
      detail: sourceSummary.blocked
        ? 'Existem integrações bloqueadas; a operação deve tratar os painéis como degradados.'
        : sourceSummary.attention || snapshotStale
          ? 'A operação continua legível, mas com cautela explícita até nova sincronização.'
          : 'Fontes sem degradação relevante para esta rodada.',
      tone: criticalTone,
      icon: FiLayers,
    },
    {
      label: 'Confiabilidade',
      value: `${sourceSummary.ok} seguras / ${degradedCount} degradadas`,
      detail: degradedCount
        ? 'A UI rastreia o que segue confiável versus o que precisa de intervenção.'
        : 'Todas as fontes visíveis estão estáveis nesta leitura.',
      tone: degradedCount ? 'warning' : 'ok',
      icon: degradedCount ? FiAlertTriangle : FiCheckCircle,
    },
    {
      label: 'Escopo do shell',
      value: scopeLabel,
      detail: 'A saúde das fontes é transversal ao produto, mesmo quando o shell está em empresa específica.',
      tone: 'info',
      icon: FiShield,
    },
  ]
  const moduleImpactItems = [
    {
      label: 'Impacta cockpit',
      value: sourceSummary.blocked
        ? 'Decisão em cautela'
        : sourceSummary.attention || snapshotStale
          ? 'Cobertura com cautela'
          : 'Cobertura estável',
      detail: sourceSummary.blocked
        ? 'Cobertura, custo e gargalos da empresa podem oscilar até nova carga válida das integrações críticas.'
        : sourceSummary.attention || snapshotStale
          ? 'O cockpit continua utilizável, mas a empresa ativa deve ler pressão e cobertura como snapshot em cautela.'
          : 'Os indicadores por empresa seguem apoiados em uma base estável nesta leitura.',
      tone: sourceSummary.blocked ? 'high' : sourceSummary.attention || snapshotStale ? 'warning' : 'ok',
    },
    {
      label: 'Impacta kanban',
      value: sourceSummary.blocked || snapshotStale
        ? 'Fila com exceções'
        : sourceSummary.attention
          ? 'Datas em cautela'
          : 'Fila confiável',
      detail: sourceSummary.blocked || snapshotStale
        ? 'A fila oficial segue legível, mas previsões e carteira precisam ser tratadas como leitura de cautela.'
        : sourceSummary.attention
          ? 'Kanban continua honesto, porém a origem da previsão pede acompanhamento até nova atualização.'
          : 'A fila oficial mantém leitura segura de previsão e exceção nesta rodada.',
      tone: sourceSummary.blocked || snapshotStale ? 'high' : sourceSummary.attention ? 'warning' : 'ok',
    },
    {
      label: 'Impacta romaneios',
      value: sourceSummary.blocked || highAlertCount
        ? 'Detalhe oficial em cautela'
        : sourceSummary.attention
          ? 'Previsão observada'
          : 'Source of truth estável',
      detail: sourceSummary.blocked || highAlertCount
        ? 'O detalhe oficial continua sendo a fonte de verdade, mas previsão e disponibilidade devem ser lidas com cautela explícita.'
        : sourceSummary.attention
          ? 'O consolidado continua oficial, porém a interpretação da previsão exige mais atenção operacional.'
          : 'Lista oficial, detalhe consolidado e eventos seguem coerentes com a leitura transversal atual.',
      tone: sourceSummary.blocked || highAlertCount ? 'warning' : sourceSummary.attention ? 'info' : 'ok',
    },
  ]

  return (
    <div className="sources-page animate-in">
      <section className="sources-integrity-strip" aria-label="Integridade do snapshot">
        {integrityCards.map((card) => {
          const Icon = card.icon

          return (
            <article key={card.label} className={`sources-integrity-card tone-${card.tone}`}>
              <span className="sources-integrity-icon"><Icon /></span>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          )
        })}
      </section>

      <section className="sources-hero">
        <div className="sources-hero-main">
          <div className="cockpit-kicker">Governança de Fontes</div>
          <h2>
            {sourceSummary.blocked
              ? 'Snapshot degradado exige ação sobre integrações críticas.'
              : sourceSummary.attention || snapshotStale
                ? 'Leitura ainda utilizável, mas com fallback explícito e cautela.'
                : 'Integridade estável para operar com confiança no shell oficial.'}
          </h2>
          <p>
            Esta superfície deixa claro quando o shell lê um snapshot atual e quando depende do último snapshot
            válido disponível. Em vez de esconder stale, partial ou missing, ela separa o que continua seguro do
            que precisa de sincronização ou investigação.
          </p>

          <div className="cockpit-hero-meta">
            <span>
              <FiShield />
              Escopo visível: <strong>{scopeLabel}</strong>
            </span>
            <span>
              <FiClock />
              Snapshot base: <strong>{formatDateTime(latestSuccess)}</strong>
            </span>
            <span className={criticalTone === 'ok' ? 'text-ok' : 'text-warning'}>
              <FiAlertTriangle />
              {criticalTone === 'ok' ? 'Sem bloqueios críticos' : 'Integrações em atenção'}
            </span>
          </div>
        </div>

        <aside className="glass-panel sources-hero-side">
          <small>Prioridade imediata</small>
          <strong>
            {sourceSummary.blocked
              ? `${sourceSummary.blocked} bloqueios`
              : sourceSummary.attention
                ? `${sourceSummary.attention} fontes degradadas`
                : snapshotStale
                  ? 'Stale but usable'
                  : 'Fluxo sob controle'}
          </strong>
          <p>
            {sourceSummary.blocked
              ? 'Existem fontes sem carga válida ou com falha explícita. A operação deve usar o snapshot atual com cautela e rastrear a revalidação.'
              : sourceSummary.attention || snapshotStale
                ? 'Há atraso ou frescor degradado. O shell continua útil, mas o fallback precisa ficar visível para a tomada de decisão.'
                : 'As fontes monitoradas estão estáveis e a leitura central não apresenta degradação relevante.'}
          </p>

          <button
            type="button"
            className={`btn ${canSyncSources ? 'btn-primary' : 'btn-secondary is-blocked'}`}
            onClick={() => canSyncSources && onSyncSources()}
            disabled={!canSyncSources || syncBusy}
          >
            {canSyncSources ? <FiRefreshCw className={syncBusy ? 'spin' : ''} /> : <FiLock />}
            {syncBusy ? 'Sincronizando fontes...' : canSyncSources ? 'Sincronizar todas as fontes' : 'Sync bloqueado por papel'}
          </button>

          <span className="sources-sync-note">
            {canSyncSources
              ? 'A sincronização continua sendo ação real de backend. Use o sync por fonte abaixo quando o problema for isolado.'
              : 'Seu papel acompanha saúde e alertas, mas não pode disparar sincronização a partir desta tela.'}
          </span>
        </aside>
      </section>

      <section className="metrics-grid sources-summary-grid">
        <article className="metric-card tone-ok">
          <small>Fontes saudáveis</small>
          <strong>{sourceSummary.ok}</strong>
          <span>Fontes dentro da leitura considerada segura para esta rodada.</span>
        </article>

        <article className={`metric-card ${sourceSummary.attention ? 'tone-warning' : 'tone-info'}`}>
          <small>Fontes em atenção</small>
          <strong>{sourceSummary.attention}</strong>
          <span>Warning, stale ou partial sem mascarar o contrato do backend.</span>
        </article>

        <article className={`metric-card ${sourceSummary.blocked ? 'tone-high' : 'tone-info'}`}>
          <small>Fontes bloqueadas</small>
          <strong>{sourceSummary.blocked}</strong>
          <span>Integrações sem carga válida ou com falha explícita.</span>
        </article>

        <article className={`metric-card ${allAlerts.length ? 'tone-warning' : 'tone-ok'}`}>
          <small>Alertas ativos</small>
          <strong>{allAlerts.length}</strong>
          <span>{highAlertCount ? `${highAlertCount} em alta severidade.` : 'Sem alta severidade ativa.'}</span>
        </article>
      </section>

      <section className="sources-grid">
        <div className="sources-groups-stack">
          {filteredSources.length ? groupedSources.map((group) => (
            <div key={group.id} className={`glass-panel sources-group-panel tone-${group.tone}`}>
              <div className="panel-header">
                <div>
                  <h3>{group.title}</h3>
                  <span>{group.description}</span>
                </div>
                <span className={`tag ${group.tone}`}>{group.items.length}</span>
              </div>

              {group.items.length ? (
                <div className="source-health-list">
                  {group.items.map((item) => renderSourceCard(item, canSyncSources, onSyncSources, syncBusy))}
                </div>
              ) : (
                <StatePanel
                  kind="empty"
                  title={`Sem fontes em ${group.title.toLowerCase()}`}
                  message="Nada neste grupo para o filtro atual."
                  compact
                />
              )}
            </div>
          )) : (
            <div className="glass-panel">
              <StatePanel
                kind="empty"
                title="Nenhuma fonte encontrada neste filtro"
                message="A busca atual não encontrou fonte, área ou status correspondente."
                compact
              />
            </div>
          )}
        </div>

        <div className="sources-side-stack">
          <div className="glass-panel">
            <div className="panel-header">
              <div>
                <h3>Alertas centrais</h3>
                <span>Sinais de qualidade, BOM e origem que impactam a leitura operacional.</span>
              </div>
              <span className={`tag ${highAlertCount ? 'high' : allAlerts.length ? 'warning' : 'ok'}`}>
                {filteredAlerts.length} visíveis
              </span>
            </div>

            {alertsState.status === 'loading' && !allAlerts.length ? (
              <StatePanel
                kind="loading"
                title="Atualizando alertas"
                message="Buscando alertas centrais conectados às integrações monitoradas."
                compact
              />
            ) : null}

            {alertsState.status === 'permission' ? (
              <StatePanel
                kind="permission"
                title="Seu papel não pode abrir os alertas"
                message={alertsState.error?.message || 'O backend negou a leitura dos alertas desta sessão.'}
                compact
              />
            ) : null}

            {alertsState.status === 'error' ? (
              <StatePanel
                kind="error"
                title="Falha ao carregar alertas"
                message={alertsState.error?.message || 'Não foi possível ler os alertas centrais.'}
                compact
              />
            ) : null}

            {alertsState.status !== 'loading' && alertsState.status !== 'permission' && alertsState.status !== 'error' && filteredAlerts.length ? (
              <div className="alerts-list">
                {filteredAlerts.map((item, index) => (
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
                ))}
              </div>
            ) : null}

            {alertsState.status !== 'loading' && alertsState.status !== 'permission' && alertsState.status !== 'error' && !filteredAlerts.length ? (
              <StatePanel
                kind="empty"
                title="Sem alertas neste recorte"
                message="Não há alertas ativos para o filtro atual ou o backend não retornou sinais centrais."
                compact
              />
            ) : null}
          </div>

          <div className="glass-panel sources-contract-panel">
            <div className="panel-header">
              <div>
                <h3>Impacto nos módulos</h3>
                <span>Tradução transversal de integridade para decisão no restante do produto.</span>
              </div>
              <span className={`tag ${criticalTone}`}>{criticalTone === 'high' ? 'Transversal em risco' : criticalTone === 'warning' ? 'Transversal em cautela' : 'Transversal estável'}</span>
            </div>

            <CommandDeck items={moduleImpactItems} />

            <div className="sources-contract-list">
              <article>
                <strong>Último snapshot válido continua explícito</strong>
                <p>
                  {snapshotStale
                    ? 'O shell está apoiado no último snapshot válido disponível. Isso mantém a leitura acessível, mas com cautela explícita.'
                    : 'O snapshot base ainda está dentro da janela operacional esperada e não depende de fallback degradado.'}
                </p>
              </article>
              <article>
                <strong>Escopo do shell não redefine a saúde</strong>
                <p>
                  O badge de escopo continua visível, mas a saúde das fontes não é recortada por empresa nesta superfície. Isso evita sugerir um filtro que o backend atual não sustenta.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SourcesGovernance
