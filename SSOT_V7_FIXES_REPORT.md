# SSOT v7 Error Fixes Report

**Generated:** 2025-10-09T20:55:27.200Z

## Summary

- **Files scanned:** 464
- **Files modified:** 1
- **Total fixes:** 3
- **Total warnings:** 20
- **Mode:** CHANGES APPLIED

## Fixes by Category

- **collection-name:** 3

## Modified Files

### src/lib/sb-core.ts (3 fixes)

**Line 108** [collection-name]:
```diff
-   const accountOrders = (data.ordersSellOut || []).filter((o: OrderSellOut) =>
+   const accountOrders = (data.orderSellOut || []).filter((o: OrderSellOut) =>
```

**Line 136** [collection-name]:
```diff
-   const allAccountOrders = (data.ordersSellOut || []).filter((o: OrderSellOut) => o.accountId === accountId && o.status === 'VALIDATED');
+   const allAccountOrders = (data.orderSellOut || []).filter((o: OrderSellOut) => o.accountId === accountId && o.status === 'VALIDATED');
```

**Line 202** [collection-name]:
```diff
-   const ordersInWin = data.ordersSellOut.filter((o: OrderSellOut) =>
+   const ordersInWin = data.orderSellOut.filter((o: OrderSellOut) =>
```

## ⚠️ Manual Review Required

### src/app/(app)/warehouse/logistics/page.tsx

- Line 51: account.segment removed - MANUAL FIX NEEDED

### src/features/accounts/components/AccountCard.tsx

- Line 56: account.segment removed - MANUAL FIX NEEDED
- Line 105: account.segment removed - MANUAL FIX NEEDED
- Line 237: account.segment removed - MANUAL FIX NEEDED

### src/features/accounts/components/AccountDetailPage.tsx

- Line 184: account.segment removed - MANUAL FIX NEEDED
- Line 228: account.segment removed - MANUAL FIX NEEDED

### src/features/admin/components/DataMapperFlow.tsx

- Line 101: account.segment removed - MANUAL FIX NEEDED

### src/features/orders/components/OrdersDashboard.tsx

- Line 66: account.segment removed - MANUAL FIX NEEDED
- Line 69: account.segment removed - MANUAL FIX NEEDED

### src/features/personal/PersonalPipelineBoard.tsx

- Line 123: account.segment removed - MANUAL FIX NEEDED

### src/features/warehouse/components/ShipmentsTable.tsx

- Line 19: account.segment removed - MANUAL FIX NEEDED
- Line 21: account.segment removed - MANUAL FIX NEEDED
- Line 22: account.segment removed - MANUAL FIX NEEDED

### src/lib/sales-helpers.ts

- Line 285: account.segment removed - MANUAL FIX NEEDED

### scripts/fix-ssot-v7-errors.ts

- Line 165: data.teams no longer exists in SSOT v7 - MANUAL FIX NEEDED
- Line 167: data.teams no longer exists in SSOT v7 - MANUAL FIX NEEDED
- Line 191: account.code no longer exists - use .id or .external?.holdedId
- Line 193: account.code no longer exists - use .id or .external?.holdedId
- Line 196: account.segment removed - MANUAL FIX NEEDED
- Line 198: account.segment removed - MANUAL FIX NEEDED

## Next Steps

1. ✅ Review warnings above
2. ✅ Fix manual cases
3. ✅ Run: npx tsc --noEmit
4. ✅ Test application
