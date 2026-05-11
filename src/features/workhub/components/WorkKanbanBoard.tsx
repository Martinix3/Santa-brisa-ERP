'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import type { WorkItem } from '@/domain/workitem';
import { normalizeTs } from '@/lib/dates';

type KanbanStatus = WorkItem['status'];

type ColumnMap = Record<KanbanStatus, WorkItem[]>;

const COLUMNS: {
  key: KanbanStatus;
  label: string;
  accentClass: string;
  description: string;
}[] = [
  {
    key: 'BACKLOG',
    label: 'Backlog',
    accentClass: 'before:bg-[--sb-yellow]/30',
    description: 'Ideas y trabajo pendiente por priorizar',
  },
  {
    key: 'IN_PROGRESS',
    label: 'En curso',
    accentClass: 'before:bg-[--sb-aqua]/40',
    description: 'Trabajo activo o en revisión',
  },
  {
    key: 'DONE',
    label: 'Completado',
    accentClass: 'before:bg-[--sb-green]/40',
    description: 'Entregas cerradas y verificadas',
  },
];

export interface WorkKanbanBoardProps {
  items: WorkItem[];
  onMove?: (payload: {
    itemId: string;
    from: KanbanStatus;
    to: KanbanStatus;
  }) => Promise<void> | void;
  onItemClick?: (item: WorkItem) => void;
}

export function WorkKanbanBoard({ items, onMove, onItemClick }: WorkKanbanBoardProps) {
  const initialColumns = React.useMemo<ColumnMap>(() => {
    const initial: ColumnMap = {
      BACKLOG: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const item of items) {
      const key = item.status ?? 'BACKLOG';
      initial[key].push(item);
    }
    return initial;
  }, [items]);

  const [columns, setColumns] = React.useState<ColumnMap>(initialColumns);

  React.useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const stats = React.useMemo(() => {
    return COLUMNS.map((column) => {
      const columnItems = columns[column.key];
      const overdue = columnItems.filter((item) => item.isOverdue).length;
      return {
        key: column.key,
        count: columnItems.length,
        overdue,
      };
    });
  }, [columns]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const from = source.droppableId as KanbanStatus;
    const to = destination.droppableId as KanbanStatus;

    if (from === to && source.index === destination.index) return;

    const currentColumns: ColumnMap = {
      BACKLOG: [...columns.BACKLOG],
      IN_PROGRESS: [...columns.IN_PROGRESS],
      DONE: [...columns.DONE],
    };

    const [moved] = currentColumns[from].splice(source.index, 1);
    if (!moved) return;

    moved.status = to;
    currentColumns[to].splice(destination.index, 0, moved);
    setColumns(currentColumns);

    try {
      await onMove?.({
        itemId: moved.id,
        from,
        to,
      });
    } catch (err) {
      console.error('Error updating kanban move, rolling back', err);
      setColumns(columns);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Tablero Kanban</h2>
          <p className="text-sm text-muted-foreground">
            Arrastra y suelta para priorizar tareas y proyectos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => {
            const column = COLUMNS.find((col) => col.key === stat.key)!;
            return (
              <div
                key={stat.key}
                className="sb-chip border border-border bg-background/60 shadow-sm"
              >
                <span className="font-medium">{column.label}</span>
                <span className="text-muted-foreground">
                  {stat.count} items{stat.overdue ? ` · ${stat.overdue} vencidas` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnItems = columns[column.key];

            return (
              <Droppable droppableId={column.key} key={column.key}>
                {(provided, snapshot) => (
                  <section
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`relative flex min-h-[400px] flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm transition-all before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-xl before:content-[''] ${column.accentClass} ${
                      snapshot.isDraggingOver
                        ? 'ring-2 ring-primary/30 before:bg-primary/60'
                        : ''
                    }`}
                  >
                    <header className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{column.label}</h3>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {columnItems.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {column.description}
                      </p>
                    </header>

                    {columnItems.length === 0 && (
                      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                        Arrastra un elemento aquí
                      </div>
                    )}

                    <div className="flex flex-1 flex-col gap-3">
                      {columnItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <article
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`group relative rounded-xl border border-border bg-background/90 p-4 shadow-sm transition-shadow hover:shadow-md ${
                                dragSnapshot.isDragging ? 'ring-2 ring-primary/40' : ''
                              }`}
                              style={{
                                ...dragProvided.draggableProps.style,
                              }}
                              onClick={() => onItemClick?.(item)}
                            >
                              <ItemCard item={item} />
                            </article>
                          )}
                        </Draggable>
                      ))}
                    </div>

                    {provided.placeholder}
                  </section>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

function ItemCard({ item }: { item: WorkItem }) {
  const dueDate = item.dueAt ? normalizeTs(item.dueAt) : undefined;
  const dueText =
    dueDate && !isNaN(dueDate.getTime())
      ? dueDate.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
        })
      : null;

  const metadataAccount = item.metadata?.accountName as string | undefined;
  const metadataOwner = item.metadata?.ownerName as string | undefined;
  const participants = Array.isArray(item.participants)
    ? item.participants.slice(0, 3)
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase text-muted-foreground">
              {item.type}
            </span>
            {item.priority && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.priority === 'high'
                    ? 'bg-destructive/10 text-destructive'
                    : item.priority === 'medium'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200'
                }`}
              >
                {item.priority === 'high'
                  ? 'Alta'
                  : item.priority === 'medium'
                    ? 'Media'
                    : 'Baja'}
              </span>
            )}
          </div>
          <h4 className="mt-1 text-base font-semibold leading-snug">{item.title}</h4>
          {item.desc && (
            <p className="text-sm text-muted-foreground line-clamp-2">{item.desc}</p>
          )}
        </div>

        {item.trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              item.trend === 'up'
                ? 'bg-emerald-500/10 text-emerald-500'
                : item.trend === 'down'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {item.trend === 'up' ? 'Mejorando' : item.trend === 'down' ? 'Riesgo' : 'Estable'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {metadataAccount && (
          <span className="rounded-md bg-muted px-2 py-0.5">{metadataAccount}</span>
        )}
        {metadataOwner && (
          <span className="rounded-md bg-muted px-2 py-0.5">Owner: {metadataOwner}</span>
        )}
        {dueText && (
          <span
            className={`rounded-md px-2 py-0.5 ${
              item.isOverdue
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}
          >
            vence {dueText}
          </span>
        )}
        {item.linkedAlerts && item.linkedAlerts.length > 0 && (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-300">
            {item.linkedAlerts.length} alertas
          </span>
        )}
      </div>

      {(participants.length > 0 || item.metadata?.effortHours) && (
        <div className="flex flex-wrap items-center gap-2">
          {participants.length > 0 && (
            <div className="flex items-center gap-1">
              {participants.map((participant) => (
                <span
                  key={participant}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {participant}
                </span>
              ))}
              {Array.isArray(item.participants) && item.participants.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{item.participants.length - 3}
                </span>
              )}
            </div>
          )}

          {item.metadata?.effortHours && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {item.metadata.effortHours} h estimadas
            </span>
          )}
        </div>
      )}
    </div>
  );
}
