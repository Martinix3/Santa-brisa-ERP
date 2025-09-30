
import { z } from 'zod';

export const LotSchema = z.object({
  lotNumber: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number(),
  uom: z.enum(['kg','L','unit', 'g', 'mL', 'case', 'bottle', 'pallet']),
  qcStatus: z.enum(['PENDING','PASSED','FAILED','WAIVED']),
  expiryAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Lot = z.infer<typeof LotSchema>;

