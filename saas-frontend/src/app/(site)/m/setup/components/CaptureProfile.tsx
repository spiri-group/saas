'use client';

import z from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gql } from '@/lib/services/gql';
import classNames from 'classnames';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import HierarchicalReligionPicker from '@/components/ux/HierarchicalReligionPicker';
import HierarchicalMultiPicker from '@/components/ux/HierarchicalMultiPicker';
import UseMerchantTypes from '@/shared/hooks/UseMerchantTypes';
import useReverseGeocoding from '@/components/utils/useReverseGeoCoding';
import MerchantSubscription from './MerchantSubscription';
import { MediaSchema } from '@/shared/schemas/media';
import { CurrencyAmountSchema } from '@/components/ux/CurrencyInput';
import { cn } from '@/lib/utils';
import { CircleHelpIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { merchantIdFromSlug } from '../../_hooks/UseMerchantIdFromSlug';
import { isNullOrWhitespace } from '@/lib/functions';
import debounce from 'debounce';
import countryToCurrency from "country-to-currency";
import { toast } from 'sonner';
import ComboBox from '@/components/ux/ComboBox';

type BLProps = {
    merchantId: string;
    initialReligion?: {
        id: string;
        label: string;
    };
}

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

const useBL = (props: BLProps) => {
    const [fetchedUser, ] = useState<boolean>(false)
    const [hasManuallySetSlug, setHasManuallySetSlug] = useState<boolean>(false);
    const previousSlugRef = useRef<string | null>(null);
    const [isGeneratingSlug, setIsGeneratingSlug] = useState<boolean>(true); // Start disabled until first generation

    // Use merchantId from props (passed from URL query param)
    const merchantId = props.merchantId;

    // Get detected country from IP
    const countryCode = useReverseGeocoding();

    // Sort countries: detected country first, then alphabetical
    const sortedCountries = useMemo(() => {
        const detectedCountry = COUNTRIES.find(c => c.code === countryCode);
        const otherCountries = COUNTRIES.filter(c => c.code !== countryCode).sort((a, b) => a.name.localeCompare(b.name));

        if (detectedCountry) {
            return [detectedCountry, ...otherCountries];
        }
        return otherCountries;
    }, [countryCode]);

    const schema = z.object({
        id: z.string().uuid(),
        name: z.string().superRefine(async (name, ctx) => {
            if (isNullOrWhitespace(name)) {
                ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Name cannot be empty.",
                });
                return;
            }
            if (!/^[a-zA-Z0-9\s&]+$/.test(name)) {
                ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please use only letters, numbers, & and spaces.",
                });
                return;
            }
        }),
        slug: z.string().superRefine(async (slug, ctx) => {
            // Always validate format first (don't skip on same value)
            // now slugs can only have lowercase letters, numbers and must use - instead of spaces
            if (isNullOrWhitespace(slug)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Public URL cannot be empty.",
                });
                return false;
            }
            else if (!/^[a-z0-9-]+$/.test(slug)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Please use only lowercase letters, numbers and hyphens for your Public URL.",
                });
                return false;
            }

            // Check if the slug has changed (for availability check optimization)
            if (previousSlugRef.current === slug) {
                return true;
            }
            previousSlugRef.current = slug;

            if (hasManuallySetSlug) {
                // check its availability
                const slug_resp = await merchantIdFromSlug(slug, false);
                if (!slug_resp.available) {
                    const message = `Public URL ${slug} is already taken, please use a different url.`;
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message
                    })
                    toast.error(message);
                    return false;
                }
            }

            return true;
        }),
        email: z.string().email().min(1),
        logo: MediaSchema.nullable().optional(),
        country: z.string().min(1, { message: "Please select a country" }),
        state: z.string().min(1, { message: "Please enter a state/province" }),
        religion: z.object({
            id: z.string().min(1),
            label: z.string().min(1)
        }),
        merchantTypeIds: z.array(z.string()).min(1, { message: "Please select at least one type" }),
        subscription: z.object({
            plans: z.array(z.object({
                productId: z.string(),
                variantId: z.string(),
                price: CurrencyAmountSchema,
                name: z.string().min(1)
            })).min(1, { message: "At least one subscription plan is required" })
        })
    }); 

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            id: merchantId,
            name: '',
            slug: '',
            email: '',
            logo: undefined,
            country: '',
            state: '',
            religion: props.initialReligion || {
                id: '',
                label: ''
            },
            merchantTypeIds: [],
            subscription: {
                plans: []
            }
        },
        mode: 'onBlur',
        reValidateMode: 'onBlur'
    });

    useEffect(() => {
        form.reset({
            ...form.getValues()
        });
    }, [fetchedUser, form]);

    return {
        schema,
        form,
        sortedCountries,
        values: form.getValues(),
        slug: {
            set: (slug: string) => {
                form.setValue("slug", slug, { shouldValidate: true});
                setHasManuallySetSlug(true);
            },
            overridden: hasManuallySetSlug
        },
        generatingSlug: {
            set: setIsGeneratingSlug,
            active: isGeneratingSlug
        },
        save: async (values: z.infer<typeof schema>) => {
            try {
                const { religion, country, state, slug, ...rest } = values;

                // we need to work out the currency via the country chosen
                const currency = countryToCurrency[country];

                const {
                    create_vendor: {
                        vendor
                    }
                } = await gql<{
                create_vendor: {
                    code: string,
                    vendor: {
                        id: string,
                        slug: string
                    }
                }
            }>(
                `
                    mutation create_vendor($vendor: VendorInput!) {
                        create_vendor(vendor: $vendor) {
                            code
                            vendor {
                                id
                                slug
                            }
                        }
                    }
                `,
                {
                    vendor: {
                        ...rest,
                        currency,
                        country,
                        state,
                        religionId: religion.id,
                        slug: hasManuallySetSlug ? slug : undefined,
                        subscription: {
                            plans: values.subscription.plans
                        }
                    }
                }
                )

                // No payment collected at signup - redirect directly to merchant profile
                // Payment setup happens later when merchant starts receiving payouts
                window.location.href = `/m/${vendor.slug}`;
            } catch (error) {
                console.error('Error creating vendor:', error);
                throw error;
            }
        }
    }
}

