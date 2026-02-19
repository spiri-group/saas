'use client';

import { Plus, AlertTriangle, Ban } from "lucide-react";
import { PosProduct, PosVariant } from "../_hooks/UseMerchantProducts";
import { formatCurrency } from "@/components/ux/CurrencySpan";

type Props = {
  product: PosProduct;
  onAddToCart: (product: PosProduct, variant: PosVariant) => void;
};

const PosProductCard = ({ product, onAddToCart }: Props) => {
  const variant = product.variants?.[0];
  if (!variant) return null;

  const inv = variant.inventory;
  const tracksInventory = inv?.track_inventory ?? false;
  const qtyAvailable = tracksInventory ? inv!.qty_on_hand - inv!.qty_committed : null;
  const isOutOfStock = tracksInventory && qtyAvailable !== null && qtyAvailable <= 0;
  const isLowStock = tracksInventory && qtyAvailable !== null && !isOutOfStock &&
    inv!.low_stock_threshold != null && qtyAvailable <= inv!.low_stock_threshold;

  const image = variant.images?.[0]?.url;
  const hasMultipleVariants = product.variants.length > 1;

  return (
    <button
      data-testid={`pos-product-${product.id}`}
      onClick={() => !isOutOfStock && onAddToCart(product, variant)}
      disabled={isOutOfStock}
      className={`group relative flex flex-col rounded-lg border transition-all text-left w-full touch-manipulation
        ${isOutOfStock
          ? 'border-slate-700/50 bg-slate-800/30 opacity-60 cursor-not-allowed'
          : 'border-slate-700 bg-slate-800 hover:border-purple-500/50 active:border-purple-500 active:scale-[0.97] cursor-pointer'
        }`}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-slate-900">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <span className="text-3xl">📦</span>
          </div>
        )}

        {/* Stock badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white">
              <Ban className="h-3 w-3" /> Out of Stock
            </span>
          </div>
        )}
        {isLowStock && (
          <div className="absolute top-1.5 left-1.5">
            <span className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              <AlertTriangle className="h-3 w-3" /> {qtyAvailable} left
            </span>
          </div>
        )}

        {/* Always-visible add button */}
        {!isOutOfStock && (
          <div className="absolute bottom-1.5 right-1.5">
            <div className="rounded-full bg-purple-600 p-1.5 shadow-lg group-active:bg-purple-700 transition-colors">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <h3 className="text-sm font-medium text-white leading-tight line-clamp-2">
          {product.name}
        </h3>
        {hasMultipleVariants && (
          <span className="text-[10px] text-slate-400">
            {product.variants.length} variants
          </span>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-purple-400">
            {formatCurrency(variant.defaultPrice.amount, variant.defaultPrice.currency)}
          </span>
          {tracksInventory && qtyAvailable !== null && !isOutOfStock && (
            <span className="text-[10px] text-slate-500">
              {qtyAvailable} in stock
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default PosProductCard;
