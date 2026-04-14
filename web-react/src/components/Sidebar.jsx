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
  FiLogOut,
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
}

function Sidebar({ activeView, routes, currentUser, selectedCompany, freshnessLabel, companySelectionRequired, theme, toggleTheme, onLogout }) {
  const roleLabel = String(currentUser?.role || 'operator').toUpperCase()
  const scopeLabel = selectedCompany || 'Consolidado'

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-box-brand">
          <img src="/inplast-logo.png" alt="Inplast Control Desk" />
          <div className="brand-dot"></div>
        </div>

        <div className="sidebar-user-context">
          <div className="avatar">
            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <strong>{currentUser?.username || 'Usuário'}</strong>
            <span>{roleLabel}</span>
          </div>
          
          <button 
            type="button" 
            className="btn-logout-minimal" 
            onClick={onLogout}
            title="Sair do sistema"
          >
            <FiLogOut />
          </button>
        </div>
      </div>

      <nav className="main-nav" aria-label="Navegação principal">
        <div className="nav-group-label">Módulos Operacionais</div>
        {routes.filter(r => !['governanca'].includes(r.id)).map((route) => {
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
                  {!route.implemented ? <span className="nav-badge">LABS</span> : null}
                </strong>
                <small>{route.helper}</small>
              </span>
            </a>
          )
        })}

        <div className="nav-group-label" style={{ marginTop: '1.5rem' }}>Administração</div>
        {routes.filter(r => r.id === 'governanca').map((route) => (
          <a
            key={route.id}
            href={`#${route.id}`}
            className={`nav-item ${activeView === route.id ? 'active' : ''}`}
          >
            <span className="icon"><FiShield /></span>
            <span className="nav-copy">
              <strong>{route.label}</strong>
              <small>Controle de Acesso</small>
            </span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="btn nav-item theme-switch" onClick={toggleTheme}>
          <span className="icon">{theme === 'dark' ? <FiSun /> : <FiMoon />}</span>
          <span className="nav-copy">
             <strong>Alternar Tema</strong>
             <small>{theme === 'dark' ? 'Modo Diurno' : 'Modo Noturno'}</small>
          </span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
