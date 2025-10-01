// src/features/assistant/components/AssistantDialog.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAssistant } from './AssistantProvider';
import { useData } from '@/lib/dataprovider';
import { runSantaBrain } from '@/ai/flows/santa-brain-flow';
import type { Message } from 'genkit';
import { Send, User as UserIcon, Bot, Loader, X } from 'lucide-react';
import Image from 'next/image';

export function AssistantDialog() {
  const { isOpen, closeAssistant } = useAssistant();
  const { data, currentUser, saveAllCollections } = useData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !data || !currentUser) return;

    const userMessage: Message = { role: 'user', content: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const augmentedContext = {
        users: data.users || [],
        accounts: data.accounts || [],
        parties: data.parties || [],
        currentUser: currentUser,
      };

      const result = await runSantaBrain(messages, currentInput, augmentedContext);
      
      const assistantMessage: Message = { role: 'model', content: [{ text: result.finalAnswer }] };
      setMessages(prev => [...prev, assistantMessage]);

      if (result.newEntities && Object.keys(result.newEntities).length > 0) {
        await saveAllCollections(result.newEntities);
        toast.success('¡Entidades creadas por Santa Brain!');
      }

    } catch (error: any) {
      console.error("Error calling Santa Brain flow:", error);
      const errorMessage: Message = { role: 'model', content: [{ text: `Lo siento, ha ocurrido un error: ${error.message}` }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, data, currentUser, messages, saveAllCollections]);
  

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={closeAssistant}
    >
      <div 
        className="w-[90vw] max-w-lg h-[80vh] bg-zinc-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b bg-white flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
                <Image
                    src="https://picsum.photos/seed/santabrain/32/32"
                    alt="Santa Brain Avatar"
                    width={32}
                    height={32}
                    className="object-cover"
                    data-ai-hint="woman sunglasses"
                />
            </div>
            <h2 className="font-semibold text-zinc-800">Santa Brain Assistant</h2>
          </div>
          <button onClick={closeAssistant} className="p-1 rounded-md hover:bg-zinc-100 text-zinc-500"><X size={18}/></button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role !== 'user' && (
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
                            <Image
                                src="https://picsum.photos/seed/santabrain/32/32"
                                alt="Santa Brain Avatar"
                                width={32}
                                height={32}
                                className="object-cover"
                            />
                        </div>
                    )}
                    <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-yellow-400 text-black' : 'bg-white border'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content[0].text}</p>
                    </div>
                    {msg.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center"><UserIcon size={18} /></div>}
                </div>
            ))}
            {isLoading && (
                 <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
                         <Image
                            src="https://picsum.photos/seed/santabrain/32/32"
                            alt="Santa Brain Avatar"
                            width={32}
                            height={32}
                            className="object-cover"
                        />
                    </div>
                    <div className="max-w-md p-3 rounded-2xl bg-white border flex items-center gap-2">
                       <Loader size={16} className="animate-spin text-zinc-500" />
                       <span className="text-sm text-zinc-500">Pensando...</span>
                    </div>
                </div>
            )}
            <div ref={endOfMessagesRef} />
        </main>
        
        <footer className="p-4 bg-white border-t">
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Pide a Santa Brain lo que necesites..."
                    className="w-full pl-4 pr-12 py-3 rounded-full bg-zinc-100 border border-zinc-200 outline-none focus:ring-2 focus:ring-yellow-400"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-yellow-400 text-black rounded-full flex items-center justify-center disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
}
