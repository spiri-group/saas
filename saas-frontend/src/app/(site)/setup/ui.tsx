'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import SpiriLogo from '@/icons/spiri-logo';
import { SignIn } from '@/components/ux/SignIn';

import OnboardingShell, { type OnboardingTheme } from './components/OnboardingShell';
import MarketingPanel from './components/MarketingPanel';
import StepIndicator from './components/StepIndicator';
import OnboardingConsent from './components/OnboardingConsent';
import BasicDetailsStep from './components/BasicDetailsStep';
import ChoosePlanStep from './components/ChoosePlanStep';
import MerchantProfileStep from './components/MerchantProfileStep';
import PractitionerProfileStep from './components/PractitionerProfileStep';
import PractitionerOptionalStep from './components/PractitionerOptionalStep';
import AlsoPractitionerStep from './components/AlsoPractitionerStep';
import { useOnboardingForm } from './hooks/useOnboardingForm';

// ── Step identifiers ────────────────────────────────────────────────

type Step =
    | 'consent'
    | 'basic'
    | 'plan'
    | 'merchant-profile'
    | 'also-practitioner'
    | 'practitioner-profile'
    | 'practitioner-optional';

// ── Branch (determined after plan selection) ────────────────────────

type Branch = 'practitioner' | 'merchant' | null;

// ── Theme & full-screen helpers ─────────────────────────────────────

function themeForStep(step: Step, branch: Branch): OnboardingTheme {
    if (step === 'plan') return 'neutral';
    if (step === 'merchant-profile' || step === 'also-practitioner') return 'amber';
    if (step === 'practitioner-profile' || step === 'practitioner-optional') return 'purple';
    return 'neutral';
}

function isFullScreenStep(step: Step): boolean {
    return step === 'plan';
}

// ── Step labels for indicator ───────────────────────────────────────

function stepLabels(step: Step, branch: Branch): string[] {
    // After merchant clicks "yes" to also create practitioner, show practitioner labels
    if (branch === 'merchant' && (step === 'practitioner-profile' || step === 'practitioner-optional')) {
        return ['Profile', 'Extras'];
    }
    if (branch === 'practitioner') return ['Profile', 'Extras'];
    if (branch === 'merchant') return ['Business', 'Done'];
    return [];
}

function stepNumber(step: Step, branch: Branch): number {
    // After merchant clicks "yes" to also create practitioner
    if (branch === 'merchant' && step === 'practitioner-profile') return 1;
    if (branch === 'merchant' && step === 'practitioner-optional') return 2;

    if (branch === 'practitioner') {
        if (step === 'practitioner-profile') return 1;
        if (step === 'practitioner-optional') return 2;
    }
    if (branch === 'merchant') {
        if (step === 'merchant-profile') return 1;
        if (step === 'also-practitioner') return 2;
    }
    return 1;
}

/** Plan step renders directly in the shell (dark bg), not inside the white card */
function isCardStep(step: Step): boolean {
    return step !== 'plan';
}

// ── Main Component ──────────────────────────────────────────────────

