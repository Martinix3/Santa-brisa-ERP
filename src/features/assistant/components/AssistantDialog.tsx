"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '@/lib/dataprovider'; 
import { parseNoteToAction } from '@/features/santabrain/lib/engine';
import type { ParseResult, BrainContext } from '@/features/santabrain/lib/types';
import { useAssistant } from './AssistantProvider';

// --- Iconos ---
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

// --- Tipos de Mensajes y Datos ---
type Message = { id: number; type: 'user' | 'bot' | 'thinking'; content: React.ReactNode; originalText?: string };
type OrderData = { customer: string; isNew: boolean; items: string; location: string; distributor: string; notes: string; };

// --- Componente de Tarjeta de Pedido (simplificado) ---
const OrderCard = ({ data, onEdit }: { data: OrderData; onEdit: () => void }) => {
  return (
    <div className="bg-card rounded-xl rounded-bl-none p-4 max-w-lg w-full border border-border shadow-sm" role="group" aria-label="Tarjeta de pedido">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-accent">NUEVO PEDIDO</p>
          <p className="text-lg font-bold text-text-primary">
            {data.customer} {data.isNew && <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 ml-1">Cuenta Nueva</span>}
          </p>
          <p className="text-text-secondary">{data.items}</p>
          <p className="text-sm text-muted-foreground">Lugar: {data.location}</p>
          {data.distributor && <p className="text-xs text-muted-foreground">Distribuidor: {data.distributor}</p>}
          {data.notes && <p className="text-xs text-muted-foreground mt-1">Notas: {data.notes}</p>}
        </div>
        <div className="flex flex-col space-y-2 items-end">
          <button aria-label="Confirmar pedido" onClick={() => alert('Pedido Confirmado')} className="p-2 bg-primary text-primary-foreground hover:opacity-90 rounded-full transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><CheckIcon /></button>
          <button aria-label="Editar" onClick={onEdit} className="p-2 bg-secondary text-secondary-foreground hover:bg-muted rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><PencilIcon /></button>
          <button aria-label="Cancelar pedido" onClick={() => alert('Pedido Cancelado')} className="p-2 bg-destructive text-destructive-foreground hover:opacity-90 rounded-full transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><TrashIcon /></button>
        </div>
      </div>
    </div>
  );
};

// --- Función "Traductora" ---
function mapResultToComponent(result: ParseResult, onEdit: (text: string) => void): React.ReactNode {
  switch (result.kind) {
    case 'PEDIDO': {
      const orderData: OrderData = {
        customer: result.accountName,
        isNew: result.isNewAccount,
        items: `${result.qtyCases} cajas, ${result.itemId || 'SKU por defecto'}`,
        location: result.location || 'Ubicación desconocida',
        distributor: result.distributorName || '',
        notes: result.summary || ''
      };
      return <OrderCard data={orderData} onEdit={() => onEdit(result.summary)} />;
    }
    default:
      return <p>Acción reconocida: {result.kind}.</p>;
  }
}

// --- Componente Principal del Asistente ---
export function AssistantDialog() {
  const { isOpen, closeAssistant } = useAssistant();
  const { data, currentUser } = useData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInputValue('');
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleEdit = (text: string) => {
    setInputValue(text);
    // Opcional: eliminar el último bot para editar su contenido
    setMessages(prev => prev.filter((m, i) => i < prev.length - 1));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed === '' || isThinking) return;

    const userMessage: Message = { id: Date.now(), type: 'user', content: <p>{trimmed}</p> };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    // pequeño delay visual
    await new Promise(res => setTimeout(res, 300));

    try {
      if (!currentUser || !data) throw new Error('Contexto no disponible');
      const result = parseNoteToAction(trimmed, data as any);
      const botContent = mapResultToComponent(result as any, handleEdit);
      const botResponse: Message = { id: Date.now() + 1, type: 'bot', content: botContent, originalText: trimmed };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error("Error processing command:", error);
      const errorMessage: Message = { id: Date.now() + 1, type: 'bot', content: <p className="text-destructive">Lo siento, ha ocurrido un error.</p> };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={closeAssistant} role="dialog" aria-modal="true" aria-label="Asistente Santa Brain">
      <div className="flex flex-col h-[90vh] max-h-[700px] w-[95vw] max-w-[600px] bg-secondary rounded-xl shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
        <header className="bg-card shadow-sm p-4 flex items-center justify-between border-b border-border shrink-0 rounded-t-xl">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Asistente Santa Brain</h1>
            <p className="text-sm text-green-600">En línea</p>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto chat-container">
          {messages.map(msg => (
            <div key={msg.id} className={`flex mb-6 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`${msg.type === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : ''} rounded-xl shadow-md max-w-lg`}>
                {(msg.content as any).type === 'p' ? <div className="p-4">{msg.content}</div> : msg.content}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start mb-6">
              <div className="bg-card rounded-xl rounded-bl-none p-4 max-w-lg w-full border border-border shadow-sm" aria-live="polite">
                <p className="text-muted-foreground italic animate-pulse">Santa Brain está pensando...</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </main>

        <footer className="p-4 bg-secondary border-t border-border shrink-0 rounded-b-xl">
          <form onSubmit={handleSendMessage} className="flex items-center bg-card rounded-xl p-2 border border-border">
            <label htmlFor="assistant-input" className="sr-only">Escribe un comando</label>
            <input
              id="assistant-input"
              type="text"
              placeholder="Escribe un comando..."
              className="flex-1 bg-transparent focus:outline-none px-2 text-foreground"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isThinking}
              autoComplete="off"
            />
            <button type="button" className="p-2 text-muted-foreground hover:text-foreground" aria-label="Adjuntar archivo"><PaperclipIcon /></button>
            <button type="button" className="p-2 text-muted-foreground hover:text-foreground" aria-label="Abrir cámara"><CameraIcon /></button>
            <button type="submit" disabled={isThinking || inputValue.trim()===''} className="ml-2 px-4 py-2 bg-primary rounded-lg font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Enviar
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
