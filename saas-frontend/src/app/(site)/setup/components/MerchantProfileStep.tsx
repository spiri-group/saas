'use client';

import { UseFormReturn } from 'react-hook-form';
import { useCallback } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoaderIcon } from 'lucide-react';
import HierarchicalReligionPicker from '@/components/ux/HierarchicalReligionPicker';
import HierarchicalMultiPicker from '@/components/ux/HierarchicalMultiPicker';
import UseMerchantTypes from '@/shared/hooks/UseMerchantTypes';
import { isNullOrWhitespace } from '@/lib/functions';
import { useSlugGeneration } from '../hooks/useSlugGeneration';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';
import { MERCHANT_FIELDS } from '../hooks/useOnboardingForm';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
};

const MerchantTypesPicker: React.FC<{
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
}> = ({ selectedIds, onSelectionChange }) => {
    const { data: merchantTypes, isLoading, error } = UseMerchantTypes();
    return (
        <HierarchicalMultiPicker
            nodes={merchantTypes || null}
            selectedIds={selectedIds}
            onSelectionChange={onSelectionChange}
            placeholder="Select types"
            label="Fields of Business"
            isLoading={isLoading}
            error={!!error}
        />
    );
};

export default function MerchantProfileStep({ form, onSubmit, onBack, isSubmitting }: Props) {
    const slug = useSlugGeneration({
        prefix: 'spiriverse.com/',
        setValue: form.setValue as any,
        setError: form.setError as any,
        slugField: 'merchant.slug',
    });

    const handleNameChange = useCallback((nameValue: string) => {
        if (!isNullOrWhitespace(nameValue) && !slug.hasManuallySetSlug) {
            slug.generateFromName(nameValue);
        }
    }, [slug]);

    const handleContinue = async () => {
        const valid = await form.trigger([...MERCHANT_FIELDS]);
        if (valid) onSubmit();
    };

    return (
        <div className="flex flex-col space-y-6 p-8">
            <div>
                <h1 className="font-light text-2xl text-slate-800 mb-2">Merchant Details</h1>
                <p className="text-base text-slate-600">Set up your spiritual business profile.</p>
            </div>

            <FormField
                control={form.control}
                name="merchant.name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-merchant-name"
                                placeholder="Your Business Name"
                                onChange={(ev) => {
                                    field.onChange(ev);
                                    handleNameChange(ev.target.value);
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="merchant.slug"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Your Web Address</FormLabel>
                        <FormDescription>This is how customers will find your shop online</FormDescription>
                        <FormControl>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 whitespace-nowrap">spiriverse.com/</span>
                                <Input
                                    {...field}
                                    data-testid="setup-merchant-slug"
                                    disabled={slug.isGenerating}
                                    placeholder="your-business-name"
                                    onChange={(ev) => {
                                        field.onChange(ev);
                                        slug.setManualSlug(ev.target.value);
                                    }}
                                />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="merchant.email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-merchant-email"
                                type="email"
                                placeholder="business@example.com"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="merchant.state"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-merchant-state"
                                placeholder="e.g., CA, NSW"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="merchant.merchantTypeIds"
                    render={({ field }) => (
                        <FormItem className="flex flex-col space-y-2">
                            <FormLabel>Fields of Business</FormLabel>
                            <FormControl>
                                <MerchantTypesPicker
                                    selectedIds={field.value || []}
                                    onSelectionChange={(ids) => field.onChange(ids)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="merchant.religion"
                    render={({ field }) => (
                        <FormItem className="flex flex-col space-y-2">
                            <FormLabel>Religion</FormLabel>
                            <FormControl>
                                <HierarchicalReligionPicker
                                    selectedReligionId={field.value?.id}
                                    onReligionSelect={(religionId, religionLabel) => {
                                        field.onChange(religionId ? { id: religionId, label: religionLabel } : { id: '', label: '' });
                                    }}
                                    placeholder="Select religion"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex gap-3 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    data-testid="setup-merchant-back-btn"
                    onClick={onBack}
                >
                    Back
                </Button>
                <Button
                    type="button"
                    data-testid="setup-merchant-submit-btn"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    onClick={handleContinue}
                >
                    {isSubmitting ? (
                        <>
                            <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
                            Creating your shop...
                        </>
                    ) : (
                        'Continue'
                    )}
                </Button>
            </div>
        </div>
    );
}
