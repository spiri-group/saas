'use client';

import { Minus, Plus, Trash2 } from "lucide-react";
import { PosCartItem as PosCartItemType } from "../_hooks/usePosCart";
import { formatCurrency } from "@/components/ux/CurrencySpan";

type Props = {
  item: PosCartItemType;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
};

const PosCartItem = ({ item, onUpdateQuantity, onRemove }: Props) => {
  const lineTotal = item.price.amount * item.quantity;
  const canIncrement = item.maxQuantity === null || item.quantity < item.maxQuantity;

  return (
    <div
      className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3 border border-slate-700/50"
      data-testid={`pos-cart-item-${item.variantId}`}
    >
      {/* Image */}
      <div className="h-12 w-12 flex-shrink-0 rounded-md bg-slate-900 overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600 text-lg">📦</div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.productName}</p>
        {item.variantName && item.variantName !== item.productName && (
          <p className="text-[11px] text-slate-400 truncate">{item.variantName}</p>
        )}
        <p className="text-xs text-slate-500">
          {formatCurrency(item.price.amount, item.price.currency)} each
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1">
        <button
          data-testid={`pos-cart-decrement-${item.variantId}`}
          onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
          className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span
          className="w-8 text-center text-sm font-medium text-white tabular-nums"
          data-testid={`pos-cart-qty-${item.variantId}`}
        >
          {item.quantity}
        </span>
        <button
          data-testid={`pos-cart-increment-${item.variantId}`}
          onClick={() => canIncrement && onUpdateQuantity(item.variantId, item.quantity + 1)}
          disabled={!canIncrement}
          className={`rounded-md p-1.5 transition-colors ${
            canIncrement
              ? 'text-slate-400 hover:text-white hover:bg-slate-700'
              : 'text-slate-600 cursor-not-allowed'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Line total */}
      <div className="text-right w-20 flex-shrink-0">
        <p className="text-sm font-semibold text-white tabular-nums">
          {formatCurrency(lineTotal, item.price.currency)}
        </p>
      </div>

      {/* Remove */}
      <button
        data-testid={`pos-cart-remove-${item.variantId}`}
        onClick={() => onRemove(item.variantId)}
        className="text-slate-500 hover:text-red-400 transition-colors p-1"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PosCartItem;
