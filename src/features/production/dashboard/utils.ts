export const fmt = {
  eur(n:number){ return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n||0); },
};

export function seriesDays(n:number){
  const out: Date[] = [];
  const now = new Date();
  for(let i=n; i>=0; i--){ const d = new Date(now); d.setDate(now.getDate()-i); out.push(d); }
  return out;
}

export function isSameDay(a:Date,b:Date){ 
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); 
}
