'use client';

import { Store, Star, Users, TrendingUp, Shield, Sparkles, Heart } from 'lucide-react';
import SpiriLogo from '@/icons/spiri-logo';
import type { OnboardingTheme } from './OnboardingShell';

const CONTENT: Record<OnboardingTheme, {
    icon: React.ElementType;
    iconColor: string;
    title: string;
    subtitle: string;
    features: { icon: React.ElementType; iconColor: string; title: string; description: string }[];
    sparkleColor: string;
    sparkleText: string;
}> = {
    neutral: {
        icon: Sparkles,
        iconColor: 'text-slate-300',
        title: 'Welcome to SpiriVerse',
        subtitle: 'Set up your profile and start connecting with seekers and spiritual communities.',
        features: [
            { icon: Users, iconColor: 'text-slate-400', title: 'Reach Your Audience', description: 'Connect with clients looking for authentic spiritual connections and insights.' },
            { icon: TrendingUp, iconColor: 'text-slate-400', title: 'Grow Your Practice', description: 'Our platform highlights your unique offerings to a dedicated, engaged audience.' },
            { icon: Shield, iconColor: 'text-green-400', title: 'Privacy & Security', description: 'Your information is kept safe and used solely to enhance your experience.' },
        ],
        sparkleColor: 'text-slate-300',
        sparkleText: 'Your spiritual journey starts here.',
    },
    amber: {
        icon: Store,
        iconColor: 'text-amber-300',
        title: 'Set Up Your Business',
        subtitle: 'We\u2019re excited to have you join us in offering meaningful, spiritual experiences to a growing community of seekers.',
        features: [
            { icon: Users, iconColor: 'text-amber-400', title: 'Reach Your Audience', description: 'Connect with clients looking for authentic spiritual connections and insights.' },
            { icon: TrendingUp, iconColor: 'text-amber-400', title: 'Grow Your Business', description: 'Our platform highlights your unique offerings to a dedicated, engaged audience.' },
            { icon: Shield, iconColor: 'text-green-400', title: 'Privacy & Security', description: 'Your information is kept safe and used solely to enhance your experience.' },
        ],
        sparkleColor: 'text-amber-300',
        sparkleText: 'Welcome aboard! We look forward to supporting your journey.',
    },
    purple: {
        icon: Star,
        iconColor: 'text-purple-300',
        title: 'Share Your Gifts',
        subtitle: 'Share your gifts with seekers who are looking for guidance, healing, and spiritual connection.',
        features: [
            { icon: Heart, iconColor: 'text-purple-400', title: 'Share Your Gifts', description: 'Offer tarot readings, mediumship, energy healing, and other spiritual services.' },
            { icon: Users, iconColor: 'text-purple-400', title: 'Connect with Seekers', description: 'Build meaningful relationships with people seeking guidance on their spiritual journey.' },
            { icon: Shield, iconColor: 'text-green-400', title: 'Build Trust', description: 'Showcase your experience, training, and approach to help clients find the right fit.' },
        ],
        sparkleColor: 'text-purple-300',
        sparkleText: 'Your journey to helping others begins here.',
    },
};

type Props = {
    theme: OnboardingTheme;
};

export default function MarketingPanel({ theme }: Props) {
    const c = CONTENT[theme];
    const Icon = c.icon;

    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
                <Icon className={`w-8 h-8 ${c.iconColor}`} />
                <SpiriLogo height={40} />
            </div>

            <h1 className="text-3xl font-light text-white mb-6 tracking-wide">{c.title}</h1>

            <div className="space-y-6 text-slate-200 leading-relaxed">
                <p className="text-lg font-light">{c.subtitle}</p>

                <div className="space-y-4">
                    {c.features.map((f) => {
                        const FIcon = f.icon;
                        return (
                            <div key={f.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                                <FIcon className={`w-5 h-5 ${f.iconColor} mt-1 flex-shrink-0`} />
                                <div>
                                    <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                                    <p className="text-sm text-slate-300">{f.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 pt-4">
                    <Sparkles className={`w-5 h-5 ${c.sparkleColor} animate-pulse`} />
                    <p className="text-sm italic text-slate-300">{c.sparkleText}</p>
                </div>
            </div>
        </div>
    );
}
