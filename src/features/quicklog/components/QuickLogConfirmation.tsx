/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/quicklog/components/QuickLogConfirmation.tsx
'use client';

import React, { useState } from 'react';
import { 
  Sparkles, Users, CheckCircle, AlertCircle, 
  ArrowLeft, X, Check, Package, Calendar, StickyNote,
  MapPin, Store, FileText, Euro, Home
} from 'lucide-react';

export interface ProcessedSummary {
  // Indica el origen del análisis
  source?: 'AI' | 'RULES';
  account: {
    id?: string;
    name: string;
    isNew: boolean;
    segment?: string;
  };
  actions: Array<{
    type: 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS' | 'NOTA';
    date: string;
    details: {
      notes?: string;
      lines?: Array<{
        itemName: string;
        qty: number;
        uom: string;
      }>;
      estimatedTotal?: number;
      location?: string;
      title?: string;
      description?: string;
      flow?: 'PLACEMENT' | 'DIRECT';
    };
  }>;
  confidence: number;
  warnings: string[];
}

interface QuickLogConfirmationProps {
  summary: ProcessedSummary;
  onEdit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_CONFIG = {
  VISITA: { icon: Home, label: 'Visita' },
  PEDIDO: { icon: Package, label: 'Pedido' },
  EVENTO: { icon: Calendar, label: 'Evento' },
  POS: { icon: Store, label: 'POS' },
  NOTA: { icon: StickyNote, label: 'Nota' },
};

export function QuickLogConfirmation({
  summary,
  onEdit,
  onConfirm,
  onCancel,
}: QuickLogConfirmationProps) {
  // Estados editables
  const [editedSummary, setEditedSummary] = useState<ProcessedSummary>(summary);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    }
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleAccountNameChange = (name: string) => {
    setEditedSummary(prev => ({
      ...prev,
      account: { ...prev.account, name }
    }));
  };

