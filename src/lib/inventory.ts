
// src/lib/inventory.ts
import type { OrderSellOut, InventoryItem, Product } from '@/domain';

type StockShortage = {
    sku: string;
    qtyRequired: number;
    qtyAvailable: number;
    qtyShort: number;
};

/**
 * Checks the stock availability for a given order against the current inventory.
 * @param order The sales order to check.
 * @param inventory The current inventory items.
 * @param products The list of all products.
 * @returns An array of stock shortages. Returns an empty array if stock is sufficient.
 */
export function checkOrderStock(order: OrderSellOut, inventory: InventoryItem[], products: Product[]): StockShortage[] {
    if (!order.lines) return [];

    const shortages: StockShortage[] = [];
    const fgInventory = inventory.filter(i => i.locationId === 'FG/MAIN');

    for (const line of order.lines) {
        const { sku, qty } = line;

        const totalAvailable = fgInventory
            .filter(item => item.sku === sku)
            .reduce((sum, item) => sum + item.qty, 0);

        if (totalAvailable < qty) {
            shortages.push({
                sku,
                qtyRequired: qty,
                qtyAvailable: totalAvailable,
                qtyShort: qty - totalAvailable,
            });
        }
    }

    return shortages;
}
