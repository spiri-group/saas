'use client';

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Plus, CheckCircle, Banknote, CreditCard } from "lucide-react";
import { PosOrderResponse } from "../_hooks/UseCreatePosSale";
import { formatCurrency } from "@/components/ux/CurrencySpan";

type Props = {
  open: boolean;
  onClose: () => void;
  onNewSale: () => void;
  order: PosOrderResponse['order'] | null;
  merchantName: string;
};

const PosReceipt = ({ open, onClose, onNewSale, order, merchantName }: Props) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const payment = order.payments?.[0];
  const total = payment?.charge?.paid ?? 0;
  const currency = order.lines?.[0]?.price?.currency ?? 'USD';
  const paymentMethodLabel = payment?.method_description ?? 'Unknown';
  const isCash = payment?.code === 'POS' && paymentMethodLabel === 'Cash';
  const saleDate = new Date(order.createdDate);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${order.code}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              padding: 10mm;
              color: #000;
              max-width: 80mm;
              margin: 0 auto;
            }
            .receipt-header { text-align: center; margin-bottom: 12px; }
            .receipt-header h1 { font-size: 16px; margin-bottom: 2px; }
            .receipt-header .date { font-size: 11px; color: #666; }
            .receipt-divider { border-top: 1px dashed #999; margin: 8px 0; }
            .receipt-line { display: flex; justify-content: space-between; padding: 2px 0; }
            .receipt-line.item { font-size: 12px; }
            .receipt-line.item .name { flex: 1; margin-right: 8px; }
            .receipt-line.item .qty { min-width: 30px; text-align: center; }
            .receipt-line.item .price { min-width: 60px; text-align: right; }
            .receipt-total { font-weight: bold; font-size: 14px; }
            .receipt-payment { text-align: center; margin-top: 8px; font-size: 11px; }
            .receipt-footer { text-align: center; margin-top: 16px; font-size: 10px; color: #888; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white" data-testid="pos-receipt-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Sale Complete
          </DialogTitle>
        </DialogHeader>

        {/* Receipt preview */}
        <div className="bg-white text-black rounded-lg p-5 mx-auto w-full max-w-sm" data-testid="pos-receipt">
          {/* Hidden print-only content */}
          <div ref={receiptRef} style={{ display: 'none' }}>
            <div className="receipt-header">
              <h1>{merchantName}</h1>
              <div className="date">
                {saleDate.toLocaleDateString()} {saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                Order: {order.code}
              </div>
            </div>
            <div className="receipt-divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginBottom: '4px' }}>
              <span style={{ flex: 1 }}>Item</span>
              <span style={{ minWidth: '30px', textAlign: 'center' }}>Qty</span>
              <span style={{ minWidth: '60px', textAlign: 'right' }}>Amount</span>
            </div>
            {order.lines.map(line => (
              <div key={line.id} className="receipt-line item">
                <span className="name">{line.descriptor}</span>
                <span className="qty">x{line.quantity}</span>
                <span className="price">{formatCurrency(line.price.amount * line.quantity, line.price.currency)}</span>
              </div>
            ))}
            <div className="receipt-divider" />
            <div className="receipt-line receipt-total">
              <span>TOTAL</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
            <div className="receipt-payment">
              Paid by: {paymentMethodLabel}
            </div>
            {order.customerEmail && (
              <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
                {order.customerEmail}
              </div>
            )}
            <div className="receipt-footer">
              Thank you for your purchase!<br />
              Powered by SpiriVerse
            </div>
          </div>

          {/* Visual receipt */}
          <div className="text-center mb-3">
            <h3 className="font-bold text-lg">{merchantName}</h3>
            <p className="text-gray-500 text-xs">
              {saleDate.toLocaleDateString('en-AU', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })} at {saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">Order #{order.code}</p>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Header row */}
          <div className="flex text-[10px] text-gray-400 mb-1 px-1">
            <span className="flex-1">Item</span>
            <span className="w-8 text-center">Qty</span>
            <span className="w-16 text-right">Amount</span>
          </div>

          {/* Line items */}
          <div className="space-y-1.5">
            {order.lines.map(line => (
              <div key={line.id} className="flex items-start text-sm px-1">
                <span className="flex-1 text-gray-800">{line.descriptor}</span>
                <span className="w-8 text-center text-gray-600 tabular-nums">{line.quantity}</span>
                <span className="w-16 text-right font-medium tabular-nums">
                  {formatCurrency(line.price.amount * line.quantity, line.price.currency)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Total */}
          <div className="flex justify-between px-1">
            <span className="text-base font-bold">Total</span>
            <span className="text-base font-bold tabular-nums">
              {formatCurrency(total, currency)}
            </span>
          </div>

          {/* Payment info */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
            {isCash ? <Banknote className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
            <span>Paid by {paymentMethodLabel}</span>
          </div>

          {order.customerEmail && (
            <p className="text-center text-xs text-gray-400 mt-2">{order.customerEmail}</p>
          )}

          <div className="border-t border-dashed border-gray-300 mt-3 pt-3 text-center">
            <p className="text-xs text-gray-400">Thank you for your purchase!</p>
            <p className="text-[10px] text-gray-300 mt-0.5">Powered by SpiriVerse</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <Button
            data-testid="pos-receipt-print"
            variant="outline"
            onClick={handlePrint}
            className="flex-1 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
          <Button
            data-testid="pos-receipt-new-sale"
            onClick={onNewSale}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PosReceipt;
