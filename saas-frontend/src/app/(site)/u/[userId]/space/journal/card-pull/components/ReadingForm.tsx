'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Sparkles, Save, Loader2, ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import CardInput from './CardInput';
import {
  ReadingFormState,
  CardFormInput,
  ReadingSourceType,
  ExternalPlatform,
  TAROT_DECKS,
  SPREAD_TYPES,
  EXTERNAL_PLATFORMS,
  SOURCE_OPTIONS,
  getDefaultFormState,
} from '../types';
import { useCreateReadingEntry, useUpdateReadingEntry, ReadingEntry } from '../hooks';
import type { JournalPrefillData } from '../ui';

type FormStep = 'source' | 'cards' | 'reflection';

interface ReadingFormProps {
  userId: string;
  existingEntry?: ReadingEntry | null;
  prefillData?: JournalPrefillData | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReadingForm: React.FC<ReadingFormProps> = ({
  userId,
  existingEntry,
  prefillData,
  onSuccess,
  onCancel,
}) => {
  const [formState, setFormState] = useState<ReadingFormState>(getDefaultFormState());
  const [step, setStep] = useState<FormStep>('source');

  const createMutation = useCreateReadingEntry();
  const updateMutation = useUpdateReadingEntry();
  const isEditing = !!existingEntry;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Initialize form with existing data if editing
  useEffect(() => {
    if (existingEntry) {
      setFormState({
        date: existingEntry.date,
        sourceType: existingEntry.sourceType || 'SELF',
        deck: existingEntry.sourceDetails?.deck
          ? TAROT_DECKS.find(d => d.label === existingEntry.sourceDetails.deck)?.key || 'other'
          : 'rider-waite-smith',
        customDeck: existingEntry.sourceDetails?.deck &&
          !TAROT_DECKS.find(d => d.label === existingEntry.sourceDetails.deck)
          ? existingEntry.sourceDetails.deck
          : '',
        platform: existingEntry.sourceDetails?.platform,
        readerName: existingEntry.sourceDetails?.readerName || '',
        sourceUrl: existingEntry.sourceDetails?.sourceUrl || '',
        channelName: existingEntry.sourceDetails?.channelName || '',
        cards: existingEntry.cards.map((card) => ({
          id: crypto.randomUUID(),
          name: card.name,
          reversed: card.reversed,
          position: card.position,
          interpretation: card.interpretation,
        })),
        spreadType: existingEntry.spreadType,
        question: existingEntry.question || '',
        firstImpression: existingEntry.firstImpression || '',
        reflection: existingEntry.reflection || '',
        resonanceScore: existingEntry.resonanceScore,
        themes: existingEntry.themes || [],
      });
      setStep('cards'); // Skip source selection when editing
    }
  }, [existingEntry]);

  // Initialize form with prefill data from a purchased SpiriVerse reading
  useEffect(() => {
    if (prefillData && !existingEntry) {
      // Find deck key from deckUsed string, or default to 'other'
      const deckKey = prefillData.deckUsed
        ? TAROT_DECKS.find(d => d.label.toLowerCase() === prefillData.deckUsed?.toLowerCase())?.key || 'other'
        : 'other';

      setFormState(prev => ({
        ...prev,
        date: prefillData.date,
        sourceType: 'SPIRIVERSE',
        deck: deckKey,
        customDeck: deckKey === 'other' ? (prefillData.deckUsed || '') : '',
        readerName: prefillData.practitionerName,
        reflection: prefillData.reflection || '',
        // Start with one empty card slot
        cards: [{ id: crypto.randomUUID(), name: '', reversed: false }],
      }));
      // Skip source selection since we know it's SPIRIVERSE
      setStep('cards');
    }
  }, [prefillData, existingEntry]);

  const handleSourceSelect = (sourceType: ReadingSourceType) => {
    setFormState(prev => ({ ...prev, sourceType }));
  };

  const handleSpreadSelect = (spreadKey: string) => {
    const spread = SPREAD_TYPES.find(s => s.key === spreadKey);
    const cardCount = spread?.cardCount || 1;

    // Generate the right number of card inputs
    const newCards: CardFormInput[] = Array.from({ length: cardCount }, () => ({
      id: crypto.randomUUID(),
      name: '',
      reversed: false,
    }));

    setFormState(prev => ({
      ...prev,
      spreadType: spreadKey,
      cards: newCards,
    }));
  };

  const handleContinueToCards = () => {
    // If no spread selected, ensure at least 1 card
    if (formState.cards.length === 0) {
      setFormState(prev => ({
        ...prev,
        cards: [{ id: crypto.randomUUID(), name: '', reversed: false }],
      }));
    }
    setStep('cards');
  };

  const canProceedToReflection = formState.cards.some(c => c.name.trim());

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

  const buildSourceDetails = () => {
    switch (formState.sourceType) {
      case 'SELF':
        return { deck: getDeckName() };
      case 'SPIRIVERSE':
        return {
          spiriReadingId: prefillData?.spiriReadingId,
          practitionerName: prefillData?.practitionerName || formState.readerName,
          practitionerId: prefillData?.practitionerId,
          deck: getDeckName(),
        };
      case 'EXTERNAL':
        return {
          platform: formState.platform,
          readerName: formState.readerName || undefined,
          sourceUrl: formState.sourceUrl || undefined,
          channelName: formState.channelName || undefined,
        };
      default:
        return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (formState.cards.length === 0 || !formState.cards.some(c => c.name.trim())) return;

    const validCards = formState.cards
      .filter(c => c.name.trim())
      .map(({ name, reversed, position, interpretation }) => ({
        name: name.trim(),
        reversed,
        position: position?.trim() || undefined,
        interpretation: interpretation?.trim() || undefined,
      }));

    try {
      if (isEditing && existingEntry) {
        // Update existing entry
        await updateMutation.mutateAsync({
          id: existingEntry.id,
          userId,
          sourceDetails: buildSourceDetails(),
          cards: validCards,
          spreadType: formState.spreadType || undefined,
          question: formState.question?.trim() || undefined,
          firstImpression: formState.firstImpression?.trim() || undefined,
          reflection: formState.reflection?.trim() || undefined,
          resonanceScore: formState.resonanceScore,
          themes: formState.themes.length > 0 ? formState.themes : undefined,
        });
      } else {
        // Create new entry
        await createMutation.mutateAsync({
          userId,
          date: formState.date,
          sourceType: formState.sourceType,
          sourceDetails: buildSourceDetails(),
          cards: validCards,
          spreadType: formState.spreadType || undefined,
          question: formState.question?.trim() || undefined,
          firstImpression: formState.firstImpression?.trim() || undefined,
          reflection: formState.reflection?.trim() || undefined,
          resonanceScore: formState.resonanceScore,
          themes: formState.themes.length > 0 ? formState.themes : undefined,
        });
      }

      onSuccess?.();

      // Reset form if creating new
      if (!isEditing) {
        setFormState(getDefaultFormState());
        setStep('source');
      }
    } catch {
      // Error is handled by mutation
    }
  };

  // ============================================
  // Step Progress Indicator
  // ============================================
  const StepIndicator = () => {
    const steps: FormStep[] = ['source', 'cards', 'reflection'];
    const currentStepIndex = steps.indexOf(step);

    return (
      <div className="flex items-center gap-1.5">
        {steps.map((s, index) => (
          <div key={s} className="flex items-center gap-1.5">
            {/* Step dot */}
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStepIndex
                  ? 'bg-purple-500'
                  : index < currentStepIndex
                    ? 'bg-purple-500/60'
                    : 'bg-slate-600'
              }`}
            />
            {/* Connector line (not after last dot) */}
            {index < steps.length - 1 && (
              <div
                className={`w-4 h-0.5 ${
                  index < currentStepIndex ? 'bg-purple-500/50' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // ============================================
  // Step 1: Source Selection
  // ============================================
  if (step === 'source' && !isEditing) {
    return (
      <div className="space-y-4" data-testid="source-selection">
        {/* Header with step indicator */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Record a Reading</h3>
          <StepIndicator />
        </div>

        {/* Date */}
        <div>
          <Label htmlFor="date" dark>Date</Label>
          <Input
            type="date"
            id="date"
            value={formState.date}
            onChange={(e) => setFormState(prev => ({ ...prev, date: e.target.value }))}
            dark
            className="mt-1 w-fit"
            data-testid="date-input"
          />
        </div>

        {/* Spread Type */}
        <div>
          <Label dark>Spread</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SPREAD_TYPES.map((spread) => (
              <button
                key={spread.key}
                type="button"
                onClick={() => handleSpreadSelect(spread.key)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
                  formState.spreadType === spread.key
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                } ${spread.key === 'other' ? 'col-span-2' : ''}`}
                data-testid={`spread-${spread.key}`}
              >
                {spread.label}{spread.cardCount ? ` (${spread.cardCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Source Selection */}
        <div>
          <Label dark>Source</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SOURCE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleSourceSelect(option.key)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
                  formState.sourceType === option.key
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                }`}
                data-testid={`source-option-${option.key.toLowerCase()}`}
              >
                <span className="mr-1.5">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* SpiriVerse tip */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-xs text-purple-300">
            <span className="font-medium">TIP:</span> SpiriVerse readings are auto-captured
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="flex-1 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleContinueToCards}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg cursor-pointer"
            data-testid="continue-button"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // Step 2: Cards
  // ============================================
  if (step === 'cards') {
    return (
      <div className="space-y-4" data-testid="cards-step">
        {/* Header with back button and step indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setStep('source')}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                data-testid="back-button"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-lg font-medium text-white">Cards Pulled</h3>
          </div>
          <StepIndicator />
        </div>

        {/* Source-specific fields */}
        {formState.sourceType === 'SELF' && (
          <div>
            <Label htmlFor="deck" dark>Deck</Label>
            <Select
              value={formState.deck}
              onValueChange={(value) => setFormState(prev => ({ ...prev, deck: value }))}
              dark
            >
              <SelectTrigger id="deck" className="mt-1" data-testid="deck-select">
                <SelectValue placeholder="Select your deck" />
              </SelectTrigger>
              <SelectContent>
                {TAROT_DECKS.map((deck) => (
                  <SelectItem key={deck.key} value={deck.key}>{deck.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {formState.deck === 'other' && (
              <Input
                value={formState.customDeck}
                onChange={(e) => setFormState(prev => ({ ...prev, customDeck: e.target.value }))}
                placeholder="Enter deck name"
                dark
                className="mt-2"
                data-testid="custom-deck-input"
              />
            )}
          </div>
        )}

        {formState.sourceType === 'EXTERNAL' && (
          <div className="space-y-4">
            <div>
              <Label dark>Platform</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {EXTERNAL_PLATFORMS.map((platform) => (
                  <button
                    key={platform.key}
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, platform: platform.key as ExternalPlatform }))}
                    className={`p-2 rounded-lg border text-sm transition-all cursor-pointer ${
                      formState.platform === platform.key
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                    }`}
                    data-testid={`platform-${platform.key.toLowerCase()}`}
                  >
                    <span className="mr-1">{platform.icon}</span>
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="readerName" dark>Reader/Creator Name (optional)</Label>
              <Input
                id="readerName"
                value={formState.readerName || ''}
                onChange={(e) => setFormState(prev => ({ ...prev, readerName: e.target.value }))}
                placeholder="Who did the reading?"
                dark
                className="mt-1"
                data-testid="reader-name-input"
              />
            </div>

            {(formState.platform === 'TIKTOK' || formState.platform === 'YOUTUBE') && (
              <div>
                <Label htmlFor="sourceUrl" dark>Link (optional)</Label>
                <div className="relative mt-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="sourceUrl"
                    value={formState.sourceUrl || ''}
                    onChange={(e) => setFormState(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    placeholder="Paste video link"
                    dark
                    className="pl-10"
                    data-testid="source-url-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cards Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label dark>Cards Pulled</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddCard}
              className="text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 cursor-pointer"
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
                showInterpretation={false}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="flex-1 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={() => setStep('reflection')}
            disabled={!canProceedToReflection}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg disabled:opacity-50 cursor-pointer"
            data-testid="next-button"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // Step 3: Reflection (Optional)
  // ============================================
  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="reflection-step">
      {/* Header with back button and step indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep('cards')}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            data-testid="back-button"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-medium text-white">Reflection</h3>
          <span className="text-xs text-slate-500">(optional)</span>
        </div>
        <StepIndicator />
      </div>

      {/* Cards summary */}
      <div className="flex flex-wrap gap-1.5">
        {formState.cards.filter(c => c.name.trim()).map((card, i) => (
          <span key={i} className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">
            {card.name}{card.reversed && ' ®'}
          </span>
        ))}
      </div>

      {/* Question */}
      <div>
        <Label htmlFor="question" dark>Question/Focus</Label>
        <Input
          id="question"
          value={formState.question || ''}
          onChange={(e) => setFormState(prev => ({ ...prev, question: e.target.value }))}
          placeholder="What did you ask or focus on?"
          dark
          className="mt-1"
          data-testid="question-input"
        />
      </div>

      {/* First Impression */}
      <div>
        <Label htmlFor="firstImpression" dark>First Impression</Label>
        <Textarea
          id="firstImpression"
          value={formState.firstImpression || ''}
          onChange={(e) => setFormState(prev => ({ ...prev, firstImpression: e.target.value }))}
          placeholder="What stood out to you?"
          dark
          className="mt-1 min-h-[60px]"
          data-testid="first-impression-input"
        />
      </div>

      {/* Per-card interpretations */}
      <div>
        <Label dark className="mb-2 block">Card Interpretations</Label>
        <div className="space-y-2">
          {formState.cards.filter(c => c.name.trim()).map((card, index) => (
            <div key={card.id} className="p-2 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xs font-medium text-purple-300 mb-1">
                {card.name}{card.reversed && ' (Reversed)'}
              </div>
              <Textarea
                value={card.interpretation || ''}
                onChange={(e) => handleUpdateCard(
                  formState.cards.findIndex(c => c.id === card.id),
                  { ...card, interpretation: e.target.value }
                )}
                placeholder="What does this card mean to you?"
                dark
                className="min-h-[50px] text-sm"
                data-testid={`card-interpretation-input-${index}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Resonance Score */}
      <div>
        <Label dark>Resonance</Label>
        <div className="flex gap-1.5 mt-1.5">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => setFormState(prev => ({
                ...prev,
                resonanceScore: prev.resonanceScore === score ? undefined : score
              }))}
              className={`w-8 h-8 rounded-lg border text-sm transition-all cursor-pointer ${
                formState.resonanceScore === score
                  ? 'border-purple-500 bg-purple-500/30 text-purple-300'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
              }`}
              data-testid={`resonance-${score}`}
            >
              {score}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg cursor-pointer"
          data-testid="submit-button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save to Journal
            </>
          )}
        </Button>
      </div>

      {/* Skip reflection option */}
      {!isEditing && (
        <div className="text-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
          >
            Skip reflection and save now
          </button>
        </div>
      )}
    </form>
  );
};

export default ReadingForm;
