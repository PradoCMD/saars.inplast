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
  const [activeTab, setActiveTab] = useState('fontes') // 'integrations', 'fontes', 'users'
  const [saveBusy, setSaveBusy] = useState(false)
  
  // User Management State
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [editingUsername, setEditingUsername] = useState(null)
  const [userFormData, setUserFormData] = useState({
    username: '',
    full_name: '',
    role: 'operator',
    password: '',
    active: true,
    company_scope: '*',
    permissions: {
      cockpit: 'view',
      kanban: 'view',
      tracking: 'view',
      programming: 'view',
      sources: 'view',
      system: 'view',
      simulator: 'view'
    }
  })

  // Integrations Management State
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    integration_type: 'n8n_webhook_romaneios',
    webhook_url: '',
    target_source: '',
    active: true,
    config: {}
  })

  const MODULES = [
    { id: 'cockpit', label: 'Cockpit / Dashboard' },
    { id: 'kanban', label: 'Kanban Romaneios' },
    { id: 'tracking', label: 'Produção / Rastreamento' },
    { id: 'programming', label: 'Programming Center' },
    { id: 'sources', label: 'Fontes & Estoque' },
    { id: 'system', label: 'Governança (Este Módulo)' },
    { id: 'simulator', label: 'Simulador' }
  ]

  // Derivations
  const users = usersState.data?.items || []
  const integrations = integrationsState.data?.items || []
  const sources = sourcesState.data?.items || []

  const stats = {
    totalUsers: users.length,
    registeredUsers: users.length,
    activeIntegrations: integrations.filter(i => i && i.active).length,
    sources: sources.length,
    okSources: sources.filter(s => s && s.freshness_status === 'ok').length,
    outdatedSources: sources.filter(s => s && s.freshness_status !== 'ok').length
  }


  // Handlers - Users
  const handleEditUser = (user) => {
    setUserFormData({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      password: '',
      active: user.active,
      company_scope: Array.isArray(user.company_scope) ? user.company_scope.join(',') : user.company_scope || '*',
      permissions: user.permissions || {
        cockpit: 'view',
        kanban: 'view',
        tracking: 'view',
        programming: 'view',
        sources: 'view',
        system: 'view',
        simulator: 'view'
      }
    })
    setEditingUsername(user.username)
    setIsAddingUser(true)
  }

  const handleResetUserForm = () => {
    setUserFormData({
      username: '',
      full_name: '',
      role: 'operator',
      password: '',
      active: true,
      company_scope: '*',
      permissions: {
        cockpit: 'view',
        kanban: 'view',
        tracking: 'view',
        programming: 'view',
        sources: 'view',
        system: 'view',
        simulator: 'view'
      }
    })
    setEditingUsername(null)
    setIsAddingUser(false)
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    setSaveBusy(true)
    try {
      const payload = {
        ...userFormData,
        company_scope: userFormData.company_scope.split(',').map(s => s.trim())
      }
      const resp = await fetch('/api/pcp/users/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      })
      if (resp.ok) {
        handleResetUserForm()
        onRequestReload?.()
      } else {
        const err = await resp.json()
        alert('Erro ao salvar usuário: ' + (err.detail || 'Falha desconhecida'))
      }
    } catch (err) {
      alert('Erro de rede: ' + err.message)
    } finally {
      setSaveBusy(false)
    }
  }

  const handleDeleteUser = async (username) => {
    if (username === 'root') return alert('O usuário root é protegido.')
    if (!window.confirm(`Excluir o usuário "${username}" permanentemente?`)) return
    try {
      const resp = await fetch('/api/pcp/users/delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ username })
      })
      if (resp.ok) {
        onRequestReload?.()
      } else {
        const err = await resp.json().catch(() => ({}))
        alert('Erro ao excluir usuário: ' + (err.detail || err.error || 'Falha desconhecida'))
      }
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  // Handlers - Integrations
  const handleEdit = (intg) => {
    setFormData(intg)
    setEditingId(intg.id)
    setIsAdding(true)
  }

  const handleResetForm = () => {
    setFormData({
      id: '',
      name: '',
      integration_type: 'n8n_webhook_romaneios',
      webhook_url: '',
      target_source: '',
      active: true,
      config: {}
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
        alert('Erro ao salvar integração: ' + (err.detail || 'Falha desconhecida'))
      }
    } catch (err) {
      alert('Erro de rede: ' + err.message)
    } finally {
      setSaveBusy(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`Excluir a integração "${id}"?`)) return
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

  const togglePermission = (modId, level) => {
    setUserFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [modId]: level
      }
    }))
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
            <strong>{(stats.okSources || 0)}/{(stats.sources || 0)}</strong>

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
                      {sources.map(s => (
                        <option key={s?.source_code || Math.random()} value={s?.source_code || ''}>
                          {s?.source_name || s?.source_code || 'Fonte sem nome'}
                        </option>
                      ))}

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
                      {(integrations || []).map((item, idx) => (
                        <tr key={item?.id || idx}>
                          <td>
                            <strong>{item?.name || 'Integração s/ nome'}</strong>
                            <small style={{ display: 'block', opacity: 0.5 }}>{item?.id || '-'}</small>
                          </td>
                          <td><span className="tag info">{(item?.integration_type || '').replace('n8n_webhook_', '') || 'Custom'}</span></td>
                          <td><code style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{item?.webhook_url || '-'}</code></td>
                          <td>
                            <span className={`status-pill ${item?.active ? 'ok' : 'error'}`}>
                              {item?.active ? 'OPERANDO' : 'PAUSADO'}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-logout-minimal" style={{ color: 'var(--accent-primary)', borderColor: 'var(--line-soft)' }} onClick={() => handleEdit(item)}>
                              <FiZap />
                            </button>
                            <button className="btn-logout-minimal" onClick={() => handleDelete(item?.id)}>
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
          <div className="users-view">
            {isAddingUser ? (
              <div className="glass-panel animate-in" style={{ padding: '32px', marginBottom: '24px' }}>
                <div className="panel-header" style={{ marginBottom: '24px' }}>
                  <h3>{editingUsername ? 'Editar Usuário' : 'Novo Usuário do Sistema'}</h3>
                  <button className="btn-logout-minimal" onClick={handleResetUserForm}><FiX /></button>
                </div>
                <form className="premium-form" onSubmit={handleSaveUser}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label>ID / Username</label>
                      <input 
                        type="text" 
                        required 
                        disabled={!!editingUsername}
                        value={userFormData.username}
                        onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                        placeholder="Ex: joao.fabrica"
                      />
                    </div>
                    <div className="form-group">
                      <label>Nome Completo</label>
                      <input 
                        type="text" 
                        required 
                        value={userFormData.full_name}
                        onChange={e => setUserFormData({...userFormData, full_name: e.target.value})}
                        placeholder="Ex: João da Silva"
                      />
                    </div>
                    <div className="form-group">
                      <label>Perfil de Acesso (Base)</label>
                      <select 
                        value={userFormData.role}
                        onChange={e => setUserFormData({...userFormData, role: e.target.value})}
                      >
                        <option value="operator">Operador / Apontamento</option>
                        <option value="manager">Gestor / Planejador</option>
                        <option value="root">Administrador Full</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Senha {editingUsername ? '(vazio para manter)' : ''}</label>
                      <input 
                        type="password" 
                        required={!editingUsername}
                        value={userFormData.password}
                        onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Escopo de Empresas (Separado por vírgula ou '*' para todas)</label>
                      <input 
                        type="text" 
                        value={userFormData.company_scope}
                        onChange={e => setUserFormData({...userFormData, company_scope: e.target.value})}
                        placeholder="INPLAST, RECICLA"
                      />
                    </div>
                  </div>

                  <div className="permission-matrix" style={{ marginTop: '32px' }}>
                    <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiShield style={{ color: 'var(--brand-primary)' }} /> Matriz de Permissões por Módulo
                    </h4>
                    <div className="data-table-wrapper" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Módulo Operacional</th>
                            <th style={{ textAlign: 'center' }}>Nenhum</th>
                            <th style={{ textAlign: 'center' }}>Visualizar</th>
                            <th style={{ textAlign: 'center' }}>Editar / Operar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {MODULES.map(mod => (
                            <tr key={mod.id}>
                              <td><strong>{mod.label}</strong></td>
                              <td style={{ textAlign: 'center' }}>
                                <input 
                                  type="radio" 
                                  name={`perm-${mod.id}`} 
                                  checked={userFormData.permissions[mod.id] === 'none'} 
                                  onChange={() => togglePermission(mod.id, 'none')}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input 
                                  type="radio" 
                                  name={`perm-${mod.id}`} 
                                  checked={userFormData.permissions[mod.id] === 'view'} 
                                  onChange={() => togglePermission(mod.id, 'view')}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input 
                                  type="radio" 
                                  name={`perm-${mod.id}`} 
                                  checked={userFormData.permissions[mod.id] === 'edit'} 
                                  onChange={() => togglePermission(mod.id, 'edit')}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button type="submit" className="btn btn-primary" disabled={saveBusy}>
                      <FiSave /> {saveBusy ? 'Gravando...' : 'Salvar Usuário'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleResetUserForm}>Cancelar</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div className="panel-header" style={{ marginBottom: '24px' }}>
                  <div className="header-info">
                    <h3>Gestão de Autoridades</h3>
                    <span>Controle central de quem pode ver e o que pode editar.</span>
                  </div>
                  <button className="btn btn-primary" onClick={() => setIsAddingUser(true)}>
                    <FiPlus /> Novo Usuário
                  </button>
                </div>
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Usuário</th>
                        <th>Perfil</th>
                        <th>Escopo</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(users || []).map((u, idx) => (
                        <tr key={u?.username || idx}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="user-avatar-mini" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(var(--brand-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)', fontWeight: 700 }}>
                                {(u?.username || '?').substring(0, 1).toUpperCase()}
                              </div>

                              <div>
                                <strong>{u?.full_name || u?.username || 'Usuário s/ nome'}</strong>
                                <small style={{ display: 'block', opacity: 0.5 }}>@{u?.username || 'unknown'}</small>
                              </div>
                            </div>
                          </td>
                          <td><span className={`tag ${u?.role === 'root' ? 'high' : 'info'}`}>{String(u?.role || 'operator').toUpperCase()}</span></td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {(Array.isArray(u?.company_scope) ? u.company_scope : [u?.company_scope || '*']).map((s, sIdx) => (
                                <span key={s || sIdx} className="status-pill mini" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>{s}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill ${u?.active ? 'ok' : 'error'}`}>
                              {u?.active ? 'AUTORIZADO' : 'INATIVO'}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-logout-minimal" style={{ color: 'var(--accent-primary)', borderColor: 'var(--line-soft)' }} onClick={() => handleEditUser(u)}>
                              <FiZap />
                            </button>
                            {u?.username !== 'root' && (
                              <button className="btn-logout-minimal" onClick={() => handleDeleteUser(u?.username)}>
                                <FiTrash2 />
                              </button>
                            )}
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
      </div>
    </div>
  )
}
