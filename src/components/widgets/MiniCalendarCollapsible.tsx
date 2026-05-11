'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from 'react';
import { WidgetFrame } from './WidgetFrame';
import { Calendar } from 'lucide-react';

interface MiniCalendarCollapsibleProps {
  eventsByDay?: Record<number, number>;
  currentMonth?: Date;
}

export function MiniCalendarCollapsible({ 
  eventsByDay = {}, 
  currentMonth = new Date() 
}: MiniCalendarCollapsibleProps) {
  const [open, setOpen] = React.useState(false);
  
  const today = new Date().getDate();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Create calendar grid (6 weeks max)
  const days = Array.from({ length: 35 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
    const visits = isValidDay ? (eventsByDay[dayNumber] || 0) : 0;
    
    return {
      id: `d${i}`,
      date: isValidDay ? dayNumber : null,
      visits,
      isToday: isValidDay && dayNumber === today && 
               month === new Date().getMonth() && 
               year === new Date().getFullYear()
    };
  });
  
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const totalEvents = Object.values(eventsByDay).reduce((sum, count) => sum + count, 0);
  
  return (
    <WidgetFrame 
      title="Calendario de Visitas"
      actions={
        totalEvents > 0 ? (
          <span className="text-xs bg-[--sb-yellow]/20 text-[--sb-copper] px-2 py-0.5 rounded-full font-medium">
            {totalEvents} {totalEvents === 1 ? 'visita' : 'visitas'}
          </span>
        ) : undefined
      }
    >
      {/* Botón solo visible en mobile */}
      <button 
        onClick={() => setOpen(!open)} 
        className="sb-btn sb-btn--secondary sb-btn--sm mb-3 lg:hidden w-full"
      >
        {open ? 'Ocultar calendario' : 'Ver calendario'}
      </button>
      
      {/* Month header */}
      <div className="mb-3 text-sm font-semibold text-center capitalize opacity-80">
        {monthName}
      </div>
      
      {/* Desktop: siempre abierto. Mobile: colapsable */}
      <div className={`${open ? 'max-h-[600px]' : 'max-h-0'} lg:max-h-none overflow-hidden transition-all duration-300 lg:block`}>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 lg:gap-2 mb-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div key={i} className="text-center text-[10px] lg:text-xs font-semibold opacity-50">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5 lg:gap-2">
          {days.map(d => {
            if (d.date === null) {
              return <div key={d.id} className="aspect-square" />;
            }
            
            return (
              <div 
                key={d.id} 
                className={`
                  aspect-square rounded-lg sb-card-glass-subtle relative p-1.5 lg:p-2 
                  transition-all duration-200
                  ${d.isToday ? 'ring-2 ring-[--sb-yellow] bg-[--sb-yellow]/10' : ''}
                  ${d.visits > 0 ? 'hover:scale-105 cursor-pointer hover:shadow-md' : ''}
                `}
              >
                <div className={`
                  text-[11px] lg:text-xs 
                  ${d.isToday ? 'font-bold text-[--sb-yellow]' : 'opacity-70'}
                `}>
                  {d.date}
                </div>
                {d.visits > 0 && (
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="text-[9px] lg:text-[10px] bg-[--sb-yellow]/20 text-[--sb-copper] rounded px-1 py-0.5 text-center font-medium">
                      {d.visits} {d.visits === 1 ? 'visita' : 'visitas'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {totalEvents === 0 && (
          <div className="text-xs opacity-50 mt-3 text-center italic">
            No hay visitas programadas este mes
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
