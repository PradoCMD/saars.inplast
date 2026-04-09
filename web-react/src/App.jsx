import { useEffect, useEffectEvent, useState } from 'react'
import CommandDeck from './components/CommandDeck'
import Sidebar from './components/Sidebar'
import StatePanel from './components/StatePanel'
import Topbar from './components/Topbar'
import Cockpit from './pages/Cockpit'
import FactorySimulator from './pages/FactorySimulator'
import KanbanBoard from './pages/KanbanBoard'
import ProductionTracking from './pages/ProductionTracking'
import RomaneiosInbox from './pages/RomaneiosInbox'
import SourcesGovernance from './pages/SourcesGovernance'

const APP_SESSION_STORAGE_KEY = 'pcp_app_session_v1'

const KNOWN_COMPANIES = ['INPLAST', 'RECICLA', 'UPE METAL']

const ROLE_ALIASES = {
  admin: 'root',
  apontamento: 'operator',
  planner: 'manager',
  pcp: 'manager',
}

const ROLE_PERMISSIONS = {
  root: new Set(['*']),
  manager: new Set([
    'alerts.read',
    'apontamento.dispatch',
    'apontamento.read',
    'apontamento.write',
    'assembly.read',
    'costs.read',
    'mrp.run',
    'overview.read',
    'painel.read',
    'production.read',
    'programming.read',
    'purchases.read',
    'recycling.read',
    'romaneios.delete',
    'romaneios.ingest',
    'romaneios.read',
    'romaneios.write',
    'sources.read',
    'sources.sync',
    'structures.read',
  ]),
  operator: new Set([
    'alerts.read',
    'apontamento.read',
    'apontamento.write',
    'assembly.read',
    'costs.read',
    'overview.read',
    'painel.read',
    'production.read',
    'programming.read',
    'purchases.read',
    'recycling.read',
    'romaneios.read',
    'sources.read',
    'structures.read',
  ]),
}

const ROUTES = [
  { id: 'cockpit', label: 'Cockpit', helper: 'Leitura operacional', permission: 'overview.read', implemented: true },
  { id: 'romaneios-kanban', label: 'Kanban Logístico', helper: 'Fila e gargalos', permission: 'romaneios.read', implemented: true },
  { id: 'romaneios', label: 'Romaneios', helper: 'Inbox e buffer local', permission: 'romaneios.read', implemented: true },
  { id: 'apontamento', label: 'Apontamento', helper: 'Operação de chão', permission: 'apontamento.read', implemented: true },
  { id: 'montagem', label: 'Montagem', helper: 'Simulação esteiras', permission: 'assembly.read', implemented: true },
  { id: 'producao', label: 'Produção', helper: 'Simulação extrusoras', permission: 'production.read', implemented: true },
  { id: 'estruturas', label: 'Estruturas', helper: 'Leitura guiada', permission: 'structures.read', implemented: false },
  { id: 'programacao', label: 'Programação', helper: 'Planejamento', permission: 'programming.read', implemented: false },
  { id: 'compras', label: 'Compras', helper: 'Suprimentos', permission: 'purchases.read', implemented: false },
  { id: 'fontes', label: 'Governança', helper: 'Saúde das fontes', permission: 'sources.read', implemented: true },
]

class ApiError extends Error {
  constructor(status, code, message, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.payload = payload
  }
}

function createResourceState(status = 'idle', data = null, error = null) {
  return { status, data, error }
}

function createDefaultResources() {
  return {
    overview: createResourceState(),
    kanban: createResourceState(),
    romaneios: createResourceState(),
    assembly: createResourceState(),
    production: createResourceState(),
    sources: createResourceState(),
    alerts: createResourceState(),
  }
}

function normalizeRole(role, username = '') {
  if (String(username || '').trim().toLowerCase() === 'root') return 'root'
  const normalized = String(role || 'operator').trim().toLowerCase() || 'operator'
  return ROLE_ALIASES[normalized] || (['root', 'manager', 'operator'].includes(normalized) ? normalized : 'operator')
}

