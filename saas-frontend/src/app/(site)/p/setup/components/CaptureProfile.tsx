'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ArrowLeft, ArrowRight, Check, Loader2, Star, User, Sparkles, CreditCard } from 'lucide-react';
import { gql } from '@/lib/services/gql';
import ComboBox from '@/components/ux/ComboBox';
import { Badge } from '@/components/ui/badge';
import countryToCurrency from "country-to-currency";
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { MODALITIES, SPECIALIZATIONS } from '../../_constants/practitionerOptions';
import PractitionerSubscription from './PractitionerSubscription';
import { CurrencyAmountSchema } from '@/components/ux/CurrencyInput';
import { Checkbox } from '@/components/ui/checkbox';
import useCheckOutstandingConsents from '../../../components/ConsentGuard/hooks/UseCheckOutstandingConsents';
import useRecordConsents from '../../../components/ConsentGuard/hooks/UseRecordConsents';
import Link from 'next/link';

// List of countries with their codes and names
const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'IE', name: 'Ireland' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
];

// Form schema for all steps
const practitionerFormSchema = z.object({
    // Step 1: Basic Info
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    slug: z.string()
        .min(3, 'URL must be at least 3 characters')
        .max(50)
        .regex(/^[a-z0-9-]+$/, 'Please use only lowercase letters, numbers and hyphens for your Public URL.'),
    email: z.string().email('Please enter a valid email'),
    country: z.string().min(2, 'Please select a country'),
    currency: z.string().min(3),

    // Step 2: Profile
    headline: z.string().min(10, 'Headline must be at least 10 characters').max(150),
    bio: z.string().min(50, 'Bio must be at least 50 characters').max(2000),
    modalities: z.array(z.string()).min(1, 'Please select at least one modality'),
    specializations: z.array(z.string()).min(1, 'Please select at least one specialization'),

    // Step 3: Details (optional)
    pronouns: z.string().optional(),
    yearsExperience: z.number().min(0).max(100).optional(),
    spiritualJourney: z.string().max(2000).optional(),
    approach: z.string().max(1000).optional(),

    // Step 4: Subscription
    subscription: z.object({
        plans: z.array(z.object({
            productId: z.string(),
            variantId: z.string(),
            price: CurrencyAmountSchema,
            name: z.string().min(1)
        })).min(1, { message: "At least one subscription plan is required" })
    })
});

type PractitionerFormValues = z.infer<typeof practitionerFormSchema>;

// Helper component to render subscription with dynamic currency
const SubscriptionWithCurrency = ({ control, currency }: { control: any, currency: string }) => {
    return (
        <PractitionerSubscription
            control={control}
            currency={currency || 'AUD'}
        />
    );
};

const PractitionerOnboardingConsent: React.FC<{ onAccepted: () => void }> = ({ onAccepted }) => {
    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;
    const { data: outstanding, isLoading } = useCheckOutstandingConsents('merchant-onboarding', isLoggedIn);
    const recordConsents = useRecordConsents();
    const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isLoading && (!outstanding || outstanding.length === 0)) {
            onAccepted();
        }
    }, [isLoading, outstanding, onAccepted]);

    if (isLoading || !outstanding || outstanding.length === 0) return null;

    const allChecked = outstanding.every(doc => checkedDocs.has(doc.documentType));

    const handleToggle = (documentType: string) => {
        setCheckedDocs(prev => {
            const next = new Set(prev);
            if (next.has(documentType)) {
                next.delete(documentType);
            } else {
                next.add(documentType);
            }
            return next;
        });
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
        <div className="flex flex-col space-y-6 p-8" data-testid="practitioner-onboarding-consent">
            <div>
                <h1 className="font-light text-2xl text-slate-800 mb-2">Before You Begin</h1>
                <p className="text-sm text-slate-600">
                    Please review and accept the following to set up your practitioner profile.
                </p>
            </div>
            <div className="space-y-4">
                {outstanding.map(doc => (
                    <div key={doc.documentType} className="space-y-2">
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id={`onboarding-consent-${doc.documentType}`}
                                data-testid={`onboarding-consent-${doc.documentType}`}
                                checked={checkedDocs.has(doc.documentType)}
                                onCheckedChange={() => handleToggle(doc.documentType)}
                            />
                            <label
                                htmlFor={`onboarding-consent-${doc.documentType}`}
                                className="text-sm text-slate-700 cursor-pointer select-none leading-tight"
                            >
                                I have read and agree to the{' '}
                                <Link
                                    href={`/legal/${doc.documentType}`}
                                    target="_blank"
                                    className="text-purple-600 underline hover:text-purple-800"
                                >
                                    {doc.title}
                                </Link>
                            </label>
                        </div>
                    </div>
                ))}
            </div>
            <Button
                data-testid="onboarding-consent-accept-btn"
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                disabled={!allChecked || recordConsents.isPending}
                onClick={handleAccept}
            >
                {recordConsents.isPending ? 'Saving...' : 'Accept & Continue'}
            </Button>
        </div>
    );
};

