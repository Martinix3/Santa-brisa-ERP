// src/features/agenda/components/TaskList.tsx
"use client";
import React from 'react';
import type { Task } from '../hooks/useTasks';
import { Badge, SBButton } from '@/components/ui';
import { DEPT_META } from '@/domain/ssot';
import { Edit, Trash2, Check } from 'lucide-react';
import Link from 'next/link';

interface TaskRowProps {
    task: Task;
    onEdit: (task: Task) => void;
    onComplete: (task: Task) => void;
    onDelete: (id: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onEdit, onComplete, onDelete }) => {
    const deptMeta = task.dept ? DEPT_META[task.dept as keyof typeof DEPT_META] : null;
    
    const dueDate = task.dueAt ? new Date(task.dueAt + 'T00:00:00-06:00') : null; // Avoid timezone shifts
    const isOverdue = dueDate && dueDate < new Date() && task.status === 'open';

    return (
        <tr className={`border-b ${task.status === 'done' ? 'opacity-60 bg-secondary/50' : 'hover:bg-secondary'}`}>
            <td className="p-3">
                <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: deptMeta?.color || '#ccc' }}></span>
                    <div className="flex-grow">
                        <p className={`font-medium ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</p>
                        {task.tags && (
                            <div className="flex gap-1 mt-1">
                                {task.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className="p-3">
                {task.accountId && (
                    <Link href={`/accounts/${task.accountId}`} className="text-sm hover:underline">
                        {task.accountName || task.accountId}
                    </Link>
                )}
            </td>
            <td className="p-3">
                {deptMeta && <Badge variant="secondary" style={{ backgroundColor: deptMeta.color, color: deptMeta.textColor }}>{deptMeta.label}</Badge>}
            </td>
            <td className={`p-3 text-sm ${isOverdue ? 'text-destructive font-semibold' : ''}`}>
                {dueDate?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
            </td>
            <td className="p-3 text-xs uppercase">{task.source}</td>
            <td className="p-3">{task.assigneeName}</td>
            <td className="p-3 text-right">
                {task.status === 'open' && (
                    <SBButton variant="ghost" size="sm" onClick={() => onComplete(task)} title="Completar">
                        <Check size={16} />
                    </SBButton>
                )}
                <SBButton variant="ghost" size="sm" onClick={() => onEdit(task)} title="Editar">
                    <Edit size={16} />
                </SBButton>
                <SBButton variant="ghost" size="sm" onClick={() => onDelete(task.id)} title="Borrar" className="text-destructive hover:bg-destructive/10">
                    <Trash2 size={16} />
                </SBButton>
            </td>
        </tr>
    );
};


interface TaskListProps {
    tasks: Task[];
    onEdit: (task: Task) => void;
    onComplete: (task: Task) => void;
    onDelete: (id: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, ...actions }) => {
    if (tasks.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No hay tareas que coincidan con los filtros.</div>;
    }

    return (
        <table className="w-full text-sm">
            <thead className="text-left bg-secondary">
                <tr className="text-xs font-semibold uppercase text-muted-foreground">
                    <th className="p-3 w-2/5">Tarea</th>
                    <th className="p-3">Cuenta</th>
                    <th className="p-3">Dpto.</th>
                    <th className="p-3">Vence</th>
                    <th className="p-3">Origen</th>
                    <th className="p-3">Asignado</th>
                    <th className="p-3 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody>
                {tasks.map(task => <TaskRow key={task.id} task={task} {...actions} />)}
            </tbody>
        </table>
    );
};
