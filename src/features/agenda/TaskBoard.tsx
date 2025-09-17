
// src/features/agenda/TaskBoard.tsx
"use client";
import React from 'react';
import { DndContext, useDraggable, useDroppable, closestCorners } from '@dnd-kit/core';
import type { Department } from '@/domain/ssot';

export type TaskStatus = 'PROGRAMADA' | 'EN_CURSO' | 'HECHA';
export type Task = {
  id: string;
  title: string;
  type: Department;
  status: TaskStatus;
  date?: string;
};

const STATUS_COLS: { id: TaskStatus, label: string }[] = [
    { id: 'PROGRAMADA', label: 'Programadas' },
    { id: 'EN_CURSO', label: 'En Curso' },
    { id: 'HECHA', label: 'Hechas' },
];

function TaskCard({ task, typeStyles }: { task: Task; typeStyles: any }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const typeStyle = typeStyles[task.type] || {};

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            {...listeners} 
            {...attributes}
            className="p-3 bg-white rounded-lg border shadow-sm cursor-grab"
        >
            <p className="font-medium text-sm text-zinc-800">{task.title}</p>
            <div className="mt-2 flex justify-between items-center">
                <span 
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: typeStyle.color, color: typeStyle.textColor }}
                >
                    {typeStyle.label}
                </span>
                {task.date && <span className="text-xs text-zinc-500">{new Date(task.date).toLocaleDateString('es-ES')}</span>}
            </div>
        </div>
    );
}

function StatusColumn({ status, tasks, typeStyles }: { status: TaskStatus, tasks: Task[], typeStyles: any }) {
    const { setNodeRef } = useDroppable({ id: status });

    return (
        <div ref={setNodeRef} className="bg-zinc-100/70 p-3 rounded-xl w-full">
            <h3 className="font-semibold text-zinc-700 px-1 mb-3">{STATUS_COLS.find(s=>s.id === status)?.label}</h3>
            <div className="space-y-3 min-h-[100px]">
                {tasks.map(task => <TaskCard key={task.id} task={task} typeStyles={typeStyles} />)}
            </div>
        </div>
    );
}


export function TaskBoard({ tasks, onTaskStatusChange, typeStyles }: { tasks: Task[], onTaskStatusChange: (id: string, newStatus: TaskStatus) => void, typeStyles: any }) {
    
    function handleDragEnd(event: any) {
        const { over, active } = event;
        if (over && active) {
            onTaskStatusChange(active.id, over.id);
        }
    }

    return (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STATUS_COLS.map(col => (
                    <StatusColumn
                        key={col.id}
                        status={col.id}
                        tasks={tasks.filter(t => t.status === col.id)}
                        typeStyles={typeStyles}
                    />
                ))}
            </div>
        </DndContext>
    );
}
