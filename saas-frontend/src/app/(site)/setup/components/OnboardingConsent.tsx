'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { markdownToHtml, stripForConsent } from '@/utils/markdownToHtml';
import { resolvePlaceholders } from '@/utils/resolvePlaceholders';
import UseLegalPlaceholders from '@/hooks/UseLegalPlaceholders';
import useUserMarket from '@/hooks/UseUserMarket';
import useCheckOutstandingConsents from '../../components/ConsentGuard/hooks/UseCheckOutstandingConsents';
import useRecordConsents from '../../components/ConsentGuard/hooks/UseRecordConsents';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    useCarousel,
} from '@/components/ux/Carousel';
import type { UseEmblaCarouselType } from 'embla-carousel-react';

type CarouselApi = UseEmblaCarouselType[1];

type Props = {
    onAccepted: () => void;
    onBack?: () => void;
    branch?: 'merchant' | 'practitioner' | null;
};

// ── Shared helpers ──────────────────────────────────────────────────

type OutstandingDoc = {
    documentType: string;
    documentId: string;
    title: string;
    content: string;
    version: number;
    supplementContent?: string;
    supplementTitle?: string;
    supplementDocumentId?: string;
    supplementVersion?: number;
    placeholders?: Record<string, string>;
};

function useConsentData(branch: Props['branch']) {
    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;
    const market = useUserMarket();
    const { data: outstanding, isLoading } = useCheckOutstandingConsents('merchant-onboarding', isLoggedIn, market);
    const { data: globalPlaceholders } = UseLegalPlaceholders();
    const recordConsents = useRecordConsents();

    const buttonGradient = branch === 'merchant'
        ? 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
        : branch === 'practitioner'
            ? 'from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
            : 'from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700';

    return { outstanding, isLoading, globalPlaceholders, recordConsents, buttonGradient };
}

function renderDocContent(
    doc: OutstandingDoc,
    globalPlaceholders: Record<string, string> | undefined,
    handleContentClick: (e: React.MouseEvent<HTMLDivElement>) => void,
    className?: string,
) {
    return (
        <div
            data-testid={`consent-content-${doc.documentType}`}
            className={className}
            onClick={handleContentClick}
        >
            <div dangerouslySetInnerHTML={{
                __html: markdownToHtml(
                    stripForConsent(
                        resolvePlaceholders(
                            doc.content,
                            globalPlaceholders || {},
                            doc.placeholders
                        )
                    )
                )
            }} />
            {doc.supplementContent && (
                <>
                    <hr className="my-6 border-white/20" />
                    <h4 className="text-sm font-semibold text-white mb-2">{doc.supplementTitle || 'Country Supplement'}</h4>
                    <div dangerouslySetInnerHTML={{
                        __html: markdownToHtml(
                            stripForConsent(
                                resolvePlaceholders(
                                    doc.supplementContent,
                                    globalPlaceholders || {}
                                )
                            )
                        )
                    }} />
                </>
            )}
        </div>
    );
}

// ── Mobile Carousel Experience ──────────────────────────────────────

