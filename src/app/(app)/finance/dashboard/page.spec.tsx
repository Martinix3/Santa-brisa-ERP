/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { describe, it, expect, vi } from 'vitest';
import type { FinanceLink, PaymentLink } from '@/domain/ssot';

// Mock data
const mockFinanceLinks: FinanceLink[] = [
  {
    id: '1',
    docType: 'invoice',
    externalId: 'INV-001',
    status: 'pending',
    docNumber: 'INV-001',
    netAmount: 100,
    taxAmount: 21,
    grossAmount: 121,
    currency: 'EUR',
    issueDate: '2024-01-01',
    dueDate: '2024-01-31',
    partyId: 'party-1',
  },
  {
    id: '2',
    docType: 'invoice',
    externalId: 'INV-002',
    status: 'paid',
    docNumber: 'INV-002',
    netAmount: 200,
    taxAmount: 42,
    grossAmount: 242,
    currency: 'EUR',
    issueDate: '2024-01-02',
    dueDate: '2024-02-01',
    partyId: 'party-2',
  },
  {
    id: '3',
    docType: 'invoice',
    externalId: 'INV-003',
    status: 'overdue',
    docNumber: 'INV-003',
    netAmount: 150,
    taxAmount: 31.5,
    grossAmount: 181.5,
    currency: 'EUR',
    issueDate: '2024-01-03',
    dueDate: '2024-01-15',
    partyId: 'party-3',
  },
];

const mockPaymentLinks: PaymentLink[] = [
  {
    id: '1',
    externalId: 'PAY-001',
    financeLinkId: '2',
    amount: 242,
    paidAt: '2024-01-15',
    date: '2024-01-15', // deprecated but kept for compatibility
    method: 'Transferencia',
  },
];

describe('Finance Dashboard - KPI Calculations', () => {
  it('should calculate pending amount correctly', () => {
    const pending = mockFinanceLinks
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + f.grossAmount, 0);
    
    expect(pending).toBe(121);
  });

  it('should calculate paid amount correctly', () => {
    const paid = mockFinanceLinks
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + f.grossAmount, 0);
    
    expect(paid).toBe(242);
  });

  it('should calculate overdue amount correctly', () => {
    const overdue = mockFinanceLinks
      .filter(f => f.status === 'overdue')
      .reduce((sum, f) => sum + f.grossAmount, 0);
    
    expect(overdue).toBe(181.5);
  });

  it('should count documents by status correctly', () => {
    const pendingCount = mockFinanceLinks.filter(f => f.status === 'pending').length;
    const paidCount = mockFinanceLinks.filter(f => f.status === 'paid').length;
    const overdueCount = mockFinanceLinks.filter(f => f.status === 'overdue').length;
    
    expect(pendingCount).toBe(1);
    expect(paidCount).toBe(1);
    expect(overdueCount).toBe(1);
  });

  it('should count total payments correctly', () => {
    expect(mockPaymentLinks.length).toBe(1);
  });
});

describe('Finance Dashboard - Currency Formatting', () => {
  it('should format currency to EUR correctly', () => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    };

    expect(formatCurrency(121)).toContain('121,00');
    expect(formatCurrency(121)).toContain('€');
    expect(formatCurrency(242)).toContain('242,00');
    expect(formatCurrency(181.5)).toContain('181,50');
  });

  it('should handle zero amounts', () => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    };

    expect(formatCurrency(0)).toContain('0,00');
    expect(formatCurrency(0)).toContain('€');
  });

  it('should handle large amounts', () => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    };

    expect(formatCurrency(10000)).toContain('10.000,00');
    expect(formatCurrency(10000)).toContain('€');
    expect(formatCurrency(1000000)).toContain('1.000.000,00');
  });
});

describe('Finance Dashboard - Data Filtering', () => {
  it('should filter documents by status', () => {
    const filterByStatus = (status: string) => {
      return mockFinanceLinks.filter(f => f.status === status);
    };

    expect(filterByStatus('pending')).toHaveLength(1);
    expect(filterByStatus('paid')).toHaveLength(1);
    expect(filterByStatus('overdue')).toHaveLength(1);
  });

  it('should return empty array for non-existent status', () => {
    const filterByStatus = (status: string) => {
      return mockFinanceLinks.filter(f => f.status === status);
    };

    expect(filterByStatus('cancelled')).toHaveLength(0);
  });

  it('should sort documents by date', () => {
    const sorted = [...mockFinanceLinks].sort((a, b) => 
      new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );

    expect(sorted[0].id).toBe('3'); // Most recent
    expect(sorted[2].id).toBe('1'); // Oldest
  });
});

describe('Finance Dashboard - Edge Cases', () => {
  it('should handle empty finance links array', () => {
    const emptyLinks: FinanceLink[] = [];
    
    const totalPending = emptyLinks
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + f.grossAmount, 0);
    
    expect(totalPending).toBe(0);
  });

  it('should handle missing optional fields', () => {
    const linkWithoutOptionals: FinanceLink = {
      id: '4',
      docType: 'invoice',
      externalId: 'INV-004',
      status: 'pending',
      netAmount: 100,
      taxAmount: 21,
      grossAmount: 121,
      currency: 'EUR',
      issueDate: '2024-01-01',
      dueDate: '2024-01-31',
    };

    expect(linkWithoutOptionals.docNumber).toBeUndefined();
    expect(linkWithoutOptionals.partyId).toBeUndefined();
  });

  it('should calculate totals with decimal precision', () => {
    const total = mockFinanceLinks.reduce((sum, f) => sum + f.grossAmount, 0);
    
    // 121 + 242 + 181.5 = 544.5
    expect(total).toBe(544.5);
  });
});