function normalizeCompanyScope(scope, role = '', username = '') {
  if (normalizeRole(role, username) === 'root') return ['*']
  const source = Array.isArray(scope)
    ? scope
    : String(scope || '')
      .split(',')
      .map((item) => item.trim())
  const normalized = []

  source.forEach((value) => {
    const company = String(value || '').trim().toUpperCase()
    if (!company) return
    if (company === '*' || company === 'ALL' || company === 'TODAS' || company === 'CONSOLIDADO') {
      if (!normalized.includes('*')) normalized.push('*')
      return
    }
    if (!normalized.includes(company)) normalized.push(company)
  })

  return normalized
}

function hasPermission(user, permission) {
  if (!permission) return true
  if (!user) return false
  const role = normalizeRole(user.role, user.username)
  const permissions = ROLE_PERMISSIONS[role] || new Set()
  return permissions.has('*') || permissions.has(permission)
}

function normalizeUserPayload(user, accessToken = '', expiresAt = '') {
  if (!user) return null
  return {
    ...user,
    id: user.id || user.user_id || '',
    role: normalizeRole(user.role, user.username),
    company_scope: normalizeCompanyScope(user.company_scope, user.role, user.username),
    access_token: accessToken || user.access_token || '',
    expires_at: expiresAt || user.expires_at || '',
  }
}

function loadStoredSession() {
  if (typeof window === 'undefined') return null

  try {
    const parsed = JSON.parse(window.localStorage.getItem(APP_SESSION_STORAGE_KEY) || 'null')
    if (!parsed?.access_token) return null

    if (parsed.expires_at) {
      const expiresAt = new Date(parsed.expires_at)
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
        window.localStorage.removeItem(APP_SESSION_STORAGE_KEY)
        return null
      }
    }

    return normalizeUserPayload(parsed, parsed.access_token, parsed.expires_at)
  } catch {
    return null
  }
}

