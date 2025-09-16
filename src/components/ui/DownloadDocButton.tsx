
"use client";
import * as React from 'react';
import type { Account, Product, Shipment, OrderSellOut } from '@/domain/ssot';

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
    e.stopPropagation(); // Evita que el menú desplegable se cierre
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

      const blob = await res.blob();
      const effectiveFilename = filename || `${docType}-${order.id}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = effectiveFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      onPrint?.();

    } catch (e: any) {
      console.error('Error generating or downloading PDF:', e);
      alert('Error al generar el PDF: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const buttonContent = loading ? 'Generando…' : (children ?? label);
  const isSlot = !!children;

  if (isSlot) {
    const child = React.Children.only(children) as React.ReactElement;
    return React.cloneElement(child, {
      onClick: onClick as any,
    });
  }

  return (
    <button onClick={onClick} disabled={loading} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-zinc-100">
      {buttonContent}
    </button>
  );
}
