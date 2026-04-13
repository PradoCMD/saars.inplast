import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import {
  FiActivity,
  FiAlertTriangle,
  FiClock,
  FiLayers,
  FiSettings,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi'
import { DonutGauge, Sparkline } from '../components/OperationsCharts'
import StatePanel from '../components/StatePanel'
import { buildApiPath, createResourceState, getErrorKind, requestJson } from '../lib/api'
import {
  buildResourceAliasLookup,
  filterBySearch,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
  formatInteger,
  formatPercent,
  getEventLabel,
  groupBy,
  latestEntriesByMachine,
  machineLabel,
  normalizeMachineCode,
  safeNumber,
  sumBy,
  toneFromCriticality,
  toneFromEventType,
} from '../lib/operations'

import './OperationsWorkspace.css'

const MODE_META = {
  assembly: {
    family: 'assembly',
    kicker: 'Montagem conectada',
    summaryLabel: 'linhas',
    chartTone: 'ok',
    honesty: 'Leitura fiel da fila de montagem com agenda materializada por linha.',
  },
  production: {
    family: 'production',
    kicker: 'Produção OEM',
    summaryLabel: 'famílias',
    chartTone: 'info',
    honesty: 'Portfólio executivo de produção com backlog, máquina e pressão OEM em uma única leitura.',
  },
  injection: {
    family: 'injecao',
    kicker: 'Injeção premium',
    summaryLabel: 'injetoras',
    chartTone: 'info',
    honesty: 'Malha real de programação, catálogo de máquina e apontamento recente por recurso.',
  },
  extrusion: {
    family: 'extrusao',
    kicker: 'Extrusão derivada',
    summaryLabel: 'extrusoras',
    chartTone: 'warning',
    honesty: 'Janela sugerida a partir do backlog autenticado, sem fingir sensor ou telemetria que o contrato ainda não entrega.',
  },
}

function buildDefaultMachineCodes(type) {
  if (type === 'assembly') return ['LINHA-01', 'LINHA-02']
  if (type === 'extrusion') return Array.from({ length: 6 }, (_, index) => `EXTR-${String(index + 1).padStart(2, '0')}`)
  return Array.from({ length: 6 }, (_, index) => `INJ-${String(index + 1).padStart(2, '0')}`)
}

function getQueueFields(item) {
  return [
    item.sku,
    item.produto,
    item.criticidade,
    item.product_type,
    item.acao,
  ]
}

function getProgrammingFields(item) {
  return [
    item.sku,
    item.produto,
    item.action,
    item.assembly_line_code,
    item.workstation_code,
    item.notes,
  ]
}

function demandValue(item) {
  return safeNumber(
    item.net_required
    ?? item.necessidade_producao
    ?? item.necessidade_romaneios
    ?? Math.abs(item.saldo),
  )
}

function stockValue(item) {
  return safeNumber(item.stock_available ?? item.estoque_atual)
}

function buildSuggestedLanes(queueItems, laneCodes) {
  const lanes = laneCodes.map((code) => ({
    code,
    jobs: [],
    totalDemand: 0,
    weightedHours: 0,
  }))

  const sortedItems = [...queueItems].sort((left, right) => demandValue(right) - demandValue(left))

  sortedItems.forEach((item) => {
    const targetLane = lanes.reduce((current, candidate) => (
      candidate.weightedHours < current.weightedHours ? candidate : current
    ))
    const weightedHours = Math.max(1, Math.round(demandValue(item) / 240))

    targetLane.jobs.push({
      sku: item.sku,
      produto: item.produto,
      criticidade: item.criticidade,
      demand: demandValue(item),
      stock: stockValue(item),
      weightedHours,
    })
    targetLane.totalDemand += demandValue(item)
    targetLane.weightedHours += weightedHours
  })

  return lanes
}

function buildProgrammingLanes(programmingItems, type, aliasLookup) {
  const groups = groupBy(programmingItems, (item) => {
    if (type === 'assembly') return item.assembly_line_code || item.workstation_code || 'LINHA-SEM'
    return normalizeMachineCode(item.assembly_line_code || item.workstation_code || '', aliasLookup) || 'MAQ-SEM'
  })

  return Object.entries(groups).map(([code, items]) => ({
    code,
    jobs: [...items].sort((left, right) => safeNumber(left.sequence_rank) - safeNumber(right.sequence_rank)),
    totalDemand: sumBy(items, (item) => item.quantity_planned),
  }))
}

function buildMachineCards(type, machineCodes, resourceCatalog, latestLogs, programmingItems) {
  const cards = machineCodes.map((machineCode) => {
    const normalizedMachine = String(machineCode || '').trim().toUpperCase()
    const latestLog = latestLogs.get(normalizedMachine) || null
    const plannedItems = programmingItems.filter((item) => {
      const itemMachine = String(item.machine_code || item.assembly_line_code || item.workstation_code || '').trim().toUpperCase()
      return itemMachine === normalizedMachine
    })
    const resource = resourceCatalog.find((item) => String(item.code || '').trim().toUpperCase() === normalizedMachine)
    const machineFamily = type === 'extrusion' ? 'extrusao' : type === 'assembly' ? 'assembly' : 'injecao'
    const label = machineFamily === 'extrusao'
      ? machineLabel(normalizedMachine.replace('INJ-', 'EXTR-'), machineFamily)
      : machineLabel(resource?.code || normalizedMachine, machineFamily)

    return {
      code: normalizedMachine,
      label,
      plannedCount: plannedItems.length,
      latestLog,
      tone: latestLog ? toneFromEventType(latestLog.event_type) : plannedItems.length ? 'info' : 'warning',
      detail: latestLog
        ? `${getEventLabel(latestLog.event_type)} · ${latestLog.operator || 'Sem operador'}`
        : plannedItems.length
          ? `${plannedItems.length} slot(s) programados para esta célula.`
          : 'Sem leitura recente de execução nesta máquina.',
    }
  })

  return cards
}

function FactorySimulator({
  title,
  description,
  type,
  accessToken,
  onUnauthorizedSession,
  selectedCompany,
  companySelectionRequired,
  searchQuery,
  reloadKey,
  scopeLabel,
}) {
  const meta = MODE_META[type] || MODE_META.production
  const [resources, setResources] = useState({
    queue: createResourceState('loading'),
    programming: createResourceState('idle'),
    painel: createResourceState(companySelectionRequired ? 'company' : 'idle'),
    rules: createResourceState('idle'),
    logs: createResourceState('idle'),
  })

  const handleUnauthorized = useEffectEvent((message) => {
    onUnauthorizedSession?.(message)
  })

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    async function loadModule() {
      setResources((current) => ({
        queue: createResourceState('loading', current.queue.data, null),
        programming: createResourceState('loading', current.programming.data, null),
        painel: companySelectionRequired
          ? createResourceState('company', current.painel.data, null)
          : createResourceState('loading', current.painel.data, null),
        rules: createResourceState('loading', current.rules.data, null),
        logs: createResourceState('loading', current.logs.data, null),
      }))

      const nextResources = {}
      const queuePath = type === 'assembly' ? '/api/pcp/assembly' : '/api/pcp/production'
      const programmingPath = type === 'assembly'
        ? '/api/pcp/programming?action=montar'
        : '/api/pcp/programming?action=produzir'

      const requestResource = async (key, path) => {
        try {
          const data = await requestJson(path, {
            accessToken,
            onUnauthorized: handleUnauthorized,
          })
          nextResources[key] = createResourceState('ready', data, null)
        } catch (error) {
          nextResources[key] = createResourceState(getErrorKind(error), null, error)
        }
      }

      await Promise.all([
        requestResource('queue', queuePath),
        requestResource('programming', programmingPath),
        requestResource('rules', '/api/pcp/production-rules'),
        requestResource('logs', '/api/pcp/apontamento/logs'),
        companySelectionRequired
          ? Promise.resolve().then(() => {
              nextResources.painel = createResourceState(
                'company',
                null,
                new Error('Selecione uma empresa para carregar a pressão OEM nesta malha operacional.'),
              )
            })
          : requestResource('painel', buildApiPath('/api/pcp/painel', selectedCompany || '')),
      ])

      if (cancelled) return
      setResources((current) => ({ ...current, ...nextResources }))
    }

    loadModule()

    return () => {
      cancelled = true
    }
  }, [accessToken, companySelectionRequired, reloadKey, selectedCompany, type])

  const queueItems = useMemo(() => resources.queue.data?.items || [], [resources.queue.data])
  const programmingItems = useMemo(() => resources.programming.data?.items || [], [resources.programming.data])
  const panelItems = useMemo(() => resources.painel.data?.items || [], [resources.painel.data])
  const rulesData = useMemo(() => resources.rules.data || { items: [], resource_catalog: [] }, [resources.rules.data])
  const logsData = useMemo(() => resources.logs.data?.items || [], [resources.logs.data])

  const filteredQueueItems = useMemo(
    () => filterBySearch(queueItems, searchQuery, getQueueFields),
    [queueItems, searchQuery],
  )
  const filteredProgrammingItems = useMemo(
    () => filterBySearch(programmingItems, searchQuery, getProgrammingFields),
    [programmingItems, searchQuery],
  )
  const filteredPanelItems = useMemo(
    () => filterBySearch(panelItems, searchQuery, getQueueFields),
    [panelItems, searchQuery],
  )

  const resourceCatalog = useMemo(() => rulesData.resource_catalog || [], [rulesData])
  const aliasLookup = useMemo(() => buildResourceAliasLookup(resourceCatalog), [resourceCatalog])
  const latestLogs = useMemo(() => latestEntriesByMachine(logsData, aliasLookup), [aliasLookup, logsData])
  const backlogItems = filteredPanelItems.length ? filteredPanelItems : filteredQueueItems
  const criticalBacklog = [...backlogItems]
    .sort((left, right) => demandValue(right) - demandValue(left))
    .slice(0, 6)

  const defaultMachineCodes = useMemo(() => buildDefaultMachineCodes(type), [type])
  const plannedLanes = useMemo(() => {
    if (type === 'extrusion') return buildSuggestedLanes(filteredQueueItems, defaultMachineCodes)
    if (type === 'production') return buildSuggestedLanes(filteredQueueItems, defaultMachineCodes)
    return buildProgrammingLanes(filteredProgrammingItems, type, aliasLookup)
  }, [aliasLookup, defaultMachineCodes, filteredProgrammingItems, filteredQueueItems, type])

  const machineCards = useMemo(() => {
    if (type === 'extrusion') {
      return plannedLanes.map((lane) => ({
        code: lane.code,
        label: machineLabel(lane.code, 'extrusao'),
        plannedCount: lane.jobs.length,
        latestLog: null,
        tone: lane.jobs.length > 2 ? 'warning' : lane.jobs.length ? 'info' : 'ok',
        detail: lane.jobs.length
          ? `${lane.jobs.length} janela(s) sugerida(s) · ${lane.weightedHours} h equivalentes`
          : 'Extrusora sem sugestão neste recorte.',
      }))
    }

    const catalogCodes = resourceCatalog.length
      ? resourceCatalog.map((item) => item.code)
      : defaultMachineCodes

    return buildMachineCards(
      type,
      catalogCodes,
      resourceCatalog,
      latestLogs,
      filteredProgrammingItems.map((item) => ({
        ...item,
        machine_code: normalizeMachineCode(item.assembly_line_code || item.workstation_code, aliasLookup),
      })),
    )
  }, [aliasLookup, defaultMachineCodes, filteredProgrammingItems, latestLogs, plannedLanes, resourceCatalog, type])

  const totalDemand = sumBy(filteredQueueItems, (item) => demandValue(item))
  const totalStock = sumBy(filteredQueueItems, (item) => stockValue(item))
  const totalCost = sumBy(filteredQueueItems, (item) => safeNumber(item.estimated_total_cost))
  const readyCoverage = filteredQueueItems.length
    ? Math.round((filteredQueueItems.filter((item) => stockValue(item) >= demandValue(item)).length / filteredQueueItems.length) * 100)
    : 100
  const machineCoverage = machineCards.length
    ? Math.round((machineCards.filter((item) => item.plannedCount || item.latestLog).length / machineCards.length) * 100)
    : 0
  const syncCoverage = logsData.length
    ? Math.round(((safeNumber(resources.logs.data?.summary?.synced) || 0) / Math.max(safeNumber(resources.logs.data?.summary?.total), 1)) * 100)
    : 100
  const sparklineValues = criticalBacklog.map((item) => demandValue(item))

  if (resources.queue.status === 'loading' && !resources.queue.data) {
    return (
      <StatePanel
        kind="loading"
        title={`Carregando ${title.toLowerCase()}`}
        message="Buscando fila principal, agenda vinculada, regras de máquina e sinais recentes de execução."
      />
    )
  }

  if (resources.queue.status === 'permission') {
    return (
      <StatePanel
        kind="permission"
        title={`Sem acesso a ${title.toLowerCase()}`}
        message={resources.queue.error?.message || 'O sistema bloqueou a leitura desta malha operacional.'}
      />
    )
  }

  if (resources.queue.status === 'error') {
    return (
      <StatePanel
        kind="error"
        title={`Falha ao carregar ${title.toLowerCase()}`}
        message={resources.queue.error?.message || 'A fila principal deste módulo não pôde ser lida nesta sessão.'}
      />
    )
  }

  return (
    <div className="ops-page animate-in">
      <section className="ops-hero">
        <div className="ops-hero-main">
          <span className="ops-kicker">{meta.kicker}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          <p className="ops-hint">{meta.honesty}</p>
          <div className="ops-meta-row">
            <span><FiTrendingUp /> Demanda visível: {formatCompactNumber(totalDemand)} un</span>
            <span><FiSettings /> Máquinas ou frentes: {formatInteger(machineCards.length)}</span>
            <span><FiLayers /> Escopo: {scopeLabel}</span>
          </div>
          {resources.painel.status === 'company' ? (
            <div className="shell-banner warning" style={{ marginTop: 18 }}>
              <strong>Pressão OEM exige empresa.</strong>
              <span>O backlog principal continua visível, mas a leitura de saldo crítico fica melhor quando uma empresa está definida.</span>
            </div>
          ) : null}
        </div>

        <div className="ops-hero-side">
          <small>Prontidão do módulo</small>
          <DonutGauge
            value={type === 'production' || type === 'extrusion' ? readyCoverage : machineCoverage}
            label={type === 'production' || type === 'extrusion' ? 'itens cobertos' : 'máquinas conectadas'}
            detail={type === 'production' || type === 'extrusion'
              ? 'Percentual da fila já coberta por estoque ou com leitura executiva estável.'
              : 'Percentual das máquinas com agenda explícita ou apontamento recente.'}
            tone={readyCoverage >= 70 ? 'ok' : readyCoverage >= 45 ? 'warning' : 'high'}
          />
        </div>
      </section>

      <section className="ops-highlight-grid">
        <article className="ops-stat-card">
          <small>Backlog total</small>
          <strong>{formatCompactNumber(totalDemand)}</strong>
          <p>{formatInteger(filteredQueueItems.length)} itens operacionais puxando esta visão.</p>
        </article>
        <article className="ops-stat-card">
          <small>Estoque disponível</small>
          <strong>{formatCompactNumber(totalStock)}</strong>
          <p>{formatPercent(readyCoverage)} da fila já coberta sem novo giro produtivo.</p>
        </article>
        <article className="ops-stat-card">
          <small>Custo projetado</small>
          <strong>{formatCurrency(totalCost)}</strong>
          <p>Leitura consolidada do impacto econômico nesta superfície.</p>
        </article>
        <article className="ops-stat-card">
          <small>Saúde de sync</small>
          <strong>{formatPercent(syncCoverage)}</strong>
          <p>{formatInteger(resources.logs.data?.summary?.pending_sync || 0)} apontamentos seguem pendentes.</p>
        </article>
      </section>

      <section className="ops-chart-grid">
        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Pulsação do backlog</small>
              <strong>{formatInteger(criticalBacklog.length)} itens</strong>
            </div>
            <span className={`ops-tone-pill tone-${meta.chartTone}`}>prioridade</span>
          </div>
          <Sparkline values={sparklineValues} tone={meta.chartTone} />
          <p>O gráfico sobe conforme a fila concentra demanda nos itens mais pesados do recorte atual.</p>
        </article>

        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Itens em pressão</small>
              <strong>{formatInteger(criticalBacklog.length)}</strong>
            </div>
            <span className="ops-tone-pill tone-warning">criticidade</span>
          </div>
          <div className="ops-bar-list">
            {criticalBacklog.slice(0, 4).map((item) => (
              <div key={item.sku} className="ops-bar-row">
                <header>
                  <strong>{item.sku}</strong>
                  <span>{formatCompactNumber(demandValue(item))}</span>
                </header>
                <div className="ops-bar-track">
                  <div
                    className={`ops-bar-fill tone-${toneFromCriticality(item.criticidade)}`}
                    style={{ width: `${Math.max(12, (demandValue(item) / Math.max(1, ...criticalBacklog.map((entry) => demandValue(entry)))) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Atividade recente</small>
              <strong>{formatInteger(machineCards.length)} {meta.summaryLabel}</strong>
            </div>
            <span className="ops-tone-pill tone-info">execução</span>
          </div>
          <div className="ops-bar-list">
            {machineCards.slice(0, 4).map((machine) => (
              <div key={machine.code} className="ops-bar-row">
                <header>
                  <strong>{machine.label}</strong>
                  <span>{machine.plannedCount || machine.latestLog?.time_range || '0'}</span>
                </header>
                <div className="ops-bar-track">
                  <div
                    className={`ops-bar-fill tone-${machine.tone}`}
                    style={{ width: `${Math.max(12, ((machine.plannedCount || 1) / Math.max(1, ...machineCards.map((item) => item.plannedCount || 1))) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="ops-main-grid">
        <article className="ops-board-card">
          <div className="ops-section-header">
            <div>
              <small>{type === 'extrusion' ? 'Janela sugerida' : 'Malha operacional'}</small>
              <strong>{type === 'extrusion' ? 'Extrusoras organizadas por carga equivalente' : 'Células, máquinas e sequência visível'}</strong>
            </div>
            <span className={`ops-tone-pill tone-${meta.chartTone}`}>{type === 'extrusion' ? 'derivada' : 'autenticada'}</span>
          </div>

          {!plannedLanes.length ? (
            <p className="ops-empty-note">Sem células ou janelas visíveis neste recorte.</p>
          ) : (
            <div className="ops-lanes-grid" style={{ marginTop: 18 }}>
              {plannedLanes.map((lane) => (
                <article key={lane.code} className="ops-machine-card">
                  <header>
                    <div>
                      <small>{lane.jobs.length} slot(s)</small>
                      <strong>{type === 'extrusion' ? machineLabel(lane.code, 'extrusao') : machineLabel(lane.code, meta.family)}</strong>
                    </div>
                    <span className={`ops-tone-pill tone-${lane.jobs.length > 2 ? 'warning' : lane.jobs.length ? 'info' : 'ok'}`}>
                      {formatCompactNumber(lane.totalDemand)} un
                    </span>
                  </header>
                  <p>
                    {type === 'extrusion'
                      ? `${lane.weightedHours} h equivalentes de janela sugerida a partir do backlog atual.`
                      : `Sequência operacional conectada com ${formatCompactNumber(lane.totalDemand)} unidades planejadas.`}
                  </p>
                  <div className="ops-slot-list" style={{ marginTop: 16 }}>
                    {lane.jobs.length ? lane.jobs.map((job) => (
                      <article
                        key={`${lane.code}-${job.sku}`}
                        className={`ops-slot-card tone-${toneFromCriticality(job.criticidade || job.planning_status)}`}
                      >
                        <header>
                          <div>
                            <strong>{job.sku}</strong>
                            <small>{job.produto}</small>
                          </div>
                          <span className={`ops-tone-pill tone-${toneFromCriticality(job.criticidade || job.planning_status)}`}>
                            {formatCompactNumber(job.demand || job.quantity_planned || 0)}
                          </span>
                        </header>
                        <div className="ops-item-meta">
                          {'planned_start_at' in job ? <span>{formatDateTime(job.planned_start_at)}</span> : null}
                          {'stock' in job ? <span>Estoque {formatInteger(job.stock)}</span> : null}
                          {'weightedHours' in job ? <span>{job.weightedHours} h eq.</span> : null}
                        </div>
                      </article>
                    )) : <p className="ops-empty-note">Nenhuma janela distribuída nesta célula.</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <div className="ops-list">
          <article className="ops-card">
            <div className="ops-section-header">
              <div>
                <small>Decisão imediata</small>
                <strong>Itens que puxam a gestão do OEM</strong>
              </div>
              <span className="ops-tone-pill tone-warning">agir agora</span>
            </div>
            <div className="ops-list" style={{ marginTop: 16 }}>
              {criticalBacklog.length ? criticalBacklog.map((item) => (
                <article key={item.sku} className={`ops-entry-card tone-${toneFromCriticality(item.criticidade)}`}>
                  <header>
                    <div>
                      <strong>{item.sku}</strong>
                      <small>{item.acao || item.product_type || 'produção'}</small>
                    </div>
                    <span className={`ops-tone-pill tone-${toneFromCriticality(item.criticidade)}`}>
                      {item.criticidade || 'Monitorar'}
                    </span>
                  </header>
                  <p>{item.produto}</p>
                  <div className="ops-item-meta">
                    <span>Demanda {formatInteger(demandValue(item))}</span>
                    <span>Estoque {formatInteger(stockValue(item))}</span>
                  </div>
                </article>
              )) : <p className="ops-empty-note">Sem backlog relevante neste recorte.</p>}
            </div>
          </article>

          <article className="ops-card">
            <div className="ops-section-header">
              <div>
                <small>Máquinas e sinais</small>
                <strong>Leitura rápida de célula</strong>
              </div>
              <span className="ops-tone-pill tone-info">campo</span>
            </div>
            <div className="ops-machine-stack">
              {machineCards.map((machine) => (
                <article key={machine.code} className={`ops-machine-row tone-${machine.tone}`}>
                  <header>
                    <div>
                      <strong>{machine.label}</strong>
                      <small>{machine.code}</small>
                    </div>
                    <span className={`ops-tone-pill tone-${machine.tone}`}>
                      {machine.latestLog ? getEventLabel(machine.latestLog.event_type) : 'Sem log'}
                    </span>
                  </header>
                  <p>{machine.detail}</p>
                  <div className="ops-machine-meta">
                    <span><FiActivity /> {machine.plannedCount} slot(s)</span>
                    {machine.latestLog?.created_at ? <span><FiClock /> {formatDateTime(machine.latestLog.created_at)}</span> : null}
                    {machine.latestLog?.operator ? <span><FiZap /> {machine.latestLog.operator}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

export default FactorySimulator
