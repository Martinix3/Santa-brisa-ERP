
'use client';
import React from 'react';
import { addMinutes, addDays, startOfWeek, format } from 'date-fns';
import type { CalendarEvent } from '@/domain/ops.types';
import { SBCard } from '@/components/ui';
import { DayPicker, type DayProps } from 'react-day-picker';
import { es as esLocale } from 'date-fns/locale';

const fmtH = (d:Date)=> format(d, 'HH:mm');

export function WeekCalendar({ events, onDropSchedule }:{ events: CalendarEvent[]; onDropSchedule:(slotISO:string, payload:any)=>void }){
  const weekStart = startOfWeek(new Date(), { weekStartsOn:1 });
  const days = Array.from({length:7}, (_,i)=> addDays(weekStart,i));

  const handleDrop = (e:React.DragEvent, iso:string)=>{
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
        onDropSchedule(iso, JSON.parse(data));
        return;
    }
  };

  return (
    <SBCard>
      <header className="sb-card__header"><h3 className="sb-card__title">Calendario</h3></header>
      <div className="sb-card__content p-0">
         <DayPicker
            mode="single"
            selected={new Date()}
            locale={esLocale}
            showOutsideDays
            fixedWeeks
            className="m-auto"
            classNames={{
                day_today: 'bg-primary/20 text-primary',
                day_selected: 'bg-primary text-primary-foreground',
            }}
            components={{
              Day: (props) => {
                const dayEvents = events.filter(e => new Date(e.startAt).toDateString() === props.date.toDateString());
                return (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, props.date.toISOString())}
                    className="relative w-full h-full flex items-center justify-center"
                  >
                    <span className="relative z-10">{props.date.getDate()}</span>
                    {dayEvents.length > 0 && (
                       <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                         {dayEvents.slice(0, 3).map(e => <div key={e.id} className="h-1 w-1 rounded-full bg-[hsl(var(--sb-accent-ventas))]" />)}
                       </div>
                    )}
                  </div>
                )
              }
            }}
         />
      </div>
    </SBCard>
  );
}
