'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LoaderIcon, Sparkles } from 'lucide-react';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
};

export default function PractitionerOptionalStep({ form, onSubmit, onBack, isSubmitting }: Props) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h1 className="font-light text-2xl text-purple-900">Additional Details</h1>
                    </div>
                <p className="text-base text-purple-700/70">
                    These details are optional but help seekers get to know you better.
                </p>
            </div>

            <FormField
                control={form.control}
                name="practitioner.pronouns"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Pronouns (Optional)</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                data-testid="setup-practitioner-pronouns"
                                placeholder="e.g., she/her, he/him, they/them"
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
                        <FormLabel>Years of Experience (Optional)</FormLabel>
                        <FormControl>
                            <Input
                                type="number"
                                data-testid="setup-practitioner-years"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="e.g., 5"
                                className="w-32"
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
                name="practitioner.spiritualJourney"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Your Spiritual Journey (Optional)</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                data-testid="setup-practitioner-journey"
                                placeholder="Share how you discovered your gifts and what drew you to this path..."
                                className="min-h-[100px]"
                                maxLength={2000}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="practitioner.approach"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Your Approach (Optional)</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                data-testid="setup-practitioner-approach"
                                placeholder="Describe your reading style and what clients can expect..."
                                className="min-h-[100px]"
                                maxLength={1000}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            </div>

            <div className="p-8 pt-0">
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        data-testid="setup-practitioner-opt-back-btn"
                        onClick={onBack}
                    >
                        Back
                    </Button>
                    <Button
                        type="button"
                        data-testid="setup-practitioner-submit-btn"
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
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
