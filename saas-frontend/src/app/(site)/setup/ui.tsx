'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import SpiriLogo from '@/icons/spiri-logo';
import { SignIn } from '@/components/ux/SignIn';

import { gql } from '@/lib/services/gql';
import UseUserProfile from '@/hooks/user/UseUserProfile';
import useReverseGeocoding from '@/components/utils/useReverseGeoCoding';
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
    | 'basic'
    | 'plan'
    | 'consent'
    | 'merchant-profile'
    | 'also-practitioner'
    | 'practitioner-profile'
    | 'practitioner-optional';

// ── Branch (determined after plan selection) ────────────────────────

type Branch = 'practitioner' | 'merchant' | null;

// ── Theme & full-screen helpers ─────────────────────────────────────

function themeForStep(step: Step, branch: Branch, hasReligion?: boolean): OnboardingTheme {
    if (step === 'basic') return hasReligion ? 'faith' : 'neutral';
    if (step === 'plan') return 'neutral';
    if (step === 'consent') {
        // Consent theme matches the selected plan branch
        if (branch === 'merchant') return 'amber';
        if (branch === 'practitioner') return 'purple';
        return 'neutral';
    }
    if (step === 'merchant-profile' || step === 'also-practitioner') return 'amber';
    if (step === 'practitioner-profile' || step === 'practitioner-optional') return 'purple';
    return 'neutral';
}

