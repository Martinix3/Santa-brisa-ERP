'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from 'react';
// no icon imports; using plain text labels per design
import type { Task } from '@/domain/projects-tasks-unified';
import { createTask, updateTask } from '@/server/actions/workhub.actions';

interface TaskEditDrawerProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  onSuccess?: () => void;
}

export function TaskEditDrawer({ open, onClose, task, onSuccess }: TaskEditDrawerProps) {
  type DepartmentOption = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL' | 'OPS';
  type PriorityOption = 'P0' | 'P1' | 'P2' | 'P3';
  type StatusOption = 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'REVIEW' | 'DONE' | 'CANCELLED';
  type FormState = {
    title: string;
    description: string;
    priority: PriorityOption;
    status: StatusOption;
    dueAt: string;
    assignedToId: string;
    accountId: string;
    projectId: string;
    department: DepartmentOption;
  };

  const [formData, setFormData] = useState<FormState>({
    title: '',
    description: '',
    priority: 'P2',
    status: 'BACKLOG',
    dueAt: '',
    assignedToId: 'demo-user',
    accountId: '',
    projectId: '',
    department: 'VENTAS',
  });
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        dueAt: task.dueAt || '',
        assignedToId: task.assignedToId || 'demo-user',
        accountId: task.accountId || '',
        projectId: task.projectId || '',
        department: 'VENTAS',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'P2',
        status: 'BACKLOG',
        dueAt: '',
        assignedToId: 'demo-user',
        accountId: '',
        projectId: '',
        department: 'VENTAS',
      });
    }
  }, [task, open]);

  // Cargar proyectos para selector
  useEffect(() => {
    let mounted = true;
    import('@/server/actions/workhub.actions').then(async (m) => {
      const res = await m.listProjects({ archived: false });
      if (mounted && res.success) {
        setProjects(res.data.map(p => ({ id: p.id, title: p.title })));
      }
    });
    return () => { mounted = false; };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const result = task
        ? await updateTask(task.id, formData, 'demo-user')
        : await createTask(formData);

      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || 'Error al guardar tarea');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="sb-drawer sb-drawer--medium">
      <header className="sb-drawer__header">
        <h3 className="text-xl font-semibold">{task ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
        <button onClick={onClose} className="sb-btn sb-btn--ghost" aria-label="Cerrar">✕</button>
      </header>

      <form id="task-edit-form" onSubmit={handleSubmit} className="sb-drawer__body space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <div>
          <div className="text-xs opacity-70 mb-1">Título</div>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="sb-input"
            required
          />
        </div>

        <div>
          <div className="text-xs opacity-70 mb-1">Descripción</div>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="sb-input min-h-[100px]"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs opacity-70 mb-1">Asignado a</div>
            <input
              type="text"
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
              className="sb-input"
              placeholder="userId"
            />
          </div>
          <div>
            <div className="text-xs opacity-70 mb-1">Prioridad</div>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="sb-input"
            >
              <option value="P0">P0 - Crítica</option>
              <option value="P1">P1 - Alta</option>
              <option value="P2">P2 - Media</option>
              <option value="P3">P3 - Baja</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs opacity-70 mb-1">Estado</div>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="sb-input"
            >
              <option value="BACKLOG">Backlog</option>
              <option value="READY">Lista</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="BLOCKED">Bloqueada</option>
              <option value="REVIEW">En Revisión</option>
              <option value="DONE">Completada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
          <div>
            <div className="text-xs opacity-70 mb-1">Departamento</div>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
              className="sb-input"
            >
              <option value="VENTAS">Ventas</option>
              <option value="MARKETING">Marketing</option>
              <option value="PRODUCCION">Producción</option>
              <option value="ALMACEN">Almacén</option>
              <option value="FINANZAS">Finanzas</option>
              <option value="CALIDAD">Calidad</option>
              <option value="PERSONAL">Personal</option>
              <option value="OPS">Operaciones</option>
            </select>
          </div>
        </div>

        <div>
          <div className="text-xs opacity-70 mb-1">Proyecto</div>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="sb-input"
          >
            <option value="">Sin proyecto</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs opacity-70 mb-1">Fecha de vencimiento</div>
          <input
            type="datetime-local"
            value={formData.dueAt ? new Date(formData.dueAt).toISOString().slice(0, 16) : ''}
            onChange={(e) => setFormData({ ...formData, dueAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
            className="sb-input"
          />
        </div>
      </form>

      <footer className="sb-drawer__footer">
        <button type="button" onClick={onClose} className="sb-btn sb-btn--ghost">Cancelar</button>
        <button type="submit" form="task-edit-form" disabled={saving || !formData.title} className="sb-btn sb-btn--primary">
          {saving ? 'Guardando...' : task ? 'Actualizar' : 'Crear Tarea'}
        </button>
      </footer>
    </aside>
  );
}
