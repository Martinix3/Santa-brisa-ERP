# Informe de Auditoría — Santa Brisa

- 📄 **Resumen estático**: [audit-summary.md](./audit-summary.md)
- 🧭 **Hallazgos en runtime**: [runtime-findings.md](./runtime-findings.md)

---

# Auditoría Santa Brisa

**Archivos escaneados:** 188
**Pages:** 45, **Layouts:** 11, **Client comps:** 100

## UI duplicada (por nombre de archivo)
- Sin duplicados detectados

## Otros hallazgos
- Overlays fixed: 9
  - src/app/(app)/marketing/online/page.tsx
  - src/app/(app)/warehouse/logistics/page.tsx
  - src/components/ui/NewCustomerCelebration.tsx
  - src/components/ui/SBDialog.tsx
  - src/features/influencers/dialogs/NewCollabDialog.tsx
  - src/features/orders/components/ImportShopifyOrderButton.tsx
  - src/features/quicklog/QuickLogOverlay.tsx
  - src/features/quicklog/components/SBFlows.tsx
  - src/lib/dataprovider.tsx
- "useEffect" sin cleanup: 0

## Rutas (conteo aproximado)
- (root): 45 pages, 11 layouts


---

# Runtime findings

Logs analizados: 14

## /  
Total issues: 3
Tipos: console.error: 3

- (3×) Failed to load Firebase config from API.

## /login  
Total issues: 11
Tipos: console.error: 10, unhandledrejection: 1

- (9×) [AuthForm] Submit Error: Firebase: Error (auth/network-request-failed).
- (2×) Failed to fetch


