import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiCalendar,
  FiCheckCircle,
  FiFileText,
  FiInbox,
  FiPackage,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
} from 'react-icons/fi'

import './RomaneiosInbox.css'

const MANUAL_KEY = 'pcp.react.romaneios.manual'
const PDF_KEY = 'pcp.react.romaneios.pdfqueue'

const emptyForm = {
  romaneio: '',
  empresa: 'INPLAST',
  cliente: '',
  nota: '',
  previsao: '',
  observacao: '',
}

function readLocalState(key) {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function inferRomaneioFromName(name) {
  const explicit = name.match(/RM[-_\s]?\d[\w-]*/i)
  if (explicit) return explicit[0].replace(/\s+/g, '-').toUpperCase()
  const digits = name.match(/\d{3,}/)
  return digits ? `RM-${digits[0]}` : ''
}

function formatDate(value) {
  if (!value) return 'Sem previsão'
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

function formatSize(bytes) {
  if (!bytes) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function RomaneiosInbox({ data }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [manualForm, setManualForm] = useState(emptyForm)
  const [manualEntries, setManualEntries] = useState([])
  const [pdfQueue, setPdfQueue] = useState([])

  useEffect(() => {
    setManualEntries(readLocalState(MANUAL_KEY))
    setPdfQueue(readLocalState(PDF_KEY))
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries))
    }
  }, [manualEntries])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PDF_KEY, JSON.stringify(pdfQueue))
    }
  }, [pdfQueue])

  const existingItems = data?.romaneios?.items || []

  const intakeItems = useMemo(() => {
    const manualMapped = manualEntries.map((entry) => ({
      id: entry.id,
      title: entry.romaneio || 'Romaneio manual',
      subtitle: entry.cliente || entry.empresa || 'Entrada manual',
      detail: entry.nota ? `Nota ${entry.nota}` : 'Sem nota vinculada',
      status: 'manual',
      addedAt: entry.addedAt,
    }))

    const pdfMapped = pdfQueue.map((entry) => ({
      id: entry.id,
      title: entry.romaneio || entry.fileName,
      subtitle: 'PDF recebido',
      detail: `${entry.fileName} • ${formatSize(entry.sizeBytes)}`,
      status: 'pdf',
      addedAt: entry.addedAt,
    }))

    return [...pdfMapped, ...manualMapped].sort((a, b) => {
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    })
  }, [manualEntries, pdfQueue])

  const addFilesToQueue = (files) => {
    const validFiles = Array.from(files || []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    if (!validFiles.length) return

    const nextItems = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      romaneio: inferRomaneioFromName(file.name),
      fileName: file.name,
      sizeBytes: file.size,
      status: 'aguardando_ingestao',
      addedAt: new Date().toISOString(),
    }))

    setPdfQueue((current) => [...nextItems, ...current])
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    addFilesToQueue(event.dataTransfer.files)
  }

  const handleManualSubmit = (event) => {
    event.preventDefault()
    if (!manualForm.romaneio.trim() && !manualForm.cliente.trim()) return

    const entry = {
      id: `${Date.now()}-manual`,
      ...manualForm,
      status: 'manual',
      addedAt: new Date().toISOString(),
    }

    setManualEntries((current) => [entry, ...current])
    setManualForm(emptyForm)
  }

  const removeManual = (id) => {
    setManualEntries((current) => current.filter((entry) => entry.id !== id))
  }

  const removePdf = (id) => {
    setPdfQueue((current) => current.filter((entry) => entry.id !== id))
  }

  return (
    <div className="romaneios-page animate-in">
      <section className="romaneios-hero">
        <div>
          <span className="romaneios-kicker">Entrada operacional</span>
          <h2>Inbox de Romaneios</h2>
          <p>
            Agora o módulo de romaneios aceita entrada manual e também arrastar e soltar PDFs.
            Os arquivos entram em fila para ingestão e os lançamentos manuais ficam separados para revisão.
          </p>
        </div>
        <div className="romaneios-hero-stats">
          <div>
            <small>Romaneios ativos</small>
            <strong>{existingItems.length}</strong>
          </div>
          <div>
            <small>Fila de PDFs</small>
            <strong>{pdfQueue.length}</strong>
          </div>
          <div>
            <small>Entradas manuais</small>
            <strong>{manualEntries.length}</strong>
          </div>
        </div>
      </section>

      <section className="romaneios-intake-grid">
        <div className="glass-panel">
          <div className="panel-header">
            <h3>Arraste e solte os PDFs</h3>
            <span className="tag info">PDF only</span>
          </div>

          <div
            className={`romaneios-dropzone ${dragActive ? 'active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <FiUploadCloud />
            <strong>Solte os PDFs do romaneio aqui</strong>
            <p>Também vale clicar para selecionar vários arquivos de uma vez.</p>
            <button type="button" className="romaneios-dropzone-button" onClick={() => inputRef.current?.click()}>
              Selecionar PDFs
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              hidden
              onChange={(event) => addFilesToQueue(event.target.files)}
            />
          </div>

          <div className="romaneios-queue-list">
            {pdfQueue.length ? pdfQueue.map((entry) => (
              <div key={entry.id} className="romaneios-queue-card">
                <div>
                  <strong>{entry.romaneio || entry.fileName}</strong>
                  <small>{entry.fileName}</small>
                  <span>{formatSize(entry.sizeBytes)} • adicionado {formatDate(entry.addedAt)}</span>
                </div>
                <button type="button" className="romaneios-icon-button" onClick={() => removePdf(entry.id)}>
                  <FiTrash2 />
                </button>
              </div>
            )) : (
              <div className="romaneios-empty-state">
                <FiInbox />
                <span>Nenhum PDF na fila por enquanto.</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <h3>Adicionar manualmente</h3>
            <span className="tag ok">Formulário rápido</span>
          </div>

          <form className="romaneios-manual-form" onSubmit={handleManualSubmit}>
            <label>
              <span>Romaneio</span>
              <input
                value={manualForm.romaneio}
                onChange={(event) => setManualForm((current) => ({ ...current, romaneio: event.target.value }))}
                placeholder="RM-240401-001"
              />
            </label>
            <label>
              <span>Empresa</span>
              <input
                value={manualForm.empresa}
                onChange={(event) => setManualForm((current) => ({ ...current, empresa: event.target.value }))}
                placeholder="INPLAST"
              />
            </label>
            <label>
              <span>Cliente</span>
              <input
                value={manualForm.cliente}
                onChange={(event) => setManualForm((current) => ({ ...current, cliente: event.target.value }))}
                placeholder="Cliente / destinatário"
              />
            </label>
            <label>
              <span>Nota / pedido</span>
              <input
                value={manualForm.nota}
                onChange={(event) => setManualForm((current) => ({ ...current, nota: event.target.value }))}
                placeholder="36508"
              />
            </label>
            <label>
              <span>Previsão</span>
              <input
                type="datetime-local"
                value={manualForm.previsao}
                onChange={(event) => setManualForm((current) => ({ ...current, previsao: event.target.value }))}
              />
            </label>
            <label className="full">
              <span>Observação</span>
              <textarea
                rows="4"
                value={manualForm.observacao}
                onChange={(event) => setManualForm((current) => ({ ...current, observacao: event.target.value }))}
                placeholder="Informações adicionais sobre o romaneio."
              />
            </label>
            <button type="submit" className="romaneios-submit-button">
              <FiPlus />
              Adicionar romaneio
            </button>
          </form>
        </div>
      </section>

      <section className="romaneios-lists-grid">
        <div className="glass-panel">
          <div className="panel-header">
            <h3>Romaneios já no sistema</h3>
            <span className="tag info">Backend</span>
          </div>

          <div className="romaneios-existing-list">
            {existingItems.map((item) => (
              <article key={item.romaneio} className="romaneios-existing-card">
                <div className="romaneios-existing-top">
                  <strong>{item.romaneio}</strong>
                  <span className={`tag ${item.previsao_saida_status === 'sem_previsao' ? 'missing' : 'ok'}`}>
                    {item.previsao_saida_status || 'sem status'}
                  </span>
                </div>
                <p>{item.empresa}</p>
                <div className="romaneios-existing-meta">
                  <span><FiPackage /> {item.itens} itens</span>
                  <span><FiCalendar /> {formatDate(item.previsao_saida_at)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <h3>Fila de entrada</h3>
            <span className="tag warning">Local</span>
          </div>

          <div className="romaneios-intake-list">
            {intakeItems.length ? intakeItems.map((item) => (
              <div key={item.id} className="romaneios-intake-card">
                <div className="romaneios-intake-icon">
                  {item.status === 'pdf' ? <FiFileText /> : <FiCheckCircle />}
                </div>
                <div className="romaneios-intake-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                  <span>{item.detail}</span>
                </div>
                {item.status === 'manual' ? (
                  <button type="button" className="romaneios-icon-button" onClick={() => removeManual(item.id)}>
                    <FiTrash2 />
                  </button>
                ) : null}
              </div>
            )) : (
              <div className="romaneios-empty-state">
                <FiInbox />
                <span>Nenhuma entrada manual ou PDF pendente.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default RomaneiosInbox
