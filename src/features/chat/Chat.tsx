
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, Bot, Loader } from 'lucide-react';
import type { Message } from 'genkit';
import { useData } from '@/lib/dataprovider';
import Image from 'next/image';
import type { SantaData, SB_THEME } from '@/domain/ssot';

type ChatProps = {
    userId: string;
    onNewData: (data: Partial<SantaData>) => void;
};


export function Chat({ userId, onNewData }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    const cloudFunctionUrl = process.env.NEXT_PUBLIC_SANTA_BRAIN_URL!;

    const scrollToBottom = () => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: [{text: input}] } as Message;
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            if (!cloudFunctionUrl) {
                throw new Error("La URL de la función de Santa Brain no está configurada.");
            }

            const res = await fetch(cloudFunctionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    threadId: 'main-thread',
                    message: currentInput,
                }),
            });

            if (!res.ok) {
                const errorBody = await res.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorBody);
                } catch (e) {
                    throw new Error(errorBody || 'Network response was not ok.');
                }
                throw new Error(errorData.error || 'Network response was not ok.');
            }

            const result = await res.json();
            
            const assistantMessage: Message = { role: 'model', content: [{text: result.text}] } as Message;
            setMessages(prev => [...prev, assistantMessage]);

        } catch (error: any) {
            console.error("Error calling Santa Brain function:", error);
            const errorMessage: Message = { role: 'model', content: [{text: `Lo siento, ha ocurrido un error: ${error.message}`}] } as Message;
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, userId, cloudFunctionUrl]);

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
                        {msg.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center"><User size={18} className="sb-icon" /></div>}
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
                           <Loader size={16} className="sb-icon animate-spin text-zinc-500" />
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
                        className="sb-btn-primary absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-yellow-400 text-black rounded-full flex items-center justify-center disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors"
                    >
                        <Send size={20} className="sb-icon" />
                    </button>
                </div>
            </div>
        </div>
    );
}
