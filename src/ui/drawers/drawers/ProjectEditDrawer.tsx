'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from 'react';
// no icon imports; using plain text labels per design
import type { Project } from '@/domain/projects-tasks-unified';
import { createProjectWithTasks, updateProject, getProjectById, addTasksToProject } from '@/server/actions/workhub.actions';

interface ProjectEditDrawerProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  projectId?: string;
  onSuccess?: () => void;
}

export function ProjectEditDrawer({ open, onClose, project, projectId, onSuccess }: ProjectEditDrawerProps) {
  type DepartmentOption = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL' | 'OPS';
  type PriorityOption = 'P0' | 'P1' | 'P2' | 'P3';
  type StatusOption = 'DRAFT' | 'ACTIVE' | 'HOLD' | 'COMPLETED' | 'CANCELED';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'P2' as PriorityOption,
    status: 'ACTIVE' as StatusOption,
    ownerId: 'demo-user',
    dueAt: '',
    department: 'VENTAS' as DepartmentOption,
  });
  const [taskDrafts, setTaskDrafts] = useState<Array<{ id: string; title: string; assignedToId: string; dueAt: string; priority: PriorityOption }>>([
    { id: 't-1', title: '', assignedToId: '', dueAt: '', priority: 'P2' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description || '',
        priority: project.priority,
        status: project.status,
        ownerId: project.ownerId,
        dueAt: project.dueAt || '',
        department: (project.department as DepartmentOption) || 'VENTAS',
      });
      setTaskDrafts([{ id: 't-1', title: '', assignedToId: '', dueAt: '', priority: 'P2' }]);
    } else {
      // Reset form and optionally hydrate from projectId
      const reset = () => {
        setFormData({
          title: '',
          description: '',
          priority: 'P2',
          status: 'ACTIVE',
          ownerId: 'demo-user',
          dueAt: '',
          department: 'VENTAS',
        });
        setTaskDrafts([{ id: 't-1', title: '', assignedToId: '', dueAt: '', priority: 'P2' }]);
      };
      reset();
      if (open && projectId) {
        getProjectById(projectId).then((res) => {
          if (res.success && res.data) {
            setFormData({
              title: res.data.title,
              description: res.data.description || '',
              priority: res.data.priority,
              status: res.data.status,
              ownerId: res.data.ownerId,
              dueAt: res.data.dueAt || '',
              department: (res.data.department as DepartmentOption) || 'VENTAS',
            });
          }
        });
      }
    }
  }, [project, projectId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      let result;
      if (project) {
        result = await updateProject(project.id, formData);
      } else {
        const tasksPayload = taskDrafts
          .filter((t) => t.title && (t.assignedToId || formData.ownerId))
          .map((t) => ({
            title: t.title,
            assignedToId: t.assignedToId || formData.ownerId,
            dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : undefined,
            priority: t.priority as any,
            status: 'BACKLOG' as any,
            department: formData.department as any,
          }));
        result = await createProjectWithTasks(formData as any, tasksPayload as any);
      }

      if (result.success) {
        // If editing and there are task drafts, add them to the project
        if (project && taskDrafts.some((t) => t.title)) {
          const tasksPayload = taskDrafts
            .filter((t) => t.title && (t.assignedToId || formData.ownerId))
            .map((t) => ({
              title: t.title,
              assignedToId: t.assignedToId || formData.ownerId,
              dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : undefined,
              priority: t.priority as any,
              status: 'BACKLOG' as any,
              department: formData.department as any,
            }));
          if (tasksPayload.length > 0) {
            await addTasksToProject(project.id, tasksPayload as any);
          }
        }
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || 'Error al guardar proyecto');
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
        <h3 className="text-xl font-semibold">{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
        <button onClick={onClose} className="sb-btn sb-btn--ghost" aria-label="Cerrar">✕</button>
      </header>

      <form id="project-edit-form" onSubmit={handleSubmit} className="sb-drawer__body space-y-6">
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
          <div>
            <div className="text-xs opacity-70 mb-1">Estado</div>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="sb-input"
            >
              <option value="DRAFT">Borrador</option>
              <option value="ACTIVE">Activo</option>
              <option value="HOLD">En Pausa</option>
              <option value="COMPLETED">Completado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
        </div>

        <div>
          <div className="text-xs opacity-70 mb-1">Fecha de vencimiento</div>
          <input
            type="date"
            value={formData.dueAt ? new Date(formData.dueAt).toISOString().slice(0, 10) : ''}
            onChange={(e) => setFormData({ ...formData, dueAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
            className="sb-input"
          />
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

        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Tareas del proyecto</h4>
          <div className="space-y-2">
            {taskDrafts.map((t, idx) => (
              <div key={t.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <div className="text-xs opacity-70 mb-1">Título</div>
                  <input className="sb-input" value={t.title} onChange={(e) => {
                    const v = e.currentTarget.value; setTaskDrafts(prev => prev.map(td => td.id===t.id?{...td,title:v}:td));
                  }} />
                </div>
                <div className="col-span-3">
                  <div className="text-xs opacity-70 mb-1">Asignado a</div>
                  <input className="sb-input" value={t.assignedToId} placeholder="userId"
                    onChange={(e) => {
                      const v = e.currentTarget.value; setTaskDrafts(prev => prev.map(td => td.id===t.id?{...td,assignedToId:v}:td));
                    }} />
                </div>
                <div className="col-span-3">
                  <div className="text-xs opacity-70 mb-1">Vencimiento</div>
                  <input type="datetime-local" className="sb-input" value={t.dueAt}
                    onChange={(e) => {
                      const v = e.currentTarget.value; setTaskDrafts(prev => prev.map(td => td.id===t.id?{...td,dueAt:v}:td));
                    }} />
                </div>
                <div className="col-span-1">
                  <div className="text-xs opacity-70 mb-1">Pri.</div>
                  <select className="sb-input" value={t.priority}
                    onChange={(e) => {
                      const v = e.currentTarget.value as PriorityOption; setTaskDrafts(prev => prev.map(td => td.id===t.id?{...td,priority:v}:td));
                    }}>
                    <option value="P0">P0</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>
                </div>
                <div className="col-span-12 flex gap-2">
                  <button type="button" className="sb-btn sb-btn--ghost"
                    onClick={() => setTaskDrafts(prev => prev.filter(td => td.id !== t.id))}
                    disabled={taskDrafts.length <= 1}
                  >Quitar</button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <button type="button" className="sb-btn sb-btn--secondary"
              onClick={() => setTaskDrafts(prev => [...prev, { id: `t-${prev.length+1}`, title: '', assignedToId: '', dueAt: '', priority: 'P2' }])}
            >Añadir tarea</button>
          </div>
        </section>
      </form>

      <footer className="sb-drawer__footer">
        <button type="button" onClick={onClose} className="sb-btn sb-btn--ghost">Cancelar</button>
        <button type="submit" form="project-edit-form" disabled={saving || !formData.title} className="sb-btn sb-btn--primary">
          {saving ? 'Guardando...' : project ? 'Actualizar' : 'Crear Proyecto'}
        </button>
      </footer>
    </aside>
  );
}
