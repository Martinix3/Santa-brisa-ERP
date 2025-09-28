// src/server/workers/createShipment.worker.ts
// THIS FILE IS NO LONGER NEEDED AND CAN BE DELETED.
// The logic has been moved directly into the `confirmOrderShipment` server action
// in `src/app/(app)/warehouse/logistics/actions.ts` to make the process atomic.

export async function run({ orderId }: { orderId: string }) {
    console.warn(`[WORKER-DEPRECATED] createShipment.worker.ts was called for order ${orderId} but is now obsolete.`);
    return Promise.resolve();
}
