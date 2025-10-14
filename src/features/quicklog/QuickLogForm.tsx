"use client";

import { useState, useEffect } from "react";
import { useData } from "@/lib/dataprovider";
import { Mic, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { VoiceRecorder } from '@/features/quicklog/components/VoiceRecorder';
import { SantaBrainConfirmation } from '@/features/quicklog/components/SantaBrainConfirmation';
import { saveSantaBrainData } from '@/server/actions/santa-brain.actions';

type ActionType = "VISITA" | "PEDIDO" | "EVENTO" | "POS";

type Action = {
  id: string;
  type: ActionType;
  date: string;
  details: Record<string, any>;
};

export type QuickLogFormProps = {
  accountId?: string;
  showAccountControls?: boolean;
  compact?: boolean;
  voiceOpen?: boolean;
  onVoiceOpenChange?: (v: boolean) => void;
  defaultActions?: Array<{ type: ActionType; date?: string; notes?: string }>;
  onSaved?: () => void;
  onCancel?: () => void;
};

const nowISODate = () => new Date().toISOString().slice(0, 10);

export function QuickLogForm({
  accountId,
  showAccountControls = !accountId,
  compact = false,
  voiceOpen: voiceOpenProp,
  onVoiceOpenChange: setVoiceOpenProp,
  defaultActions = [],
  onSaved,
  onCancel,
}: QuickLogFormProps) {
  const { data, currentUser } = useData();
  const accounts = data?.accounts || [];
  
  const [voiceOpenInternal, setVoiceOpenInternal] = useState(false);
  const voiceOpen = voiceOpenProp ?? voiceOpenInternal;
  const setVoiceOpen = setVoiceOpenProp ?? setVoiceOpenInternal;
  
  const [isListening, setIsListening] = useState(false);
  const [voiceData, setVoiceData] = useState<any>(null);
  const [confirmData, setConfirmData] = useState<any>(null);
  const [accountName, setAccountName] = useState("");
  const [isNewAccount, setIsNewAccount] = useState(false);
  
  const [actions, setActions] = useState<Action[]>(() => 
    defaultActions.length > 0
      ? defaultActions.map(a => ({
          id: `action_${Date.now()}_${Math.random()}`,
          type: a.type,
          date: a.date || nowISODate(),
          details: { notes: a.notes || "" }
        }))
      : [{
          id: `action_${Date.now()}_${Math.random()}`,
          type: "VISITA" as ActionType,
          date: nowISODate(),
          details: { notes: "" }
        }]
  );

  useEffect(() => {
    if (!voiceOpen) {
      setVoiceData(null);
      setConfirmData(null);
      setIsListening(false);
    } else {
      setIsListening(true);
    }
  }, [voiceOpen]);

  const addAction = () => {
    setActions([...actions, {
      id: `action_${Date.now()}_${Math.random()}`,
      type: "VISITA",
      date: nowISODate(),
      details: { notes: "" }
    }]);
  };

  const updateAction = (id: string, updates: Partial<Action>) => {
    setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAction = (id: string) => {
    if (actions.length > 1) {
      setActions(actions.filter(a => a.id !== id));
    }
  };

  const handleVoiceData = (data: any) => {
    setVoiceData(data);
    setConfirmData(data.structuredData);
    setIsListening(false);
  };

  const handleVoiceConfirm = (parsedData: any) => {
    if (parsedData.actions && parsedData.actions.length > 0) {
      const newActions = parsedData.actions.map((a: any, idx: number) => ({
        id: `action_${Date.now()}_${idx}_${Math.random()}`,
        type: a.type as ActionType,
        date: a.date || nowISODate(),
        details: a.details || { notes: "" }
      }));
      setActions(newActions);
    }

    if (showAccountControls && parsedData.accountName) {
      setAccountName(parsedData.accountName);
      setIsNewAccount(parsedData.isNewAccount || false);
    }

    setVoiceData(null);
    setConfirmData(null);
    setVoiceOpen(false);
    
    toast.success("Acciones capturadas por voz. Puedes editarlas antes de guardar.");
  };

  const handleSave = async () => {
    try {
      if (!currentUser?.id) {
        toast.error('Usuario no identificado');
        return;
      }

      const payload: any = {
        actions: actions.map(a => ({
          type: a.type,
          date: a.date,
          details: a.details
        })),
        rawTranscript: "Entrada manual"
      };

      if (accountId) {
        const account = accounts.find(a => a.id === accountId);
        payload.accountName = account?.name || "";
        payload.accountId = accountId;
        payload.isNewAccount = false;
      } else if (showAccountControls) {
        payload.accountName = accountName;
        payload.isNewAccount = isNewAccount;
      }

      const result = await saveSantaBrainData(payload, currentUser.id);
      
      if (!result.ok) {
        toast.error(`Error: ${result.message}`);
        return;
      }

      const { successes, failures } = result.data;
      
      if (successes.length > 0) {
        const messages = successes.map(s => {
          if (s.type === 'CUENTA_CREADA') return `✅ Cuenta creada`;
          return `✅ ${s.type}`;
        }).join(', ');
        toast.success(`Guardado: ${messages}`);
      }
      
      if (failures.length > 0) {
        failures.forEach(f => toast.error(`❌ ${f.type}: ${f.error}`));
        return;
      }

      setActions([{
        id: `action_${Date.now()}_${Math.random()}`,
        type: "VISITA",
        date: nowISODate(),
        details: { notes: "" }
      }]);
      setAccountName("");
      setIsNewAccount(false);
      if (onSaved) onSaved();
      
    } catch (error: any) {
      console.error('Error guardando datos:', error);
      toast.error('Error inesperado al guardar');
    }
  };

  const canSave = actions.length > 0 && (accountId || !showAccountControls || accountName.trim());

  return (
    <div className="flex flex-col h-full">
      {/* Confirmación de voz (solo cuando hay datos) */}
      {confirmData && (
        <div className="absolute inset-0 bg-background z-50 overflow-y-auto">
          <div className="p-4">
            <SantaBrainConfirmation
              data={confirmData}
              onConfirm={handleVoiceConfirm}
              onCancel={() => {
                setVoiceData(null);
                setConfirmData(null);
                setVoiceOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* UI principal compacta */}
      {!confirmData && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {/* Input de cuenta + Botón micrófono */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                className="sb-input flex-1"
                placeholder={showAccountControls ? "Buscar o crear cuenta..." : "Cuenta"}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={!showAccountControls}
              />
              <button
                type="button"
                onClick={() => setVoiceOpen(!voiceOpen)}
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  voiceOpen 
                    ? 'bg-primary text-primary-foreground listening-pulse' 
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
                title={voiceOpen ? "Detener grabación" : "Grabar por voz"}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
            
            {/* VoiceRecorder inline cuando está grabando */}
            {voiceOpen && !confirmData && (
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <VoiceRecorder onNewData={handleVoiceData} />
              </div>
            )}

            {/* Acciones como líneas horizontales */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">Acciones</h3>
                <button
                  type="button"
                  onClick={addAction}
                  className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Añadir
                </button>
              </div>
              
              <div className="bg-muted/30 rounded-lg border border-border divide-y divide-border">
                {actions.map((action) => (
                  <div key={action.id} className="p-3 space-y-2">
                    {/* Fila 1: Select tipo + Date + X */}
                    <div className="flex items-center gap-2">
                      <select
                        className="sb-select flex-1 text-sm"
                        value={action.type}
                        onChange={(e) => updateAction(action.id, { type: e.target.value as ActionType })}
                      >
                        <option value="VISITA">👣 Visita</option>
                        <option value="PEDIDO">📦 Pedido</option>
                        <option value="EVENTO">🗓️ Evento</option>
                        <option value="POS">🪧 POS</option>
                      </select>
                      
                      <input
                        type="date"
                        className="sb-input w-36 text-sm"
                        value={action.date}
                        onChange={(e) => updateAction(action.id, { date: e.target.value })}
                      />

                      {actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAction(action.id)}
                          className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                          title="Eliminar"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    
                    {/* Fila 2: Notas (textarea completo) */}
                    <textarea
                      className="sb-textarea w-full text-sm min-h-[60px] resize-none"
                      placeholder="Notas..."
                      value={action.details.notes || ""}
                      onChange={(e) => updateAction(action.id, {
                        details: { ...action.details, notes: e.target.value }
                      })}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer fijo */}
          <div className="mt-auto p-4 border-t border-border bg-background flex gap-3">
            <button
              type="button"
              className="sb-btn sb-btn--primary flex-1"
              onClick={handleSave}
              disabled={!canSave}
            >
              Guardar
            </button>
            {onCancel && (
              <button
                type="button"
                className="sb-btn sb-btn--secondary flex-1"
                onClick={onCancel}
              >
                Cancelar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
