import { FiSearch, FiPlay, FiRefreshCw } from 'react-icons/fi';

function Topbar({ activeView }) {
  const titles = {
    'cockpit': 'Cockpit Executivo',
    'romaneios-kanban': 'Kanban Logístico',
    'romaneios': 'Romaneios Recebidos',
    'estruturas': 'Engenharia de Estruturas',
    'programacao': 'Programação Operacional',
    'montagem': 'Pavilhão de Montagem',
    'producao': 'Parque de Extrusão',
    'compras': 'Gestão de Compras',
    'fontes': 'Governança e Saúde'
  };

  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <h1>{titles[activeView] || 'Módulo ' + activeView}</h1>
      </div>
      
      <div className="topbar-actions">
        <div className="search-bar">
          <FiSearch />
          <input type="text" placeholder="Buscar romaneio, pedido ou SKU..." aria-label="Busca global" />
        </div>
        
        <button className="btn btn-primary">
          <FiPlay />
          Disparar MRP
        </button>
        <button className="btn btn-secondary" title="Sincronizar">
          <FiRefreshCw />
        </button>

        <div className="user-profile">
          <img src="https://ui-avatars.com/api/?name=In+Plast&background=3b82f6&color=fff" alt="User Profile" className="avatar" />
        </div>
      </div>
    </header>
  );
}

export default Topbar;
