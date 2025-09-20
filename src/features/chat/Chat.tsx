
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, Bot, Loader, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Account, Product, SantaData, OrderSellOut, Interaction, InventoryItem, EventMarketing, User as UserType } from '@/domain/ssot';
import { Message } from 'genkit';
import { runSantaBrain } from '@/ai/flows/santa-brain-flow';
import { useData } from '@/lib/dataprovider';
import Image from 'next/image';


type ChatProps = {
    userId: string;
    onNewData: (data: Partial<SantaData>) => void;
};

export function Chat({ userId, onNewData }: ChatProps) {
    const { data, currentUser } = useData();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading || !data || !currentUser) return;

        const userMessage: Message = { role: 'user', content: [{text: input}] };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const context = {
                users: data.users as UserType[],
                accounts: data.accounts as Account[],
                currentUser: currentUser,
            };

            const { finalAnswer, newEntities } = await runSantaBrain(
                messages, 
                input,
                context
            );

            const assistantMessage: Message = { role: 'model', content: [{text: finalAnswer}] };
            setMessages(prev => [...prev, assistantMessage]);
            
            if (Object.keys(newEntities).length > 0) {
                onNewData(newEntities);
            }

        } catch (error) {
            console.error("Error running Santa Brain:", error);
            const errorMessage: Message = { role: 'model', content: [{text: "Lo siento, ha ocurrido un error. Revisa la consola para más detalles."}] };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, onNewData, data, currentUser]);

    return (
        <div className="flex flex-col h-full bg-zinc-100">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                    data-ai-hint="woman sunglasses"
                                />
                            </div>
                        )}
                        <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-yellow-400 text-black' : 'bg-white border'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content[0].text}</p>
                        </div>
                        {msg.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center"><User size={18} /></div>}
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
                                data-ai-hint="woman sunglasses"
                            />
                        </div>
                        <div className="max-w-md p-3 rounded-2xl bg-white border flex items-center gap-2">
                           <Loader size={16} className="animate-spin text-zinc-500" />
                           <span className="text-sm text-zinc-500">Pensando...</span>
                        </div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>
            <div className="flex-shrink-0 p-4 bg-white border-t">
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
            </div>
        </div>
    );
}
