'use client';

import { useParams } from 'next/navigation';
import UseUserProfile from '@/hooks/user/UseUserProfile';
import { SpiritualInterest } from '@/app/(site)/u/[userId]/onboarding/types';

/**
 * Faith section layout that applies a light theme when Faith is the user's primary interest.
 * This creates a warm, reverent atmosphere distinct from the darker mystical sections.
 */
export default function FaithLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const userId = params?.userId as string;
  const { data: user } = UseUserProfile(userId);

  // Determine if Faith is the primary interest
  const isFaithPrimary = user?.primarySpiritualInterest === 'FAITH';

  // Check if Faith is the ONLY interest (no secondary interests that are non-faith)
  const secondaryInterests = (user?.secondarySpiritualInterests || []) as SpiritualInterest[];
  // Reserved for future use: const isFaithOnly = isFaithPrimary && secondaryInterests.length === 0;
  void secondaryInterests; // Silence unused warning - will be used for faith-only specific features

  // Apply light theme if Faith is primary
  const themeClass = isFaithPrimary ? 'faith-light-theme' : '';

  return (
    <div className={`min-h-full ${themeClass}`}>
      {/* Light theme styles applied via CSS class */}
      {isFaithPrimary && (
        <style jsx global>{`
          .faith-light-theme {
            --faith-bg: 255 251 245;
            --faith-bg-secondary: 254 249 239;
            --faith-text: 41 37 36;
            --faith-text-muted: 120 113 108;
            --faith-accent: 180 136 74;
            --faith-accent-soft: 217 181 126;
            --faith-border: 214 211 209;
            --faith-card: 255 255 255;
            --faith-card-hover: 254 252 248;
            --faith-gold: 180 136 74;
            --faith-gold-soft: 253 244 226;
          }

          .faith-light-theme {
            background: rgb(var(--faith-bg));
            color: rgb(var(--faith-text));
          }

          /* Override dark theme elements within faith section */
          .faith-light-theme .bg-slate-900,
          .faith-light-theme .bg-slate-950 {
            background: rgb(var(--faith-bg)) !important;
          }

          .faith-light-theme .bg-slate-800 {
            background: rgb(var(--faith-bg-secondary)) !important;
          }

          .faith-light-theme .bg-white\\/5 {
            background: rgba(var(--faith-card), 0.9) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }

          .faith-light-theme .bg-slate-800\\/50,
          .faith-light-theme .bg-slate-800\\/30 {
            background: rgba(var(--faith-card), 0.95) !important;
          }

          .faith-light-theme .text-white {
            color: rgb(var(--faith-text)) !important;
          }

          .faith-light-theme .text-slate-400,
          .faith-light-theme .text-slate-500 {
            color: rgb(var(--faith-text-muted)) !important;
          }

          .faith-light-theme .text-slate-300 {
            color: rgb(68 64 60) !important;
          }

          .faith-light-theme .border-white\\/20,
          .faith-light-theme .border-white\\/10 {
            border-color: rgb(var(--faith-border)) !important;
          }

          /* Accent colors for Faith */
          .faith-light-theme .text-indigo-400,
          .faith-light-theme .text-indigo-300 {
            color: rgb(var(--faith-gold)) !important;
          }

          .faith-light-theme .text-emerald-400,
          .faith-light-theme .text-emerald-300 {
            color: rgb(22 101 52) !important;
          }

          .faith-light-theme .text-sky-400,
          .faith-light-theme .text-sky-300 {
            color: rgb(2 132 199) !important;
          }

          .faith-light-theme .bg-indigo-500\\/20,
          .faith-light-theme .bg-indigo-600\\/20 {
            background: rgb(var(--faith-gold-soft)) !important;
          }

          .faith-light-theme .bg-emerald-500\\/20,
          .faith-light-theme .bg-emerald-600\\/20 {
            background: rgba(22, 101, 52, 0.1) !important;
          }

          .faith-light-theme .bg-sky-500\\/20 {
            background: rgba(2, 132, 199, 0.1) !important;
          }

          /* Gradient buttons */
          .faith-light-theme .from-indigo-600,
          .faith-light-theme .from-indigo-500 {
            --tw-gradient-from: rgb(var(--faith-gold)) !important;
          }

          .faith-light-theme .to-purple-600,
          .faith-light-theme .to-purple-500 {
            --tw-gradient-to: rgb(161 98 7) !important;
          }

          .faith-light-theme .from-emerald-600 {
            --tw-gradient-from: rgb(22 101 52) !important;
          }

          .faith-light-theme .to-teal-600 {
            --tw-gradient-to: rgb(15 118 110) !important;
          }

          /* Dialog styling */
          .faith-light-theme [role="dialog"] {
            background: rgb(var(--faith-bg)) !important;
            border-color: rgb(var(--faith-border)) !important;
          }

          .faith-light-theme [role="dialog"] .text-white {
            color: rgb(var(--faith-text)) !important;
          }

          /* Badge adjustments */
          .faith-light-theme .bg-green-500\\/20 {
            background: rgba(22, 163, 74, 0.15) !important;
          }

          .faith-light-theme .text-green-300,
          .faith-light-theme .text-green-400 {
            color: rgb(22 101 52) !important;
          }

          .faith-light-theme .bg-purple-500\\/20 {
            background: rgba(147, 51, 234, 0.1) !important;
          }

          .faith-light-theme .text-purple-300,
          .faith-light-theme .text-purple-400 {
            color: rgb(126 34 206) !important;
          }

          .faith-light-theme .bg-amber-500\\/20 {
            background: rgba(180, 136, 74, 0.15) !important;
          }

          .faith-light-theme .text-amber-300,
          .faith-light-theme .text-amber-400 {
            color: rgb(161 98 7) !important;
          }

          .faith-light-theme .bg-blue-500\\/20 {
            background: rgba(59, 130, 246, 0.1) !important;
          }

          .faith-light-theme .text-blue-300,
          .faith-light-theme .text-blue-400 {
            color: rgb(37 99 235) !important;
          }

          /* Form inputs */
          .faith-light-theme .bg-slate-800,
          .faith-light-theme input,
          .faith-light-theme textarea,
          .faith-light-theme select {
            background: rgb(var(--faith-card)) !important;
            border-color: rgb(var(--faith-border)) !important;
            color: rgb(var(--faith-text)) !important;
          }

          .faith-light-theme input::placeholder,
          .faith-light-theme textarea::placeholder {
            color: rgb(var(--faith-text-muted)) !important;
          }

          /* Hover states */
          .faith-light-theme .hover\\:bg-white\\/10:hover {
            background: rgba(var(--faith-gold), 0.1) !important;
          }

          .faith-light-theme .hover\\:bg-slate-800:hover {
            background: rgb(var(--faith-bg-secondary)) !important;
          }

          /* Atmospheric glows - subtle and warm */
          .faith-light-theme .blur-3xl {
            opacity: 0.3;
          }
        `}</style>
      )}
      {children}
    </div>
  );
}
