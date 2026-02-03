'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  useCreateSynchronicity,
  useUpdateSynchronicity,
  Synchronicity,
  SymbolTag,
} from '../../hooks';

interface Props {
  userId: string;
  existingEntry?: Synchronicity | null;
  onSuccess: () => void;
}

interface FormData {
  date: string;
  title: string;
  description: string;
  time?: string;
  location?: string;
  witnesses?: string;
  possibleMeaning?: string;
  relatedTo?: string;
  confirmedMeaning?: string;
  recurringTheme: boolean;
  significanceScore: number;
}

export const SynchronicityForm: React.FC<Props> = ({ userId, existingEntry, onSuccess }) => {
  const createMutation = useCreateSynchronicity();
  const updateMutation = useUpdateSynchronicity();
  const [symbols, setSymbols] = useState<SymbolTag[]>(existingEntry?.symbols || []);
  const [newSymbolName, setNewSymbolName] = useState('');
  const [newSymbolContext, setNewSymbolContext] = useState('');

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      date: existingEntry?.date || new Date().toISOString().split('T')[0],
      title: existingEntry?.title || '',
      description: existingEntry?.description || '',
      time: existingEntry?.time || '',
      location: existingEntry?.location || '',
      witnesses: existingEntry?.witnesses || '',
      possibleMeaning: existingEntry?.possibleMeaning || '',
      relatedTo: existingEntry?.relatedTo || '',
      confirmedMeaning: existingEntry?.confirmedMeaning || '',
      recurringTheme: existingEntry?.recurringTheme || false,
      significanceScore: existingEntry?.significanceScore || 5,
    }
  });

  const addSymbol = () => {
    if (newSymbolName.trim()) {
      setSymbols([...symbols, {
        name: newSymbolName.trim(),
        context: newSymbolContext.trim() || undefined,
        autoExtracted: false
      }]);
      setNewSymbolName('');
      setNewSymbolContext('');
    }
  };

  const removeSymbol = (index: number) => {
    setSymbols(symbols.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    const input = {
      userId,
      ...data,
      symbols: symbols.length > 0 ? symbols : undefined,
    };

    if (existingEntry) {
      await updateMutation.mutateAsync({
        id: existingEntry.id,
        ...input,
      });
    } else {
      await createMutation.mutateAsync(input);
    }

    onSuccess();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const significance = watch('significanceScore');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            {...register('date', { required: true })}
            className="bg-slate-800 border-slate-700"
            data-testid="synchronicity-date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Time (Optional)</Label>
          <Input
            id="time"
            type="time"
            {...register('time')}
            className="bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register('title', { required: true })}
          placeholder="Give this synchronicity a memorable title..."
          className="bg-slate-800 border-slate-700"
          data-testid="synchronicity-title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">What Happened?</Label>
        <Textarea
          id="description"
          {...register('description', { required: true })}
          placeholder="Describe the synchronicity in detail..."
          className="bg-slate-800 border-slate-700 min-h-[100px]"
          data-testid="synchronicity-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            {...register('location')}
            placeholder="Where did it happen?"
            className="bg-slate-800 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="witnesses">Witnesses</Label>
          <Input
            id="witnesses"
            {...register('witnesses')}
            placeholder="Anyone else present?"
            className="bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="possibleMeaning">What Might This Mean?</Label>
        <Textarea
          id="possibleMeaning"
          {...register('possibleMeaning')}
          placeholder="Your initial interpretation..."
          className="bg-slate-800 border-slate-700 min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="relatedTo">Related To</Label>
        <Input
          id="relatedTo"
          {...register('relatedTo')}
          placeholder="What area of life does this relate to?"
          className="bg-slate-800 border-slate-700"
        />
      </div>

      {existingEntry && (
        <div className="space-y-2">
          <Label htmlFor="confirmedMeaning">Confirmed Meaning (Updated Later)</Label>
          <Textarea
            id="confirmedMeaning"
            {...register('confirmedMeaning')}
            placeholder="Once you understand what it meant..."
            className="bg-slate-800 border-slate-700 min-h-[60px]"
          />
        </div>
      )}

      {/* Symbols */}
      <div className="space-y-2">
        <Label>Symbols Present</Label>
        <div className="flex gap-2">
          <Input
            value={newSymbolName}
            onChange={(e) => setNewSymbolName(e.target.value)}
            placeholder="Symbol name..."
            className="bg-slate-800 border-slate-700"
          />
          <Input
            value={newSymbolContext}
            onChange={(e) => setNewSymbolContext(e.target.value)}
            placeholder="Context..."
            className="bg-slate-800 border-slate-700"
          />
          <Button type="button" variant="outline" size="icon" onClick={addSymbol}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {symbols.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {symbols.map((symbol, index) => (
              <Badge key={index} variant="secondary" className="bg-purple-500/20 text-purple-300">
                {symbol.name}
                {symbol.context && <span className="text-purple-400 ml-1">({symbol.context})</span>}
                <button
                  type="button"
                  onClick={() => removeSymbol(index)}
                  className="ml-1 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Significance Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Significance Score</Label>
          <span className="text-purple-400 font-medium">{significance}/10</span>
        </div>
        <Slider
          value={[significance]}
          onValueChange={(value) => setValue('significanceScore', value[0])}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>Minor</span>
          <span>Life-changing</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Switch
          id="recurringTheme"
          checked={watch('recurringTheme')}
          onCheckedChange={(checked) => setValue('recurringTheme', checked)}
        />
        <Label htmlFor="recurringTheme" className="text-sm text-slate-400">
          Part of a recurring theme
        </Label>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          data-testid="save-synchronicity"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existingEntry ? 'Update Entry' : 'Save Synchronicity'}
        </Button>
      </div>
    </form>
  );
};