interface CaptureProfileProps {
    className?: string;
    practitionerId: string;
    animated?: boolean;
    initialEmail?: string;
}

export default function CaptureProfile({
    className,
    practitionerId,
    animated = true,
    initialEmail = '',
}: CaptureProfileProps) {
    const router = useRouter();
    const { update: updateSession } = useSession();
    const [consentAccepted, setConsentAccepted] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // Log practitionerId for debugging - will be used when server supports pre-assigned IDs
    useEffect(() => {
        console.log('[PractitionerSetup] Using practitionerId:', practitionerId);
    }, [practitionerId]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);

    const form = useForm<PractitionerFormValues>({
        resolver: zodResolver(practitionerFormSchema),
        defaultValues: {
            name: '',
            slug: '',
            email: initialEmail,
            country: '',
            currency: 'AUD',
            headline: '',
            bio: '',
            modalities: [],
            specializations: [],
            pronouns: '',
            yearsExperience: undefined,
            spiritualJourney: '',
            approach: '',
            subscription: { plans: [] },
        },
        mode: 'onChange',
    });

    // Auto-generate slug from name
    const name = form.watch('name');
    useEffect(() => {
        if (name) {
            const generatedSlug = name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .slice(0, 50);
            form.setValue('slug', generatedSlug, { shouldValidate: true });
        }
    }, [name, form]);

    // Check slug availability
    const slug = form.watch('slug');
    useEffect(() => {
        if (!slug || slug.length < 3) {
            setSlugAvailable(null);
            return;
        }

        const timeout = setTimeout(async () => {
            setCheckingSlug(true);
            try {
                const result = await gql<{ vendorIdFromSlug: { available: boolean } }>(
                    `query CheckSlug($slug: String!) {
                        vendorIdFromSlug(slug: $slug) {
                            available
                        }
                    }`,
                    { slug }
                );
                setSlugAvailable(result.vendorIdFromSlug.available);
            } catch {
                setSlugAvailable(null);
            } finally {
                setCheckingSlug(false);
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [slug]);

    // Set currency based on country
    const country = form.watch('country');
    useEffect(() => {
        if (country) {
            const currency = countryToCurrency[country as keyof typeof countryToCurrency] || 'USD';
            form.setValue('currency', currency);
        }
    }, [country, form]);

    // Sorted countries for the combobox
    const sortedCountries = useMemo(() => {
        return COUNTRIES.map(c => ({
            ...c,
            label: c.name,
            value: c.code
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const validateStep = async (step: number): Promise<boolean> => {
        let fieldsToValidate: (keyof PractitionerFormValues)[] = [];

        switch (step) {
            case 1:
                fieldsToValidate = ['name', 'slug', 'email', 'country'];
                break;
            case 2:
                fieldsToValidate = ['headline', 'bio', 'modalities', 'specializations'];
                break;
            case 3:
                // All optional, always valid
                return true;
            case 4:
                fieldsToValidate = ['subscription'];
                break;
        }

        const result = await form.trigger(fieldsToValidate);
        return result && (step !== 1 || slugAvailable !== false);
    };

    const handleNext = async () => {
        const isValid = await validateStep(currentStep);
        if (isValid && currentStep < 4) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const onSubmit = async (values: PractitionerFormValues) => {
        setIsSubmitting(true);
        try {
            const result = await gql<{ create_practitioner: { success: boolean; practitioner: { slug: string } } }>(
                `mutation CreatePractitioner($input: CreatePractitionerInput!) {
                    create_practitioner(input: $input) {
                        success
                        message
                        practitioner {
                            id
                            slug
                        }
                    }
                }`,
                {
                    input: {
                        name: values.name,
                        slug: values.slug,
                        email: values.email,
                        country: values.country,
                        currency: values.currency,
                        headline: values.headline,
                        bio: values.bio,
                        modalities: values.modalities,
                        specializations: values.specializations,
                        pronouns: values.pronouns || undefined,
                        subscription: {
                            plans: values.subscription.plans.map(plan => ({
                                productId: plan.productId,
                                variantId: plan.variantId,
                                name: plan.name,
                                price: {
                                    amount: plan.price.amount,
                                    currency: plan.price.currency
                                }
                            }))
                        }
                    }
                }
            );

            if (result.create_practitioner.success) {
                // Update session to include new practitioner
                await updateSession();
                // Redirect to practitioner profile
                router.replace(`/p/${values.slug}`);
            }
        } catch (error) {
            console.error('[PractitionerSetup] Error creating practitioner:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleArrayValue = (field: 'modalities' | 'specializations', value: string) => {
        const current = form.getValues(field);
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        form.setValue(field, updated, { shouldValidate: true });
    };

    if (!consentAccepted) {
        return (
            <div className={cn('overflow-y-auto', className)}>
                <PractitionerOnboardingConsent onAccepted={() => setConsentAccepted(true)} />
            </div>
        );
    }

    return (
        <div className={cn('p-8 overflow-y-auto', className)}>
            {/* Step Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="flex items-center">
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                                    currentStep === step
                                        ? 'bg-purple-600 text-white'
                                        : currentStep > step
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-200 text-slate-500'
                                )}
                            >
                                {currentStep > step ? <Check className="w-5 h-5" /> : step}
                            </div>
                            {step < 4 && (
                                <div
                                    className={cn(
                                        'w-full h-1 mx-2',
                                        currentStep > step ? 'bg-green-500' : 'bg-slate-200'
                                    )}
                                    style={{ width: '40px' }}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                    <span>Basic Info</span>
                    <span>Your Profile</span>
                    <span>Details</span>
                    <span>Your Plan</span>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className={`space-y-6 ${animated ? 'animate-fadeIn' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <User className="w-5 h-5 text-purple-600" />
                                <h2 data-testid="step1-heading" className="text-xl font-semibold text-slate-800">Basic Information</h2>
                            </div>

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Display Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="e.g., Luna Mystic Readings"
                                                className="border-slate-200 focus:border-purple-400"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            This is how seekers will find you
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="slug"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Profile URL</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-500">spiriverse.com/p/</span>
                                                <Input
                                                    {...field}
                                                    placeholder="your-name"
                                                    className="border-slate-200 focus:border-purple-400"
                                                />
                                                {checkingSlug && <Loader2 className="w-4 h-4 animate-spin" />}
                                                {!checkingSlug && slugAvailable === true && (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                )}
                                                {!checkingSlug && slugAvailable === false && (
                                                    <span className="text-xs text-red-500">Taken</span>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="email"
                                                placeholder="you@example.com"
                                                className="border-slate-200 focus:border-purple-400"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Country</FormLabel>
                                        <FormControl>
                                            <ComboBox
                                                items={sortedCountries}
                                                value={sortedCountries.find(c => c.code === field.value) || undefined}
                                                onChange={(country) => field.onChange(country?.code || '')}
                                                fieldMapping={{
                                                    labelColumn: 'name',
                                                    keyColumn: 'code'
                                                }}
                                                placeholder="Select a country"
                                                withSearch={true}
                                                data-testid="country-picker-trigger"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* Step 2: Profile */}
                    {currentStep === 2 && (
                        <div className={`space-y-6 ${animated ? 'animate-fadeIn' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <Star className="w-5 h-5 text-purple-600" />
                                <h2 data-testid="step2-heading" className="text-xl font-semibold text-slate-800">Your Profile</h2>
                            </div>

                            <FormField
                                control={form.control}
                                name="headline"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Headline</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="e.g., Intuitive Tarot Reader & Spiritual Guide"
                                                className="border-slate-200 focus:border-purple-400"
                                                maxLength={150}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            A brief tagline that describes your practice ({field.value?.length || 0}/150)
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="bio"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bio</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Tell seekers about your journey, your approach, and what they can expect from a reading with you..."
                                                className="border-slate-200 focus:border-purple-400 min-h-[150px]"
                                                maxLength={2000}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {field.value?.length || 0}/2000 characters
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="modalities"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Modalities</FormLabel>
                                        <FormDescription>Select the types of readings and services you offer</FormDescription>
                                        <div className="flex flex-wrap gap-2 mt-2" data-testid="modalities-select">
                                            {MODALITIES.map((modality) => (
                                                <Badge
                                                    key={modality.value}
                                                    variant={field.value.includes(modality.value) ? 'default' : 'outline'}
                                                    className={cn(
                                                        'cursor-pointer transition-all',
                                                        field.value.includes(modality.value)
                                                            ? 'bg-purple-600 hover:bg-purple-700'
                                                            : 'hover:bg-purple-100'
                                                    )}
                                                    onClick={() => toggleArrayValue('modalities', modality.value)}
                                                    data-testid={`modality-option-${modality.value}`}
                                                >
                                                    {modality.label}
                                                </Badge>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="specializations"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Specializations</FormLabel>
                                        <FormDescription>What areas do you focus on?</FormDescription>
                                        <div className="flex flex-wrap gap-2 mt-2" data-testid="specializations-select">
                                            {SPECIALIZATIONS.map((spec) => (
                                                <Badge
                                                    key={spec.value}
                                                    variant={field.value.includes(spec.value) ? 'default' : 'outline'}
                                                    className={cn(
                                                        'cursor-pointer transition-all',
                                                        field.value.includes(spec.value)
                                                            ? 'bg-violet-600 hover:bg-violet-700'
                                                            : 'hover:bg-violet-100'
                                                    )}
                                                    onClick={() => toggleArrayValue('specializations', spec.value)}
                                                    data-testid={`specialization-option-${spec.value}`}
                                                >
                                                    {spec.label}
                                                </Badge>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* Step 3: Details */}
                    {currentStep === 3 && (
                        <div className={`space-y-6 ${animated ? 'animate-fadeIn' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                                <h2 data-testid="step3-heading" className="text-xl font-semibold text-slate-800">Additional Details</h2>
                            </div>

                            <p className="text-sm text-slate-600 mb-4">
                                These details are optional but help seekers get to know you better.
                            </p>

                            <FormField
                                control={form.control}
                                name="pronouns"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pronouns (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="e.g., she/her, he/him, they/them"
                                                className="border-slate-200 focus:border-purple-400"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="yearsExperience"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Years of Experience (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                placeholder="e.g., 5"
                                                className="border-slate-200 focus:border-purple-400 w-32"
                                                min={0}
                                                max={100}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="spiritualJourney"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Spiritual Journey (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Share how you discovered your gifts and what drew you to this path..."
                                                className="border-slate-200 focus:border-purple-400 min-h-[100px]"
                                                maxLength={2000}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="approach"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Approach (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Describe your reading style and what clients can expect..."
                                                className="border-slate-200 focus:border-purple-400 min-h-[100px]"
                                                maxLength={1000}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {/* Step 4: Your Plan */}
                    {currentStep === 4 && (
                        <div className={`space-y-6 ${animated ? 'animate-fadeIn' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <CreditCard className="w-5 h-5 text-purple-600" />
                                <h2 data-testid="step4-heading" className="text-xl font-semibold text-slate-800">Choose Your Plan</h2>
                            </div>

                            <p className="text-sm text-slate-600 mb-4">
                                Select your subscription plan. Your subscription won&apos;t be billed until after your first payout and adding a payment method.
                            </p>

                            <SubscriptionWithCurrency
                                control={form.control}
                                currency={form.watch('currency')}
                            />
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t">
                        {currentStep > 1 ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                data-testid="back-btn"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        ) : (
                            <div />
                        )}

                        {currentStep < 4 ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="bg-purple-600 hover:bg-purple-700"
                                data-testid="continue-btn"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                                data-testid="submit-btn"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating Profile...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Create My Profile
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    );
}
