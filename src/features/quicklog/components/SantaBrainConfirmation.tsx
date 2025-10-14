// src/features/quicklog/components/SantaBrainConfirmation.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Check, X, Edit2, Calendar, ShoppingCart, 
  User, MapPin, Package, TrendingUp, Plus, Search
} from 'lucide-react';
import { SBButton } from '@/components/ui';
import { searchContacts } from '@/lib/algolia/search';

interface Action {
  type: 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS';
  date: string | null;
  details: any;
}

interface SantaBrainData {
  accountName: string;
  isNewAccount: boolean;
  accountId?: string;
  accountType?: string;
  accountAddress?: string;
  accountPhone?: string;
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
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Búsqueda en tiempo real con debounce
  useEffect(() => {
    const query = editedData.accountName.trim();
    
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // No buscar si está vacío o muy corto
    if (query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Buscar después de 300ms de inactividad
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchContacts(query, { hitsPerPage: 5 });
        setSearchSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Error buscando cuentas:', error);
        setSearchSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [editedData.accountName]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (suggestion: any) => {
    setEditedData({
      ...editedData,
      accountName: suggestion.displayName || suggestion.legalName,
      accountId: suggestion.id,
      isNewAccount: false,
      accountType: suggestion.customer?.segment || 'HORECA',
      accountAddress: suggestion.addresses?.[0]?.street || '',
      accountPhone: suggestion.addresses?.[0]?.phone || '',
    });
    setShowSuggestions(false);
  };
  
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
    <div className="sb-section space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              Santa Brain
            </span>
          </div>
        </div>
      </div>

      {/* Datos de Cuenta - SIEMPRE VISIBLE */}
      <div className="sb-card">
        <div className="sb-card__header">
          <div className="flex items-center justify-between">
            <div className="sb-card__title">📋 Datos de la Cuenta</div>
            {/* Indicador cuenta nueva/existente */}
            {editedData.isNewAccount ? (
              <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                <Plus className="h-3 w-3" />
                Nueva
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                <Check className="h-3 w-3" />
                Existente
              </div>
            )}
          </div>
        </div>
        <div className="sb-card__content space-y-3">
          {/* Nombre con Autocomplete */}
          <div className="relative" ref={suggestionsRef}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Nombre de la cuenta *
            </label>
            <div className="relative">
              <input
                type="text"
                value={editedData.accountName}
                onChange={(e) =>
                  setEditedData({ ...editedData, accountName: e.target.value })
                }
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                className="sb-input font-semibold pr-8"
                placeholder="Ej: El 4 Gatos Gastropub"
              />
              {isSearching && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Search className="h-4 w-4 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
            
            {/* Dropdown de sugerencias */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                <div className="p-2 text-xs text-muted-foreground border-b">
                  {searchSuggestions.length} cuenta{searchSuggestions.length !== 1 ? 's' : ''} encontrada{searchSuggestions.length !== 1 ? 's' : ''}
                </div>
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{suggestion.displayName}</div>
                      {suggestion.customer?.segment && (
                        <div className="text-xs text-muted-foreground">
                          {suggestion.customer.segment}
                        </div>
                      )}
                      {suggestion.addresses?.[0]?.city && (
                        <div className="text-xs text-muted-foreground">
                          📍 {suggestion.addresses[0].city}
                        </div>
                      )}
                    </div>
                    <Check className="h-4 w-4 text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de cuenta */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Tipo de cuenta
            </label>
            <select
              value={editedData.accountType || 'HORECA'}
              onChange={(e) =>
                setEditedData({ ...editedData, accountType: e.target.value })
              }
              className="sb-input"
            >
              <option value="HORECA">🍽️ HORECA (Restaurantes, Bares)</option>
              <option value="RETAIL">🏪 Retail (Tiendas)</option>
              <option value="DISTRIBUTOR">🚚 Distribuidor</option>
              <option value="ECOMMERCE">🛒 E-commerce</option>
              <option value="OTHER">📦 Otro</option>
            </select>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              <MapPin className="h-3 w-3 inline mr-1" />
              Dirección (opcional)
            </label>
            <input
              type="text"
              value={editedData.accountAddress || ''}
              onChange={(e) =>
                setEditedData({ ...editedData, accountAddress: e.target.value })
              }
              className="sb-input"
              placeholder="Calle, número, ciudad"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              📞 Teléfono (opcional)
            </label>
            <input
              type="tel"
              value={editedData.accountPhone || ''}
              onChange={(e) =>
                setEditedData({ ...editedData, accountPhone: e.target.value })
              }
              className="sb-input"
              placeholder="+34 XXX XXX XXX"
            />
          </div>

          {/* Toggle crear nueva / buscar existente */}
          <div className="pt-2 border-t">
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={editedData.isNewAccount}
                onChange={(e) =>
                  setEditedData({ ...editedData, isNewAccount: e.target.checked })
                }
                className="rounded"
              />
              <span className="font-medium">
                {editedData.isNewAccount 
                  ? '✅ Crear como cuenta nueva' 
                  : '🔍 Buscar y vincular a cuenta existente'}
              </span>
            </label>
            {!editedData.isNewAccount && (
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Se buscará "{editedData.accountName}" en las cuentas existentes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="sb-section bg-muted/50">
        <p className="text-sm text-muted-foreground italic">
          "{data.rawTranscript}"
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="sb-section__title">Acciones:</h4>
          <button
            onClick={addAction}
            className="sb-btn sb-btn--ghost sb-btn--sm"
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
                    className="sb-btn sb-btn--ghost sb-btn--sm"
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
                    className="sb-btn sb-btn--ghost sb-btn--sm"
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
