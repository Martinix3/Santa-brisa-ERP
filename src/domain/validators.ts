
import { z } from 'zod';

export const LotSchema = z.object({
  lotNumber: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number(),
  uom: z.enum(['kg','L','unit', 'g', 'mL', 'case', 'bottle', 'pallet']),
  qcStatus: z.enum(['PENDING','PASSED','FAILED','WAIVED']),
  expiryAt: z.preprocess(
    (val) => {
      // ✅ Convertir string vacío, undefined o null a null
      if (val === '' || val === undefined || val === null) return null;
      
      // ✅ Si es formato YYYY-MM-DD (del input date), convertir a ISO datetime
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00.000Z').toISOString();
      }
      
      return val;
    },
    z.union([z.string().datetime(), z.null()]).optional()
  ),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Lot = z.infer<typeof LotSchema>;
