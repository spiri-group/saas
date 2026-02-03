'use client';

import { SpreadConfig, formatPrice } from '../types';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface SpreadCardProps {
  config: SpreadConfig;
  selected: boolean;
  onSelect: () => void;
}

const SpreadCard: React.FC<SpreadCardProps> = ({ config, selected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`spread-card-${config.type}`}
      className={cn(
        'w-full p-4 rounded-lg border-2 text-left transition-all cursor-pointer',
        'hover:border-purple-500/50 hover:bg-purple-500/5',
        selected
          ? 'border-purple-500 bg-purple-500/10'
          : 'border-slate-700 bg-slate-800/50'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className={cn(
            'w-5 h-5',
            selected ? 'text-purple-400' : 'text-slate-400'
          )} />
          <h3 className="font-semibold text-white">{config.label}</h3>
        </div>
        <span className={cn(
          'text-lg font-bold',
          selected ? 'text-purple-400' : 'text-slate-300'
        )}>
          {formatPrice(config.price)}
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-2">{config.description}</p>
      <div className="flex items-center gap-1">
        {Array.from({ length: config.cardCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-6 h-8 rounded border',
              selected
                ? 'border-purple-400/50 bg-purple-500/20'
                : 'border-slate-600 bg-slate-700/50'
            )}
          />
        ))}
        <span className="ml-2 text-xs text-slate-500">
          {config.cardCount} {config.cardCount === 1 ? 'card' : 'cards'}
        </span>
      </div>
    </button>
  );
};

export default SpreadCard;
