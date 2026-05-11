'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from 'react';
import { WidgetFrame } from './WidgetFrame';
import { Mail, Sparkles, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface SmartMail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  priority: 'high' | 'medium' | 'low';
  category: 'urgent' | 'action' | 'info';
  geminiSummary?: string;
  timestamp: Date;
}

interface SmartMailsWidgetProps {
  mails?: SmartMail[];
  isLoading?: boolean;
}

export function SmartMailsWidget({ 
  mails = [], 
  isLoading = false 
}: SmartMailsWidgetProps) {
  const priorityIcon = {
    high: <AlertCircle size={14} className="text-destructive" />,
    medium: <Clock size={14} className="text-warning" />,
    low: <CheckCircle2 size={14} className="text-muted-foreground" />
  };

  const categoryColors = {
    urgent: 'bg-destructive/10 text-destructive border-destructive/20',
    action: 'bg-[--sb-yellow]/10 text-[--sb-copper] border-[--sb-yellow]/20',
    info: 'bg-[--sb-aqua]/10 text-[--sb-green] border-[--sb-aqua]/20'
  };

  if (isLoading) {
    return (
      <WidgetFrame 
        title="Mails Inteligentes"
      >
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="sb-card-glass-subtle p-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame 
      title="Mails Inteligentes"
      actions={
        mails.length > 0 ? (
          <span className="text-xs bg-[--sb-yellow]/20 text-[--sb-copper] px-2 py-0.5 rounded-full font-medium">
            {mails.length} {mails.length === 1 ? 'mail' : 'mails'}
          </span>
        ) : undefined
      }
    >
      <div className="space-y-2">
        {mails.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Mail size={32} className="mx-auto mb-2 opacity-30" />
            <p>No hay mails importantes</p>
            <p className="text-xs mt-1">Gemini te avisará cuando llegue algo relevante</p>
          </div>
        ) : (
          mails.map(mail => (
            <div 
              key={mail.id}
              className="sb-card-glass-subtle p-3 hover:scale-[1.02] transition-transform cursor-pointer group"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-shrink-0 mt-0.5">
                  {priorityIcon[mail.priority]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold truncate">{mail.from}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${categoryColors[mail.category]}`}>
                      {mail.category === 'urgent' ? 'Urgente' : mail.category === 'action' ? 'Acción' : 'Info'}
                    </span>
                  </div>
                  <p className="text-xs font-medium mb-1 truncate group-hover:text-[--sb-copper] transition-colors">
                    {mail.subject}
                  </p>
                  {mail.geminiSummary && (
                    <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-[--sb-yellow]/5 border border-[--sb-yellow]/10">
                      <Sparkles size={12} className="text-[--sb-yellow] flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {mail.geminiSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Clock size={10} />
                {new Date(mail.timestamp).toLocaleString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
            </div>
          ))
        )}
      </div>
      
      {mails.length > 0 && (
        <button className="w-full mt-3 text-xs text-[--sb-copper] hover:underline font-medium">
          Ver todos los mails →
        </button>
      )}
    </WidgetFrame>
  );
}
