import { FiBox, FiClock, FiLayers, FiRefreshCw, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import StatePanel from '../components/StatePanel'

function formatDateTime(value) {
  if (!value) return 'Sem registro'
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

function filterItems(items, query) {
  const normalized = String(query || '').trim().toLowerCase()
  if (!normalized) return items

  return items.filter((item) => (
    [item.sku, item.description, item.type, item.source_code, item.source_area]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalized)
  ))
}

function StockMovements({ resourceState, searchQuery, filterType, onRequestReload }) {
  if (resourceState.status === 'loading' && !resourceState.data) {
    return (
      <StatePanel
        kind="loading"
        title="Carregando saldos e movimentações"
        message="Buscando os níveis atuais de estoque de todas as origens mapeadas."
      />
    )
  }

  if (resourceState.status === 'permission') {
    return (
      <StatePanel
        kind="permission"
        title="Seu perfil não acessa saldos"
        message="A visualização de estoques requer permissões gerenciais ou específicas."
      />
    )
  }

  if (resourceState.status === 'error') {
    return (
      <StatePanel
        kind="error"
        title="Falha ao sincronizar o estoque"
        message={resourceState.error?.message || 'Não foi possível buscar a carga de saldos atual.'}
      />
    )
  }

  const items = Array.isArray(resourceState.data?.items) ? resourceState.data.items : []
  
  // Mapeamento de tipos para o filtro
  const typeMap = {
    'estoque-intermediario': 'intermediario',
    'materia-prima': 'mp',
    'componentes': 'componente'
  }
  
  const targetType = typeMap[filterType] || filterType

  const filtered = filterItems(items, searchQuery).filter(item => {
    if (!targetType) return true
    return String(item.type || '').toLowerCase().includes(targetType.toLowerCase()) ||
           String(item.source_area || '').toLowerCase().includes(targetType.toLowerCase())
  })
  
  // Fake summary since data shape is opaque for now
  const summary = {
    total: filtered.length,
    entradas: filtered.filter((i) => i.type === 'in' || i.type === 'entrada').length,
    saidas: filtered.filter((i) => i.type === 'out' || i.type === 'saida').length,
    balance: filtered.filter((i) => i.type === 'balance' || i.type === 'saldo').length || filtered.length,
  }

  return (
    <div className="stock-page animate-in">
      <section className="sources-hero">
        <div className="sources-hero-main">
          <div className="cockpit-kicker">Estoque e Movimentações</div>
          <h2>
            {summary.total
              ? `Visão unificada: ${summary.total} registros indexados no estoque corrente.`
              : 'Sem dados correntes. Nenhuma movimentação recente registrada na base.'}
          </h2>
          <p>
            Acompanhe o nivelamento dos saldos do ERP, o registro de entradas e as alocações da malha produtiva de forma exclusiva. 
            O inventário listado abaixa sincroniza-se nos limites do snapshot.
          </p>

          <div className="metrics-grid" style={{ marginTop: '2rem' }}>
            <article className="metric-card tone-info">
              <small>Saldos de materiais</small>
              <strong>{summary.balance}</strong>
              <span>Posições atuais do estoque</span>
            </article>
            <article className="metric-card tone-ok">
              <small>Entradas registradas</small>
              <strong>{summary.entradas}</strong>
              <span>Inbounds recentes rastreados</span>
            </article>
            <article className="metric-card tone-warning">
              <small>Saídas registradas</small>
              <strong>{summary.saidas}</strong>
              <span>Outbounds ou emprenhos rastreados</span>
            </article>
          </div>
        </div>

        <aside className="glass-panel sources-hero-side">
          <small>Status de leitura</small>
          <strong>
            {resourceState.data?.snapshot_at ? 'Conectado e validado' : 'Aguardando validação'}
          </strong>
          <p>
            Os sinais do inventário e das tabelas de estoques unificados são cacheados localmente ou atualizados perante as APIS em background.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onRequestReload && onRequestReload()}
          >
            <FiRefreshCw />
            Forçar recarregamento view
          </button>
        </aside>
      </section>

      <section className="glass-panel" style={{ marginTop: '2rem' }}>
        <div className="panel-header">
          <div>
            <h3>Lista de Saldo e Histórico</h3>
            <span>Resultados aplicados para sua filial (Total: {filtered.length})</span>
          </div>
          <span className="tag info">{filtered.length} visíveis</span>
        </div>

        {filtered.length ? (
          <div className="data-table-wrapper" style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU / Produto</th>
                  <th>Tipo</th>
                  <th>Origem / Depósito</th>
                  <th>Quantidade</th>
                  <th>Data/Hora Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>
                      <strong>{item.sku || 'N/D'}</strong>
                      {item.description && <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7 }}>{item.description}</span>}
                    </td>
                    <td>
                      <span className={`tag ${item.type === 'in' ? 'ok' : item.type === 'out' ? 'warning' : 'info'}`}>
                        {item.type === 'in' ? <FiTrendingUp /> : item.type === 'out' ? <FiTrendingDown /> : <FiLayers />}
                        {' '}
                        {String(item.type || 'saldo').toUpperCase()}
                      </span>
                    </td>
                    <td>{item.source_area || item.source_code || 'Geral'}</td>
                    <td><strong>{item.quantity || 0}</strong> {item.uom || 'UN'}</td>
                    <td><FiClock style={{ marginRight: '0.5rem', opacity: 0.5 }} />{formatDateTime(item.timestamp || item.created_at || item.snapshot_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StatePanel
            kind="empty"
            title="Nenhum registro"
            message="O filtro atual ou a consulta retornou vazia nas bases."
            compact
          />
        )}
      </section>
    </div>
  )
}

export default StockMovements
