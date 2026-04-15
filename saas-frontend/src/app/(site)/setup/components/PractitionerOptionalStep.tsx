'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoaderIcon, Sparkles } from 'lucide-react';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';
import ScrollableForm from './ScrollableForm';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
};

const inputClass = "bg-white/[0.08] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-purple-500/50 focus-visible:border-white/30";

export default function PractitionerOptionalStep({ form, onSubmit, onBack, isSubmitting }: Props) {
    return (
        <div className="flex flex-col h-full min-h-0">
            <ScrollableForm dark className="px-4 py-3 sm:px-6 sm:py-5 md:px-8 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <h1 className="font-light text-lg sm:text-2xl text-white">Additional Details</h1>
                    </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-300">
                    These details are optional but help seekers get to know you better.
                </p>
            </div>

            <FormField
                control={form.control}
                name="practitioner.pronouns"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-300">Pronouns (Optional)</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-practitioner-pronouns"
                                placeholder="e.g., she/her, he/him, they/them"
                                glass={false}
                                className={inputClass}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="practitioner.yearsExperience"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-slate-300">Years of Experience (Optional)</FormLabel>
                        <FormControl>
                            <Input
                                type="number"
                                data-testid="setup-practitioner-years"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="e.g., 5"
                                glass={false}
                                className={`w-32 ${inputClass}`}
                                min={0}
                                max={100}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            </ScrollableForm>

            <div className="border-t border-white/10" />

            <div className="px-4 pb-3 pt-2 sm:px-6 sm:pb-5 sm:pt-4 md:px-8 md:pb-6">
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        data-testid="setup-practitioner-opt-back-btn"
                        className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white h-12 sm:h-9 text-base sm:text-sm"
                        onClick={onBack}
                    >
                        Back
                    </Button>
                    <Button
                        type="button"
                        data-testid="setup-practitioner-submit-btn"
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 h-12 sm:h-9 text-base sm:text-sm"
                        onClick={onSubmit}
                    >
                        {isSubmitting ? (
                            <>
                                <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
                                Creating Profile...
                            </>
                        ) : (
                            'Create My Profile'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
