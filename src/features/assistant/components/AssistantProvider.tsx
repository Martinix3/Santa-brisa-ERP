// This component has been disconnected.
"use client";
import React, { createContext, useContext, ReactNode } from 'react';

type AssistantContextType = {
  isOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
};

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export const useAssistant = () => {
  return {
    isOpen: false,
    openAssistant: () => console.warn("Assistant feature is disconnected."),
    closeAssistant: () => console.warn("Assistant feature is disconnected."),
  };
};
