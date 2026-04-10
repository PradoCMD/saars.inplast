import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import {
  FiAlertTriangle,
  FiClock,
  FiLayers,
  FiPlusCircle,
  FiSend,
} from 'react-icons/fi'
import { DonutGauge, Sparkline } from '../components/OperationsCharts'
import StatePanel from '../components/StatePanel'
import { buildApiPath, createResourceState, getErrorKind, requestJson } from '../lib/api'
import {
  filterBySearch,
  formatCompactNumber,
  formatDateTime,
  formatInteger,
  formatPercent,
  getActionLabel,
  groupBy,
  hoursBetween,
  safeNumber,
  sumBy,
  toneFromCriticality,
} from '../lib/operations'

import './OperationsWorkspace.css'

const INITIAL_FORM = {
  action: 'produzir',
  sku: '',
  produto: '',
  quantity_planned: '',
  assembly_line_code: '',
  workstation_code: '',
  planned_start_at: '',
  available_at: '',
  notes: '',
}

function findTopPressureItems(panelItems) {
  return [...panelItems]
    .filter((item) => safeNumber(item.saldo) < 0)
    .sort((left, right) => Math.abs(safeNumber(right.saldo)) - Math.abs(safeNumber(left.saldo)))
    .slice(0, 6)
}

function ProgrammingCenter({
  accessToken,
  onUnauthorizedSession,
  selectedCompany,
  companySelectionRequired,
  searchQuery,
  canWrite,
  currentUser,
  reloadKey,
  scopeLabel,
}) {
  const [resources, setResources] = useState({
    programming: createResourceState('loading'),
    painel: createResourceState(companySelectionRequired ? 'company' : 'idle'),
    rules: createResourceState('idle'),
  })
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [localReloadKey, setLocalReloadKey] = useState(0)

  const handleUnauthorized = useEffectEvent((message) => {
    onUnauthorizedSession?.(message)
  })

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    async function loadResources() {
      setResources((current) => ({
        programming: createResourceState('loading', current.programming.data, null),
        painel: companySelectionRequired
          ? createResourceState('company', current.painel.data, null)
          : createResourceState('loading', current.painel.data, null),
        rules: createResourceState('loading', current.rules.data, null),
      }))

      const nextResources = {}

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
        requestResource('programming', '/api/pcp/programming'),
        companySelectionRequired
          ? Promise.resolve().then(() => {
              nextResources.painel = createResourceState(
                'company',
                null,
                new Error('Selecione uma empresa para enxergar a pressão OEM na programação.'),
              )
            })
          : requestResource('painel', buildApiPath('/api/pcp/painel', selectedCompany || '')),
        requestResource('rules', '/api/pcp/production-rules'),
      ])

      if (cancelled) return
      setResources((current) => ({ ...current, ...nextResources }))
    }

    loadResources()

    return () => {
      cancelled = true
    }
  }, [accessToken, companySelectionRequired, localReloadKey, reloadKey, selectedCompany])

  const programmingItems = useMemo(() => resources.programming.data?.items || [], [resources.programming.data])
  const panelItems = useMemo(() => resources.painel.data?.items || [], [resources.painel.data])
  const rulesItems = useMemo(() => resources.rules.data?.items || [], [resources.rules.data])
  const filteredProgramming = useMemo(
    () => filterBySearch(programmingItems, searchQuery, (item) => [
      item.sku,
      item.produto,
      item.action,
      item.assembly_line_code,
      item.workstation_code,
      item.notes,
    ]),
    [programmingItems, searchQuery],
  )

  const filteredPanelItems = useMemo(
    () => filterBySearch(panelItems, searchQuery, (item) => [
      item.sku,
      item.produto,
      item.acao,
      item.criticidade,
    ]),
    [panelItems, searchQuery],
  )

  const groupedLanes = useMemo(
    () => Object.entries(groupBy(filteredProgramming, (item) => item.assembly_line_code || item.workstation_code || 'Sem célula'))
      .map(([laneCode, items]) => ({
        laneCode,
        items: [...items].sort((left, right) => safeNumber(left.sequence_rank) - safeNumber(right.sequence_rank)),
        totalQuantity: sumBy(items, (item) => item.quantity_planned),
        averageLeadHours: items.length
          ? items.reduce((total, item) => total + hoursBetween(item.planned_start_at, item.available_at), 0) / items.length
          : 0,
      }))
      .sort((left, right) => right.totalQuantity - left.totalQuantity),
    [filteredProgramming],
  )

  const topPressureItems = useMemo(
    () => findTopPressureItems(filteredPanelItems),
    [filteredPanelItems],
  )

  const totalPlanned = sumBy(filteredProgramming, (item) => item.quantity_planned)
  const productionSlots = filteredProgramming.filter((item) => String(item.action || '').toLowerCase() === 'produzir')
  const assemblySlots = filteredProgramming.filter((item) => String(item.action || '').toLowerCase() === 'montar')
  const averageLeadHours = filteredProgramming.length
    ? filteredProgramming.reduce((total, item) => total + hoursBetween(item.planned_start_at, item.available_at), 0) / filteredProgramming.length
    : 0
  const coveragePercent = filteredProgramming.length
    ? Math.round((filteredProgramming.filter((item) => rulesItems.some((rule) => rule.sku === item.sku)).length / filteredProgramming.length) * 100)
    : 0
  const riskCount = filteredProgramming.filter((item) => item.notes || !item.workstation_code).length
  const quantityTrend = filteredProgramming.map((item) => safeNumber(item.quantity_planned))

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitBusy(true)
    setNotice(null)

    try {
      const payload = {
        ...formValues,
        sku: String(formValues.sku || '').trim().toUpperCase(),
        produto: String(formValues.produto || '').trim(),
        quantity_planned: safeNumber(formValues.quantity_planned),
        company_code: selectedCompany || undefined,
        planning_status: 'planejado',
        planning_origin: 'web_react_command_center',
      }

      if (!payload.sku || !payload.produto || payload.quantity_planned <= 0) {
        throw new Error('Preencha SKU, produto e quantidade planejada antes de salvar a nova janela.')
      }

      const response = await requestJson('/api/pcp/programming-entries', {
        method: 'POST',
        body: payload,
        accessToken,
        onUnauthorized: onUnauthorizedSession,
      })

      const acceptedAsMock = response.status === 'mock_saved'
      setNotice({
        tone: acceptedAsMock ? 'warning' : 'success',
        message: acceptedAsMock
          ? 'A entrada foi aceita pelo contrato atual, mas este ambiente ainda depende da próxima rodada oficial para materializar a fila.'
          : 'Nova janela registrada com sucesso. Recarregando a agenda.',
      })
      setFormValues(INITIAL_FORM)
      setLocalReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ tone: 'error', message: error.message || 'Não foi possível registrar a janela de programação.' })
    } finally {
      setSubmitBusy(false)
    }
  }

  if (resources.programming.status === 'loading' && !resources.programming.data) {
    return (
      <StatePanel
        kind="loading"
        title="Carregando programação premium"
        message="Buscando agenda autenticada, pressão OEM e catálogo de regras para montar a superfície de planejamento."
      />
    )
  }

  if (resources.programming.status === 'permission') {
    return (
      <StatePanel
        kind="permission"
        title="Seu papel não pode abrir a programação"
        message={resources.programming.error?.message || 'A sessão atual não possui permissão para ler a agenda de programação.'}
      />
    )
  }

  if (resources.programming.status === 'error') {
    return (
      <StatePanel
        kind="error"
        title="Falha ao carregar a programação"
        message={resources.programming.error?.message || 'Não foi possível montar a agenda do PCP nesta sessão.'}
      />
    )
  }

  return (
    <div className="ops-page animate-in">
      <section className="ops-hero">
        <div className="ops-hero-main">
          <span className="ops-kicker">Programação premium</span>
          <h2>Agenda de produção com leitura rápida de capacidade, conflito e pressão OEM.</h2>
          <p>
            Esta superfície junta a fila autenticada de programação com o portfólio pressionado do OEM e o catálogo de regras
            industriais. O objetivo não é só listar OPs, mas mostrar onde a agenda está coerente, onde está cega e qual célula
            puxa a próxima decisão.
          </p>
          <div className="ops-meta-row">
            <span><FiClock /> Horizonte ativo: {filteredProgramming.length ? formatDateTime(filteredProgramming[0].planned_start_at) : 'Sem slots'}</span>
            <span><FiLayers /> Escopo visível: {scopeLabel}</span>
            <span><FiAlertTriangle /> Riscos editoriais: {formatInteger(riskCount)}</span>
          </div>
          {resources.painel.status === 'company' ? (
            <div className="shell-banner warning" style={{ marginTop: 18 }}>
              <strong>Pressão OEM pendente de empresa.</strong>
              <span>Escolha uma empresa acima para abrir a camada de demanda e saldo dentro da programação.</span>
            </div>
          ) : null}
        </div>

        <div className="ops-hero-side">
          <small>Cobertura de regras</small>
          <DonutGauge
            value={coveragePercent}
            label="agendas com regra"
            detail="SKU com regra catalogada ganha mais confiança na leitura de célula e capacidade."
            tone={coveragePercent >= 75 ? 'ok' : coveragePercent >= 40 ? 'warning' : 'high'}
          />
        </div>
      </section>

      {notice ? (
        <div className={`shell-banner ${notice.tone || 'info'}`}>
          <strong>{notice.tone === 'success' ? 'Programação atualizada.' : notice.tone === 'warning' ? 'Atenção na persistência.' : 'Atenção operacional.'}</strong>
          <span>{notice.message}</span>
        </div>
      ) : null}

      <section className="ops-highlight-grid">
        <article className="ops-stat-card">
          <small>Slots visíveis</small>
          <strong>{formatInteger(filteredProgramming.length)}</strong>
          <p>{formatCompactNumber(totalPlanned)} unidades planejadas nesta leitura.</p>
        </article>
        <article className="ops-stat-card">
          <small>Produzir vs montar</small>
          <strong>{formatInteger(productionSlots.length)} / {formatInteger(assemblySlots.length)}</strong>
          <p>Distribuição real da agenda entre manufatura e esteiras.</p>
        </article>
        <article className="ops-stat-card">
          <small>Lead médio</small>
          <strong>{averageLeadHours.toFixed(1)} h</strong>
          <p>Janela entre início planejado e disponibilidade prometida.</p>
        </article>
        <article className="ops-stat-card">
          <small>Células ativas</small>
          <strong>{formatInteger(groupedLanes.length)}</strong>
          <p>Linhas ou postos com programação materializada neste recorte.</p>
        </article>
      </section>

      <section className="ops-chart-grid">
        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Pulsação do volume</small>
              <strong>{formatPercent(coveragePercent)}</strong>
            </div>
            <span className={`ops-tone-pill tone-${coveragePercent >= 75 ? 'ok' : coveragePercent >= 40 ? 'warning' : 'high'}`}>
              confiança
            </span>
          </div>
          <Sparkline values={quantityTrend} tone="info" />
          <p>O gráfico sobe e desce pela própria sequência planejada, ajudando a enxergar onde a agenda concentra lote pesado.</p>
        </article>

        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Mix de célula</small>
              <strong>{formatInteger(groupedLanes.length)} frentes</strong>
            </div>
            <span className="ops-tone-pill tone-info">capacidade</span>
          </div>
          <div className="ops-bar-list">
            {groupedLanes.slice(0, 4).map((lane) => (
              <div key={lane.laneCode} className="ops-bar-row">
                <header>
                  <strong>{lane.laneCode}</strong>
                  <span>{formatCompactNumber(lane.totalQuantity)} un</span>
                </header>
                <div className="ops-bar-track">
                  <div
                    className="ops-bar-fill"
                    style={{ width: `${Math.max(12, (lane.totalQuantity / Math.max(totalPlanned, lane.totalQuantity, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Pressão OEM</small>
              <strong>{formatInteger(topPressureItems.length)} itens</strong>
            </div>
            <span className="ops-tone-pill tone-warning">saldo negativo</span>
          </div>
          <div className="ops-bar-list">
            {topPressureItems.slice(0, 4).map((item) => (
              <div key={item.sku} className="ops-bar-row">
                <header>
                  <strong>{item.sku}</strong>
                  <span>{formatInteger(Math.abs(safeNumber(item.saldo)))}</span>
                </header>
                <div className="ops-bar-track">
                  <div
                    className={`ops-bar-fill tone-${toneFromCriticality(item.criticidade)}`}
                    style={{ width: `${Math.max(12, (Math.abs(safeNumber(item.saldo)) / Math.max(1, ...topPressureItems.map((entry) => Math.abs(safeNumber(entry.saldo))))) * 100)}%` }}
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
              <small>Agenda por célula</small>
              <strong>Linhas, postos e sequência real</strong>
            </div>
            <span className="ops-tone-pill tone-info">ordenação autenticada</span>
          </div>

          {!groupedLanes.length ? (
            <p className="ops-empty-note">Nenhuma janela da programação ficou visível com o filtro atual.</p>
          ) : (
            <div className="ops-lanes-grid" style={{ marginTop: 18 }}>
              {groupedLanes.map((lane) => (
                <div key={lane.laneCode} className="ops-machine-card">
                  <header>
                    <div>
                      <small>{lane.items.length} slots</small>
                      <strong>{lane.laneCode}</strong>
                    </div>
                    <span className="ops-tone-pill tone-info">{lane.averageLeadHours.toFixed(1)} h</span>
                  </header>
                  <p>
                    {formatCompactNumber(lane.totalQuantity)} unidades planejadas com leitura premium de sequência e contexto.
                  </p>
                  <div className="ops-slot-list" style={{ marginTop: 16 }}>
                    {lane.items.map((item) => (
                      <article key={item.schedule_key} className={`ops-slot-card tone-${item.notes ? 'warning' : 'ok'}`}>
                        <header>
                          <div>
                            <strong>{item.sku}</strong>
                            <small>{getActionLabel(item.action)}</small>
                          </div>
                          <span className={`ops-tone-pill tone-${item.notes ? 'warning' : toneFromCriticality(item.planning_status)}`}>
                            #{item.sequence_rank || 0}
                          </span>
                        </header>
                        <p>{item.produto}</p>
                        <div className="ops-item-meta">
                          <span>{formatDateTime(item.planned_start_at)}</span>
                          <span>{formatInteger(item.quantity_planned)} un</span>
                          <span>{item.workstation_code || 'Posto pendente'}</span>
                        </div>
                        {item.notes ? <p className="ops-hint">{item.notes}</p> : null}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <div className="ops-list">
          <article className="ops-card">
            <div className="ops-section-header">
              <div>
                <small>Radar de pressão</small>
                <strong>Itens que puxam a decisão do OEM</strong>
              </div>
              <span className="ops-tone-pill tone-warning">saldo</span>
            </div>
            <div className="ops-list" style={{ marginTop: 16 }}>
              {topPressureItems.length ? topPressureItems.map((item) => (
                <article key={item.sku} className={`ops-pressure-card tone-${toneFromCriticality(item.criticidade)}`}>
                  <header>
                    <div>
                      <strong>{item.sku}</strong>
                      <small>{item.acao}</small>
                    </div>
                    <span className={`ops-tone-pill tone-${toneFromCriticality(item.criticidade)}`}>{item.criticidade}</span>
                  </header>
                  <p>{item.produto}</p>
                  <div className="ops-item-meta">
                    <span>Saldo {formatInteger(item.saldo)}</span>
                    <span>Demanda {formatInteger(item.necessidade_romaneios)}</span>
                  </div>
                </article>
              )) : <p className="ops-empty-note">Sem itens pressionados neste recorte.</p>}
            </div>
          </article>

          <article className="ops-form-card">
            <div className="ops-section-header">
              <div>
                <small>Nova janela</small>
                <strong>Composer de programação</strong>
              </div>
              <span className={`ops-tone-pill tone-${canWrite ? 'ok' : 'warning'}`}>
                {canWrite ? 'escrita liberada' : 'somente leitura'}
              </span>
            </div>
            <p>
              Quando a escrita estiver liberada, o command center registra novas entradas de programação sem abandonar o shell.
              Se o backend responder em modo mock, a UI deixa isso explícito em vez de fingir persistência total.
            </p>

            <form onSubmit={handleSubmit} className="ops-form-grid" style={{ marginTop: 18 }}>
              <label>
                <span>Ação</span>
                <select
                  value={formValues.action}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, action: event.target.value }))}
                >
                  <option value="produzir">Produzir</option>
                  <option value="montar">Montar</option>
                </select>
              </label>

              <label>
                <span>Quantidade planejada</span>
                <input
                  value={formValues.quantity_planned}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, quantity_planned: event.target.value }))}
                  placeholder="2400"
                />
              </label>

              <label>
                <span>SKU</span>
                <input
                  value={formValues.sku}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, sku: event.target.value }))}
                  placeholder="4100006"
                />
              </label>

              <label>
                <span>Linha ou célula</span>
                <input
                  value={formValues.assembly_line_code}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, assembly_line_code: event.target.value }))}
                  placeholder="INJ-03"
                />
              </label>

              <label className="full">
                <span>Produto</span>
                <input
                  value={formValues.produto}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, produto: event.target.value }))}
                  placeholder="TAMPA ALOJAMENTO DISJUNTOR MONO PC CR"
                />
              </label>

              <label>
                <span>Posto</span>
                <input
                  value={formValues.workstation_code}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, workstation_code: event.target.value }))}
                  placeholder="MAQ-03"
                />
              </label>

              <label>
                <span>Início planejado</span>
                <input
                  type="datetime-local"
                  value={formValues.planned_start_at}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, planned_start_at: event.target.value }))}
                />
              </label>

              <label>
                <span>Disponível em</span>
                <input
                  type="datetime-local"
                  value={formValues.available_at}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, available_at: event.target.value }))}
                />
              </label>

              <label className="full">
                <span>Notas operacionais</span>
                <textarea
                  value={formValues.notes}
                  disabled={!canWrite || submitBusy}
                  onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
                  placeholder={`Entrada criada por ${currentUser?.full_name || currentUser?.username || 'PCP'}`}
                />
              </label>

              <div className="ops-form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className={`btn ${canWrite ? 'btn-primary' : 'btn-secondary'} ${!canWrite ? 'is-blocked' : ''}`} disabled={!canWrite || submitBusy}>
                  {submitBusy ? <FiClock /> : <FiSend />}
                  {submitBusy ? 'Salvando...' : 'Registrar janela'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitBusy}
                  onClick={() => {
                    setFormValues(INITIAL_FORM)
                    setNotice(null)
                  }}
                >
                  <FiPlusCircle />
                  Limpar composer
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </div>
  )
}

export default ProgrammingCenter
