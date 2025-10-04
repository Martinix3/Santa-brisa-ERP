'use client';
import React from 'react';
import { addMinutes, addDays, startOfWeek, format } from 'date-fns';
import type { CalendarEvent } from '@/domain/ops.types';

const fmtH = (d:Date)=> format(d, 'HH:mm');

export function WeekCalendar({ events, onDropSchedule }:{ events: CalendarEvent[]; onDropSchedule:(slotISO:string, payload:any)=>void }){
  const weekStart = startOfWeek(new Date(), { weekStartsOn:1 });
  const days = Array.from({length:5}, (_,i)=> addDays(weekStart,i));

  const handleDrop = (e:React.DragEvent, iso:string)=>{
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
        onDropSchedule(iso, JSON.parse(data));
        return;
    }
  };

  return (
    <section className="sb-card">
      <header className="sb-card__header"><h3 className="sb-card__title">Calendario (semana)</h3></header>
      <div className="sb-card__content overflow-auto">
        <div className="grid grid-cols-6 min-w-[720px]">
          <div></div>
          {days.map((d,i)=>(<div key={i} className="text-xs font-medium text-center">{format(d,'EEE dd')}</div>))}
          {Array.from({length:18},(_,r)=>{
            const hour = addMinutes(new Date(weekStart.setHours(8,0,0,0)), r*30);
            return (
              <React.Fragment key={r}>
                <div className="text-xs text-right pr-2 py-2 text-neutral-500">{fmtH(hour)}</div>
                {days.map((d,c)=>{
                  const slot = addMinutes(new Date(d.setHours(8,0,0,0)), r*30);
                  const iso = slot.toISOString();
                  const evs = events.filter(e=> {
                      const eventStart = new Date(e.startAt).getTime();
                      return eventStart >= slot.getTime() && eventStart < slot.getTime() + 30 * 60 * 1000;
                  });
                  return (
                    <div key={c}
                         className="border min-h-[36px] relative"
                         onDragOver={(e)=>e.preventDefault()}
                         onDrop={(e)=>handleDrop(e, iso)}>
                      {evs.map(e=> (
                        <div key={e.id} className="absolute inset-0 m-0.5 rounded bg-amber-200 text-amber-900 text-xs p-1 overflow-hidden">
                          <div className="font-medium truncate">{e.title}</div>
                          <div className="truncate">{e.accountName || ''}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
