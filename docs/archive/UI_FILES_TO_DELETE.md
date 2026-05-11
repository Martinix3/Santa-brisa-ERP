# Archivos UI a Eliminar

**Total:** 119 archivos UI/Frontend  
**Archivos de sistema preservados:** 77

---

## Componentes (61)

```
src/components/RealtimeBadge.tsx
src/components/admin/EditableCollectionTable.tsx
src/components/ai/AIInsightCard.tsx
src/components/ai/AIPredictionChart.tsx
src/components/ai/AIRecommendations.tsx
src/components/brand/BrandPalette.tsx
src/components/cuentas/AccountsDataTable.tsx
src/components/cuentas/CSVUploadModal.tsx
src/components/cuentas/SignalsUploadModal.tsx
src/components/dashboard/DailyQuotasWidget.tsx
src/components/dashboard/KpiCard.tsx
src/components/dialogs/ActionDialogShell.tsx
src/components/drawers/ContactDrawer.tsx
src/components/forms/SchemaDrawer.tsx
src/components/forms/SchemaForm.tsx
src/components/integrations/ApiKeyConnect.tsx
src/components/layout/Header.tsx
src/components/layout/SBHeader.tsx
src/components/logistics/CarrierSelector.tsx
src/components/logistics/ShipmentCard.tsx
src/components/marketing/ImageUpload.tsx
src/components/orders/OrderCard.tsx
src/components/orders/QcStatusBadge.tsx
src/components/quality/LotCard.tsx
src/components/shared/EmptyState.tsx
src/components/shared/LoadingState.tsx
src/components/shared/PageShell.tsx
src/components/shared/index.ts
src/components/shopify/ShopifyKPIs.tsx
src/components/shopify/ShopifyOrdersTable.tsx
src/components/ui/FilterSelect.tsx
src/components/ui/KpiCard.tsx
src/components/ui/NewCustomerCelebration.tsx
src/components/ui/SBCard.tsx
src/components/ui/SBDatePicker.tsx
src/components/ui/SBIcon.tsx
src/components/ui/SBKpiCard.tsx
src/components/ui/SBPageShell.tsx
src/components/ui/SBPopover.tsx
src/components/ui/SBSurface.tsx
src/components/ui/SBTabs.tsx
src/components/ui/SBToast.tsx
src/components/ui/SBTooltip.tsx
src/components/ui/TimePicker.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/command.tsx
src/components/ui/index.ts
src/components/ui/popover.tsx
src/components/ui/tooltip.tsx
src/components/warehouse/IncidentReporter.tsx
src/components/warehouse/ReceiptLineCard.tsx
src/components/forms/examples/CreateContactDrawer.tsx
src/components/dialogs/forms/EventForm.tsx
src/components/dialogs/forms/InteractionForm.tsx
src/components/dialogs/forms/OrderForm.tsx
src/components/dialogs/forms/PosForm.tsx
src/components/ui/charts/SBBarChart.tsx
src/components/ui/charts/SBLineChart.tsx
src/components/ui/charts/SBSparkline.tsx
src/components/ui/charts/theme.ts
```

---

## Features (58)

```
src/features/bom/RecipeList.tsx
src/features/orders/interactions.helpers.ts
src/features/personal/CompactCalendar.tsx
src/features/personal/PersonalPipelineBoard.tsx
src/features/personal/TasksSection.tsx
src/features/pos/DeliveryQtyForm.tsx
src/features/pos/KpisDynamicForm.tsx
src/features/pos/PosCompleteDialog.tsx
src/features/pos/PosLinesPicker.tsx
src/features/quicklog/QuickLogDialog.tsx
src/features/quicklog/SantaBrainInput.tsx
src/features/tasks/complete.ts
src/features/tasks/mutations.ts
src/features/accounts/components/BusinessAlertsCard.tsx
src/features/accounts/components/EditAccountDialog.tsx
src/features/accounts/components/NewContactPersonDialog.tsx
src/features/accounts/components/NewNoteDialog.tsx
src/features/accounts/components/QuickActionsBar.tsx
src/features/accounts/components/QuickCreateVisitDialog.tsx
src/features/integrations/holded/service.ts
src/features/orders/components/ImportShopifyOrderButton.tsx
src/features/orders/components/KpiCard.tsx
src/features/orders/components/NewOrderModal.tsx
src/features/orders/components/OrdersDashboard.tsx
src/features/orders/components/OrdersTable.tsx
src/features/orders/components/QuickPlacementOrderCard.tsx
src/features/orders/components/SuggestedLotsPanel.tsx
src/features/personal/components/DashboardKpiCard.tsx
src/features/personal/components/RescheduleDialog.tsx
src/features/personal/components/TargetAccountsList.tsx
src/features/personal/components/TaskItem.tsx
src/features/personal/components/TaskList.tsx
src/features/pos/server/pos-complete.ts
src/features/production/execution/types.ts
src/features/quicklog/components/MessageReviewForm.tsx
src/features/quicklog/components/SBFlows.tsx
src/features/sales/pipeline/pipeline.actions.v2.ts
src/features/sales/pipeline/pipeline.mappers.ts
src/features/tasks/hooks/useOptimisticTasks.ts
src/features/tasks/components/MiniCalendar.tsx
src/features/tasks/components/SpecialShelf.tsx
src/features/tasks/components/TaskCompleteDialog.tsx
src/features/tasks/components/TaskFilters.tsx
src/features/tasks/utils/dateFilters.ts
src/features/projects/components/CreateProjectModal.tsx
src/features/warehouse/components/DataQualityCenter.tsx
src/features/warehouse/components/QuickGoodsReceiptDialog.tsx
src/features/sales/pipeline/hooks/usePipeline.ts
src/features/sales/pipeline/components/AccountCard.tsx
src/features/sales/pipeline/components/AccountDrawer.tsx
src/features/sales/pipeline/components/PipelineBoard.tsx
src/features/sales/pipeline/components/PipelineColumn.tsx
src/features/sales/pipeline/components/PipelineHeader.tsx
src/features/sales/pipeline/components/StageColumn.tsx
src/features/sales/pipeline/components/skeletons.tsx
src/features/warehouse/inventory/components/LotDetailPanel.tsx
src/features/warehouse/inventory/components/LotRows.tsx
src/features/warehouse/inventory/components/NewOnHandDialog.tsx
```

