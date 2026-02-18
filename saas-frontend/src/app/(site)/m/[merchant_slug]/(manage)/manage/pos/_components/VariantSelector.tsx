'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PosProduct, PosVariant } from "../_hooks/UseMerchantProducts";
import { formatCurrency } from "@/components/ux/CurrencySpan";
import { AlertTriangle, Ban, Check } from "lucide-react";

type Props = {
  open: boolean;
  product: PosProduct | null;
  onSelect: (variant: PosVariant) => void;
  onClose: () => void;
};

const VariantSelector = ({ open, product, onSelect, onClose }: Props) => {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white" data-testid="pos-variant-selector">
        <DialogHeader>
          <DialogTitle className="text-white">Select Variant</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400 -mt-2 mb-2">{product.name}</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {product.variants.map(variant => {
            const inv = variant.inventory;
            const tracksInventory = inv?.track_inventory ?? false;
            const qtyAvailable = tracksInventory ? inv!.qty_on_hand - inv!.qty_committed : null;
            const isOutOfStock = tracksInventory && qtyAvailable !== null && qtyAvailable <= 0;
            const isLowStock = tracksInventory && qtyAvailable !== null && !isOutOfStock &&
              inv!.low_stock_threshold != null && qtyAvailable <= inv!.low_stock_threshold;

            return (
              <button
                key={variant.id}
                data-testid={`pos-variant-${variant.id}`}
                onClick={() => {
                  if (!isOutOfStock) {
                    onSelect(variant);
                    onClose();
                  }
                }}
                disabled={isOutOfStock}
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  isOutOfStock
                    ? 'border-slate-700/50 bg-slate-800/30 opacity-60 cursor-not-allowed'
                    : 'border-slate-700 bg-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 cursor-pointer'
                }`}
              >
                {/* Image */}
                <div className="h-10 w-10 flex-shrink-0 rounded-md bg-slate-900 overflow-hidden">
                  {variant.images?.[0]?.url ? (
                    <img src={variant.images[0].url} alt={variant.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600 text-sm">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{variant.name}</p>
                  {variant.code && (
                    <p className="text-[11px] text-slate-500">SKU: {variant.code}</p>
                  )}
                </div>

                {/* Stock badge */}
                <div className="flex items-center gap-2">
                  {isOutOfStock && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <Ban className="h-3 w-3" /> Out of stock
                    </span>
                  )}
                  {isLowStock && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> {qtyAvailable} left
                    </span>
                  )}
                  {tracksInventory && !isOutOfStock && !isLowStock && qtyAvailable !== null && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Check className="h-3 w-3" /> {qtyAvailable} in stock
                    </span>
                  )}
                </div>

                {/* Price */}
                <span className="text-sm font-semibold text-purple-400 flex-shrink-0">
                  {formatCurrency(variant.defaultPrice.amount, variant.defaultPrice.currency)}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VariantSelector;
