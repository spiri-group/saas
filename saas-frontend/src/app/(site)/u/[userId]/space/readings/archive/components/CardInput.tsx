'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, RotateCcw } from 'lucide-react';
import { CardFormInput } from '../types';

interface CardInputProps {
  card: CardFormInput;
  index: number;
  onUpdate: (card: CardFormInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const CardInput: React.FC<CardInputProps> = ({
  card,
  index,
  onUpdate,
  onRemove,
  canRemove,
}) => {
  return (
    <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/20 rounded-lg" data-testid={`card-input-${index}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Card {index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8 p-0"
            data-testid={`remove-card-${index}`}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor={`card-name-${index}`} dark className="text-sm">
            Card Name
          </Label>
          <Input
            id={`card-name-${index}`}
            value={card.name}
            onChange={(e) => onUpdate({ ...card, name: e.target.value })}
            placeholder="e.g., The Fool, Ten of Cups"
            dark
            className="mt-1"
            data-testid={`card-name-input-${index}`}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className={`w-4 h-4 ${card.reversed ? 'text-purple-400' : 'text-slate-500'}`} />
            <Label htmlFor={`card-reversed-${index}`} dark className="text-sm cursor-pointer">
              Reversed
            </Label>
          </div>
          <Switch
            id={`card-reversed-${index}`}
            dark
            checked={card.reversed}
            onCheckedChange={(checked) => onUpdate({ ...card, reversed: checked })}
            data-testid={`card-reversed-switch-${index}`}
          />
        </div>

        <div>
          <Label htmlFor={`card-interpretation-${index}`} dark className="text-sm">
            Interpretation (optional)
          </Label>
          <Textarea
            id={`card-interpretation-${index}`}
            value={card.interpretation || ''}
            onChange={(e) => onUpdate({ ...card, interpretation: e.target.value })}
            placeholder="What does this card mean to you?"
            dark
            className="mt-1 min-h-[60px] text-sm"
            data-testid={`card-interpretation-input-${index}`}
          />
        </div>
      </div>
    </div>
  );
};

export default CardInput;
