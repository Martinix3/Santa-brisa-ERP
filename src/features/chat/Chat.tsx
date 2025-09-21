
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, Bot, Loader } from 'lucide-react';
import type { Message } from 'genkit';
import { useData } from '@/lib/dataprovider';
import Image from 'next/image';
import type { SantaData } from '@/domain/ssot';


type ChatProps = {
    userId: string;
    onNewData: (data: Partial<SantaData>) => void;
};

// TODO: Replace with your actual Cloud Function URL
const SANTA_BRAIN_URL = 'https://europe-west1-santa-brisa-erp.cloudfunctions.net/santaBrain';

export function Chat({ userId, onNewData }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

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
            const response = await fetch(SANTA_BRAIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    threadId: 'main-thread', // Or a more sophisticated thread management
                    message: currentInput,
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server responded with an error');
            }

            const { text, toolRequests } = await response.json();
            
            // NOTE: In a real app, you would handle the toolRequests by executing them
            // and sending the results back to the function. For this demo, we assume
            // the function handles its own tool loop or gives a final answer.

            const assistantMessage: Message = { role: 'model', content: [{text}] } as Message;
            setMessages(prev => [...prev, assistantMessage]);

            // The function doesn't directly return new entities in this architecture.
            // We would need to re-fetch or use Firestore listeners to see updates.
            // For now, we'll rely on a manual refresh or listeners in useData.

        } catch (error: any) {
            console.error("Error calling Santa Brain function:", error);
            const errorMessage: Message = { role: 'model', content: [{text: `Lo siento, ha ocurrido un error: ${error.message}`}] } as Message;
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, userId]);

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
