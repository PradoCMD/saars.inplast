import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Cockpit from './pages/Cockpit'
import KanbanBoard from './pages/KanbanBoard'
import FactorySimulator from './pages/FactorySimulator'

import './index.css'

function App() {
  const [activeView, setActiveView] = useState('cockpit')
  
  // Real App State
  const [data, setData] = useState({ loaded: false })

  const fetchAppData = async () => {
    try {
      const [
         overview, kanban, assembly, production
      ] = await Promise.all([
         fetch('/api/pcp/overview').then(res => res.json()).catch(() => ({})),
         fetch('/api/pcp/romaneios-kanban').then(res => res.json()).catch(() => ({ romaneios: [] })),
         fetch('/api/pcp/assembly').then(res => res.json()).catch(() => ({ items: [] })),
         fetch('/api/pcp/production').then(res => res.json()).catch(() => ({ items: [] }))
      ]);

      setData({
        loaded: true,
        overview,
        kanban,
        assembly,
        production
      });
    } catch (err) {
      console.error("Failed fetching app data:", err);
      setData({ loaded: true, error: true });
    }
  };

  useEffect(() => {
    fetchAppData();
    
    // Hash routing
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') || 'cockpit'
      setActiveView(hash)
    }
    window.addEventListener('hashchange', handleHash)
    handleHash()
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  return (
    <div className="app-container">
      <Sidebar activeView={activeView} />
      <main className="main-content">
        <Topbar activeView={activeView} />
        <div className="view-port">
          {activeView === 'cockpit' && <Cockpit data={data} />}
          {activeView === 'romaneios-kanban' && <KanbanBoard data={data} />}
          {activeView === 'montagem' && (
             <FactorySimulator 
                 title="Esteiras de Montagem (Simulação Horária)"
                 description="Grid interativo distribuindo cargas nas 2 esteiras do pavilhão."
                 numLanes={2}
                 type="assembly"
                 items={data.assembly?.items || []}
             />
          )}
          {activeView === 'producao' && (
             <FactorySimulator 
                 title="Extrusoras de Produção (Simulação Horária)"
                 description="Monitoramento e alocação de cargas operacionais nas 6 extrusoras principais."
                 numLanes={6}
                 type="production"
                 items={data.production?.items || []}
             />
          )}
          
          {/* Fallback for undeveloped pages in this demo */}
          {!['cockpit', 'romaneios-kanban', 'montagem', 'producao'].includes(activeView) && (
            <div className="glass-panel animate-in">
               <div className="panel-header">
                  <h3>Módulo {activeView}</h3>
               </div>
               <p style={{ color: 'var(--text-secondary)' }}>
                 Módulo em desenvolvimento estrutural para a interface React.
               </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
