'use client';

import { useState } from 'react';
import { Loader2, Sparkles, Moon, BookOpen, Edit2, Save, X, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSymbolPatternStats, SymbolOccurrence, SymbolCategory, useUpdateSymbolMeaning } from '../hooks';
import { format, parseISO } from 'date-fns';

interface PersonalSymbolDictionaryProps {
  userId: string;
}

// Category colors and icons
const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  ELEMENT: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: '💧' },
  ANIMAL: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: '🐾' },
  ARCHETYPE: { color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/30', icon: '👤' },
  OBJECT: { color: 'text-slate-300', bg: 'bg-slate-500/20', border: 'border-slate-500/30', icon: '🔮' },
  PLACE: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: '🏔️' },
  PERSON: { color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/30', icon: '👥' },
  ACTION: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', icon: '⚡' },
  CELESTIAL: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: '✨' },
  OTHER: { color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', icon: '🌀' },
};

const getCategoryStyle = (category?: SymbolCategory) => {
  return CATEGORY_STYLES[category || 'OTHER'] || CATEGORY_STYLES.OTHER;
};

interface SymbolCardProps {
  symbol: SymbolOccurrence;
  userId: string;
  onUpdate: () => void;
}

const SymbolCard: React.FC<SymbolCardProps> = ({ symbol, userId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [meaning, setMeaning] = useState(symbol.personalMeaning || '');
  const updateMutation = useUpdateSymbolMeaning();

  const style = getCategoryStyle(symbol.category);

  const handleSave = async () => {
    try {
      const result = await updateMutation.mutateAsync({
        userId,
        symbolName: symbol.symbolName,
        personalMeaning: meaning,
      });

      if (result.success) {
        toast.success('Symbol meaning saved');
        setIsEditing(false);
        onUpdate();
      } else {
        toast.error(result.message || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save symbol meaning');
    }
  };

  const handleCancel = () => {
    setMeaning(symbol.personalMeaning || '');
    setIsEditing(false);
  };

  return (
    <Card className={`${style.bg} border ${style.border} p-4 hover:border-white/30 transition-colors`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{style.icon}</span>
          <div>
            <h3 className="text-white font-medium">{symbol.symbolName}</h3>
            <span className={`text-xs ${style.color}`}>
              {symbol.category?.toLowerCase() || 'other'}
            </span>
          </div>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-slate-400 hover:text-white"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm mb-3">
        <div className="flex items-center gap-1 text-slate-400">
          <span className="font-medium">{symbol.totalCount}</span>
          <span>total</span>
        </div>
        {symbol.readingCount > 0 && (
          <div className="flex items-center gap-1 text-indigo-400">
            <BookOpen className="w-3 h-3" />
            <span>{symbol.readingCount}</span>
          </div>
        )}
        {symbol.dreamCount > 0 && (
          <div className="flex items-center gap-1 text-purple-400">
            <Moon className="w-3 h-3" />
            <span>{symbol.dreamCount}</span>
          </div>
        )}
      </div>

      {/* Personal Meaning */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="What does this symbol mean to you personally?"
            dark
            className="min-h-[80px] text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-slate-400"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      ) : symbol.personalMeaning ? (
        <p className="text-sm text-slate-300 italic">&quot;{symbol.personalMeaning}&quot;</p>
      ) : (
        <p className="text-sm text-slate-500">Click edit to add your personal meaning...</p>
      )}

      {/* Timestamps */}
      <div className="flex justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-white/10">
        <span>First seen: {format(parseISO(symbol.lastSeen), 'MMM d, yyyy')}</span>
        <span>Last: {format(parseISO(symbol.lastSeen), 'MMM d')}</span>
      </div>
    </Card>
  );
};

const PersonalSymbolDictionary: React.FC<PersonalSymbolDictionaryProps> = ({ userId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: stats, isLoading, error, refetch } = useSymbolPatternStats(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>Unable to load symbol dictionary</p>
      </div>
    );
  }

  if (stats.totalSymbols === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Your symbol dictionary is empty</p>
        <p className="text-sm mt-1">
          Symbols will appear here as you log dreams and readings
        </p>
      </div>
    );
  }

  // Combine all symbols from top and recent
  const allSymbols = stats.topSymbols;

  // Filter symbols
  const filteredSymbols = allSymbols.filter((symbol) => {
    const matchesSearch = searchQuery === '' ||
      symbol.symbolName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null ||
      symbol.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from symbols
  const categories = [...new Set(allSymbols.map(s => s.category || 'OTHER'))];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            dark
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? 'bg-purple-600' : 'border-white/20 text-slate-300'}
          >
            All
          </Button>
          {categories.map((cat) => {
            const style = getCategoryStyle(cat as SymbolCategory);
            return (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={
                  selectedCategory === cat
                    ? `${style.bg} ${style.color}`
                    : `border-white/20 text-slate-300 hover:${style.bg}`
                }
              >
                {style.icon} {cat?.charAt(0) + cat?.slice(1).toLowerCase()}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Symbol Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSymbols.map((symbol) => (
          <SymbolCard
            key={symbol.symbolName}
            symbol={symbol}
            userId={userId}
            onUpdate={() => refetch()}
          />
        ))}
      </div>

      {filteredSymbols.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No symbols match your search</p>
        </div>
      )}

      {/* Info Footer */}
      <div className="text-center text-sm text-slate-500 pt-4 border-t border-white/10">
        <p>
          Your personal symbol dictionary builds automatically as you log dreams and readings.
          Add your own meanings to track how symbols speak to you personally.
        </p>
      </div>
    </div>
  );
};

export default PersonalSymbolDictionary;
