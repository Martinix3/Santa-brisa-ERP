// src/features/quicklog/components/SantaBrainConfirmation.tsx
"use client";

import { useState } from 'react';
import { 
  Check, X, Edit2, Calendar, ShoppingCart, 
  User, MapPin, Package, TrendingUp, Plus
} from 'lucide-react';
import { SBButton } from '@/components/ui';

interface Action {
  type: 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS';
  date: string | null;
  details: any;
}

interface SantaBrainData {
  accountName: string;
  isNewAccount: boolean;
  actions: Action[];
  rawTranscript: string;
}

interface SantaBrainConfirmationProps {
  data: SantaBrainData;
  onConfirm: (data: SantaBrainData) => void;
  onCancel: () => void;
}

const actionIcons = {
  VISITA: User,
  PEDIDO: ShoppingCart,
  EVENTO: Calendar,
  POS: Package,
};

const actionColors = {
  VISITA: 'bg-blue-50 border-blue-200 text-blue-700',
  PEDIDO: 'bg-green-50 border-green-200 text-green-700',
  EVENTO: 'bg-purple-50 border-purple-200 text-purple-700',
  POS: 'bg-orange-50 border-orange-200 text-orange-700',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function SantaBrainConfirmation({
  data,
  onConfirm,
  onCancel,
}: SantaBrainConfirmationProps) {
  const [editedData, setEditedData] = useState(data);
  
  const updateAction = (index: number, updates: Partial<Action>) => {
    const newActions = [...editedData.actions];
    newActions[index] = { ...newActions[index], ...updates };
    setEditedData({ ...editedData, actions: newActions });
  };

  const addAction = () => {
    setEditedData({
      ...editedData,
      actions: [
        ...editedData.actions,
        { type: 'VISITA', date: null, details: {} }
      ]
    });
  };

  const removeAction = (index: number) => {
    setEditedData({
      ...editedData,
      actions: editedData.actions.filter((_, i) => i !== index)
    });
  };

  const handleConfirm = () => {
    onConfirm(editedData);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
              Santa Brain
            </span>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              value={editedData.accountName}
              onChange={(e) =>
                setEditedData({ ...editedData, accountName: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-base font-semibold"
              placeholder="Nombre de la cuenta"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editedData.isNewAccount}
                onChange={(e) =>
                  setEditedData({ ...editedData, isNewAccount: e.target.checked })
                }
                className="rounded"
              />
              <span>Cuenta nueva (crear)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
        <p className="text-sm text-zinc-600 italic">
          "{data.rawTranscript}"
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-zinc-700">Acciones:</h4>
          <button
            onClick={addAction}
            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Añadir acción
          </button>
        </div>
        {editedData.actions.map((action, index) => {
          const Icon = actionIcons[action.type];
          const colorClass = actionColors[action.type];
          
          return (
            <div
              key={index}
              className={`rounded-lg border p-3 ${colorClass} space-y-2`}
            >
              <div className="flex items-center gap-2">
                <select
                  value={action.type}
                  onChange={(e) => updateAction(index, { type: e.target.value as any })}
                  className="flex-1 border rounded px-2 py-1 text-sm font-semibold bg-white"
                >
                  <option value="VISITA">👤 Visita</option>
                  <option value="PEDIDO">🛒 Pedido</option>
                  <option value="EVENTO">🎉 Evento</option>
                  <option value="POS">📦 Material POS</option>
                </select>
                <input
                  type="date"
                  value={action.date || ''}
                  onChange={(e) => updateAction(index, { date: e.target.value || null })}
                  className="border rounded px-2 py-1 text-xs bg-white"
                />
                <button
                  onClick={() => removeAction(index)}
                  className="p-1 hover:bg-white/50 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Detalles editables - PEDIDO */}
              {action.type === 'PEDIDO' && (
                <div className="space-y-2">
                  {(action.details.lines || []).map((line: any, lineIdx: number) => (
                    <div key={lineIdx} className="flex gap-2 items-center bg-white p-2 rounded border">
                      <input
                        type="text"
                        value={line.product || ''}
                        onChange={(e) => {
                          const newLines = [...(action.details.lines || [])];
                          newLines[lineIdx] = { ...newLines[lineIdx], product: e.target.value };
                          updateAction(index, { details: { ...action.details, lines: newLines } });
                        }}
                        className="flex-1 text-sm border rounded px-2 py-1"
                        placeholder="Producto (ej: Margarita Mix)"
                      />
                      <input
                        type="number"
                        value={line.quantity || 1}
                        onChange={(e) => {
                          const newLines = [...(action.details.lines || [])];
                          newLines[lineIdx] = { ...newLines[lineIdx], quantity: parseInt(e.target.value) || 1 };
                          updateAction(index, { details: { ...action.details, lines: newLines } });
                        }}
                        className="w-16 text-sm border rounded px-2 py-1"
                        placeholder="Cant"
                      />
                      <input
                        type="text"
                        value={line.unit || 'cajas'}
                        onChange={(e) => {
                          const newLines = [...(action.details.lines || [])];
                          newLines[lineIdx] = { ...newLines[lineIdx], unit: e.target.value };
                          updateAction(index, { details: { ...action.details, lines: newLines } });
                        }}
                        className="w-20 text-sm border rounded px-2 py-1"
                        placeholder="unidad"
                      />
                      <button
                        onClick={() => {
                          const newLines = (action.details.lines || []).filter((_: any, i: number) => i !== lineIdx);
                          updateAction(index, { details: { ...action.details, lines: newLines } });
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newLines = [...(action.details.lines || []), { product: '', quantity: 1, unit: 'cajas' }];
                      updateAction(index, { details: { ...action.details, lines: newLines } });
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Añadir línea
                  </button>
                </div>
              )}

              {/* Detalles editables - POS */}
              {action.type === 'POS' && (
                <div className="space-y-2">
                  {(action.details.items || []).map((item: any, itemIdx: number) => (
                    <div key={itemIdx} className="flex gap-2 items-center bg-white p-2 rounded border">
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => {
                          const newItems = [...(action.details.items || [])];
                          newItems[itemIdx] = { ...newItems[itemIdx], name: e.target.value };
                          updateAction(index, { details: { ...action.details, items: newItems } });
                        }}
                        className="flex-1 text-sm border rounded px-2 py-1"
                        placeholder="Material (ej: Vasos promocionales)"
                      />
                      <input
                        type="number"
                        value={item.quantity || 1}
                        onChange={(e) => {
                          const newItems = [...(action.details.items || [])];
                          newItems[itemIdx] = { ...newItems[itemIdx], quantity: parseInt(e.target.value) || 1 };
                          updateAction(index, { details: { ...action.details, items: newItems } });
                        }}
                        className="w-16 text-sm border rounded px-2 py-1"
                        placeholder="Cant"
                      />
                      <button
                        onClick={() => {
                          const newItems = (action.details.items || []).filter((_: any, i: number) => i !== itemIdx);
                          updateAction(index, { details: { ...action.details, items: newItems } });
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newItems = [...(action.details.items || []), { name: '', quantity: 1 }];
                      updateAction(index, { details: { ...action.details, items: newItems } });
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Añadir material
                  </button>
                </div>
              )}

              <input
                type="text"
                value={action.details.notes || ''}
                onChange={(e) => updateAction(index, { details: { ...action.details, notes: e.target.value } })}
                className="w-full text-sm border rounded px-2 py-1 bg-white"
                placeholder="Notas adicionales..."
              />
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <SBButton
          variant="primary"
          size="md"
          onClick={handleConfirm}
          className="flex-1"
        >
          <Check className="h-4 w-4" />
          Confirmar y Guardar
        </SBButton>
        <SBButton
          variant="secondary"
          size="md"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
          Cancelar
        </SBButton>
      </div>
    </div>
  );
}
