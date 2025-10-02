
"use client";

// Paleta de colores basada en los tokens de CSS para consistencia y tematización.
const avatarColors = [
    { bg: "hsl(var(--primary))", text: "hsl(var(--primary-foreground))" },
    { bg: "hsl(var(--info-foreground))", text: "hsl(var(--info))" },
    { bg: "hsl(var(--success-foreground))", text: "hsl(var(--success))" },
    { bg: "hsl(var(--accent))", text: "hsl(var(--accent-foreground))" },
    { bg: "hsl(var(--sb-accent-ventas))", text: "hsl(var(--background))" },
    { bg: "hsl(var(--sb-accent-marketing))", text: "hsl(var(--foreground))" },
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
          '--avatar-bg': colors.bg,
          '--avatar-fg': colors.text,
          backgroundColor: 'var(--avatar-bg)',
          color: 'var(--avatar-fg)',
          borderColor: 'color-mix(in srgb, var(--avatar-fg) 20%, transparent)',
        }}
        title={name}
      >
        {initials || '—'}
      </span>
    );
}
