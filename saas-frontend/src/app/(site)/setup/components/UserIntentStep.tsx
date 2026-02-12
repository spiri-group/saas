'use client';

import { ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
    onBrowse: () => void;
    onSetupBusiness: () => void;
    onBack?: () => void;
};

export default function UserIntentStep({ onBrowse, onSetupBusiness, onBack }: Props) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div>
                    <h1 className="font-light text-2xl text-slate-800 mb-2">Welcome!</h1>
                    <p className="text-base text-slate-600">
                        What brings you to SpiriVerse today?
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Browse option */}
                    <button
                        type="button"
                        data-testid="setup-intent-browse"
                        className="flex flex-col items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-8 text-center transition-all hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-200/40"
                        onClick={onBrowse}
                    >
                        <ShoppingBag className="w-12 h-12 text-indigo-600" />
                        <div>
                            <h3 className="font-semibold text-lg text-slate-800 mb-2">Start Browsing</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Explore spiritual products, services, and connect with practitioners in our community.
                            </p>
                        </div>
                    </button>

                    {/* Setup business option */}
                    <button
                        type="button"
                        data-testid="setup-intent-business"
                        className="flex flex-col items-center gap-4 rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-cyan-50 p-8 text-center transition-all hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-300/50"
                        onClick={onSetupBusiness}
                    >
                        <Store className="w-12 h-12 text-indigo-600" />
                        <div>
                            <h3 className="font-semibold text-lg text-slate-800 mb-2">Setup Business Profile</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Offer your products or services to our spiritual community and grow your business.
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {onBack && (
                <div className="p-8 pt-0">
                    <Button
                        type="button"
                        variant="outline"
                        data-testid="setup-intent-back-btn"
                        onClick={onBack}
                    >
                        Back
                    </Button>
                </div>
            )}
        </div>
    );
}
