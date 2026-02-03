'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Star, Zap, Heart, Moon, Gem, BookOpen, Shield, Eye, MessageCircle, Dumbbell } from 'lucide-react';
import { useUserUnlockState, useMarkCelebrationShown, UnlockStatus } from '../_hooks/useUnlockStatus';
import { cn } from '@/lib/utils';

// Map feature IDs to icons
const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'crystals:cleansing-log': Moon,
  'crystals:charging-reminders': Moon,
  'crystals:crystal-grids': Gem,
  'crystals:acquisition-journal': BookOpen,
  'crystals:pairing-notes': Gem,
  'crystals:shop-fair-log': Gem,
  'mediumship:synchronicity-log': Sparkles,
  'mediumship:spirit-messages': MessageCircle,
  'mediumship:symbol-dictionary': BookOpen,
  'mediumship:loved-ones': Heart,
  'mediumship:development-exercises': Dumbbell,
  'energy:attunement-tracker': Zap,
  'energy:protection-rituals': Shield,
  'energy:aura-observations': Eye,
};

// Celebration colors by interest area
const INTEREST_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  crystals: {
    bg: 'from-purple-900/90 via-purple-800/80 to-indigo-900/90',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/20',
  },
  mediumship: {
    bg: 'from-indigo-900/90 via-blue-800/80 to-purple-900/90',
    border: 'border-indigo-500/30',
    text: 'text-indigo-300',
    glow: 'shadow-indigo-500/20',
  },
  energy: {
    bg: 'from-amber-900/90 via-orange-800/80 to-yellow-900/90',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    glow: 'shadow-amber-500/20',
  },
  faith: {
    bg: 'from-emerald-900/90 via-teal-800/80 to-cyan-900/90',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    glow: 'shadow-emerald-500/20',
  },
  tarot: {
    bg: 'from-violet-900/90 via-purple-800/80 to-fuchsia-900/90',
    border: 'border-violet-500/30',
    text: 'text-violet-300',
    glow: 'shadow-violet-500/20',
  },
};

interface UnlockCelebrationProps {
  className?: string;
}

/**
 * Shows celebration modals when features are unlocked
 * Automatically detects newly unlocked features and displays them one at a time
 */
export const UnlockCelebration: React.FC<UnlockCelebrationProps> = ({ className }) => {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const { data: unlockState } = useUserUnlockState(userId);
  const markCelebrationShown = useMarkCelebrationShown();

  const [currentCelebration, setCurrentCelebration] = useState<UnlockStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Check for new unlocks that need celebration
  useEffect(() => {
    if (unlockState?.recentlyUnlocked && unlockState.recentlyUnlocked.length > 0) {
      // Show the first uncelebrated unlock
      const uncelebrated = unlockState.recentlyUnlocked.find((u) => !u.celebrationShown);
      if (uncelebrated && !currentCelebration) {
        setCurrentCelebration(uncelebrated);
        setIsOpen(true);
      }
    }
  }, [unlockState?.recentlyUnlocked, currentCelebration]);

  const handleClose = async () => {
    if (currentCelebration) {
      // Mark this celebration as shown
      await markCelebrationShown.mutateAsync({
        userId,
        featureId: currentCelebration.featureId,
      });
    }
    setIsOpen(false);
    setCurrentCelebration(null);
  };

  const handleTryNow = async () => {
    if (currentCelebration) {
      await markCelebrationShown.mutateAsync({
        userId,
        featureId: currentCelebration.featureId,
      });

      // Navigate to the feature route if available
      // TODO: Get route from feature definition
      const featureRoutes: Record<string, string> = {
        'mediumship:synchronicity-log': `/u/${userId}/space/mediumship/synchronicity`,
        'mediumship:spirit-messages': `/u/${userId}/space/mediumship/messages`,
        'mediumship:symbol-dictionary': `/u/${userId}/space/mediumship/symbols`,
        'mediumship:loved-ones': `/u/${userId}/space/mediumship/loved-ones`,
        'mediumship:development-exercises': `/u/${userId}/space/mediumship/development`,
        'crystals:cleansing-log': `/u/${userId}/space/crystals/cleansing`,
        'crystals:crystal-grids': `/u/${userId}/space/crystals/grids`,
        'energy:attunement-tracker': `/u/${userId}/space/energy/attunements`,
        'energy:protection-rituals': `/u/${userId}/space/energy/protection`,
        'energy:aura-observations': `/u/${userId}/space/energy/aura`,
      };

      const route = featureRoutes[currentCelebration.featureId];
      if (route) {
        router.push(route);
      }
    }
    setIsOpen(false);
    setCurrentCelebration(null);
  };

  if (!currentCelebration) return null;

  const IconComponent = FEATURE_ICONS[currentCelebration.featureId] || Star;
  const colors = INTEREST_COLORS[currentCelebration.interestArea] || INTEREST_COLORS.mediumship;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          'sm:max-w-md border-2 bg-gradient-to-br text-white shadow-2xl',
          colors.bg,
          colors.border,
          colors.glow,
          className
        )}
      >
        {/* Animated stars background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-4 animate-pulse">
            <Star className="w-3 h-3 text-white/20" />
          </div>
          <div className="absolute top-8 right-8 animate-pulse delay-100">
            <Star className="w-2 h-2 text-white/30" />
          </div>
          <div className="absolute bottom-12 left-8 animate-pulse delay-200">
            <Star className="w-4 h-4 text-white/15" />
          </div>
          <div className="absolute bottom-8 right-12 animate-pulse delay-300">
            <Star className="w-2 h-2 text-white/25" />
          </div>
        </div>

        <DialogHeader className="relative z-10">
          {/* Icon */}
          <div className="mx-auto mb-4 p-4 rounded-full bg-white/10 border border-white/20 animate-bounce">
            <IconComponent className={cn('w-8 h-8', colors.text)} />
          </div>

          <DialogTitle className="text-2xl font-bold text-center text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            New Feature Unlocked!
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          </DialogTitle>

          <DialogDescription className="text-center text-white/80 text-lg mt-2">
            {currentCelebration.featureName}
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-10 space-y-4 py-4">
          <p className="text-center text-white/90">{currentCelebration.featureDescription}</p>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={handleTryNow}
              className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white"
            >
              Try it now
            </Button>
            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full text-white/60 hover:text-white hover:bg-white/10"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnlockCelebration;
