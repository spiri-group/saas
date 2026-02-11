'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
    currentStep: number;
    totalSteps: number;
    labels: string[];
};

export default function StepIndicator({ currentStep, totalSteps, labels }: Props) {
    return (
        <div className="px-8 pt-6" data-testid="step-indicator">
            <div className="flex items-center justify-between mb-2">
                {Array.from({ length: totalSteps }, (_, i) => {
                    const step = i + 1;
                    return (
                        <div key={step} className="flex items-center">
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                                    currentStep === step
                                        ? 'bg-purple-600 text-white'
                                        : currentStep > step
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-200 text-slate-500',
                                )}
                                data-testid={`step-dot-${step}`}
                            >
                                {currentStep > step ? <Check className="w-4 h-4" /> : step}
                            </div>
                            {step < totalSteps && (
                                <div
                                    className={cn(
                                        'h-0.5 mx-1',
                                        currentStep > step ? 'bg-green-500' : 'bg-slate-200',
                                    )}
                                    style={{ width: '24px' }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between">
                {labels.map((label, i) => (
                    <span key={i} className="text-xs text-slate-500 whitespace-nowrap">{label}</span>
                ))}
            </div>
        </div>
    );
}
