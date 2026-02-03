'use client';

import { useState } from 'react';
import { useSpreadConfigs, useCreateReadingRequest } from '../hooks';
import { useUserCards, SavedCard } from '../hooks/useUserCards';
import { SpreadType, ReadingTopic, READING_TOPICS, formatPrice, ReadingRequest } from '../types';
import SpreadCard from './SpreadCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, ChevronRight, ChevronLeft, CreditCard, X, Plus, Check } from 'lucide-react';
import StripePaymentMethodCollector from './StripePaymentMethodCollector';

interface SpiriReadingsWizardProps {
    userId: string;
    onClose: () => void;
}

// Helper to get card brand icon/color
const getCardBrandDisplay = (brand: string) => {
    const brandMap: Record<string, { name: string; color: string }> = {
        visa: { name: 'Visa', color: 'text-blue-400' },
        mastercard: { name: 'Mastercard', color: 'text-orange-400' },
        amex: { name: 'American Express', color: 'text-blue-500' },
        discover: { name: 'Discover', color: 'text-orange-500' },
    };
    return brandMap[brand.toLowerCase()] || { name: brand, color: 'text-slate-400' };
};

const SpiriReadingsWizard: React.FC<SpiriReadingsWizardProps> = ({ userId, onClose }) => {
    const [step, setStep] = useState(1);
    const [selectedSpread, setSelectedSpread] = useState<SpreadType | null>(null);
    const [topic, setTopic] = useState<ReadingTopic | ''>('');
    const [customTopic, setCustomTopic] = useState('');
    const [context, setContext] = useState('');

    // Saved card selection
    const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
    const [useNewCard, setUseNewCard] = useState(false);

    // Stripe checkout state
    const [pendingRequest, setPendingRequest] = useState<ReadingRequest | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);

    const { data: configs, isLoading: configsLoading } = useSpreadConfigs();
    const { data: savedCards, isLoading: cardsLoading } = useUserCards();
    const createMutation = useCreateReadingRequest();

    const selectedConfig = configs?.find(c => c.type === selectedSpread);

    const getTopicLabel = (): string => {
        if (topic === 'other' && customTopic.trim()) {
            return customTopic.trim();
        }
        const topicConfig = READING_TOPICS.find(t => t.value === topic);
        return topicConfig?.label || topic;
    };

    const isTopicValid = (): boolean => {
        if (!topic) return false;
        if (topic === 'other') return !!customTopic.trim();
        return true;
    };

    const handleSubmit = async () => {
        if (!selectedSpread || !isTopicValid()) return;

        // If using a saved card, submit directly without checkout
        if (selectedCard && !useNewCard) {
            try {
                const result = await createMutation.mutateAsync({
                    userId,
                    spreadType: selectedSpread,
                    topic: getTopicLabel(),
                    context: context.trim() || undefined,
                    paymentMethodId: selectedCard.paymentMethodId,
                });

                if (result.success) {
                    // Request submitted with saved card - close wizard
                    onClose();
                }
            } catch (error) {
                console.error('Failed to create reading request:', error);
            }
            return;
        }

        // Otherwise, create setup intent for new card
        try {
            const result = await createMutation.mutateAsync({
                userId,
                spreadType: selectedSpread,
                topic: getTopicLabel(),
                context: context.trim() || undefined,
            });

            if (result.success && result.readingRequest) {
                // Show Stripe checkout dialog
                setPendingRequest(result.readingRequest);
                setShowCheckout(true);
            }
        } catch (error) {
            console.error('Failed to create reading request:', error);
        }
    };

    const handleCheckoutCancel = () => {
        setShowCheckout(false);
        setPendingRequest(null);
    };

    if (configsLoading || cardsLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    const hasSavedCards = savedCards && savedCards.length > 0;

    // Show Stripe checkout inline when we have a pending request (no nested dialog)
    if (showCheckout && pendingRequest?.stripe?.setupIntentSecret) {
        return (
            <div className="space-y-4" data-testid="checkout-view">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-purple-400" />
                            Save Payment Method
                        </h2>
                        <p className="text-slate-400 text-sm">
                            Your card will only be charged when a reader claims your request
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCheckoutCancel}
                        className="text-slate-400 hover:text-white hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <StripePaymentMethodCollector
                    clientSecret={pendingRequest.stripe.setupIntentSecret}
                    amount={{ amount: pendingRequest.price, currency: 'USD' }}
                    itemDescription={`${selectedConfig?.label || 'Tarot'} Reading - ${pendingRequest.topic}`}
                    onCancel={handleCheckoutCancel}
                    onSuccess={onClose}
                    submitButtonText="Save Card & Submit Request"
                />
                <p className="text-xs text-slate-500 text-center">
                    💳 You won&apos;t be charged until a reader claims your request
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Request a SpiriReading
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Step {step} of 2: {step === 1 ? 'Topic & Context' : 'Choose Spread'}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-slate-400 hover:text-white hover:bg-white/10"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Step Progress */}
            <div className="flex gap-2">
                <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-purple-500' : 'bg-slate-700'}`} />
                <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-purple-500' : 'bg-slate-700'}`} />
            </div>

            {/* Step 1: Topic & Context */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="topic" className="text-white font-medium">
                            What would you like guidance on? <span className="text-red-400">*</span>
                        </Label>
                        <Select value={topic} onValueChange={(value) => setTopic(value as ReadingTopic)}>
                            <SelectTrigger id="topic" data-testid="topic-select" className="bg-slate-900/80 border-slate-600 text-white">
                                <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                            <SelectContent>
                                {READING_TOPICS.map((topicOption) => (
                                    <SelectItem key={topicOption.value} value={topicOption.value}>
                                        {topicOption.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {topic === 'other' && (
                            <Textarea
                                data-testid="custom-topic-input"
                                value={customTopic}
                                onChange={(e) => setCustomTopic(e.target.value)}
                                placeholder="Please describe what you'd like guidance on..."
                                className="bg-slate-900/80 border-slate-600 text-white placeholder:text-slate-400 min-h-[80px]"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="context" className="text-white font-medium">
                            Additional context <span className="text-slate-400">(optional)</span>
                        </Label>
                        <Textarea
                            id="context"
                            data-testid="context-input"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="Any background information that might help the reader understand your situation better..."
                            className="bg-slate-900/80 border-slate-600 text-white placeholder:text-slate-400 min-h-[100px]"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => setStep(2)}
                            disabled={!isTopicValid()}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Next: Choose Spread
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Choose Spread & Checkout */}
            {step === 2 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="space-y-3">
                        <Label className="text-white font-medium">Choose your spread</Label>
                        <div className="grid gap-3">
                            {configs?.map((config) => (
                                <SpreadCard
                                    key={config.type}
                                    config={config}
                                    selected={selectedSpread === config.type}
                                    onSelect={() => setSelectedSpread(config.type)}
                                />
                            ))}
                        </div>
                    </div>

                    {selectedConfig && (
                        <div data-testid="spread-summary" className="p-4 rounded-lg bg-slate-900/80 border border-slate-600">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-300 font-medium">Selected:</span>
                                <span data-testid="selected-spread-label" className="text-white font-semibold">{selectedConfig.label}</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-300 font-medium">Topic:</span>
                                <span className="text-white text-sm">{getTopicLabel()}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-600">
                                <span className="text-slate-300 font-medium">Total:</span>
                                <span data-testid="selected-spread-price" className="text-purple-400 font-bold text-lg">
                                    {formatPrice(selectedConfig.price)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Payment Method Selection */}
                    {selectedConfig && (
                        <div className="space-y-3">
                            <Label className="text-white font-medium">Payment Method</Label>

                            {/* Saved Cards */}
                            {hasSavedCards && (
                                <div className="space-y-2">
                                    {savedCards?.map((card) => {
                                        const brandDisplay = getCardBrandDisplay(card.brand);
                                        const isSelected = selectedCard?.paymentMethodId === card.paymentMethodId && !useNewCard;
                                        return (
                                            <button
                                                key={card.paymentMethodId}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCard(card);
                                                    setUseNewCard(false);
                                                }}
                                                className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 ${
                                                    isSelected
                                                        ? 'border-purple-500 bg-purple-500/10'
                                                        : 'border-slate-600 bg-slate-900/50 hover:border-slate-500'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded flex items-center justify-center bg-slate-800 ${brandDisplay.color}`}>
                                                    <CreditCard className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="text-white text-sm font-medium">
                                                        {brandDisplay.name} •••• {card.last4}
                                                    </p>
                                                    <p className="text-slate-400 text-xs">
                                                        Expires {card.exp_month}/{card.exp_year}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-5 h-5 text-purple-400" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add New Card Option */}
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCard(null);
                                    setUseNewCard(true);
                                }}
                                className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 ${
                                    useNewCard || !hasSavedCards
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-slate-600 bg-slate-900/50 hover:border-slate-500'
                                }`}
                            >
                                <div className="w-8 h-8 rounded flex items-center justify-center bg-slate-800 text-purple-400">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white text-sm font-medium">
                                        {hasSavedCards ? 'Use a different card' : 'Add payment card'}
                                    </p>
                                    <p className="text-slate-400 text-xs">
                                        Card will be saved for future purchases
                                    </p>
                                </div>
                                {(useNewCard || !hasSavedCards) && (
                                    <Check className="w-5 h-5 text-purple-400" />
                                )}
                            </button>

                            <p className="text-xs text-slate-500">
                                💳 You won&apos;t be charged until a reader claims your request
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={createMutation.isPending}
                            className="border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setStep(1)}
                            disabled={createMutation.isPending}
                            className="border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            data-testid="submit-request-button"
                            onClick={handleSubmit}
                            disabled={!selectedSpread || createMutation.isPending}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {selectedCard && !useNewCard ? 'Submitting...' : 'Setting Up...'}
                                </>
                            ) : selectedCard && !useNewCard ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Submit Request
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Continue to Payment
                                </>
                            )}
                        </Button>
                    </div>

                    {createMutation.isError && (
                        <p className="text-red-400 text-sm text-center">
                            Failed to submit request. Please try again.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SpiriReadingsWizard;
