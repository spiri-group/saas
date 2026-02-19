"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Monitor, Keyboard, Clock, ChevronDown, ChevronUp, TrendingUp, PauseCircle } from "lucide-react";
import withProtection from "@/components/ux/HOC/withProtection";
import HasMerchantAccess from "../../../../_hooks/HasMerchantAccess";
import { UseMerchantProducts, PosProduct, PosVariant } from "./_hooks/UseMerchantProducts";
import { UseCreatePosSale } from "./_hooks/UseCreatePosSale";
import { UseRecentPosSales, PosSaleOrder } from "./_hooks/UseRecentPosSales";
import { UseVoidPosSale } from "./_hooks/UseVoidPosSale";
import { UseRefundPosSale } from "./_hooks/UseRefundPosSale";
import { UseMerchantLocation } from "./_hooks/UseMerchantLocation";
import { usePosCart } from "./_hooks/usePosCart";
import ProductSearch from "./_components/ProductSearch";
import CategoryFilter from "./_components/CategoryFilter";
import ProductGrid from "./_components/ProductGrid";
import PosCart from "./_components/PosCart";
import PosReceipt, { ReceiptOrder } from "./_components/PosReceipt";
import VariantSelector from "./_components/VariantSelector";
import RecentSales from "./_components/RecentSales";
import SaleSuccessOverlay from "./_components/SaleSuccessOverlay";
import PosRefundDialog from "./_components/PosRefundDialog";
import ParkedSales from "./_components/ParkedSales";
import CashRegister from "./_components/CashRegister";
import { formatCurrency } from "@/components/ux/CurrencySpan";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Tax rates by country (GST-inclusive pricing)
const POS_TAX_RATES: Record<string, { rate: number; label: string }> = {
  AU: { rate: 0.10, label: 'GST' },
  NZ: { rate: 0.15, label: 'GST' },
  GB: { rate: 0.20, label: 'VAT' },
};

interface PosUIProps {
  merchantId: string;
  merchantName: string;
  merchantCurrency: string;
}

