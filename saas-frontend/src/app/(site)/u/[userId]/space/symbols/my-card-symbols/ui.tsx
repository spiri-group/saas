'use client';

import { useState, useMemo } from 'react';
import { LibraryBig, Search, Edit2, Sparkles, Crown, Flame, Droplets, Wind, Coins, Check, Loader2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/panel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUserCardSymbols, useCreateUserCardSymbols, useUpdateUserCardSymbols, useDeleteUserCardSymbols, UserCardSymbols } from '../hooks/useUserCardSymbols';
import { toast } from 'sonner';

interface Props {
  userId: string;
}

// Major Arcana cards
const MAJOR_ARCANA = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World'
];

// Court cards
const COURT_RANKS = ['Page', 'Knight', 'Queen', 'King'];

// Number cards
const NUMBER_RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

// Suits with their icons
const SUITS = [
  { name: 'Cups', icon: Droplets, color: 'text-blue-400' },
  { name: 'Wands', icon: Flame, color: 'text-orange-400' },
  { name: 'Swords', icon: Wind, color: 'text-slate-400' },
  { name: 'Pentacles', icon: Coins, color: 'text-yellow-400' },
];

// Generate all Minor Arcana cards
const generateMinorArcana = () => {
  const cards: Array<{ name: string; suit: string; rank: string }> = [];
  for (const suit of SUITS) {
    for (const rank of [...NUMBER_RANKS, ...COURT_RANKS]) {
      cards.push({
        name: `${rank} of ${suit.name}`,
        suit: suit.name,
        rank,
      });
    }
  }
  return cards;
};

const MINOR_ARCANA = generateMinorArcana();

// Default symbols from the backend - we'll show these as reference
const MAJOR_ARCANA_DEFAULT_SYMBOLS: Record<string, string[]> = {
  'The Fool': ['journey', 'new beginnings', 'leap of faith', 'innocence', 'freedom'],
  'The Magician': ['manifestation', 'power', 'skill', 'willpower', 'action'],
  'The High Priestess': ['intuition', 'mystery', 'subconscious', 'moon', 'secrets', 'inner voice'],
  'The Empress': ['abundance', 'fertility', 'nurturing', 'nature', 'mother', 'creativity'],
  'The Emperor': ['authority', 'structure', 'father', 'control', 'stability', 'leadership'],
  'The Hierophant': ['tradition', 'teaching', 'institution', 'conformity', 'spiritual guidance'],
  'The Lovers': ['love', 'choice', 'union', 'partnership', 'harmony', 'relationships'],
  'The Chariot': ['willpower', 'victory', 'determination', 'journey', 'control', 'movement'],
  'Strength': ['courage', 'patience', 'inner strength', 'lion', 'compassion', 'gentle power'],
  'The Hermit': ['solitude', 'introspection', 'guidance', 'light', 'wisdom', 'inner search'],
  'Wheel of Fortune': ['cycles', 'fate', 'change', 'luck', 'destiny', 'turning point'],
  'Justice': ['truth', 'fairness', 'law', 'balance', 'karma', 'accountability'],
  'The Hanged Man': ['surrender', 'sacrifice', 'new perspective', 'waiting', 'letting go', 'suspension'],
  'Death': ['transformation', 'endings', 'change', 'rebirth', 'transition', 'release'],
  'Temperance': ['balance', 'patience', 'moderation', 'alchemy', 'harmony', 'middle path'],
  'The Devil': ['shadow', 'bondage', 'materialism', 'addiction', 'temptation', 'attachment'],
  'The Tower': ['destruction', 'sudden change', 'revelation', 'lightning', 'upheaval', 'breakthrough'],
  'The Star': ['hope', 'inspiration', 'healing', 'stars', 'renewal', 'faith', 'serenity'],
  'The Moon': ['moon', 'illusion', 'intuition', 'subconscious', 'water', 'fear', 'dreams', 'shadow'],
  'The Sun': ['sun', 'joy', 'success', 'vitality', 'clarity', 'optimism', 'achievement'],
  'Judgement': ['rebirth', 'calling', 'reckoning', 'awakening', 'absolution', 'renewal'],
  'The World': ['completion', 'integration', 'accomplishment', 'wholeness', 'fulfillment', 'travel'],
};

