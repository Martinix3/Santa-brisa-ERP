// src/features/quicklog/SantaBrainInput.tsx
"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, CheckCircle, XCircle, Send, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/lib/dataprovider';
import type { Contact } from '@/domain/ssot';

type SantaBrainInputProps = {
  onActionComplete?: () => void;
};

type ActionPreview = {
  type: string;
  accountData?: any;
  orderData?: any;
  posTacticData?: any;
  interactionData?: any;
};

type Message = {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  actions?: ActionPreview[];
  timestamp: Date;
};

export function SantaBrainInput({ onActionComplete }: SantaBrainInputProps) {
  const { currentUser, data, saveAllCollections } = useData();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: '👋 Hola! Soy Santa Brain. Cuéntame qué quieres registrar.',
      timestamp: new Date()
    }
  ]);
  const [pendingActions, setPendingActions] = useState<ActionPreview[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !currentUser) return;

    const userMessage = input.trim();
    
    // Añadir mensaje del usuario al chat
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);
    
    setInput('');
    setIsProcessing(true);

    // 🚀 PROCESAMIENTO LOCAL RÁPIDO - Detectar patrones comunes
    const quickMatch = tryQuickMatch(userMessage);
    
    if (quickMatch) {
      // ⚡ Respuesta instantánea para casos simples
      console.log('[Santa Brain] ⚡ Quick match - respuesta instantánea');
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '_response',
          type: 'assistant',
          content: quickMatch.message,
          actions: quickMatch.actions,
          timestamp: new Date()
        }]);

        if (quickMatch.actions && quickMatch.actions.length > 0) {
          setPendingActions(quickMatch.actions);
        }
        
        setIsProcessing(false);
      }, 300); // Pequeño delay para UX natural
      return;
    }

    // Si no match rápido, usar Gemini
    console.log('[Santa Brain] 🤖 Caso complejo - usando Gemini');
    
    try {
      const res = await fetch('/api/santa-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: userMessage,
          userId: currentUser.id
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error procesando la petición');
      }

      const result = await res.json();

      // Añadir respuesta de Santa Brain al chat
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_response',
        type: 'assistant',
        content: result.message,
        actions: result.actions || [],
        timestamp: new Date()
      }]);

      if (result.actions && result.actions.length > 0) {
        setPendingActions(result.actions);
      }

    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_error',
        type: 'assistant',
        content: '❌ ' + (error.message || 'Error procesando tu petición'),
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🚀 QUICK MATCH - Detección local de patrones comunes
  const tryQuickMatch = (text: string): { message: string; actions: ActionPreview[] } | null => {
    const lowerText = text.toLowerCase();

    // Patrón 1: PEDIDOS - "X quiere Y cajas"
    const pedidoMatch = text.match(/([a-záéíóúñ\s]+?)\s+(quiere|pide|necesita)\s+(\d+)\s+(cajas|unidades)/i);
    if (pedidoMatch) {
      const cuenta = pedidoMatch[1].trim();
      const cantidad = parseInt(pedidoMatch[3]);
      
      return {
        message: `✅ Pedido registrado: ${cuenta} - ${cantidad} cajas de Santa Brisa`,
        actions: [{
          type: 'account',
          accountData: {
            name: cuenta,
            stage: 'ACTIVA',
            flow: 'DIRECTA',
            ownerId: currentUser?.id || '',
            segment: 'HORECA'
          }
        }, {
          type: 'order',
          orderData: {
            accountId: 'temp',
            lines: [{ sku: 'santa-brisa', qty: cantidad, uom: 'case' }]
          }
        }]
      };
    }

    // Patrón 2: POS TACTICS - "Llevé X vasos/cubiteras a Y"
    const posMatch = text.match(/llev[eé]\s+(\d+)\s+(vasos|cubiteras|displays)\s+a\s+([a-záéíóúñ\s]+)/i);
    if (posMatch) {
      const cantidad = posMatch[1];
      const material = posMatch[2];
      const cuenta = posMatch[3].trim();
      
      return {
        message: `✅ Registrado POS: ${cuenta} - ${cantidad} ${material}`,
        actions: [{
          type: 'account',
          accountData: {
            name: cuenta,
            stage: 'SEGUIMIENTO',
            flow: 'DIRECTA',
            ownerId: currentUser?.id || '',
            segment: 'HORECA'
          }
        }, {
          type: 'pos_tactic',
          posTacticData: {
            accountId: 'temp',
            description: `${cantidad} ${material}`
          }
        }]
      };
    }

    // Patrón 3: VISITAS - "Visitar a X mañana/el viernes"
    const visitaMatch = text.match(/visitar\s+a\s+([a-záéíóúñ\s]+)\s+(mañana|el\s+\w+)/i);
    if (visitaMatch) {
      const cuenta = visitaMatch[1].trim();
      const cuando = visitaMatch[2];
      
      return {
        message: `✅ Tarea agendada: Visitar a ${cuenta} ${cuando}`,
        actions: [{
          type: 'account',
          accountData: {
            name: cuenta,
            stage: 'SEGUIMIENTO',
            flow: 'DIRECTA',
            ownerId: currentUser?.id || '',
            segment: 'HORECA'
          }
        }, {
          type: 'interaction',
          interactionData: {
            accountId: 'temp',
            kind: 'VISITA',
            note: `Visitar a ${cuenta}`
          }
        }]
      };
    }

    // Patrón 4: RECHAZO - "X dice que no / no le interesa"
    const rechazoMatch = text.match(/([a-záéíóúñ\s]+?)\s+(dice que no|no le interesa|no quiere)/i);
    if (rechazoMatch) {
      const cuenta = rechazoMatch[1].trim();
      
      return {
        message: `✅ Registrado: ${cuenta} no está interesado`,
        actions: [{
          type: 'account',
          accountData: {
            name: cuenta,
            stage: 'FALLIDA',
            flow: 'DIRECTA',
            ownerId: currentUser?.id || '',
            segment: 'HORECA'
          }
        }, {
          type: 'rejection',
          interactionData: {
            accountId: 'temp',
            kind: 'LLAMADA',
            note: 'Cliente rechazó la oferta'
          }
        }]
      };
    }

    // No match - usar Gemini
    return null;
  };

  const handleConfirmActions = async () => {
    if (!data || pendingActions.length === 0) return;

    setIsProcessing(true);

    try {
      // PASO 1: Crear cuentas primero y mapear IDs temporales a reales
      const accountIdMap = new Map<string, string>();
      
      for (const action of pendingActions) {
        if (action.type === 'account') {
          const realAccountId = await executeAction(action);
          if (realAccountId && action.accountData?.id) {
            accountIdMap.set(action.accountData.id, realAccountId);
          }
        }
      }

      // PASO 2: Ejecutar otras acciones con IDs reales
      for (const action of pendingActions) {
        if (action.type !== 'account') {
          // Reemplazar accountId temporal por real
          if (action.orderData?.accountId) {
            const realId = accountIdMap.get(action.orderData.accountId);
            if (realId) action.orderData.accountId = realId;
          }
          if (action.posTacticData?.accountId) {
            const realId = accountIdMap.get(action.posTacticData.accountId);
            if (realId) action.posTacticData.accountId = realId;
          }
          if (action.interactionData?.accountId) {
            const realId = accountIdMap.get(action.interactionData.accountId);
            if (realId) action.interactionData.accountId = realId;
          }
          
          await executeAction(action);
        }
      }

      toast.success('✅ Acciones ejecutadas correctamente');
      setPendingActions([]);
      
      // Mensaje de confirmación
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_confirm',
        type: 'assistant',
        content: '✅ ¡Listo! Todo registrado correctamente.',
        timestamp: new Date()
      }]);

      onActionComplete?.();

    } catch (error: any) {
      console.error('Error ejecutando acciones:', error);
      toast.error(error.message || 'Error ejecutando acciones');
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_error',
        type: 'assistant',
        content: '❌ Error ejecutando acciones: ' + error.message,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAction = async (action: ActionPreview): Promise<string | void> => {
    if (!data) return;

    switch (action.type) {
      case 'account': {
        // Crear nuevo CONTACT (no Account) y retornar ID real
        const realContactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        const newContact: Partial<Contact> = {
          id: realContactId,
          kind: 'ORG',
          roles: ['CUSTOMER'],
          displayName: action.accountData.name,
          legalName: action.accountData.name,
          customer: {
            segment: action.accountData.accountType || 'HORECA',
            placement: action.accountData.flow === 'COLOCACION' ? 'PLACEMENT' : 'DIRECT',
            ownerId: action.accountData.salesRepId || currentUser?.id || '',
            distributorId: action.accountData.distributorId,
          },
          addresses: [],
          emails: [],
          phones: [],
          createdAt: now,
          updatedAt: now,
        };

        const updatedContacts = [...(data.contacts || []), newContact as any];
        saveAllCollections({ contacts: updatedContacts });
        
        console.log('[Santa Brain] ✅ Contact creado:', realContactId);
        return realContactId; // Retornar ID real
      }

      case 'order': {
        // Crear pedido borrador con ID real de cuenta
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newOrder = {
          id: orderId,
          accountId: action.orderData.accountId, // Ya debe ser ID real
          flow: 'PLACEMENT' as const,
          status: 'open' as const,
          lines: action.orderData.lines,
          currency: 'EUR' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdById: currentUser?.id
        };

        console.log('[Santa Brain] ✅ Pedido creado:', { orderId, accountId: action.orderData.accountId });
        const updatedOrders = [...(data.ordersSellOut || []), newOrder];
        saveAllCollections({ ordersSellOut: updatedOrders });
        break;
      }

      case 'pos_tactic': {
        // Crear POS Tactic
        const newPosTactic = {
          id: `pos_${Date.now()}`,
          accountId: action.posTacticData.accountId,
          description: action.posTacticData.description,
          actualCost: 0,
          executionScore: 0,
          status: 'planned' as const,
          createdAt: new Date().toISOString(),
          createdById: currentUser?.id || 'unknown',
          updatedAt: new Date().toISOString()
        };

        const updatedPosTactics = [...(data.posTactics || []), newPosTactic as any];
        saveAllCollections({ posTactics: updatedPosTactics });
        break;
      }

      case 'interaction':
      case 'rejection': {
        // Crear interacción o tarea
        const newInteraction = {
          id: `int_${Date.now()}`,
          userId: currentUser?.id || '',
          accountId: action.interactionData.accountId,
          kind: action.interactionData.kind,
          note: action.interactionData.note,
          plannedFor: action.interactionData.plannedFor,
          createdAt: new Date().toISOString(),
          status: action.interactionData.plannedFor ? 'open' : 'done',
          dept: 'VENTAS' as const
        };

        const updatedInteractions = [...(data.interactions || []), newInteraction as any];
        saveAllCollections({ interactions: updatedInteractions });
        break;
      }
    }
  };

  const getActionDescription = (action: ActionPreview): string => {
    switch (action.type) {
      case 'account':
        return `📍 Nueva cuenta: ${action.accountData.name} (${action.accountData.stage})`;
      case 'order':
        return `📦 Pedido: ${action.orderData.lines[0]?.qty} cajas`;
      case 'pos_tactic':
        return `🎯 POS: ${action.posTacticData.description}`;
      case 'interaction':
        return `📅 Tarea: ${action.interactionData.note}`;
      case 'rejection':
        return `❌ Cliente rechazó`;
      default:
        return 'Acción';
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' ? 'bg-blue-500' : 'bg-primary'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                )}
              </div>

              {/* Message content */}
              <div className="flex flex-col gap-2">
                <div className={`rounded-2xl px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>

                {/* Actions preview */}
                {message.actions && message.actions.length > 0 && (
                  <div className="space-y-2 ml-2">
                    {message.actions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs"
                      >
                        <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">{getActionDescription(action)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <span className="text-xs text-gray-400 px-2">
                  {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action buttons */}
      {pendingActions.length > 0 && !isProcessing && (
        <div className="border-t p-3 bg-green-50">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPendingActions([]);
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  type: 'assistant',
                  content: 'Entendido, acciones canceladas.',
                  timestamp: new Date()
                }]);
              }}
              className="flex-1 px-4 py-2 border-2 border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={handleConfirmActions}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Confirmar acciones
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Escribe aquí... Ej: Bar Paco quiere 3 cajas"
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm"
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || !input.trim()}
            className="w-10 h-10 bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center flex-shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
