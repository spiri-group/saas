'use client';

import { Sparkles } from 'lucide-react';
import { SpiritualInterest } from '../../onboarding/types';

// Spiritual identity labels based on primary interest
const IDENTITY_LABELS: Record<SpiritualInterest, string> = {
  MEDIUMSHIP: 'Medium & Intuitive',
  ENERGY: 'Energy Healer',
  CRYSTALS: 'Crystal Keeper',
  WITCHCRAFT: 'Practitioner of the Craft',
  PARANORMAL: 'Paranormal Investigator',
  HERBALISM: 'Herbalist',
  FAITH: 'Faithful Soul',
};

interface Props {
  firstName?: string;
  primaryInterest?: SpiritualInterest;
  secondaryInterestsCount?: number;
}

const WelcomeHeader: React.FC<Props> = ({
  firstName,
  primaryInterest,
  secondaryInterestsCount = 0,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const identityLabel = primaryInterest ? IDENTITY_LABELS[primaryInterest] : null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h1
          data-testid="personal-space-heading"
          className="text-xl font-light text-white"
        >
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
      </div>
      {identityLabel && (
        <div className="flex items-center gap-2 mt-2">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm font-medium">
            {identityLabel}
          </span>
          {secondaryInterestsCount > 0 && (
            <span className="text-sm text-slate-500">
              +{secondaryInterestsCount} more {secondaryInterestsCount === 1 ? 'interest' : 'interests'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default WelcomeHeader;
