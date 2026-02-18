'use client';

import { ShoppingBag, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/components/ux/CurrencySpan";
import PosCartItem from "./PosCartItem";
import PaymentMethodSelect from "./PaymentMethodSelect";
import { PosCartItem as PosCartItemType } from "../_hooks/usePosCart";

type Props = {
  items: PosCartItemType[];
  paymentMethod: 'CASH' | 'EXTERNAL_TERMINAL';
  customerEmail: string;
  notes: string;
  subtotal: number;
  itemCount: number;
  currency: string;
  isSubmitting: boolean;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onSetPaymentMethod: (method: 'CASH' | 'EXTERNAL_TERMINAL') => void;
  onSetCustomerEmail: (email: string) => void;
  onSetNotes: (notes: string) => void;
  onCompleteSale: () => void;
  onClear: () => void;
};

const PosCart = ({
  items,
  paymentMethod,
  customerEmail,
  notes,
  subtotal,
  itemCount,
  currency,
  isSubmitting,
  onUpdateQuantity,
  onRemoveItem,
  onSetPaymentMethod,
  onSetCustomerEmail,
  onSetNotes,
  onCompleteSale,
  onClear,
}: Props) => {
  const isEmpty = items.length === 0;

  return (
    <div className="flex h-full flex-col" data-testid="pos-cart">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Current Sale</h2>
          {itemCount > 0 && (
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        {!isEmpty && (
          <button
            data-testid="pos-cart-clear"
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500" data-testid="pos-cart-empty">
            <ShoppingBag className="h-10 w-10 mb-2 text-slate-600" />
            <p className="text-sm">No items yet</p>
            <p className="text-xs mt-1">Click products to add them</p>
          </div>
        ) : (
          items.map(item => (
            <PosCartItem
              key={item.variantId}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* Checkout section */}
      <div className="border-t border-slate-700 pt-4 mt-4 space-y-4">
        {/* Payment method */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Payment Method</label>
          <PaymentMethodSelect value={paymentMethod} onChange={onSetPaymentMethod} />
        </div>

        {/* Customer email */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            Customer Email <span className="text-slate-600">(optional)</span>
          </label>
          <Input
            data-testid="pos-customer-email"
            type="email"
            placeholder="Walk-in customer"
            value={customerEmail}
            onChange={(e) => onSetCustomerEmail(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-9 focus:border-purple-500 focus:ring-purple-500/20"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            Notes <span className="text-slate-600">(optional)</span>
          </label>
          <Textarea
            data-testid="pos-notes"
            placeholder="Sale notes..."
            value={notes}
            onChange={(e) => onSetNotes(e.target.value)}
            rows={2}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm resize-none focus:border-purple-500 focus:ring-purple-500/20"
          />
        </div>

        {/* Totals */}
        <div className="rounded-lg bg-slate-800/80 border border-slate-700/50 p-3 space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal ({itemCount} items)</span>
            <span className="text-white font-medium tabular-nums">
              {formatCurrency(subtotal, currency)}
            </span>
          </div>
          <div className="border-t border-slate-700/50 pt-2 flex justify-between">
            <span className="text-base font-semibold text-white">Total</span>
            <span className="text-base font-bold text-purple-400 tabular-nums">
              {formatCurrency(subtotal, currency)}
            </span>
          </div>
        </div>

        {/* Complete sale button */}
        <Button
          data-testid="pos-complete-sale"
          onClick={onCompleteSale}
          disabled={isEmpty || isSubmitting}
          className="w-full h-12 text-base font-semibold bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5 mr-2" />
              Complete Sale &mdash; {isEmpty ? '$0.00' : formatCurrency(subtotal, currency)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PosCart;