---

## Páginas (0)

```

```

---

## ⚙️ Archivos de Sistema que SE MANTIENEN

<details>
<summary>Ver 77 archivos preservados</summary>

```
src/config/carriers.ts
src/domain/helpers.ts
src/domain/integration-helpers.ts
src/domain/onhand.recalc.ts
src/domain/ops.types.ts
src/domain/ssot-quality.ts
src/domain/ssot.common.ts
src/domain/ssot.metas.ts
src/domain/uom-helpers.ts
src/hooks/useAccountDrawer.ts
src/hooks/useLiveCollection.ts
src/hooks/useMarketingActions.ts
src/hooks/useSystemConfig.ts
src/modules/drawer.registry.tsx
src/i18n/warehouse-mail-templates.ts
src/core/audit.ts
src/core/ctx.ts
src/core/system-actors.ts
src/lib/consignment-and-samples.ts
src/lib/dashboard-helpers.ts
src/lib/db.ts
src/lib/distributor-helpers.ts
src/lib/finance-helpers.ts
src/lib/formatters.ts
src/lib/logistics.helpers.ts
src/lib/onhand_view.ts
src/lib/order-flow-validators.ts
src/lib/pipeline-helpers.ts
src/lib/sales-helpers.ts
src/lib/sb-core.ts
src/lib/status.ts
src/lib/time-range-helpers.ts
src/server/auth-helpers.ts
src/server/auth.ts
src/server/storage.ts
src/app/providers/AssistantProvider.tsx
src/core/repos/_utils.ts
src/lib/audit/data-flow-mapper.ts
src/lib/norm/cif.ts
src/lib/norm/email.ts
src/lib/norm/phone.ts
src/server/actions/accounts-data.ts
src/server/actions/agenda.actions.ts
src/server/actions/csv-import.ts
src/server/actions/csv-signals.ts
src/server/actions/dashboard-admin.ts
src/server/actions/dashboard-distributor.ts
src/server/actions/dashboard-manager.ts
src/server/actions/dashboard-marketing.ts
src/server/actions/dashboard-ops.ts
src/server/actions/dashboard-technical.ts
src/server/actions/events.ts
src/server/actions/gmail.actions.ts
src/server/actions/interactions.ts
src/server/actions/marketing.ts
src/server/actions/orders-data.ts
src/server/actions/orders.actions.ts
src/server/actions/plv.ts
src/server/actions/pos-tactics.service.ts
src/server/actions/quality-stats.ts
src/server/gemini/analyzer-orchestrator.ts
src/services/lots/searchLots.ts
src/app/(app)/ops/actions.ts
src/app/(app)/production/actions.ts
src/features/pos/server/pos-actions.ts
src/server/integrations/holded/mappers.ts
src/server/integrations/holded/validators.ts
src/server/gemini/analyzers/warehouse-analyzer.ts
src/server/integrations/shopify/hmac.ts
src/server/integrations/shopify/process.ts
src/server/integrations/shopify/shopify.fulfillment.worker.ts
src/server/integrations/shopify/shopify.webhooks.ts
src/server/integrations/shopify/upsertShopifyOrder.usecase.ts
src/app/(app)/admin/variables/actions.ts
src/app/(app)/quality/parametros/actions.ts
src/app/(app)/quality/parametros/schemas.ts
src/app/(app)/warehouse/inventory/components/PricingModal.tsx
```

</details>
