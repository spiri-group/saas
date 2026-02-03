'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import UseUserProfile from '@/app/(site)/c/[customerId]/settings/hooks/UseUserProfile';
import UseUpdateSpiritualInterests from '../../onboarding/hooks/UseUpdateSpiritualInterests';
import { Loader2 } from 'lucide-react';
import OnboardingUI from '../../onboarding/ui';
import { SpiritualInterest } from '@/utils/spiriverse';
import { SPIRITUAL_INTERESTS } from '../../onboarding/types';

interface Props {
  children: React.ReactNode;
}

const VALID_INTERESTS = SPIRITUAL_INTERESTS.map(i => i.key);

/**
 * Guards Personal Space routes by checking if the user has completed onboarding
 * (i.e., has set their primary spiritual interest).
 *
 * If not, shows the onboarding UI inline. When onboarding completes and the
 * mutation invalidates the user profile cache, this component will automatically
 * re-render and show the children (Personal Space).
 *
 * Supports ?autoSetup=<interest> query param to auto-complete onboarding
 * (used when redirecting from service purchase that requires birth chart)
 */
const PersonalSpaceOnboardingGuard: React.FC<Props> = ({ children }) => {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params?.userId as string;
  const autoSetupParam = searchParams?.get('autoSetup');
  const autoSetup = autoSetupParam && VALID_INTERESTS.includes(autoSetupParam as SpiritualInterest)
    ? (autoSetupParam as SpiritualInterest)
    : null;

  const { data: user, isLoading } = UseUserProfile(userId);
  const updateMutation = UseUpdateSpiritualInterests(userId);
  const [autoSetupTriggered, setAutoSetupTriggered] = useState(false);

  // Auto-setup: if autoSetup param is present and valid
  // Case 1: User has no primary interest → set autoSetup as primary
  // Case 2: User has different primary → add autoSetup to secondary interests
  useEffect(() => {
    if (!autoSetup || !user || autoSetupTriggered || updateMutation.isPending) return;

    const hasInterest = user.primarySpiritualInterest === autoSetup ||
      user.secondarySpiritualInterests?.includes(autoSetup);

    if (!user.primarySpiritualInterest) {
      // Case 1: No primary set - set autoSetup as primary
      setAutoSetupTriggered(true);
      updateMutation.mutate({
        primarySpiritualInterest: autoSetup,
        secondarySpiritualInterests: []
      });
    } else if (!hasInterest) {
      // Case 2: Has different primary - add autoSetup to secondary
      setAutoSetupTriggered(true);
      updateMutation.mutate({
        primarySpiritualInterest: user.primarySpiritualInterest,
        secondarySpiritualInterests: [...(user.secondarySpiritualInterests || []), autoSetup]
      });
    }
  }, [autoSetup, user, autoSetupTriggered, updateMutation]);

  // Show loading state while fetching user data or auto-setting up
  const needsAutoSetup = autoSetup && user && (
    !user.primarySpiritualInterest ||
    (user.primarySpiritualInterest !== autoSetup && !user.secondarySpiritualInterests?.includes(autoSetup))
  );
  if (isLoading || (needsAutoSetup && (updateMutation.isPending || autoSetupTriggered))) {
    return (
      <div className="min-h-screen-minus-nav bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-400">
            {autoSetup ? 'Setting up your space...' : 'Loading your space...'}
          </p>
        </div>
      </div>
    );
  }

  // If user hasn't completed onboarding and no autoSetup, show onboarding UI inline
  if (user && !user.primarySpiritualInterest) {
    return <OnboardingUI userId={userId} />;
  }

  return <>{children}</>;
};

export default PersonalSpaceOnboardingGuard;
