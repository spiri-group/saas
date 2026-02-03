'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateDream } from '../hooks/useCreateDream';
import { useUpdateDream } from '../hooks/useUpdateDream';
import {
  DreamJournalEntry,
  DreamFormInput,
  getDefaultFormState,
  DREAM_MOODS,
  DREAM_CLARITY,
  DREAM_TYPES,
  COMMON_THEMES,
  DREAM_SYMBOL_SUGGESTIONS,
  DreamMood,
  DreamClarity,
  DreamType,
  SymbolTag,
  getCategoryColor,
} from '../types';

interface DreamFormProps {
  userId: string;
  existingDream?: DreamJournalEntry | null;
  onSuccess?: () => void;
}

const DreamForm: React.FC<DreamFormProps> = ({ userId, existingDream, onSuccess }) => {
  const [formState, setFormState] = useState<DreamFormInput>(getDefaultFormState());
  const [newTheme, setNewTheme] = useState('');
  const [newSymbol, setNewSymbol] = useState('');

  const createMutation = useCreateDream();
  const updateMutation = useUpdateDream();

  const isEditing = !!existingDream;
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Initialize form with existing dream data
  useEffect(() => {
    if (existingDream) {
      setFormState({
        date: existingDream.date,
        title: existingDream.title,
        content: existingDream.content,
        dreamType: existingDream.dreamType,
        mood: existingDream.mood,
        clarity: existingDream.clarity,
        isLucid: existingDream.isLucid || false,
        themes: existingDream.themes || [],
        symbols: existingDream.symbols || [],  // Enhanced symbol tags
        interpretation: existingDream.interpretation || '',
        emotions: existingDream.emotions || [],
        sleepQuality: existingDream.sleepQuality,
        wakeTime: existingDream.wakeTime || '',
        photoUrl: existingDream.photoUrl || '',
      });
    } else {
      setFormState(getDefaultFormState());
    }
  }, [existingDream]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.title.trim()) {
      toast.error('Please enter a title for your dream');
      return;
    }

    if (!formState.content.trim()) {
      toast.error('Please describe your dream');
      return;
    }

    try {
      if (isEditing && existingDream) {
        const result = await updateMutation.mutateAsync({
          id: existingDream.id,
          userId,
          ...formState,
        });

        if (result.success) {
          toast.success('Dream updated successfully');
          onSuccess?.();
        } else {
          toast.error(result.message || 'Failed to update dream');
        }
      } else {
        const result = await createMutation.mutateAsync({
          userId,
          ...formState,
        });

        if (result.success) {
          toast.success('Dream recorded successfully');
          onSuccess?.();
        } else {
          toast.error(result.message || 'Failed to record dream');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    }
  };

  const addTheme = (theme: string) => {
    const trimmed = theme.trim().toLowerCase();
    if (trimmed && !formState.themes?.includes(trimmed)) {
      setFormState(prev => ({
        ...prev,
        themes: [...(prev.themes || []), trimmed],
      }));
    }
    setNewTheme('');
  };

  const removeTheme = (theme: string) => {
    setFormState(prev => ({
      ...prev,
      themes: prev.themes?.filter(t => t !== theme) || [],
    }));
  };

  const addSymbol = (symbolName: string, category?: SymbolTag['category']) => {
    const trimmed = symbolName.trim();
    const normalizedName = trimmed.toLowerCase();

    // Check if symbol already exists
    if (trimmed && !formState.symbols.some(s => s.name.toLowerCase() === normalizedName)) {
      // Try to find category from suggestions if not provided
      const suggestion = DREAM_SYMBOL_SUGGESTIONS.find(s => s.name.toLowerCase() === normalizedName);

      const newSymbol: SymbolTag = {
        name: trimmed,
        category: category || suggestion?.category || 'OTHER',
        autoExtracted: false,
      };

      setFormState(prev => ({
        ...prev,
        symbols: [...prev.symbols, newSymbol],
      }));
    }
    setNewSymbol('');
  };

  const removeSymbol = (symbolName: string) => {
    setFormState(prev => ({
      ...prev,
      symbols: prev.symbols.filter(s => s.name !== symbolName),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date and Title Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date" className="text-slate-300">Date</Label>
          <Input
            id="date"
            type="date"
            value={formState.date}
            onChange={(e) => setFormState(prev => ({ ...prev, date: e.target.value }))}
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wakeTime" className="text-slate-300">Wake Time</Label>
          <Input
            id="wakeTime"
            type="time"
            value={formState.wakeTime || ''}
            onChange={(e) => setFormState(prev => ({ ...prev, wakeTime: e.target.value }))}
            className="bg-slate-800/50 border-slate-700 text-white"
            placeholder="When did you wake up?"
          />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-slate-300">
          Dream Title <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title"
          value={formState.title}
          onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
          className="bg-slate-800/50 border-slate-700 text-white"
          placeholder="Give your dream a memorable title..."
        />
      </div>

      {/* Dream Content */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-slate-300">
          Dream Description <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="content"
          value={formState.content}
          onChange={(e) => setFormState(prev => ({ ...prev, content: e.target.value }))}
          className="bg-slate-800/50 border-slate-700 text-white min-h-[150px]"
          placeholder="Describe your dream in as much detail as you can remember..."
        />
      </div>

      {/* Dream Type, Mood, Clarity Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Dream Type</Label>
          <Select
            value={formState.dreamType || ''}
            onValueChange={(value) => setFormState(prev => ({ ...prev, dreamType: value as DreamType }))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {DREAM_TYPES.map((type) => (
                <SelectItem key={type.key} value={type.key}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Mood</Label>
          <Select
            value={formState.mood || ''}
            onValueChange={(value) => setFormState(prev => ({ ...prev, mood: value as DreamMood }))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Select mood" />
            </SelectTrigger>
            <SelectContent>
              {DREAM_MOODS.map((mood) => (
                <SelectItem key={mood.key} value={mood.key}>
                  {mood.emoji} {mood.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Clarity</Label>
          <Select
            value={formState.clarity || ''}
            onValueChange={(value) => setFormState(prev => ({ ...prev, clarity: value as DreamClarity }))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="How clear?" />
            </SelectTrigger>
            <SelectContent>
              {DREAM_CLARITY.map((clarity) => (
                <SelectItem key={clarity.key} value={clarity.key}>
                  {clarity.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lucid Dream Toggle and Sleep Quality */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
          <Label htmlFor="isLucid" className="text-slate-300">Lucid Dream?</Label>
          <Switch
            id="isLucid"
            checked={formState.isLucid || false}
            onCheckedChange={(checked) => setFormState(prev => ({ ...prev, isLucid: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Sleep Quality (1-5)</Label>
          <Select
            value={formState.sleepQuality?.toString() || ''}
            onValueChange={(value) => setFormState(prev => ({ ...prev, sleepQuality: parseInt(value) }))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Rate quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Poor</SelectItem>
              <SelectItem value="2">2 - Fair</SelectItem>
              <SelectItem value="3">3 - Good</SelectItem>
              <SelectItem value="4">4 - Very Good</SelectItem>
              <SelectItem value="5">5 - Excellent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Themes */}
      <div className="space-y-2">
        <Label className="text-slate-300">Themes</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formState.themes?.map((theme) => (
            <span
              key={theme}
              className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-1"
            >
              {theme}
              <button
                type="button"
                onClick={() => removeTheme(theme)}
                className="hover:text-purple-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTheme}
            onChange={(e) => setNewTheme(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTheme(newTheme);
              }
            }}
            className="bg-slate-800/50 border-slate-700 text-white"
            placeholder="Add a theme..."
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addTheme(newTheme)}
            className="border-slate-600"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {COMMON_THEMES.filter(t => !formState.themes?.includes(t)).slice(0, 8).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => addTheme(theme)}
              className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs hover:bg-slate-600/50 hover:text-slate-300"
            >
              + {theme}
            </button>
          ))}
        </div>
      </div>

      {/* Symbols - Enhanced with categories */}
      <div className="space-y-2">
        <Label className="text-slate-300">Significant Symbols</Label>
        <p className="text-xs text-slate-500">Symbols are tracked across your dreams and readings to reveal patterns</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {formState.symbols.map((symbol) => (
            <span
              key={symbol.name}
              className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 border ${getCategoryColor(symbol.category)}`}
            >
              {symbol.name}
              {symbol.category && (
                <span className="text-xs opacity-70">({symbol.category.toLowerCase()})</span>
              )}
              <button
                type="button"
                onClick={() => removeSymbol(symbol.name)}
                className="hover:opacity-70 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSymbol(newSymbol);
              }
            }}
            className="bg-slate-800/50 border-slate-700 text-white"
            placeholder="Add a symbol (e.g., snake, key, mirror)..."
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addSymbol(newSymbol)}
            className="border-slate-600"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {/* Symbol suggestions from shared dictionary */}
        <div className="flex flex-wrap gap-1 mt-2">
          {DREAM_SYMBOL_SUGGESTIONS
            .filter(s => !formState.symbols.some(fs => fs.name.toLowerCase() === s.name.toLowerCase()))
            .slice(0, 12)
            .map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => addSymbol(suggestion.name, suggestion.category)}
                className={`px-2 py-0.5 rounded text-xs hover:opacity-80 border ${getCategoryColor(suggestion.category)}`}
              >
                + {suggestion.name}
              </button>
            ))}
        </div>
      </div>

      {/* Interpretation */}
      <div className="space-y-2">
        <Label htmlFor="interpretation" className="text-slate-300">Your Interpretation</Label>
        <Textarea
          id="interpretation"
          value={formState.interpretation || ''}
          onChange={(e) => setFormState(prev => ({ ...prev, interpretation: e.target.value }))}
          className="bg-slate-800/50 border-slate-700 text-white min-h-[100px]"
          placeholder="What do you think this dream means? Any messages or insights?"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditing ? 'Updating...' : 'Saving...'}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Update Dream' : 'Save Dream'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default DreamForm;