function persistStoredSession(user) {
  if (typeof window === 'undefined') return

  if (!user) {
    window.localStorage.removeItem(APP_SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(
    APP_SESSION_STORAGE_KEY,
    JSON.stringify({
      id: user.id,
      user_id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      company_scope: user.company_scope || [],
      access_token: user.access_token || '',
      expires_at: user.expires_at || '',
    }),
  )
}

function buildApiPath(path, companyCode = '') {
  if (!companyCode) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}company_code=${encodeURIComponent(companyCode)}`
}

function getCompanyOptions(user) {
  if (!user) return []
  const scope = normalizeCompanyScope(user.company_scope, user.role, user.username)
  return scope.includes('*') ? KNOWN_COMPANIES : scope
}

function getDefaultCompany(user, currentSelection = '') {
  if (!user) return ''
  const scope = normalizeCompanyScope(user.company_scope, user.role, user.username)
  const options = getCompanyOptions(user)

  if (options.includes(currentSelection)) return currentSelection
  if (scope.includes('*')) return currentSelection || ''
  if (scope.length === 1) return scope[0]
  return ''
}

function getInitials(user) {
  const base = user?.full_name || user?.username || 'IP'
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatDateTime(value) {
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

function formatFreshnessLabel(value) {
  if (!value) return 'Sem snapshot válido'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Snapshot inválido'

  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (diffMinutes < 1) return 'Atualizado agora'
  if (diffMinutes < 60) return `Atualizado há ${diffMinutes} min`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `Atualizado há ${diffHours} h`

  const diffDays = Math.round(diffHours / 24)
  return `Atualizado há ${diffDays} dia(s)`
}

function mapErrorKind(error) {
  if (error?.status === 403) return 'permission'
  if (error?.status === 401) return 'session'
  if (error?.status === 422 || error?.code === 'missing_company_code') return 'company'
  return 'error'
}

function getRouteModeLabel(route) {
  if (!route?.implemented) return 'Transição controlada'
  if (route.id === 'cockpit') return 'Visão agregada autenticada'
  if (route.id === 'romaneios-kanban') return 'Somente leitura fiel'
  if (route.id === 'romaneios') return 'Oficial + buffer local'
  if (route.id === 'apontamento') return 'Storyboard validado'
  return 'Operação conectada'
}

function getRoleCapabilityLabel(user) {
  const role = normalizeRole(user?.role, user?.username)
  if (role === 'root') return 'Controle total do shell'
  if (role === 'manager') return 'MRP, sync e operação'
  return 'Leitura segura por papel'
}

function getPrimaryResourceForRoute(routeId, resources) {
  if (routeId === 'cockpit') return resources.overview
  if (routeId === 'romaneios-kanban') return resources.kanban
  if (routeId === 'romaneios') return resources.romaneios
  if (routeId === 'montagem') return resources.assembly
  if (routeId === 'producao') return resources.production
  if (routeId === 'fontes') return resources.sources
  return null
}

function buildRouteSignalCard(route, resources, canIngest) {
  if (!route) {
    return {
      label: 'Sinal do módulo',
      value: 'Sem módulo ativo',
      detail: 'Selecione uma área do shell para carregar o resumo rápido.',
      tone: 'info',
    }
  }

  if (route.id === 'cockpit') {
    const overview = resources.overview.data || {}
    const missing = Number(overview.totals?.romaneios_sem_previsao || 0)
    const nextCritical = overview.top_criticos?.[0]

    return {
      label: 'Sinal prioritário',
      value: missing ? `${missing} sem previsão` : 'Fluxo estabilizado',
      detail: nextCritical
        ? `${nextCritical.sku} · ${nextCritical.acao || 'Monitorar agora'}`
        : 'Nenhum item crítico puxando ação imediata.',
      tone: missing ? 'high' : 'ok',
    }
  }

  if (route.id === 'romaneios-kanban') {
    const romaneios = resources.kanban.data?.romaneios || []
    const products = resources.kanban.data?.products || []
    const missing = romaneios.filter((item) => !item.previsao_saida_at).length

    return {
      label: 'Fila autorizada',
      value: `${romaneios.length} romaneios`,
      detail: missing
        ? `${missing} sem previsão e ${products.length} SKUs sob pressão`
        : `${products.length} SKUs críticos monitorados no recorte atual.`,
      tone: missing ? 'warning' : 'info',
    }
  }

  if (route.id === 'romaneios') {
    const items = resources.romaneios.data?.items || []

    return {
      label: 'Fidelidade da fonte',
      value: `${items.length} oficiais`,
      detail: canIngest
        ? 'Buffer local liberado nesta sessão, sempre separado da fonte oficial.'
        : 'Sessão em leitura segura; o backend oficial segue como única referência.',
      tone: canIngest ? 'info' : 'ok',
    }
  }

  if (route.id === 'montagem') {
    const items = resources.assembly.data?.items || []
    return {
      label: 'Carga de montagem',
      value: `${items.length} ordens`,
      detail: 'Simulação alimentada pela fila autenticada desta sessão.',
      tone: items.length ? 'info' : 'ok',
    }
  }

  if (route.id === 'producao') {
    const items = resources.production.data?.items || []
    return {
      label: 'Carga de produção',
      value: `${items.length} ordens`,
      detail: 'Leitura segura das extrusoras e do backlog operacional.',
      tone: items.length ? 'info' : 'ok',
    }
  }

  if (route.id === 'fontes') {
    if (resources.sources.status === 'loading' && !resources.sources.data) {
      return {
        label: 'Saúde das integrações',
        value: 'Atualizando',
        detail: 'Buscando frescor das fontes e alertas centrais do backend.',
        tone: 'info',
      }
    }

    if (resources.sources.status === 'permission') {
      return {
        label: 'Saúde das integrações',
        value: 'Leitura restrita',
        detail: resources.sources.error?.message || 'Seu papel não pode abrir a governança de fontes.',
        tone: 'warning',
      }
    }

    if (resources.sources.status === 'error' || resources.alerts.status === 'error') {
      return {
        label: 'Saúde das integrações',
        value: 'Falha de leitura',
        detail: resources.sources.error?.message || resources.alerts.error?.message || 'Não foi possível carregar o estado atual das integrações.',
        tone: 'high',
      }
    }

    const items = resources.sources.data?.items || []
    const alerts = resources.alerts.data?.items || []
    const missingCount = items.filter((item) => ['missing', 'error'].includes(String(item.freshness_status || '').toLowerCase())).length
    const attentionCount = items.filter((item) => ['warning', 'stale', 'partial'].includes(String(item.freshness_status || '').toLowerCase())).length
    const highAlertCount = alerts.filter((item) => String(item.severity || '').toLowerCase().includes('high')).length

    return {
      label: 'Saúde das integrações',
      value: missingCount
        ? `${missingCount} bloqueios`
        : attentionCount
          ? `${attentionCount} fontes atrasadas`
          : 'Fontes sob controle',
      detail: alerts.length
        ? `${alerts.length} alertas ativos${highAlertCount ? `, ${highAlertCount} em alta severidade` : ''}.`
        : 'Sem alertas centrais ativos nas integrações rastreadas.',
      tone: missingCount || highAlertCount ? 'high' : attentionCount || alerts.length ? 'warning' : 'ok',
    }
  }

  if (route.id === 'apontamento') {
    return {
      label: 'Estado do fluxo',
      value: 'Referência visual pronta',
      detail: 'O módulo segue honesto sobre estar preparado para integração, sem fingir operação completa.',
      tone: 'info',
    }
  }

  return {
    label: 'Estado do módulo',
    value: route.implemented ? 'Disponível' : 'Em transição',
    detail: route.helper,
    tone: route.implemented ? 'info' : 'warning',
  }
}

async function requestJson(path, { method = 'GET', body, accessToken = '', onUnauthorized } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
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

function App() {
  const restoredUser = loadStoredSession()

  const [activeView, setActiveView] = useState('cockpit')
  const [currentUser, setCurrentUser] = useState(restoredUser)
  const [authStatus, setAuthStatus] = useState(restoredUser ? 'authenticated' : 'anonymous')
  const [authMessage, setAuthMessage] = useState('')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginBusy, setLoginBusy] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(getDefaultCompany(restoredUser))
  const [resources, setResources] = useState(createDefaultResources())
  const [lastLoadedAt, setLastLoadedAt] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [mrpBusy, setMrpBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const companyScope = normalizeCompanyScope(currentUser?.company_scope, currentUser?.role, currentUser?.username)
  const companyOptions = getCompanyOptions(currentUser)
  const hasWildcardScope = companyScope.includes('*')
  const effectiveCompany = getDefaultCompany(currentUser, selectedCompany)
  const multiCompanySelectionRequired = Boolean(currentUser && !hasWildcardScope && companyScope.length > 1 && !effectiveCompany)
  const accessibleRoutes = ROUTES.filter((route) => hasPermission(currentUser, route.permission))
  const activeRoute = accessibleRoutes.find((route) => route.id === activeView) || accessibleRoutes[0] || ROUTES[0]
  const companySelectionRequiredForActiveRoute = multiCompanySelectionRequired &&
    ['cockpit', 'romaneios-kanban'].includes(activeRoute?.id)
  const freshnessLabel = formatFreshnessLabel(resources.overview.data?.snapshot_at || lastLoadedAt)
  const activeResource = getPrimaryResourceForRoute(activeRoute?.id, resources)
  const roleLabel = String(normalizeRole(currentUser?.role, currentUser?.username)).toUpperCase()
  const routeModeLabel = getRouteModeLabel(activeRoute)
  const routeSignalCard = buildRouteSignalCard(activeRoute, resources, hasPermission(currentUser, 'romaneios.ingest'))
  const commandDeckItems = [
    {
      label: 'Escopo ativo',
      value: effectiveCompany || (hasWildcardScope ? 'Consolidado' : 'Sem empresa'),
      detail: multiCompanySelectionRequired
        ? 'Seu usuário precisa definir a empresa antes das leituras agregadas.'
        : hasWildcardScope
          ? 'Visão ampla do shell com empresa explícita apenas quando necessário.'
          : 'Empresa atualmente aplicada nas rotas que exigem recorte.',
      tone: multiCompanySelectionRequired ? 'warning' : 'ok',
    },
    {
      label: 'Papel e controle',
      value: roleLabel,
      detail: getRoleCapabilityLabel(currentUser),
      tone: roleLabel === 'OPERATOR' ? 'warning' : 'info',
    },
    {
      label: 'Modo do módulo',
      value: routeModeLabel,
      detail: activeRoute.helper,
      tone: activeRoute.implemented ? 'info' : 'warning',
    },
    routeSignalCard,
  ]

  const isStaleData = Boolean(resources.overview.data?.snapshot_at) &&
    (Date.now() - new Date(resources.overview.data.snapshot_at).getTime()) > 6 * 60 * 60 * 1000

  function applyAuthenticatedUser(user, accessToken, expiresAt) {
    const normalized = normalizeUserPayload(user, accessToken, expiresAt)
    const nextCompany = getDefaultCompany(normalized, selectedCompany)

    persistStoredSession(normalized)
    setCurrentUser(normalized)
    setSelectedCompany(nextCompany)
    setAuthStatus('authenticated')
    setAuthMessage('')
    setNotice(null)
    setReloadKey((current) => current + 1)

    const nextView = normalizeRole(normalized.role, normalized.username) === 'operator' ? 'apontamento' : activeView || 'cockpit'
    window.location.hash = `#${nextView}`
  }

  function resetToLoggedOutState(message, status = 'anonymous') {
    persistStoredSession(null)
    setCurrentUser(null)
    setSelectedCompany('')
    setResources(createDefaultResources())
    setNotice(null)
    setMrpBusy(false)
    setSyncBusy(false)
    setAuthStatus(status)
    setAuthMessage(message || '')
    window.location.hash = '#cockpit'
  }

  function handleUnauthorizedSession(message) {
    resetToLoggedOutState(message, 'expired')
  }

  const handleUnauthorizedSessionEffect = useEffectEvent((message) => {
    resetToLoggedOutState(message, 'expired')
  })

  useEffect(() => {
    const handleHashChange = () => {
      const nextHash = window.location.hash.replace('#', '') || 'cockpit'
      setActiveView(nextHash)
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (!currentUser) return
    const nextCompany = getDefaultCompany(currentUser, selectedCompany)
    if (nextCompany !== selectedCompany) {
      setSelectedCompany(nextCompany)
    }
  }, [currentUser, selectedCompany])

  useEffect(() => {
    if (!activeRoute) return
    if (activeRoute.id !== activeView) {
      window.location.hash = `#${activeRoute.id}`
    }
  }, [activeRoute, activeView])

  useEffect(() => {
    if (!currentUser?.access_token) return

    let cancelled = false
    const companyError = new ApiError(
      422,
      'missing_company_code',
      'Selecione uma empresa para carregar indicadores que exigem escopo explícito.',
    )

    async function loadResources() {
      setResources((previous) => ({
        overview: multiCompanySelectionRequired ? createResourceState('company', null, companyError) : createResourceState('loading', previous.overview.data, null),
        kanban: multiCompanySelectionRequired ? createResourceState('company', null, companyError) : createResourceState('loading', previous.kanban.data, null),
        romaneios: createResourceState('loading', previous.romaneios.data, null),
        assembly: createResourceState('loading', previous.assembly.data, null),
        production: createResourceState('loading', previous.production.data, null),
        sources: createResourceState('loading', previous.sources.data, null),
        alerts: createResourceState('loading', previous.alerts.data, null),
      }))

      const nextResources = {}
      const accessToken = currentUser.access_token

      const loadResource = async (key, path, { requiresScopedCompany = false, optionalCompany = false } = {}) => {
        if (requiresScopedCompany && multiCompanySelectionRequired) {
          nextResources[key] = createResourceState('company', null, companyError)
          return
        }

        try {
          const shouldAttachCompany = requiresScopedCompany || (optionalCompany && effectiveCompany)
          const data = await requestJson(
            buildApiPath(path, shouldAttachCompany ? effectiveCompany : ''),
            {
              accessToken,
              onUnauthorized: handleUnauthorizedSessionEffect,
            },
          )
          nextResources[key] = createResourceState('ready', data, null)
        } catch (error) {
          nextResources[key] = createResourceState(mapErrorKind(error), null, error)
        }
      }

      await Promise.all([
        loadResource('overview', '/api/pcp/overview', { requiresScopedCompany: true }),
        loadResource('kanban', '/api/pcp/romaneios-kanban', { requiresScopedCompany: true }),
        loadResource('romaneios', '/api/pcp/romaneios', { optionalCompany: true }),
        loadResource('assembly', '/api/pcp/assembly'),
        loadResource('production', '/api/pcp/production'),
        loadResource('sources', '/api/pcp/sources'),
        loadResource('alerts', '/api/pcp/alerts'),
      ])

      if (cancelled) return

      setResources((previous) => ({ ...previous, ...nextResources }))
      setLastLoadedAt(new Date().toISOString())
    }

    loadResources()

    return () => {
      cancelled = true
    }
  }, [currentUser, effectiveCompany, multiCompanySelectionRequired, reloadKey])

  async function handleLoginSubmit(event) {
    event.preventDefault()
    setLoginBusy(true)
    setAuthMessage('')

    try {
      const response = await requestJson('/api/pcp/auth/login', {
        method: 'POST',
        body: {
          username: loginForm.username.trim(),
          password: loginForm.password.trim(),
        },
      })

      applyAuthenticatedUser(response.user, response.access_token, response.expires_at)
      setLoginForm({ username: '', password: '' })
    } catch (error) {
      setAuthStatus('anonymous')
      setAuthMessage(error.message)
    } finally {
      setLoginBusy(false)
    }
  }

  async function handleRunMrp() {
    if (!hasPermission(currentUser, 'mrp.run')) {
      setNotice({ tone: 'error', message: 'Seu perfil não possui permissão para rodar o MRP.' })
      return
    }

    if (!effectiveCompany) {
      setNotice({ tone: 'warning', message: 'Selecione uma empresa antes de disparar o MRP.' })
      return
    }

    setMrpBusy(true)
    setNotice(null)

    try {
      await requestJson('/api/pcp/runs/mrp', {
        method: 'POST',
        body: { company_code: effectiveCompany },
        accessToken: currentUser?.access_token,
        onUnauthorized: handleUnauthorizedSession,
      })
      setNotice({ tone: 'success', message: `MRP disparado para ${effectiveCompany}. Atualizando os painéis...` })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ tone: 'error', message: error.message })
    } finally {
      setMrpBusy(false)
    }
  }

  async function handleSyncSources(sourceCodes = null) {
    if (!hasPermission(currentUser, 'sources.sync')) {
      setNotice({ tone: 'error', message: 'Seu perfil não possui permissão para sincronizar fontes.' })
      return
    }

    const requestedSources = Array.isArray(sourceCodes)
      ? sourceCodes.filter(Boolean)
      : sourceCodes
        ? [sourceCodes]
        : []

    setSyncBusy(true)
    setNotice(null)

    try {
      await requestJson('/api/pcp/sources/sync', {
        method: 'POST',
        body: {
          trigger: 'web-react-shell',
          ...(requestedSources.length ? { source_codes: requestedSources } : {}),
        },
        accessToken: currentUser?.access_token,
        onUnauthorized: handleUnauthorizedSession,
      })
      const targetLabel = requestedSources.length === 1
        ? ` para ${requestedSources[0]}`
        : requestedSources.length > 1
          ? ` para ${requestedSources.length} fontes`
          : ''
      setNotice({
        tone: 'success',
        message: `Sincronização disparada${targetLabel}. Recarregando indicadores...`,
      })
      setReloadKey((current) => current + 1)
    } catch (error) {
      setNotice({ tone: 'error', message: error.message })
    } finally {
      setSyncBusy(false)
    }
  }

  function renderActiveView() {
    const scopeLabel = effectiveCompany || (hasWildcardScope ? 'Consolidado' : companyScope[0] || 'Sem empresa')

    if (activeRoute.id === 'cockpit') {
      return (
        <Cockpit
          overviewState={resources.overview}
          kanbanState={resources.kanban}
          sourcesState={resources.sources}
          alertsState={resources.alerts}
          scopeLabel={scopeLabel}
          searchQuery={searchQuery}
          stale={isStaleData}
          snapshotAt={resources.overview.data?.snapshot_at}
        />
      )
    }

    if (activeRoute.id === 'romaneios-kanban') {
      return (
        <KanbanBoard
          resourceState={resources.kanban}
          scopeLabel={scopeLabel}
          searchQuery={searchQuery}
          canManageDates={hasPermission(currentUser, 'romaneios.write')}
        />
      )
    }

    if (activeRoute.id === 'romaneios') {
      return (
        <RomaneiosInbox
          resourceState={resources.romaneios}
          currentUser={currentUser}
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          searchQuery={searchQuery}
          canIngest={hasPermission(currentUser, 'romaneios.ingest')}
          selectedCompany={effectiveCompany}
          companySelectionRequired={multiCompanySelectionRequired}
        />
      )
    }

    if (activeRoute.id === 'apontamento') {
      return <ProductionTracking />
    }

    if (activeRoute.id === 'montagem') {
      return (
        <FactorySimulator
          title="Esteiras de Montagem"
          description="Ordem horária simulada a partir da fila oficial de montagem."
          numLanes={2}
          type="assembly"
          items={resources.assembly.data?.items || []}
          resourceState={resources.assembly}
          searchQuery={searchQuery}
        />
      )
    }

    if (activeRoute.id === 'producao') {
      return (
        <FactorySimulator
          title="Extrusoras de Produção"
          description="Alocação das ordens com leitura segura do backlog de produção."
          numLanes={6}
          type="production"
          items={resources.production.data?.items || []}
          resourceState={resources.production}
          searchQuery={searchQuery}
        />
      )
    }

    if (activeRoute.id === 'fontes') {
      return (
        <SourcesGovernance
          resourceState={resources.sources}
          alertsState={resources.alerts}
          scopeLabel={effectiveCompany || 'Transversal ao shell autenticado'}
          searchQuery={searchQuery}
          canSyncSources={hasPermission(currentUser, 'sources.sync')}
          onSyncSources={handleSyncSources}
          syncBusy={syncBusy}
        />
      )
    }

    return (
      <div className="module-placeholder animate-in">
        <StatePanel
          kind="empty"
          title={`${activeRoute.label} está em transição controlada`}
          message="O módulo já respeita sessão, papel e contexto de empresa, mas a superfície React desta área ainda não foi promovida para produção."
          detail="Mantive o módulo visível para navegação e governança, sem prometer um fluxo pronto que ainda não existe."
        />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <main className="auth-layout">
        <section className="auth-hero">
          <div className="auth-kicker">Posto de comando autenticado</div>
          <h1>Operação, MRP e logística em uma camada de decisão confiável.</h1>
          <p>
            O frontend React agora respeita o contrato autenticado do PCP: sessão real, papel ativo,
            escopo de empresa e tratamento explícito de expiração, permissão e contexto multiempresa.
          </p>
          <div className="auth-highlights">
            <article>
              <small>Sessão</small>
              <strong>Bearer token + reset em 401</strong>
            </article>
            <article>
              <small>Papéis</small>
              <strong>root, manager e operator</strong>
            </article>
            <article>
              <small>Escopo</small>
              <strong>Empresa ativa visível na UI</strong>
            </article>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-head">
            <span className="status-pill">Acesso protegido</span>
            <h2>Login do sistema</h2>
            <p>Entre com um usuário válido do backend atual para carregar o shell oficial do produto.</p>
          </div>

          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label>
              <span>Usuário</span>
              <input
                value={loginForm.username}
                onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="manager_inplast"
                autoComplete="username"
              />
            </label>

            <label>
              <span>Senha</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loginBusy}>
              {loginBusy ? 'Autenticando...' : 'Entrar no PCP'}
            </button>
          </form>

          {authMessage ? (
            <div className={`auth-feedback ${authStatus === 'expired' ? 'warning' : 'error'}`}>
              {authMessage}
            </div>
          ) : null}

          <div className="auth-reference-card">
            <small>Primeiro acesso</small>
            <strong>Use o usuário root para administração inicial.</strong>
            <p>Depois do login, a própria UI passa a esconder ações fora do papel autenticado.</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="app-container">
      <Sidebar
        activeView={activeRoute.id}
        routes={accessibleRoutes}
        currentUser={currentUser}
        selectedCompany={effectiveCompany}
        freshnessLabel={freshnessLabel}
        companySelectionRequired={multiCompanySelectionRequired}
      />

      <main className="main-content">
        <Topbar
          route={activeRoute}
          currentUser={currentUser}
          initials={getInitials(currentUser)}
          routeModeLabel={routeModeLabel}
          routeStatus={activeResource?.status || 'ready'}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCompany={effectiveCompany}
          companyOptions={companyOptions}
          companySelectionRequired={companySelectionRequiredForActiveRoute}
          onCompanyChange={(value) => {
            setSelectedCompany(value)
            setNotice(null)
          }}
          freshnessLabel={freshnessLabel}
          isStaleData={isStaleData}
          canRunMrp={hasPermission(currentUser, 'mrp.run')}
          canSyncSources={hasPermission(currentUser, 'sources.sync')}
          onRunMrp={handleRunMrp}
          onSyncSources={handleSyncSources}
          onRefresh={() => setReloadKey((current) => current + 1)}
          onLogout={() => resetToLoggedOutState('Sessão encerrada com segurança.')}
          mrpBusy={mrpBusy}
          syncBusy={syncBusy}
        />

        <div className="view-port">
          {companySelectionRequiredForActiveRoute ? (
            <div className="shell-banner warning">
              <strong>Seleção de empresa obrigatória.</strong>
              <span>Seu usuário possui múltiplas empresas. Escolha uma acima para carregar cockpit e kanban sem ambiguidade.</span>
            </div>
          ) : null}

          {isStaleData ? (
            <div className="shell-banner stale">
              <strong>Snapshot operacional desatualizado.</strong>
              <span>Último dado válido em {formatDateTime(resources.overview.data?.snapshot_at)}.</span>
            </div>
          ) : null}

          {notice ? (
            <div className={`shell-banner ${notice.tone || 'info'}`}>
              <strong>{notice.tone === 'success' ? 'Ação concluída.' : 'Atenção operacional.'}</strong>
              <span>{notice.message}</span>
            </div>
          ) : null}

          <CommandDeck items={commandDeckItems} />

          {renderActiveView()}
        </div>
      </main>
    </div>
  )
}

export default App
