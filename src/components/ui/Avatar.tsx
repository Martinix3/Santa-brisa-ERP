
"use client";

function stringToColor(seed: string) {
    if (!seed) return `hsl(220 40% 85%)`;
    let h = 0;
    // Simple hash function
    for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }

    const hue = h % 360;
    // Use different parts of the hash to vary saturation and lightness
    const saturation = 40 + (h % 21); // Range: 40% to 60%
    const lightness = 80 + (h % 11);  // Range: 80% to 90%
    
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
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

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full text-zinc-700 border flex-shrink-0 ${sizeClasses[size]}`}
        style={{ background: stringToColor(name || '-'), borderColor: '#e5e7eb' }}
        title={name}
      >
        {initials || '—'}
      </span>
    );
}
