'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { 
  CampaignType, 
  GoalType, 
  GoalUnit,
  CampaignGoal,
  AssignmentStrategy 
} from '@/domain/campaigns';
import { createCampaign } from '@/server/actions/campaigns.actions';

interface CreateCampaignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCampaignDialog({ isOpen, onClose, onSuccess }: CreateCampaignDialogProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [type, setType] = useState<CampaignType>('PRODUCT_LAUNCH');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetStages, setTargetStages] = useState<string[]>(['ACTIVA']);
  const [goals, setGoals] = useState<CampaignGoal[]>([
    { type: 'VISITS', target: 50, unit: 'visits' }
  ]);
  const [taskTemplate, setTaskTemplate] = useState('Presentar nuevo producto a {{account.name}}');
  const [taskPriority, setTaskPriority] = useState<'low' | 'med' | 'high' | 'critical'>('med');
  const [taskDueInDays, setTaskDueInDays] = useState(7);
  const [assignmentStrategy, setAssignmentStrategy] = useState<AssignmentStrategy>('ACCOUNT_OWNER');
  
  if (!isOpen) return null;
  
  const handleAddGoal = () => {
    setGoals([...goals, { type: 'ORDERS', target: 10, unit: 'units' }]);
  };
  
  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };
  
  const handleUpdateGoal = (index: number, field: keyof CampaignGoal, value: any) => {
    setGoals(goals.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };
  
  const toggleStage = (stage: string) => {
    setTargetStages(prev => 
      prev.includes(stage) 
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };
  
  const handleSubmit = async () => {
    // Validación
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Las fechas son obligatorias');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('La fecha de fin debe ser posterior a la de inicio');
      return;
    }
    if (goals.length === 0) {
      toast.error('Debes añadir al menos un objetivo');
      return;
    }
    
    setSaving(true);
    try {
      const result = await createCampaign({
        type,
        name: name.trim(),
        description: description.trim() || undefined,
        status: 'DRAFT',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        targetStages,
        goals,
        actions: {
          createTasks: {
            template: taskTemplate,
            priority: taskPriority,
            dueInDays: taskDueInDays,
            assignmentStrategy,
          },
        },
        progress: [],
        createdBy: 'current-user', // TODO: Get from auth
      });
      
      if (result.ok) {
        toast.success('✅ Campaña creada');
        onSuccess();
        handleClose();
      } else {
        toast.error('Error: ' + result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleClose = () => {
    setStep(1);
    setType('PRODUCT_LAUNCH');
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setTargetStages(['ACTIVA']);
    setGoals([{ type: 'VISITS', target: 50, unit: 'visits' }]);
    setTaskTemplate('Presentar nuevo producto a {{account.name}}');
    setTaskPriority('med');
    setTaskDueInDays(7);
    setAssignmentStrategy('ACCOUNT_OWNER');
    onClose();
  };
  
  const canGoNext = () => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return startDate && endDate && new Date(startDate) < new Date(endDate);
      case 3:
        return targetStages.length > 0 && goals.length > 0;
      default:
        return true;
    }
  };
  
  return (
    <>
      {/* Overlay */}
      <div 
        className="sb-dialog__overlay fixed inset-0"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="sb-dialog-container">
        <div className="sb-dialog max-w-2xl w-full">
          {/* Accent bar */}
          <div className="sb-dialog__accent" />
          
          {/* Header */}
          <div className="sb-dialog__header">
            <div>
              <h3 className="sb-dialog__title">Nueva Campaña</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Paso {step} de 4
              </p>
            </div>
            <button
              onClick={handleClose}
              className="sb-btn sb-btn--sm sb-btn--ghost sb-btn--icon"
            >
              ✕
            </button>
          </div>
          
          {/* Progress */}
          <div className="px-6 py-2 border-b border-border">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(s => (
                <div 
                  key={s} 
                  className={`flex-1 h-1 rounded-full ${
                    s <= step ? 'bg-primary' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Body */}
          <div className="sb-dialog__body">
            {/* Step 1: Básicos */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="sb-label">Tipo de Campaña *</label>
                  <select 
                    className="sb-select"
                    value={type}
                    onChange={(e) => setType(e.target.value as CampaignType)}
                  >
                    <option value="PRODUCT_LAUNCH">🎉 Lanzamiento Producto</option>
                    <option value="SKU_PUSH">📦 Push SKU</option>
                    <option value="EVENT">🎪 Evento Temporal</option>
                    <option value="QUOTA_SPRINT">🎯 Sprint Cuotas</option>
                  </select>
                </div>
                
                <div>
                  <label className="sb-label">Nombre *</label>
                  <input 
                    type="text" 
                    className="sb-input" 
                    placeholder="Ej: Lanzamiento Turrón Supremo 2025"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="sb-label">Descripción</label>
                  <textarea 
                    className="sb-textarea" 
                    placeholder="Objetivo y detalles de la campaña..."
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Step 2: Fechas */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="sb-label">Fecha Inicio *</label>
                    <input 
                      type="date" 
                      className="sb-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="sb-label">Fecha Fin *</label>
                    <input 
                      type="date" 
                      className="sb-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                
                {startDate && endDate && (
                  <div className="text-sm text-muted-foreground">
                    Duración: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} días
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Targets & Goals */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="sb-label">Stages Objetivo *</label>
                  <div className="flex flex-wrap gap-2">
                    {['ACTIVA', 'POTENCIAL', 'SEGUIMIENTO', 'PROSPECTO'].map(stage => (
                      <button
                        key={stage}
                        onClick={() => toggleStage(stage)}
                        className={`sb-badge cursor-pointer transition-all ${
                          targetStages.includes(stage) 
                            ? 'sb-badge--primary' 
                            : ''
                        }`}
                      >
                        {targetStages.includes(stage) ? '✓ ' : ''}{stage}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="sb-label">Objetivos *</label>
                  <div className="space-y-2">
                    {goals.map((goal, i) => (
                      <div key={i} className="flex gap-2">
                        <select 
                          className="sb-select flex-1"
                          value={goal.type}
                          onChange={(e) => handleUpdateGoal(i, 'type', e.target.value)}
                        >
                          <option value="VISITS">Visitas</option>
                          <option value="ORDERS">Pedidos</option>
                          <option value="REVENUE">Revenue</option>
                          <option value="SKU_PLACEMENT">SKU Placement</option>
                        </select>
                        <input 
                          type="number" 
                          className="sb-input w-24"
                          placeholder="Target"
                          value={goal.target}
                          onChange={(e) => handleUpdateGoal(i, 'target', parseInt(e.target.value))}
                        />
                        <select 
                          className="sb-select w-24"
                          value={goal.unit}
                          onChange={(e) => handleUpdateGoal(i, 'unit', e.target.value)}
                        >
                          <option value="units">units</option>
                          <option value="EUR">EUR</option>
                          <option value="visits">visits</option>
                        </select>
                        {goals.length > 1 && (
                          <button
                            onClick={() => handleRemoveGoal(i)}
                            className="sb-btn sb-btn--sm sb-btn--ghost sb-btn--icon"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={handleAddGoal}
                      className="text-xs text-primary hover:underline"
                    >
                      + Añadir objetivo
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Actions */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="sb-label">Template de Tarea</label>
                  <input 
                    type="text" 
                    className="sb-input"
                    placeholder="Ej: Presentar {{product}} a {{account.name}}"
                    value={taskTemplate}
                    onChange={(e) => setTaskTemplate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variables: {`{{account.name}}`}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="sb-label">Prioridad</label>
                    <select 
                      className="sb-select"
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                    >
                      <option value="low">Baja</option>
                      <option value="med">Media</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="sb-label">Vencimiento (días)</label>
                    <input 
                      type="number" 
                      className="sb-input"
                      value={taskDueInDays}
                      onChange={(e) => setTaskDueInDays(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="sb-label">Estrategia de Asignación</label>
                  <select 
                    className="sb-select"
                    value={assignmentStrategy}
                    onChange={(e) => setAssignmentStrategy(e.target.value as AssignmentStrategy)}
                  >
                    <option value="ACCOUNT_OWNER">Owner de cuenta</option>
                    <option value="ROUND_ROBIN">Round Robin</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="sb-dialog__footer">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="sb-btn sb-btn--ghost"
              >
                ← Anterior
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={handleClose}
              className="sb-btn sb-btn--ghost"
            >
              Cancelar
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext()}
                className="sb-btn sb-btn--primary"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !canGoNext()}
                className="sb-btn sb-btn--primary"
              >
                {saving ? 'Creando...' : '✓ Crear Campaña'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
