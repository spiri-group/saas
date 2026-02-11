'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ComboBox from '@/components/ux/ComboBox';
import { useMemo } from 'react';
import useReverseGeocoding from '@/components/utils/useReverseGeoCoding';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';
import { COUNTRIES } from '../hooks/useOnboardingForm';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onNext: () => void;
};

export default function BasicDetailsStep({ form, onNext }: Props) {
    const countryCode = useReverseGeocoding();

    const sortedCountries = useMemo(() => {
        const all = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
        const detected = all.find(c => c.code === countryCode);
        if (detected) {
            return [detected, ...all.filter(c => c.code !== countryCode)];
        }
        return all;
    }, [countryCode]);

    const handleContinue = async () => {
        const valid = await form.trigger(['firstName', 'lastName', 'email', 'country']);
        if (valid) onNext();
    };

    return (
        <div className="flex flex-col space-y-6 p-8">
            <div>
                <h1 className="font-light text-2xl text-slate-800 mb-2">Let&apos;s get started</h1>
                <p className="text-base text-slate-600">Tell us a little about yourself.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="First name"
                                    data-testid="setup-first-name"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="Last name"
                                    data-testid="setup-last-name"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                type="email"
                                placeholder="you@example.com"
                                data-testid="setup-email"
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
                                fieldMapping={{ labelColumn: 'name', keyColumn: 'code' }}
                                placeholder="Select a country"
                                withSearch={true}
                                data-testid="setup-country"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <Button
                type="button"
                data-testid="setup-basic-continue-btn"
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                onClick={handleContinue}
            >
                Continue
            </Button>
        </div>
    );
}
