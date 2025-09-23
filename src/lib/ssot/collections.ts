// Colecciones canónicas según SSOT v5
export const SANTA_DATA_COLLECTIONS = new Set<string>([
  'parties', 'partyRoles', 'partyDuplicates', 'users', 'accounts', 'ordersSellOut', 'interactions',
  'products', 'materials', 'billOfMaterials', 'productionOrders', 'lots', 'qaChecks',
  'inventory', 'stockMoves', 'shipments', 'goodsReceipts', 'activations', 'promotions',
  'marketingEvents', 'onlineCampaigns', 'influencerCollabs', 'materialCosts', 'financeLinks',
  'paymentLinks', 'traceEvents', 'incidents', 'codeAliases', 'posTactics', 'posCostCatalog',
  'plv_material', 'integrations', 'jobs', 'dead_letters', 'expenses', 'deliveryNotes'
]);

export function assertCollection(col: string) {
  if (!SANTA_DATA_COLLECTIONS.has(col)) {
    throw new Error(`Colección no SSOT: ${col}`);
  }
}
