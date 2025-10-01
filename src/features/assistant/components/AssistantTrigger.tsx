"use client";
import React from 'react';
import { useAssistant } from '@/features/assistant/components/AssistantProvider';

const BrainIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15A2.5 2.5 0 0 1 9.5 22h-3A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2h3Z" />
        <path d="M14.5 2a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 2.5 2.5h3A2.5 2.5 0 0 0 20 19.5v-15A2.5 2.5 0 0 0 17.5 2h-3Z" />
    </svg>
);

export function AssistantTrigger() {
    const { openAssistant } = useAssistant();
    return (
        <button
            onClick={openAssistant}
            className="fixed bottom-20 right-6 z-40 h-14 w-14 rounded-full bg-zinc-900 text-white shadow-lg flex items-center justify-center hover:bg-zinc-700 transition-all duration-300 transform hover:scale-110"
            aria-label="Abrir Asistente de IA"
        >
            <BrainIcon />
        </button>
    );
}
