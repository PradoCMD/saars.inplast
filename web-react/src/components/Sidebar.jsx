import { FiBarChart2, FiLayers, FiPackage, FiTool, FiCalendar, FiSettings, FiShoppingCart, FiShield } from 'react-icons/fi';

function Sidebar({ activeView }) {
  const routes = [
    { id: 'cockpit', icon: <FiBarChart2 />, label: 'Cockpit' },
    { id: 'romaneios-kanban', icon: <FiLayers />, label: 'Kanban Logístico' },
    { id: 'romaneios', icon: <FiPackage />, label: 'Romaneios' },
    { id: 'estruturas', icon: <FiTool />, label: 'Estruturas' },
    { id: 'programacao', icon: <FiCalendar />, label: 'Programação' },
    { id: 'montagem', icon: <FiSettings />, label: 'Montagem (Esteiras)' },
    { id: 'producao', icon: <FiSettings />, label: 'Produção (Extrusoras)' },
    { id: 'compras', icon: <FiShoppingCart />, label: 'Compras' },
    { id: 'fontes', icon: <FiShield />, label: 'Governança' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 12L2 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <div className="logo-text">
            <strong>Inplast</strong>
            <span>Control Desk React</span>
          </div>
        </div>
      </div>

      <nav className="main-nav">
        {routes.map(r => (
          <a
            key={r.id}
            href={`#${r.id}`}
            className={`nav-item ${activeView === r.id ? 'active' : ''}`}
          >
            <span className="icon">{r.icon}</span>
            {r.label}
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-card">
          <div className="status-indicator live"></div>
          <div className="status-info">
            <strong>Sistema Ativo</strong>
            <span>Real-time React UI</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
