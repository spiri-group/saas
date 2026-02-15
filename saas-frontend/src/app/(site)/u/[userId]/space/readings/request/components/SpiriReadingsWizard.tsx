'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSpreadConfigs, useCreateReadingRequest } from '../hooks';
import { useUserCards, SavedCard } from '../hooks/useUserCards';
import { useBirthChart } from '../../astrology/_hooks/useBirthChart';
import {
  SpreadType,
  ReadingRequestCategory,
  ReadingTopic,
  AstrologyFocusArea,
  AstrologyRequestData,
  ReadingBirthData,
  READING_TOPICS,
  ASTROLOGY_FOCUS_OPTIONS,
  PLANET_OPTIONS,
  LIFE_AREA_OPTIONS,
  formatPrice,
  ReadingRequest,
} from '../types';
import SpreadCard from './SpreadCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, ChevronRight, ChevronLeft, CreditCard, X, Plus, Check } from 'lucide-react';
import StripePaymentMethodCollector from './StripePaymentMethodCollector';

interface SpiriReadingsWizardProps {
    userId: string;
    onClose: () => void;
    /** Pre-select astrology category (e.g., when coming from birth chart page) */
    initialCategory?: ReadingRequestCategory;
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

const SpiriReadingsWizard: React.FC<SpiriReadingsWizardProps> = ({ userId, onClose, initialCategory }) => {
    // Check sessionStorage for deep-link category (e.g., from birth chart CTA)
    const deepLinkCategory = (() => {
        if (initialCategory) return initialCategory;
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('spiri-reading-initial-category');
            if (stored === 'ASTROLOGY' || stored === 'TAROT') {
                sessionStorage.removeItem('spiri-reading-initial-category');
                return stored as ReadingRequestCategory;
            }
        }
        return null;
    })();

    // Step 1: Category selection (TAROT or ASTROLOGY)
    // Step 2: Topic & Context (tarot) or Focus & Birth Data (astrology)
    // Step 3: Spread/Tier selection & Payment
    const [step, setStep] = useState(deepLinkCategory ? 2 : 1);
    const [category, setCategory] = useState<ReadingRequestCategory | null>(deepLinkCategory || null);

    // Shared fields
    const [selectedSpread, setSelectedSpread] = useState<SpreadType | null>(null);
    const [topic, setTopic] = useState<ReadingTopic | ''>('');
    const [customTopic, setCustomTopic] = useState('');
    const [context, setContext] = useState('');

    // Astrology-specific fields
    const [focusArea, setFocusArea] = useState<AstrologyFocusArea | ''>('');
    const [specificPlanet, setSpecificPlanet] = useState('');
    const [specificLifeArea, setSpecificLifeArea] = useState('');
    const [astroBirthDate, setAstroBirthDate] = useState('');
    const [astroBirthTime, setAstroBirthTime] = useState('');
    const [astroBirthTimePrecision, setAstroBirthTimePrecision] = useState<'exact' | 'approximate' | 'unknown'>('unknown');
    const [astroBirthCity, setAstroBirthCity] = useState('');
    const [birthDataPreFilled, setBirthDataPreFilled] = useState(false);

    // Partner birth data (for compatibility)
    const [partnerBirthDate, setPartnerBirthDate] = useState('');
    const [partnerBirthTime, setPartnerBirthTime] = useState('');
    const [partnerBirthTimePrecision, setPartnerBirthTimePrecision] = useState<'exact' | 'approximate' | 'unknown'>('unknown');
    const [partnerBirthCity, setPartnerBirthCity] = useState('');

    // Saved card selection
    const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
    const [useNewCard, setUseNewCard] = useState(false);

