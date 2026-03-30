'use client';

import { UseFormReturn } from 'react-hook-form';
import { useCallback, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { EmailInput } from '@/components/ui/email-input';
import { Button } from '@/components/ui/button';
import { LoaderIcon, ImageIcon, XIcon } from 'lucide-react';
import ComboBox from '@/components/ux/ComboBox';
import FileUploader from '@/components/ux/FileUploader';
import { isNullOrWhitespace } from '@/lib/functions';
import { useSlugGeneration } from '../hooks/useSlugGeneration';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';
import { MERCHANT_FIELDS, MERCHANT_FIELDS_NO_LOCATION, COUNTRIES } from '../hooks/useOnboardingForm';
import ScrollableForm from './ScrollableForm';
import useInterfaceSize from '@/components/ux/useInterfaceSize';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
};

const inputClass = "bg-white/[0.08] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-amber-500/50 focus-visible:border-white/30";

export default function MerchantProfileStep({ form, onSubmit, onBack, isSubmitting }: Props) {
    const { data: session } = useSession();
    const { isMobile } = useInterfaceSize();
    const [mobilePage, setMobilePage] = useState<1 | 2>(1);

    const slug = useSlugGeneration({
        prefix: 'spiriverse.com/',
        setValue: form.setValue as any,
        setError: form.setError as any,
        slugField: 'merchant.slug',
    });

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
        if (isMobile && mobilePage === 1) {
            const valid = await form.trigger(['merchant.name', 'merchant.email', 'merchant.slug']);
            if (valid) setMobilePage(2);
            return;
        }
        const fields = hasPractitioner ? [...MERCHANT_FIELDS_NO_LOCATION] : [...MERCHANT_FIELDS];
        const valid = await form.trigger(fields as any);
        if (valid) onSubmit();
    };

    const handleBack = () => {
        if (isMobile && mobilePage === 2) {
            setMobilePage(1);
            return;
        }
        onBack();
    };

    const merchantId = form.watch('merchant.id');
    const logoValue = form.watch('merchant.logo');

    const page1Content = (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                    control={form.control}
                    name="merchant.name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-300">Business Name</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    data-testid="setup-merchant-name"
                                    placeholder="Your Business Name"
                                    glass={false}
                                    className={inputClass}
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
                    name="merchant.email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-300">Business Email</FormLabel>
                            <FormControl>
                                <EmailInput
                                    {...field}
                                    data-testid="setup-merchant-email"
                                    placeholder="business@example.com"
                                    glass={false}
                                    className={inputClass}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <FormField
                    control={form.control}
                    name="merchant.logo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-300">Logo <span className="text-slate-500 font-normal">(optional)</span></FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-3">
                                {logoValue?.url ? (
                                    <div className="relative group">
                                        <img
                                            src={logoValue.url}
                                            alt="Business logo"
                                            className="w-24 h-16 rounded-lg object-cover border border-white/15"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => field.onChange(null)}
                                            className="absolute -top-2 -right-2 bg-slate-800 border border-white/20 rounded-full p-1 sm:p-0.5 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                        >
                                            <XIcon className="w-3 h-3 text-slate-300" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-slate-500">
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
                        <FormItem className="flex-grow">
                            <FormLabel className="text-slate-300">Your SpiriVerse URL</FormLabel>
                            <FormDescription className="text-slate-400">Your unique page where customers find you</FormDescription>
                            <FormControl>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-400 whitespace-nowrap">spiriverse.com/</span>
                                    <Input
                                        {...field}
                                        data-testid="setup-merchant-slug"
                                        disabled={slug.isGenerating}
                                        placeholder="your-business-name"
                                        glass={false}
                                        className={inputClass}
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
            </div>
        </>
    );

    const page2Content = (
        <>
            <FormField
                control={form.control}
                name="merchant.website"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-300">Your Current Website <span className="text-slate-500 font-normal">(optional)</span></FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-merchant-website"
                                type="url"
                                placeholder="https://www.yourbusiness.com"
                                glass={false}
                                className={inputClass}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {!hasPractitioner && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                        control={form.control}
                        name="merchant.country"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-slate-300">Country</FormLabel>
                                <FormControl>
                                    <ComboBox
                                        items={sortedCountries}
                                        value={sortedCountries.find(c => c.code === field.value) || undefined}
                                        onChange={(country) => field.onChange(country?.code || '')}
                                        fieldMapping={{ labelColumn: 'name', keyColumn: 'code' }}
                                        placeholder="Select a country"
                                        withSearch={true}
                                        data-testid="setup-merchant-country"
                                        className="bg-white/[0.08] border-white/15 text-white hover:bg-white/[0.12] hover:text-white"
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
                                <FormLabel className="text-slate-300">State / Province</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        data-testid="setup-merchant-state"
                                        placeholder="e.g., CA, NSW"
                                        glass={false}
                                        className={inputClass}
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
                        <FormLabel className="text-slate-300">ABN <span className="text-slate-500 font-normal">(optional)</span></FormLabel>
                        <FormDescription className="text-slate-400">Australian Business Number</FormDescription>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-merchant-abn"
                                placeholder="e.g., 12 345 678 901"
                                glass={false}
                                className={inputClass}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );

    const heading = isMobile && mobilePage === 2 ? 'Business Details' : 'Set up your business';
    const subheading = isMobile && mobilePage === 2
        ? 'A few more details about your business.'
        : 'Tell us about your business to get started.';

    return (
        <div className="flex flex-col h-full min-h-0">
            <ScrollableForm dark className="px-4 py-3 sm:px-6 sm:py-5 md:px-8 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
                <div>
                    <h1 className="font-light text-lg sm:text-2xl text-white mb-1">{heading}</h1>
                    <p className="text-xs sm:text-sm md:text-base text-slate-300">{subheading}</p>
                </div>

                {isMobile ? (
                    mobilePage === 1 ? page1Content : page2Content
                ) : (
                    <>
                        {page1Content}
                        {page2Content}
                    </>
                )}
            </ScrollableForm>

            <div className="border-t border-white/10" />

            <div className="px-4 pb-3 pt-2 sm:px-6 sm:pb-5 sm:pt-4 md:px-8 md:pb-6">
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        data-testid="setup-merchant-back-btn"
                        className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white h-12 sm:h-9 text-base sm:text-sm"
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                    <Button
                        type="button"
                        data-testid="setup-merchant-submit-btn"
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-12 sm:h-9 text-base sm:text-sm"
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
