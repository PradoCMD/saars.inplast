import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { FiAlertCircle, FiCheckCircle, FiClock, FiPauseCircle, FiPlayCircle, FiSearch, FiUser } from 'react-icons/fi'

import './ProductionTracking.css'

const operations = [
  {
    id: 2627,
    status: 'Disponivel',
    product: 'Produto: CHAPA PP C/MBT B/N CS 400 X 700 MM',
    op: 'Op. e Produto: 6.000 LE 626 / 6593-1',
    activity: 'Atividade: Extrusao',
    qty: '8.400 KG',
    operator: 'angelo.sankhya',
    priority: 'normal',
  },
  {
    id: 2626,
    status: 'Pronta',
    product: 'Produto: PERFIL TECNICO NATURAL B 60',
    op: 'Op. e Produto: 6.000 LE 624 / 6346-1',
    activity: 'Atividade: Acabamento',
    qty: '3.200 KG',
    operator: 'angelo.sankhya',
    priority: 'high',
  },
  {
    id: 2624,
    status: 'Em fila',
    product: 'Produto: CHAPA PP C/MBT B/N CS 400 X 700 MM',
    op: 'Op. e Produto: 6.000 LE 624 / 6346-1',
    activity: 'Atividade: Extrusao',
    qty: '6.000 KG',
    operator: 'marina.nascimento',
    priority: 'normal',
  },
]

const modules = [
  {
    id: 'login',
    label: 'Autenticacao',
    title: 'Entrada do operador',
    description: 'Tela limpa, campos centrais e CTA unico para iniciar o turno.',
    icon: <FiUser />,
  },
  {
    id: 'orders',
    label: 'Ordens',
    title: 'Fila de OPs',
    description: 'Lista compacta com status, descricao tecnica e acao direta por ordem.',
    icon: <FiClock />,
  },
  {
    id: 'init',
    label: 'Inicializacao',
    title: 'Confirmacao de partida',
    description: 'Modal curto para iniciar a OP com menos risco de toque indevido.',
    icon: <FiPlayCircle />,
  },
  {
    id: 'tracking',
    label: 'Apontamento',
    title: 'Andamento e pausas',
    description: 'Estrutura pronta para evoluir para pausa, apontamento parcial e encerramento.',
    icon: <FiPauseCircle />,
  },
]

function ApontaLogo() {
  return (
    <div className="aponta-logo">
      <div className="aponta-logo-mark">
        <span />
        <span />
        <span />
      </div>
      <div className="aponta-logo-text">
        <strong>APONTA</strong>
        <small>Apontamento de Produção</small>
      </div>
    </div>
  )
}

function LoginPhone() {
  return (
    <div className="aponta-phone-card">
      <div className="aponta-screen aponta-screen-login">
        <div className="aponta-login-header">
          <ApontaLogo />
        </div>

        <div className="aponta-login-form">
          <label className="aponta-input">
            <FiUser />
            <input value="angelo.sankhya" readOnly />
          </label>
          <label className="aponta-input">
            <FiAlertCircle />
            <input value="••••••••" readOnly />
          </label>
          <button className="aponta-primary-button">Entrar</button>
        </div>

        <div className="aponta-login-help">
          <span className="aponta-help-dot" />
        </div>
      </div>
    </div>
  )
}

