# Drawer Unificado – Checklist UX & Accesibilidad

> Referencia operativa para validar cualquier flujo que use el drawer unificado (`EntityDrawerShell` y derivados).

## 1. Apertura y foco
- El trigger abre el drawer con `aria-expanded` actualizado.
- El foco inicial se sitúa en el título (`h2`) o primer campo interactivo según el caso.
- No existen elementos focuseables detrás del overlay (body bloqueado y `tab` cicla dentro del drawer).

## 2. Navegación por teclado
- `Tab` recorre los elementos interactivos en orden lógico (header → contenido → footer).
- `Shift + Tab` permite volver al elemento anterior correctamente.
- `Esc` cierra el drawer desde cualquier punto (incluido formularios con validations).
- La acción primaria aceptada (si existe) responde a `Enter` cuando tiene el foco.

## 3. Lectores de pantalla
- El contenedor usa `role="dialog"` y `aria-modal="true"`.
- `aria-label` o `aria-labelledby` apunta al título visible.
- Se anuncian cambios de estado críticos (errores, guardados, bloqueos) con `aria-live` o `toast` accesible.

## 4. Layout responsive
- Mobile (<768px): drawer tipo bottom sheet con handler visible y scroll independiente del body.
- Desktop (≥768px): drawer lateral derecho con ancho adaptable y sin solapar cabeceras/sidebars.
- Altura máxima bloqueada (`max-h`) para evitar overflow; contenido interior scrollable.

## 5. Diseño coherente
- Usa tokens globales (`--radius`, `--motion-*`, `--z-dialog`) y clases `.sb-drawer`, `.sb-overlay`.
- Acciones secundarias/primarias usan `sb-btn` + variantes; icon buttons tienen `aria-label`.
- Mantiene contraste mínimo AA (texto sobre fondo de cards, botones, badges).

## 6. Cierre y cleanup
- Botón de cierre (`X`) está presente, con label y visible en todos los tamaños.
- Al cerrar, el foco vuelve al trigger original.
- Estados transitorios (loading, success, error) limpian timers/listeners para evitar fugas.

## 7. Integración con reglas / Gemini
- El drawer admite `context` (ruleId, alertKey) para mostrar mensajes consistentes.
- Cuando se lanza acción principal que crea tareas/alertas, se actualiza UI y se muestra feedback contextual.
- Los formularios dentro del drawer validan inputs antes de invocar acciones del servidor.

## Procedimiento de validación
1. Ejecutar el flujo en mobile y desktop (dev tools / dispositivo real).
2. Recorrer la navegación solo con teclado.
3. Revisar con lector de pantalla (VoiceOver/NVDA) los datos clave.
4. Confirmar que las llamadas a `TraceEventFactory`, `IntegrationLogger` y `businessRules` registran el `alertKey/taskKey` esperado.
5. Registrar hallazgos en el tablero antes de mover la tarea a “Done”.
