'use client';

import { useState, useMemo } from 'react';
import { BookOpen, Plus, Search, TrendingUp, Moon, Sun, Flame, Feather, Eye, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import usePersonalSymbols, { PersonalSymbol } from '../../mediumship/hooks/usePersonalSymbols';
import { SymbolForm } from '../../mediumship/symbols/components/SymbolForm';
import { SymbolCard } from '../../mediumship/symbols/components/SymbolCard';

interface Props {
  userId: string;
}

// Category icons for visual distinction
const categoryIcons: Record<string, React.ReactNode> = {
  'ELEMENT': <Flame className="w-4 h-4" />,
  'ANIMAL': <Feather className="w-4 h-4" />,
  'CELESTIAL': <Moon className="w-4 h-4" />,
  'PLACE': <Compass className="w-4 h-4" />,
  'ARCHETYPE': <Eye className="w-4 h-4" />,
};

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<PersonalSymbol | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<PersonalSymbol | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: symbols, isLoading } = usePersonalSymbols(userId);

  const handleEdit = (symbol: PersonalSymbol) => {
    setEditingSymbol(symbol);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSymbol(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSymbol(null);
  };

  // Get unique categories and their counts
  const categories = useMemo(() => {
    if (!symbols) return [];
    const counts: Record<string, number> = {};
    symbols.forEach(s => {
      if (s.category) {
        counts[s.category] = (counts[s.category] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [symbols]);

  // Filter symbols
  const filteredSymbols = useMemo(() => {
    if (!symbols) return [];
    return symbols.filter(s => {
      const matchesSearch = !searchTerm ||
        s.symbolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.personalMeaning?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [symbols, searchTerm, selectedCategory]);

  // Find most significant symbols (by total occurrences)
  const topSymbols = useMemo(() => {
    if (!symbols) return [];
    return [...symbols].sort((a, b) => b.totalOccurrences - a.totalOccurrences).slice(0, 5);
  }, [symbols]);

  // Symbols that need meanings
  const symbolsNeedingMeaning = useMemo(() => {
    if (!symbols) return [];
    return symbols.filter(s => !s.personalMeaning && s.totalOccurrences >= 2);
  }, [symbols]);

  return (
    <div className="min-h-screen-minus-nav">
      {/* Mystical Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-yellow-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-amber-500/20">
            <BookOpen className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Symbol Dictionary</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Your personal lexicon of symbols and their meanings in your spiritual journey
          </p>
        </div>

        {/* Empty State */}
        {!isLoading && (!symbols || symbols.length === 0) && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl" />
              <div className="relative p-10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl border border-amber-500/10 backdrop-blur-xl">
                <div className="flex justify-center gap-3 mb-4">
                  <Moon className="w-8 h-8 text-amber-400/40" />
                  <Sun className="w-8 h-8 text-orange-400/40" />
                  <Feather className="w-8 h-8 text-yellow-400/40" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white mb-3">Build Your Symbol Language</h2>
            <p className="text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
              As you log dreams, synchronicities, and readings, symbols will automatically appear here.
              Add your personal meanings to create your unique spiritual vocabulary.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Or add a symbol you already know is significant to you.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Symbol
            </Button>
          </div>
        )}

        {/* Active State */}
        {!isLoading && symbols && symbols.length > 0 && (
          <>
            {/* Prompt for symbols needing meanings */}
            {symbolsNeedingMeaning.length > 0 && (
              <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 rounded-2xl border border-amber-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Eye className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Symbols Emerging</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      These symbols have appeared multiple times. What do they mean to you?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {symbolsNeedingMeaning.slice(0, 5).map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleEdit(s)}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-full text-sm transition-colors"
                        >
                          {s.symbolName} ({s.totalOccurrences}x)
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search symbols..."
                  className="pl-10 bg-slate-800/50 border-slate-700 focus:border-amber-500/50"
                />
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Symbol
              </Button>
            </div>

            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    !selectedCategory
                      ? 'bg-amber-500/30 text-amber-300'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  All ({symbols.length})
                </button>
                {categories.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {categoryIcons[cat]}
                    {cat.charAt(0) + cat.slice(1).toLowerCase()} ({count})
                  </button>
                ))}
              </div>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 mb-8 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span><strong className="text-white">{symbols.length}</strong> symbols in your dictionary</span>
              </div>
              {topSymbols[0] && topSymbols[0].totalOccurrences > 1 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <span>Most common: <strong className="text-white">{topSymbols[0].symbolName}</strong> ({topSymbols[0].totalOccurrences}x)</span>
                </div>
              )}
            </div>

            {/* Symbols Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSymbols.map((symbol) => (
                <SymbolCard
                  key={symbol.id}
                  symbol={symbol}
                  onEdit={handleEdit}
                  onView={setSelectedSymbol}
                  userId={userId}
                />
              ))}
            </div>

            {/* No results */}
            {filteredSymbols.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No symbols match your search</p>
              </div>
            )}
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
              <BookOpen className="relative w-12 h-12 text-amber-400 animate-pulse" />
            </div>
            <p className="text-slate-400 mt-4">Loading your symbols...</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-amber-500/20 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              {editingSymbol ? `Edit "${editingSymbol.symbolName}"` : 'Add a Symbol'}
            </DialogTitle>
          </DialogHeader>

          <SymbolForm
            userId={userId}
            existingSymbol={editingSymbol}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!selectedSymbol} onOpenChange={(open) => !open && setSelectedSymbol(null)}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-amber-500/20 text-white sm:max-w-md">
          {selectedSymbol && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 mb-4">
                  {categoryIcons[selectedSymbol.category || ''] || <BookOpen className="w-8 h-8 text-amber-400/60" />}
                </div>
                <h2 className="text-2xl font-light text-white">{selectedSymbol.symbolName}</h2>
                {selectedSymbol.category && (
                  <Badge variant="outline" className="mt-2 text-amber-400 border-amber-400/30">
                    {selectedSymbol.category}
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                {/* Personal Meaning */}
                {selectedSymbol.personalMeaning ? (
                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <div className="text-sm text-amber-400 mb-1">Your Meaning</div>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedSymbol.personalMeaning}</p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
                    <p className="text-slate-500 text-sm text-center">
                      You haven&apos;t defined a personal meaning yet.
                      <button
                        onClick={() => {
                          setSelectedSymbol(null);
                          handleEdit(selectedSymbol);
                        }}
                        className="text-amber-400 hover:underline ml-1"
                      >
                        Add one
                      </button>
                    </p>
                  </div>
                )}

                {/* Occurrence Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-white">{selectedSymbol.dreamOccurrences}</div>
                    <div className="text-xs text-slate-500">Dreams</div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-white">{selectedSymbol.readingOccurrences}</div>
                    <div className="text-xs text-slate-500">Readings</div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <div className="text-2xl font-bold text-white">{selectedSymbol.synchronicityOccurrences}</div>
                    <div className="text-xs text-slate-500">Synchronicities</div>
                  </div>
                </div>

                {/* Timeline */}
                {selectedSymbol.firstEncountered && (
                  <div className="text-sm text-slate-500 text-center">
                    First seen {selectedSymbol.firstEncountered}
                    {selectedSymbol.lastEncountered && selectedSymbol.lastEncountered !== selectedSymbol.firstEncountered && (
                      <> - Last seen {selectedSymbol.lastEncountered}</>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSymbol(null);
                      handleEdit(selectedSymbol);
                    }}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => setSelectedSymbol(null)}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