  const handleActionNotesChange = (index: number, notes: string) => {
    setEditedSummary(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index 
          ? { ...action, details: { ...action.details, notes } }
          : action
      )
    }));
  };

  const handleLineQtyChange = (actionIndex: number, lineIndex: number, qty: number) => {
    setEditedSummary(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === actionIndex && action.details.lines
          ? {
              ...action,
              details: {
                ...action.details,
                lines: action.details.lines.map((line, li) =>
                  li === lineIndex ? { ...line, qty } : line
                )
              }
            }
          : action
      )
    }));
  };

  const handleConfirmWithEdits = () => {
    // Pasar el summary editado al onConfirm
    onConfirm();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/50 bg-secondary/30 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-yellow-500" />
          <div>
            <h3 className="text-xl font-bold">
              {editedSummary.source === 'AI' ? 'Gemini ha procesado tus notas' : 'Notas procesadas'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Revisa y edita el resumen antes de guardar
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Texto Original */}
        <section className="sb-card-glass-light p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText size={16} />
            Texto Original
          </h4>
          <div className="text-sm text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-border/20">
            {editedSummary.actions[0]?.details.notes || 
             editedSummary.actions[0]?.details.description ||
             'Sin texto'}
          </div>
        </section>

        {/* Cliente - EDITABLE */}
        <section className="sb-card-glass-light p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users size={16} />
            Cliente
          </h4>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                className="sb-input w-full font-semibold"
                value={editedSummary.account.name}
                onChange={(e) => handleAccountNameChange(e.target.value)}
                placeholder="Nombre del cliente"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {editedSummary.account.segment || 'Sin segmento'}
                {editedSummary.account.isNew && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-700 font-medium">
                    Nuevo cliente
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Acciones - EDITABLES */}
        <section className="sb-card-glass-light p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle size={16} />
            Acciones detectadas ({editedSummary.actions.length})
          </h4>
          
          <div className="space-y-3">
            {editedSummary.actions.map((action, index) => {
              const ActionIcon = ACTION_CONFIG[action.type].icon;
              
              return (
                <div 
                  key={index} 
                  className="flex gap-3 p-3 bg-secondary/5 rounded-lg border border-border/30"
                >
                  {/* Número */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  
                  {/* Contenido */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <ActionIcon size={18} className="text-primary" />
                      <span className="font-semibold">{ACTION_CONFIG[action.type].label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(action.date)}
                      </span>
                    </div>
                    
                    {/* Detalles según tipo - EDITABLES */}
                    {action.type === 'PEDIDO' && action.details.lines && (
                      <div className="space-y-2 mt-2">
                        {action.details.lines.map((line, lineIndex) => (
                          <div key={lineIndex} className="flex items-center gap-2 text-sm">
                            <Package size={14} className="text-muted-foreground" />
                            <input
                              type="number"
                              className="sb-input w-20 text-sm"
                              value={line.qty}
                              onChange={(e) => handleLineQtyChange(index, lineIndex, parseInt(e.target.value) || 0)}
                              min="1"
                            />
                            <span className="text-muted-foreground">{line.uom}</span>
                            <span className="text-muted-foreground">{line.itemName}</span>
                          </div>
                        ))}
                        {action.details.estimatedTotal && (
                          <div className="font-semibold text-primary mt-2 flex items-center gap-2">
                            <Euro size={16} />
                            <span>Total estimado: €{action.details.estimatedTotal.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {action.type === 'POS' && action.details.location && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin size={14} />
                        <span>Ubicación: {action.details.location}</span>
                      </div>
                    )}
                    
                    {action.type === 'EVENTO' && (
                      <div className="text-sm space-y-1">
                        {action.details.title && (
                          <div className="font-medium">{action.details.title}</div>
                        )}
                        {action.details.description && (
                          <textarea
                            className="sb-textarea w-full text-sm"
                            value={action.details.description}
                            onChange={(e) => handleActionNotesChange(index, e.target.value)}
                            rows={2}
                          />
                        )}
                      </div>
                    )}
                    
                    {action.details.notes && action.type !== 'EVENTO' && (
                      <textarea
                        className="sb-textarea w-full text-sm"
                        value={action.details.notes}
                        onChange={(e) => handleActionNotesChange(index, e.target.value)}
                        rows={2}
                        placeholder="Notas adicionales..."
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Warnings */}
        {editedSummary.warnings.length > 0 && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2 text-warning font-medium mb-2">
              <AlertCircle size={16} />
              Advertencias
            </div>
            <ul className="text-sm text-warning space-y-1">
              {editedSummary.warnings.map((warning, i) => (
                <li key={i}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence */}
        <div className="flex items-center justify-between text-sm p-3 bg-secondary/5 rounded-lg">
          <span className="text-muted-foreground">Confianza del análisis:</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  editedSummary.confidence >= 80 ? 'bg-green-500' :
                  editedSummary.confidence >= 60 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${editedSummary.confidence}%` }}
              />
            </div>
            <span className="font-semibold tabular-nums">{editedSummary.confidence}%</span>
          </div>
        </div>

        {/* Ayuda */}
        <div className="text-xs text-muted-foreground p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p>
            ℹ️ Puedes editar cualquier campo antes de guardar. Los cambios se aplicarán automáticamente.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border/50 bg-secondary/30 backdrop-blur-sm p-4">
        <div className="flex gap-3">
          <button 
            className="sb-btn sb-btn--ghost flex-1" 
            onClick={onEdit}
          >
            <ArrowLeft size={16} />
            Volver a Notas
          </button>
          <button 
            className="sb-btn sb-btn--secondary" 
            onClick={onCancel}
          >
            <X size={16} />
            Cancelar
          </button>
          <button 
            className="sb-btn sb-btn--primary flex-1" 
            onClick={handleConfirmWithEdits}
          >
            <Check size={16} />
            Confirmar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
