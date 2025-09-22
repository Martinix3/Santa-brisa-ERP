// Creado para aislar el proyecto de `functions`
// Este archivo contiene solo las definiciones de tipo necesarias para `tools.ts`

export type Account = {
  id: string;
  name: string;
  city?: string;
  accountType: 'CLIENTE_FINAL' | 'DISTRIBUIDOR' | 'IMPORTADOR' | 'HORECA' | 'RETAIL' | 'OTRO';
  accountStage: 'SEGUIMIENTO' | 'FALLIDA' | 'ACTIVA' | 'POTENCIAL';
  mainContactName?: string;
  mainContactEmail?: string;
  salesRepId?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderSellOut = {
  id: string;
  accountId: string;
  distributorId?: string;
  date: string;
  currency: 'EUR' | 'USD';
  lines: Array<{
    sku: string;
    qty: number;
    priceUnit: number;
    discount?: number;
  }>;
  amount: number;
  notes?: string;
  status: 'ABIERTO' | 'CONFIRMADO' | 'ENVIADO' | 'FACTURADO' | 'PAGADO' | 'CANCELADO';
  createdAt: string;
  updatedAt: string;
  createdById?: string;
};
