"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Monitor, Keyboard } from "lucide-react";
import withProtection from "@/components/ux/HOC/withProtection";
import HasMerchantAccess from "../../../../_hooks/HasMerchantAccess";
import { UseMerchantProducts, PosProduct, PosVariant } from "./_hooks/UseMerchantProducts";
import { UseCreatePosSale, PosOrderResponse } from "./_hooks/UseCreatePosSale";
import { usePosCart } from "./_hooks/usePosCart";
import ProductSearch from "./_components/ProductSearch";
import ProductGrid from "./_components/ProductGrid";
import PosCart from "./_components/PosCart";
import PosReceipt from "./_components/PosReceipt";
import VariantSelector from "./_components/VariantSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PosUIProps {
  merchantId: string;
  merchantName: string;
  merchantCurrency: string;
}

const PosUIComponent = ({ merchantId, merchantName }: PosUIProps) => {
  const [search, setSearch] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<PosOrderResponse['order'] | null>(null);
  const [variantProduct, setVariantProduct] = useState<PosProduct | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { data: products, isLoading } = UseMerchantProducts(merchantId, search);
  const createSale = UseCreatePosSale(merchantId);
  const cart = usePosCart();

  // Filter products that match search locally for instant feel
  const filteredProducts = useMemo(() => {
    if (!products) return undefined;
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.variants.some(v => v.name.toLowerCase().includes(q) || v.code?.toLowerCase().includes(q))
    );
  }, [products, search]);

  const handleAddToCart = useCallback((product: PosProduct, variant: PosVariant) => {
    // If product has multiple variants, show variant selector
    if (product.variants.length > 1 && !variant) {
      setVariantProduct(product);
      return;
    }

    const targetVariant = variant || product.variants[0];
    if (!targetVariant) return;

    const inv = targetVariant.inventory;
    const tracksInventory = inv?.track_inventory ?? false;
    const qtyAvailable = tracksInventory ? inv!.qty_on_hand - inv!.qty_committed : null;

    if (tracksInventory && qtyAvailable !== null && qtyAvailable <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    // Check if adding would exceed stock
    const existingItem = cart.items.find(i => i.variantId === targetVariant.id);
    if (tracksInventory && qtyAvailable !== null && existingItem && existingItem.quantity >= qtyAvailable) {
      toast.error(`Only ${qtyAvailable} available for ${product.name}`);
      return;
    }

    cart.addItem(
      product.id,
      product.name,
      targetVariant,
      { id: product.ref.id, partition: product.ref.partition },
      1
    );

    // Quick subtle feedback
    toast.success(`Added ${product.name}`, { duration: 1500 });
  }, [cart]);

  const handleProductClick = useCallback((product: PosProduct, variant: PosVariant) => {
    if (product.variants.length > 1) {
      setVariantProduct(product);
    } else {
      handleAddToCart(product, variant);
    }
  }, [handleAddToCart]);

  const handleVariantSelect = useCallback((variant: PosVariant) => {
    if (variantProduct) {
      handleAddToCart(variantProduct, variant);
      setVariantProduct(null);
    }
  }, [variantProduct, handleAddToCart]);

  const handleCompleteSale = useCallback(async () => {
    if (cart.items.length === 0) return;

    try {
      const result = await createSale.mutateAsync({
        customerEmail: cart.customerEmail || undefined,
        lines: cart.items.map(item => ({
          id: item.variantId,
          merchantId,
          forObject: item.forObject,
          variantId: item.variantId,
          descriptor: item.productName + (item.variantName !== item.productName ? ` - ${item.variantName}` : ''),
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod: cart.paymentMethod,
        notes: cart.notes || undefined,
      });

      setCompletedOrder(result.order);
      setReceiptOpen(true);
      toast.success("Sale completed!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to complete sale");
    }
  }, [cart, merchantId, createSale]);

  const handleNewSale = useCallback(() => {
    cart.clear();
    setReceiptOpen(false);
    setCompletedOrder(null);
  }, [cart]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    switch (e.key) {
      case 'Enter':
        if (cart.items.length > 0 && !createSale.isPending) {
          e.preventDefault();
          handleCompleteSale();
        }
        break;
      case 'Escape':
        if (receiptOpen) {
          setReceiptOpen(false);
        } else if (search) {
          setSearch('');
        }
        break;
      case '/':
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-testid="pos-search-input"]')?.focus();
        break;
      case 'Delete':
      case 'Backspace':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          cart.clear();
        }
        break;
      case '?':
        e.preventDefault();
        setShortcutsOpen(true);
        break;
    }
  }, [cart, createSale.isPending, handleCompleteSale, receiptOpen, search]);

  return (
    <div
      className="flex h-[calc(100vh-4rem)] gap-0 m-0 overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="pos-page"
    >
      {/* Left pane - Product browser */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-purple-400" />
            <h1 className="text-lg font-semibold text-white">Point of Sale</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="pos-shortcuts-btn"
              onClick={() => setShortcutsOpen(true)}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-700/50">
          <ProductSearch value={search} onChange={setSearch} />
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <ProductGrid
            products={filteredProducts}
            isLoading={isLoading}
            search={search}
            onAddToCart={handleProductClick}
          />
        </div>
      </div>

      {/* Right pane - Cart */}
      <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden bg-slate-900/50 p-4">
        <PosCart
          items={cart.items}
          paymentMethod={cart.paymentMethod}
          customerEmail={cart.customerEmail}
          notes={cart.notes}
          subtotal={cart.subtotal}
          itemCount={cart.itemCount}
          currency={cart.currency}
          isSubmitting={createSale.isPending}
          onUpdateQuantity={cart.updateQuantity}
          onRemoveItem={cart.removeItem}
          onSetPaymentMethod={cart.setPaymentMethod}
          onSetCustomerEmail={cart.setCustomerEmail}
          onSetNotes={cart.setNotes}
          onCompleteSale={handleCompleteSale}
          onClear={cart.clear}
        />
      </div>

      {/* Receipt dialog */}
      <PosReceipt
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onNewSale={handleNewSale}
        order={completedOrder}
        merchantName={merchantName}
      />

      {/* Variant selector dialog */}
      <VariantSelector
        open={!!variantProduct}
        product={variantProduct}
        onSelect={handleVariantSelect}
        onClose={() => setVariantProduct(null)}
      />

      {/* Keyboard shortcuts help */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-700 text-white" data-testid="pos-shortcuts-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Keyboard className="h-5 w-5 text-purple-400" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Quick actions for faster checkout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { key: '/', desc: 'Focus search' },
              { key: 'Enter', desc: 'Complete sale' },
              { key: 'Esc', desc: 'Close dialog / Clear search' },
              { key: 'Ctrl+Del', desc: 'Clear cart' },
              { key: '?', desc: 'Show shortcuts' },
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{s.desc}</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-xs">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PosUI = withProtection<PosUIProps>(PosUIComponent, HasMerchantAccess);

export default PosUI;
