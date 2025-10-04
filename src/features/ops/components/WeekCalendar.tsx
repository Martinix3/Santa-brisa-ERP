// src/features/ops/components/WeekCalendar.tsx
'use client';
import React, { useMemo, useState } from 'react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { es as esLocale } from 'date-fns/locale';
import { sbAsISO } from '@/features/agenda/helpers';

export function WeekCalendar(props: Partial<DayPickerProps> & {
  events?: Array<{ id: string; startAt: string }>;
  onDaySelect?: (isoDate: string) => void;
}) {
  const { events = [], onDaySelect, ...rest } = props;
  const [selected, setSelected] = useState<Date>(new Date());

  // Mapa YYYY-MM-DD -> nº de eventos
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      if (!e.startAt) continue;
      try {
        const d = new Date(e.startAt);
        const key = d.toISOString().slice(0, 10);
        m.set(key, (m.get(key) ?? 0) + 1);
      } catch (error) {
        // Ignore invalid dates
      }
    }
    return m;
  }, [events]);

  const match = (min: number, max?: number) => (date: Date) => {
    const key = date.toISOString().slice(0, 10);
    const c = counts.get(key) ?? 0;
    return max == null ? c >= min : c >= min && c <= max;
  };
  
  const handleSelect = (day: Date | undefined) => {
    const newSelectedDay = day || new Date();
    setSelected(newSelectedDay);
    if(onDaySelect) {
      onDaySelect(sbAsISO(newSelectedDay) || new Date().toISOString());
    }
  }

  // Explicitly remove 'required' from rest to satisfy DayPicker's strict types
  const { required, ...otherProps } = rest;

  return (
    <div className="sb-card p-3">
      <DayPicker
        mode="single"
        required
        selected={selected}
        onSelect={handleSelect}
        weekStartsOn={1}
        showOutsideDays
        locale={esLocale}
        modifiers={{
          has1: match(1, 1),
          has2: match(2, 2),
          has3plus: match(3),
        }}
        modifiersClassNames={{
          has1: "sb-day-has1",
          has2: "sb-day-has2",
          has3plus: "sb-day-has3plus",
        }}
        {...otherProps}
      />
    </div>
  );
}
