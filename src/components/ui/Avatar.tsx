
"use client";

// Paleta de colores predefinida y curada para los avatares.
const avatarColors = [
    // Amarillo Sol derivados
    { bg: "#FFEAA6", text: "#C7A837" },
    { bg: "#C7A837", text: "#FFEAA6" },
    // Cobre derivados
    { bg: "#F2A678", text: "#9E4E27" },
    { bg: "#9E4E27", text: "#F2A678" },
    // Agua derivados
    { bg: "#D8F0F1", text: "#2F5D5D" },
    { bg: "#7BA9AA", text: "#FFFFFF" },
    // Verde Mar derivados
    { bg: "#89B2B3", text: "#2F5D5D" },
    { bg: "#2F5D5D", text: "#D8F0F1" },
    // Originales (marca)
    { bg: "#F7D15F", text: "#2C2A28" },
    { bg: "#2C2A28", text: "#F7D15F" },
    { bg: "#A7D8D9", text: "#2C2A28" },
    { bg: "#2C2A28", text: "#A7D8D9" },
    { bg: "#618E8F", text: "#FFFFFF" },
    { bg: "#FFFFFF", text: "#618E8F" },
    { bg: "#D7713E", text: "#FFFFFF" },
    { bg: "#FFFFFF", text: "#D7713E" },
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
  
export function Avatar({ name, size = 'md', className }: { name?: string, size?: 'sm' | 'md' | 'lg', className?: string }) {
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
        className={`inline-flex items-center justify-center rounded-full font-semibold border flex-shrink-0 ${sizeClasses[size]} ${className || ''}`}
        style={{ 
          backgroundColor: colors.bg, 
          color: colors.text,
          borderColor: hexToRgba(colors.text, 0.2)
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