function MobileConsentCarousel({
    outstanding,
    globalPlaceholders,
    checkedDocs,
    onToggle,
    onAccept,
    onBack,
    buttonGradient,
    isPending,
    handleContentClick,
}: {
    outstanding: OutstandingDoc[];
    globalPlaceholders: Record<string, string> | undefined;
    checkedDocs: Set<string>;
    onToggle: (docType: string) => void;
    onAccept: () => void;
    onBack?: () => void;
    buttonGradient: string;
    isPending: boolean;
    handleContentClick: (e: React.MouseEvent<HTMLDivElement>, outstanding: OutstandingDoc[], setActiveIndex: (i: number) => void) => void;
}) {
    const [api, setApi] = useState<CarouselApi>();
    const [activeIndex, setActiveIndex] = useState(0);
    const allChecked = outstanding.every(doc => checkedDocs.has(doc.documentType));

    useEffect(() => {
        if (!api) return;
        const onSelect = () => setActiveIndex(api.selectedScrollSnap());
        api.on('select', onSelect);
        onSelect();
        return () => { api.off('select', onSelect); };
    }, [api]);

    const activeDoc = outstanding[activeIndex];
    const isCurrentChecked = checkedDocs.has(activeDoc.documentType);
    const isLast = activeIndex === outstanding.length - 1;

    const handleNext = () => {
        if (api && activeIndex < outstanding.length - 1) {
            api.scrollNext();
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0" data-testid="onboarding-consent-mobile">
            {/* Minimal top bar — dots + counter */}
            <div className="flex items-center justify-center gap-3 px-4 pt-4 pb-2">
                <div className="flex items-center gap-1.5">
                    {outstanding.map((doc, i) => (
                        <button
                            key={doc.documentType}
                            type="button"
                            onClick={() => api?.scrollTo(i)}
                            className={`rounded-full transition-all duration-300 ${
                                i === activeIndex
                                    ? 'w-6 h-2 bg-indigo-400'
                                    : checkedDocs.has(doc.documentType)
                                        ? 'w-2 h-2 bg-green-400'
                                        : 'w-2 h-2 bg-white/20'
                            }`}
                            aria-label={`Go to ${doc.title}`}
                        />
                    ))}
                </div>
                <span className="text-xs text-white/40 ml-1">
                    {activeIndex + 1}/{outstanding.length}
                </span>
            </div>

            {/* Document title */}
            <h3 className="text-base font-semibold text-white px-4 pb-2 text-center">
                {activeDoc.title}
            </h3>

            {/* Swipeable document cards */}
            <Carousel
                opts={{ watchDrag: true, align: 'start' }}
                setApi={setApi}
                className="flex-1 min-h-0 flex flex-col"
            >
                <CarouselContent outerClassName="flex-1 min-h-0">
                    {outstanding.map((doc) => (
                        <CarouselItem
                            key={doc.documentType}
                            className="basis-full h-full"
                        >
                            <div className="h-full overflow-y-auto px-4 pb-2">
                                {renderDocContent(
                                    doc,
                                    globalPlaceholders,
                                    (e) => handleContentClick(e, outstanding, (i) => api?.scrollTo(i)),
                                    'text-sm text-slate-300 prose prose-sm prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-indigo-400 prose-strong:text-white prose-li:text-slate-300',
                                )}
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            {/* Bottom action area — big tappable agree card + button */}
            <div className="px-4 pt-2 space-y-3 flex-shrink-0 border-t border-white/10" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                {/* Tappable agree card */}
                <button
                    type="button"
                    data-testid={`consent-checkbox-${activeDoc.documentType}`}
                    onClick={() => onToggle(activeDoc.documentType)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 text-left cursor-pointer ${
                        isCurrentChecked
                            ? 'bg-indigo-500/20 border-2 border-indigo-400/50'
                            : 'bg-white/[0.05] border-2 border-white/10 active:bg-white/10'
                    }`}
                >
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isCurrentChecked
                            ? 'bg-indigo-500 text-white'
                            : 'border-2 border-white/30'
                    }`}>
                        {isCurrentChecked && <Check className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm leading-snug ${
                        isCurrentChecked ? 'text-indigo-200' : 'text-slate-300'
                    }`}>
                        I have read and agree to the {activeDoc.title}
                    </span>
                </button>

                {/* Navigation buttons */}
                <div className="flex gap-2">
                    {onBack && activeIndex === 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onBack}
                            className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                            Back
                        </Button>
                    )}
                    {!isLast ? (
                        <Button
                            type="button"
                            data-testid="onboarding-consent-next-btn"
                            className={`flex-1 bg-gradient-to-r ${buttonGradient} h-12 text-base`}
                            disabled={!isCurrentChecked}
                            onClick={handleNext}
                        >
                            Next
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            data-testid="onboarding-consent-accept-btn"
                            className={`flex-1 bg-gradient-to-r ${buttonGradient} h-12 text-base`}
                            disabled={!allChecked || isPending}
                            onClick={onAccept}
                        >
                            {isPending ? 'Saving...' : 'Accept & Continue'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Desktop Layout (existing design) ────────────────────────────────

function DesktopConsentLayout({
    outstanding,
    globalPlaceholders,
    checkedDocs,
    activeIndex,
    setActiveIndex,
    onToggle,
    onAccept,
    onBack,
    buttonGradient,
    isPending,
    handleContentClick,
}: {
    outstanding: OutstandingDoc[];
    globalPlaceholders: Record<string, string> | undefined;
    checkedDocs: Set<string>;
    activeIndex: number;
    setActiveIndex: (i: number) => void;
    onToggle: (docType: string) => void;
    onAccept: () => void;
    onBack?: () => void;
    buttonGradient: string;
    isPending: boolean;
    handleContentClick: (e: React.MouseEvent<HTMLDivElement>, outstanding: OutstandingDoc[], setActiveIndex: (i: number) => void) => void;
}) {
    const activeDoc = outstanding[activeIndex];
    const isCurrentChecked = checkedDocs.has(activeDoc.documentType);
    const allChecked = outstanding.every(doc => checkedDocs.has(doc.documentType));
    const completedCount = outstanding.filter(doc => checkedDocs.has(doc.documentType)).length;

    return (
        <div className="flex flex-col md:grid md:grid-cols-[220px_1fr] flex-1 min-h-0" data-testid="onboarding-consent-desktop">
            {/* Left panel — progress tracker */}
            <div className="bg-white/[0.05] p-5 flex flex-col border-r border-white/10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-full bg-indigo-500/20 p-2">
                        <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                        Review & Accept
                    </h2>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Please review each document to continue.
                </p>

                <nav className="flex flex-col flex-1 gap-1" aria-label="Document review progress">
                    {outstanding.map((doc, index) => {
                        const isCompleted = checkedDocs.has(doc.documentType);
                        const isActive = index === activeIndex;

                        return (
                            <button
                                key={doc.documentType}
                                data-testid={`consent-step-${index}`}
                                type="button"
                                className={`flex-shrink w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                    isActive
                                        ? 'bg-indigo-500/15 border border-indigo-400/30'
                                        : isCompleted
                                            ? 'hover:bg-white/[0.05] cursor-pointer'
                                            : 'cursor-default'
                                }`}
                                onClick={() => {
                                    if (isCompleted || isActive) {
                                        setActiveIndex(index);
                                    }
                                }}
                                disabled={!isCompleted && !isActive}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                                ) : isActive ? (
                                    <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-semibold text-white">{index + 1}</span>
                                    </div>
                                ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-medium text-white/40">{index + 1}</span>
                                    </div>
                                )}
                                <span
                                    className={`text-xs truncate ${
                                        isActive
                                            ? 'font-semibold text-indigo-300'
                                            : isCompleted
                                                ? 'text-slate-300'
                                                : 'text-white/30'
                                    }`}
                                >
                                    {doc.title}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <p className="text-xs text-white/40 mt-4 pt-4 border-t border-white/10">
                    {completedCount} of {outstanding.length} reviewed
                </p>
            </div>

            {/* Right panel — single document view */}
            <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
                    <h3 className="font-medium text-white text-base mb-3 shrink-0">{activeDoc.title}</h3>
                    {renderDocContent(
                        activeDoc,
                        globalPlaceholders,
                        (e) => handleContentClick(e, outstanding, setActiveIndex),
                        'border border-white/10 rounded-lg p-4 overflow-y-auto text-sm text-slate-300 bg-white/[0.03] prose prose-sm prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-indigo-400 prose-strong:text-white prose-li:text-slate-300 flex-1 min-h-0',
                    )}
                </div>

                <div className="p-6 border-t border-white/10 space-y-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`consent-${activeDoc.documentType}`}
                            data-testid={`consent-checkbox-${activeDoc.documentType}`}
                            checked={isCurrentChecked}
                            onCheckedChange={() => onToggle(activeDoc.documentType)}
                            className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                        />
                        <label
                            htmlFor={`consent-${activeDoc.documentType}`}
                            className="text-sm text-slate-300 cursor-pointer select-none leading-normal"
                        >
                            I have read and agree to the {activeDoc.title}
                        </label>
                    </div>

                    <div className="flex gap-2">
                        {onBack && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onBack}
                                className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
                            >
                                Back
                            </Button>
                        )}
                        {activeIndex < outstanding.length - 1 ? (
                            <Button
                                type="button"
                                data-testid="onboarding-consent-next-btn"
                                className={`flex-1 bg-gradient-to-r ${buttonGradient}`}
                                disabled={!isCurrentChecked}
                                onClick={() => setActiveIndex(activeIndex + 1)}
                            >
                                Next
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                data-testid="onboarding-consent-accept-btn"
                                className={`flex-1 bg-gradient-to-r ${buttonGradient}`}
                                disabled={!allChecked || isPending}
                                onClick={onAccept}
                            >
                                {isPending ? 'Saving...' : 'Accept & Continue'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────────────────────────

export default function OnboardingConsent({ onAccepted, onBack, branch }: Props) {
    const { outstanding, isLoading, globalPlaceholders, recordConsents, buttonGradient } = useConsentData(branch);
    const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (!isLoading && (!outstanding || outstanding.length === 0)) {
            onAccepted();
        }
    }, [isLoading, outstanding, onAccepted]);

    const handleToggle = useCallback((documentType: string) => {
        setCheckedDocs(prev => {
            const next = new Set(prev);
            if (next.has(documentType)) next.delete(documentType);
            else next.add(documentType);
            return next;
        });
    }, []);

    const handleContentClick = useCallback((
        e: React.MouseEvent<HTMLDivElement>,
        docs: OutstandingDoc[],
        goToIndex: (i: number) => void,
    ) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (!href) return;

        if (href.startsWith('#')) {
            e.preventDefault();
            const id = href.slice(1);
            const el = (e.currentTarget as HTMLElement).querySelector(`#${CSS.escape(id)}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        if (!href.startsWith('/legal/')) return;

        e.preventDefault();
        const slug = href.replace('/legal/', '');
        const stepIndex = docs.findIndex(doc => doc.documentType === slug);
        if (stepIndex !== -1) {
            goToIndex(stepIndex);
        }
    }, []);

    const handleAccept = useCallback(async () => {
        if (!outstanding) return;
        const inputs = outstanding.map(doc => ({
            documentType: doc.documentType,
            documentId: doc.documentId,
            version: doc.version,
            consentContext: 'site-modal',
            documentTitle: doc.title,
            supplementDocumentId: doc.supplementDocumentId,
            supplementVersion: doc.supplementVersion,
        }));
        await recordConsents.mutateAsync(inputs);
        onAccepted();
    }, [outstanding, recordConsents, onAccepted]);

    if (isLoading || !outstanding || outstanding.length === 0) return null;

    return (
        <div className="flex flex-col flex-1 min-h-0" data-testid="onboarding-consent">
            {/* Mobile: swipeable full-screen cards */}
            <div className="md:hidden flex flex-col flex-1 min-h-0">
                <MobileConsentCarousel
                    outstanding={outstanding}
                    globalPlaceholders={globalPlaceholders}
                    checkedDocs={checkedDocs}
                    onToggle={handleToggle}
                    onAccept={handleAccept}
                    onBack={onBack}
                    buttonGradient={buttonGradient}
                    isPending={recordConsents.isPending}
                    handleContentClick={handleContentClick}
                />
            </div>

            {/* Desktop: existing two-panel layout */}
            <div className="hidden md:flex flex-col flex-1 min-h-0">
                <DesktopConsentLayout
                    outstanding={outstanding}
                    globalPlaceholders={globalPlaceholders}
                    checkedDocs={checkedDocs}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                    onToggle={handleToggle}
                    onAccept={handleAccept}
                    onBack={onBack}
                    buttonGradient={buttonGradient}
                    isPending={recordConsents.isPending}
                    handleContentClick={handleContentClick}
                />
            </div>
        </div>
    );
}