type CardFilter = 'all' | 'major' | 'cups' | 'wands' | 'swords' | 'pentacles' | 'customized';

const UI: React.FC<Props> = ({ userId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<CardFilter>('all');
  const [editingCard, setEditingCard] = useState<string | null>(null);

  // Fetch user card symbols from backend
  const { data: userCardSymbols = [], isLoading } = useUserCardSymbols(userId);
  const createMutation = useCreateUserCardSymbols();
  const updateMutation = useUpdateUserCardSymbols();
  const deleteMutation = useDeleteUserCardSymbols();

  // Form state for editing
  const [personalSymbols, setPersonalSymbols] = useState('');
  const [usePersonalOnly, setUsePersonalOnly] = useState(false);
  const [notes, setNotes] = useState('');

  const getUserSymbolsForCard = (cardName: string): UserCardSymbols | undefined => {
    return userCardSymbols.find(s => s.cardName === cardName);
  };

  const handleEditCard = (cardName: string) => {
    const existing = getUserSymbolsForCard(cardName);
    if (existing) {
      setPersonalSymbols(existing.personalSymbols.join(', '));
      setUsePersonalOnly(existing.usePersonalOnly);
      setNotes(existing.notes || '');
    } else {
      setPersonalSymbols('');
      setUsePersonalOnly(false);
      setNotes('');
    }
    setEditingCard(cardName);
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;

    const symbols = personalSymbols
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const existing = getUserSymbolsForCard(editingCard);

    try {
      if (existing) {
        // Update existing
        await updateMutation.mutateAsync({
          id: existing.id,
          userId,
          personalSymbols: symbols,
          usePersonalOnly,
          notes: notes.trim() || undefined,
        });
        toast.success('Card symbols updated');
      } else {
        // Create new
        await createMutation.mutateAsync({
          userId,
          cardName: editingCard,
          personalSymbols: symbols,
          usePersonalOnly,
          notes: notes.trim() || undefined,
        });
        toast.success('Card symbols saved');
      }
      setEditingCard(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save symbols');
    }
  };

  const handleDeleteCard = async () => {
    if (!editingCard) return;

    const existing = getUserSymbolsForCard(editingCard);
    if (!existing) return;

    try {
      await deleteMutation.mutateAsync({ id: existing.id, userId });
      toast.success('Card symbols removed');
      setEditingCard(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove symbols');
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  // Filter cards based on search and filter
  const filteredCards = useMemo(() => {
    let cards: Array<{ name: string; type: 'major' | 'minor'; suit?: string }> = [];

    // Add Major Arcana
    if (filter === 'all' || filter === 'major' || filter === 'customized') {
      cards.push(...MAJOR_ARCANA.map(name => ({ name, type: 'major' as const })));
    }

    // Add Minor Arcana by suit
    if (filter === 'all' || filter === 'cups' || filter === 'customized') {
      cards.push(...MINOR_ARCANA.filter(c => c.suit === 'Cups').map(c => ({ name: c.name, type: 'minor' as const, suit: c.suit })));
    }
    if (filter === 'all' || filter === 'wands' || filter === 'customized') {
      cards.push(...MINOR_ARCANA.filter(c => c.suit === 'Wands').map(c => ({ name: c.name, type: 'minor' as const, suit: c.suit })));
    }
    if (filter === 'all' || filter === 'swords' || filter === 'customized') {
      cards.push(...MINOR_ARCANA.filter(c => c.suit === 'Swords').map(c => ({ name: c.name, type: 'minor' as const, suit: c.suit })));
    }
    if (filter === 'all' || filter === 'pentacles' || filter === 'customized') {
      cards.push(...MINOR_ARCANA.filter(c => c.suit === 'Pentacles').map(c => ({ name: c.name, type: 'minor' as const, suit: c.suit })));
    }

    // Filter by customized only
    if (filter === 'customized') {
      cards = cards.filter(c => userCardSymbols.some(s => s.cardName === c.name));
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      cards = cards.filter(c => c.name.toLowerCase().includes(term));
    }

    return cards;
  }, [filter, searchTerm, userCardSymbols]);

  const getSuitIcon = (suit?: string) => {
    const suitInfo = SUITS.find(s => s.name === suit);
    if (!suitInfo) return null;
    const Icon = suitInfo.icon;
    return <Icon className={`w-4 h-4 ${suitInfo.color}`} />;
  };

  const customizedCount = userCardSymbols.length;

  return (
    <div className="min-h-screen-minus-nav">
      {/* Mystical Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-indigo-500/20">
            <LibraryBig className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 data-testid="my-card-symbols-title" className="text-3xl font-light text-white mb-2">My Card Symbols</h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Define what each tarot card means to you personally. Your symbols will be used instead of or alongside the defaults when you log readings.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              data-testid="card-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cards..."
              dark
              className="pl-10 focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            data-testid="filter-all"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              filter === 'all'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            All Cards
          </button>
          <button
            data-testid="filter-major"
            onClick={() => setFilter('major')}
            className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2 ${
              filter === 'major'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Major Arcana
          </button>
          {SUITS.map(suit => (
            <button
              key={suit.name}
              data-testid={`filter-${suit.name.toLowerCase()}`}
              onClick={() => setFilter(suit.name.toLowerCase() as CardFilter)}
              className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2 ${
                filter === suit.name.toLowerCase()
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              <suit.icon className={`w-3.5 h-3.5 ${suit.color}`} />
              {suit.name}
            </button>
          ))}
          <button
            data-testid="filter-customized"
            onClick={() => setFilter('customized')}
            className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2 ${
              filter === 'customized'
                ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Customized ({customizedCount})
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
            <p className="text-slate-400">Loading your card symbols...</p>
          </div>
        )}

        {/* Cards Grid */}
        {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => {
            const userSymbols = getUserSymbolsForCard(card.name);
            const defaultSymbols = MAJOR_ARCANA_DEFAULT_SYMBOLS[card.name];
            const isCustomized = !!userSymbols;

            return (
              <Card
                key={card.name}
                data-testid={`card-${card.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`bg-slate-800/50 border-slate-700/50 p-4 hover:border-indigo-500/30 transition-all cursor-pointer group ${
                  isCustomized ? 'border-green-500/30' : ''
                }`}
                onClick={() => handleEditCard(card.name)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {card.type === 'major' ? (
                      <Crown className="w-4 h-4 text-purple-400" />
                    ) : (
                      getSuitIcon(card.suit)
                    )}
                    <h3 className="font-medium text-white">{card.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCustomized && (
                      <Badge data-testid="customized-badge" className="bg-green-500/20 text-green-400 border-green-500/30">
                        Customized
                      </Badge>
                    )}
                    <Edit2 className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>

                {/* Show symbols */}
                <div className="space-y-2">
                  {userSymbols && userSymbols.personalSymbols.length > 0 && (
                    <div>
                      <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Your Symbols
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {userSymbols.personalSymbols.slice(0, 4).map(symbol => (
                          <span key={symbol} className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-xs">
                            {symbol}
                          </span>
                        ))}
                        {userSymbols.personalSymbols.length > 4 && (
                          <span className="px-2 py-0.5 text-green-400/60 text-xs">
                            +{userSymbols.personalSymbols.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {defaultSymbols && (!userSymbols || !userSymbols.usePersonalOnly) && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Default Symbols</div>
                      <div className="flex flex-wrap gap-1">
                        {defaultSymbols.slice(0, 4).map(symbol => (
                          <span key={symbol} className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded-full text-xs">
                            {symbol}
                          </span>
                        ))}
                        {defaultSymbols.length > 4 && (
                          <span className="px-2 py-0.5 text-slate-500 text-xs">
                            +{defaultSymbols.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!defaultSymbols && !userSymbols && (
                    <p className="text-xs text-slate-500 italic">
                      Click to add your personal symbols
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        )}

        {/* Empty state for customized filter */}
        {!isLoading && filter === 'customized' && filteredCards.length === 0 && (
          <div className="text-center py-16">
            <Panel dark className="inline-flex items-center justify-center p-4 rounded-2xl mb-4">
              <LibraryBig className="w-10 h-10 text-slate-500" />
            </Panel>
            <h2 className="text-xl font-light text-white mb-2">No Customized Cards Yet</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-6">
              You haven&apos;t defined personal symbols for any cards yet. Click on any card to add your own meanings.
            </p>
            <Button
              onClick={() => setFilter('major')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
            >
              <Crown className="w-4 h-4 mr-2" />
              Start with Major Arcana
            </Button>
          </div>
        )}

        {/* No search results */}
        {!isLoading && filteredCards.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No cards match &quot;{searchTerm}&quot;</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent data-testid="edit-card-dialog" className="border-indigo-500/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LibraryBig className="w-5 h-5 text-indigo-400" />
              {editingCard}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Define what this card means to you personally. These symbols will be used when you log readings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Default symbols reference */}
            {editingCard && MAJOR_ARCANA_DEFAULT_SYMBOLS[editingCard] && (
              <Panel dark className="p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-500 mb-2">Default Symbols (Reference)</div>
                <div className="flex flex-wrap gap-1">
                  {MAJOR_ARCANA_DEFAULT_SYMBOLS[editingCard].map(symbol => (
                    <span
                      key={symbol}
                      className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full text-xs cursor-pointer hover:bg-indigo-500/30 hover:text-indigo-300 transition-colors"
                      onClick={() => {
                        const current = personalSymbols ? personalSymbols.split(',').map(s => s.trim()) : [];
                        if (!current.includes(symbol)) {
                          setPersonalSymbols([...current, symbol].join(', '));
                        }
                      }}
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">Click a symbol to add it to your list</p>
              </Panel>
            )}

            {/* Personal symbols input */}
            <div className="space-y-2">
              <Label htmlFor="personal-symbols" dark>Your Personal Symbols</Label>
              <Textarea
                id="personal-symbols"
                data-testid="personal-symbols-input"
                value={personalSymbols}
                onChange={(e) => setPersonalSymbols(e.target.value)}
                placeholder="Enter symbols separated by commas (e.g., wisdom, patience, inner strength)"
                dark
                className="min-h-[80px]"
              />
              <p className="text-xs text-slate-500">Separate multiple symbols with commas</p>
            </div>

            {/* Use personal only toggle */}
            <Panel dark className="flex items-center justify-between p-3 rounded-lg border border-slate-700">
              <div>
                <Label htmlFor="use-personal-only" dark>Use Only My Symbols</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  When enabled, default symbols will not be extracted for this card
                </p>
              </div>
              <Switch
                id="use-personal-only"
                data-testid="use-personal-only-switch"
                checked={usePersonalOnly}
                onCheckedChange={setUsePersonalOnly}
                dark
              />
            </Panel>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" dark>Notes (Optional)</Label>
              <Textarea
                id="notes"
                data-testid="notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why do these symbols resonate with you?"
                dark
                className="min-h-[60px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <div>
                {editingCard && getUserSymbolsForCard(editingCard) && (
                  <Button
                    data-testid="delete-card-button"
                    variant="outline"
                    onClick={handleDeleteCard}
                    disabled={isDeleting || isSaving}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  data-testid="cancel-button"
                  variant="outline"
                  onClick={() => setEditingCard(null)}
                  disabled={isSaving || isDeleting}
                  className="border-slate-700 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  data-testid="save-card-button"
                  onClick={handleSaveCard}
                  disabled={isSaving || isDeleting}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Symbols'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UI;
