'use client';

import { Loader2, PackageOpen } from "lucide-react";
import { PosProduct, PosVariant } from "../_hooks/UseMerchantProducts";
import PosProductCard from "./PosProductCard";

type Props = {
  products: PosProduct[] | undefined;
  isLoading: boolean;
  search: string;
  onAddToCart: (product: PosProduct, variant: PosVariant) => void;
};

const ProductGrid = ({ products, isLoading, search, onAddToCart }: Props) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400" data-testid="pos-products-loading">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading products...</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400" data-testid="pos-products-empty">
        <PackageOpen className="h-12 w-12 mb-3 text-slate-600" />
        <p className="text-sm font-medium text-slate-300">
          {search ? 'No products match your search' : 'No products available'}
        </p>
        <p className="text-xs mt-1">
          {search ? 'Try a different search term' : 'Add products to your catalogue first'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
      data-testid="pos-product-grid"
    >
      {products.map(product => (
        <PosProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
