
// src/lib/inventory.ts
import type { OrderSellOut, OnHandView, Item } from '@/domain/ssot';

type StockShortage = {
    itemId: string;
    qtyRequired: number;
    qtyAvailable: number;
    qtyShort: number;
};

/**
 * Checks the stock availability for a given order against the current inventory.
 * @param order The sales order to check.
 * @param inventory The current inventory items (on hand view).
 * @param items The list of all items.
 * @returns An array of stock shortages. Returns an empty array if stock is sufficient.
 */
export function checkOrderStock(order: OrderSellOut, inventory: OnHandView[], items: Item[]): StockShortage[] {
    if (!order.lines) return [];

    const shortages: StockShortage[] = [];
    const fgInventory = inventory.filter(i => i.locationId === 'FG/MAIN');

    for (const line of order.lines) {
        const { itemId, qty } = line;

        const totalAvailable = fgInventory
            .filter(item => item.itemId === itemId)
            .reduce((sum, item) => sum + item.qty, 0);

        if (totalAvailable < qty) {
            shortages.push({
                itemId,
                qtyRequired: qty,
                qtyAvailable: totalAvailable,
                qtyShort: qty - totalAvailable,
            });
        }
    }

    return shortages;
}
