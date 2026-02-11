'use client';

import { Star, ArrowRight } from 'lucide-react';

type Props = {
    onYes: () => void;
    onNo: () => void;
};

export default function AlsoPractitionerStep({ onYes, onNo }: Props) {
    return (
        <div className="flex flex-col space-y-8 p-8">
            <div>
                <h1 className="font-light text-2xl text-slate-800 mb-2">Your shop is ready!</h1>
                <p className="text-base text-slate-600">
                    Would you also like to create a practitioner profile? This lets you offer personal services like readings, coaching, and healing sessions.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Yes card */}
                <button
                    type="button"
                    data-testid="setup-also-practitioner-yes"
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-purple-300 bg-purple-50 p-6 text-left transition-all hover:border-purple-500 hover:shadow-lg hover:shadow-purple-200/40"
                    onClick={onYes}
                >
                    <Star className="w-8 h-8 text-purple-600" />
                    <div className="text-center">
                        <h3 className="font-semibold text-slate-800 mb-1">Yes, create a practitioner profile</h3>
                        <p className="text-sm text-slate-600">
                            Offer readings, healing sessions, and other personal services alongside your shop.
                        </p>
                    </div>
                </button>

                {/* No card */}
                <button
                    type="button"
                    data-testid="setup-also-practitioner-no"
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-6 text-left transition-all hover:border-slate-400 hover:shadow-lg"
                    onClick={onNo}
                >
                    <ArrowRight className="w-8 h-8 text-slate-400" />
                    <div className="text-center">
                        <h3 className="font-semibold text-slate-800 mb-1">No, take me to my dashboard</h3>
                        <p className="text-sm text-slate-600">
                            You can always add a practitioner profile later from your settings.
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
