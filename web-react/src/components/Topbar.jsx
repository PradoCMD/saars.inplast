import { FiLock, FiLogOut, FiPlay, FiRefreshCw, FiSearch, FiZap } from 'react-icons/fi'

function Topbar({
  route,
  searchQuery,
  onSearchChange,
  selectedCompany,
  companyOptions,
  companySelectionRequired,
  onCompanyChange,
  freshnessLabel,
  isStaleData,
  canSyncSources,
  onSyncSources,
  syncBusy,
}) {
  const syncBlocked = !canSyncSources && !syncBusy

  return (
    <header className="topbar">
      <div className="topbar-primary">
        <div className="topbar-heading">
          <div className="topbar-title-block">
            <h1>{route?.label || 'Módulo'}</h1>
            <p>{route?.helper || 'Operação do shell oficial'}</p>
          </div>
        </div>
      </div>

      <div className="topbar-tools">
        <div className="topbar-tools-row">
          <label className="topbar-search">
            <FiSearch />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar romaneio, SKU ou gargalo"
              aria-label="Busca global"
            />
          </label>

          <div className="topbar-cluster">
            <label className={`topbar-field ${companySelectionRequired ? 'required' : ''}`}>
              <span>Empresa</span>
              <select value={selectedCompany} onChange={(event) => onCompanyChange(event.target.value)}>
                <option value="">{companyOptions.length > 1 ? 'Selecione a empresa' : 'Consolidado'}</option>
                {companyOptions.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={`btn btn-secondary${syncBlocked ? ' is-blocked' : ''}`}
              onClick={onSyncSources}
              disabled={!canSyncSources || syncBusy}
              title={canSyncSources ? 'Sincronizar fontes' : 'Seu papel não pode sincronizar fontes'}
            >
              {syncBlocked ? <FiLock /> : <FiRefreshCw className={syncBusy ? 'spin' : ''} />}
              {syncBusy ? 'Sincronizando...' : 'Sincronizar'}
            </button>

            <div className={`sync-pill ${isStaleData ? 'stale' : 'ready'}`}>
              <FiZap />
              <span>{freshnessLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
