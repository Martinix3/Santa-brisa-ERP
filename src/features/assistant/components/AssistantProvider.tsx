// src/features/assistant/components/AssistantProvider.tsx
"use client";
import React, { createContext, useState, useContext, ReactNode } from 'react';

type AssistantContextType = {
  isOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
};

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const openAssistant = () => setIsOpen(true);
  const closeAssistant = () => setIsOpen(false);

  return (
    <AssistantContext.Provider value={{ isOpen, openAssistant, closeAssistant }}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
