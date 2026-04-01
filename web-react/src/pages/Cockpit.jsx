// Cockpit.jsx
import { FiCheckCircle, FiAlertTriangle, FiDollarSign, FiClock, FiActivity } from 'react-icons/fi';

function Cockpit({ data }) {
  if (!data.loaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
         <span>Carregando telemetria...</span>
      </div>
    );
  }

  const rawTotals = data.overview?.totals || {};
  const stats = [
    { label: 'Estoque Útil', value: (rawTotals.estoque_atual || 0).toLocaleString('pt-BR'), hint: 'Atendimento Imediato', tone: 'ok' },
    { label: 'Carteira Romaneios', value: (rawTotals.necessidade_romaneios || 0).toLocaleString('pt-BR'), hint: 'Demanda ERP', tone: 'info' },
    { label: 'Fila de Montagem', value: (rawTotals.necessidade_montagem || 0).toLocaleString('pt-BR'), hint: 'Aguardando Esteiras', tone: 'warning' },
    { label: 'Fila Produção', value: (rawTotals.necessidade_producao || 0).toLocaleString('pt-BR'), hint: 'Fila de Extrusão', tone: 'warning' },
    { label: 'Sem Previsão', value: (rawTotals.romaneios_sem_previsao || 0), hint: 'Cargas pendentes', tone: 'missing' }
  ];

  return (
    <div className="view-module animate-in w-full h-full" style={{ display: 'block' }}>
      
      {/* Hero Section */}
      <div className="cockpit-hero">
        <div className="hero-left">
          <h2>Orquestração do PCP</h2>
          <p>Um cockpit único para enxergar carteira, gargalos operativos e ritmo logístico.</p>
          <div className="last-sync" style={{ marginTop: '24px', fontSize: '0.85rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Snapshot validado:</span>
             <strong style={{ marginLeft: '8px' }}>Agora mesmo</strong>
             <span className="status-badge ready" style={{ marginLeft: '12px' }}>Pronto</span>
          </div>
        </div>

        <div className="hero-right">
           <div className="coverage-widget">
               <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Cobertura Imediata</h3>
               <div className="coverage-meter-container">
                   <div className="coverage-meter-head">
                       <strong>85%</strong>
                       <span>45k de 52k cobertos.</span>
                   </div>
                   <div className="coverage-bar">
                      <span className="coverage-fill ok" style={{ width: '85%' }}></span>
                      <span className="coverage-fill gap" style={{ width: '15%' }}></span>
                   </div>
               </div>
           </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
         {stats.map((s, i) => (
            <div key={i} className="stat-card">
               <small>{s.label}</small>
               <strong>{s.value}</strong>
               <em>{s.hint}</em>
            </div>
         ))}
      </div>

      {/* Placeholder layout for reports */}
      <div className="grid-layout-2" style={{ marginTop: '24px' }}>
          <div className="glass-panel">
              <div className="panel-header">
                  <h3>Radar da Operação</h3>
              </div>
              <div className="list-container">
                 {data.overview?.top_criticos?.slice(0,2).map((c, i) => (
                   <div key={i} className="list-card">
                      <div className="item-row">
                         <div>
                            <small>Gargalo</small>
                            <strong>{c.sku} {c.produto}</strong>
                         </div>
                         <span className={`tag ${c.criticidade?.toLowerCase()}`}>{c.criticidade}</span>
                      </div>
                      <em>Saldo {c.saldo}, exige {c.acao}.</em>
                   </div>
                 ))}
                 {(!data.overview?.top_criticos || data.overview?.top_criticos.length === 0) && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nenhum item crítico neste passe do MRP.</div>
                 )}
              </div>
          </div>
      </div>

    </div>
  );
}

export default Cockpit;
