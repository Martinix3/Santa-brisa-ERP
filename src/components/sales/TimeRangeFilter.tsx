"use client";
import React from 'react';
import { TimeRange, TIME_RANGE_LABELS } from '@/lib/time-range-helpers';

type TimeRangeFilterProps = {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
};

export function TimeRangeFilter({ value, onChange, className = '' }: TimeRangeFilterProps) {
  const ranges: TimeRange[] = ['week', 'month', 'ytd'];
  
  return (
    <div className={`flex items-center gap-1 border rounded-lg p-1 bg-card ${className}`}>
      {ranges.map(range => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            value === range
              ? 'bg-[#F7D15F] text-black'
              : 'hover:bg-secondary text-muted-foreground'
          }`}
        >
          {TIME_RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
