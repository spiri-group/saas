'use client';

import { PauseCircle, Play, Trash2 } from "lucide-react";
import { ParkedSale } from "../_hooks/usePosCart";
import { formatCurrency } from "@/components/ux/CurrencySpan";

type Props = {
  parkedSales: ParkedSale[];
  onRestore: (parkedId: string) => void;
  onDelete: (parkedId: string) => void;
};

const ParkedSales = ({ parkedSales, onRestore, onDelete }: Props) => {
  if (parkedSales.length === 0) return null;

  return (
    <div className="space-y-1.5" data-testid="pos-parked-sales">
      {parkedSales.map(sale => {
        const total = sale.items.reduce((sum, item) => sum + item.price.amount * item.quantity, 0);
        const currency = sale.items[0]?.price.currency || 'USD';
        const parkedDate = new Date(sale.parkedAt);
        const timeStr = parkedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
          <div
            key={sale.id}
            data-testid={`pos-parked-sale-${sale.id}`}
            className="group flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 transition-colors hover:bg-amber-500/10"
          >
            <div className="flex-shrink-0 rounded-full p-1.5 bg-amber-500/10 text-amber-400">
              <PauseCircle className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{sale.label}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>{timeStr}</span>
                <span>{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <span className="text-sm font-semibold text-amber-400 tabular-nums flex-shrink-0">
              {formatCurrency(total, currency)}
            </span>
            <div className="flex items-center gap-1">
              <button
                data-testid={`pos-parked-restore-${sale.id}`}
                onClick={() => onRestore(sale.id)}
                className="p-1.5 rounded-md text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors touch-manipulation"
                title="Resume sale"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
              <button
                data-testid={`pos-parked-delete-${sale.id}`}
                onClick={() => onDelete(sale.id)}
                className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors touch-manipulation"
                title="Discard"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParkedSales;
