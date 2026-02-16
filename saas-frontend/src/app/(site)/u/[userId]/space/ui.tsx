'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import UseUserProfile from '@/hooks/user/UseUserProfile';
import { SpiritualInterest } from '../onboarding/types';
import useMediumshipStats from './mediumship/hooks/useMediumshipStats';
import { useRecentSpiritMessages } from './mediumship/hooks/useSpiritMessages';
import { useRecentSynchronicities } from './mediumship/hooks/useSynchronicities';
import WelcomeHeader from './_components/WelcomeHeader';
import SpiriReadingsBanner from './_components/SpiriReadingsBanner';
import QuickActions from './_components/QuickActions';
import JournalEntries from './_components/JournalEntries';
import ActivitySummary from './_components/ActivitySummary';
import RecentActivity from './_components/RecentActivity';
import UpcomingDates from './_components/UpcomingDates';
import PractitionerFeed from './_components/PractitionerFeed';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const { data: user, isLoading: userLoading } = UseUserProfile(userId);
  const { data: stats, isLoading: statsLoading } = useMediumshipStats(userId);
  const { data: recentMessages, isLoading: messagesLoading } = useRecentSpiritMessages(userId, 5);
  const { data: recentSyncs, isLoading: syncsLoading } = useRecentSynchronicities(userId, 5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get user's interests
  const primaryInterest = user?.primarySpiritualInterest as SpiritualInterest | undefined;
  const secondaryInterests = (user?.secondarySpiritualInterests || []) as SpiritualInterest[];

  if (userLoading || !mounted) {
    return (
      <div className="min-h-screen-minus-nav flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your space...</p>
        </div>
      </div>
    );
  }

  const dataLoading = statsLoading || messagesLoading || syncsLoading;
  const hasActivity = !dataLoading && (
    (stats && (stats.totalSpiritMessages > 0 || stats.totalSynchronicities > 0 || stats.daysActive > 0)) ||
    (recentMessages && recentMessages.length > 0) ||
    (recentSyncs && recentSyncs.length > 0)
  );

  return (
    <div className="min-h-screen-minus-nav p-6">
      {/* Personalized Welcome Header */}
      <WelcomeHeader
        firstName={user?.firstname}
        primaryInterest={primaryInterest}
        secondaryInterestsCount={secondaryInterests.length}
      />

      {/* SpiriReadings Banner - Gateway to tarot readings */}
      {primaryInterest === 'MEDIUMSHIP' && (
        <SpiriReadingsBanner userId={userId} />
      )}

      {/* Two-column layout: Feed (left) + Dashboard (right) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Social feed */}
        <div className="w-full lg:w-96 lg:flex-shrink-0">
          <PractitionerFeed />
        </div>

        {/* Right column - Dashboard content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Quick Actions */}
          <QuickActions userId={userId} primaryInterest={primaryInterest} />

          {/* Warm nudge when the user hasn't started yet */}
          {!dataLoading && !hasActivity && (
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-center">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">Your journey starts here</p>
              <p className="text-sm text-slate-400">
                Try one of the quick actions above and we&apos;ll light up your recent activity as you go.
              </p>
            </div>
          )}

          {/* These sections render only when they have data */}
          <JournalEntries userId={userId} />
          <ActivitySummary stats={stats} isLoading={statsLoading} />
          <RecentActivity
            userId={userId}
            spiritMessages={recentMessages}
            synchronicities={recentSyncs}
            isLoading={messagesLoading || syncsLoading}
          />
          <UpcomingDates stats={stats} isLoading={statsLoading} />
        </div>
      </div>
    </div>
  );
};

export default UI;
