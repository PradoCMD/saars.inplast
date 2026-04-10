const integerFormat = new Intl.NumberFormat('pt-BR')
const compactFormat = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const currencyFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export function safeNumber(value) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export function formatInteger(value) {
  return integerFormat.format(safeNumber(value))
}

export function formatCompactNumber(value) {
  return compactFormat.format(safeNumber(value))
}

export function formatCurrency(value) {
  return currencyFormat.format(safeNumber(value))
}

export function formatPercent(value, maximumFractionDigits = 0) {
  return `${safeNumber(value).toLocaleString('pt-BR', { maximumFractionDigits })}%`
}

export function formatDateTime(value) {
  if (!value) return 'Sem registro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatShortDateTime(value) {
  if (!value) return 'Sem horário'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function hoursBetween(startValue, endValue) {
  const start = new Date(startValue)
  const end = new Date(endValue)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
}

export function toneFromCriticality(level) {
  const normalized = String(level || '').toLowerCase()
  if (normalized.includes('alta') || normalized.includes('critical')) return 'high'
  if (normalized.includes('media') || normalized.includes('warning')) return 'warning'
  if (normalized.includes('baixa') || normalized.includes('ok')) return 'ok'
  return 'info'
}

export function toneFromSyncStatus(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'failed') return 'high'
  if (normalized === 'pending') return 'warning'
  if (normalized === 'synced') return 'ok'
  return 'info'
}

export function toneFromEventType(eventType) {
  const normalized = String(eventType || '').toLowerCase()
  if (normalized === 'parada') return 'high'
  if (normalized === 'finalizar') return 'warning'
  if (normalized === 'iniciar') return 'ok'
  if (normalized === 'apontar') return 'info'
  return 'info'
}

export function getActionLabel(action) {
  const normalized = String(action || '').toLowerCase()
  if (normalized === 'produzir') return 'Produzir'
  if (normalized === 'montar') return 'Montar'
  if (normalized === 'comprar') return 'Comprar'
  if (normalized === 'monitorar') return 'Monitorar'
  return action || 'Sem ação'
}

export function getEventLabel(eventType) {
  const normalized = String(eventType || '').toLowerCase()
  if (normalized === 'apontar') return 'Apontamento'
  if (normalized === 'iniciar') return 'Início'
  if (normalized === 'parada') return 'Parada'
  if (normalized === 'finalizar') return 'Finalização'
  return 'Apontamento'
}

export function filterBySearch(items, searchQuery, getFields) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const values = typeof getFields === 'function' ? getFields(item) : []
    return values
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })
}

export function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
    return groups
  }, {})
}

export function sumBy(items, getValue) {
  return items.reduce((total, item) => total + safeNumber(getValue(item)), 0)
}

export function buildResourceAliasLookup(resourceCatalog = []) {
  const lookup = new Map()
  resourceCatalog.forEach((resource) => {
    const code = String(resource.code || '').trim().toUpperCase()
    if (code) lookup.set(code, code)
    ;(resource.aliases || []).forEach((alias) => {
      const normalized = String(alias || '').trim().toUpperCase()
      if (normalized) lookup.set(normalized, code)
    })
  })
  return lookup
}

export function normalizeMachineCode(machineCode, aliasLookup = new Map()) {
  const normalized = String(machineCode || '').trim().toUpperCase()
  if (!normalized) return ''
  return aliasLookup.get(normalized) || normalized
}

export function latestEntriesByMachine(items = [], aliasLookup = new Map()) {
  const latest = new Map()
  const sorted = [...items].sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))

  sorted.forEach((item) => {
    const machineCode = normalizeMachineCode(item.machine_code, aliasLookup)
    if (machineCode && !latest.has(machineCode)) {
      latest.set(machineCode, item)
    }
  })

  return latest
}

export function machineLabel(resourceCode, family = 'injecao') {
  const normalized = String(resourceCode || '').trim().toUpperCase()
  if (!normalized) return family === 'assembly' ? 'Linha sem código' : 'Máquina sem código'

  if (family === 'extrusao') {
    return normalized.startsWith('EXTR-') ? `Extrusora ${normalized.replace('EXTR-', '')}` : normalized.replace('INJ-', 'Extrusora ')
  }

  if (family === 'injecao') {
    return normalized.startsWith('INJ-') ? `Injetora ${normalized.replace('INJ-', '')}` : normalized
  }

  if (family === 'assembly') {
    return normalized.startsWith('LINHA-') ? `Linha ${normalized.replace('LINHA-', '')}` : normalized
  }

  return normalized
}
