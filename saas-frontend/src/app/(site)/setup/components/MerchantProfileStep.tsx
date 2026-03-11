'use client';

import { UseFormReturn } from 'react-hook-form';
import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoaderIcon, ImageIcon, XIcon } from 'lucide-react';
import ComboBox from '@/components/ux/ComboBox';
import FileUploader from '@/components/ux/FileUploader';
import { isNullOrWhitespace } from '@/lib/functions';
import { useSlugGeneration } from '../hooks/useSlugGeneration';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';
import { MERCHANT_FIELDS, MERCHANT_FIELDS_NO_LOCATION, COUNTRIES } from '../hooks/useOnboardingForm';
import ScrollableForm from './ScrollableForm';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
};

export default function MerchantProfileStep({ form, onSubmit, onBack, isSubmitting }: Props) {
    const { data: session } = useSession();
    const slug = useSlugGeneration({
        prefix: 'spiriverse.com/',
        setValue: form.setValue as any,
        setError: form.setError as any,
        slugField: 'merchant.slug',
    });

    // Check if user already has a practitioner account
    const hasPractitioner = useMemo(() => {
        return session?.user?.vendors?.some((v: any) => v.docType === 'PRACTITIONER') ?? false;
    }, [session?.user?.vendors]);

    const sortedCountries = useMemo(() => {
        const merchantCountry = form.getValues('merchant.country');
        const all = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
        const detected = all.find(c => c.code === merchantCountry);
        if (detected) {
            return [detected, ...all.filter(c => c.code !== merchantCountry)];
        }
        return all;
    }, [form]);

    const handleNameChange = useCallback((nameValue: string) => {
        if (!isNullOrWhitespace(nameValue) && !slug.hasManuallySetSlug) {
            slug.generateFromName(nameValue);
        }
    }, [slug]);

    const handleContinue = async () => {
        const fields = hasPractitioner ? [...MERCHANT_FIELDS_NO_LOCATION] : [...MERCHANT_FIELDS];
        const valid = await form.trigger(fields as any);
        if (valid) onSubmit();
    };

    const merchantId = form.watch('merchant.id');
    const logoValue = form.watch('merchant.logo');

    return (
        <div className="flex flex-col h-full min-h-0">
            <ScrollableForm className="px-5 py-4 md:p-8 space-y-4 md:space-y-6">
                <div>
                    <h1 className="font-light text-2xl text-slate-800 mb-1">Set up your business</h1>
                    <p className="text-sm md:text-base text-slate-500">Tell us about your business to get started.</p>
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
                    name="merchant.logo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Logo <span className="text-slate-400 font-normal">(optional)</span></FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-3">
                                    {logoValue?.url ? (
                                        <div className="relative group">
                                            <img
                                                src={logoValue.url}
                                                alt="Business logo"
                                                className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => field.onChange(null)}
                                                className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XIcon className="w-3 h-3 text-slate-500" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                    )}
                                    {merchantId && (
                                        <FileUploader
                                            id={`${merchantId}-logo`}
                                            objectFit="cover"
                                            className="flex-grow h-[35px]"
                                            value={field.value ? [field.value.url] : []}
                                            acceptOnly={{ type: "IMAGE" }}
                                            connection={{
                                                container: "public",
                                                relative_path: `merchant/${merchantId}/logo`
                                            }}
                                            targetImage={{ width: 400, height: (2 / 3) * 400 }}
                                            targetImageVariants={[]}
                                            allowMultiple={false}
                                            includePreview={false}
                                            onRemoveAsync={() => field.onChange(null)}
                                            buttonProps={{ variant: "outline", size: "sm" }}
                                            onDropAsync={() => {}}
                                            onUploadCompleteAsync={async (files) => {
                                                field.onChange({
                                                    ...files[0],
                                                    title: "Logo Image",
                                                    description: "Business logo",
                                                    hashtags: []
                                                });
                                            }}
                                        />
                                    )}
                                </div>
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
                    name="merchant.website"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Website <span className="text-slate-400 font-normal">(optional)</span></FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    data-testid="setup-merchant-website"
                                    type="url"
                                    placeholder="https://www.yourbusiness.com"
                                />
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

                {!hasPractitioner && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="merchant.country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                        <ComboBox
                                            items={sortedCountries}
                                            value={sortedCountries.find(c => c.code === field.value) || undefined}
                                            onChange={(country) => field.onChange(country?.code || '')}
                                            fieldMapping={{ labelColumn: 'name', keyColumn: 'code' }}
                                            placeholder="Select a country"
                                            withSearch={true}
                                            data-testid="setup-merchant-country"
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
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="merchant.abn"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ABN <span className="text-slate-400 font-normal">(optional)</span></FormLabel>
                            <FormDescription>Australian Business Number</FormDescription>
                            <FormControl>
                                <Input
                                    {...field}
                                    data-testid="setup-merchant-abn"
                                    placeholder="e.g., 12 345 678 901"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </ScrollableForm>

            <div className="px-5 pb-4 md:px-8 md:pb-6">
                <div className="flex gap-3">
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
        </div>
    );
}
