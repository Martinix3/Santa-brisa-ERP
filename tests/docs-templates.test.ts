
import { describe, it, expect } from 'vitest';
import { selectTemplate } from '@/lib/pdf/templates';
import { defaultTheme } from '@/lib/pdf/theme';
import React from 'react';

const orderData = {
    id: 'O1',
    dateIso: new Date().toISOString(),
    accountName: 'Cliente',
    lines: [],
    totals: { subtotal: 0, total: 0 },
    visualInspectionOk: true,
};

describe('PDF templates', () => {
  it('sales_order crea un Document', () => {
    const el = selectTemplate('sales_order', orderData, defaultTheme);
    expect(React.isValidElement(el)).toBe(true);
    const elType = (el?.type as any)?.name || el?.type;
    expect(elType).toBe('Document');
  });

  it('shipping_label crea un Document', () => {
    const el = selectTemplate('shipping_label', { id:'S1', toName:'A', toAddress:'Dir', toCity:'BCN', toPostalCode:'08001', toCountry:'ES' }, defaultTheme);
    expect(React.isValidElement(el)).toBe(true);
    const elType = (el?.type as any)?.name || el?.type;
    expect(elType).toBe('Document');
  });

  it('delivery_note crea un Document', () => {
    const el = selectTemplate('delivery_note', { id:'D1', dateIso:new Date().toISOString(), customer:'C', lines:[] }, defaultTheme);
    expect(React.isValidElement(el)).toBe(true);
    const elType = (el?.type as any)?.name || el?.toString() || el?.type;
    expect(elType).toBe('Document');
  });
});
