'use client';

import { UseFormReturn } from 'react-hook-form';
import { useCallback } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MODALITIES, SPECIALIZATIONS } from '../../p/_constants/practitionerOptions';
import { useSlugGeneration } from '../hooks/useSlugGeneration';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';
import { PRACTITIONER_REQUIRED_FIELDS } from '../hooks/useOnboardingForm';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onNext: () => void;
    onBack: () => void;
};

export default function PractitionerProfileStep({ form, onNext, onBack }: Props) {
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
        const valid = await form.trigger([...PRACTITIONER_REQUIRED_FIELDS]);
        if (valid) onNext();
    };

    return (
        <div className="flex flex-col space-y-6 p-8">
            <div>
                <h1 className="font-light text-2xl text-slate-800 mb-2">Practitioner Profile</h1>
                <p className="text-base text-slate-600">Tell seekers about your practice.</p>
            </div>

            <FormField
                control={form.control}
                name="practitioner.name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-practitioner-name"
                                placeholder="e.g., Luna Mystic Readings"
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
                        <FormLabel>Your Web Address</FormLabel>
                        <FormDescription>This is how seekers will find your profile online</FormDescription>
                        <FormControl>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 whitespace-nowrap">spiriverse.com/p/</span>
                                <Input
                                    {...field}
                                    data-testid="setup-practitioner-slug"
                                    disabled={slug.isGenerating}
                                    placeholder="your-name"
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
                name="practitioner.headline"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Headline</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-practitioner-headline"
                                placeholder="e.g., Intuitive Tarot Reader & Spiritual Guide"
                                maxLength={150}
                            />
                        </FormControl>
                        <FormDescription>{field.value?.length || 0}/150</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="practitioner.bio"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                data-testid="setup-practitioner-bio"
                                placeholder="Tell seekers about your journey, your approach, and what they can expect..."
                                className="min-h-[120px]"
                                maxLength={2000}
                            />
                        </FormControl>
                        <FormDescription>{field.value?.length || 0}/2000</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="practitioner.modalities"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Modalities</FormLabel>
                        <FormDescription>Select the types of readings and services you offer</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2" data-testid="setup-practitioner-modalities">
                            {MODALITIES.map((m) => (
                                <Badge
                                    key={m.value}
                                    variant={(field.value || []).includes(m.value) ? 'default' : 'outline'}
                                    className={cn(
                                        'cursor-pointer transition-all px-3 py-1.5 text-sm',
                                        (field.value || []).includes(m.value)
                                            ? 'bg-purple-600 hover:bg-purple-700'
                                            : 'hover:bg-purple-100',
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
                        <FormLabel>Specializations</FormLabel>
                        <FormDescription>What areas do you focus on?</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2" data-testid="setup-practitioner-specializations">
                            {SPECIALIZATIONS.map((s) => (
                                <Badge
                                    key={s.value}
                                    variant={(field.value || []).includes(s.value) ? 'default' : 'outline'}
                                    className={cn(
                                        'cursor-pointer transition-all px-3 py-1.5 text-sm',
                                        (field.value || []).includes(s.value)
                                            ? 'bg-violet-600 hover:bg-violet-700'
                                            : 'hover:bg-violet-100',
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

            <div className="flex gap-3 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    data-testid="setup-practitioner-back-btn"
                    onClick={onBack}
                >
                    Back
                </Button>
                <Button
                    type="button"
                    data-testid="setup-practitioner-continue-btn"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                    onClick={handleContinue}
                >
                    Continue
                </Button>
            </div>
        </div>
    );
}
