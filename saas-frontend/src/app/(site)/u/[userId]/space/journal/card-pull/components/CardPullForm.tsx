'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Sparkles, Save, Loader2 } from 'lucide-react';
import CardInput from './CardInput';
import {
  CardPullFormState,
  CardFormInput,
  TAROT_DECKS,
  getDefaultFormState,
} from '../types';
import { useCreateCardPull, useUpdateCardPull, DailyCardPull, Card } from '../hooks';

interface CardPullFormProps {
  userId: string;
  existingPull?: DailyCardPull | null;
  onSuccess?: () => void;
}

const CardPullForm: React.FC<CardPullFormProps> = ({
  userId,
  existingPull,
  onSuccess,
}) => {
  const [formState, setFormState] = useState<CardPullFormState>(getDefaultFormState());

  const createMutation = useCreateCardPull();
  const updateMutation = useUpdateCardPull();

  const isEditing = !!existingPull;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Initialize form with existing data if editing
  useEffect(() => {
    if (existingPull) {
      setFormState({
        date: existingPull.date,
        sourceType: 'SELF',
        deck: TAROT_DECKS.find(d => d.label === existingPull.deck)?.key || 'other',
        customDeck: TAROT_DECKS.find(d => d.label === existingPull.deck) ? '' : existingPull.deck,
        cards: existingPull.cards.map((card: Card) => ({
          id: crypto.randomUUID(),
          name: card.name,
          reversed: card.reversed,
          interpretation: card.interpretation,
        })),
        themes: [],
      });
    }
  }, [existingPull]);

  const handleAddCard = () => {
    setFormState(prev => ({
      ...prev,
      cards: [...prev.cards, { id: crypto.randomUUID(), name: '', reversed: false }],
    }));
  };

  const handleUpdateCard = (index: number, updatedCard: CardFormInput) => {
    setFormState(prev => ({
      ...prev,
      cards: prev.cards.map((card, i) => (i === index ? updatedCard : card)),
    }));
  };

  const handleRemoveCard = (index: number) => {
    setFormState(prev => ({
      ...prev,
      cards: prev.cards.filter((_, i) => i !== index),
    }));
  };

  const getDeckName = (): string => {
    if (formState.deck === 'other' && formState.customDeck) {
      return formState.customDeck;
    }
    return TAROT_DECKS.find(d => d.key === formState.deck)?.label || formState.deck;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formState.deck) return;
    if (formState.cards.length === 0 || !formState.cards.some(c => c.name.trim())) return;

    const deckName = getDeckName();
    const validCards = formState.cards
      .filter(c => c.name.trim())
      .map(({ name, reversed, interpretation }) => ({
        name: name.trim(),
        reversed,
        interpretation: interpretation?.trim() || undefined,
      }));

    try {
      if (isEditing && existingPull) {
        await updateMutation.mutateAsync({
          id: existingPull.id,
          userId,
          deck: deckName,
          cards: validCards,
        });
      } else {
        await createMutation.mutateAsync({
          userId,
          date: formState.date,
          deck: deckName,
          cards: validCards,
        });
      }

      onSuccess?.();

      // Reset form if creating new
      if (!isEditing) {
        setFormState(getDefaultFormState());
      }
    } catch {
      // Error is handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="card-pull-form">
      {/* Date (only if creating new) */}
      {!isEditing && (
        <div>
          <Label htmlFor="date" className="text-slate-300">
            Date
          </Label>
          <Input
            type="date"
            id="date"
            value={formState.date}
            onChange={(e) => setFormState(prev => ({ ...prev, date: e.target.value }))}
            className="mt-1 bg-white/5 border-white/20 text-white w-fit"
            data-testid="date-input"
          />
        </div>
      )}

      {/* Deck Selection */}
      <div>
        <Label htmlFor="deck" className="text-slate-300">
          Deck
        </Label>
        <Select
          value={formState.deck}
          onValueChange={(value) => setFormState(prev => ({ ...prev, deck: value }))}
        >
          <SelectTrigger
            id="deck"
            className="mt-1 bg-white/5 border-white/20 text-white"
            data-testid="deck-select"
          >
            <SelectValue placeholder="Select your deck" />
          </SelectTrigger>
          <SelectContent>
            {TAROT_DECKS.map((deck) => (
              <SelectItem key={deck.key} value={deck.key}>
                {deck.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {formState.deck === 'other' && (
          <Input
            value={formState.customDeck}
            onChange={(e) => setFormState(prev => ({ ...prev, customDeck: e.target.value }))}
            placeholder="Enter deck name"
            className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
            data-testid="custom-deck-input"
          />
        )}
      </div>

      {/* Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-slate-300">Cards Pulled</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddCard}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-400/10"
            data-testid="add-card-button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        </div>

        <div className="space-y-3">
          {formState.cards.map((card, index) => (
            <CardInput
              key={card.id}
              card={card}
              index={index}
              onUpdate={(updated) => handleUpdateCard(index, updated)}
              onRemove={() => handleRemoveCard(index)}
              canRemove={formState.cards.length > 1}
            />
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !formState.deck || !formState.cards.some(c => c.name.trim())}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
        data-testid="submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isEditing ? 'Saving...' : 'Recording...'}
          </>
        ) : (
          <>
            {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isEditing ? 'Save Changes' : 'Record Pull'}
          </>
        )}
      </Button>
    </form>
  );
};

export default CardPullForm;
