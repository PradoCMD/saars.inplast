import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiInbox,
  FiLock,
  FiPackage,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUploadCloud,
} from 'react-icons/fi'

import StatePanel from '../components/StatePanel'
import { getForecastOrigin } from '../lib/operationalLanguage'
import './RomaneiosInbox.css'

const MANUAL_KEY = 'pcp.react.romaneios.manual'
const PDF_KEY = 'pcp.react.romaneios.pdfqueue'

const emptyForm = {
  romaneio: '',
  empresa: '',
  cliente: '',
  nota: '',
  previsao: '',
  observacao: '',
}

function readLocalState(key) {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function inferRomaneioFromName(name) {
  const explicit = name.match(/RM[-_\s]?\d[\w-]*/i)
  if (explicit) return explicit[0].replace(/\s+/g, '-').toUpperCase()
  const digits = name.match(/\d{3,}/)
  return digits ? `RM-${digits[0]}` : ''
}

function formatDate(value) {
  if (!value) return 'Sem previsão'
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

function formatSize(bytes) {
  if (!bytes) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function includesQuery(item, searchQuery) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return true

  const haystack = [
    item.romaneio,
    item.empresa,
    item.cliente,
    item.nota,
    item.fileName,
    item.observacao,
    item.title,
    item.subtitle,
    item.detail,
    item.criterio_previsao,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedQuery)
}

function createDetailState(status = 'idle', data = null, error = null, code = '', requestKey = '') {
  return { status, data, error, code, requestKey }
}

function buildDetailPath(romaneioCode, companyCode = '') {
  const base = `/api/pcp/romaneios/${encodeURIComponent(romaneioCode)}`
  if (!companyCode) return base
  return `${base}?company_code=${encodeURIComponent(companyCode)}`
}

async function requestRomaneioDetail(path, accessToken = '', onUnauthorizedSession) {
  const response = await fetch(path, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })

  const text = await response.text()
  const payload = text ? (() => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  })() : null

  if (response.status === 401 && typeof onUnauthorizedSession === 'function') {
    onUnauthorizedSession(payload?.detail || payload?.error || 'Sessão expirada ou inválida. Faça login novamente.')
  }

  if (!response.ok) {
    const error = new Error(
      payload?.detail || payload?.error || payload?.message || 'Não foi possível carregar o detalhe oficial do romaneio.',
    )
    error.status = response.status
    error.code = payload?.code || ''
    throw error
  }

  return payload
}

function getDetailErrorKind(error) {
  if (error?.status === 403) return 'permission'
  if (error?.status === 401) return 'session'
  return 'error'
}

