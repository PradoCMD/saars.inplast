import { useEffect, useMemo, useState } from 'react'
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiSlash,
} from 'react-icons/fi'
import { DonutGauge, Sparkline } from '../components/OperationsCharts'
import StatePanel from '../components/StatePanel'
import { createResourceState, getErrorKind, requestJson } from '../lib/api'
import {
  buildResourceAliasLookup,
  filterBySearch,
  formatDateTime,
  formatInteger,
  formatPercent,
  getEventLabel,
  latestEntriesByMachine,
  machineLabel,
  normalizeMachineCode,
  safeNumber,
  toneFromEventType,
  toneFromSyncStatus,
} from '../lib/operations'

import './OperationsWorkspace.css'

const INITIAL_FORM = {
  machine_code: '',
  event_type: 'apontar',
  op_code: '',
  pieces: '',
  scrap: '',
  reason: '',
  time_range: '',
}

function collectMachineOptions(resourceCatalog, logsItems) {
  const values = new Set()
  resourceCatalog.forEach((resource) => {
    if (resource.code) values.add(String(resource.code).trim().toUpperCase())
  })
  logsItems.forEach((item) => {
    if (item.machine_code) values.add(String(item.machine_code).trim().toUpperCase())
  })
  return [...values].sort((left, right) => left.localeCompare(right))
}

