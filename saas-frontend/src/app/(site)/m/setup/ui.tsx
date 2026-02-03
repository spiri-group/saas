'use client';

import CaptureProfile from "./components/CaptureProfile";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { gql } from "@/lib/services/gql";
import { v4 as uuid } from 'uuid';
import { Store, Users, TrendingUp, Shield, Sparkles, Mail } from 'lucide-react';
import SpiriLogo from "@/icons/spiri-logo";
import { useSession } from "next-auth/react";
import UseUserProfile from "@/app/(site)/c/[customerId]/settings/hooks/UseUserProfile";
import { SignIn } from "@/components/ux/SignIn";

const useBL = () => {

    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, update: updateSession } = useSession();
    const userId = session?.user?.id || "";
    const userProfile = UseUserProfile(userId);

    // Get merchantId from URL query param, or generate one if missing (backward compatibility)
    const merchantId = searchParams.get('merchantId') || uuid();

    const [checkingSetupIntent, setCheckingSetupIntent] = useState(false);
    const setupIntent = {
        id: searchParams.has("setup_intent") ? searchParams.get("setup_intent") : null,
        secret: searchParams.has("setup_intent_client_secret") ? searchParams.get("setup_intent_client_secret") : null,
        ready: searchParams.has("setup_intent") && searchParams.has("setup_intent_client_secret"),
        checking: checkingSetupIntent
    }
    useEffect(() => {
        if (setupIntent.ready) {
            setCheckingSetupIntent(true);
            gql<{ vendorFromSubscriptionSetupIntent: {slug: string} }>(
                `query vendorFromSubscriptionSetupIntent($setupIntentId: String!, $setupIntentSecret: String!) {
                    vendorFromSubscriptionSetupIntent(setupIntentId: $setupIntentId, setupIntentSecret: $setupIntentSecret) {
                        id, slug
                    }
                }`,
                {
                    setupIntentId: setupIntent.id,
                    setupIntentSecret: setupIntent.secret
                }
            ).then(async (value) => {
                setCheckingSetupIntent(false);
                // Refresh the session to include the new vendor
                await updateSession();
                // we redirect to the vendor profile so they can continue setupping up their vendor
                router.replace(`/m/${value.vendorFromSubscriptionSetupIntent.slug}`);
            }).finally(() => {
                setCheckingSetupIntent(false);
            })
        }
    }, [setupIntent.ready])

    return {
        data: {
            setupIntent: setupIntent,
            merchantId: merchantId,
            userReligion: userProfile.data?.religion ? {
                id: userProfile.data.religion.id,
                label: userProfile.data.religion.name
            } : undefined
        },
        ready: true
    }
}

const UI: React.FC = () => {
    const bl = useBL();
    const [mounted, setMounted] = useState(false);
    const { data: session, status } = useSession();
    const isAuthenticated = !!session?.user;
    const isLoading = status === "loading";

    useEffect(() => {
        setMounted(true);
    }, []);

    if (bl.data.setupIntent.checking || bl.data.setupIntent.ready) {
        return <></>
    }

    // Show sign-in flow for unauthenticated users
    if (!isLoading && !isAuthenticated) {
        return (
            <div className="w-screen min-h-screen-minus-nav w-full relative overflow-hidden">
                {/* Mystical gradient background - merchant themed with amber/gold */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-orange-900 to-slate-900"></div>

                {/* Animated orbs - merchant themed */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="relative z-10 w-full min-h-screen-minus-nav flex items-center justify-center p-6">
                    <div
                        className={`w-full max-w-lg transition-all duration-1000 ${
                            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                        }`}
                    >
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
                            <div className="flex items-center justify-center mb-6">
                                <SpiriLogo height={50} />
                            </div>

                            <div className="flex items-center justify-center gap-3 mb-4">
                                <Store className="w-8 h-8 text-amber-300" />
                                <h1 className="text-2xl font-light text-white tracking-wide">
                                    Become a Merchant
                                </h1>
                            </div>

                            <div className="space-y-6 text-center">
                                <div className="flex items-center justify-center gap-2 text-amber-300">
                                    <Mail className="w-5 h-5" />
                                    <p className="text-lg font-medium">
                                        First, we need your email
                                    </p>
                                </div>

                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Just before we set up your merchant profile, we need to grab an email.
                                    This can be your personal email — we&apos;ll ask for a business email later
                                    for SpiriGroup to merchant communications.
                                </p>

                                <div className="pt-4">
                                    <SignIn />
                                </div>

                                <p className="text-slate-400 text-xs">
                                    We&apos;ll send you a verification code to confirm your email.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen min-h-screen-minus-nav w-full relative overflow-hidden">
            {/* Mystical gradient background - merchant themed with amber/gold */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-orange-900 to-slate-900"></div>

            {/* Animated orbs - merchant themed */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 w-full min-h-screen-minus-nav grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 items-stretch">
                {/* Left side - Welcome content */}
                <div
                    className={`hidden lg:flex flex-col transition-all duration-1000 ${
                        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                    }`}
                >
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6">
                            <Store className="w-8 h-8 text-amber-300" />
                            <SpiriLogo height={40} />
                        </div>

                        <h1 className="text-3xl font-light text-white mb-6 tracking-wide">
                            Becoming a Merchant
                        </h1>

                        <div className="space-y-6 text-slate-200 leading-relaxed">
                            <p className="text-lg font-light">
                                We&apos;re excited to have you join us in offering meaningful, spiritual experiences to a growing community of seekers.
                            </p>

                            {/* Feature highlights */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                                    <Users className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Reach Your Audience</h3>
                                        <p className="text-sm text-slate-300">
                                            Connect with clients looking for authentic spiritual connections and insights.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                                    <TrendingUp className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Grow Your Business</h3>
                                        <p className="text-sm text-slate-300">
                                            Our platform highlights your unique offerings to a dedicated, engaged audience.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                                    <Shield className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Privacy & Security</h3>
                                        <p className="text-sm text-slate-300">
                                            Your information is kept safe and used solely to enhance your experience.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4">
                                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                                <p className="text-sm italic text-slate-300">
                                    Welcome aboard! We look forward to supporting your journey.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Form */}
                <div
                    className={`flex flex-col transition-all duration-1000 delay-300 ${
                        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                    }`}
                >
                    <CaptureProfile
                        className="bg-white border border-slate-200 rounded-2xl shadow-2xl h-full"
                        merchantId={bl.data.merchantId}
                        animated={mounted}
                        initialReligion={bl.data.userReligion}
                    />
                </div>
            </div>
        </div>
    )
}

export default UI;