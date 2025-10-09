// src/features/quicklog/QuickLogDialog.tsx
"use client";
import React, { useState, useEffect } from "react";
import { SBDialog, SBDialogContent } from "@/components/ui";
import { useData } from "@/lib/dataprovider";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { VoiceRecorder } from '@/features/quicklog/components/VoiceRecorder';
import { SantaBrainConfirmation } from '@/features/quicklog/components/SantaBrainConfirmation';
import { saveSantaBrainData } from '@/server/actions/santa-brain.actions';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId?: string;
  onSaved: (payload: any, openTask?: boolean) => void;
  defaultTab?: string;
};

const nowISODate = () => new Date().toISOString().slice(0, 10);

export function QuickLogDialog({
  open, onOpenChange, accountId, onSaved, defaultTab
}: Props) {
  const { data, currentUser } = useData();
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [voiceData, setVoiceData] = useState<any>(null);
  const accounts = data?.accounts || [];

  useEffect(() => {
    if (open) {
      console.info('[Telemetry] quicklog_opened', { accountId });
    }
  }, [open, accountId]);

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent title="QuickLog" maxWidth="40rem">
        {!voiceData ? (
          <div className="pt-4 space-y-4">
            <div className="text-center space-y-4">
              <p className="text-gray-600">Registra visitas, pedidos, eventos y material POS</p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setVoiceData({
                      structuredData: {
                        accountName: accountId ? accounts.find(a => a.id === accountId)?.name || '' : '',
                        isNewAccount: !accountId,
                        actions: [{ type: 'VISITA', date: nowISODate(), details: {} }],
                        rawTranscript: 'Entrada manual'
                      }
                    });
                    setShowVoiceInput(false);
                  }}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-indigo-300 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-indigo-700 font-semibold shadow-sm"
                >
                  ✏️ Entrada Manual
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowVoiceInput(!showVoiceInput);
                  }}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm"
                >
                  <Mic className="h-5 w-5" />
                  🎤 Voz
                </button>
              </div>
            </div>

            {showVoiceInput && (
              <div className="border-t pt-4">
                <VoiceRecorder onNewData={setVoiceData} />
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4">
            <SantaBrainConfirmation
              data={voiceData.structuredData}
              onConfirm={async (data) => {
                try {
                  if (!currentUser?.id) {
                    toast.error('Usuario no identificado');
                    return;
                  }

                  const result = await saveSantaBrainData(data, currentUser.id);
                  
                  if (!result.ok) {
                    toast.error(`Error: ${result.message}`);
                    return;
                  }

                  const { successes, failures, accountId: savedAccountId } = result.data;
                  
                  if (successes.length > 0) {
                    const messages = successes.map(s => {
                      if (s.type === 'CUENTA_CREADA') return `✅ Cuenta creada`;
                      return `✅ ${s.type}`;
                    }).join(', ');
                    toast.success(`Guardado: ${messages}`);
                  }
                  
                  if (failures.length > 0) {
                    failures.forEach(f => {
                      toast.error(`❌ ${f.type}: ${f.error}`);
                    });
                    return;
                  }

                  // Llamar a onSaved para actualizar la UI
                  if (onSaved) {
                    onSaved({ 
                      accountId: savedAccountId,
                      santaBrainData: data 
                    }, false);
                  }

                  setVoiceData(null);
                  setShowVoiceInput(false);
                  onOpenChange(false);
                  
                  // Forzar reload para ver cambios
                  setTimeout(() => window.location.reload(), 500);
                  
                } catch (error: any) {
                  console.error('Error guardando datos:', error);
                  toast.error('Error inesperado al guardar');
                }
              }}
              onCancel={() => {
                setVoiceData(null);
                setShowVoiceInput(false);
              }}
            />
          </div>
        )}
      </SBDialogContent>
    </SBDialog>
  );
}
