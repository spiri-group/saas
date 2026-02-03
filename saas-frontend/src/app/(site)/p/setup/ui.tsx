'use client';

import CaptureProfile from "./components/CaptureProfile";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { v4 as uuid } from 'uuid';
import { Star, Heart, Users, Sparkles, Shield, Mail } from 'lucide-react';
import SpiriLogo from "@/icons/spiri-logo";
import { useSession } from "next-auth/react";
import UseUserProfile from "@/app/(site)/c/[customerId]/settings/hooks/UseUserProfile";
import { SignIn } from "@/components/ux/SignIn";

const useBL = () => {
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const userId = session?.user?.id || "";
    const userProfile = UseUserProfile(userId);

    // Get practitionerId from URL query param, or generate one if missing
    const practitionerId = searchParams.get('practitionerId') || uuid();

    return {
        data: {
            practitionerId: practitionerId,
            userReligion: userProfile.data?.religion ? {
                id: userProfile.data.religion.id,
                label: userProfile.data.religion.name
            } : undefined,
            userEmail: session?.user?.email || ""
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

    // Show sign-in flow for unauthenticated users
    if (!isLoading && !isAuthenticated) {
        return (
            <div className="w-screen min-h-screen-minus-nav w-full relative overflow-hidden">
                {/* Mystical gradient background - practitioner themed with purple/violet */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-slate-900"></div>

                {/* Animated orbs - practitioner themed */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
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
                                <Star className="w-8 h-8 text-purple-300" />
                                <h1 className="text-2xl font-light text-white tracking-wide">
                                    Become a Practitioner
                                </h1>
                            </div>

                            <div className="space-y-6 text-center">
                                <div className="flex items-center justify-center gap-2 text-purple-300">
                                    <Mail className="w-5 h-5" />
                                    <p className="text-lg font-medium">
                                        First, we need your email
                                    </p>
                                </div>

                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Just before we set up your practitioner profile, we need to grab an email.
                                    This can be your personal email — we&apos;ll ask for a business email later
                                    for SpiriGroup to practitioner communications.
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
            {/* Mystical gradient background - practitioner themed with purple/violet */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-slate-900"></div>

            {/* Animated orbs - practitioner themed */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
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
                            <Star className="w-8 h-8 text-purple-300" />
                            <SpiriLogo height={40} />
                        </div>

                        <h1 className="text-3xl font-light text-white mb-6 tracking-wide">
                            Becoming a Practitioner
                        </h1>

                        <div className="space-y-6 text-slate-200 leading-relaxed">
                            <p className="text-lg font-light">
                                Share your gifts with seekers who are looking for guidance, healing, and spiritual connection.
                            </p>

                            {/* Feature highlights */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                                    <Heart className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Share Your Gifts</h3>
                                        <p className="text-sm text-slate-300">
                                            Offer tarot readings, mediumship, energy healing, and other spiritual services.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                                    <Users className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Connect with Seekers</h3>
                                        <p className="text-sm text-slate-300">
                                            Build meaningful relationships with people seeking guidance on their spiritual journey.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                                    <Shield className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Build Trust</h3>
                                        <p className="text-sm text-slate-300">
                                            Showcase your experience, training, and approach to help clients find the right fit.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4">
                                <Sparkles className="w-5 h-5 text-purple-300 animate-pulse" />
                                <p className="text-sm italic text-slate-300">
                                    Your journey to helping others begins here.
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
                        className="backdrop-blur-xl bg-white/95 border border-white/20 rounded-2xl shadow-2xl h-full"
                        practitionerId={bl.data.practitionerId}
                        animated={mounted}
                        initialEmail={bl.data.userEmail}
                    />
                </div>
            </div>
        </div>
    )
}

export default UI;
