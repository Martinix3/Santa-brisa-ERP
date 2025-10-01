// src/components/charts/theme.ts
export function getSBChartTheme() {
  const css = getComputedStyle(document.documentElement);
  const get = (v: string) => css.getPropertyValue(v).trim() || undefined;
  const bg = get("--background") || "0 0% 100%";
  const fg = get("--foreground") || "224 43% 11%";
  const accent = get("--accent") || "46 82% 64%";
  const muted = get("--muted") || "220 13% 91%";
  return {
    colors: {
      axis: `hsl(${fg})`,
      grid: `hsl(${muted})`,
      series: [
        `hsl(${accent})`,
        `hsl(${fg} / 0.75)`,
        `hsl(${fg} / 0.45)`,
      ],
      bg: `hsl(${bg})`,
      text: `hsl(${fg})`,
    },
  };
}