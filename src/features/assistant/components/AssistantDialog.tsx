"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '@/lib/dataprovider';
import { useAssistant } from './AssistantProvider';
import type { SantaData } from '@/domain/ssot';
import type { Message } from 'genkit';
import Image from 'next/image';
import { Send, User, Bot, Loader } from 'lucide-react';
import { parseNoteToAction } from '../../santabrain/lib/engine';
import {
  findSimilarAccounts,
  assessDuplicateRisk
} from '../../santabrain/lib/helpers';
import type { ParseResult, BrainContext } from '@/features/santabrain/lib/types';

const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

// Utilidad para capturar geolocalización (si el usuario da permiso)
async function getBrowserLocation(): Promise<{lat:number; lng:number} | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 4000 }
    );
  });
}

export function AssistantDialog() {
  const { isOpen, closeAssistant } = useAssistant();
  const { data, currentUser } = useData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeResultRef = useRef<ParseResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInputValue('');
      activeResultRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed === '' || isThinking) return;

    const userMessage: Message = { role: 'user', content: [{text: trimmed}] };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    await new Promise(res => setTimeout(res, 250));

    try {
      if (!currentUser || !data) throw new Error("Contexto no disponible");

      const result = parseNoteToAction(trimmed, data as SantaData);
      activeResultRef.current = result;

      // --- DUPLICATE DETECTION LOGIC ---
      if (result.kind === 'PEDIDO' && result.isNewAccount) {
        const candidateName = result.accountName!.trim();
        const currentLocation = await getBrowserLocation();
  
        const matches = findSimilarAccounts({
          data: { accounts: data.accounts, parties: data.parties },
          candidateName,
          candidateLoc: currentLocation,
          minNameSim: 0.45,
          radiusM: 1200
        });
        
        const decision = assessDuplicateRisk(matches);

        if (decision.action === 'BLOCK_AUTO_CREATE') {
          const botMessage: Message = {
            id: Date.now(),
            type: 'bot',
            content: (
              <div className="p-4 space-y-2">
                <p className="text-red-600 font-medium">⚠️ Posible duplicado — no se creará automáticamente.</p>
                <p className="text-sm text-muted-foreground">{decision.reason}</p>
                <ul className="text-sm list-disc pl-5">
                  {decision.matches.map(m => (
                    <li key={m.accountId}>
                      <button className="underline">
                        Vincular con “{m.accountName}”
                      </button>
                      {typeof m.distanceM === 'number' && <span> — {m.distanceM|0} m</span>}
                    </li>
                  ))}
                </ul>
                <button className="text-sm text-blue-600 underline">
                  Crear igualmente (forzar)
                </button>
              </div>
            )
          } as Message;
          setMessages(prev => [...prev, botMessage]);
          setIsThinking(false);
          return;
        }
      }

      // --- END DUPLICATE DETECTION ---

      let botResponseText = '';
      if(result.kind === 'PEDIDO') {
        botResponseText = `OK. He detectado un pedido de ${result.qtyCases} cajas para "${result.accountName}".\n¿Quieres que lo confirme y lo añada al sistema?`;
      } else if (result.kind === 'VISITA') {
        botResponseText = `Entendido. He registrado una visita para "${result.accountName}" para el ${result.when ? new Date(result.when).toLocaleDateString() : 'hoy'}.`;
      } else if (result.kind === 'EVENTO_MKT') {
        botResponseText = `Hecho. Registrado un evento de marketing en "${result.accountId}" con la descripción: "${result.description}".`;
      } else {
        botResponseText = `No he entendido la petición. ¿Puedes reformularla?`;
      }
      const botResponse: Message = { id: Date.now() + 1, type: 'bot', content: [{text: botResponseText}] } as Message;
      setMessages(prev => [...prev, botResponse]);

    } catch (error) {
      console.error("Error processing command:", error);
      const errorMessage: Message = { id: Date.now() + 1, type: 'bot', content: [{text: `Lo siento, ha ocurrido un error.`}] } as Message;
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  }, [inputValue, isThinking, currentUser, data]);

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

        <main className="flex-1 p-4 overflow-y-auto chat-container" aria-live="polite">
          {messages.map(msg => (
            <div key={msg.id} className={`flex mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`${msg.type === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card rounded-bl-none'} rounded-xl shadow-md max-w-lg`}>
                <div className="p-4">{msg.content[0].text}</div>
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start mb-6">
              <div className="bg-card rounded-xl rounded-bl-none p-4 max-w-lg w-full border border-border shadow-sm">
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
            <button type="submit" disabled={isThinking || inputValue.trim()===''} className="ml-2 px-4 py-2 bg-primary rounded-lg font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Enviar
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
