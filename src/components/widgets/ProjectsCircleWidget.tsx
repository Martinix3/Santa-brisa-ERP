'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useDrawer } from '@/ui/drawers/drawer-registry';

export function ProjectsCircleWidget({ projects, onProjectClick }:{ projects:{ id:string; name:string; todo:number; doing:number; done:number; trend:'up'|'down'|'flat' }[]; onProjectClick?: (projectId:string)=>void }){
  const { open } = useDrawer();
  return (
    <div className="grid grid-cols-2 gap-3">
      {projects.map(p=>{
        const total = p.todo + p.doing + p.done || 1;
        const pct = Math.round((p.done/total)*100);
        const C = 2*Math.PI*48;
        return (
          <button key={p.id} onClick={()=> onProjectClick ? onProjectClick(p.id) : open('project-progress',{ projectId:p.id })}
            className="relative sb-card-glass-light p-4 rounded-2xl transition hover:shadow-md active:scale-[0.98]">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-semibold">{p.name}</h4>
              <span className={`sb-badge ${p.trend==='up'?'text-[--sb-success]':p.trend==='down'?'text-[--sb-danger]':'text-[--sb-muted]'}`}>
                {p.trend==='up'?'▲':p.trend==='down'?'▼':'–'}
              </span>
            </div>
            <div className="relative h-28 flex items-center justify-center">
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="48" stroke="var(--sb-border)" strokeWidth="10" fill="none" />
                <circle cx="60" cy="60" r="48" stroke="var(--sb-copper)" strokeWidth="10" fill="none"
                  strokeDasharray={`${(pct/100)*C} ${C}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              <span className="absolute text-lg font-semibold">{pct}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
