import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiLayers,
  FiMoon,
  FiSun,
  FiPackage,
  FiSettings,
  FiShield,
  FiShoppingCart,
  FiSmartphone,
  FiTool,
  FiTrendingUp,
} from 'react-icons/fi'

const ICONS = {
  cockpit: FiBarChart2,
  apontamento: FiSmartphone,
  'romaneios-kanban': FiLayers,
  romaneios: FiPackage,
  estoque: FiLayers,
  estruturas: FiTool,
  programacao: FiCalendar,
  injecao: FiTool,
  extrusao: FiTrendingUp,
  montagem: FiSettings,
  producao: FiActivity,
  compras: FiShoppingCart,
  governanca: FiShield,
}

function Sidebar({ activeView, routes, currentUser, selectedCompany, freshnessLabel, companySelectionRequired, theme, toggleTheme }) {
  const roleLabel = String(currentUser?.role || 'operator').toUpperCase()
  const scopeLabel = selectedCompany || 'Consolidado'

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-box">
          <div className="logo-mark" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img src="/inplast-logo.png" alt="Inplast Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="logo-text">
            <strong>Inplast</strong>
            <span>Control Desk React</span>
          </div>
        </div>

        <div className="sidebar-compact-context">
          <small>{companySelectionRequired ? 'Empresa pendente' : 'Escopo ativo'}</small>
          <strong>{scopeLabel}</strong>
          <span>{roleLabel}</span>
        </div>

        <div className="sidebar-context">
          <small>Escopo ativo</small>
          <strong>{scopeLabel}</strong>
          <span>{currentUser?.username}</span>
          <div className="sidebar-note">
            <span className={`tag ${companySelectionRequired ? 'warning' : 'ok'}`}>
              {companySelectionRequired ? 'Empresa pendente' : 'Escopo pronto'}
            </span>
            <span className="tag info">{roleLabel}</span>
          </div>
        </div>
      </div>

      <nav className="main-nav" aria-label="Navegação principal">
        {routes.map((route) => {
          const Icon = ICONS[route.id] || FiBarChart2

          return (
            <a
              key={route.id}
              href={`#${route.id}`}
              className={`nav-item ${activeView === route.id ? 'active' : ''}`}
              aria-current={activeView === route.id ? 'page' : undefined}
            >
              <span className="icon">
                <Icon />
              </span>
              <span className="nav-copy">
                <strong>
                  <span>{route.label}</span>
                  {!route.implemented ? <span className="nav-badge">Transição</span> : null}
                </strong>
                <small>{route.helper}</small>
              </span>
            </a>
          )
        })}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          className="nav-item theme-switch" 
          onClick={toggleTheme} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            textAlign: 'left', 
            width: '100%',
            padding: '12px 16px',
            marginBottom: '4px'
          }}
          aria-label="Alternar tema visual"
        >
          <span className="icon">
            {theme === 'dark' ? <FiMoon /> : <FiSun />}
          </span>
          <span className="nav-copy">
            <strong>{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</strong>
            <small>Alternar preferência</small>
          </span>
        </button>

        <div className="status-card">
          <div className="status-indicator live" />
          <div className="status-info">
            <strong>Sessão autenticada</strong>
            <span>{freshnessLabel}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
