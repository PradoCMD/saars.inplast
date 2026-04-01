import { startTransition, useState } from 'react'
import {
  FiActivity,
  FiAlertCircle,
  FiBox,
  FiCheckCircle,
  FiCheckSquare,
  FiClock,
  FiPauseCircle,
  FiPlayCircle,
  FiSearch,
  FiUser,
} from 'react-icons/fi'

import './ProductionTracking.css'

const queueOperations = [
  {
    id: 2644,
    product: 'Produto: CHAPA PP ALVE 12',
    op: 'Op. e Produto: 5.000 LE 774 / 1452-14',
    activity: 'Ativ.: Produção',
    priority: 'info',
  },
  {
    id: 2627,
    product: 'Produto: CHAPA PP C/MBT B/N CS 400 X 700 MM',
    op: 'Op. e Produto: 6.000 LE 626 / 6593-1',
    activity: 'Ativ.: Produção',
    priority: 'warning',
  },
  {
    id: 2626,
    product: 'Produto: PERFIL TECNICO NATURAL B 60',
    op: 'Op. e Produto: 6.000 LE 624 / 6346-1',
    activity: 'Ativ.: Produção',
    priority: 'info',
  },
]

const pauseReasons = [
  'AGUARDANDO CARRO',
  'AGUARDANDO MATERIAL',
  'AJUSTE MESA DE ALIMENTAÇÃO',
  'DEFEITO ELÉTRICO',
  'DEFEITO MECÂNICO',
  'FALTA DE PROGRAMAÇÃO',
]

const lossReasons = [
  'ABAULAMENTO',
  'BOLHAS',
  'CAIXAS DE AJUSTE',
  'CAIXAS SUJAS E DANIFICADAS',
  'CHAPA DESALINHADA',
  'CHAPA COM REBARBAS',
]

const finishedProducts = [
  { code: 'PMC 425', description: 'Produto: PAPEL CAPA 1 110', qty: '311.600 KG' },
  { code: 'PMC 522', description: 'Produto: PAPEL MIOLO 100 U', qty: '186.400 KG' },
  { code: 'COLA BIS', description: 'Produto: COLA BHS - ITA', qty: '27.100 KG' },
]

const rawMaterials = [
  { code: 'MP 110', description: 'Produto: PAPEL CAPA 1 110', qty: '318.800 KG' },
  { code: 'MP 100', description: 'Produto: PAPEL MIOLO 100 U', qty: '194.600 KG' },
  { code: 'AD 018', description: 'Produto: COLA BHS - ITA', qty: '31.400 KG' },
]

const executionEntries = [
  {
    type: 'Parada: FALHA DO SLOTTER',
    startedAt: 'Ini. Real: 01/10 17:28:31',
    endedAt: 'Fim Real: 01/10 17:33:05',
    note: 'Observação: processo',
    tone: 'high',
  },
  {
    type: 'Normal',
    startedAt: 'Ini. Real: 01/10 17:36:45',
    endedAt: 'Fim Real: 01/10 17:40:58',
    note: 'Observação: OK',
    tone: 'ok',
  },
]

