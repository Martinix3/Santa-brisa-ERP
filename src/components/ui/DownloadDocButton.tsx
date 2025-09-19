
"use client";
import * as React from 'react';
import type { Account, Product, Shipment, OrderSellOut } from '@/domain/ssot';
import { isValidElement, cloneElement, ReactElement } from 'react';

type DocKind = 'sales_order' | 'delivery_note' | 'shipping_label';

interface DownloadDocButtonProps {
  docType: DocKind;
  order: OrderSellOut;
  account?: Account;
  products?: Product[];
  label: string;
  filename?: string;
  onPrint?: () => void;
  children?: React.ReactNode;
}

export function DownloadDocButton(props: DownloadDocButtonProps) {
  const { docType, order, account, products, label, filename, onPrint, children } = props;
  const [loading, setLoading] = React.useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setLoading(true);
    try {
      const payload = {
        kind: docType,
        data: {
            order,
            account,
            products,
        },
      };
      
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch {}
        console.error("Error response from /api/docs:", detail);
        throw new Error(`Server error: ${res.status}. Check console for details.`);
      }

      const htmlContent = await res.text();
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        // Give the browser a moment to render the content before printing
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      } else {
        throw new Error("Could not open print window. Please check your browser's pop-up settings.");
      }
      
      onPrint?.();

    } catch (e: any) {
      console.error('Error generating or printing document:', e);
      alert('Error al generar el documento: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const buttonContent = loading ? 'Generando…' : (children ?? label);
  const isSlot = !!children;

  if (isSlot && isValidElement(children)) {
    return cloneElement(children as ReactElement<any>, {
      onClick: onClick as any,
    });
  }

  return (
    <button onClick={onClick} disabled={loading} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-zinc-100">
      {buttonContent}
    </button>
  );
}
