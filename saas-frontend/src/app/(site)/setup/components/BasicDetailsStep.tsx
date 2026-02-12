'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import ComboBox from '@/components/ux/ComboBox';
import { useMemo, useEffect } from 'react';
import useReverseGeocoding from '@/components/utils/useReverseGeoCoding';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';
import { COUNTRIES } from '../hooks/useOnboardingForm';
import { Compass, Store } from 'lucide-react';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onBrowse: () => void;
    onSetupBusiness: () => void;
};

export default function BasicDetailsStep({ form, onBrowse, onSetupBusiness }: Props) {
    const countryCode = useReverseGeocoding();

    const sortedCountries = useMemo(() => {
        const all = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
        const detected = all.find(c => c.code === countryCode);
        if (detected) {
            return [detected, ...all.filter(c => c.code !== countryCode)];
        }
        return all;
    }, [countryCode]);

    // Auto-select detected country if field is empty
    useEffect(() => {
        const currentCountry = form.getValues('country');
        if (countryCode && !currentCountry) {
            form.setValue('country', countryCode);
        }
    }, [countryCode, form]);

    const handleBrowse = async () => {
        const valid = await form.trigger(['firstName', 'lastName', 'email', 'country']);
        if (valid) onBrowse();
    };

    const handleSetupBusiness = async () => {
        const valid = await form.trigger(['firstName', 'lastName', 'email', 'country']);
        if (valid) onSetupBusiness();
    };

    return (
        <div className="flex flex-col h-full">
            <div className="backdrop-blur-xl bg-white/[0.07] border border-white/15 rounded-2xl shadow-2xl flex flex-col flex-1">
                <div className="p-8 space-y-6 flex-1 flex flex-col justify-center">
                    <div>
                        <h1 className="text-3xl text-white tracking-wide mb-2">
                            First up, tell us a little about yourself
                        </h1>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-300 text-sm">First Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="First name"
                                                data-testid="setup-first-name"
                                                autoFocus
                                                glass={false}
                                                className="bg-white/[0.08] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-indigo-500/50 focus-visible:border-white/30"
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
                                        <FormLabel className="text-slate-300 text-sm">Last Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Last name"
                                                data-testid="setup-last-name"
                                                glass={false}
                                                className="bg-white/[0.08] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-indigo-500/50 focus-visible:border-white/30"
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
                                    <FormLabel className="text-slate-300 text-sm">Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="email"
                                            placeholder="you@example.com"
                                            data-testid="setup-email"
                                            glass={false}
                                            className="bg-white/[0.08] border-white/15 text-white placeholder:text-white/30 focus-visible:ring-indigo-500/50 focus-visible:border-white/30"
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
                                    <FormLabel className="text-slate-300 text-sm">Country</FormLabel>
                                    <FormControl>
                                        <ComboBox
                                            items={sortedCountries}
                                            value={sortedCountries.find(c => c.code === field.value) || undefined}
                                            onChange={(country) => field.onChange(country?.code || '')}
                                            fieldMapping={{ labelColumn: 'name', keyColumn: 'code' }}
                                            placeholder="Select a country"
                                            withSearch={true}
                                            data-testid="setup-country"
                                            className="bg-white/[0.08] border-white/15 text-white hover:bg-white/[0.12] hover:text-white"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10" />

                {/* CTA section */}
                <div className="p-8 pt-6 space-y-3">
                    <p className="text-sm text-slate-400 mb-4 text-center tracking-wide uppercase">
                        What brings you here?
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            data-testid="setup-basic-browse-btn"
                            onClick={handleBrowse}
                            className="flex-1 flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white/10 text-white text-lg tracking-wide hover:bg-white/20 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                        >
                            <Compass className="w-5 h-5" />
                            Start Your Journey
                        </button>

                        <button
                            type="button"
                            data-testid="setup-basic-setup-btn"
                            onClick={handleSetupBusiness}
                            className="flex-1 flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-lg tracking-wide hover:from-indigo-400 hover:to-cyan-400 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                        >
                            <Store className="w-5 h-5" />
                            Set Up a Business
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
