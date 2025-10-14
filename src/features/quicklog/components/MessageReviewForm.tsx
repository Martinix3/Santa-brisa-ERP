// src/features/quicklog/components/MessageReviewForm.tsx
"use client";

import { useState } from 'react';
import { Check, X, Calendar, Building2, Plus, Trash2, Clock } from 'lucide-react';
import type { ProcessedMessage, Action } from '../actions/process-message';
import { searchContacts } from '@/lib/algolia/search';

interface MessageReviewFormProps {
  data: ProcessedMessage;
  onSave: (data: ProcessedMessage) => void;
  onCancel: () => void;
  onManual: () => void;
}

const ACTION_ICONS = {
  PEDIDO: '🛒',
  EVENTO: '🎉',
  POS: '📦',
  VISITA: '👤',
  RECORDATORIO: '⏰',
  OTRO: '📝'
};

export function MessageReviewForm({ 
  data, 
  onSave, 
  onCancel,
  onManual 
}: MessageReviewFormProps) {
  const [editedData, setEditedData] = useState(data);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);

  const handleAccountSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    try {
      const results = await searchContacts(query, { hitsPerPage: 5 });
      setSearchSuggestions(results);
    } catch (error) {
      setSearchSuggestions([]);
    }
  };

  const selectAccount = (account: any) => {
    setEditedData({
      ...editedData,
      accountName: account.displayName,
      accountId: account.id,
      isNewAccount: false
    });
    setSearchSuggestions([]);
  };

  const updateAction = (index: number, updates: Partial<Action>) => {
    const newActions = [...editedData.actions];
    newActions[index] = { ...newActions[index], ...updates };
    setEditedData({ ...editedData, actions: newActions });
  };

  const removeAction = (index: number) => {
    setEditedData({
      ...editedData,
      actions: editedData.actions.filter((_, i) => i !== index)
    });
  };

  const addAction = () => {
    setEditedData({
      ...editedData,
      actions: [
        ...editedData.actions,
        { type: 'OTRO', what: '', details: '', date: undefined, time: undefined }
      ]
    });
  };

  // Renderizar campos según tipo de acción
  const renderActionFields = (action: Action, index: number) => {
    const commonProps = { index, action };

    switch (action.type) {
      case 'RECORDATORIO':
        return <RecordatorioFields {...commonProps} updateAction={updateAction} />;
      case 'PEDIDO':
        return <PedidoFields {...commonProps} updateAction={updateAction} />;
      case 'VISITA':
        return <VisitaFields {...commonProps} updateAction={updateAction} />;
      case 'EVENTO':
        return <EventoFields {...commonProps} updateAction={updateAction} />;
      case 'POS':
        return <POSFields {...commonProps} updateAction={updateAction} />;
      default:
        return <OtroFields {...commonProps} updateAction={updateAction} />;
    }
  };

  // Determinar si mostrar campo cuenta
  const shouldShowAccount = editedData.actions.some(a => 
    ['PEDIDO', 'VISITA', 'EVENTO', 'POS'].includes(a.type)
  );

  return (
    <div className="p-4 space-y-4 bg-white rounded-lg border shadow-sm animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <h3 className="font-semibold text-base">✅ Listo para revisar</h3>
        {editedData.isNewAccount ? (
          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
            Cuenta nueva
          </span>
        ) : editedData.accountId ? (
          <a
            href={`/contacts/${editedData.accountId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium hover:bg-blue-100 transition-colors"
          >
            Cuenta existente →
          </a>
        ) : null}
      </div>

      {/* Cuenta (solo si es relevante) */}
      {shouldShowAccount && (
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
            <Building2 className="h-3 w-3" />
            Cliente
          </label>
          <input
            type="text"
            value={editedData.accountName}
            onChange={(e) => {
              setEditedData({ ...editedData, accountName: e.target.value });
              handleAccountSearch(e.target.value);
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Nombre del cliente"
          />
          
          {/* Sugerencias */}
          {searchSuggestions.length > 0 && (
            <div className="mt-1 border rounded-lg shadow-sm overflow-hidden">
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => selectAccount(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b last:border-b-0 text-sm"
                >
                  <div className="font-medium">{suggestion.displayName}</div>
                  {suggestion.customer?.segment && (
                    <div className="text-xs text-muted-foreground">
                      {suggestion.customer.segment}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">
            Acciones ({editedData.actions.length})
          </label>
          <button
            onClick={addAction}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Agregar
          </button>
        </div>

        <div className="space-y-3">
          {editedData.actions.map((action, index) => (
            <div
              key={index}
              className="border rounded-lg p-3 space-y-3 bg-gradient-to-br from-muted/20 to-muted/40"
            >
              {/* Selector de tipo + Delete */}
              <div className="flex items-center gap-2">
                <select
                  value={action.type}
                  onChange={(e) => updateAction(index, { type: e.target.value as Action['type'] })}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm font-medium bg-white"
                >
                  <option value="PEDIDO">{ACTION_ICONS.PEDIDO} Pedido</option>
                  <option value="EVENTO">{ACTION_ICONS.EVENTO} Evento</option>
                  <option value="POS">{ACTION_ICONS.POS} Material POS</option>
                  <option value="VISITA">{ACTION_ICONS.VISITA} Visita</option>
                  <option value="RECORDATORIO">{ACTION_ICONS.RECORDATORIO} Recordatorio</option>
                  <option value="OTRO">{ACTION_ICONS.OTRO} Otro</option>
                </select>
                {editedData.actions.length > 1 && (
                  <button
                    onClick={() => removeAction(index)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Campos específicos por tipo */}
              {renderActionFields(action, index)}
            </div>
          ))}
        </div>
      </div>

      {/* Mensaje original */}
      <div className="pt-2 border-t">
        <div className="text-xs text-muted-foreground mb-1">Mensaje original:</div>
        <div className="text-sm italic text-muted-foreground bg-muted/30 p-2 rounded">
          "{editedData.rawText}"
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onSave(editedData)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          <Check className="h-4 w-4" />
          Guardar {editedData.actions.length} acción{editedData.actions.length !== 1 ? 'es' : ''}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-muted/50 transition-colors text-sm"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Manual Mode Link */}
      <button
        onClick={onManual}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
      >
        ¿No está bien? Cambia a modo manual →
      </button>
    </div>
  );
}

// ========== COMPONENTES ESPECÍFICOS POR TIPO ==========

function RecordatorioFields({ action, index, updateAction }: any) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={action.what}
        onChange={(e) => updateAction(index, { what: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        placeholder="¿Qué recordar? (ej: Llamar, Enviar presupuesto)"
      />
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3 w-3" />
            Fecha
          </label>
          <input
            type="date"
            value={action.date || ''}
            onChange={(e) => updateAction(index, { date: e.target.value || undefined })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        
        <div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            Hora
          </label>
          <input
            type="time"
            value={action.time || '09:00'}
            onChange={(e) => updateAction(index, { time: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function PedidoFields({ action, index, updateAction }: any) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={action.what}
        onChange={(e) => updateAction(index, { what: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm font-medium"
        placeholder="Cantidad (ej: 4 cajas, 10 unidades)"
      />
      
      <input
        type="text"
        value={action.details}
        onChange={(e) => updateAction(index, { details: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        placeholder="Productos (ej: Santa Brisa 750ml)"
      />
      
      <div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Calendar className="h-3 w-3" />
          Fecha entrega (opcional)
        </label>
        <input
          type="date"
          value={action.date || ''}
          onChange={(e) => updateAction(index, { date: e.target.value || undefined })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
    </div>
  );
}

function VisitaFields({ action, index, updateAction }: any) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3 w-3" />
            Fecha
          </label>
          <input
            type="date"
            value={action.date || ''}
            onChange={(e) => updateAction(index, { date: e.target.value || undefined })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        
        <div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            Hora (sugerida)
          </label>
          <input
            type="time"
            value={action.time || ''}
            onChange={(e) => updateAction(index, { time: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="15:30"
          />
        </div>
      </div>
      
      <textarea
        value={action.details}
        onChange={(e) => updateAction(index, { details: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px]"
        placeholder="Notas de la visita (opcional)"
      />
    </div>
  );
}

function EventoFields({ action, index, updateAction }: any) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={action.what}
        onChange={(e) => updateAction(index, { what: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm font-medium"
        placeholder="Tipo de evento (ej: Degustación, Activación)"
      />
      
      <textarea
        value={action.details}
        onChange={(e) => updateAction(index, { details: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px]"
        placeholder="Detalles (ej: Mariachis, 50 personas)"
      />
      
      <div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Calendar className="h-3 w-3" />
          Fecha del evento
        </label>
        <input
          type="date"
          value={action.date || ''}
          onChange={(e) => updateAction(index, { date: e.target.value || undefined })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
    </div>
  );
}

function POSFields({ action, index, updateAction }: any) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={action.what}
        onChange={(e) => updateAction(index, { what: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm font-medium"
        placeholder="Material solicitado (ej: 20 vasos, 2 carteles)"
      />
      
      <input
        type="text"
        value={action.details}
        onChange={(e) => updateAction(index, { details: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        placeholder="Especificaciones (opcional)"
      />
      
      <div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Calendar className="h-3 w-3" />
          Fecha entrega (opcional)
        </label>
        <input
          type="date"
          value={action.date || ''}
          onChange={(e) => updateAction(index, { date: e.target.value || undefined })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
    </div>
  );
}

function OtroFields({ action, index, updateAction }: any) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={action.what}
        onChange={(e) => updateAction(index, { what: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm"
        placeholder="¿Qué pasó?"
      />
      
      <textarea
        value={action.details}
        onChange={(e) => updateAction(index, { details: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px]"
        placeholder="Detalles..."
      />
      
      <div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Calendar className="h-3 w-3" />
          Fecha (opcional)
        </label>
        <input
          type="date"
          value={action.date || ''}
          onChange={(e) => updateAction(index, { date: e.target.value || undefined })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
    </div>
  );
}
