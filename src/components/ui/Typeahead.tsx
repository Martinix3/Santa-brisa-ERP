
'use client';
import React, {useEffect, useMemo, useRef, useState} from 'react';

export type TAItem = { id: string; label: string; meta?: string };

function useDebounced<T>(value:T, ms=120){
  const [v,setV]=useState(value);
  useEffect(()=>{ const t=setTimeout(()=>setV(value), ms); return ()=>clearTimeout(t) },[value,ms]);
  return v;
}

export default function Typeahead({
  value, onChange, onSelect, items, placeholder='Buscar…', className='',
}:{
  value: string;
  onChange: (v:string)=>void;
  onSelect: (item:TAItem)=>void;
  items: TAItem[];
  placeholder?: string;
  className?: string;
}) {
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(0);
  const [internalValue, setInternalValue] = useState(value);

  const debounced = useDebounced(internalValue, 100);
  
  const filtered = useMemo(()=>{
    const q = debounced.trim().toLowerCase();
    if(!q) return [];
    return items
      .filter(it => it.label.toLowerCase().includes(q) || (it.meta||'').toLowerCase().includes(q))
      .slice(0,8);
  },[debounced, items]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(()=>{ setActive(0); setOpen(filtered.length>0 && debounced.length > 0); },[debounced, filtered.length]);
  
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>){
    if(!open && (e.key==='ArrowDown' || e.key==='ArrowUp')) { setOpen(true); return; }
    if(e.key==='ArrowDown'){ e.preventDefault(); setActive(a => Math.min(a+1, Math.max(0, filtered.length-1))); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setActive(a => Math.max(a-1, 0)); }
    else if(e.key==='Enter'){
      if(open && filtered[active]) { 
        e.preventDefault();
        onSelect(filtered[active]); 
        setInternalValue(filtered[active].label);
        setOpen(false); 
      }
    } else if(e.key==='Escape'){ setOpen(false); }
  }
  
  const handleSelect = (item: TAItem) => {
      onSelect(item);
      setInternalValue(item.label);
      setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <svg className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none">
          <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
        </svg>
        <input
          ref={inputRef}
          value={internalValue}
          onChange={(e)=> {
              setInternalValue(e.target.value)
              onChange(e.target.value)
          }}
          onKeyDown={handleKey}
          onBlur={()=> setTimeout(()=> setOpen(false), 120)}
          onFocus={()=> filtered.length && debounced.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-md outline-none focus:ring-2 focus:ring-yellow-300"
          aria-autocomplete="list"
          aria-controls="typeahead-listbox"
        />
      </div>

      {open && filtered.length>0 && (
        <ul
          id="typeahead-listbox"
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-card overflow-hidden"
        >
          {filtered.map((it, i)=>(
            <li
              key={it.id}
              role="option"
              aria-selected={i===active}
              onMouseDown={(e)=> e.preventDefault()}
              onClick={()=> handleSelect(it)}
              className={`px-3 py-2 text-sm cursor-pointer ${i===active ? 'bg-zinc-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{it.label}</span>
                {it.meta && <span className="text-xs text-zinc-500 truncate">{it.meta}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
