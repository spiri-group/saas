'use client';

import { useMemo, useState } from 'react';
import { Headphones, History, ChevronDown, ChevronUp, BookOpen, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMyJourneysWithTracks } from './hooks';

interface Props {
  userId: string;
}

interface ReflectionEntry {
  journeyId: string;
  journeyName: string;
  trackId: string;
  trackTitle: string;
  trackNumber: number;
  reflection: string;
  completedDate?: string;
  integrationPrompts?: string[];
  journeyStructure: string;
  vendorName?: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const { data: journeyProgressList, isLoading } = useMyJourneysWithTracks(userId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Flatten all reflections across all journeys into a single list
  const reflections = useMemo(() => {
    if (!journeyProgressList) return [];

    const entries: ReflectionEntry[] = [];

    for (const jp of journeyProgressList) {
      if (!jp.trackProgress || !jp.journey) continue;

      const trackMap = new Map(
        (jp.journey.tracks || []).map(t => [t.id, t])
      );

      for (const tp of jp.trackProgress) {
        if (!tp.reflection) continue;

        const track = trackMap.get(tp.trackId);

        entries.push({
          journeyId: jp.journeyId,
          journeyName: jp.journey.name,
          trackId: tp.trackId,
          trackTitle: track?.title || 'Unknown Track',
          trackNumber: track?.trackNumber || 0,
          reflection: tp.reflection,
          completedDate: tp.completedDate,
          integrationPrompts: track?.integrationPrompts,
          journeyStructure: jp.journey.journeyStructure,
          vendorName: jp.journey.vendor?.name,
        });
      }
    }

    // Sort by most recent first
    entries.sort((a, b) => {
      if (!a.completedDate && !b.completedDate) return 0;
      if (!a.completedDate) return 1;
      if (!b.completedDate) return -1;
      return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
    });

    return entries;
  }, [journeyProgressList]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen-minus-nav flex flex-col p-6">
      <div className="flex-grow min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Headphones className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Journey Reflections</h1>
              <p className="text-slate-400 text-sm">Your thoughts and insights from guided journeys</p>
            </div>
          </div>

          {reflections.length > 0 && (
            <Badge variant="outline" className="border-purple-500/30 text-purple-300">
              {reflections.length} reflection{reflections.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Reflections List */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl flex-grow flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-medium text-white">Reflection History</h2>
          </div>

          <div className="flex-grow min-h-0 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : reflections.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-300 font-medium mb-2">No reflections yet</p>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  After completing a track in one of your guided journeys, you&apos;ll be prompted to reflect.
                  Your reflections will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reflections.map((entry) => {
                  const entryId = `${entry.journeyId}-${entry.trackId}`;
                  const isExpanded = expandedId === entryId;

                  return (
                    <div
                      key={entryId}
                      className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
                      data-testid={`reflection-entry-${entryId}`}
                    >
                      {/* Collapsed Header */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(entryId)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-white font-medium truncate">{entry.journeyName}</p>
                            {entry.journeyStructure !== 'SINGLE_TRACK' && (
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 flex-shrink-0">
                                {entry.trackTitle}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            {entry.completedDate && (
                              <span>
                                {new Date(entry.completedDate).toLocaleDateString('en-AU', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                            {entry.vendorName && (
                              <span className="truncate">by {entry.vendorName}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-slate-400 flex-shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-700/50 space-y-4">
                          {/* Integration Prompts */}
                          {entry.integrationPrompts && entry.integrationPrompts.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Prompts</p>
                              <ul className="space-y-1.5">
                                {entry.integrationPrompts.map((prompt, i) => (
                                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                    <span className="text-purple-400 mt-0.5">&#x2022;</span>
                                    {prompt}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Reflection */}
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase mb-2">Your Reflection</p>
                            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {entry.reflection}
                            </p>
                          </div>

                          {/* Link to journey player */}
                          <div className="pt-2">
                            <Link
                              href={`/u/${userId}/space/journeys/${entry.journeyId}`}
                              className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open in player
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UI;