type Props = BLProps & {
    className?: string
    animated?: boolean
    initialReligion?: {
        id: string;
        label: string;
    };
}

// Child component to watch country and render MerchantSubscription
const MerchantSubscriptionSection: React.FC<{ control: any }> = ({ control }) => {
    const country = useWatch({ control, name: "country" });
    if (country) {
        const currency = countryToCurrency[country];
        return <MerchantSubscription control={control} currency={currency} />;
    }
    return null;
};

// Merchant Types Picker Component - defined outside to prevent remounting
const MerchantTypesPicker: React.FC<{
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
}> = ({ selectedIds, onSelectionChange }) => {
    const { data: merchantTypes, isLoading, error } = UseMerchantTypes();

    return (
        <HierarchicalMultiPicker
            nodes={merchantTypes || null}
            selectedIds={selectedIds}
            onSelectionChange={(ids) => onSelectionChange(ids)}
            placeholder="Select types"
            label="Fields of Business"
            isLoading={isLoading}
            error={!!error}
        />
    );
};

const CaptureProfile: React.FC<Props> = (props) => {
    const bl = useBL(props);

    const [urlInputActive, setUrlInputActive] = useState<boolean>(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const field_label_width = "w-40";

    const generate_and_validate_slug = useCallback(debounce(async(nameValue) => {
        bl.generatingSlug.set(true);
        const resp = await merchantIdFromSlug(nameValue, true);  
        if (!resp.available) {
            const message = `Public URL ${resp.slug} is already taken, please use a different url.`;
            bl.form.setError("slug", {
                type: "manual",
                message: message
            })
            toast.error(message);
            bl.form.setValue("slug", resp.slug);
        } else {
            bl.form.setValue("slug", resp.slug, { shouldValidate: true })
        }
        bl.generatingSlug.set(false);
    }, 1000), [bl.form])
    
    return (
        <>
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(async (values) => {
                    setIsSubmitting(true);
                    try {
                        await bl.save(values);
                    } catch (error) {
                        setIsSubmitting(false);
                        throw error;
                    }
                })}
                    className={cn("flex flex-col flex-wrap space-y-6 p-8", props.className)}>
                    <div className={cn("transition-all duration-500", props.animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
                        <h1 className="font-light text-2xl text-slate-800 mb-2">
                            {step === 1 ? 'Merchant Details' : 'Choose Your Plan'}
                        </h1>
                        <p className="text-sm text-slate-600">
                            {step === 1 ? 'Set up your spiritual business profile' : 'Select a subscription plan to get started'}
                        </p>
                        {step === 2 && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                <span>Step 2 of 2</span>
                            </div>
                        )}
                    </div>

                    {step === 1 && (<>
                    <div className="flex flex-row items-center space-x-2">
                        <FormField
                            name="name"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className={classNames(!urlInputActive ? "flex-grow" : "", "flex flex-row items-center")}>
                                    <FormLabel
                                        className={classNames(
                                            "flex-none",
                                            field_label_width,
                                            bl.form.formState.errors.name ? "text-accent" : null
                                        )}
                                    >
                                        { bl.form.formState.errors.name != null ?
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger className="flex flex-row space-x-1 items-center">
                                                        <CircleHelpIcon className="h-4 w-4 ml-1" />
                                                        <span>Public Name</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {bl.form.formState.errors.name.message}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider> :
                                            <span>Public name</span>
                                        }
                                    </FormLabel>
                                    <div className="flex-grow">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onChange={async (ev) => {
                                                    field.onChange(ev);
                                                    const nameValue = ev.target.value;
                                                    if (isNullOrWhitespace(nameValue)) return;
                                                    if (!bl.slug.overridden) generate_and_validate_slug(nameValue);
                                                }}
                                                placeholder="Public name"/>
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        name="email"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center">
                                <FormLabel
                                    className={classNames(
                                        "flex-none",
                                        field_label_width,
                                        bl.form.formState.errors.email ? "text-accent" : null
                                    )}
                                >
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>Business Email</TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">
                                                    Email address where customers can contact you.
                                                    This will be visible on your public profile.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </FormLabel>
                                <FormControl className="flex-grow">
                                    <Input {...field} placeholder="Email"/>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <div className="flex flex-col lg:grid grid-cols-2 gap-3">
                        <FormField
                            name="merchantTypeIds"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className="flex flex-col w-full space-y-2">
                                    <FormLabel
                                        className={classNames(
                                            bl.form.formState.errors.merchantTypeIds ? "text-accent" : ""
                                        )}
                                    >
                                        <span>Fields of Business</span>
                                    </FormLabel>
                                    <FormControl>
                                        <MerchantTypesPicker
                                            selectedIds={field.value || []}
                                            onSelectionChange={(ids) => {
                                                console.log('MerchantTypesPicker onSelectionChange called with:', ids);
                                                field.onChange(ids, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="religion"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className="flex flex-col w-full space-y-2">
                                    <FormLabel>Religion</FormLabel>
                                    <FormControl>
                                        <HierarchicalReligionPicker
                                            selectedReligionId={field.value?.id}
                                            onReligionSelect={(religionId, religionLabel) => {
                                                field.onChange(religionId ? { id: religionId, label: religionLabel } : null);
                                            }}
                                            placeholder="Select religion"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="flex flex-col lg:grid grid-cols-2 gap-3">
                        <FormField
                                name="country"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col space-y-2">
                                        <FormLabel
                                            className={classNames(
                                                bl.form.formState.errors.country ? "text-accent" : ""
                                            )}
                                        >
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>Country</TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs">
                                                            Your business location (used for tax rates and currency).
                                                            Full address will be collected later during payout setup.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </FormLabel>
                                        <FormControl>
                                            <ComboBox
                                                aria-label="country-picker"
                                                items={bl.sortedCountries}
                                                value={bl.sortedCountries.find(c => c.code === field.value) || null}
                                                onChange={(country) => field.onChange(country?.code || '')}
                                                placeholder="Select country"
                                                withSearch={true}
                                                fieldMapping={{
                                                    labelColumn: 'name',
                                                    keyColumn: 'code'
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        <FormField
                                name="state"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col space-y-2">
                                        <FormLabel>State/Province</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} placeholder="e.g., CA, NSW" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                    </div>
                    <FormField
                            name="slug"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center">
                                    <div className={classNames("flex-none flex flex-col", field_label_width)}>
                                        <FormLabel
                                            className={classNames(
                                                bl.form.formState.errors.slug ? "text-accent" : null
                                            )}
                                        >
                                            { bl.form.formState.errors.slug != null ?
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger onClick={(ev) => {
                                                            ev.preventDefault();
                                                            setUrlInputActive(true);
                                                        }} className="flex flex-row space-x-1 items-center">
                                                            <CircleHelpIcon className="h-4 w-4" />
                                                            <span>Public URL</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {bl.form.formState.errors.slug.message}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider> :
                                                <span>Public URL</span>
                                            }
                                        </FormLabel>
                                        <span className="text-sm text-gray-500">spiriverse.com/</span>
                                    </div>
                                    <div className="flex-grow flex flex-col">
                                        <FormControl>
                                            <Input {...field}
                                                disabled={bl.generatingSlug.active}
                                                onChange={(ev) => {
                                                    field.onChange(ev); // Call React Hook Form's onChange first
                                                    bl.slug.set(ev.target.value);
                                                }}
                                                placeholder="your-business-name"/>
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                    {/* Step 1: Continue to pricing button */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            onClick={async () => {
                                // Validate step 1 fields
                                const isValid = await bl.form.trigger(['name', 'email', 'merchantTypeIds', 'religion', 'country', 'state', 'slug']);
                                if (isValid) {
                                    setStep(2);
                                }
                            }}
                        >
                            Continue to Pricing
                        </Button>
                    </div>
                    </>)}

                    {step === 2 && (<>
                    {/* Only show MerchantSubscription if country is set, in a child component for perf */}
                    <MerchantSubscriptionSection control={bl.form.control} />

                    {/* Step 2: Navigation buttons */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-4"
                            onClick={() => setStep(1)}
                        >
                            Back
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-4 flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        >
                            {isSubmitting ? 'Processing...' : 'Finish'}
                        </Button>
                    </div>
                    </>)}
                </form>
            </Form>
        </>
    )
}

export default CaptureProfile