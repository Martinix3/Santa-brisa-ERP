/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/quicklog/components/VoiceRecorder.tsx
"use client";

import { useState, useRef } from 'react';
import { Mic, StopCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

type RecordingStatus = 'idle' | 'recording' | 'transcribing' | 'processing' | 'error';

interface ProcessedData {
  userInput: string;
  structuredData: {
    accountName: string;
    isNewAccount: boolean;
    actions: Array<{
      type: 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS';
      date: string | null;
      details: any;
    }>;
    rawTranscript: string;
  };
}

// Componente de UI simplificado
interface VoiceRecorderProps {
  onNewData: (data: ProcessedData) => void;
}

export function VoiceRecorder({ onNewData }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    // Prevenir inicio si ya está procesando
    if (status !== 'idle') {
      console.warn('Ya hay una operación en curso');
      return;
    }

    try {
      console.log('1. Solicitando acceso al micrófono...');
      
      // Verificar soporte del navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta grabación de audio');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      console.log('2. ✅ Acceso concedido. Stream:', stream);
      console.log('3. Creando MediaRecorder...');
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      console.log('4. ✅ MediaRecorder creado');

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('5. Data disponible, tamaño:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('6. Grabación detenida. Chunks:', audioChunksRef.current.length);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('7. Blob creado, tamaño:', audioBlob.size);
          
          // Detener el stream
          stream.getTracks().forEach((track) => track.stop());
          
          // Validar que no esté vacío
          if (audioBlob.size === 0) {
            toast.error('La grabación está vacía. Por favor habla más tiempo.');
            setStatus('idle');
            return;
          }
          
          await processAudio(audioBlob);
        } catch (err) {
          console.error('Error en onstop:', err);
          toast.error('Error al procesar la grabación');
          setStatus('idle');
        }
      };

      mediaRecorderRef.current.onerror = (event: any) => {
        console.error('❌ Error en MediaRecorder:', event);
        toast.error('Error durante la grabación');
        stream.getTracks().forEach((track) => track.stop());
        setStatus('idle');
      };

      console.log('8. Iniciando grabación...');
      mediaRecorderRef.current.start();
      setStatus('recording');
      toast.info('🎤 Grabando... Habla ahora');
      console.log('9. ✅ Grabación iniciada correctamente');
      
    } catch (err: any) {
      console.error('❌ ERROR en startRecording:', err);
      
      // Manejo específico de errores de permisos
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('🔒 Permiso de micrófono denegado. Ve a configuración del navegador y permite el acceso al micrófono.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('🎤 No se encontró ningún micrófono. Conecta un micrófono y vuelve a intentar.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast.error('⚠️ El micrófono está siendo usado por otra aplicación. Cierra otras apps que usen el micrófono.');
      } else if (err.name === 'OverconstrainedError') {
        toast.error('⚙️ Configuración de audio no compatible. Intenta con otro micrófono.');
      } else if (err.name === 'SecurityError') {
        toast.error('🔒 Error de seguridad. Asegúrate de usar HTTPS o localhost.');
      } else {
        toast.error(`❌ Error: ${err.message || 'No se pudo iniciar la grabación'}`);
      }
      
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const stopRecording = () => {
    try {
      console.log('10. Deteniendo grabación...');
      if (mediaRecorderRef.current && status === 'recording') {
        mediaRecorderRef.current.stop();
        console.log('11. Stop() llamado');
      } else {
        console.warn('No hay grabación activa para detener');
      }
    } catch (err) {
      console.error('Error al detener grabación:', err);
      toast.error('Error al detener la grabación');
      setStatus('idle');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Transcribir
      setStatus('transcribing');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      console.log('Enviando audio a /api/transcribe...');
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const error = await transcribeRes.json();
        throw new Error(error.details || 'Error al transcribir');
      }

      const { transcript } = await transcribeRes.json();
      console.log('Transcripción:', transcript);

      // Procesar
      setStatus('processing');
      console.log('Enviando a /api/process-note...');
      const processRes = await fetch('/api/process-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript }),
      });

      if (!processRes.ok) {
        const error = await processRes.json();
        throw new Error(error.details || 'Error al procesar');
      }

      const structuredData = await processRes.json();
      console.log('Datos estructurados:', structuredData);

      // Éxito
      onNewData({
        userInput: transcript,
        structuredData,
      });
      setStatus('idle');
      toast.success('✅ Nota procesada correctamente');
    } catch (error: any) {
      console.error('Error procesando audio:', error);
      toast.error(error.message || 'Error al procesar la nota');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const isLoading = status === 'transcribing' || status === 'processing';
  
  const statusMessages = {
    transcribing: 'Transcribiendo...',
    processing: 'Santa Brain procesando...',
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-full border border-blue-200">
        <Loader className="animate-spin h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium text-blue-700">
          {statusMessages[status as 'transcribing' | 'processing']}
        </span>
      </div>
    );
  }

  // Estado grabando
  if (status === 'recording') {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="flex items-center justify-center gap-2 bg-red-600 text-white font-semibold px-6 py-4 rounded-full shadow-lg hover:bg-red-700 transition-all animate-pulse"
        aria-label="Detener grabación"
      >
        <StopCircle className="h-6 w-6" />
        <span>Detener</span>
      </button>
    );
  }

  // Estado idle - botón para iniciar
  return (
    <button
      type="button"
      onClick={startRecording}
      className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-105"
      aria-label="Iniciar grabación"
    >
      <Mic className="h-6 w-6" />
      <span>Nota de Voz</span>
    </button>
  );
}
