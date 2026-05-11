#!/bin/bash
# Eliminar SOLO componentes UI no usados
# Fecha: 2025-10-19T20:47:06.079Z

echo "🎨 Eliminando 119 componentes UI no usados"
echo ""

# Crear backup
BACKUP="backup-ui-cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cp --parents "src/components/RealtimeBadge.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/RealtimeBadge.tsx"
cp --parents "src/components/admin/EditableCollectionTable.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/admin/EditableCollectionTable.tsx"
cp --parents "src/components/ai/AIInsightCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ai/AIInsightCard.tsx"
cp --parents "src/components/ai/AIPredictionChart.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ai/AIPredictionChart.tsx"
cp --parents "src/components/ai/AIRecommendations.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ai/AIRecommendations.tsx"
cp --parents "src/components/brand/BrandPalette.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/brand/BrandPalette.tsx"
cp --parents "src/components/cuentas/AccountsDataTable.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/cuentas/AccountsDataTable.tsx"
cp --parents "src/components/cuentas/CSVUploadModal.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/cuentas/CSVUploadModal.tsx"
cp --parents "src/components/cuentas/SignalsUploadModal.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/cuentas/SignalsUploadModal.tsx"
cp --parents "src/components/dashboard/DailyQuotasWidget.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/dashboard/DailyQuotasWidget.tsx"
cp --parents "src/components/dashboard/KpiCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/dashboard/KpiCard.tsx"
cp --parents "src/components/dialogs/ActionDialogShell.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/dialogs/ActionDialogShell.tsx"
cp --parents "src/components/drawers/ContactDrawer.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/drawers/ContactDrawer.tsx"
cp --parents "src/components/forms/SchemaDrawer.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/forms/SchemaDrawer.tsx"
cp --parents "src/components/forms/SchemaForm.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/forms/SchemaForm.tsx"
cp --parents "src/components/integrations/ApiKeyConnect.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/integrations/ApiKeyConnect.tsx"
cp --parents "src/components/layout/Header.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/layout/Header.tsx"
cp --parents "src/components/layout/SBHeader.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/layout/SBHeader.tsx"
cp --parents "src/components/logistics/CarrierSelector.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/logistics/CarrierSelector.tsx"
cp --parents "src/components/logistics/ShipmentCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/logistics/ShipmentCard.tsx"
cp --parents "src/components/marketing/ImageUpload.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/marketing/ImageUpload.tsx"
cp --parents "src/components/orders/OrderCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/orders/OrderCard.tsx"
cp --parents "src/components/orders/QcStatusBadge.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/orders/QcStatusBadge.tsx"
cp --parents "src/components/quality/LotCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/quality/LotCard.tsx"
cp --parents "src/components/shared/EmptyState.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/shared/EmptyState.tsx"
cp --parents "src/components/shared/LoadingState.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/shared/LoadingState.tsx"
cp --parents "src/components/shared/PageShell.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/shared/PageShell.tsx"
cp --parents "src/components/shared/index.ts" "$BACKUP/" 2>/dev/null
rm "src/components/shared/index.ts"
cp --parents "src/components/shopify/ShopifyKPIs.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/shopify/ShopifyKPIs.tsx"
cp --parents "src/components/shopify/ShopifyOrdersTable.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/shopify/ShopifyOrdersTable.tsx"
cp --parents "src/components/ui/FilterSelect.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/FilterSelect.tsx"
cp --parents "src/components/ui/KpiCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/KpiCard.tsx"
cp --parents "src/components/ui/NewCustomerCelebration.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/NewCustomerCelebration.tsx"
cp --parents "src/components/ui/SBCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBCard.tsx"
cp --parents "src/components/ui/SBDatePicker.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBDatePicker.tsx"
cp --parents "src/components/ui/SBIcon.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBIcon.tsx"
cp --parents "src/components/ui/SBKpiCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBKpiCard.tsx"
cp --parents "src/components/ui/SBPageShell.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBPageShell.tsx"
cp --parents "src/components/ui/SBPopover.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBPopover.tsx"
cp --parents "src/components/ui/SBSurface.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBSurface.tsx"
cp --parents "src/components/ui/SBTabs.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBTabs.tsx"
cp --parents "src/components/ui/SBToast.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBToast.tsx"
cp --parents "src/components/ui/SBTooltip.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/SBTooltip.tsx"
cp --parents "src/components/ui/TimePicker.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/TimePicker.tsx"
cp --parents "src/components/ui/badge.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/badge.tsx"
cp --parents "src/components/ui/button.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/button.tsx"
cp --parents "src/components/ui/command.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/command.tsx"
cp --parents "src/components/ui/index.ts" "$BACKUP/" 2>/dev/null
rm "src/components/ui/index.ts"
cp --parents "src/components/ui/popover.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/popover.tsx"
cp --parents "src/components/ui/tooltip.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/tooltip.tsx"
cp --parents "src/components/warehouse/IncidentReporter.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/warehouse/IncidentReporter.tsx"
cp --parents "src/components/warehouse/ReceiptLineCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/warehouse/ReceiptLineCard.tsx"
cp --parents "src/components/forms/examples/CreateContactDrawer.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/forms/examples/CreateContactDrawer.tsx"
cp --parents "src/components/dialogs/forms/EventForm.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/dialogs/forms/EventForm.tsx"
cp --parents "src/components/dialogs/forms/InteractionForm.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/dialogs/forms/InteractionForm.tsx"
cp --parents "src/components/dialogs/forms/OrderForm.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/dialogs/forms/OrderForm.tsx"
cp --parents "src/components/dialogs/forms/PosForm.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/dialogs/forms/PosForm.tsx"
cp --parents "src/components/ui/charts/SBBarChart.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/charts/SBBarChart.tsx"
cp --parents "src/components/ui/charts/SBLineChart.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/charts/SBLineChart.tsx"
cp --parents "src/components/ui/charts/SBSparkline.tsx" "$BACKUP/" 2>/dev/null
rm "src/components/ui/charts/SBSparkline.tsx"
cp --parents "src/components/ui/charts/theme.ts" "$BACKUP/" 2>/dev/null
rm "src/components/ui/charts/theme.ts"
cp --parents "src/features/bom/RecipeList.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/bom/RecipeList.tsx"
cp --parents "src/features/orders/interactions.helpers.ts" "$BACKUP/" 2>/dev/null
rm "src/features/orders/interactions.helpers.ts"
cp --parents "src/features/personal/CompactCalendar.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/personal/CompactCalendar.tsx"
cp --parents "src/features/personal/PersonalPipelineBoard.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/personal/PersonalPipelineBoard.tsx"
cp --parents "src/features/personal/TasksSection.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/personal/TasksSection.tsx"
cp --parents "src/features/pos/DeliveryQtyForm.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/pos/DeliveryQtyForm.tsx"
cp --parents "src/features/pos/KpisDynamicForm.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/pos/KpisDynamicForm.tsx"
cp --parents "src/features/pos/PosCompleteDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/pos/PosCompleteDialog.tsx"
cp --parents "src/features/pos/PosLinesPicker.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/pos/PosLinesPicker.tsx"
cp --parents "src/features/quicklog/QuickLogDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/quicklog/QuickLogDialog.tsx"
cp --parents "src/features/quicklog/SantaBrainInput.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/quicklog/SantaBrainInput.tsx"
cp --parents "src/features/tasks/complete.ts" "$BACKUP/" 2>/dev/null
rm "src/features/tasks/complete.ts"
cp --parents "src/features/tasks/mutations.ts" "$BACKUP/" 2>/dev/null
rm "src/features/tasks/mutations.ts"
cp --parents "src/features/accounts/components/BusinessAlertsCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/accounts/components/BusinessAlertsCard.tsx"
cp --parents "src/features/accounts/components/EditAccountDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/accounts/components/EditAccountDialog.tsx"
cp --parents "src/features/accounts/components/NewContactPersonDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/accounts/components/NewContactPersonDialog.tsx"
cp --parents "src/features/accounts/components/NewNoteDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/accounts/components/NewNoteDialog.tsx"
cp --parents "src/features/accounts/components/QuickActionsBar.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/accounts/components/QuickActionsBar.tsx"
cp --parents "src/features/accounts/components/QuickCreateVisitDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/accounts/components/QuickCreateVisitDialog.tsx"
cp --parents "src/features/integrations/holded/service.ts" "$BACKUP/" 2>/dev/null
rm "src/features/integrations/holded/service.ts"
cp --parents "src/features/orders/components/ImportShopifyOrderButton.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/orders/components/ImportShopifyOrderButton.tsx"
cp --parents "src/features/orders/components/KpiCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/orders/components/KpiCard.tsx"
cp --parents "src/features/orders/components/NewOrderModal.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/orders/components/NewOrderModal.tsx"
cp --parents "src/features/orders/components/OrdersDashboard.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/orders/components/OrdersDashboard.tsx"
cp --parents "src/features/orders/components/OrdersTable.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/orders/components/OrdersTable.tsx"
cp --parents "src/features/orders/components/QuickPlacementOrderCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/orders/components/QuickPlacementOrderCard.tsx"
cp --parents "src/features/orders/components/SuggestedLotsPanel.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/orders/components/SuggestedLotsPanel.tsx"
cp --parents "src/features/personal/components/DashboardKpiCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/personal/components/DashboardKpiCard.tsx"
cp --parents "src/features/personal/components/RescheduleDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/personal/components/RescheduleDialog.tsx"
cp --parents "src/features/personal/components/TargetAccountsList.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/personal/components/TargetAccountsList.tsx"
cp --parents "src/features/personal/components/TaskItem.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/personal/components/TaskItem.tsx"
cp --parents "src/features/personal/components/TaskList.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/personal/components/TaskList.tsx"
cp --parents "src/features/pos/server/pos-complete.ts" "$BACKUP/" 2>/dev/null
rm "src/features/pos/server/pos-complete.ts"
cp --parents "src/features/production/execution/types.ts" "$BACKUP/" 2>/dev/null
rm "src/features/production/execution/types.ts"
cp --parents "src/features/quicklog/components/MessageReviewForm.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/quicklog/components/MessageReviewForm.tsx"
cp --parents "src/features/quicklog/components/SBFlows.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/quicklog/components/SBFlows.tsx"
cp --parents "src/features/sales/pipeline/pipeline.actions.v2.ts" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/pipeline.actions.v2.ts"
cp --parents "src/features/sales/pipeline/pipeline.mappers.ts" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/pipeline.mappers.ts"
cp --parents "src/features/tasks/hooks/useOptimisticTasks.ts" "$BACKUP/" 2>/dev/null
rm "src/features/tasks/hooks/useOptimisticTasks.ts"
cp --parents "src/features/tasks/components/MiniCalendar.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/tasks/components/MiniCalendar.tsx"
cp --parents "src/features/tasks/components/SpecialShelf.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/tasks/components/SpecialShelf.tsx"
cp --parents "src/features/tasks/components/TaskCompleteDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/tasks/components/TaskCompleteDialog.tsx"
cp --parents "src/features/tasks/components/TaskFilters.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/tasks/components/TaskFilters.tsx"
cp --parents "src/features/tasks/utils/dateFilters.ts" "$BACKUP/" 2>/dev/null
rm "src/features/tasks/utils/dateFilters.ts"
cp --parents "src/features/projects/components/CreateProjectModal.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/projects/components/CreateProjectModal.tsx"
cp --parents "src/features/warehouse/components/DataQualityCenter.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/warehouse/components/DataQualityCenter.tsx"
cp --parents "src/features/warehouse/components/QuickGoodsReceiptDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/warehouse/components/QuickGoodsReceiptDialog.tsx"
cp --parents "src/features/sales/pipeline/hooks/usePipeline.ts" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/hooks/usePipeline.ts"
cp --parents "src/features/sales/pipeline/components/AccountCard.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/components/AccountCard.tsx"
cp --parents "src/features/sales/pipeline/components/AccountDrawer.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/components/AccountDrawer.tsx"
cp --parents "src/features/sales/pipeline/components/PipelineBoard.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/components/PipelineBoard.tsx"
cp --parents "src/features/sales/pipeline/components/PipelineColumn.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/components/PipelineColumn.tsx"
cp --parents "src/features/sales/pipeline/components/PipelineHeader.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/components/PipelineHeader.tsx"
cp --parents "src/features/sales/pipeline/components/StageColumn.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/components/StageColumn.tsx"
cp --parents "src/features/sales/pipeline/components/skeletons.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/sales/pipeline/components/skeletons.tsx"
cp --parents "src/features/warehouse/inventory/components/LotDetailPanel.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/warehouse/inventory/components/LotDetailPanel.tsx"
cp --parents "src/features/warehouse/inventory/components/LotRows.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/warehouse/inventory/components/LotRows.tsx"
cp --parents "src/features/warehouse/inventory/components/NewOnHandDialog.tsx" "$BACKUP/" 2>/dev/null
rm "src/features/warehouse/inventory/components/NewOnHandDialog.tsx"

echo ""
echo "✅ 119 archivos UI eliminados"
echo "💾 Backup en: $BACKUP"