const PosUIComponent = ({ merchantId, merchantName, merchantCurrency }: PosUIProps) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<ReceiptOrder | null>(null);
  const [variantProduct, setVariantProduct] = useState<PosProduct | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [refundSale, setRefundSale] = useState<PosSaleOrder | null>(null);
  const [parkedExpanded, setParkedExpanded] = useState(false);

  const { data: products, isLoading } = UseMerchantProducts(merchantId, search);
  const createSale = UseCreatePosSale(merchantId);
  const recentSales = UseRecentPosSales(merchantId);
  const voidSale = UseVoidPosSale(merchantId);
  const refundPosSale = UseRefundPosSale(merchantId);
  const { data: merchantLocation } = UseMerchantLocation(merchantId);
  const cart = usePosCart(merchantId);

  // Determine tax config from merchant country
  const merchantCountry = (merchantLocation?.country || '').toUpperCase();
  const taxConfig = POS_TAX_RATES[merchantCountry] || null;

  // Calculate estimated tax for cart display
  const cartTaxAmount = useMemo(() => {
    if (!taxConfig || cart.total <= 0) return 0;
    return Math.round(cart.total * taxConfig.rate / (1 + taxConfig.rate));
  }, [taxConfig, cart.total]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set<string>();
    for (const p of products) {
      if (p.category) cats.add(p.category);
    }
    return Array.from(cats).sort();
  }, [products]);

  // Daily sales summary from recent sales
  const todaySummary = useMemo(() => {
    if (!recentSales.data) return { total: 0, count: 0, currency: merchantCurrency };
    const today = new Date().toDateString();
    let total = 0;
    let count = 0;
    let currency = merchantCurrency;
    for (const sale of recentSales.data) {
      if (sale.voidedAt) continue;
      if (new Date(sale.createdDate).toDateString() === today) {
        const payment = sale.payments?.[0];
        if (payment) {
          total += payment.charge.paid;
          currency = sale.lines?.[0]?.price?.currency || currency;
        }
        count++;
      }
    }
    return { total, count, currency };
  }, [recentSales.data, merchantCurrency]);

  // Filter products by search + category
  const filteredProducts = useMemo(() => {
    if (!products) return undefined;
    let result = products;
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.variants.some(v => v.name.toLowerCase().includes(q) || v.code?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, search, selectedCategory]);

  // Barcode scan handler - exact match on variant code
  const handleBarcodeScan = useCallback((code: string): boolean => {
    if (!products) return false;
    const trimmedCode = code.trim();

    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.code && variant.code.toLowerCase() === trimmedCode.toLowerCase()) {
          // Found exact match - add to cart
          const inv = variant.inventory;
          const tracksInventory = inv?.track_inventory ?? false;
          const qtyAvailable = tracksInventory ? inv!.qty_on_hand - inv!.qty_committed : null;

          if (tracksInventory && qtyAvailable !== null && qtyAvailable <= 0) {
            toast.error(`${product.name} is out of stock`);
            return true; // Matched but out of stock
          }

          const existingItem = cart.items.find(i => i.variantId === variant.id);
          if (tracksInventory && qtyAvailable !== null && existingItem && existingItem.quantity >= qtyAvailable) {
            toast.error(`Only ${qtyAvailable} available for ${product.name}`);
            return true;
          }

          cart.addItem(
            product.id,
            product.name,
            variant,
            { id: product.ref.id, partition: product.ref.partition },
            1
          );
          toast.success(`Scanned: ${product.name}`, { duration: 1200 });
          return true;
        }
      }
    }
    return false;
  }, [products, cart]);

  const handleAddToCart = useCallback((product: PosProduct, variant: PosVariant) => {
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

    toast.success(`Added ${product.name}`, { duration: 1200 });
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
          ...(item.forObject && { forObject: item.forObject }),
          ...(item.variantId && !item.isCustom && { variantId: item.variantId }),
          descriptor: item.productName + (item.variantName !== item.productName && !item.isCustom ? ` - ${item.variantName}` : ''),
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod: cart.paymentMethod,
        notes: cart.notes || undefined,
        ...(cart.discount && {
          discount: {
            type: cart.discount.type,
            value: cart.discount.value,
            reason: cart.discount.reason || undefined,
          }
        }),
      });

      setCompletedOrder(result.order);
      setShowSuccess(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to complete sale");
    }
  }, [cart, merchantId, createSale]);

  const handleSuccessAnimationComplete = useCallback(() => {
    setShowSuccess(false);
    setReceiptOpen(true);
  }, []);

  const handleNewSale = useCallback(() => {
    cart.clear();
    setReceiptOpen(false);
    setCompletedOrder(null);
  }, [cart]);

  const handleReprint = useCallback((sale: PosSaleOrder) => {
    setCompletedOrder(sale as ReceiptOrder);
    setReceiptOpen(true);
  }, []);

  const handleVoid = useCallback(async (orderId: string) => {
    try {
      await voidSale.mutateAsync(orderId);
      toast.success("Sale voided and inventory restored");
    } catch (error: any) {
      toast.error(error?.message || "Failed to void sale");
    }
  }, [voidSale]);

  const handleRefund = useCallback(async (orderId: string, lines: { lineId: string; quantity: number }[], reason?: string) => {
    try {
      await refundPosSale.mutateAsync({ orderId, lines, reason });
      toast.success("Refund processed and inventory restored");
      setRefundSale(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to process refund");
    }
  }, [refundPosSale]);

  const handleParkSale = useCallback(() => {
    cart.parkSale();
    toast.success("Sale parked", { duration: 1200 });
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
      case 'p':
      case 'P':
        if (e.ctrlKey || e.metaKey) {
          // Don't override browser print
        } else if (cart.items.length > 0) {
          e.preventDefault();
          handleParkSale();
        }
        break;
    }
  }, [cart, createSale.isPending, handleCompleteSale, handleParkSale, receiptOpen, search]);

  return (
    <div
      className="flex flex-col md:flex-row h-[calc(100vh-4rem)] gap-0 m-0 overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="pos-page"
    >
      {/* Left pane - Product browser */}
      <div className="flex flex-1 flex-col overflow-hidden border-b md:border-b-0 md:border-r border-slate-700 min-h-0 h-1/2 md:h-auto">
        {/* Header with daily summary */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-purple-400" />
            <h1 className="text-lg font-semibold text-white">Point of Sale</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Daily summary */}
            {todaySummary.count > 0 && (
              <div className="flex items-center gap-1.5 text-xs" data-testid="pos-daily-summary">
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400 font-semibold tabular-nums">
                  {formatCurrency(todaySummary.total, todaySummary.currency)}
                </span>
                <span className="text-slate-500">
                  / {todaySummary.count} sale{todaySummary.count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {/* Cash register */}
            <CashRegister
              registerState={cart.registerState}
              sales={recentSales.data}
              currency={merchantCurrency}
              onOpenRegister={cart.openRegister}
              onCloseRegister={cart.closeRegister}
            />
            <button
              data-testid="pos-shortcuts-btn"
              onClick={() => setShortcutsOpen(true)}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800 hidden md:block"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-700/50 flex-shrink-0 space-y-2">
          <ProductSearch
            value={search}
            onChange={setSearch}
            onBarcodeScan={handleBarcodeScan}
          />
          {/* Category filter pills */}
          {categories.length > 1 && (
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          )}
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

      {/* Right pane - Cart + Parked + Recent Sales */}
      <div className="w-full md:w-[420px] flex-shrink-0 flex flex-col overflow-hidden bg-slate-900/50 min-h-0 h-1/2 md:h-auto">
        {/* Cart */}
        <div className="flex-1 overflow-hidden p-4 min-h-0">
          <PosCart
            items={cart.items}
            paymentMethod={cart.paymentMethod}
            customerEmail={cart.customerEmail}
            notes={cart.notes}
            discount={cart.discount}
            subtotal={cart.subtotal}
            discountAmount={cart.discountAmount}
            total={cart.total}
            itemCount={cart.itemCount}
            currency={cart.currency}
            isSubmitting={createSale.isPending}
            taxLabel={taxConfig?.label || null}
            taxAmount={cartTaxAmount}
            onUpdateQuantity={cart.updateQuantity}
            onRemoveItem={cart.removeItem}
            onSetPaymentMethod={cart.setPaymentMethod}
            onSetCustomerEmail={cart.setCustomerEmail}
            onSetNotes={cart.setNotes}
            onSetDiscount={cart.setDiscount}
            onAddCustomItem={cart.addCustomItem}
            onCompleteSale={handleCompleteSale}
            onClear={cart.clear}
            onParkSale={handleParkSale}
            hasParkedSales={cart.parkedSales.length > 0}
          />
        </div>

        {/* Parked Sales - Collapsible panel */}
        {cart.parkedSales.length > 0 && (
          <div className="border-t border-slate-700 bg-slate-900/80 flex-shrink-0">
            <button
              data-testid="pos-parked-toggle"
              onClick={() => setParkedExpanded(!parkedExpanded)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-amber-300 hover:text-amber-200 transition-colors touch-manipulation"
            >
              <div className="flex items-center gap-2">
                <PauseCircle className="h-4 w-4 text-amber-400" />
                <span className="font-medium">Parked Sales</span>
                <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400">
                  {cart.parkedSales.length}
                </span>
              </div>
              {parkedExpanded
                ? <ChevronDown className="h-4 w-4 text-amber-500" />
                : <ChevronUp className="h-4 w-4 text-amber-500" />
              }
            </button>
            {parkedExpanded && (
              <div className="px-4 pb-3 max-h-36 overflow-y-auto">
                <ParkedSales
                  parkedSales={cart.parkedSales}
                  onRestore={cart.restoreParkedSale}
                  onDelete={cart.deleteParkedSale}
                />
              </div>
            )}
          </div>
        )}

        {/* Recent Sales - Collapsible panel */}
        <div className="border-t border-slate-700 bg-slate-900/80 flex-shrink-0">
          <button
            data-testid="pos-recent-toggle"
            onClick={() => setRecentExpanded(!recentExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-300 hover:text-white transition-colors touch-manipulation"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="font-medium">Recent Sales</span>
              {recentSales.data && recentSales.data.length > 0 && (
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">
                  {recentSales.data.length}
                </span>
              )}
            </div>
            {recentExpanded
              ? <ChevronDown className="h-4 w-4 text-slate-500" />
              : <ChevronUp className="h-4 w-4 text-slate-500" />
            }
          </button>
          {recentExpanded && (
            <div className="px-4 pb-3 max-h-44 overflow-y-auto">
              <RecentSales
                sales={recentSales.data}
                isLoading={recentSales.isLoading}
                isVoiding={voidSale.isPending}
                onReprint={handleReprint}
                onVoid={handleVoid}
                onRefund={(sale) => setRefundSale(sale)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Success animation overlay */}
      <SaleSuccessOverlay
        show={showSuccess}
        onComplete={handleSuccessAnimationComplete}
      />

      {/* Receipt dialog */}
      <PosReceipt
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onNewSale={handleNewSale}
        order={completedOrder}
        merchantName={merchantName}
        merchantAddress={merchantLocation?.address}
      />

      {/* Variant selector dialog */}
      <VariantSelector
        open={!!variantProduct}
        product={variantProduct}
        onSelect={handleVariantSelect}
        onClose={() => setVariantProduct(null)}
      />

      {/* Refund dialog */}
      <PosRefundDialog
        open={!!refundSale}
        sale={refundSale}
        isRefunding={refundPosSale.isPending}
        onRefund={handleRefund}
        onClose={() => setRefundSale(null)}
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
              { key: '/', desc: 'Focus search / scan' },
              { key: 'Enter', desc: 'Complete sale' },
              { key: 'P', desc: 'Park current sale' },
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
