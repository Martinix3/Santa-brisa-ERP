/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/pipeline/PipelineBoard.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useDrawer } from '@/ui/drawers/drawer-registry';
import { Bell, TrendingDown, Target } from 'lucide-react';
import type { PipelineItem, StageKey } from './types';

const STAGES: { key: StageKey; label: string; kpi?: string }[] = [
  { key: 'POTENCIAL', label: 'Potencial' },
  { key: 'SEGUIMIENTO', label: 'Seguimiento' },
  { key: 'ACTIVA', label: 'Activa' },
  { key: 'FALLIDA', label: 'Fallida' },
];

type Columns = Record<StageKey, PipelineItem[]>;

export function PipelineBoard({
  items,
  onMove,
  title = 'Pipeline',
}: {
  items: PipelineItem[];
  onMove?: (id: string, from: StageKey, to: StageKey) => void | Promise<void>;
  title?: string;
}) {
  const { open } = useDrawer();

  // 1) Estado local por columnas (necesario para que se vea el movimiento)
  const initialCols = React.useMemo<Columns>(() => {
    const m: Columns = { POTENCIAL: [], SEGUIMIENTO: [], ACTIVA: [], FALLIDA: [] };
    for (const it of items) m[it.stage].push(it);
    return m;
  }, [items]);

  const [columns, setColumns] = React.useState<Columns>(initialCols);
  // Si cambian los items desde fuera, sincroniza (p. ej., por refetch)
  React.useEffect(() => setColumns(initialCols), [initialCols]);

  // 2) KPIs calculados sobre el estado local
  const stageKpis = React.useMemo(() => {
    const k: Record<StageKey, { total: string; count: number }> = {
      POTENCIAL: { total: '€ 0', count: 0 },
      SEGUIMIENTO: { total: '€ 0', count: 0 },
      ACTIVA: { total: '€ 0', count: 0 },
      FALLIDA: { total: '€ 0', count: 0 },
    };
    (Object.keys(columns) as StageKey[]).forEach((stage) => {
      const total = columns[stage].reduce((sum, c) => sum + (c.estValueEUR || 0), 0);
      k[stage] = { total: `€ ${total.toLocaleString('es-ES')}`, count: columns[stage].length };
    });
    return k;
  }, [columns]);

  // 3) Mover con validación: requiere interacción o pedido
  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const from = source.droppableId as StageKey;
    const to = destination.droppableId as StageKey;
    if (from === to && source.index === destination.index) return;

    const prev = columns;
    const [moved] = prev[from];
    if (!moved) return;

    // Validar movimiento y abrir drawer correspondiente
    if (to === 'SEGUIMIENTO') {
      // Requiere registrar interacción
      open('register-interaction', {
        accountId: moved.id,
        accountName: moved.name,
      });
      return; // No mover hasta que se registre
    }

    if (to === 'ACTIVA') {
      // Requiere registrar pedido
      open('quick-order', {
        accountId: moved.id,
        accountName: moved.name,
      });
      return; // No mover hasta que se registre
    }

    // Para otros movimientos (FALLIDA, etc.), permitir drag normal
    const next: Columns = {
      POTENCIAL: [...columns.POTENCIAL],
      SEGUIMIENTO: [...columns.SEGUIMIENTO],
      ACTIVA: [...columns.ACTIVA],
      FALLIDA: [...columns.FALLIDA],
    };

    next[from].splice(source.index, 1);
    moved.stage = to;
    next[to].splice(destination.index, 0, moved);

    setColumns(next);

    try {
      await onMove?.(moved.id, from, to);
    } catch (e) {
      console.error('onMove error → rollback', e);
      setColumns(prev);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 md:p-6 density-compact">
      <DragDropContext onDragEnd={onDragEnd}>
        {STAGES.map((stage) => {
          const cards = columns[stage.key];

          return (
            <Droppable
              droppableId={stage.key}
              key={stage.key}
              // renderClone mejora la visibilidad del item arrastrado
              renderClone={(provided, snapshot, rubric) => {
                const clone = cards[rubric.source.index];
                if (!clone) return null;
                return (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="opacity-90"
                  >
                    <OpportunityCard card={clone} stage={stage.key} onEdit={() => {}} />
                  </div>
                );
              }}
            >
              {(dropProvided, dropSnapshot) => (
                <section className="sb2-stage">
                  {/* Header */}
                  <header className="sb2-stage__head">
                    <div>
                      <div className="sb2-stage__title">{stage.label}</div>
                      <div className="sb2-stage__meta">
                        Total: <strong>{stageKpis[stage.key].total}</strong>
                      </div>
                    </div>
                    <span className="sb2-stage__count">{stageKpis[stage.key].count}</span>
                  </header>

                  {/* Drop zone */}
                  <div
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    className={`sb2-stage__drop min-h-40 ${
                      dropSnapshot.isDraggingOver
                        ? 'ring-2 ring-[--sb-aqua] bg-[--sb-aqua]/5'
                        : ''
                    }`}
                  >
                    {cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                              opacity: dragSnapshot.isDragging ? 0.6 : 1,
                              transform: dragSnapshot.isDragging
                                ? `${dragProvided.draggableProps.style?.transform ?? ''} rotate(0.5deg)`
                                : dragProvided.draggableProps.style?.transform,
                            }}
                          >
            <OpportunityCard
              card={card}
              stage={stage.key}
              onEdit={() => open('opportunity', { item: card })}
            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {dropProvided.placeholder}
                  </div>
                </section>
              )}
            </Droppable>
          );
        })}
      </DragDropContext>
    </div>
  );
}

// --- card ---
function OpportunityCard({
  card,
  stage,
  onEdit,
}: {
  card: PipelineItem;
  stage: StageKey;
  onEdit: () => void;
}) {
  const router = useRouter();
  
  const formattedDate = card.lastInteractionDate
    ? new Date(card.lastInteractionDate).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
      })
    : null;

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/accounts/${card.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  return (
    <article className={`sb2-card stage-${stage}`}>
      {card.isTarget && (
        <div className="absolute top-3 right-3">
          <Target className="w-4 h-4 text-[--sb-copper]" />
        </div>
      )}

      <div>
        <h4 
          className="sb2-card__title pr-6 cursor-pointer hover:text-[--sb-aqua] transition-colors"
          onClick={handleTitleClick}
        >
          {card.name}
        </h4>
        <p className="sb2-card__meta">
          {card.city && <span>{card.city}</span>}
          {card.city && formattedDate && <span> · </span>}
          {formattedDate && <span>Última: {formattedDate}</span>}
        </p>
      </div>

      {(card.hasAlerts || card.noConsumption) && (
        <div className="flex items-center gap-2">
          {card.hasAlerts && (
            <div title="Tiene alertas">
              <Bell className="w-3.5 h-3.5 text-[--sb-yellow]" />
            </div>
          )}
          {card.noConsumption && (
            <div title="Sin consumo">
              <TrendingDown className="w-3.5 h-3.5 text-[--destructive]" />
            </div>
          )}
        </div>
      )}

      <div className="sb2-actions">
        {card.posInstalled && (
          <span className="sb2-chip bg-[--sb-green]/10 text-[--sb-green] border-[--sb-green]/20">
            POS
          </span>
        )}
        {card.estValueEUR && (
          <span className="sb2-chip sb2-chip--amount">
            € {card.estValueEUR.toLocaleString('es-ES')}
          </span>
        )}
        <button
          className="sb2-btn col-span-2"
          onClick={handleEdit}
        >
          Editar
        </button>
      </div>
    </article>
  );
}
