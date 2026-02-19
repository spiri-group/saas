'use client';

import { useState } from "react";
import { ShoppingBag, Loader2, Trash2, PenLine, Tag, PauseCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/components/ux/CurrencySpan";
import PosCartItem from "./PosCartItem";
import PaymentMethodSelect from "./PaymentMethodSelect";
import CustomItemForm from "./CustomItemForm";
import DiscountForm from "./DiscountForm";
import { PosCartItem as PosCartItemType, PosDiscount } from "../_hooks/usePosCart";

type Props = {
  items: PosCartItemType[];
  paymentMethod: 'CASH' | 'EXTERNAL_TERMINAL';
  customerEmail: string;
  notes: string;
  discount: PosDiscount | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  currency: string;
  isSubmitting: boolean;
  taxLabel?: string | null;
  taxAmount?: number;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onSetPaymentMethod: (method: 'CASH' | 'EXTERNAL_TERMINAL') => void;
  onSetCustomerEmail: (email: string) => void;
  onSetNotes: (notes: string) => void;
  onSetDiscount: (discount: PosDiscount | null) => void;
  onAddCustomItem: (name: string, amount: number, currency: string) => void;
  onCompleteSale: () => void;
  onClear: () => void;
  onParkSale?: () => void;
  hasParkedSales?: boolean;
};

const PosCart = ({
  items,
  paymentMethod,
  customerEmail,
  notes,
  discount,
  subtotal,
  discountAmount,
  total,
  itemCount,
  currency,
  isSubmitting,
  onUpdateQuantity,
  onRemoveItem,
  onSetPaymentMethod,
  onSetCustomerEmail,
  onSetNotes,
  onSetDiscount,
  onAddCustomItem,
  onCompleteSale,
  onClear,
  onParkSale,
  hasParkedSales,
  taxLabel,
  taxAmount,
}: Props) => {
  const isEmpty = items.length === 0;
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showDiscount, setShowDiscount] = useState(!!discount);
  const [showMore, setShowMore] = useState(false);
  const hasMore = !!(customerEmail || notes);

  return (
    <div className="flex h-full flex-col" data-testid="pos-cart">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Current Sale</h2>
          {itemCount > 0 && (
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300">
              {itemCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && onParkSale && (
            <button
              data-testid="pos-cart-park"
              onClick={onParkSale}
              className="text-xs text-amber-400 hover:text-amber-300 active:text-amber-200 transition-colors flex items-center gap-1 touch-manipulation"
              title="Park sale for later"
            >
              <PauseCircle className="h-3 w-3" /> Park
            </button>
          )}
          {!isEmpty && (
            <button
              data-testid="pos-cart-clear"
              onClick={onClear}
              className="text-xs text-slate-400 hover:text-red-400 active:text-red-300 transition-colors flex items-center gap-1 touch-manipulation"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Cart items - scrollable area */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {isEmpty && !showCustomForm ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500" data-testid="pos-cart-empty">
            <ShoppingBag className="h-10 w-10 mb-2 text-slate-600" />
            <p className="text-sm">No items yet</p>
            <p className="text-xs mt-1">Tap products or add a custom item</p>
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

        {showCustomForm && (
          <CustomItemForm
            currency={currency}
            onAdd={(name, amount, cur) => {
              onAddCustomItem(name, amount, cur);
            }}
            onClose={() => setShowCustomForm(false)}
          />
        )}
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2 py-2 flex-shrink-0">
        {!showCustomForm && (
          <button
            data-testid="pos-add-custom-item"
            onClick={() => setShowCustomForm(true)}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors px-2.5 py-2 rounded-md border border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 touch-manipulation"
          >
            <PenLine className="h-3 w-3" />
            Custom Item
          </button>
        )}
        {!showDiscount && !discount && (
          <button
            data-testid="pos-add-discount"
            onClick={() => setShowDiscount(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2.5 py-2 rounded-md border border-slate-700 hover:border-slate-600 touch-manipulation"
          >
            <Tag className="h-3 w-3" />
            Discount
          </button>
        )}
      </div>

      {/* Pinned checkout section - always visible */}
      <div className="border-t border-slate-700 pt-3 flex-shrink-0 space-y-3">
        {/* Discount (inline, only when active) */}
        {(showDiscount || discount) && (
          <DiscountForm
            discount={discount}
            onSetDiscount={(d) => {
              onSetDiscount(d);
              if (!d) setShowDiscount(false);
            }}
          />
        )}

        {/* Payment method */}
        <PaymentMethodSelect value={paymentMethod} onChange={onSetPaymentMethod} />

        {/* More options (email, notes) - collapsible */}
        <button
          data-testid="pos-more-options-toggle"
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-300 transition-colors py-1 touch-manipulation"
        >
          <span>
            More options
            {hasMore && <span className="text-purple-400 ml-1">(set)</span>}
          </span>
          {showMore
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
          }
        </button>
        {showMore && (
          <div className="space-y-2 pb-1">
            <Input
              data-testid="pos-customer-email"
              type="email"
              placeholder="Customer email (sends receipt)"
              value={customerEmail}
              onChange={(e) => onSetCustomerEmail(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-9 focus:border-purple-500 focus:ring-purple-500/20"
            />
            <Textarea
              data-testid="pos-notes"
              placeholder="Sale notes..."
              value={notes}
              onChange={(e) => onSetNotes(e.target.value)}
              rows={2}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm resize-none focus:border-purple-500 focus:ring-purple-500/20"
            />
          </div>
        )}

        {/* Totals */}
        <div className="rounded-lg bg-slate-800/80 border border-slate-700/50 p-3 space-y-1.5">
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span>
                <span className="text-white tabular-nums">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Discount
                  {discount?.type === 'PERCENTAGE' && ` (${discount.value}%)`}
                </span>
                <span className="text-green-400 tabular-nums">
                  -{formatCurrency(discountAmount, currency)}
                </span>
              </div>
            </>
          )}
          <div className={`flex justify-between ${discountAmount > 0 ? 'border-t border-slate-700/50 pt-1.5' : ''}`}>
            <span className="text-base font-semibold text-white">Total</span>
            <span className="text-lg font-bold text-purple-400 tabular-nums">
              {formatCurrency(total, currency)}
            </span>
          </div>
          {taxLabel && taxAmount != null && taxAmount > 0 && (
            <p className="text-[11px] text-slate-500 text-right" data-testid="pos-cart-tax">
              Incl. {taxLabel} {formatCurrency(taxAmount, currency)}
            </p>
          )}
        </div>

        {/* Complete sale button */}
        <Button
          data-testid="pos-complete-sale"
          onClick={onCompleteSale}
          disabled={isEmpty || isSubmitting}
          className="w-full h-14 text-base font-semibold bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-slate-700 disabled:text-slate-500 transition-colors touch-manipulation"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            isEmpty ? 'Complete Sale' : `Pay ${formatCurrency(total, currency)}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default PosCart;
