'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gql } from '@/lib/services/gql';
import { useSession } from 'next-auth/react';
import { v4 as uuid } from 'uuid';
import countryToCurrency from 'country-to-currency';
import { MediaSchema } from '@/shared/schemas/media';

// ── Zod Schema ──────────────────────────────────────────────────────

export const onboardingSchema = z.object({
    // Basic details
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email'),
    country: z.string().min(2, 'Please select a country'),
    religionId: z.string().optional(),
    openToOtherExperiences: z.boolean().optional(),

    // Subscription (selected at plan step)
    subscription: z.object({
        tier: z.string().min(1, 'Please select a plan'),
        billingInterval: z.enum(['monthly', 'annual']),
    }),

    // Merchant sub-object (optional — only for manifest/transcend)
    merchant: z.object({
        name: z.string().min(1, 'Business name is required'),
        slug: z.string().min(1, 'URL is required').regex(/^[a-z0-9-]+$/, 'Use only lowercase letters, numbers and hyphens'),
        email: z.string().email('Please enter a valid email'),
        state: z.string().min(1, 'State/province is required'),
        merchantTypeIds: z.array(z.string()).min(1, 'Select at least one type'),
        religion: z.object({
            id: z.string().min(1),
            label: z.string().min(1),
        }),
        logo: MediaSchema.nullable().optional(),
    }).optional(),

    // Practitioner sub-object (optional — only for awaken branch or "also create practitioner")
    practitioner: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        slug: z.string().min(3, 'URL must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Use only lowercase letters, numbers and hyphens'),
        headline: z.string().max(150).optional(),
        bio: z.string().max(2000).optional(),
        modalities: z.array(z.string()).min(1, 'Select at least one modality'),
        specializations: z.array(z.string()).min(1, 'Select at least one specialization'),
        pronouns: z.string().optional(),
        yearsExperience: z.number().min(0).max(100).optional(),
        spiritualJourney: z.string().max(2000).optional(),
        approach: z.string().max(1000).optional(),
    }).optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

// ── Fields per step (used by form.trigger) ──────────────────────────

export const BASIC_FIELDS: (keyof OnboardingFormValues)[] = ['firstName', 'lastName', 'email', 'country'];

export const MERCHANT_FIELDS = [
    'merchant.name', 'merchant.slug', 'merchant.email', 'merchant.state',
    'merchant.merchantTypeIds', 'merchant.religion',
] as const;

export const PRACTITIONER_REQUIRED_FIELDS = [
    'practitioner.name', 'practitioner.slug',
    'practitioner.modalities', 'practitioner.specializations',
] as const;

// ── Countries list ──────────────────────────────────────────────────

export const COUNTRIES = [
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
] as const;

// ── Hook ────────────────────────────────────────────────────────────

export function useOnboardingForm() {
    const { data: session, update: updateSession } = useSession();

    const form = useForm<OnboardingFormValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: session?.user?.email || '',
            country: '',
            religionId: undefined,
            openToOtherExperiences: true,
            subscription: { tier: '', billingInterval: 'monthly' },
            merchant: undefined,
            practitioner: undefined,
        },
        mode: 'onBlur',
        reValidateMode: 'onBlur',
    });

    /** Initialise the merchant sub-form with defaults derived from basic details */
    const initMerchant = () => {
        const vals = form.getValues();
        if (!vals.merchant) {
            form.setValue('merchant', {
                name: `${vals.firstName} ${vals.lastName}`.trim(),
                slug: '',
                email: vals.email,
                state: '',
                merchantTypeIds: [],
                religion: { id: '', label: '' },
                logo: undefined,
            });
        }
    };

    /** Initialise the practitioner sub-form with defaults derived from basic details */
    const initPractitioner = () => {
        const vals = form.getValues();
        if (!vals.practitioner) {
            form.setValue('practitioner', {
                name: `${vals.firstName} ${vals.lastName}`.trim(),
                slug: '',
                headline: '',
                bio: '',
                modalities: [],
                specializations: [],
                pronouns: '',
                yearsExperience: undefined,
                spiritualJourney: '',
                approach: '',
            });
        }
    };

    /** Create vendor via GraphQL mutation. Returns vendor slug. */
    const createVendor = async (): Promise<string> => {
        const vals = form.getValues();
        const merchant = vals.merchant!;
        const currency = countryToCurrency[vals.country as keyof typeof countryToCurrency] || 'USD';

        const { create_vendor: { vendor } } = await gql<{
            create_vendor: {
                code: string;
                vendor: { id: string; slug: string };
            };
        }>(`
            mutation create_vendor($vendor: VendorInput!) {
                create_vendor(vendor: $vendor) {
                    code
                    vendor { id slug }
                }
            }
        `, {
            vendor: {
                id: uuid(),
                name: merchant.name,
                slug: merchant.slug,
                email: merchant.email,
                state: merchant.state,
                merchantTypeIds: merchant.merchantTypeIds,
                religionId: merchant.religion.id,
                logo: merchant.logo ?? undefined,
                currency,
                country: vals.country,
                subscription: {
                    tier: vals.subscription.tier,
                    billingInterval: vals.subscription.billingInterval,
                    plans: [],
                },
            },
        });

        await updateSession();
        return vendor.slug;
    };

    /** Create practitioner via GraphQL mutation. Returns practitioner slug. */
    const createPractitioner = async (overrideTier?: string): Promise<string> => {
        const vals = form.getValues();
        const prac = vals.practitioner!;
        const currency = countryToCurrency[vals.country as keyof typeof countryToCurrency] || 'USD';

        const { create_practitioner: { practitioner } } = await gql<{
            create_practitioner: {
                success: boolean;
                practitioner: { id: string; slug: string };
            };
        }>(`
            mutation CreatePractitioner($input: CreatePractitionerInput!) {
                create_practitioner(input: $input) {
                    success
                    practitioner { id slug }
                }
            }
        `, {
            input: {
                name: prac.name,
                slug: prac.slug,
                email: vals.email,
                country: vals.country,
                currency,
                headline: prac.headline || undefined,
                bio: prac.bio || undefined,
                modalities: prac.modalities,
                specializations: prac.specializations,
                pronouns: prac.pronouns || undefined,
                yearsExperience: prac.yearsExperience,
                spiritualJourney: prac.spiritualJourney || undefined,
                approach: prac.approach || undefined,
                subscription: {
                    tier: overrideTier || vals.subscription.tier,
                    billingInterval: vals.subscription.billingInterval,
                    plans: [],
                },
            },
        });

        await updateSession();
        return practitioner.slug;
    };

    return {
        form,
        initMerchant,
        initPractitioner,
        createVendor,
        createPractitioner,
    };
}
