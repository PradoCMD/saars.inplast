import { useState, useRef, useEffect } from 'react'
import { FiAlertTriangle, FiCalendar, FiPackage, FiShield, FiXCircle, FiUser, FiMapPin, FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import StatePanel from '../components/StatePanel'
import { requestJson } from '../lib/api'

const numFmt = new Intl.NumberFormat('pt-BR')
const curFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// ---------- helpers de data ----------

function toLocalDateKey(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return null
  // chave no formato YYYY-MM-DD no fuso local
  return d.toLocaleDateString('sv-SE') // "sv-SE" dá YYYY-MM-DD
}

function formatDateHeader(dateKey) {
  // dateKey = "YYYY-MM-DD"
  const [year, month, day] = dateKey.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)

  const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  if (diff === 0) return { label: `Hoje — ${label}`, tone: 'warning' }
  if (diff === 1) return { label: `Amanhã — ${label}`, tone: 'info' }
  if (diff < 0)  return { label: `Atrasado — ${label}`, tone: 'high' }
  return { label, tone: 'ok' }
}

function formatDateTime(value) {
  if (!value) return 'Sem previsão'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function toDateTimeLocalValue(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

// ---------- agrupamento em lanes dinâmicas ----------

function buildLanes(items) {
  const missing = { id: 'missing', title: 'Sem Programação', tone: 'danger', items: [] }
  const byDate = {} // dateKey → { id, title, tone, date, items }

  items.forEach((item) => {
    const key = toLocalDateKey(item.previsao_saida_at)
    if (!key) {
      missing.items.push(item)
      return
    }
    if (!byDate[key]) {
      byDate[key] = { id: `date-${key}`, dateKey: key, items: [] }
    }
    byDate[key].items.push(item)
  })

  // ordena as datas
  const dateLanes = Object.values(byDate).sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  const finalLanes = [missing, ...dateLanes]
  
  // -- CASCADING STOCK LOGIC --
  const runningStock = {} // sku -> number
  
  // 1. Initialize base stock mapping using the injected 'estoque_atual' from the backend. 
  finalLanes.forEach(lane => {
    lane.items.forEach(item => {
      (item.items || []).forEach(p => {
        if (p.sku && runningStock[p.sku] === undefined) {
          runningStock[p.sku] = Number(p.estoque_atual || 0)
        }
      })
    })
  })

  // 2. Cascade reductions
  finalLanes.forEach(lane => {
    lane.items.forEach(item => {
      if (item.items) {
        item.items = item.items.map(p => {
          if (!p.sku) return p
          
          const currentStock = runningStock[p.sku]
          const req = Number(p.quantidade || p.quantidade_demanda || 0)
          const newStock = currentStock - req
          
          runningStock[p.sku] = newStock
          
          return {
            ...p,
            quantidade_demanda: req,
            cascading_estoque_atual: currentStock,
            estoque_apos_saida: newStock,
            necessidade_producao_cascata: Math.max(0, -newStock)
          }
        })
      }
    })
  })

  return finalLanes
}

// ---------- filtro de busca ----------

function filterBySearch(items, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const hay = [
      item.romaneio,
      item.empresa,
      item.parceiro,
      item.cidade,
      ...(item.pedidos_mercur || []),
      ...(item.items || []).map((d) => `${d.sku} ${d.produto}`),
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })
}

// ---------- card de produto ----------
// Removed standard ProductRow since we use the premium table now

// ---------- card de romaneio ----------

function RomaneioCard({ item, index, canManageDates, accessToken, onUnauthorizedSession, selectedCompany, onRequestReload, onNavigate, setNotice }) {
  const [editing, setEditing] = useState(false)
  const [editingValue, setEditingValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const pedidos = item.pedidos_mercur || []
  const produtos = item.items || []
  const totalNecessidadeProducao = produtos.reduce((acc, p) => acc + (p.necessidade_producao_cascata > 0 ? p.necessidade_producao_cascata : 0), 0)

  async function handleSave(clearSchedule = false) {
    setSaving(true)
    try {
      const body = {
        romaneio: item.romaneio,
        empresa: item.empresa || selectedCompany,
        company_code: item.empresa || selectedCompany,
        previsao_saida_at: clearSchedule ? null : (editingValue ? new Date(editingValue).toISOString() : null),
        reason: clearSchedule ? 'pcp_manual_clear' : 'pcp_manual',
      }
      if (!body.company_code) throw new Error('Selecione uma empresa ativa antes de salvar.')
      if (!clearSchedule && !body.previsao_saida_at) throw new Error('Informe uma data antes de salvar.')

      await requestJson('/api/pcp/romaneios-kanban/update-date', {
        method: 'POST', body, accessToken, onUnauthorized: onUnauthorizedSession,
      })

      setNotice({
        tone: clearSchedule ? 'warning' : 'success',
        message: clearSchedule
          ? `Previsão removida — Romaneio ${item.romaneio}`
          : `Data de saída definida — Romaneio ${item.romaneio}`,
      })
      setEditing(false)
      setEditingValue('')
      onRequestReload?.()
    } catch (err) {
      setNotice({ tone: 'error', message: err.message || 'Erro ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Draggable draggableId={`romaneio-${item.romaneio}`} index={index} isDragDisabled={!canManageDates}>
      {(provided, snapshot) => (
        <article 
          className={`kanban-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >

      {/* cabeçalho: número do romaneio + empresa */}
      <div className="kanban-card-head">
        <div>
          <small>{item.empresa}</small>
          <button type="button" className="kanban-card-romaneio-link" 
            onClick={() => onNavigate?.('romaneios', { romaneio: item.romaneio, originView: 'romaneios-kanban' })}>
            Romaneio {item.romaneio}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span className={`tag ${item.previsao_saida_at ? 'ok' : 'high'}`}>
            {item.previsao_saida_at ? formatDateTime(item.previsao_saida_at) : 'Sem data'}
          </span>
          {totalNecessidadeProducao > 0 && (
            <span className="tag warning" style={{ fontSize: '10px', padding: '2px 6px' }}>
              Faltam {numFmt.format(totalNecessidadeProducao)} un
            </span>
          )}
        </div>
      </div>

      {/* pedidos Mercur */}
      {pedidos.length > 0 && (
        <div className="kanban-card-pedidos">
          <span className="kanban-pedidos-label">Pedidos Mercur</span>
          <div className="kanban-pedidos-chips">
            {pedidos.map((p) => (
              <span key={p} className="kanban-pedido-chip">#{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* parceiro + cidade */}
      {(item.parceiro || item.cidade) && (
        <div className="kanban-card-meta">
          {item.parceiro && <span><FiUser size={12} /> {item.parceiro}</span>}
          {item.cidade && <span><FiMapPin size={12} /> {item.cidade}</span>}
        </div>
      )}

      {/* produtos com estoque */}
      {produtos.length > 0 && (
        <div className="kanban-products">
          <div className="kanban-products-header kanban-products-header-expandable" onClick={() => setIsExpanded(!isExpanded)}>
            <span className="kanban-products-title">Produtos e Estoque</span>
            <div className="kanban-products-expand-controls">
              <span className="tag info">{produtos.length} SKUs</span>
              {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </div>
          </div>
          {isExpanded && (
            <div className="kanban-premium-table-container">
              <table className="kanban-premium-table">
                <thead>
                  <tr>
                    <th>Nome dos Produtos</th>
                    <th className="text-right">Necessidade Romaneio</th>
                    <th className="text-right">Estoque atual</th>
                    <th className="text-right">Necessidade Produção</th>
                    <th className="text-right">Estoque após saída</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p, i) => {
                    const isOk = p.necessidade_producao_cascata <= 0
                    const afterDanger = p.estoque_apos_saida < 0
                    return (
                      <tr key={p.sku || i} className={afterDanger ? 'row-danger' : ''}>
                        <td>
                          <div className="kanban-product-name-col">
                            <span className="kanban-product-sku">{p.sku}</span>
                            <span className="kanban-product-name">{p.produto}</span>
                          </div>
                        </td>
                        <td className="text-right">{numFmt.format(p.quantidade_demanda || 0)}</td>
                        <td className="text-right">{numFmt.format(p.cascading_estoque_atual || 0)}</td>
                        <td className="text-right">
                          {isOk ? (
                            <span className="tag ok">✓ OK</span>
                          ) : (
                            <span className="tag high">Produzir: {numFmt.format(p.necessidade_producao_cascata)}</span>
                          )}
                        </td>
                        <td className={`text-right fw-bold ${afterDanger ? 'text-danger' : 'text-ok'}`}>
                          {numFmt.format(p.estoque_apos_saida || 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* totais */}
      <div className="kanban-card-footer">
        <span><FiPackage size={12} /> {numFmt.format(item.quantidade_total || 0)} un total</span>
        {item.valor_total ? <span>{curFmt.format(item.valor_total)}</span> : null}
      </div>

      {/* editor de data PCP */}
      {canManageDates && (
        <div className="kanban-card-editor">
          {editing ? (
            <>
              <label className="kanban-card-field">
                <span>Data de saída (PCP)</span>
                <input
                  type="date"
                  value={editingValue ? editingValue.slice(0, 10) : ''}
                  onChange={(e) => setEditingValue(e.target.value ? `${e.target.value}T00:00` : '')}
                  disabled={saving}
                />
              </label>
              <div className="kanban-card-editor-actions">
                <button type="button" className="btn btn-primary kanban-card-inline-action"
                  disabled={saving} onClick={() => handleSave()}>
                  {saving ? 'Salvando…' : 'Confirmar'}
                </button>
                <button type="button" className="btn btn-secondary kanban-card-inline-action"
                  disabled={saving} onClick={() => { setEditing(false); setEditingValue('') }}>
                  Cancelar
                </button>
                {item.previsao_saida_at && (
                  <button type="button" className="btn btn-secondary kanban-card-inline-action"
                    disabled={saving} onClick={() => handleSave(true)}>
                    <FiXCircle size={13} /> Remover
                  </button>
                )}
              </div>
            </>
          ) : (
            <button type="button" className="btn btn-secondary kanban-card-action"
              onClick={() => { setEditing(true); setEditingValue(toDateTimeLocalValue(item.previsao_saida_at)) }}>
              <FiCalendar size={13} />
              {item.previsao_saida_at ? 'Ajustar data' : 'Definir data de saída'}
            </button>
          )}
        </div>
      )}

      {/* link para expandir/detalhe ajustado para o layout interno */}
      {!isExpanded && (
        <button type="button" className="btn btn-secondary kanban-card-action kanban-card-detail-link"
          onClick={() => setIsExpanded(true)}>
          Ver detalhes <FiChevronDown size={14} style={{marginLeft: '4px'}}/>
        </button>
      )}
    </article>
      )}
    </Draggable>
  )
}

// ---------- lane ----------

function KanbanLane({ lane, canManageDates, accessToken, onUnauthorizedSession, selectedCompany, onRequestReload, onNavigate, setNotice, hasFilter, style }) {
  const isMissing = lane.id === 'missing'
  const header = isMissing
    ? { label: 'Sem Programação', tone: 'high' }
    : formatDateHeader(lane.dateKey)

  return (
    <article id={`lane-${lane.id}`} className={`kanban-lane animate-staggered ${isMissing ? 'kanban-lane-danger' : `tone-${header.tone}`}`} style={style}>
      <header className="kanban-lane-header">
        <div>
          {isMissing && <FiAlertTriangle className="lane-danger-icon" />}
          <h3>{header.label}</h3>
          {isMissing && <small>Requer atenção do PCP — definir data de saída</small>}
        </div>
        <span className={`kanban-lane-count ${isMissing && lane.items.length ? 'count-danger' : ''}`}>
          {lane.items.length}
        </span>
      </header>

      <Droppable droppableId={lane.id}>
        {(provided, snapshot) => (
          <div 
            className={`kanban-lane-body ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {lane.items.length ? lane.items.map((item, index) => (
              <RomaneioCard
                key={item.romaneio}
                index={index}
                item={item}
                canManageDates={canManageDates}
                accessToken={accessToken}
                onUnauthorizedSession={onUnauthorizedSession}
                selectedCompany={selectedCompany}
                onRequestReload={onRequestReload}
                onNavigate={onNavigate}
                setNotice={setNotice}
              />
            )) : (
          <StatePanel
            kind="empty"
            title={hasFilter ? 'Sem romaneios nesta data para este filtro' : 'Sem romaneios nesta data'}
            message={isMissing ? 'Ótimo — nenhum romaneio aguardando programação.' : 'Nenhum romaneio programado para esta data.'}
            compact
          />
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </article>
  )
}

// ---------- componente principal ----------

function KanbanBoard({
  resourceState,
  scopeLabel,
  searchQuery,
  canManageDates,
  accessToken,
  onUnauthorizedSession,
  selectedCompany,
  onRequestReload,
  onNavigate,
}) {
  const [notice, setNotice] = useState(null)
  const boardRef = useRef(null)

  const handleScroll = (dir) => {
    if (boardRef.current) {
      boardRef.current.scrollBy({ left: dir * 350, behavior: 'smooth' })
    }
  }

  async function handleDragEnd(result) {
    if (!canManageDates) return
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const droppedRomaneioId = draggableId.replace('romaneio-', '')
    const targetLaneId = destination.droppableId

    let previsao_saida_at = null
    if (targetLaneId !== 'missing') {
      const dateKey = targetLaneId.replace('date-', '')
      previsao_saida_at = new Date(`${dateKey}T00:00:00`).toISOString()
    }

    const payload = resourceState.data || { romaneios: [] }
    const items = payload.romaneios || []
    const item = items.find(r => r.romaneio === droppedRomaneioId)
    if (!item) return

    try {
      const body = {
        romaneio: item.romaneio,
        empresa: item.empresa || selectedCompany,
        company_code: item.empresa || selectedCompany,
        previsao_saida_at,
        reason: 'pcp_kanban_drag',
      }
      if (!body.company_code) throw new Error('Selecione uma empresa ativa antes de mover um romaneio.')

      await requestJson('/api/pcp/romaneios-kanban/update-date', {
        method: 'POST', body, accessToken, onUnauthorized: onUnauthorizedSession,
      })

      setNotice({ tone: 'success', message: `Data de saída atualizada — Romaneio ${item.romaneio}` })
      onRequestReload?.()
    } catch (err) {
      setNotice({ tone: 'error', message: err.message || 'Erro ao mover romaneio.' })
    }
  }

  if (resourceState.status === 'loading') {
    return <StatePanel kind="loading" title="Montando o kanban logístico" message="Buscando romaneios e programações de saída." />
  }
  if (resourceState.status === 'company') {
    return <StatePanel kind="company" title="Selecione uma empresa" message="O kanban precisa de um recorte por empresa para exibir a fila correta." />
  }
  if (resourceState.status === 'permission') {
    return <StatePanel kind="permission" title="Sem permissão" message={resourceState.error?.message || 'Sessão não autorizada para esta fila logística.'} />
  }
  if (resourceState.status === 'error') {
    return <StatePanel kind="error" title="Falha ao carregar o kanban" message={resourceState.error?.message || 'Não foi possível consultar os romaneios.'} />
  }

  const payload = resourceState.data || { romaneios: [], products: [] }
  const romaneios = filterBySearch(payload.romaneios || [], searchQuery)
  const hasFilter = Boolean(String(searchQuery || '').trim())
  const lanes = buildLanes(romaneios)
  const missingCount = lanes.find((l) => l.id === 'missing')?.items.length || 0

  return (
    <div className="kanban-page animate-in">

      {/* banner de alerta global para sem-data */}
      {missingCount > 0 && (
        <div className="shell-banner high">
          <FiAlertTriangle />
          <strong>{missingCount} {missingCount === 1 ? 'romaneio precisa' : 'romaneios precisam'} de programação</strong>
          <span>Defina a data de saída para que a logística possa planejar o carregamento.</span>
        </div>
      )}

      {notice && (
        <div className={`shell-banner ${notice.tone}`}>
          <strong>{notice.tone === 'success' ? '✓' : notice.tone === 'warning' ? '⚠' : '✗'}</strong>
          <span>{notice.message}</span>
          <button type="button" className="banner-close" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <section id="kanban-section" className="kanban-board-container">
        <div className="section-title-strip">
          <h3>Fila de Romaneios</h3>
          <span>{scopeLabel} · {romaneios.length} romaneios · {lanes.length - 1} datas programadas</span>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-scroll-wrapper">
            <button type="button" className="kanban-scroll-btn left" onClick={() => handleScroll(-1)} aria-label="Rolar para esquerda">
              <FiChevronLeft size={24} />
            </button>
            <section className="kanban-board" ref={boardRef}>
              {lanes.map((lane, idx) => (
                <KanbanLane
                  key={lane.id}
                  lane={lane}
                  canManageDates={canManageDates}
                  accessToken={accessToken}
                  onUnauthorizedSession={onUnauthorizedSession}
                  selectedCompany={selectedCompany}
                  onRequestReload={onRequestReload}
                  onNavigate={onNavigate}
                  setNotice={setNotice}
                  hasFilter={hasFilter}
                  style={{ animationDelay: `${idx * 0.08}s` }}
                />
              ))}
            </section>
            <button type="button" className="kanban-scroll-btn right" onClick={() => handleScroll(1)} aria-label="Rolar para direita">
              <FiChevronRight size={24} />
            </button>
          </div>
        </DragDropContext>
      </section>
    </div>
  )
}

export default KanbanBoard
