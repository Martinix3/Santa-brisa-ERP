
// src/features/agenda/TaskBoard.tsx
"use client";
import React from 'react';
import { DndContext, useDraggable, useDroppable, closestCorners } from '@dnd-kit/core';
import type { Department, InteractionStatus } from '@/domain/ssot';
import { Check } from 'lucide-react';

export type Task = {
  id: string;
  title: string;
  type: Department;
  status: InteractionStatus;
  date?: string;
};

const STATUS_COLS: { id: InteractionStatus, label: string }[] = [
    { id: 'open', label: 'Programadas' },
    { id: 'done', label: 'Hechas' },
];

function TaskCard({ task, typeStyles, onComplete }: { task: Task; typeStyles: any, onComplete: (id: string) => void; }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const typeStyle = typeStyles[task.type] || {};

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            {...listeners} 
            {...attributes}
            className="p-3 bg-white rounded-lg border shadow-sm cursor-grab group"
        >
            <p className="font-medium text-sm text-zinc-800">{task.title}</p>
            <div className="mt-2 flex justify-between items-center">
                <span 
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: typeStyle.color, color: typeStyle.textColor }}
                >
                    {typeStyle.label}
                </span>
                <div className="flex items-center gap-2">
                    {task.date && <span className="text-xs text-zinc-500">{new Date(task.date).toLocaleDateString('es-ES')}</span>}
                    {task.status !== 'done' && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
                            className="p-1 rounded-md text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-green-100 hover:text-green-600 transition-opacity"
                            title="Marcar como completada"
                        >
                            <Check size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusColumn({ status, tasks, typeStyles, onCompleteTask }: { status: InteractionStatus, tasks: Task[], typeStyles: any, onCompleteTask: (id: string) => void; }) {
    const { setNodeRef } = useDroppable({ id: status });

    return (
        <div ref={setNodeRef} className="bg-zinc-100/70 p-3 rounded-xl w-full">
            <h3 className="font-semibold text-zinc-700 px-1 mb-3">{STATUS_COLS.find(s=>s.id === status)?.label}</h3>
            <div className="space-y-3 min-h-[100px]">
                {tasks.map(task => <TaskCard key={task.id} task={task} typeStyles={typeStyles} onComplete={onCompleteTask} />)}
            </div>
        </div>
    );
}


export function TaskBoard({ tasks, onTaskStatusChange, onCompleteTask, typeStyles }: { tasks: Task[], onTaskStatusChange: (id: string, newStatus: InteractionStatus) => void, onCompleteTask: (id: string) => void; typeStyles: any }) {
    
    function handleDragEnd(event: any) {
        const { over, active } = event;
        if (over && active) {
            onTaskStatusChange(active.id, over.id);
        }
    }

    return (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STATUS_COLS.map(col => (
                    <StatusColumn
                        key={col.id}
                        status={col.id}
                        tasks={tasks.filter(t => t.status === col.id)}
                        typeStyles={typeStyles}
                        onCompleteTask={onCompleteTask}
                    />
                ))}
            </div>
        </DndContext>
    );
}
