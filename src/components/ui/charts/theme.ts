// src/components/ui/charts/theme.ts

// This function could read from CSS variables in the future.
// For now, it provides a consistent theme for all charts.
export function getSBChartTheme() {
    return {
        line: ['hsl(var(--cobre))', 'hsl(var(--agua))', 'hsl(var(--naranja))', 'hsl(var(--sb-verde-mar))'],
        grid: 'hsl(var(--border))',
        axis: 'hsl(var(--text-muted))',
        tooltip: {
            bg: 'hsl(var(--card))',
            border: 'hsl(var(--border))',
        }
    };
}
