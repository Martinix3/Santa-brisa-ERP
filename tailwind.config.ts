// tailwind.config.ts — Adaptado al nuevo Brief de Diseño
import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
          // La fuente 'Inter' se mantiene como principal
          sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Paleta de colores simplificada según el brief
        // No se usan variables CSS para una mayor claridad y alineación con Tailwind
        
        // Colores de Marca y Acción
        'accent': '#F4C542',     // Amarillo Santa Brisa (Acento y Acción Principal)
        'sun': '#F2E5A0',        // Texto sobre color
        
        // Colores Secundarios (para avatares, etc.)
        'cobre': '#B25A32',
        'agua': '#77D9CF',
        'naranja': '#F26D3D',

        // Colores Semánticos
        'destructive': {
            DEFAULT: '#991b1b',      // Rojo para texto/iconos
            background: '#fef2f2', // Fondo para badges/alertas
        },
        
        // NOTA: Los colores neutros del brief (#111827, #374151, #6b7280, #e5e7eb)
        // se corresponden directamente con la paleta 'gray' por defecto de Tailwind.
        // Usaremos `gray-900`, `gray-700`, `gray-500`, `gray-200` y `gray-100` (`#f3f4f6`).
        // El fondo de contraste `#f9fafb` es `gray-50`.
      },
      borderRadius: {
        // Mantenemos la escala por defecto de Tailwind, es consistente (múltiplos de 4px)
      },
      boxShadow: {
        // Sombra sutil para "Contenedores Blancos"
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.07)',
        // Sombra más pronunciada para interacciones (hover en KpiCard)
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
      },
      keyframes: {
        // Animación de entrada para módulos de página
        'fade-in-up': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;