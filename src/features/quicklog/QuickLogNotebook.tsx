/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/quicklog/QuickLogNotebook.tsx
"use client";

import React, { useState } from 'react';
import { 
  Sparkles, X, ChevronDown, ChevronUp, Calendar, Package, 
  MapPin, Store, Mic, Loader2, Plus, Search
} from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { toast } from 'sonner';
import { QuickLogConfirmation, type ProcessedSummary } from './components/QuickLogConfirmation';
import { VoiceRecorder } from './components/VoiceRecorder';

type QuickActionType = 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS' | null;
type QuickLogState = 'FORM' | 'PROCESSING' | 'CONFIRMING';

interface QuickLogNotebookProps {
  onClose: () => void;
  initialMode?: 'MANUAL' | 'AI';
}

export function QuickLogNotebook({ onClose, initialMode = 'MANUAL' }: QuickLogNotebookProps) {
  const { data, currentUser } = useData();
  const accounts = data?.accounts || [];
  const aiEnabled = process.env.NEXT_PUBLIC_QUICKLOG_AI === 'true';

  const [state, setState] = useState<QuickLogState>('FORM');
  const [uiMode, setUiMode] = useState<'MANUAL' | 'AI'>(initialMode);
  const [expandedSection, setExpandedSection] = useState<QuickActionType>(null);
  const [formData, setFormData] = useState<any>({});
  const [processedSummary, setProcessedSummary] = useState<ProcessedSummary | null>(null);
  
  // AI Processing state
  const [aiNotes, setAiNotes] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [showAiSection, setShowAiSection] = useState(false);
  
  // Account creation
  const [showNewAccountForm, setShowNewAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountResults, setShowAccountResults] = useState(false);

  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const toggleSection = (section: QuickActionType) => {
    setExpandedSection(expandedSection === section ? null : section);
    if (section) {
      setFormData({ ...formData, actionType: section });
    }
  };

  const handleSelectAccount = (account: any) => {
    setAccountSearch(account.name);
    setFormData({ ...formData, accountId: account.id, accountName: account.name });
    setShowAccountResults(false);
    setShowNewAccountForm(false);
  };

  const handleCreateNewAccount = () => {
    if (!newAccountName.trim()) {
      toast.error('Ingresa un nombre para el cliente');
      return;
    }
    setFormData({ ...formData, accountName: newAccountName, isNewAccount: true });
    setAccountSearch(newAccountName);
    setShowNewAccountForm(false);
    setShowAccountResults(false);
    toast.success('Cliente nuevo será creado al guardar');
  };

  const handleVoiceData = (data: any) => {
    if (data.transcript) {
      setAiNotes(prev => prev + (prev ? '\n' : '') + data.transcript);
    }
    setVoiceMode(false);
  };

  const handleProcessWithAI = async () => {
    if (!aiNotes.trim()) {
      toast.error('Escribe algunas notas primero');
      return;
    }

    if (!currentUser?.id) {
      toast.error('Usuario no identificado');
      return;
    }

    setState('PROCESSING');

    try {
      const { processQuickLogNotes } = await import('./utils/process-quicklog');
      
      const processedSummary = await processQuickLogNotes(
        aiNotes,
        currentUser.id,
        formData.accountId || undefined,
        { userAccounts: accounts }
      );

      setProcessedSummary(processedSummary);
      setState('CONFIRMING');
    } catch (error) {
      console.error('Error processing notes:', error);
      toast.error('Error al procesar las notas');
      setState('FORM');
    }
  };

  const handleSubmitForm = async () => {
    if (!currentUser?.id) {
      toast.error('Usuario no identificado');
      return;
    }

    if (!formData.accountName && !formData.accountId) {
      toast.error('Selecciona o crea un cliente');
      return;
    }

    if (!expandedSection) {
      toast.error('Selecciona un tipo de acción');
      return;
    }

    // Validaciones específicas por tipo
    if (expandedSection === 'PEDIDO') {
      const items = formData.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        toast.error('Añade al menos un producto en el pedido');
        return;
      }
    }
    if (expandedSection === 'EVENTO' && !formData.title) {
      toast.error('Añade un título para el evento');
      return;
    }

    setState('PROCESSING');

    try {
      const selectedAccountData = accounts.find(acc => acc.id === formData.accountId);
      
      const summary: ProcessedSummary = {
        account: {
          id: formData.accountId,
          name: formData.accountName || selectedAccountData?.name || 'Cliente desconocido',
          isNew: formData.isNewAccount || false,
          segment: selectedAccountData?.segment,
        },
        actions: [],
        confidence: 95,
        warnings: [],
      };

      switch (expandedSection) {
        case 'VISITA':
          summary.actions.push({
            type: 'VISITA',
            date: formData.date || new Date().toISOString(),
            details: { notes: formData.notes },
          });
          break;
        case 'PEDIDO':
          summary.actions.push({
            type: 'PEDIDO',
            date: new Date().toISOString(),
            details: {
              notes: formData.notes,
              lines: (formData.items || []).map((item: string) => ({
                itemName: item,
                qty: 1,
                uom: 'unit',
              })),
            },
          });
          break;
        case 'EVENTO':
          summary.actions.push({
            type: 'EVENTO',
            date: formData.date || new Date().toISOString(),
            details: {
              title: formData.title,
              description: formData.notes,
            },
          });
          break;
        case 'POS':
          summary.actions.push({
            type: 'POS',
            date: new Date().toISOString(),
            details: {
              location: formData.location,
              notes: formData.notes,
            },
          });
          break;
      }

      setProcessedSummary(summary);
      setState('CONFIRMING');
    } catch (error) {
      console.error('Error processing form:', error);
      toast.error('Error al procesar el formulario');
      setState('FORM');
    }
  };

  const handleConfirm = async () => {
    if (!processedSummary || !currentUser?.id) return;
    
    try {
      const { saveQuickLogData } = await import('@/server/actions/quicklog.actions');
      
      const result = await saveQuickLogData(
        processedSummary,
        currentUser.id,
        formData.notes || aiNotes || ''
      );
      
      if (result.success) {
        setFormData({});
        setAiNotes('');
        setProcessedSummary(null);
        setExpandedSection(null);
        setState('FORM');
        window.dispatchEvent(new CustomEvent('data:refresh'));
        onClose();
        
        toast.success(`${result.message}`, {
          description: `Creado: ${Object.keys(result.data || {}).join(', ')}`,
          duration: 5000,
        });
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error guardando:', error);
      toast.error('Error inesperado al guardar');
    }
  };

  const handleCancel = () => {
    setFormData({});
    setAiNotes('');
    setProcessedSummary(null);
    setExpandedSection(null);
    setState('FORM');
    onClose();
  };

  const handleEdit = () => {
    setState('FORM');
  };

  if (state === 'CONFIRMING' && processedSummary) {
    return (
      <QuickLogConfirmation
        summary={processedSummary}
        onEdit={handleEdit}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sb-drawer__header">
        <div>
          <h2 className="text-xl font-semibold">QuickLog</h2>
          <p className="text-sm text-muted-foreground">Registro rápido de acciones</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-secondary/50 rounded-lg p-1 flex items-center">
            <button
              type="button"
              onClick={() => { setUiMode('MANUAL'); setShowAiSection(false); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${uiMode === 'MANUAL' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'}`}
              disabled={state === 'PROCESSING'}
            >
              Formulario
            </button>
            <button
              type="button"
              onClick={() => { setUiMode('AI'); setShowAiSection(true); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${uiMode === 'AI' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'}`}
              disabled={state === 'PROCESSING'}
            >
              IA
            </button>
          </div>
          <button onClick={handleCancel} className="sb-btn--ghost sb-btn--icon" disabled={state === 'PROCESSING'}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="sb-drawer__body space-y-4">
        {/* Cliente + Secciones (solo modo MANUAL) */}
        {uiMode === 'MANUAL' && (
        <>
        {/* Cliente Selection */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="block text-sm font-medium">Cliente</label>
          
          <div className="relative">
            <input
              type="text"
              className="sb-input pr-10"
              placeholder="Buscar o crear cliente..."
              value={accountSearch}
              onChange={(e) => {
                setAccountSearch(e.target.value);
                setShowAccountResults(true);
                setShowNewAccountForm(false);
              }}
              onFocus={() => setShowAccountResults(true)}
              disabled={state === 'PROCESSING'}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            
            {showAccountResults && accountSearch && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredAccounts.length > 0 ? (
                  filteredAccounts.slice(0, 5).map(account => (
                    <button
                      key={account.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0"
                      onClick={() => handleSelectAccount(account)}
                    >
                      <div className="font-medium">{account.name}</div>
                      <div className="text-xs text-muted-foreground">{account.segment}</div>
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors flex items-center gap-2"
                    onClick={() => {
                      setShowNewAccountForm(true);
                      setNewAccountName(accountSearch);
                      setShowAccountResults(false);
                    }}
                  >
                    <Plus size={16} className="text-primary" />
                    <span>Crear nuevo cliente: <strong>{accountSearch}</strong></span>
                  </button>
                )}
              </div>
            )}
          </div>

          {showNewAccountForm && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <label className="block text-sm font-medium">Nombre del nuevo cliente</label>
              <input
                type="text"
                className="sb-input"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Nombre del cliente"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="sb-btn--secondary flex-1"
                  onClick={() => setShowNewAccountForm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="sb-btn--primary flex-1"
                  onClick={handleCreateNewAccount}
                >
                  Crear Cliente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-2">
          {/* Visita */}
          <div className="sb-card-glass-light overflow-hidden">
            <button
              type="button"
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              onClick={() => toggleSection('VISITA')}
              disabled={state === 'PROCESSING'}
            >
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-info" />
                <span className="font-medium">Visita</span>
              </div>
              {expandedSection === 'VISITA' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {expandedSection === 'VISITA' && (
              <div className="p-4 pt-0 space-y-3 border-t border-border/30">
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha</label>
                  <input
                    type="date"
                    className="sb-input"
                    value={formData.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notas</label>
                  <textarea
                    className="sb-textarea"
                    rows={3}
                    placeholder="Detalles de la visita..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pedido */}
          <div className="sb-card-glass-light overflow-hidden">
            <button
              type="button"
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              onClick={() => toggleSection('PEDIDO')}
              disabled={state === 'PROCESSING'}
            >
              <div className="flex items-center gap-3">
                <Package size={20} className="text-success" />
                <span className="font-medium">Pedido</span>
              </div>
              {expandedSection === 'PEDIDO' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {expandedSection === 'PEDIDO' && (
              <div className="p-4 pt-0 space-y-3 border-t border-border/30">
                <div>
                  <label className="block text-sm font-medium mb-2">Productos (uno por línea)</label>
                  <textarea
                    className="sb-textarea"
                    rows={4}
                    placeholder="12 cajas Santa Brisa Original&#10;6 cajas Limón"
                    value={formData.itemsText || ''}
                    onChange={(e) => {
                      const items = e.target.value.split('\n').filter(l => l.trim());
                      setFormData({ ...formData, itemsText: e.target.value, items });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notas adicionales</label>
                  <textarea
                    className="sb-textarea"
                    rows={2}
                    placeholder="Información adicional del pedido..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Evento */}
          <div className="sb-card-glass-light overflow-hidden">
            <button
              type="button"
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              onClick={() => toggleSection('EVENTO')}
              disabled={state === 'PROCESSING'}
            >
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-accent" />
                <span className="font-medium">Evento</span>
              </div>
              {expandedSection === 'EVENTO' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {expandedSection === 'EVENTO' && (
              <div className="p-4 pt-0 space-y-3 border-t border-border/30">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input
                    type="text"
                    className="sb-input"
                    placeholder="Reunión de seguimiento"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha</label>
                  <input
                    type="date"
                    className="sb-input"
                    value={formData.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <textarea
                    className="sb-textarea"
                    rows={3}
                    placeholder="Detalles del evento..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* POS */}
          <div className="sb-card-glass-light overflow-hidden">
            <button
              type="button"
              className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              onClick={() => toggleSection('POS')}
              disabled={state === 'PROCESSING'}
            >
              <div className="flex items-center gap-3">
                <Store size={20} className="text-warning" />
                <span className="font-medium">POS</span>
              </div>
              {expandedSection === 'POS' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {expandedSection === 'POS' && (
              <div className="p-4 pt-0 space-y-3 border-t border-border/30">
                <div>
                  <label className="block text-sm font-medium mb-2">Ubicación</label>
                  <input
                    type="text"
                    className="sb-input"
                    placeholder="Entrada principal"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notas</label>
                  <textarea
                    className="sb-textarea"
                    rows={3}
                    placeholder="Detalles de la instalación..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* Sección IA (solo modo IA) */}
        {uiMode === 'AI' && (
        <div className="sb-card-glass-light overflow-hidden">
          <button
            type="button"
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
            onClick={() => setShowAiSection(!showAiSection)}
            disabled={state === 'PROCESSING'}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-primary" />
              <span className="font-medium">{aiEnabled ? 'Procesar con IA' : 'Procesar notas (sin IA)'}</span>
            </div>
            {showAiSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {showAiSection && (
            <div className="p-4 pt-0 space-y-3 border-t border-border/30">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Notas de voz o texto</label>
                {aiEnabled && (
                  <button
                  type="button"
                  onClick={() => setVoiceMode(!voiceMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    voiceMode 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                  disabled={state === 'PROCESSING'}
                >
                  <Mic size={16} />
                  {voiceMode ? 'Grabando...' : 'Grabar'}
                </button>
                )}
              </div>

              {aiEnabled && voiceMode && (
                <div className="mb-3 p-3 border border-primary/30 rounded-lg bg-primary/5">
                  <VoiceRecorder onNewData={handleVoiceData} />
                </div>
              )}

              <textarea
                className="sb-textarea"
                rows={6}
                placeholder="Escribe o dicta tus notas aquí...&#10;&#10;Ejemplo:&#10;Visita a Cliente ABC hoy.&#10;Pedido de 12 cajas Santa Brisa Original.&#10;Instalamos POS en la entrada."
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                disabled={state === 'PROCESSING'}
              />

              <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  La IA detectará automáticamente clientes, acciones, fechas y detalles. Podrás revisar antes de guardar.
                </p>
              </div>

              <button
                type="button"
                className="sb-btn--primary w-full"
                onClick={handleProcessWithAI}
                disabled={!aiNotes.trim() || state === 'PROCESSING'}
              >
                {state === 'PROCESSING' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {aiEnabled ? 'Procesar con IA' : 'Procesar notas'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Footer */}
      <div className="sb-drawer__footer flex gap-3">
        <button 
          className="sb-btn--secondary flex-1" 
          onClick={handleCancel}
          disabled={state === 'PROCESSING'}
        >
          Cancelar
        </button>
        {uiMode === 'MANUAL' ? (
          <button 
            className="sb-btn--primary flex-1" 
            onClick={handleSubmitForm}
            disabled={
              state === 'PROCESSING' || 
              !expandedSection || 
              (!formData.accountId && !formData.accountName) ||
              (expandedSection === 'EVENTO' && !formData.title)
            }
          >
            {state === 'PROCESSING' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        ) : (
          <button 
            className="sb-btn--primary flex-1" 
            onClick={handleProcessWithAI}
            disabled={!aiNotes.trim() || state === 'PROCESSING'}
          >
            {state === 'PROCESSING' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {aiEnabled ? 'Procesar con IA' : 'Procesar notas'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
