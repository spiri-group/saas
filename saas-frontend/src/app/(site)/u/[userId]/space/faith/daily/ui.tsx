'use client';

import { useState, useMemo } from 'react';
import { Check, MessageSquare, Flame, History, Calendar, Sun, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  useTodaysPassage,
  useDailyPassages,
  useMarkPassageRead,
  useReflectOnPassage,
  DailyPassage,
} from '../hooks';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState('');
  const [prayerResponse, setPrayerResponse] = useState('');
  const [personalApplication, setPersonalApplication] = useState('');

  const { data: todaysPassage, isLoading } = useTodaysPassage(userId);
  const { data: pastPassages } = useDailyPassages(userId, { limit: 7 });
  const markReadMutation = useMarkPassageRead();
  const reflectMutation = useReflectOnPassage();

  const handleMarkRead = async () => {
    if (todaysPassage) {
      await markReadMutation.mutateAsync({ id: todaysPassage.id, userId });
    }
  };

  const handleSaveReflection = async () => {
    if (todaysPassage) {
      await reflectMutation.mutateAsync({
        id: todaysPassage.id,
        userId,
        reflection: reflection || undefined,
        prayerResponse: prayerResponse || undefined,
        personalApplication: personalApplication || undefined,
      });
      setShowReflection(false);
    }
  };

  // Pre-fill form if passage already has reflection
  const openReflectionForm = () => {
    if (todaysPassage) {
      setReflection(todaysPassage.reflection || '');
      setPrayerResponse(todaysPassage.prayerResponse || '');
      setPersonalApplication(todaysPassage.personalApplication || '');
    }
    setShowReflection(true);
  };

  // Calculate streak from past passages
  const passageStreak = pastPassages?.filter(p => p.isRead).length || 0;

  // Calculate insights
  const insights = useMemo(() => {
    if (!pastPassages || pastPassages.length === 0) return null;

    const readCount = pastPassages.filter(p => p.isRead).length;
    const reflectedCount = pastPassages.filter(p => p.isReflected).length;
    const totalPassages = pastPassages.length;

    return {
      readCount,
      reflectedCount,
      totalPassages,
      reflectionRate: totalPassages > 0 ? Math.round((reflectedCount / totalPassages) * 100) : 0,
      isConsistent: readCount >= 5,
      hasReflectionHabit: reflectedCount >= 3,
    };
  }, [pastPassages]);

  if (isLoading) {
    return (
      <div className="min-h-screen-minus-nav p-6 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading today&apos;s passage...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-minus-nav p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-sky-400/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-10 w-64 h-64 bg-amber-300/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Centered Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-amber-500/20 rounded-2xl mb-4">
            <Sun className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Daily Passage</h1>
          <p className="text-slate-400">Let His word be a lamp unto your feet</p>

          {passageStreak > 0 && (
            <div className="mt-4">
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 px-4 py-1.5">
                <Flame className="w-4 h-4 mr-2" />
                {passageStreak} day streak — You&apos;re growing in the Word!
              </Badge>
            </div>
          )}
        </div>

        {/* Insight Banner - Consistency Celebration */}
        {insights?.isConsistent && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-300 font-medium">Faithful in the Word</p>
                <p className="text-amber-200/70 text-sm">
                  You&apos;ve read {insights.readCount} of {insights.totalPassages} passages this week.
                  {insights.hasReflectionHabit && ` You've also reflected ${insights.reflectedCount} times!`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* New User Encouragement */}
        {!todaysPassage && (
          <div className="mb-6 p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <Heart className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">Your Daily Bread Awaits</h3>
            <p className="text-slate-400 text-sm">
              Each day brings a new passage chosen for you. Return daily to build a habit of dwelling in His word.
            </p>
          </div>
        )}

        {/* Today's Passage Card */}
        {todaysPassage && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl mb-6">
            {/* Date & Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(todaysPassage.date), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                {todaysPassage.isRead && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <Check className="w-3 h-3 mr-1" />
                    Read
                  </Badge>
                )}
                {todaysPassage.isReflected && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Reflected
                  </Badge>
                )}
              </div>
            </div>

            {/* Scripture Reference */}
            <h2 className="text-xl font-semibold text-sky-400 mb-3">
              {todaysPassage.reference}
            </h2>

            {/* Scripture Text */}
            <blockquote className="text-lg text-white leading-relaxed border-l-2 border-sky-500/50 pl-4 mb-6 italic">
              &ldquo;{todaysPassage.text}&rdquo;
            </blockquote>

            {/* Version */}
            <p className="text-slate-500 text-sm mb-6">— {todaysPassage.version || 'NIV'}</p>

            {/* Actions */}
            {!showReflection && (
              <div className="flex gap-3">
                {!todaysPassage.isRead && (
                  <Button
                    onClick={handleMarkRead}
                    disabled={markReadMutation.isPending}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    data-testid="mark-read-button"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {markReadMutation.isPending ? 'Marking...' : 'Mark as Read'}
                  </Button>
                )}
                <Button
                  onClick={openReflectionForm}
                  variant="outline"
                  className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
                  data-testid="reflect-button"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {todaysPassage.isReflected ? 'Edit Reflection' : 'Add Reflection'}
                </Button>
              </div>
            )}

            {/* Reflection Form */}
            {showReflection && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">What speaks to you?</label>
                  <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What stands out? What does this mean to you?"
                    className="min-h-[100px]"
                    data-testid="reflection-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">How can you apply this today?</label>
                  <Textarea
                    value={personalApplication}
                    onChange={(e) => setPersonalApplication(e.target.value)}
                    placeholder="One practical way to apply this..."
                    className="min-h-[60px]"
                    data-testid="application-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Prayer response (optional)</label>
                  <Textarea
                    value={prayerResponse}
                    onChange={(e) => setPrayerResponse(e.target.value)}
                    placeholder="A short prayer in response to this passage..."
                    className="min-h-[60px]"
                    data-testid="prayer-response-input"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveReflection}
                    disabled={reflectMutation.isPending}
                    className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700"
                    data-testid="save-reflection-button"
                  >
                    {reflectMutation.isPending ? 'Saving...' : 'Save Reflection'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowReflection(false)}
                    className="text-slate-400"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Show existing reflection if not editing */}
            {todaysPassage.isReflected && !showReflection && (
              <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                {todaysPassage.reflection && (
                  <div>
                    <h4 className="text-sm text-slate-400 mb-2">Your Reflection</h4>
                    <p className="text-slate-300">{todaysPassage.reflection}</p>
                  </div>
                )}
                {todaysPassage.personalApplication && (
                  <div>
                    <h4 className="text-sm text-slate-400 mb-2">Application</h4>
                    <p className="text-slate-300">{todaysPassage.personalApplication}</p>
                  </div>
                )}
                {todaysPassage.prayerResponse && (
                  <div>
                    <h4 className="text-sm text-slate-400 mb-2">Prayer</h4>
                    <p className="text-slate-300 italic">{todaysPassage.prayerResponse}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Past Passages */}
        {pastPassages && pastPassages.length > 1 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-medium text-white">Recent Passages</h3>
            </div>

            <div className="space-y-3">
              {pastPassages.slice(1).map((passage: DailyPassage) => (
                <div
                  key={passage.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <span className="text-sky-400 font-medium">{passage.reference}</span>
                    <span className="text-slate-500 text-sm ml-2">
                      {format(new Date(passage.date), 'MMM d')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {passage.isRead && (
                      <Badge variant="outline" className="text-green-300 border-green-500/30 text-xs">
                        Read
                      </Badge>
                    )}
                    {passage.isReflected && (
                      <Badge variant="outline" className="text-purple-300 border-purple-500/30 text-xs">
                        Reflected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UI;
