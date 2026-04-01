import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Dummy initial data to showcase the design
const initialData = {
  columns: {
    'col-1': { id: 'col-1', title: 'Sem Previsão (Pátio)', tone: 'missing', cardIds: ['rom-3'] },
    'col-2': { id: 'col-2', title: 'Hoje', tone: 'warning', cardIds: ['rom-1'] },
    'col-3': { id: 'col-3', title: 'Amanhã', tone: 'info', cardIds: ['rom-2'] }
  },
  columnOrder: ['col-1', 'col-2', 'col-3'],
  cards: {
    'rom-1': { id: 'rom-1', code: '556', empresa: 'Cliente Alpha', status: 'Crítico', tone: 'high', qty: '4,500' },
    'rom-2': { id: 'rom-2', code: '562', empresa: 'Cliente Beta', status: 'Programado', tone: 'info', qty: '2,100' },
    'rom-3': { id: 'rom-3', code: '588', empresa: 'Distribuidora X', status: 'Pendente', tone: 'missing', qty: '8,000' }
  }
};

function KanbanBoard() {
  const [data, setData] = useState(initialData);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    // Moving within same list
    if (start === finish) {
       const newCardIds = Array.from(start.cardIds);
       newCardIds.splice(source.index, 1);
       newCardIds.splice(destination.index, 0, draggableId);
       
       const newCol = { ...start, cardIds: newCardIds };
       setData({
           ...data,
           columns: { ...data.columns, [newCol.id]: newCol }
       });
       return;
    }

    // Moving to different list
    const startCardIds = Array.from(start.cardIds);
    startCardIds.splice(source.index, 1);
    const newStart = { ...start, cardIds: startCardIds };

    const finishCardIds = Array.from(finish.cardIds);
    finishCardIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, cardIds: finishCardIds };

    setData({
        ...data,
        columns: {
            ...data.columns,
            [newStart.id]: newStart,
            [newFinish.id]: newFinish
        }
    });

    // Send API update here in real logic
  };

  return (
    <div className="view-module animate-in w-full h-full flex flex-col" style={{ display: 'flex' }}>
       <div className="module-header" style={{ flexShrink: 0 }}>
          <div className="header-titles">
            <h2>Matriz Kanban de Romaneios</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Gerencie o fluxo logístico arrastando cards entre os estágios de preparo e expedição.
            </p>
          </div>
       </div>

       <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
             {data.columnOrder.map((colId) => {
                const column = data.columns[colId];
                const cards = column.cardIds.map((cId) => data.cards[cId]);

                return (
                   <div key={column.id} className="kanban-lane" style={{ borderColor: \`var(--status-\${column.tone})\` }}>
                      <div className="kanban-lane-header">
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{column.title}</h3>
                         </div>
                         <span className="kanban-lane-count">{cards.length} ROMS</span>
                      </div>
                      
                      <Droppable droppableId={column.id}>
                         {(provided, snapshot) => (
                             <div 
                                className="kanban-lane-body"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{ minHeight: '100px', backgroundColor: snapshot.isDraggingOver ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.2s' }}
                             >
                                {cards.map((card, index) => (
                                    <Draggable key={card.id} draggableId={card.id} index={index}>
                                        {(providedDraggable, snapshotDraggable) => (
                                            <div 
                                               ref={providedDraggable.innerRef}
                                               {...providedDraggable.draggableProps}
                                               {...providedDraggable.dragHandleProps}
                                               className="kanban-card"
                                               style={{
                                                  ...providedDraggable.draggableProps.style,
                                                  boxShadow: snapshotDraggable.isDragging ? '0 10px 30px rgba(0,0,0,0.8)' : 'none',
                                                  borderColor: snapshotDraggable.isDragging ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)'
                                               }}
                                            >
                                               <div className="k-card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                  <span className="k-sku" style={{ fontWeight: 'bold' }}>RM {card.code}</span>
                                                  <span className="k-qty" style={{ background: 'var(--status-info-bg)', color: 'var(--status-info)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{card.qty} un</span>
                                               </div>
                                               <div className="k-title" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>{card.empresa}</div>
                                               
                                               <div className="k-card-bottom" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                                                  <span className={`tag ${card.tone}`}>{card.status}</span>
                                               </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                             </div>
                         )}
                      </Droppable>
                   </div>
                );
             })}
          </div>
       </DragDropContext>
    </div>
  );
}

export default KanbanBoard;
