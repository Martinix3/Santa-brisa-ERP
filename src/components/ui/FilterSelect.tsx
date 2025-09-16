

"use client"
import { Filter } from 'lucide-react';

export function FilterSelect({ value, onChange, options, placeholder, className }: { value: string, onChange: (v: string) => void, options: Array<{value: string, label: string}>, placeholder: string, className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full text-sm bg-white border border-zinc-200 rounded-md pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-yellow-300"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <Filter className="h-4 w-4 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}
