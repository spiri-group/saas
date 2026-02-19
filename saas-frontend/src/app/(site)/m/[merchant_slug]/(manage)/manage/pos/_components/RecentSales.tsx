'use client';

import { useState } from "react";
import { Clock, Printer, XCircle, RotateCcw, Loader2, Banknote, CreditCard, CheckCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/components/ux/CurrencySpan";
import { PosSaleOrder } from "../_hooks/UseRecentPosSales";

type Props = {
  sales: PosSaleOrder[] | undefined;
  isLoading: boolean;
  isVoiding: boolean;
  onReprint: (sale: PosSaleOrder) => void;
  onVoid: (orderId: string) => void;
  onRefund?: (sale: PosSaleOrder) => void;
};

const RecentSales = ({ sales, isLoading, isVoiding, onReprint, onVoid, onRefund }: Props) => {
  const [voidConfirm, setVoidConfirm] = useState<PosSaleOrder | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-400" data-testid="pos-recent-loading">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Loading recent sales...</span>
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-slate-500" data-testid="pos-recent-empty">
        <Clock className="h-6 w-6 mb-1 text-slate-600" />
        <p className="text-xs">No recent sales</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5" data-testid="pos-recent-sales">
        {sales.map(sale => {
          const payment = sale.payments?.[0];
          const total = payment?.charge?.paid ?? 0;
          const currency = sale.lines?.[0]?.price?.currency ?? 'USD';
          const isVoided = !!sale.voidedAt;
          const isRefunded = sale.paid_status === 'FULL_REFUND';
          const isPartialRefund = sale.paid_status === 'PARTIAL_REFUND';
          const hasRefundableLines = sale.lines.some(l => (l.quantity - (l.refund_quantity || 0)) > 0);
          const isCash = payment?.method_description === 'Cash';
          const saleDate = new Date(sale.createdDate);
          const isToday = saleDate.toDateString() === new Date().toDateString();
          const timeStr = saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = isToday ? timeStr : `${saleDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} ${timeStr}`;

          return (
            <div
              key={sale.id}
              data-testid={`pos-recent-sale-${sale.id}`}
              className={`group flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                isVoided
                  ? 'border-red-500/20 bg-red-500/5 opacity-60'
                  : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60'
              }`}
            >
              {/* Status icon */}
              <div className={`flex-shrink-0 rounded-full p-1.5 ${
                isVoided ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
              }`}>
                {isVoided ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">#{sale.code}</span>
                  {isVoided && (
                    <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                      VOIDED
                    </span>
                  )}
                  {isRefunded && (
                    <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                      REFUNDED
                    </span>
                  )}
                  {isPartialRefund && (
                    <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                      PARTIAL REFUND
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{dateStr}</span>
                  <span className="flex items-center gap-0.5">
                    {isCash ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                    {payment?.method_description}
                  </span>
                  <span>{sale.lines.length} item{sale.lines.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Total */}
              <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                isVoided ? 'text-red-400 line-through' : 'text-white'
              }`}>
                {formatCurrency(total, currency)}
              </span>

              {/* Actions */}
              {!isVoided && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    data-testid={`pos-reprint-${sale.id}`}
                    onClick={() => onReprint(sale)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Reprint receipt"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  {onRefund && hasRefundableLines && !isRefunded && (
                    <button
                      data-testid={`pos-refund-${sale.id}`}
                      onClick={() => onRefund(sale)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                      title="Refund"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!isRefunded && !isPartialRefund && (
                    <button
                      data-testid={`pos-void-${sale.id}`}
                      onClick={() => setVoidConfirm(sale)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Void sale"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Void confirmation dialog */}
      <Dialog open={!!voidConfirm} onOpenChange={() => setVoidConfirm(null)}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-700 text-white" data-testid="pos-void-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <XCircle className="h-5 w-5 text-red-400" />
              Void Sale
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This will void sale <strong className="text-white">#{voidConfirm?.code}</strong> and restore all inventory. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button
              data-testid="pos-void-cancel"
              variant="outline"
              onClick={() => setVoidConfirm(null)}
              className="flex-1 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              data-testid="pos-void-confirm-btn"
              onClick={() => {
                if (voidConfirm) {
                  onVoid(voidConfirm.id);
                  setVoidConfirm(null);
                }
              }}
              disabled={isVoiding}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isVoiding ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Voiding...</>
              ) : (
                'Void Sale'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecentSales;