const sectionChips = [
  { id: 'acesso', label: 'Acesso e OPs' },
  { id: 'execucao', label: 'Execução' },
  { id: 'paradas', label: 'Paradas e perdas' },
  { id: 'apontamento', label: 'PA e MP' },
  { id: 'finalizacao', label: 'Finalização' },
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

function PhoneShell({ children, className = '' }) {
  return (
    <div className="aponta-phone-card">
      <div className={`aponta-screen ${className}`}>{children}</div>
    </div>
  )
}

function PhoneHeader({ title, compact = false }) {
  return (
    <div className={`aponta-topbar ${compact ? 'compact' : ''}`}>
      <span className="aponta-topbar-back">‹</span>
      <strong>{title}</strong>
      <div className="aponta-topbar-icons">
        <span />
        <span />
      </div>
    </div>
  )
}

function ModalCard({ title, confirmLabel = 'OK', confirmTone = 'success', cancelLabel = '', compact = false }) {
  return (
    <div className={`aponta-modal ${compact ? 'compact' : ''}`}>
      <div className="aponta-modal-body">
        <strong>{title}</strong>
        <div className="aponta-modal-actions">
          {cancelLabel ? <button className="aponta-btn danger">{cancelLabel}</button> : null}
          <button className={`aponta-btn ${confirmTone}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function LoginPhone() {
  return (
    <PhoneShell className="aponta-screen-light">
      <div className="aponta-login-hero">
        <ApontaLogo />
      </div>
      <div className="aponta-login-form">
        <label className="aponta-pill-input">
          <FiUser />
          <input value="angelo.sankhya" readOnly />
        </label>
        <label className="aponta-pill-input">
          <FiAlertCircle />
          <input value="••••••••" readOnly />
        </label>
        <button className="aponta-primary-button">Entrar</button>
      </div>
      <div className="aponta-floating-help" />
    </PhoneShell>
  )
}

function QueuePhone({ modalTitle }) {
  return (
    <PhoneShell className="aponta-screen-dark">
      <PhoneHeader title="Ordens de Prod." />
      <div className="aponta-search-box">
        <FiSearch />
        <input placeholder="Pesquisar OP" readOnly />
      </div>
      <div className="aponta-list-stack">
        {queueOperations.map((operation) => (
          <article key={operation.id} className="aponta-order-card">
            <header>
              <small>Nro. OP: {operation.id}</small>
              <span className={`aponta-priority ${operation.priority}`}>!</span>
            </header>
            <p>{operation.product}</p>
            <p>{operation.op}</p>
            <footer>{operation.activity}</footer>
          </article>
        ))}
      </div>
      {modalTitle ? (
        <ModalCard
          title={modalTitle}
          confirmLabel={modalTitle.includes('Inicializada') ? 'OK' : 'CONTINUAR'}
          confirmTone="success"
          cancelLabel={modalTitle.includes('Inicialização') ? 'CANCELAR' : ''}
        />
      ) : null}
    </PhoneShell>
  )
}

function ExecutionPhone({ modalTitle = '', success = false }) {
  return (
    <PhoneShell className="aponta-screen-dark">
      <PhoneHeader title="Nro OP: 2625" compact />
      <div className="aponta-mini-toolbar">
        <span className="active">Execução</span>
        <span>Apontamentos</span>
        <span>+</span>
      </div>
      <div className="aponta-stage-card">
        <small>APONTAMENTO CHAPAS</small>
        <p>Produto: CHAPA PP C/MBT B/N CS 400 X 700 MM</p>
        <p>Nro. Lote: 6558-1</p>
        <p>Qtd. a Produzir: 5000 KG</p>
      </div>
      <div className="aponta-action-row">
        <button className="aponta-round-action">
          <FiPauseCircle />
          <span>Pausar</span>
        </button>
        <button className="aponta-round-action">
          <FiCheckCircle />
          <span>Finalizar atividade</span>
        </button>
      </div>
      <div className="aponta-history-card">
        <div className="aponta-history-head">Execuções</div>
        {executionEntries.map((entry) => (
          <div key={entry.type} className="aponta-history-row">
            <span className={`dot ${entry.tone}`} />
            <div>
              <strong>{entry.type}</strong>
              <small>{entry.startedAt}</small>
              <small>{entry.endedAt}</small>
            </div>
          </div>
        ))}
      </div>
      {modalTitle ? (
        <ModalCard title={modalTitle} confirmLabel="OK" confirmTone={success ? 'success' : 'success'} compact />
      ) : null}
    </PhoneShell>
  )
}

function ReasonsPhone({ title, reasons, modalTitle = '', quantityMode = false }) {
  return (
    <PhoneShell className="aponta-screen-dark">
      <PhoneHeader title="Nro OP: 2625" compact />
      <div className="aponta-mini-toolbar">
        <span>Execução</span>
        <span className="active">{title}</span>
        <span>+</span>
      </div>
      <div className="aponta-reasons-card">
        <div className="aponta-reasons-head">{title}</div>
        {reasons.map((reason, index) => (
          <div key={reason} className="aponta-reason-row">
            <strong>{index + 1}</strong>
            <span>{reason}</span>
          </div>
        ))}
      </div>
      {quantityMode ? (
        <div className="aponta-modal compact">
          <div className="aponta-modal-body form">
            <strong>Informe as quantidades</strong>
            <div className="aponta-mini-form">
              <input value="100" readOnly />
              <input value="0" readOnly />
              <input value="1" readOnly />
            </div>
            <div className="aponta-modal-actions">
              <button className="aponta-btn danger">Cancelar</button>
              <button className="aponta-btn success">Salvar</button>
            </div>
          </div>
        </div>
      ) : null}
      {modalTitle ? <ModalCard title={modalTitle} confirmLabel="OK" compact /> : null}
    </PhoneShell>
  )
}

function PointingPhone({ modalTitle = '', confirmButton = 'Inserir Novo Apontamento', mode = 'produtos' }) {
  const items = mode === 'produtos' ? finishedProducts : rawMaterials
  const secondary = mode === 'produtos' ? rawMaterials : finishedProducts

  return (
    <PhoneShell className="aponta-screen-dark">
      <PhoneHeader title="Nro OP: 2625" compact />
      <div className="aponta-mini-toolbar">
        <span>Apontamentos</span>
        <span className="active">{mode === 'produtos' ? 'Produtos Acabados' : 'Matérias Primas'}</span>
        <span>+</span>
      </div>
      <div className="aponta-products-stack">
        <div className="aponta-products-block">
          <div className="aponta-products-head">{mode === 'produtos' ? 'Produtos Acabados' : 'Matérias Primas'}</div>
          {items.map((item) => (
            <div key={item.code} className="aponta-product-row">
              <div>
                <strong>{item.description}</strong>
                <small>Código: {item.code}</small>
              </div>
              <span>{item.qty}</span>
            </div>
          ))}
        </div>
        <div className="aponta-products-block">
          <div className="aponta-products-head">{mode === 'produtos' ? 'Matérias Primas' : 'Produtos Acabados'}</div>
          {secondary.slice(0, 2).map((item) => (
            <div key={item.code} className="aponta-product-row compact">
              <div>
                <strong>{item.description}</strong>
                <small>{item.code}</small>
              </div>
              <span>{item.qty}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="aponta-bottom-button">
        <FiPlayCircle />
        {confirmButton}
      </button>
      {modalTitle ? <ModalCard title={modalTitle} confirmLabel="OK" compact /> : null}
    </PhoneShell>
  )
}

function ConfirmPhone({ modalTitle = '' }) {
  return (
    <PhoneShell className="aponta-screen-dark">
      <PhoneHeader title="Nro OP: 2625" compact />
      <div className="aponta-mini-toolbar">
        <span>Execução</span>
        <span>Apontamentos</span>
        <span className="active">Confirmar</span>
      </div>
      <div className="aponta-stage-card">
        <small>APONTAMENTO CHAPAS</small>
        <p>Produto: CHAPA PP C/MBT B/N CS 400 X 700 MM</p>
        <p>Nro. Lote: 6558-1</p>
        <p>Qtd. a Produzir: 5000 KG</p>
      </div>
      <div className="aponta-history-card">
        <div className="aponta-history-head">Execuções</div>
        {executionEntries.map((entry) => (
          <div key={entry.type} className="aponta-history-row">
            <span className={`dot ${entry.tone}`} />
            <div>
              <strong>{entry.type}</strong>
              <small>{entry.startedAt}</small>
            </div>
          </div>
        ))}
      </div>
      <button className="aponta-bottom-button secondary">
        <FiCheckSquare />
        Confirmar Apontamento
      </button>
      {modalTitle ? <ModalCard title={modalTitle} confirmLabel="OK" compact /> : null}
    </PhoneShell>
  )
}

function ProductionTracking() {
  const [activeChip, setActiveChip] = useState('acesso')

  const jumpToSection = (chipId) => {
    startTransition(() => {
      setActiveChip(chipId)
    })
    const element = document.getElementById(`aponta-${chipId}`)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="aponta-page animate-in">
      <section className="aponta-hero-panel">
        <div className="aponta-hero-copy">
          <span className="aponta-kicker">App mobile</span>
          <h2>Apontamento de Produção</h2>
          <p>
            As telas abaixo seguem a sequência visual do PDF: login, fila de OPs, execução, paradas,
            perdas, apontamento de produtos acabados, consumo de matéria-prima, confirmação e finalização.
          </p>
        </div>
        <div className="aponta-chip-row">
          {sectionChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`aponta-chip ${activeChip === chip.id ? 'active' : ''}`}
              onClick={() => jumpToSection(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      <section id="aponta-acesso" className="aponta-section">
        <div className="aponta-section-header">
          <div>
            <small>Módulo 01</small>
            <h3>Acesso e inicialização da OP</h3>
          </div>
          <span className="tag ok">PDF validado</span>
        </div>
        <div className="aponta-phone-grid">
          <LoginPhone />
          <QueuePhone modalTitle="Realizar a inicialização da OP?" />
          <QueuePhone modalTitle="Ordem de Produção Inicializada com sucesso!" />
        </div>
      </section>

      <section id="aponta-execucao" className="aponta-section">
        <div className="aponta-section-header">
          <div>
            <small>Módulo 02</small>
            <h3>Execução da atividade</h3>
          </div>
          <span className="tag info">Em andamento</span>
        </div>
        <div className="aponta-phone-grid">
          <ExecutionPhone />
          <ExecutionPhone modalTitle="Inicializada a atividade com sucesso!" success />
        </div>
      </section>

      <section id="aponta-paradas" className="aponta-section">
        <div className="aponta-section-header">
          <div>
            <small>Módulo 03</small>
            <h3>Paradas e perdas</h3>
          </div>
          <span className="tag warning">Operacional</span>
        </div>
        <div className="aponta-phone-grid">
          <ReasonsPhone title="Motivos de Paradas" reasons={pauseReasons} modalTitle="Ordem de Produção parada com sucesso!" />
          <ReasonsPhone title="Motivos de Perdas" reasons={lossReasons} quantityMode />
          <ReasonsPhone title="Motivos de Perdas" reasons={lossReasons} modalTitle="Registrado quantidade de PA e registrada perda." />
        </div>
      </section>

      <section id="aponta-apontamento" className="aponta-section">
        <div className="aponta-section-header">
          <div>
            <small>Módulo 04</small>
            <h3>Apontamento de PA e matéria-prima</h3>
          </div>
          <span className="tag ok">Pronto para integração</span>
        </div>
        <div className="aponta-phone-grid">
          <PointingPhone confirmButton="Inserir Novo Apontamento" mode="produtos" modalTitle="Apontamento criado!" />
          <PointingPhone confirmButton="Inserir Novo MP" mode="materias" />
          <ConfirmPhone modalTitle="Apontamento Confirmado" />
        </div>
      </section>

      <section id="aponta-finalizacao" className="aponta-section">
        <div className="aponta-section-header">
          <div>
            <small>Módulo 05</small>
            <h3>Finalização da atividade</h3>
          </div>
          <span className="tag high">Fechamento</span>
        </div>
        <div className="aponta-phone-grid">
          <ExecutionPhone modalTitle="Finalizado a Atividade!" success />
          <ExecutionPhone modalTitle="Atividade Finalizada com sucesso!" success />
        </div>
      </section>

      <section className="aponta-notes-grid">
        <div className="glass-panel">
          <div className="panel-header">
            <h3>Fluxos cobertos</h3>
          </div>
          <div className="aponta-note-list">
            <div><FiUser /><span>Login do operador e acesso restrito</span></div>
            <div><FiClock /><span>Lista de OPs e inicialização controlada</span></div>
            <div><FiPauseCircle /><span>Paradas, motivos e retomadas</span></div>
            <div><FiAlertCircle /><span>Perdas com quantidades registradas</span></div>
            <div><FiBox /><span>Produtos acabados e matérias-primas</span></div>
            <div><FiActivity /><span>Confirmação do apontamento e encerramento</span></div>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <h3>Próxima integração</h3>
          </div>
          <p className="aponta-next-copy">
            A próxima camada é ligar cada uma dessas telas ao Sankhya para puxar OPs reais, registrar
            paradas, perdas, quantidades e finalizar a atividade sem sair do app.
          </p>
        </div>
      </section>
    </div>
  )
}

export default ProductionTracking
