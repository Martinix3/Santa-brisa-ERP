DEPRECATION POLICY — Santa Brisa ERP

Objetivo
- Identificar y etiquetar rápidamente el código legacy (obsoleto) para guiar la migración hacia SSOT V2+ y servicios canónicos.
- Evitar que nuevo código se construya sobre módulos antiguos.

Enfoque
- Lista blanca (allowlist) de módulos canónicos: todo lo demás se considera legacy por defecto.
- Herramienta de escaneo y marcado opcional con cabecera @deprecated a nivel de archivo.
- Reportes para seguimiento de progreso.

Cómo funciona
1) La allowlist vive en `legacy/allowlist.json`.
   - Lo listado ahí NO es legacy (permitido).
   - Todo lo demás bajo `src/**/*.{ts,tsx}` se considera legacy.
2) Ejecuta un escaneo:
   - `npm run legacy:scan` → Genera `legacy/legacy-report.json` y `legacy/legacy-report.md`.
3) (Opcional) Inserta cabecera `@deprecated` en archivos legacy:
   - `npm run legacy:mark` → Modifica archivos y añade una cabecera estándar.

Cabecera estándar insertada
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

Buenas prácticas
- Al crear nuevo código, ubicarlo en `src/services/canonical/**`, `src/server/actions/**` o en el núcleo SSOT (`src/domain/ssot*.ts`).
- Al tocar código legacy, intentar encapsular y redirigir hacia servicios canónicos.
- Mantener la allowlist actualizada cuando un módulo deje de ser legacy.

Roadmap sugerido
- Semana 1: Etiquetado masivo con `legacy:scan` (reporte) y ajuste de allowlist.
- Semana 2: Marcar con cabeceras (`legacy:mark`) los módulos prioritarios a migrar.
- Semana 3+: Migraciones incrementales y endurecer reglas de lint para impedir nuevos usos de legacy.

