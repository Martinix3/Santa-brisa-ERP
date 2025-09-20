# Informe de Auditoría — Santa Brisa

- 📄 **Resumen estático**: [audit-summary.md](./audit-summary.md)
- 🧭 **Hallazgos en runtime**: [runtime-findings.md](./runtime-findings.md)

---

# Auditoría Santa Brisa

**Archivos escaneados:** 103
**Pages:** 37, **Layouts:** 8, **Client comps:** 77

## UI duplicada (por nombre de archivo)
- Sin duplicados detectados

## Otros hallazgos
- Overlays fixed: 10
  - src/app/loading.tsx
  - src/app/marketing/online/page.tsx
  - src/app/warehouse/logistics/page.tsx
  - src/components/ui/Modal.tsx
  - src/components/ui/NewCustomerCelebration.tsx
  - src/features/agenda/ui.tsx
  - src/features/influencers/components/InfluencerMarketing.tsx
  - src/features/quicklog/QuickLogOverlay.tsx
  - src/features/quicklog/components/SBFlows.tsx
  - src/lib/dataprovider.tsx
- "useEffect" sin cleanup: 0

## Rutas (conteo aproximado)
- (root): 37 pages, 8 layouts


---

# Runtime findings

No se encontró `/tmp/sb-client-logs.ndjson`.
Navega la app con la captura activa (MonitoringBoot) y vuelve a correr `npm run audit:runtime`.

