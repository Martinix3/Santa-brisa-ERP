
"use client";

// A curated palette of background/foreground colors for the avatars.
const avatarColors = [
  { background: "#FDE68A", color: "#92400E" }, // Amarillo Sol
  { background: "#FBCFE8", color: "#9D174D" }, // Rosa
  { background: "#A7D8D9", color: "#155E75" }, // Agua
  { background: "#FED7AA", color: "#9A3412" }, // Naranja
  { background: "#D1FAE5", color: "#065F46" }, // Verde
  { background: "#BFDBFE", color: "#1E40AF" }, // Azul
  { background: "#E9D5FF", color: "#581C87" }, // Púrpura
  { background: "#D7713E33", color: "#D7713E" }, // Cobre
];

function stringToColor(seed: string) {
    if (!seed) {
        return avatarColors[0];
    }
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0;
    }
    const index = Math.abs(hash % avatarColors.length);
    return avatarColors[index];
}
  
export function Avatar({ name, size = 'md' }: { name?: string, size?: 'sm' | 'md' | 'lg' }) {
    const initials = (name || '—')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0]?.toUpperCase() || '')
      .join('');
    
    const sizeClasses = {
        sm: 'h-5 w-5 text-[9px]',
        md: 'h-6 w-6 text-[11px]',
        lg: 'h-8 w-8 text-sm',
    };

    const colors = stringToColor(name || '-');

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full font-semibold border flex-shrink-0 ${sizeClasses[size]}`}
        style={{ 
          backgroundColor: colors.background, 
          color: colors.color,
          borderColor: hexToRgba(colors.color, 0.2)
        }}
        title={name}
      >
        {initials || '—'}
      </span>
    );
}

function hexToRgba(hex: string, a: number) {
  if (!hex) return 'rgba(0,0,0,0)';
  const h = hex.replace('#',''); 
  const f = h.length===3? h.split('').map(c=>c+c).join(''):h; 
  const n=parseInt(f,16); 
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255; 
  return `rgba(${r},${g},${b},${a})`; 
};
