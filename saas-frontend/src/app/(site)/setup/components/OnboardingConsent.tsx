'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { markdownToHtml } from '@/utils/markdownToHtml';
import { resolvePlaceholders } from '@/utils/resolvePlaceholders';
import UseLegalPlaceholders from '@/hooks/UseLegalPlaceholders';
import useCheckOutstandingConsents from '../../components/ConsentGuard/hooks/UseCheckOutstandingConsents';
import useRecordConsents from '../../components/ConsentGuard/hooks/UseRecordConsents';

/** Strip title heading and Table of Contents from markdown — not needed in consent review */
function stripForConsent(md: string): string {
    return md
        // Remove the first H1 title (already shown by the UI)
        .replace(/^#\s+[^\r\n]+[\r\n]+/, '')
        // Remove everything from a "Table of Contents" heading up to the next heading
        .replace(/^#{1,4}\s*Table of Contents[^\n]*\n[\s\S]*?(?=^#{1,4}\s)/gim, '');
}

type Props = {
    onAccepted: () => void;
    onBack?: () => void;
    branch?: 'merchant' | 'practitioner' | null;
};

export default function OnboardingConsent({ onAccepted, onBack, branch }: Props) {
    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;
    const { data: outstanding, isLoading } = useCheckOutstandingConsents('merchant-onboarding', isLoggedIn);
    const { data: globalPlaceholders } = UseLegalPlaceholders();
    const recordConsents = useRecordConsents();
    const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
    const [activeIndex, setActiveIndex] = useState(0);

    // Button gradient based on branch
    const buttonGradient = branch === 'merchant'
        ? 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
        : branch === 'practitioner'
            ? 'from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
            : 'from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700';

    useEffect(() => {
        if (!isLoading && (!outstanding || outstanding.length === 0)) {
            onAccepted();
        }
    }, [isLoading, outstanding, onAccepted]);

    if (isLoading || !outstanding || outstanding.length === 0) return null;

    const activeDoc = outstanding[activeIndex];
    const isCurrentChecked = checkedDocs.has(activeDoc.documentType);
    const allChecked = outstanding.every(doc => checkedDocs.has(doc.documentType));
    const completedCount = outstanding.filter(doc => checkedDocs.has(doc.documentType)).length;

    const handleToggle = (documentType: string) => {
        setCheckedDocs(prev => {
            const next = new Set(prev);
            if (next.has(documentType)) next.delete(documentType);
            else next.add(documentType);
            return next;
        });
    };

    const handleNext = () => {
        if (activeIndex < outstanding.length - 1) {
            setActiveIndex(activeIndex + 1);
        }
    };

    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (!href) return;

        // Anchor links — scroll within the container
        if (href.startsWith('#')) {
            e.preventDefault();
            const id = href.slice(1);
            const el = (e.currentTarget as HTMLElement).querySelector(`#${CSS.escape(id)}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        // Cross-document links
        if (!href.startsWith('/legal/')) return;

        e.preventDefault();
        const slug = href.replace('/legal/', '');
        const stepIndex = outstanding.findIndex(doc => doc.documentType === slug);
        if (stepIndex !== -1) {
            setActiveIndex(stepIndex);
        }
    };

    const handleAccept = async () => {
        const inputs = outstanding.map(doc => ({
            documentType: doc.documentType,
            documentId: doc.documentId,
            version: doc.version,
            consentContext: 'site-modal',
            documentTitle: doc.title,
        }));
        await recordConsents.mutateAsync(inputs);
        onAccepted();
    };

    return (
        <div className="flex flex-col md:grid md:grid-cols-[240px_1fr] flex-1 min-h-0" data-testid="onboarding-consent">
            {/* Left panel — progress tracker */}
            <div className="bg-white/[0.05] p-6 flex flex-col border-r border-white/10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-full bg-indigo-500/20 p-2">
                        <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                        Review & Accept
                    </h2>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Please review each document to continue.
                </p>

                {/* Step list */}
                <nav className="flex-1 space-y-1" aria-label="Document review progress">
                    {outstanding.map((doc, index) => {
                        const isCompleted = checkedDocs.has(doc.documentType);
                        const isActive = index === activeIndex;

                        return (
                            <button
                                key={doc.documentType}
                                data-testid={`consent-step-${index}`}
                                type="button"
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
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

                {/* Progress count */}
                <p className="text-xs text-white/40 mt-4 pt-4 border-t border-white/10">
                    {completedCount} of {outstanding.length} reviewed
                </p>
            </div>

            {/* Right panel — single document view */}
            <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
                    <h3 className="font-medium text-white mb-4 shrink-0">{activeDoc.title}</h3>
                    <div
                        data-testid={`consent-content-${activeDoc.documentType}`}
                        className="border border-white/10 rounded-lg p-4 overflow-y-auto text-sm text-slate-300 bg-white/[0.03] prose prose-sm prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-indigo-400 prose-strong:text-white prose-li:text-slate-300 flex-1 min-h-0"
                        onClick={handleContentClick}
                        dangerouslySetInnerHTML={{
                            __html: markdownToHtml(
                                stripForConsent(
                                    resolvePlaceholders(
                                        activeDoc.content,
                                        globalPlaceholders || {},
                                        activeDoc.placeholders
                                    )
                                )
                            )
                        }}
                    />
                </div>

                <div className="p-6 border-t border-white/10 space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`consent-${activeDoc.documentType}`}
                            data-testid={`consent-checkbox-${activeDoc.documentType}`}
                            checked={isCurrentChecked}
                            onCheckedChange={() => handleToggle(activeDoc.documentType)}
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
                                onClick={handleNext}
                            >
                                Next
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                data-testid="onboarding-consent-accept-btn"
                                className={`flex-1 bg-gradient-to-r ${buttonGradient}`}
                                disabled={!allChecked || recordConsents.isPending}
                                onClick={handleAccept}
                            >
                                {recordConsents.isPending ? 'Saving...' : 'Accept & Continue'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
