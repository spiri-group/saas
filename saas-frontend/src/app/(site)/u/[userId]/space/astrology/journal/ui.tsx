'use client';

import { useState, useMemo } from 'react';
import { BookOpen, Plus, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAstrologyJournalEntries,
  useAstrologyJournalPrompt,
  useAstrologyJournalStats,
  useCreateAstrologyJournalEntry,
  useUpdateAstrologyJournalEntry,
  useDeleteAstrologyJournalEntry,
  AstrologyJournalFilters,
  AstrologyJournalEntry,
  CreateAstrologyJournalInput,
  UpdateAstrologyJournalInput,
} from '../_hooks/useAstrologyJournal';
import { useBirthChart } from '../_hooks/useBirthChart';
import {
  JournalPromptCard,
  JournalEntryCard,
  JournalEntryForm,
  JournalEntryDetail,
  JournalFilters,
  JournalStats,
} from '../_components';

interface Props {
  userId: string;
}

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

const UI: React.FC<Props> = ({ userId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AstrologyJournalFilters>({});
  const [promptForForm, setPromptForForm] = useState<string | undefined>();
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Data fetching
  const { data: entries, isLoading: entriesLoading, error: entriesError } = useAstrologyJournalEntries(userId, filters);
  const { data: prompt } = useAstrologyJournalPrompt(userId);
  const { data: stats } = useAstrologyJournalStats(userId);
  const { data: birthChart, isLoading: birthChartLoading } = useBirthChart(userId);

  // Mutations
  const createEntry = useCreateAstrologyJournalEntry();
  const updateEntry = useUpdateAstrologyJournalEntry();
  const deleteEntry = useDeleteAstrologyJournalEntry();

  // Selected entry
  const selectedEntry = useMemo(() => {
    if (!selectedEntryId || !entries) return null;
    return entries.find(e => e.id === selectedEntryId) || null;
  }, [selectedEntryId, entries]);

  // Handlers
  const handleCreateNew = () => {
    setPromptForForm(undefined);
    setViewMode('create');
  };

  const handleUsePrompt = () => {
    setPromptForForm(prompt?.prompt);
    setViewMode('create');
  };

  const handleDismissPrompt = () => {
    setPromptDismissed(true);
  };

  const handleViewEntry = (entry: AstrologyJournalEntry) => {
    setSelectedEntryId(entry.id);
    setViewMode('detail');
  };

  const handleEditEntry = () => {
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setSelectedEntryId(null);
    setViewMode('list');
  };

  const handleSave = async (input: CreateAstrologyJournalInput | UpdateAstrologyJournalInput) => {
    try {
      let result;
      if ('id' in input) {
        result = await updateEntry.mutateAsync(input);
      } else {
        result = await createEntry.mutateAsync(input);
      }
      console.log('[Journal] Mutation result:', result);
      if (result.success) {
        setViewMode('list');
        setSelectedEntryId(null);
        setPromptForForm(undefined);
      } else {
        console.error('[Journal] Mutation failed:', result.message);
      }
    } catch (error) {
      console.error('[Journal] Mutation error:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntryId) return;
    await deleteEntry.mutateAsync({ id: selectedEntryId, userId });
    setSelectedEntryId(null);
    setViewMode('list');
  };

  const handleCancel = () => {
    if (viewMode === 'create') {
      setPromptForForm(undefined);
    }
    setViewMode(selectedEntryId ? 'detail' : 'list');
  };

  // Loading state
  if (entriesLoading || birthChartLoading) {
    return (
      <div className="min-h-screen-minus-nav flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Error state
  if (entriesError) {
    return (
      <div className="min-h-screen-minus-nav flex flex-col p-6">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl text-white mb-2">Failed to Load Journal</h2>
            <p className="text-slate-400 mb-4">Unable to fetch your journal entries</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-minus-nav flex flex-col p-6">
      <div className="flex-grow min-h-0 flex flex-col max-w-4xl lg:max-w-none mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Astrology Journal</h1>
              <p className="text-slate-400 text-sm">
                Reflect on your astrological experiences
              </p>
            </div>
          </div>

          {viewMode === 'list' && (
            <Button
              onClick={handleCreateNew}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="new-entry-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          )}
        </div>

        {/* No birth chart warning */}
        {!birthChart && viewMode === 'list' && (
          <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-amber-300 font-medium mb-1">
                  Add Your Birth Chart for Personalized Insights
                </h3>
                <p className="text-amber-200/70 text-sm mb-3">
                  Without your birth chart, journal entries won&apos;t capture transit aspects
                  to your natal planets. Add your birth details to unlock the full experience.
                </p>
                <Link href={`/u/${userId}/space/astrology/birth-chart`}>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
                    Create Birth Chart
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {viewMode === 'list' && (
          <div className="space-y-6 overflow-y-auto flex-grow min-h-0 pb-6">
            {/* Stats */}
            {stats && stats.totalEntries > 0 && (
              <JournalStats stats={stats} />
            )}

            {/* Prompt Card */}
            {prompt && !promptDismissed && entries && entries.length > 0 && (
              <JournalPromptCard
                prompt={prompt}
                onUsePrompt={handleUsePrompt}
                onDismiss={handleDismissPrompt}
              />
            )}

            {/* Filters */}
            {entries && entries.length > 0 && (
              <JournalFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}

            {/* Entries List */}
            {entries && entries.length > 0 ? (
              <div className="space-y-3">
                {entries.map(entry => (
                  <JournalEntryCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => handleViewEntry(entry)}
                  />
                ))}
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg text-white mb-2">No Journal Entries Yet</h3>
                <p className="text-slate-400 mb-4 max-w-md mx-auto">
                  Start documenting your astrological journey. Each entry captures the
                  current sky state so you can track patterns over time.
                </p>
                {prompt && (
                  <div className="mb-4">
                    <JournalPromptCard
                      prompt={prompt}
                      onUsePrompt={handleUsePrompt}
                      onDismiss={() => {}}
                    />
                  </div>
                )}
                <Button
                  onClick={handleCreateNew}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="first-entry-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Write Your First Entry
                </Button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'detail' && selectedEntry && (
          <JournalEntryDetail
            entry={selectedEntry}
            onBack={handleBackToList}
            onEdit={handleEditEntry}
            onDelete={handleDelete}
            isDeleting={deleteEntry.isPending}
          />
        )}

        {/* Create/Edit Dialog */}
        <Dialog
          open={viewMode === 'create' || viewMode === 'edit'}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
        >
          <DialogContent className="bg-slate-900 border-slate-700 max-w-[95vw] w-full md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {viewMode === 'edit' ? 'Edit Entry' : 'New Journal Entry'}
              </DialogTitle>
            </DialogHeader>
            <JournalEntryForm
              userId={userId}
              entry={viewMode === 'edit' ? selectedEntry : null}
              initialPrompt={promptForForm}
              onSave={handleSave}
              onCancel={handleCancel}
              isSaving={createEntry.isPending || updateEntry.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UI;
