'use client';

import { Store, Star, Users, TrendingUp, Shield, Sparkles, Heart } from 'lucide-react';
import type { OnboardingTheme } from './OnboardingShell';

const CONTENT: Record<OnboardingTheme, {
    icon: React.ElementType;
    iconColor: string;
    accentBorder: string;
    title: string;
    subtitle: string;
    features: { icon: React.ElementType; iconColor: string; title: string; description: string }[];
    sparkleColor: string;
    sparkleText: string;
}> = {
    neutral: {
        icon: Sparkles,
        iconColor: 'text-indigo-300',
        accentBorder: 'border-l-indigo-400/50',
        title: 'Welcome to SpiriVerse',
        subtitle: 'A sacred digital space connecting seekers, practitioners, and spiritual communities.',
        features: [
            { icon: Heart, iconColor: 'text-indigo-400', title: 'Discover & Explore', description: 'Find authentic spiritual connections, guidance, and products that resonate with your journey.' },
            { icon: Users, iconColor: 'text-cyan-400', title: 'Join the Community', description: 'Connect with like-minded souls in a supportive space dedicated to spiritual growth.' },
            { icon: Shield, iconColor: 'text-green-400', title: 'Trust & Security', description: 'Your information is protected and used only to create the best experience for you.' },
        ],
        sparkleColor: 'text-indigo-300',
        sparkleText: 'Your spiritual journey starts here.',
    },
    amber: {
        icon: Store,
        iconColor: 'text-amber-400',
        accentBorder: 'border-l-amber-400/50',
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
        iconColor: 'text-purple-400',
        accentBorder: 'border-l-purple-400/50',
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

    // Step 1 (neutral) keeps the glass card style
    if (theme === 'neutral') {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl h-full flex flex-col justify-between animate-fade-in">
                <div className="flex items-center mb-8">
                    <Icon className={`w-10 h-10 ${c.iconColor} drop-shadow-lg`} />
                </div>

                <h1 className="text-4xl text-white mb-8 tracking-wide leading-tight drop-shadow-md">
                    {c.title}
                </h1>

                <div className="space-y-6 text-slate-200 leading-relaxed">
                    <p className="text-lg drop-shadow-sm">{c.subtitle}</p>

                    <div className="space-y-4">
                        {c.features.map((f) => {
                            const FIcon = f.icon;
                            return (
                                <div key={f.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]">
                                    <FIcon className={`w-6 h-6 ${f.iconColor} mt-0.5 flex-shrink-0 drop-shadow-md`} />
                                    <div>
                                        <h3 className="text-white mb-1.5">{f.title}</h3>
                                        <p className="text-sm text-slate-300 leading-relaxed">{f.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                        <Sparkles className={`w-5 h-5 ${c.sparkleColor}`} />
                        <p className="text-sm italic text-slate-300">{c.sparkleText}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Merchant & practitioner steps — themed gradient panel
    const gradientBg = theme === 'purple'
        ? 'bg-gradient-to-br from-purple-950/80 via-violet-900/50 to-indigo-950/80 border-purple-500/20'
        : 'bg-gradient-to-br from-amber-950/80 via-orange-900/50 to-amber-950/80 border-amber-500/20';

    return (
        <div className={`h-full flex flex-col justify-center px-8 py-8 rounded-2xl border ${gradientBg} animate-fade-in`}>
            <Icon className={`w-12 h-12 ${c.iconColor} mb-6 drop-shadow-lg`} />

            <h1 className="text-5xl font-light text-white mb-4 tracking-wide leading-[1.15] drop-shadow-md">
                {c.title}
            </h1>

            <p className="text-lg text-white/60 mb-10 leading-relaxed">
                {c.subtitle}
            </p>

            <div className="space-y-5">
                {c.features.map((f) => {
                    const FIcon = f.icon;
                    return (
                        <div key={f.title} className={`flex items-start gap-4 border-l-2 ${c.accentBorder} pl-4 py-1`}>
                            <FIcon className={`w-5 h-5 ${f.iconColor} mt-0.5 flex-shrink-0`} />
                            <div>
                                <h3 className="text-white/90 text-sm font-medium mb-0.5">{f.title}</h3>
                                <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-2 mt-10">
                <Sparkles className={`w-4 h-4 ${c.sparkleColor}`} />
                <p className="text-sm italic text-white/40">{c.sparkleText}</p>
            </div>
        </div>
    );
}
