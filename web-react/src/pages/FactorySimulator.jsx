import React, { useState, useEffect } from 'react';

const hours = Array.from({ length: 17 }, (_, i) => i + 6);
const totalMinutes = 17 * 60; // 06:00 to 23:00

const numberFormat = new Intl.NumberFormat('pt-BR');

const buildSimulationLanes = (items, numLanes, type) => {
  if (!items || !items.length) return [];
  
  const lanes = Array.from({ length: numLanes }, (_, i) => ({
      id: i,
      name: type === 'assembly' ? `Esteira M-${i+1}` : `Extrusora E-${i+1}`,
      machineStatus: 'Ativa',
      jobs: [],
      currentMinute: 0
  }));

  const sortedItems = [...items].sort((a,b) => (b.net_required || 0) - (a.net_required || 0));
  
  sortedItems.forEach(item => {
      const targetLane = lanes.reduce((prev, curr) => (prev.currentMinute < curr.currentMinute) ? prev : curr);
      const qty = item.net_required || 0;
      if (qty <= 0) return;
      
      const durationMinutes = Math.min(Math.round(qty * 0.2), totalMinutes - targetLane.currentMinute);
      if (durationMinutes > 0 && targetLane.currentMinute < totalMinutes) {
          targetLane.jobs.push({
              id: item.sku + '-' + Math.random().toString(36).substr(2, 5),
              startMin: targetLane.currentMinute,
              duration: durationMinutes,
              sku: item.sku,
              produto: item.produto || item.sku,
              qty: qty
          });
          targetLane.currentMinute += durationMinutes + 15; // Gap setup time
      }
  });

  return lanes;
};

function FactorySimulator({ title, description, numLanes, type, items }) {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
     setLanes(buildSimulationLanes(items || [], numLanes, type));
  }, [items, numLanes, type]);

  return (
    <div className="view-module animate-in w-full h-full flex flex-col" style={{ display: 'flex' }}>
       <div className="module-header" style={{ flexShrink: 0 }}>
          <div className="header-titles">
            <h2>{title}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
               {description} {lanes.length > 0 ? `Renderizando ${items?.length} ordens identificadas.` : 'Buscando do ERP...'}
            </p>
          </div>
       </div>

       <div className="factory-simulator" style={{ flex: 1, overflowX: 'auto' }}>
          <div className="timeline-ruler" style={{ 
             display: 'flex', 
             marginLeft: '120px', 
             borderBottom: '1px solid rgba(255,255,255,0.1)', 
             paddingBottom: '8px', 
             marginBottom: '16px' 
          }}>
             {hours.map(h => (
               <div key={h} className="time-slot" style={{ flex: 1, minWidth: '60px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                  {h.toString().padStart(2, '0')}:00
                  {/* Tick mark */}
                  <div style={{ position: 'absolute', bottom: '-8px', left: '50%', width: '1px', height: '4px', background: 'rgba(255,255,255,0.2)' }}></div>
               </div>
             ))}
          </div>

          <div className="machine-lanes" style={{ minWidth: (hours.length * 60) + 'px' }}>
             {lanes.map(lane => (
                 <div key={lane.id} className="machine-lane" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', minHeight: '60px' }}>
                    <div className="machine-label" style={{ width: '120px', flexShrink: 0, paddingRight: '16px', display: 'flex', flexDirection: 'column' }}>
                       <strong style={{ fontSize: '0.85rem' }}>{lane.name}</strong>
                       <span style={{ fontSize: '0.7rem', color: lane.machineStatus === 'Ativa' ? 'var(--status-ok)' : 'var(--status-warning)' }}>
                          {lane.machineStatus}
                       </span>
                    </div>
                    
                    <div className="machine-track" style={{ flex: 1, display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', height: '48px', position: 'relative', border: '1px dashed rgba(255,255,255,0.05)' }}>
                        {lane.jobs.map(job => {
                            const leftPct = (job.startMin / totalMinutes) * 100;
                            const widthPct = (job.duration / totalMinutes) * 100;
                            
                            return (
                               <div 
                                  key={job.id} 
                                  className="sim-block" 
                                  title={`SKU: ${job.sku}\nProduto: ${job.produto}\nQuantidade: ${numberFormat.format(job.qty)} un`}
                                  style={{ 
                                      position: 'absolute',
                                      left: `${leftPct}%`, 
                                      width: `${widthPct}%`,
                                      height: '100%',
                                      background: 'var(--bg-surface)',
                                      border: '1px solid var(--accent-primary)',
                                      borderLeft: '4px solid var(--accent-primary)',
                                      borderRadius: '4px',
                                      padding: '6px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'center',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                  }}
                                  onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scaleY(1.05)';
                                      e.currentTarget.style.zIndex = '10';
                                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scaleY(1)';
                                      e.currentTarget.style.zIndex = '1';
                                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
                                  }}
                               >
                                  <strong style={{ fontSize: '0.75rem' }}>{job.sku}</strong>
                                  <small style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{numberFormat.format(job.qty)} un</small>
                               </div>
                            );
                        })}
                    </div>
                 </div>
             ))}
             {!lanes.length && (
                <div style={{ color: 'var(--text-secondary)', padding: '24px 120px' }}>
                    Nenhuma carga disponível nesta rota de MRP no momento.
                </div>
             )}
          </div>
       </div>
    </div>
  );
}

export default FactorySimulator;
