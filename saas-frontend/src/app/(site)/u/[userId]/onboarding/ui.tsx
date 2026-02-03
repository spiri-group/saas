'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Sparkles, SkipForward } from 'lucide-react';
import SpiritualInterestCard from './components/SpiritualInterestCard';
import UseUpdateSpiritualInterests from './hooks/UseUpdateSpiritualInterests';
import { SpiritualInterest, SPIRITUAL_INTERESTS } from './types';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [primaryInterest, setPrimaryInterest] = useState<SpiritualInterest | null>(null);
  const [secondaryInterests, setSecondaryInterests] = useState<SpiritualInterest[]>([]);

  const updateMutation = UseUpdateSpiritualInterests(userId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrimarySelect = (interest: SpiritualInterest) => {
    setPrimaryInterest(interest);
  };

  const handleSecondaryToggle = (interest: SpiritualInterest) => {
    setSecondaryInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      }
      return [...prev, interest];
    });
  };

  const handleContinueToStep2 = () => {
    if (primaryInterest) {
      // Clear any secondary selections that match the primary
      setSecondaryInterests(prev => prev.filter(i => i !== primaryInterest));
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleComplete = async (skipSecondary = false) => {
    if (!primaryInterest) return;

    try {
      await updateMutation.mutateAsync({
        primarySpiritualInterest: primaryInterest,
        secondarySpiritualInterests: skipSecondary ? [] : secondaryInterests
      });
      // No navigation needed - the OnboardingGuard will automatically
      // re-render and show Personal Space when the user profile cache
      // is invalidated by the mutation
    } catch (error) {
      console.error('Failed to save spiritual interests:', error);
    }
  };

  // Filter out the primary interest from secondary options
  const secondaryOptions = SPIRITUAL_INTERESTS.filter(
    interest => interest.key !== primaryInterest
  );

  const isSubmitting = updateMutation.isPending;

  return (
    <div className="w-screen min-h-screen-minus-nav relative overflow-hidden">
      {/* Dark slate background */}
      <div className="absolute inset-0 bg-slate-950"></div>

      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full min-h-screen-minus-nav flex flex-col items-center justify-center p-6">
        <div
          className={`w-full max-w-2xl md:max-w-4xl lg:max-w-5xl transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                step >= 1 ? 'bg-purple-500' : 'bg-white/20'
              }`}
              data-testid="step-indicator-1"
            />
            <div className="w-8 h-0.5 bg-white/20" />
            <div
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                step >= 2 ? 'bg-purple-500' : 'bg-white/20'
              }`}
              data-testid="step-indicator-2"
            />
          </div>

          {/* Content card */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-8 shadow-2xl">
            {step === 1 ? (
              /* Screen 1: Primary Selection */
              <div data-testid="screen-1">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <h1 className="text-2xl font-light text-white">
                      What speaks to your spirit?
                    </h1>
                  </div>
                  <p className="text-slate-400">
                    This helps us create a space that feels like home.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2" data-testid="primary-options">
                  {SPIRITUAL_INTERESTS.map((interest, index) => (
                    <SpiritualInterestCard
                      key={interest.key}
                      interest={interest}
                      isSelected={primaryInterest === interest.key}
                      onSelect={() => handlePrimarySelect(interest.key)}
                      testId={`primary-option-${interest.key.toLowerCase()}`}
                      spanFullWidth={index === SPIRITUAL_INTERESTS.length - 1}
                    />
                  ))}
                </div>

                <div className="mt-8">
                  <Button
                    onClick={handleContinueToStep2}
                    disabled={!primaryInterest}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="continue-button"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Continue
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Screen 2: Secondary Selection */
              <div data-testid="screen-2">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <h1 className="text-2xl font-light text-white">
                      Anything else that calls to you?
                    </h1>
                  </div>
                  <p className="text-slate-400">
                    Many of us are drawn to more than one path. Select any that resonate — or skip ahead.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2" data-testid="secondary-options">
                  {secondaryOptions.map((interest) => (
                    <SpiritualInterestCard
                      key={interest.key}
                      interest={interest}
                      isSelected={secondaryInterests.includes(interest.key)}
                      onSelect={() => handleSecondaryToggle(interest.key)}
                      disabled={isSubmitting}
                      testId={`secondary-option-${interest.key.toLowerCase()}`}
                    />
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="text-slate-400 hover:text-white hover:bg-white/10"
                    data-testid="back-button"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => handleComplete(true)}
                      disabled={isSubmitting}
                      className="text-slate-400 hover:text-white hover:bg-white/10"
                      data-testid="skip-button"
                    >
                      <SkipForward className="w-4 h-4 mr-2" />
                      Skip for now
                    </Button>

                    <Button
                      onClick={() => handleComplete(false)}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                      data-testid="finish-button"
                    >
                      <span className="flex items-center gap-2">
                        {isSubmitting ? 'Saving...' : 'Finish'}
                        {!isSubmitting && <Sparkles className="w-4 h-4" />}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UI;
