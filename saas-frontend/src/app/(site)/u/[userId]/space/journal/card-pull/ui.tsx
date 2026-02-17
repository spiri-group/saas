'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, History, Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ReadingForm, CardPullHistory, CardPatternDashboard } from './components';
import { useReadingEntries, ReadingEntry } from './hooks';

// Prefill data structure for SpiriVerse readings
export interface JournalPrefillData {
  sourceType: 'SPIRIVERSE';
  spiriReadingId: string;
  practitionerName: string;
  practitionerId: string;
  deckUsed?: string;
  date: string;
  reflection?: string;
}

interface Props {
  userId: string;
}

const UI: React.FC<Props> = ({ userId }) => {
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ReadingEntry | null>(null);
  const [prefillData, setPrefillData] = useState<JournalPrefillData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('history');

  const { data: entries, isLoading } = useReadingEntries(userId);

  // Check for prefill data on mount
  useEffect(() => {
    const hasPrefill = searchParams.get('prefill') === 'true';
    if (hasPrefill) {
      const storedPrefill = sessionStorage.getItem('journal-prefill');
      if (storedPrefill) {
        try {
          const data = JSON.parse(storedPrefill) as JournalPrefillData;
          setPrefillData(data);
          setShowForm(true);
          // Clear the sessionStorage after reading
          sessionStorage.removeItem('journal-prefill');
        } catch (e) {
          console.error('Failed to parse journal prefill data:', e);
        }
      }
    }
  }, [searchParams]);

  const handleEdit = (entry: ReadingEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEntry(null);
    setPrefillData(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
    setPrefillData(null);
  };

  return (
    <div className="min-h-screen-minus-nav flex flex-col p-6">
      <div className="flex-grow min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Tarot Journal</h1>
              <p className="text-slate-400 text-sm">Track your card pulls and readings</p>
            </div>
          </div>

          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg cursor-pointer"
            data-testid="new-reading-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record a Reading
          </Button>
        </div>

        {/* Custom Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-300'
            }`}
            data-testid="tab-readings"
          >
            <History className="w-4 h-4" />
            <span className="font-medium">Readings</span>
          </button>

          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'patterns'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-300'
            }`}
            data-testid="tab-cards"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="font-medium">Cards</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-grow min-h-0 flex flex-col">
          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl flex-grow flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-medium text-white">Recent Readings</h2>
              </div>

              <div className="flex-grow min-h-0 overflow-y-auto">
                <CardPullHistory
                  pulls={entries || []}
                  onEdit={handleEdit}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}

          {/* Patterns Tab */}
          {activeTab === 'patterns' && (
            <div className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl flex-grow flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-medium text-white">Card Patterns</h2>
                <span className="text-sm text-slate-400">- Discover which cards appear in your readings</span>
              </div>

              <div className="flex-grow min-h-0 overflow-y-auto">
                <CardPatternDashboard userId={userId} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              {editingEntry ? 'Edit Reading' : prefillData ? 'Journal Your Reading' : 'Record a Reading'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingEntry
                ? 'Update your reading journal entry'
                : prefillData
                ? `Record the cards from your reading with ${prefillData.practitionerName}`
                : 'Capture the wisdom from your cards'}
            </DialogDescription>
          </DialogHeader>

          <ReadingForm
            userId={userId}
            existingEntry={editingEntry}
            prefillData={prefillData}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
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