function isFullScreenStep(step: Step): boolean {
    return step === 'plan' || step === 'consent';
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

/** Basic, plan & consent steps render directly in the shell — basic uses its own glass card */
function isCardStep(step: Step): boolean {
    return step !== 'plan' && step !== 'consent' && step !== 'basic';
}

// ── Main Component ──────────────────────────────────────────────────

export default function SetupUI() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const isAuthenticated = !!session?.user;
    const isLoading = status === 'loading';
    const searchParams = useSearchParams();
    const tierParam = searchParams.get('tier');
    const intervalParam = searchParams.get('interval') as 'monthly' | 'annual' | null;

    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<Step>('basic');
    const [branch, setBranch] = useState<Branch>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdMerchantSlug, setCreatedMerchantSlug] = useState<string | null>(null);

    const { form, initMerchant, initPractitioner, createVendor, createPractitioner } = useOnboardingForm();
    const { data: userProfile } = UseUserProfile(session?.user?.id ?? '');
    const detectedCountry = useReverseGeocoding();
    const didSkipRef = useRef(false);

    useEffect(() => { setMounted(true); }, []);

    // Pre-fill email from session
    useEffect(() => {
        if (session?.user?.email && !form.getValues('email')) {
            form.setValue('email', session.user.email);
        }
    }, [session, form]);

    // Skip redundant steps when profile is already complete
    useEffect(() => {
        if (didSkipRef.current) return;
        if (!session?.user || !userProfile) return;
        if (session.user.requiresInput) return;

        // Pre-fill form from existing profile
        const country = detectedCountry ?? '';
        form.setValue('firstName', userProfile.firstname || '');
        form.setValue('lastName', userProfile.lastname || '');
        form.setValue('email', userProfile.email || session.user.email || '');
        if (country) form.setValue('country', country);
        if (userProfile.religion?.id) form.setValue('religionId', userProfile.religion.id);
        if (userProfile.openToOtherExperiences != null) {
            form.setValue('openToOtherExperiences', userProfile.openToOtherExperiences);
        }

        if (tierParam) {
            // Tier was chosen in the GetStartedDialog — skip basic + plan, go to consent
            form.setValue('subscription.tier', tierParam);
            if (intervalParam) form.setValue('subscription.billingInterval', intervalParam);

            const newBranch: Branch = tierParam === 'awaken' ? 'practitioner' : 'merchant';
            setBranch(newBranch);
            if (newBranch === 'merchant') {
                initMerchant();
            } else {
                initPractitioner();
            }
            setStep('consent');
        } else {
            // No tier param — skip basic, land on plan selection
            setStep('plan');
        }

        didSkipRef.current = true;
    }, [session, userProfile, detectedCountry, tierParam, intervalParam, form, initMerchant, initPractitioner]);

    // ── Step handlers ───────────────────────────────────────────────

    const handleBasicBrowse = useCallback(async () => {
        if (!session?.user?.id) {
            window.location.href = '/';
            return;
        }

        // Save basic details so requiresInput is set to false
        const vals = form.getValues();
        try {
            await gql<{ update_user: { success: boolean } }>(
                `mutation UpdateUser($customer: CustomerUpdateInput!) {
                    update_user(customer: $customer) {
                        success
                    }
                }`,
                {
                    customer: {
                        id: session.user.id,
                        firstname: vals.firstName,
                        lastname: vals.lastName,
                        ...(vals.religionId ? {
                            religionId: vals.religionId,
                            openToOtherExperiences: vals.openToOtherExperiences ?? true,
                        } : {}),
                    }
                }
            );
        } catch (error) {
            console.error('Failed to save basic details:', error);
        }

        window.location.href = `/u/${session.user.id}/space`;
    }, [session, form]);

    const handleBasicSetupBusiness = useCallback(() => {
        setStep('plan');
    }, []);

    const handlePlanSelect = useCallback((tier: string) => {
        const newBranch: Branch = tier === 'awaken' ? 'practitioner' : 'merchant';
        setBranch(newBranch);

        if (newBranch === 'merchant') {
            initMerchant();
        } else {
            initPractitioner();
        }

        // After selecting plan, go to consent
        setStep('consent');
    }, [initMerchant, initPractitioner]);

    const handleConsentBack = useCallback(() => {
        if (tierParam && session?.user?.id) {
            // Tier was pre-selected via URL — cancel back to My Journey
            router.push(`/u/${session.user.id}/space`);
        } else {
            setStep('plan');
        }
    }, [tierParam, session?.user?.id, router]);

    const handleConsentAccepted = useCallback(() => {
        // After consent, go to profile step based on branch
        if (branch === 'merchant') {
            setStep('merchant-profile');
        } else if (branch === 'practitioner') {
            setStep('practitioner-profile');
        }
    }, [branch]);

    const handlePlanBack = useCallback(() => {
        if (didSkipRef.current && session?.user?.id) {
            // Basic step was skipped — cancel back to My Journey
            router.push(`/u/${session.user.id}/space`);
        } else {
            setStep('basic');
        }
    }, [session?.user?.id, router]);

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
        setStep('consent');
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
            setStep('consent');
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
            <div className="w-full flex-1 flex items-center justify-center p-6">
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
                            <div className="flex items-center justify-center gap-2 text-indigo-300">
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
        );
    }

    if (isLoading) {
        return (
            <div className="w-full flex-1 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    // ── Theme & layout state ────────────────────────────────────────

    const theme = themeForStep(step, branch, !!form.watch('religionId'));
    const fullScreen = isFullScreenStep(step);
    const labels = stepLabels(step, branch);
    const currentStepNum = stepNumber(step, branch);
    const showCard = isCardStep(step);
    const showIndicator = labels.length > 0 && showCard;

    // ── Render ──────────────────────────────────────────────────────

    const formContent = (
        <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="flex-1 flex flex-col min-h-0">
                {step === 'basic' && (
                    <BasicDetailsStep
                        form={form}
                        onBrowse={handleBasicBrowse}
                        onSetupBusiness={handleBasicSetupBusiness}
                    />
                )}

                {step === 'plan' && (
                    <ChoosePlanStep
                        form={form}
                        onSelect={handlePlanSelect}
                        onBack={handlePlanBack}
                    />
                )}

                {step === 'consent' && (
                    <OnboardingConsent 
                        onAccepted={handleConsentAccepted} 
                        onBack={handleConsentBack}
                        branch={branch} 
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
            isFullScreen={fullScreen}
            isCentered={step === 'basic'}
            marketingContent={<MarketingPanel theme={theme} />}
            cancelHref={didSkipRef.current && session?.user?.id ? `/u/${session.user.id}/space` : undefined}
        >            {showCard ? (
                <div
                    className={`flex flex-col rounded-2xl flex-1 min-h-0 transition-all duration-1000 overflow-hidden ${
                        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                    } ${
                        theme === 'purple'
                            ? 'bg-purple-50 border-2 border-purple-300/60 shadow-[0_8px_40px_-8px_rgba(147,51,234,0.25)]'
                            : theme === 'amber'
                                ? 'bg-amber-50 border-2 border-amber-300/60 shadow-[0_8px_40px_-8px_rgba(245,158,11,0.25)]'
                                : 'bg-white border border-slate-200 shadow-2xl'
                    }`}
                >
                    {/* Themed accent bar */}
                    <div className={`h-1.5 flex-shrink-0 ${
                        theme === 'purple' ? 'bg-gradient-to-r from-purple-500 to-violet-500'
                            : theme === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                    }`} />
                    {showIndicator && (
                        <StepIndicator
                            currentStep={currentStepNum}
                            totalSteps={labels.length}
                            labels={labels}
                            theme={theme}
                        />
                    )}
                    {formContent}
                </div>
            ) : (
                /* Consent & plan steps render directly on the dark background — no white card */
                <div className={`flex flex-col flex-1 min-h-0 transition-all duration-1000 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}>
                    {step === 'consent' ? (
                        <div className="backdrop-blur-xl bg-white/[0.07] border border-white/15 rounded-2xl shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
                            {formContent}
                        </div>
                    ) : (
                        formContent
                    )}
                </div>
            )}
        </OnboardingShell>
    );
}
