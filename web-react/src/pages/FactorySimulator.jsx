import { useMemo } from 'react'
import StatePanel from '../components/StatePanel'

const hours = Array.from({ length: 17 }, (_, index) => index + 6)
const totalMinutes = 17 * 60
const numberFormat = new Intl.NumberFormat('pt-BR')

function buildSimulationLanes(items, numLanes, type) {
  if (!items?.length) return []

  const lanes = Array.from({ length: numLanes }, (_, index) => ({
    id: index,
    name: type === 'assembly' ? `Esteira M-${index + 1}` : `Extrusora E-${index + 1}`,
    machineStatus: 'Ativa',
    jobs: [],
    currentMinute: 0,
  }))

  const sortedItems = [...items].sort((left, right) => (right.net_required || 0) - (left.net_required || 0))

  sortedItems.forEach((item) => {
    const targetLane = lanes.reduce((previous, current) => (previous.currentMinute < current.currentMinute ? previous : current))
    const quantity = item.net_required || 0
    if (quantity <= 0) return

    const durationMinutes = Math.min(Math.round(quantity * 0.2), totalMinutes - targetLane.currentMinute)

    if (durationMinutes > 0 && targetLane.currentMinute < totalMinutes) {
      targetLane.jobs.push({
        id: `${item.sku}-${targetLane.id}-${quantity}`,
        startMin: targetLane.currentMinute,
        duration: durationMinutes,
        sku: item.sku,
        produto: item.produto || item.sku,
        qty: quantity,
        criticidade: item.criticidade || 'Media',
      })
      targetLane.currentMinute += durationMinutes + 15
    }
  })

  return lanes
}

function filterItems(items, searchQuery) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const haystack = [item.sku, item.produto, item.criticidade]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  })
}

function FactorySimulator({ title, description, numLanes, type, items, resourceState, searchQuery }) {
  const filteredItems = useMemo(() => filterItems(items || [], searchQuery), [items, searchQuery])
  const lanes = useMemo(() => buildSimulationLanes(filteredItems, numLanes, type), [filteredItems, numLanes, type])

  if (resourceState?.status === 'loading') {
    return (
      <StatePanel
        kind="loading"
        title={`Carregando ${title.toLowerCase()}`}
        message="Montando a simulação horária a partir das ordens autorizadas para esta sessão."
      />
    )
  }

  if (resourceState?.status === 'permission') {
    return (
      <StatePanel
        kind="permission"
        title={`Sem acesso a ${title.toLowerCase()}`}
        message={resourceState.error?.message || 'O backend negou a leitura deste módulo operacional.'}
      />
    )
  }

  if (resourceState?.status === 'error') {
    return (
      <StatePanel
        kind="error"
        title={`Falha ao carregar ${title.toLowerCase()}`}
        message={resourceState.error?.message || 'A fila desta simulação não pôde ser carregada.'}
      />
    )
  }

  return (
    <div className="view-module animate-in simulator-page">
      <div className="module-header">
        <div className="header-titles">
          <h2>{title}</h2>
          <p>
            {description} {lanes.length ? `Renderizando ${filteredItems.length} ordens no recorte atual.` : 'Sem cargas disponíveis.'}
          </p>
        </div>
      </div>

      {!lanes.length ? (
        <StatePanel
          kind="empty"
          title="Sem ordens para simular"
          message="O cenário atual não trouxe cargas desta rota ou o filtro reduziu a lista a zero."
        />
      ) : (
        <div className="factory-simulator">
          <div className="timeline-ruler">
            {hours.map((hour) => (
              <div key={hour} className="time-slot">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          <div className="machine-lanes">
            {lanes.map((lane) => (
              <div key={lane.id} className="machine-lane">
                <div className="machine-label">
                  <strong>{lane.name}</strong>
                  <span>{lane.machineStatus}</span>
                </div>

                <div className="machine-track">
                  {lane.jobs.map((job) => {
                    const leftPct = (job.startMin / totalMinutes) * 100
                    const widthPct = (job.duration / totalMinutes) * 100

                    return (
                      <div
                        key={job.id}
                        className="sim-block"
                        title={`SKU: ${job.sku}\nProduto: ${job.produto}\nQuantidade: ${numberFormat.format(job.qty)} un`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      >
                        <strong>{job.sku}</strong>
                        <small>{numberFormat.format(job.qty)} un</small>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FactorySimulator
