import {
  FiAlertTriangle,
  FiClock,
  FiDatabase,
  FiLock,
  FiLogIn,
  FiRefreshCw,
  FiShield,
} from 'react-icons/fi'

const ICONS = {
  loading: FiRefreshCw,
  error: FiAlertTriangle,
  empty: FiDatabase,
  permission: FiShield,
  session: FiLogIn,
  company: FiLock,
  stale: FiClock,
  info: FiShield,
}

function StatePanel({
  kind = 'info',
  title,
  message,
  detail,
  actionLabel,
  onAction,
  compact = false,
}) {
  const Icon = ICONS[kind] || ICONS.info

  return (
    <section className={`state-panel state-panel-${kind} ${compact ? 'compact' : ''}`}>
      <div className="state-panel-icon">
        <Icon className={kind === 'loading' ? 'spin' : ''} />
      </div>
      <div className="state-panel-copy">
        <strong>{title}</strong>
        {message ? <p>{message}</p> : null}
        {detail ? <small>{detail}</small> : null}
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="btn btn-secondary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}

export default StatePanel