function RomaneiosInbox({
  resourceState,
  currentUser,
  accessToken,
  onUnauthorizedSession,
  searchQuery,
  canIngest,
  selectedCompany,
  companySelectionRequired,
}) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [manualForm, setManualForm] = useState(() => ({
    ...emptyForm,
    empresa: selectedCompany || '',
  }))
  const [manualEntries, setManualEntries] = useState(() => readLocalState(MANUAL_KEY))
  const [pdfQueue, setPdfQueue] = useState(() => readLocalState(PDF_KEY))
  const [selectedOfficialRomaneio, setSelectedOfficialRomaneio] = useState('')
  const [officialDetailState, setOfficialDetailState] = useState(() => createDetailState())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries))
    }
  }, [manualEntries])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PDF_KEY, JSON.stringify(pdfQueue))
    }
  }, [pdfQueue])

  const existingItems = useMemo(() => resourceState.data?.items || [], [resourceState.data])

  const intakeItems = useMemo(() => {
    const manualMapped = manualEntries.map((entry) => ({
      id: entry.id,
      title: entry.romaneio || 'Romaneio manual',
      subtitle: entry.cliente || entry.empresa || 'Entrada manual',
      detail: entry.nota ? `Nota ${entry.nota}` : 'Sem nota vinculada',
      status: 'manual',
      addedAt: entry.addedAt,
      ...entry,
    }))

    const pdfMapped = pdfQueue.map((entry) => ({
      id: entry.id,
      title: entry.romaneio || entry.fileName,
      subtitle: 'PDF em buffer local',
      detail: `${entry.fileName} • ${formatSize(entry.sizeBytes)}`,
      status: 'pdf',
      addedAt: entry.addedAt,
      ...entry,
    }))

    return [...pdfMapped, ...manualMapped]
      .filter((item) => includesQuery(item, searchQuery))
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
  }, [manualEntries, pdfQueue, searchQuery])

  const visibleExistingItems = useMemo(
    () => existingItems.filter((item) => includesQuery(item, searchQuery)),
    [existingItems, searchQuery],
  )

  const effectiveSelectedOfficialRomaneio = useMemo(() => {
    if (resourceState.status !== 'ready' || !visibleExistingItems.length) return ''

    return visibleExistingItems.some((item) => item.romaneio === selectedOfficialRomaneio)
      ? selectedOfficialRomaneio
      : visibleExistingItems[0].romaneio
  }, [resourceState.status, visibleExistingItems, selectedOfficialRomaneio])

  const detailRequestKey = resourceState.status === 'ready' && effectiveSelectedOfficialRomaneio && accessToken
    ? `${effectiveSelectedOfficialRomaneio}::${selectedCompany || 'consolidado'}`
    : ''

  useEffect(() => {
    if (!detailRequestKey) return

    if (
      officialDetailState.requestKey === detailRequestKey &&
      ['ready', 'permission', 'error', 'session'].includes(officialDetailState.status)
    ) {
      return
    }

    let cancelled = false

    requestRomaneioDetail(
      buildDetailPath(effectiveSelectedOfficialRomaneio, selectedCompany),
      accessToken,
      onUnauthorizedSession,
    )
      .then((payload) => {
        if (cancelled) return
        setOfficialDetailState(createDetailState('ready', payload, null, effectiveSelectedOfficialRomaneio, detailRequestKey))
      })
      .catch((error) => {
        if (cancelled) return
        setOfficialDetailState(createDetailState(
          getDetailErrorKind(error),
          null,
          error,
          effectiveSelectedOfficialRomaneio,
          detailRequestKey,
        ))
      })

    return () => {
      cancelled = true
    }
  }, [
    accessToken,
    detailRequestKey,
    effectiveSelectedOfficialRomaneio,
    officialDetailState.requestKey,
    officialDetailState.status,
    onUnauthorizedSession,
    selectedCompany,
  ])

  const displayedDetailState = useMemo(() => {
    if (!detailRequestKey || !effectiveSelectedOfficialRomaneio) return createDetailState()
    if (officialDetailState.requestKey === detailRequestKey) return officialDetailState

    return createDetailState(
      'loading',
      officialDetailState.code === effectiveSelectedOfficialRomaneio ? officialDetailState.data : null,
      null,
      effectiveSelectedOfficialRomaneio,
      detailRequestKey,
    )
  }, [detailRequestKey, effectiveSelectedOfficialRomaneio, officialDetailState])

  const manualCompanyValue = selectedCompany || manualForm.empresa || ''
  const selectedOfficialSummary = existingItems.find((item) => item.romaneio === effectiveSelectedOfficialRomaneio) || null
  const detailPayload = displayedDetailState.data || {}
  const detailHeader = detailPayload.header || selectedOfficialSummary || {}
  const detailItems = Array.isArray(detailPayload.items) ? detailPayload.items : []
  const detailEvents = Array.isArray(detailPayload.events) ? detailPayload.events : []
  const detailForecast = getForecastOrigin(detailHeader.previsao_saida_status, detailHeader.criterio_previsao)
  const pendingItemsCount = detailItems.filter((item) => Number(item.quantidade_pendente || 0) > 0).length
  const stockOnlyItemsCount = detailItems.filter((item) => String(item.modo_atendimento || '').toLowerCase() === 'estoque').length
  const writeAccessBlocked = !canIngest || companySelectionRequired
  const writeBlockedReason = companySelectionRequired
    ? 'Selecione a empresa ativa para liberar o buffer local desta sessão.'
    : 'Seu papel consulta romaneios oficiais, sem criar entradas locais.'
  const summaryCards = [
    {
      label: 'Modo do módulo',
      value: writeAccessBlocked ? 'Leitura segura' : 'Operação assistida',
      detail: companySelectionRequired
        ? 'A escrita segue travada até a definição da empresa ativa.'
        : canIngest
          ? 'Buffer local liberado como apoio operacional, nunca como fonte oficial.'
          : 'O papel atual consulta romaneios oficiais, sem criar entradas locais.',
      tone: writeAccessBlocked ? 'warning' : 'info',
    },
    {
      label: 'Fonte oficial',
      value: `${existingItems.length}`,
      detail: 'Itens já autenticados pelo backend e visíveis para esta sessão.',
      tone: 'ok',
    },
    {
      label: 'Buffer temporário',
      value: `${manualEntries.length + pdfQueue.length}`,
      detail: 'Rascunhos locais mantidos separados da lista oficial.',
      tone: manualEntries.length + pdfQueue.length ? 'warning' : 'info',
    },
    {
      label: 'Empresa aplicada',
      value: selectedCompany || (companySelectionRequired ? 'Pendente' : 'Consolidado'),
      detail: companySelectionRequired
        ? 'Selecione a empresa acima para liberar escrita e leitura agregada.'
        : 'Escopo atual preservado nas entradas manuais e na leitura oficial.',
      tone: companySelectionRequired ? 'warning' : 'ok',
    },
  ]

  const addFilesToQueue = (files) => {
    const validFiles = Array.from(files || []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    if (!validFiles.length) return

    const nextItems = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      romaneio: inferRomaneioFromName(file.name),
      fileName: file.name,
      sizeBytes: file.size,
      status: 'aguardando_ingestao',
      addedAt: new Date().toISOString(),
    }))

    setPdfQueue((current) => [...nextItems, ...current])
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    if (!canIngest || companySelectionRequired) return
    addFilesToQueue(event.dataTransfer.files)
  }

  const handleManualSubmit = (event) => {
    event.preventDefault()
    if (!canIngest || companySelectionRequired) return
    if (!manualForm.romaneio.trim() && !manualForm.cliente.trim()) return

    const entry = {
      id: `${Date.now()}-manual`,
      ...manualForm,
      empresa: manualCompanyValue,
      status: 'manual',
      addedAt: new Date().toISOString(),
    }

    setManualEntries((current) => [entry, ...current])
    setManualForm({
      ...emptyForm,
      empresa: selectedCompany || '',
    })
  }

  const removeManual = (id) => {
    setManualEntries((current) => current.filter((entry) => entry.id !== id))
  }

  const removePdf = (id) => {
    setPdfQueue((current) => current.filter((entry) => entry.id !== id))
  }

  return (
    <div className="romaneios-page animate-in">
      <section className="romaneios-hero">
        <div>
          <span className="romaneios-kicker">Entrada operacional</span>
          <h2>Inbox de Romaneios</h2>
          <p>
            O módulo passa a trabalhar como lista oficial com detalhe consolidado, mantendo o buffer local como
            apoio operacional. Nada no buffer altera a fonte de verdade do backend autenticado.
          </p>
        </div>
        <div className="romaneios-hero-stats">
          <div>
            <small>Perfil ativo</small>
            <strong>{String(currentUser?.role || 'operator').toUpperCase()}</strong>
          </div>
          <div>
            <small>Romaneios oficiais</small>
            <strong>{existingItems.length}</strong>
          </div>
          <div>
            <small>Buffer local</small>
            <strong>{manualEntries.length + pdfQueue.length}</strong>
          </div>
        </div>
      </section>

      <section className="romaneios-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`metric-card tone-${card.tone}`}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <span>{card.detail}</span>
          </article>
        ))}
      </section>

      {writeAccessBlocked ? (
        <StatePanel
          kind={companySelectionRequired ? 'company' : 'permission'}
          title={companySelectionRequired ? 'Selecione uma empresa para inserir novos romaneios' : 'Seu papel está em leitura segura'}
          message={
            companySelectionRequired
              ? 'Para criar entradas manuais ou enfileirar PDFs, escolha a empresa ativa antes de continuar.'
              : 'O backend valida ingestão por papel. Por isso o buffer local fica travado para esta sessão.'
          }
        />
      ) : null}

      <section className="romaneios-official-grid">
        <div className="glass-panel official-panel romaneios-list-panel">
          <div className="panel-header">
            <div>
              <h3>Romaneios oficiais</h3>
              <span>Selecione um romaneio do backend para abrir o detalhe consolidado desta sessão.</span>
            </div>
            <span className="tag info">Backend autenticado</span>
          </div>

          <div className="romaneios-existing-list">
            {resourceState.status === 'loading' ? (
              <StatePanel
                kind="loading"
                title="Buscando romaneios autorizados"
                message="Carregando a lista oficial já protegida por sessão e escopo."
                compact
              />
            ) : null}

            {resourceState.status === 'error' ? (
              <StatePanel
                kind="error"
                title="Falha ao carregar a lista oficial"
                message={resourceState.error?.message}
                compact
              />
            ) : null}

            {resourceState.status === 'permission' ? (
              <StatePanel
                kind="permission"
                title="Sem permissão para ler romaneios"
                message={resourceState.error?.message}
                compact
              />
            ) : null}

            {resourceState.status === 'ready' && visibleExistingItems.map((item) => {
              const forecastOrigin = getForecastOrigin(item.previsao_saida_status, item.criterio_previsao)
              return (
                <button
                  key={item.romaneio}
                  type="button"
                  className={`romaneios-existing-card romaneios-selection-card official ${effectiveSelectedOfficialRomaneio === item.romaneio ? 'active' : ''}`}
                  onClick={() => setSelectedOfficialRomaneio(item.romaneio)}
                >
                  <div className="romaneios-existing-top">
                    <strong>{item.romaneio}</strong>
                    <span className={`tag ${String(item.previsao_saida_status || '').includes('sem') ? 'high' : 'ok'}`}>
                      {item.previsao_saida_status || 'sem status'}
                    </span>
                  </div>
                  <p>{item.empresa}</p>
                  <div className="romaneios-existing-meta">
                    <span><FiPackage /> {item.itens} itens</span>
                    <span><FiCalendar /> {formatDate(item.previsao_saida_at)}</span>
                  </div>
                  <div className="romaneios-selection-footer">
                    <span className={`tag ${forecastOrigin.tone}`}>{forecastOrigin.label}</span>
                    <small>{forecastOrigin.detail}</small>
                  </div>
                </button>
              )
            })}

            {resourceState.status === 'ready' && !visibleExistingItems.length ? (
              <StatePanel
                kind="empty"
                title="Nenhum romaneio oficial para este filtro"
                message="A lista backend está vazia ou o recorte de busca não encontrou resultados."
                compact
              />
            ) : null}
          </div>
        </div>

        <div className="glass-panel official-panel romaneios-detail-panel">
          <div className="panel-header">
            <div>
              <h3>Detalhe consolidado</h3>
              <span>Fonte de verdade oficial, com cabeçalho, itens e eventos relevantes do romaneio selecionado.</span>
            </div>
            <span className="tag info">Source of truth</span>
          </div>

          {resourceState.status === 'ready' && !effectiveSelectedOfficialRomaneio ? (
            <StatePanel
              kind="empty"
              title="Selecione um romaneio oficial"
              message="O detalhe consolidado é carregado apenas a partir da lista oficial do backend."
              compact
            />
          ) : null}

          {effectiveSelectedOfficialRomaneio && displayedDetailState.status === 'loading' && !displayedDetailState.data ? (
            <StatePanel
              kind="loading"
              title="Carregando detalhe consolidado"
              message={`Buscando o romaneio oficial ${effectiveSelectedOfficialRomaneio} no backend autenticado.`}
              compact
            />
          ) : null}

          {effectiveSelectedOfficialRomaneio && displayedDetailState.status === 'permission' ? (
            <StatePanel
              kind="permission"
              title="Sem permissão para este detalhe"
              message={displayedDetailState.error?.message}
              compact
            />
          ) : null}

          {effectiveSelectedOfficialRomaneio && displayedDetailState.status === 'error' ? (
            <StatePanel
              kind="error"
              title="Falha ao carregar o detalhe oficial"
              message={displayedDetailState.error?.message}
              compact
            />
          ) : null}

          {effectiveSelectedOfficialRomaneio && (displayedDetailState.status === 'ready' || (displayedDetailState.status === 'loading' && displayedDetailState.data)) ? (
            <div className="romaneios-detail-shell">
              <div className="romaneios-detail-toolbar">
                <div className="romaneios-detail-badges">
                  <span className="tag info">Backend oficial</span>
                  <span className={`tag ${detailForecast.tone}`}>{detailForecast.label}</span>
                  <span className={`tag ${String(detailHeader.previsao_saida_status || '').includes('sem') ? 'high' : 'ok'}`}>
                    {detailHeader.previsao_saida_status || 'sem status'}
                  </span>
                  <span className="tag info">{detailItems.length} SKUs</span>
                  <span className="tag info">{detailEvents.length} eventos</span>
                </div>
                {displayedDetailState.status === 'loading' ? (
                  <span className="romaneios-detail-sync">
                    <FiClock className="spin" />
                    Atualizando detalhe oficial
                  </span>
                ) : null}
              </div>

              <section className="romaneios-detail-summary">
                <article className="romaneios-detail-card">
                  <small>Romaneio</small>
                  <strong>{detailHeader.romaneio || effectiveSelectedOfficialRomaneio}</strong>
                  <span>{detailHeader.empresa || 'Sem empresa informada'}</span>
                </article>
                <article className="romaneios-detail-card">
                  <small>Recebido em</small>
                  <strong>{formatDate(detailHeader.data_evento)}</strong>
                  <span>{numberFormat.format(detailHeader.quantidade_total || 0)} unidades em {detailHeader.itens || 0} itens</span>
                </article>
                <article className="romaneios-detail-card">
                  <small>Previsão de saída</small>
                  <strong>{formatDate(detailHeader.previsao_saida_at)}</strong>
                  <span>{detailForecast.detail}</span>
                </article>
                <article className="romaneios-detail-card">
                  <small>Status da previsão</small>
                  <strong>{detailHeader.previsao_saida_status || 'Sem previsão'}</strong>
                  <span>{detailHeader.previsao_saida_observacao || 'Sem observação oficial para este romaneio.'}</span>
                </article>
              </section>

              <div className="romaneios-detail-grid">
                <div className="romaneios-detail-section">
                  <div className="panel-header">
                    <div>
                      <h3>Itens consolidados</h3>
                      <span>Disponibilidade oficial, impacto e pendência por SKU.</span>
                    </div>
                    <span className="tag info">{detailItems.length} itens</span>
                  </div>

                  {detailItems.length ? (
                    <div className="romaneios-detail-list">
                      {detailItems.map((item) => (
                        <article key={item.sku} className="romaneios-detail-item">
                          <div className="romaneios-detail-item-head">
                            <div>
                              <small>{item.sku}</small>
                              <strong>{item.produto}</strong>
                            </div>
                            <span className={`tag ${String(item.previsao_disponibilidade_status || '').includes('estoque') ? 'ok' : 'warning'}`}>
                              {item.previsao_disponibilidade_status || 'sem previsão'}
                            </span>
                          </div>
                          <div className="romaneios-detail-item-meta">
                            <span><FiPackage /> {numberFormat.format(item.quantidade || 0)} un</span>
                            <span><FiActivity /> {item.impacto || 'Sem impacto'}</span>
                            <span><FiCalendar /> {formatDate(item.previsao_disponibilidade_at)}</span>
                          </div>
                          <p>
                            Atendimento: {numberFormat.format(item.quantidade_atendida_estoque || 0)} do estoque ·
                            pendente {numberFormat.format(item.quantidade_pendente || 0)} · modo {item.modo_atendimento || '-'}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <StatePanel
                      kind="empty"
                      title="Sem itens detalhados"
                      message="O backend não retornou itens detalhados para este romaneio oficial."
                      compact
                    />
                  )}
                </div>

                <div className="romaneios-detail-side">
                  <div className="romaneios-detail-section">
                    <div className="panel-header">
                      <div>
                        <h3>Painel de exceções</h3>
                        <span>Mesma linguagem do kanban para previsão, exceção e fonte de verdade.</span>
                      </div>
                      <span className={`tag ${detailForecast.tone}`}>{detailForecast.label}</span>
                    </div>

                    <div className="kanban-protocol-list">
                      <article className="signal-card">
                        <div>
                          <small>Origem da previsão</small>
                          <strong>{detailForecast.label}</strong>
                        </div>
                        <span><FiCalendar /> {detailHeader.previsao_saida_observacao || detailForecast.detail}</span>
                      </article>

                      <article className="signal-card">
                        <div>
                          <small>Exceção imediata</small>
                          <strong>{pendingItemsCount} itens com pendência</strong>
                        </div>
                        <span><FiActivity /> {pendingItemsCount
                          ? 'O consolidado continua oficial, mas exige cautela enquanto houver saldo pendente ou atendimento fora do estoque.'
                          : 'Sem pendência relevante no consolidado atual; a exceção não puxa ação imediata.'}</span>
                      </article>

                      <article className="signal-card">
                        <div>
                          <small>Fonte de verdade</small>
                          <strong>Detalhe oficial autenticado</strong>
                        </div>
                        <span><FiShield /> O romaneio acima vem do backend oficial; o buffer local abaixo segue subordinado e não altera este consolidado.</span>
                      </article>
                    </div>
                  </div>

                  <div className="romaneios-detail-section romaneios-source-truth">
                    <div className="panel-header">
                      <div>
                        <h3>Source of truth</h3>
                        <span>O que este painel representa e o que ele não representa.</span>
                      </div>
                      <span className="tag ok">Oficial</span>
                    </div>

                    <div className="sources-contract-list">
                      <article>
                        <strong>Fonte oficial acima de staging local</strong>
                        <p>Este bloco é carregado do endpoint oficial do romaneio selecionado e não depende do buffer local do navegador.</p>
                      </article>
                      <article>
                        <strong>Previsão e exceção ficam explícitas</strong>
                        <p>
                          {stockOnlyItemsCount === detailItems.length && detailItems.length
                            ? 'Todos os SKUs detalhados aparecem como atendimento por estoque, sem depender de staging local.'
                            : detailHeader.previsao_saida_observacao || detailForecast.detail}
                        </p>
                      </article>
                      <article>
                        <strong>Limite atual do payload oficial</strong>
                        <p>O backend atual entrega header, itens e eventos. A UI não inventa badge documental específico sem campo confiável da API.</p>
                      </article>
                    </div>
                  </div>

                  <div className="romaneios-detail-section">
                    <div className="panel-header">
                      <div>
                        <h3>Eventos oficiais</h3>
                        <span>Histórico relevante que ajuda a validar a origem e o estado do romaneio.</span>
                      </div>
                      <span className="tag info">{detailEvents.length} eventos</span>
                    </div>

                    {detailEvents.length ? (
                      <div className="romaneios-detail-list">
                        {detailEvents.map((event) => (
                          <article key={event.event_id} className="romaneios-detail-item romaneios-detail-event">
                            <small>{event.event_type}</small>
                            <strong>{event.event_id}</strong>
                            <div className="romaneios-detail-item-meta">
                              <span><FiClock /> {formatDate(event.received_at)}</span>
                              <span><FiCheckCircle /> {event.status || 'sem status'}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <StatePanel
                        kind="empty"
                        title="Sem eventos adicionais"
                        message="Nenhum evento relevante foi retornado para este romaneio oficial."
                        compact
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="romaneios-intake-grid">
        <div className="glass-panel draft-panel">
          <div className="panel-header">
            <div>
              <h3>Buffer local subordinado</h3>
              <span>Preparação temporária abaixo do detalhe oficial. Nunca vira fonte de verdade sozinho.</span>
            </div>
            <span className="tag warning">Apoio local</span>
          </div>

          <div
            className={`romaneios-dropzone ${dragActive ? 'active' : ''} ${writeAccessBlocked ? 'disabled' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              if (!writeAccessBlocked) setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <FiUploadCloud />
            <strong>Arraste PDFs somente quando houver autorização operacional</strong>
            <p>
              O buffer local não substitui ingestão oficial. Ele apenas prepara o material até a próxima etapa do fluxo.
            </p>
            <button
              type="button"
              className={`romaneios-dropzone-button ${writeAccessBlocked ? 'is-blocked' : ''}`}
              onClick={() => inputRef.current?.click()}
              disabled={writeAccessBlocked}
              title={writeAccessBlocked ? writeBlockedReason : 'Selecionar PDFs para o buffer local'}
            >
              {writeAccessBlocked ? <FiLock /> : <FiUploadCloud />}
              {writeAccessBlocked ? 'PDFs indisponíveis' : 'Selecionar PDFs'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              hidden
              onChange={(event) => addFilesToQueue(event.target.files)}
            />
            {writeAccessBlocked ? (
              <div className="romaneios-control-note">
                <FiLock />
                <span>{writeBlockedReason}</span>
              </div>
            ) : null}
          </div>

          <div className="romaneios-queue-list">
            {pdfQueue.length ? pdfQueue.filter((entry) => includesQuery(entry, searchQuery)).map((entry) => (
              <div key={entry.id} className="romaneios-queue-card draft">
                <div>
                  <strong>{entry.romaneio || entry.fileName}</strong>
                  <small>{entry.fileName}</small>
                  <span>{formatSize(entry.sizeBytes)} • adicionado {formatDate(entry.addedAt)}</span>
                </div>
                <button type="button" className="romaneios-icon-button" onClick={() => removePdf(entry.id)}>
                  <FiTrash2 />
                </button>
              </div>
            )) : (
              <div className="romaneios-empty-state">
                <FiInbox />
                <span>Nenhum PDF em buffer local.</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel draft-panel">
          <div className="panel-header">
            <div>
              <h3>Apoio manual controlado</h3>
              <span>Escrita local continua subordinada à sessão, à empresa e ao dado oficial acima.</span>
            </div>
            <span className="tag ok">Sessão + empresa</span>
          </div>

          <form className="romaneios-manual-form" onSubmit={handleManualSubmit}>
            <label>
              <span>Romaneio</span>
              <input
                value={manualForm.romaneio}
                onChange={(event) => setManualForm((current) => ({ ...current, romaneio: event.target.value }))}
                placeholder="RM-240401-001"
                disabled={writeAccessBlocked}
              />
            </label>
            <label>
              <span>Empresa</span>
              <input
                value={manualCompanyValue}
                onChange={(event) => setManualForm((current) => ({ ...current, empresa: event.target.value }))}
                placeholder="INPLAST"
                disabled={writeAccessBlocked || Boolean(selectedCompany)}
              />
            </label>
            <label>
              <span>Cliente</span>
              <input
                value={manualForm.cliente}
                onChange={(event) => setManualForm((current) => ({ ...current, cliente: event.target.value }))}
                placeholder="Cliente / destinatário"
                disabled={writeAccessBlocked}
              />
            </label>
            <label>
              <span>Nota / pedido</span>
              <input
                value={manualForm.nota}
                onChange={(event) => setManualForm((current) => ({ ...current, nota: event.target.value }))}
                placeholder="36508"
                disabled={writeAccessBlocked}
              />
            </label>
            <label>
              <span>Previsão</span>
              <input
                type="datetime-local"
                value={manualForm.previsao}
                onChange={(event) => setManualForm((current) => ({ ...current, previsao: event.target.value }))}
                disabled={writeAccessBlocked}
              />
            </label>
            <label className="full">
              <span>Observação</span>
              <textarea
                rows="4"
                value={manualForm.observacao}
                onChange={(event) => setManualForm((current) => ({ ...current, observacao: event.target.value }))}
                placeholder="Informações adicionais sobre o romaneio."
                disabled={writeAccessBlocked}
              />
            </label>
            <button
              type="submit"
              className={`romaneios-submit-button ${writeAccessBlocked ? 'is-blocked' : ''}`}
              disabled={writeAccessBlocked}
              title={writeAccessBlocked ? writeBlockedReason : 'Adicionar romaneio ao buffer local'}
            >
              {writeAccessBlocked ? <FiLock /> : <FiPlus />}
              {writeAccessBlocked ? 'Entrada bloqueada' : 'Adicionar romaneio'}
            </button>
            {writeAccessBlocked ? (
              <p className="romaneios-form-note">
                <FiLock />
                <span>{writeBlockedReason}</span>
              </p>
            ) : null}
          </form>

          <div className="romaneios-intake-list">
            {intakeItems.length ? intakeItems.map((item) => (
              <div key={item.id} className="romaneios-intake-card draft">
                <div className="romaneios-intake-icon">
                  {item.status === 'pdf' ? <FiFileText /> : item.status === 'manual' ? <FiCheckCircle /> : <FiLock />}
                </div>
                <div className="romaneios-intake-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                  <span>{item.detail}</span>
                </div>
                {item.status === 'manual' ? (
                  <button type="button" className="romaneios-icon-button" onClick={() => removeManual(item.id)}>
                    <FiTrash2 />
                  </button>
                ) : null}
              </div>
            )) : (
              <div className="romaneios-empty-state">
                <FiInbox />
                <span>Nenhuma entrada manual ou PDF pendente.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

const numberFormat = new Intl.NumberFormat('pt-BR')

export default RomaneiosInbox