export default function SetupUI() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const isAuthenticated = !!session?.user;
    const isLoading = status === 'loading';

    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<Step>('consent');
    const [branch, setBranch] = useState<Branch>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdMerchantSlug, setCreatedMerchantSlug] = useState<string | null>(null);

    const { form, initMerchant, initPractitioner, createVendor, createPractitioner } = useOnboardingForm();

    useEffect(() => { setMounted(true); }, []);

    // Pre-fill email from session
    useEffect(() => {
        if (session?.user?.email && !form.getValues('email')) {
            form.setValue('email', session.user.email);
        }
    }, [session, form]);

    // ── Step handlers ───────────────────────────────────────────────

    const handleConsentAccepted = useCallback(() => {
        setStep('basic');
    }, []);

    const handleBasicNext = useCallback(() => {
        setStep('plan');
    }, []);

    const handlePlanSelect = useCallback((tier: string) => {
        const newBranch: Branch = tier === 'awaken' ? 'practitioner' : 'merchant';
        setBranch(newBranch);

        if (newBranch === 'merchant') {
            initMerchant();
            setStep('merchant-profile');
        } else {
            initPractitioner();
            setStep('practitioner-profile');
        }
    }, [initMerchant, initPractitioner]);

    const handlePlanBack = useCallback(() => {
        setStep('basic');
    }, []);

    // Merchant submission
    const handleMerchantSubmit = useCallback(async () => {
        setIsSubmitting(true);
        try {
            const slug = await createVendor();
            setCreatedMerchantSlug(slug);
            setStep('also-practitioner');
        } catch (error) {
            console.error('Error creating vendor:', error);
            toast.error('Failed to create your shop. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [createVendor]);

    const handleMerchantBack = useCallback(() => {
        setStep('plan');
    }, []);

    // Also-practitioner decision
    const handleAlsoPractitionerYes = useCallback(() => {
        initPractitioner();
        setStep('practitioner-profile');
    }, [initPractitioner]);

    const handleAlsoPractitionerNo = useCallback(() => {
        if (createdMerchantSlug) {
            window.location.href = `/m/${createdMerchantSlug}`;
        }
    }, [createdMerchantSlug]);

    // Practitioner steps
    const handlePractitionerProfileNext = useCallback(() => {
        setStep('practitioner-optional');
    }, []);

    const handlePractitionerProfileBack = useCallback(() => {
        if (branch === 'merchant') {
            setStep('also-practitioner');
        } else {
            setStep('plan');
        }
    }, [branch]);

    const handlePractitionerOptionalBack = useCallback(() => {
        setStep('practitioner-profile');
    }, []);

    const handlePractitionerSubmit = useCallback(async () => {
        setIsSubmitting(true);
        try {
            // If merchant branch, practitioner gets awaken tier
            const overrideTier = branch === 'merchant' ? 'awaken' : undefined;
            await createPractitioner(overrideTier);

            if (branch === 'merchant' && createdMerchantSlug) {
                window.location.href = `/m/${createdMerchantSlug}`;
            } else {
                const pracSlug = form.getValues('practitioner.slug');
                window.location.href = `/p/${pracSlug}`;
            }
        } catch (error) {
            console.error('Error creating practitioner:', error);
            toast.error('Failed to create your profile. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [branch, createdMerchantSlug, createPractitioner, form]);

    // ── Auth gate ───────────────────────────────────────────────────

    if (!isLoading && !isAuthenticated) {
        return (
            <div className="w-screen min-h-screen-minus-nav relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
                <div className="relative z-10 w-full min-h-screen-minus-nav flex items-center justify-center p-6">
                    <div className={`w-full max-w-lg transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
                            <div className="flex items-center justify-center mb-6">
                                <SpiriLogo height={50} />
                            </div>
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <h1 className="text-2xl font-light text-white tracking-wide">
                                    Join SpiriVerse
                                </h1>
                            </div>
                            <div className="space-y-6 text-center">
                                <div className="flex items-center justify-center gap-2 text-purple-300">
                                    <Mail className="w-5 h-5" />
                                    <p className="text-lg font-medium">First, we need your email</p>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Enter your email to get started. We&apos;ll send you a verification code.
                                </p>
                                <div className="pt-4">
                                    <SignIn />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-screen min-h-screen-minus-nav flex items-center justify-center bg-slate-900">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    // ── Theme & layout state ────────────────────────────────────────

    const theme = themeForStep(step, branch);
    const fullScreen = isFullScreenStep(step);
    const labels = stepLabels(step, branch);
    const currentStepNum = stepNumber(step, branch);
    const showCard = isCardStep(step);
    const showIndicator = labels.length > 0 && showCard;

    // ── Render ──────────────────────────────────────────────────────

    const formContent = (
        <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="flex-1">
                {step === 'consent' && (
                    <OnboardingConsent onAccepted={handleConsentAccepted} />
                )}

                {step === 'basic' && (
                    <BasicDetailsStep
                        form={form}
                        onNext={handleBasicNext}
                    />
                )}

                {step === 'plan' && (
                    <ChoosePlanStep
                        form={form}
                        onSelect={handlePlanSelect}
                        onBack={handlePlanBack}
                    />
                )}

                {step === 'merchant-profile' && (
                    <MerchantProfileStep
                        form={form}
                        onSubmit={handleMerchantSubmit}
                        onBack={handleMerchantBack}
                        isSubmitting={isSubmitting}
                    />
                )}

                {step === 'also-practitioner' && (
                    <AlsoPractitionerStep
                        onYes={handleAlsoPractitionerYes}
                        onNo={handleAlsoPractitionerNo}
                    />
                )}

                {step === 'practitioner-profile' && (
                    <PractitionerProfileStep
                        form={form}
                        onNext={handlePractitionerProfileNext}
                        onBack={handlePractitionerProfileBack}
                    />
                )}

                {step === 'practitioner-optional' && (
                    <PractitionerOptionalStep
                        form={form}
                        onSubmit={handlePractitionerSubmit}
                        onBack={handlePractitionerOptionalBack}
                        isSubmitting={isSubmitting}
                    />
                )}
            </form>
        </Form>
    );

    return (
        <OnboardingShell
            theme={theme}
            isFullScreen={fullScreen}
            marketingContent={<MarketingPanel theme={theme} />}
        >
            {showCard ? (
                <div
                    className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl h-full overflow-y-auto transition-all duration-1000 ${
                        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                    }`}
                >
                    {showIndicator && (
                        <StepIndicator
                            currentStep={currentStepNum}
                            totalSteps={labels.length}
                            labels={labels}
                        />
                    )}
                    {formContent}
                </div>
            ) : (
                /* Plan step renders directly on the dark background — no white card */
                <div className={`transition-all duration-1000 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}>
                    {formContent}
                </div>
            )}
        </OnboardingShell>
    );
}