function OrdersPhone({ operations, search, onSearch }) {
  const deferredSearch = useDeferredValue(search)
  const filteredOps = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    if (!term) return operations
    return operations.filter((operation) =>
      [
        String(operation.id),
        operation.product,
        operation.op,
        operation.activity,
        operation.status,
      ].some((value) => value.toLowerCase().includes(term)),
    )
  }, [deferredSearch, operations])

  return (
    <div className="aponta-phone-card">
      <div className="aponta-screen aponta-screen-orders">
        <div className="aponta-orders-topbar">
          <span className="aponta-topbar-back">‹</span>
          <strong>Ordens de Prod.</strong>
          <div className="aponta-topbar-icons">
            <span />
            <span />
          </div>
        </div>

        <div className="aponta-search-box">
          <FiSearch />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Pesquisar OP ou produto"
          />
        </div>

        <div className="aponta-orders-list">
          {filteredOps.map((operation) => (
            <article key={operation.id} className="aponta-order-card">
              <header>
                <small>Nro. OP: {operation.id}</small>
                <span className={`aponta-priority ${operation.priority}`}>!</span>
              </header>
              <p>{operation.product}</p>
              <p>{operation.op}</p>
              <p>{operation.activity}</p>
              <footer>
                <span>Status: {operation.status}</span>
                <strong>{operation.qty}</strong>
              </footer>
            </article>
          ))}
        </div>

        <div className="aponta-init-modal">
          <div className="aponta-init-modal-body">
            <strong>Realizar a inicialização da OP?</strong>
            <div className="aponta-init-actions">
              <button className="aponta-outline-danger">CANCELAR</button>
              <button className="aponta-outline-success">CONTINUAR</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductionTracking() {
  const [search, setSearch] = useState('')
  const [activeModule, setActiveModule] = useState('orders')

  const statusSummary = {
    total: operations.length,
    ready: operations.filter((operation) => operation.status === 'Pronta').length,
    active: operations.filter((operation) => operation.status === 'Disponivel').length,
  }

  const handleModuleClick = (moduleId) => {
    startTransition(() => {
      setActiveModule(moduleId)
    })
  }

  return (
    <div className="aponta-page animate-in">
      <section className="aponta-hero-board">
        <div className="aponta-hero-copy">
          <span className="aponta-kicker">Modulo novo</span>
          <h2>App Aponta</h2>
          <p>
            Baseado diretamente no PDF do app de apontamento, com foco em leitura rápida, toque grande
            e fluxo curto entre login, fila de OPs e inicialização da ordem.
          </p>

          <div className="aponta-summary-strip">
            <div>
              <small>Ordens visiveis</small>
              <strong>{statusSummary.total}</strong>
            </div>
            <div>
              <small>Prontas</small>
              <strong>{statusSummary.ready}</strong>
            </div>
            <div>
              <small>Disponiveis</small>
              <strong>{statusSummary.active}</strong>
            </div>
          </div>
        </div>

        <div className="aponta-phone-gallery">
          <LoginPhone />
          <OrdersPhone
            operations={operations}
            search={search}
            onSearch={setSearch}
          />
        </div>
      </section>

      <section className="aponta-modules-grid">
        {modules.map((module) => (
          <button
            key={module.id}
            type="button"
            className={`aponta-module-card ${activeModule === module.id ? 'active' : ''}`}
            onClick={() => handleModuleClick(module.id)}
          >
            <span className="aponta-module-icon">{module.icon}</span>
            <small>{module.label}</small>
            <strong>{module.title}</strong>
            <p>{module.description}</p>
          </button>
        ))}
      </section>

      <section className="aponta-detail-grid">
        <div className="glass-panel aponta-detail-panel">
          <div className="panel-header">
            <h3>Fluxo validado do PDF</h3>
            <span className="status-badge ready">React</span>
          </div>

          <div className="aponta-step-list">
            <div className={`aponta-step ${activeModule === 'login' ? 'active' : ''}`}>
              <FiCheckCircle />
              <div>
                <strong>Login enxuto</strong>
                <p>Operador entra direto com usuário e senha, sem navegação lateral nem distrações.</p>
              </div>
            </div>
            <div className={`aponta-step ${activeModule === 'orders' ? 'active' : ''}`}>
              <FiClock />
              <div>
                <strong>Lista operacional</strong>
                <p>Cards compactos por OP com o bloco técnico principal aparecendo em três linhas.</p>
              </div>
            </div>
            <div className={`aponta-step ${activeModule === 'init' ? 'active' : ''}`}>
              <FiPlayCircle />
              <div>
                <strong>Inicialização protegida</strong>
                <p>Confirmação binária com botão vermelho para cancelar e verde para iniciar a ordem.</p>
              </div>
            </div>
            <div className={`aponta-step ${activeModule === 'tracking' ? 'active' : ''}`}>
              <FiPauseCircle />
              <div>
                <strong>Próxima camada</strong>
                <p>Estrutura pronta para evolução do apontamento em andamento, pausas e encerramento.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel aponta-detail-panel">
          <div className="panel-header">
            <h3>Fila de ordens de referência</h3>
            <span className="tag info">Mockado</span>
          </div>

          <div className="aponta-order-summary">
            {operations.map((operation) => (
              <div key={operation.id} className="aponta-order-summary-card">
                <div className="aponta-order-summary-top">
                  <strong>OP {operation.id}</strong>
                  <span className={`tag ${operation.priority === 'high' ? 'high' : 'info'}`}>
                    {operation.status}
                  </span>
                </div>
                <p>{operation.product}</p>
                <small>{operation.activity}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProductionTracking
