// src/app/api/tasks/route.ts
import { NextResponse, type NextRequest } from 'next/server';

// Mock data - in a real app, this would come from a database query
const MOCK_TASKS = [
    { id: 'task_1', title: 'Seguimiento Propuesta Cliente A', dueAt: new Date(Date.now() - 2 * 86400000).toISOString(), priority: 1, dept: 'VENTAS', accountId: 'acc_1', status: 'open' },
    { id: 'task_2', title: 'Preparar material para feria', dueAt: new Date(Date.now() + 3 * 86400000).toISOString(), priority: 2, dept: 'MARKETING', status: 'open' },
    { id: 'task_3', title: 'Llamar a Proveedor B', dueAt: new Date().toISOString(), priority: 1, dept: 'PRODUCCION', status: 'open' },
    { id: 'task_4', title: 'Revisar inventario de etiquetas', dueAt: new Date(Date.now() + 1 * 86400000).toISOString(), priority: 0, dept: 'ALMACEN', status: 'open' },
    { id: 'task_5', title: 'Factura #INV-123 vencida', dueAt: new Date(Date.now() - 5 * 86400000).toISOString(), priority: 3, dept: 'FINANZAS', status: 'open' },
    { id: 'task_6', title: 'Planificar visita a Cliente C', dueAt: new Date(Date.now() + 5 * 86400000).toISOString(), priority: 1, dept: 'VENTAS', accountId: 'acc_2', status: 'open' },
    { id: 'task_7', title: 'Tarea completada de prueba', dueAt: new Date(Date.now() - 1 * 86400000).toISOString(), priority: 1, dept: 'VENTAS', accountId: 'acc_1', status: 'done' },
];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const filtersEcho = Object.fromEntries(searchParams.entries());

    // In a real implementation, you would use these filters to query your database.
    // For now, we just echo them back.

    // Mock aggregates
    const aggregates = {
        overdue: MOCK_TASKS.filter(t => new Date(t.dueAt) < new Date() && t.status === 'open').length,
        next: MOCK_TASKS.filter(t => new Date(t.dueAt) >= new Date() && t.status === 'open').length,
        byDay: {
            [new Date().toISOString().split('T')[0]]: Math.floor(Math.random() * 5),
            [new Date(Date.now() + 86400000).toISOString().split('T')[0]]: Math.floor(Math.random() * 5),
            [new Date(Date.now() - 86400000).toISOString().split('T')[0]]: Math.floor(Math.random() * 5),
        }
    };

    const response = {
        tasks: MOCK_TASKS,
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
