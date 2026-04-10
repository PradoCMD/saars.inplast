function CommandDeck({ items = [] }) {
  if (!items.length) return null

  return (
    <section className="command-deck" aria-label="Resumo rápido do módulo">
      {items.map((item) => (
        <article key={item.label} className={`command-card tone-${item.tone || 'info'}`}>
          <small>{item.label}</small>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
          {item.actionLabel && item.onAction ? (
            <div className="command-card-footer">
              <button
                type="button"
                className="btn btn-secondary command-card-action"
                onClick={item.onAction}
              >
                {item.actionLabel}
              </button>
              {item.actionHint ? <span className="command-card-note">{item.actionHint}</span> : null}
            </div>
          ) : null}
        </article>
      ))}
    </section>
  )
}

export default CommandDeck
