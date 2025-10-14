// src/features/quicklog/components/QuickLogChat.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputState = 'idle' | 'recording' | 'processing' | 'reviewing' | 'error';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ProcessedMessage {
  rawText: string;
  accountName: string;
  accountId?: string;
  isNewAccount: boolean;
  actions: Array<{
    type: 'PEDIDO' | 'EVENTO' | 'POS' | 'VISITA' | 'RECORDATORIO' | 'OTRO';
    what: string;
    details: string;
    date?: string;
    time?: string;
  }>;
}

interface QuickLogChatProps {
  onSend: (text: string, voiceUrl?: string) => Promise<void>;
  onCancel?: () => void;
  processedData?: ProcessedMessage | null;
  onSaveData?: (data: ProcessedMessage) => Promise<void>;
  onCancelReview?: () => void;
}

export function QuickLogChat({ 
  onSend, 
  onCancel,
  processedData,
  onSaveData,
  onCancelReview
}: QuickLogChatProps) {
  const [inputText, setInputText] = useState('');
  const [inputState, setInputState] = useState<InputState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editedData, setEditedData] = useState<ProcessedMessage | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Actualizar editedData cuando processedData cambia
  useEffect(() => {
    if (processedData) {
      setEditedData(processedData);
    }
  }, [processedData]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || inputState === 'processing') return;
    
    const userMessage = inputText.trim();
    const timestamp = new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp
    }]);

    setInputText('');
    setInputState('processing');
    setError(null);
    
    try {
      await onSend(userMessage);
      
      // No mostrar confirmación, solo si hay error
      setInputState('reviewing');
    } catch (err: any) {
      setError(err.message || 'Error al procesar');
      setInputState('error');
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ ' + (err.message || 'Error al procesar'),
        timestamp: new Date().toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        try {
          // Transcribir con Whisper
          setInputState('processing');
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '🎤 Transcribiendo audio...',
            timestamp: new Date().toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }]);
          
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al transcribir');
          }
          
          const { text } = await response.json();
          
          // Mostrar transcripción en el chat
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ Transcripción: "${text}"`,
            timestamp: new Date().toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }]);
          
          // Auto-enviar la transcripción
          setInputText(text);
          setInputState('idle');
          
          // Enviar automáticamente después de un pequeño delay
          setTimeout(async () => {
            try {
              await onSend(text);
              
              // No mostrar confirmación, solo si hay error
              setInputText('');
              setInputState('reviewing');
            } catch (err: any) {
              setError(err.message || 'Error al procesar');
              setInputState('error');
              
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ ' + (err.message || 'Error al procesar'),
                timestamp: new Date().toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              }]);
            }
          }, 500);
          
        } catch (err: any) {
          console.error('Error transcribiendo:', err);
          setError('Error al transcribir el audio');
          setInputState('error');
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setInputState('recording');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setInputState('idle');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-muted/30 to-background">
      {/* Header */}
      <div className="sb-header-glass flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <h2 className="font-semibold text-base">🧠 QuickLog</h2>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-muted rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Escribe o habla para registrar una acción rápidamente
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex animate-in slide-in-from-bottom-2 duration-300",
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm",
                    "transition-all duration-200 hover:shadow-md",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm"
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <span className={cn(
                    "text-[10px] mt-1 block",
                    msg.role === 'user' 
                      ? "text-primary-foreground/70" 
                      : "text-muted-foreground"
                  )}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {inputState === 'processing' && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2">
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
                         style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
                         style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" 
                         style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Formulario Inline Editable */}
            {editedData && onSaveData && onCancelReview && (
              <div className="flex justify-start animate-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-[85%] bg-card border-2 border-primary/20 rounded-2xl rounded-bl-sm shadow-lg p-3 space-y-2">
                  {/* Header con badge */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">✅ Revisar</div>
                      {editedData.isNewAccount ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                          🆕 Nueva
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                          ✓ Existente
                        </span>
                      )}
                    </div>
                    <button onClick={onCancelReview} className="p-1 hover:bg-muted rounded-full">
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Cliente editable */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Cliente</label>
                    <input
                      type="text"
                      value={editedData.accountName}
                      onChange={(e) => setEditedData({ ...editedData, accountName: e.target.value })}
                      className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>

                  {/* Acciones editables */}
                  {editedData.actions.map((action, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-2 space-y-1.5">
                      <div className="text-[10px] font-semibold text-muted-foreground">
                        {action.type === 'PEDIDO' && '🛒 PEDIDO'}
                        {action.type === 'EVENTO' && '🎉 EVENTO'}
                        {action.type === 'RECORDATORIO' && '⏰ RECORDATORIO'}
                        {action.type === 'VISITA' && '👤 VISITA'}
                        {action.type === 'POS' && '📦 MATERIAL POS'}
                      </div>
                      
                      <input
                        type="text"
                        value={action.what}
                        onChange={(e) => {
                          const newActions = [...editedData.actions];
                          newActions[i] = { ...newActions[i], what: e.target.value };
                          setEditedData({ ...editedData, actions: newActions });
                        }}
                        placeholder="¿Qué?"
                        className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      
                      {action.type === 'PEDIDO' && (
                        <>
                          <input
                            type="text"
                            value={action.details}
                            onChange={(e) => {
                              const newActions = [...editedData.actions];
                              newActions[i] = { ...newActions[i], details: e.target.value };
                              setEditedData({ ...editedData, actions: newActions });
                            }}
                            placeholder="Productos (ej: Santa Brisa 750ml)"
                            className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <div className="text-[10px] text-muted-foreground">
                            📦 Asignado a: Distribuidor
                          </div>
                        </>
                      )}
                      
                      {action.type === 'RECORDATORIO' && (
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="date"
                            value={action.date || ''}
                            onChange={(e) => {
                              const newActions = [...editedData.actions];
                              newActions[i] = { ...newActions[i], date: e.target.value };
                              setEditedData({ ...editedData, actions: newActions });
                            }}
                            className="text-[10px] px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <input
                            type="time"
                            value={action.time || '09:00'}
                            onChange={(e) => {
                              const newActions = [...editedData.actions];
                              newActions[i] = { ...newActions[i], time: e.target.value };
                              setEditedData({ ...editedData, actions: newActions });
                            }}
                            className="text-[10px] px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                      )}
                      
                      {(action.type === 'EVENTO' || action.type === 'VISITA') && (
                        <>
                          <textarea
                            value={action.details}
                            onChange={(e) => {
                              const newActions = [...editedData.actions];
                              newActions[i] = { ...newActions[i], details: e.target.value };
                              setEditedData({ ...editedData, actions: newActions });
                            }}
                            placeholder="Detalles..."
                            rows={2}
                            className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                          />
                          <input
                            type="date"
                            value={action.date || ''}
                            onChange={(e) => {
                              const newActions = [...editedData.actions];
                              newActions[i] = { ...newActions[i], date: e.target.value };
                              setEditedData({ ...editedData, actions: newActions });
                            }}
                            className="text-[10px] px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </>
                      )}
                    </div>
                  ))}

                  {/* Botones */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onSaveData(editedData)}
                      className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={onCancelReview}
                      className="px-3 py-1.5 border rounded-lg hover:bg-muted/50 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 animate-in slide-in-from-bottom-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-destructive">Error</div>
            <div className="text-xs text-destructive/80 mt-0.5">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-destructive/10 rounded transition-colors"
          >
            <X className="h-3 w-3 text-destructive" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border/40 bg-card/50 backdrop-blur-sm p-4">
        <div className="relative flex items-end gap-2">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe aquí..."
              disabled={inputState === 'processing' || isRecording}
              className={cn(
                "w-full min-h-[44px] max-h-[120px] resize-none",
                "rounded-2xl border bg-background/60 backdrop-blur-sm",
                "px-4 py-3 pr-24",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                "text-sm leading-5 placeholder:text-muted-foreground/60",
                "transition-all",
                isRecording && "bg-red-50 border-red-300 ring-2 ring-red-200",
                inputState === 'processing' && "opacity-50 cursor-not-allowed",
                "border-border/60 hover:border-border"
              )}
              rows={1}
            />
            
            {/* Voice Button */}
            <button
              onClick={toggleRecording}
              disabled={inputState === 'processing'}
              className={cn(
                "absolute right-12 bottom-2.5",
                "p-2 rounded-full",
                "transition-all duration-200",
                isRecording
                  ? "bg-red-500 text-white shadow-lg listening-pulse"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground hover:scale-110",
                inputState === 'processing' && "opacity-50 cursor-not-allowed"
              )}
              title={isRecording ? 'Detener grabación' : 'Grabar voz'}
            >
              <Mic className="h-4 w-4" />
            </button>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || inputState === 'processing' || isRecording}
              className={cn(
                "absolute right-2 bottom-2.5",
                "p-2 rounded-full",
                "transition-all duration-200",
                inputText.trim() && inputState !== 'processing' && !isRecording
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              title="Enviar"
            >
              {inputState === 'processing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        {inputState === 'processing' && (
          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 animate-in slide-in-from-bottom-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Procesando con AI...</span>
          </div>
        )}
        
        {isRecording && (
          <div className="text-xs text-red-600 mt-2 flex items-center gap-2 animate-in slide-in-from-bottom-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-medium">Grabando... (toca de nuevo para detener)</span>
          </div>
        )}
      </div>
    </div>
  );
}