function ProductionTracking({
  accessToken,
  onUnauthorizedSession,
  currentUser,
  searchQuery,
  reloadKey,
  selectedCompany,
  companySelectionRequired,
  canWrite,
  canDispatch,
}) {
  const [resources, setResources] = useState({
    logs: createResourceState('loading'),
    exportQueue: createResourceState('idle'),
    programming: createResourceState('idle'),
    rules: createResourceState('idle'),
  })
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [notice, setNotice] = useState(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [dispatchBusy, setDispatchBusy] = useState(false)
  const [statusBusyId, setStatusBusyId] = useState('')
  const [localReloadKey, setLocalReloadKey] = useState(0)
  const writeBlockedByScope = canWrite && companySelectionRequired
  const dispatchBlockedByScope = canDispatch && companySelectionRequired
  const formLocked = !canWrite || writeBlockedByScope || saveBusy

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    async function loadModule() {
      setResources((current) => ({
        logs: createResourceState('loading', current.logs.data, null),
        exportQueue: createResourceState('loading', current.exportQueue.data, null),
        programming: createResourceState('loading', current.programming.data, null),
        rules: createResourceState('loading', current.rules.data, null),
      }))

      const nextResources = {}

      const requestResource = async (key, path) => {
        try {
          const data = await requestJson(path, {
            accessToken,
            onUnauthorized: onUnauthorizedSession,
          })
          nextResources[key] = createResourceState('ready', data, null)
        } catch (error) {
          nextResources[key] = createResourceState(getErrorKind(error), null, error)
        }
      }

      await Promise.all([
        requestResource('logs', '/api/pcp/apontamento/logs'),
        requestResource('exportQueue', '/api/pcp/apontamento/export?pending_only=true'),
        requestResource('programming', '/api/pcp/programming?action=produzir'),
        requestResource('rules', '/api/pcp/production-rules'),
      ])

      if (cancelled) return
      setResources((current) => ({ ...current, ...nextResources }))
    }

    loadModule()

    return () => {
      cancelled = true
    }
  }, [accessToken, localReloadKey, onUnauthorizedSession, reloadKey])

  const logsItems = useMemo(() => resources.logs.data?.items || [], [resources.logs.data])
  const exportItems = useMemo(() => resources.exportQueue.data?.items || [], [resources.exportQueue.data])
  const programmingItems = useMemo(() => resources.programming.data?.items || [], [resources.programming.data])
  const rulesData = useMemo(() => resources.rules.data || { resource_catalog: [] }, [resources.rules.data])

  const filteredLogs = useMemo(
    () => filterBySearch(logsItems, searchQuery, (item) => [
      item.machine_code,
      item.operator,
      item.event_type,
      item.op_code,
      item.reason,
      item.integration_status,
    ]),
    [logsItems, searchQuery],
  )

  const filteredExportItems = useMemo(
    () => filterBySearch(exportItems, searchQuery, (item) => [
      item.machine_code,
      item.operator,
      item.event_type,
      item.op_code,
      item.reason,
      item.integration_status,
    ]),
    [exportItems, searchQuery],
  )

  const aliasLookup = useMemo(
    () => buildResourceAliasLookup(rulesData.resource_catalog || []),
    [rulesData.resource_catalog],
  )
  const latestMachinesMap = useMemo(
    () => latestEntriesByMachine(filteredLogs, aliasLookup),
    [aliasLookup, filteredLogs],
  )
  const machineOptions = useMemo(
    () => collectMachineOptions(rulesData.resource_catalog || [], logsItems),
    [logsItems, rulesData.resource_catalog],
  )
  const machineCards = useMemo(() => {
    const codes = machineOptions.length ? machineOptions : ['INJ-01', 'INJ-02', 'INJ-03']
    return codes.map((code) => {
      const normalized = normalizeMachineCode(code, aliasLookup)
      const latestLog = latestMachinesMap.get(normalized) || null
      return {
        code: normalized,
        label: machineLabel(normalized, normalized.startsWith('LINHA-') ? 'assembly' : 'injecao'),
        latestLog,
        tone: latestLog ? toneFromEventType(latestLog.event_type) : 'warning',
      }
    })
  }, [aliasLookup, latestMachinesMap, machineOptions])

  const summary = resources.logs.data?.summary || {
    total: 0,
    machines_running: 0,
    machines_stopped: 0,
    machines_finished: 0,
    pending_sync: 0,
    synced: 0,
    failed_sync: 0,
  }
  const syncCoverage = summary.total
    ? Math.round((safeNumber(summary.synced) / Math.max(safeNumber(summary.total), 1)) * 100)
    : 100
  const executionSeries = filteredLogs.slice(0, 12).reverse().map((item) => safeNumber(item.pieces || item.scrap || 0))
  const programmingChoices = programmingItems.map((item) => ({
    value: String(item.schedule_key || '').toUpperCase(),
    label: `${item.sku} · ${item.produto}`,
  }))

  async function handleSave(event) {
    event.preventDefault()
    setSaveBusy(true)
    setNotice(null)

    try {
      if (writeBlockedByScope) {
        throw new Error('Selecione uma empresa ativa antes de registrar apontamentos neste contexto multiempresa.')
      }

      const payload = {
        ...formValues,
        machine_code: String(formValues.machine_code || '').trim().toUpperCase(),
        event_type: String(formValues.event_type || 'apontar').trim().toLowerCase(),
        op_code: String(formValues.op_code || '').trim().toUpperCase(),
        operator: currentUser?.full_name || currentUser?.username || 'Operador',
        pieces: safeNumber(formValues.pieces),
        scrap: safeNumber(formValues.scrap),
        reason: String(formValues.reason || '').trim(),
        time_range: String(formValues.time_range || '').trim(),
        integration_target: 'sankhya_n8n',
        company_code: selectedCompany || undefined,
      }

      if (!payload.machine_code) {
        throw new Error('Selecione a máquina antes de registrar um novo apontamento.')
      }

      if (payload.event_type === 'apontar' && payload.pieces <= 0 && payload.scrap <= 0) {
        throw new Error('Informe peças boas ou refugo para registrar um apontamento de produção.')
      }

      if (payload.event_type === 'parada' && !payload.reason) {
        throw new Error('Explique o motivo da parada antes de salvar.')
      }

      await requestJson('/api/pcp/apontamento/save', {
        method: 'POST',
        body: payload,
        accessToken,
        onUnauthorized: onUnauthorizedSession,
      })

      setNotice({
        tone: 'success',
        message: `Apontamento registrado para ${payload.machine_code}. Recarregando fila e estado de sincronização.`,
      })
      setFormValues(INITIAL_FORM)
      setLocalReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ tone: 'error', message: error.message || 'Não foi possível salvar o apontamento.' })
    } finally {
      setSaveBusy(false)
    }
  }

  async function handleDispatchPending() {
    if (dispatchBlockedByScope) {
      setNotice({
        tone: 'warning',
        message: 'Selecione uma empresa ativa antes de despachar pendências para integração.',
      })
      return
    }

    if (!filteredExportItems.length) {
      setNotice({ tone: 'warning', message: 'Não há eventos pendentes para despachar neste momento.' })
      return
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja despachar ${filteredExportItems.length} evento(s) pendente(s) para integração?\n\nEsta ação pode acionar webhooks externos (n8n/Sankhya).`,
    )
    if (!confirmed) return

    setDispatchBusy(true)
    setNotice(null)

    try {
      const response = await requestJson('/api/pcp/apontamento/dispatch', {
        method: 'POST',
        body: {
          pending_only: true,
          company_code: selectedCompany || undefined,
        },
        accessToken,
        onUnauthorized: onUnauthorizedSession,
      })

      setNotice({
        tone: response.status === 'error' ? 'error' : response.status === 'idle' ? 'warning' : 'success',
        message: response.message || 'Fila de apontamento enviada para integração.',
      })
      setLocalReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ tone: 'error', message: error.message || 'Não foi possível disparar a sincronização.' })
    } finally {
      setDispatchBusy(false)
    }
  }

  async function handleSyncStatusChange(entry, integrationStatus) {
    if (dispatchBlockedByScope) {
      setNotice({
        tone: 'warning',
        message: 'Selecione uma empresa ativa antes de intervir manualmente no status de sincronização.',
      })
      return
    }

    setStatusBusyId(entry.id)
    setNotice(null)

    try {
      await requestJson('/api/pcp/apontamento/sync-status', {
        method: 'POST',
        body: {
          company_code: selectedCompany || undefined,
          items: [
            {
              id: entry.id,
              integration_status: integrationStatus,
              sync_error: integrationStatus === 'failed' ? 'Marcado manualmente pelo command center.' : '',
              external_ref: integrationStatus === 'synced' ? entry.external_ref || 'web-react-manual' : '',
            },
          ],
        },
        accessToken,
        onUnauthorized: onUnauthorizedSession,
      })

      setNotice({
        tone: integrationStatus === 'failed' ? 'warning' : 'success',
        message: `Status de sincronização atualizado para ${entry.machine_code}.`,
      })
      setLocalReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ tone: 'error', message: error.message || 'Não foi possível atualizar o status de sincronização.' })
    } finally {
      setStatusBusyId('')
    }
  }

  if (resources.logs.status === 'loading' && !resources.logs.data) {
    return (
      <StatePanel
        kind="loading"
        title="Carregando apontamento operacional"
        message="Buscando logs, fila pendente, catálogo de máquinas e opções de OP para montar a estação de execução."
      />
    )
  }

  if (resources.logs.status === 'permission') {
    return (
      <StatePanel
        kind="permission"
        title="Seu papel não pode abrir o apontamento"
        message={resources.logs.error?.message || 'O sistema bloqueou a leitura dos apontamentos desta sessão.'}
      />
    )
  }

  if (resources.logs.status === 'error') {
    return (
      <StatePanel
        kind="error"
        title="Falha ao carregar o apontamento"
        message={resources.logs.error?.message || 'Não foi possível carregar os logs operacionais desta sessão.'}
      />
    )
  }

  return (
    <div className="apontamento-page animate-in">
      <section className="apontamento-hero">
        <span className="ops-kicker">Apontamento real</span>
        <h2>Execução de chão, fila de sync e governança de evento no mesmo módulo.</h2>
        <p>
          O módulo agora deixa de ser storyboard. Ele lê os logs reais do sistema, registra novos eventos,
          permite despachar a fila pendente e ainda sinaliza quando a gestão precisa intervir manualmente na integração.
        </p>
        <div className="ops-meta-row">
          <span><FiActivity /> {formatInteger(summary.machines_running)} máquinas em execução</span>
          <span><FiAlertTriangle /> {formatInteger(summary.pending_sync)} eventos pendentes</span>
          <span><FiShield /> Escopo ativo: {selectedCompany || 'Seleção obrigatória'}</span>
          <span><FiClock /> Última carga: {filteredLogs[0] ? formatDateTime(filteredLogs[0].created_at) : 'Sem eventos'}</span>
        </div>
      </section>

      {notice ? (
        <div className={`shell-banner ${notice.tone || 'info'}`}>
          <strong>{notice.tone === 'success' ? 'Fluxo atualizado.' : notice.tone === 'warning' ? 'Intervenção registrada.' : 'Atenção operacional.'}</strong>
          <span>{notice.message}</span>
        </div>
      ) : null}

      {(writeBlockedByScope || dispatchBlockedByScope) ? (
        <div className="shell-banner warning">
          <strong>Escrita e intervenção bloqueadas sem empresa ativa.</strong>
          <span>Para evitar apontamento ou despacho ambíguo em multiempresa, selecione uma empresa antes de operar a estação.</span>
        </div>
      ) : null}

      <section className="ops-highlight-grid">
        <article className="ops-stat-card">
          <small>Total de eventos</small>
          <strong>{formatInteger(summary.total)}</strong>
          <p>Histórico recente disponível para operação e auditoria rápida.</p>
        </article>
        <article className="ops-stat-card">
          <small>Rodando / paradas</small>
          <strong>{formatInteger(summary.machines_running)} / {formatInteger(summary.machines_stopped)}</strong>
          <p>Leitura instantânea de execução vs. bloqueio no chão.</p>
        </article>
        <article className="ops-stat-card">
          <small>Sincronizados</small>
          <strong>{formatInteger(summary.synced)}</strong>
          <p>{formatPercent(syncCoverage)} do histórico já foi reconhecido pela integração.</p>
        </article>
        <article className="ops-stat-card">
          <small>Com falha</small>
          <strong>{formatInteger(summary.failed_sync)}</strong>
          <p>Itens que precisam de olhar humano antes de seguir para o Sankhya.</p>
        </article>
      </section>

      <section className="ops-chart-grid">
        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Saúde da integração</small>
              <strong>{formatPercent(syncCoverage)}</strong>
            </div>
            <span className={`ops-tone-pill tone-${syncCoverage >= 70 ? 'ok' : syncCoverage >= 45 ? 'warning' : 'high'}`}>sync</span>
          </div>
          <DonutGauge
            value={syncCoverage}
            label="eventos sincronizados"
            detail="Quanto maior o percentual, menor o retrabalho manual entre operação e gestão."
            tone={syncCoverage >= 70 ? 'ok' : syncCoverage >= 45 ? 'warning' : 'high'}
          />
        </article>

        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Ritmo recente</small>
              <strong>{formatInteger(filteredLogs.length)} logs</strong>
            </div>
            <span className="ops-tone-pill tone-info">produção</span>
          </div>
          <Sparkline values={executionSeries} tone="info" />
          <p>O traço sobe com peças boas e refugo, ajudando a detectar variações abruptas no ritmo registrado.</p>
        </article>

        <article className="ops-card">
          <div className="ops-board-header">
            <div>
              <small>Fila pendente</small>
              <strong>{formatInteger(filteredExportItems.length)}</strong>
            </div>
            <span className="ops-tone-pill tone-warning">dispatch</span>
          </div>
          <div className="ops-bar-list">
            {filteredExportItems.slice(0, 4).map((item) => (
              <div key={item.id} className="ops-bar-row">
                <header>
                  <strong>{item.machine_code}</strong>
                  <span>{item.event_type}</span>
                </header>
                <div className="ops-bar-track">
                  <div
                    className={`ops-bar-fill tone-${toneFromSyncStatus(item.integration_status)}`}
                    style={{ width: `${Math.max(12, ((safeNumber(item.pieces) + safeNumber(item.scrap) + 1) / Math.max(1, ...filteredExportItems.slice(0, 4).map((entry) => safeNumber(entry.pieces) + safeNumber(entry.scrap) + 1))) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="apontamento-grid">
        <article className="ops-form-card">
          <div className="ops-section-header">
            <div>
              <small>Novo evento</small>
              <strong>Registrar apontamento</strong>
            </div>
            <span className={`ops-tone-pill tone-${canWrite ? 'ok' : 'warning'}`}>
              {canWrite ? 'escrita liberada' : 'somente leitura'}
            </span>
          </div>
          <p>
            Operador e gestão usam o mesmo composer. A diferença é que a gestão ainda consegue intervir no estado de integração,
            enquanto o operador foca em iniciar, apontar, parar e finalizar com clareza.
          </p>

          <form onSubmit={handleSave} className="ops-form-grid" style={{ marginTop: 18 }}>
            <label>
              <span>Máquina</span>
              <select
                value={formValues.machine_code}
                disabled={formLocked}
                onChange={(event) => setFormValues((current) => ({ ...current, machine_code: event.target.value }))}
              >
                <option value="">Selecione</option>
                {machineOptions.map((option) => (
                  <option key={option} value={option}>
                    {machineLabel(option, option.startsWith('LINHA-') ? 'assembly' : 'injecao')}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Evento</span>
              <select
                value={formValues.event_type}
                disabled={formLocked}
                onChange={(event) => setFormValues((current) => ({ ...current, event_type: event.target.value }))}
              >
                <option value="apontar">Apontar</option>
                <option value="iniciar">Iniciar</option>
                <option value="parada">Parada</option>
                <option value="finalizar">Finalizar</option>
              </select>
            </label>

            <label className="full">
              <span>OP vinculada</span>
              <select
                value={formValues.op_code}
                disabled={formLocked}
                onChange={(event) => setFormValues((current) => ({ ...current, op_code: event.target.value }))}
              >
                <option value="">Selecionar OP opcional</option>
                {programmingChoices.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Peças boas</span>
              <input
                value={formValues.pieces}
                disabled={formLocked}
                onChange={(event) => setFormValues((current) => ({ ...current, pieces: event.target.value }))}
                placeholder="120"
              />
            </label>

            <label>
              <span>Refugo</span>
              <input
                value={formValues.scrap}
                disabled={formLocked}
                onChange={(event) => setFormValues((current) => ({ ...current, scrap: event.target.value }))}
                placeholder="0"
              />
            </label>

            <label>
              <span>Faixa horária</span>
              <input
                value={formValues.time_range}
                disabled={formLocked}
                onChange={(event) => setFormValues((current) => ({ ...current, time_range: event.target.value }))}
                placeholder="14:00-14:45"
              />
            </label>

            <label className="full">
              <span>Motivo / observação</span>
              <textarea
                value={formValues.reason}
                disabled={formLocked}
                onChange={(event) => setFormValues((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Ex.: ajuste de molde, troca de material ou apontamento normal."
              />
            </label>

            <div className="ops-form-actions" style={{ gridColumn: '1 / -1' }}>
              <button
                type="submit"
                className={`btn ${canWrite ? 'btn-primary' : 'btn-secondary'} ${!canWrite || writeBlockedByScope ? 'is-blocked' : ''}`}
                disabled={!canWrite || writeBlockedByScope || saveBusy}
              >
                {saveBusy ? <FiClock /> : <FiSend />}
                {saveBusy ? 'Salvando...' : 'Registrar evento'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saveBusy}
                onClick={() => {
                  setFormValues(INITIAL_FORM)
                  setNotice(null)
                }}
              >
                <FiRefreshCw />
                Limpar composer
              </button>
            </div>
          </form>
        </article>

        <article className="ops-queue-card">
          <div className="ops-section-header">
            <div>
              <small>Fila de sincronização</small>
              <strong>Pendentes para o Sankhya</strong>
            </div>
            <span className={`ops-tone-pill tone-${filteredExportItems.length ? 'warning' : 'ok'}`}>
              {filteredExportItems.length ? 'pendente' : 'vazio'}
            </span>
          </div>
          <p>
            Esta fila mostra exatamente o que ainda precisa sair do front para a integração. Nada fica escondido como “sucesso”
            se o payload ainda está pendente ou falhou.
          </p>

          <div className="ops-list" style={{ marginTop: 16 }}>
            {filteredExportItems.length ? filteredExportItems.slice(0, 6).map((item) => (
              <article key={item.id} className={`ops-sync-row tone-${toneFromSyncStatus(item.integration_status)}`}>
                <header>
                  <div>
                    <strong>{item.machine_code}</strong>
                    <small>{getEventLabel(item.event_type)}</small>
                  </div>
                  <span className={`ops-tone-pill tone-${toneFromSyncStatus(item.integration_status)}`}>
                    {item.integration_status}
                  </span>
                </header>
                <p>{item.reason || item.op_code || 'Sem observação adicional no payload.'}</p>
                <div className="ops-journal-meta">
                  <span><FiClock /> {formatDateTime(item.created_at)}</span>
                  <span><FiShield /> {item.integration_target}</span>
                </div>
                {canDispatch ? (
                  <div className="ops-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={statusBusyId === item.id || dispatchBlockedByScope}
                      onClick={() => handleSyncStatusChange(item, 'synced')}
                    >
                      <FiCheckCircle />
                      Marcar synced
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={statusBusyId === item.id || dispatchBlockedByScope}
                      onClick={() => handleSyncStatusChange(item, 'failed')}
                    >
                      <FiSlash />
                      Marcar failed
                    </button>
                  </div>
                ) : null}
              </article>
            )) : <p className="ops-empty-note">Nenhum evento pendente no recorte atual.</p>}
          </div>

          <div className="ops-form-actions">
            <button
              type="button"
              className={`btn ${canDispatch ? 'btn-primary' : 'btn-secondary'} ${!canDispatch || dispatchBlockedByScope ? 'is-blocked' : ''}`}
              disabled={!canDispatch || dispatchBlockedByScope || dispatchBusy}
              onClick={handleDispatchPending}
            >
              {dispatchBusy ? <FiClock /> : <FiSend />}
              {dispatchBusy ? 'Enviando...' : 'Despachar pendentes'}
            </button>
          </div>
        </article>
      </section>

      <section className="ops-main-grid">
        <article className="ops-journal-card">
          <div className="ops-section-header">
            <div>
              <small>Journal operacional</small>
              <strong>Histórico recente de execução</strong>
            </div>
            <span className="ops-tone-pill tone-info">{formatInteger(filteredLogs.length)} logs</span>
          </div>
          <div className="ops-journal-list" style={{ marginTop: 16 }}>
            {filteredLogs.length ? filteredLogs.slice(0, 12).map((item) => (
              <article key={item.id} className={`ops-journal-row tone-${toneFromSyncStatus(item.integration_status)}`}>
                <header>
                  <div>
                    <strong>{item.machine_code}</strong>
                    <small>{getEventLabel(item.event_type)}</small>
                  </div>
                  <span className={`ops-tone-pill tone-${toneFromSyncStatus(item.integration_status)}`}>
                    {item.integration_status}
                  </span>
                </header>
                <p>{item.reason || item.op_code || 'Evento sem justificativa adicional.'}</p>
                <div className="ops-journal-meta">
                  <span><FiActivity /> {formatInteger(item.pieces)} boas / {formatInteger(item.scrap)} refugo</span>
                  <span><FiClock /> {formatDateTime(item.created_at)}</span>
                  <span>{item.operator || 'Sem operador'}</span>
                </div>
              </article>
            )) : <p className="ops-empty-note">Sem logs visíveis com o filtro atual.</p>}
          </div>
        </article>

        <article className="ops-card">
          <div className="ops-section-header">
            <div>
              <small>Máquinas e estado</small>
              <strong>Último sinal por recurso</strong>
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
                    {machine.latestLog ? getEventLabel(machine.latestLog.event_type) : 'Sem leitura'}
                  </span>
                </header>
                <p>
                  {machine.latestLog
                    ? `${machine.latestLog.operator || 'Sem operador'} · ${machine.latestLog.reason || 'Evento sem observação'}`
                    : 'Ainda sem evento recente ligado a esta máquina.'}
                </p>
                {machine.latestLog ? (
                  <div className="ops-machine-meta">
                    <span>{formatDateTime(machine.latestLog.created_at)}</span>
                    <span>{machine.latestLog.integration_status}</span>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

export default ProductionTracking
