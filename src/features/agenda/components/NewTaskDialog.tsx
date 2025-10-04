// src/features/agenda/components/NewTaskDialog.tsx
"use client";

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { Task, TaskFilters } from '../hooks/useTasks';
import { SBDialog, SBDialogContent, SBButton, Input, Select } from '@/components/ui';
import { useData } from '@/lib/dataprovider';
import type { Department } from '@/domain/ssot';

type FormData = {
  title: string;
  accountId?: string;
  dueAt?: string;
  dept?: Department;
  tags?: string;
  assigneeId?: string;
};

interface NewTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: Omit<Task, 'id' | 'status' | 'priority'>) => void;
}

export function NewTaskDialog({ open, onClose, onCreate }: NewTaskDialogProps) {
  const { data } = useData();
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<FormData>();

  React.useEffect(() => {
    if (open) {
      reset({ title: '', accountId: '', dueAt: '', dept: 'VENTAS', tags: '', assigneeId: '' });
    }
  }, [open, reset]);

  const onSubmit = (formData: FormData) => {
    console.info('[Telemetry] task_dialog_submitted', { variant: 'create', data: formData });
    const payload = {
        title: formData.title,
        dueAt: formData.dueAt || '',
        dept: formData.dept || 'VENTAS',
        tags: formData.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        assigneeId: formData.assigneeId,
        accountId: formData.accountId,
        accountName: data?.accounts.find(a => a.id === formData.accountId)?.name,
        source: 'MANUAL',
    };
    onCreate(payload as any);
    onClose();
  };

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent 
        title="Nueva Tarea" 
        onSubmit={handleSubmit(onSubmit)}
        primaryAction={{ label: 'Crear Tarea', type: 'submit' }}
        secondaryAction={{ label: 'Cancelar', onClick: onClose }}
        maxWidth="32rem"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="title">Título</label>
            <Input id="title" {...register('title', { required: 'El título es obligatorio' })} />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="accountId">Cuenta (opcional)</label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select {...field} id="accountId">
                    <option value="">-- Sin cuenta --</option>
                    {(data?.accounts || []).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </Select>
                )}
              />
            </div>
            <div>
              <label htmlFor="dept">Departamento</label>
              <Controller
                name="dept"
                control={control}
                defaultValue="VENTAS"
                render={({ field }) => (
                  <Select {...field} id="dept">
                    <option value="VENTAS">Ventas</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="PRODUCCION">Producción</option>
                    <option value="ALMACEN">Almacén</option>
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <label htmlFor="dueAt">Vencimiento (opcional)</label>
            <Input id="dueAt" type="date" {...register('dueAt')} />
          </div>
          
           <div>
            <label htmlFor="assigneeId">Asignado a (opcional)</label>
             <Controller
                name="assigneeId"
                control={control}
                render={({ field }) => (
                  <Select {...field} id="assigneeId">
                    <option value="">-- Sin asignar --</option>
                    {(data?.users || []).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </Select>
                )}
              />
          </div>

          <div>
            <label htmlFor="tags">Etiquetas (separadas por coma)</label>
            <Input id="tags" {...register('tags')} />
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
