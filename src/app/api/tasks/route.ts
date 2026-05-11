// src/app/api/tasks/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import type { Task } from '@/features/agenda/hooks/useTasks';

type Priority = 'low' | 'medium' | 'high';

// número → etiqueta
const toPriority = (p?: number | string): Priority => {
  if (typeof p === 'number') return p >= 3 ? 'high' : p === 2 ? 'medium' : 'low';
  return (p === 'high' || p === 'medium' || p === 'low') ? p : 'medium';
};

// mapea etiqueta → peso para ordenar
const prWeight = (p?: Priority): number => (p === 'high' ? 3 : p === 'medium' ? 2 : p === 'low' ? 1 : 0);

// Mock data - in a real app, this would come from a database query
const MOCK_TASKS: Task[] = [
    { id: 'task_1', title: 'Seguimiento Propuesta Cliente A', dueAt: new Date(Date.now() - 2 * 86400000).toISOString(), priority: toPriority(1), dept: 'VENTAS', accountId: 'acc_1', accountName: 'Cliente A', status: 'open', assigneeName: 'Carlos' },
    { id: 'task_2', title: 'Preparar material para feria', dueAt: new Date(Date.now() + 3 * 86400000).toISOString(), priority: toPriority(2), dept: 'MARKETING', status: 'open', assigneeName: 'Laura' },
    { id: 'task_3', title: 'Llamar a Proveedor B', dueAt: new Date().toISOString(), priority: toPriority(1), dept: 'PRODUCCION', status: 'open', assigneeName: 'Ana' },
    { id: 'task_4', title: 'Revisar inventario de etiquetas', dueAt: '', priority: toPriority(0), dept: 'ALMACEN', status: 'open', assigneeName: 'Carlos' },
    { id: 'task_5', title: 'Factura #INV-123 vencida', dueAt: new Date(Date.now() - 5 * 86400000).toISOString(), priority: toPriority(3), dept: 'FINANZAS', status: 'open', assigneeName: 'Laura' },
    { id: 'task_6', title: 'Planificar visita a Cliente C', dueAt: new Date(Date.now() + 5 * 86400000).toISOString(), priority: toPriority(1), dept: 'VENTAS', accountId: 'acc_2', accountName: 'Cliente C', status: 'open', assigneeName: 'Ana' },
    { id: 'task_7', title: 'Tarea completada de prueba', dueAt: new Date(Date.now() - 1 * 86400000).toISOString(), priority: toPriority(1), dept: 'VENTAS', accountId: 'acc_1', accountName: 'Cliente A', status: 'done', assigneeName: 'Carlos' },
];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const filtersEcho = Object.fromEntries(searchParams.entries());

    let filteredTasks = MOCK_TASKS;

    // Apply filters
    if (filtersEcho.q) {
        const q = filtersEcho.q.toLowerCase();
        filteredTasks = filteredTasks.filter(t => 
            t.title.toLowerCase().includes(q) || 
            (t.accountName && t.accountName.toLowerCase().includes(q))
        );
    }
    if (filtersEcho.dept) {
        filteredTasks = filteredTasks.filter(t => t.dept === filtersEcho.dept);
    }
    if (filtersEcho.status && filtersEcho.status !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.status === filtersEcho.status);
    }
    if (filtersEcho.hasAccount === 'true') {
        filteredTasks = filteredTasks.filter(t => !!t.accountId);
    }
    if (filtersEcho.hasAccount === 'false') {
        filteredTasks = filteredTasks.filter(t => !t.accountId);
    }
    // Simplistic 'mine' filter for demo
    if (searchParams.getAll('assignees[]').includes('user_1')) {
         filteredTasks = filteredTasks.filter(t => t.assigneeName === 'Carlos');
    }

    // Sorting
    filteredTasks.sort((a, b) => {
        const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
        const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
        if (aDue !== bDue) {
            return aDue - bDue; // dueAt ASC (nulls/empty last)
        }
        return prWeight(b.priority) - prWeight(a.priority); // then priority DESC
    });


    // Mock aggregates based on the filtered results
    const aggregates = {
        overdue: filteredTasks.filter(t => t.status === 'open' && t.dueAt && new Date(t.dueAt) < new Date()).length,
        next: filteredTasks.filter(t => t.status === 'open' && (!t.dueAt || new Date(t.dueAt) >= new Date())).length,
        byDay: {
            [new Date().toISOString().split('T')[0]]: Math.floor(Math.random() * 5),
            [new Date(Date.now() + 86400000).toISOString().split('T')[0]]: Math.floor(Math.random() * 5),
            [new Date(Date.now() - 86400000).toISOString().split('T')[0]]: Math.floor(Math.random() * 5),
        }
    };

    const response = {
        tasks: filteredTasks,
        aggregates,
        meta: {
            generatedAt: new Date().toISOString(),
            filtersEcho,
            nextCursor: null,
        }
    };
    
    // Simulate network delay
    await new Promise(res => setTimeout(res, 300));

    return NextResponse.json(response);
}
