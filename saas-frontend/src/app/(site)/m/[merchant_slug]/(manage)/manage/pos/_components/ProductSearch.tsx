'use client';

import { useState, useRef, useCallback } from "react";
import { Search, X, ScanBarcode } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBarcodeScan?: (code: string) => boolean; // Returns true if code matched a product
};

const ProductSearch = ({ value, onChange, onBarcodeScan }: Props) => {
  const [scanFeedback, setScanFeedback] = useState<'scanned' | 'not-found' | null>(null);
  const lastKeyTime = useRef(0);
  const rapidChars = useRef(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      // Check if this looks like a barcode scan (rapid input or has a code-like pattern)
      const now = Date.now();
      const isRapidInput = rapidChars.current >= 3 && (now - lastKeyTime.current) < 200;
      const isCodeLike = /^[A-Za-z0-9-_]+$/.test(value.trim());

      if (onBarcodeScan && (isRapidInput || isCodeLike)) {
        const matched = onBarcodeScan(value.trim());
        if (matched) {
          onChange('');
          setScanFeedback('scanned');
        } else {
          setScanFeedback('not-found');
        }
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setScanFeedback(null), 1500);
        rapidChars.current = 0;
      }
    } else if (e.key.length === 1) {
      const now = Date.now();
      if (now - lastKeyTime.current < 100) {
        rapidChars.current++;
      } else {
        rapidChars.current = 1;
      }
      lastKeyTime.current = now;
    }
  }, [value, onChange, onBarcodeScan]);

  return (
    <div className="relative" data-testid="pos-product-search">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input
        data-testid="pos-search-input"
        placeholder="Search or scan barcode..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
      />
      {value ? (
        <button
          data-testid="pos-search-clear"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
      )}
      {/* Scan feedback */}
      {scanFeedback && (
        <div
          data-testid="pos-scan-feedback"
          className={`absolute left-0 right-0 -bottom-7 text-xs text-center font-medium transition-opacity ${
            scanFeedback === 'scanned' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {scanFeedback === 'scanned' ? 'Scanned! Added to cart' : 'No product found for this code'}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
