import { useId } from 'react'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function DonutGauge({ value = 0, label, detail, tone = 'info' }) {
  const normalized = clamp(Number(value) || 0, 0, 100)

  return (
    <div className={`ops-gauge tone-${tone}`}>
      <div className="ops-gauge-ring" style={{ '--ops-gauge-value': `${normalized}%` }}>
        <div className="ops-gauge-core">
          <strong>{Math.round(normalized)}%</strong>
          <span>{label}</span>
        </div>
      </div>
      {detail ? <p>{detail}</p> : null}
    </div>
  )
}

export function Sparkline({ values = [], tone = 'info' }) {
  const gradientId = useId()
  const normalizedValues = values.length >= 2 ? values : [0, values[0] || 0, values[0] || 0]
  const maxValue = Math.max(...normalizedValues, 1)
  const minValue = Math.min(...normalizedValues, 0)
  const range = Math.max(1, maxValue - minValue)

  const points = normalizedValues.map((value, index) => {
    const x = (index / Math.max(1, normalizedValues.length - 1)) * 100
    const y = 100 - (((value - minValue) / range) * 80 + 10)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className={`ops-sparkline tone-${tone}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <polyline points={`0,100 ${points} 100,100`} fill={`url(#${gradientId})`} stroke="none" />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
