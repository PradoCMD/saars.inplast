import { FiLock, FiLogOut, FiPlay, FiRefreshCw, FiSearch, FiZap } from 'react-icons/fi'

function Topbar({
  route,
  currentUser,
  initials,
  routeModeLabel,
  routeStatus,
  searchQuery,
  onSearchChange,
  selectedCompany,
  companyOptions,
  companySelectionRequired,
  onCompanyChange,
  freshnessLabel,
  isStaleData,
  canRunMrp,
  canSyncSources,
  onRunMrp,
  onSyncSources,
  onRefresh,
  onLogout,
  mrpBusy,
  syncBusy,
}) {
  const roleLabel = String(currentUser?.role || 'operator').toUpperCase()
  const scopeLabel = companySelectionRequired ? 'Seleção pendente' : selectedCompany || 'Consolidado'
  const syncBlocked = !canSyncSources && !syncBusy
  const mrpBlocked = !canRunMrp && !mrpBusy
  const routeStatusLabel = routeStatus === 'loading'
    ? 'Atualizando'
    : routeStatus === 'permission'
      ? 'Acesso restrito'
      : routeStatus === 'company'
        ? 'Empresa obrigatória'
        : routeStatus === 'error'
          ? 'Falha de leitura'
          : 'Leitura pronta'

  return (
    <header className="topbar">
      <div className="topbar-primary">
        <div className="topbar-heading">
          <div className="eyebrow">PCP autenticado</div>
          <div className="topbar-title-row">
            <div className="topbar-title-block">
              <h1>{route?.label || 'Módulo'}</h1>
              <p>{route?.helper || 'Operação do shell oficial'}</p>
            </div>

            <div className="topbar-heading-meta">
              <span className="topbar-chip tone-info">{routeModeLabel}</span>
              <span className={`topbar-chip tone-${routeStatus === 'error' ? 'high' : routeStatus === 'company' ? 'warning' : routeStatus === 'permission' ? 'warning' : 'ok'}`}>
                {routeStatusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="topbar-context-grid" aria-label="Contexto do módulo ativo">
          <div className="topbar-context-card">
            <span>Papel ativo</span>
            <strong>{roleLabel}</strong>
          </div>
          <div className="topbar-context-card">
            <span>Empresa</span>
            <strong>{scopeLabel}</strong>
          </div>
          <div className="topbar-context-card">
            <span>Usuário</span>
            <strong>{currentUser?.full_name || currentUser?.username}</strong>
          </div>
        </div>
      </div>

      <div className="topbar-tools">
        <div className="topbar-tools-row topbar-tools-row-search">
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

            <div className={`sync-pill ${isStaleData ? 'stale' : 'ready'}`}>
              <FiZap />
              <span>{freshnessLabel}</span>
            </div>
          </div>
        </div>

        <div className="topbar-tools-row topbar-tools-row-actions">
          <div className="topbar-cluster">
            <button type="button" className="btn btn-secondary" onClick={onRefresh}>
              <FiRefreshCw />
              Recarregar
            </button>

            <button
              type="button"
              className={`btn btn-secondary${syncBlocked ? ' is-blocked' : ''}`}
              onClick={onSyncSources}
              disabled={!canSyncSources || syncBusy}
              title={canSyncSources ? 'Sincronizar fontes' : 'Seu papel não pode sincronizar fontes'}
            >
              {syncBlocked ? <FiLock /> : <FiRefreshCw className={syncBusy ? 'spin' : ''} />}
              {syncBusy ? 'Sincronizando...' : syncBlocked ? 'Sync bloqueado' : 'Sincronizar'}
            </button>

            <button
              type="button"
              className={`btn btn-primary${mrpBlocked ? ' is-blocked' : ''}`}
              onClick={onRunMrp}
              disabled={!canRunMrp || mrpBusy}
              title={canRunMrp ? 'Disparar MRP' : 'Seu papel não pode disparar MRP'}
            >
              {mrpBlocked ? <FiLock /> : <FiPlay />}
              {mrpBusy ? 'Rodando MRP...' : mrpBlocked ? 'MRP bloqueado' : 'Disparar MRP'}
            </button>
          </div>

          <div className="topbar-session">
            <div className="user-profile">
              <div className="avatar">{initials}</div>
              <div className="user-copy">
                <small>{roleLabel}</small>
                <strong>{currentUser?.full_name || currentUser?.username}</strong>
              </div>
            </div>

            <button type="button" className="btn btn-ghost" onClick={onLogout} title="Encerrar sessão">
              <FiLogOut />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
