import { useCallback, useEffect, useState } from 'react'
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

const MODULE_PERMISSION_GRANTS = {
  cockpit: {
    view: ['overview.read', 'painel.read', 'alerts.read'],
    edit: ['overview.read', 'painel.read', 'alerts.read'],
  },
  kanban: {
    view: ['romaneios.read'],
    edit: ['romaneios.read', 'romaneios.write', 'romaneios.delete', 'romaneios.ingest'],
  },
  tracking: {
    view: ['production.read', 'apontamento.read'],
    edit: ['production.read', 'apontamento.read', 'apontamento.write', 'apontamento.dispatch'],
  },
  programming: {
    view: ['programming.read', 'structures.read'],
    edit: ['programming.read', 'programming.write', 'structures.read', 'structure_override.write'],
  },
  sources: {
    view: ['sources.read', 'stock.read'],
    edit: ['sources.read', 'sources.sync', 'stock.read', 'stock.write'],
  },
  system: {
    view: ['users.read', 'integrations.read'],
    edit: ['users.read', 'users.write', 'integrations.read', 'integrations.write'],
  },
  simulator: {
    view: ['production_rules.read'],
    edit: ['production_rules.read', 'mrp.run'],
  },
}

const ROUTES = [
  { id: 'cockpit', label: 'Cockpit', helper: 'Leitura operacional', permission: 'overview.read', implemented: true },
  { id: 'romaneios-kanban', label: 'Kanban Romaneios', helper: 'Quadro dinâmico logístico', permission: 'romaneios.read', implemented: true },
  { id: 'programacao', label: 'Programação', helper: 'Agenda e capacidade', permission: 'programming.read', implemented: true },
  { id: 'producao', label: 'Produção', helper: 'Portfólio executivo', permission: 'production.read', implemented: true },
  { id: 'injecao', label: 'Injeção', helper: 'Malha de máquinas', permission: 'production.read', implemented: true },
  { id: 'extrusao', label: 'Extrusão', helper: 'Janela e carga', permission: 'production.read', implemented: true },
  { id: 'apontamento', label: 'Apontamento', helper: 'Execução e sincronização', permission: 'apontamento.read', implemented: true },
  { id: 'montagem', label: 'Montagem', helper: 'Linhas e esteiras', permission: 'assembly.read', implemented: true },
  { id: 'romaneios', label: 'Romaneios', helper: 'Inbox e buffer local', permission: 'romaneios.read', implemented: true },
  { id: 'estoque', label: 'Estoque Geral', helper: 'Saldos unificados', permission: 'stock.read', implemented: true },
  { id: 'estoque-intermediario', label: 'Estoque Intermediário', helper: 'Produtos em processo', permission: 'stock.read', implemented: true },
  { id: 'materia-prima', label: 'Matéria-Prima', helper: 'Almoxarifado base', permission: 'stock.read', implemented: true },
  { id: 'componentes', label: 'Componentes', helper: 'Itens de montagem', permission: 'stock.read', implemented: true },
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
    production_logs: createResourceState(),
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
  const permissions = new Set(ROLE_PERMISSIONS[role] || [])

  const modulePermissions = user?.permissions
  if (modulePermissions && typeof modulePermissions === 'object') {
    Object.entries(modulePermissions).forEach(([moduleName, accessLevel]) => {
      const moduleKey = String(moduleName || '').trim().toLowerCase()
      const levelKey = String(accessLevel || '').trim().toLowerCase()
      if (!['view', 'edit'].includes(levelKey)) return
      const grants = MODULE_PERMISSION_GRANTS[moduleKey]?.[levelKey] || []
      grants.forEach((grant) => permissions.add(grant))
    })
  }

  return permissions.has('*') || permissions.has(permission)
}

