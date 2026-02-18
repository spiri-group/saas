'use client';

import { useState } from 'react';
import { Star, History, Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAstrologyJournalEntries,
  useCreateAstrologyJournalEntry,
  useAstrologyJournalPrompt,
  AstrologyJournalFilters,
  CreateAstrologyJournalInput,
  UpdateAstrologyJournalInput,
} from '../../astrology/_hooks/useAstrologyJournal';
import { JournalEntryForm } from '../../astrology/_components/JournalEntryForm';
import { JournalEntryCard } from '../../astrology/_components/JournalEntryCard';
import { JournalFilters } from '../../astrology/_components/JournalFilters';

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<AstrologyJournalFilters>({});

  // Fetch journal entries
  const { data: entries, isLoading: entriesLoading } = useAstrologyJournalEntries(userId, filters);
  const { data: prompt } = useAstrologyJournalPrompt(userId);
  const createMutation = useCreateAstrologyJournalEntry();

  const handleSave = async (input: CreateAstrologyJournalInput | UpdateAstrologyJournalInput) => {
    try {
      const result = await createMutation.mutateAsync(input as CreateAstrologyJournalInput);
      console.log('[Journal] Mutation result:', result);
      if (result.success) {
        setShowForm(false);
      } else {
        console.error('[Journal] Mutation failed:', result.message);
      }
    } catch (error) {
      console.error('[Journal] Mutation error:', error);
    }
  };

  return (
    <div className="min-h-screen-minus-nav flex flex-col p-6">
      <div className="flex-grow min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Star className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Astrology Journal</h1>
              <p className="text-slate-400 text-sm">Record astrological observations and insights</p>
            </div>
          </div>

          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg cursor-pointer"
            data-testid="new-entry-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <JournalFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* History Section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl flex-grow flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-medium text-white">Journal History</h2>
          </div>

          <div className="flex-grow min-h-0 overflow-y-auto">
            {entriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : entries && entries.length > 0 ? (
              <div className="space-y-4">
                {entries.map(entry => (
                  <JournalEntryCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => {/* TODO: Open detail view */}}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No journal entries yet</p>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  data-testid="first-entry-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Write Your First Entry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Entry Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              New Journal Entry
            </DialogTitle>
          </DialogHeader>
          <JournalEntryForm
            userId={userId}
            initialPrompt={prompt?.prompt}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            isSaving={createMutation.isPending}
          />
          <DialogClose asChild>
            <Button variant="ghost" className="w-full mt-2 opacity-70 hover:opacity-100">
              Cancel
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UI;
