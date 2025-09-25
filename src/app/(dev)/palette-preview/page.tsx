// Preview de paleta de usuarios Santa Brisa
// - Muestra combinaciones fondo/texto (claro⇄oscuro)
// - Permite cambiar las iniciales de ejemplo
// - Copia rápida del par de colores

"use client";

import React from "react";
import { Copy } from "lucide-react";
import { SB_THEME } from "@/domain/ssot";

export default function UserColorsPreview() {
  const [initials, setInitials] = React.useState("SB");

  const COLORS: { bg: string; text: string }[] = [
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

  const copy = async (bg: string, text: string) => {
    const payload = `{"bg":"${bg}","text":"${text}"}`;
    try {
      await navigator.clipboard.writeText(payload);
      // Optional: tiny feedback
      alert("Copiado: " + payload);
    } catch {}
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paleta de Usuarios · Santa Brisa</h1>
          <p className="text-sm text-gray-600">Fondo claro ⇄ iniciales oscuras y al revés. Edita las iniciales para previsualizar.</p>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Iniciales</span>
          <input
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 3))}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#F7D15F]"
            placeholder="SB"
            maxLength={3}
          />
        </label>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-5">
        {COLORS.map((c, i) => (
          <button
            key={i}
            onClick={() => copy(c.bg, c.text)}
            className="sb-btn-primary group relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            title="Copiar combinación"
          >
            <div className="flex items-center gap-4">
              <div
                className="shrink-0 rounded-full w-14 h-14 grid place-items-center ring-1 ring-black/5"
                style={{ backgroundColor: c.bg, color: c.text }}
              >
                <span className="font-semibold select-none">{initials || "SB"}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800">{contrastLabel(c.bg, c.text)}</div>
                <div className="text-xs text-gray-500">bg <code className="font-mono">{c.bg}</code></div>
                <div className="text-xs text-gray-500">text <code className="font-mono">{c.text}</code></div>
              </div>
            </div>
            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Copy className="w-4 h-4 text-gray-600" />
            </div>
          </button>
        ))}
      </section>

      <footer className="text-xs text-gray-500">
        Consejo: asigna color determinísticamente con <code className="font-mono">userId % COLORS.length</code>. Para el contraste AA, usa el helper que ves abajo.
      </footer>

      <details className="rounded-xl border border-gray-200 p-4 bg-white/60">
        <summary className="cursor-pointer text-sm font-medium">Helper de contraste (WCAG AA)</summary>
        <pre className="mt-3 text-[11px] text-gray-700">
{`function contrastLabel(bg, text) {
  const ratio = contrast(bg, text);
  const ok = ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Low';
  return ok + ' • ' + ratio.toFixed(2) + ':1';
}

function contrast(bg, fg) {
  const L = (hex) => {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const l1 = L(bg), l2 = L(fg);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function hexToRgb(hex) {
  const h = hex.replace('#','');
  const bigint = parseInt(h.length === 3 ? h.split('').map(x => x+x).join('') : h, 16);
  return [(bigint>>16)&255, (bigint>>8)&255, bigint&255];
}`}
        </pre>
      </details>
    </div>
  );
}

function contrastLabel(bg: string, text: string) {
  const ratio = contrast(bg, text);
  const ok = ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Low";
  return `${ok} • ${ratio.toFixed(2)}:1`;
}

function contrast(bg: string, fg: string) {
  const L = (hex: string) => {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      let vv = v / 255;
      return vv <= 0.03928 ? vv / 12.92 : Math.pow((vv + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = L(bg), l2 = L(fg);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const norm = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const bigint = parseInt(norm, 16);
  return [
    (bigint >> 16) & 255,
    (bigint >> 8) & 255,
    bigint & 255,
  ];
}
