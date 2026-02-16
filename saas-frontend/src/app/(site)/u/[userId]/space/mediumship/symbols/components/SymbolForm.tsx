'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/panel';
import {
  useCreatePersonalSymbol,
  useUpdatePersonalSymbol,
  PersonalSymbol,
  ContextualMeaning,
} from '../../hooks';

interface Props {
  userId: string;
  existingSymbol?: PersonalSymbol | null;
  onSuccess: () => void;
}

interface FormData {
  symbolName: string;
  category?: string;
  personalMeaning: string;
  notes?: string;
}

const COMMON_CATEGORIES = [
  'Animals',
  'Colors',
  'Numbers',
  'Nature',
  'Weather',
  'Objects',
  'People',
  'Actions',
  'Feelings',
  'Places',
  'Celestial',
  'Elements',
];

export const SymbolForm: React.FC<Props> = ({ userId, existingSymbol, onSuccess }) => {
  const createMutation = useCreatePersonalSymbol();
  const updateMutation = useUpdatePersonalSymbol();
  const [contextualMeanings, setContextualMeanings] = useState<ContextualMeaning[]>(
    existingSymbol?.contextualMeanings || []
  );
  const [newContext, setNewContext] = useState('');
  const [newContextMeaning, setNewContextMeaning] = useState('');

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      symbolName: existingSymbol?.symbolName || '',
      category: existingSymbol?.category || '',
      personalMeaning: existingSymbol?.personalMeaning || '',
      notes: existingSymbol?.notes || '',
    }
  });

  const addContextualMeaning = () => {
    if (newContext.trim() && newContextMeaning.trim()) {
      setContextualMeanings([
        ...contextualMeanings,
        { context: newContext.trim(), meaning: newContextMeaning.trim() }
      ]);
      setNewContext('');
      setNewContextMeaning('');
    }
  };

  const removeContextualMeaning = (index: number) => {
    setContextualMeanings(contextualMeanings.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      ...data,
      contextualMeanings: contextualMeanings.length > 0 ? contextualMeanings : undefined,
    };

    if (existingSymbol) {
      await updateMutation.mutateAsync({
        id: existingSymbol.id,
        ...input,
      });
    } else {
      await createMutation.mutateAsync(input);
    }

    onSuccess();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="symbolName">Symbol Name</Label>
        <Input
          id="symbolName"
          {...register('symbolName', { required: true })}
          placeholder="e.g., Butterfly, Number 11, Red Cardinal..."
          dark
          disabled={!!existingSymbol}
          data-testid="symbol-name"
        />
        {existingSymbol && (
          <p className="text-xs text-slate-500">Symbol name cannot be changed after creation</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          {...register('category')}
          placeholder="e.g., Animals, Numbers, Colors..."
          dark
          list="categories"
        />
        <datalist id="categories">
          {COMMON_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
        <div className="flex flex-wrap gap-1 mt-2">
          {COMMON_CATEGORIES.slice(0, 6).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setValue('category', cat)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                watch('category') === cat
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="personalMeaning">Personal Meaning</Label>
        <Textarea
          id="personalMeaning"
          {...register('personalMeaning', { required: true })}
          placeholder="What does this symbol mean to you personally?"
          dark
          className="min-h-[100px]"
          data-testid="personal-meaning"
        />
      </div>

      {/* Contextual Meanings */}
      <div className="space-y-2">
        <Label>Contextual Meanings (Optional)</Label>
        <p className="text-xs text-slate-500 mb-2">
          Add different meanings based on context (e.g., in dreams vs. waking life)
        </p>
        <div className="flex gap-2">
          <Input
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            placeholder="Context (e.g., In dreams)"
            dark
          />
          <Input
            value={newContextMeaning}
            onChange={(e) => setNewContextMeaning(e.target.value)}
            placeholder="Meaning in this context"
            dark
          />
          <Button type="button" variant="outline" size="icon" onClick={addContextualMeaning}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {contextualMeanings.length > 0 && (
          <div className="space-y-2 mt-2">
            {contextualMeanings.map((cm, index) => (
              <Panel dark
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg"
              >
                <div className="flex-1">
                  <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs mb-1">
                    {cm.context}
                  </Badge>
                  <p className="text-sm text-slate-300">{cm.meaning}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeContextualMeaning(index)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </Panel>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Any other thoughts or observations about this symbol..."
          dark
          className="min-h-[60px]"
        />
      </div>

      {/* Symbol Stats (for existing symbols) */}
      {existingSymbol && (
        <div className="border-t border-slate-700 pt-4">
          <Label dark>Symbol Statistics</Label>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <Panel dark className="text-center p-2 rounded-lg">
              <div className="text-2xl font-bold text-white">{existingSymbol.totalOccurrences}</div>
              <div className="text-xs text-slate-500">Total</div>
            </Panel>
            <Panel dark className="text-center p-2 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{existingSymbol.dreamOccurrences}</div>
              <div className="text-xs text-slate-500">In Dreams</div>
            </Panel>
            <Panel dark className="text-center p-2 rounded-lg">
              <div className="text-2xl font-bold text-indigo-400">{existingSymbol.readingOccurrences}</div>
              <div className="text-xs text-slate-500">In Readings</div>
            </Panel>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
          data-testid="save-symbol"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingSymbol ? 'Update Symbol' : 'Add Symbol'}
        </Button>
      </div>
    </form>
  );
};
