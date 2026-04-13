import { useEffect, useEffectEvent, useState } from 'react'
import CommandDeck from './components/CommandDeck'
import Sidebar from './components/Sidebar'
import StatePanel from './components/StatePanel'
import Topbar from './components/Topbar'
import { ApiError, buildApiPath, createResourceState, getErrorKind, requestJson } from './lib/api'
import Cockpit from './pages/Cockpit'
import FactorySimulator from './pages/FactorySimulator'
import KanbanBoard from './pages/KanbanBoard'
import ProgrammingCenter from './pages/ProgrammingCenter'
import ProductionTracking from './pages/ProductionTracking'
import RomaneiosInbox from './pages/RomaneiosInbox'
import SourcesGovernance from './pages/SourcesGovernance'
import StockMovements from './pages/StockMovements'
import SystemGovernance from './pages/SystemGovernance'
import { useTheme } from './hooks/useTheme'

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
    'production_rules.read',
    'programming.read',
    'programming.write',
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
    'production_rules.read',
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
  { id: 'programacao', label: 'Programação', helper: 'Agenda e capacidade', permission: 'programming.read', implemented: true },
  { id: 'producao', label: 'Produção', helper: 'Portfólio executivo', permission: 'production.read', implemented: true },
  { id: 'injecao', label: 'Injeção', helper: 'Malha de máquinas', permission: 'production.read', implemented: true },
  { id: 'extrusao', label: 'Extrusão', helper: 'Janela e carga', permission: 'production.read', implemented: true },
  { id: 'apontamento', label: 'Apontamento', helper: 'Execução e sincronização', permission: 'apontamento.read', implemented: true },
  { id: 'montagem', label: 'Montagem', helper: 'Linhas e esteiras', permission: 'assembly.read', implemented: true },
  { id: 'romaneios-kanban', label: 'Kanban Logístico', helper: 'Quadro dinâmico logístico exclusivo', permission: 'romaneios.read', implemented: true },
  { id: 'romaneios', label: 'Romaneios', helper: 'Inbox e buffer local', permission: 'romaneios.read', implemented: true },
  { id: 'estoque', label: 'Estoque', helper: 'Saldos e Movimentações', permission: 'stock.read', implemented: true },
  { id: 'estruturas', label: 'Estruturas', helper: 'Leitura guiada', permission: 'structures.read', implemented: false },
  { id: 'compras', label: 'Compras', helper: 'Suprimentos', permission: 'purchases.read', implemented: false },
  { id: 'governanca', label: 'Governança', helper: 'Usuários, Fontes e Integrações', permission: 'sources.read', implemented: true },
]

function createDefaultResources() {
  return {
    overview: createResourceState(),
    kanban: createResourceState(),
    romaneios: createResourceState(),
    stock: createResourceState(),
    assembly: createResourceState(),
    production: createResourceState(),
    sources: createResourceState(),
    users: createResourceState(),
    integrations: createResourceState(),
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
    if (!parsed?.id && !parsed?.username) return null

    if (parsed.expires_at) {
      const expiresAt = new Date(parsed.expires_at)
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
        window.localStorage.removeItem(APP_SESSION_STORAGE_KEY)
        return null
      }
    }

    return normalizeUserPayload(parsed, '', parsed.expires_at)
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
      expires_at: user.expires_at || '',
    }),
  )
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

