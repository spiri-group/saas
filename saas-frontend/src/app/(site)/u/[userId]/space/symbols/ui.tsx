'use client';

import { BookOpen, Sparkles, TrendingUp, Layers, Moon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import usePersonalSymbols from '../mediumship/hooks/usePersonalSymbols';
import { useMemo } from 'react';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const { data: symbols, isLoading } = usePersonalSymbols(userId);

  // Calculate stats
  const stats = useMemo(() => {
    if (!symbols) return { total: 0, crossEntry: 0, topSymbol: null, recentSymbols: [] };

    const crossEntrySymbols = symbols.filter(s =>
      s.dreamOccurrences > 0 && s.readingOccurrences > 0
    );

    const sortedByOccurrence = [...symbols].sort((a, b) => b.totalOccurrences - a.totalOccurrences);
    const topSymbol = sortedByOccurrence[0];

    const recentSymbols = [...symbols]
      .sort((a, b) => new Date(b.lastEncountered || b.createdAt).getTime() - new Date(a.lastEncountered || a.createdAt).getTime())
      .slice(0, 5);

    return {
      total: symbols.length,
      crossEntry: crossEntrySymbols.length,
      topSymbol,
      recentSymbols,
      crossEntrySymbols: crossEntrySymbols.slice(0, 3)
    };
  }, [symbols]);

  return (
    <div className="min-h-screen-minus-nav">
      {/* Mystical Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl mb-4 backdrop-blur-sm border border-purple-500/20">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h1 data-testid="symbols-dashboard-title" className="text-3xl font-light text-white mb-2">Your Symbols</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Discover patterns in your spiritual language across dreams, readings, and synchronicities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card data-testid="total-symbols-stat" className="bg-white/5 border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-slate-400 text-sm">Total Symbols</span>
            </div>
            <div data-testid="total-symbols-value" className="text-3xl font-light text-white">
              {isLoading ? '...' : stats.total}
            </div>
          </Card>

          <Card data-testid="cross-entry-stat" className="bg-white/5 border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Layers className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-slate-400 text-sm">Cross-Entry Symbols</span>
            </div>
            <div data-testid="cross-entry-value" className="text-3xl font-light text-white">
              {isLoading ? '...' : stats.crossEntry}
            </div>
            <p className="text-xs text-slate-500 mt-1">Appear in both dreams & readings</p>
          </Card>

          <Card data-testid="most-frequent-stat" className="bg-white/5 border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-slate-400 text-sm">Most Frequent</span>
            </div>
            <div data-testid="most-frequent-value" className="text-3xl font-light text-white">
              {isLoading ? '...' : stats.topSymbol?.symbolName || '-'}
            </div>
            {stats.topSymbol && (
              <p className="text-xs text-slate-500 mt-1">{stats.topSymbol.totalOccurrences} occurrences</p>
            )}
          </Card>
        </div>

        {/* Cross-Entry Symbols Highlight */}
        {stats.crossEntrySymbols && stats.crossEntrySymbols.length > 0 && (
          <Card className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 border-purple-500/20 p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-1">Symbols Speaking Across Channels</h3>
                <p className="text-slate-400 text-sm mb-4">
                  These symbols appear in both your dreams and readings - pay attention to their messages
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.crossEntrySymbols.map(s => (
                    <Link
                      key={s.id}
                      href={`/u/${userId}/space/symbols/dictionary`}
                      className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-full text-sm transition-colors flex items-center gap-2"
                    >
                      {s.symbolName}
                      <span className="text-purple-400/60">
                        {s.dreamOccurrences}d / {s.readingOccurrences}r
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link href={`/u/${userId}/space/symbols/dictionary`}>
            <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 p-5 h-full transition-all hover:bg-white/8 cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <h3 className="text-white font-medium mb-1">Symbol Dictionary</h3>
              <p className="text-slate-400 text-sm">
                View all your symbols and add personal meanings
              </p>
            </Card>
          </Link>

          <Link href={`/u/${userId}/space/symbols/my-card-symbols`}>
            <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 p-5 h-full transition-all hover:bg-white/8 cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Layers className="w-5 h-5 text-indigo-400" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <h3 className="text-white font-medium mb-1">My Card Symbols</h3>
              <p className="text-slate-400 text-sm">
                Define what each tarot card means to you personally
              </p>
            </Card>
          </Link>

          <Link href={`/u/${userId}/space/journal/dreams`}>
            <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 p-5 h-full transition-all hover:bg-white/8 cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Moon className="w-5 h-5 text-blue-400" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <h3 className="text-white font-medium mb-1">Log a Dream</h3>
              <p className="text-slate-400 text-sm">
                Record dreams to discover new symbols
              </p>
            </Card>
          </Link>
        </div>

        {/* Recent Symbols */}
        {stats.recentSymbols && stats.recentSymbols.length > 0 && (
          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Recent Symbols</h3>
              <Link
                href={`/u/${userId}/space/symbols/dictionary`}
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recentSymbols.map(symbol => (
                <div
                  key={symbol.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-300 text-sm font-medium">
                        {symbol.symbolName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{symbol.symbolName}</div>
                      {symbol.personalMeaning && (
                        <div className="text-slate-500 text-xs truncate max-w-xs">
                          {symbol.personalMeaning}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{symbol.totalOccurrences} total</span>
                    {symbol.category && (
                      <span className="px-2 py-0.5 bg-slate-800 rounded-full">
                        {symbol.category.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && stats.total === 0 && (
          <Card className="bg-white/5 border-white/10 p-12 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-2xl mb-4">
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-light text-white mb-2">Start Building Your Symbol Language</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-6">
              As you log dreams, tarot readings, and synchronicities, symbols will automatically
              appear here. Each symbol becomes part of your personal spiritual vocabulary.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={`/u/${userId}/space/journal/dreams`}>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Moon className="w-4 h-4 mr-2" />
                  Log a Dream
                </Button>
              </Link>
              <Link href={`/u/${userId}/space/journal/card-pull`}>
                <Button variant="outline" className="border-slate-700 hover:bg-slate-800">
                  <Layers className="w-4 h-4 mr-2" />
                  Record a Reading
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UI;
