'use client';

import { useState } from "react";
import { DollarSign, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/components/ux/CurrencySpan";
import { RegisterState } from "../_hooks/usePosCart";
import { PosSaleOrder } from "../_hooks/UseRecentPosSales";

type Props = {
  registerState: RegisterState | null;
  sales: PosSaleOrder[] | undefined;
  currency: string;
  onOpenRegister: (openingFloat: number, currency: string) => void;
  onCloseRegister: () => void;
};

const CashRegister = ({ registerState, sales, currency, onOpenRegister, onCloseRegister }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [floatAmount, setFloatAmount] = useState('');
  const [countedCash, setCountedCash] = useState('');

  // Calculate daily totals from sales data
  const today = new Date().toDateString();
  const todaySales = (sales || []).filter(s =>
    !s.voidedAt && new Date(s.createdDate).toDateString() === today
  );

  const cashSales = todaySales.filter(s => s.payments?.[0]?.method_description === 'Cash');
  const terminalSales = todaySales.filter(s => s.payments?.[0]?.method_description !== 'Cash');

  const cashTotal = cashSales.reduce((sum, s) => sum + (s.payments?.[0]?.charge?.paid || 0), 0);
  const terminalTotal = terminalSales.reduce((sum, s) => sum + (s.payments?.[0]?.charge?.paid || 0), 0);

  // Calculate refunds back today
  const todayRefunds = todaySales.reduce((sum, s) => {
    if (!s.posRefunds) return sum;
    return sum + s.posRefunds.reduce((rSum, r) => {
      if (new Date(r.date).toDateString() === today) return rSum + r.amount;
      return rSum;
    }, 0);
  }, 0);

  const grandTotal = cashTotal + terminalTotal;
  const expectedCash = (registerState?.openingFloat || 0) + cashTotal - todayRefunds;

  const handleOpenRegister = () => {
    const amount = Math.round(parseFloat(floatAmount) * 100);
    if (isNaN(amount) || amount < 0) return;
    onOpenRegister(amount, currency);
    setFloatAmount('');
    setOpenDialog(false);
  };

  const handleCloseRegister = () => {
    onCloseRegister();
    setCountedCash('');
    setCloseDialog(false);
  };

  const countedAmount = Math.round(parseFloat(countedCash) * 100);
  const variance = !isNaN(countedAmount) ? countedAmount - expectedCash : null;

  if (!registerState) {
    return (
      <>
        <button
          data-testid="pos-open-register"
          onClick={() => setOpenDialog(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2.5 py-2 rounded-md border border-slate-700 hover:border-slate-600 touch-manipulation"
        >
          <DollarSign className="h-3 w-3" />
          Open Register
        </button>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-700 text-white" data-testid="pos-open-register-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5 text-green-400" />
                Open Register
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter the opening cash float to start tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  data-testid="pos-register-float-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={floatAmount}
                  onChange={(e) => setFloatAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenRegister()}
                  className="pl-7 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-lg h-12 focus:border-purple-500 focus:ring-purple-500/20"
                  autoFocus
                />
              </div>
              <Button
                data-testid="pos-register-open-btn"
                onClick={handleOpenRegister}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Open Register
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <button
        data-testid="pos-close-register"
        onClick={() => setCloseDialog(true)}
        className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors px-2.5 py-2 rounded-md border border-green-500/20 hover:border-green-500/40 bg-green-500/5 touch-manipulation"
      >
        <DollarSign className="h-3 w-3" />
        End of Day
      </button>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white" data-testid="pos-close-register-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-green-400" />
              End of Day Summary
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Review your daily sales and close the register.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Sales summary */}
            <div className="rounded-lg bg-slate-800/80 border border-slate-700/50 p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Opening float</span>
                <span className="text-white tabular-nums">{formatCurrency(registerState.openingFloat, currency)}</span>
              </div>
              <div className="border-t border-slate-700/50" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cash sales ({cashSales.length})</span>
                <span className="text-green-400 tabular-nums">+{formatCurrency(cashTotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Card sales ({terminalSales.length})</span>
                <span className="text-blue-400 tabular-nums">{formatCurrency(terminalTotal, currency)}</span>
              </div>
              {todayRefunds > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Refunds</span>
                  <span className="text-orange-400 tabular-nums">-{formatCurrency(todayRefunds, currency)}</span>
                </div>
              )}
              <div className="border-t border-slate-700/50" />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-white">Total sales</span>
                <span className="text-purple-400 tabular-nums">{formatCurrency(grandTotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-white">Expected cash in drawer</span>
                <span className="text-white tabular-nums">{formatCurrency(expectedCash, currency)}</span>
              </div>
            </div>

            {/* Cash count */}
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Counted cash in drawer</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  data-testid="pos-register-count-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="pl-7 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-lg h-12 focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>
              {variance !== null && !isNaN(variance) && (
                <div className={`flex justify-between text-sm p-2 rounded-lg ${
                  variance === 0 ? 'bg-green-500/10 text-green-400' :
                  variance > 0 ? 'bg-blue-500/10 text-blue-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  <span>{variance === 0 ? 'Balanced' : variance > 0 ? 'Over' : 'Short'}</span>
                  <span className="font-semibold tabular-nums">
                    {variance === 0 ? '' : variance > 0 ? '+' : ''}{formatCurrency(variance, currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                data-testid="pos-register-close-cancel"
                variant="outline"
                onClick={() => setCloseDialog(false)}
                className="flex-1 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                data-testid="pos-register-close-btn"
                onClick={handleCloseRegister}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Close Register
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CashRegister;
