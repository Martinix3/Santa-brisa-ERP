
"use client";
import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Calendar } from 'lucide-react';

export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col">
      <ModuleHeader 
        title="Agenda" 
        icon={Calendar}
      />
      <div className="flex-grow min-h-0 bg-secondary">
          {children}
      </div>
    </div>
  );
}
