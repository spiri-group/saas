'use client';

import { useState, useRef, useEffect } from "react";
import { Minus, Plus, Trash2, PenLine } from "lucide-react";
import { PosCartItem as PosCartItemType } from "../_hooks/usePosCart";
import { formatCurrency } from "@/components/ux/CurrencySpan";

type Props = {
  item: PosCartItemType;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
};

const PosCartItem = ({ item, onUpdateQuantity, onRemove }: Props) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lineTotal = item.price.amount * item.quantity;
  const canIncrement = item.maxQuantity === null || item.quantity < item.maxQuantity;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleQtyTap = () => {
    setEditValue(String(item.quantity));
    setEditing(true);
  };

  const commitQty = () => {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = item.maxQuantity !== null ? Math.min(parsed, item.maxQuantity) : parsed;
      onUpdateQuantity(item.variantId, clamped);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitQty();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div
      className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3 border border-slate-700/50"
      data-testid={`pos-cart-item-${item.variantId}`}
    >
      {/* Image */}
      <div className="h-12 w-12 flex-shrink-0 rounded-md bg-slate-900 overflow-hidden">
        {item.isCustom ? (
          <div className="flex h-full items-center justify-center bg-purple-500/10">
            <PenLine className="h-5 w-5 text-purple-400" />
          </div>
        ) : item.image ? (
          <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600 text-lg">📦</div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-white truncate">{item.productName}</p>
          {item.isCustom && (
            <span className="text-[9px] font-semibold text-purple-300 bg-purple-500/15 px-1 py-0.5 rounded flex-shrink-0">
              CUSTOM
            </span>
          )}
        </div>
        {item.variantName && item.variantName !== item.productName && !item.isCustom && (
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
          className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        {editing ? (
          <input
            ref={inputRef}
            data-testid={`pos-cart-qty-input-${item.variantId}`}
            type="number"
            min="1"
            max={item.maxQuantity ?? undefined}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitQty}
            onKeyDown={handleKeyDown}
            className="w-10 h-7 text-center text-sm font-medium text-white tabular-nums bg-slate-700 border border-purple-500 rounded-md outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <button
            data-testid={`pos-cart-qty-${item.variantId}`}
            onClick={handleQtyTap}
            className="w-10 h-7 text-center text-sm font-medium text-white tabular-nums rounded-md hover:bg-slate-700 active:bg-slate-600 transition-colors touch-manipulation cursor-text"
            title="Tap to edit quantity"
          >
            {item.quantity}
          </button>
        )}
        <button
          data-testid={`pos-cart-increment-${item.variantId}`}
          onClick={() => canIncrement && onUpdateQuantity(item.variantId, item.quantity + 1)}
          disabled={!canIncrement}
          className={`rounded-md p-1.5 transition-colors touch-manipulation ${
            canIncrement
              ? 'text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600'
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
        className="text-slate-500 hover:text-red-400 active:text-red-300 transition-colors p-1 touch-manipulation"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PosCartItem;
