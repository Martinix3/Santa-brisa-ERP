/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/ui/ui-primitives.tsx
"use client";
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronsUpDown, Check } from 'lucide-react';
import type { OnHandView } from '@/domain/ssot';

// --- TYPE ALIAS PARA ESTILOS CON VARIABLES CSS ---
type CSSVarStyle = React.CSSProperties & Record<string, string | number>;

// ===================================
// Tarjeta Genérica (Card)
// ===================================

interface SBCardProps {
  title?: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SBCard({ title, accent, children, className, noPadding }: SBCardProps) {
  return (
    <div className={cn("sb-card overflow-hidden", className)}>
      {title && (
        <div className="sb-card__header p-4">
          <h3
            className="font-semibold"
            style={
              accent
                ? ({
                    '--accent-color': accent,
                    borderLeft: '3px solid var(--accent-color)',
                    paddingLeft: 8,
                  } as CSSVarStyle)
                : undefined
            }
          >
            {title}
          </h3>
        </div>
      )}
      <div className={!noPadding ? "p-4" : ""}>{children}</div>
    </div>
  );
}

// ===================================
// Botón Genérico (Button)
// ===================================

interface SBButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'subtle' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    as?: 'button' | 'a';
}

export const SBButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, SBButtonProps>(
    ({ className, variant = 'primary', size = 'md', as = 'button', ...props }, ref) => {
        const Comp = as;
        
        const variants: Record<string, string> = {
            primary: "sb-btn--primary",
            secondary: "sb-btn--secondary",
            destructive: "sb-btn--destructive",
            ghost: "sb-btn--ghost",
            subtle: "sb-btn--ghost",
            outline: "sb-btn--secondary"
        };
        const sizes = {
            sm: "sb-btn--sm",
            md: "",
            lg: "sb-btn--lg",
        };

        return <Comp className={cn("sb-btn", variants[variant], sizes[size], className)} ref={ref as any} {...props} />;
    }
);
SBButton.displayName = "SBButton";


// ===================================
// KPI Display
// ===================================
export function KPI({ label, value, icon: Icon, delta, hint, unit, color }: { label: string; value: string | number; icon?: React.ElementType; delta?: string; hint?: string; unit?:string, color?: string }) {
  const trend = delta ? (delta.startsWith('+') ? 'up' : (delta.startsWith('-') ? 'down' : 'neutral')) : 'neutral';
  return (
    <SBCard className="flex-grow">
      <div className="p-4">
        {Icon && (
          <div
            className="p-2 rounded-lg inline-block mb-2 text-muted-foreground bg-secondary"
            style={
              color
                ? ({
                    '--icon-color': color,
                    color: 'var(--icon-color)',
                    backgroundColor: 'color-mix(in srgb, var(--icon-color) 15%, transparent)',
                  } as CSSVarStyle)
                : undefined
            }
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground">{value}{unit && <span className="text-muted-foreground text-sm ml-1">{unit}</span>}</p>
            {delta && <span className={cn('text-xs font-semibold', trend === 'up' ? 'text-success' : 'text-destructive')}>{delta}</span>}
        </div>
        {hint && <p className="text-xs text-muted-foreground/80 mt-1">{hint}</p>}
        </div>
    </SBCard>
  );
}

// ===================================
// Lot Quality Status Pill
// ===================================
export function LotQualityStatusPill({ status }: { status?: 'hold' | 'release' | 'reject' }) {
    const map = {
        hold: 'bg-info-foreground text-info border border-info-foreground/20',
        release: 'bg-success-foreground text-success border border-success/30',
        reject: 'bg-destructive-foreground text-destructive border border-destructive/30',
    };
    const s = status || 'hold';
    return <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', map[s])}>{s}</span>;
}


// ===================================
// Form Controls
// ===================================

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input ref={ref} className={cn('sb-input', className)} {...props} />
    )
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, children, ...props }, ref) => (
         <select ref={ref} className={cn('sb-select', className)} {...props}>
            {children}
         </select>
    )
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => (
         <textarea ref={ref} className={cn('sb-textarea', className)} {...props} />
    )
);
Textarea.displayName = 'Textarea';

// ===================================
// DataTable (Simplified)
// ===================================
export type Col<T> = {
    key: keyof T | (string & {});
    header: string;
    className?: string;
    render?: (row: T) => React.ReactNode;
};

