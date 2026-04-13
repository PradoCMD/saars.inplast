export function getForecastOrigin(previsaoStatus, criterioPrevisao) {
  const normalizedStatus = String(previsaoStatus || '').toLowerCase()
  const normalizedCriteria = String(criterioPrevisao || '').toLowerCase()

  if (!normalizedStatus || normalizedStatus.includes('sem')) {
    return {
      key: 'missing',
      tone: 'high',
      label: 'Sem previsão',
      detail: 'Ainda sem critério confiável de saída',
    }
  }

  if (normalizedCriteria.includes('manual')) {
    return {
      key: 'manual',
      tone: 'warning',
      label: 'Previsão manual',
      detail: criterioPrevisao || 'Critério PCP informado manualmente',
    }
  }

  return {
    key: 'automatic',
    tone: 'info',
    label: 'Previsão automática',
    detail: criterioPrevisao || 'Critério calculado pelo sistema oficial',
  }
}
