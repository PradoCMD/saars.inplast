import { FiLock, FiLogOut, FiMoon, FiPlay, FiRefreshCw, FiSearch, FiSun, FiZap } from 'react-icons/fi'

function Topbar({
  route,
  searchQuery,
  onSearchChange,
  selectedCompany,
  companyOptions,
  companySelectionRequired,
  onCompanyChange,
  theme,
  toggleTheme,
  canSyncSources,
  onSyncSources,
  syncBusy,
}) {
  const syncBlocked = !canSyncSources && !syncBusy

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <div className="topbar-title-block">
          <div className="cockpit-kicker">INPLAST CONTROL DESK</div>
          <h1>{route?.label || 'Módulo'}</h1>
        </div>
      </div>

      <div className="topbar-actions-row">
        <label className="topbar-search-expand">
          <FiSearch className="search-icon" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Pesquisar no sistema..."
            aria-label="Busca global"
          />
        </label>

        <div className="topbar-compact-cluster">
          <div className={`topbar-select-field ${companySelectionRequired ? 'required' : ''}`}>
            <FiZap className="field-icon" />
            <select value={selectedCompany} onChange={(event) => onCompanyChange(event.target.value)}>
              <option value="">{companyOptions.length > 1 ? 'Selecione a Filial' : 'Consolidado Global'}</option>
              {companyOptions.map((company) => (
                <option key={company} value={company}>
                  Filial {company}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`btn-sync-icon${syncBlocked ? ' is-blocked' : ''}`}
            onClick={onSyncSources}
            disabled={!canSyncSources || syncBusy}
            title={canSyncSources ? 'Sincronizar fontes' : 'Seu papel não pode sincronizar fontes'}
          >
            {syncBlocked ? <FiLock /> : <FiRefreshCw className={syncBusy ? 'spin' : ''} />}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Topbar