export function DataTableSB<T extends { id: any }>({ rows, cols, onRowClick }: { rows: T[], cols: Col<T>[], onRowClick?: (row: T) => void }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left bg-secondary">
                        {cols.map(c => <th key={String(c.key)} className="p-3 font-semibold text-muted-foreground">{c.header}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map(row => (
                        <tr key={row.id} className={cn('hover:bg-secondary/50', onRowClick && 'cursor-pointer')} onClick={() => onRowClick?.(row)}>
                            {cols.map(c => (
                                <td key={String(c.key)} className={`p-3 ${c.className || ''}`}>
                                    {c.render ? c.render(row) : String((row as any)[c.key] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ===================================
// Empty State
// ===================================
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 border-2 border-dashed border-border rounded-2xl bg-secondary/50">
        <div className="p-3 rounded-full bg-secondary mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
        {actions && <div className="mt-6 flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ===================================
// Badge
// ===================================
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    const variants: Record<BadgeVariant, string> = {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-success-foreground text-success",
    };

    return (
        <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props} />
    );
}


// ===================================
// Misc
// ===================================
export const hexToRgba = (hex: string, a: number) => {
  if (!hex || !/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(hex)) return 'rgba(0,0,0,0)';
  const h = hex.replace('#',''); 
  const f = h.length===3? h.split('').map(c=>c+c).join(''):h; 
  const n=parseInt(f,16); 
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255; 
  return `rgba(${r},${g},${b},${a})`; 
};
 
export const waterHeader = (seed = "hdr", base = "hsl(var(--info))") => {
  const hash = Array.from(seed).reduce((s,c)=> (s*33+c.charCodeAt(0))>>>0,5381);
  let a = hash||1; const rnd = ()=> (a = (a*1664525+1013904223)>>>0, (a>>>8)/16777216);
  const L:string[]=[]; for(let i=0;i<3;i++){ const x=(i%2?80+rnd()*18:rnd()*18).toFixed(2); const y=(rnd()*70+15).toFixed(2); const rx=90+rnd()*120, ry=60+rnd()*120; const a1=0.06+rnd()*0.06, a2=a1*0.5, s1=45+rnd()*10, s2=70+rnd()*12; L.push(`radial-gradient(${rx}px ${ry}px at ${x}% ${y}%, color-mix(in srgb, ${base} ${a1*100}%, transparent), color-mix(in srgb, ${base} ${a2*100}%, transparent) ${s1}%, transparent ${s2}%)`);} L.push(`linear-gradient(to bottom, color-mix(in srgb, ${base} 8%, transparent), transparent)`); return L.join(',');
};

export function AgaveEdge(){
  const H = 14;
  return (
    <svg className="h-3 w-full text-background" viewBox={`0 0 600 14`} preserveAspectRatio="none" aria-hidden>
        <polygon fill="currentColor" points="0,14 25.8,5.1 51.6,14 77.4,6 103.2,14 129,4.2 154.8,14 180.6,7.7 206.4,14 232.2,4.9 258,14 283.8,6.3 309.6,14 335.4,3.5 361.2,14 387,5.6 412.8,14 438.6,7 464.4,14 490.2,4.2 516,14 541.8,6.3 567.6,14 593.4,2.8 600,14" />
        <polygon fill="currentColor" points="0,14 20,4.8 40,14 60,5.7 80,14 100,4.5 120,14 140,7.2 160,14 180,5.1 200,14 220,6.6 240,14 260,4.2 280,14 300,5.4 320,14 340,3.9 360,14 380,5.7 400,14 420,7.5 440,14 460,4.8 480,14 500,6.6 520,14 540,3.3 560,14 580,5.7 600,14" />
    </svg>
  );
}

type StatusVariant = 'default' | 'info' | 'success' | 'destructive';
type StatusStyle = { label: string; variant: StatusVariant };

/**
 * @deprecated Use ORDER_STATUS_META or SHIPMENT_STATUS_META from @/domain/ssot instead.
 * This generic STATUS_STYLES mixes different entity types and should not be used.
 * 
 * For orders: import { ORDER_STATUS_META } from '@/domain/ssot'
 * For shipments: import { SHIPMENT_STATUS_META } from '@/domain/ssot'
 */
export const STATUS_STYLES: Record<string, StatusStyle> = {
  open: { label: "Borrador", variant: "default" },
  pending: { label: "Pendiente", variant: "info" },
  confirmed: { label: "Confirmado", variant: "info" },
  picking: { label: "Picking", variant: "info" },
  ready_to_ship: { label: "Validado", variant: "info" },
  shipped: { label: "Enviado", variant: "info" },
  delivered: { label: "Entregado", variant: "success" },
  invoiced: { label: "Facturado", variant: "default" },
  paid: { label: "Pagado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "default" },
  lost: { label: "Perdido", variant: "destructive" },
  exception: { label: "Incidencia", variant: "destructive" },
};

// ===================================
// Popover (Shadcn/ui stub)
// ===================================

const PopoverContext = React.createContext<{ open: boolean, setOpen: (open: boolean) => void }>({ open: false, setOpen: () => {} });

export const Popover: React.FC<{ open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }> = ({ open, onOpenChange, children }) => {
  return <PopoverContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</PopoverContext.Provider>;
};

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(({ children, asChild = false, ...props }, ref) => {
    const { open, setOpen } = React.useContext(PopoverContext);
    const child = asChild ? React.Children.only(children) : <SBButton {...props}>{children}</SBButton>;
    
    const childProps = {
        ...props,
        ref: ref,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
            setOpen(!open);
            if(child && React.isValidElement(child) && typeof (child.props as any).onClick === 'function') {
                (child.props as any).onClick(e);
            }
        },
    };

    return React.cloneElement(child as React.ReactElement, childProps);
});
PopoverTrigger.displayName = "PopoverTrigger";

export const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => {
  const { open } = React.useContext(PopoverContext);
  if (!open) return null;
  return (
    <div ref={ref} {...props} className={cn("z-50 bg-card text-card-foreground border rounded-md shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className)}>
      {children}
    </div>
  );
});
PopoverContent.displayName = "PopoverContent";


// ===================================
// Command (Shadcn/ui stub)
// ===================================

const CommandContext = React.createContext<{ search: string, onValueChange: (search: string) => void }>({ search: '', onValueChange: () => {} });

export const Command = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }>(({ children, ...props }, ref) => {
  const [search, setSearch] = useState('');
  return (
    <CommandContext.Provider value={{ search, onValueChange: setSearch }}>
      <div ref={ref} {...props} className="flex h-full w-full flex-col overflow-hidden rounded-md bg-card text-card-foreground">
        {children}
      </div>
    </CommandContext.Provider>
  );
});
Command.displayName = "Command";


export const CommandInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { onValueChange: (value: string) => void }>(({ className, onValueChange, ...props }, ref) => {
  return (
    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        ref={ref}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn("flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = "CommandInput";

export const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, ...props }, ref) => (
  <div ref={ref} {...props} className="max-h-[300px] overflow-y-auto overflow-x-hidden">{children}</div>
));
CommandList.displayName = "CommandList";

export const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div ref={ref} {...props} className="py-6 text-center text-sm" />
));
CommandEmpty.displayName = "CommandEmpty";

export const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} {...props} className={cn("overflow-hidden p-1 text-foreground", className)} />
));
CommandGroup.displayName = "CommandGroup";

export const CommandItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { onSelect?: () => void; value?: string }>(({ className, onSelect, ...props }, ref) => (
  <div
    ref={ref}
    onMouseDown={(e) => {
      e.preventDefault();
      onSelect?.();
    }}
    {...props}
    className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)}
  />
));
CommandItem.displayName = "CommandItem";

// ===================================
// Design System 2 Compatible Aliases
// ===================================
export const Card = SBCard;
export const Button = SBButton;
export const CardHeader = "div";
export const CardContent = "div";
export const Drawer = SBCard;
export const Dialog = SBCard;
export const Tabs = SBCard;
export const TabsList = SBCard;
export const TabsTrigger = SBButton;
export const TabsContent = SBCard;
export const BadgeDS2 = Badge;

// ===================================
// Design System 2 Drawer/Dialog Stubs
// ===================================
export const DrawerContent = SBCard;
export const DrawerHeader = SBCard;
export const DrawerTitle = "h3";
export const DrawerFooter = "div";

export const DialogContent = SBCard;
export const DialogHeader = SBCard;
export const DialogTitle = "h3";

// ===================================
// Form Components (Label / Checkbox)
// ===================================
export const Label = "label";

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { onCheckedChange?: (checked: boolean) => void }>(
  ({ className, onCheckedChange, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn("sb-checkbox", className)}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

// ===================================
// Extend SBButton variants to include success
// ===================================
(SBButton as any).variants = { ...(SBButton as any).variants, success: "sb-btn--success" };

// ===================================
// Select components (placeholders using SBSelect)
// ===================================
export const SelectContent = SBCard;
export const SelectItem = "option";
export const SelectTrigger = SBButton;
export const SelectValue = "span";
