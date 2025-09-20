
"use client";

function stringToColor(seed: string) {
    if (!seed) return `hsl(220 40% 85%)`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0; // Ensure 32-bit integer
    }

    const hue = hash % 360;
    // Increased range for more vibrant and varied colors
    const saturation = 50 + (hash % 25); // Range: 50% to 75%
    const lightness = 75 + (hash % 15);  // Range: 75% to 90%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
