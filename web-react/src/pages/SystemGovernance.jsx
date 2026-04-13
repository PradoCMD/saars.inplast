import { useState } from 'react'
import { FiUsers, FiLink, FiShield, FiAlertTriangle } from 'react-icons/fi'
import StatePanel from '../components/StatePanel'
import SourcesGovernance from './SourcesGovernance'

function SystemGovernance({
  sourcesState,
  usersState,
  integrationsState,
  alertsState,
  scopeLabel,
  searchQuery,
  canSyncSources,
  onSyncSources,
  syncBusy,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState('fontes')

  const users = Array.isArray(usersState?.data?.items) ? usersState.data.items : []
  const integrations = Array.isArray(integrationsState?.data?.items) ? integrationsState.data.items : []

  return (
    <div className="governance-page animate-in">
      {/* Module Title / Intro */}
      <section className="sources-hero" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
         <div className="sources-hero-main">
          <div className="cockpit-kicker">Administração e Governança</div>
          <h2>Usuários, Fontes Sistêmicas e Integrações Oficiais</h2>
          <p style={{ marginTop: '0.5rem' }}>Central de tratamento de acesso, rastreabilidade de requisições webhooks via N8N e Sankhya e permissões de papeis no sistema. Escolha a aba desejada abaixo para diagnosticar ou alterar.</p>
         </div>
      </section>

      {/* Tabs */}
      <nav className="module-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('fontes')}
          className={`btn ${activeTab === 'fontes' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FiShield /> Tratamento de Fontes e Alertas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FiUsers /> Usuários do Sistema
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('integrations')}
          className={`btn ${activeTab === 'integrations' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FiLink /> Webhooks e Integrações
        </button>
      </nav>

      {/* Content Rendering */}
      {activeTab === 'fontes' && (
        <SourcesGovernance
          resourceState={sourcesState}
          alertsState={alertsState}
          scopeLabel={scopeLabel}
          searchQuery={searchQuery}
          canSyncSources={canSyncSources}
          onSyncSources={onSyncSources}
          syncBusy={syncBusy}
          onNavigate={onNavigate}
        />
      )}

      {activeTab === 'users' && (
        <section className="glass-panel animate-in">
          <div className="panel-header">
            <div>
              <h3>Gestão de Usuários</h3>
              <span>Papéis e liberação de acessos aos módulos operacionais do PCP.</span>
            </div>
          </div>
          
          {usersState.status === 'loading' ? (
             <StatePanel kind="loading" title="Buscando Lista" message="Carregando matriz de usuários autenticados..." compact />
          ) : usersState.status === 'permission' || usersState.status === 'error' ? (
             <StatePanel kind={usersState.status} title="Restrito" message="Seu papel não tem visão administrativa detalhada ou a rota falhou." compact />
          ) : users.length ? (
             <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                 <table className="data-table">
                   <thead>
                     <tr>
                        <th>Usuário</th>
                        <th>Perfil (Role)</th>
                        <th>Filiais Alocadas</th>
                        <th>Status</th>
                     </tr>
                   </thead>
                   <tbody>
                      {users.map((u, i) => (
                        <tr key={u.id || i}>
                           <td><strong>{u.username || u.name}</strong></td>
                           <td><span className="tag info">{u.role || 'INDEFINIDO'}</span></td>
                           <td>{u.company_scope ? (Array.isArray(u.company_scope) ? u.company_scope.join(', ') : u.company_scope) : 'Sem restrição explícita'}</td>
                           <td><span className="tag ok">Ativo</span></td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
             </div>
          ) : (
             <StatePanel kind="empty" title="Sem Usuários Mapeados" message="Não foi possível listar os usuários na chamada local." compact />
          )}
        </section>
      )}

      {activeTab === 'integrations' && (
        <section className="glass-panel animate-in">
          <div className="panel-header">
            <div>
              <h3>Contratos de Integração Ativos</h3>
              <span>Lista de webhooks configurados e endpoints que repassam cargas parciais.</span>
            </div>
          </div>
          
          {integrationsState.status === 'loading' ? (
             <StatePanel kind="loading" title="Buscando Contratos" message="Avaliando endpoints ativos..." compact />
          ) : integrationsState.status === 'permission' || integrationsState.status === 'error' ? (
             <StatePanel kind={integrationsState.status} title="Restrito" message="Acesso negado às confidenciais de endpoints de gateway." compact />
          ) : integrations.length ? (
             <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                 <table className="data-table">
                   <thead>
                     <tr>
                        <th>Código/Provider</th>
                        <th>URL do Webhook</th>
                        <th>Tipo</th>
                        <th>Status</th>
                     </tr>
                   </thead>
                   <tbody>
                      {integrations.map((cfg, i) => (
                        <tr key={cfg.id || i}>
                           <td><strong>{cfg.integration_code || cfg.name || 'Desconhecido'}</strong></td>
                           <td style={{ opacity: 0.6 }}>{cfg.webhook_url || cfg.url || '---'}</td>
                           <td><span className="tag info">{cfg.type || 'PULL'}</span></td>
                           <td><span className="tag ok">Conectado</span></td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
             </div>
          ) : (
             <StatePanel kind="empty" title="Nenhuma Integração Explorada" message="O banco não revelou webhooks adicionais nesta leitura." compact />
          )}
        </section>
      )}

    </div>
  )
}

export default SystemGovernance
