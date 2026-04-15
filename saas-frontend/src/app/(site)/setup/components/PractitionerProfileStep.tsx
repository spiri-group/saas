'use client';

import { UseFormReturn } from 'react-hook-form';
import { useCallback, useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MODALITIES, SPECIALIZATIONS } from '../../p/_constants/practitionerOptions';
import { useSlugGeneration } from '../hooks/useSlugGeneration';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';
import { PRACTITIONER_REQUIRED_FIELDS } from '../hooks/useOnboardingForm';
import ScrollableForm from './ScrollableForm';
import useInterfaceSize from '@/components/ux/useInterfaceSize';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onNext: () => void;
    onBack: () => void;
};

const inputClass = "bg-white/[0.08] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-purple-500/50 focus-visible:border-white/30";

export default function PractitionerProfileStep({ form, onNext, onBack }: Props) {
    const { isMobile } = useInterfaceSize();
    const [mobilePage, setMobilePage] = useState<1 | 2>(1);

    const slug = useSlugGeneration({
        prefix: 'spiriverse.com/p/',
        setValue: form.setValue as any,
        setError: form.setError as any,
        slugField: 'practitioner.slug',
    });

    const handleNameChange = useCallback((nameValue: string) => {
        if (nameValue && !slug.hasManuallySetSlug) {
            slug.generateFromName(nameValue);
        }
    }, [slug]);

    const toggleArrayValue = (field: 'practitioner.modalities' | 'practitioner.specializations', value: string) => {
        const current = form.getValues(field) || [];
        const updated = current.includes(value)
            ? current.filter((v: string) => v !== value)
            : [...current, value];
        form.setValue(field, updated, { shouldValidate: true });
    };

    const handleContinue = async () => {
        if (isMobile && mobilePage === 1) {
            const valid = await form.trigger(['practitioner.name', 'practitioner.slug']);
            if (valid) setMobilePage(2);
            return;
        }
        const valid = await form.trigger([...PRACTITIONER_REQUIRED_FIELDS]);
        if (valid) onNext();
    };

    const handleBack = () => {
        if (isMobile && mobilePage === 2) {
            setMobilePage(1);
            return;
        }
        onBack();
    };

    // Page 1: Display name + slug
    const page1Content = (
        <>
            <FormField
                control={form.control}
                name="practitioner.name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-300">Display Name</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-practitioner-name"
                                placeholder="e.g., Luna Mystic Readings"
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
                name="practitioner.slug"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-300">Your SpiriVerse Address</FormLabel>
                        <FormDescription className="text-slate-400">This is how seekers will find your profile online</FormDescription>
                        <FormControl>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-400 whitespace-nowrap">spiriverse.com/p/</span>
                                <Input
                                    {...field}
                                    data-testid="setup-practitioner-slug"
                                    disabled={slug.isGenerating}
                                    placeholder="your-name"
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
        </>
    );

    // Page 2: Modalities + specializations
    const page2Content = (
        <>
            <FormField
                control={form.control}
                name="practitioner.modalities"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-300">Modalities</FormLabel>
                        <FormDescription className="text-slate-400">Select the types of readings and services you offer</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2" data-testid="setup-practitioner-modalities">
                            {MODALITIES.map((m) => (
                                <Badge
                                    key={m.value}
                                    variant={(field.value || []).includes(m.value) ? 'default' : 'outline'}
                                    className={cn(
                                        'cursor-pointer transition-all px-3.5 py-2 sm:px-3 sm:py-1.5 text-sm',
                                        (field.value || []).includes(m.value)
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                            : 'border-white/20 text-slate-300 hover:bg-white/10',
                                    )}
                                    onClick={() => toggleArrayValue('practitioner.modalities', m.value)}
                                    data-testid={`setup-modality-${m.value}`}
                                >
                                    {m.label}
                                </Badge>
                            ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="practitioner.specializations"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-300">Specializations</FormLabel>
                        <FormDescription className="text-slate-400">What areas do you focus on?</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2" data-testid="setup-practitioner-specializations">
                            {SPECIALIZATIONS.map((s) => (
                                <Badge
                                    key={s.value}
                                    variant={(field.value || []).includes(s.value) ? 'default' : 'outline'}
                                    className={cn(
                                        'cursor-pointer transition-all px-3.5 py-2 sm:px-3 sm:py-1.5 text-sm',
                                        (field.value || []).includes(s.value)
                                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                                            : 'border-white/20 text-slate-300 hover:bg-white/10',
                                    )}
                                    onClick={() => toggleArrayValue('practitioner.specializations', s.value)}
                                    data-testid={`setup-specialization-${s.value}`}
                                >
                                    {s.label}
                                </Badge>
                            ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );

    const tier = form.watch('subscription.tier');
    const isDirectory = tier === 'directory';

    const heading = isMobile && mobilePage === 2
        ? 'Your Practice'
        : isDirectory ? 'Business Profile' : 'Practitioner Profile';
    const subheading = isDirectory
        ? null
        : isMobile && mobilePage === 2
            ? 'What do you offer and specialise in?'
            : 'Tell seekers about your practice.';

    return (
        <div className="flex flex-col h-full min-h-0">
            <ScrollableForm dark className="px-4 py-3 sm:px-6 sm:py-5 md:px-8 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
                <div>
                    <h1 className="font-light text-lg sm:text-2xl text-white mb-1">{heading}</h1>
                    {subheading && <p className="text-xs sm:text-sm md:text-base text-slate-300">{subheading}</p>}
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
                        data-testid="setup-practitioner-back-btn"
                        className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white h-12 sm:h-9 text-base sm:text-sm"
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                    <Button
                        type="button"
                        data-testid="setup-practitioner-continue-btn"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 h-12 sm:h-9 text-base sm:text-sm"
                        onClick={handleContinue}
                    >
                        Continue
                    </Button>
                </div>
            </div>
        </div>
    );
}