    // Stripe checkout state
    const [pendingRequest, setPendingRequest] = useState<ReadingRequest | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);

    const { data: configs, isLoading: configsLoading } = useSpreadConfigs();
    const { data: savedCards, isLoading: cardsLoading } = useUserCards();
    const { data: birthChart, isLoading: birthChartLoading } = useBirthChart(userId);
    const createMutation = useCreateReadingRequest();

    // Pre-fill birth data from personal space birth chart
    const hasBirthChart = !!birthChart;
    if (birthChart && !birthDataPreFilled && category === 'ASTROLOGY') {
        setAstroBirthDate(birthChart.birthDate);
        setAstroBirthTimePrecision(birthChart.birthTimePrecision);
        if (birthChart.birthTime) setAstroBirthTime(birthChart.birthTime);
        if (birthChart.birthLocation) {
            setAstroBirthCity(`${birthChart.birthLocation.city}, ${birthChart.birthLocation.country}`);
        }
        setBirthDataPreFilled(true);
    }

    // Filter configs by category
    const categoryConfigs = useMemo(() => {
        if (!configs || !category) return [];
        return configs.filter(c => c.category === category);
    }, [configs, category]);

    const selectedConfig = configs?.find(c => c.type === selectedSpread);
    const totalSteps = 3;

    const getTopicLabel = (): string => {
        if (category === 'ASTROLOGY') {
            const focus = ASTROLOGY_FOCUS_OPTIONS.find(f => f.value === focusArea);
            const base = focus?.label || 'Astrology Reading';
            if (focusArea === 'single_planet' && specificPlanet) {
                const planet = PLANET_OPTIONS.find(p => p.value === specificPlanet);
                return `${base} — ${planet?.label || specificPlanet}`;
            }
            if (focusArea === 'life_area' && specificLifeArea) {
                const area = LIFE_AREA_OPTIONS.find(a => a.value === specificLifeArea);
                return `${base} — ${area?.label || specificLifeArea}`;
            }
            return base;
        }
        if (topic === 'other' && customTopic.trim()) {
            return customTopic.trim();
        }
        const topicConfig = READING_TOPICS.find(t => t.value === topic);
        return topicConfig?.label || topic;
    };

    const isStep2Valid = (): boolean => {
        if (category === 'ASTROLOGY') {
            if (!focusArea) return false;
            if (!hasBirthChart && !astroBirthDate) return false;
            if (!hasBirthChart && !astroBirthCity.trim()) return false;
            if (focusArea === 'single_planet' && !specificPlanet) return false;
            if (focusArea === 'life_area' && !specificLifeArea) return false;
            // Compatibility requires partner birth data
            if (focusArea === 'compatibility') {
                if (!partnerBirthDate || !partnerBirthCity.trim()) return false;
            }
            return true;
        }
        // Tarot validation
        if (!topic) return false;
        if (topic === 'other') return !!customTopic.trim();
        return true;
    };

    const buildAstrologyData = (): AstrologyRequestData | undefined => {
        if (category !== 'ASTROLOGY' || !focusArea) return undefined;

        let birthData: ReadingBirthData;

        if (birthChart) {
            birthData = {
                birthDate: birthChart.birthDate,
                birthTimePrecision: birthChart.birthTimePrecision,
                birthTime: birthChart.birthTime,
                birthTimeApproximate: birthChart.birthTimeApproximate as ReadingBirthData['birthTimeApproximate'],
                birthLocation: {
                    city: birthChart.birthLocation.city,
                    country: birthChart.birthLocation.country,
                    countryCode: birthChart.birthLocation.countryCode,
                    latitude: birthChart.birthLocation.latitude,
                    longitude: birthChart.birthLocation.longitude,
                    timezone: birthChart.birthLocation.timezone,
                },
            };
        } else {
            birthData = {
                birthDate: astroBirthDate,
                birthTimePrecision: astroBirthTimePrecision,
                birthTime: astroBirthTimePrecision === 'exact' ? astroBirthTime : undefined,
                birthLocation: {
                    city: astroBirthCity,
                    country: '',
                    countryCode: '',
                    latitude: 0,
                    longitude: 0,
                    timezone: '',
                },
            };
        }

        // Build partner birth data for compatibility
        let partnerData: ReadingBirthData | undefined;
        if (focusArea === 'compatibility' && partnerBirthDate) {
            partnerData = {
                birthDate: partnerBirthDate,
                birthTimePrecision: partnerBirthTimePrecision,
                birthTime: partnerBirthTimePrecision === 'exact' ? partnerBirthTime : undefined,
                birthLocation: {
                    city: partnerBirthCity,
                    country: '',
                    countryCode: '',
                    latitude: 0,
                    longitude: 0,
                    timezone: '',
                },
            };
        }

        return {
            focusArea: focusArea as AstrologyFocusArea,
            birthData,
            partnerBirthData: partnerData,
            specificPlanet: focusArea === 'single_planet' ? specificPlanet : undefined,
            specificLifeArea: focusArea === 'life_area' ? specificLifeArea : undefined,
        };
    };

    const handleSubmit = async () => {
        if (!selectedSpread || !isStep2Valid()) return;

        const astrologyData = buildAstrologyData();

        if (selectedCard && !useNewCard) {
            try {
                const result = await createMutation.mutateAsync({
                    userId,
                    readingCategory: category || 'TAROT',
                    spreadType: selectedSpread,
                    topic: getTopicLabel(),
                    context: context.trim() || undefined,
                    paymentMethodId: selectedCard.paymentMethodId,
                    astrologyData,
                });

                if (result.success) {
                    onClose();
                }
            } catch (error) {
                console.error('Failed to create reading request:', error);
            }
            return;
        }

        try {
            const result = await createMutation.mutateAsync({
                userId,
                readingCategory: category || 'TAROT',
                spreadType: selectedSpread,
                topic: getTopicLabel(),
                context: context.trim() || undefined,
                astrologyData,
            });

            if (result.success && result.readingRequest) {
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

    // Show Stripe checkout inline
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
                    itemDescription={`${selectedConfig?.label || (category === 'ASTROLOGY' ? 'Astrology' : 'Tarot')} Reading - ${pendingRequest.topic}`}
                    onCancel={handleCheckoutCancel}
                    onSuccess={onClose}
                    submitButtonText="Save Card & Submit Request"
                />
                <p className="text-xs text-slate-500 text-center">
                    You won&apos;t be charged until a reader claims your request
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
                        Step {step} of {totalSteps}:{' '}
                        {step === 1 ? 'Choose Type' : step === 2 ? (category === 'ASTROLOGY' ? 'Focus & Birth Data' : 'Topic & Context') : 'Choose Tier & Pay'}
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
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`flex-1 h-1 rounded ${step >= i + 1 ? 'bg-purple-500' : 'bg-slate-700'}`} />
                ))}
            </div>

            {/* ============================================ */}
            {/* Step 1: Category Selection */}
            {/* ============================================ */}
            {step === 1 && (
                <div className="space-y-4">
                    <Label className="text-white font-medium">What type of reading would you like?</Label>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setCategory('TAROT')}
                            data-testid="category-tarot"
                            className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                                category === 'TAROT'
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-slate-700 bg-slate-800/50 hover:border-purple-500/50'
                            }`}
                        >
                            <div className="text-2xl mb-2">&#x1F0CF;</div>
                            <h3 className="font-semibold text-white">Tarot Reading</h3>
                            <p className="text-sm text-slate-400 mt-1">Card-based guidance from a practitioner</p>
                            <p className="text-xs text-purple-400 mt-2">From $5.00</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setCategory('ASTROLOGY')}
                            data-testid="category-astrology"
                            className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                                category === 'ASTROLOGY'
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-slate-700 bg-slate-800/50 hover:border-purple-500/50'
                            }`}
                        >
                            <div className="text-2xl mb-2">&#x2728;</div>
                            <h3 className="font-semibold text-white">Astrology Reading</h3>
                            <p className="text-sm text-slate-400 mt-1">Professional chart interpretation</p>
                            <p className="text-xs text-purple-400 mt-2">From $8.00</p>
                        </button>
                    </div>

                    {category === 'ASTROLOGY' && hasBirthChart && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400 flex items-center gap-2">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            Your birth chart data will be pre-filled from your personal space
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setStep(2);
                                setSelectedSpread(null);
                            }}
                            disabled={!category}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* Step 2: Tarot — Topic & Context */}
            {/* ============================================ */}
            {step === 2 && category === 'TAROT' && (
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
                            onClick={() => setStep(1)}
                            className="border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            onClick={() => setStep(3)}
                            disabled={!isStep2Valid()}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Next: Choose Spread
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* Step 2: Astrology — Focus & Birth Data */}
            {/* ============================================ */}
            {step === 2 && category === 'ASTROLOGY' && (
                <div className="space-y-4">
                    {/* Focus Area */}
                    <div className="space-y-2">
                        <Label className="text-white font-medium">
                            What would you like the astrologer to focus on? <span className="text-red-400">*</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {ASTROLOGY_FOCUS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFocusArea(opt.value)}
                                    data-testid={`focus-${opt.value}`}
                                    className={`p-3 rounded-lg border text-left transition-all text-sm ${
                                        focusArea === opt.value
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                    }`}
                                >
                                    <p className="text-white font-medium">{opt.label}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{opt.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Planet picker for single_planet focus */}
                    {focusArea === 'single_planet' && (
                        <div className="space-y-2">
                            <Label className="text-white font-medium">Which planet? <span className="text-red-400">*</span></Label>
                            <Select value={specificPlanet} onValueChange={setSpecificPlanet}>
                                <SelectTrigger data-testid="planet-select" className="bg-slate-900/80 border-slate-600 text-white">
                                    <SelectValue placeholder="Select a planet" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PLANET_OPTIONS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Life area picker */}
                    {focusArea === 'life_area' && (
                        <div className="space-y-2">
                            <Label className="text-white font-medium">Which life area? <span className="text-red-400">*</span></Label>
                            <Select value={specificLifeArea} onValueChange={setSpecificLifeArea}>
                                <SelectTrigger data-testid="life-area-select" className="bg-slate-900/80 border-slate-600 text-white">
                                    <SelectValue placeholder="Select a life area" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LIFE_AREA_OPTIONS.map((la) => (
                                        <SelectItem key={la.value} value={la.value}>{la.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Birth Data */}
                    <div className="space-y-2">
                        <Label className="text-white font-medium">Your birth data <span className="text-red-400">*</span></Label>

                        {birthChartLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Checking your birth chart...
                            </div>
                        ) : hasBirthChart ? (
                            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 space-y-1">
                                <p className="text-green-400 text-xs font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Pre-filled from your birth chart
                                </p>
                                <p className="text-white text-sm">
                                    {birthChart!.birthDate} &middot; {birthChart!.birthLocation.city}, {birthChart!.birthLocation.country}
                                </p>
                                {birthChart!.birthTime && (
                                    <p className="text-slate-400 text-xs">Birth time: {birthChart!.birthTime}</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Recommendation to use birth chart */}
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                    <p className="text-amber-300 text-xs font-medium mb-1">
                                        You don&apos;t have a birth chart saved yet
                                    </p>
                                    <p className="text-amber-200/70 text-xs mb-2">
                                        For the most accurate reading, save your birth chart first. It calculates exact coordinates and timezone from your birth location, giving the practitioner precise data to work with.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.open(`/u/${userId}/space/astrology/birth-chart`, '_blank');
                                        }}
                                        className="text-amber-400 text-xs font-medium hover:text-amber-300 underline underline-offset-2"
                                        data-testid="create-birth-chart-link"
                                    >
                                        Create your birth chart (opens in new tab)
                                    </button>
                                </div>

                                {/* Manual fallback */}
                                <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700 space-y-3">
                                    <p className="text-slate-400 text-xs">Or enter basic details below:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-slate-300 text-xs">Birth date <span className="text-red-400">*</span></Label>
                                            <Input
                                                type="date"
                                                value={astroBirthDate}
                                                onChange={(e) => setAstroBirthDate(e.target.value)}
                                                data-testid="astro-birth-date"
                                                className="bg-slate-900/80 border-slate-600 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300 text-xs">Birth time precision</Label>
                                            <Select value={astroBirthTimePrecision} onValueChange={(v) => setAstroBirthTimePrecision(v as 'exact' | 'approximate' | 'unknown')}>
                                                <SelectTrigger className="bg-slate-900/80 border-slate-600 text-white text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="exact">Exact</SelectItem>
                                                    <SelectItem value="approximate">Approximate</SelectItem>
                                                    <SelectItem value="unknown">Unknown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {astroBirthTimePrecision === 'exact' && (
                                        <div>
                                            <Label className="text-slate-300 text-xs">Birth time</Label>
                                            <Input
                                                type="time"
                                                value={astroBirthTime}
                                                onChange={(e) => setAstroBirthTime(e.target.value)}
                                                data-testid="astro-birth-time"
                                                className="bg-slate-900/80 border-slate-600 text-white text-sm"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <Label className="text-slate-300 text-xs">Birth city &amp; country <span className="text-red-400">*</span></Label>
                                        <Input
                                            type="text"
                                            value={astroBirthCity}
                                            onChange={(e) => setAstroBirthCity(e.target.value)}
                                            placeholder="e.g., Melbourne, Australia"
                                            data-testid="astro-birth-city"
                                            className="bg-slate-900/80 border-slate-600 text-white text-sm placeholder:text-slate-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Partner Birth Data (compatibility) */}
                    {focusArea === 'compatibility' && (
                        <div className="space-y-2">
                            <Label className="text-white font-medium">
                                Partner&apos;s birth data <span className="text-red-400">*</span>
                            </Label>
                            <div className="space-y-3 p-3 rounded-lg bg-slate-800/30 border border-purple-500/20">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-slate-300 text-xs">Birth date <span className="text-red-400">*</span></Label>
                                        <Input
                                            type="date"
                                            value={partnerBirthDate}
                                            onChange={(e) => setPartnerBirthDate(e.target.value)}
                                            data-testid="partner-birth-date"
                                            className="bg-slate-900/80 border-slate-600 text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-slate-300 text-xs">Birth time precision</Label>
                                        <Select value={partnerBirthTimePrecision} onValueChange={(v) => setPartnerBirthTimePrecision(v as 'exact' | 'approximate' | 'unknown')}>
                                            <SelectTrigger className="bg-slate-900/80 border-slate-600 text-white text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="exact">Exact</SelectItem>
                                                <SelectItem value="approximate">Approximate</SelectItem>
                                                <SelectItem value="unknown">Unknown</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {partnerBirthTimePrecision === 'exact' && (
                                    <div>
                                        <Label className="text-slate-300 text-xs">Birth time</Label>
                                        <Input
                                            type="time"
                                            value={partnerBirthTime}
                                            onChange={(e) => setPartnerBirthTime(e.target.value)}
                                            data-testid="partner-birth-time"
                                            className="bg-slate-900/80 border-slate-600 text-white text-sm"
                                        />
                                    </div>
                                )}
                                <div>
                                    <Label className="text-slate-300 text-xs">Birth city <span className="text-red-400">*</span></Label>
                                    <Input
                                        type="text"
                                        value={partnerBirthCity}
                                        onChange={(e) => setPartnerBirthCity(e.target.value)}
                                        placeholder="e.g., Sydney, Australia"
                                        data-testid="partner-birth-city"
                                        className="bg-slate-900/80 border-slate-600 text-white text-sm placeholder:text-slate-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Additional context */}
                    <div className="space-y-2">
                        <Label className="text-white font-medium">
                            Specific question or context <span className="text-slate-400">(optional)</span>
                        </Label>
                        <Textarea
                            data-testid="astro-context-input"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="Any specific questions or areas you want the astrologer to address..."
                            className="bg-slate-900/80 border-slate-600 text-white placeholder:text-slate-400 min-h-[80px]"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setStep(1)}
                            className="border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            onClick={() => setStep(3)}
                            disabled={!isStep2Valid()}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Next: Choose Tier
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* Step 3: Spread/Tier Selection & Payment */}
            {/* ============================================ */}
            {step === 3 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="space-y-3">
                        <Label className="text-white font-medium">
                            {category === 'ASTROLOGY' ? 'Choose your reading tier' : 'Choose your spread'}
                        </Label>
                        <div className="grid gap-3">
                            {categoryConfigs.map((config) => (
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
                                <span className="text-slate-300 font-medium">
                                    {category === 'ASTROLOGY' ? 'Focus:' : 'Topic:'}
                                </span>
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
                                                        {brandDisplay.name} &bull;&bull;&bull;&bull; {card.last4}
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
                                You won&apos;t be charged until a reader claims your request
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
                            onClick={() => setStep(2)}
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
