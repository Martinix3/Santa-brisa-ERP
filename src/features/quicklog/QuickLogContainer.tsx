// src/features/quicklog/QuickLogContainer.tsx
"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { QuickLogChat } from './components/QuickLogChat';
import { processMessage, type ProcessedMessage } from './actions/process-message';
import { saveSantaBrainData } from '@/server/actions/santa-brain.actions';

interface QuickLogContainerProps {
  userId: string;
  onClose?: () => void;
}

export function QuickLogContainer({ userId, onClose }: QuickLogContainerProps) {
  const [processedData, setProcessedData] = useState<ProcessedMessage | null>(null);

  const handleSendMessage = async (text: string) => {
    try {
      // Procesar mensaje con Gemini + Algolia
      const result = await processMessage(text, userId);
      
      // Pasar data al chat para mostrar inline
      setProcessedData(result);
      
    } catch (error: any) {
      console.error('Error procesando mensaje:', error);
      
      // Si es error de red o API, mostrar opciones
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Sin conexión. Por favor verifica tu internet.');
      } else if (error.message.includes('API')) {
        throw new Error('Servicio temporalmente no disponible. Intenta de nuevo.');
      } else {
        throw new Error('Error al procesar el mensaje. Intenta modo manual.');
      }
    }
  };

  const handleSaveData = async (data: ProcessedMessage) => {
    try {
      // Mapear acciones al formato de saveSantaBrainData
      const actions = data.actions
        .filter(a => ['VISITA', 'PEDIDO', 'EVENTO', 'POS'].includes(a.type))
        .map(action => ({
          type: action.type as 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS',
          what: action.what || '',
          details: action.details || '',
          date: action.date || null,
          scheduledDate: action.scheduledDate || null,
        }));
      
      // Usar saveSantaBrainData
      const result = await saveSantaBrainData({
        accountName: data.accountName,
        accountId: data.accountId, // Pasar ID si ya existe
        isNewAccount: !data.accountId,
        actions,
        rawTranscript: data.rawText
      }, userId);
      
      if (!result.ok) {
        throw new Error(result.message);
      }
      
      const { successes, failures } = result.data;
      
      if (successes.length > 0) {
        const messages = successes.map(s => {
          if (s.type === 'CUENTA_CREADA') return `Cuenta creada`;
          return s.type;
        }).join(', ');
        toast.success(`✅ Guardado: ${messages}`);
      }
      
      if (failures.length > 0) {
        failures.forEach(f => toast.error(`❌ ${f.type}: ${f.error}`));
      }
      
      // Resetear
      setProcessedData(null);
      
      // Cerrar si hay callback
      if (onClose) {
        setTimeout(onClose, 500);
      }
      
    } catch (error: any) {
      console.error('Error guardando:', error);
      toast.error('Error al guardar: ' + error.message);
    }
  };

  const handleCancelReview = () => {
    setProcessedData(null);
  };

  return (
    <div className="h-full flex flex-col">
      <QuickLogChat
        onSend={handleSendMessage}
        onCancel={onClose}
        processedData={processedData}
        onSaveData={handleSaveData}
        onCancelReview={handleCancelReview}
      />
    </div>
  );
}
