QuickLog – Modo sin IA y IA opcional

Resumen
- QuickLog funciona de forma robusta sin IA (reglas locales).
- La opción de IA (Gemini) está separada y se puede activar por flags.

Flags de configuración
- Servidor (análisis): `QUICKLOG_AI=true`
  - Si está ausente o es distinto de `true`, QuickLog usa análisis por reglas.
  - Respeta también `USE_GEMINI=false`, `NODE_ENV=test` o `CI=true` para forzar reglas.

- Cliente (UI): `NEXT_PUBLIC_QUICKLOG_AI=true`
  - Controla etiquetas y disponibilidad del botón de voz en la sección “Procesar con IA”.
  - Si está ausente o es distinto de `true`, la sección muestra “Procesar notas (sin IA)” y oculta grabación de voz.

Detalles técnicos
- El analizador `analyzeQuickLogIntent` (server) usa reglas por defecto y solo invoca Gemini si `QUICKLOG_AI=true` y `USE_GEMINI` no es `false`.
- El flujo manual (sin IA) permite crear VISITA, PEDIDO, EVENTO y POS desde el formulario sin depender de IA.
- El resumen (`ProcessedSummary`) incluye `source: 'AI' | 'RULES'` para que la UI muestre mensajes adecuados.

Entorno recomendado sin IA
1. No establecer `QUICKLOG_AI` ni `NEXT_PUBLIC_QUICKLOG_AI` (o dejarlas en `false`).
2. Opcional: `USE_GEMINI=false` para evitar cualquier llamada IA en el backend.

Activar IA (opcional)
1. Backend: `QUICKLOG_AI=true` (y definir `GEMINI_API_KEY`).
2. Frontend: `NEXT_PUBLIC_QUICKLOG_AI=true` para habilitar etiquetas de IA y grabación de voz.

