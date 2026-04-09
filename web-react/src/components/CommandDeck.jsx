function CommandDeck({ items = [] }) {
  if (!items.length) return null

  return (
    <section className="command-deck" aria-label="Resumo rápido do módulo">
      {items.map((item) => (
        <article key={item.label} className={`command-card tone-${item.tone || 'info'}`}>
          <small>{item.label}</small>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </section>
  )
}

export default CommandDeck
