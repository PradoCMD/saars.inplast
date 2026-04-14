import React from 'react'
import {
  FiAlertTriangle,
  FiClock,
  FiPackage,
  FiShield,
  FiTrendingUp,
  FiActivity,
  FiDatabase,
  FiRefreshCw
} from 'react-icons/fi'
import CommandDeck from '../components/CommandDeck'
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
  if (normalized.includes('alta') || normalized.includes('critica')) return 'high'
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

function buildSourceSummary(items) {
  return items.reduce((summary, item) => {
    const status = String(item.freshness_status || '').toLowerCase()
    if (status === 'ok') summary.ok += 1
    else if (['warning', 'stale', 'partial'].includes(status)) summary.attention += 1
    else if (['missing', 'error'].includes(status)) summary.blocked += 1
    return summary
  }, { ok: 0, attention: 0, blocked: 0 })
}

export default function Cockpit({ overviewState, kanbanState, sourcesState, alertsState, scopeLabel, searchQuery, stale, snapshotAt, onNavigate }) {
  if (overviewState.status === 'loading') {
    return (
      <StatePanel
        kind="loading"
        title="Carregando cockpit operacional"
        message="Buscando sinais vitais da produção e logística..."
      />
    )
  }

  if (overviewState.status === 'company') {
    return (
      <StatePanel
        kind="company"
        title="Contexto de Empresa Necessário"
        message="Selecione uma filial para carregar o cockpit operacional."
      />
    )
  }

  const data = overviewState.data || {}
  const allSources = sourcesState.data?.items || []
  const allAlerts = alertsState.data?.items || []
  const sourcesSummary = buildSourceSummary(allSources)
  
  // No mock data, top_criticos or critical_bottlenecks might vary
  const bottlenecks = data.top_criticos || data.critical_bottlenecks || []
  const filteredCriticals = filterBySearch(bottlenecks, searchQuery)

  return (
    <div className="cockpit-page animate-in">
      <header className="page-header premium-header">
        <div className="header-main">
          <div className="cockpit-kicker">POSTO DE COMANDO / INPLAST</div>
          <h1>Visão Geral da Operação</h1>
          <div className="cockpit-hero-meta">
            <span><FiShield /> {scopeLabel}</span>
            <span><FiClock /> Snapshot: {formatDateTime(snapshotAt)}</span>
          </div>
        </div>

        <div className="metrics-grid" style={{ marginTop: '24px' }}>
          <div className="metric-card tone-ok">
            <small>Faturamento Estimado</small>
            <strong>{moneyFormat.format(data.metrics?.revenue || data.totals?.faturamento_total || 0)}</strong>
            <span>Base romaneios ativos</span>
          </div>
          <div className="metric-card tone-info">
            <small>Volume Total PCP</small>
            <strong>{numberFormat.format(data.metrics?.volume || data.totals?.peso_total || 0)} kg</strong>
            <span>Peso em processamento</span>
          </div>
          <div className="metric-card tone-warning">
            <small>Pendências Integração</small>
            <strong>{sourcesSummary.attention + sourcesSummary.blocked}</strong>
            <span>Fontes em atraso</span>
          </div>
          <div className="metric-card tone-high">
            <small>Gargalos Críticos</small>
            <strong>{bottlenecks.length}</strong>
            <span>SKUs em risco</span>
          </div>
        </div>
      </header>

      <div className="cockpit-content-grid" style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 1fr', gap: '24px' }}>
        <section className="glass-panel" style={{ padding: '24px' }}>
          <div className="panel-header" style={{ marginBottom: '24px' }}>
            <div className="header-info">
              <h3>Gargalos e Restrições Ativas</h3>
              <span>Itens que impedem o avanço da pauta logística.</span>
            </div>
            <span className="tag high">{bottlenecks.length} Identificados</span>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produto / SKU</th>
                  <th>Causa do Gargalo</th>
                  <th>Criticidade</th>
                </tr>
              </thead>
              <tbody>
                {filteredCriticals.length ? filteredCriticals.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{item.produto}</strong>
                      <code style={{ fontSize: '11px', display: 'block', opacity: 0.6 }}>{item.sku}</code>
                    </td>
                    <td>{item.acao}</td>
                    <td>
                      <span className={`tag ${getCriticalTone(item.criticidade)}`}>
                        {item.criticidade}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" style={{ padding: '48px', textAlign: 'center', opacity: 0.5 }}>
                      Nenhum gargalo crítico detectado para o filtro atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel" style={{ padding: '24px' }}>
          <div className="panel-header" style={{ marginBottom: '24px' }}>
            <h3>Sinais de Sistema</h3>
            <span>Webhooks e Alertas</span>
          </div>

          <div className="alerts-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allAlerts.length ? allAlerts.map((alert, idx) => (
              <div key={idx} className={`alert-card tone-${alert.severity === 'high' ? 'high' : 'info'}`}>
                 <div className="alert-card-head" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{alert.message}</strong>
                 </div>
                 <small style={{ opacity: 0.6, fontSize: '10px' }}>{alert.type?.toUpperCase()}</small>
              </div>
            )) : (
              <div className="empty-state" style={{ padding: '24px', textAlign: 'center' }}>
                <FiActivity style={{ fontSize: '24px', opacity: 0.2 }} />
                <p>Nenhum sinal detectado.</p>
              </div>
            )}
          </div>

          <div className="cockpit-footer-actions" style={{ marginTop: '32px' }}>
            <button className="btn btn-secondary w-full" onClick={() => onNavigate('governanca')}>
              <FiShield /> Gerenciar Infraestrutura
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
