import React, { useState, useEffect } from 'react'
import { FiSave, FiHash, FiCpu, FiPlus, FiCheckCircle, FiArchive, FiActivity } from 'react-icons/fi'
import StatePanel from '../components/StatePanel'

export default function Apontamento({ 
  productionState, 
  onSaveEntry, 
  saveBusy,
  accessToken,
  onRequestReload 
}) {
  const [formData, setFormData] = useState({
    op_code: '',
    machine_id: '',
    quantity: '',
    operator: '',
    obs: ''
  })
  
  const [successMessage, setSuccessMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.op_code || !formData.quantity) return
    
    const success = await onSaveEntry(formData)
    if (success) {
      setSuccessMessage(`Apontamento da OP ${formData.op_code} registrado com sucesso!`)
      setFormData({
        op_code: '',
        machine_id: '',
        quantity: '',
        operator: '',
        obs: ''
      })
      setTimeout(() => setSuccessMessage(null), 5000)
    }
  }

  // Estatísticas Rápidas baseadas no productionState (Mock ou real do PCP)
  const logs = Array.isArray(productionState?.data?.items) ? productionState.data.items : []
  const todayCount = logs.length 

  return (
    <div className="apontamento-page animate-in">
      <header className="page-header premium-header">
        <div className="header-main">
          <div className="cockpit-kicker">PÉ DE FÁBRICA / EXECUÇÃO</div>
          <h1>Apontamento de Produção</h1>
          <p>Registro de produtividade e alimentação de dados para o ecossistema Sankhya.</p>
        </div>

        <div className="metrics-grid" style={{ marginTop: '24px' }}>
          <div className="metric-card tone-ok">
            <small>Registros Hoje</small>
            <strong>{todayCount}</strong>
            <span>Apontamentos realizados</span>
          </div>
          <div className="metric-card tone-info">
            <small>Eficiência Operacional</small>
            <strong>92%</strong>
            <div className="status-dot ok"></div>
          </div>
        </div>
      </header>

      <div className="apontamento-grid" style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '24px' }}>
        
        <div className="apontamento-form-area">
          <section className="glass-panel" style={{ padding: '32px' }}>
            <div className="panel-header" style={{ marginBottom: '32px' }}>
              <div className="header-info">
                <h3>Novo Registro de Produção</h3>
                <span>Preencha os dados da Ordem de Produção ativa.</span>
              </div>
              <FiPlus style={{ fontSize: '24px', opacity: 0.2 }} />
            </div>

            {successMessage && (
              <div className="alert-card tone-ok animate-in" style={{ marginBottom: '24px' }}>
                <FiCheckCircle />
                <strong>{successMessage}</strong>
              </div>
            )}

            <form className="premium-form" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="form-group">
                <label><FiHash /> Nº da Ordem de Produção (OP)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: OP-2026-0045"
                  value={formData.op_code}
                  onChange={e => setFormData({...formData, op_code: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label><FiCpu /> Centro de Trabalho (Máquina)</label>
                <select 
                  value={formData.machine_id}
                  onChange={e => setFormData({...formData, machine_id: e.target.value})}
                >
                  <option value="">Selecione a máquina</option>
                  <option value="EXT-01">Extrusora 01</option>
                  <option value="EXT-02">Extrusora 02</option>
                  <option value="COR-01">Corte e Solda 01</option>
                  <option value="IMP-01">Impressora Flexo</option>
                </select>
              </div>

              <div className="form-group">
                <label><FiActivity /> Quantidade Produzida (kg/un)</label>
                <input 
                  type="number" 
                  required 
                  placeholder="0.00"
                  step="0.01"
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Operador Responsável</label>
                <input 
                  type="text" 
                  placeholder="Nome do operador"
                  value={formData.operator}
                  onChange={e => setFormData({...formData, operator: e.target.value})}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Observações / Ocorrências</label>
                <textarea 
                  rows="3" 
                  placeholder="Ex: Parada para ajuste de tensão no filme..."
                  value={formData.obs}
                  onChange={e => setFormData({...formData, obs: e.target.value})}
                ></textarea>
              </div>

              <div className="form-actions" style={{ gridColumn: 'span 2', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '56px' }} disabled={saveBusy}>
                  <FiSave /> {saveBusy ? 'Registrando no Sankhya...' : 'Confirmar e Enviar Produção'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="apontamento-recent">
          <section className="glass-panel" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '24px' }}>
              <h3>Últimos Envios</h3>
              <FiArchive style={{ opacity: 0.3 }} />
            </div>

            <div className="logs-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logs.length > 0 ? logs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="alert-card tone-info" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>OP: {log.op_code}</strong>
                    <span className="tag ok">{log.quantity}kg</span>
                  </div>
                  <small style={{ opacity: 0.6, display: 'block' }}>Local: {log.machine_id}</small>
                  <small style={{ opacity: 0.4, display: 'block', fontSize: '10px' }}>{new Date(log.created_at).toLocaleTimeString()}</small>
                </div>
              )) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>
                  Nenhum registro recente.
                </div>
              )}
            </div>
          </section>
        </aside>

      </div>
    </div>
  )
}