function getRouteModeLabel(route) {
  if (!route?.implemented) return 'Transição controlada'
  if (route.id === 'cockpit') return 'Visão agregada autenticada'
  if (route.id === 'programacao') return 'Agenda premium conectada'
  if (route.id === 'producao') return 'Portfólio executivo real'
  if (route.id === 'injecao') return 'Malha autenticada por máquina'
  if (route.id === 'extrusao') return 'Janela derivada honesta'
  if (route.id === 'romaneios-kanban') return 'Fila oficial + ajuste PCP'
  if (route.id === 'romaneios') return 'Oficial + buffer local'
  if (route.id === 'apontamento') return 'Execução + sync real'
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
  if (routeId === 'programacao') return null
  if (routeId === 'romaneios-kanban') return resources.kanban
  if (routeId === 'romaneios') return resources.romaneios
  if (routeId === 'estoque') return resources.stock
  if (routeId === 'montagem') return resources.assembly
  if (routeId === 'injecao' || routeId === 'extrusao') return resources.production
  if (routeId === 'producao') return resources.production
  if (routeId === 'governanca') return resources.sources
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
        : 'Sessão em leitura segura; o sistema oficial segue como única referência.',
      tone: canIngest ? 'info' : 'ok',
    }
  }

  if (route.id === 'montagem') {
    const items = resources.assembly.data?.items || []
    return {
      label: 'Carga de montagem',
      value: `${items.length} ordens`,
      detail: 'Linhas e esteiras apoiadas na fila autenticada da sessão.',
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

  if (route.id === 'programacao') {
    return {
      label: 'Agenda conectada',
      value: 'Capacidade visível',
      detail: 'Programação, pressão OEM e catálogo industrial em uma única superfície.',
      tone: 'info',
    }
  }

  if (route.id === 'injecao') {
    return {
      label: 'Malha de injeção',
      value: 'Máquinas + logs',
      detail: 'Leitura cruzada entre programação, regras e apontamento recente.',
      tone: 'info',
    }
  }

  if (route.id === 'extrusao') {
    return {
      label: 'Janela de extrusão',
      value: 'Carga derivada',
      detail: 'Distribuição premium do backlog sem inventar telemetria inexistente.',
      tone: 'warning',
    }
  }

  if (route.id === 'governanca') {
    if (resources.sources.status === 'loading' && !resources.sources.data) {
      return {
        label: 'Saúde sistêmica',
        value: 'Atualizando',
        detail: 'Buscando frescor das fontes, usuários, integrações e alertas centrais do sistema.',
        tone: 'info',
      }
    }

    if (resources.sources.status === 'permission') {
      return {
        label: 'Saúde sistêmica',
        value: 'Leitura restrita',
        detail: resources.sources.error?.message || 'Seu papel não pode abrir a governança.',
        tone: 'warning',
      }
    }

    if (resources.sources.status === 'error' || resources.alerts.status === 'error') {
      return {
        label: 'Saúde sistêmica',
        value: 'Falha de leitura',
        detail: resources.sources.error?.message || resources.alerts.error?.message || 'Não foi possível carregar o estado das integrações e usuários.',
        tone: 'high',
      }
    }

    const items = resources.sources.data?.items || []
    const alerts = resources.alerts.data?.items || []
    const missingCount = items.filter((item) => ['missing', 'error'].includes(String(item.freshness_status || '').toLowerCase())).length
    const attentionCount = items.filter((item) => ['warning', 'stale', 'partial'].includes(String(item.freshness_status || '').toLowerCase())).length
    const highAlertCount = alerts.filter((item) => String(item.severity || '').toLowerCase().includes('high')).length

    return {
      label: 'Saúde das integrações e sistema',
      value: missingCount
        ? `${missingCount} bloqueios`
        : attentionCount
          ? `${attentionCount} fontes atrasadas`
          : 'Sistema sob controle',
      detail: alerts.length
        ? `${alerts.length} alertas ativos${highAlertCount ? `, ${highAlertCount} em alta severidade` : ''}.`
        : 'Sinais centrais limpos. Operação rodando com dados autênticos.',
      tone: missingCount || highAlertCount ? 'high' : attentionCount || alerts.length ? 'warning' : 'ok',
    }
  }

  if (route.id === 'estoque') {
    return {
      label: 'Gestão de estoques',
      value: 'Saldos unificados',
      detail: 'Acompanhamento do estoque real e histórico de movimentações da operação.',
      tone: 'info',
    }
  }

  if (route.id === 'apontamento') {
    return {
      label: 'Estado do fluxo',
      value: 'Execução real',
      detail: 'Eventos, fila pendente e sincronização manualmente governável no mesmo módulo.',
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
function App() {
  const restoredUser = loadStoredSession()
  const { theme, toggleTheme } = useTheme()

  const [activeView, setActiveView] = useState('cockpit')
  const [navigationContext, setNavigationContext] = useState(null)
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

  async function resetToLoggedOutState(message, status = 'anonymous') {
    try {
      await requestJson('/api/pcp/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    persistStoredSession(null)
    setCurrentUser(null)
    setSelectedCompany('')
    setNavigationContext(null)
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
      setNavigationContext((current) => (current?.targetView === nextHash ? current : null))
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
        stock: createResourceState('loading', previous.stock.data, null),
        assembly: createResourceState('loading', previous.assembly.data, null),
        production: createResourceState('loading', previous.production.data, null),
        sources: createResourceState('loading', previous.sources.data, null),
        users: createResourceState('loading', previous.users.data, null),
        integrations: createResourceState('loading', previous.integrations.data, null),
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
          nextResources[key] = createResourceState(getErrorKind(error), null, error)
        }
      }

      await Promise.all([
        loadResource('overview', '/api/pcp/overview', { requiresScopedCompany: true }),
        loadResource('kanban', '/api/pcp/romaneios-kanban', { requiresScopedCompany: true }),
        loadResource('romaneios', '/api/pcp/romaneios', { optionalCompany: true }),
        loadResource('stock', '/api/pcp/stock-movements', { optionalCompany: true }),
        loadResource('assembly', '/api/pcp/assembly'),
        loadResource('production', '/api/pcp/production'),
        loadResource('sources', '/api/pcp/sources'),
        loadResource('users', '/api/pcp/users'),
        loadResource('integrations', '/api/pcp/integrations'),
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

  async function handleRunMrp(event) {
    if (event && typeof event === 'object' && 'preventDefault' in event) {
      event.preventDefault()
    }
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

    // Ensure we don't treat a React event as a source code array/string
    const actualSourceCodes = (sourceCodes && typeof sourceCodes === 'object' && 'nativeEvent' in sourceCodes) ? null : sourceCodes
    const requestedSources = Array.isArray(actualSourceCodes)
      ? actualSourceCodes.filter(Boolean)
      : actualSourceCodes
        ? [actualSourceCodes]
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

  function handleNavigate(nextView, context = null) {
    const nextRoute = accessibleRoutes.find((route) => route.id === nextView)

    if (!nextRoute) {
      setNotice({ tone: 'warning', message: 'Seu papel atual não pode abrir este módulo a partir deste atalho.' })
      return
    }

    setNotice(null)
    setSearchQuery('')
    setNavigationContext(
      context
        ? {
            ...context,
            targetView: nextRoute.id,
            requestedAt: Date.now(),
          }
        : null,
    )
    setActiveView(nextRoute.id)
    window.location.hash = `#${nextRoute.id}`
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
          onNavigate={handleNavigate}
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
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          selectedCompany={effectiveCompany}
          onRequestReload={() => setReloadKey((current) => current + 1)}
          onNavigate={handleNavigate}
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
          onNavigate={handleNavigate}
          navigationContext={navigationContext}
          onNavigationContextConsumed={() => setNavigationContext(null)}
        />
      )
    }

    if (activeRoute.id === 'programacao') {
      return (
        <ProgrammingCenter
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          selectedCompany={effectiveCompany}
          companySelectionRequired={multiCompanySelectionRequired}
          searchQuery={searchQuery}
          canWrite={hasPermission(currentUser, 'programming.write')}
          currentUser={currentUser}
          reloadKey={reloadKey}
          scopeLabel={scopeLabel}
        />
      )
    }

    if (activeRoute.id === 'apontamento') {
      return (
        <ProductionTracking
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          currentUser={currentUser}
          searchQuery={searchQuery}
          reloadKey={reloadKey}
          selectedCompany={effectiveCompany}
          companySelectionRequired={multiCompanySelectionRequired}
          canWrite={hasPermission(currentUser, 'apontamento.write')}
          canDispatch={hasPermission(currentUser, 'apontamento.dispatch')}
        />
      )
    }

    if (activeRoute.id === 'montagem') {
      return (
        <FactorySimulator
          title="Esteiras de Montagem"
          description="Linhas, esteiras e sequência oficial de montagem com uma leitura mais madura de capacidade."
          type="assembly"
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          selectedCompany={effectiveCompany}
          companySelectionRequired={multiCompanySelectionRequired}
          searchQuery={searchQuery}
          reloadKey={reloadKey}
          scopeLabel={scopeLabel}
        />
      )
    }

    if (activeRoute.id === 'producao') {
      return (
        <FactorySimulator
          title="Produção OEM Command Center"
          description="Portfólio executivo de produção com backlog, pressão OEM e malha de máquina sem cair em storyboard genérico."
          type="production"
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          selectedCompany={effectiveCompany}
          companySelectionRequired={multiCompanySelectionRequired}
          searchQuery={searchQuery}
          reloadKey={reloadKey}
          scopeLabel={scopeLabel}
        />
      )
    }

    if (activeRoute.id === 'injecao') {
      return (
        <FactorySimulator
          title="Injeção"
          description="Leitura premium de injetoras com agenda autenticada, regras catalogadas e últimos sinais de execução."
          type="injection"
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          selectedCompany={effectiveCompany}
          companySelectionRequired={multiCompanySelectionRequired}
          searchQuery={searchQuery}
          reloadKey={reloadKey}
          scopeLabel={scopeLabel}
        />
      )
    }

    if (activeRoute.id === 'extrusao') {
      return (
        <FactorySimulator
          title="Extrusão"
          description="Janela executiva de extrusão derivada do backlog autenticado, com clareza sobre o que é cálculo e o que é leitura oficial."
          type="extrusion"
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          selectedCompany={effectiveCompany}
          companySelectionRequired={multiCompanySelectionRequired}
          searchQuery={searchQuery}
          reloadKey={reloadKey}
          scopeLabel={scopeLabel}
        />
      )
    }

    if (activeRoute.id === 'estoque') {
      return (
        <StockMovements
          resourceState={resources.stock}
          currentUser={currentUser}
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          searchQuery={searchQuery}
          onRequestReload={() => setReloadKey((current) => current + 1)}
        />
      )
    }

    if (activeRoute.id === 'governanca') {
      return (
        <SystemGovernance
          sourcesState={resources.sources}
          usersState={resources.users}
          integrationsState={resources.integrations}
          alertsState={resources.alerts}
          currentUser={currentUser}
          scopeLabel={effectiveCompany || 'Transversal ao shell autenticado'}
          searchQuery={searchQuery}
          canSyncSources={hasPermission(currentUser, 'sources.sync')}
          onSyncSources={handleSyncSources}
          syncBusy={syncBusy}
          onNavigate={handleNavigate}
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          onRequestReload={() => setReloadKey((current) => current + 1)}
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
          <div className="auth-highlights">
             <div className="auth-logo-large">
               <img src="/inplast-logo.png" alt="Inplast Logo" />
             </div>
             <div className="auth-hero-3d-visual">
                <div className="cube-3d"></div>
                <div className="glow-sphere"></div>
             </div>
          </div>
          <div className="auth-content-group">
            <div className="auth-kicker">Posto de comando autenticado</div>
            <h1>Control Desk PCP</h1>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-head">
            <span className="status-pill">Acesso protegido</span>
            <h2>Login do sistema</h2>
            <p>Entre com um usuário válido do sistema atual para carregar o shell oficial do produto.</p>
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
        theme={theme}
        toggleTheme={toggleTheme}
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

          {hasPermission(currentUser, 'system.debug') && <CommandDeck items={commandDeckItems} />}

          {renderActiveView()}
        </div>
      </main>
    </div>
  )
}

export default App
