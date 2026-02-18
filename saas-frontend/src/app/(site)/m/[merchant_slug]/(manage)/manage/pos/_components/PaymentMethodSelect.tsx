'use client';

import { Banknote, CreditCard } from "lucide-react";

type Props = {
  value: 'CASH' | 'EXTERNAL_TERMINAL';
  onChange: (method: 'CASH' | 'EXTERNAL_TERMINAL') => void;
};

const methods = [
  { id: 'CASH' as const, label: 'Cash', icon: Banknote, description: 'Cash payment' },
  { id: 'EXTERNAL_TERMINAL' as const, label: 'Card Terminal', icon: CreditCard, description: 'External card reader' },
];

const PaymentMethodSelect = ({ value, onChange }: Props) => {
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="pos-payment-method">
      {methods.map(method => {
        const Icon = method.icon;
        const isSelected = value === method.id;
        return (
          <button
            key={method.id}
            data-testid={`pos-payment-${method.id.toLowerCase()}`}
            onClick={() => onChange(method.id)}
            className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${
              isSelected
                ? 'border-purple-500 bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <div className="text-left">
              <p className={`text-sm font-medium ${isSelected ? 'text-purple-300' : 'text-white'}`}>
                {method.label}
              </p>
              <p className="text-[10px]">{method.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default PaymentMethodSelect;