function normalizeUserPayload(user, accessToken = '', expiresAt = '') {
  if (!user) return null
  return {
    ...user,
    id: user.id || user.user_id || '',
    role: normalizeRole(user.role, user.username),
    company_scope: normalizeCompanyScope(user.company_scope, user.role, user.username),
    permissions: (user.permissions && typeof user.permissions === 'object') ? user.permissions : {},
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

    const token = parsed.access_token || (parsed.username === 'root' ? 'pcp_app_session_v1_root' : '')
    return normalizeUserPayload(parsed, token, parsed.expires_at)
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
      permissions: user.permissions || {},
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
  if (!route?.implemented) return 'Em desenvolvimento'
  if (route.id === 'cockpit') return 'Visão geral'
  if (route.id === 'programacao') return 'Agenda ativa'
  if (route.id === 'producao') return 'Produção'
  if (route.id === 'injecao') return 'Injeção'
  if (route.id === 'extrusao') return 'Extrusão'
  if (route.id === 'romaneios-kanban') return 'Kanban logístico'
  if (route.id === 'romaneios') return 'Romaneios'
  if (route.id === 'apontamento') return 'Apontamento'
  return 'Operacional'
}

function getRoleCapabilityLabel(user) {
  const role = normalizeRole(user?.role, user?.username)
  if (role === 'root') return 'Acesso total'
  if (role === 'manager') return 'Gestão PCP'
  return 'Operador'
}

function buildRouteSignalCard(route, resources, canIngest) {
  if (!route) {
    return { label: 'Módulo', value: 'Nenhum', detail: 'Selecione um módulo.', tone: 'info' }
  }

  if (route.id === 'cockpit') {
    const overview = resources.overview.data || {}
    const missing = Number(overview.totals?.romaneios_sem_previsao || 0)
    return {
      label: 'Prioridade',
      value: missing ? `${missing} sem data` : 'OK',
      detail: missing ? 'Romaneios aguardando programação.' : 'Sem pendências críticas.',
      tone: missing ? 'high' : 'ok',
    }
  }

  if (route.id === 'romaneios-kanban') {
    const romaneios = resources.kanban.data?.romaneios || []
    const missing = romaneios.filter((item) => !item.previsao_saida_at).length
    return {
      label: 'Fila',
      value: `${romaneios.length} romaneios`,
      detail: missing ? `${missing} sem data de saída` : 'Todos programados.',
      tone: missing ? 'warning' : 'ok',
    }
  }

  if (route.id === 'romaneios') {
    const items = resources.romaneios.data?.items || []
    return { label: 'Romaneios', value: `${items.length}`, detail: 'Registros oficiais.', tone: 'info' }
  }

  if (route.id === 'montagem') {
    const items = resources.assembly.data?.items || []
    return { label: 'Montagem', value: `${items.length} ordens`, detail: 'Linhas ativas.', tone: items.length ? 'info' : 'ok' }
  }

  if (route.id === 'producao') {
    const items = resources.production.data?.items || []
    return { label: 'Produção', value: `${items.length} ordens`, detail: 'Backlog operacional.', tone: items.length ? 'info' : 'ok' }
  }

  if (route.id === 'programacao') {
    return { label: 'Programação', value: 'Ativa', detail: 'Agenda e capacidade.', tone: 'info' }
  }

  if (route.id === 'injecao') {
    return { label: 'Injeção', value: 'Online', detail: 'Máquinas e logs.', tone: 'info' }
  }

  if (route.id === 'extrusao') {
    return { label: 'Extrusão', value: 'Derivada', detail: 'Carga do backlog.', tone: 'info' }
  }

  if (route.id === 'governanca') {
    if (resources.sources.status === 'loading' && !resources.sources.data) {
      return { label: 'Sistema', value: 'Carregando...', detail: 'Buscando fontes e alertas.', tone: 'info' }
    }
    if (resources.sources.status === 'permission') {
      return { label: 'Sistema', value: 'Restrito', detail: 'Sem permissão.', tone: 'warning' }
    }
    if (resources.sources.status === 'error' || resources.alerts.status === 'error') {
      return { label: 'Sistema', value: 'Falha', detail: 'Erro ao carregar.', tone: 'high' }
    }
    const items = resources.sources.data?.items || []
    const alerts = resources.alerts.data?.items || []
    const blocked = items.filter((item) => ['missing', 'error'].includes(String(item.freshness_status || '').toLowerCase())).length
    return {
      label: 'Saúde',
      value: blocked ? `${blocked} bloqueios` : 'Estável',
      detail: alerts.length ? `${alerts.length} alertas ativos.` : 'Sem alertas.',
      tone: blocked ? 'high' : alerts.length ? 'warning' : 'ok',
    }
  }

  if (route.id === 'estoque') {
    return { label: 'Estoque', value: 'Ativo', detail: 'Saldos e movimentações.', tone: 'info' }
  }

  if (route.id === 'apontamento') {
    return { label: 'Apontamento', value: 'Ativo', detail: 'Eventos e sync.', tone: 'info' }
  }

  return {
    label: 'Módulo',
    value: route.implemented ? 'Disponível' : 'Em desenvolvimento',
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
  const roleLabel = String(normalizeRole(currentUser?.role, currentUser?.username)).toUpperCase()
  const routeModeLabel = getRouteModeLabel(activeRoute)
  const routeSignalCard = buildRouteSignalCard(activeRoute, resources, hasPermission(currentUser, 'romaneios.ingest'))
  const commandDeckItems = [
    {
      label: 'Empresa',
      value: effectiveCompany || (hasWildcardScope ? 'Consolidado' : '—'),
      detail: multiCompanySelectionRequired ? 'Selecione a empresa.' : '',
      tone: multiCompanySelectionRequired ? 'warning' : 'ok',
    },
    {
      label: 'Perfil',
      value: roleLabel,
      detail: getRoleCapabilityLabel(currentUser),
      tone: roleLabel === 'OPERATOR' ? 'warning' : 'info',
    },
    {
      label: 'Módulo',
      value: routeModeLabel,
      detail: '',
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
    setSyncBusy(false)
    setAuthStatus(status)
    setAuthMessage(message || '')
    window.location.hash = '#cockpit'
  }

  const handleUnauthorizedSession = useCallback((message) => {
    resetToLoggedOutState(message, 'expired')
  }, [])

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
    console.log('[DEBUG-STATE] currentUser:', !!currentUser, 'effectiveCompany:', effectiveCompany, 'multi-req:', multiCompanySelectionRequired);
  }, [currentUser, effectiveCompany, multiCompanySelectionRequired])

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
      if (cancelled) return;
      console.log('[DEBUG] loadResources INICIADO.');

      const updateResource = (key, state) => {
        if (cancelled) return;
        setResources(prev => ({ ...prev, [key]: state }));
      };

      const loadResource = async (key, path, { requiresScopedCompany = false, optionalCompany = false } = {}) => {
        if (requiresScopedCompany && multiCompanySelectionRequired) {
          updateResource(key, createResourceState('company', null, companyError));
          return;
        }

        updateResource(key, { ...resources[key], status: 'loading' });

        try {
          const shouldAttachCompany = requiresScopedCompany || (optionalCompany && effectiveCompany);
          const data = await requestJson(
            buildApiPath(path, shouldAttachCompany ? effectiveCompany : ''),
            {
              accessToken: currentUser.access_token,
              onUnauthorized: handleUnauthorizedSession,
            },
          );
          updateResource(key, createResourceState('ready', data, null));
        } catch (error) {
          console.error(`[ERROR] ${key}:`, error);
          updateResource(key, createResourceState(getErrorKind(error), null, error));
        }
      };

      try {
        await Promise.allSettled([
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
          loadResource('production_logs', '/api/pcp/apontamento/logs'),
        ]);
        if (!cancelled) setLastLoadedAt(new Date().toISOString());
      } catch (err) {
        console.error('[CRITICAL] loadResources failed:', err);
      }
    }

    loadResources()

    // Gatilho de Emergência: Força uma carga após 10 segundos apenas se estiver IDLE e não cancelado
    const emergencyTimer = setTimeout(() => {
      if (!cancelled && lastLoadedAt === '') {
        console.log('[DEBUG-EMERGENCY] Verificando status após 10s...');
        loadResources();
      }
    }, 10000);

    return () => {
      cancelled = true
      clearTimeout(emergencyTimer);
    }
  }, [currentUser, effectiveCompany, multiCompanySelectionRequired, reloadKey, handleUnauthorizedSession])

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
          source_codes: requestedSources.length ? requestedSources : null,
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

    if (['estoque', 'estoque-intermediario', 'materia-prima', 'componentes'].includes(activeRoute.id)) {
      const filterType = activeRoute.id === 'estoque' ? null : activeRoute.id
      return (
        <StockMovements
          resourceState={resources.stock}
          currentUser={currentUser}
          accessToken={currentUser?.access_token}
          onUnauthorizedSession={handleUnauthorizedSession}
          searchQuery={searchQuery}
          filterType={filterType}
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
          title={`${activeRoute.label} — em desenvolvimento`}
          message="Este módulo está sendo preparado e será disponibilizado em breve."
        />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <main className="auth-centralized-layout">
        <div className="auth-glow-background"></div>
        <div className="auth-content-wrapper">
          <header className="auth-header-logo">
            <img src="/inplast-logo.png" alt="Inplast" className="auth-logo-img" />
          </header>

          <section className="auth-main-card glass-panel">
            <form className="auth-form-premium" onSubmit={handleLoginSubmit}>
              <div className="auth-input-group">
                <label htmlFor="auth-username">Usuário</label>
                <input
                  id="auth-username"
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="Seu usuário"
                  autoComplete="username"
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="auth-password">Senha</label>
                <input
                  id="auth-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="btn-auth-submit" disabled={loginBusy}>
                {loginBusy ? 'Validando...' : 'Entrar no Sistema'}
              </button>
            </form>

            {authMessage && (
              <div className={`auth-feedback-banner ${authStatus === 'expired' ? 'warning' : 'error'}`}>
                {authMessage}
              </div>
            )}
          </section>

          <footer className="auth-footer-brand">
            <h1 className="auth-title-glow">CONTROL DESK PCP</h1>
            <div className="auth-subtitle">SISTEMA INTEGRADO DE PLANEJAMENTO & PRODUÇÃO</div>
          </footer>
        </div>
      </main>
    )
  }

  return (
    <div className="app-container">
      <div className="global-star-bg"></div>
      <Sidebar
        activeView={activeRoute.id}
        routes={accessibleRoutes}
        currentUser={currentUser}
        selectedCompany={effectiveCompany}
        freshnessLabel={freshnessLabel}
        companySelectionRequired={multiCompanySelectionRequired}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={() => resetToLoggedOutState('Sessão encerrada com segurança.')}
      />

      <main className="main-content">
        <Topbar
          route={activeRoute}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCompany={effectiveCompany}
          companyOptions={companyOptions}
          companySelectionRequired={companySelectionRequiredForActiveRoute}
          onCompanyChange={(value) => {
            setSelectedCompany(value)
            setNotice(null)
          }}
          theme={theme}
          toggleTheme={toggleTheme}
          canSyncSources={hasPermission(currentUser, 'sources.sync')}
          onSyncSources={handleSyncSources}
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


          {renderActiveView()}
        </div>
      </main>
    </div>
  )
}

export default App
