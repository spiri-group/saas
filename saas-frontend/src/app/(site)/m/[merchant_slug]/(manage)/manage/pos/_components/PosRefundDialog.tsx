'use client';

import { useState, useMemo } from "react";
import { RotateCcw, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/components/ux/CurrencySpan";
import { PosSaleOrder } from "../_hooks/UseRecentPosSales";

type Props = {
  open: boolean;
  sale: PosSaleOrder | null;
  isRefunding: boolean;
  onRefund: (orderId: string, lines: { lineId: string; quantity: number }[], reason?: string) => void;
  onClose: () => void;
};

const PosRefundDialog = ({ open, sale, isRefunding, onRefund, onClose }: Props) => {
  const [refundQtys, setRefundQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');

  // Reset state when dialog opens with a new sale
  const saleId = sale?.id;
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  if (saleId && saleId !== lastSaleId) {
    setLastSaleId(saleId);
    setRefundQtys({});
    setReason('');
  }

  const refundableLines = useMemo(() => {
    if (!sale) return [];
    return sale.lines.map(line => {
      const originalQty = line.quantity;
      const refundedQty = line.refund_quantity || 0;
      const maxRefundable = originalQty - refundedQty;
      return { ...line, maxRefundable, refundedQty };
    }).filter(line => line.maxRefundable > 0);
  }, [sale]);

  const totalRefundAmount = useMemo(() => {
    return refundableLines.reduce((sum, line) => {
      const qty = refundQtys[line.id] || 0;
      return sum + line.price.amount * qty;
    }, 0);
  }, [refundableLines, refundQtys]);

  const hasSelection = Object.values(refundQtys).some(q => q > 0);
  const currency = sale?.lines?.[0]?.price?.currency || 'USD';

  const updateQty = (lineId: string, delta: number, max: number) => {
    setRefundQtys(prev => {
      const current = prev[lineId] || 0;
      const next = Math.max(0, Math.min(current + delta, max));
      return { ...prev, [lineId]: next };
    });
  };

  const selectAll = () => {
    const all: Record<string, number> = {};
    for (const line of refundableLines) {
      all[line.id] = line.maxRefundable;
    }
    setRefundQtys(all);
  };

  const handleSubmit = () => {
    if (!sale || !hasSelection) return;
    const lines = Object.entries(refundQtys)
      .filter(([, qty]) => qty > 0)
      .map(([lineId, quantity]) => ({ lineId, quantity }));
    onRefund(sale.id, lines, reason || undefined);
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white" data-testid="pos-refund-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <RotateCcw className="h-5 w-5 text-orange-400" />
            Refund Sale #{sale.code}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select items and quantities to refund. Inventory will be restored.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Select all shortcut */}
          {refundableLines.length > 1 && (
            <button
              data-testid="pos-refund-select-all"
              onClick={selectAll}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Select all for full refund
            </button>
          )}

          {/* Line items */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {refundableLines.map(line => {
              const qty = refundQtys[line.id] || 0;
              return (
                <div
                  key={line.id}
                  data-testid={`pos-refund-line-${line.id}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    qty > 0 ? 'border-orange-500/30 bg-orange-500/5' : 'border-slate-700/50 bg-slate-800/30'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{line.descriptor}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(line.price.amount, line.price.currency)} each
                      {line.refundedQty > 0 && (
                        <span className="text-orange-400 ml-1">({line.refundedQty} already refunded)</span>
                      )}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1">
                    <button
                      data-testid={`pos-refund-dec-${line.id}`}
                      onClick={() => updateQty(line.id, -1, line.maxRefundable)}
                      disabled={qty <= 0}
                      className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors touch-manipulation"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className={`w-8 text-center text-sm font-medium tabular-nums ${qty > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                      {qty}
                    </span>
                    <button
                      data-testid={`pos-refund-inc-${line.id}`}
                      onClick={() => updateQty(line.id, 1, line.maxRefundable)}
                      disabled={qty >= line.maxRefundable}
                      className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors touch-manipulation"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-600 ml-1">/ {line.maxRefundable}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reason */}
          <Textarea
            data-testid="pos-refund-reason"
            placeholder="Reason for refund (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm resize-none focus:border-purple-500 focus:ring-purple-500/20"
          />

          {/* Refund total */}
          {hasSelection && (
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 flex justify-between items-center">
              <span className="text-sm text-orange-300">Refund amount</span>
              <span className="text-base font-bold text-orange-400 tabular-nums">
                {formatCurrency(totalRefundAmount, currency)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              data-testid="pos-refund-cancel"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              data-testid="pos-refund-submit"
              onClick={handleSubmit}
              disabled={!hasSelection || isRefunding}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:bg-slate-700 disabled:text-slate-500"
            >
              {isRefunding ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
              ) : (
                `Refund ${hasSelection ? formatCurrency(totalRefundAmount, currency) : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PosRefundDialog;
