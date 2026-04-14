import React, { useState } from 'react'
import { FiLink, FiUsers, FiDatabase, FiRefreshCw, FiZap, FiShield, FiPlus, FiSave, FiX, FiTrash2 } from 'react-icons/fi'
import StatePanel from '../components/StatePanel'
import SourcesGovernance from './SourcesGovernance'

export default function SystemGovernance({ 
  sourcesState, 
  alertsState, 
  usersState, 
  integrationsState, 
  onRequestReload,
  onSyncSources,
  syncBusy,
  onNavigate,
  accessToken
}) {
  const [activeTab, setActiveTab] = useState('integrations')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saveBusy, setSaveBusy] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    integration_type: 'n8n_webhook_romaneios',
    target_source: '',
    active: true
  })

  // Normalização de dados
  const users = Array.isArray(usersState?.data?.items) ? usersState.data.items : []
  const integrationsRaw = integrationsState?.data?.items || integrationsState?.data || []
  const integrations = Array.isArray(integrationsRaw) ? integrationsRaw : []
  const sources = Array.isArray(sourcesState?.data?.items) ? sourcesState.data.items : []

  const stats = {
    sources: sources.length,
    okSources: sources.filter(s => s.freshness_status === 'ok').length,
    activeIntegrations: integrations.filter(i => i.active).length,
    registeredUsers: users.length
  }

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      name: item.name,
      webhook_url: item.webhook_url,
      integration_type: item.integration_type,
      target_source: item.target_source || '',
      active: item.active
    })
    setEditingId(item.id)
    setIsAdding(true)
  }

  const handleResetForm = () => {
    setFormData({
      name: '',
      webhook_url: '',
      integration_type: 'n8n_webhook_romaneios',
      target_source: '',
      active: true
    })
    setEditingId(null)
    setIsAdding(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveBusy(true)
    try {
      const resp = await fetch('/api/pcp/integrations/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData)
      })
      if (resp.ok) {
        handleResetForm()
        onRequestReload?.()
      } else {
        const err = await resp.json()
        alert('Erro ao salvar: ' + (err.detail || 'Falha desconhecida'))
      }
    } catch (err) {
      alert('Erro de rede: ' + err.message)
    } finally {
      setSaveBusy(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta integração permanentemente?')) return
    try {
      const resp = await fetch('/api/pcp/integrations/delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ id })
      })
      if (resp.ok) onRequestReload?.()
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  return (
    <div className="governance-page animate-in">
      <header className="page-header premium-header">
        <div className="header-main">
          <div className="cockpit-kicker">CONTROL DESK / INFRAESTRUTURA</div>
          <h1>Governança e Saúde do Ecossistema</h1>
          <p>Gestão de ativos de dados, usuários autorizados e integridade dos túneis de sincronização n8n.</p>
        </div>

        <div className="metrics-grid" style={{ marginTop: '24px' }}>
          <div className="metric-card tone-ok">
            <small>Saúde das Fontes</small>
            <strong>{stats.okSources}/{stats.sources}</strong>
            <div className={`status-dot ${stats.okSources === stats.sources ? 'ok' : 'warning'}`}></div>
          </div>
          <div className="metric-card tone-info">
            <small>Portas de Entrada</small>
            <strong>{stats.activeIntegrations}</strong>
            <span>Webhooks ativos</span>
          </div>
          <div className="metric-card tone-high">
            <small>Acesso Restrito</small>
            <strong>{stats.registeredUsers}</strong>
            <span>Contas auditadas</span>
          </div>
        </div>
      </header>

      <nav className="tabs-nav glass-panel" style={{ marginTop: '32px' }}>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`tab-item ${activeTab === 'integrations' ? 'active' : ''}`}
        >
          <FiZap /> Integrações & Webhooks
        </button>
        <button
          onClick={() => setActiveTab('fontes')}
          className={`tab-item ${activeTab === 'fontes' ? 'active' : ''}`}
        >
          <FiDatabase /> Fontes de Dados
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`tab-item ${activeTab === 'users' ? 'active' : ''}`}
        >
          <FiUsers /> Usuários do Sistema
        </button>
      </nav>

      <div className="tab-pane-container" style={{ marginTop: '24px' }}>
        {activeTab === 'integrations' && (
          <div className="integrations-view">
            {isAdding ? (
              <div className="glass-panel animate-in" style={{ padding: '32px', marginBottom: '24px' }}>
                <div className="panel-header" style={{ marginBottom: '24px' }}>
                  <h3>{editingId ? 'Editar Integração' : 'Novo Webhook n8n / Sankhya'}</h3>
                  <button className="btn-logout-minimal" onClick={handleResetForm}><FiX /></button>
                </div>
                <form className="premium-form" onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label>Nome Amigável</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Romaneios Filial 1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Sincronia</label>
                    <select 
                      value={formData.integration_type}
                      onChange={e => setFormData({...formData, integration_type: e.target.value})}
                    >
                      <option value="n8n_webhook_romaneios">Romaneios / Expedição</option>
                      <option value="n8n_webhook_stock">Estoque / Movimentação</option>
                      <option value="n8n_webhook_production">Apontamento de Produção</option>
                      <option value="sankhya_direct">Sankhya Direct API</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>URL do Webhook (n8n ou Gateway Sankhya)</label>
                    <input 
                      type="url" 
                      required 
                      value={formData.webhook_url}
                      onChange={e => setFormData({...formData, webhook_url: e.target.value})}
                      placeholder="https://sua-instancia.n8n.cloud/webhook/..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Fonte Alvo (Opcional)</label>
                    <select 
                      value={formData.target_source}
                      onChange={e => setFormData({...formData, target_source: e.target.value})}
                    >
                      <option value="">Todas as fontes da área</option>
                      {sources.map(s => <option key={s.source_code} value={s.source_code}>{s.source_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.active}
                      onChange={e => setFormData({...formData, active: e.target.checked})}
                      id="active-check"
                    />
                    <label htmlFor="active-check" style={{ marginBottom: 0 }}>Canal Ativo para Sincronia</label>
                  </div>
                  <div className="form-actions" style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button type="submit" className="btn btn-primary" disabled={saveBusy}>
                      <FiSave /> {saveBusy ? 'Gravando...' : 'Salvar Configuração'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleResetForm}>Cancelar</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div className="panel-header" style={{ marginBottom: '24px' }}>
                  <div className="header-info">
                    <h3>Malha de Conexões Externas</h3>
                    <span>Webhooks n8n autorizados para ingestão de dados.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={onRequestReload}>
                      <FiRefreshCw className={integrationsState?.status === 'loading' ? 'spin' : ''} />
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                      <FiPlus /> Adicionar Conexão
                    </button>
                  </div>
                </div>

                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Identificação</th>
                        <th>Tipo / Área</th>
                        <th>Destino</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {integrations.map(item => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                            <small style={{ display: 'block', opacity: 0.5 }}>{item.id}</small>
                          </td>
                          <td><span className="tag info">{item.integration_type.replace('n8n_webhook_', '')}</span></td>
                          <td><code style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{item.webhook_url}</code></td>
                          <td>
                            <span className={`status-pill ${item.active ? 'ok' : 'error'}`}>
                              {item.active ? 'OPERANDO' : 'PAUSADO'}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-logout-minimal" style={{ color: 'var(--accent-primary)', borderColor: 'var(--line-soft)' }} onClick={() => handleEdit(item)}>
                              <FiZap />
                            </button>
                            <button className="btn-logout-minimal" onClick={() => handleDelete(item.id)}>
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fontes' && (
          <SourcesGovernance 
            resourceState={sourcesState}
            alertsState={alertsState}
            onSyncSources={onSyncSources}
            syncBusy={syncBusy}
            onNavigate={onNavigate}
            searchQuery=""
            canSyncSources={true}
            scopeLabel="Governança Lateral"
          />
        )}

        {activeTab === 'users' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
             <div className="panel-header" style={{ marginBottom: '24px' }}>
              <h3>Controle de Acessos</h3>
              <span>Lista de usuários com permissões específicas no shell oficial.</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Codinome</th>
                  <th>Cargo / Papel</th>
                  <th>Escopo Geográfico</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.username}>
                    <td><FiUsers style={{ marginRight: '8px', opacity: 0.5 }} /> <strong>{u.username}</strong></td>
                    <td><span className="tag info">{u.role}</span></td>
                    <td>{u.company_scope || 'Global'}</td>
                    <td><span className="status-pill ok">AUTORIZADO</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
