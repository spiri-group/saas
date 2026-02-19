'use client';

import { useState } from "react";
import { Percent, DollarSign, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PosDiscount } from "../_hooks/usePosCart";

type Props = {
  discount: PosDiscount | null;
  onSetDiscount: (discount: PosDiscount | null) => void;
};

const DiscountForm = ({ discount, onSetDiscount }: Props) => {
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>(discount?.type || 'PERCENTAGE');
  const [valueStr, setValueStr] = useState(discount ? String(discountType === 'FIXED' ? discount.value / 100 : discount.value) : '');
  const [reason, setReason] = useState(discount?.reason || '');

  const applyDiscount = (type: 'PERCENTAGE' | 'FIXED', val: string, reasonStr: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) {
      onSetDiscount(null);
      return;
    }
    const value = type === 'FIXED' ? Math.round(parsed * 100) : parsed;
    if (type === 'PERCENTAGE' && value > 100) return;
    onSetDiscount({ type, value, reason: reasonStr });
  };

  const handleValueChange = (val: string) => {
    setValueStr(val);
    applyDiscount(discountType, val, reason);
  };

  const handleTypeChange = (type: 'PERCENTAGE' | 'FIXED') => {
    setDiscountType(type);
    setValueStr('');
    onSetDiscount(null);
  };

  const handleReasonChange = (r: string) => {
    setReason(r);
    if (valueStr) applyDiscount(discountType, valueStr, r);
  };

  const handleClear = () => {
    setValueStr('');
    setReason('');
    onSetDiscount(null);
  };

  return (
    <div className="space-y-2" data-testid="pos-discount-form">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">Discount</label>
        {discount && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-0.5"
            data-testid="pos-discount-clear"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
      <div className="flex gap-1.5">
        <div className="flex rounded-md overflow-hidden border border-slate-700 flex-shrink-0">
          <button
            type="button"
            data-testid="pos-discount-pct"
            onClick={() => handleTypeChange('PERCENTAGE')}
            className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
              discountType === 'PERCENTAGE'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Percent className="h-3 w-3" />
          </button>
          <button
            type="button"
            data-testid="pos-discount-fixed"
            onClick={() => handleTypeChange('FIXED')}
            className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
              discountType === 'FIXED'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="h-3 w-3" />
          </button>
        </div>
        <Input
          data-testid="pos-discount-value"
          type="number"
          step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
          min="0"
          max={discountType === 'PERCENTAGE' ? '100' : undefined}
          placeholder={discountType === 'PERCENTAGE' ? '0%' : '$0.00'}
          value={valueStr}
          onChange={(e) => handleValueChange(e.target.value)}
          className="w-20 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-8 focus:border-purple-500 focus:ring-purple-500/20"
        />
        <Input
          data-testid="pos-discount-reason"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => handleReasonChange(e.target.value)}
          className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-8 focus:border-purple-500 focus:ring-purple-500/20"
        />
      </div>
    </div>
  );
};

export default DiscountForm;
