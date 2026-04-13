export class ApiError extends Error {
  constructor(status, code, message, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.payload = payload
  }
}

export function createResourceState(status = 'idle', data = null, error = null) {
  return { status, data, error }
}

export function buildApiPath(path, companyCode = '') {
  if (!companyCode) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}company_code=${encodeURIComponent(companyCode)}`
}

export function getErrorKind(error) {
  if (error?.status === 403) return 'permission'
  if (error?.status === 401) return 'session'
  if (error?.status === 422 || error?.code === 'missing_company_code') return 'company'
  return 'error'
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj)
  } catch (err) {
    if (err.message.includes('circular')) return '[Circular Object]'
    return String(obj)
  }
}

export async function requestJson(path, { method = 'GET', body, accessToken = '', onUnauthorized, signal } = {}) {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? safeStringify(body) : undefined,
    signal: signal || (method === 'GET' ? AbortSignal.timeout(10000) : undefined),
  })

  const text = await response.text()
  const payload = text ? (() => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  })() : null

  if (response.status === 401 && typeof onUnauthorized === 'function') {
    onUnauthorized(payload?.detail || payload?.error || 'Sessão expirada ou inválida. Faça login novamente.')
    throw new ApiError(
      401,
      payload?.code || 'unauthorized',
      payload?.detail || payload?.error || 'Sessão expirada ou inválida.',
      payload,
    )
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.code || '',
      payload?.detail || payload?.error || payload?.message || `Falha ao acessar ${path}.`,
      payload,
    )
  }

  return payload
}
