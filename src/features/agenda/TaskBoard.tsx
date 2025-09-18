// src/features/agenda/TaskBoard.tsx
"use client";
import React, { useMemo } from 'react';
import { DndContext, useDraggable, useDroppable, closestCorners } from '@dnd-kit/core';
import type { Department, InteractionStatus, User } from '@/domain/ssot';
import { Check, User as UserIcon, AlertCircle, Clock, Loader } from 'lucide-react';
import { useData } from '@/lib/dataprovider';

export type Task = {
  id: string;
  title: string;
  type: Department;
  status: InteractionStatus;
  date?: string;
  involvedUserIds?: string[];
  location?: string;
};

type ColumnId = 'overdue' | 'upcoming' | 'processing' | 'done';

const KANBAN_COLS: { id: ColumnId, label: string, icon: React.ElementType, headerColor: string }[] = [
    { id: 'overdue', label: 'Pendientes', icon: AlertCircle, headerColor: 'text-rose-600' },
    { id: 'upcoming', label: 'Programadas', icon: Clock, headerColor: 'text-cyan-600' },
    { id: 'processing', label: 'Procesando', icon: Loader, headerColor: 'text-amber-600' },
    { id: 'done', label: 'Hechas', icon: Check, headerColor: 'text-emerald-600' },
];

function Avatar({ name }: { name?: string }) {
    function stringToColor(seed: string) {
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
        const hue = h % 360;
        return `hsl(${hue} 40% 85%)`;
    }
    const initials = (name || '—')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(s => s[0]?.toUpperCase() || '')
        .join('');
    return (
        <div
        className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[9px] text-zinc-700 border"
        style={{ background: stringToColor(name || '-'), borderColor: '#e5e7eb' }}
        title={name}
        >
        {initials || '—'}
        </div>
    );
}

function TaskCard({ task, typeStyles, onComplete }: { task: Task; typeStyles: any, onComplete: (id: string) => void; }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
    const { data: santaData } = useData();
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const typeStyle = typeStyles[task.type] || {};

    const involvedUsers = (task.involvedUserIds || []).map(id => santaData?.users.find(u => u.id === id)).filter(Boolean) as User[];
    
    const isProcessing = task.status === 'processing';

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            {...listeners} 
            {...attributes}
            className={`p-3 bg-white rounded-lg border shadow-sm group ${isProcessing ? 'cursor-not-allowed' : 'cursor-grab'}`}
        >
            <p className={`font-medium text-sm text-zinc-800 ${isProcessing ? 'opacity-60' : ''}`}>{task.title}</p>
            {task.location && <p className={`text-xs text-zinc-500 mt-1 ${isProcessing ? 'opacity-60' : ''}`}>📍 {task.location}</p>}
            <div className="mt-2 flex justify-between items-center">
                <span 
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isProcessing ? 'opacity-60' : ''}`}
                    style={{ backgroundColor: typeStyle.color, color: typeStyle.textColor }}
                >
                    {typeStyle.label}
                </span>
                <div className={`flex items-center gap-2 ${isProcessing ? 'opacity-60' : ''}`}>
                    <div className="flex -space-x-2">
                        {involvedUsers.map(user => <Avatar key={user.id} name={user.name} />)}
                    </div>
                    {task.date && <span className="text-xs text-zinc-500">{new Date(task.date).toLocaleDateString('es-ES')}</span>}
                    {task.status === 'open' && (
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

function StatusColumn({ col, tasks, typeStyles, onCompleteTask }: { col: typeof KANBAN_COLS[0], tasks: Task[], typeStyles: any, onCompleteTask: (id: string) => void; }) {
    const { setNodeRef } = useDroppable({ id: col.id });

    return (
        <div ref={setNodeRef} className="bg-zinc-100/70 p-3 rounded-xl w-full">
            <h3 className={`flex items-center gap-2 font-semibold px-1 mb-3 ${col.headerColor}`}>
                <col.icon size={18} className={col.id === 'processing' ? 'animate-spin' : ''} />
                {col.label}
                <span className="text-sm font-normal text-zinc-500">{tasks.length}</span>
            </h3>
            <div className="space-y-3 min-h-[100px]">
                {tasks.map(task => <TaskCard key={task.id} task={task} typeStyles={typeStyles} onComplete={onCompleteTask} />)}
            </div>
        </div>
    );
}


export function TaskBoard({ tasks, onTaskStatusChange, onCompleteTask, typeStyles }: { tasks: Task[], onTaskStatusChange: (id: string, newStatus: InteractionStatus) => void, onCompleteTask: (id: string) => void; typeStyles: any }) {
    
    const categorizedTasks = useMemo(() => {
        const now = new Date();
        const openTasks = tasks.filter(t => t.status === 'open');
        const upcoming = openTasks.filter(t => t.date && new Date(t.date) >= now);
        const overdue = openTasks.filter(t => !t.date || new Date(t.date) < now);
        const processing = tasks.filter(t => t.status === 'processing');
        const done = tasks.filter(t => t.status === 'done');
        return { upcoming, overdue, processing, done };
    }, [tasks]);

    function handleDragEnd(event: any) {
        const { over, active } = event;
        if (over && active) {
            const taskId = active.id as string;
            const newColId = over.id as ColumnId;
            const task = tasks.find(t => t.id === taskId);
            
            if (!task || task.status === 'processing') return; // Cannot drag processing tasks

            if (newColId === 'done' && task.status !== 'done') {
                onTaskStatusChange(taskId, 'done');
            }
        }
    }

    return (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatusColumn
                    col={KANBAN_COLS[0]}
                    tasks={categorizedTasks.overdue}
                    typeStyles={typeStyles}
                    onCompleteTask={onCompleteTask}
                />
                <StatusColumn
                    col={KANBAN_COLS[1]}
                    tasks={categorizedTasks.upcoming}
                    typeStyles={typeStyles}
                    onCompleteTask={onCompleteTask}
                />
                 <StatusColumn
                    col={KANBAN_COLS[2]}
                    tasks={categorizedTasks.processing}
                    typeStyles={typeStyles}
                    onCompleteTask={onCompleteTask}
                />
                 <StatusColumn
                    col={KANBAN_COLS[3]}
                    tasks={categorizedTasks.done}
                    typeStyles={typeStyles}
                    onCompleteTask={onCompleteTask}
                />
            </div>
        </DndContext>
    );
}
